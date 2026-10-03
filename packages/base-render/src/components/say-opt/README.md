# say-opt · 选填组（「补充选填项」那一折）

**一句话**：收起时一行表头（＋ ・ 组名 ・ 副语 ・ 计数），展开后组内表单 ＋ 组尾提示行 —— 原型 `.say-opt`。
**判地**：`docs/skills/skill-bill/proto/say-collect/x01-记支出-采集-v2.3.html` 的内嵌 <style>（逐字几何）。

## 入参

| 字段 | 类型 | 缺省 | 说明 |
|---|---|---|---|
| `label` | `string` | 必填 | 组名（如「补充选填项」） |
| `sub` | `string` | 可选 | 副语：组里有哪些项（收起时也看得见） |
| `countText` | `string` | 可选 | 计数读数（调用方算好；不给就不出那一格） |
| `contentHtml` | `string` | 必填 | 组内表单（**受信透传**：本层 `renderSayField` 的产物，原样进 HTML） |
| `note` | `string` | 可选 | 组尾提示行（如「不填就留空…」） |
| `open` | `boolean` | `false` | 渲染时就展开（`<details open>`） |

`contentHtml` 是**唯一**不转义的一格（只许传本层自己渲染的字段标记）；含 `</details>` 一律拒
（那会把这一折提前关掉，页面结构错位而标记照样"渲染成功"）。其余文本字段都经 `esc()`。
不确定的键一律 `BlocksError`。

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->

```json 示例入参
{ "label": "补充选填项", "sub": "备注／时间／账户", "countText": "已补 2 项",
  "contentHtml": "<label class=\"ilife-block-say-field\"><span class=\"ilife-block-say-field-lbl\">备注(选填)</span><input class=\"ilife-block-say-field-ctl\" type=\"text\" aria-label=\"备注(选填)\"></label>",
  "note": "不填就留空：助手照默认走。", "open": false }
```

## 出口

`renderSayOpt(input)` ／ `sayOptCss()` ／ 闭集 `SAY_OPT_SLOTS` 与字表 `SAY_OPT_TEXT` ／
类名根 `SAY_OPT_CLASS` 与槽助手 `sayOptSlot(slot, prefix?)`。
槽：`plus`（＋）／`lbl`（组名）／`sub`（副语）／`cnt`（计数）／`form`（组内表单）／`note`（组尾提示行）。

## 样式

虚线暖边 `#ddd0b6` ＋ 12px 圆角 ＋ 选填底色 `#fdfaf3`；展开那一下表头压上暖底 `#fbf7ec`、
底边换虚线；表头 44px 触控下限、组内左右内距 13px。这几颗色与本票（#1114）逐处授权的判地字面，
每一处的上一行都压着 `判地字面 · 授权照抄` 那句话；除它们以外，颜色／圆角一律经 `skinVar()` 读皮肤。

组内表单容器（`.say-opt .say-form`）由本件产出（`sayOptSlot('form')`）：判地里那条规则只给 `margin`，
布局那几条来自 `.say-form` 自身 —— 本件把两条并成 `-form` 一条。

## 无运行时

收起／展开是原生 `<details>` 的行为（脚本没跑到也能展开）；计数与展开态记忆都在技能侧，
本件只吃 `countText` ／ `open` 两个已算好的读数。
