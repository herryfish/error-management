/**
 * 阶梯式 3 级提示（Scaffolding Hints）Prompt 构建
 *
 * 检索练习防剧透：重做页 LLM「引导解答」按 3 级渐进提示组织——
 * ① 考点/定理方向（不含算式）→ ② 条件转化/建模思路 → ③ 关键联立方程；
 * 完整解析为兜底，查看完整解析的轮次按「未独立掌握」记录（见 RedoController.assisted）。
 *
 * 本模块是纯函数（不触库、不发请求），便于对 Prompt 约束做单测。
 */

export const GUIDANCE_LEVELS = [1, 2, 3] as const

export type GuidanceLevel = (typeof GUIDANCE_LEVELS)[number]

export interface GuidanceQuestionInfo {
  /** 题干内容（含公式） */
  content: string
  /** 科目（math/physics/chemistry） */
  subject?: string
  /** 题型（choice/fill/answer） */
  type?: string
  /** 知识点标签 */
  knowledgePoints?: string[] | null
}

export const GUIDANCE_LEVEL_META: Record<
  GuidanceLevel,
  { name: string; constraint: string; maxChars: number }
> = {
  1: {
    name: '考点定向',
    constraint:
      '【第 1 级约束】只指出本题考查的核心考点、定理或知识方向（1~3 条，每条一句话）。' +
      '严禁出现任何具体算式、数值、方程、解题步骤或变相泄露解法的表述。',
    maxChars: 100,
  },
  2: {
    name: '思路台阶',
    constraint:
      '【第 2 级约束】给出条件转化方向与建模思路（如需要建立的关系式类型、辅助线/受力分析方向、隐含条件的挖掘角度）。' +
      '严禁写出任何具体方程、算式、中间计算结果或最终答案。',
    maxChars: 120,
  },
  3: {
    name: '关键方程',
    constraint:
      '【第 3 级约束】列出求解本题需要联立的关键方程/关系式（可用 LaTeX 表示），' +
      '最多 5 个方程。严禁给出最终答案、数值结果或完整求解过程——学生仍需独立求解。',
    maxChars: 200,
  },
}

const SUBJECT_TEXT: Record<string, string> = {
  math: '数学',
  physics: '物理',
  chemistry: '化学',
}

const TYPE_TEXT: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  answer: '解答题',
}

/**
 * 构建指定级别的引导提示 Prompt。
 * 学生作答前不提供任何完整解析；提示层级由浅入深，逐级解锁。
 */
export function buildGuidancePrompt(
  question: GuidanceQuestionInfo,
  level: GuidanceLevel
): string {
  const meta = GUIDANCE_LEVEL_META[level]
  const subject = SUBJECT_TEXT[question.subject || ''] || '数理化'
  const type = TYPE_TEXT[question.type || ''] || ''
  const knowledgePoints = (question.knowledgePoints || []).join('、') || '未标注'

  return [
    `你是专业的${subject}辅导老师。学生正在独立重做一道错题，卡壳后主动请求第 ${level} 级引导提示。`,
    '',
    `【题目信息】${type ? `题型：${type}；` : ''}知识点标签：${knowledgePoints}`,
    '【题干】',
    question.content,
    '',
    meta.constraint,
    `【输出要求】直接输出提示正文（不超过 ${meta.maxChars} 字），语言精炼、面向高中生；`,
    '不要输出任何标题、前言、客套话或对约束的复述。',
  ].join('\n')
}
