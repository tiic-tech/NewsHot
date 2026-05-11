# API 接口契约
> 版本: 1.2 | 基础路径: /api/v1
> 本文件是唯一权威接口定义，前后端实现必须严格遵守，不得擅自修改

---

## 认证说明

MVP阶段无认证系统，所有接口开放访问。

Cron Jobs接口需要特殊鉴权：
```
Authorization: Bearer {CRON_SECRET}
```

---

## 统一响应格式

**成功**：
```json
{
  "data": { ... },
  "message": "success"
}
```

**失败**：
```json
{
  "error": "error_code",
  "message": "人类可读的错误描述"
}
```

---

## LLM配置模块

### POST /api/v1/auth/config/validate

**用途**：验证LLM配置有效性并返回可用模型列表（对应 PRD：配置验证流程）
**鉴权**：不需要

**请求体** (`Content-Type: application/json`)：
```json
{
  "provider": "string",        // 必填，枚举值：openai | anthropic | deepseek
  "baseUrl": "string",         // 必填，API基础URL，如：https://api.deepseek.com
  "apiKey": "string"           // 必填，API密钥
}
```

**成功响应** (200)：
```json
{
  "data": {
    "valid": true,
    "provider": "deepseek",
    "baseUrl": "https://api.deepseek.com",
    "availableModels": [
      "deepseek-v4-flash",
      "deepseek-v4-pro"
    ],
    "message": "验证成功，可用模型已更新"
  },
  "message": "success"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | provider不在枚举值范围内 |
| 400 | `validation_error` | baseUrl格式不正确（非有效URL） |
| 400 | `validation_error` | apiKey为空字符串 |
| 400 | `api_key_invalid` | apiKey无效（API返回401） |
| 400 | `base_url_invalid` | baseUrl无效（无法连接） |
| 500 | `internal_error` | 验证过程中发生未知错误 |
| 503 | `service_unavailable` | Provider API不可用（超时或限流） |

**验证逻辑说明**：
1. 后端调用 Provider 的 `/v1/models` 接口验证 apiKey 有效性
2. Deepseek/OpenAI：`GET {baseUrl}/v1/models`，Header `Authorization: Bearer {apiKey}`
3. Anthropic：使用预设模型列表（Anthropic 可能没有 models 接口）
4. 验证成功后返回该 Provider 的可用模型列表（过滤弃用模型）
5. 前端收到可用模型列表后更新下拉框，用户选择具体模型

**各 Provider 可用模型列表定义**：

| Provider | 可用模型 | 弃用模型 |
|----------|---------|---------|
| Deepseek | `deepseek-v4-flash`、`deepseek-v4-pro` | `deepseek-chat`（2026/07/24弃用）、`deepseek-reasoner`（2026/07/24弃用） |
| OpenAI | `gpt-4o-mini`、`gpt-4o`、`o1-mini`、`o1-preview` | `gpt-3.5-turbo` |
| Anthropic | `claude-3-5-haiku`、`claude-3-5-sonnet`、`claude-3-opus` | 无 |

---

### GET /api/v1/auth/models

**用途**：获取Provider的可用模型列表（静态数据，前端可选调用）
**鉴权**：不需要

**查询参数**：
```
provider: string (必填，枚举：openai | anthropic | deepseek)
```

**成功响应** (200)：
```json
{
  "data": {
    "provider": "deepseek",
    "models": [
      {
        "id": "deepseek-v4-flash",
        "name": "Deepseek V4 Flash",
        "status": "active",
        "recommended": true,
        "cost": "¥0.001/1K tokens（输入）",
        "description": "默认模型，性能足够，成本最低"
      },
      {
        "id": "deepseek-v4-pro",
        "name": "Deepseek V4 Pro",
        "status": "active",
        "recommended": false,
        "cost": "¥0.002/1K tokens（输入）",
        "description": "高性能模型，复杂任务"
      },
      {
        "id": "deepseek-chat",
        "name": "Deepseek Chat",
        "status": "deprecated",
        "deprecatedDate": "2026/07/24",
        "description": "已弃用，不建议使用"
      }
    ]
  },
  "message": "success"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | provider不在枚举值范围内 |
| 500 | `internal_error` | 查询失败 |

**说明**：
- 此接口提供静态模型列表数据，前端可在 Provider 选择后调用获取完整模型信息
- 模型列表包含状态、推荐度、成本、描述等详细信息
- 弃用模型会标注 `status: "deprecated"` 和弃用日期

---

### POST /api/v1/auth/config

**用途**：保存LLM配置（provider、base_url、api_key、model）
**鉴权**：不需要

**请求体** (`Content-Type: application/json`)：
```json
{
  "provider": "string",        // 必填，枚举值：openai | anthropic | deepseek
  "baseUrl": "string",         // 必填，API基础URL，如：https://api.deepseek.com
  "apiKey": "string",          // 必填，API密钥
  "model": "string"            // 必填，模型名称，如：deepseek-v4-flash
}
```

**成功响应** (200)：
```json
{
  "data": {
    "id": "uuid-string",
    "provider": "deepseek",
    "baseUrl": "https://api.deepseek.com",
    "apiKey": "sk-xxx",
    "model": "deepseek-v4-flash",
    "validatedAt": "2024-01-15T08:30:00Z",
    "availableModels": ["deepseek-v4-flash", "deepseek-v4-pro"],
    "updatedAt": "2024-01-15T08:30:00Z"
  },
  "message": "LLM配置已保存"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | provider不在枚举值范围内 |
| 400 | `validation_error` | baseUrl格式不正确（非有效URL） |
| 400 | `validation_error` | apiKey为空字符串 |
| 400 | `validation_error` | model为空字符串 |
| 400 | `model_not_available` | model不在该Provider的可用模型列表中 |
| 500 | `internal_error` | Supabase写入失败 |

**保存逻辑说明**：
1. 前端应先调用 `/api/v1/auth/config/validate` 验证配置并获取可用模型列表
2. 用户从可用模型列表中选择具体模型
3. 调用此接口保存配置，后端检查 model 是否在 validated 时返回的可用模型列表中
4. 保存成功后，后端更新 LLMAdapter 实例，后续 LLM 调用使用新配置
5. `validatedAt` 和 `availableModels` 字段由验证接口设置，保存时一并存储

---

### GET /api/v1/auth/config

**用途**：读取当前LLM配置
**鉴权**：不需要

**成功响应** (200)：
```json
{
  "data": {
    "id": "uuid-string",
    "provider": "deepseek",
    "baseUrl": "https://api.deepseek.com",
    "apiKey": "sk-xxx",
    "model": "deepseek-v4-flash",
    "validatedAt": "2024-01-15T08:30:00Z",
    "availableModels": ["deepseek-v4-flash", "deepseek-v4-pro"],
    "updatedAt": "2024-01-15T08:30:00Z"
  },
  "message": "success"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 404 | `config_not_found` | 未配置LLM（首次使用需先POST配置） |
| 500 | `internal_error` | Supabase读取失败 |

---

## 数据源模块

### GET /api/v1/sources

**用途**：获取数据源列表（Bullet List展示）
**鉴权**：不需要

**查询参数**：
```
date: string (可选，格式：2024-01-15，默认今天)
page: number (可选，默认1)
pageSize: number (可选，默认20)
```

**成功响应** (200)：
```json
{
  "data": {
    "sources": [
      {
        "id": "uuid-string",
        "publishTime": "2024-01-15T06:30:00Z",
        "authorName": "string",
        "platform": "string",         // 枚举：x | podcast | blog
        "title": "string",
        "abstract": "string",
        "coreInsights": "string",
        "rawUrl": "string",
        "contentType": "string",      // 枚举：争议型 | 恐虑型 | 干货型 | 故事型 | 其他
        "importanceScore": 8
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  },
  "message": "success"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | date格式不正确（非YYYY-MM-DD） |
| 400 | `validation_error` | page/pageSize为负数 |
| 404 | `no_sources_found` | 指定日期无数据源 |
| 500 | `internal_error` | Supabase查询失败 |

---

### GET /api/v1/sources/:id

**用途**：获取单个数据源详情
**鉴权**：不需要

**成功响应** (200)：
```json
{
  "data": {
    "id": "uuid-string",
    "publishTime": "2024-01-15T06:30:00Z",
    "authorName": "string",
    "platform": "x",
    "title": "string",
    "abstract": "string",
    "coreInsights": "string",
    "rawUrl": "string",
    "contentType": "干货型",
    "importanceScore": 8,
    "keyEntities": ["OpenAI", "Sam Altman"],
    "hashtags": ["#AI", "#LLM"],
    "visualPotential": "高",
    "rawTranscript": "string (optional)"
  },
  "message": "success"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | id格式不正确（非UUID） |
| 404 | `source_not_found` | 数据源不存在 |
| 500 | `internal_error` | Supabase查询失败 |

---

## 文章模块

### GET /api/v1/articles

**用途**：获取文章列表（Bullet List展示）
**鉴权**：不需要

**查询参数**：
```
date: string (可选，格式：2024-01-15，默认今天)
language: string (可选，枚举：zh | en | zh-en | en-zh，默认zh)
page: number (可选，默认1)
pageSize: number (可选，默认20)
```

**成功响应** (200)：
```json
{
  "data": {
    "articles": [
      {
        "id": "uuid-string",
        "title": "string",
        "summary": "string",
        "publishTime": "2024-01-15T08:30:00Z",
        "language": "zh",
        "authorName": "string",
        "platform": "string",
        "rawUrl": "string"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  },
  "message": "success"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | date格式不正确 |
| 400 | `validation_error` | language不在枚举值范围内 |
| 400 | `validation_error` | page/pageSize为负数 |
| 404 | `no_articles_found` | 指定日期无文章 |
| 500 | `internal_error` | Supabase查询失败 |

---

### GET /api/v1/articles/:id

**用途**：获取文章详情（点击跳转查看完整文章）
**鉴权**：不需要

**成功响应** (200)：
```json
{
  "data": {
    "id": "uuid-string",
    "title": "string",
    "content": "string (Markdown格式完整文章)",
    "summary": "string",
    "publishTime": "2024-01-15T08:30:00Z",
    "language": "zh",
    "authorName": "string",
    "platform": "string",
    "rawUrl": "string",
    "clusters": [
      {
        "id": "uuid-string",
        "clusterTheme": "string",
        "coreInsight": "string"
      }
    ]
  },
  "message": "success"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | id格式不正确（非UUID） |
| 404 | `article_not_found` | 文章不存在 |
| 500 | `internal_error` | Supabase查询失败 |

---

## 语言切换模块

### POST /api/v1/language/switch

**用途**：切换输出语言（前端勾选多语言）
**鉴权**：不需要

**请求体** (`Content-Type: application/json`)：
```json
{
  "languages": ["zh", "en"]    // 必填，数组，元素枚举：zh | en | zh-en | en-zh
}
```

**成功响应** (200)：
```json
{
  "data": {
    "enabledLanguages": ["zh", "en"]
  },
  "message": "已启用2种语言输出"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | languages数组为空 |
| 400 | `validation_error` | languages包含无效枚举值 |
| 500 | `internal_error` | Supabase更新失败 |

---

## Draft模块

### POST /api/v1/draft/generate

**用途**：触发摘要生成（手动触发或Cron调用）
**鉴权**：Cron调用需要 `Authorization: Bearer {CRON_SECRET}`

**请求体** (`Content-Type: application/json`)：
```json
{
  "date": "string",            // 必填，格式：2024-01-15
  "forceRegenerate": false     // 选填，布尔，是否强制重新生成，默认false
}
```

**成功响应** (200)：
```json
{
  "data": {
    "draftId": "uuid-string",
    "status": "draft",
    "totalItems": 100,
    "newCount": 80,
    "duplicateCount": 20,
    "clustersCount": 5,
    "estimatedCompletionTime": "2024-01-15T06:00:00Z"
  },
  "message": "摘要生成任务已启动"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | date格式不正确 |
| 400 | `validation_error` | forceRegenerate非布尔值 |
| 401 | `unauthorized` | Cron调用未提供有效CRON_SECRET |
| 409 | `draft_already_exists` | 指定日期draft已存在且forceRegenerate=false |
| 500 | `internal_error` | 流水线执行失败 |
| 503 | `service_unavailable` | Embedding API调用失败 |
| 503 | `service_unavailable` | LLM API调用失败 |

---

### GET /api/v1/draft/:id

**用途**：获取draft详情（审核页面展示）
**鉴权**：不需要

**成功响应** (200)：
```json
{
  "data": {
    "id": "uuid-string",
    "date": "2024-01-15",
    "status": "draft",           // 枚举：draft | approved | rejected
    "language": "zh",
    "totalItems": 100,
    "newCount": 80,
    "duplicateCount": 20,
    "createdAt": "2024-01-15T05:30:00Z",
    "updatedAt": "2024-01-15T05:30:00Z",
    "approvedAt": null,
    "clusters": [
      {
        "id": "uuid-string",
        "clusterTheme": "string",
        "coreInsight": "string",
        "clusterImportance": 9,
        "viewpointConflict": "string",
        "suggestedAngle": "string",
        "items": [
          {
            "id": "uuid-string",
            "sourceName": "string",
            "sourceUrl": "string",
            "viewpointSummary": "string",
            "viewpointStance": "string"
          }
        ]
      }
    ]
  },
  "message": "success"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | id格式不正确（非UUID） |
| 404 | `draft_not_found` | draft不存在 |
| 500 | `internal_error` | Supabase查询失败 |

---

### POST /api/v1/draft/:id/approve

**用途**：审核通过draft，触发后续流水线
**鉴权**：不需要

**请求体** (`Content-Type: application/json`)：
```json
{
  "feedback": "string"          // 选填，审核反馈意见，可选
}
```

**成功响应** (200)：
```json
{
  "data": {
    "draftId": "uuid-string",
    "status": "approved",
    "approvedAt": "2024-01-15T08:30:00Z",
    "pipelineTriggered": true
  },
  "message": "draft已审核通过，后续流水线已触发"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | id格式不正确（非UUID） |
| 404 | `draft_not_found` | draft不存在 |
| 409 | `draft_already_approved` | draft状态已为approved |
| 409 | `draft_already_rejected` | draft状态已为rejected |
| 500 | `internal_error` | Supabase更新失败 |
| 500 | `internal_error` | 后续流水线触发失败 |

---

## Chatbot Tools模块

### POST /api/v1/tools

**用途**：Chatbot调用Tool执行操作（统一入口，一次性响应）
**鉴权**：不需要

**请求体** (`Content-Type: application/json`)：
```json
{
  "toolName": "string",         // 必填，Tool名称（见下方14个Tools列表）
  "params": { ... }             // 必填，Tool参数（根据Tool不同而不同）
}
```

**成功响应** (200)：
```json
{
  "data": {
    "result": { ... },          // Tool执行结果（根据Tool不同而不同）
    "thinking": "string (optional)",  // LLM思考过程【新增，可选】
    "message": "string"
  },
  "message": "success"
}
```

**错误响应**（通用）：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 400 | `validation_error` | toolName不在支持的Tool列表中 |
| 400 | `validation_error` | params缺少必填字段 |
| 400 | `validation_error` | params字段类型不正确 |
| 404 | `resource_not_found` | 操作的资源不存在（如cluster/item/draft） |
| 409 | `operation_conflict` | 操作冲突（如合并不相关的cluster） |
| 500 | `internal_error` | Tool执行失败 |

---

### POST /api/v1/tools/stream 【新增】

**用途**：Chatbot调用Tool执行操作（流式响应，支持实时输出和Thinking）
**鉴权**：不需要
**响应格式**：`text/event-stream`（SSE）

**请求体** (`Content-Type: application/json`)：
```json
{
  "toolName": "string",         // 必填，Tool名称（见下方14个Tools列表）
  "params": { ... }             // 必填，Tool参数（根据Tool不同而不同）
}
```

**SSE响应格式**：

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: thinking
data: {"type":"thinking","thinking":"正在分析cluster数据...","timestamp":"2024-01-15T08:30:00Z"}

event: content
data: {"type":"content","content":"Cluster 1的核心洞察是...","timestamp":"2024-01-15T08:30:01Z"}

event: content
data: {"type":"content","content":"关于OpenAI的最新动态...","timestamp":"2024-01-15T08:30:02Z"}

event: done
data: {"type":"done","message":"完成","totalTokens":150,"thinkingTokens":50}
```

**事件类型说明**：

| 事件类型 | 字段 | 说明 |
|---------|------|------|
| `thinking` | `type`, `thinking`, `timestamp` | LLM思考过程（Deepseek/Anthropic提供） |
| `content` | `type`, `content`, `timestamp` | 增量输出内容 |
| `done` | `type`, `message`, `totalTokens`, `thinkingTokens` | 完成事件，包含token统计 |

**前端调用示例**：

```typescript
// 前端 EventSource 调用
const eventSource = new EventSource('/api/v1/tools/stream', {
  headers: { 'Content-Type': 'application/json' }
})

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  switch (data.type) {
    case 'thinking':
      // 渲染思考过程（可折叠显示）
      appendThinking(data.thinking)
      break
    case 'content':
      // 渲染增量内容
      appendToChat(data.content)
      break
    case 'done':
      // 完成处理
      console.log(`总tokens: ${data.totalTokens}, thinking tokens: ${data.thinkingTokens}`)
      eventSource.close()
      break
  }
}

eventSource.onerror = (error) => {
  console.error('SSE连接错误:', error)
  eventSource.close()
}
```

**错误响应**（SSE错误事件）：

```
event: error
data: {"type":"error","error":"validation_error","message":"toolName不在支持的Tool列表中"}
```

| error字段 | 触发条件 |
|-----------|---------|
| `validation_error` | toolName不在支持的Tool列表中 |
| `validation_error` | params缺少必填字段 |
| `validation_error` | params字段类型不正确 |
| `resource_not_found` | 操作的资源不存在 |
| `operation_conflict` | 操作冲突 |
| `internal_error` | Tool执行失败 |

---

### 14个 Tools 定义

#### Tool 1: list_clusters

**用途**：列出draft的所有clusters概览
**优先级**：P0（高频核心）

**请求参数**：
```json
{
  "draftId": "string"           // 必填，draft UUID
}
```

**返回结果**：
```json
{
  "clusters": [
    {
      "id": "uuid-string",
      "clusterTheme": "string",
      "coreInsight": "string",
      "clusterImportance": 9,
      "itemsCount": 5
    }
  ],
  "totalClusters": 5
}
```

---

#### Tool 2: get_cluster_detail

**用途**：获取cluster详细信息（包括items列表）
**优先级**：P0（高频核心）

**请求参数**：
```json
{
  "clusterId": "string"         // 必填，cluster UUID
}
```

**返回结果**：
```json
{
  "cluster": {
    "id": "uuid-string",
    "clusterTheme": "string",
    "coreInsight": "string",
    "clusterImportance": 9,
    "viewpointConflict": "string",
    "suggestedAngle": "string",
    "items": [
      {
        "id": "uuid-string",
        "sourceName": "string",
        "sourceUrl": "string",
        "viewpointSummary": "string",
        "viewpointStance": "string"
      }
    ]
  }
}
```

---

#### Tool 3: edit_cluster_insight

**用途**：编辑cluster的核心洞察
**优先级**：P1（中频调整）

**请求参数**：
```json
{
  "clusterId": "string",        // 必填，cluster UUID
  "newInsight": "string"        // 必填，新的核心洞察内容
}
```

**返回结果**：
```json
{
  "clusterId": "uuid-string",
  "updatedInsight": "string",
  "message": "cluster核心洞察已更新"
}
```

---

#### Tool 4: delete_item

**用途**：删除cluster中的某个item
**优先级**：P1（中频调整）

**请求参数**：
```json
{
  "itemId": "string"            // 必填，item UUID
}
```

**返回结果**：
```json
{
  "deletedItemId": "uuid-string",
  "affectedClusterId": "uuid-string",
  "remainingItemsCount": 4,
  "message": "item已删除"
}
```

---

#### Tool 5: edit_item_summary

**用途**：编辑item的观点摘要
**优先级**：P1（中频调整）

**请求参数**：
```json
{
  "itemId": "string",           // 必填，item UUID
  "newSummary": "string"        // 必填，新的观点摘要
}
```

**返回结果**：
```json
{
  "itemId": "uuid-string",
  "updatedSummary": "string",
  "message": "item观点摘要已更新"
}
```

---

#### Tool 6: merge_clusters

**用途**：合并多个cluster
**优先级**：P1（中频调整）

**请求参数**：
```json
{
  "clusterIds": ["uuid-string", "uuid-string"],  // 必填，要合并的cluster ID数组（至少2个）
  "newTheme": "string"                           // 必填，合并后的新主题
}
```

**返回结果**：
```json
{
  "mergedClusterId": "uuid-string",
  "newTheme": "string",
  "mergedItemsCount": 10,
  "deletedClusterIds": ["uuid-string", "uuid-string"],
  "message": "clusters已合并"
}
```

---

#### Tool 7: approve_draft

**用途**：审核通过draft
**优先级**：P0（高频核心）

**请求参数**：
```json
{
  "draftId": "string"           // 必填，draft UUID
}
```

**返回结果**：
```json
{
  "draftId": "uuid-string",
  "status": "approved",
  "approvedAt": "2024-01-15T08:30:00Z",
  "pipelineTriggered": true,
  "message": "draft已审核通过"
}
```

---

#### Tool 8: add_item

**用途**：手动添加item到cluster
**优先级**：P2（低频操作）

**请求参数**：
```json
{
  "clusterId": "string",        // 必填，cluster UUID
  "itemData": {
    "sourceName": "string",     // 必填
    "sourceUrl": "string",      // 必填
    "viewpointSummary": "string", // 必填
    "viewpointStance": "string"  // 选填
  }
}
```

**返回结果**：
```json
{
  "addedItemId": "uuid-string",
  "clusterId": "uuid-string",
  "message": "item已添加"
}
```

---

#### Tool 9: regenerate_draft

**用途**：重新生成draft（整体重跑）
**优先级**：P2（低频操作）

**请求参数**：
```json
{
  "draftId": "string"           // 必填，draft UUID
}
```

**返回结果**：
```json
{
  "draftId": "uuid-string",
  "regenerationStarted": true,
  "estimatedCompletionTime": "2024-01-15T06:00:00Z",
  "message": "draft重新生成已启动"
}
```

---

#### Tool 10: reorder_items

**用途**：调整cluster中items的顺序
**优先级**：P2（低频操作）

**请求参数**：
```json
{
  "clusterId": "string",        // 必填，cluster UUID
  "itemOrder": ["uuid-string", "uuid-string", "uuid-string"]  // 必填，新的item ID顺序数组
}
```

**返回结果**：
```json
{
  "clusterId": "uuid-string",
  "newOrder": ["uuid-string", "uuid-string", "uuid-string"],
  "message": "items顺序已调整"
}
```

---

#### Tool 11: split_cluster

**用途**：拆分cluster为多个新cluster
**优先级**：P2（低频操作）

**请求参数**：
```json
{
  "clusterId": "string",        // 必填，要拆分的cluster UUID
  "splitGroups": [
    {
      "itemIds": ["uuid-string", "uuid-string"],  // 必填，属于新cluster1的items
      "newTheme": "string"                        // 必填，新cluster1主题
    },
    {
      "itemIds": ["uuid-string"],                 // 必填，属于新cluster2的items
      "newTheme": "string"                        // 必填，新cluster2主题
    }
  ]
}
```

**返回结果**：
```json
{
  "newClusterIds": ["uuid-string", "uuid-string"],
  "deletedClusterId": "uuid-string",
  "message": "cluster已拆分"
}
```

---

#### Tool 12: list_items

**用途**：列出cluster的所有items
**优先级**：P3（补充工具）

**请求参数**：
```json
{
  "clusterId": "string"         // 必填，cluster UUID
}
```

**返回结果**：
```json
{
  "items": [
    {
      "id": "uuid-string",
      "sourceName": "string",
      "sourceUrl": "string",
      "viewpointSummary": "string",
      "viewpointStance": "string"
    }
  ],
  "totalItems": 5
}
```

---

#### Tool 13: get_item_detail

**用途**：获取item详细信息
**优先级**：P3（补充工具）

**请求参数**：
```json
{
  "itemId": "string"            // 必填，item UUID
}
```

**返回结果**：
```json
{
  "item": {
    "id": "uuid-string",
    "sourceName": "string",
    "sourceUrl": "string",
    "viewpointSummary": "string",
    "viewpointStance": "string",
    "contentType": "干货型",
    "importanceScore": 8,
    "keyEntities": ["OpenAI", "Sam Altman"],
    "hashtags": ["#AI", "#LLM"],
    "visualPotential": "高",
    "rawTranscript": "string (optional)"
  }
}
```

---

#### Tool 14: delete_cluster

**用途**：删除整个cluster及其所有items
**优先级**：P3（补充工具）

**请求参数**：
```json
{
  "clusterId": "string"         // 必填，cluster UUID
}
```

**返回结果**：
```json
{
  "deletedClusterId": "uuid-string",
  "deletedItemsCount": 5,
  "affectedDraftId": "uuid-string",
  "message": "cluster已删除"
}
```

---

## Cron Jobs模块

### GET /api/v1/cron/fetch

**用途**：定时抓取任务（04:00触发）
**鉴权**：需要 `Authorization: Bearer {CRON_SECRET}`

**成功响应** (200)：
```json
{
  "data": {
    "draftId": "uuid-string",
    "status": "draft",
    "totalItems": 100,
    "newCount": 80,
    "duplicateCount": 20,
    "clustersCount": 5,
    "executionTimeMs": 3000000
  },
  "message": "定时抓取任务执行成功"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 401 | `unauthorized` | 未提供有效CRON_SECRET |
| 500 | `internal_error` | Feed抓取失败 |
| 503 | `service_unavailable` | Embedding API失败 |
| 503 | `service_unavailable` | LLM API失败 |
| 500 | `internal_error` | Supabase写入失败 |

---

### GET /api/v1/cron/cleanup

**用途**：Redis清理任务（03:00触发）
**鉴权**：需要 `Authorization: Bearer {CRON_SECRET}`

**成功响应** (200)：
```json
{
  "data": {
    "cleanedKeysCount": 1000,
    "cleanupDurationMs": 5000
  },
  "message": "Redis清理任务执行成功"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 401 | `unauthorized` | 未提供有效CRON_SECRET |
| 500 | `internal_error` | Redis清理失败 |

---

## 健康检查模块

### GET /api/health

**用途**：服务健康检查
**鉴权**：不需要

**成功响应** (200)：
```json
{
  "data": {
    "status": "healthy",
    "supabase": "connected",
    "redis": "connected",
    "timestamp": "2024-01-15T08:30:00Z"
  },
  "message": "success"
}
```

**错误响应**：

| HTTP状态码 | error字段 | 触发条件 |
|------------|-----------|---------|
| 503 | `service_unavailable` | Supabase连接失败 |
| 503 | `service_unavailable` | Redis连接失败 |

---

## 变更记录

### v1.2（2026-05-11）
**触发原因**：用户反馈，补充 LLM 配置验证接口和模型列表接口
**修改内容**：
1. **新增 `POST /api/v1/auth/config/validate` 接口**：
   - 验证 LLM 配置有效性（调用 Provider 的 models 接口）
   - 返回可用模型列表（过滤弃用模型）
   - 错误码：`api_key_invalid`、`base_url_invalid`、`service_unavailable`
2. **新增 `GET /api/v1/auth/models` 接口**：
   - 返回 Provider 的静态模型列表（含状态、推荐度、成本、描述）
   - 标注弃用模型和弃用日期
3. **更新 `POST /api/v1/auth/config` 接口**：
   - 响应新增 `validatedAt`、`availableModels` 字段
   - 错误码新增 `model_not_available`
   - 保存逻辑说明：验证后保存，model 检查可用性
4. **更新 `GET /api/v1/auth/config` 接口**：
   - 响应新增 `validatedAt`、`availableModels` 字段
5. **新增各 Provider 可用模型列表定义**：
   - Deepseek：`deepseek-v4-flash`（推荐）、`deepseek-v4-pro`；弃用：`deepseek-chat`、`deepseek-reasoner`
   - OpenAI：`gpt-4o-mini`（推荐）、`gpt-4o`、`o1-mini`、`o1-preview`
   - Anthropic：`claude-3-5-haiku`（推荐）、`claude-3-5-sonnet`、`claude-3-opus`
**影响范围**：backend-architect 需实现验证接口和模型列表接口，frontend-developer 需实现配置表单（验证 → 选择模型 → 保存）

### v1.1（2026-05-11）
**触发原因**：技术架构自审，补充流式输出和Thinking输出支持
**修改内容**：
1. 新增 `POST /api/v1/tools/stream` SSE流式接口定义
2. `POST /api/v1/tools` 响应新增 `thinking` 字段（可选）
3. SSE响应格式定义（thinking/content/done 三种事件类型）
4. SSE错误事件格式定义
5. 前端调用示例代码
**影响范围**：backend-architect 需实现 SSE 接口，frontend-developer 需实现 EventSource 调用

---

> **契约原则：字段穷举，类型明确，错误码完整，前后端严格遵守。**