import { ErrorProfileService } from '../../services/ErrorProfileService'
import { ERROR_TAG_PRESETS, normalizeErrorTags, mergeErrorTags } from '../../constants/errorTags'

const mockQuestionRepo = { find: jest.fn() }
const mockMasteryRepo = { find: jest.fn() }

jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}))

const resetRepos = () => {
  mockQuestionRepo.find.mockReset().mockResolvedValue([])
  mockMasteryRepo.find.mockReset().mockResolvedValue([])
  const { AppDataSource } = require('../../config/database')
  ;(AppDataSource.getRepository as jest.Mock).mockReset()
  // 构造顺序：先 Question 后 Mastery
  ;(AppDataSource.getRepository as jest.Mock)
    .mockImplementationOnce(() => mockQuestionRepo)
    .mockImplementationOnce(() => mockMasteryRepo)
}

describe('errorTags 常量（错因标签白名单）', () => {
  it('预设包含四个核心错因与「其他」', () => {
    expect(ERROR_TAG_PRESETS).toEqual(['审题不清', '计算粗心', '公式遗忘', '方法缺失', '其他'])
  })

  it('normalizeErrorTags 过滤非白名单值并去重', () => {
    expect(normalizeErrorTags(['审题不清', '乱写的', '审题不清', '  计算粗心 '])).toEqual([
      '审题不清',
      '计算粗心',
    ])
  })

  it('normalizeErrorTags 支持逗号分隔字符串', () => {
    expect(normalizeErrorTags('公式遗忘,方法缺失')).toEqual(['公式遗忘', '方法缺失'])
  })

  it('normalizeErrorTags 忽略非字符串/空输入', () => {
    expect(normalizeErrorTags(null)).toEqual([])
    expect(normalizeErrorTags(undefined)).toEqual([])
    expect(normalizeErrorTags(123)).toEqual([])
  })

  it('mergeErrorTags 取并集去重', () => {
    expect(mergeErrorTags(['审题不清'], ['审题不清', '计算粗心'])).toEqual([
      '审题不清',
      '计算粗心',
    ])
  })
})

describe('ErrorProfileService（薄弱点画像聚合）', () => {
  beforeEach(() => {
    resetRepos()
  })

  it('空数据返回空画像', async () => {
    const service = new ErrorProfileService()
    const result = await service.getErrorProfile('s1')
    expect(result).toEqual({
      totalQuestions: 0,
      taggedQuestions: 0,
      errorTagDistribution: [],
      weakKnowledgePoints: [],
    })
  })

  it('聚合错因占比（按次数降序）与标注题数', async () => {
    mockQuestionRepo.find.mockResolvedValue([
      { errorTags: ['审题不清', '计算粗心'] },
      { errorTags: ['审题不清'] },
      { errorTags: [] },
    ])
    mockMasteryRepo.find.mockResolvedValue([])

    const result = await new ErrorProfileService().getErrorProfile('s1')
    expect(result.totalQuestions).toBe(3)
    expect(result.taggedQuestions).toBe(2)
    expect(result.errorTagDistribution).toEqual([
      { tag: '审题不清', count: 2 },
      { tag: '计算粗心', count: 1 },
    ])
  })

  it('聚合薄弱知识点（有错误记录的题目，按错误次数降序，含题目总数）', async () => {
    mockQuestionRepo.find.mockResolvedValue([
      { knowledgePoints: ['一元二次方程', '因式分解'] },
    ])
    mockMasteryRepo.find.mockResolvedValue([
      {
        incorrectCount: 3,
        question: { knowledgePoints: ['一元二次方程', '因式分解'] },
      },
      {
        incorrectCount: 1,
        question: { knowledgePoints: ['一元二次方程'] },
      },
    ])

    const result = await new ErrorProfileService().getErrorProfile('s1')
    expect(result.weakKnowledgePoints).toEqual([
      { point: '一元二次方程', questionCount: 2, incorrectCount: 4, totalQuestions: 1 },
      { point: '因式分解', questionCount: 1, incorrectCount: 3, totalQuestions: 1 },
    ])
  })

  it('无错误记录的知识点不出现在画像中', async () => {
    mockQuestionRepo.find.mockResolvedValue([{ knowledgePoints: ['化学平衡'] }])
    mockMasteryRepo.find.mockResolvedValue([{ incorrectCount: 0, question: { knowledgePoints: ['化学平衡'] } }])

    const result = await new ErrorProfileService().getErrorProfile('s1')
    expect(result.weakKnowledgePoints).toEqual([])
  })
})
