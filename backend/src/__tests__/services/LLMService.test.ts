// Mock all TypeORM dependencies before importing
jest.mock('typeorm', () => ({
  Entity: () => ({}),
  PrimaryGeneratedColumn: () => ({}),
  Column: () => ({}),
  CreateDateColumn: () => ({}),
  UpdateDateColumn: () => ({}),
  ManyToOne: () => ({}),
  OneToMany: () => ({}),
  OneToOne: () => ({}),
  JoinColumn: () => ({}),
}))

jest.mock('../../models/LLMUsage', () => ({
  LLMUsage: class {},
  LLMScene: { RECOGNITION: 'recognition', GRADING: 'grading', SIMILAR: 'similar' },
}))

jest.mock('../../config/database', () => {
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
  }
  return { AppDataSource: { getRepository: jest.fn(() => mockRepo) } }
})

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                title: '求解方程',
                content: '解方程 x+1=0',
                subject: 'math',
                type: 'answer',
                difficulty: 1,
                knowledgePoints: ['代数'],
                answer: 'x=-1',
                explanation: '移项得 x=-1',
                confidence: 0.95,
              }),
            },
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }),
      },
    },
  }))
})

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-image-data')),
}))

import { LLMService } from '../../services/LLMService'
import OpenAI from 'openai'

describe('LLMService', () => {
  let service: LLMService

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.LLM_PRIMARY_PROVIDER = 'openai'
    process.env.LLM_PRIMARY_MODEL = 'gpt-4'
    process.env.LLM_PRIMARY_API_KEY = 'test-key'
    process.env.LLM_PRIMARY_API_BASE = 'https://api.openai.com/v1'
    process.env.LLM_FALLBACK_ENABLED = 'false'
    service = new LLMService()
  })

  describe('identifyQuestion', () => {
    it('应该成功识别题目并返回结构化结果', async () => {
      const result = await service.identifyQuestion('/tmp/test.jpg', 'user1')
      expect(result).toEqual(
        expect.objectContaining({
          title: '求解方程',
          content: '解方程 x+1=0',
          subject: 'math',
          type: 'answer',
          difficulty: 1,
          knowledgePoints: expect.any(Array),
          confidence: expect.any(Number),
        })
      )
    })

    it('应该记录LLM用量', async () => {
      const mockUsage = (service as any).llmUsageRepository
      mockUsage.create.mockImplementation((data: any) => data)
      mockUsage.save.mockImplementation(async (data: any) => data)
      await service.identifyQuestion('/tmp/test.jpg', 'user1')
      expect(mockUsage.save).toHaveBeenCalled()
    })
  })

  describe('generateSimilarQuestion', () => {
    it('应该生成相似题目', async () => {
      const result = await service.generateSimilarQuestion('求解 x+1=0', ['代数'], 'user1')
      expect(result).toBeDefined()
    })
  })
})

describe('LLMService 配置默认值与客户端初始化', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.LLM_PRIMARY_PROVIDER = 'openai'
    process.env.LLM_PRIMARY_API_KEY = 'test-key'
    process.env.LLM_PRIMARY_API_BASE = 'https://api.openai.com/v1'
    delete process.env.LLM_PRIMARY_MODEL
    delete process.env.LLM_FALLBACK_PROVIDER
    delete process.env.LLM_FALLBACK_MODEL
    delete process.env.LLM_FALLBACK_API_KEY
    delete process.env.LLM_FALLBACK_TIMEOUT_MS
    delete process.env.LLM_PRIMARY_TIMEOUT_MS
    process.env.LLM_FALLBACK_ENABLED = 'false'
  })

  it('未设置 LLM_PRIMARY_MODEL 时应默认使用 gpt-4o-mini（gpt-4-vision-preview 已被 OpenAI 退役）', () => {
    const svc = new LLMService()
    expect((svc as any).config.primary.model).toBe('gpt-4o-mini')
  })

  it('OpenAI 客户端应按独立主模型超时初始化，且关闭 SDK 内部重试（由服务层统一编排）', () => {
    process.env.LLM_PRIMARY_MODEL = 'gpt-4'
    process.env.LLM_PRIMARY_TIMEOUT_MS = '45000'
    new LLMService()
    const calls = jest.mocked(OpenAI).mock.calls
    expect(calls.length).toBe(1)
    expect(calls[0][0]).toEqual(
      expect.objectContaining({
        apiKey: 'test-key',
        baseURL: 'https://api.openai.com/v1',
        timeout: 45000,
        maxRetries: 0,
      })
    )
  })

  it('未设置 LLM_PRIMARY_TIMEOUT_MS 时主模型客户端默认 120s（为 Vision 识题留余量）', () => {
    process.env.LLM_PRIMARY_MODEL = 'gpt-4'
    new LLMService()
    const calls = jest.mocked(OpenAI).mock.calls
    expect(calls[0][0]).toEqual(expect.objectContaining({ timeout: 120000 }))
  })

  it('配置降级模型时，降级客户端应使用降级策略超时而非主模型超时', () => {
    process.env.LLM_PRIMARY_MODEL = 'gpt-4'
    process.env.LLM_FALLBACK_PROVIDER = 'openai'
    process.env.LLM_FALLBACK_MODEL = 'gpt-4o-mini'
    process.env.LLM_FALLBACK_API_KEY = 'fallback-key'
    process.env.LLM_FALLBACK_TIMEOUT_MS = '15000'
    process.env.LLM_FALLBACK_ENABLED = 'true'
    new LLMService()
    const calls = jest.mocked(OpenAI).mock.calls
    expect(calls.length).toBe(2)
    expect(calls[1][0]).toEqual(
      expect.objectContaining({
        apiKey: 'fallback-key',
        timeout: 15000,
        maxRetries: 0,
      })
    )
  })
})
