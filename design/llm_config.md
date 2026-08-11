# LLM配置系统设计

## 概述

LLM配置系统支持多提供商动态配置，允许配置主模型和降级模型，实现灵活的LLM集成。

## 设计目标

1. **灵活性**：支持多个LLM提供商（OpenAI、Anthropic、Google等）
2. **可配置性**：通过环境变量或配置文件管理配置
3. **降级支持**：主模型失败时自动切换降级模型
4. **可观测性**：所有调用（主/降级）均记录用量
5. **安全性**：敏感信息（API密钥）保护

## 配置架构

### 配置层级

```
配置优先级：环境变量 > 配置文件 > 默认值
```

### 配置结构

```typescript
interface LLMConfig {
  primary: {
    provider: 'openai' | 'anthropic' | 'google' | 'custom';
    model: string;
    apiKey: string;
    apiBase?: string;
    maxTokens?: number;
    temperature?: number;
  };
  fallback: {
    provider: 'openai' | 'anthropic' | 'google' | 'custom';
    model: string;
    apiKey: string;
    apiBase?: string;
    maxTokens?: number;
    temperature?: number;
  };
  strategy: {
    enabled: boolean;
    retryCount: number;
    timeoutMs: number;
    retryDelayMs?: number;
  };
  logging: {
    enabled: boolean;
    logRequests: boolean;
    logResponses: boolean;
  };
}
```

## 配置管理

### 1. 环境变量配置

**优点**：
- 适合Docker部署
- 敏感信息不写入文件
- 运行时可修改

**缺点**：
- 配置分散
- 不适合复杂配置

**示例**：
```env
# 主LLM配置
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_MODEL=gpt-4-vision-preview
LLM_PRIMARY_API_KEY=sk-xxx
LLM_PRIMARY_API_BASE=https://api.openai.com/v1

# 降级LLM配置
LLM_FALLBACK_PROVIDER=anthropic
LLM_FALLBACK_MODEL=claude-3-opus-20240229
LLM_FALLBACK_API_KEY=sk-ant-xxx
LLM_FALLBACK_API_BASE=https://api.anthropic.com

# 降级策略
LLM_FALLBACK_ENABLED=true
LLM_FALLBACK_RETRY_COUNT=2
LLM_FALLBACK_TIMEOUT_MS=30000
```

### 2. 配置文件配置

**优点**：
- 配置集中
- 支持复杂结构
- 可版本控制

**缺点**：
- 敏感信息需加密或使用环境变量
- 需要文件解析

**示例**（JSON）：
```json
{
  "llm": {
    "primary": {
      "provider": "openai",
      "model": "gpt-4-vision-preview",
      "apiKey": "sk-xxx",
      "apiBase": "https://api.openai.com/v1"
    },
    "fallback": {
      "provider": "anthropic",
      "model": "claude-3-opus-20240229",
      "apiKey": "sk-ant-xxx",
      "apiBase": "https://api.anthropic.com"
    },
    "strategy": {
      "enabled": true,
      "retryCount": 2,
      "timeoutMs": 30000
    }
  }
}
```

## 降级策略实现

### 降级流程

```typescript
async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  // 1. 尝试主LLM
  try {
    const primaryResponse = await callPrimaryLLM(request);
    return primaryResponse;
  } catch (primaryError) {
    // 2. 主LLM失败，检查降级配置
    if (!config.strategy.enabled) {
      throw primaryError;
    }

    // 3. 重试主LLM
    for (let i = 0; i < config.strategy.retryCount; i++) {
      try {
        const retryResponse = await callPrimaryLLM(request);
        return retryResponse;
      } catch (retryError) {
        if (i === config.strategy.retryCount - 1) {
          break;
        }
        await delay(config.strategy.retryDelayMs || 1000);
      }
    }

    // 4. 切换降级LLM
    try {
      const fallbackResponse = await callFallbackLLM(request);
      return fallbackResponse;
    } catch (fallbackError) {
      // 5. 降级LLM也失败，进入系统降级模式
      return handleSystemDegradation(request, primaryError, fallbackError);
    }
  }
}
```

### 降级模式

**识别失败降级**：
- 提示用户重拍或手动编辑
- 记录失败日志
- 管理员告警

**手写批改降级**：
- 提示用户手动输入答案
- 使用预设批改规则
- 记录失败日志

**引导问答降级**：
- 显示预设引导路径
- 使用本地知识库
- 记录失败日志

## 用量监控

### 监控数据结构

```typescript
interface LLMUsageRecord {
  id: string;
  timestamp: Date;
  userId: string;
  scene: 'recognition' | 'grading' | 'guidance' | 'similar' | 'other';
  provider: string;
  model: string;
  isFallback: boolean;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  businessId?: string; // 关联业务ID（错题ID、会话ID等）
}
```

### 监控表设计

```sql
CREATE TABLE llm_usage (
  id VARCHAR(36) PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  scene ENUM('recognition', 'grading', 'guidance', 'similar', 'other') NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  is_fallback BOOLEAN DEFAULT FALSE,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  tokens_total INT DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  latency_ms INT DEFAULT 0,
  success BOOLEAN DEFAULT TRUE,
  error TEXT,
  business_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_scene (user_id, scene),
  INDEX idx_timestamp (timestamp),
  INDEX idx_provider_model (provider, model)
);
```

## 配置验证

### 启动时验证

```typescript
function validateLLMConfig(config: LLMConfig): void {
  // 1. 检查必填字段
  if (!config.primary.provider) {
    throw new Error('LLM primary provider is required');
  }
  if (!config.primary.model) {
    throw new Error('LLM primary model is required');
  }
  if (!config.primary.apiKey) {
    throw new Error('LLM primary API key is required');
  }

  // 2. 检查降级配置
  if (config.strategy.enabled) {
    if (!config.fallback.provider) {
      throw new Error('LLM fallback provider is required when fallback is enabled');
    }
    if (!config.fallback.model) {
      throw new Error('LLM fallback model is required when fallback is enabled');
    }
    if (!config.fallback.apiKey) {
      throw new Error('LLM fallback API key is required when fallback is enabled');
    }
  }

  // 3. 检查数值范围
  if (config.strategy.retryCount < 0 || config.strategy.retryCount > 5) {
    throw new Error('LLM fallback retry count must be between 0 and 5');
  }
  if (config.strategy.timeoutMs < 1000 || config.strategy.timeoutMs > 60000) {
    throw new Error('LLM fallback timeout must be between 1000 and 60000 ms');
  }
}
```

### 运行时验证

```typescript
function validateLLMRequest(request: LLMRequest): void {
  if (!request.scene) {
    throw new Error('LLM request scene is required');
  }
  if (!request.userId) {
    throw new Error('LLM request user ID is required');
  }
  if (!request.prompt && !request.images) {
    throw new Error('LLM request must have prompt or images');
  }
}
```

## 安全考虑

### 1. API密钥保护

- 不记录API密钥到日志
- 使用环境变量或密钥管理服务
- 定期轮换API密钥

### 2. 访问控制

- 仅管理员可查看LLM配置
- 仅管理员可修改LLM配置
- 配置变更需审计日志

### 3. 数据脱敏

- 日志中脱敏API密钥
- 监控数据中脱敏敏感信息
- 报告中脱敏用户信息

## 部署配置

### Docker Compose配置

```yaml
version: '3.8'

services:
  backend:
    image: error-management-backend
    environment:
      - LLM_PRIMARY_PROVIDER=openai
      - LLM_PRIMARY_MODEL=gpt-4-vision-preview
      - LLM_PRIMARY_API_KEY=${LLM_PRIMARY_API_KEY}
      - LLM_PRIMARY_API_BASE=https://api.openai.com/v1
      - LLM_FALLBACK_PROVIDER=anthropic
      - LLM_FALLBACK_MODEL=claude-3-opus-20240229
      - LLM_FALLBACK_API_KEY=${LLM_FALLBACK_API_KEY}
      - LLM_FALLBACK_API_BASE=https://api.anthropic.com
      - LLM_FALLBACK_ENABLED=true
      - LLM_FALLBACK_RETRY_COUNT=2
      - LLM_FALLBACK_TIMEOUT_MS=30000
    volumes:
      - ./config:/app/config:ro
```

### 配置文件挂载

```yaml
volumes:
  - ./config/llm.json:/app/config/llm.json:ro
```

## 测试策略

### 单元测试

1. **配置解析测试**：测试环境变量和配置文件解析
2. **配置验证测试**：测试配置验证逻辑
3. **降级策略测试**：测试降级流程和错误处理
4. **用量监控测试**：测试用量记录和查询

### 集成测试

1. **LLM调用测试**：测试主LLM和降级LLM调用
2. **配置热重载测试**：测试运行时配置更新
3. **错误恢复测试**：测试LLM失败后的恢复

### 端到端测试

1. **完整流程测试**：测试从配置到调用的完整流程
2. **降级场景测试**：测试各种降级场景
3. **性能测试**：测试配置系统的性能

## 监控与告警

### 监控指标

1. **LLM调用成功率**：主LLM和降级LLM的成功率
2. **LLM调用延迟**：主LLM和降级LLM的响应时间
3. **LLM调用量**：按场景、用户、模型统计
4. **LLM成本**：按场景、用户、模型统计

### 告警规则

1. **主LLM失败率 > 10%**：告警
2. **降级LLM调用比例 > 30%**：告警
3. **LLM成本超预算**：告警
4. **配置变更**：通知管理员

## 文档与示例

### 配置文档

- 环境变量配置说明
- 配置文件配置说明
- 降级策略配置说明
- 监控配置说明

### 示例文件

- `.env.example`：环境变量示例
- `config.example.json`：配置文件示例
- `docker-compose.example.yml`：Docker Compose示例
### 17. 问答题与复杂解题的大模型智能语义判题规范 (LLM Answer Evaluation Spec)

针对问答题/解答题 (`type === 'answer'`) 或难以通过纯字符串判定的题目，系统引入大模型进行智能语义比对与判题。

#### 流程与判定规则
1. **触发场景 (`scene: 'grading'`)**：
   - 当题目类型为 `answer`，或者无法进行简单的字符串比对时，后端向配置的大模型发起文本评判请求。
2. ** prompt 提示词规范**：
   - 包含题干内容 (`questionContent`)、参考答案/推导步骤 (`expectedAnswer`) 及学生提交的文字解答 (`userAnswer`)。
   - 要求大模型判定学生回答是否在数学/逻辑上与参考答案**语义等价**（允许不同的表示形式如 `x=-2 or x=-3` 与 `x1=-2, x2=-3`）。
3. **返回数据格式**：
   - 大模型返回 JSON 数据，包含：`isCorrect` (boolean)、`score` (0-100)、`feedback` (简短批改与点评信息)。
4. **降级与防线 (Fallback & Audit Log)**：
   - 若大模型调用失败或配置未开启，降级为预设判题规则（提示待人工审核/改判）。
   - 判题结果写入 `llm_usage` 监控表，便于管理员审计。

## 18. 模型选择限制与白名单规范 (Model Dropdown & Whitelist Spec)

为防止管理员在界面配置时误输入不兼容或拼错的模型名称导致大模型调用失败，系统对控制台模型配置实行强制下拉框（Dropdown）与白名单选择机制。

### 18.1 模型白名单配置与分类

1. **白名单定义**：
   - 系统定义预设模型白名单，按能力分类：
     - **视觉/通用模型 (Vision/Multimodal)**：`gpt-4o`, `gpt-4-vision-preview`, `claude-3-5-sonnet-20240620`, `sensenova-6.7-flash-lite`。
     - **纯文本/高推理模型 (Text/Reasoning)**：`gpt-4o-mini`, `gpt-3.5-turbo`, `deepseek-r1`, `deepseek-chat`, `claude-3-haiku-20240307`。
2. **场景差异化限定 (Scene-Model Binding)**：
   - **错题识别场景 (`recognition`)**：仅允许在具备视觉能力的模型白名单中进行下拉选择。
   - **手写批改/问答题判题 (`grading`)**与 **相似题生成 (`similar`)**：允许从全量模型白名单中进行下拉选择。
3. **主/备分别下拉控制**：
   - 界面针对主模型 (Primary Model) 和 降级备用模型 (Fallback Model) 分别提供独立的 Dropdown 选框。
4. **失效模型容错显示 (Backwards Compatibility)**：
   - 若数据库中保存的既有模型不在当前系统白名单内，下拉框临时保留并高亮标记 `[已下线/历史模型]`，告警提示管理员重新选择。
