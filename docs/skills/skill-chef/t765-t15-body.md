## Question

`t769-写侧字段对账.md` §2.4 实测两处**全局缺口**，都直接影响写侧的事实正确性：

- **G1 重名进得来**：`recipes.name` 在老库上**只有普通索引、没有唯一约束**——新技能 DDL 里声明了 `UNIQUE`，但 `CREATE TABLE IF NOT EXISTS` 在老库上整句被跳过，于是约束从未生效（副本库上实测重名 `INSERT` 成功）。
- **G2 外键没开**：老件每条连接都执行 `PRAGMA foreign_keys=ON`（老件 `scripts/db_config.py:71`），新技能 `openChefDb` 没有开（`packages/skill-chef/src/fetch/db.ts:174-176`）。

在「老 schema 为权威、本次不改 schema」的前提下，**这两处各自怎么处置？**

## 目标

1. **G1** 定「重名判定」口径（拦下／允许／应用层唯一校验／立 schema 票），写清落到哪张票、以什么命令判真假。
2. **G2** 定「外键开关」落点（统一开／按调用点开／明确不开），写清改哪一件、以什么读数证明开了。
3. 两处都要给出**可复现的实测命令与读数**（正例与反例各一条）。

## 验收命令

- 正例：`node tooling/run-locked.mjs --ticket <本票号> -- node docs/skills/skill-chef/t765-t15-db-check.mjs` → 决议文件两节齐（各带「落点票号」与「正反例读数」）且 exit 0
- 反例（必跑）：删掉决议文件里任一节 → 同一条命令 exit 1 并点名缺哪一节

## 不许动的东西

- 不改老库文件、不改 schema。
- 不碰真库（全部在副本库上跑）。
- 不改老件（Python）源码。
- G2 要动新技能代码时，只改 `packages/skill-chef/src/fetch/db.ts` 这一处，且不得改变既有读命令的对外行为。

## 交付物路径

- 决议：`docs/skills/skill-chef/t765-t15-db-全局缺口决议.md`（G1／G2 两节，各带落点与正反例读数）
- 校验：`docs/skills/skill-chef/t765-t15-db-check.mjs`
- 代码（若 G2 裁「统一开」）：`packages/skill-chef/src/fetch/db.ts` 一处

## 遗留出口

- G1 若裁「立 schema 票」→ 当场开票并标出图范围。
- 其余表是否有同类「DDL 声明了但老库没生效」的约束：本票只核 `recipes.name`；要全表扫另立票。

## 进度：0%

下一步：等维护者裁 G1 与 G2，再落决议文件与校验脚本。
