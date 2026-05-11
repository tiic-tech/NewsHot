# 数据库 Schema
> 数据库: Supabase PostgreSQL | 字符集: utf8mb4 | 扩展: pgvector（向量存储）
> 版本: 1.1 | 多应用共享隔离策略: project_id + RLS

---

## 命名规范

- **表名**：复数蛇形（`news_items`、`clusters`、`drafts`）
- **字段名**：蛇形（`created_at`、`cluster_id`）
- **主键**：统一命名 `id`，类型 `UUID DEFAULT gen_random_uuid()`
- **外键**：`{关联表单数}_id`（如 `cluster_id`、`draft_id`）
- **时间字段**：统一使用 `TIMESTAMPTZ`，存UTC时间
- **向量字段**：后缀 `_embedding`，类型 `vector(1024)`（1024维）
- **软删除**：使用 `deleted_at` 字段（NULL表示未删除）

---

## Supabase 多应用共享隔离策略

> **问题背景**：Supabase 免费账户限制 2 个 Project，需要与其他应用共享同一 Project 并保证数据隔离。

### 隔离方案：project_id + RLS 策略

**核心设计**：
1. 所有表通过 `project_id` 字段关联到 `projects` 表
2. RLS（Row Level Security）策略按 `project_id` 强制隔离数据
3. 应用标识通过环境变量 `SUPABASE_APP_ID` 或 HTTP Header `x-app-id` 传递
4. Supabase Client 创建时注入应用标识

**隔离效果**：
- 查询自动过滤：只返回当前应用的数据
- 插入自动绑定：自动关联当前应用的 project_id
- 更新/删除保护：只能操作当前应用的数据
- 跨应用泄露防护：即使代码错误也不会访问其他应用数据

### RLS 策略模板

```sql
-- Supabase RLS 策略通过 current_setting('request.headers.x-app-id') 获取应用标识
-- 前端请求时注入 x-app-id header，后端使用 Service Key 绑过 RLS

-- 通用的 RLS 策略模板（适用于所有业务表）
-- SELECT 策略：只允许访问自己应用的数据
CREATE POLICY "{table}_select_app" ON {table} 
FOR SELECT 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

-- INSERT 策略：只能插入自己应用的数据
CREATE POLICY "{table}_insert_app" ON {table} 
FOR INSERT 
WITH CHECK (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

-- UPDATE 策略：只能更新自己应用的数据
CREATE POLICY "{table}_update_app" ON {table} 
FOR UPDATE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

-- DELETE 策略：只能删除自己应用的数据
CREATE POLICY "{table}_delete_app" ON {table} 
FOR DELETE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);
```

### 应用标识传递方式

**方式1：HTTP Header（推荐）**

```typescript
// lib/supabase.ts

const APP_ID = process.env.SUPABASE_APP_ID || 'newshot'

export function createSupabaseClientPublic() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'x-app-id': APP_ID    // HTTP Header 传递应用标识
        }
      }
    }
  )
}
```

**方式2：JWT Claims（可选）**

```sql
-- 如果使用 Supabase Auth，可以在 JWT claims 中注入 project_id
-- RLS 策略通过 JWT claims 获取 project_id
CREATE POLICY "{table}_select_jwt" ON {table} 
FOR SELECT 
USING (
  project_id = current_setting('request.jwt.claims.project_id', true)::UUID
);
```

---

## 启用pgvector扩展

```sql
-- 启用pgvector扩展（Supabase默认已启用）
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 表：projects

**用途**：项目配置表（多应用共享的核心表，每个应用一条记录）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | - | 主键 |
| name | TEXT | NOT NULL, UNIQUE | - | 项目名称（应用标识，如：newshot） |
| domain | TEXT | NOT NULL | - | 项目领域（如：AI） |
| description | TEXT | NULL | NULL | 项目描述 |
| settings | JSONB | NOT NULL | '{}' | 项目设置（含output_languages） |
| status | JSONB | NOT NULL | '{}' | 项目状态（健康度、最后抓取时间等） |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间（UTC） |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新时间（UTC，需触发器） |

**索引**：
```sql
PRIMARY KEY (id)
CREATE UNIQUE INDEX uk_projects_name ON projects (name);
CREATE INDEX idx_projects_domain ON projects (domain);
```

**RLS策略**（projects表不按project_id隔离，因为它是隔离的根）：
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT 策略：允许所有应用查看所有 project 记录（公开）
CREATE POLICY "projects_select_public" ON projects FOR SELECT USING (true);

-- INSERT 策略：禁止前端直接插入 project（只能通过后端 Service Key）
CREATE POLICY "projects_insert_service" ON projects FOR INSERT WITH CHECK (false);

-- UPDATE 策略：禁止前端直接更新 project（只能通过后端 Service Key）
CREATE POLICY "projects_update_service" ON projects FOR UPDATE USING (false);

-- DELETE 策略：禁止前端直接删除 project（只能通过后端 Service Key）
CREATE POLICY "projects_delete_service" ON projects FOR DELETE USING (false);
```

---

## 表：llm_config

**用途**：LLM配置存储（支持OpenAI/Anthropic/Deepseek）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | - | 主键 |
| project_id | UUID | NOT NULL, FK | - | 关联项目（隔离键） |
| provider | TEXT | NOT NULL | - | LLM提供商（openai/anthropic/deepseek） |
| base_url | TEXT | NOT NULL | - | API基础URL |
| api_key | TEXT | NOT NULL | - | API密钥（加密存储） |
| model | TEXT | NOT NULL | - | 模型名称 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间（UTC） |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新时间（UTC，需触发器） |

**索引**：
```sql
PRIMARY KEY (id)
CREATE UNIQUE INDEX uk_llm_config_project ON llm_config (project_id);
CREATE INDEX idx_llm_config_provider ON llm_config (provider);
```

**关联关系**：
```sql
ALTER TABLE llm_config 
ADD CONSTRAINT fk_llm_config_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
```

**RLS策略**（按project_id隔离）：
```sql
ALTER TABLE llm_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "llm_config_select_app" ON llm_config 
FOR SELECT 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "llm_config_insert_app" ON llm_config 
FOR INSERT 
WITH CHECK (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "llm_config_update_app" ON llm_config 
FOR UPDATE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);
```

---

## 表：news_items

**用途**：新闻条目表（来自follow-builders feed）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | - | 主键 |
| project_id | UUID | NOT NULL, FK | - | 关联项目（隔离键） |
| date | DATE | NOT NULL | - | 新闻日期（分区键） |
| title | TEXT | NOT NULL | - | 新闻标题 |
| original_title | TEXT | NOT NULL | - | 原始标题 |
| summary | TEXT | NOT NULL | - | 新闻摘要 |
| content_type | TEXT | NOT NULL | '其他' | 内容类型（争议型/恐虑型/干货型/故事型/其他） |
| emotion_score | TEXT | NULL | NULL | 情绪评分（高唤醒/低唤醒） |
| source_type | TEXT | NOT NULL | - | 来源类型（podcast/x/blog） |
| source_name | TEXT | NOT NULL | - | 来源名称 |
| source_url | TEXT | NOT NULL | - | 来源URL |
| importance_score | INTEGER | NOT NULL | 5 | 重要性评分（1-10） |
| key_entities | TEXT[] | NULL | NULL | 关键实体数组 |
| hashtags | TEXT[] | NULL | NULL | 标签数组 |
| visual_potential | TEXT | NULL | NULL | 视觉潜力（高/中/低） |
| raw_transcript | TEXT | NULL | NULL | 原始转录文本 |
| embedding | vector(1024) | NULL | NULL | 向量嵌入（1024维，阿里云百炼） |
| embedding_source | TEXT | NULL | NULL | Embedding来源（bailian_api） |
| publish_time | TIMESTAMPTZ | NULL | NULL | 发布时间 |
| author_name | TEXT | NULL | NULL | 作者名称 |
| platform | TEXT | NULL | NULL | 平台名称 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间（UTC） |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新时间（UTC，需触发器） |
| deleted_at | TIMESTAMPTZ | NULL | NULL | 软删除时间 |

**索引**：
```sql
PRIMARY KEY (id)
CREATE INDEX idx_news_items_date ON news_items (date);
CREATE INDEX idx_news_items_project_date ON news_items (project_id, date);
CREATE INDEX idx_news_items_source_type ON news_items (source_type);
CREATE INDEX idx_news_items_importance ON news_items (importance_score DESC);
CREATE INDEX idx_news_items_embedding ON news_items USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_news_items_dedupe ON news_items (title, source_url);
```

**关联关系**：
```sql
ALTER TABLE news_items 
ADD CONSTRAINT fk_news_items_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
```

**RLS策略**（按project_id隔离）：
```sql
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_items_select_app" ON news_items 
FOR SELECT 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
  AND deleted_at IS NULL
);

CREATE POLICY "news_items_insert_app" ON news_items 
FOR INSERT 
WITH CHECK (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "news_items_update_app" ON news_items 
FOR UPDATE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "news_items_delete_app" ON news_items 
FOR DELETE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);
```

---

## 表：clusters

**用途**：Cluster聚合表（观点对话维度聚合）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | - | 主键 |
| project_id | UUID | NOT NULL, FK | - | 关联项目（隔离键） |
| draft_id | UUID | NULL, FK | NULL | 关联draft |
| date | DATE | NOT NULL | - | Cluster日期 |
| cluster_theme | TEXT | NOT NULL | - | Cluster主题（吸引人的标题） |
| core_insight | TEXT | NOT NULL | - | 核心洞察（2-3句话总结） |
| cluster_refs | JSONB | NOT NULL | '[]' | Cluster引用列表（ClusterRef数组） |
| viewpoint_conflict | TEXT | NULL | NULL | 观点冲突描述 |
| cluster_importance | INTEGER | NOT NULL | 5 | Cluster重要性（1-10） |
| suggested_angle | TEXT | NULL | NULL | 建议角度 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间（UTC） |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新时间（UTC，需触发器） |
| deleted_at | TIMESTAMPTZ | NULL | NULL | 软删除时间 |

**cluster_refs JSONB结构**：
```json
[
  {
    "item_id": "uuid-string",
    "source_name": "string",
    "source_url": "string",
    "viewpoint_summary": "string",
    "viewpoint_stance": "string"
  }
]
```

**索引**：
```sql
PRIMARY KEY (id)
CREATE INDEX idx_clusters_date ON clusters (date);
CREATE INDEX idx_clusters_project_date ON clusters (project_id, date);
CREATE INDEX idx_clusters_draft ON clusters (draft_id);
CREATE INDEX idx_clusters_importance ON clusters (cluster_importance DESC);
CREATE INDEX idx_clusters_theme ON clusters USING gin (to_tsvector('english', cluster_theme));
```

**关联关系**：
```sql
ALTER TABLE clusters 
ADD CONSTRAINT fk_clusters_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE clusters 
ADD CONSTRAINT fk_clusters_draft 
FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE SET NULL;
```

**RLS策略**（按project_id隔离）：
```sql
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clusters_select_app" ON clusters 
FOR SELECT 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
  AND deleted_at IS NULL
);

CREATE POLICY "clusters_insert_app" ON clusters 
FOR INSERT 
WITH CHECK (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "clusters_update_app" ON clusters 
FOR UPDATE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "clusters_delete_app" ON clusters 
FOR DELETE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);
```

---

## 表：drafts

**用途**：Draft摘要表（每日生成的摘要草稿）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | - | 主键 |
| project_id | UUID | NOT NULL, FK | - | 关联项目（隔离键） |
| date | DATE | NOT NULL | - | Draft日期 |
| status | TEXT | NOT NULL | 'draft' | Draft状态（draft/approved/rejected） |
| language | TEXT | NOT NULL | 'zh' | 输出语言（zh/en/zh-en/en-zh） |
| total_items | INTEGER | NOT NULL | 0 | 总items数量 |
| new_count | INTEGER | NOT NULL | 0 | 新items数量 |
| duplicate_count | INTEGER | NOT NULL | 0 | 重复items数量 |
| clusters | UUID[] | NULL | NULL | 关联clusters数组 |
| content | TEXT | NULL | NULL | Draft内容（Markdown格式） |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间（UTC） |
| approved_at | TIMESTAMPTZ | NULL | NULL | 审核通过时间 |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新时间（UTC，需触发器） |
| deleted_at | TIMESTAMPTZ | NULL | NULL | 软删除时间 |

**索引**：
```sql
PRIMARY KEY (id)
CREATE UNIQUE INDEX uk_drafts_project_date_language ON drafts (project_id, date, language) WHERE deleted_at IS NULL;
CREATE INDEX idx_drafts_date ON drafts (date);
CREATE INDEX idx_drafts_status ON drafts (status);
CREATE INDEX idx_drafts_language ON drafts (language);
```

**关联关系**：
```sql
ALTER TABLE drafts 
ADD CONSTRAINT fk_drafts_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
```

**RLS策略**（按project_id隔离）：
```sql
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drafts_select_app" ON drafts 
FOR SELECT 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
  AND deleted_at IS NULL
);

CREATE POLICY "drafts_insert_app" ON drafts 
FOR INSERT 
WITH CHECK (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "drafts_update_app" ON drafts 
FOR UPDATE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "drafts_delete_app" ON drafts 
FOR DELETE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);
```

---

## 表：articles

**用途**：文章表（draft审核通过后生成的文章）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | - | 主键 |
| project_id | UUID | NOT NULL, FK | - | 关联项目（隔离键） |
| draft_id | UUID | NOT NULL, FK | - | 关联draft |
| date | DATE | NOT NULL | - | 文章日期 |
| language | TEXT | NOT NULL | 'zh' | 文章语言 |
| title | TEXT | NOT NULL | - | 文章标题 |
| summary | TEXT | NOT NULL | - | 文章摘要 |
| content | TEXT | NOT NULL | - | 文章内容（Markdown格式） |
| publish_time | TIMESTAMPTZ | NOT NULL | NOW() | 发布时间 |
| author_name | TEXT | NULL | NULL | 作者名称（系统生成） |
| platform | TEXT | NULL | NULL | 发布平台 |
| raw_url | TEXT | NULL | NULL | 原始链接 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 创建时间（UTC） |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新时间（UTC，需触发器） |
| deleted_at | TIMESTAMPTZ | NULL | NULL | 软删除时间 |

**索引**：
```sql
PRIMARY KEY (id)
CREATE INDEX idx_articles_date ON articles (date);
CREATE INDEX idx_articles_project_date ON articles (project_id, date);
CREATE INDEX idx_articles_draft ON articles (draft_id);
CREATE INDEX idx_articles_language ON articles (language);
CREATE INDEX idx_articles_content_search ON articles USING gin (to_tsvector('english', content));
```

**关联关系**：
```sql
ALTER TABLE articles 
ADD CONSTRAINT fk_articles_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE articles 
ADD CONSTRAINT fk_articles_draft 
FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE;
```

**RLS策略**（按project_id隔离）：
```sql
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "articles_select_app" ON articles 
FOR SELECT 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
  AND deleted_at IS NULL
);

CREATE POLICY "articles_insert_app" ON articles 
FOR INSERT 
WITH CHECK (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "articles_update_app" ON articles 
FOR UPDATE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);

CREATE POLICY "articles_delete_app" ON articles 
FOR DELETE 
USING (
  project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
);
```

---

## ER关系图

```
projects 1 ──── 1 llm_config          （一个项目有一个LLM配置）
projects 1 ──── N news_items          （一个项目有多个新闻条目，按project_id隔离）
projects 1 ──── N clusters            （一个项目有多个cluster，按project_id隔离）
projects 1 ──── N drafts              （一个项目有多个draft，按project_id隔离）
projects 1 ──── N articles            （一个项目有多篇文章，按project_id隔离）

drafts 1 ──── N clusters              （一个draft包含多个cluster）
drafts 1 ──── N articles              （一个draft生成多篇文章，按语言）

clusters N ──── N news_items          （cluster引用news_items，通过cluster_refs）
```

---

## 触发器：自动更新 updated_at

```sql
-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为每个表应用触发器
CREATE TRIGGER update_projects_updated_at 
BEFORE UPDATE ON projects 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llm_config_updated_at 
BEFORE UPDATE ON llm_config 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_items_updated_at 
BEFORE UPDATE ON news_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clusters_updated_at 
BEFORE UPDATE ON clusters 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at 
BEFORE UPDATE ON drafts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at 
BEFORE UPDATE ON articles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 事务函数：Draft写入事务

```sql
-- 创建Draft写入事务函数（保证一致性）
CREATE OR REPLACE FUNCTION insert_draft_with_dependencies(
    p_project_id UUID,
    p_date DATE,
    p_language TEXT,
    p_news_items JSONB,
    p_clusters JSONB,
    p_draft JSONB
)
RETURNS UUID AS $$
DECLARE
    v_draft_id UUID;
    v_news_item_ids UUID[];
    v_cluster_ids UUID[];
BEGIN
    -- 插入news_items
    INSERT INTO news_items (
        project_id, date, title, original_title, summary, 
        content_type, source_type, source_name, source_url, 
        importance_score, embedding
    )
    SELECT 
        p_project_id,
        p_date,
        item->>'title',
        item->>'original_title',
        item->>'summary',
        item->>'content_type',
        item->>'source_type',
        item->>'source_name',
        item->>'source_url',
        (item->>'importance_score')::INTEGER,
        (item->>'embedding')::vector(1024)
    FROM jsonb_array_elements(p_news_items) AS item
    RETURNING id INTO v_news_item_ids;
    
    -- 插入clusters
    INSERT INTO clusters (
        project_id, date, cluster_theme, core_insight,
        cluster_refs, viewpoint_conflict, cluster_importance, suggested_angle
    )
    SELECT 
        p_project_id,
        p_date,
        cluster->>'cluster_theme',
        cluster->>'core_insight',
        cluster->'cluster_refs',
        cluster->>'viewpoint_conflict',
        (cluster->>'cluster_importance')::INTEGER,
        cluster->>'suggested_angle'
    FROM jsonb_array_elements(p_clusters) AS cluster
    RETURNING id INTO v_cluster_ids;
    
    -- 插入draft
    INSERT INTO drafts (
        project_id, date, language, status,
        total_items, new_count, duplicate_count, clusters
    )
    VALUES (
        p_project_id,
        p_date,
        p_language,
        'draft',
        (p_draft->>'total_items')::INTEGER,
        (p_draft->>'new_count')::INTEGER,
        (p_draft->>'duplicate_count')::INTEGER,
        v_cluster_ids
    )
    RETURNING id INTO v_draft_id;
    
    -- 更新clusters的draft_id
    UPDATE clusters 
    SET draft_id = v_draft_id 
    WHERE id = ANY(v_cluster_ids);
    
    RETURN v_draft_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 向量检索示例

```sql
-- 查找相似新闻（相似度 > 0.7，自动按project_id隔离）
SELECT 
    id, 
    title, 
    source_name,
    1 - (embedding <=> query_vector) AS similarity
FROM news_items
WHERE date = '2024-01-15'
  AND project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
  AND deleted_at IS NULL
ORDER BY embedding <=> query_vector
LIMIT 10;

-- 查找最相似的cluster（自动按project_id隔离）
SELECT 
    id,
    cluster_theme,
    core_insight,
    AVG(1 - (ni.embedding <=> query_vector)) AS avg_similarity
FROM clusters c
JOIN news_items ni ON ni.id IN (
    SELECT ref->>'item_id' 
    FROM jsonb_array_elements(c.cluster_refs) AS ref
)
WHERE c.date = '2024-01-15'
  AND c.project_id = (
    SELECT id FROM projects 
    WHERE name = current_setting('request.headers.x-app-id', true)
  )
  AND c.deleted_at IS NULL
GROUP BY c.id, c.cluster_theme, c.core_insight
ORDER BY avg_similarity DESC
LIMIT 5;
```

---

## 数据分区建议（后续扩展）

当数据量增大时（单表超过100万行），建议按日期分区：

```sql
-- news_items按月分区示例
CREATE TABLE news_items_partitioned (
    id UUID,
    project_id UUID,
    date DATE,
    title TEXT,
    -- 其他字段...
) PARTITION BY RANGE (date);

CREATE TABLE news_items_2024_01 
PARTITION OF news_items_partitioned 
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE news_items_2024_02 
PARTITION OF news_items_partitioned 
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

---

## 初始化数据（MVP）

```sql
-- 创建 NewsHot 应用 Project 记录
INSERT INTO projects (name, domain, description, settings)
VALUES (
    'newshot',
    'AI',
    'NewsHot - AI新闻聚合平台',
    '{"output_languages": ["zh"]}'
);

-- 其他应用共享同一 Supabase Project 时，创建独立的 project 记录
-- 例如：另一个应用 "other-app"
INSERT INTO projects (name, domain, description, settings)
VALUES (
    'other-app',
    'Other',
    '其他应用',
    '{"output_languages": ["en"]}'
);

-- 创建默认LLM配置（使用环境变量）
INSERT INTO llm_config (project_id, provider, base_url, api_key, model)
VALUES (
    (SELECT id FROM projects WHERE name = 'newshot'),
    'deepseek',
    'https://api.deepseek.com',
    current_setting('appsettings.deepseek_api_key'),
    'deepseek-chat'
);
```

---

## Supabase Client 实现示例

```typescript
// lib/supabase.ts

import { createClient } from '@supabase/supabase-js'

const APP_ID = process.env.SUPABASE_APP_ID || 'newshot'

// 后端 Client（使用 Service Key，绑过 RLS，用于 Cron Jobs 和后端逻辑）
export function createSupabaseClientService() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      global: {
        headers: {
          'x-app-id': APP_ID
        }
      }
    }
  )
}

// 前端 Client（使用 Anon Key，受 RLS 保护，自动按 project_id 隔离）
export function createSupabaseClientPublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

---

## 变更记录

### v1.1（2026-05-11）
**触发原因**：技术架构自审，补充 Supabase 多应用共享数据隔离策略
**修改内容**：
1. 新增「Supabase 多应用共享隔离策略」章节（方案对比、RLS策略模板）
2. 所有业务表 RLS 策略从宽松策略（`USING (true)`）改为按 `project_id` 隔离
3. `projects` 表 RLS 策略调整为：SELECT公开，INSERT/UPDATE/DELETE禁止前端直接操作
4. 新增向量检索示例中的 `project_id` 过滤条件
5. 新增 Supabase Client 实现示例（Service Key 和 Anon Key）
6. 初始化数据示例补充多应用共享场景
**影响范围**：database-optimizer 需按新 RLS 策略创建迁移脚本，backend-architect 需在 Supabase Client 中注入 x-app-id header

---

> **Schema原则：类型精确，约束完整，索引有理由，关系清晰，RLS启用按project_id隔离。**