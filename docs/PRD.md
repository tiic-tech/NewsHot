# 产品需求文档（PRD）
> 版本: 1.0 | 作者: product-manager | 日期: 2026-05-11
> ⚠️ 标注 [假设] 的内容需产品确认

---

## 一、项目概述

**产品名称**：Grabout Mind Record - AI新闻聚合平台

**一句话描述**：面向自媒体创作者的AI新闻聚合与内容生产平台，自动将碎片新闻转化为结构化摘要，支持智能审核与多风格内容输出。

**核心价值**：
- **Cluster聚合**：观点对话式呈现，而非碎片罗列（差异化于传统新闻聚合）
- **完整流水线**：新闻→摘要→文章→PPT→视频→发布（一站式内容生产线）
- **成本优化**：阿里云百炼Embedding API，月成本仅¥0.45
- **智能审核**：Chatbot + 14个Tools，自然语言交互调整内容

---

## 二、目标用户

**主要用户**：
- AI行业观察者 / 自媒体运营者
- 年龄：25-40岁
- 技术素养：High
- 工作流程：早晨浏览AI新闻源 → 筛选有价值内容 → 撰写自媒体文章 → 制作视频/PPT → 多平台发布
- 使用场景：每日早晨6点，需要快速掌握昨日AI大事件

**用户痛点**：
- 信息源分散，每天浏览耗时1-2小时
- 新闻碎片化，缺乏主题关联
- 内容生产流程繁琐，重复性工作多
- 缺乏多风格内容生成能力

**使用频率**：高频（日活）

---

## 三、功能范围

### MVP 范围（本期实现）

| 编号 | 功能名称 | 优先级 | 简述 |
|------|---------|--------|------|
| F01 | 定时抓取与摘要生成 | P0 必做 | 每天04:00自动抓取follow-builders feed，生成cluster聚合摘要 |
| F02 | 阿里云百炼Embedding生成 | P0 必做 | 调用阿里云百炼text-embedding-v4 API生成向量，支持cluster聚合 |
| F03 | Chatbot审核交互 | P0 必做 | 通过LLM Chatbot调用14个Tools进行内容CRUD操作 |
| F04 | Markdown摘要展示 | P0 必做 | 前端以Markdown格式展示draft内容，支持cluster展开/折叠 |
| F05 | Upstash去重与缓存 | P0 必做 | 48小时TTL去重hash，重试队列管理 |
| F06 | Vercel全栈部署 | P0 必做 | 前端+后端+Cron一体化部署，零运维 |
| F07 | 定时任务调度 | P0 必做 | Vercel Cron Jobs实现03:00清理+04:00抓取 |
| F08 | 审核流程管理 | P0 必做 | draft状态流转：draft → approved → 流水线触发 |
| F09 | 重试策略与边缘Case防护 | P1 重要 | 3次重试+指数退避，8种边缘case防护规则 |
| F10 | CI/CD自动化 | P1 重要 | GitHub Actions验证+Vercel自动部署 |

### 本期不做（明确排除）

| 功能 | 排除原因 |
|------|---------|
| 自建爬虫系统 | MVP复用follow-builders feed，V1.5实现 |
| 多Project支持 | MVP单Project（AI领域），V1.5实现 |
| 用户认证系统 | MVP单用户（用户本人），后续扩展 |
| 阶段2-5流水线 | MVP仅阶段1（新闻→摘要），后续迭代 |
| 历史检索UI | MVP数据积累不足，后续迭代 |
| 多语言摘要 | MVP中文优先，后续扩展 |

---

## 四、用户故事与验收标准

### US01：每日摘要生成与审核（对应 F01, F02, F05, F07）

**故事**：作为自媒体创作者，我希望每天早晨6点自动生成AI大事件摘要draft，以便快速掌握昨日行业动态并决策是否发布。

**验收标准**：
- [ ] 场景1：给定每日04:00定时任务触发，当抓取feed成功时，则生成draft供审核
- [ ] 场景2：给定feed无新内容时，当系统检测到空feed，则生成空draft并标记"无重大事件"
- [ ] 场景3：给定LLM调用失败时，当系统检测到错误，则使用fallback策略（原标题作为摘要）
- [ ] 场景4：给定网络超时时，当系统检测到超时，则触发指数退避重试（最多3次）
- [ ] 场景5：给定Embedding API失败时，当系统检测到错误，则exponential_backoff重试（最多3次）
- [ ] 性能：抓取流水线 < 20分钟完成（含重试）
- [ ] 性能：阿里云百炼embedding < 2分钟（100条新闻）
- [ ] 成功率：每日draft生成成功率 > 95%

### US02：预览审核与内容调整（对应 F03, F04, F08）

**故事**：作为自媒体创作者，我希望通过Chatbot快速调整摘要内容，以便确保内容质量符合自媒体传播标准。

**验收标准**：
- [ ] 场景1：给定用户打开审核界面时，当draft已生成，则展示clusters列表（按importance排序）
- [ ] 场景2：给定用户点击cluster卡片时，当展开操作触发，则显示详细items列表
- [ ] 场景3：给定用户输入调整指令时，当Chatbot解析意图成功，则调用对应Tool执行操作
- [ ] 场景4：给定Tool执行成功时，当操作完成，则返回简洁反馈（如"已删除item_005"）
- [ ] 场景5：给定Tool执行失败时，当错误发生，则提示错误+建议恢复方案
- [ ] 场景6：给定用户点击approve按钮时，当draft审核通过，则更新状态并触发后续流水线
- [ ] 性能：Chatbot Tool响应 < 5秒
- [ ] 性能：Page加载 < 3秒
- [ ] 性能：approve操作 < 2秒
- [ ] 审核通过率：> 80%（无需大量人工调整）

### US03：定时任务与缓存管理（对应 F05, F07）

**故事**：作为系统管理员，我希望定时任务自动清理过期数据并抓取新内容，以便系统稳定运行且存储不溢出。

**验收标准**：
- [ ] 场景1：给定每日03:00清理任务触发时，当Upstash Redis清理执行，则删除超过24小时的数据
- [ ] 场景2：给定每日04:00抓取任务触发时，当feed抓取成功，则新数据存储到Supabase
- [ ] 场景3：给定去重hash计算时，当title+url完全一致，则不重复拉取
- [ ] 场景4：给定重试队列满时，当任务达到最大重试次数（3次），则标记失败并发送告警
- [ ] 可用性：定时任务成功率 > 95%

---

## 五、非功能性需求

| 类别 | 要求 | 量化指标 |
|------|------|---------|
| 性能 | 抓取流水线响应时间 | < 20分钟（含重试） |
| 性能 | Embedding生成时间 | < 2分钟（100条新闻） |
| 性能 | Chatbot Tool响应时间 | P95 < 3秒，P99 < 5秒 |
| 性能 | Page加载时间 | P95 < 2秒，P99 < 3秒 |
| 性能 | approve操作响应时间 | P95 < 1秒，P99 < 2秒 |
| 成本 | Embedding API成本 | < ¥1/月（预估¥0.45/月） |
| 成本 | LLM调用成本 | 按实际使用计费（Deepseek为主） |
| 并发 | 支持同时在线用户数 | MVP单用户，后续扩展 |
| 安全 | Cron请求鉴权 | CRON_SECRET验证来源 |
| 安全 | API密钥管理 | Vercel环境变量存储，不暴露在代码中 |
| 兼容性 | 浏览器支持 | Chrome/Firefox/Safari/Edge最新两个版本 |
| 可用性 | 服务可用率 | 99%（月均不超过 7.2 小时宕机） |
| 可用性 | 定时任务成功率 | > 95% |
| 可访问性 | 键盘导航 | Tab切换焦点，Enter激活，Esc取消 |
| 可访问性 | 色彩对比 | WCAG AA标准（对比度 > 4.5:1） |
| 可访问性 | 屏幕阅读器 | ARIA labels for clusters, items, buttons |

---

## 六、假设与待确认项

> 以下内容基于合理假设，开始开发前需产品/业务确认

- [假设] 用户只有一种角色（自媒体创作者），无需权限分级
- [假设] 用户技术素养High，可以接受Chatbot交互方式
- [假设] follow-builders feed稳定更新，不会在MVP期间停止服务
- [假设] 阿里云百炼API稳定性满足MVP需求，月成本< ¥1
- [假设] Vercel免费额度覆盖MVP部署需求（2个Cron Jobs需付费$0.50/月）
- [假设] Deepseek LLM API稳定性满足MVP需求，成本可控
- [假设] 单用户使用，无并发压力
- [假设] 中文内容为主，无需多语言支持
- [待确认] 阿里云百炼API Key申请流程和权限配置
- [待确认] Vercel Cron Jobs付费计划（免费额度仅1个Cron，需2个）
- [待确认] LLM多家支持的具体实现（Deepseek/OpenAI/Anthropic切换逻辑）
- [待确认] 前端UI设计稿和交互细节（是否需要设计文档）
- [待确认] Chatbot System Prompt的具体措辞和Tool优先级
- [待确认] Cluster聚合算法的相似度阈值和调优策略

---

## 七、名词解释

| 术语 | 定义 |
|------|------|
| Cluster | 新闻聚合主题单元，包含多个相关news_items，按观点对话维度聚合 |
| Draft | 每日生成的摘要草稿，包含多个clusters，状态为draft/approved/rejected |
| News Item | 单条新闻条目，来自follow-builders feed（X/Podcast/Blog） |
| Embedding | 向量嵌入，使用阿里云百炼text-embedding-v4 API生成，1024维度 |
| Tool | Chatbot可调用的操作工具，共14个，用于内容CRUD和审核流程 |
| Upstash | Vercel原生集成的边缘Redis服务，用于去重hash和重试队列 |
| pgvector | PostgreSQL的向量扩展，用于向量存储和相似度检索 |
| Vercel Cron Jobs | Vercel平台提供的定时任务服务，替代传统node-cron |
| follow-builders | 开源项目，提供AI新闻源feed（25个X账号 + 6个Podcast + 2个Blog） |
| Core Insight | Cluster的核心洞察，2-3句话总结主题观点 |
| Content Type | 内容类型分类：争议型、恐虑型、干货型、故事型、其他 |
| Importance Score | 新闻重要性评分，1-10分，用于排序展示 |

---

## 八、成功指标

| 指标 | 目标值 | 衡量方式 |
|------|--------|---------|
| 每日draft生成成功率 | > 95% | 监控定时任务执行日志 |
| 审核通过率 | > 80% | 统计approve操作占比 |
| 后续流水线对接成功率 | > 90% | 监控approve后流水线触发成功率 |
| Chatbot Tool响应时间 | P99 < 5秒 | 监控Tool API响应时间 |
| 用户满意度 | 定性反馈 | 用户访谈和问卷调查 |

---

## 九、风险预案

| 风险 | 概率 | 影响 | 缓解措施 | 应急方案 |
|------|------|------|---------|---------|
| follow-builders feed停止更新 | Low | Critical | 监控feed更新频率 | 切换自建爬虫（Phase 2提前） |
| LLM API调用失败 | Medium | Major | fallback策略+重试 | 使用原标题摘要，人工补充 |
| Upstash Redis服务中断 | Low | Major | Vercel高可用架构 | 暂时跳过去重，人工审核重复 |
| 阿里云百炼API失败 | Medium | Major | 重试策略+多provider备选 | OpenAI/Cohere API备选 |
| Embedding API超时 | Low | Minor | 批量请求优化+timeout设置 | 减少batch_size重试 |
| Vercel部署失败 | Low | Major | Preview验证+rollback | 回滚到上一版本 |
| Cron Job执行失败 | Low | Minor | Vercel Dashboard监控 | 手动触发API端点 |

---

## 十、里程碑

| 阶段 | 目标 | 时间 | 交付物 |
|------|------|------|--------|
| Phase 1: MVP | 验证阶段1完整流水线（新闻聚合+摘要生成+预览审核） | 3-4周 | Vercel部署demo，完整流程验证 |
| Phase 2: 自建爬虫系统 | 可配置信息源，自动抓取+健康报告 | 后续迭代 | SourceConfig API，爬虫服务 |
| Phase 3: 多Project支持 | 多领域Project并行运行 | 后续迭代 | Project CRUD API，多Project调度 |
| Phase 4: 流水线阶段2-5 | 5阶段全自动化流水线 | 后续迭代 | 文章→PPT→视频→多平台发布 |

---

## 十一、附录

### 技术栈

| 层级 | 技术选型 | 选型理由 |
|------|---------|---------|
| 前端框架 | Next.js (React) | SSR支持，SEO友好，全栈能力 |
| 后端 | Next.js Route Handlers | 全Vercel部署一体化，无需单独后端服务 |
| 数据库 | Supabase (PostgreSQL) | 已有MCP，支持pgvector，JSON字段友好 |
| 向量存储 | Supabase pgvector | 一体化服务，MVP简单 |
| 缓存 | Upstash Redis | Vercel原生集成，边缘缓存，零运维 |
| Embedding | 阿里云百炼text-embedding-v4 | 成本优化(¥0.0005/1K tokens)，中文友好 |
| LLM | Deepseek（起点）+ 多家支持 | 成本优化，后续支持多家 |
| 定时任务 | Vercel Cron Jobs | 云原生，可靠性高，无需进程持久化 |
| 部署 | Vercel（全栈一体化） | 零运维部署，自动CI/CD，边缘函数支持 |

### 参考资源

- follow-builders开源项目：https://github.com/follow-makers/follow-builders
- 阿里云百炼Embedding API文档：https://dashscope.aliyuncs.com
- Vercel部署文档：https://vercel.com/docs
- Supabase文档：https://supabase.com/docs
- Upstash Redis文档：https://upstash.com/docs/redis

---

**文档状态**：Complete - Ready for MVP Development  
**最后更新**：2026-05-11