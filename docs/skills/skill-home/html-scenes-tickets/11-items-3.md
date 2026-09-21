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

① `node tooling/run-locked.mjs --ticket <本票号> -- pnpm test` exit 0；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 物品管理-3-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号>` —— 0 命中、exit 0。

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
