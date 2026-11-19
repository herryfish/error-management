/**
 * generateGuidanceHint 服务级单测（mock，无真实 API 调用）
 */

jest.mock('../../models/LLMUsage', () => ({
  LLMUsage: class {},
  LLMScene: {
    RECOGNITION: 'recognition',
    GRADING: 'grading',
    GUIDANCE: 'guidance',
    SIMILAR: 'similar',
    MULTI_RECOGNITION: 'multi_recognition',
    OTHER: 'other',
  },
}))

const mockCreate = jest.fn()

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }))
})

jest.mock('../../config/database', () => {
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
  }
  return { AppDataSource: { getRepository: jest.fn(() => mockRepo) } }
})

process.env.LLM_PRIMARY_API_KEY = 'test-key'
process.env.LLM_FALLBACK_ENABLED = 'false'

import { LLMService } from '../../services/LLMService'

describe('LLMService.generateGuidanceHint（阶梯式提示）', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const question = {
    content: '已知函数 f(x)=x²+ax+b 在 x=1 处取得极小值 2，求 a、b 的值。',
    subject: 'math',
    type: 'answer',
    knowledgePoints: ['导数'],
  }

  it('返回提示正文并剥掉模型自加的代码围栏', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '```\n本题考查导数极值条件。\n```' } }],
      usage: { prompt_tokens: 80, completion_tokens: 20, total_tokens: 100 },
    })

    const service = new LLMService()
    const hint = await service.generateGuidanceHint(question, 1, 'user1')

    expect(hint).toBe('本题考查导数极值条件。')
    expect(mockCreate).toHaveBeenCalledTimes(1)
    const payload = mockCreate.mock.calls[0][0]
    expect(payload.messages[0].content).toContain('第 1 级')
    // guidance 场景用量已记录
    const { AppDataSource } = require('../../config/database')
    const usageRepo = AppDataSource.getRepository()
    expect(usageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ scene: 'guidance', success: true, userId: 'user1' })
    )
    expect(usageRepo.save).toHaveBeenCalled()
  })

  it('未配置 LLM 客户端时抛错（不静默兜底泄露解析）', async () => {
    const service = new LLMService()
    ;(service as any).primaryClient = null
    await expect(service.generateGuidanceHint(question, 2, 'user1')).rejects.toThrow(
      'Primary LLM client not configured'
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('调用失败时记录失败用量并向上抛错（由控制器转为 502 提示）', async () => {
    mockCreate.mockRejectedValue(new Error('timeout'))

    const service = new LLMService()
    await expect(service.generateGuidanceHint(question, 3, 'user1')).rejects.toThrow('timeout')

    const { AppDataSource } = require('../../config/database')
    const usageRepo = AppDataSource.getRepository()
    expect(usageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ scene: 'guidance', success: false })
    )
  })
})
