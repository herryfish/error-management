/**
 * 整页多题识别任务管道（异步化核心逻辑）
 *
 * 从 QuestionController.identifyMultiQuestions 提取，供以下两条路径共用：
 * - 异步任务（BullMQ Worker / 进程内队列 Worker）；
 * - 同步 HTTP 接口（兼容保留）。
 *
 * 处理步骤：Vision LLM 切题识别 → 结果归一化 → 文本指纹防重标记 → 失败兜底 mock 题。
 */

import { AppDataSource } from '../../config/database'
import { Question, Subject, QuestionType } from '../../models/Question'
import { LLMService } from '../LLMService'
import { v4 as uuidv4 } from 'uuid'

export interface IdentifyMultiJobData {
  imagePath: string
  userId: string
  subject?: string
}

export interface MultiRecognizeItem {
  tempId: string
  title: string
  content: string
  subject: string
  type: string
  answer: string
  explanation: string
  isDuplicate: boolean
  existingQuestionId?: string
}

export type ProgressFn = (progress: number) => void | Promise<void>

const MOCK_ITEMS = (subject: string): Omit<MultiRecognizeItem, 'tempId'>[] => [
  {
    title: '识别题目 1',
    content: '计算：2 + 3 = ?',
    subject,
    type: QuestionType.CHOICE,
    answer: '5',
    explanation: '基础加法运算',
    isDuplicate: false,
  },
  {
    title: '识别题目 2',
    content: '求解方程：x^2 - 4 = 0',
    subject,
    type: QuestionType.ANSWER,
    answer: 'x = ±2',
    explanation: '因式分解求解',
    isDuplicate: false,
  },
]

/** 文本指纹：去除空白与标点，仅保留中英文数字 */
export function textFingerprint(title: string, content: string): string {
  return (title + content)
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
}

/**
 * 执行整页多题识别：调用 Vision LLM，归一化条目，并按文本指纹标记重复。
 * LLM 不可用/失败时回退到内置 mock 条目（与原同步接口行为一致）。
 */
export async function processIdentifyMulti(
  data: IdentifyMultiJobData,
  onProgress: ProgressFn = () => {}
): Promise<{ items: MultiRecognizeItem[] }> {
  const subject = data.subject || Subject.MATH
  const userId = data.userId

  let llmItems: any[] = []
  try {
    await onProgress(10)
    const llmService = new LLMService()
    const llmResult = await llmService.identifyMultiQuestions(data.imagePath, userId)
    if (Array.isArray(llmResult) && llmResult.length > 0) {
      llmItems = llmResult.map((item: any, idx: number) => ({
        tempId: uuidv4(),
        title: item.title || `识别题目 ${idx + 1}`,
        content: item.content || '',
        subject: item.subject || subject,
        type: item.type || QuestionType.CHOICE,
        answer: item.answer || '',
        explanation: item.explanation || '',
        isDuplicate: false,
      }))
    }
  } catch (err) {
    console.error('LLM identifyMultiQuestions error:', err)
  }

  const rawItems = llmItems.length > 0
    ? llmItems
    : MOCK_ITEMS(subject).map((item) => ({ ...item, tempId: uuidv4() }))

  await onProgress(55)

  // 文本指纹防重标记
  try {
    const questionRepository = AppDataSource.getRepository(Question)
    const existingList = userId
      ? await questionRepository.find({
          where: { studentId: userId, subject: subject as any },
        })
      : []
    const existingFps = existingList.map((q) => textFingerprint(q.title || '', q.content || ''))

    for (const item of rawItems) {
      const fp = textFingerprint(item.title, item.content)
      if (userId && fp) {
        // 与原同步接口一致的精确指纹匹配
        const dupIndex = existingFps.findIndex((qfp) => qfp === fp)
        if (dupIndex !== -1) {
          item.isDuplicate = true
          item.existingQuestionId = existingList[dupIndex].id
        }
      }
    }
  } catch (err) {
    console.error('Duplicate fingerprint check error:', err)
    throw err
  }

  await onProgress(90)

  return { items: rawItems }
}
