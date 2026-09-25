# sort-toggle · 排序切换（形态 C）

> 一件自足的公共组件：`attrs.ts`（标记契约）／`model.ts`（入参校验）／`render.ts`（纯函数产标记）／
> `style.ts`（唯一样式来源）／`runtime.ts`（产出 JS 文本）／`index.ts`（出口）。

## 何时用

用户想「换个看法」时用它：私家大厨的体检排序、记账的金额／笔数排序、居家管家的到期排序。
它把排序并进**视图条**——排序是视图的内部，页面上写的是「常做」「高分」这样的词和一句口径。

它替掉的三种错法：

1. **两个裸旋钮**（「字段」下拉 ＋「方向」按钮）——用户得自己在心里拼出「金额从大到小」是什么视图；
2. **假的排序**（点了只改按钮高亮，条目顺序一动不动）——本件的运行时段**真的重排**条目
   （按 `data-ilife-sort-<字段>` 在同一父节点内按序重排）；
3. **编出来的条数**（「常做 46」是文案）——每档条数按页面上真实条目数算。

**不要**用它做这三件事：按词找条目（`search-field`）、多选筛属性（`filter-chips`）、只读的一行读数。

## 入参

```ts
renderSortToggle({
  name: 'dish',                       // 必填：机器键（事件 detail.name 按它定位）
  form: 'C',                          // 形态键；本件只有 C
  label: '视图',                       // 视图条的 aria-label
  views: [
    { value: 'all', label: '全部', count: 132, caliber: '不筛', field: 'name', dir: 'asc' },
    { value: 'used', label: '常做', count: 46, caliber: '用过几次从多到少，只看做过 ≥2 次的',
      field: 'used', dir: 'desc' },
    { value: 'score', label: '高分', count: 12, caliber: '评分从高到低，未评分的排最后',
      field: 'score', dir: 'desc' },
  ],
  view: 'used',                       // 初始视图（必须在 views 里；缺省第一档）
  target: 'dishes',                   // 条目区键（对应 data-ilife-sort-region）
  unit: '道',                          // 条数的单位（「46 道」）
  flipLabel: '反过来',                 // 反向键的字面根（键面＝「反过来（从少到多）」）
  loadingText: '正在排…',
  error: undefined, loading: false, disabled: false, extraClass: undefined,
})
```

| 入参 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | `string` | ✅ | 机器键（事件 `detail.name` 按它定位；同一页内应唯一）。非空字符串 |
| `form` | `'C'` | — | 形态键（本件只有 `C`；闭集外一律 `bad-input`） |
| `views` | `SortViewInput[]` | ✅ | 视图档（**非空数组**；顺序＝屏上顺序） |
| `views[].value` | `string` | ✅ | 机器值（`aria-pressed` 的载荷）；**视图内唯一、不得为空串** |
| `views[].label` | `string` | ✅ | 上屏字（「全部」「常做」「高分」） |
| `views[].field` | `string` | ✅ | 排序字段：**只许小写字母开头**（`[a-z][a-z0-9-]*`）——它会被拼进 `data-ilife-sort-<字段>` |
| `views[].dir` | `'desc' \| 'asc'` | ✅ | 方向：从大到小／从小到大 |
| `views[].count` | `number \| string` | — | 这一档的条数（渲染期初值；运行时段按真实条目重算）。给了就得是**有限数字**或非空串 |
| `views[].caliber` | `string` | — | 这一档的口径句（「用过几次从多到少，只看做过 ≥2 次的」），换档时口径行原地换字 |
| `view` | `string` | 第一档 | 初始视图（必须是某一档的 `value`） |
| `label` | `string` | — | 视图条的 `aria-label`（这一组在筛什么） |
| `target` | `string` | — | 条目区键（对应 `data-ilife-sort-region`）；不给＝整页找 |
| `unit` | `string` | — | 条数的单位（「46 道」） |
| `flipLabel` | `string` | — | 反向键的字面根（键面＝「反过来（从少到多）」） |
| `loadingText` | `string` | — | 载入态文案 |
| `error` | `string` | — | 初始错态（写在控件旁边 ＋ `aria-describedby`） |
| `loading` | `boolean` | `false` | 初始载入态 |
| `disabled` | `boolean` | `false` | 禁用档 |
| `extraClass` | `string` | — | 附加类名（空格分隔，逐个过类名正则） |

条目区一侧：

```html
<div data-ilife-sort-region="dishes">
  <article data-ilife-sort-item data-ilife-sort-tags="all used score"
           data-ilife-sort-name="辣椒炒肉" data-ilife-sort-used="6" data-ilife-sort-score="4.8">…</article>
</div>
```

- `field` 只许 **小写字母开头**（`[a-z][a-z0-9-]*`）：它会被拼进 `data-ilife-sort-<字段>`，而 HTML
  属性名会被折成小写，收大写等于埋一个「看着配上了、其实读不到」的坑。
- 条目**没有** `data-ilife-sort-tags` 属性时视为属于**每一档**（页面上没有分档）；
  给了该属性（哪怕是空串）就得列上这一档才算属于它。

## 示例入参

本件**唯一一份**示例入参（皮肤矩阵判据拿它渲染本件、必须能**直接**渲染成功）：
`name` 与 `views` 必填（视图至少一档、机器值不许重）；每档的 `field` 只许**小写字母开头**、`dir` 只许 `desc`／`asc`。

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->
```json 示例入参
{
  "name": "dish",
  "label": "视图",
  "views": [
    { "value": "all", "label": "全部", "count": 132, "caliber": "不筛", "field": "name", "dir": "asc" },
    { "value": "used", "label": "常做", "count": 46, "caliber": "用过几次从多到少，只看做过 ≥2 次的", "field": "used", "dir": "desc" },
    { "value": "score", "label": "高分", "count": 12, "caliber": "评分从高到低，未评分的排最后", "field": "score", "dir": "desc" }
  ],
  "view": "used",
  "target": "dishes",
  "unit": "道"
}
```

三档的 `field` 分别对应条目上的 `data-ilife-sort-name`／`-used`／`-score`；`count` 是渲染期初值，
挂上运行时段之后每档条数按真实条目重算。

## 契约

| 名字 | 落点 | 意思 |
|---|---|---|
| `data-ilife-sort` / `-form` / `-target` | 根 | 机器键／形态键／条目区键 |
| `data-ilife-sort-flip-label` | 根 | 反向键的字面根（运行时不许自造字面量） |
| `data-ilife-sort-loading="1"` / `-invalid="1"` / `-disabled="1"` | 根 | 载入态／错态／禁用态 |
| `data-ilife-sort-view` | 视图键 | 机器值（当前档住同一颗键上的 `aria-pressed`） |
| `data-ilife-sort-field` / `-dir` / `-caliber` | 视图键 | 这一档的字段／方向／口径句 |
| `data-ilife-sort-n` | 视图键内 | 这一档的条数位（运行时写实） |
| `data-ilife-sort-ink` / `-caliber-text` | 口径行 | 视图名那一处／口径那一处（原地换字） |
| `data-ilife-sort-flip` | 反向键 | 反向键（`aria-pressed="true"` ＝已反向） |
| `data-ilife-sort-shown` / `-status` | 脚 | 当前视图里几条／状态行 |
| `data-ilife-sort-empty` / `-error` | 根内两行 | 空态句／错态句 |
| `data-ilife-sort-item` / `-tags` / `-sort-<字段>` | 条目区 | 条目／所属视图／排序键 |

| 事件 | `detail` | 何时 |
|---|---|---|
| `ilife:sort-change` | `{ name, view, field, dir, shown, loading? }` | 每次重算（含首次挂载） |
| `ilife:sort-loading`（页面派发） | `{ name, on }` | 载入态开关 |

## 不变量

1. **顺序是真的变了**：换视图／按反向键之后，同一容器内条目的 DOM 顺序按新方向排好（事件派发时已排完）。
2. **数字键按数值比，非数字键按字典序比，混着比时数字在前**（否则「10」会排在「9」前面）。
3. **条数是数出来的**：每档条数＝属于该档的真实条目数；没选中不筛时不适用（视图是单选）。
4. **读不到排序键就点名**：该视图的字段在条目上一条都读不到 → 控件旁边写「条目上没有这个键（`data-ilife-sort-…`）」，
   **不**静默当「排好了」。
5. **口径句跟着视图走**：换档时口径行原地换字（视图名 ＋ 口径），不让用户猜。
6. **视图条会折行**：390 档四颗视图键折行，零横滑；触控目标 ≥44×44。
7. **样式只读皮肤**，选择器全在 `.ilife-page-ui` 之下。

## 常见错法

| 错法 | 后果 | 正解 |
|---|---|---|
| 条目没写 `data-ilife-sort-<字段>` | 控件旁边出「条目上没有这个键」 | 把排序键写到条目上，或这一档不给 `field` |
| `field` 写了大写字母 | 属性名被折成小写 ⇒ 读不到 ⇒ 报错 | 用小写（`[a-z][a-z0-9-]*`） |
| 条目分散在多个容器里 | 每个容器内各自排（不是全局排） | 一批可排的条目放同一个容器 |
| 在 `views` 里重复同一个 `value` | 抛 `bad-input` | 机器值要唯一 |
| 把本件当多选筛选使 | 视图是单选（`aria-pressed` 恰一颗） | 多选筛属性用 `filter-chips` |
