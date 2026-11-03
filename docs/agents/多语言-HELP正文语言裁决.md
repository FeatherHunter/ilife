# HELP 正文语言裁决（M10 收口记录）

- 日期：2026-11-03；归属：地图 #1197 收口；对应缺口：M10「HELP 正文在英文模式仍中文，#1201 称按 #1235 不译，但 #1235 只裁文件名」。
- 裁决：**HELP 正文（技能注入的 5 键 JSON 的数据面）本轮保持中文，不译**；英文模式只本地化页壳与 `<html lang>`。理由是正文主体属于「唤醒词与路由 SoT／命令关键字冻结」这一类，已在 #1197 不迁清单（363 件）中登记（如 bill／calorie 的 `src/triggers/wake-assets.ts` 在 #1309、home 的 `src/help/helpAssets.ts` 在 #1220、schedule 的 `src/help/scenes/help-assets.ts` 在 #1222，均为 `tooling/i18n-ticket-scope.json` 的 `excluded`），其翻译与 #1197 的英文列同属后续范围。
- 状态：**待用户对 363 件不迁分类确认时一并确认**（本记录不代替用户确认；#1197 关闭前会把这一项列进确认清单）。

## 一、当前实现的真实边界（可复现读数）

英文模式渲染一份 HELP 页（以饼干记账为例，2026-11-03 实测）：

```
# 探针：runWithLanguage('en') 下 buildHelpFile() 后取 html 与 data
HTML_LEN 230731  LANG en
VISIBLE_WITH_CJK 0 of 30        # 去掉 <script>/<style> 后的可见文本节点：零中文（页壳已英文化）
DATA_JSON_CJK true              # 注入的 5 键 JSON 数据里仍有中文
```

数据面样例（同一份 en 产物）：

| 数据位 | 值 | 是否已英文化 |
| --- | --- | --- |
| `title` | `Cookie Accounting · User Manual (HELP)` | 是（m() 词条） |
| `subtitle` | `7 domains · 77 scenes · version 2.0 · updated …` | 是（m() 词条） |
| `groups[0].label` | `写入` | 否 |
| `groups[0].subgroups[0].label` | `记账` | 否 |
| `groups[0].subgroups[0].scenes[0].title` | `记一笔支出` | 否 |
| 同上 `wake_word` | `记支出` | 否 |
| 字段 `editable_fields[].label` | `金额`／`分类/名目`／`备注(选填)` 等 | 否 |

机制位置：`packages/base-render/src/help-shell-i18n.ts` 只替换模板两段（`HELP_SHELL_PREFIX`／`HELP_SHELL_SUFFIX`）里 `help-shell.` 前缀词条的 zh 字面量，不改技能注入的数据；`packages/base-render/test/help-shell-i18n-1201.test.mjs` 的 4 条断言只证明「壳控件换词、中文产物字节不变」。

## 二、为什么保持中文（第一性理由）

1. **正文主体是中文唤醒词与命令关键字的展示面**：HELP 页按分组列出「说什么能触发什么」，条目的 `wake_word`／`title` 是用户要原样说出的中文触发词；#1197 已裁命令关键字冻结不译（US13），#1236 的英文唤醒词是**新增路由**（30 条），不是中文唤醒词的翻译副本；路由按语言只加载一套（#1310）。
2. **它属于已登记的不迁类别**：`tooling/i18n-ticket-scope.json` 的 363 件不迁清单里，「唤醒词与路由 SoT」86 件／6,017 条已含这些数据源；其处置与英文列一样属于「#1197 之后」的范围，不在本轮 863 件迁移面内。
3. **翻译数据面会引入第二事实源**：若把 `wake_word` 展示值翻成英文，英文页上列出的触发词就说不动对应路由；若只翻 scene title／字段 label，则同一数据对象里出现两种语言，正文与触发词对不上。按 US9「未声明的差异为零」，宁可不译并显式登记。

## 三、与 #1235 的关系（歧义澄清）

- `docs/agents/多语言-文件名裁决.md`（#1235）第 1 条只裁「HELP 文件名主体冻结、不随语言变」；其中「语言只进文件内容与 `<html lang>`」一句在本记录里明确口径：**指渲染文档的页壳内容，不含技能注入的数据面**。该票没有为正文语言作裁决。
- 因此 #1201 原注释「HELP 正文（技能注入的 5 键 JSON）按 #1235 仍为中文」指针不成立（M10 的 GAP 来源）；本记录补上裁决，并把代码注释改为指向本文件。

## 四、残余影响与后续

- 英文 HELP 页里，页壳（导航、按钮、提示、关于页标签等）是英文；正文分组／场景／字段标签仍是中文。
- 若用户要求英文正文，需要另立一票：为每家的 wake-assets／场景内容建立英文列（工作量远大于本轮 30 条唤醒词），并同步英文路由与 HELP 正文数据，确保「页上列出的词」与「实际可触发的路由」一致。
- 本项按 #1197 的收口规则属「以缩减方式交付」，**需用户确认**；未确认前 #1197 不关闭。

## 五、复核命令

```
# 在已构建的工作树根目录
node <探针脚本>   # 脚本口径：runWithLanguage('en', () => buildHelpFile()) 后取 html；去 script/style 后统计可见文本 CJK 与 data JSON 的 CJK
node --test packages/base-render/test/help-shell-i18n-1201.test.mjs   # pass 4 / fail 0（只证壳）
```
