# sub-list · 分组清单

**一组一份、能折叠**：折页头（`<summary>`）上是**方向标／组名＋计数／组级小计／进度条＋「N/M 已备」**，
展开是子项（勾／名／数量／值）。折叠走**浏览器原生的 `<details>`**——本件**没有运行时段**，
键盘、读屏器、禁 JS 的环境全都照常。出处＝原型墙 `.scratch/ui-组件墙/parts-05-时间与分组.mjs` 的形态 A（2026-09 用户裁定）。

## 什么时候用它

| 你要的 | 用谁 |
|---|---|
| 一个清单**按组分**、组还能收起来（食材按类、备忘录按分类、流水按账户） | **本件** `renderSubList` |
| 一条一条的明细行（不分组的流水／记录） | `renderEntryRows` |
| 标签 → 值的账目（一页的读数逐项列） | `renderLedgerRows` |
| 勾选清单（**可交互**的打勾：点一下改状态） | `task-list` 那件 |

## 用法

```js
import { renderSubList, subListCss } from 'base-paint/blocks';

renderSubList({
  title: '买菜清单',
  use: '私家大厨 · 按类分组',
  summary: { label: '已备 12/22', value: '¥183.0' },
  groups: [
    { label: '叶菜', sum: '¥23.5', open: true, items: [
      { label: '小油菜', measure: '300 g', value: '¥4.5', done: true },   // 带 done ⇒ 这组出进度
      { label: '上海青', measure: '200 g', value: '¥3.8', done: true },
    ] },
    { label: '调味', sum: '¥58.0', items: [                              // 不带 done ⇒ 这组不讲进度
      { label: '生抽', measure: '500 ml', value: '¥9.9' },
    ] },
  ],
  emptyText: '清单还是空的',       // 0 组时出空态；不给 ⇒ 0 组出空串
});
subListCss();                      // 样式段（页面自己按需注入；不挂＝零命中）
```

| 入参 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `groups` | `SubListGroupInput[]` | ✅ | 0 组＝空串（给了 `emptyText` 则出空态） |
| `groups[].label` | `string` | ✅ | 组名 |
| `groups[].items` | `SubListItemInput[]` | ✅ | 子项（0 项＝只出折页头「0 项」） |
| `groups[].sum` | `string` | — | 组级小计（**已是给人看的样子**） |
| `groups[].open` | `boolean` | — | 一开始就展开，缺省 `false` |
| `items[].label` | `string` | ✅ | 子项名 |
| `items[].measure` | `string` | — | 数量／规格（如 `300 g`） |
| `items[].value` | `string` | — | 值（如 `¥4.5`） |
| `items[].done` | `boolean` | — | 备好没有；**这一组只要有子项给了它，折页头就出进度条与「N/M 已备」** |
| `title` | `string` | — | 标题 |
| `use` | `string` | — | 用途说明 |
| `summary` | `{ label, value }` | — | 头部右端合计位 |
| `emptyText` | `string` | — | 空态文案（0 组时出） |
| `note` | `string` | — | 脚注 |
| `form` | `'fold'` | — | 形态键（闭集，本件只有这一格） |
| `extraClass` | `string` | — | 附加类名（空格分隔、逐个过类名正则） |

## 契约与不变量

- **零脚本**：`<details>`／`<summary>` 是浏览器原生开合 ⇒ 本件没有 `runtime.ts`，不产一行 JS。
- **计数与进度都是算出来的**：组内几项＝子项条数；几条已备＝`done` 的条数。调用方给不了（给了就会跟子项对不上）。
- **进度只在带备货标的组上出**：一组里没有任何子项带 `done` ⇒ 这一组不长进度条（按分类列的备忘录不该凭空多一条进度）。
- **状态不只靠色**：备好＝勾（形）＋名字转弱（色）＋折页头「N/M 已备」（字）。**单一子项的状态在可访问树上只到组级**（勾那枚是装饰，`aria-hidden`）——这是本件的已知边界，逐项状态要读屏器可读时请用可交互的勾选清单。
- **折页头命中区 ≥ `SUB_LIST_HEAD_MIN_HEIGHT_PX`（48px）**：它是本件唯一的可点元素（判据真机量）。
- **交互地板**：`:hover` 只在 `@media (hover:hover) and (pointer:fine)` 下给底色（**不是唯一通路**：方向标＋光标＋原生开合一直在）；`:active` 给一档色阶（60ms）；`:focus-visible` 可见焦点（画在框内，因为折页盒 `overflow:hidden` 会裁掉外溢）；`prefers-reduced-motion` 下过渡关掉。
- **不截断**：数量与值 `nowrap`（关键语义不写 `…`），名字长了自己折行；0 组有空态（虚线卡 ＋ 一句人话）。
- 值位只吃"已经是给人看的样子"的串（取整、千分位、单位口径归调用方），与全层同口径。

## 常见错法

- 拿它当**勾选清单**用：本件是读数形状，点勾不会改状态（要改状态用 `task-list`）。
- 组里既有 `done: true` 又有 `done: false` 但组名是"按分类"：进度条会读成"备货进度"⇒ 分类清单别给 `done`。
- 一组塞 200 项：折页展开后一屏放不下 ⇒ 组要按真正会一起读的粒度分，超长的组配 `window-picker` 那类窗口件。
- 全组都 `open: true`：跟不折叠没差别（本件的价值就是"收起来还能看出进度"）。
- 用 `sum` 传"6 项"这类计数：计数是**算出来的**（传了也不会显示成计数）⇒ 小计只放金额之类的真读数。
