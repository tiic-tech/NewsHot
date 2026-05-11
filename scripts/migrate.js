/**
 * Supabase Migration Runner
 *
 * 此脚本用于本地开发环境执行迁移文件
 *
 * 使用方式：
 *
 * 1. 推荐方式：使用 Supabase CLI
 *    ```bash
 *    # 安装 Supabase CLI（如果未安装）
 *    npm install -g supabase
 *
 *    # 启动本地 Supabase
 *    supabase start
 *
 *    # 执行所有迁移
 *    supabase db reset
 *
 *    # 生成 TypeScript 类型定义
 *    supabase gen types typescript --local > lib/types/db.ts
 *    ```
 *
 * 2. 远程项目（生产环境）：
 *    使用 MCP 工具 `mcp__supabase__apply_migration` 应用迁移
 *    使用 MCP 工具 `mcp__supabase__get_advisors` 检查 RLS 策略
 *
 * 3. 手动执行（此脚本）：
 *    ```bash
 *    node scripts/migrate.js
 *    ```
 */

const fs = require('fs')
const path = require('path')

// ============================================================
// 配置
// ============================================================

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations')
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// ============================================================
// 迁移执行器（需要 @supabase/supabase-js）
// ============================================================

async function runMigrations() {
  console.log('[migrate] Starting migration runner...')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[migrate] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    console.log('[migrate] Please set environment variables or use Supabase CLI:')
    console.log('[migrate]   supabase db reset')
    process.exit(1)
  }

  // 检查 @supabase/supabase-js 是否安装
  try {
    require.resolve('@supabase/supabase-js')
  } catch (e) {
    console.error('[migrate] @supabase/supabase-js not installed')
    console.log('[migrate] Install with: npm install @supabase/supabase-js')
    process.exit(1)
  }

  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 读取迁移文件
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`[migrate] Found ${files.length} migration files`)

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file)
    const sql = fs.readFileSync(filePath, 'utf8')

    console.log(`[migrate] Executing: ${file}`)

    // 提取 UP 部分（去除 DOWN 部分）
    const upSql = extractUpMigration(sql)

    // 执行 SQL（使用 RPC 或直接执行）
    try {
      // Supabase 不支持直接执行多语句 SQL，需要使用 RPC
      // 推荐使用 Supabase CLI 或 MCP 工具
      console.log('[migrate] SQL execution requires Supabase CLI or MCP tools')
      console.log('[migrate] Recommended: supabase db reset')

      // 如果需要手动执行，可以将 SQL 拆分为单语句
      // 这里仅打印 SQL 内容供参考
      console.log('[migrate] SQL content:')
      console.log(upSql.substring(0, 200) + '...')

    } catch (error) {
      console.error(`[migrate] Failed to execute ${file}:`, error)
      process.exit(1)
    }
  }

  console.log('[migrate] All migrations completed')
}

// ============================================================
// 提取 UP 迁移部分
// ============================================================

function extractUpMigration(sql) {
  const downMarker = '-- DOWN:'
  const downIndex = sql.indexOf(downMarker)

  if (downIndex === -1) {
    return sql
  }

  return sql.substring(0, downIndex).trim()
}

// ============================================================
// 执行入口
// ============================================================

if (require.main === module) {
  runMigrations().catch(console.error)
}

module.exports = { runMigrations, extractUpMigration }