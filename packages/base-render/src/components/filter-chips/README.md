# filter-chips · 筛选条（形态 A）

> 一件自足的公共组件：`attrs.ts`（标记契约）／`model.ts`（入参校验）／`render.ts`（纯函数产标记）／
> `style.ts`（唯一样式来源）／`runtime.ts`（产出 JS 文本）／`index.ts`（出口）。

## 何时用

页面上**已经有一批记录**，要按属性（分类／餐别／位置／账户／标签）取子集时用它。六个技能都出这一件。

它替掉的三种错法：

1. **`<span>` 扮按钮**（看着能点、点不动，读屏器也读不出选中）——本件的每颗 chip 都是原生 `<button>`，
   选中态住 `aria-pressed`；
2. **藏横滑**（一排 chip 塞不下就 `overflow-x:auto`，390 档看不见的档位等于不存在）——本件只换行
   （`flex-wrap:wrap`），不设横向滚动、不设省略号；
3. **编出来的计数**（「餐费 42」是文案，选完也不变）——本件的每档计数、已选档数、记录数、合计
   都由运行时段按页面上的真实记录算（`data-ilife-chip-item` ＋ `data-ilife-chip-tags` ＋ `data-ilife-chip-value`）。

**不要**用它做这三件事：按词找条目（用 `search-field`）、换一段窗口（用 `window-picker`）、
只读的标签排版（用 `renderChipRow`）。

## 入参

```ts
renderFilterChips({
  name: 'kind',                       // 必填：机器键（事件 detail.name 按它定位）
  form: 'A',                          // 形态键；本件只有 A
  label: '按分类筛',                   // 这一组筛的是什么（aria-label）
  commonLabel: '常用',                 // 「常用」那一行的标头
  moreLabel: '更多分类',               // 「更多」那一句的开头
  moreOpen: true,                     // 「更多」默认展开（集合默认全在页上）
  options: [
    { value: 'meal', label: '餐费', count: 42, common: true },
    { value: 'traffic', label: '交通', count: 18, common: true },
    { value: 'daily', label: '日用', count: 26 },
  ],
  selected: ['meal', 'traffic'],      // 初始选中（必须是 options 里的机器值）
  target: 'bills',                    // 记录区键（对应 data-ilife-chips-region）
  clearLabel: '清除',
  pickedUnit: '类', rowsUnit: '笔',
  emptyText: '这里还没有可筛的档',
  loadingText: '正在筛…',
  error: undefined, loading: false, disabled: false, extraClass: undefined,
})
```

记录区一侧（本件只读属性）：

```html
<div data-ilife-chips-region="bills">
  <div data-ilife-chip-item data-ilife-chip-tags="meal" data-ilife-chip-value="88.50">…</div>
  <div data-ilife-chip-item data-ilife-chip-tags="meal traffic" data-ilife-chip-value="12">…</div>
</div>
```

**并集不是相加**：一条记录带两个选中档的标签时只算一次，合计也只加一次。

## 契约

| 名字 | 落点 | 意思 |
|---|---|---|
| `data-ilife-chips` | 根 | 机器键（运行时的发现锚） |
| `data-ilife-chips-form` | 根 | 形态键（闭集 `['A']`） |
| `data-ilife-chips-target` | 根 | 记录区键；不给＝整页找记录 |
| `data-ilife-chips-loading="1"` / `-invalid="1"` / `-disabled="1"` | 根 | 载入态／错态／禁用态 |
| `data-ilife-chip="<value>"` | 每颗 chip | 机器值（选中态住同一颗键上的 `aria-pressed`） |
| `data-ilife-chip-n` | chip 内 | 这一档的记录数位（运行时写实） |
| `data-ilife-chips-row` | 行 | chip 行（判据按它量「换行、不横滑」） |
| `data-ilife-chips-more` | `<details>` | 「更多」那一段 |
| `data-ilife-chips-picked` / `-rows` / `-total` | 状态行 | 已选档数／命中记录数／合计 |
| `data-ilife-chips-status` | 状态行 | `role="status"`（载入态原地换字） |
| `data-ilife-chips-empty` / `-error` | 根内两行 | 空态句／错态句 |

| 事件 | `detail` | 何时 |
|---|---|---|
| `ilife:filter-change` | `{ name, selected, rows, total, bad?, loading? }` | 每次重算（含首次挂载） |
| `ilife:chips-loading`（页面派发） | `{ name, on }` | 载入态开关 |

## 不变量

1. **计数与合计是真数**：都按页面上的记录算；渲染期只写调用方给的初值或 `—`。
2. **读不出来的金额被点名**：`data-ilife-chip-value` 不是数的记录跳过求和，并在控件旁边写
   「有 N 条的金额读不出来」（错态 ＋ `aria-describedby`）——**不**静默当 0。
3. **没选中＝不筛**：状态行写「已选 全部」，记录数与合计覆盖全部记录。
4. **集合只换行**：chip 行 `flex-wrap:wrap`，零 `overflow-x`、零 `text-overflow:ellipsis`。
5. **触控目标 ≥44×44**（每颗 chip、清除键、`<summary>`），全宽档成立。
6. **样式只读皮肤**，选择器全在 `.ilife-page-ui` 之下（没挂根类的页面一条都命中不到）。

## 常见错法

| 错法 | 后果 | 正解 |
|---|---|---|
| 把 chip 写成 `<span role="button">` | 键盘与读屏器拿不到选中态 | 用原生 `<button>` ＋ `aria-pressed`（本件已如此） |
| `selected` 里给了 `options` 外的值 | 抛 `bad-input` | 传入前先对齐（静默丢弃＝点了没反应） |
| 用 `overflow-x:auto` 摆一排 chip | 窄档有档位看不见 | 交给 `flex-wrap`（本件已如此） |
| 记录没挂 `data-ilife-chip-item` | 控件旁边出「没接上记录区」 | 给记录挂上，或把 `target` 对上记录区 |
| 一条记录被两个选中档各加一次金额 | 合计偏大 | 并集：本件按记录去重（不要自己再相加） |
| 页面根上没挂 `.ilife-page-ui` | 样式一条都不生效 | 与 `page-ui` 配方同一颗根类 |
