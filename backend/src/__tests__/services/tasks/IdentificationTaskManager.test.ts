jest.mock('../../../config/database', () => ({
  AppDataSource: { getRepository: jest.fn(() => null) },
}))
jest.mock('../../../config/redis', () => ({
  isRedisEnabled: jest.fn(() => !!process.env.REDIS_URL),
  getRedisConnection: jest.fn(() => (process.env.REDIS_URL ? { fake: 'conn' } : null)),
  closeRedisConnection: jest.fn(async () => {}),
}))
jest.mock('bullmq', () => {
  const fakeJobStore = new Map<string, any>()
  class FakeJob {
    id: string
    data: any
    state: string
    progressValue: number
    returnvalue: any
    failedReason?: string
    constructor(id: string, data: any) {
      this.id = id
      this.data = data
      this.state = 'waiting'
      this.progressValue = 0
      fakeJobStore.set(id, this)
    }
    get progress() {
      return this.progressValue
    }
    async getState() {
      return this.state
    }
  }
  class FakeQueue {
    name: string
    opts: any
    added: any[] = []
    constructor(name: string, opts: any) {
      this.name = name
      this.opts = opts
    }
    async add(_name: string, data: any) {
      const id = `job-${this.added.length + 1}`
      const job = new FakeJob(id, data)
      this.added.push(job)
      return job
    }
    async getJob(id: string) {
      return fakeJobStore.get(id) || null
    }
    async close() {}
  }
  class FakeWorker {
    name: string
    processor: any
    opts: any
    constructor(name: string, processor: any, opts: any) {
      this.name = name
      this.processor = processor
      this.opts = opts
    }
    on() {}
    async close() {}
  }
  return {
    Queue: FakeQueue,
    Worker: FakeWorker,
    __fakeJobStore: fakeJobStore,
  }
})
jest.mock('../../../services/tasks/identifyMultiPipeline', () => ({
  processIdentifyMulti: jest.fn(),
}))

import { identificationTaskManager } from '../../../services/tasks/IdentificationTaskManager'
import { processIdentifyMulti } from '../../../services/tasks/identifyMultiPipeline'

const processMock = processIdentifyMulti as jest.Mock

beforeEach(async () => {
  jest.clearAllMocks()
  delete process.env.REDIS_URL
  processMock.mockReset()
  // 复位单例初始化状态，避免前一用例的队列后端残留
  await identificationTaskManager.close()
})

describe('IdentificationTaskManager（进程内队列降级模式）', () => {
  it('submit 立即返回 taskId 并异步执行到 completed', async () => {
    processMock.mockResolvedValue({ items: [{ tempId: 't1', title: '题1' }] })

    const taskId = await identificationTaskManager.submit({
      imagePath: '/uploads/x.jpg',
      userId: 'u1',
      subject: 'math',
    })
    expect(taskId).toBeTruthy()
    expect(identificationTaskManager.isRedisBacked()).toBe(false)

    // 链式异步执行，稍等后应 completed 且带结果
    await new Promise((r) => setTimeout(r, 30))
    const status = await identificationTaskManager.getStatus(taskId)
    expect(status).toMatchObject({
      taskId,
      state: 'completed',
      progress: 100,
    })
    expect(status!.result!.items).toEqual([{ tempId: 't1', title: '题1' }])
    expect(processMock).toHaveBeenCalledWith(
      { imagePath: '/uploads/x.jpg', userId: 'u1', subject: 'math' },
      expect.any(Function)
    )
  })

  it('执行失败 → failed 状态 + 错误信息', async () => {
    processMock.mockRejectedValue(new Error('boom'))

    const taskId = await identificationTaskManager.submit({ imagePath: '/x.jpg', userId: 'u1' })
    await new Promise((r) => setTimeout(r, 30))
    const status = await identificationTaskManager.getStatus(taskId)
    expect(status).toMatchObject({ state: 'failed', error: 'boom' })
  })

  it('未知 taskId 返回 null', async () => {
    expect(await identificationTaskManager.getStatus('no-such-task')).toBeNull()
  })

  it('任务串行执行（并发 1）', async () => {
    const order: string[] = []
    processMock.mockImplementation(async (_data: any, onProgress: any) => {
      order.push('start')
      await new Promise((r) => setTimeout(r, 20))
      order.push('end')
      return { items: [] }
    })

    const t1 = await identificationTaskManager.submit({ imagePath: '/1.jpg', userId: 'u1' })
    const t2 = await identificationTaskManager.submit({ imagePath: '/2.jpg', userId: 'u1' })
    await new Promise((r) => setTimeout(r, 80))

    expect(order).toEqual(['start', 'end', 'start', 'end'])
    expect((await identificationTaskManager.getStatus(t1))!.state).toBe('completed')
    expect((await identificationTaskManager.getStatus(t2))!.state).toBe('completed')
  })
})

describe('IdentificationTaskManager（Redis + BullMQ 模式）', () => {
  it('REDIS_URL 配置时走 BullMQ：submit 返回 jobId，getStatus 映射状态与结果', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const bullmq = require('bullmq')

    const taskId = await identificationTaskManager.submit({
      imagePath: '/uploads/y.jpg',
      userId: 'u1',
      subject: 'physics',
    })
    expect(identificationTaskManager.isRedisBacked()).toBe(true)

    let status = await identificationTaskManager.getStatus(taskId)
    expect(status).toMatchObject({ taskId, state: 'queued', progress: 0 })

    // 模拟任务处理中/完成
    const job = bullmq.__fakeJobStore.get(taskId)
    job.state = 'active'
    job.progressValue = 55
    status = await identificationTaskManager.getStatus(taskId)
    expect(status).toMatchObject({ state: 'processing', progress: 55 })

    job.state = 'completed'
    job.returnvalue = { items: [{ tempId: 'r1' }] }
    status = await identificationTaskManager.getStatus(taskId)
    expect(status).toMatchObject({ state: 'completed', progress: 100 })
    expect(status!.result!.items).toEqual([{ tempId: 'r1' }])

    job.state = 'failed'
    job.failedReason = 'LLM timeout'
    status = await identificationTaskManager.getStatus(taskId)
    expect(status).toMatchObject({ state: 'failed', error: 'LLM timeout' })
  })

  it('close() 释放队列并复位初始化状态', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    await identificationTaskManager.submit({ imagePath: '/z.jpg', userId: 'u1' })
    expect(identificationTaskManager.isRedisBacked()).toBe(true)
    await identificationTaskManager.close()
    expect(identificationTaskManager.isRedisBacked()).toBe(false)
    delete process.env.REDIS_URL
  })
})
