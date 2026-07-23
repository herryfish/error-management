import katex from 'katex'

/**
 * 将文本中的 LaTeX 公式渲染为 HTML
 * 支持 $...$ 行内公式和 $$...$$ 块级公式
 */
export function renderMath(text: string): string {
  if (!text) return ''
  
  // 先处理 $$...$$ 块级公式
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })
    } catch {
      return formula
    }
  })
  
  // 再处理 $...$ 行内公式（排除转义的 \$）
  result = result.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false })
    } catch {
      return formula
    }
  })
  
  return result
}
