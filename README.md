# NewsHot

> AI驱动的新闻聚合平台 - 自媒体创作者的智能助手

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 功能特性

### 核心功能 (MVP)

| 编号 | 功能 | 描述 |
|------|------|------|
| **F01** | 定时抓取与摘要生成 | 每天04:00自动抓取RSS源，通过LLM生成结构化摘要 |
| **F02** | 智能Embedding生成 | 集成阿里云百炼text-embedding-v4 API，支持语义聚类 |
| **F03** | Chatbot审核交互 | 通过14个Tools实现自然语言内容调整 |
| **F04** | Markdown摘要展示 | 以对话式Cluster形式展示，支持展开/折叠 |
| **F05** | Upstash去重与缓存 | 48小时TTL去重哈希，重试队列管理 |
| **F06** | Vercel全栈部署 | 前端+后端+Cron一体化部署 |
| **F07** | 定时任务调度 | 每日03:00清理 + 04:00抓取 |
| **F08** | 审核流程管理 | Draft状态流转：draft → approved → 流水线触发 |
| **F09** | 重试策略与防护 | 3次指数退避重试，8种边缘Case防护 |
| **F10** | CI/CD自动化 | GitHub Actions验证 + Vercel自动部署 |
| **F11** | 数据源列表展示 | 展示抓取的数据源详情 |
| **F12** | 文章展示页面 | 聚合生成的Markdown文章，支持点击查看全文 |

### 核心价值

- **Cluster聚合**：观点对话式呈现，而非碎片罗列
- **完整流水线**：新闻 → 摘要 → 文章 → 视频口播稿
- **成本优化**：阿里云百炼Embedding，月成本仅¥0.45
- **智能审核**：Chatbot + 14个Tools，自然语言交互

## 技术架构

### 前端
- **Next.js 15** - React框架，支持App Router
- **Tailwind CSS** - 原子化CSS框架
- **TypeScript** - 类型安全

### 后端
- **Next.js API Routes** - Serverless API
- **Supabase** - PostgreSQL数据库 + 实时订阅
- **Upstash Redis** - 缓存与去重

### AI模块
- **DeepSeek/OpenAI/Anthropic** - 摘要生成与内容审核
- **阿里云百炼** - text-embedding-v4向量生成
- **Cluster算法** - 语义聚类分组

### 部署
- **Vercel** - 全栈托管 + Cron Jobs
- **Docker** - 容器化部署支持

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+ 或 pnpm 8+
- Supabase项目
- Upstash Redis实例
- LLM API密钥（DeepSeek/OpenAI/Anthropic）

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/tiic-tech/NewsHot.git
cd NewsHot

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑.env.local，填入你的配置

# 初始化数据库
# 在Supabase Dashboard执行 migrations/supabase_init.sql

# 开发模式运行
npm run dev
```

### 配置说明

编辑 `.env.local` 文件：

```bash
# Supabase配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Upstash Redis
UPSTASH_REST_URL=https://your-redis.upstash.io
UPSTASH_REST_TOKEN=your-token

# LLM提供商（三选一）
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-v4-flash
LLM_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=sk-...

# 安全密钥（生产环境必需）
CRON_SECRET=your-cron-secret
TOOLS_SECRET=your-tools-secret
```

## 项目结构

```
NewsHot/
├── app/                      # Next.js App Router
│   ├── api/v1/              # API路由
│   ├── articles/            # 文章展示页面
│   ├── digest/              # 摘要审核页面
│   ├── review/              # Chatbot审核
│   └── sources/             # 数据源列表
├── components/              # React组件
│   └── ui/                 # UI组件库
├── hooks/                   # 自定义Hooks
├── lib/                     # 工具函数
│   ├── ai/                 # AI服务封装
│   ├── db/                 # 数据库操作
│   └── utils/              # 通用工具
├── src/
│   └── app/                # 主应用代码
├── docs/                    # 文档
│   ├── PRD.md              # 产品需求文档
│   ├── API_CONTRACT.md     # API契约
│   ├── DB_SCHEMA.md        # 数据库设计
│   └── DESIGN_SYSTEM.md    # 设计系统
├── scripts/                 # 脚本工具
├── supabase/               # Supabase配置
│   └── migrations/         # 数据库迁移
├── Dockerfile              # Docker配置
├── docker-compose.yml      # Docker Compose
├── vercel.json             # Vercel配置
└── README.md
```

## API文档

### 核心接口列表

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/cron/fetch` | 触发RSS抓取（需CRON_SECRET） |
| POST | `/api/v1/cron/cleanup` | 触发数据清理（需CRON_SECRET） |
| GET | `/api/v1/drafts` | 获取草稿列表 |
| GET | `/api/v1/drafts/:id` | 获取草稿详情 |
| PATCH | `/api/v1/drafts/:id` | 更新草稿状态 |
| GET | `/api/v1/sources` | 获取数据源列表 |
| POST | `/api/v1/auth/config/validate` | 验证LLM配置 |

完整API文档参见：[docs/API_CONTRACT.md](./docs/API_CONTRACT.md)

## 部署

### Vercel部署

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

**环境变量配置**：
在Vercel Dashboard中配置所有必需的环境变量。

**Cron Jobs自动配置**：
`vercel.json`中已预配置：
- `0 4 * * *` - 每日04:00抓取
- `0 3 * * *` - 每日03:00清理

### Docker部署

```bash
# 构建镜像
docker build -t newshot .

# 运行容器
docker run -p 3000:3000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_ANON_KEY=... \
  newshot

# 或使用 Docker Compose
docker-compose up -d
```

## 环境变量

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SUPABASE_URL` | Supabase项目URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | 匿名访问密钥 | `eyJ...` |
| `SUPABASE_SERVICE_KEY` | 服务密钥（服务端） | `eyJ...` |
| `UPSTASH_REST_URL` | Upstash Redis URL | `https://xxx.upstash.io` |
| `UPSTASH_REST_TOKEN` | Upstash访问令牌 | `xxx` |
| `LLM_PROVIDER` | LLM提供商 | `deepseek` \| `openai` \| `anthropic` |
| `LLM_API_KEY` | 对应提供商API密钥 | `sk-...` |
| `CRON_SECRET` | Cron Jobs密钥 | 随机字符串 |
| `TOOLS_SECRET` | Tools接口密钥 | 随机字符串 |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `BAILIAN_API_KEY` | 阿里云百炼API密钥 | - |
| `NEXT_PUBLIC_APP_PATH` | 子路径部署 | - |

完整环境变量说明参见：[.env.example](./.env.example)

## 开发指南

### 可用脚本

```bash
npm run dev          # 开发模式
npm run build        # 生产构建
npm run start        # 启动生产服务
npm run lint         # ESLint检查
npm run typecheck    # TypeScript类型检查
```

### 数据库迁移

```bash
# 初始化数据库（在Supabase SQL Editor执行）
# 见 supabase/migrations/supabase_init.sql
```

## License

MIT © [Tiic Tech](https://github.com/tiic-tech)
