import {
  EBBINGHAUS_INTERVALS,
  EBBINGHAUS_TOTAL_RUNGS,
  EBBINGHAUS_MASTERY_LEVEL,
  applyReviewResult,
  isReviewDue,
  addDays,
  startOfToday,
  endOfToday,
} from '../../services/ReviewScheduler'
import { Mastery, MasteryStatus } from '../../models/Mastery'

const createMastery = (overrides: Partial<Mastery> = {}): Mastery => {
  const m = new Mastery()
  m.status = MasteryStatus.NEW
  m.correctCount = 0
  m.incorrectCount = 0
  m.intervalLevel = 0
  return Object.assign(m, overrides)
}

// 固定基准时间，避免测试受「当天」影响
const BASE = new Date('2026-01-10T10:00:00.000Z')

describe('ReviewScheduler（艾宾浩斯间隔调度）', () => {
  it('间隔表应为 1/2/4/7/15 天，共 5 轮，掌握阈值 6', () => {
    expect(EBBINGHAUS_INTERVALS).toEqual([1, 2, 4, 7, 15])
    expect(EBBINGHAUS_TOTAL_RUNGS).toBe(5)
    expect(EBBINGHAUS_MASTERY_LEVEL).toBe(6)
  })

  describe('applyReviewResult', () => {
    it('第 1 次做对 → 1 天后复习，进入 learning', () => {
      const m = createMastery()
      applyReviewResult(m, true, BASE)
      expect(m.status).toBe(MasteryStatus.LEARNING)
      expect(m.intervalLevel).toBe(1)
      expect(m.correctCount).toBe(1)
      expect(m.nextReviewDate!.getTime()).toBe(addDays(BASE, 1).getTime())
    })

    it('连续做对逐轮顺延：+1 → +2 → +4 → +7 → +15 天', () => {
      const m = createMastery()
      const expected = [1, 2, 4, 7, 15]
      for (let i = 0; i < expected.length; i++) {
        applyReviewResult(m, true, BASE)
        expect(m.intervalLevel).toBe(i + 1)
        expect(m.nextReviewDate!.getTime()).toBe(addDays(BASE, expected[i]).getTime())
      }
      expect(m.status).toBe(MasteryStatus.LEARNING)
    })

    it('第 6 次做对（完成第 5 轮 15 天间隔复习）→ 已掌握，不再安排复习', () => {
      const m = createMastery()
      for (let i = 0; i < 5; i++) applyReviewResult(m, true, BASE)
      expect(m.status).toBe(MasteryStatus.LEARNING)
      applyReviewResult(m, true, BASE)
      expect(m.intervalLevel).toBe(6)
      expect(m.status).toBe(MasteryStatus.MASTERED)
      expect(m.nextReviewDate).toBeNull()
    })

    it('复习做错 → 轮次归零，1 天后重新开始', () => {
      const m = createMastery()
      applyReviewResult(m, true, BASE)
      applyReviewResult(m, true, BASE)
      expect(m.intervalLevel).toBe(2)
      applyReviewResult(m, false, BASE)
      expect(m.status).toBe(MasteryStatus.LEARNING)
      expect(m.intervalLevel).toBe(0)
      expect(m.correctCount).toBe(0)
      expect(m.incorrectCount).toBe(1)
      expect(m.nextReviewDate!.getTime()).toBe(addDays(BASE, 1).getTime())
    })

    it('每次复习都更新 lastReviewDate / lastCorrectDate / lastIncorrectDate', () => {
      const m = createMastery()
      applyReviewResult(m, true, BASE)
      expect(m.lastReviewDate!.getTime()).toBe(BASE.getTime())
      expect(m.lastCorrectDate!.getTime()).toBe(BASE.getTime())
      const t2 = new Date(BASE.getTime() + 3600_000)
      applyReviewResult(m, false, t2)
      expect(m.lastIncorrectDate!.getTime()).toBe(t2.getTime())
      expect(m.lastReviewDate!.getTime()).toBe(t2.getTime())
    })
  })

  describe('isReviewDue', () => {
    it('已掌握的记录永不到期', () => {
      const m = createMastery({
        status: MasteryStatus.MASTERED,
        nextReviewDate: new Date('2020-01-01'),
      })
      expect(isReviewDue(m, BASE)).toBe(false)
    })

    it('nextReviewDate 在今天结束前 → 到期', () => {
      const m = createMastery({
        status: MasteryStatus.LEARNING,
        nextReviewDate: new Date('2026-01-09T08:00:00.000Z'),
      })
      expect(isReviewDue(m, BASE)).toBe(true)
    })

    it('nextReviewDate 在明天 → 未到期', () => {
      const m = createMastery({
        status: MasteryStatus.LEARNING,
        nextReviewDate: addDays(startOfToday(BASE), 1),
      })
      expect(isReviewDue(m, BASE)).toBe(false)
    })

    it('无 nextReviewDate 且创建于今天 → 未到期（留在新错题队列）', () => {
      const m = createMastery({
        status: MasteryStatus.NEW,
        nextReviewDate: null,
        // 创建时间取本地时区的今天零点，保证任意时区下都等于 startOfToday
        createdAt: startOfToday(BASE),
      })
      expect(isReviewDue(m, BASE)).toBe(false)
    })

    it('无 nextReviewDate 且创建于昨天之前 → 到期（历史遗留）', () => {
      const m = createMastery({
        status: MasteryStatus.NEW,
        nextReviewDate: null,
        createdAt: addDays(startOfToday(BASE), -1),
      })
      expect(isReviewDue(m, BASE)).toBe(true)
    })
  })

  describe('时间工具', () => {
    it('startOfToday / endOfToday 覆盖整天', () => {
      const s = startOfToday(BASE)
      const e = endOfToday(BASE)
      expect(s.getHours()).toBe(0)
      expect(e.getHours()).toBe(23)
      expect(e.getTime() - s.getTime()).toBe(24 * 3600 * 1000 - 1)
    })
  })
})
