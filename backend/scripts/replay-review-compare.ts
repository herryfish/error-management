/**
 * FSRS 与静态艾宾浩斯调度器回放对比（冷启动风险验证工具）
 *
 * 用途：在把 `REVIEW_SCHEDULER` 默认值切到 fsrs 之前，用既有错题的真实重做历史
 * 回放两个调度器，对比「毕业（清本）所需复习轮次 / 日历天数」与「毕业后的冗余复习」，
 * 为灰度切换提供量化依据（DC-468 P1 验收项）。
 *
 * 回放口径：
 * - 每道题从其第一次重做起，按真实重做时间与对错序列推进两个虚拟调度器；
 * - ebbinghaus：走完 5 轮间隔复习（第 6 次做对）毕业；
 * - fsrs：做对且 FSRS 间隔 ≥ 毕业阈值（默认 30 天）毕业；
 * - 毕业后的重做记为「冗余复习」（简单题在静态表下被迫多刷的部分）。
 *
 * 运行（需要可访问的 DB 与已执行迁移）：
 *   cd backend && npm run replay:compare
 * 可用环境变量：FSRS_GRADUATION_DAYS（默认 30）、FSRS_REQUEST_RETENTION（默认 0.9）。
 */

import 'dotenv/config'
import { DataSource } from 'typeorm'
import { Mastery, MasteryStatus } from '../src/models/Mastery'
import { RedoRecord } from '../src/models/RedoRecord'
import { applyReviewResult } from '../src/services/ReviewScheduler'
import { applyFsrsReviewResult } from '../src/services/FsrsScheduler'

const DAY_MS = 24 * 3600 * 1000

interface QuestionReplay {
  questionId: string
  redos: { createdAt: Date; isCorrect: boolean }[]
}

interface SchedulerStat {
  scheduler: string
  replayed: number
  graduated: number
  avgRoundsToGraduate: number
  avgDaysToGraduate: number
  medianDaysToGraduate: number
  redundantReviewsAfterGraduation: number
}

function cloneMastery(m: Mastery): Mastery {
  const copy = new Mastery()
  Object.assign(copy, {
    ...m,
    createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
    updatedAt: m.updatedAt ? new Date(m.updatedAt) : undefined,
  })
  return copy
}

function replay(
  items: QuestionReplay[],
  apply: (m: Mastery, isCorrect: boolean, now: Date) => Mastery
): SchedulerStat & { graduatedDetails: { rounds: number; days: number }[] } {
  const graduatedDetails: { rounds: number; days: number }[] = []
  let redundant = 0

  for (const item of items) {
    const virtual = cloneMastery(new Mastery() as Mastery)
    let graduatedAt: { rounds: number; days: number } | null = null

    item.redos.forEach((redo, index) => {
      if (graduatedAt) {
        redundant += 1
        return
      }
      const start = item.redos[0].createdAt.getTime()
      apply(virtual, redo.isCorrect, redo.createdAt)
      if (virtual.status === MasteryStatus.MASTERED) {
        graduatedAt = {
          rounds: index + 1,
          days: Math.max(0, Math.round((redo.createdAt.getTime() - start) / DAY_MS)),
        }
      }
    })

    if (graduatedAt) graduatedDetails.push(graduatedAt)
  }

  const days = graduatedDetails.map((g) => g.days).sort((a, b) => a - b)
  const rounds = graduatedDetails.map((g) => g.rounds)
  const median = (arr: number[]) =>
    arr.length === 0 ? 0 : arr[Math.floor(arr.length / 2)]
  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length

  return {
    scheduler: '',
    replayed: items.length,
    graduated: graduatedDetails.length,
    avgRoundsToGraduate: Math.round(avg(rounds) * 100) / 100,
    avgDaysToGraduate: Math.round(avg(days) * 100) / 100,
    medianDaysToGraduate: median(days),
    redundantReviewsAfterGraduation: redundant,
    graduatedDetails,
  }
}

async function main() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'error_management',
    entities: [Mastery, RedoRecord],
    logging: false,
  })

  await dataSource.initialize()
  console.log('DB connected，开始回放…')

  const redoRepository = dataSource.getRepository(RedoRecord)
  const redos = await redoRepository.find({ order: { createdAt: 'ASC' } })

  const byQuestion = new Map<string, QuestionReplay>()
  for (const r of redos) {
    if (!byQuestion.has(r.questionId)) {
      byQuestion.set(r.questionId, { questionId: r.questionId, redos: [] })
    }
    byQuestion.get(r.questionId)!.redos.push({
      createdAt: new Date(r.createdAt),
      isCorrect: !!r.isCorrect,
    })
  }
  const items = [...byQuestion.values()].filter((q) => q.redos.length > 0)

  console.log(`共 ${items.length} 道题、${redos.length} 条重做记录进入回放\n`)

  // FSRS 分支内部读取 FSRS_* 环境变量；艾宾浩斯为静态表
  const ebbinghaus = replay(items, (m, ok, now) =>
    applyReviewResult(cloneMastery(m), ok, now)
  )
  const fsrs = replay(items, (m, ok, now) =>
    applyFsrsReviewResult(cloneMastery(m), ok, now)
  )

  const report: Omit<SchedulerStat, 'scheduler'>[] & { scheduler?: string }[] = []
  for (const [name, stat] of [
    ['ebbinghaus（静态 1/2/4/7/15）', ebbinghaus],
    [`fsrs（毕业阈值 ${process.env.FSRS_GRADUATION_DAYS || 30} 天）`, fsrs],
  ] as const) {
    const { graduatedDetails, ...rest } = stat
    report.push({ scheduler: name, ...rest })
  }

  console.table(report)
  console.log(
    [
      '解读：',
      '- graduated：回放期内达到「已掌握/清本」的题目数；',
      '- avgRoundsToGraduate / avgDaysToGraduate：毕业所需平均复习次数 / 日历天数（越少越高效）；',
      '- redundantReviewsAfterGraduation：该调度器毕业之后仍发生的真实重做次数',
      '  （静态表下简单题被迫继续刷的冗余轮次；FSRS 预期显著更低）。',
      '- 两调度器回放使用同一份真实对错序列，仅排程策略不同。',
    ].join('\n')
  )

  await dataSource.destroy()
}

main().catch((err) => {
  console.error('回放失败：', err)
  process.exit(1)
})
