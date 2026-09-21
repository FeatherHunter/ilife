## Question

票据凭证域（二）：证件管理与账号密码共 8 条场景。与（一）同样，老技能这 8 条里只有 3 条查看类真渲染，5 条写类只打 JSON；用户已裁（Q10）按需求补齐页面。

## 目标

逐条端到端走通（唤醒词 → 命令 → 默认落 HTML → 页面）：信息结构对齐下表的老页面、UI 走新仓共用件、双端自适应、无冗余文字、无分隔符懒政。8 条各出一份产物；本域手机墙与桌面墙各一张（`--check` exit 0）；每格写下「这一页该确认什么」。
**红线**：号码脱敏（证件号只显后 4 位）、密码**永不明文进 HTML**（`SM6-18 看密码` 的老实现是「只在本会话回显、永不进 HTML」，新页面要守住这条——页面只能给「已核验／未核验」与操作入口，不得渲染明文）。

| 场景 | 唤醒词 | 老页面（信息结构对齐源） |
|---|---|---|
| SM6-11 | 查证件到期 | `票据凭证/certificates.html` |
| SM6-12 | 登记证件 | `票据凭证/certificates.html`（老实现不落 HTML，补） |
| SM6-13 | 证件归档 | `票据凭证/certificates.html`（老实现不落 HTML，补） |
| SM6-14 | 更新证件 | `票据凭证/certificates.html`（老实现不落 HTML，补） |
| SM6-15 | 查账号 | `票据凭证/accounts.html` |
| SM6-16 | 存账号 | `票据凭证/accounts.html`（老实现不落 HTML，补） |
| SM6-17 | 改账号 | `票据凭证/accounts.html`（老实现不落 HTML，补） |
| SM6-18 | 看密码 | `票据凭证/accounts.html`（老实现不落 HTML，补；页面禁渲染明文） |

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> --max-wait-ms 600000 -- node --test packages/skill-home/test/<域>-*.test.mjs` exit 0（**只跑自己那份用例**——持锁只做一件事、缩短排队；全量 `pnpm test` 留给收口票）；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 票据凭证-2-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号>` —— 0 命中、exit 0；
④ `node packages/skill-home/scripts/audit-page-blocks.mjs .scratch/<本票号>` exit 0 —— 本域每份产物的**必需块齐全**（按契约的族清单逐页断言，缺一块即红并点名）；
④ 脱敏自证：对一批产物跑「明文密码／完整证件号不得出现」的检查，**改坏必须变红**。

## 不许动的东西

不动其它域的页面与命令；不改共用件契约（要改回写票 2／票 3）；不碰生产库与生产产物目录；不许把明文密码／完整证件号写进任何落盘产物。

## 交付物路径

`packages/skill-home/**`（本域页面与命令）；产物与墙 `.scratch/<票号>/`；域对账 `docs/skills/skill-home/scene-receipt-2.md`。

## 遗留出口

脱敏判据若要提升为跨域共用件，回写票 6 并当场补票。

## 写集（并发用，机器验的那一份）

本票只写自己那几族：`packages/skill-home/templates/receipt/<族>.html` 与 `packages/skill-home/src/receipt/pages/<族>.ts`（族 = `certificates`、`accounts`），外加 `packages/skill-home/test/receipt-2.test.mjs`、`docs/skills/skill-home/scene-receipt-2.md`、`.scratch/814/`。

**不碰**：`src/render/**` 共用件、`src/cli/**`、`package.json`、`SKILL.md`、派生件、别人的域目录与页族（要改就回写票 3 或票 2）。

跑锁一律带 `--max-wait-ms 600000`（协议上限 10 分钟，不无限等）。
