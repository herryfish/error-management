jest.mock('../../../config/database', () => {
  const mockQuestionRepo = {
    find: jest.fn().mockResolvedValue([]),
  }
  return {
    AppDataSource: {
      getRepository: jest.fn(() => mockQuestionRepo),
      __mockQuestionRepo: mockQuestionRepo,
    },
  }
})
jest.mock('../../../services/LLMService', () => {
  const state = { impl: jest.fn() }
  return {
    LLMService: jest.fn(() => ({ identifyMultiQuestions: state.impl })),
    __llmState: state,
  }
})

import { processIdentifyMulti, textFingerprint } from '../../../services/tasks/identifyMultiPipeline'

const { AppDataSource } = require('../../../config/database')
const { __llmState } = require('../../../services/LLMService')

beforeEach(() => {
  jest.clearAllMocks()
  __llmState.impl.mockReset()
  AppDataSource.__mockQuestionRepo.find.mockReset().mockResolvedValue([])
})

describe('identifyMultiPipeline（整页识别任务管道）', () => {
  it('LLM 识别成功：条目归一化（tempId/默认值）', async () => {
    __llmState.impl.mockResolvedValue([
      { title: '题目A', content: '求解 x', subject: 'physics', type: 'fill', answer: 'x=1', explanation: '移项' },
      { title: '题目B', content: '计算 2+3' },
    ])

    const { items } = await processIdentifyMulti({ imagePath: '/p.jpg', userId: 'u1' })
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ title: '题目A', subject: 'physics', type: 'fill', isDuplicate: false })
    expect(items[1]).toMatchObject({ title: '题目B', subject: 'math', type: 'choice', isDuplicate: false })
    expect(items.every((i: any) => typeof i.tempId === 'string' && i.tempId)).toBe(true)
  })

  it('LLM 失败/返回空：回退内置 mock 条目', async () => {
    __llmState.impl.mockResolvedValue(null)
    const { items } = await processIdentifyMulti({ imagePath: '/p.jpg', userId: 'u1', subject: 'chemistry' })
    expect(items).toHaveLength(2)
    expect(items[0].title).toBe('识别题目 1')
    expect(items[0].subject).toBe('chemistry')
  })

  it('文本指纹与已有错题重复 → isDuplicate 标记 + existingQuestionId', async () => {
    __llmState.impl.mockResolvedValue([
      { title: '求解方程', content: 'x^2-4=0 的解' },
    ])
    AppDataSource.__mockQuestionRepo.find.mockResolvedValue([
      { id: 'q-existing', title: '求解方程', content: 'x^2-4=0 的解' },
    ])

    const { items } = await processIdentifyMulti({ imagePath: '/p.jpg', userId: 'u1' })
    expect(items[0].isDuplicate).toBe(true)
    expect(items[0].existingQuestionId).toBe('q-existing')
  })

  it('防重查询异常时整体失败（任务进入 failed）', async () => {
    __llmState.impl.mockResolvedValue([{ title: 'T', content: 'C' }])
    AppDataSource.__mockQuestionRepo.find.mockRejectedValue(new Error('db down'))

    await expect(
      processIdentifyMulti({ imagePath: '/p.jpg', userId: 'u1' })
    ).rejects.toThrow('db down')
  })

  it('textFingerprint 去除空白与标点', () => {
    expect(textFingerprint('Hello, world!', ' x = 1 ')).toBe('Helloworldx1')
    expect(textFingerprint('已知：a=1', '求 b？')).toBe('已知a1求b')
  })
})
