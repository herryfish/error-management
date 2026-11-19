/**
 * 薄弱点画像服务
 *
 * 聚合两类可视化数据（学生端/家长端共用，移动端友好）：
 * - 错因占比：错题的 errorTags（错因标签）分布；
 * - 薄弱知识点画像：错题知识点 × 掌握记录错误次数的加权分布。
 */

import { AppDataSource } from '../config/database'
import { Question } from '../models/Question'
import { Mastery } from '../models/Mastery'

export interface ErrorTagSlice {
  tag: string
  count: number
}

export interface WeakKnowledgePoint {
  point: string
  /** 涉及的错题数（该知识点下有错误记录的题目数） */
  questionCount: number
  /** 累计做错次数 */
  incorrectCount: number
  /** 该知识点下题目总数 */
  totalQuestions: number
}

export interface ErrorProfile {
  totalQuestions: number
  /** 已标注错因的题目数 */
  taggedQuestions: number
  errorTagDistribution: ErrorTagSlice[]
  weakKnowledgePoints: WeakKnowledgePoint[]
}

export class ErrorProfileService {
  private questionRepository = AppDataSource.getRepository(Question)
  private masteryRepository = AppDataSource.getRepository(Mastery)

  async getErrorProfile(studentId: string): Promise<ErrorProfile> {
    const [questions, masteries] = await Promise.all([
      this.questionRepository.find({ where: { studentId } }),
      this.masteryRepository.find({
        where: { studentId },
        relations: ['question'],
      }),
    ])

    // ---- 错因占比 ----
    const tagCount = new Map<string, number>()
    let taggedQuestions = 0
    for (const q of questions) {
      const tags = Array.isArray(q.errorTags) ? q.errorTags : []
      if (tags.length > 0) taggedQuestions += 1
      for (const t of tags) {
        tagCount.set(t, (tagCount.get(t) || 0) + 1)
      }
    }
    const errorTagDistribution: ErrorTagSlice[] = [...tagCount.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)

    // ---- 薄弱知识点画像（有错误记录的题目按知识点聚合） ----
    const kpAgg = new Map<string, WeakKnowledgePoint>()
    for (const m of masteries) {
      if (!(m.incorrectCount > 0)) continue
      const kps = Array.isArray(m.question?.knowledgePoints)
        ? (m.question!.knowledgePoints as string[])
        : []
      for (const kp of kps) {
        const entry = kpAgg.get(kp) || {
          point: kp,
          questionCount: 0,
          incorrectCount: 0,
          totalQuestions: 0,
        }
        entry.questionCount += 1
        entry.incorrectCount += m.incorrectCount
        kpAgg.set(kp, entry)
      }
    }

    // 每个知识点下的题目总数（含未出错的），用于画像比率
    for (const q of questions) {
      const kps = Array.isArray(q.knowledgePoints) ? q.knowledgePoints : []
      for (const kp of kps) {
        const entry = kpAgg.get(kp)
        if (entry) entry.totalQuestions += 1
      }
    }

    const weakKnowledgePoints: WeakKnowledgePoint[] = [...kpAgg.values()]
      .sort(
        (a, b) =>
          b.incorrectCount - a.incorrectCount || b.questionCount - a.questionCount
      )
      .slice(0, 20)

    return {
      totalQuestions: questions.length,
      taggedQuestions,
      errorTagDistribution,
      weakKnowledgePoints,
    }
  }
}
