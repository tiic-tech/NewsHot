-- ============================================================
-- Migration: 001_initial_schema.sql
-- Version: 1.2
-- Description: NewsHot 初始化 Schema（含 pgvector、RLS、触发器）
-- ============================================================

-- ============================================================
-- UP: 正向迁移
-- ============================================================

-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 表：projects（项目配置表，多应用共享的核心表）
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT NULL DEFAULT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  status JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：项目名称唯一（应用标识）
CREATE UNIQUE INDEX uk_projects_name ON projects (name);
-- 索引：按领域查询项目
CREATE INDEX idx_projects_domain ON projects (domain);

-- RLS 策略（projects 表不按 project_id 隔离，因为它是隔离的根）
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT 策略：允许所有应用查看所有 project 记录（公开）
CREATE POLICY "projects_select_public" ON projects FOR SELECT USING (true);

-- INSERT 策略：禁止前端直接插入 project（只能通过后端 Service Key）
CREATE POLICY "projects_insert_service" ON projects FOR INSERT WITH CHECK (false);

-- UPDATE 策略：禁止前端直接更新 project（只能通过后端 Service Key）
CREATE POLICY "projects_update_service" ON projects FOR UPDATE USING (false);

-- DELETE 策略：禁止前端直接删除 project（只能通过后端 Service Key）
CREATE POLICY "projects_delete_service" ON projects FOR DELETE USING (false);

-- ============================================================
-- 表：llm_config（LLM 配置存储，含验证状态和可用模型）
-- ============================================================
CREATE TABLE llm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  provider TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  validated_at TIMESTAMPTZ NULL DEFAULT NULL,
  available_models TEXT[] NULL DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：每个项目只有一个 LLM 配置
CREATE UNIQUE INDEX uk_llm_config_project ON llm_config (project_id);
-- 索引：按 provider 查询配置
CREATE INDEX idx_llm_config_provider ON llm_config (provider);
-- 索引：按验证状态查询配置
CREATE INDEX idx_llm_config_validated ON llm_config (validated_at);

-- 外键约束：关联 projects 表
ALTER TABLE llm_config
ADD CONSTRAINT fk_llm_config_project
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- RLS 策略（按 project_id 隔离）
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

-- ============================================================
-- 表：news_items（新闻条目表，含向量嵌入）
-- ============================================================
CREATE TABLE news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  original_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT '其他',
  emotion_score TEXT NULL DEFAULT NULL,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  importance_score INTEGER NOT NULL DEFAULT 5,
  key_entities TEXT[] NULL DEFAULT NULL,
  hashtags TEXT[] NULL DEFAULT NULL,
  visual_potential TEXT NULL DEFAULT NULL,
  raw_transcript TEXT NULL DEFAULT NULL,
  embedding vector(1024) NULL DEFAULT NULL,
  embedding_source TEXT NULL DEFAULT NULL,
  publish_time TIMESTAMPTZ NULL DEFAULT NULL,
  author_name TEXT NULL DEFAULT NULL,
  platform TEXT NULL DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL DEFAULT NULL
);

-- 索引：按日期查询新闻
CREATE INDEX idx_news_items_date ON news_items (date);
-- 索引：按项目和日期查询新闻（复合索引，RLS 查询优化）
CREATE INDEX idx_news_items_project_date ON news_items (project_id, date);
-- 索引：按来源类型查询新闻
CREATE INDEX idx_news_items_source_type ON news_items (source_type);
-- 紇引：按重要性排序查询新闻（降序）
CREATE INDEX idx_news_items_importance ON news_items (importance_score DESC);
-- 向量索引：HNSW 索引，用于相似度检索
CREATE INDEX idx_news_items_embedding ON news_items USING hnsw (embedding vector_cosine_ops);
-- 紇索引：去重查询（标题+URL）
CREATE INDEX idx_news_items_dedupe ON news_items (title, source_url);

-- 外键约束：关联 projects 表
ALTER TABLE news_items
ADD CONSTRAINT fk_news_items_project
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- RLS 策略（按 project_id 隔离）
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

-- ============================================================
-- 表：drafts（Draft 摘要表）
-- ============================================================
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  language TEXT NOT NULL DEFAULT 'zh',
  total_items INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  clusters UUID[] NULL DEFAULT NULL,
  content TEXT NULL DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ NULL DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL DEFAULT NULL
);

-- 紇索引：每个项目每天每个语言只有一个 draft（部分索引，排除软删除）
CREATE UNIQUE INDEX uk_drafts_project_date_language ON drafts (project_id, date, language) WHERE deleted_at IS NULL;
-- 紇索引：按日期查询 draft
CREATE INDEX idx_drafts_date ON drafts (date);
-- 紇索引：按状态查询 draft
CREATE INDEX idx_drafts_status ON drafts (status);
-- 紇索引：按语言查询 draft
CREATE INDEX idx_drafts_language ON drafts (language);

-- 外键约束：关联 projects 表
ALTER TABLE drafts
ADD CONSTRAINT fk_drafts_project
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- RLS 策略（按 project_id 隔离）
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

-- ============================================================
-- 表：clusters（Cluster 聚合表）
-- ============================================================
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  draft_id UUID NULL DEFAULT NULL,
  date DATE NOT NULL,
  cluster_theme TEXT NOT NULL,
  core_insight TEXT NOT NULL,
  cluster_refs JSONB NOT NULL DEFAULT '[]',
  viewpoint_conflict TEXT NULL DEFAULT NULL,
  cluster_importance INTEGER NOT NULL DEFAULT 5,
  suggested_angle TEXT NULL DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL DEFAULT NULL
);

-- 紇索引：按日期查询 cluster
CREATE INDEX idx_clusters_date ON clusters (date);
-- 紇索引：按项目和日期查询 cluster（复合索引，RLS 查询优化）
CREATE INDEX idx_clusters_project_date ON clusters (project_id, date);
-- 紇索引：按 draft_id 查询 cluster
CREATE INDEX idx_clusters_draft ON clusters (draft_id);
-- 紇索引：按重要性排序查询 cluster（降序）
CREATE INDEX idx_clusters_importance ON clusters (cluster_importance DESC);
-- 全文索引：按主题搜索 cluster
CREATE INDEX idx_clusters_theme ON clusters USING gin (to_tsvector('english', cluster_theme));

-- 外键约束：关联 projects 表
ALTER TABLE clusters
ADD CONSTRAINT fk_clusters_project
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 外键约束：关联 drafts 表（SET NULL，允许 draft 删除后 cluster 独立存在）
ALTER TABLE clusters
ADD CONSTRAINT fk_clusters_draft
FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE SET NULL;

-- RLS 策略（按 project_id 隔离）
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

-- ============================================================
-- 表：articles（文章表）
-- ============================================================
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  draft_id UUID NOT NULL,
  date DATE NOT NULL,
  language TEXT NOT NULL DEFAULT 'zh',
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  publish_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  author_name TEXT NULL DEFAULT NULL,
  platform TEXT NULL DEFAULT NULL,
  raw_url TEXT NULL DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL DEFAULT NULL
);

-- 紇索引：按日期查询文章
CREATE INDEX idx_articles_date ON articles (date);
-- 紇索引：按项目和日期查询文章（复合索引，RLS 查询优化）
CREATE INDEX idx_articles_project_date ON articles (project_id, date);
-- 紇索引：按 draft_id 查询文章
CREATE INDEX idx_articles_draft ON articles (draft_id);
-- 紇索引：按语言查询文章
CREATE INDEX idx_articles_language ON articles (language);
-- 全文索引：按内容搜索文章
CREATE INDEX idx_articles_content_search ON articles USING gin (to_tsvector('english', content));

-- 外键约束：关联 projects 表
ALTER TABLE articles
ADD CONSTRAINT fk_articles_project
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 外键约束：关联 drafts 表
ALTER TABLE articles
ADD CONSTRAINT fk_articles_draft
FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE;

-- RLS 策略（按 project_id 隔离）
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

-- ============================================================
-- 触发器：自动更新 updated_at
-- ============================================================

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

CREATE TRIGGER update_drafts_updated_at
BEFORE UPDATE ON drafts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clusters_updated_at
BEFORE UPDATE ON clusters
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 事务函数：Draft 写入事务（保证一致性）
-- ============================================================

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
    -- 插入 news_items
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

    -- 插入 clusters
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

    -- 插入 draft
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

    -- 更新 clusters 的 draft_id
    UPDATE clusters
    SET draft_id = v_draft_id
    WHERE id = ANY(v_cluster_ids);

    RETURN v_draft_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DOWN: 回滚（必须有）
-- ============================================================

-- 删除事务函数
DROP FUNCTION IF EXISTS insert_draft_with_dependencies(UUID, DATE, TEXT, JSONB, JSONB, JSONB);

-- 删除触发器
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
DROP TRIGGER IF EXISTS update_clusters_updated_at ON clusters;
DROP TRIGGER IF EXISTS update_drafts_updated_at ON drafts;
DROP TRIGGER IF EXISTS update_news_items_updated_at ON news_items;
DROP TRIGGER IF EXISTS update_llm_config_updated_at ON llm_config;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 删除表（按依赖顺序删除）
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS clusters;
DROP TABLE IF EXISTS drafts;
DROP TABLE IF EXISTS news_items;
DROP TABLE IF EXISTS llm_config;
DROP TABLE IF EXISTS projects;

-- 删除 pgvector 扩展（可选，通常保留）
-- DROP EXTENSION IF EXISTS vector;