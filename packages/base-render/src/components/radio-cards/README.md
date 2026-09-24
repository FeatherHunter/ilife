# radio-cards · 单选卡组

**一句话**：一列单选卡 —— 组名 ＋ 逐张卡（标记位 ＋ 1–2 字图标位 ＋ 标题 ＋ 读数 ＋ 一行说明）。**整张卡是命中区**，选中的那张同时有三重标记：左端竖条（形状）＋ 标记位里的对钩（字）＋ 边框底色（颜色）。

**形态**：本件只落地名册点名的**形态 A「竖排卡（图标位 ＋ 标题 ＋ 读数 ＋ 卡里一行说明）」**——出处＝原型墙 `.scratch/ui-组件墙/parts-09-选择与反馈.mjs` 的 `.c-radio-cards-card`（2026-09 用户裁定），按层规重写（原型是一次性代码：无判据、无错误处理、读的是墙稿变量）。
形态键住 `RADIO_CARDS_FORMS` 闭集（今天只有 `cards` 一格）——**加第二形态是在闭集里加一格，不是新开一件**。

## 何时用它（选型三条）

| 你要的 | 用 |
|---|---|
| 每个选项**有话说**（一句说明、一个读数，如账户余额） | **本件** |
| 选项只是几个短词（≤6 字、无须说明，如「按食材记／按成品记」） | 分段控件那一族（`filter-chips`／`sort-toggle`） |
| 选项是一长串同构条目（几十条里挑一条） | `drawer-sheet`（底部弹层） |

判据一句话：**选项本身要读懂** → 用它；**选项只是一个词** → 用分段控件；**选项多到要翻** → 用弹层。

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `name` | `string` | 必填 | 机器键（`<input name>` 与事件 `detail.name`）。**非空**；同页内唯一 |
| `label` | `string` | 必填 | 组名（这一组在选什么，如「账户」）。**非空**：没有组名的单选组读不出「在选什么」 |
| `options` | `RadioCardsOption[]` | 必填 | 候选项。**给空数组 ＝ 出空态**（设计过的那一种，不是空白） |
| `options[].value` | `string` | 必填 | 机器值（`<input value>`）。**非空、组内唯一** |
| `options[].title` | `string` | 必填 | 选项标题（卡上主字）。**非空** |
| `value` | `string \| null` | `null` | 选中项机器值。`null` ＝ 显式未选；给了串**必须命中一项**（不静默变成"没选"） |
| `hint` | `string` | — | 组名的次段（如「这一笔记到哪儿」） |
| `required` | `boolean` | `false` | 必选（`aria-required` ＋ `data-ilife-radio-required`） |
| `loading` | `boolean` | `false` | 加载态：选项照出、读数**原地换字**、全部不可点（`aria-busy`） |
| `loadingText` | `string` | `正在读取` | 加载态那句字（只在 `loading` 时给） |
| `error` | `string` | — | 错态那句字（写在控件旁边 ＋ `aria-describedby` 指它） |
| `emptyText` | `string` | `没有可选项` | 空态那句字 |
| `form` | `'cards'` | `'cards'` | 形态键（闭集；闭集外一律 `badInput`） |
| `extraClass` | `string` | — | 附加类名（空格分隔，逐个过类名正则） |

`options[]` 的其余格：

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `options[].desc` | `string` | — | 卡里那行说明（形态 A 的识别特征） |
| `options[].reading` | `string` | — | 读数（`¥1,286.40`）：右端等宽数字，窄容器下自己另起一行 |
| `options[].readingLabel` | `string` | — | 读数前的小标签（如「余额」） |
| `options[].lead` | `string` | — | 图标位（**只许 1–2 字**，如「现／卡／微」） |
| `options[].disabled` | `boolean` | `false` | 禁用：`<input disabled>` ＋ `cursor: not-allowed` |
| `options[].disabledReason` | `string` | — | 禁用原因（**写出来**，不只染色；只在 `disabled: true` 时给） |

**入参违规一律抛 `BlocksError`（`bad-input`）**，不静默兜底：静默降级会让调用方以为已经生效。

## 契约与不变量（判据逐条断）

1. **真单选语义**：原生 `<input type="radio">`（同 `name` 成一组）＋ 容器 `role="radiogroup"` ＋ `aria-label`。视觉隐藏走 1px 盒 ＋ `opacity: 0`，**不是** `display: none`（那会把键盘可达性一起干掉）。
2. **选中态不只靠颜色**：① 左端 4px 竖条（`box-shadow: inset`，形状）；② 标记位里的对钩 `✓`（字）；③ 边框＋底色（颜色）。皮肤「大字报刊」下强调色＝墨黑 ⇒ 前两重是换皮不塌的那两重。
3. **触控目标 ≥44×44**：整张卡是 `<label>`（`min-height` 64px）；禁用选项也照样 44+，只是点不动。
4. **状态矩阵**：`rest`／`:hover`（包在 `@media (hover:hover) and (pointer:fine)` 里，且**不是唯一通路**）／`:active`（`scale(.98)`，≤80ms）／`:focus-visible`（2px 可见描边）／`disabled`（`cursor: not-allowed` ＋ 写出原因）／`loading`（原地换字、盒模型不动）／`error`（写在旁边 ＋ `aria-describedby`）／`empty`（设计过的空态）。
5. **窄宽两档**：容器宽 390 与 1280 下**零横向溢出**（`scrollWidth ≤ clientWidth`）；窄档调整走 `@container`（读数另起一行）。
6. **不截断**：标题／读数／说明一律**换行**，样式段里没有 `text-overflow`／`line-clamp`／`white-space: nowrap`。
7. **样式只经 `skinVar()` 读皮肤**：组件里不出现手写的 CSS 变量；不写 `:root`／`!important`；不定义新 token 名；全部规则 scope 在 `.<prefix>page-ui` 之下。
8. **零 DOM／零内联脚本**：模块代码剥掉字面量与注释后不出现 `document.`／`window.`／`navigator.`（DOM 只出现在 `buildRadioCardsJs()` 产出的文本里）；标记里没有 `<script>`、没有 `on*=`。

## 交互契约（运行时，`buildRadioCardsJs()`）

| 动作 | 行为 |
|---|---|
| 点某张卡 | 原生单选：那一项 `checked`，同组其余项自动取消 |
| 方向键（聚焦后） | 原生单选行为（上下左右在同组间移动）——运行时**不重造**键盘行为 |
| 选中变化 | 组根上的 `data-ilife-radio-value` 就地改写 ＋ 派发 `ilife:radio-change` |
| 重复注入 | 只绑定一次（根上 `data-ilife-radio-runtime`）——页面同时挂别家运行时也安全 |
| 不跑脚本 | 卡按标记里的 `checked` 显示选中态（可读、可选），只是不派发事件（SSR／打印／静态页皆成立） |

事件（冒泡 `CustomEvent`，`detail`）：
```ts
'ilife:radio-change' → { name, value, title, prev }   // title 是选项标题（人话），prev 是改前机器值
```

## 常见错法（别这么干）

- ❌ 用 `role="radio"` ＋ 自己造一套键盘行为：方向键、`Tab` 组、`Space` 选中的原生语义重造一遍必然有洞 → ✅ 用原生 `<input type="radio">`。
- ❌ 选中态只把边框染成强调色：皮肤「大字报刊」下强调色＝墨黑，和未选中卡的黑字边线几乎同色 → ✅ 竖条 ＋ 对钩两重非颜色标记。
- ❌ 把 `<input>` 写成 `display: none` 藏在卡里：点得到、键盘到不了 → ✅ 1px 盒 ＋ `opacity: 0`。
- ❌ 选项只给机器值不给标题：屏上出现 `cash`／`very_active` 这种字 → ✅ `title` 必填，机器值与屏上字分离。
- ❌ 用 `value: ''` 表达"一个都没选"：说不出"选了哪一个" → ✅ `value: null`。
- ❌ 说明与读数挤成一行再 `…` 截断：关键读数不许截 → ✅ 让它们换行（`flex-wrap` ＋ `overflow-wrap: anywhere`）。

## 关系

- 与 `entry-rows`／`ledger-rows` 的分工：那两件是**只读**的读数行；本件是**可改**的选择件（改的结果由页面脚本接事件处理）。
- 样式与运行时由页面按需挂（加法式：不调 `radioCardsCss()`／`buildRadioCardsJs()`、不挂 `.ilife-page-ui` 的页零命中）。
- 本件暂不提供族汇总入口（「选择与打分」族里后落地的那件若先立汇总，照 `sheetCss()` 先例接上）。
