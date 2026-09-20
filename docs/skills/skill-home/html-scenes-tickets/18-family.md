## Question

家庭协作域 2 条场景。除了做页面，这一域还带一个**实测缺口**：`借用` 唤醒词只通读侧（`src/policy/wakewords.ts:58` → `home.care.query`），写侧「借出／借入／归还／催还」（`src/cli/cmd_read.ts:757-771`）**没有任何唤醒词可达**——而 SM7-1 的场景标题就是「借用管理(借出/借入/归还/催还)」。

## 目标

① 两张真页面（对齐下表老页面），各出一份产物；本域手机墙与桌面墙各一张（`--check` exit 0）；每格写下「这一页该确认什么」。
② 把写侧接通：为借出／借入／归还／催还补上唤醒词路由（照老技能 `family_borrow.html` 的四个操作与 SKILL.md 的路由表），并补用例；**唤醒词表是 HELP 速查的唯一上游**，改它要同批重跑 HELP 构建链并让对账锁绿。
③ 借用页要有**超期标记与催还文案**（老页面有），借出／借入分区不得压成一张通用列表。

| 场景 | 唤醒词 | 老页面（信息结构对齐源） |
|---|---|---|
| SM7-1 | 借用 | `templates/family_borrow.html`（老技能此件直接躺在 `templates/` 根） |
| SM7-2 | 家人档案 | `templates/family_members.html`（同上） |

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> -- pnpm test` exit 0（含唤醒词对账锁与新增写侧用例）；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 家庭协作-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号>` —— 0 命中、exit 0；
④ 写侧自证：四个写操作各跑一次真命令链，产物与回执落盘（改坏路由必须变红）。

## 不许动的东西

不动其它域的页面与命令；不改共用件契约（要改回写票 2／票 3）；不碰生产库与生产产物目录；不改 `scenarios.yaml`（唤醒词补在 `WAKE_TABLE`）。

## 交付物路径

`packages/skill-home/**`（本域页面与命令）；产物与墙 `.scratch/<票号>/`；域对账 `docs/skills/skill-home/scene-family.md`。

## 遗留出口

若写侧唤醒词与老技能路由表的口径对不齐（老表 95 条 vs 新表 91 条），把差异写进本票并回写票 2。
