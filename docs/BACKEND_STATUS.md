# 后端实现状态

> Phase 5 由 backend-architect 记录实现状态和问题

---

## 已实现模块

| 模块 | 任务编号 | 状态 | 文件 | 备注 |
|------|---------|------|------|------|
| Upstash Redis Client | TASK-B01 | ✅ 完成 | lib/redis.ts | 去重hash、批量统计、重试队列 |
| LLMAdapter | TASK-B02 | ✅ 完成 | lib/llm-adapter.ts | 支持三家Provider、流式输出、Thinking |
| 阿里云百炼 Embedding | TASK-B03 | ✅ 完成 | lib/embedding.ts | batch_size=25、exponential_backoff |
| Fetcher Service | TASK-B04 | ✅ 完成 | lib/fetcher.ts | Feed抓取、去重、存储 |
| Processor Service | TASK-B05 | ✅ 完成 | lib/processor.ts | Cluster聚合、LLM摘要、Draft创建 |
| Utils 工具函数 | TASK-B06 | ✅ 完成 | lib/utils/*.ts | dedupe/retry/format |
| Next.js 项目初始化 | TASK-F01 | ✅ 完成 | package.json, tsconfig.json, next.config.js等 | Next.js 15 + Tailwind CSS |
| 健康检查接口 | TASK-B25 | ✅ 完成 | app/api/health/route.ts | GET /api/health |
| LLM 配置验证接口 | TASK-B07 | ✅ 完成 | app/api/v1/auth/config/validate/route.ts | POST /api/v1/auth/config/validate |
| LLM 模型列表接口 | TASK-B08 | ✅ 完成 | app/api/v1/auth/models/route.ts | GET /api/v1/auth/models |
| LLM 配置保存接口 | TASK-B09 | ✅ 完成 | app/api/v1/auth/config/route.ts (POST) | POST /api/v1/auth/config |
| LLM 配置读取接口 | TASK-B10 | ✅ 完成 | app/api/v1/auth/config/route.ts (GET) | GET /api/v1/auth/config |

---

## 模块详情

### TASK-B01：Upstash Redis Client

**文件**：`lib/redis.ts`

**功能**：
- Redis Client 初始化（Upstash REST API）
- 去重 Hash 计算：SHA256(title+url)
- Key 设计：news:dedupe:{hash}、news:url:{url_hash}、news:batch:{date}、news:retry:{date}
- TTL 设置：48小时（去重）、24小时（统计）
- 批量去重检查、批量标记
- URL 映射存储
- 批量统计操作
- 重试队列管理
- 清理过期数据

**关键函数**：
- `computeDedupeHash(title, url)` - SHA256 hash
- `batchCheckDuplicates(redis, hashes)` - 批量去重
- `batchMarkAsDuplicate(redis, hashes)` - 批量标记
- `cleanupBeforeDate(redis, beforeDate)` - Cron 清理

---

### TASK-B02：LLMAdapter

**文件**：`lib/llm-adapter.ts`

**功能**：
- 支持 Deepseek/OpenAI/Anthropic 三家 Provider
- 流式调用支持（SSE）
- Thinking 输出参数配置（Deepseek: include_reasoning, Anthropic: thinking budget）
- 默认配置从环境变量读取
- 从 Supabase 读取配置
- 单例模式管理

**关键类和函数**：
- `OpenAICompatibleAdapter` - OpenAI/Deepseek 适配器
- `AnthropicAdapter` - Anthropic 适配器
- `createLLMAdapter(config)` - 工厂函数
- `getLLMAdapter()` - 单例获取
- `chatStream(messages, callbacks)` - 流式调用

---

### TASK-B03：阿里云百炼 Embedding

**文件**：`lib/embedding.ts`

**功能**：
- BAILIAN_API_KEY 和 BAILIAN_ENDPOINT 环境变量
- text-embedding-v4 API 调用
- batch_size=25 批量处理
- exponential_backoff 重试（最多3次，5s/15s/30s）
- 1024维向量返回
- 余弦相似度计算
- PostgreSQL vector 格式转换

**关键函数**：
- `generateEmbeddings(texts)` - 批量生成
- `generateEmbedding(text)` - 单条生成
- `cosineSimilarity(a, b)` - 相似度计算
- `parseVectorString(vectorStr)` - 解析 vector 字符串

---

### TASK-B04：Fetcher Service

**文件**：`lib/fetcher.ts`

**功能**：
- Feed URL 配置：FEED_X_URL/FEED_PODCASTS_URL/FEED_BLOGS_URL
- 并行抓取三个 Feed
- Upstash 去重逻辑
- 增量统计
- 重试策略（最多3次）
- 存储到 Supabase

**关键函数**：
- `fetchAllFeeds()` - 并行抓取
- `deduplicateFeedItems(items, date)` - 去重处理
- `storeFeedItems(items, date)` - 存储
- `runFetchPipeline(date)` - 完整流水线

---

### TASK-B05：Processor Service

**文件**：`lib/processor.ts`

**功能**：
- Cluster 聚合算法（基于 embedding 相似度 > 0.7）
- 阈值聚类（贪心策略）
- LLM 摘要生成（核心洞察）
- Draft 创建流程
- 并发限制（最多5个LLM调用）

**关键函数**：
- `clusterItems(items)` - Cluster 聚合
- `generateClusterInsight(cluster, items)` - LLM 摘要
- `generateClusterInsights(clusters, itemsMap)` - 批量生成
- `createDraft(clusters, date, language)` - Draft 创建
- `runProcessorPipeline(date)` - 完整流水线

---

### TASK-B06：Utils 工具函数

**文件**：`lib/utils/*.ts`

**dedupe.ts**：
- `computeDedupeHash(title, url)` - SHA256 hash
- `computeUrlHash(url)` - URL hash
- `batchComputeDedupeHash(items)` - 批量计算
- `isValidHash(hash)` - 验证格式

**retry.ts**：
- `withRetry(fn, config)` - 带重试执行
- `withExponentialBackoff(fn)` - 指数退避
- `batchWithRetry(tasks, config)` - 批量重试
- `RetryableError` - 可重试错误类

**format.ts**：
- `formatISO8601(date)` - ISO 时间
- `formatDate(date)` - YYYY-MM-DD
- `formatDuration(ms)` - 持续时间
- `formatVector(vector)` - PostgreSQL vector
- `parseVector(vectorStr)` - 解析 vector
- `isValidUUID(uuid)` - UUID 验证

---

## TASK-F01：Next.js 项目初始化

**文件**：
- `package.json` - 依赖配置（Next.js 15.3.2, React 19, Supabase, Upstash Redis）
- `tsconfig.json` - TypeScript 严格模式配置
- `next.config.js` - standalone 输出模式、basePath 配置
- `tailwind.config.js` - CSS 变量集成
- `postcss.config.js` - PostCSS 插件
- `app/layout.tsx` - 根布局
- `app/page.tsx` - 首页占位
- `styles/globals.css` - 全局样式（引入 variables.css + Tailwind）

**功能**：
- Next.js 15 App Router 架构
- TypeScript 严格模式
- Tailwind CSS + CSS 变量体系
- standalone 输出模式（Docker 部署支持）
- basePath 子路径部署支持

---

### TASK-B07：LLM 配置验证接口

**文件**：`app/api/v1/auth/config/validate/route.ts`

**功能**：
- POST /api/v1/auth/config/validate
- Provider 验证（调用 /v1/models 接口）
- 返回可用模型列表（过滤弃用模型）
- 错误码：api_key_invalid、base_url_invalid、service_unavailable
- 验证逻辑：Deepseek/OpenAI 调用 models 接口，Anthropic 使用预设列表

**契约对齐**：
- 请求体字段：provider、baseUrl、apiKey（完全匹配）
- 响应字段：valid、provider、baseUrl、availableModels、message（完全匹配）
- 错误码覆盖所有契约定义的场景

---

### TASK-B08：LLM 模型列表接口

**文件**：`app/api/v1/auth/models/route.ts`

**功能**：
- GET /api/v1/auth/models?provider={provider}
- 返回 Provider 静态模型列表
- 包含 status、recommended、cost、description
- 弃用模型标注 deprecatedDate

**契约对齐**：
- 查询参数：provider（完全匹配）
- 响应字段：provider、models（id、name、status、recommended、cost、description、deprecatedDate）
- 错误码：validation_error、internal_error

---

### TASK-B09：LLM 配置保存接口

**文件**：`app/api/v1/auth/config/route.ts`（POST 部分）

**功能**：
- POST /api/v1/auth/config
- 保存 LLM 配置到 llm_config 表
- validatedAt 和 availableModels 字段写入
- 模型可用性检查（model_not_available）
- 支持创建新配置和更新现有配置

**契约对齐**：
- 请求体字段：provider、baseUrl、apiKey、model（完全匹配）
- 响应字段：id、provider、baseUrl、apiKey、model、validatedAt、availableModels、updatedAt
- 错误码：validation_error、model_not_available、internal_error

---

### TASK-B10：LLM 配置读取接口

**文件**：`app/api/v1/auth/config/route.ts`（GET 部分）

**功能**：
- GET /api/v1/auth/config
- 读取当前 LLM 配置
- 返回 validatedAt 和 availableModels
- 404 config_not_found 处理

**契约对齐**：
- 响应字段：id、provider、baseUrl、apiKey、model、validatedAt、availableModels、updatedAt
- 错误码：config_not_found、internal_error

---

### TASK-B25：健康检查接口

**文件**：`app/api/health/route.ts`

**功能**：
- GET /api/health
- 检查 Supabase 连接状态
- 返回 status、supabase、redis、timestamp
- 无需鉴权，任何情况返回 200 或 503

**契约对齐**：
- 响应字段：status、supabase、redis、timestamp
- 错误码：service_unavailable

---

## ISSUES

无（实现过程中未发现契约歧义）

---

## 实现与契约差异

无差异（所有实现严格遵循 TECH_SPEC.md 和 API_CONTRACT.md 规范）

---

## 环境变量依赖

| 变量名 | 模块 | 说明 |
|--------|------|------|
| UPSTASH_REST_URL | redis | Redis REST API URL |
| UPSTASH_REST_TOKEN | redis | Redis Token |
| BAILIAN_API_KEY | embedding | 阿里云百炼 API Key |
| BAILIAN_ENDPOINT | embedding | Embedding API Endpoint |
| DEEPSEEK_API_KEY | llm-adapter | Deepseek API Key |
| OPENAI_API_KEY | llm-adapter | OpenAI API Key |
| ANTHROPIC_API_KEY | llm-adapter | Anthropic API Key |
| LLM_PROVIDER | llm-adapter | 默认 Provider |
| LLM_MODEL | llm-adapter | 默认模型 |
| LLM_BASE_URL | llm-adapter | 默认 Base URL |
| FEED_X_URL | fetcher | X Feed URL |
| FEED_PODCASTS_URL | fetcher | Podcasts Feed URL |
| FEED_BLOGS_URL | fetcher | Blogs Feed URL |

---

## 下一步任务

- TASK-B09 ~ TASK-B10：数据源接口
- TASK-B11 ~ TASK-B12：文章接口
- TASK-B14 ~ TASK-B16：Draft 接口
- TASK-B17 ~ TASK-B22：Chatbot Tools 接口
- TASK-B23 ~ TASK-B24：Cron Jobs 接口

---

> **实现原则：严格按契约字段名路径实现，遇到歧义写入 ISSUES 章节，不自决。**