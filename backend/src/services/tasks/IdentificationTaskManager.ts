/**
 * 整页多题识别任务管理器
 *
 * 双后端设计（默认 Redis + BullMQ，见 docs/adr/0004）：
 * - REDIS_URL 已配置：BullMQ 队列 + 进程内 Worker（并发 1），任务状态/进度/结果存 Redis，
 *   重启不丢任务，removeOnComplete 保留 1 小时供轮询；
 * - REDIS_URL 未配置：自动降级为进程内队列（内存 Map + 串行异步执行），
 *   接口行为完全一致，同样立即返回 taskId，消除同步 HTTP 挂起的 504 风险；
 *   局限：任务不跨进程重启保留（自托管单实例场景可接受，PR/ADR 已注明）。
 */

import { Queue, Worker, type Job } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import { getRedisConnection, closeRedisConnection } from '../../config/redis'
import {
  processIdentifyMulti,
  type IdentifyMultiJobData,
  type MultiRecognizeItem,
} from './identifyMultiPipeline'

export type TaskState = 'queued' | 'processing' | 'completed' | 'failed'

export interface TaskStatus {
  taskId: string
  state: TaskState
  progress: number
  result?: { items: MultiRecognizeItem[] }
  error?: string
}

interface MemoryTask extends TaskStatus {
  createdAt: number
}

/** 完成任务保留时长（供前端轮询），之后清理 */
const TASK_RETENTION_MS = 60 * 60 * 1000

const QUEUE_NAME = 'identify-multi'

class IdentificationTaskManager {
  private queue: Queue<IdentifyMultiJobData> | null = null
  private worker: Worker<IdentifyMultiJobData> | null = null
  private memoryTasks = new Map<string, MemoryTask>()
  private memoryChain: Promise<void> = Promise.resolve()
  private initialized = false

  /** 初始化队列后端（幂等；进程启动或首次 submit 时调用） */
  init(): void {
    if (this.initialized) return
    this.initialized = true

    const connection = getRedisConnection()
    if (!connection) {
      console.log(
        '[IdentificationTaskManager] REDIS_URL 未配置，使用进程内队列（单实例，重启不保留任务）'
      )
      return
    }

    console.log('[IdentificationTaskManager] 使用 Redis + BullMQ 队列')
    this.queue = new Queue<IdentifyMultiJobData>(QUEUE_NAME, { connection })
    this.worker = new Worker<IdentifyMultiJobData>(
      QUEUE_NAME,
      async (job: Job<IdentifyMultiJobData>) =>
        processIdentifyMulti(job.data, (p) => job.updateProgress(p)),
      { connection, concurrency: 1 }
    )
    this.worker.on('failed', (job, err) => {
      console.error(`[IdentificationTaskManager] 任务 ${job?.id} 失败:`, err?.message)
    })
  }

  /** 提交识别任务，立即返回 taskId（不等待 LLM 完成） */
  async submit(data: IdentifyMultiJobData): Promise<string> {
    this.init()

    if (this.queue) {
      const job = await this.queue.add(QUEUE_NAME, data, {
        attempts: 1,
        removeOnComplete: { age: TASK_RETENTION_MS, count: 500 },
        removeOnFail: { age: TASK_RETENTION_MS, count: 500 },
      })
      return job.id as string
    }

    // 进程内队列：串行执行，避免并发 Vision 调用打爆上游配额
    const taskId = uuidv4()
    this.memoryTasks.set(taskId, {
      taskId,
      state: 'queued',
      progress: 0,
      createdAt: Date.now(),
    })
    this.memoryChain = this.memoryChain
      .then(() => this.runMemoryTask(taskId, data))
      .catch(() => {})
    return taskId
  }

  private async runMemoryTask(taskId: string, data: IdentifyMultiJobData): Promise<void> {
    const task = this.memoryTasks.get(taskId)
    if (!task) return
    task.state = 'processing'
    task.progress = 5
    try {
      const result = await processIdentifyMulti(data, (p) => {
        task.progress = Math.max(task.progress, p)
      })
      task.state = 'completed'
      task.progress = 100
      task.result = result
    } catch (err: any) {
      task.state = 'failed'
      task.error = err?.message || '识别任务执行失败'
    } finally {
      setTimeout(() => this.memoryTasks.delete(taskId), TASK_RETENTION_MS).unref?.()
    }
  }

  /** 查询任务状态；不存在（或已过期清理）返回 null */
  async getStatus(taskId: string): Promise<TaskStatus | null> {
    this.init()

    if (this.queue) {
      const job = await this.queue.getJob(taskId)
      if (!job) return null
      const bullState = await job.getState()
      const stateMap: Record<string, TaskState> = {
        waiting: 'queued',
        delayed: 'queued',
        active: 'processing',
        completed: 'completed',
        failed: 'failed',
      }
      const state = stateMap[bullState] || 'queued'
      const progress = typeof job.progress === 'number' ? job.progress : 0
      return {
        taskId,
        state,
        progress: state === 'completed' ? 100 : progress,
        result: state === 'completed' ? (job.returnvalue as any) : undefined,
        error: state === 'failed' ? job.failedReason : undefined,
      }
    }

    const task = this.memoryTasks.get(taskId)
    if (!task) return null
    return {
      taskId: task.taskId,
      state: task.state,
      progress: task.progress,
      result: task.result,
      error: task.error,
    }
  }

  /** 当前是否为 Redis 后端（测试/诊断用） */
  isRedisBacked(): boolean {
    return this.queue !== null
  }

  /** 优雅关闭（SIGTERM/SIGINT） */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close().catch(() => {})
      this.worker = null
    }
    if (this.queue) {
      await this.queue.close().catch(() => {})
      this.queue = null
    }
    this.initialized = false
    await closeRedisConnection()
  }
}

export const identificationTaskManager = new IdentificationTaskManager()
