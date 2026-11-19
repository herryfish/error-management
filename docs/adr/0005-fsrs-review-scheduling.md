# ADR 0005: 复习排程升级——FSRS 动态自适应调度（静态艾宾浩斯保留为回退）

## 状态
已通过 (Accepted)

## 上下文 (Context)
v1.3.0 落地的艾宾浩斯静态间隔表（1/2/4/7/15 天）对所有题目一视同仁：无法感知单题真实难度与个体记忆衰减差异，简单题在固定轮次下被迫重复刷、难题复习不足；题量累积后期末等突击节点容易出现「待复习队列雪崩」（DC-465 方法论调研建议 2）。

现代开源算法 FSRS（Free Spaced Repetition Scheduler，已集成进 Anki 23.10+）基于 DSR 记忆模型（难度 D / 稳定性 S / 可提取性 R）动态优化间隔，官方基准下在同等留存率可比 SM-2 减少 20%~30% 无效复习。TypeScript 官方实现 `ts-fsrs` 无重依赖，可直接引入。

## 决策 (Decisions)

1. **调度器统一入口 + 环境变量切换**：
   - `ReviewScheduler.applyScheduledReview` 为全系统唯一复习应用入口（MasteryController 独立打卡 / RedoController 重做联动两处共用）；
   - `REVIEW_SCHEDULER=ebbinghaus|fsrs` 可配，**默认 ebbinghaus（现网行为零变化）**，灰度验证后自行切换；FSRS 毕业阈值 `FSRS_GRADUATION_DAYS`（默认 30 天）与目标留存率 `FSRS_REQUEST_RETENTION`（默认 0.9）可配。

2. **FSRS 集成方式（ts-fsrs）**：

   - 版本锁定 `ts-fsrs@5.1.0`（engines `node>=18`，与 Dockerfile/CI 的 node:18 运行时契约一致；v6.0 声明 `node>=24` 属 off-contract 运行，评审 S1 结论，待运行时升级后另行评估）；
   - 做对 → Good 评级（stability 增长、间隔扩大）；做错 → Again 评级（stability 回落、间隔大幅缩短，按天粒度最少 1 天）；
   - mastery 表新增 `stability` / `difficulty` / `scheduledDays` 字段持久化 DSR 状态；每次复习时由 `toFsrsCard` 从持久化状态还原 FSRS 卡片（Review / Relearning 按最后一次对错判定），elapsed 天数由 ts-fsrs 依据 `last_review → now` 自动计算（逾期复习自动获得加成）；
   - **确定性优先**：`enable_fuzz` 关闭（间隔不随机抖动，可测试可预期）、`enable_short_term` 关闭（本系统每日打卡一次，分钟级短间隔无意义）。

3. **掌握判定（清本毕业）**：FSRS 模式下「做对且下次间隔 ≥ 毕业阈值（默认 30 天）」即判定已掌握、移出每日队列（对齐调研建议 5 的清本口径）；`intervalLevel` 继续按轮次推进，仅作为学生端「第 N/5 轮」展示口径保留，不参与掌握判定。

4. **冷启动与切换安全**：
   - FSRS 官方默认权重内置于库，无复习历史即可用；个性化权重优化需积累数据，因此默认值切换前用既有复习记录回放对比（`backend/scripts/replay-review-compare.ts`，`npm run replay:compare`）：同一份真实对错序列分别驱动两调度器，输出毕业轮次 / 天数 / 毕业后冗余复习对比；
   - 数据库切换无需数据迁移即可回退（ebbinghaus 只读 `nextReviewDate`/`intervalLevel`，FSRS 字段为增量列，置 NULL 不影响静态模式）。

5. **顽固薄弱点标记同批落地**：累计做错 ≥ `STUBBORN_INCORRECT_THRESHOLD`（默认 3 次）且未掌握时自动打「顽固薄弱点」标记（`isStubborn` / `stubbornMarkedAt`），两个调度器共用同一标记逻辑；存量数据由迁移回填。

## 后果 (Consequences)
- **正面**：难题自动加密复习、简单题减少无效轮次；掌握判定由记忆状态驱动（间隔毕业）而非机械轮次；静态表保留为回退开关，切换风险可控。
- **负面 / 限定**：
  - FSRS 字段仅在其模式下有意义；两种模式切换时，另一模式产生的排程字段被忽略（不做双向换算）；
  - `correctCount` 在做错时清零的「连对口径」在两种模式下保持一致，但它不再等于「毕业进度」；
  - ts-fsrs 依赖进入后端 bundle（纯计算库，无原生依赖）；
  - 回放对比工具依赖生产库数据量，题目复习历史过少时结论参考性有限。
