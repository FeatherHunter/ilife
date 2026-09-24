# multi-checks · 多选清单

**一句话**：批量改之前先挑 —— 顶上「全选 ＋ 已选 N / M 条」，中间一行一条（**整行是命中区**，可选分组头），底下才是动作按钮。勾中的那一行同时有两重非颜色标记：勾选框里的对钩（字）＋ 行左端的竖条（形状）。

**形态**：本件只落地名册点名的**形态 A「顶上全选 ＋ 按分组列的复选 ＋ 底下的操作按钮」**——出处＝原型墙 `.scratch/ui-组件墙/parts-09-选择与反馈.mjs` 的 `.c-multi-checks-top` ＋ `.c-multi-checks-grp` ＋ `.c-multi-checks-bar`（2026-09 用户裁定），按层规重写（原型是一次性代码：无判据、无错误处理、读的是墙稿变量）。
形态键住 `MULTI_CHECKS_FORMS` 闭集（今天只有 `grouped` 一格）——**加第二形态是在闭集里加一格，不是新开一件**。

## 何时用它（选型三条）

| 你要的 | 用 |
|---|---|
| 「挑几条一起改」（批量改分类／排除可选／批量改） | **本件** |
| 一条一条地做（买菜清单打完勾、盘点） | `task-list`（勾选清单，不带批量动作条） |
| 只挑一条 | `radio-cards`（单选卡组） |

判据一句话：勾完之后**要拿这几条一起做一件事** → 用它；勾只是"这件事做完了" → 用勾选清单。

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `name` | `string` | 必填 | 机器键（事件 `detail.name`）。**非空**；同页内唯一 |
| `label` | `string` | 必填 | 这清单是干什么的（如「挑几条一起改分类」）。**非空**：没这句，勾完不知道要干什么 |
| `rows` | `MultiChecksRow[]` | 必填 | 条目。**给空数组 ＝ 出空态**（设计过的那一种，不是空白） |
| `rows[].id` | `string` | 必填 | 机器键（原生 `<input value>` 与事件 `detail.ids`）。**非空、清单内唯一** |
| `rows[].title` | `string` | 必填 | 行主字。**非空** |
| `selected` | `string[]` | `[]` | 预勾选的机器键（**必须命中行**，给错了当场 `badInput`） |
| `actions` | `MultiChecksAction[]` | `[]` | 底下的动作按钮；不给＝底下只有合计那句 |
| `hint` | `string` | — | 顶上那句的次段（如「勾掉的不改」） |
| `allText` | `string` | `全选` | 全选那一枚的字 |
| `moneyUnit` | `string` | `¥` | 金额前缀（只在每行都有 `amount` 时有意义） |
| `countUnit` | `string` | `条` | 计数单位 |
| `required` | `boolean` | `false` | 必选（至少一条：`aria-required` ＋ 标记） |
| `loading` | `boolean` | `false` | 加载态：行照出、已选数**原地换字**、按钮不可按（`aria-busy`） |
| `loadingText` | `string` | `正在读取` | 加载态那句字（只在 `loading` 时给） |
| `error` | `string` | — | 错态那句字（写在控件旁边 ＋ `aria-describedby` 指它） |
| `emptyText` | `string` | `没有可挑的条目` | 空态那句字 |
| `form` | `'grouped'` | `'grouped'` | 形态键（闭集；闭集外一律 `badInput`） |
| `extraClass` | `string` | — | 附加类名（空格分隔，逐个过类名正则） |

`rows[]` 的其余格：

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `rows[].group` | `string` | — | 分组名（同值归一组；不给＝散行，直接列在清单里） |
| `rows[].groupNote` | `string` | — | 分组尾巴那句读数（`3 条 · ¥56.00`）；取组内第一份给了的 |
| `rows[].note` | `string` | — | 行副语（小字，如「早餐 · 未分类」） |
| `rows[].amount` | `string` | — | 机器金额（十进制串，如 `-12.00`，参与合计）。**要么每行都给、要么一行都不给** |
| `rows[].amountText` | `string` | `amount` | 屏上金额写法（千分位／正负号归调用方） |
| `rows[].disabled` | `boolean` | `false` | 禁用：`<input disabled>` ＋ `cursor: not-allowed` |
| `rows[].disabledReason` | `string` | — | 禁用原因（**写出来**，不只染色；只在 `disabled: true` 时给） |

`actions[]`：

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `actions[].id` | `string` | 必填 | 动作 id（事件 `detail.action`）。**非空、一排内唯一** |
| `actions[].label` | `string` | 必填 | 按钮上的字（**写动词**，别写「确定」）。**非空** |
| `actions[].primary` | `boolean` | `false` | 主按钮（实心那一枚）。**一排里至多一枚** |

**入参违规一律抛 `BlocksError`（`bad-input`）**，不静默兜底：静默降级会让调用方以为已经生效。

## 契约与不变量（判据逐条断）

1. **真复选语义**：原生 `<input type="checkbox">` ＋ 整行／整块是 `<label>`（命中区）；视觉隐藏走 1px 盒 ＋ `opacity: 0`，**不是** `display: none`。
2. **勾选态不只靠颜色**：① 勾选框里的对钩 `✓`（字）；② 勾中那一行左端的 4px 竖条（`box-shadow: inset`，形状）；③ 底色（颜色）。皮肤「大字报刊」下强调色＝墨黑 ⇒ 前两重是换皮不塌的那两重。
3. **三态**：全选框与组头框都有「勾／半勾／没勾」；半勾在标记里写 `aria-checked="mixed"`（原生 `indeterminate` 是 IDL 属性、进不了标记），运行时 init 那一趟按它落成真状态。
4. **触控目标 ≥44×44**：整行 48px、全选块与组头 44px、动作按钮 44px。
5. **状态矩阵**：`rest`／`:hover`（包在 `@media (hover:hover) and (pointer:fine)` 里，且**不是唯一通路**）／`:active`（按钮 `scale(.98)`，≤80ms）／`:focus-visible`（2px 可见描边）／`disabled`（`cursor: not-allowed` ＋ 写出原因）／`loading`（原地换字、盒模型不动）／`error`（写在旁边 ＋ `aria-describedby`）／`empty`（设计过的空态）。
6. **窄宽两档**：容器宽 390 与 1280 下**零横向溢出**；窄档调整走 `@container`（金额另起一行、左对齐）。
7. **不截断**：行主字／副语／金额一律**换行**；样式段里没有 `text-overflow`／`line-clamp`／`white-space: nowrap`。
8. **样式只经 `skinVar()` 读皮肤**；不写 `:root`／`!important`；不定义新 token 名；全部规则 scope 在 `.<prefix>page-ui` 之下。
9. **零 DOM／零内联脚本**：模块代码剥掉字面量与注释后不出现 `document.`／`window.`／`navigator.`（DOM 只出现在 `buildMultiChecksJs()` 产出的文本里）；标记里没有 `<script>`、没有 `on*=`。

## 交互契约（运行时，`buildMultiChecksJs()`）

| 动作 | 行为 |
|---|---|
| 勾某一行 | 那一行原生勾上；已选数、合计、全选框／组头框的三态**同一趟**刷新 |
| 点组头 | 本组每一行跟着勾上／取消（**禁用的行不动**） |
| 点全选 | 每一行跟着勾上／取消（禁用的行不动） |
| 已选数为 0 | 动作按钮 `disabled` ＋ `aria-describedby` 指到底下那句「一条都没勾」 |
| 点动作按钮 | 派发 `ilife:checks-action`（`detail = { name, action, ids }`）——**落库归页面／技能命令，本件不发请求** |
| 勾选变化 | 派发 `ilife:checks-change`（`detail = { name, ids, count, total }`；`total` ＝ 合计分／无金额时为 `null`） |
| 重复注入 | 只绑定一次（根上 `data-ilife-checks-runtime`） |
| 不跑脚本 | 勾选与报数照常（原生复选），只是不派发事件、另有 `indeterminate` 那一项不落 |

**金额按整数分相加**：浮点相加会把 `0.1 ＋ 0.2` 变成 `0.30000000000000004`，读数就假了。

## 常见错法（别这么干）

- ❌ 只给部分行 `amount` 却显示合计：没给的那几行被按 0 算了，合计是**假的** → ✅ 要么每行都给，要么一行都不给（`badInput` 挡在前面）。
- ❌ 勾选态只把底色染成强调色：皮肤「大字报刊」下强调色＝墨黑 → ✅ 对钩 ＋ 竖条两重非颜色标记。
- ❌ 用「确定」当按钮字：读的人不知道要确定什么 → ✅ 写动词（「改分类」「就不买了」）。
- ❌ 一排里放两枚主按钮：等于没有主按钮 → ✅ `primary` 至多一枚（第二枚当场 `badInput`）。
- ❌ 全选只改视觉不勾原生框：读屏读出来还是"没勾" → ✅ 全选／组头都落在**原生框**上，三态一处算。

## 关系

- 与 `task-list` 的分工：那件的勾是"这件事做完了"；本件的勾是"这几条要一起改"（勾完还要按底下那颗按钮）。
- 样式与运行时由页面按需挂（加法式：不调 `multiChecksCss()`／`buildMultiChecksJs()`、不挂 `.ilife-page-ui` 的页零命中）。
- 动作按钮只派发事件：**落库／改分类归页面脚本与技能命令**，本件不写数据。
