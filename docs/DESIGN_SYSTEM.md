# UI 设计规范 - NewsHot (AI新闻聚合平台)
> 版本: 1.0 | 技术栈: Next.js 15 + Tailwind CSS | 设计基准: 1440px Desktop / 375px Mobile
> 目标用户: 自媒体创作者 (25-40岁, High技术素养) | 使用频率: 高频日活

---

## 一、颜色体系

### 1.1 品牌色（Primary）
```css
--color-primary-50:    #EEF2FF;    /* 极浅背景 */
--color-primary-100:   #E0E7FF;    /* 浅色标签 */
--color-primary-200:   #C7D2FE;    /* 次级背景 */
--color-primary-300:   #A5B4FC;    /* 轻量强调 */
--color-primary-400:   #818CF8;    /* 可交互元素 */
--color-primary-500:   #6366F1;    /* 主色 - 品牌核心 */
--color-primary-600:   #4F46E5;    /* 深色主色 - 悬停态 */
--color-primary-700:   #4338CA;    /* 深色 - 激活态 */
--color-primary-800:   #3730A3;    /* 极深色 */
--color-primary-900:   #312E81;    /* 最深色 */
```

**使用场景**：
- Primary 500：品牌Logo、主按钮、Cluster卡片高亮边框
- Primary 600：按钮悬停态、链接激活态
- Primary 100：标签背景、选中项背景
- Primary 50：页面章节背景、空状态插图背景

### 1.2 功能色（Semantic Colors）
```css
/* 成功 */
--color-success-50:    #ECFDF5;
--color-success-500:   #10B981;    /* 成功状态 - Draft审核通过 */
--color-success-600:   #059669;    /* 悬停态 */

/* 警告 */
--color-warning-50:    #FFFBEB;
--color-warning-500:   #F59E0B;    /* 警告状态 - Draft待审核 */
--color-warning-600:   #D97706;    /* 悬停态 */

/* 错误/危险 */
--color-danger-50:     #FEF2F2;
--color-danger-500:    #EF4444;    /* 错误状态 - API失败、内容删除 */
--color-danger-600:    #DC2626;    /* 悬停态 */

/* 信息 */
--color-info-50:       #EFF6FF;
--color-info-500:      #3B82F6;    /* 信息提示 - Tool执行反馈 */
--color-info-600:      #2563EB;    /* 悬停态 */
```

### 1.3 中性色（Neutral Colors）
```css
/* 文字层级 */
--color-text-primary:    #111827;    /* 主要文字 - 标题、重要数据 */
--color-text-secondary:  #4B5563;    /* 次要文字 - 描述、辅助信息 */
--color-text-tertiary:   #9CA3AF;    /* 辅助文字 - 时间戳、占位符 */
--color-text-disabled:   #D1D5DB;    /* 禁用文字 - 不可交互元素 */

/* 背景层级 */
--color-bg-base:         #FFFFFF;    /* 页面基础背景 */
--color-bg-subtle:       #F9FAFB;    /* 卡片背景、下拉菜单 */
--color-bg-muted:        #F3F4F6;    /* 页面区块背景、分隔区域 */
--color-bg-emphasis:     #E5E7EB;    /* 强调背景 - 选中态 */

/* 边框层级 */
--color-border-default:  #E5E7EB;    /* 默认边框 */
--color-border-muted:    #F3F4F6;    /* 轻量边框 */
--color-border-emphasis: #D1D5DB;    /* 强调边框 */
```

### 1.4 暗色模式（Dark Mode）
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary:      #F9FAFB;
    --color-text-secondary:    #D1D5DB;
    --color-text-tertiary:     #9CA3AF;
    --color-text-disabled:     #6B7280;
    
    --color-bg-base:           #111827;
    --color-bg-subtle:         #1F2937;
    --color-bg-muted:          #374151;
    --color-bg-emphasis:       #4B5563;
    
    --color-border-default:    #374151;
    --color-border-muted:      #4B5563;
    --color-border-emphasis:   #6B7280;
    
    --color-primary-500:       #818CF8;
    --color-primary-600:       #6366F1;
  }
}
```

### 1.5 颜色使用规则
| 规则 | 说明 | 示例 |
|------|------|------|
| 主色限制 | 同一界面Primary色最多出现3处 | Cluster卡片边框 + 主按钮 + Logo |
| 背景层次 | 页面背景 ≠ 卡片背景，形成层次 | bg-muted(页面) + bg-base(卡片) |
| 文字层级 | 严格遵循4级文字色，不得自定义 | 标题(text-primary) + 描述(text-secondary) |
| 功能色语义 | 成功/警告/错误仅用于语义场景 | 不用红色做装饰色 |

---

## 二、字体体系

### 2.1 字号梯度（基于 Tailwind 默认）
```css
--font-size-xs:   0.75rem;    /* 12px - 辅助标签、时间戳 */
--font-size-sm:   0.875rem;   /* 14px - 次要文字、列表描述 */
--font-size-base: 1rem;       /* 16px - 正文、输入框（最小可读） */
--font-size-lg:   1.125rem;   /* 18px - 卡片标题、重要信息 */
--font-size-xl:   1.25rem;    /* 20px - 页面标题、Cluster标题 */
--font-size-2xl:  1.5rem;     /* 24px - 主标题、大数字 */
--font-size-3xl:  1.875rem;   /* 30px - 醒目标题 */
--font-size-4xl:  2.25rem;    /* 36px - Hero标题 */
```

### 2.2 行高规则
```css
--line-height-none:    1;      /* 单行标题、数字 */
--line-height-tight:   1.25;   /* 标题类，紧凑 */
--line-height-snug:    1.375;  /* 小标题、单行文本 */
--line-height-normal:  1.5;    /* 正文，标准 */
--line-height-relaxed: 1.625;  /* 多行描述，宽松 */
--line-height-loose:   2;      /* 引用、说明文字 */
```

### 2.3 字重
```css
--font-weight-normal:    400;    /* 正文、描述 */
--font-weight-medium:    500;    /* 次级强调、按钮文字 */
--font-weight-semibold:  600;    /* 标题、重要数据 */
--font-weight-bold:      700;    /* 主标题、紧急信息 */
```

### 2.4 字体族
```css
--font-family-sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-family-mono:  'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
```

### 2.5 字体使用规则
| 规则 | 说明 | 示例 |
|------|------|------|
| 最小字号 | 正文最小16px，低于需用户缩放 | 时间戳可用14px |
| 层级限制 | 单页面字号种类≤4种 | xl(标题) + base(正文) + sm(描述) + xs(时间) |
| 字重差异 | 标题与正文字重至少差1级 | 标题600 + 正文400 |
| Markdown标题 | 渲染标题遵循H1-H6规范 | H1(2xl) → H6(sm) |

---

## 三、间距体系

### 3.1 基础单位：4px（Tailwind 默认）
```css
--spacing-0:    0;         /* 无间距 */
--spacing-1:    0.25rem;   /* 4px  - 极小间距：图标与文字 */
--spacing-2:    0.5rem;    /* 8px  - 紧凑间距：列表项内部 */
--spacing-3:    0.75rem;   /* 12px - 小间距：卡片内部元素 */
--spacing-4:    1rem;      /* 16px - 标准间距：卡片内边距、页面边距 */
--spacing-5:    1.25rem;   /* 20px - 中等间距：按钮组 */
--spacing-6:    1.5rem;    /* 24px - 大间距：区块间隔 */
--spacing-8:    2rem;      /* 32px - 超大间距：章节间隔 */
--spacing-10:   2.5rem;    /* 40px - 页面顶部 */
--spacing-12:   3rem;      /* 48px - 页面底部 */
--spacing-16:   4rem;      /* 64px - 大区块分隔 */
```

### 3.2 常用场景规范
| 场景 | 间距值 | 说明 |
|------|--------|------|
| 页面内边距 | `spacing-4` (16px) | Desktop左右留白，Mobile全宽 |
| 卡片内边距 | `spacing-4` → `spacing-6` | 根据内容密度调整 |
| 列表项间距 | `spacing-3` (12px) | Bullet List项间距 |
| 文字与图标 | `spacing-2` (8px) | 紧凑排列 |
| 按钮组间距 | `spacing-3` → `spacing-4` | 并排按钮 |
| 章节分隔 | `spacing-8` → `spacing-12` | 大区块间隔 |
| Cluster卡片间距 | `spacing-4` (16px) | 聚合卡片垂直排列 |

### 3.3 点击区域规范
| 元素 | 最小高度 | 说明 |
|------|----------|------|
| 可点击项 | 44px | WCAG AA标准，手指点击友好 |
| 按钮 | 40px | Primary/Secondary按钮 |
| 链接文字 | 44px包含padding | 增大点击区域 |

---

## 四、圆角体系

### 4.1 圆角梯度
```css
--radius-none:   0;          /* 无圆角 - 分割线 */
--radius-sm:     0.25rem;    /* 4px  - 小标签、徽章 */
--radius-default: 0.375rem;  /* 6px  - 默认圆角 - 输入框、小卡片 */
--radius-md:     0.5rem;     /* 8px  - 卡片、按钮 */
--radius-lg:     0.75rem;    /* 12px - 大卡片、弹窗 */
--radius-xl:     1rem;       /* 16px - 超大圆角 - Hero区块 */
--radius-2xl:    1.5rem;     /* 24px - 极大圆角 - 特色卡片 */
--radius-full:   9999px;     /* 圆形 - 按钮、头像 */
```

### 4.2 圆角使用规则
| 规则 | 说明 | 示例 |
|------|------|------|
| 风格统一 | 全局采用偏方风格(radius-md) | 卡片(8px) + 按钮(8px) + 输入框(6px) |
| 层级对应 | 元素层级越高，圆角越大 | 标签(sm) < 卡片(md) < 弹窗(lg) |
| 避免混用 | 同类型元素圆角一致 | 所有Primary按钮半径8px |

---

## 五、阴影体系

### 5.1 阴影梯度（移动端优先轻量阴影）
```css
--shadow-sm:   0 1px 2px 0 rgba(0, 0, 0, 0.05);                    /* 微阴影 - 卡片默认 */
--shadow-default: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);  /* 默认阴影 - 悬浮卡片 */
--shadow-md:   0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); /* 中阴影 - 弹出菜单 */
--shadow-lg:   0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); /* 大阴影 - 底部弹窗 */
--shadow-xl:   0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); /* 超大阴影 - 模态框 */
--shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);             /* 内阴影 - 输入框聚焦 */
```

### 5.2 阴影使用规则
| 规则 | 说明 | 示例 |
|------|------|------|
| 轻量优先 | 移动端阴影opacity≤0.1 | 避免厚重阴影 |
| 层级对应 | 元素层级越高，阴影越大 | 卡片(sm) < 弹窗(md) < 模态框(lg) |
| 交互反馈 | 悬浮态阴影加深 | hover: shadow-md |
| 避免叠加 | 相邻元素阴影不叠加 | 列表项用border而非shadow |

---

## 六、核心组件规范

### 6.1 Bullet List（数据源/文章展示）

**组件用途**：展示数据源列表（F11）、文章列表（F12）

**结构设计**：
```
┌─────────────────────────────────────────────────────┐
│  ○  Title（lg, 600, text-primary）                    │  ← 最小高度44px
│     •  Author / Platform（sm, 400, text-secondary）  │
│     •  Publish Time（xs, 400, text-tertiary）        │
│     Abstract（base, 400, text-secondary, 限3行）     │
│     Core Insights（sm, 500, primary-600）            │
│     [Raw URL]（xs, 400, primary-500, hover变色）     │
└─────────────────────────────────────────────────────┘
```

**视觉规范**：
| 属性 | 值 | 说明 |
|------|-----|------|
| 卡片背景 | bg-subtle (#F9FAFB) | 与页面背景区分 |
| 卡片边框 | border-default (1px) | 轻量分割 |
| 卡片圆角 | radius-md (8px) | 标准卡片 |
| 卡片内边距 | spacing-4 (16px) | 内容区留白 |
| 卡片阴影 | shadow-sm | 微阴影 |
| 列表项间距 | spacing-3 (12px) | 垂直排列 |
| 点击状态 | 无跳转（F11）/ 跳转详情（F12） | 根据页面区分 |
| Hover效果 | bg-emphasis + border-emphasis | 悬浮反馈 |

**响应式适配**：
| 屏幕 | 宽度 | 内边距 |
|------|------|--------|
| Mobile (<768px) | 全宽 | spacing-3 |
| Tablet (768-1024px) | 2列 | spacing-4 |
| Desktop (>1024px) | 3列 | spacing-4 |

---

### 6.2 Cluster Card（聚合卡片）

**组件用途**：展示Cluster聚合主题单元

**结构设计**：
```
┌─────────────────────────────────────────────────────┐
│  ┃ Cluster Title（xl, 600, text-primary）            │  ← 左侧3px主色竖条
│  ┃ Core Insight（base, 500, primary-700）           │
│  ┃ Importance Score（sm, 400, text-tertiary）       │
│  ┃ ─────────────────────────────────────────────   │
│  ┃ Items（展开后显示）                               │
│  ┃   • Item 1 Title                                │
│  ┃   • Item 2 Title                                │
│  ┃   • ...                                         │
│  ┃ [展开/折叠按钮]（xs, 500, primary-600）           │
└─────────────────────────────────────────────────────┘
```

**视觉规范**：
| 属性 | 值 | 说明 |
|------|-----|------|
| 卡片背景 | bg-base (#FFFFFF) | 纯白突出 |
| 左侧竖条 | 3px width, primary-500 | 视觉强调 |
| 卡片边框 | border-default (1px) | 标准边框 |
| 卡片圆角 | radius-md (8px) | 与Bullet List一致 |
| 卡片阴影 | shadow-default | 高于普通卡片 |
| 展开态阴影 | shadow-md | 展开后加深 |
| Importance Score | 数字+星级图标 | 如 "9/10 ★★★★★" |
| Hover效果 | 左侧竖条变primary-600 | 悬浮反馈 |

---

### 6.3 Chatbot 输入框

**组件用途**：用户通过Chatbot调整Draft内容

**结构设计**：
```
┌─────────────────────────────────────────────────────┐
│  [消息列表区域]                                      │
│   ┌───────────────────────────────────────┐         │
│   │ User: "删除item_005"                   │         │
│   └───────────────────────────────────────┘         │
│   ┌───────────────────────────────────────┐         │
│   │ Assistant: "已删除item_005"            │         │
│   │ [Thinking过程（折叠）]                  │         │
│   └───────────────────────────────────────┘         │
│  ─────────────────────────────────────────────     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 输入框（placeholder: "输入指令调整内容...") │   │
│  │ [发送按钮]                                   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**视觉规范**：
| 属性 | 值 | 说明 |
|------|-----|------|
| 输入框高度 | 48px | WCAG AA点击区域 |
| 输入框背景 | bg-muted (#F3F4F6) | 与卡片区分 |
| 输入框边框 | border-default (1px) | 聚焦时变primary-500 |
| 输入框圆角 | radius-lg (12px) | 比卡片略大 |
| 消息气泡圆角 | radius-md (8px) | 标准气泡 |
| 发送按钮 | radius-full, primary-500 | 圆形按钮 |
| Thinking区域 | bg-muted, 可折叠 | 灰色背景，点击展开 |

---

### 6.4 Markdown 渲染

**组件用途**：展示Draft的Markdown内容

**视觉规范**：
| 元素 | 样式 | 说明 |
|------|------|------|
| 标题H1 | 2xl, 600, text-primary | 主标题 |
| 标题H2 | xl, 600, text-primary | 章节标题 |
| 标题H3 | lg, 500, text-primary | 子章节 |
| 正文 | base, 400, text-secondary | 标准正文 |
| 引用 | bg-muted, border-l-4px primary-300 | 引用块 |
| 代码块 | bg-muted, font-mono, radius-md | 代码展示 |
| 链接 | primary-500, hover: primary-600 | 链接样式 |
| 列表 | spacing-3项间距 | 有序/无序列表 |

---

### 6.5 LLM 配置面板

**组件用途**：用户配置LLM Provider（OpenAI/Anthropic/Deepseek）

**结构设计**：
```
┌─────────────────────────────────────────────────────┐
│  LLM 配置                                            │
│  ─────────────────────────────────────────────     │
│  Provider: [下拉框: Deepseek | OpenAI | Anthropic]  │
│  Base URL: [输入框: https://api.deepseek.com]      │
│  API Key:  [密码框: sk-xxx]                          │
│  ─────────────────────────────────────────────     │
│  [验证配置] [保存配置]                                │
│  ─────────────────────────────────────────────     │
│  可用模型: [下拉框: deepseek-v4-flash | ...]         │
└─────────────────────────────────────────────────────┘
```

**视觉规范**：
| 属性 | 值 | 说明 |
|------|-----|------|
| 面板背景 | bg-subtle | 配置卡片 |
| 面板边框 | border-default | 标准边框 |
| 面板圆角 | radius-lg | 比普通卡片大 |
| 输入框高度 | 40px | 标准输入框 |
| 输入框圆角 | radius-md | 标准圆角 |
| 按钮高度 | 40px | Primary/Secondary |
| 按钮圆角 | radius-md | 标准按钮 |
| 验证成功 | border-success-500 | 绿色边框反馈 |
| 验证失败 | border-danger-500 | 红色边框反馈 |

---

### 6.6 Skeleton 加载

**组件用途**：数据加载时的占位展示

**视觉规范**：
| 属性 | 值 | 说明 |
|------|-----|------|
| Skeleton背景 | bg-muted (#F3F4F6) | 灰色占位 |
| 动画 | pulse (opacity 0.6 → 1) | 呼吸动画 |
| 圆角 | 与实际元素一致 | Bullet List: radius-md |
| 高度 | 与实际元素一致 | Bullet List: 80px |

---

### 6.7 Thinking 显示组件

**组件用途**：展示LLM的推理过程（Deepseek reasoning_content）

**结构设计**：
```
┌─────────────────────────────────────────────────────┐
│  [Thinking图标] 推理过程                              │
│  ─────────────────────────────────────────────     │
│  正在分析cluster数据...                              │
│  识别到3个核心主题：OpenAI动态、Anthropic发布...     │
│  ─────────────────────────────────────────────     │
│  [折叠] [展开]                                        │
└─────────────────────────────────────────────────────┘
```

**视觉规范**：
| 属性 | 值 | 说明 |
|------|-----|------|
| 背景 | bg-muted | 灰色背景区分 |
| 边框 | border-muted | 轻量边框 |
| 圆角 | radius-md | 标准圆角 |
| 文字 | sm, 400, text-tertiary | 辅助文字色 |
| 折叠态高度 | 40px | 仅显示标题栏 |
| 展开态高度 | auto | 内容自适应 |

---

## 七、响应式设计

### 7.1 断点定义（Tailwind 默认）
```css
--breakpoint-sm:   640px;    /* Small devices (phones) */
--breakpoint-md:   768px;    /* Medium devices (tablets) */
--breakpoint-lg:   1024px;   /* Large devices (desktops) */
--breakpoint-xl:   1280px;   /* Extra large devices */
--breakpoint-2xl:  1536px;   /* Ultra wide devices */
```

### 7.2 响应式布局策略
| 屏幕 | 页面宽度 | 内边距 | Bullet List列数 | Cluster Card宽度 |
|------|----------|--------|------------------|------------------|
| Mobile (<768px) | 全宽 | spacing-3 | 1列 | 全宽 |
| Tablet (768-1024px) | max-w-3xl | spacing-4 | 2列 | 全宽 |
| Desktop (1024-1280px) | max-w-5xl | spacing-4 | 3列 | 2/3宽 |
| Desktop XL (>1280px) | max-w-7xl | spacing-6 | 3列 | 1/2宽 |

### 7.3 响应式字号调整
| 元素 | Mobile | Desktop |
|------|--------|---------|
| 页面标题 | lg (18px) | xl (20px) |
| Cluster标题 | base (16px) | lg (18px) |
| Bullet List标题 | base (16px) | lg (18px) |
| 正文 | sm (14px) | base (16px) |

---

## 八、可访问性规范（WCAG AA）

### 8.1 色彩对比度
| 组合 | 对比度 | 要求 | 通过 |
|------|--------|------|------|
| text-primary / bg-base | 15.5:1 | >4.5:1 | ✅ |
| text-secondary / bg-base | 7.6:1 | >4.5:1 | ✅ |
| text-tertiary / bg-base | 4.6:1 | >4.5:1 | ✅ |
| primary-500 / bg-base | 4.7:1 | >4.5:1 | ✅ |
| primary-500 / bg-subtle | 4.5:1 | >4.5:1 | ✅ |

### 8.2 点击区域
| 元素 | 最小尺寸 | WCAG要求 |
|------|----------|----------|
| 按钮 | 40px × 40px | 44px推荐（接近） |
| 链接 | padding扩充至44px | ✅ |
| Bullet List项 | 44px高度 | ✅ |

### 8.3 键盘导航
| 操作 | 键位 | 说明 |
|------|------|------|
| 焦点切换 | Tab | 遍历可交互元素 |
| 激活 | Enter | 按钮/链接激活 |
| 取消 | Esc | 关闭弹窗/取消操作 |
| 展开折叠 | Space | Cluster展开/折叠 |

### 8.4 ARIA 标签
| 元素 | ARIA属性 | 说明 |
|------|----------|------|
| Cluster卡片 | aria-expanded | 展开状态 |
| Bullet List | aria-label="数据源列表" | 列表标识 |
| 按钮 | aria-label="删除item" | 操作说明 |
| 输入框 | aria-label="输入指令调整内容" | 输入提示 |
| Thinking区域 | aria-label="推理过程" | 内容说明 |

---

## 九、动效规范

### 9.1 过渡时长
```css
--duration-75:    75ms;     /* 极快 - 按钮状态切换 */
--duration-100:   100ms;    /* 快 - 微交互 */
--duration-150:   150ms;    /* 标准 - 元素显示/隐藏 */
--duration-200:   200ms;    /* 标准 - Hover反馈 */
--duration-300:   300ms;    /* 慢 - 页面切换 */
--duration-500:   500ms;    /* 极慢 - 抽屉/模态框 */
```

### 9.2 缓动函数
```css
--ease-linear:    linear;                        /* 线性 */
--ease-in:        cubic-bezier(0.4, 0, 1, 1);    /* 先慢后快（退出） */
--ease-out:       cubic-bezier(0, 0, 0.2, 1);    /* 先快后慢（进入） */
--ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);  /* 标准缓动 */
```

### 9.3 常用动效
| 场景 | 动效 | 说明 |
|------|------|------|
| Hover反馈 | bg变化, duration-150, ease-out | 背景色渐变 |
| 展开/折叠 | height变化, duration-300, ease-in-out | Cluster展开 |
| Skeleton加载 | pulse动画, duration-1000 | 呼吸动画 |
| 消息发送 | opacity 0→1, translateY 8px→0 | 消息进入 |
| 输入框聚焦 | border-color变化, duration-150 | 边框高亮 |

---

## 十、图标规范

### 10.1 图标库
推荐使用 **Heroicons** (Tailwind官方图标库)
- 风格：Outline / Solid / Mini
- 尺寸：16px / 20px / 24px

### 10.2 图标使用规范
| 场景 | 图标 | 尺寸 | 颜色 |
|------|------|------|------|
| Cluster展开 | ChevronDown | 20px | text-secondary |
| 删除 | Trash | 20px | danger-500 |
| 验证成功 | CheckCircle | 20px | success-500 |
| Thinking | Brain | 24px | primary-400 |
| 时间戳 | Clock | 16px | text-tertiary |

---

## 十一、Tailwind CSS 配置建议

### 11.1 tailwind.config.js 扩展
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          500: '#6366F1',
          600: '#4F46E5',
          // ... 其他层级
        },
        // 功能色、中性色扩展
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        // 使用Tailwind默认spacing体系
      },
      borderRadius: {
        // 使用Tailwind默认radius体系
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        // ... 其他阴影
      },
    },
  },
}
```

---

## 十二、设计规范索引

| 章节 | 内容 | 文件引用 |
|------|------|----------|
| 一、颜色体系 | 品牌色、功能色、中性色、暗色模式 | variables.css :root |
| 二、字体体系 | 字号、行高、字重、字体族 | variables.css --font-* |
| 三、间距体系 | 基础单位、常用场景、点击区域 | Tailwind spacing |
| 四、圆角体系 | 圆角梯度、使用规则 | Tailwind borderRadius |
| 五、阴影体系 | 阴影梯度、使用规则 | Tailwind boxShadow |
| 六、核心组件 | Bullet List、Cluster Card、Chatbot等 | components/ui/*.tsx |
| 七、响应式设计 | 断点、布局策略、字号调整 | Tailwind breakpoints |
| 八、可访问性 | WCAG AA、对比度、键盘导航 | ARIA labels |
| 九、动效规范 | 过渡时长、缓动函数、常用动效 | Tailwind transition |
| 十、图标规范 | Heroicons、使用场景 | Heroicons库 |

---

## 附录：设计系统版本管理

| 版本 | 日期 | 变更内容 | 影响范围 |
|------|------|----------|----------|
| 1.0 | 2026-05-11 | 初始版本 | 全局组件 |

---

> **设计原则：克制用色、层次分明、间距统一、圆角一致、轻量阴影、WCAG AA优先。**