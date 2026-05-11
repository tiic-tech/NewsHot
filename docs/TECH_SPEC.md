# 技术规格说明
> 版本: 1.3 | 项目: NewsHot (Grabout Mind Record - AI新闻聚合平台)

---

## 技术栈选型

| 层级 | 技术选型 | 选型理由 |
|------|---------|---------|
| 语言 | TypeScript + Node.js | 与前端语言统一,Tool契约类型安全 |
| 前端框架 | **Next.js 15** (React) | **Turbopack稳定版、PPR优化、App Router成熟、Vercel原生兼容** |
| 后端 | Next.js Route Handlers + API Routes | 全Vercel部署一体化,无需单独后端服务 |
| 数据库 | Supabase PostgreSQL | 已有MCP,支持pgvector,JSON字段友好,**多应用共享隔离** |
| 向量存储 | Supabase pgvector | 一体化服务,MVP简单 |
| 缓存 | Upstash Redis | Vercel原生集成,边缘缓存,零运维 |
| Embedding | 阿里云百炼 text-embedding-v4 | 成本优化(¥0.0005/1K tokens),中文友好,1024维 |
| LLM | Deepseek（起点）+ OpenAI + Anthropic | 成本优化,多家支持降低风险,**支持流式输出和Thinking** |
| 定时任务 | Vercel Cron Jobs | 云原生,可靠性高,无需进程持久化 |
| 部署 | Vercel（全栈一体化）或 Docker（一键部署） | 零运维部署,自动CI/CD,Edge Network；Docker支持本地开发和私有部署 |
| CI/CD | Vercel自动部署 + GitHub Actions验证 | Git推送自动触发,Preview验证 |

---

## Next.js 版本选择说明

> **选择 Next.js 15 而非 14 或 16 的理由**

### 版本对比

| 版本 | 发布时间 | App Router 成熟度 | Turbopack | 关键特性 | 推荐度 |
|------|---------|-------------------|-----------|---------|--------|
| 14 | 2023.12 | 稳定（但部分API不稳定） | 实验性 | Server Actions、App Router | ⚠️ 可用,但非最新 |
| **15** | **2024.10** | **成熟稳定** | **稳定版** | **PPR优化、缓存改进** | ✅✅ **强烈推荐** |
| 16 | 未发布 | - | - | - | ❌ 不推荐（未发布） |

### 选择理由

1. **Turbopack 稳定版**：开发模式热更新速度提升 10x,显著改善开发体验
2. **PPR（Partial Prerendering）**：静态部分预渲染 + 动态部分流式加载,完美匹配新闻聚合场景
3. **App Router 成熟度**：经过一年迭代,API 稳定性更高,迁移风险更低
4. **缓存系统改进**：更灵活的缓存控制策略,适合频繁更新的新闻数据
5. **Vercel 完全兼容**：Vercel 对 Next.js 15 提供原生优化支持
6. **社区生态完善**：15 版本文档、教程、示例代码更加完善

---

## LLM Provider 配置方案

> **默认模型与动态配置设计**

### 默认配置

| Provider | 默认模型 | Base URL | 选型理由 |
|----------|---------|---------|---------|
| **Deepseek（默认）** | **deepseek-v4-flash** | `https://api.deepseek.com` | 成本最低,性能足够,支持 Thinking 输出 |
| OpenAI | gpt-4o-mini | `https://api.openai.com` | 稳定性高,生态完善,但成本较高 |
| Anthropic | claude-3-5-haiku | `https://api.anthropic.com` | Thinking 输出最完善,但成本最高 |

### 各 Provider 可用模型列表

#### Deepseek 模型列表

| 模型名称 | 状态 | 说明 | 成本 |
|---------|------|------|------|
| **deepseek-v4-flash** | **推荐** | 默认模型,性能足够,成本最低 | ¥0.001/1K tokens（输入） |
| deepseek-v4-pro | 推荐 | 高性能模型,复杂任务 | ¥0.002/1K tokens（输入） |
| deepseek-chat | ⚠️ 弃用（2026/07/24） | 已弃用,不建议使用 | - |
| deepseek-reasoner | ⚠️ 弃用（2026/07/24） | 已弃用,不建议使用 | - |

**Deepseek Base URL 变体**：
- OpenAI 兼容格式：`https://api.deepseek.com`（默认）
- Anthropic 兼容格式：`https://api.deepseek.com/anthropic`（可选）

#### OpenAI 模型列表

| 模型名称 | 状态 | 说明 | 成本 |
|---------|------|------|------|
| gpt-4o-mini | 推荐 | 性价比最高,适合日常任务 | $0.15/1M tokens（输入） |
| gpt-4o | 推荐 | 高性能模型,复杂任务 | $2.50/1M tokens（输入） |
| o1-mini | 推荐 | Thinking 模型,推理能力强 | $1.50/1M tokens（输入） |
| o1-preview | 可选 | Thinking 模型,深度推理 | $15/1M tokens（输入） |
| gpt-3.5-turbo | ⚠️ 弃用 | 已弃用,不建议使用 | - |

#### Anthropic 模型列表

| 模型名称 | 状态 | 说明 | 成本 |
|---------|------|------|------|
| claude-3-5-haiku | 推荐 | 性价比最高,速度快 | $0.25/1M tokens（输入） |
| claude-3-5-sonnet | 推荐 | 平衡性能与成本 | $3/1M tokens（输入） |
| claude-3-opus | 可选 | 最高性能,复杂任务 | $15/1M tokens（输入） |

### 前端配置流程设计

```
用户填写配置流程：

1. 前端表单输入
   - Provider 选择（下拉：deepseek/openai/anthropic）
   - Base URL 输入（预设值 + 可修改）
   - API Key 输入（密码框）

2. 点击"验证配置"按钮
   - 调用 POST /api/v1/auth/config/validate
   - 后端发起验证请求（调用 LLM API 的 models 接口）
   - 返回验证结果 + 可用模型列表

3. 验证成功后
   - 前端下拉框更新为该 Provider 的可用模型列表
   - 用户选择具体模型

4. 点击"保存配置"按钮
   - 调用 POST /api/v1/auth/config
   - 后端保存配置到 Supabase
   - 更新 LLMAdapter 实例

5. 配置生效
   - 后续 LLM 调用使用新配置
```

### 配置验证机制

```typescript
// lib/llm-validator.ts

interface ValidateConfigRequest {
  provider: 'openai' | 'anthropic' | 'deepseek'
  baseUrl: string
  apiKey: string
}

interface ValidateConfigResponse {
  valid: boolean
  provider: string
  availableModels: string[]
  message: string
}

export async function validateLLMConfig(
  config: ValidateConfigRequest
): Promise<ValidateConfigResponse> {
  try {
    // 调用 Provider 的 models 接口验证配置
    const modelsUrl = getModelsUrl(config.provider, config.baseUrl)
    
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: getAuthHeaders(config.provider, config.apiKey)
    })
    
    if (!response.ok) {
      return {
        valid: false,
        provider: config.provider,
        availableModels: [],
        message: `验证失败：HTTP ${response.status}`
      }
    }
    
    const data = await response.json()
    const availableModels = extractModels(data, config.provider)
    
    return {
      valid: true,
      provider: config.provider,
      availableModels,
      message: '验证成功,可用模型已更新'
    }
  } catch (error: any) {
    return {
      valid: false,
      provider: config.provider,
      availableModels: [],
      message: `验证失败：${error.message}`
    }
  }
}

function getModelsUrl(provider: string, baseUrl: string): string {
  switch (provider) {
    case 'deepseek':
    case 'openai':
      return `${baseUrl}/v1/models`
    case 'anthropic':
      return `${baseUrl}/v1/models`  // Anthropic 可能需要特殊处理
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

function getAuthHeaders(provider: string, apiKey: string): HeadersInit {
  switch (provider) {
    case 'deepseek':
    case 'openai':
      return { 'Authorization': `Bearer ${apiKey}` }
    case 'anthropic':
      return {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

function extractModels(data: any, provider: string): string[] {
  // OpenAI/Deepseek 格式：data.data[].id
  // Anthropic 格式可能不同
  if (provider === 'anthropic') {
    // Anthropic 可能没有 models 接口,返回预设列表
    return ['claude-3-5-haiku', 'claude-3-5-sonnet', 'claude-3-opus']
  }
  
  return data.data?.map((model: any) => model.id) || []
}
```

---

## Chatbot 流式输出与 Thinking 输出方案

> **补充设计：支持 SSE 流式输出和 LLM Thinking/Reasoning 输出**

### 流式输出设计

#### SSE 接口：POST /api/v1/tools/stream

```typescript
// 前端 EventSource 调用
const eventSource = new EventSource('/api/v1/tools/stream', {
  headers: { 'Content-Type': 'application/json' }
})

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'content') {
    // 渲染增量内容
    appendToChat(data.content)
  } else if (data.type === 'thinking') {
    // 渲染思考过程（可选显示）
    appendThinking(data.thinking)
  } else if (data.type === 'done') {
    eventSource.close()
  }
}
```

#### SSE 响应格式

```
Content-Type: text/event-stream

event: thinking
data: {"type":"thinking","thinking":"正在分析cluster数据..."}

event: content
data: {"type":"content","content":"Cluster 1的核心洞察是..."}

event: content
data: {"type":"content","content":"关于OpenAI的最新动态..."}

event: done
data: {"type":"done","message":"完成"}
```

### Thinking 输出设计

#### 各 Provider 支持情况

| Provider | Thinking 支持 | API 参数 | 输出格式 |
|----------|--------------|---------|---------|
| Deepseek | ✅ 支持 | `include_reasoning: true` | `reasoning_content` 字段 |
| OpenAI | ✅ 支持（o1系列） | `reasoning_effort: "low/medium/high"` | 内置推理,不暴露详情 |
| Anthropic | ✅ 支持 | `thinking: { budget_tokens: 1024 }` | `thinking` block |

#### LLMAdapter 扩展

```typescript
// lib/llm-adapter.ts（扩展）

interface LLMResponse {
  content: string
  thinking?: string          // Thinking/Reasoning 内容（可选）
  thinkingTokens?: number    // Thinking 消耗的 tokens（可选）
}

interface LLMAdapter {
  config: LLMConfig
  
  // 核心方法（扩展）
  chat(messages: ChatMessage[]): Promise<LLMResponse>
  
  // 流式方法（新增）
  chatStream(
    messages: ChatMessage[],
    onThinking: (thinking: string) => void,
    onContent: (content: string) => void
  ): Promise<void>
  
  updateConfig(newConfig: Partial<LLMConfig>): void
}

// Deepseek 实现（支持 reasoning）
class OpenAICompatibleAdapter {
  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        include_reasoning: true    // Deepseek 特有参数
      })
    })
    
    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      thinking: data.choices[0].message.reasoning_content,  // Thinking 输出
      thinkingTokens: data.usage?.reasoning_tokens
    }
  }
  
  async chatStream(messages, onThinking, onContent): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: true,
        include_reasoning: true
      })
    })
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
      
      for (const line of lines) {
        const data = JSON.parse(line.slice(5))
        if (data.choices?.[0]?.delta?.reasoning_content) {
          onThinking(data.choices[0].delta.reasoning_content)
        }
        if (data.choices?.[0]?.delta?.content) {
          onContent(data.choices[0].delta.content)
        }
      }
    }
  }
}

// Anthropic 实现（支持 extended thinking）
class AnthropicAdapter {
  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')
    
    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        system: systemMessage?.content,
        messages: userMessages,
        thinking: { budget_tokens: 1024 }    // Anthropic thinking 配置
      })
    })
    
    const data = await response.json()
    const thinkingBlock = data.content.find(block => block.type === 'thinking')
    const textBlock = data.content.find(block => block.type === 'text')
    
    return {
      content: textBlock?.text || '',
      thinking: thinkingBlock?.thinking || '',
      thinkingTokens: thinkingBlock?.tokens_used
    }
  }
}
```

---

## Supabase 数据隔离策略

> **多应用共享一个 Supabase Project 的数据隔离方案**

### 问题背景

- Supabase 免费账户限制 **2 个 Project**
- 需要与其他项目共享同一个 Project
- 需要保证数据隔离,防止跨应用数据泄露

### 隔离方案对比

| 方案 | 实现复杂度 | 隔离强度 | 性能影响 | Supabase 支持 | 推荐度 |
|------|-----------|---------|---------|--------------|--------|
| Schema 分离 | 高 | 最强 | 无 | ⚠️ Dashboard不支持多Schema UI | ❌ 不推荐 |
| 表前缀（newshot_xxx） | 中 | 中 | 无 | ✅ 支持 | ⚠️ 管理复杂,查询不便 |
| **project_id + RLS** | **低** | **强** | **微小** | ✅ **原生支持** | ✅✅ **强烈推荐** |
| 独立 Project | 低 | 最强 | 无 | ❌ 免费账户限制2个 | ❌ 不推荐 |

### 推荐方案：project_id + RLS 策略

#### 设计原则

1. **应用标识**：通过环境变量 `SUPABASE_APP_ID` 标识应用
2. **数据隔离**：所有表已有 `project_id` 字段,通过 RLS 策略按应用隔离
3. **性能优化**：`project_id` 索引已存在,查询性能影响极小
4. **安全保证**：RLS 策略强制执行,即使代码错误也不会泄露跨应用数据

#### 实现方案

```typescript
// lib/supabase.ts（扩展）

// 应用标识（从环境变量读取）
const APP_ID = process.env.SUPABASE_APP_ID || 'newshot'

// 创建 Supabase Client 时注入应用标识
export function createSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,    // 使用 Service Key 绑过 RLS（后端）
    {
      global: {
        headers: {
          'x-app-id': APP_ID    // 自定义 header 标识应用
        }
      }
    }
  )
}

// 前端 Client（使用 Anon Key,受 RLS 保护）
export function createSupabaseClientPublic() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'x-app-id': APP_ID
        }
      }
    }
  )
}
```

#### RLS 策略模板（按 project_id 隔离）

```sql
-- 为每个表设置 RLS 策略（按 project_id 隔离）
-- news_items 表示例
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- SELECT 策略：只允许访问自己应用的数据
CREATE POLICY "news_items_select_app" ON news_items 
FOR SELECT 
USING (
  project_id = current_setting('request.jwt.claims.project_id', true)::UUID
  OR 
  project_id = (SELECT id FROM projects WHERE name = current_setting('request.headers.x-app-id', true))
);

-- INSERT 策略：只能插入自己应用的数据
CREATE POLICY "news_items_insert_app" ON news_items 
FOR INSERT 
WITH CHECK (
  project_id = (SELECT id FROM projects WHERE name = current_setting('request.headers.x-app-id', true))
);

-- UPDATE 策略：只能更新自己应用的数据
CREATE POLICY "news_items_update_app" ON news_items 
FOR UPDATE 
USING (
  project_id = (SELECT id FROM projects WHERE name = current_setting('request.headers.x-app-id', true))
);

-- DELETE 策略：只能删除自己应用的数据
CREATE POLICY "news_items_delete_app" ON news_items 
FOR DELETE 
USING (
  project_id = (SELECT id FROM projects WHERE name = current_setting('request.headers.x-app-id', true))
);
```

#### 环境变量配置

```bash
# .env.local（本地开发）
SUPABASE_APP_ID=newshot    # 应用标识（用于 RLS 策略）

# Vercel Dashboard（生产环境）
SUPABASE_APP_ID=newshot    # 与其他项目区分
```

#### 初始化数据

```sql
-- 创建应用 Project 记录
INSERT INTO projects (id, name, domain, description, settings)
VALUES (
  gen_random_uuid(),
  'newshot',
  'AI',
  'NewsHot - AI新闻聚合平台',
  '{"output_languages": ["zh"]}'
);

-- 其他应用共享同一 Supabase Project 时,创建独立的 project 记录
INSERT INTO projects (id, name, domain, description, settings)
VALUES (
  gen_random_uuid(),
  'other-app',
  'Other',
  '其他应用',
  '{"output_languages": ["en"]}'
);
```

### 隔离效果

| 场景 | NewsHot 应用 | 其他应用 |
|------|-------------|---------|
| 查询 news_items | 只返回 `project_id = 'newshot'` 的数据 | 只返回 `project_id = 'other-app'` 的数据 |
| 插入 news_items | 自动绑定 `project_id = 'newshot'` | 自动绑定 `project_id = 'other-app'` |
| 跨应用查询 | ❌ RLS 阻止 | ❌ RLS 阻止 |
| 数据泄露风险 | ✅ RLS 强制保护 | ✅ RLS 强制保护 |

---

## Docker 一键部署方案

> **为 public repo 提供快速部署能力,方便开发者快速部署**

### 部署架构对比

| 部署方式 | 适用场景 | 优点 | 缺点 |
|---------|---------|------|------|
| **Vercel（推荐）** | 生产部署、零运维 | 自动CI/CD、Edge Network、免费额度 | 依赖云服务 |
| **Docker** | 本地开发、私有部署 | 完全控制、离线运行、一键部署 | 需运维、成本较高 |
| **混合方案** | 生产 + 本地测试 | 灵活性最高 | 配置复杂 |

### Docker 部署架构

```
Docker Compose 架构：

┌─────────────────────────────────────────┐
│  Docker Network: newshot-network        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  newshot-app (Next.js)          │   │
│  │  Port: 3000                     │   │
│  │  Mode: standalone               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  外部服务（云服务,推荐）               │
│  ├─ Supabase Cloud                     │
│  ├─ Upstash Redis Cloud                │
│  └─ Deepseek/OpenAI/Anthropic API      │
│                                         │
│  可选：本地服务（不推荐）               │
│  ├─ supabase-local (容器)              │
│  ├─ redis-local (容器)                 │
│                                         │
└─────────────────────────────────────────┘
```

### 推荐方案：云服务 + Docker（零运维）

> **强烈推荐使用云服务 Supabase/Redis,Docker 仅运行 Next.js 应用**

**优点**：
- 零运维：无需管理数据库/缓存容器
- 数据持久化：云服务保证数据安全
- 成本优化：使用免费额度
- 快速部署：只需一个 Dockerfile

### Dockerfile（Next.js standalone）

```dockerfile
# Dockerfile

# Stage 1: 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码
COPY . .

# 构建应用（standalone 模式）
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: 运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 暴露端口
EXPOSE 3000

# 设置端口
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
```

### docker-compose.yml（云服务方案）

```yaml
# docker-compose.yml

version: '3.8'

services:
  newshot-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: newshot-app
    ports:
      - "3000:3000"
    env_file:
      - .env.docker
    restart: unless-stopped
    networks:
      - newshot-network

networks:
  newshot-network:
    driver: bridge
```

### docker-compose.yml（本地服务方案 - 不推荐）

```yaml
# docker-compose.local.yml（不推荐,仅供特殊场景）

version: '3.8'

services:
  newshot-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: newshot-app
    ports:
      - "3000:3000"
    env_file:
      - .env.docker.local
    depends_on:
      - supabase-db
      - redis
    restart: unless-stopped
    networks:
      - newshot-network

  supabase-db:
    image: supabase/postgres:15.1.0.147
    container_name: newshot-supabase
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: your-super-secret-password
      POSTGRES_DB: postgres
    volumes:
      - supabase-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - newshot-network

  redis:
    image: upstash/redis:latest
    container_name: newshot-redis
    ports:
      - "6379:6379"
    environment:
      REDIS_PASSWORD: your-redis-password
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - newshot-network

volumes:
  supabase-data:
  redis-data:

networks:
  newshot-network:
    driver: bridge
```

### .env.docker.example（云服务配置）

```bash
# .env.docker.example

# =====================
# Supabase 配置（云服务）
# =====================
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_APP_ID=newshot

# =====================
# Upstash Redis 配置（云服务）
# =====================
UPSTASH_REST_URL=https://xxx.upstash.io
UPSTASH_REST_TOKEN=xxx

# =====================
# 阿里云百炼 Embedding API
# =====================
BAILIAN_API_KEY=sk-xxx
BAILIAN_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding-v4

# =====================
# LLM API Keys
# =====================
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-xxx

# =====================
# LLM 配置（默认使用 Deepseek）
# =====================
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_BASE_URL=https://api.deepseek.com

# =====================
# Vercel Cron Jobs 安全
# =====================
CRON_SECRET=xxx

# =====================
# follow-builders Feed URL
# =====================
FEED_X_URL=https://xxx/feed-x.json
FEED_PODCASTS_URL=https://xxx/feed-podcasts.json
FEED_BLOGS_URL=https://xxx/feed-blogs.json

# =====================
# 前端配置
# =====================
NEXT_PUBLIC_APP_PATH=
```

### next.config.js 配置（standalone 模式）

```javascript
// next.config.js

const appPath = process.env.NEXT_PUBLIC_APP_PATH

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Docker 部署必需
  basePath: appPath ? `/${appPath}` : '',
  // 其他配置...
}

module.exports = nextConfig
```

### Docker 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/newshot.git
cd newshot

# 2. 创建环境变量文件
cp .env.docker.example .env.docker

# 3. 编辑环境变量（填写真实的 API Keys）
nano .env.docker

# 4. 构建并启动
docker-compose up -d --build

# 5. 查看日志
docker-compose logs -f newshot-app

# 6. 访问应用
open http://localhost:3000

# 7. 停止应用
docker-compose down

# 8. 停止并清理数据（可选）
docker-compose down -v
```

### Docker 部署文档（README.md 补充）

```markdown
## Docker 一键部署

### 快速部署（推荐云服务）

1. **准备云服务账号**：
   - Supabase（免费）：https://supabase.com
   - Upstash Redis（免费）：https://upstash.com
   - Deepseek API（按量付费）：https://platform.deepseek.com

2. **克隆项目**：
   ```bash
   git clone https://github.com/your-repo/newshot.git
   cd newshot
   ```

3. **配置环境变量**：
   ```bash
   cp .env.docker.example .env.docker
   # 编辑 .env.docker,填写真实的 API Keys
   ```

4. **一键启动**：
   ```bash
   docker-compose up -d --build
   ```

5. **访问应用**：
   - http://localhost:3000

### 本地服务部署（不推荐）

如果需要完全离线部署,可以使用本地服务：
```bash
docker-compose -f docker-compose.local.yml up -d --build
```

**注意**：本地服务需要手动配置 Supabase 和 Redis,运维成本较高。

### 常见问题

**Q: 为什么推荐云服务而非本地容器？**
A: 云服务零运维、数据持久化、免费额度充足。本地容器需要手动管理数据库、备份、升级等。

**Q: Docker 部署与 Vercel 部署的区别？**
A: Vercel 部署零运维、自动CI/CD、Edge Network；Docker 部署完全控制、离线运行、私有部署。
```

---

## 项目目录结构

### 全栈结构（Next.js App Router + src 目录）

```
project-root/
├── src/                           # 源码目录（所有业务代码）
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # 首页 (/)
│   │   ├── layout.tsx             # 根布局
│   │   ├── sources/               # 数据源页面
│   │   │   └── page.tsx           # 数据源列表 (/sources)
│   │   ├── articles/              # 文章页面
│   │   │   ├── page.tsx           # 文章列表 (/articles)
│   │   │   └── [id]/page.tsx      # 文章详情 (/articles/:id)
│   │   ├── review/                # 审核页面
│   │   │   └── [id]/page.tsx      # draft审核 (/review/:id)
│   │   ├── digest/                # 摘要页面
│   │   │   └── [date]/page.tsx    # 按日期查看 (/digest/:date)
│   │   └── api/                   # API Route Handlers
│   │       ├── v1/                # API v1版本
│   │       │   ├── auth/          # LLM配置相关
│   │       │   │   ├── config/route.ts           # GET/POST 配置
│   │       │   │   └── config/validate/route.ts  # POST 验证配置【新增】
│   │       │   │   └── models/route.ts           # GET 模型列表【新增】
│   │       │   ├── sources/       # 数据源相关
│   │       │   │   ├── route.ts   # GET /api/v1/sources
│   │       │   │   └── [id]/route.ts # GET /api/v1/sources/:id
│   │       │   ├── articles/      # 文章相关
│   │       │   │   ├── route.ts   # GET /api/v1/articles
│   │       │   │   └── [id]/route.ts # GET /api/v1/articles/:id
│   │       │   ├── language/      # 语言切换
│   │       │   │   └── switch/route.ts
│   │       │   ├── draft/         # draft相关
│   │       │   │   ├── route.ts   # POST /api/v1/draft/generate
│   │       │   │   ├── [id]/route.ts # GET /api/v1/draft/:id
│   │       │   │   └── [id]/approve/route.ts
│   │       │   └── tools/         # Chatbot Tools
│   │       │   │   ├── route.ts   # Tools统一入口（一次性响应）
│   │       │   │   └── stream/route.ts # Tools流式入口（SSE）【新增】
│   │       │   └── cron/          # Cron Jobs
│   │       │       ├── fetch/route.ts    # 定时抓取
│   │       │       └── cleanup/route.ts  # Redis清理
│   │       └── health/route.ts    # 健康检查
│   ├── lib/                       # 共享逻辑
│   │   ├── supabase.ts            # Supabase Client（支持多应用隔离）
│   │   ├── redis.ts               # Upstash Redis Client
│   │   ├── embedding.ts           # 阿里云百炼 Embedding Service
│   │   ├── llm-adapter.ts         # LLM适配器（支持流式+Thinking）
│   │   ├── llm-validator.ts       # LLM配置验证器【新增】
│   │   ├── fetcher.ts             # Feed抓取服务
│   │   ├── processor.ts           # Processor服务（cluster聚合+摘要生成）
│   │   ├── types/                 # TypeScript类型定义
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── db.ts
│   │   │   └── tools.ts
│   │   └── utils/                 # 工具函数
│   │       ├── dedupe.ts          # 去重hash计算
│   │       ├── retry.ts           # 重试策略
│   │       └── format.ts          # 格式化工具
│   ├── components/                # UI组件
│   │   ├── ui/                    # 基础UI组件
│   │   │   ├── bullet-list.tsx    # Bullet List组件（复用于sources/articles）
│   │   │   ├── markdown-renderer.tsx # Markdown渲染组件
│   │   │   ├── cluster-card.tsx   # Cluster卡片组件
│   │   │   ├── chatbot-input.tsx  # Chatbot输入框组件
│   │   │   ├── thinking-display.tsx  # Thinking显示组件【新增】
│   │   │   ├── llm-config-form.tsx   # LLM配置表单组件【新增】
│   │   │   ├── model-selector.tsx    # 模型选择下拉组件【新增】
│   │   │   └── skeleton.tsx       # Skeleton加载组件
│   │   └── layout/                # 布局组件
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       └── sidebar.tsx
│   ├── hooks/                     # 自定义Hook
│   │   ├── use-draft.ts           # draft状态管理
│   │   ├── use-tools.ts           # Tools调用
│   │   ├── use-tools-stream.ts    # Tools流式调用【新增】
│   │   ├── use-config.ts          # LLM配置管理
│   │   └── use-llm-validation.ts  # LLM配置验证Hook【新增】
│   ├── styles/                    # 样式文件
│   │   └── globals.css            # 全局样式（Tailwind）
│   └── public/                    # 静态资源
│       ├── favicon.ico
│       └── images/
├── docs/                          # 文档目录（规划文档）
│   ├── PRD.md                     # 产品需求文档
│   ├── TECH_SPEC.md               # 技术规格说明
│   ├── API_CONTRACT.md            # API接口契约
│   ├── DB_SCHEMA.md               # 数据库Schema
│   └── DYNAMIC_CONTENT_MAP.md     # 动态内容映射表
├── supabase/                      # Supabase配置（migrations等）
│   └── migrations/
├── scripts/                       # 工具脚本
│   └── setup.sh                   # 初始化脚本
├── .claude/                       # Claude Agent配置
│   └── agents/                    # Agent定义文件
├── .omc/                          # OneAPI配置（可选）
├── package.json                   # 项目依赖
├── tsconfig.json                  # TypeScript配置
├── next.config.js                 # Next.js配置
├── next-env.d.ts                  # Next.js类型声明
├── tailwind.config.js             # Tailwind配置
├── postcss.config.js              # PostCSS配置
├── package-lock.json              # 依赖锁定文件
├── CLAUDE.md                      # Claude约束文档
├── README.md                      # 项目说明
├── .gitignore                     # Git忽略文件
├── vercel.json                    # Vercel配置（Cron定义）
├── Dockerfile                     # Docker部署文件【新增】
├── docker-compose.yml             # Docker Compose配置【新增】
├── docker-compose.local.yml       # 本地服务Docker配置【新增】
├── .env.local                     # 本地环境变量（用户填写）
├── .env.docker.example            # Docker环境变量模板【新增】
└── .env.example                   # 环境变量模板
```

### 目录结构说明

1. **src/ 目录**：所有业务代码（app、lib、components、hooks、styles）统一放在 src/ 下
2. **docs/ 目录**：规划文档（PRD、技术规格、API契约等）
3. **根目录配置文件**：package.json、tsconfig.json、next.config.js 等保持在根目录

### 配置文件更新要点

#### tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### tailwind.config.js

```javascript
content: [
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
]
```

#### Next.js 自动识别

Next.js 15 自动识别 `src/app` 目录结构,无需修改 next.config.js。

---

## 全局规范

| 规范项 | 规则 |
|--------|------|
| JSON字段命名 | camelCase（如 `userId`、`createdAt`） |
| 数据库字段命名 | snake_case（如 `user_id`、`created_at`） |
| 时间格式 | ISO 8601（`2024-01-15T08:30:00Z`）,存UTC时间 |
| API路径前缀 | `/api/v1/`（所有接口统一前缀） |
| 分页参数 | `page`（从1开始）、`pageSize`（默认20） |
| 统一响应格式（成功） | `{ "data": {...}, "message": "success" }` |
| 统一响应格式（失败） | `{ "error": "error_code", "message": "人类可读描述" }` |
| 向量维度 | 1024维（阿里云百炼text-embedding-v4默认） |
| 去重hash算法 | SHA256(title+url),48小时TTL |
| 重试策略 | 最多3次,指数退避（5min/15min/30min） |
| **流式响应格式** | **SSE（text/event-stream）,事件类型：thinking/content/done** |
| **Thinking显示** | **可选字段,前端可折叠显示推理过程** |
| **默认LLM模型** | **deepseek-v4-flash（Deepseek最新推荐模型）** |
| **Docker输出模式** | **standalone（Next.js独立部署）** |

---

## 环境变量配置

### 本地开发环境（.env.local）

```bash
# =====================
# Supabase 配置
# =====================
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_APP_ID=newshot             # 应用标识（多应用隔离）【新增】

# =====================
# Upstash Redis 配置（Vercel原生集成）
# =====================
UPSTASH_REST_URL=https://xxx.upstash.io
UPSTASH_REST_TOKEN=xxx

# =====================
# 阿里云百炼 Embedding API
# =====================
BAILIAN_API_KEY=sk-xxx
BAILIAN_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding-v4

# =====================
# LLM API Keys（支持多家）
# =====================
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-xxx

# =====================
# LLM配置（前端可动态修改）
# =====================
LLM_PROVIDER=deepseek           # 默认provider: deepseek | openai | anthropic
LLM_MODEL=deepseek-v4-flash     # 默认模型（更新为 v4-flash）【修改】
LLM_BASE_URL=https://api.deepseek.com  # 默认base_url

# =====================
# Vercel Cron Jobs 安全
# =====================
CRON_SECRET=xxx                 # 验证Cron请求来源

# =====================
# follow-builders Feed URL
# =====================
FEED_X_URL=https://xxx/feed-x.json
FEED_PODCASTS_URL=https://xxx/feed-podcasts.json
FEED_BLOGS_URL=https://xxx/feed-blogs.json

# =====================
# 前端配置（子路径部署）
# =====================
NEXT_PUBLIC_APP_PATH=newshot    # 应用子路径（生产部署时填写,本地为空）
```

### 生产环境（Vercel Dashboard配置）

在 Vercel Dashboard -> Settings -> Environment Variables 中配置上述所有变量。

---

## 部署路径规范（子路径部署）

> 本项目采用**子路径部署**模式,通过 Vercel 配置实现。

### 配置对照表

| 配置项 | 本地开发值 | 生产值 | 说明 |
|--------|-----------|--------|------|
| `NEXT_PUBLIC_APP_PATH` | `''`（空字符串） | `newshot` | 应用子路径名称 |

### 前端API调用规范

```typescript
// lib/utils/api-base.ts

export function getApiBase(): string {
  const appPath = process.env.NEXT_PUBLIC_APP_PATH
  return appPath ? `/${appPath}` : ''
}

// API调用示例
const apiBase = getApiBase()
fetch(`${apiBase}/api/v1/draft/${id}`)

// 禁止硬编码绝对路径（子路径部署时必定404）
fetch('/api/v1/draft/123')  // 错误示例
```

### next.config.js 配置

```javascript
// next.config.js

const appPath = process.env.NEXT_PUBLIC_APP_PATH

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Docker 部署必需【新增】
  basePath: appPath ? `/${appPath}` : '',
  // 其他配置...
}

module.exports = nextConfig
```

### 路由跳转规范（子路径部署下防前缀丢失）

| 场景 | 正确写法 | 禁止写法 |
|------|---------|---------|
| Next.js `useRouter` 跳转 | `router.push('/sources')` | `router.push('/newshot/sources')` 手动拼前缀 |
| Next.js Link组件 | `<Link href="/sources">` | `<Link href="/newshot/sources">` |
| `pathname` 判断 | `pathname === '/sources'`（不含basePath） | `pathname === '/newshot/sources'` |

> Next.js Router 自动处理 basePath,路由跳转时不需要手动拼接前缀。

---

## LLMAdapter 设计

> 支持前端动态配置 LLM Provider（OpenAI | Anthropic | Deepseek）,支持流式输出和Thinking

### 架构设计

```typescript
// lib/llm-adapter.ts

type LLMProvider = 'openai' | 'anthropic' | 'deepseek'

interface LLMConfig {
  provider: LLMProvider
  baseUrl: string
  apiKey: string
  model: string
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LLMResponse {
  content: string
  thinking?: string          // Thinking/Reasoning 内容【新增】
  thinkingTokens?: number    // Thinking 消耗的 tokens【新增】
}

interface LLMAdapter {
  config: LLMConfig
  
  // 核心方法
  chat(messages: ChatMessage[]): Promise<LLMResponse>
  
  // 流式方法【新增】
  chatStream(
    messages: ChatMessage[],
    onThinking: (thinking: string) => void,
    onContent: (content: string) => void
  ): Promise<void>
  
  // 配置管理
  updateConfig(newConfig: Partial<LLMConfig>): void
}

// Provider实现
class OpenAICompatibleAdapter implements LLMAdapter {
  config: LLMConfig
  
  constructor(config: LLMConfig) {
    this.config = config
  }
  
  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        include_reasoning: true    // Deepseek 特有参数【新增】
      })
    })
    
    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      thinking: data.choices[0].message.reasoning_content,  // Thinking 输出【新增】
      thinkingTokens: data.usage?.reasoning_tokens
    }
  }
  
  async chatStream(messages, onThinking, onContent): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: true,
        include_reasoning: true
      })
    })
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
      
      for (const line of lines) {
        const data = JSON.parse(line.slice(5))
        if (data.choices?.[0]?.delta?.reasoning_content) {
          onThinking(data.choices[0].delta.reasoning_content)
        }
        if (data.choices?.[0]?.delta?.content) {
          onContent(data.choices[0].delta.content)
        }
      }
    }
  }
  
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

class AnthropicAdapter implements LLMAdapter {
  config: LLMConfig
  
  constructor(config: LLMConfig) {
    this.config = config
  }
  
  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    // Anthropic API格式转换
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')
    
    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        system: systemMessage?.content,
        messages: userMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        thinking: { budget_tokens: 1024 }    // Anthropic thinking 配置【新增】
      })
    })
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }
    
    const data = await response.json()
    const thinkingBlock = data.content.find(block => block.type === 'thinking')
    const textBlock = data.content.find(block => block.type === 'text')
    
    return {
      content: textBlock?.text || '',
      thinking: thinkingBlock?.thinking || '',
      thinkingTokens: thinkingBlock?.tokens_used
    }
  }
  
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// 工厂函数
export function createLLMAdapter(config: LLMConfig): LLMAdapter {
  switch (config.provider) {
    case 'openai':
      return new OpenAICompatibleAdapter(config)
    case 'anthropic':
      return new AnthropicAdapter(config)
    case 'deepseek':
      // Deepseek兼容OpenAI接口
      return new OpenAICompatibleAdapter(config)
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`)
  }
}

// 默认配置（从环境变量读取）
export function getDefaultLLMConfig(): LLMConfig {
  return {
    provider: (process.env.LLM_PROVIDER as LLMProvider) || 'deepseek',
    baseUrl: process.env.LLM_BASE_URL || 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model: process.env.LLM_MODEL || 'deepseek-v4-flash'  // 更新为 v4-flash【修改】
  }
}
```

### 配置存储

- **存储位置**：Supabase `llm_config` 表（单行记录,project_id关联）
- **前端配置UI**：设置页面提供表单（provider下拉、base_url输入、api_key输入、model选择）
- **配置验证**：点击"验证配置"按钮后调用 `POST /api/v1/auth/config/validate`
- **配置生效**：验证成功后选择模型,点击"保存配置"按钮调用 `POST /api/v1/auth/config`

---

## 异步管道分析

> 虽然无并发压力,但管道各阶段存在异步需求,需仔细设计。

### 定时任务管道（04:00触发）

```
定时抓取流水线（总耗时约50分钟,全部异步）

Stage 1: Feed抓取（异步,网络IO）
- fetch(FEED_X_URL) -> Promise<NewsItem[]>
- fetch(FEED_PODCASTS_URL) -> Promise<NewsItem[]>
- fetch(FEED_BLOGS_URL) -> Promise<NewsItem[]>
- Promise.all() 并行执行,合并结果
- 耗时：5-10分钟

Stage 2: Upstash去重（异步,网络IO）
- computeDedupeHash(item) -> string
- redis.get(`news:dedupe:${hash}`) -> Promise<null|string>
- Promise.all() 并行检查所有items
- 过滤重复,保留新item
- 耗时：1-2分钟

Stage 3: 阿里云百炼Embedding生成（异步,API调用）
- chunk(items, 25) -> batches（批次分割）
- for batch: fetch(BAILIAN_ENDPOINT) -> Promise<Embedding[]>
- 批次间串行（避免API限流）,批次内并行处理
- 合并所有embedding结果
- 耗时：10-15分钟（API调用,网络IO主导）

Stage 4: Cluster聚合（同步计算,无IO）
- cosine_similarity(embedding_a, embedding_b)
- threshold clustering（相似度 > 0.7）
- 纯计算,无异步IO
- 耗时：5-10分钟（CPU计算）

Stage 5: 摘要生成（异步,LLM调用）
- for cluster: llmAdapter.chat(prompt) -> Promise<LLMResponse>
- Promise.all() 并行调用LLM生成core_insight
- 可获取thinking字段（可选记录推理过程）【新增】
- 合并结果生成draft
- 耗时：10-20分钟（LLM API调用）

Stage 6: Supabase存储（异步,数据库IO）
- supabase.from('news_items').insert(items)
- supabase.from('clusters').insert(clusters)
- supabase.from('drafts').insert(draft)
- Promise.all() 并行写入,事务保证一致性
- 耗时：1-2分钟

总耗时预估：32-59分钟（预留缓冲时间至06:00）
```

### 异步需求总结

| 阶段 | 异步类型 | 并行需求 | 实现方式 |
|------|---------|---------|---------|
| Feed抓取 | 网络IO（HTTP请求） | 高（3个feed并行） | Promise.all() |
| Upstash去重 | 网络IO（Redis查询） | 高（批量并行） | Promise.all() + pipeline |
| Embedding生成 | 网络+API限流（批次调用） | 中（批次内并行,批次间串行） | for-await-of + batch控制 |
| Cluster聚合 | CPU计算 | 无（纯同步） | 同步计算,无Promise |
| 摘要生成 | 网络+API限流（LLM调用） | 中（cluster级并行） | Promise.all() + rate_limit |
| Supabase存储 | 网络+数据库IO | 中（表级并行,行级batch） | Promise.all() + transaction |

### 关键异步模式

```typescript
// lib/processor.ts

// 1. 并行抓取
const feeds = await Promise.all([
  fetchFeed('x'),
  fetchFeed('podcasts'),
  fetchFeed('blogs')
])

// 2. 批量去重（Redis pipeline）
const dedupeHashes = items.map(computeDedupeHash)
const existingKeys = await redis.mget(...dedupeHashes.map(h => `news:dedupe:${h}`))

// 3. 批次Embedding（串行批次,避免限流）
const batches = chunk(items, 25)
const embeddings = []
for (const batch of batches) {
  const batchEmbeddings = await generateEmbeddings(batch)
  embeddings.push(...batchEmbeddings)
}

// 4. 并行LLM调用（限制并发数）
const limit = pLimit(5)  // 最多5个并行LLM调用
const insights = await Promise.all(
  clusters.map(cluster => limit(() => generateInsight(cluster)))
)

// 5. 事务写入
await supabase.rpc('insert_draft_with_dependencies', {
  news_items: items,
  clusters: clusters,
  draft: draftData
})
```

---

## 语言切换 API 设计

> 后端提供语言切换API,前端勾选不同语言,输出多份成果。

### 设计方案

```typescript
// lib/types/api.ts

type OutputLanguage = 'zh' | 'en' | 'zh-en' | 'en-zh'

interface LanguageSwitchRequest {
  languages: OutputLanguage[]  // 用户勾选的语言列表
}

interface LanguageSwitchResponse {
  enabledLanguages: OutputLanguage[]
  message: string
}
```

### Draft生成时应用

```typescript
// lib/processor.ts

async function generateDrafts(
  clusters: Cluster[], 
  languages: OutputLanguage[]
): Promise<Draft[]> {
  // 根据语言配置生成多份draft
  const drafts = await Promise.all(
    languages.map(lang => 
      generateDraftForLanguage(clusters, lang)
    )
  )
  
  // 存储多份draft（按language字段区分）
  await supabase.from('drafts').insert(
    drafts.map(draft => ({
      ...draft,
      language: draft.language
    }))
  )
  
  return drafts
}

function buildPromptForLanguage(clusters: Cluster[], lang: OutputLanguage): string {
  const langInstructions = {
    'zh': '请用中文撰写摘要...',
    'en': 'Please write the summary in English...',
    'zh-en': '请撰写中英文双语摘要...',
    'en-zh': '请撰写英中文双语摘要...'
  }
  
  return `${langInstructions[lang]}

Cluster数据：
${JSON.stringify(clusters, null, 2)}
`
}
```

---

## Vercel Cron Jobs 配置

### vercel.json 配置

```json
{
  "crons": [
    {
      "path": "/api/v1/cron/cleanup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/v1/cron/fetch",
      "schedule": "0 4 * * *"
    }
  ],
  "functions": {
    "app/api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "regions": ["hkg1", "sfo1"]
}
```

### Cron Jobs 说明

| 时间 | 端点 | 功能 | 耗时预估 |
|------|------|------|---------|
| 03:00 | `/api/v1/cron/cleanup` | 清理Upstash过期数据（24小时+） | 1-2分钟 |
| 04:00 | `/api/v1/cron/fetch` | 触发抓取流水线 | 50分钟 |

---

## 阿里云百炼 Embedding API 配置

### API规格

| 参数 | 值 | 说明 |
|------|-----|------|
| Endpoint | `https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding-v4` | API地址 |
| Model | `text-embedding-v4` | 模型名称 |
| Dimension | `1024` | 向量维度（默认） |
| Batch Size | `25` | 单次请求最大文本数 |
| 价格 | ¥0.0005/1K tokens | 月成本¥0.45（100条/日） |
| 超时 | `10s` | 单次请求超时 |

### 成本测算

```
假设参数：
- 每日新闻条数：100条
- 每条平均token数：300 tokens（title + summary）
- 每日总token数：30,000 tokens
- 每日成本：30K × ¥0.0005/1K = ¥0.015
- 每月成本：¥0.015 × 30 = ¥0.45
- 年成本：¥0.45 × 12 = ¥5.4

结论：MVP阶段成本极低（< ¥1/月）,完全可接受
```

---

## 重试策略与边缘Case防护

### 重试策略

```typescript
// lib/utils/retry.ts

interface RetryConfig {
  maxRetries: number           // 最大重试次数：3
  intervals: number[]          // 重试间隔：[5min, 15min, 30min]
  retryableErrors: string[]    // 可重试错误类型
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  intervals: [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000],
  retryableErrors: [
    'network_timeout',
    'rate_limit',
    'temporary_unavailable',
    'ssl_error'
  ]
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      if (!config.retryableErrors.includes(error.type)) {
        throw error  // 不可重试错误直接抛出
      }
      if (attempt === config.maxRetries) {
        throw error  // 达到最大重试次数
      }
      await sleep(config.intervals[attempt])
    }
  }
  throw new Error('Unexpected retry loop exit')
}
```

### 边缘Case防护规则

| Edge Case | Detection | Action | Threshold |
|-----------|-----------|--------|-----------|
| 内容空值 | `content.length < 50` | skip | 50字符 |
| 语言异常 | `!/(en|zh)/` | skip_with_log | - |
| 编码异常 | `raw Buffer检测` | retry_with_utf8 | utf-8/gbk |
| 时间戳异常 | `invalid date` | use_current_time | - |
| URL失效 | `404/410/451` | mark_source_issue | - |
| 反爬检测 | `captcha/cloudflare` | mark_blocked | - |
| 重复内容 | `hash match` | skip | exact match |
| 内容截断 | `no结尾标点` | flag_for_review | <50%长度 |
| Embedding超时 | `>10s` | retry_smaller_batch | 10秒 |
| Embedding失败 | `api_error` | exponential_backoff | 最多3次 |

---

## 成本控制

| 服务 | 月成本预估 | 说明 |
|------|-----------|------|
| 阿里云百炼Embedding | ¥0.45 | 100条/日 × 300tokens × ¥0.0005/1K |
| Vercel免费额度 | $0 | 覆盖MVP（带宽/执行时间） |
| Vercel Cron Jobs | $0.50 | 2个任务（需付费） |
| Supabase免费额度 | $0 | 覆盖MVP（500MB数据库,多应用共享） |
| Upstash Redis免费额度 | $0 | 覆盖MVP（10,000 commands/day） |
| LLM API（Deepseek） | 按实际使用 | 成本优化,多家支持 |

---

## CI/CD配置

### GitHub Actions验证流程

```yaml
# .github/workflows/ci.yml

name: CI Validation

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run TypeScript check
        run: npm run typecheck
      
      - name: Verify build
        run: npm run build
```

### Vercel自动部署

- **触发方式**：Git推送自动触发
- **Preview部署**：PR合并前生成Preview URL验证
- **Production部署**：合并到main分支后自动部署
- **回滚机制**：Vercel Dashboard一键回滚

---

## 安全规范（MVP基础版）

| Aspect | Requirement | Implementation |
|--------|-------------|----------------|
| Secrets管理 | API Keys不暴露在代码中 | Vercel环境变量存储 / Docker .env.docker |
| Cron请求鉴权 | 验证请求来源 | `CRON_SECRET`验证 |
| HTTPS | 加密传输 | Vercel自动HTTPS / Docker需配置 |
| API限流 | 后续扩展 | Vercel Edge Middleware |
| 认证 | MVP无认证 | 单用户,后续扩展 |
| **数据隔离** | **多应用共享隔离** | **project_id + RLS策略** |

---

## 开发流程规范

1. **本地开发**：`npm run dev`（Next.js开发模式）
2. **类型检查**：`npm run typecheck`（提交前必须通过）
3. **Lint检查**：`npm run lint`（提交前必须通过）
4. **构建验证**：`npm run build`（提交前必须通过）
5. **部署验证**：Vercel Preview URL验证后合并 / Docker本地测试

---

## 变更记录

### v1.3（2026-05-11）
**触发原因**：用户反馈，项目目录结构重构，将业务代码统一放在 src/ 目录
**修改内容**：
1. **项目目录结构**（重构）：
   - 所有业务代码（app、lib、components、hooks、styles）统一放在 src/ 目录
   - docs/ 目录保持独立（规划文档）
   - 根目录配置文件（package.json、tsconfig.json、next.config.js 等）保持在根目录
   - 新增目录结构说明章节
   - 补充配置文件更新要点（tsconfig.json、tailwind.config.js）
2. **Next.js 自动识别说明**：
   - Next.js 15 自动识别 src/app 目录结构
   - 无需修改 next.config.js
**影响范围**：所有实现层 Agent（backend-architect、frontend-developer、database-optimizer）需按新目录结构实现；配置文件已更新（tsconfig.json、tailwind.config.js）

### v1.2（2026-05-11）
**触发原因**：用户反馈，补充 Deepseek API 配置和 Docker 一键部署方案
**修改内容**：
1. **LLM Provider 配置方案**（新增章节）：
   - 默认模型更新为 `deepseek-v4-flash`（文档中是 `deepseek-chat`）
   - 新增各 Provider 可用模型列表（Deepseek/OpenAI/Anthropic）
   - 新增前端配置流程设计（填写 → 验证 → 选择模型 → 保存）
   - 新增配置验证机制代码示例
2. **Docker 一键部署方案**（新增章节）：
   - 新增 Dockerfile（Next.js standalone 模式）
   - 新增 docker-compose.yml（云服务方案,推荐）
   - 新增 docker-compose.local.yml（本地服务方案,不推荐）
   - 新增 .env.docker.example
   - 新增 next.config.js `output: 'standalone'` 配置
   - 新增 Docker 部署步骤和文档
3. **项目目录结构**（更新）：
   - 新增 `llm-validator.ts`、`llm-config-form.tsx`、`model-selector.tsx` 组件
   - 新增 `use-llm-validation.ts` Hook
   - 新增 Docker 相关文件
4. **环境变量配置**（更新）：
   - 默认模型更新为 `deepseek-v4-flash`
5. **全局规范**（新增）：
   - 默认 LLM 模型：`deepseek-v4-flash`
   - Docker 输出模式：`standalone`
**影响范围**：backend-architect 需实现验证接口，frontend-developer 需实现配置表单，devops-automator 需创建 Docker 配置文件

### v1.1（2026-05-11）
**触发原因**：技术架构自审，解决三个核心问题
**修改内容**：
1. Next.js版本从14升级到15（Turbopack稳定版、PPR优化、App Router成熟）
2. 补充Chatbot流式输出和Thinking输出方案（SSE接口、LLMAdapter扩展）
3. 补充Supabase多应用共享数据隔离策略（project_id + RLS）
4. 新增环境变量 `SUPABASE_APP_ID`（应用标识）
5. 项目目录结构新增流式接口路由和Thinking组件
6. LLMResponse接口新增thinking和thinkingTokens字段
**影响范围**：backend-architect、frontend-developer、database-optimizer 需按新契约实现

---

> **核心原则：零运维部署，全栈一体化，异步管道优化，成本控制优先，多应用共享隔离，Docker一键部署，Deepseek默认模型。**