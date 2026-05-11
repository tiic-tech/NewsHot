# 前端任务清单

> 基于 PRD v1.1 和 DESIGN_SYSTEM v1.0，每任务对应一个页面或核心组件
> 状态：[ ] 待实现 | [x] 已完成 | [→] 进行中

---

## 模块 A：基础设施（Priority: P0）

### [ ] TASK-F01：Next.js 项目初始化
- 对应契约：TECH_SPEC.md - 项目目录结构
- 验收标准：
  - Next.js 15 + App Router 初始化
  - Tailwind CSS 配置
  - TypeScript 配置
  - next.config.js（basePath 配置）

### [ ] TASK-F02：CSS 变量引入
- 对应契约：DESIGN_SYSTEM.md + src/styles/variables.css
- 验收标准：
  - variables.css 引入 globals.css
  - 颜色/字体/间距/圆角/阴影变量可用
  - 暗色模式变量配置

### [ ] TASK-F03：API Base 工具函数
- 对应契约：TECH_SPEC.md - 部署路径规范
- 验收标准：
  - `lib/utils/api-base.ts` 创建
  - getApiBase() 函数实现
  - 子路径部署支持

### [ ] TASK-F04：类型定义导入
- 对应契约：API_CONTRACT.md + DB_SCHEMA.md
- 验收标准：
  - `lib/types/api.ts` API 响应类型
  - `lib/types/db.ts` 数据库实体类型
  - `lib/types/tools.ts` Tool 参数和返回类型

---

## 模块 B：基础 UI 组件（Priority: P0）

### [ ] TASK-F05：Bullet List 组件
- 对应契约：DESIGN_SYSTEM.md #bullet-list
- 验收标准：
  - `components/ui/bullet-list.tsx` 创建
  - 结构：publishTime | authorName | platform | title | abstract | coreInsights | rawUrl
  - 最小高度 44px
  - 无点击跳转（数据源场景）

### [ ] TASK-F06：Cluster Card 组件
- 对应契约：DESIGN_SYSTEM.md #cluster-card
- 验收标准：
  - `components/ui/cluster-card.tsx` 创建
  - 展示：clusterTheme、coreInsight、itemsCount、importanceScore
  - 展开/折叠交互样式
  - Cluster 边框高亮色（Primary 500）

### [ ] TASK-F07：Chatbot 输入框组件
- 对应契约：DESIGN_SYSTEM.md #chatbot-input
- 验收标准：
  - `components/ui/chatbot-input.tsx` 创建
  - 输入框样式（radius-md、border-default）
  - 发送按钮（Primary 500、悬停态 Primary 600）
  - 加载状态 spinner

### [ ] TASK-F08：Markdown 渲染组件
- 对应契约：DESIGN_SYSTEM.md #markdown-renderer
- 验收标准：
  - `components/ui/markdown-renderer.tsx` 创建
  - 标题样式（H1 2xl → H6 sm）
  - 链接样式（Primary 500）
  - 代码块样式（font-mono、bg-muted）

### [ ] TASK-F09：Skeleton 加载组件
- 对应契约：DESIGN_SYSTEM.md #skeleton
- 验收标准：
  - `components/ui/skeleton.tsx` 创建
  - 骨架屏样式（bg-muted、animate-pulse）
  - Bullet List 骨架变体
  - Cluster Card 骨架变体

### [ ] TASK-F10：Thinking 显示组件
- 对应契约：DESIGN_SYSTEM.md #thinking-display
- 验收标准：
  - `components/ui/thinking-display.tsx` 创建
  - 可折叠显示（bg-muted、border-left Primary 500）
  - 滚动锁定（max-height 300px）
  - 收起态只显示"已思考 X 秒"

---

## 模块 C：LLM 配置组件（Priority: P0）

### [ ] TASK-F11：LLM 配置面板
- 对应契约：DESIGN_SYSTEM.md #llm-config-panel + API_CONTRACT.md #auth-config
- 验收标准：
  - Provider 选择下拉框（deepseek/openai/anthropic）
  - base_url 输入框
  - api_key 输入框
  - 验证按钮（自动 POST /api/v1/auth/config/validate）
  - 模型选择下拉框（验证成功后更新）
  - Apply/确认按钮
  - 验证状态显示（成功绿色/失败红色）

### [ ] TASK-F12：useConfig Hook
- 验收标准：
  - `hooks/use-config.ts` 创建
  - LLM 配置状态管理
  - 验证调用逻辑
  - 模型列表更新

---

## 模块 D：页面实现（Priority: P0）

### [ ] TASK-F13：首页 (/)
- 对应契约：TECH_SPEC.md - app/page.tsx
- 验收标准：
  - 页面布局（Header + 主内容 + Sidebar）
  - 今日摘要概览卡片
  - 快速导航入口（Sources/Articles/Review）

### [ ] TASK-F14：数据源页面 (/sources)
- 对应契约：API_CONTRACT.md #sources-list + PRD F11
- 验收标准：
  - Bullet List 展示数据源
  - 分页支持（page/pageSize）
  - 日期过滤（默认今天）
  - 无点击跳转
  - Skeleton 加载态

### [ ] TASK-F15：文章列表页面 (/articles)
- 对应契约：API_CONTRACT.md #articles-list + PRD F12
- 验收标准：
  - Bullet List 展示（复用组件）
  - 新增点击跳转功能
  - 分页支持
  - 语言过滤

### [ ] TASK-F16：文章详情页面 (/articles/:id)
- 对应契约：API_CONTRACT.md #articles-detail
- 验收标准：
  - Markdown 渲染完整文章
  - 关联 clusters 展示
  - 返回列表按钮

### [ ] TASK-F17：审核页面 (/review/:id)
- 对应契约：API_CONTRACT.md #draft-detail + PRD F03
- 验收标准：
  - Clusters 列表展示（按 importance 排序）
  - Cluster Card 展开/折叠
  - Chatbot 输入框集成
  - Approve 按钮
  - 审核成功跳转

### [ ] TASK-F18：摘要页面 (/digest/:date)
- 对应契约：TECH_SPEC.md - app/digest/[date]/page.tsx
- 验收标准：
  - 按日期查看 draft
  - Markdown 摘要展示
  - Clusters 概览

---

## 模块 E：Chatbot Tools 集成（Priority: P0）

### [ ] TASK-F19：useTools Hook
- 验收标准：
  - `hooks/use-tools.ts` 创建
  - Tool 调用状态管理
  - SSE 流式调用支持（EventSource）
  - thinking/content/done 事件处理

### [ ] TASK-F20：Chatbot Tools 调用逻辑
- 对应契约：API_CONTRACT.md #tools
- 验收标准：
  - 14 个 Tool 意图识别（用户指令 → ToolName）
  - POST /api/v1/tools 调用
  - POST /api/v1/tools/stream 流式调用
  - 错误处理和反馈

### [ ] TASK-F21：Tool 反馈渲染
- 验收标准：
  - Tool 执行中：spinner + 状态文字
  - Tool 成功：简洁反馈（如"已删除 item_005"）
  - Tool 失败：错误提示 + 建议恢复方案

---

## 模块 F：语言切换（Priority: P1）

### [ ] TASK-F22：语言切换面板
- 对应契约：API_CONTRACT.md #language-switch + PRD F12
- 验收标准：
  - 语言勾选框（zh/en）
  - 多语言输出支持
  - POST /api/v1/language/switch 调用

---

## 模块 G：布局组件（Priority: P0）

### [ ] TASK-F23：Header 组件
- 对应契约：DESIGN_SYSTEM.md
- 验收标准：
  - Logo + 导航菜单
  - LLM 配置入口
  - 语言切换入口

### [ ] TASK-F24：Sidebar 组件
- 对应契约：DESIGN_SYSTEM.md
- 验收标准：
  - Chatbot 输入框嵌入
  - Tool 反馈展示区域
  - Thinking 显示区域

---

## 任务统计

| 模块 | 任务数 | Priority |
|------|--------|----------|
| A 基础设施 | 4 | P0 |
| B 基础 UI 组件 | 6 | P0 |
| C LLM 配置 | 2 | P0 |
| D 页面实现 | 6 | P0 |
| E Chatbot Tools | 3 | P0 |
| F 语言切换 | 1 | P1 |
| G 布局组件 | 2 | P0 |
| **总计** | **24** | - |

---

> **实现原则：所有样式数值必须来自 DESIGN_SYSTEM.md 的 CSS 变量，不得硬编码颜色值、字号、间距值。**