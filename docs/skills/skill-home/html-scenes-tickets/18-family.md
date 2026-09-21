## Question

家庭协作域 2 条场景。除了做页面，这一域还带一个**实测缺口**：`借用` 唤醒词只通读侧（`src/policy/wakewords.ts:58` → `home.care.query`），写侧「借出／借入／归还／催还」（`src/cli/cmd_read.ts:757-771`）**没有任何唤醒词可达**——而 SM7-1 的场景标题就是「借用管理(借出/借入/归还/催还)」。

## 目标

① 两张真页面（对齐下表老页面），各出一份产物；本域手机墙与桌面墙各一张（`--check` exit 0）；每格写下「这一页该确认什么」。
② 借用页必须覆盖四个写操作（借出／借入／归还／催还）的**页面形态**；**唤醒词路由的补登记已移入票 3**（命令登记面归票 3，域票一律不碰路由表与派生件）。
③ 借用页要有**超期标记与催还文案**（老页面有），借出／借入分区不得压成一张通用列表。

| 场景 | 唤醒词 | 老页面（信息结构对齐源） |
|---|---|---|
| SM7-1 | 借用 | `templates/family_borrow.html`（老技能此件直接躺在 `templates/` 根） |
| SM7-2 | 家人档案 | `templates/family_members.html`（同上） |

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> -- pnpm test` exit 0（含唤醒词对账锁与新增写侧用例）；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 家庭协作-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号>` —— 0 命中、exit 0；
④ `node packages/skill-home/scripts/audit-page-blocks.mjs .scratch/<本票号>` exit 0 —— 本域每份产物的**必需块齐全**（按契约的族清单逐页断言，缺一块即红并点名）；
④ 写侧自证：四个写操作各跑一次真命令链，产物与回执落盘（改坏路由必须变红）。

## 不许动的东西

不动其它域的页面与命令；不改共用件契约（要改回写票 2／票 3）；不碰生产库与生产产物目录；不改 `scenarios.yaml`（唤醒词补在 `WAKE_TABLE`）。

## 交付物路径

`packages/skill-home/**`（本域页面与命令）；产物与墙 `.scratch/<票号>/`；域对账 `docs/skills/skill-home/scene-family.md`。

## 遗留出口

若写侧唤醒词与老技能路由表的口径对不齐（老表 95 条 vs 新表 91 条），把差异写进本票并回写票 2。

## 写集（并发用，机器验的那一份）

本票只写自己那几族：`packages/skill-home/templates/family/<族>.html` 与 `packages/skill-home/src/family/pages/<族>.ts`（族 = `family_borrow`、`family_members`），外加 `packages/skill-home/test/family.test.mjs`、`docs/skills/skill-home/scene-family.md`、`.scratch/815/`。

**不碰**：`src/render/**` 共用件、`src/cli/**`、`package.json`、`SKILL.md`、派生件、别人的域目录与页族（要改就回写票 3 或票 2）。

跑锁一律带 `--max-wait-ms 600000`（协议上限 10 分钟，不无限等）。
