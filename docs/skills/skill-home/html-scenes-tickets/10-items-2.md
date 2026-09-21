## Question

物品管理域（二）：更新与标签分类共 11 条场景。新技能此刻只有 16 行骨架页换数据，这 11 条要按册子（票 1）与形状定稿（票 2）做成真页面，一条场景一份真产物。

## 目标

逐条端到端走通（唤醒词 → 命令 → 默认落 HTML → 页面）：信息结构对齐下表的老页面、UI 走新仓共用件、双端自适应、无冗余文字、无分隔符懒政。11 条各出一份产物；本域手机墙与桌面墙各一张（`--check` exit 0）；每格写下「这一页该确认什么」。注意 `3-6 撤销操作` 与 `3-5 合并物品` 属于**破坏性操作**页，老页面分别有「影响范围预览」与「可撤销列表」，不得压成一张通用回执。

| 场景 | 唤醒词 | 老页面（信息结构对齐源） |
|---|---|---|
| 3-1 | 改物品 | `物品/add_form.html` |
| 3-2 | 移物品 | `物品/receipt.html` |
| 3-3 | 数量变更 | `物品/receipt.html` |
| 3-4 | 状态变更 | `物品/receipt.html` |
| 3-5 | 合并物品 | `物品/confirm.html` |
| 3-6 | 撤销操作 | `物品/undo_select.html` |
| 3-7 | 物品关联 | `物品/relations.html` |
| 3-8 | 标物品 | `物品/receipt.html` |
| 4-1 | 管标签 | `物品/tag_manage.html` |
| 4-2 | 管分类 | `物品/category_manage.html` |
| 4-3 | 整理建议 | `物品/tag_manage.html` |

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- node --test packages/skill-home/test/<域>-*.test.mjs` exit 0（**只跑自己那份用例**——持锁只做一件事、缩短排队；全量 `pnpm test` 留给收口票）；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 物品管理-2-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号>` —— 0 命中、exit 0。
④ `node packages/skill-home/scripts/audit-page-blocks.mjs .scratch/<本票号>` exit 0 —— 本域每份产物的**必需块齐全**（按契约的族清单逐页断言，缺一块即红并点名）；

## 不许动的东西

不动其它域的页面与命令；不改共用件契约（要改回写票 2／票 3）；不碰生产库与生产产物目录；不改 `scenarios.yaml`。

## 交付物路径

`packages/skill-home/**`（本域页面与命令）；产物与墙 `.scratch/<票号>/`；域对账 `docs/skills/skill-home/scene-items-2.md`。

## 遗留出口

本域发现的老实现缺口与判据例外当场补票或回写票 2。

## 写集（并发用，机器验的那一份）

本票只写自己那几族：`packages/skill-home/templates/items/<族>.html` 与 `packages/skill-home/src/items/pages/<族>.ts`（族 = `receipt`、`confirm`、`undo_select`、`relations`、`tag_manage`、`category_manage`），外加 `packages/skill-home/test/items-2.test.mjs`、`docs/skills/skill-home/scene-items-2.md`、`.scratch/807/`。

**不碰**：`src/render/**` 共用件、`src/cli/**`、`package.json`、`SKILL.md`、派生件、别人的域目录与页族（要改就回写票 3 或票 2）。

跑锁一律带 `--max-wait-ms 600000`（协议上限 10 分钟，不无限等）。
