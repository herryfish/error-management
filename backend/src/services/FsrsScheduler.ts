/**
 * FSRS 动态自适应复习调度器（Free Spaced Repetition Scheduler）
 *
 * 基于 DSR 记忆模型（Difficulty / Stability / Retrievability）按每题的真实
 * 难度与记忆衰减动态安排下次复习间隔：难题自动加密复习、简单题减少无效轮次。
 *
 * 调度语义（与静态艾宾浩斯模式的行为对齐点）：
 * - 做对 → Good 评级：stability 增长，下次复习间隔按 FSRS 计算；
 *   间隔达到毕业阈值（默认 30 天，`FSRS_GRADUATION_DAYS` 可配）即判定「已掌握」（清本毕业）；
 * - 做错 → Again 评级：stability 回落，间隔大幅缩短，次日重新巩固；
 * - intervalLevel 继续按轮次推进，仅作为「第 N/5 轮」的展示口径保留，
 *   不再参与掌握判定（掌握判定由 FSRS 间隔毕业阈值驱动）；
 * - 正确/错误计数与艾宾浩斯模式同口径：做错时连对计数清零、轮次归零。
 *
 * 确定性：enable_fuzz 关闭（间隔不做随机抖动，保证可测试与可预期），
 * enable_short_term 关闭（本系统每日打卡一次，分钟级短间隔无意义，
 * 统一按天粒度调度，做错最少间隔 1 天）。
 *
 * 冷启动说明：FSRS 官方默认权重已内置于库中，无复习历史也可用；
 * 个性化权重优化需积累复习记录，默认切换前可用 `npm run replay:compare`
 * （backend/scripts/replay-review-compare.ts）用既有复习记录回放对比两调度器表现。
 *
 * 该模块是纯逻辑（不触库），供 MasteryController（独立复习打卡）与
 * RedoController（重做联动）共用，保证两处调度行为一致。
 */

import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  State,
  type Card,
  type CardInput,
  type FSRSParameters,
} from 'ts-fsrs'
// 注：锁定 ts-fsrs@5.1.0（engines node>=18 与 Dockerfile/CI 的 node:18 契约一致；
// v6.0 声明 node>=24 属 off-contract 运行，评审 S1 结论）
import { Mastery, MasteryStatus } from '../models/Mastery'
import { addDays, markStubbornIfNeeded } from './ReviewScheduler'

/** 展示口径上限：与艾宾浩斯 5 轮制对齐（仅用于「第 N/5 轮」展示，不参与 FSRS 掌握判定） */
const EBBINGHAUS_MASTERY_LEVEL_CAP = 6

/** 掌握毕业的 FSRS 间隔阈值（天）：做对且下次间隔 ≥ 该值即判定已掌握（清本） */
export function getFsrsGraduationDays(): number {
  const n = parseInt(process.env.FSRS_GRADUATION_DAYS || '30', 10)
  return Number.isFinite(n) && n > 0 ? n : 30
}

/** FSRS 目标留存率（Desired Retention），默认 0.9 */
export function getFsrsRequestRetention(): number {
  const n = parseFloat(process.env.FSRS_REQUEST_RETENTION || '0.9')
  return Number.isFinite(n) && n > 0.5 && n <= 1 ? n : 0.9
}

function buildParameters(): FSRSParameters {
  return generatorParameters({
    enable_fuzz: false,
    enable_short_term: false,
    request_retention: getFsrsRequestRetention(),
  })
}

// 模块级单例：参数仅在进程启动时读取一次；调度计算本身是纯函数
const scheduler = fsrs(buildParameters())

/**
 * 将掌握记录的持久化状态还原为 FSRS 卡片：
 * - 从未复习过（无 stability）→ 新卡；
 * - 有记忆状态 → Review / Relearning（按最后一次结果是做对还是做错）。
 * elapsed 天数由 ts-fsrs 依据 last_review 与本次复习时间自动计算（含逾期加成）。
 */
function toFsrsCard(mastery: Mastery, now: Date): CardInput {
  const hasMemoryState =
    typeof mastery.stability === 'number' &&
    mastery.stability > 0 &&
    typeof mastery.difficulty === 'number' &&
    mastery.difficulty > 0

  if (!hasMemoryState) {
    return createEmptyCard(now)
  }

  const lastWasWrong =
    !!mastery.lastIncorrectDate &&
    (!mastery.lastCorrectDate || mastery.lastIncorrectDate > mastery.lastCorrectDate)

  // v5 CardInput 必填 elapsed_days（自上次复习起经过的天数；调度器以 last_review 重算，此处为回退值）
  const elapsedDays = mastery.lastReviewDate
    ? Math.max(0, Math.floor((now.getTime() - mastery.lastReviewDate.getTime()) / 86400000))
    : 0

  return {
    due: mastery.nextReviewDate || now,
    stability: mastery.stability,
    difficulty: mastery.difficulty,
    elapsed_days: elapsedDays,
    scheduled_days: mastery.scheduledDays || 0,
    learning_steps: 0,
    reps: mastery.intervalLevel || 0,
    lapses: mastery.incorrectCount || 0,
    state: lastWasWrong ? State.Relearning : State.Review,
    last_review: mastery.lastReviewDate || undefined,
  }
}

/**
 * 将一次复习结果应用到掌握记录上（原地修改），并返回该记录（FSRS 模式）。
 *
 * @param mastery 掌握记录实体
 * @param isCorrect 本次复习/重做是否做对
 * @param now 复习发生时间（默认当前时间）
 */
export function applyFsrsReviewResult(
  mastery: Mastery,
  isCorrect: boolean,
  now: Date = new Date()
): Mastery {
  // 先用旧状态构建卡片（FSRS 依据 last_review → now 的间隔计算 elapsed 与记忆增长），
  // 之后再更新 lastReviewDate，否则本次复习会被误认为 0 天 elapsed、记忆无增长
  const card = toFsrsCard(mastery, now)
  mastery.lastReviewDate = now
  const grade = isCorrect ? Rating.Good : Rating.Again
  const next = scheduler.repeat(card, now)[grade]
  const nextCard: Card = next.card
  const scheduledDays = Math.max(0, Math.round(nextCard.scheduled_days))

  mastery.stability = nextCard.stability
  mastery.difficulty = nextCard.difficulty
  mastery.scheduledDays = scheduledDays

  if (isCorrect) {
    mastery.correctCount += 1
    mastery.lastCorrectDate = now
    mastery.intervalLevel = Math.min((mastery.intervalLevel || 0) + 1, EBBINGHAUS_MASTERY_LEVEL_CAP)

    if (scheduledDays >= getFsrsGraduationDays()) {
      // FSRS 间隔达到毕业阈值（默认 30 天）且做对 → 已掌握（清本毕业，移出每日队列）
      mastery.status = MasteryStatus.MASTERED
      mastery.nextReviewDate = null
    } else {
      mastery.status = MasteryStatus.LEARNING
      mastery.nextReviewDate = addDays(now, Math.max(1, scheduledDays))
    }
  } else {
    mastery.incorrectCount += 1
    mastery.lastIncorrectDate = now
    mastery.status = MasteryStatus.LEARNING
    mastery.correctCount = 0
    mastery.intervalLevel = 0
    // 做错后按 FSRS 回落间隔重排（按天粒度，最少 1 天后重试）
    mastery.nextReviewDate = addDays(now, Math.max(1, scheduledDays))
  }

  markStubbornIfNeeded(mastery, now)
  return mastery
}
