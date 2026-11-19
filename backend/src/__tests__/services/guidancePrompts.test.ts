import { buildGuidancePrompt, GUIDANCE_LEVEL_META, GUIDANCE_LEVELS } from '../../services/guidancePrompts'

const question = {
  content: '已知函数 f(x)=x²+ax+b 在 x=1 处取得极小值 2，求 a、b 的值。',
  subject: 'math',
  type: 'answer',
  knowledgePoints: ['导数', '极值'],
}

describe('guidancePrompts（阶梯式 3 级提示 Prompt 约束）', () => {
  it('级别常量为 1/2/3，每级均有名称与字数上限', () => {
    expect(GUIDANCE_LEVELS).toEqual([1, 2, 3])
    for (const level of GUIDANCE_LEVELS) {
      expect(GUIDANCE_LEVEL_META[level].name).toBeTruthy()
      expect(GUIDANCE_LEVEL_META[level].maxChars).toBeGreaterThan(0)
      expect(GUIDANCE_LEVEL_META[level].constraint).toContain('严禁')
    }
  })

  it('第 1 级：仅指考点方向，Prompt 明确禁止算式/数值/方程/解题步骤', () => {
    const prompt = buildGuidancePrompt(question, 1)
    expect(prompt).toContain('第 1 级')
    expect(prompt).toContain('考点、定理或知识方向')
    expect(prompt).toContain('严禁出现任何具体算式、数值、方程、解题步骤')
    // 题干完整注入，模型不致瞎猜
    expect(prompt).toContain('f(x)=x²+ax+b')
    expect(prompt).toContain('导数、极值')
  })

  it('第 2 级：给条件转化与建模思路，禁止具体方程与中间结果', () => {
    const prompt = buildGuidancePrompt(question, 2)
    expect(prompt).toContain('第 2 级')
    expect(prompt).toContain('条件转化方向与建模思路')
    expect(prompt).toContain('严禁写出任何具体方程、算式、中间计算结果或最终答案')
  })

  it('第 3 级：列关键联立方程但禁止最终答案与完整求解过程', () => {
    const prompt = buildGuidancePrompt(question, 3)
    expect(prompt).toContain('第 3 级')
    expect(prompt).toContain('关键方程/关系式')
    expect(prompt).toContain('严禁给出最终答案、数值结果或完整求解过程')
    expect(prompt).toContain('学生仍需独立求解')
  })

  it('所有级别均不包含完整解析兜底语（防剧透由 RedoController.assisted 承担）', () => {
    for (const level of GUIDANCE_LEVELS) {
      const prompt = buildGuidancePrompt(question, level)
      expect(prompt).not.toContain('参考答案')
      expect(prompt).not.toContain('标准答案是')
    }
  })

  it('未知科目/题型回退为通用文案，知识点缺失不致模板报错', () => {
    const prompt = buildGuidancePrompt({ content: '求解：2x+3=7' }, 1)
    expect(prompt).toContain('数理化')
    expect(prompt).toContain('未标注')
    expect(prompt).toContain('求解：2x+3=7')
  })
})
