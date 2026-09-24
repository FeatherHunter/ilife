# result-row · 结果行（形态 A）

> 一件自足的公共组件：`attrs.ts`（标记契约）／`model.ts`（入参校验）／`render.ts`（纯函数产标记）／
> `style.ts`（唯一样式来源）／`index.ts`（出口）。**没有 `runtime.ts`**：它是显示件，
> 交互（打字、清空、计数、跳转）归 `search-field`——一件只做一件事。

## 何时用

搜索／筛选出来的**一批结果**要一条一行地列，每条右边有一个能一眼扫到的读数时用它：
私家大厨的菜谱结果、卡路里的食品结果、备忘录的笔记结果、居家管家的物品结果。

它替掉的三种错法：

1. **靠色块高亮命中词**（`<span class="hl" style="background:#ff0">`）——色是唯一信息，
   三套皮肤下必然走散；本件用语义 `<mark>`，视觉走「下划线 ＋ 加粗」（形与字重两样）；
2. **缺值拿 0 冒充**（没评分的菜显示 `0`）——本件不给 `value` 就写 `—` 并弱化；
3. **为了接搜索框再写一遍接线**——本件与 `search-field` 共用同一套 `data-*`：
   给 `name` 就把结果区、条目、标签三段一次落好。

**不要**用它做这三件事：一行「标签 →点线→ 值」的文字账目（用 `ledger-rows`）、
列更多的记录行（用 `entry-rows`）、可点的多选清单（用 `multi-checks` 一类）。

## 入参

```ts
renderResultRow({
  form: 'A',                       // 形态键；本件只有 A
  name: 'dishes',                  // 机器键（可选）：同时当搜索框的结果区键
  label: '菜谱结果',                // 这一批结果的 aria-label
  items: [
    {
      title: '辣椒炒肉',
      highlights: ['辣椒'],         // 命中词（渲染期在标题与副语里逐处标 <mark>）
      subtitle: '25 分钟 · 中辣 · 做过 6 次',
      tags: ['湘菜', '快手'],        // 上屏小标签 ＋ data-ilife-search-tags
      value: '4.8',
      valueLabel: '评分',
      thumb: '菜',                  // 缩略格（不给就不出这一列）
    },
    { title: '虎皮青椒', highlights: ['辣椒'], subtitle: '18 分钟', valueLabel: '未评分', thumb: '蔬' },
  ],
  emptyText: '没有结果',
  extraClass: undefined,
})
```

`value` 不给 ＝ 缺值：值位写 `—` 并弱化（`-v-none`），`valueLabel` 照常上屏（如「未评分」）。
**缩略格是整列的开关**：只要有一条给了 `thumb`，整批都会留出那一列（避免同行左缘参差）。

## 契约

| 名字 | 落点 | 意思 |
|---|---|---|
| `data-ilife-result-form` | 根 | 形态键（闭集 `['A']`） |
| `data-ilife-result` / `data-ilife-search-region` | 根 | 机器键（给了 `name` 时两枚一起落） |
| `data-ilife-result-item` ＋ `data-ilife-search-item` | 每条 | 本件的锚 ＋ 搜索框的锚（同一元素） |
| `data-ilife-search-tags` | 每条 | `tags` 的机器面（搜索框按范围分档用） |
| `data-ilife-search-hit` | 命中词 `<mark>` | 命中词（搜索框运行时会接管这批标记） |
| `data-ilife-result-empty` | 空态行 | `items: []` 时的设计过的空态句 |

**没有事件**：本件不派发任何事件（不交互）。要「点一条进详情」是页面自己的事
（把整行包进 `<a>`／`<button>` 时，行高 56px ≥ 44px 的触控下限已经留好）。

## 不变量

1. **命中词一定是 `<mark>`**，且不只靠色（本件清掉浏览器默认的黄色块，改走「下划线 ＋ 加粗」）。
2. **值位不截断**：`white-space:nowrap` ＋ 值列不进 `minmax(0,…)`——金额／日期是关键语义。
3. **长标题折行不省略**：`overflow-wrap:anywhere`（390 档标题列先被压，靠折行消化）。
4. **转义先于拼接**：命中词只切原文，切出的每一段各自 `esc()`——标记不可能从词里漏进来。
5. **纯函数**：同一份入参两次渲染逐字节相同；不读 DOM、不写 DOM。
6. **样式只读皮肤**，选择器全在 `.ilife-page-ui` 之下；行高 ≥44px（整行可点时够用）。

## 常见错法

| 错法 | 后果 | 正解 |
|---|---|---|
| 用 `<span>` ＋ 背景色装作高亮 | 色是唯一信息，换皮肤走散 | 用 `highlights` 参数，标 `<mark>` |
| 缺值给 `value: '0'` | 页面上多一个假的 0 | 不给 `value`（写 `—` 并弱化） |
| 自己写 `data-ilife-search-item` | 与 `result-row` 产出的重复 | 给本件 `name`，接线它自己做 |
| 指望本件派发「点击某行」事件 | 本件是显示件，不派发事件 | 页面自己包 `<a>`／`<button>` |
| 在标题里塞富文本 HTML | 会被转义成字面量 | 只给纯文本 ＋ `highlights` 词表 |
