/**
 * 错因标签体系（多维度错因标注）
 *
 * 预设错因标签：录入与重做流程中可标注，家长端/学生端按此统计错因占比。
 * 为保证画像统计口径一致，后端只接受预设白名单内的标签。
 */

export const ERROR_TAG_PRESETS = [
  '审题不清',
  '计算粗心',
  '公式遗忘',
  '方法缺失',
  '其他',
] as const

export type ErrorTag = (typeof ERROR_TAG_PRESETS)[number]

/**
 * 将任意输入（数组或逗号分隔字符串）归一化为合法错因标签数组：
 * 去重、去空白、过滤非白名单值，最多保留 10 个。
 */
export function normalizeErrorTags(input: unknown): string[] {
  let raw: string[] = []
  if (Array.isArray(input)) {
    raw = input
  } else if (typeof input === 'string') {
    raw = input.split(',')
  }
  const cleaned = raw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter(Boolean)
  return [...new Set(cleaned.filter((t) => (ERROR_TAG_PRESETS as readonly string[]).includes(t)))].slice(0, 10)
}

/**
 * 合并两组错因标签（重做流程追加标注场景）：并集、去重、白名单过滤。
 */
export function mergeErrorTags(existing: unknown, incoming: unknown): string[] {
  return normalizeErrorTags([...normalizeErrorTags(existing), ...normalizeErrorTags(incoming)])
}
