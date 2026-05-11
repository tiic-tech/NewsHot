/**
 * Database Types
 *
 * TypeScript 类型定义，与 DB_SCHEMA.md v1.2 完全一致
 * 用于 Supabase Client 类型安全查询
 */

// ============================================================
// 基础类型
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// Projects 表类型
// ============================================================

export interface Project {
  id: string
  name: string
  domain: string
  description: string | null
  settings: Json
  status: Json
  created_at: string
  updated_at: string
}

export interface ProjectInsert {
  id?: string
  name: string
  domain: string
  description?: string | null
  settings?: Json
  status?: Json
  created_at?: string
  updated_at?: string
}

export interface ProjectUpdate {
  id?: string
  name?: string
  domain?: string
  description?: string | null
  settings?: Json
  status?: Json
  updated_at?: string
}

// ============================================================
// LlmConfig 表类型（含 validated_at、available_models）
// ============================================================

export interface LlmConfig {
  id: string
  project_id: string
  provider: string
  base_url: string
  api_key: string
  model: string
  validated_at: string | null
  available_models: string[] | null
  created_at: string
  updated_at: string
}

export interface LlmConfigInsert {
  id?: string
  project_id: string
  provider: string
  base_url: string
  api_key: string
  model: string
  validated_at?: string | null
  available_models?: string[] | null
  created_at?: string
  updated_at?: string
}

export interface LlmConfigUpdate {
  id?: string
  project_id?: string
  provider?: string
  base_url?: string
  api_key?: string
  model?: string
  validated_at?: string | null
  available_models?: string[] | null
  updated_at?: string
}

// ============================================================
// NewsItem 表类型（含 embedding）
// ============================================================

export interface NewsItem {
  id: string
  project_id: string
  date: string
  title: string
  original_title: string
  summary: string
  content_type: string
  emotion_score: string | null
  source_type: string
  source_name: string
  source_url: string
  importance_score: number
  key_entities: string[] | null
  hashtags: string[] | null
  visual_potential: string | null
  raw_transcript: string | null
  embedding: string | null  // Supabase 返回 vector 为 string
  embedding_source: string | null
  publish_time: string | null
  author_name: string | null
  platform: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface NewsItemInsert {
  id?: string
  project_id: string
  date: string
  title: string
  original_title: string
  summary: string
  content_type?: string
  emotion_score?: string | null
  source_type: string
  source_name: string
  source_url: string
  importance_score?: number
  key_entities?: string[] | null
  hashtags?: string[] | null
  visual_potential?: string | null
  raw_transcript?: string | null
  embedding?: string | null
  embedding_source?: string | null
  publish_time?: string | null
  author_name?: string | null
  platform?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface NewsItemUpdate {
  id?: string
  project_id?: string
  date?: string
  title?: string
  original_title?: string
  summary?: string
  content_type?: string
  emotion_score?: string | null
  source_type?: string
  source_name?: string
  source_url?: string
  importance_score?: number
  key_entities?: string[] | null
  hashtags?: string[] | null
  visual_potential?: string | null
  raw_transcript?: string | null
  embedding?: string | null
  embedding_source?: string | null
  publish_time?: string | null
  author_name?: string | null
  platform?: string | null
  updated_at?: string
  deleted_at?: string | null
}

// ============================================================
// Draft 表类型（含 clusters UUID[]）
// ============================================================

export interface Draft {
  id: string
  project_id: string
  date: string
  status: string
  language: string
  total_items: number
  new_count: number
  duplicate_count: number
  clusters: string[] | null
  content: string | null
  created_at: string
  approved_at: string | null
  updated_at: string
  deleted_at: string | null
}

export interface DraftInsert {
  id?: string
  project_id: string
  date: string
  status?: string
  language?: string
  total_items?: number
  new_count?: number
  duplicate_count?: number
  clusters?: string[] | null
  content?: string | null
  created_at?: string
  approved_at?: string | null
  updated_at?: string
  deleted_at?: string | null
}

export interface DraftUpdate {
  id?: string
  project_id?: string
  date?: string
  status?: string
  language?: string
  total_items?: number
  new_count?: number
  duplicate_count?: number
  clusters?: string[] | null
  content?: string | null
  approved_at?: string | null
  updated_at?: string
  deleted_at?: string | null
}

// ============================================================
// Cluster 表类型（含 cluster_refs JSONB）
// ============================================================

export interface ClusterRef {
  item_id: string
  source_name: string
  source_url: string
  viewpoint_summary: string
  viewpoint_stance: string
}

export interface Cluster {
  id: string
  project_id: string
  draft_id: string | null
  date: string
  cluster_theme: string
  core_insight: string
  cluster_refs: ClusterRef[]
  viewpoint_conflict: string | null
  cluster_importance: number
  suggested_angle: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ClusterInsert {
  id?: string
  project_id: string
  draft_id?: string | null
  date: string
  cluster_theme: string
  core_insight: string
  cluster_refs?: ClusterRef[]
  viewpoint_conflict?: string | null
  cluster_importance?: number
  suggested_angle?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface ClusterUpdate {
  id?: string
  project_id?: string
  draft_id?: string | null
  date?: string
  cluster_theme?: string
  core_insight?: string
  cluster_refs?: ClusterRef[]
  viewpoint_conflict?: string | null
  cluster_importance?: number
  suggested_angle?: string | null
  updated_at?: string
  deleted_at?: string | null
}

// ============================================================
// Article 表类型
// ============================================================

export interface Article {
  id: string
  project_id: string
  draft_id: string
  date: string
  language: string
  title: string
  summary: string
  content: string
  publish_time: string
  author_name: string | null
  platform: string | null
  raw_url: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ArticleInsert {
  id?: string
  project_id: string
  draft_id: string
  date: string
  language?: string
  title: string
  summary: string
  content: string
  publish_time?: string
  author_name?: string | null
  platform?: string | null
  raw_url?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface ArticleUpdate {
  id?: string
  project_id?: string
  draft_id?: string
  date?: string
  language?: string
  title?: string
  summary?: string
  content?: string
  publish_time?: string
  author_name?: string | null
  platform?: string | null
  raw_url?: string | null
  updated_at?: string
  deleted_at?: string | null
}

// ============================================================
// Database 接口（Supabase 类型定义）
// ============================================================

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: ProjectUpdate
      }
      llm_config: {
        Row: LlmConfig
        Insert: LlmConfigInsert
        Update: LlmConfigUpdate
      }
      news_items: {
        Row: NewsItem
        Insert: NewsItemInsert
        Update: NewsItemUpdate
      }
      drafts: {
        Row: Draft
        Insert: DraftInsert
        Update: DraftUpdate
      }
      clusters: {
        Row: Cluster
        Insert: ClusterInsert
        Update: ClusterUpdate
      }
      articles: {
        Row: Article
        Insert: ArticleInsert
        Update: ArticleUpdate
      }
    }
    Functions: {
      insert_draft_with_dependencies: {
        Args: {
          p_project_id: string
          p_date: string
          p_language: string
          p_news_items: Json
          p_clusters: Json
          p_draft: Json
        }
        Returns: string
      }
    }
  }
}