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
