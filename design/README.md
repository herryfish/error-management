# 错误管理系统设计文档

本文档包含系统设计的所有部分，基于需求确认书 v1.3（完整版）。

## 设计部分

1. [系统架构](./architecture.md) - 整体架构、组件图、数据流
2. [数据库设计](./database.md) - MariaDB 表结构、ER 图
3. [API 设计](./api.md) - RESTful API 端点、请求/响应格式
4. [部署架构](./deployment.md) - Docker Compose 配置、CI/CD 流水线
5. [工程自动化](./engineering.md) - 变更流程、审批策略、CI/CD 流水线
6. [LLM配置系统](./llm_config.md) - 多提供商配置、降级策略、用量监控

## 设计原则

- 简洁、易懂、利于高效迭代
- 支持 H5 移动优先
- 使用 MariaDB 作为数据库
- 部署在自家服务器，使用 Docker Compose
- CI/CD 使用 GitHub Actions
- LLM 集成支持多提供商配置，允许配置降级模型
- 变更全流程自动化