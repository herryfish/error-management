/**
 * 阶梯式引导提示服务
 *
 * 检索练习防剧透：重做页按 1/2/3 级渐进提示获取 LLM 引导——
 * ① 考点方向 → ② 思路台阶 → ③ 关键方程；完整解析为前端兜底
 * （查看完整解析后提交的重做按「未独立掌握」记录，assisted 语义）。
 */

import api from '@/utils/api'

export interface GuidanceHint {
  /** 提示级别（1/2/3） */
  level: 1 | 2 | 3
  /** 提示正文（可能含 LaTeX 公式） */
  hint: string
  /** 下一级别（3 级后为 null） */
  nextLevel: number | null
}

export const guidanceService = {
  /**
   * 获取指定级别的引导提示
   * @param questionId 题目 ID
   * @param level 提示级别（1/2/3）
   */
  async getHint(questionId: string, level: 1 | 2 | 3): Promise<GuidanceHint> {
    const response = await api.post('/guidance', { questionId, level })
    return response.data
  },
}

/** 提示级别展示元信息（与后端 guidancePrompts 约束对齐） */
export const GUIDANCE_LEVEL_LABELS: Record<number, string> = {
  1: '提示① 考点方向',
  2: '提示② 思路台阶',
  3: '提示③ 关键方程',
}
