# 事实：共享 help 模板认的徽章类型词（票 188／居家 HELP）

## 1 模板源表：10 个词
- 位置：`packages/base-render/assets/help-template.html:1698-1709`（`:1698` `var TYPE_DEFAULT = {` → `:1709` `};`）；`:1697` 注释逐字「类型徽章: types 数组元素可为字符串(默认配色)或 {text,bg,fg}(调用者自定义颜色, 缺省走默认)」。
- 逐字全表（10 个键，键名＋配色值，`:1699-1708`）：
- `:1699` `'采集'` `#e7f8ee/#1a7a3a`；`:1700` `'查看'` `#e8f2ff/#0a63ce`；`:1701` `'结果'` `#e8f2ff/#0a63ce`；
- `:1702` `'向导'` `#e2f7f5/#00897b`；`:1703` `'批量'` `#f3e9fb/#8e3fc9`；`:1704` `'校验'` `#e8f2ff/#0a63ce`；
- `:1705` `'选择'` `#e8f2ff/#0a63ce`；`:1706` `'过程'` `#e2f7f5/#00897b`；`:1707` `'回执'` `#e8f2ff/#0a63ce`；`:1708` `'录入'` `#e7f8ee/#1a7a3a`
- 词表：**采集／查看／结果／向导／批量／校验／选择／过程／回执／录入**（10 个）。渲染入口 `:1710-1723` `typeBadgeHTML`，调用点 `:1727` `(s.types || []).forEach(function(t){ h += typeBadgeHTML(t); });`。
- 与 HEAD 对照（`base-render/**` 现有未提交改动）：`git show HEAD:packages/base-render/assets/help-template.html` 的 `TYPE_DEFAULT` 段与工作区此表逐字相同（同为 10 词、同配色），本结论不依赖未提交改动。

## 2 生成物 `packages/base-render/src/helpShell.ts`：同表、逐字一致
- 表落在 `:45` 的 `HELP_SHELL_SUFFIX` 字面量内：`var TYPE_DEFAULT = {\r\n  '采集':  {bg:'#e7f8ee', fg:'#1a7a3a'},\r\n` … `'录入':  {bg:'#e7f8ee', fg:'#1a7a3a'}\r\n};`——10 个键、键名与配色值与源模板**逐字相同**，与源模板**一致**。
- 机制：`:3` 注明「来源：`packages/base-render/assets/help-template.html`（help模板唯一真相源…）」；`packages/base-render/scripts/gen-help-shell.cjs:1,15` 由源模板生成；`packages/base-render/test/help-shell-136.test.mjs:56-61` 断言源切分与 `HELP_SHELL_SUFFIX` 哈希相等。

## 3 兜底行为：表外词静默退到「查看」蓝底（文字照显示，不报错、不隐藏）
- `:1714` 逐字 `    var d = TYPE_DEFAULT[text] || TYPE_DEFAULT['查看'];`（元素为 `{text,bg,fg}` 对象形态）
- `:1719` 逐字 `    var d2 = TYPE_DEFAULT[text] || TYPE_DEFAULT['查看'];`（元素为字符串形态）
- `:1722` 逐字 `  return '<span class="type-badge" style="background:' + esc(bg) + ';color:' + esc(fg) + '">' + esc(text) + '</span>';`——表外词配色退成 `#e8f2ff/#0a63ce`（`'查看'` 的值），无异常、无校验、无「不显示」分支。

## 4 账单断言 `packages/skill-bill/scripts/gen-wake-assets.mjs:90-125`
- `:98-99` 逐字 `/** 形状断言（fail-closed）：数量、字段齐、id 唯一、types 非空且用老词。 */`、`function assertShape(groups) {`。
- `:109` 逐字 `  const words = new Set(['采集', '查看', '选择', '向导', '回执']);`
- `:115` 逐字 `    for (const t of s.types) if (!words.has(t)) bad(s.id + ' 出现老词表外的 types：' + t);`
- 断言词表＝**5 个**（采集／查看／选择／向导／回执），是模板 10 词的**真子集**：与模板**不一致**（少 结果／批量／校验／过程／录入），且比模板更严——卡路里在用的 `结果`／`过程` 会被它当「老词表外」拦下，而模板渲染本就认。
- 文档面同一错记：`docs/skills/skill-home/t184-bill-recipe.md:79`、`t195-part1-new-files.md:61`、`t195-part4-uncertain.md:11`、`t195-structure-design.md:71,137`、`t195-decisions.html:211` 把模板表说成 5 个，与源码不符；`t186-template-contract.md:42`、`t195-facts/02a-contract-surface.md:52` 记 10 个，与源码相符。

## 5 卡路里实际用词 `packages/skill-calorie/src/triggers/wake-assets.ts`
- 414 个 `"types": [...]` 块去重后只有 **3 个词**：`结果`（329 次）／`回执`（79 次）／`过程`（6 次）。
- `:20` 逐字 `export type WakeSceneType = '结果' | '回执' | '过程';`；`:29` 逐字 `  readonly types?: readonly WakeSceneType[];`。
- 对模板 10 词表：**3/3 全在表内**；对账单 5 词断言：**对不上**（`结果`、`过程` 在断言表外）。

## 6 结论
- 居家生成器的断言用**模板配色表（10 词，`help-template.html:1699-1708`）**：采集／查看／结果／向导／批量／校验／选择／过程／回执／录入。
- 理由：模板真正认的就是这 10 个，表外词不报错、只静默退到「查看」蓝底，「模板只认 5 个」不成立；10 词是账单 5 词的超集，用它既不会把模板已有能力当违规，也不会把卡路里式的 `结果`／`过程` 误判为表外。
