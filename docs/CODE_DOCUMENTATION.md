# 代码文档管理指南

> 本文档定义了项目的代码文档标准，确保代码修改后的逻辑准确性。

## 文档原则

1. **代码即文档**：代码本身应该是可读的
2. **文档即代码**：文档应该与代码同步更新
3. **自动化**：尽可能自动化文档生成和验证

## 文档类型

### 1. 架构文档

**位置**: `design/` 目录

**内容**:
- 系统架构图
- 数据流图
- 组件关系图
- 技术栈说明

**维护频率**: 架构变更时更新

### 2. API文档

**位置**: `design/api.md`

**内容**:
- 端点列表
- 请求/响应格式
- 认证方式
- 错误码说明

**维护频率**: API变更时更新

### 3. 代码注释

**标准**:
```typescript
/**
 * 函数描述
 * 
 * @param param1 - 参数1说明
 * @param param2 - 参数2说明
 * @returns 返回值说明
 * @example
 * // 使用示例
 * const result = function(param1, param2)
 */
function exampleFunction(param1: string, param2: number): string {
  // 实现逻辑
}
```

**维护频率**: 代码变更时更新

### 4. 测试文档

**位置**: `tests/` 目录

**内容**:
- 测试用例说明
- 测试覆盖报告
- 测试运行指南

**维护频率**: 测试变更时更新

### 5. 变更日志

**位置**: `CHANGELOG.md`

**内容**:
- 版本记录
- 变更说明
- 破坏性变更

**维护频率**: 每次发布时更新

### 6. 开发指南

**位置**: `docs/DEVELOPMENT.md`

**内容**:
- 环境配置
- 开发流程
- 贡献指南
- 代码规范

**维护频率**: 流程变更时更新

## 自动化文档

### 1. API文档自动生成

使用Swagger/OpenAPI自动生成API文档：

```bash
# 安装swagger-jsdoc
npm install swagger-jsdoc swagger-ui-express

# 在代码中添加注释
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 获取用户列表
 *     responses:
 *       200:
 *         description: 成功
 */
```

### 2. 测试覆盖率报告

```bash
# 生成测试覆盖率报告
npm run test:coverage

# 查看报告
open coverage/lcov-report/index.html
```

### 3. 变更日志自动生成

使用standard-version自动生成变更日志：

```bash
# 安装standard-version
npm install -g standard-version

# 生成变更日志
standard-version
```

## 文档检查清单

### 代码提交前检查

- [ ] 代码注释是否完整
- [ ] API文档是否更新
- [ ] 测试用例是否添加
- [ ] 变更日志是否更新
- [ ] README是否更新

### 代码审查检查

- [ ] 代码逻辑是否清晰
- [ ] 注释是否准确
- [ ] 测试是否覆盖
- [ ] 文档是否同步

## 文档工具

### 推荐工具

1. **Swagger/OpenAPI**: API文档生成
2. **TypeDoc**: TypeScript文档生成
3. **JSDoc**: JavaScript文档生成
4. **standard-version**: 变更日志生成
5. **Storybook**: 组件文档

### 安装命令

```bash
# Swagger
npm install swagger-jsdoc swagger-ui-express

# TypeDoc
npm install typedoc

# standard-version
npm install -g standard-version
```

## 文档模板

### 函数注释模板

```typescript
/**
 * 函数功能描述
 * 
 * @param {类型} 参数名 - 参数说明
 * @returns {类型} 返回值说明
 * @throws {错误类型} 错误说明
 * 
 * @example
 * // 示例代码
 * const result = await functionName(param1, param2)
 */
```

### 类注释模板

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
   * 方法描述
   * 
   * @param param - 参数说明
   */
  method(param: Type): ReturnType {
    // 实现
  }
}
```

### API端点注释模板

```typescript
/**
 * @swagger
 * /api/endpoint:
 *   get:
 *     summary: 端点描述
 *     description: 详细说明
 *     tags:
 *       - 标签
 *     parameters:
 *       - name: param
 *         in: query
 *         description: 参数说明
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 */
```

## 文档验证

### 自动化验证

```bash
# 检查API文档是否与代码同步
npm run api:validate

# 检查测试覆盖率
npm run test:coverage

# 检查代码规范
npm run lint
```

### 手动验证

- 代码逻辑是否与文档一致
- API端点是否与文档匹配
- 测试用例是否覆盖所有场景

## 文档维护

### 定期审查

- 每周审查文档准确性
- 每月更新架构文档
- 每次发布更新变更日志

### 文档负责人

- **架构文档**: 架构师
- **API文档**: 后端开发
- **测试文档**: 测试工程师
- **变更日志**: 发布负责人