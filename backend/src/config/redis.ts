/**
 * Redis 连接（可选）
 *
 * REDIS_URL 存在时返回共享 ioredis 连接（供 BullMQ 队列/Worker 使用）；
 * 未配置时返回 null —— 异步识别任务自动降级为进程内队列，消除同步 HTTP 挂起的 504 风险。
 */

import Redis from 'ioredis'

let connection: Redis | null = null

export function isRedisEnabled(): boolean {
  return !!process.env.REDIS_URL
}

export function getRedisConnection(): Redis | null {
  if (!isRedisEnabled()) return null
  if (!connection) {
    // maxRetriesPerRequest: null 为 BullMQ 官方要求（避免连接抖动导致任务请求报错）
    connection = new Redis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    })
  }
  return connection
}

export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    const conn = connection
    connection = null
    await conn.quit().catch(() => conn.disconnect())
  }
}
