# 多语言收口核对 M1–M10（#1197）

状态：M1／M3／M6／M7／M9 已结案；M2 已交付（#1325）；M4／M8 已转承接票；M10 为裁决记录、待用户确认；M5 为历史记录缺口，按现状登记。日期：2026-11-03。

本记录回答 #1197 规格 US21「遗留（既有红、待定件、未合并分支）在票面显式登记」与收口核对里的 M1–M10 清单（原始清单见会话产物 `.scratch/verify-1197/verify-1318.md` 第 6 节）。每条都写清「谁看哪个读数」，不代替用户确认。

## 一、逐项状态

| # | 项 | 性质 | 当前读数／证据 | 处置与落点 |
|---|---|---|---|---|
| M1 | #1227 申报的纯英文注释新增 | 记录缺失 | `git show 78590c28` 逐行扫：源码级纯英文注释新增 `SOURCE_COMMENT_EN=0`；唯一真实偏离 `packages/base-render/src/components/sort-toggle/runtime.ts:104-106` 与申报一致 | **已结案**：`docs/agents/多语言-收口复核-1227.md` 固化方法与读数 |
| M2 | seal-states 生成件各 5 行中文 | 生成器未处理 | 六个 `packages/plugin-*/src/seal-states.generated.ts` 各 5 行中文；源 `seals.yaml`、生成器 `node tooling/gen-seals.mjs` | **已交付（#1325）**：`seals.yaml` 每个文本叶子 `{zh,en}`，生成器产出中／英两套表与 `sealStates(product, language)`；中文列逐字不变，英文列见六份生成件与 `seal-states-1325` 断言 |
| M3 | #1225「911 条」只在已清理 worktree | 记录缺失 | 可从仓内 JSON 复算：`tooling/i18n-ticket-scope.json` 的 `tickets['1225'].excluded` 43 件、合计 `literals=911`（迁移入 32 件／795 条） | **已结案**：本记录给出复算命令，无另票 |
| M4 | #1198 语言清单派生化（=US1） | 规格承诺未达成 | 14 个 `packages/*/src/entries/index.ts` 写死 `defineCatalog({ zh, en })`；`packages/base-link-core/src/config/language.ts:21` `AVAILABLE_LANGUAGES=['zh','en']`；`tooling/i18n-langs.mjs:25` `LANGUAGES=['zh','en']` | **承接票 #1322**；规格关闭时按「缩减需用户确认」登记 |
| M5 | #1308 关闭缺带会话 id 的用户原话 | 历史记录缺口 | #1308 已于 2026-11-02T03:14:27Z 关闭，票面最后一条为「进度：100%…按票面保持 open 待用户确认后关闭」；原会话原话不在仓内，无法回溯 | **按现状登记**；属旧四步闸门遗留，不重开（重开只能由人做），规格收口评论如实写明 |
| M6 | #1306 无第二方复核结论 | 记录缺失 | 独立子代理复核 PASS-with-notes；已验证 resolve 空白回退、entries 空白判红、params 集合相等、i18n-tables 共用；真仓 entries `keys=19082 blanks=0`、params `keys=19270 mismatch=0` | **已结案**：`docs/agents/多语言-收口复核-1306.md`；P2（skew 计对）与 P3（少参语义注释）已在收口修复分支改正，P3/P4 边界转 **#1328** |
| M7 | 英文唤醒词 23 条 vs 裁决约 30 条 | 范围缩减 | 六份 `wake-en.json` 合计 30 条（bill 5／calorie 6／chef 5／home 5／memo 4／schedule 5）；`node tooling/wake-en.mjs --check` EXIT 0；六家 `wake-en-1310` 测试全绿 | **已结案**（补到 30）；747 全覆盖仍按 #1236 裁决不做 |
| M8 | 英文列账本 `recorded=0` | 机制空转 | `tooling/skill-html.snapshot.en.json`、`tooling/calorie-html.snapshot.en.json` 均 `artifactCount=0`；门输出 `PENDING: 英文列 0 件`；bill `t689-页面指纹.en.json` 44/44 为可用先例 | **承接票 #1324**；`_en` 命名机制已在收口修复分支交付 |
| M9 | US9 整句化无第二方逐处比对记录 | 记录缺失 | 独立第二方复核 PASS-with-notes：三处模板与基线拼接逐字节一致、申报↔zh 3/3、23 处 `m()` 与申报 21 行对齐、无未申报改写；组件 103/103、快照 24/24 | **已结案**：`docs/agents/多语言-整句化申报.md`；第二方复核另发现 en c006 模板级缺陷（同一名词放两处、单复数不匹配），原记录归「范围外／非模板问题」不成立，已订正并转 **#1330**；②③ 无直接断言的覆盖缺口并入 #1330 验收；范围外盲区 `sort-toggle/runtime.ts:86` 转 **#1326** |
| M10 | HELP 正文英文模式仍中文 | 裁决待确认 | bill en HELP：可见文本 0 处中文（页壳已英文化），注入数据 JSON 仍有中文（`groups[0].label=写入`、`wake_word=记支出` 等）；数据源属 363 件不迁类（bill／calorie `wake-assets.ts` #1309、home `helpAssets.ts` #1220、schedule `help-assets.ts` #1222） | **裁决记录**：`docs/agents/多语言-HELP正文语言裁决.md`「本轮保持中文」；**待用户确认**，不另开票 |

## 二、新增承接票（本收尾建立）

| 票 | 内容 | 为什么现在不修 |
|---|---|---|
| #1322 | US1：加语言只加词条文件、语言清单派生 | 跨 14 个包与两道门，属架构改造，非「可当场修」 |
| #1323 | #1230：宿主 `locale.preference` → CLI `caller` 接线 | 需宿主插件侧通道，超出本轮包内改动 |
| #1324 | 英文列账本补录（194＋2 件） | 依赖逐件生成英文产物与录账，工作量大 |
| #1325 | seal-states 生成件语言化 | 涉及生成器与 `seals.yaml` 契约 |
| #1326 | sort-toggle 运行时段全角括号 | 运行时段文案，需语言形态设计 |
| #1327 | bill／schedule 用本地化报文 startsWith 判错误分类 | 运行逻辑缺口，需结构化错误码 |
| #1328 | 门禁边界加固（#1306 复核 notes） | 不阻断当前绿，属边界加固 |
| #1330 | 英文搜索结果计数措辞（c006 重复名词、`1 matches`） | #1316 整句化的英文模板缺陷，需改词条/模板并补断言，不在本轮收口范围 |

## 三、待用户确认项（规格关闭前）

1. **363 件／15,534 条不迁分类**是否认可（类别表与证据见 `.scratch/verify-1197/confirm-363.md`；`node tooling/check-i18n-ticket-scope.mjs` 现报 `excluded=363 problems=0`）。其中唤醒词已从 23 补到 30 条，剩「不做 747 全覆盖」是 #1236 已裁决的范围缩减。
2. **M10 HELP 正文保持中文**是否接受（否则另立英文数据面票，工作量远大于本轮）。
3. **US1 以承接票延后**是否接受（#1322），还是要求本轮内实现后再关规格。

未确认前 #1197 保持 open；确认后按收口评论＋关闭流程执行。

## 四、复现命令

```
# M3：1225 的 43 件不迁文件合计 911 条
node -e "const j=require('./tooling/i18n-ticket-scope.json'); const t=j.tickets['1225']; console.log(t.excluded.length, t.excluded.reduce((s,x)=>s+x.literals,0));"

# M4：14 个词条入口与两处语言闭集
grep -n "defineCatalog" packages/*/src/entries/index.ts
grep -n "AVAILABLE_LANGUAGES" packages/base-link-core/src/config/language.ts
grep -n "LANGUAGES" tooling/i18n-langs.mjs

# M7：唤醒词 30 条与生成一致性
node tooling/wake-en.mjs --check

# M8：英文列空账本
node tooling/calorie-html-snapshot.mjs --check
node tooling/skill-html-snapshot.mjs --check

# M10：HELP 壳与数据面（探针口径见裁决文件）
node --test packages/base-render/test/help-shell-i18n-1201.test.mjs
```
