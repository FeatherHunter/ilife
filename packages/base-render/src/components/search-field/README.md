# search-field · 搜索框（形态 B）

> 一件自足的公共组件：`attrs.ts`（标记契约）／`model.ts`（入参校验）／`render.ts`（纯函数产标记）／
> `style.ts`（唯一样式来源）／`runtime.ts`（产出 JS 文本）／`index.ts`（出口）。

## 何时用

页面**已经有一批渲染好的条目**，用户要按词找其中的一部分时用它。典型：私家大厨搜菜名／食材、
卡路里搜食品、备忘录搜笔记、居家管家搜物品与备注。

它替掉的三种错法：

1. **只看不动的搜索框**（长得像输入框，打了字什么也不发生）——本件的打字、清空、计数、跳转
   都由 `buildSearchFieldJs()` 真做；
2. **写死的命中数**（「命中 12 处」是文案，改了词也不变）——本件的命中数是运行时**数出来的**，
   渲染期只写 `—`（缺值口径），不做假的初值；
3. **自造一个搜索框**（每个技能各写一套：id 写死、只认自家的类名）——本件与结果区只通过
   `data-*` 约定相接（`data-ilife-search-region`／`data-ilife-search-item`／`data-ilife-search-tags`）。

**不要**用它做这三件事：按属性筛一批记录（用 `filter-chips`）、换一段窗口（用 `window-picker`）、
只读的标签排版（用 `renderChipRow`）。HELP 页里那个搜索框是 `controls` 的共享 helper，
绑死在 HELP 模板的固定 id 上，**不是**本件，也不该被本件取代（它的入口不是积木）。

## 入参

```ts
renderSearchField({
  name: 'dish',                    // 必填：机器键（事件 detail.name 按它定位）
  form: 'B',                       // 形态键；本件只有 B（闭集外的值 → bad-input）
  label: '搜菜名、食材',            // aria-label（缺省「搜索」）
  placeholder: '搜菜名、食材…',
  query: '',                       // 初始查询串（缺省空串）
  scopes: [                        // 范围分段：不给＝不渲染；给了至少两档
    { value: 'name', label: '菜名', count: 4 },
    { value: 'note', label: '备注' },
  ],
  scope: 'all',                    // 初始范围（'all' ＝内置不过滤档；缺省 'all'）
  target: 'dishes',                // 结果区键（对应 data-ilife-search-region）
  noun: '道',                      // 量词（「N 道命中」；缺省「处」）
  emptyText: '没有命中，换个词或放宽范围',
  loadingText: '正在找…',
  error: undefined,                // 初始错态（写在控件旁边 ＋ aria-describedby）
  loading: false,
  disabled: false,
  extraClass: undefined,
})
```

结果区一侧（由页面或别的件产，本件只读属性）：

```html
<div data-ilife-search-region="dishes">
  <article data-ilife-search-item data-ilife-search-tags="name 湘菜">…</article>
</div>
```

## 契约

**标记**（`attrs.ts` 是唯一事实，渲染与运行时共用）：

| 名字 | 落点 | 意思 |
|---|---|---|
| `data-ilife-search` | 根 | 机器键（运行时的发现锚） |
| `data-ilife-search-form` | 根 | 形态键（闭集 `['B']`） |
| `data-ilife-search-target` | 根 | 结果区键；不给＝整页找 |
| `data-ilife-search-loading="1"` | 根 | 载入态（读数行原地换字） |
| `data-ilife-search-invalid="1"` | 根 | 错态（旁边那句在生效） |
| `data-ilife-search-item` / `-region` / `-tags` | 结果区 | 可搜的条目／结果区／条目的范围标签 |
| `data-ilife-search-input` / `-clear` / `-scope` / `-prev` / `-next` | 控件 | 运行时的委派锚 |
| `data-ilife-search-count` / `-at` / `-pos` / `-n` / `-scope-name` | 读数位 | 命中数／第几处／整句／各档计数／当前范围名 |
| `data-ilife-search-hit` / `-current` | 条目里的 `<mark>` | 命中词／当前那一处 |
| `data-ilife-search-empty` / `-error` | 根内两行 | 空态句／错态句 |

**事件**（冒泡 `CustomEvent`，不引入任何全局）：

| 事件 | `detail` | 何时 |
|---|---|---|
| `ilife:search` | `{ name, query, scope, hits, items, loading? }` | 每次重算（含首次挂载） |
| `ilife:search-jump` | `{ name, index, total }` | 每次跳转 |
| `ilife:search-loading`（**页面派发**） | `{ name, on, text? }` | 载入态开关 |

## 不变量

1. **命中计数是真数**：`data-ilife-search-count` 里的数＝结果区里真实被标出来的 `<mark>` 个数。
   渲染期写 `—`；没有脚本时它**一直是 `—`**（宁可缺值，也不给一个假读数）。
2. **清空＝逐字还原**：`<mark>` 拆回文本并 `normalize()`，条目的 `hidden` 全部摘下——清空之后
   DOM 里的文本与运行前逐字相同。
3. **跳转不改词**：Enter／下一处只移动「第几处」与当前处标记，不动输入串、不动命中数。
4. **范围是单选**：`aria-pressed="true"` 只有一档；切档会重算命中数与各档计数。
5. **样式只读皮肤**：颜色／圆角／字面／字号一律走 `skinVar()`；选择器全在 `.ilife-page-ui` 之下，
   没挂根类的页面一条都命中不到，也**不**用手写的 `var(--ilife-…)`。
6. **触控目标 ≥44×44**（清空键、前后跳键、范围档），**全宽档**成立（不只窄屏）。
7. **零横向溢出**：范围分段与读数行都 `flex-wrap`；390 与 1280 两档 `scrollWidth ≤ clientWidth`。

## 常见错法

| 错法 | 后果 | 正解 |
|---|---|---|
| 把命中数写进标记（渲染期给个数） | 页面上有一个看着像读数、其实是文案的数 | 渲染期写 `—`，交给 `buildSearchFieldJs()` |
| 结果区没挂 `data-ilife-search-item` | 控件旁边出「没接上结果区」（错态） | 给条目挂上这个属性（`renderResultRow` 自带） |
| 结果区挂 `data-ilife-search-region` 但搜索框没给 `target` | 整页找：别的区域的条目也被算进命中数 | 两边的键对上（`target` ↔ `data-ilife-search-region`） |
| 用 `overflow-x:auto` 摆范围分段 | 窄档有档位看不见（藏横滑） | 交给 `flex-wrap` 换行 |
| 给 `scopes` 只递一档 | 一档不成分段（`bad-input`） | 要么给 ≥2 档，要么不给 |
| 用本件替 `filter-chips` | 按属性取子集变成了按词找 | 两件事两件——本件找词，`filter-chips` 筛属性 |
