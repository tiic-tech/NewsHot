# API 接口契约
> 版本: 1.0 | 基础路径: /api/v1
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

### POST /api/v1/auth/config

**用途**：保存LLM配置（provider、base_url、api_key、model）
**鉴权**：不需要

**请求体** (`Content-Type: application/json`)：
```json
{
  "provider": "string",        // 必填，枚举值：openai | anthropic | deepseek
  "baseUrl": "string",         // 必填，API基础URL，如：https://api.deepseek.com
  "apiKey": "string",          // 必填，API密钥
  "model": "string"            // 必填，模型名称，如：deepseek-chat
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
    "model": "deepseek-chat",
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
| 500 | `internal_error` | Supabase写入失败 |

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
    "model": "deepseek-chat",
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

**用途**：Chatbot调用Tool执行操作（统一入口）
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

> **契约原则：字段穷举，类型明确，错误码完整，前后端严格遵守。**