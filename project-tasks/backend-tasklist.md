# 后端任务清单

> 基于 API_CONTRACT v1.2，每任务对应一个接口或模块
> 状态：[ ] 待实现 | [x] 已完成 | [→] 进行中

---

## 模块 A：基础设施（Priority: P0）

### [ ] TASK-B01：Supabase Client 初始化
- 对应契约：DB_SCHEMA.md - Supabase Client 实现示例
- 验收标准：
  - `lib/supabase.ts` 创建成功
  - Service Client 和 Public Client 两个函数
  - x-app-id header 注入
  - 环境变量读取正确

### [ ] TASK-B02：Upstash Redis Client 初始化
- 对应契约：TECH_SPEC.md - Upstash Redis 配置
- 验收标准：
  - `lib/redis.ts` 创建成功
  - 去重 hash 函数实现（SHA256）
  - TTL 设置正确（48小时）

### [ ] TASK-B03：LLMAdapter 实现
- 对应契约：TECH_SPEC.md - LLMAdapter 设计
- 验收标准：
  - `lib/llm-adapter.ts` 创建成功
  - 支持 Deepseek/OpenAI/Anthropic 三家 Provider
  - 流式调用支持（SSE）
  - Thinking 输出参数配置

### [ ] TASK-B04：阿里云百炼 Embedding Service
- 对应契约：TECH_SPEC.md - 阿里云百炼 API
- 验收标准：
  - `lib/embedding.ts` 创建成功
  - batch_size=25 批量调用
  - exponential_backoff 重试策略
  - 1024维向量返回

---

## 模块 B：LLM 配置接口（Priority: P0）

### [ ] TASK-B05：POST /api/v1/auth/config/validate
- 对应契约：API_CONTRACT.md #auth-config-validate
- 验收标准：
  - Provider 验证（调用 /v1/models）
  - 返回可用模型列表（过滤弃用模型）
  - 错误码覆盖：api_key_invalid / base_url_invalid / service_unavailable

### [ ] TASK-B06：GET /api/v1/auth/models
- 对应契约：API_CONTRACT.md #auth-models
- 验收标准：
  - 返回 Provider 静态模型列表
  - 包含 status、recommended、cost、description
  - 弃用模型标注 deprecatedDate

### [ ] TASK-B07：POST /api/v1/auth/config
- 对应契约：API_CONTRACT.md #auth-config-post
- 验收标准：
  - 保存 LLM 配置到 llm_config 表
  - validatedAt 和 availableModels 字段写入
  - 模型可用性检查（model_not_available）

### [ ] TASK-B08：GET /api/v1/auth/config
- 对应契约：API_CONTRACT.md #auth-config-get
- 验收标准：
  - 读取当前 LLM 配置
  - 返回 validatedAt 和 availableModels
  - 404 config_not_found 处理

---

## 模块 C：数据源接口（Priority: P0）

### [ ] TASK-B09：GET /api/v1/sources
- 对应契约：API_CONTRACT.md #sources-list
- 验收标准：
  - 分页查询 news_items 表
  - 按日期过滤（默认今天）
  - RLS 自动隔离生效
  - 返回字段完整（publishTime、authorName、platform、title、abstract、coreInsights、rawUrl）

### [ ] TASK-B10：GET /api/v1/sources/:id
- 对应契约：API_CONTRACT.md #sources-detail
- 验收标准：
  - 单条 news_items 查询
  - 返回完整字段（含 keyEntities、hashtags、visualPotential）
  - 404 source_not_found 处理

---

## 模块 D：文章接口（Priority: P0）

### [ ] TASK-B11：GET /api/v1/articles
- 对应契约：API_CONTRACT.md #articles-list
- 验收标准：
  - 分页查询 articles 表
  - 按日期和语言过滤
  - Bullet List 格式响应

### [ ] TASK-B12：GET /api/v1/articles/:id
- 对应契约：API_CONTRACT.md #articles-detail
- 验收标准：
  - 文章详情查询（含 Markdown content）
  - 关联 clusters 信息
  - 点击跳转场景支持

---

## 模块 E：语言切换接口（Priority: P1）

### [ ] TASK-B13：POST /api/v1/language/switch
- 对应契约：API_CONTRACT.md #language-switch
- 验收标准：
  - 更新 projects.settings.output_languages
  - 支持多语言数组（zh/en/zh-en/en-zh）
  - 前端勾选多语言输出支持

---

## 模块 F：Draft 接口（Priority: P0）

### [ ] TASK-B14：POST /api/v1/draft/generate
- 对应契约：API_CONTRACT.md #draft-generate
- 验收标准：
  - Cron Jobs 鉴权（CRON_SECRET）
  - Feed 抓取 → Embedding → Cluster → 摘要生成流水线
  - forceRegenerate 参数支持
  - 事务写入（insert_draft_with_dependencies）

### [ ] TASK-B15：GET /api/v1/draft/:id
- 对应契约：API_CONTRACT.md #draft-detail
- 验收标准：
  - Draft 详情查询（含 clusters 和 items）
  - 审核页面展示所需完整数据
  - 状态过滤（draft/approved/rejected）

### [ ] TASK-B16：POST /api/v1/draft/:id/approve
- 对应契约：API_CONTRACT.md #draft-approve
- 验收标准：
  - Draft 状态更新为 approved
  - approvedAt 时间戳写入
  - 触发后续流水线（生成文章）
  - 状态冲突处理（draft_already_approved）

---

## 模块 G：Chatbot Tools 接口（Priority: P0）

### [ ] TASK-B17：POST /api/v1/tools（统一入口）
- 对应契约：API_CONTRACT.md #tools-post
- 验收标准：
  - 14 个 Tool 路由分发
  - 参数验证和类型检查
  - thinking 输出字段支持

### [ ] TASK-B18：POST /api/v1/tools/stream（SSE 流式）
- 对应契约：API_CONTRACT.md #tools-stream
- 验收标准：
  - text/event-stream 响应
  - thinking/content/done 三种事件类型
  - EventSource 前端调用支持

### [ ] TASK-B19：Tool 1-3 实现（P0 高频核心）
- 对应契约：API_CONTRACT.md Tools 定义
- 包含：
  - list_clusters（列出 draft 所有 clusters）
  - get_cluster_detail（获取 cluster 详情含 items）
  - approve_draft（审核通过）
- 验收标准：返回结构与契约一致

### [ ] TASK-B20：Tool 4-6 实现（P1 中频调整）
- 对应契约：API_CONTRACT.md Tools 定义
- 包含：
  - edit_cluster_insight（编辑核心洞察）
  - delete_item（删除 item）
  - edit_item_summary（编辑观点摘要）
- 验收标准：返回结构与契约一致

### [ ] TASK-B21：Tool 7-11 实现（P2 低频操作）
- 对应契约：API_CONTRACT.md Tools 定义
- 包含：
  - merge_clusters（合并 clusters）
  - add_item（添加 item）
  - regenerate_draft（重新生成）
  - reorder_items（调整顺序）
  - split_cluster（拆分 cluster）
- 验收标准：返回结构与契约一致

### [ ] TASK-B22：Tool 12-14 实现（P3 补充工具）
- 对应契约：API_CONTRACT.md Tools 定义
- 包含：
  - list_items（列出 cluster items）
  - get_item_detail（获取 item 详情）
  - delete_cluster（删除 cluster）
- 验收标准：返回结构与契约一致

---

## 模块 H：Cron Jobs 接口（Priority: P0）

### [ ] TASK-B23：GET /api/v1/cron/fetch
- 对应契约：API_CONTRACT.md #cron-fetch
- 验收标准：
  - 04:00 定时触发
  - Feed 抓取（follow-builders）
  - Upstash 去重
  - Embedding 生成
  - Cluster 聚合
  - Draft 写入

### [ ] TASK-B24：GET /api/v1/cron/cleanup
- 对应契约：API_CONTRACT.md #cron-cleanup
- 验收标准：
  - 03:00 定时触发
  - 清理超过 24 小时的 Redis 数据
  - 返回清理统计

---

## 模块 I：健康检查接口（Priority: P1）

### [ ] TASK-B25：GET /api/health
- 对应契约：API_CONTRACT.md #health
- 验收标准：
  - Supabase 连接检查
  - Redis 连接检查
  - 服务状态返回

---

## 任务统计

| 模块 | 任务数 | Priority |
|------|--------|----------|
| A 基础设施 | 4 | P0 |
| B LLM配置 | 4 | P0 |
| C 数据源 | 2 | P0 |
| D 文章 | 2 | P0 |
| E 语言切换 | 1 | P1 |
| F Draft | 3 | P0 |
| G Tools | 6 | P0/P1/P2/P3 |
| H Cron Jobs | 2 | P0 |
| I 健康检查 | 1 | P1 |
| **总计** | **25** | - |

---

> **实现原则：严格按契约字段名路径实现，遇到歧义写入 BACKEND_STATUS.md ISSUES 章节，不自决。**