# 代码注释标准

> 本文档定义了项目的代码注释标准，确保代码逻辑清晰可读。

## 注释原则

1. **清晰性**：注释应该清晰易懂
2. **准确性**：注释应该准确描述代码功能
3. **及时性**：代码变更时同步更新注释
4. **简洁性**：注释应该简洁明了

## 注释类型

### 1. 文件注释

```typescript
/**
 * 文件功能描述
 * 
 * @author 作者
 * @date 日期
 * @version 版本
 */
```

### 2. 函数注释

```typescript
/**
 * 函数功能描述
 * 
 * @param {类型} param1 - 参数1说明
 * @param {类型} param2 - 参数2说明
 * @returns {类型} 返回值说明
 * @throws {错误类型} 错误说明
 * 
 * @example
 * // 使用示例
 * const result = await functionName(param1, param2)
 */
async function functionName(param1: string, param2: number): Promise<string> {
  // 实现逻辑
}
```

### 3. 类注释

```typescript
/**
 * 类功能描述
 * 
 * @example
 * // 使用示例
 * const instance = new ClassName()
 */
class ClassName {
  /**
   * 属性说明
   */
  property: Type
  
  /**
   * 构造函数说明
   * 
   * @param param - 参数说明
   */
  constructor(param: Type) {
    // 实现
  }
  
  /**
   * 方法描述
   * 
   * @param param - 参数说明
   * @returns 返回值说明
   */
  method(param: Type): ReturnType {
    // 实现
  }
}
```

### 4. 接口注释

```typescript
/**
 * 接口功能描述
 */
interface InterfaceName {
  /**
   * 属性说明
   */
  property: Type
  
  /**
   * 方法描述
   * 
   * @param param - 参数说明
   */
  method(param: Type): ReturnType
}
```

### 5. 枚举注释

```typescript
/**
 * 枚举功能描述
 */
enum EnumName {
  /**
   * 值1说明
   */
  VALUE1 = 'value1',
  
  /**
   * 值2说明
   */
  VALUE2 = 'value2',
}
```

## 注释规范

### 1. 函数注释

```typescript
/**
 * 用户登录
 * 
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<AuthResponse>} 认证响应
 * @throws {Error} 用户名或密码错误
 * 
 * @example
 * // 登录示例
 * const response = await login('admin', 'password123')
 */
async function login(username: string, password: string): Promise<AuthResponse> {
  // 实现
}
```

### 2. API端点注释

```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用用户名和密码登录系统
 *     tags:
 *       - 认证
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT令牌
 *       401:
 *         description: 用户名或密码错误
 */
router.post('/login', async (req, res) => {
  // 实现
})
```

### 3. 复杂逻辑注释

```typescript
/**
 * 计算掌握状态
 * 
 * 算法说明：
 * 1. 连续3次做对（间隔1天、7天、30天）
 * 2. 看完完整解析重置为未掌握
 * 3. 相似题连续错2次触发生成
 */
function calculateMastery(records: ReviewRecord[]): MasteryStatus {
  // 实现逻辑
}
```

## 注释检查清单

### 代码提交前检查

- [ ] 文件注释是否完整
- [ ] 函数注释是否准确
- [ ] 类注释是否清晰
- [ ] 复杂逻辑是否有注释
- [ ] 注释是否与代码同步

### 代码审查检查

- [ ] 注释是否清晰易懂
- [ ] 注释是否准确描述功能
- [ ] 注释是否简洁明了
- [ ] 注释是否与代码一致

## 注示例

### 好的注释

```typescript
/**
 * 计算两个日期之间的天数差
 * 
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {number} 天数差
 */
function daysBetween(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
```

### 不好的注释

```typescript
// 计算天数
function daysBetween(startDate: Date, endDate: Date): number {
  // 实现逻辑
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
```

## 注释工具

### 推荐工具

1. **TypeDoc**: TypeScript文档生成
2. **JSDoc**: JavaScript文档生成
3. **ESLint**: 代码规范检查
4. **Prettier**: 代码格式化

### 安装命令

```bash
# TypeDoc
npm install typedoc

# 生成文档
npx typedoc --out docs src/
```

## 注释验证

### 自动化验证

```bash
# 检查注释规范
npm run lint

# 生成文档
npm run docs

# 检查文档覆盖率
npm run docs:coverage
```

### 手动验证

- 注释是否清晰易懂
- 注释是否准确描述功能
- 注释是否与代码一致
- 注释是否简洁明了