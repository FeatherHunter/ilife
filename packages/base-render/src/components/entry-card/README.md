# entry-card · 纸内明细卡

**一句话**：一张暖底卡抱住一列带编号的明细行 —— 原型 `.entry-card` 的落点。
**判地**：`docs/skills/skill-bill/proto/query/w01-查今天-v2.1.html` 的内嵌 <style>（逐字几何）。
**同族先例**：`say-field`／`say-opt`（出口四件套、类名槽助手、归一化与报错口径与它们同一份）。

## 何时用

页面里要出一串「第几行 ・ 主行（备注）・ 次行（分类／账户／时间）・ 右侧金额」的明细，
且实付那一行要一眼看得出来 —— 用本件。

**错法**（它替掉的三种）：各技能各自拼明细行（卡底／点线／编号三处各写一份，同页两处长得不一样）；
拿表格装明细（列名重复、窄屏横滚）；编号交给 CSS counter 或不编号（正文里「编号 1、2 ／ 共 2 笔」那种对账对不上）。
**与既有件的关系**：`entry-rows` 是一行一条记录的**裸明细行**（无卡、无编号、无实付高亮）；
本件是**卡 ＋ 编号 ＋ 实付高亮**的那一层。两件不互相调用。

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `entries` | `EntryCardEntry[]` | 必填 | 明细逐条（**非空**：一条都没有＝那一页该出空态件，本件不产空卡） |

一条明细的字段：

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `index` | `number \| string` | 按位次 1..n | 编号胶囊里的字（整数 ≥1，或非空字符串） |
| `title` | `string` | 必填 | 主行（备注那一行） |
| `sub` | `string` | 可选 | 次行纯文本（分类 ・ 账户 …） |
| `subMono` | `string` | 可选 | 次行里的等宽片段（时间戳那一档；跟在 `sub` 后面） |
| `subHtml` | `string` | 可选 | 次行整段的**受信透传** HTML（与 `sub`／`subMono` 二选一） |
| `amount` | `string` | 可选 | 右侧金额文本（**照抄**；本件不格式化数字、不算合计） |
| `pay` | `boolean` | `false` | 实付行：整行出一层高亮底 ＋ 描边 |

未知的键、`on*` 开头的键一律 `BlocksError`（拼错字段名不静默吞）。`subHtml` 里不许含
`</li>`／`</ol>`／`</div>`（那会把外层标签提前关掉，行会跑到卡外面去）；
配平嵌套的 `</span>`（如次行里嵌一个等宽片段）是正当透传。

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->

```json 示例入参
{ "entries": [
  { "index": 1, "title": "备注 · 午饭", "sub": "餐饮/外卖/午餐 · 微信",
    "subMono": "2026-10-02 12:00:00", "amount": "-35.00" },
  { "index": 2, "title": "备注 · 9月工资", "sub": "工资 · 招行卡",
    "subMono": "2026-10-02 18:00:00", "amount": "8000.00", "pay": true }
] }
```

## 出口

`renderEntryCard(input)` ／ `entryCardCss()` ／ `normalizeEntryCard(input)` ／
闭集 `ENTRY_CARD_SLOTS` ／ 类名根 `ENTRY_CARD_CLASS` 与槽助手 `entryCardSlot(slot, prefix?)`。

槽：`rows`（`<ol>`）／`row`（`<li>`）／`pay`（实付行那一格，加在同一条 `row` 上）／
`idx`（编号胶囊）／`text`（正文）／`sub`（次行）／`mono`（次行里的等宽片段）／`amt`（右侧金额）。

产出的标记（骨架）：

```html
<div class="ilife-block-entry-card"><ol class="ilife-block-entry-card-rows">
  <li class="ilife-block-entry-card-row"><span class="ilife-block-entry-card-idx">1</span><span class="ilife-block-entry-card-text">备注 · 午饭<span class="ilife-block-entry-card-sub">餐饮/外卖/午餐 · 微信<span class="ilife-block-entry-card-mono">2026-10-02 12:00:00</span></span></span><span class="ilife-block-entry-card-amt">-35.00</span></li>
</ol></div>
```

**编号是真实元素**（不是 CSS counter）：一个 `<span>` 一个字，读屏与「编号 1、2 ／ 共 2 笔」那种对账都读得到。

## 样式

判地 `.entry-card` 那十四条逐字照抄，只把选择器换成槽类、把读法换成 `skinVar()`：

| 判地 | 本层 |
|---|---|
| `.entry-card` | `ENTRY_CARD_CLASS`（卡根） |
| `.entry-rows li` ／ `li:last-child` | `-rows > -row` ／ 同前 ＋ `:last-child` |
| `.entry-rows li.pay` | `-rows > -row` ＋ `-pay` |
| `.idx` ／ `.entry-text` ／ `.entry-sub` ／ `.entry-sub .mono` ／ `.amt` | `-idx` ／ `-text` ／ `-sub` ／ `-sub > -mono` ／ `-amt` |

授权照抄的判地字面（#1114 逐处授权；每一处的上一行都压着 `判地字面 · 授权照抄` 那句话）：
卡底 `#fbf7ec`、行间点线 `#eee6d2`、实付行 `#fff8ee`／`#f0d9bd`、编号胶囊 `#f4efe2`／`#8a857a`；
圆角 12px（卡底）／10px（实付行）／7px（编号胶囊）。**除它们以外**，颜色一律经 `skinVar()` 读皮肤
（`line` 画边、`ink-2` 画次行）。

等宽那一支按判地照抄（规格 §5 第 5 组「照原型抄」）：`.amt` 与次行的时间戳写
`ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`（原型 `var(--mono)`）；
主数字另有 `font-variant-numeric: tabular-nums`。全部规则 scope 在 `.ilife-page-ui` 之下。

## 无运行时

本件不接事件（`runtime.ts` 不存在）：翻页、点某一行打开详情、合计与分页都在调用方；
标记里只有读数与状态。
