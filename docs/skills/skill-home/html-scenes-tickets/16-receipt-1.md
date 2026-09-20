## Question

票据凭证域（一）：购买记录与保修保养共 10 条场景。这一域是本图**缺口最实**的一域——老技能这 10 条里只有 4 条查看类真渲染页面，6 条写类**只打 JSON 回执、不落 HTML**；用户已裁（Q10）「按需求补齐，所有唤醒词都要有页面」。

## 目标

逐条端到端走通（唤醒词 → 命令 → 默认落 HTML → 页面）：信息结构对齐下表的老页面、UI 走新仓共用件、双端自适应、无冗余文字、无分隔符懒政。10 条各出一份产物（含 6 条老技能原本不出页面的：登记购买记录／登记保修／记录维修／设置保养周期／执行保养）；本域手机墙与桌面墙各一张（`--check` exit 0）；每格写下「这一页该确认什么」。写类页要有**回执语义**（做了什么、影响哪条记录、下次到期日这类派生值）。

| 场景 | 唤醒词 | 老页面（信息结构对齐源） |
|---|---|---|
| SM6-1 | 查购买记录 | `票据凭证/purchase_records.html` |
| SM6-2 | 查上月购买 | `票据凭证/purchase_records.html` |
| SM6-3 | 查今年花费 | `票据凭证/purchase_records.html` |
| SM6-4 | 查退货窗口 | `票据凭证/purchase_records.html` |
| SM6-5 | 登记购买记录 | `票据凭证/purchase_records.html`（老实现不落 HTML，按 yaml 声明补） |
| SM6-6 | 查保修状态 | `票据凭证/warranty.html` |
| SM6-7 | 登记保修 | `票据凭证/warranty.html`（老实现不落 HTML，补） |
| SM6-8 | 记录维修 | `票据凭证/warranty.html`（老实现不落 HTML，补） |
| SM6-9 | 设置保养周期 | `票据凭证/warranty.html`（老实现不落 HTML，补） |
| SM6-10 | 执行保养 | `票据凭证/warranty.html`（老实现不落 HTML，补） |

## 验收命令

① `node tooling/run-locked.mjs --ticket <本票号> -- pnpm test` exit 0；
② `node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/<本票号> 票据凭证-1-手机墙.html` exit 0（桌面墙同）；
③ `node packages/skill-home/scripts/audit-separators.mjs .scratch/<本票号>` —— 0 命中、exit 0。

## 不许动的东西

不动其它域的页面与命令；不改共用件契约（要改回写票 2／票 3）；不碰生产库与生产产物目录；**账号类密码永不明文进 HTML**（见票 17）。

## 交付物路径

`packages/skill-home/**`（本域页面与命令）；产物与墙 `.scratch/<票号>/`；域对账 `docs/skills/skill-home/scene-receipt-1.md`。

## 遗留出口

若写类页与查看类页被判为必须共用装配件，回写票 2 的页族归属表，不自行私改。
