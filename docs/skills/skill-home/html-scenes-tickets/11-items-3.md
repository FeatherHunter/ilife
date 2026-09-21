## Question

物品管理域（三）：照片、盘点与物品历史共 8 条场景。新技能此刻只有 16 行骨架页换数据，这 8 条要按册子（票 1）与形状定稿（票 2）做成真页面，一条场景一份真产物。

## 目标

逐条端到端走通（唤醒词 → 命令 → 默认落 HTML → 页面）：信息结构对齐下表的老页面、UI 走新仓共用件、双端自适应、无冗余文字、无分隔符懒政。8 条各出一份产物；本域手机墙与桌面墙各一张（`--check` exit 0）；每格写下「这一页该确认什么」。注意 `5-3 照片墙` 是**网格墙**页、`6-2 差异处理` 是**分组处理**页、`6-4 搬家盘点` 是**二态标记清单**页，三张各有自己的版式，不得压成通用列表。

| 场景 | 唤醒词 | 老页面（信息结构对齐源） |
|---|---|---|
| 5-1 | 查看照片 | `物品/photos.html` |
| 5-2 | 管照片 | `物品/photos.html` |
| 5-3 | 照片墙 | `物品/photo_wall.html` |
| 6-1 | 盘点 | `物品/inventory_round.html` |
| 6-2 | 差异处理 | `物品/inventory_diff.html` |
| 6-3 | 盘点记录 | `物品/inventory_records.html` |
| 6-4 | 搬家盘点 | `物品/move_checklist.html` |
| 7-1 | 历史 | `物品/history.html` |

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- node --test packages/skill-home/test/<域>-*.test.mjs` exit 0（**只跑自己那份用例**——持锁只做一件事、缩短排队；全量 `pnpm test` 留给收口票）；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 物品管理-3-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs --dir .scratch/<本票号> --manifest .scratch/<本票号>/manifest.json` —— 产物 0 命中、exit 0（只审清单点名的产物文件；墙与索引走 ② 墙自检，不进本门，票 #866 裁决 Q1）。
④ `node packages/skill-home/scripts/audit-page-blocks.mjs --dir .scratch/<本票号> --blocks packages/skill-home/scripts/page-blocks.json --manifest .scratch/<本票号>/manifest.json` exit 0 —— 本域每份产物的**必需块齐全**（按契约的族清单逐页断言，缺一块即红并点名；范围同 ③）；

## 不许动的东西

不动其它域的页面与命令；不改共用件契约（要改回写票 2／票 3）；不碰生产库与生产产物目录；不改 `scenarios.yaml`。

## 交付物路径

`packages/skill-home/**`（本域页面与命令）；产物与墙 `.scratch/<票号>/`；域对账 `docs/skills/skill-home/scene-items-3.md`。

## 遗留出口

本域发现的老实现缺口与判据例外当场补票或回写票 2。

## 写集（并发用，机器验的那一份）

本票只写自己那几族：`packages/skill-home/templates/items/<族>.html` 与 `packages/skill-home/src/items/pages/<族>.ts`（族 = `photos`、`photo_wall`、`inventory_round`、`inventory_diff`、`inventory_records`、`move_checklist`、`history`），外加 `packages/skill-home/test/items-3.test.mjs`、`docs/skills/skill-home/scene-items-3.md`、`.scratch/808/`。

**不碰**：`src/render/**` 共用件、`src/cli/**`、`package.json`、`SKILL.md`、派生件、别人的域目录与页族（要改就回写票 3 或票 2）。

跑锁一律带 `--max-wait-ms 600000`（协议上限 10 分钟，不无限等）。

## 进度：100%

#866 三裁决落地后凭新口径重跑，四道验收全绿：

- ① 域测试 `items-3.test.mjs`：**10/10**；
- ② 墙自检：双墙 **8 格可发**（缺失 0）；
- ③ 分隔符 `--manifest .scratch/808/manifest.json`：**RESULT: 8/8 PASS**（版式位 0／英文裸词 0／重复句 0）；
- ④ 结构块 `--manifest` 同范围：**RESULT: 8/8 PASS**（每份 22～33 块齐）；
- 常驻门 `scaffold.test.mjs`：**48/48**（46 族三方对账＋2 门）。

交付：7 族真页面（125～196 行，无超线）＋域测试＋域对账 `docs/skills/skill-home/scene-items-3.md`
＋产物与墙 `.scratch/808/`（8 产物＋清单＋双墙＋总索引）。视觉复核记录见对账件。

关闭口径：#866 定「审计范围＝清单点名的产物文件，墙与索引走墙自检」，
本域 8 场景产物在该范围内全绿即达验收；生成器与脚手架侧的收敛不在本票写集。

下一步：无（本票关闭）。收据型四族（6-1／6-2／6-4／6-3 与 5-2 管理态）的命令侧载荷
增补（差异明细、发生时刻、核对清单条目、照片二进制）是**另立票**的事，缺口登记在
`docs/skills/skill-home/scene-items-3.md`；照片类型落点另有 #857。



