import {
  selectStaleFiles,
  basenameOfUploadUrl,
  getUploadsTtlHours,
  UploadsCleanupService,
} from '../../services/UploadsCleanupService'

jest.mock('../../config/database', () => ({
  AppDataSource: { getRepository: jest.fn() },
}))

// 固定基准时间
const NOW = new Date('2026-01-20T12:00:00.000Z').getTime()
const HOUR = 3600 * 1000

describe('UploadsCleanupService（S6 uploads 临时图 TTL 清理）', () => {
  describe('selectStaleFiles（纯函数）', () => {
    const referenced = new Set(['kept-original.png', 'kept-diagram.png'])

    it('仅删除超过 TTL 且未被引用的文件', () => {
      const files = [
        { name: 'kept-original.png', mtimeMs: NOW - 100 * HOUR },   // 过期但被 imageUrl 引用
        { name: 'kept-diagram.png', mtimeMs: NOW - 100 * HOUR },    // 过期但被 diagramUrls 引用
        { name: 'temp-recognition.png', mtimeMs: NOW - 100 * HOUR }, // 过期未引用 → 删
        { name: 'fresh-temp.png', mtimeMs: NOW - 1 * HOUR },        // 未过期 → 留
      ]
      const result = selectStaleFiles(files, referenced, NOW, 72)
      expect(result).toEqual(['temp-recognition.png'])
    })

    it('TTL 边界：恰好等于 TTL 时删除（≥），TTL=0 时全部保留（清理关闭）', () => {
      const files = [
        { name: 'a.png', mtimeMs: NOW - 72 * HOUR },
        { name: 'b.png', mtimeMs: NOW - (72 * HOUR - 1) },
      ]
      expect(selectStaleFiles(files, referenced, NOW, 72)).toEqual(['a.png'])
      expect(selectStaleFiles(files, referenced, NOW, 0)).toEqual([])
    })

    it('引用判断按文件名（basename）匹配，防误删学生错题原图', () => {
      const files = [{ name: 'student-question.png', mtimeMs: NOW - 999 * HOUR }]
      expect(selectStaleFiles(files, new Set(['student-question.png']), NOW, 72)).toEqual([])
    })
  })

  describe('basenameOfUploadUrl', () => {
    it('从 /uploads/xxx.png 提取文件名；空值返回 null', () => {
      expect(basenameOfUploadUrl('/uploads/abc-123.png')).toBe('abc-123.png')
      expect(basenameOfUploadUrl('/uploads/sub/dir/def.jpg')).toBe('def.jpg')
      expect(basenameOfUploadUrl(null)).toBeNull()
      expect(basenameOfUploadUrl(undefined)).toBeNull()
      expect(basenameOfUploadUrl('')).toBeNull()
    })
  })

  describe('getUploadsTtlHours', () => {
    const ENV_KEY = 'UPLOADS_TTL_HOURS'
    afterEach(() => {
      delete process.env[ENV_KEY]
    })

    it('未配置回退默认 72；非法值回退默认；0 表示关闭', () => {
      expect(getUploadsTtlHours()).toBe(72)
      process.env[ENV_KEY] = 'abc'
      expect(getUploadsTtlHours()).toBe(72)
      process.env[ENV_KEY] = '-5'
      expect(getUploadsTtlHours()).toBe(72)
      process.env[ENV_KEY] = '0'
      expect(getUploadsTtlHours()).toBe(0)
    })
  })

  describe('init / close 生命周期', () => {
    it('TTL=0 时 init 不创建定时器', () => {
      process.env.UPLOADS_TTL_HOURS = '0'
      try {
        const service = new UploadsCleanupService()
        service.init()
        expect((service as any).startupTimer).toBeNull()
        expect((service as any).timer).toBeNull()
      } finally {
        delete process.env.UPLOADS_TTL_HOURS
      }
    })

    it('close 后定时器清空且可安全重复调用', () => {
      jest.useFakeTimers()
      try {
        const service = new UploadsCleanupService()
        service.init()
        expect((service as any).startupTimer).toBeTruthy()
        service.close()
        service.close()
        expect((service as any).startupTimer).toBeNull()
        expect((service as any).timer).toBeNull()
      } finally {
        jest.useRealTimers()
        delete process.env.UPLOADS_TTL_HOURS
      }
    })
  })
})
