/**
 * A4 排版试卷构建器（纯函数，可单测）
 *
 * 两种导出模式（对标 wrong-notebook）：
 * - questions     纯题卷：仅题目文本 + KaTeX 公式 + 干净的 diagramUrls 裁剪插图；
 *                 不含参考答案、解析与带手写笔记的原始全景图，适合线下重做；
 * - withAnswers   题卷 + 详细解析：在纯题卷基础上追加参考答案与解析块。
 *
 * 安全约定：题目文本/公式走 renderMath（与应用其余渲染路径一致）；
 * 纯文本片段（标题、姓名、标签）统一 escapeHtml 后输出。
 */

import { renderMath } from './math'

export type PaperMode = 'questions' | 'withAnswers'

export interface PaperQuestion {
  title: string
  content: string
  subject: string
  type: string
  difficulty?: number
  /** 干净裁剪插图（不含手写答案的全景图不入卷） */
  diagramUrls?: string[]
  answer?: string
  explanation?: string
}

export interface PaperOptions {
  mode: PaperMode
  paperTitle?: string
  studentName?: string
  date?: string
}

const SUBJECT_TEXTS: Record<string, string> = {
  math: '数学',
  physics: '物理',
  chemistry: '化学',
}

const TYPE_TEXTS: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  answer: '解答题',
}

export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const subjectText = (s: string) => SUBJECT_TEXTS[s] || s
const typeText = (t: string) => TYPE_TEXTS[t] || t

/**
 * 构建试卷正文 HTML 片段（不含 <html> 外壳与样式表；
 * @page/print 样式由承载页面提供，保证该函数在 Node 单测环境可运行）。
 */
/** 公式渲染函数签名（与 utils/math 的 renderMath 兼容） */
interface MathRenderer {
  // eslint-disable-next-line no-unused-vars -- 函数类型参数名仅作类型标注
  (t: string): string
}

export function buildPaperHtml(
  questions: PaperQuestion[],
  options: PaperOptions,
  renderMathFn: MathRenderer = renderMath
): string {
  // 题干/答案/解析：先转义纯文本再交给渲染函数（防注入），公式渲染与全应用一致
  const safeMath = (text: string) => renderMathFn(escapeHtml(text))
  const mode = options.mode === 'withAnswers' ? 'withAnswers' : 'questions'
  const paperTitle = options.paperTitle || (mode === 'withAnswers' ? '错题重练卷（含解析）' : '错题重练卷')

  const header = `
    <header class="paper-header">
      <h1 class="paper-title">${escapeHtml(paperTitle)}</h1>
      <div class="paper-meta">
        <span>${escapeHtml(options.studentName ? `学生：${options.studentName}` : '')}</span>
        <span>${escapeHtml(options.date || '')}</span>
        <span>共 ${questions.length} 题</span>
        <span>${mode === 'withAnswers' ? '含参考答案与解析' : '纯题卷 · 不含答案'}</span>
      </div>
    </header>
  `

  const body = questions
    .map((q, idx) => {
      const head = `
        <div class="pq-head">
          <span class="pq-no">${idx + 1}.</span>
          <span class="pq-tag">${escapeHtml(subjectText(q.subject))}</span>
          <span class="pq-tag">${escapeHtml(typeText(q.type))}</span>
          ${q.difficulty ? `<span class="pq-tag">难度 ${escapeHtml(String(q.difficulty))}</span>` : ''}
        </div>
      `
      const titleHtml = q.title
        ? `<div class="pq-title">${safeMath(q.title)}</div>`
        : ''
      const contentHtml = q.content
        ? `<div class="pq-content">${safeMath(q.content)}</div>`
        : ''

      // 仅使用独立裁剪插图 diagramUrls；带手写笔记的原始全景图 imageUrl 一律不入卷
      const diagramItems = (q.diagramUrls || [])
        .filter((url) => typeof url === 'string' && url)
        .map(
          (url, i) => `
          <figure class="pq-diagram">
            <img src="${escapeHtml(url)}" alt="题图 ${i + 1}" />
          </figure>`
        )
        .join('')
      const diagramsHtml = diagramItems
        ? `<div class="pq-diagrams">${diagramItems}</div>`
        : ''

      let answerHtml = ''
      if (mode === 'withAnswers') {
        answerHtml = `
          <div class="pq-answer-block">
            ${q.answer ? `<div class="pq-answer"><span class="pq-answer-label">参考答案</span><div class="pq-answer-body">${renderMathFn(escapeHtml(q.answer))}</div></div>` : ''}
            ${q.explanation ? `<div class="pq-explanation"><span class="pq-answer-label">解析</span><div class="pq-answer-body">${renderMathFn(escapeHtml(q.explanation))}</div></div>` : ''}
          </div>
        `
      }

      return `
        <section class="pq">
          ${head}
          ${titleHtml}
          ${contentHtml}
          ${diagramsHtml}
          ${answerHtml}
        </section>
      `
    })
    .join('\n')

  const empty = questions.length === 0 ? `<div class="paper-empty">暂无错题可导出</div>` : ''

  return `
    <div class="a4-paper">
      ${header}
      ${empty}
      ${body}
    </div>
  `
}
