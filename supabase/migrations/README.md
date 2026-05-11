# Supabase Migrations

此目录包含 NewsHot 项目的数据库迁移文件。

## 迁移文件列表

| 文件 | 描述 | 表数量 | 紇数量 |
|------|------|--------|--------|
| 001_initial_schema.sql | 初始化 Schema（含 pgvector、RLS、触发器） | 6 | 21 |
| 002_initial_data.sql | 初始化数据（Project、LLM 配置） | - | - |

## 执行方式

### 推荐方式：Supabase CLI

```bash
# 安装 Supabase CLI（如果未安装）
npm install -g supabase

# 启动本地 Supabase
supabase start

# 执行所有迁移
supabase db reset

# 生成 TypeScript 类型定义
supabase gen types typescript --local > lib/types/db.ts
```

### 远程项目（生产环境）

使用 MCP 工具：

- `mcp__supabase__apply_migration` - 应用迁移
- `mcp__supabase__get_advisors` - 检查 RLS 策略

### 手动执行

```bash
node scripts/migrate.js
```

## 迁移文件规范

每个迁移文件包含：

1. **UP 部分**：正向迁移（创建表、索引、RLS 策略）
2. **DOWN 部分**：回滚迁移（删除表、触发器）

## 表结构概览

| 表名 | 用途 | RLS 策略 |
|------|------|---------|
| projects | 项目配置（多应用共享核心表） | SELECT 公开，INSERT/UPDATE/DELETE 禁止前端 |
| llm_config | LLM 配置（含验证状态和可用模型） | 按 project_id 隔离 |
| news_items | 新闻条目（含向量嵌入） | 按 project_id 隔离，软删除过滤 |
| drafts | Draft 摘要（每日生成） | 按 project_id 隔离，软删除过滤 |
| clusters | Cluster 聚合（观点对话维度） | 按 project_id 隔离，软删除过滤 |
| articles | 文章（审核通过后生成） | 按 project_id 隔离，软删除过滤 |

## 关键特性

- **pgvector 扩展**：支持向量嵌入存储和相似度检索
- **RLS 策略**：所有表启用 Row Level Security，按 project_id 隔离
- **自动 updated_at**：触发器自动更新 updated_at 字段
- **软删除**：deleted_at 字段支持软删除，查询时自动过滤
- **事务函数**：insert_draft_with_dependencies 保证 Draft 写入一致性