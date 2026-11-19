<!--
  错题本 A4 排版导出（打印 / 保存为 PDF）

  两种模式：
  - 纯题卷：题目文本 + KaTeX 公式 + 干净裁剪插图，不含答案/解析/带手写笔记的原图
  - 题卷 + 详细解析：追加参考答案与解析块

  打印流程：点击「打印 / 保存为 PDF」→ 浏览器打印对话框（纸张默认 A4、边距默认）→
  选择「另存为 PDF」即得 A4 排版 PDF。@media print 只保留试卷覆盖层内容。
-->
<template>
  <div class="paper-export-page">
    <van-nav-bar
      title="导出试卷"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="paper-toolbar no-print">
      <van-radio-group v-model="mode" direction="horizontal" class="mode-switch">
        <van-radio name="questions">纯题卷（不含答案）</van-radio>
        <van-radio name="withAnswers">题卷 + 详细解析</van-radio>
      </van-radio-group>
      <van-button
        type="primary"
        icon="printer"
        :loading="printing"
        :disabled="questions.length === 0"
        block
        round
        @click="printPaper"
      >
        打印 / 保存为 PDF
      </van-button>
      <div class="toolbar-hint">
        共 {{ questions.length }} 道题 · 打印时纸张选 A4、边距默认、勾选背景图形即得 PDF
      </div>
    </div>

    <van-loading v-if="loading" class="loading" />
    <van-empty
      v-else-if="questions.length === 0"
      description="错题本暂无错题，先去录入吧"
    />

    <div v-else class="paper-overlay" v-html="paperHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { questionService, type Question } from '@/services/questions'
import { buildPaperHtml, type PaperMode } from '@/utils/paperBuilder'

const mode = ref<PaperMode>('questions')
const loading = ref(false)
const printing = ref(false)
const questions = ref<Question[]>([])

const paperHtml = computed(() =>
  buildPaperHtml(
    questions.value.map((q) => ({
      title: q.title,
      content: q.content,
      subject: q.subject,
      type: q.type,
      difficulty: q.difficulty,
      diagramUrls: q.diagramUrls,
      answer: q.answer,
      explanation: q.explanation,
    })),
    {
      mode: mode.value,
      date: new Date().toLocaleDateString('zh-CN'),
    }
  )
)

const printPaper = () => {
  printing.value = true
  // 等待公式/插图渲染完成后进入打印对话框
  setTimeout(() => {
    window.print()
    printing.value = false
  }, 300)
}

onMounted(async () => {
  loading.value = true
  try {
    questions.value = await questionService.getAll()
  } catch (e) {
    console.error('Failed to load questions for export:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.paper-export-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 40px;
}

.paper-toolbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #ffffff;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.mode-switch {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #969799;
  text-align: center;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

/* 试卷覆盖层：模拟 A4 纸张 */
.paper-overlay {
  padding: 16px;
  display: flex;
  justify-content: center;
}
</style>

<style>
/* 试卷排版样式（非 scoped，配合 v-html 注入内容；@page 与打印规则在此集中管理） */
.a4-paper {
  width: 210mm;
  max-width: 100%;
  min-height: 297mm;
  padding: 14mm;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
  color: #000;
}

.a4-paper .paper-title {
  font-size: 20pt;
  text-align: center;
  margin: 0 0 4pt;
}

.a4-paper .paper-meta {
  display: flex;
  justify-content: center;
  gap: 12pt;
  font-size: 10pt;
  color: #444;
  border-bottom: 1.2pt solid #000;
  padding-bottom: 8pt;
  margin-bottom: 12pt;
}

.a4-paper .pq {
  page-break-inside: avoid;
  break-inside: avoid;
  margin-bottom: 14pt;
}

.a4-paper .pq-head {
  font-size: 10pt;
  color: #555;
  margin-bottom: 4pt;
}

.a4-paper .pq-no {
  font-weight: 700;
  font-size: 12pt;
  color: #000;
  margin-right: 4pt;
}

.a4-paper .pq-tag {
  display: inline-block;
  border: 0.6pt solid #999;
  border-radius: 3pt;
  padding: 0 4pt;
  margin-right: 4pt;
  font-size: 8.5pt;
}

.a4-paper .pq-title {
  font-size: 11.5pt;
  font-weight: 600;
}

.a4-paper .pq-content {
  font-size: 11pt;
  line-height: 1.75;
  word-break: break-word;
}

.a4-paper .pq-diagrams {
  margin: 6pt 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8pt;
}

.a4-paper .pq-diagram {
  margin: 0;
  max-width: 78mm;
}

.a4-paper .pq-diagram img {
  max-width: 100%;
  max-height: 60mm;
  border: 0.5pt solid #ddd;
}

.a4-paper .pq-answer-block {
  margin-top: 6pt;
  border-top: 0.8pt dashed #999;
  padding-top: 6pt;
}

.a4-paper .pq-answer,
.a4-paper .pq-explanation {
  margin-bottom: 6pt;
}

.a4-paper .pq-answer-label {
  display: inline-block;
  font-size: 9pt;
  font-weight: 700;
  color: #1989fa;
  border: 0.6pt solid #1989fa;
  border-radius: 3pt;
  padding: 0 4pt;
  margin-bottom: 2pt;
}

.a4-paper .pq-answer-body {
  font-size: 10.5pt;
  line-height: 1.6;
  word-break: break-word;
}

.a4-paper .paper-empty {
  text-align: center;
  color: #888;
  padding: 40pt 0;
}

/* 打印：仅输出试卷 */
@page {
  size: A4 portrait;
  margin: 10mm;
}

@media print {
  body {
    background: #fff !important;
  }

  body * {
    visibility: hidden;
  }

  .paper-overlay,
  .paper-overlay * {
    visibility: visible;
  }

  .paper-overlay {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 0 !important;
  }

  .no-print {
    display: none !important;
  }

  .a4-paper {
    box-shadow: none !important;
    margin: 0 !important;
    width: auto !important;
    min-height: auto !important;
    padding: 0 !important;
  }

  .pq {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
</style>
