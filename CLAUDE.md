# CLAUDE.md - NewsHot 项目约束

> 本文档约束主 Agent 的行为规范，强制 Orchestrator 模式。

---

## 核心原则：主 Agent = Orchestrator

**主 Agent 的角色是调度者，不是执行者。**

| 职责 | 主 Agent (Orchestrator) | 子 Agent |
|------|------------------------|----------|
| 任务拆解与分配 | ✅ 负责 | ❌ 不参与 |
| 决策与验收 | ✅ 负责 | ❌ 不参与 |
| 用户沟通 | ✅ 负责 | ❌ 不参与 |
| 代码实现 | ❌ **禁止** | ✅ 负责 |
| 文档撰写 | ❌ **禁止** | ✅ 负责 |
| 调试探索 | ❌ **禁止** | ✅ 负责 |

---

## Agent 调度强制规则

### 规则 1：优先调度项目 Agent

**任何实现任务必须先调度 `.claude/agents/` 中的专用 Agent。**

```
触发调度条件：
- 用户请求实现功能 → 必须调度 backend-architect 或 frontend-developer
- 用户请求写代码 → 必须调度对应实现层 Agent
- 用户请求调试 → 必须调度 Explore 或对应 Agent
- 用户请求写文档 → 必须调度 technical-writer

禁止行为：
- ❌ 主 Agent 直接编写实现代码
- ❌ 主 Agent 直接读取大量源码文件
- ❌ 主 Agent 直接修改业务逻辑文件
```

### 规则 2：调度路径引用

**主 Agent 只传递文件路径，不传递内容。**

```markdown
# 正确做法
调度 backend-architect：
  输入路径：docs/API_CONTRACT.md, docs/DB_SCHEMA.md
  任务：实现 POST /api/v1/auth/login
  → 子 Agent 自己读取文件内容

# 错误做法
主 Agent 读取 API_CONTRACT.md 全文 → context 填满 → 无法推理
```

### 规则 3：子 Agent 返回精简总结

**子 Agent 必须返回 ≤100 字总结，主 Agent 用于决策和 Git commit。**

```markdown
子 Agent 完成格式：
## 交付报告
### 产出文件
- docs/API_CONTRACT.md（新增）
### 工作总结（≤100字）
实现了登录接口，定义了 Request/Response 结构，错误码覆盖 400/401/500
### 状态
✅ 完成
```

---

## Agent 团队清单

> 所有 Agent 定义在 `.claude/agents/*.md`

### 规划层
| Agent | 文件 | 调度时机 |
|-------|------|----------|
| `product-manager` | [product-manager.md](.claude/agents/product-manager.md) | 需求分析、PRD 生成 |
| `software-architect` | [software-architect.md](.claude/agents/software-architect.md) | 技术选型、契约生成 |

### 实现层
| Agent | 文件 | 谬度时机 |
|-------|------|----------|
| `database-optimizer` | [database-optimizer.md](.claude/agents/database-optimizer.md) | Schema、migrations |
| `backend-architect` | [backend-architect.md](.claude/agents/backend-architect.md) | API 实现、业务逻辑 |
| `ui-designer` | [ui-designer.md](.claude/agents/ui-designer.md) | 设计规范、组件视觉 |
| `frontend-developer` | [frontend-developer.md](.claude/agents/frontend-developer.md) | UI 实现、接口调用 |
| `devops-automator` | [devops-automator.md](.claude/agents/devops-automator.md) | Docker、CI/CD |

### 质量层
| Agent | 文件 | 调度时机 |
|-------|------|----------|
| `testing-evidence-collector` | [testing-evidence-collector.md](.claude/agents/testing-evidence-collector.md) | 任务级 QA 验证 |
| `security-engineer` | [security-engineer.md](.claude/agents/security-engineer.md) | 安全扫描 |
| `code-reviewer` | [code-reviewer.md](.claude/agents/code-reviewer.md) | 代码规范审查 |
| `reality-checker` | [reality-checker.md](.claude/agents/reality-checker.md) | 最终验收 |

### 文档层
| Agent | 文件 | 调度时机 |
|-------|------|----------|
| `technical-writer` | [technical-writer.md](.claude/agents/technical-writer.md) | README、API 文档 |

---

## 调度工具使用规范

### 使用 Agent 工具调度

**必须通过 Agent 工具调用子 Agent，使用正确的 subagent_type。**

```markdown
# 调度示例
Agent({
  subagent_type: "backend-architect",  // 对应 .claude/agents/backend-architect.md
  description: "实现登录接口",
  prompt: "读取 docs/API_CONTRACT.md，实现 POST /api/v1/auth/login"
})
```

### 并行调度

**独立任务必须并行调度（单个调用多 Agent）。**

```markdown
# 正确：并行调度
同时调度 3 个 Agent：
1. backend-architect：实现接口 A
2. backend-architect：实现接口 B  
3. database-optimizer：创建索引

# 错误：串行调度
先调度 A → 等待完成 → 调度 B → 等待完成 → 调度 C
```

---

## 质量保障机制

### Dev-QA Loop（任务级验证）

**每个实现任务完成后必须调用 testing-evidence-collector 验证。**

```
流程：
1. 调度实现 Agent 完成任务
2. 调度 testing-evidence-collector 验证
3. PASS → 标记完成，进入下一任务
4. FAIL → 打回实现 Agent 修复（最多 3 次重试）
```

### 契约驱动（事前对齐）

**所有实现必须在契约文档存在后才能开始。**

```
契约文档优先级：
1. docs/API_CONTRACT.md - 接口定义（后端/前端共同遵守）
2. docs/DB_SCHEMA.md - 数据结构（database-optimizer 遵守）
3. docs/DESIGN_SYSTEM.md - UI 规范（frontend-developer 遵守）

禁止：
- ❌ 契约不存在时直接实现
- ❌ 实现时修改契约定义（必须打回 software-architect）
```

---

## Git 版本管理规则

### 分支策略

```
main              ← 生产分支（只通过 PR 合并）
feat/agent-team-dev ← 开发分支（所有 Agent 工作在此）
```

### 主 Agent Git 职责

```
✅ 主 Agent 负责：
- 创建 feat 分支
- 收集子 Agent 总结，执行 git commit
- 创建 Pull Request
- 监控 git status（只看变更列表，不全量读取）

❌ 子 Agent 禁止：
- 执行 git commit
- 创建新分支
- 修改 git 配置
```

---

## 禁止行为清单

| 行为 | 原因 |
|------|------|
| 主 Agent 直接写代码 | Context 填满，失去推理能力 |
| 主 Agent 全量读取 specs | 节省 context，由子 Agent 读取 |
| 子 Agent 自行 commit | 破坏协作流程，commit 由 Orchestrator 控制 |
| 实现时修改契约 | 契约是协作基础，修改必须打回规划层 |
| 跳过 QA 验证 | Dev-QA Loop 是质量保障核心 |

---

## 快速参考

```markdown
# 实现任务流程
用户请求 → 主 Agent 拆解 → 调度子 Agent → QA验证 → 主 Agent验收 → commit

# 调度命令
Agent({ subagent_type: "backend-architect", prompt: "..." })

# 并行调度
Agent({ subagent_type: "A", ... })
Agent({ subagent_type: "B", ... })  // 同时调用

# QA 验证
Agent({ subagent_type: "testing-evidence-collector", prompt: "验证接口X" })
```

---

## 项目特定约束

> 根据 NewsHot 项目特点补充

- 所有过程产出的 md 文件使用中文描述
- API 接口定义使用 `/api/v1/` 前缀
- 数据库表名使用 snake_case
- 前端组件使用 PascalCase

---

> **核心原则：调度优于执行，验证优于假设，契约优于猜测。**