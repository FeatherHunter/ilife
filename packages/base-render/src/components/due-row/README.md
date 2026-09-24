# due-row · 到期行

**一句话**：**"还剩多少天"放大成读数，每行配一个动作**——`档位字 ・ 名称 ……… 还剩 18 天`，外加一颗真按钮。

## 何时用它（选型四条）

| 你要的 | 用 |
|---|---|
| 单看"还剩几天"、并要能当场办掉（打电话／设提醒／去办） | **本件** |
| 一笔事有多个阶段、要看走到哪了（已还 3 期 → 本期待扣） | `status-row`（状态台账行） |
| 一行一条、可勾选（盘点／待办） | `task-list`（勾选清单） |
| 时间落在哪一周（日历缩略） | `calendar-month`（月历格） |

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `rows` | `DueRowItem[]` | 必填 | 逐行；空数组且无 `absentLine` ⇒ 空串 |
| `rows[].key` | `string` | 必填 | 机器键（同页唯一；运行时按它派发） |
| `rows[].name` | `string` | 必填 | 这一笔是什么（`身份证换领`） |
| `rows[].tone` | `'ok' \| 'warn' \| 'danger'` | 必填 | 三档：正常／临近／已过期（决定左竖条与档位字的**形状**） |
| `rows[].tag` | `string` | 必填 | **档位字**（`正常`／`临近`／`已过期`）——状态必须带字 |
| `rows[].countdown` | `string` | 必填 | 放大的那个数（`18`）：等宽 ＋ **永不截断** |
| `rows[].countdownLabel` | `string` | — | 数的前词（`还剩`／`已逾期`） |
| `rows[].countUnit` | `string` | — | 数的量词（`天`） |
| `rows[].due` | `string` | — | 到期那一天（`2026-10-13 到期`）：等宽 ＋ 永不截断 |
| `rows[].meta` | `string \| string[]` | — | 补充（`招商信用卡 · 自动扣款`）：数组＝逐段一枚 |
| `rows[].note` | `string` | — | 该做什么（`18 天内报修，工时费全免`） |
| `rows[].action` | `DueRowAction` | — | 这一行的动作；不给＝这一行没有动作（如"不用管"） |
| `rows[].action.key` | `string` | — | 动作键（事件 `detail.action` 原样带回） |
| `rows[].action.label` | `string` | — | 按钮上的字（`去派出所`） |
| `rows[].action.disabled` | `boolean` | `false` | 按不动：**必须同时给 `action.note`** 说明为什么 |
| `rows[].action.note` | `string` | — | 按钮下那句说明（为什么不能按／按下去会怎样） |
| `rows[].action.loading` | `boolean` | `false` | 正在处理：原地换成「处理中…」（宽度锁住，不跳版） |
| `rows[].error` | `string` | — | 动作没成的错：写在按钮旁 ＋ `aria-describedby` 指过去 |
| `heading` | `string` | — | 小标题（`最该先办的`） |
| `count` | `string` | — | 右侧口径（`按紧急度排 · 今天 09-25`）：**本件不排序、不数数** |
| `absentLine` | `string` | — | 空态那一句（`没有快到期的`）：它是"没什么"，不是一行 |
| `foot` | `string \| string[]` | — | 脚注（`共 4 件`／`最近的 10-13`）：数组＝逐段一枚 |
| `form` | `'countdown'` | `countdown` | 形态键（闭集；本件只落地形态 B「倒计时放大 ＋ 动作」） |
| `extraClass` | `string` | — | 附加类名（空格分隔） |

## 契约与不变量

- **三档靠「字 ＋ 形 ＋ 色」三样一起给**：左竖条＝实线／点线／双线；档位字＝底线／描边实底／双线框；
  点＝空心圆／实心方／实心菱 ⇒「大字报刊」皮肤下强调色＝墨黑，紧急度照样分得开。
- **倒计时是这一件的主读数**：`countdown` 走显示字面（`font-display`）＋ 等宽数字 ＋ `nowrap`，
  与正文字号比 ≫2×；到期日同样不截断。
- **"还剩几天"由调用方算**：本件不读日历、不换算（渲染是纯函数，页面的"今天"不该藏在组件里）。
- **动作是真 `<button>`**：命中盒 ≥44 高、宽度锁住（`DUE_ROW_BUTTON_MIN_WIDTH_PX`）⇒
  开始／处理中两档换字不跳版；`:hover` 包在设备能力查询里、`:active` 只动 `transform`、
  `:focus-visible` 有 2px 焦点环、`disabled` 有 `cursor:not-allowed` ＋ 按钮旁写明为什么。
- **运行时只做翻译**：点一下派发冒泡 `CustomEvent ilife:due-action`，
  `detail = { key, name, tone, action, actionLabel }`；禁用不派发；幂等（重复注入只绑一次）。
- 错态（`rows[].error`）写在按钮旁边并挂 `aria-describedby`（不只染色）。
- 样式 scope 在 `.ilife-page-ui` 下、只经 `skinVar()` 读皮肤；窄档由**容器**决定
  （`@container ilife-due-row`，断点 `DUE_ROW_NARROW_MAX_PX`＝460）：桌子窄了右侧那一块挪到下一行。

## 常见错法

- 「还剩 18 天」埋在一句正文里 ⇒ 放大成读数，同页几件竖着比得出来；
- 三档只换个标签颜色 ⇒ 左竖条与档位字必须有线型差异（实线／点线／双线）；
- 写着"该赶紧办了"却没有地方可按 ⇒ 每行一个真按钮（不许用 `<span>` 扮按钮）;
- 禁用却不写为什么 ⇒ 调用方必须补 `action.note`（本件在归一化期就拦）；
- 在组件里现算"还剩几天" ⇒ 会让同一份标记在不同日子渲染出不同结果；算完再传进来。
