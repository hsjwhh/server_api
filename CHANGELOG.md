# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 新增仪表盘统计接口 (`GET /api/stats/dashboard`)，提供汇总数据、最近录入列表及操作系统分布统计。
- 新增服务器信息插入接口 (`POST /api/sn`)，支持批量录入硬件配置字段。
- 新增 SN 唯一性检查接口 (`GET /api/sn/check-sn/:sn`)，支持前端实时校验。
- 新增 CPU 插入 (`POST /api/hw/cpu`) 与更新 (`PUT /api/hw/cpu/:id`) 接口。
- 新增主板插入 (`POST /api/hw/mb`) 与更新 (`PUT /api/hw/mb/:id`) 接口。

### Changed
- **认证增强**：将 Refresh Token 存储从内存迁移至数据库 (`refresh_tokens` 表)，支持服务重启后的会话保持。
- **登出逻辑优化**：实现标准化的“逻辑吊销”机制，登出后在数据库中标记 Token 为已吊销并记录 `revoked_at` 时间。
- **数据库重构**：为 `server_info` 表新增标准 `entry_date` (DATE) 字段，并完成存量数据从 `y, m, d` 字段的合并迁移。
- **日期处理增强**：`snService` 现在智能兼容 `entry_date` 或传统的 `y, m, d` 输入，并自动实现双向数据同步；同时规范化 API 输出格式为 `YYYY-MM-DD`。
- **Dashboard 优化**：限制操作系统分布统计仅显示前 10 名，提升图表展示效果。
- 修改 `hwController`、`snController` 和 `authController`，在输出 JSON 数据前对 ID 进行编码，在输入 ID 查询时进行解码。
- 更新 `config/index.js` 和 `.env.example`，加入 `HASHIDS_SALT` 环境变量配置。

### Fixed
- **Docker 兼容性修复**：移除 `server.js` 中的本地监听限制，恢复默认监听以确保 Docker 容器内外连接正常。

### Security
- 引入 `hashids` 库，对所有对外暴露的数字 ID（CPU、主板、SN详情、用户信息）进行混淆处理，防止 ID 遍历攻击。
- 新增 `HASHIDS_SALT` 配置项，支持自定义混淆密钥。

## [0.1.1] - 2026-03-09

### Added
- 新增通用校验中间件 `middleware/validate.js`，支持对 `body`, `query`, `params` 的基础字段校验。
- 在 `routes/snRoutes.js` 的搜索接口中强制要求 `keyword` 必填且不少于 4 个字符。
- 升级 CPU 搜索接口 (`GET /api/hw/cpu`) 支持型号模糊搜索与核心数 (`cores`) 精确过滤的组合查询。
- 为 CPU 搜索接口增加 `cores` 参数校验（最大 3 位长度），并支持型号或核心数任选其一。
- 新增 `api-test.http` 测试脚本，支持使用 REST Client 插件进行全场景接口测试。
- 新增 `.rsync-exclude` 排除列表，优化项目同步流程。
- 新增主板型号搜索接口 (`GET /api/hw/mb`)，支持根据关键词模糊查询主板。
- 在 `api-test.http` 中同步增加了主板搜索的测试用例。

## [0.1.0] - 2026-03-08

### Added
- Added a centralized configuration module with environment loading, parsing, and startup validation.
- Added `.env.example` as the canonical template for local and deployment configuration.
- Added a standardized project changelog following Keep a Changelog.
- Added dated technical documentation under `doc/` for the env refactor and production deployment guidance.

### Changed
- Changed application bootstrap to read CORS and port settings from the centralized config layer.
- Changed authentication and middleware code to consume JWT and cookie settings from centralized configuration.
- Changed database connection setup to read credentials and connection options from environment variables instead of hardcoded values.
- Changed `.env.example` to include detailed Chinese comments and grouped production-oriented guidance.

### Security
- Removed hardcoded database credentials from source-controlled runtime configuration.
- Added fail-fast validation for required secrets and database connection variables.
