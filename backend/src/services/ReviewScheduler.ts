/**
 * 艾宾浩斯间隔复习调度器
 *
 * 用动态间隔（第 1/2/4/7/15 天）替代旧的固定间隔（1/7/30 天）与固定重做次数逻辑：
 * - 每次复习做对，复习轮次（intervalLevel）前进一格，下次复习日期按艾宾浩斯间隔表顺延；
 * - 走完 5 个间隔（共 5 次间隔复习全部做对）即判定「已掌握」；
 * - 任一次复习做错，轮次归零，1 天后重新开始；
 * - 新错题录入后 nextReviewDate 为空，进入「新错题」队列，可当天重做；
 *   首次做对后进入间隔复习调度。
 *
 * 该模块是纯逻辑（不触库），供 MasteryController（独立复习打卡）与
 * RedoController（重做联动）共用，保证两处调度行为一致。
 */

import { Mastery, MasteryStatus } from '../models/Mastery'

/** 艾宾浩斯复习间隔（天）：第 1/2/4/7/15 天 */
export const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15]

/** 走完全部间隔所需的复习轮次（完成第 5 轮即 15 天间隔复习） */
export const EBBINGHAUS_TOTAL_RUNGS = EBBINGHAUS_INTERVALS.length

/** 掌握阈值：intervalLevel 达到「轮次数 + 1」表示第 5 轮（15 天间隔）复习已做对 */
export const EBBINGHAUS_MASTERY_LEVEL = EBBINGHAUS_TOTAL_RUNGS + 1

export function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime())
  d.setDate(d.getDate() + days)
  return d
}

/** 当天 00:00:00.000 */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** 当天 23:59:59.999 */
export function endOfToday(now: Date = new Date()): Date {
  const d = startOfToday(now)
  d.setDate(d.getDate() + 1)
  return new Date(d.getTime() - 1)
}

/**
 * 判定一条掌握记录的复习是否到期（今日待复习）。
 * - 有 nextReviewDate：到期日 <= 今天结束（23:59:59.999）即到期；
 * - 无 nextReviewDate 的历史遗留记录（录入后从未安排）：创建日早于今天即到期，
 *   当天新录入的仍留在「新错题」队列。
 */
export function isReviewDue(mastery: {
  status: MasteryStatus
  nextReviewDate?: Date | null
  createdAt?: Date | null
}, now: Date = new Date()): boolean {
  if (mastery.status === MasteryStatus.MASTERED) return false
  if (mastery.nextReviewDate) {
    return new Date(mastery.nextReviewDate).getTime() <= endOfToday(now).getTime()
  }
  return !!mastery.createdAt && new Date(mastery.createdAt).getTime() < startOfToday(now).getTime()
}

/**
 * 将一次复习结果应用到掌握记录上（原地修改），并返回该记录。
 *
 * 调度语义（与需求书掌握状态机同构，间隔替换为艾宾浩斯 1/2/4/7/15 天）：
 * - intervalLevel 表示「即将到来的间隔复习轮次」：录入后首次做对 → 1（1 天后第 1 轮）；
 *   第 k 轮复习做对 → k+1（再隔 intervals[k] 天进入第 k+1 轮）；
 * - 第 5 轮（15 天间隔）复习做对 → intervalLevel = 6 → 已掌握；
 * - 任一次复习做错 → 轮次归零，1 天后重新开始。
 *
 * @param mastery 掌握记录实体
 * @param isCorrect 本次复习/重做是否做对
 * @param now 复习发生时间（默认当前时间）
 */
export function applyReviewResult(
  mastery: Mastery,
  isCorrect: boolean,
  now: Date = new Date()
): Mastery {
  mastery.lastReviewDate = now

  if (isCorrect) {
    mastery.correctCount += 1
    mastery.lastCorrectDate = now
    mastery.intervalLevel = Math.min((mastery.intervalLevel || 0) + 1, EBBINGHAUS_MASTERY_LEVEL)

    if (mastery.intervalLevel >= EBBINGHAUS_MASTERY_LEVEL) {
      // 走完第 5 轮（15 天间隔）复习并做对 → 已掌握
      mastery.status = MasteryStatus.MASTERED
      mastery.nextReviewDate = null
    } else {
      mastery.status = MasteryStatus.LEARNING
      mastery.nextReviewDate = addDays(now, EBBINGHAUS_INTERVALS[mastery.intervalLevel - 1])
    }
  } else {
    mastery.incorrectCount += 1
    mastery.lastIncorrectDate = now
    mastery.status = MasteryStatus.LEARNING
    mastery.correctCount = 0
    mastery.intervalLevel = 0
    // 做错后 1 天后重新开始间隔复习
    mastery.nextReviewDate = addDays(now, EBBINGHAUS_INTERVALS[0])
  }

  return mastery
}
