import { describe, it, expect } from 'vitest'
import { buildPaperHtml, escapeHtml, type PaperQuestion } from '../paperBuilder'

const passthrough = (t: string) => t

const baseQuestion = (overrides: Partial<PaperQuestion> = {}): PaperQuestion => ({
  title: '一元二次方程求解',
  content: '已知方程 $x^2 - 4 = 0$，求所有实数解。',
  subject: 'math',
  type: 'answer',
  difficulty: 3,
  diagramUrls: ['/uploads/diagram-1.png'],
  answer: '$x = \\pm 2$',
  explanation: '因式分解得 $(x-2)(x+2) = 0$。',
  ...overrides,
})

describe('escapeHtml', () => {
  it('转义纯文本中的 HTML 特殊字符', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    )
    expect(escapeHtml('a & "b" \'c\'')).toBe('a &amp; &quot;b&quot; &#39;c&#39;')
  })
})

describe('buildPaperHtml', () => {
  it('纯题卷：包含题干、公式、干净插图，不含答案/解析/原图', () => {
    const q = baseQuestion({
      diagramUrls: ['/uploads/diagram-clean.png'],
      answer: 'SECRET-ANSWER',
      explanation: 'SECRET-EXPLANATION',
    })
    const html = buildPaperHtml([q], { mode: 'questions' }, passthrough)

    expect(html).toContain('错题重练卷')
    expect(html).toContain('纯题卷 · 不含答案')
    expect(html).toContain('已知方程 $x^2 - 4 = 0$')
    expect(html).toContain('src="/uploads/diagram-clean.png"')
    expect(html).not.toContain('SECRET-ANSWER')
    expect(html).not.toContain('SECRET-EXPLANATION')
    expect(html).not.toContain('pq-answer-block')
  })

  it('题卷+详细解析：包含答案与解析块', () => {
    const html = buildPaperHtml([baseQuestion()], { mode: 'withAnswers' }, passthrough)

    expect(html).toContain('错题重练卷（含解析）')
    expect(html).toContain('含参考答案与解析')
    expect(html).toContain('pq-answer-block')
    expect(html).toContain('参考答案')
    expect(html).toContain('因式分解得 $(x-2)(x+2) = 0$')
  })

  it('插图只取 diagramUrls，绝不输出 imageUrl（原图由调用方不传入，构建器也不接受该字段）', () => {
    const q = baseQuestion() as any
    q.imageUrl = '/uploads/original-with-handwriting.jpg'
    const html = buildPaperHtml([q], { mode: 'questions' }, passthrough)
    expect(html).toContain('/uploads/diagram-1.png')
    expect(html).not.toContain('original-with-handwriting')
  })

  it('多题题号连续，头部统计题数与科目', () => {
    const qs = [
      baseQuestion({ subject: 'math' }),
      baseQuestion({ subject: 'physics' }),
      baseQuestion({ subject: 'chemistry' }),
    ]
    const html = buildPaperHtml(qs, { mode: 'questions' }, passthrough)
    expect(html).toContain('共 3 题')
    expect(html).toContain('数学')
    expect(html).toContain('物理')
    expect(html).toContain('化学')
    expect(html).toContain('<span class="pq-no">1.</span>')
    expect(html).toContain('<span class="pq-no">3.</span>')
  })

  it('标题与选项等纯文本先转义再进渲染函数（防注入）', () => {
    const q = baseQuestion({ title: '求 <b>所有</b> 解 & "验证"' })
    const html = buildPaperHtml([q], { mode: 'questions' }, passthrough)
    expect(html).toContain('求 &lt;b&gt;所有&lt;/b&gt; 解 &amp; &quot;验证&quot;')
  })

  it('自定义渲染函数被用于题干/答案/解析', () => {
    const calls: string[] = []
    const spy = (t: string) => {
      calls.push(t)
      return `[R:${t}]`
    }
    const html = buildPaperHtml([baseQuestion()], { mode: 'withAnswers' }, spy)
    expect(html).toContain('[R:一元二次方程求解]')
    expect(html).toContain('[R:$x = \\pm 2$]')
    expect(calls).toContain('已知方程 $x^2 - 4 = 0$，求所有实数解。')
  })

  it('空列表输出空卷提示', () => {
    const html = buildPaperHtml([], { mode: 'questions' }, passthrough)
    expect(html).toContain('暂无错题可导出')
    expect(html).toContain('共 0 题')
  })
})
