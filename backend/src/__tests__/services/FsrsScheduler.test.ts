import {
  applyFsrsReviewResult,
  getFsrsGraduationDays,
  getFsrsRequestRetention,
} from '../../services/FsrsScheduler'
import {
  applyScheduledReview,
  getSchedulerMode,
  addDays,
} from '../../services/ReviewScheduler'
import { Mastery, MasteryStatus } from '../../models/Mastery'

const createMastery = (overrides: Partial<Mastery> = {}): Mastery => {
  const m = new Mastery()
  m.status = MasteryStatus.NEW
  m.correctCount = 0
  m.incorrectCount = 0
  m.intervalLevel = 0
  m.isStubborn = false
  return Object.assign(m, overrides)
}

// 固定基准时间，避免测试受「当天」影响
const BASE = new Date('2026-01-10T10:00:00.000Z')

describe('FsrsScheduler（FSRS 动态自适应调度）', () => {
  describe('applyFsrsReviewResult', () => {
    it('新错题首次做对 → 写入 FSRS 记忆状态，按天安排下次复习', () => {
      const m = createMastery()
      applyFsrsReviewResult(m, true, BASE)

      expect(m.status).toBe(MasteryStatus.LEARNING)
      expect(m.stability).toBeGreaterThan(0)
      expect(m.difficulty).toBeGreaterThan(0)
      expect(m.scheduledDays).toBeGreaterThanOrEqual(1)
      expect(m.correctCount).toBe(1)
      expect(m.intervalLevel).toBe(1)
      expect(m.lastReviewDate!.getTime()).toBe(BASE.getTime())
      expect(m.nextReviewDate!.getTime()).toBe(addDays(BASE, m.scheduledDays!).getTime())
    })

    it('连续做对 → stability 增长、间隔顺延扩大', () => {
      const m = createMastery()
      applyFsrsReviewResult(m, true, BASE)
      const firstStability = m.stability
      const firstInterval = m.scheduledDays!

      // 按排程日期进行下一次复习
      const next = new Date(m.nextReviewDate!.getTime())
      applyFsrsReviewResult(m, true, next)

      expect(m.stability!).toBeGreaterThan(firstStability)
      expect(m.scheduledDays!).toBeGreaterThan(firstInterval)
      expect(m.correctCount).toBe(2)
    })

    it('间隔达到毕业阈值且做对 → 已掌握（清本毕业），不再安排复习', () => {
      const m = createMastery()
      // 预置高稳定度记忆状态（已复习过、上次做对），下次做对间隔必然 ≥ 毕业阈值
      m.stability = 90
      m.difficulty = 7
      m.scheduledDays = 30
      m.intervalLevel = 5
      m.status = MasteryStatus.LEARNING
      m.lastCorrectDate = new Date(BASE.getTime() - 30 * 24 * 3600 * 1000)
      m.lastReviewDate = new Date(BASE.getTime() - 30 * 24 * 3600 * 1000)
      m.nextReviewDate = BASE

      applyFsrsReviewResult(m, true, BASE)

      expect(m.status).toBe(MasteryStatus.MASTERED)
      expect(m.nextReviewDate).toBeNull()
      expect(m.stability).toBeGreaterThan(90)
    })

    it('毕业阈值可由 FSRS_GRADUATION_DAYS 调低（=1 时任何做对复习即刻毕业）', () => {
      const prev = process.env.FSRS_GRADUATION_DAYS
      process.env.FSRS_GRADUATION_DAYS = '1'
      try {
        expect(getFsrsGraduationDays()).toBe(1)
        const m = createMastery()
        applyFsrsReviewResult(m, true, BASE)
        expect(m.status).toBe(MasteryStatus.MASTERED)
        expect(m.nextReviewDate).toBeNull()
      } finally {
        if (prev === undefined) delete process.env.FSRS_GRADUATION_DAYS
        else process.env.FSRS_GRADUATION_DAYS = prev
      }
    })

    it('复习做错 → 连对清零、轮次归零，次日重新巩固（stability 回落）', () => {
      const m = createMastery()
      applyFsrsReviewResult(m, true, BASE)
      applyFsrsReviewResult(m, true, new Date(m.nextReviewDate!.getTime()))
      expect(m.correctCount).toBe(2)
      const stabilityBefore = m.stability!

      const wrongAt = new Date(m.nextReviewDate!.getTime())
      applyFsrsReviewResult(m, false, wrongAt)

      expect(m.status).toBe(MasteryStatus.LEARNING)
      expect(m.correctCount).toBe(0)
      expect(m.incorrectCount).toBe(1)
      expect(m.intervalLevel).toBe(0)
      expect(m.stability!).toBeLessThan(stabilityBefore)
      expect(m.scheduledDays!).toBeGreaterThanOrEqual(1)
      expect(m.nextReviewDate!.getTime()).toBe(addDays(wrongAt, m.scheduledDays!).getTime())
    })

    it('intervalLevel 仅作展示口径推进且上限 6，不影响 FSRS 掌握判定', () => {
      const m = createMastery()
      for (let i = 0; i < 10; i++) {
        applyFsrsReviewResult(m, true, new Date(m.nextReviewDate?.getTime() || BASE.getTime()))
        if (m.status === MasteryStatus.MASTERED) break
      }
      expect(m.intervalLevel).toBeLessThanOrEqual(6)
    })

    it('做错触发顽固薄弱点标记（累计做错 ≥ 3 次）', () => {
      const m = createMastery()
      applyFsrsReviewResult(m, false, BASE)
      applyFsrsReviewResult(m, false, BASE)
      expect(m.isStubborn).toBe(false)
      applyFsrsReviewResult(m, false, BASE)
      expect(m.isStubborn).toBe(true)
      expect(m.stubbornMarkedAt).toBeTruthy()
    })

    it('逾期复习自动获得 elapsed 加成（间隔比准点复习更大）', () => {
      const onTime = createMastery()
      applyFsrsReviewResult(onTime, true, BASE)
      // 准点：第一次排程 sd1 天，第二次准点复习
      applyFsrsReviewResult(onTime, true, new Date(onTime.nextReviewDate!.getTime()))

      const late = createMastery()
      applyFsrsReviewResult(late, true, BASE)
      // 拖 30 天才复习同一题
      applyFsrsReviewResult(late, true, addDays(BASE, 30))

      expect(late.stability!).toBeGreaterThan(onTime.stability!)
    })
  })

  describe('调度器模式与统一入口', () => {
    const ENV_KEYS = ['REVIEW_SCHEDULER', 'FSRS_GRADUATION_DAYS', 'FSRS_REQUEST_RETENTION']

    afterEach(() => {
      ENV_KEYS.forEach((k) => delete process.env[k])
    })

    it('默认模式为 ebbinghaus（灰度安全：不配置不改变现网行为）', () => {
      expect(getSchedulerMode()).toBe('ebbinghaus')
    })

    it('REVIEW_SCHEDULER=fsrs 时统一入口走 FSRS（写入记忆状态）', () => {
      process.env.REVIEW_SCHEDULER = 'fsrs'
      const m = createMastery()
      applyScheduledReview(m, true, BASE)
      expect(m.stability).toBeGreaterThan(0)
      expect(m.scheduledDays).toBeGreaterThanOrEqual(1)
    })

    it('REVIEW_SCHEDULER=ebbinghaus 时统一入口走静态表（不写 FSRS 字段）', () => {
      process.env.REVIEW_SCHEDULER = 'ebbinghaus'
      const m = createMastery()
      applyScheduledReview(m, true, BASE)
      expect(m.stability).toBeUndefined()
      expect(m.scheduledDays).toBeUndefined()
      expect(m.nextReviewDate!.getTime()).toBe(addDays(BASE, 1).getTime())
    })

    it('非法 REVIEW_SCHEDULER 值回退 ebbinghaus', () => {
      process.env.REVIEW_SCHEDULER = 'bogus'
      expect(getSchedulerMode()).toBe('ebbinghaus')
    })

    it('FSRS_REQUEST_RETENTION 越界回退默认 0.9', () => {
      process.env.FSRS_REQUEST_RETENTION = '0.2'
      expect(getFsrsRequestRetention()).toBe(0.9)
      process.env.FSRS_REQUEST_RETENTION = 'abc'
      expect(getFsrsRequestRetention()).toBe(0.9)
    })
  })
})
