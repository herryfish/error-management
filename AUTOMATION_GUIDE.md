# 自动化开发流程指南

本文档说明如何使用自动化流程从Issue到发布的完整开发周期。

## 流程概览

```
人工测试发现问题
    ↓
在GitHub上提Issue（添加 `auto-fix` 标签）
    ↓
AI自动分析Issue
    ↓
AI自动修改代码
    ↓
自动创建PR
    ↓
自动审核（人工/AI）
    ↓
自动合并
    ↓
自动构建和测试
    ↓
自动发布
```

## 步骤详解

### 步骤1：人工测试发现问题

在本地或测试环境中测试系统，发现问题后记录：

- 问题描述
- 复现步骤
- 期望行为 vs 实际行为
- 相关截图或日志

### 步骤2：在GitHub上提Issue

1. 访问GitHub仓库：https://github.com/herryfish/error-management/issues/new

2. 填写Issue信息：
   - **标题**：简洁描述问题（如："登录页面样式错乱"）
   - **描述**：详细说明问题，包括复现步骤
   - **标签**：添加 `auto-fix` 标签（触发自动修复）

3. 提交Issue

**Issue模板示例**：

```markdown
## 问题描述
登录页面在移动端显示不正确

## 复现步骤
1. 打开手机浏览器
2. 访问 http://localhost:3001/login
3. 输入用户名和密码
4. 点击登录按钮

## 期望行为
登录按钮应该全宽显示

## 实际行为
登录按钮只显示一半宽度

## 环境信息
- 设备：iPhone 12
- 浏览器：Safari
- 系统：iOS 15
```

### 步骤3：AI自动分析Issue

当Issue被创建并添加 `auto-fix` 标签后，GitHub Actions会自动：

1. 分析Issue内容
2. 识别问题类型（UI、逻辑、性能等）
3. 定位相关代码文件
4. 制定修复方案

### 步骤4：AI自动修改代码

AI会自动：

1. 创建修复分支（`fix/issue-{number}`）
2. 修改相关代码
3. 运行代码检查
4. 运行测试
5. 提交更改

### 步骤5：自动创建PR

AI会自动创建Pull Request，包含：

- 修复内容说明
- 测试结果
- 关联的Issue

### 步骤6：自动审核

PR创建后，自动审核工作流会：

1. 运行代码分析
2. 检查测试覆盖率
3. 检测破坏性变更
4. 生成审核报告
5. 自动批准（如果通过）或请求修改

### 步骤7：自动合并

审核通过后，可以：

1. 手动合并PR
2. 或配置自动合并（如果所有检查通过）

### 步骤8：自动构建和测试

合并到main分支后，CI/CD工作流会：

1. 运行完整测试套件
2. 构建前端和后端
3. 运行数据库迁移
4. 构建Docker镜像

### 步骤9：自动发布

如果所有检查通过，会自动：

1. 确定版本号（根据提交类型）
2. 更新版本号
3. 生成变更日志
4. 创建Git标签
5. 创建GitHub Release
6. 构建并推送Docker镜像

## 标签说明

| 标签 | 说明 |
|------|------|
| `auto-fix` | 触发自动修复流程 |
| `bug` | bug报告 |
| `feature` | 新功能 |
| `enhancement` | 改进建议 |
| `documentation` | 文档相关 |
| `breaking-change` | 破坏性变更 |

## 提交规范

使用[Conventional Commits](https://www.conventionalcommits.org/)规范：

| 提交类型 | 说明 | 版本影响 |
|----------|------|----------|
| `feat:` | 新功能 | minor |
| `fix:` | 修复bug | patch |
| `docs:` | 文档更新 | patch |
| `style:` | 代码格式（不影响功能） | patch |
| `refactor:` | 重构（不改变功能） | patch |
| `test:` | 测试相关 | patch |
| `chore:` | 构建/工具变更 | patch |
| `perf:` | 性能优化 | patch |
| `ci:` | CI配置变更 | patch |
| `BREAKING CHANGE:` | 破坏性变更 | major |

## 示例流程

### 示例1：修复样式问题

1. **发现问题**：登录按钮在移动端显示不正确
2. **创建Issue**：
   - 标题："登录按钮样式问题"
   - 标签：`auto-fix`, `bug`
3. **AI自动修复**：
   - 创建分支 `fix/issue-123`
   - 修改 `frontend/src/views/Login.vue` 中的样式
   - 创建PR #124
4. **自动审核**：通过
5. **自动合并**：合并到main
6. **自动发布**：发布 v1.0.1

### 示例2：添加新功能

1. **需求**：添加深色模式支持
2. **创建Issue**：
   - 标题："添加深色模式"
   - 标签：`feature`, `enhancement`
3. **AI实现**：
   - 创建分支 `feature/dark-mode`
   - 实现深色模式切换
   - 创建PR #125
4. **人工审核**：审核代码
5. **手动合并**：合并到main
6. **自动发布**：发布 v1.1.0

## 高级配置

### 配置自动合并

在仓库设置中启用自动合并：

1. 进入 Settings → General
2. 找到 "Allow auto-merge"
3. 启用此功能

### 配置分支保护

在仓库设置中配置分支保护规则：

1. 进入 Settings → Branches
2. 添加main分支的保护规则
3. 要求PR审核
4. 要求状态检查通过

### 配置Secrets

在仓库设置中配置必要的Secrets：

1. 进入 Settings → Secrets and variables → Actions
2. 添加以下Secrets：
   - `SERVER_HOST`：服务器地址
   - `SERVER_USERNAME`：服务器用户名
   - `SERVER_SSH_KEY`：SSH私钥

## 故障排除

### Issue未触发自动修复

检查：
1. Issue是否添加了 `auto-fix` 标签
2. GitHub Actions是否启用
3. 工作流文件是否正确

### PR未自动审核

检查：
1. PR是否来自自动化流程
2. GitHub Actions是否有足够权限
3. 工作流文件是否正确

### 发布失败

检查：
1. 所有测试是否通过
2. 版本号格式是否正确
3. GitHub Token是否有足够权限

## 最佳实践

1. **清晰的Issue描述**：提供详细的问题描述和复现步骤
2. **使用标签**：正确使用标签触发自动化流程
3. **小步提交**：每个PR只修复一个问题
4. **及时审核**：及时审核自动化创建的PR
5. **监控流程**：定期检查GitHub Actions运行状态

## 支持

如有问题，请：
1. 检查GitHub Actions运行日志
2. 查看本文档的故障排除部分
3. 创建Issue寻求帮助