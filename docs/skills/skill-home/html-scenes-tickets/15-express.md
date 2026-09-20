## Question

快递购物域 4 条场景。新技能此刻只有 16 行骨架页换数据，这 4 条要按册子（票 1）与形状定稿（票 2）做成真页面，一条场景一份真产物。

## 目标

逐条端到端走通（唤醒词 → 命令 → 默认落 HTML → 页面）：信息结构对齐下表的老页面、UI 走新仓共用件、双端自适应、无冗余文字、无分隔符懒政。4 条各出一份产物；本域手机墙与桌面墙各一张（`--check` exit 0）；每格写下「这一页该确认什么」。注意 `SM5-3 查快递` 是**在途＋超时提醒**页、`SM5-4 囤货盘点` 是**阈值与库存状态**页，两页不得压成同一张通用列表。

| 场景 | 唤醒词 | 老页面（信息结构对齐源） |
|---|---|---|
| SM5-1 | 购物清单 | `快递购物/list.html` |
| SM5-2 | 缺货检测 | `快递购物/missing.html` |
| SM5-3 | 查快递 | `快递购物/express.html` |
| SM5-4 | 囤货盘点 | `快递购物/stock.html` |

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> -- pnpm test` exit 0；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 快递购物-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号>` —— 0 命中、exit 0。

## 不许动的东西

不动其它域的页面与命令；不改共用件契约（要改回写票 2／票 3）；不碰生产库与生产产物目录；不改 `scenarios.yaml`。

## 交付物路径

`packages/skill-home/**`（本域页面与命令）；产物与墙 `.scratch/<票号>/`；域对账 `docs/skills/skill-home/scene-express.md`。

## 遗留出口

本域发现的老实现缺口与判据例外当场补票或回写票 2。
