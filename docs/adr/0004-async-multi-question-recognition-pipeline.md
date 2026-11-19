# ADR 0004: 整页多题 Vision 识别异步化架构（任务队列 + 轮询）

## 状态
已通过 (Accepted)

## 上下文 (Context)
整页多题切分识别（`POST /api/questions/identify-multi`）原为同步 HTTP 挂起调用：整页大图的 Vision 模型调用通常耗时 15-30 秒，叠加降级重试可达 1 分钟以上。Nginx 反向代理在长请求上容易触发 504 Gateway Timeout，导致识别失败且无法恢复，也不可观测进度。

## 决策 (Decisions)

1. **接口立即返回 taskId（异步任务模式）**：
   - `POST /api/questions/identify-multi/async` 上传图片后立即返回 `202 { taskId, statusUrl }`；
   - 前端轮询 `GET /api/questions/identify-multi/tasks/:taskId`（2 秒间隔）获取 `state`（queued/processing/completed/failed）、`progress`（0-100）与识别结果 `items`；
   - 选择轮询而非 SSE：轮询对 Nginx/代理无附加要求（无需缓冲关闭配置），实现简单、断线可恢复，移动端 H5 兼容性最好。

2. **默认队列方案：Redis + BullMQ**：
   - docker-compose 增加 `redis:7-alpine` 服务（AOF 持久化 + `maxmemory-policy noeviction`，BullMQ 官方要求），backend 注入 `REDIS_URL`；
   - BullMQ Queue + 进程内 Worker（并发 1，避免并发 Vision 调用打爆上游配额），任务状态/进度/结果存 Redis；
   - 任务完成后结果保留 1 小时（`removeOnComplete: { age: 1h, count: 500 }`）供轮询，之后自动清理；`attempts: 1` 不自动重试（LLM 识别重试由服务层降级策略负责）；
   - backend 进程内运行 Worker（单容器自托管场景，无需独立 worker 服务）；SIGTERM/SIGINT 优雅关闭等待任务收尾。

3. **无 Redis 自动降级：进程内队列**：
   - `REDIS_URL` 未配置时，任务管理器自动降级为进程内队列（内存 Map + 串行异步执行），对外接口行为完全一致（同样立即返回 taskId + 轮询）；
   - 局限：任务不跨进程重启保留、仅适用单实例部署——自托管单容器场景可接受；
   - 该设计保证**所有部署形态都不存在同步 HTTP 长挂起路径**，504 风险被消除。

4. **同步接口保留（兼容）**：
   - 原 `POST /api/questions/identify-multi` 保留为同步兼容接口，内部与异步任务共用同一处理管道（`processIdentifyMulti`：LLM 识别 → 归一化 → 文本指纹防重 → 失败兜底 mock）；前端已切换为异步路径。

## 后果 (Consequences)
- **正面**：504 风险消除；识别进度可视化（排队/识别中 x%）；任务失败有明确错误态可重试；LLM 用量与重复识别可控（任务级幂等提交）。
- **负面**：部署组件增加 Redis（docker-compose 一键托管，自托管门槛小幅上升）；降级模式下任务不跨重启保留；前端需实现轮询生命周期管理（超时 10 分钟、取消、换图重置）。
