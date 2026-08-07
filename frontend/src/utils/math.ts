import katex from 'katex'

/**
 * 将文本中的 LaTeX 公式渲染为 HTML
 * 支持 $...$ 行内公式和 $$...$$ 块级公式，同时规范换行符与转义处理
 */
export function renderMath(text: string): string {
  if (!text) return ''
  
  // 替换连续多个换行符为段落结构，保持 Markdown/文本的排版美观
  let formattedText = text.replace(/\n\n+/g, '<br/><br/>').replace(/\n/g, '<br/>')

  // 先处理 $$...$$ 块级公式
  let result = formattedText.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try {
      // 还原在换行替换过程中可能影响到的公式内部换行
      const cleanFormula = formula.replace(/<br\/>/g, '\n').trim()
      return katex.renderToString(cleanFormula, { displayMode: true, throwOnError: false })
    } catch {
      return formula
    }
  })
  
  // 再处理 $...$ 行内公式（排除转义的 \$）
  result = result.replace(/(?<!\$)\$(?!\$)(.*?)\$/g, (_, formula) => {
    try {
      const cleanFormula = formula.replace(/<br\/>/g, '\n').trim()
      return katex.renderToString(cleanFormula, { displayMode: false, throwOnError: false })
    } catch {
      return formula
    }
  })
  
  return result
}
