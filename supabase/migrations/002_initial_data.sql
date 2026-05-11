-- ============================================================
-- Migration: 002_initial_data.sql
-- Version: 1.2
-- Description: NewsHot 初始化数据（Project 记录、默认 LLM 配置）
-- ============================================================

-- ============================================================
-- UP: 正向迁移
-- ============================================================

-- 创建 NewsHot 应用 Project 记录
INSERT INTO projects (name, domain, description, settings)
VALUES (
    'newshot',
    'AI',
    'NewsHot - AI新闻聚合平台',
    '{"output_languages": ["zh"]}'
);

-- 创建默认 LLM 配置（使用 Deepseek v4-flash）
-- 注意：api_key 需要在实际部署时通过环境变量注入
-- 此处使用占位符，实际部署时需替换为真实 API Key
INSERT INTO llm_config (
  project_id,
  provider,
  base_url,
  api_key,
  model,
  validated_at,
  available_models
)
VALUES (
    (SELECT id FROM projects WHERE name = 'newshot'),
    'deepseek',
    'https://api.deepseek.com',
    'PLACEHOLDER_API_KEY_REPLACE_ON_DEPLOYMENT',
    'deepseek-v4-flash',
    NOW(),
    ARRAY['deepseek-v4-flash', 'deepseek-v4-pro']
);

-- ============================================================
-- DOWN: 回滚（必须有）
-- ============================================================

-- 删除默认 LLM 配置
DELETE FROM llm_config
WHERE project_id = (SELECT id FROM projects WHERE name = 'newshot');

-- 删除 NewsHot Project 记录
DELETE FROM projects WHERE name = 'newshot';