# ADR 0002: 多题识别 API 交互、H5 裁剪体验与 LLM 场景划分

## 状态
已通过 (Accepted)

## 上下文 (Context)
在 ADR 0001 确定多题导入主架构的基础上，需要进一步明确 API 响应契约、移动端 H5 防误触交互体验以及 LLM 成本监控归因规则。

## 决策 (Decisions)

1. **API 交互模式（同步单次 HTTP）**：
   - 选用 `POST /api/questions/identify-multi` 同步响应机制。
   - 大模型一次性输出全页题目的裁剪坐标 (`boundingBox`) 与结构化文本。

2. **H5 移动端交互（卡片缩略图 + 弹窗精细裁剪）**：
   - 避免在窄屏主界面直接手势拖拽大图导致误触。
   - 主列表展示 AI 切分的小图卡片与文字编辑框；提供独立弹窗支持全图手势双指缩放与区域重新裁剪。

3. **LLM 场景与计费归因（新增 `multi_recognition` 场景）**：
   - 在 `LLMScene` 枚举中扩展 `multi_recognition` 场景。
   - 独立统计与监控整页多题识别的 Token 消耗、平均延时与成功率。

## 后果 (Consequences)
- **正面**：H5 防误触体验好，大图识别 Token 成本独立可查，API 简单稳定。
- **负面**：前端需集成移动端 Modal Crop 裁剪组件。
