/**
 * uploads 临时文件 TTL 清理服务（S6 工程遗留）
 *
 * 背景：识别（单题/整页多题）与拍照重做的上传图在异步化后滞留时间拉长，其中
 * 「识别用整页大图」「拍照重做图」落库后无任何实体引用，纯堆积不清理。
 *
 * 安全清理口径：只删除「同时满足」以下两个条件的文件——
 * 1. 文件修改时间早于 TTL（默认 72 小时，`UPLOADS_TTL_HOURS` 可配，0 = 关闭清理）；
 * 2. 不被 questions 表任何列引用（imageUrl / originalImageUrl / diagramUrls）。
 *
 * 学生错题的原始照片会被题目实体引用，永远不会被本服务删除；删除动作记录日志可追溯。
 */

import fs from 'fs'
import path from 'path'
import { AppDataSource } from '../config/database'
import { Question } from '../models/Question'

/** 默认 TTL：72 小时（异步识别最慢分钟级，72h 足够安全冗余） */
export const DEFAULT_UPLOADS_TTL_HOURS = 72

/** 清理扫描周期：24 小时 */
const CLEANUP_INTERVAL_MS = 24 * 3600 * 1000

/** 首次启动延迟：1 分钟（避开进程启动高峰） */
const FIRST_RUN_DELAY_MS = 60 * 1000

export function getUploadsTtlHours(): number {
  const n = parseFloat(process.env.UPLOADS_TTL_HOURS || '')
  if (!Number.isFinite(n) || n < 0) return DEFAULT_UPLOADS_TTL_HOURS
  return n
}

/**
 * 纯函数：从文件列表中筛选「过期且未被引用」的待删文件。
 * ttlHours <= 0 表示清理关闭，返回空数组。
 */
export function selectStaleFiles(
  files: { name: string; mtimeMs: number }[],
  referencedNames: Set<string>,
  nowMs: number,
  ttlHours: number
): string[] {
  if (ttlHours <= 0) return []
  const ttlMs = ttlHours * 3600 * 1000
  return files
    .filter((f) => nowMs - f.mtimeMs >= ttlMs && !referencedNames.has(f.name))
    .map((f) => f.name)
}

/** 从 /uploads/xxx.png 形式的 URL 中提取文件名 */
export function basenameOfUploadUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  const base = path.basename(url.replace(/\\/g, '/'))
  return base || null
}

export class UploadsCleanupService {
  private timer: NodeJS.Timeout | null = null
  private startupTimer: NodeJS.Timeout | null = null

  /** 进程启动后调用：按周期扫描清理（TTL=0 时保持关闭） */
  init() {
    if (this.timer) return
    if (getUploadsTtlHours() <= 0) {
      console.log('[uploads-cleanup] UPLOADS_TTL_HOURS=0，临时文件清理已关闭')
      return
    }
    this.startupTimer = setTimeout(() => {
      void this.run()
      this.timer = setInterval(() => void this.run(), CLEANUP_INTERVAL_MS)
    }, FIRST_RUN_DELAY_MS)
  }

  close() {
    if (this.startupTimer) clearTimeout(this.startupTimer)
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.startupTimer = null
  }

  /** 单次扫描清理（测试/手动触发入口），返回删除统计 */
  async run(): Promise<{ scanned: number; deleted: string[]; skipped: boolean }> {
    const dir = path.resolve(process.env.STORAGE_PATH || 'uploads')
    if (!fs.existsSync(dir)) {
      return { scanned: 0, deleted: [], skipped: true }
    }

    const ttlHours = getUploadsTtlHours()
    const referenced = await this.loadReferencedNames()
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files: { name: string; mtimeMs: number }[] = []
    for (const entry of entries) {
      if (!entry.isFile()) continue
      try {
        const stat = fs.statSync(path.join(dir, entry.name))
        files.push({ name: entry.name, mtimeMs: stat.mtimeMs })
      } catch {
        // 文件在扫描间隙被删除属正常竞争，跳过
      }
    }

    const stale = selectStaleFiles(files, referenced, Date.now(), ttlHours)
    const deleted: string[] = []
    for (const name of stale) {
      try {
        fs.unlinkSync(path.join(dir, name))
        deleted.push(name)
      } catch (e) {
        console.error(`[uploads-cleanup] 删除失败 ${name}:`, e)
      }
    }

    if (deleted.length > 0) {
      console.log(
        `[uploads-cleanup] 扫描 ${files.length} 个文件，清理 ${deleted.length} 个过期未引用临时图（TTL=${ttlHours}h）`
      )
    }

    return { scanned: files.length, deleted, skipped: false }
  }

  /** 加载 questions 表中所有被引用的 uploads 文件名 */
  private async loadReferencedNames(): Promise<Set<string>> {
    const referenced = new Set<string>()
    try {
      const questions = await AppDataSource.getRepository(Question).find({
        select: ['imageUrl', 'originalImageUrl', 'diagramUrls'],
      })
      for (const q of questions) {
        for (const url of [q.imageUrl, q.originalImageUrl]) {
          const name = basenameOfUploadUrl(url)
          if (name) referenced.add(name)
        }
        if (Array.isArray(q.diagramUrls)) {
          for (const url of q.diagramUrls) {
            const name = basenameOfUploadUrl(url)
            if (name) referenced.add(name)
          }
        }
      }
    } catch (e) {
      // 引用集加载失败时放弃本轮清理（宁可不删，不可误删）
      console.error('[uploads-cleanup] 加载引用集失败，本轮跳过删除:', e)
      throw e
    }
    return referenced
  }
}

export const uploadsCleanupService = new UploadsCleanupService()
