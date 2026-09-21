## Question

空间与位置域 4 条场景。新技能此刻只有 16 行骨架页换数据，这 4 条要按册子（票 1）与形状定稿（票 2）做成真页面，一条场景一份真产物。

## 目标

逐条端到端走通（唤醒词 → 命令 → 默认落 HTML → 页面）：信息结构对齐下表的老页面、UI 走新仓共用件、双端自适应、无冗余文字、无分隔符懒政。4 条各出一份产物；本域手机墙与桌面墙各一张（`--check` exit 0）；每格写下「这一页该确认什么」。注意 `SM2-4 空间视图` 是**位置树逐层下钻**页（含面包屑与当前层物品卡片），`SM2-3 收纳建议` 是**推荐＋理由＋备选**页，两张不得压成通用列表。

| 场景 | 唤醒词 | 老页面（信息结构对齐源） |
|---|---|---|
| SM2-1 | 管位置 | `位置/location_manage.html` |
| SM2-2 | 固定位 | `位置/fixed_spot.html` |
| SM2-3 | 收纳建议 | `位置/suggest_storage.html` |
| SM2-4 | 空间视图 | `位置/space_view.html` |

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> -- pnpm test` exit 0；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 空间与位置-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号>` —— 0 命中、exit 0。

## 不许动的东西

不动其它域的页面与命令；不改共用件契约（要改回写票 2／票 3）；不碰生产库与生产产物目录；不改 `scenarios.yaml`。

## 交付物路径

`packages/skill-home/**`（本域页面与命令）；产物与墙 `.scratch/<票号>/`；域对账 `docs/skills/skill-home/scene-space.md`。

## 遗留出口

本域发现的老实现缺口与判据例外当场补票或回写票 2。

## 写集（并发用，机器验的那一份）

本票只写自己那几族：`packages/skill-home/templates/space/<族>.html` 与 `packages/skill-home/src/space/pages/<族>.ts`（族 = `location_manage`、`fixed_spot`、`suggest_storage`、`space_view`），外加 `packages/skill-home/test/space.test.mjs`、`docs/skills/skill-home/scene-space.md`、`.scratch/809/`。

**不碰**：`src/render/**` 共用件、`src/cli/**`、`package.json`、`SKILL.md`、派生件、别人的域目录与页族（要改就回写票 3 或票 2）。

跑锁一律带 `--max-wait-ms 600000`（协议上限 10 分钟，不无限等）。
