# t687 · bill parity 审计清单（三张表）

- 票：[bill parity 审计清单（三张表）](https://github.com/FeatherHunter/ilife/issues/687)（父图 [#681 饼干记账本体图](https://github.com/FeatherHunter/ilife/issues/681)）
- 审计日期：2026-09-17 · 审计性质：**只审计不改动**（本票「不在本票内」第 1 条）
- 事实源：老仓 `D:\2Study\StudyNotes\SKILLS\饼干记账`（静态读）；新仓 `packages/skill-bill`（src／dist 静态读 ＋ 合成库实测）
- 铁律：**未运行老 Python**（只静态读 ＋ grep 计数）；**未触碰真实库**（`SKILLS_DB_PATH` 全程指向 `%TEMP%\t687-sim-*` 合成库）

## 0 结论速览

| # | 项 | 本次实测 | 锚点 |
| --- | --- | --- | --- |
| 1 | 词层：老侧唤醒词 | `scenes/*.yaml` 71 场景／**70 唯一词**；`references/路由表.md` 74 行 ＝ 70 功能 ＋ 4 HELP；两见证**互相零差集** | `scenes/*.yaml`；`references/路由表.md:82` |
| 2 | 词层：新仓在位 | `WAKE_TABLE` **77**（73 功能 ＋ 4 HELP）；场景资产 74 场景／73 词；表 ↔ 资产**双向零差集**；老 74 里 **73 条逐字在位** | `src/policy/wakewords.ts:23-121`；`test/wake-assets.test.mjs:68-84` |
| 3 | 词层结论 | **onlyOld = 1**（「饼干记账 帮助」，带空格）／**onlyNew = 4**（`记一笔`／`查账单`／`查账单详情`／`饼干记账帮助`，无空格）。**词层不是零废弃**——差异全在空格上，见 §2 第 72 行 | 本清单 §2；§5 新发现 1 |
| 4 | 键层：16 条命令 | 合成库实测 **16/16 exit 0**；但只有 **6 条**出域整页（2554–2609 行），**10 条**仍出 **16 行空壳页**（976–1,247 B） | `.scratch/t687/probe.json` |
| 5 | 键层：四处一致 | 能力声明 **6/16**、SKILL 速查 **16/16**、分派 **16/16**、生成物 **6/16**（另 10 条的形状住 `src/render/envelope.ts:10-21` 过渡表） | `pnpm --filter skill-bill gen:check` PASS（命令 6 条／能力 2 个） |
| 6 | 键层：专测覆盖 | 16 条里 **7 条**有专测（写入 2 ＋ 查询 4 ＋ HELP 1）；**9 条**只有 `test/cli.test.mjs` 冒烟 | 本清单 §3 |
| 7 | 页面层：老侧模板 | 落盘 **24 张** `.html`（另 `help.html.bak.v2.4` 1 个）；**逐张都有老承载脚本**（写入 5／查询 1／分析 1／目标 4／账户 4／开始使用 6／联动 3） | `scripts/render_write.py:41-45`、`bill_inject.py:47-48`、`goal/render.py:65-68`、`account/render.py:120-276`、`setup/render.py:54-64`、`link/cli.py:59,82,457` |
| 8 | 页面层：新仓落点 | **6 张有落点**（写入 5 ＋ 查询 1）、**1 张部分落点**（`联动/receipt.html`：出 receipt 文案不出页）、**17 张无落点** | 本清单 §4 |
| 9 | 页面层：计数订正 | 票面「58 个可渲染形态」**无法从锚点唯一复现**；三个可复现读数：场景级 **71** 条／去重 **50** 个／老渲染器入口 **58** 个（§5 订正 1） | `scenes/*.yaml`；§5 |
| 10 | 新发现 | ①`cmd_read.ts` 已 **493 行**（票面 485 是 #677 之前的读数）；②HELP 第 2 条老「饼干记账 帮助」带空格、新表无空格，**该词在新仓路由不到** | §5 订正 2／新发现 1 |

## 1 方法与证据边界

### 1.1 做了什么

1. **词层**：老 `scenes/*.yaml` 逐行解析（域／二级组／唤醒词／场景 id／`html.template`），老 `references/路由表.md` 逐行解析；新仓从 `dist/policy/wakewords.js` 的 `WAKE_TABLE` 与 `dist/triggers/wake-assets.js` 的 `WAKE_ASSETS` 取值；四条线做双向差集 ＋ 逐词 sha256（前 12 位）＋ 逐词真跑 `routeWakeword`（带全套槽位上下文）。
2. **键层**：`src/*/commands.ts`（能力声明）、`SKILL.md` 注入速查表、`src/cli/cmd_read.ts`（分派）、`src/cli/registry.ts`（`pnpm gen` 生成物）四处逐条比对；`pnpm --filter skill-bill gen:check` 持锁实跑。
3. **页面层**：老 24 张模板逐张回查它的**老承载者**（渲染脚本 `file:行`），再对到新仓落点（`src/record/`／`src/query/`／`templates/` 16 张）。
4. **运行证据**：`.scratch/t687/probe.mjs` 在 `%TEMP%` 合成库上真跑 16 条命令（种子 4 笔，退出码 0,0,0,0），每条带 `--html` 落盘后量字节数／LF／页型标记。

### 1.2 证据等级（显式标注，不得混用）

| 等级 | 含义 | 本清单里是谁 |
| --- | --- | --- |
| **静态读** | 只读源码／文档／资产，不运行 | 词层的清单与 sha；键层的四处一致；页面层的老承载者与新仓落点 |
| **合成库实测** | `%TEMP%\t687-sim-*` 合成库上真跑新仓 CLI／纯函数 | 键层的 exit／shape／HTML 字节数与页型；词层的 `routeWakeword` 逐词命中 |
| **真实数据证据** | 未采集 | **0 条**——本票禁碰真实库（`docs/calorie-parity-39.md:4` 铁律；`src/fetch/paths.ts:32` 的隔离守卫拦非 tmp 写库） |

### 1.3 复跑

```powershell
cd D:\ilife
node .scratch/t687/extract.mjs                 # 词层清单事实（words.json / scenes.json）
node .scratch/t687/keys.mjs                    # 键层四处事实（keys.json）
node tooling/run-locked.mjs --ticket 687 -- node .scratch/t687/probe.mjs   # 合成库实测（probe.json）
node .scratch/t687/emit.mjs                    # 重出本清单
```

—— 以下三张表。列口径：`现状（实测）` 只写本次量到的读数与判定档；`证据` 一律给 `file:行号` 或票号；`处置建议` 只出「补／不补」两档（补＝本图之内要做的）。

## 2 词层清单（77 行 ＝ 老 74 ＋ 新增 4）

口径：老侧一行一词（HELP 4 条不是场景词，单列；`scenes/*.yaml` 里没有它们，权威是 `references/路由表.md:77-80`）；`sha` ＝ 词串 UTF-8 的 sha256 前 12 位（改一个字即变）。

| # | 项（唤醒词） | 现状（实测） | 证据（file / issue） | 处置建议（补／不补） | 归属 |
| --- | --- | --- | --- | --- | --- |
| 1 | 「记支出」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_expense ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:16`（场景 write-1-1）、`references/路由表.md:7`（#11）、`src/policy/wakewords.ts:30`、`SKILL.md:35`、sha `333534ccc82f` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 2 | 「记收入」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_income ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:36`（场景 write-2-1）、`references/路由表.md:8`（#12）、`src/policy/wakewords.ts:31`、`SKILL.md:36`、sha `f9e1d672b775` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 3 | 「拍账单」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_bill_photo ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:55`（场景 write-3-1）、`references/路由表.md:9`（#13）、`src/policy/wakewords.ts:32`、`SKILL.md:37`、sha `d21718812872` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 4 | 「批量录入」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_batch ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:67`（场景 write-4-1）、`references/路由表.md:10`（#14）、`src/policy/wakewords.ts:33`、`SKILL.md:38`、sha `33fedb8895f2` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 5 | 「记退款」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_refund ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:84`（场景 write-10-1）、`references/路由表.md:11`（#15）、`src/policy/wakewords.ts:34`、`SKILL.md:39`、sha `73a02c5634fe` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 6 | 「记报销」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_reimburse ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:100`（场景 write-8-1）、`references/路由表.md:12`（#16）、`src/policy/wakewords.ts:35`、`SKILL.md:40`、sha `c9edfab79148` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 7 | 「报销到账」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_reimburse_done ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:117`（场景 write-9-1）、`references/路由表.md:13`（#17）、`src/policy/wakewords.ts:36`、`SKILL.md:41`、sha `3ddf9bb94916` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 8 | 「记借出」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_lend ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:132`（场景 write-11-1）、`references/路由表.md:14`（#18）、`src/policy/wakewords.ts:37`、`SKILL.md:42`、sha `e7440627995b` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 9 | 「记借入」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_borrow ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:148`（场景 write-12-1）、`references/路由表.md:15`（#19）、`src/policy/wakewords.ts:38`、`SKILL.md:43`、sha `b089e4032220` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 10 | 「记收回」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_collect ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:164`（场景 write-13-1）、`references/路由表.md:16`（#20）、`src/policy/wakewords.ts:39`、`SKILL.md:44`、sha `4faec78cc166` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 11 | 「记偿还」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_payback ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:178`（场景 write-14-1）、`references/路由表.md:17`（#21）、`src/policy/wakewords.ts:40`、`SKILL.md:45`、sha `7e8e82b2f24c` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 12 | 「记分期」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.add`） ＋ 场景资产 write_installment ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:192`（场景 write-15-1）、`references/路由表.md:18`（#22）、`src/policy/wakewords.ts:41`、`SKILL.md:46`、sha `cb42b11b6335` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 13 | 「改记录」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.update`） ＋ 场景资产 write_update ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:213`（场景 write-5-1）、`references/路由表.md:19`（#23）、`src/policy/wakewords.ts:48`、`SKILL.md:48`、sha `6267e849dee4` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 14 | 「撤销」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.update`） ＋ 场景资产 write_undo ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:228`（场景 write-6-1）、`references/路由表.md:20`（#24）、`src/policy/wakewords.ts:49`、`SKILL.md:49`、sha `926a50b98ece` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 15 | 「恢复」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.update`） ＋ 场景资产 write_restore ＋ SKILL 速查；实测路由 **命中** | `scenes/write.yaml:242`（场景 write-7-1）、`references/路由表.md:21`（#25）、`src/policy/wakewords.ts:50`、`SKILL.md:50`、sha `e0534b8a4e46` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 16 | 「查今天」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.today`） ＋ 场景资产 query_today ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:11`（场景 query-1-1）、`references/路由表.md:22`（#51）、`src/policy/wakewords.ts:52`、`SKILL.md:51`、sha `4a2227b60b08` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 17 | 「查昨天」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.today`） ＋ 场景资产 query_yesterday ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:23`（场景 query-2-1）、`references/路由表.md:23`（#52）、`src/policy/wakewords.ts:53`、`SKILL.md:52`、sha `1b7c4f153bb8` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 18 | 「查某天」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.today`） ＋ 场景资产 query_date ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:35`（场景 query-3-1）、`references/路由表.md:24`（#53）、`src/policy/wakewords.ts:54`、`SKILL.md:53`、sha `13f2949b8223` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 19 | 「查最近」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.today`） ＋ 场景资产 query_recent ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:49`（场景 query-4-1）、`references/路由表.md:25`（#54）、`src/policy/wakewords.ts:55`、`SKILL.md:54`、sha `643281e4a018` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 20 | 「查周」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.range`） ＋ 场景资产 query_week ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:65`（场景 query-5-1）、`references/路由表.md:26`（#55）、`src/policy/wakewords.ts:58`、`SKILL.md:56`、sha `5d9401ccc4eb` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 21 | 「查月」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.range`） ＋ 场景资产 query_month ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:79`（场景 query-6-1）、`references/路由表.md:27`（#56）、`src/policy/wakewords.ts:59`、`SKILL.md:57`、sha `5c6c7ec2688d` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 22 | 「查区间」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.range`） ＋ 场景资产 query_range ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:93`（场景 query-7-1）、`references/路由表.md:28`（#57）、`src/policy/wakewords.ts:60`、`SKILL.md:58`、sha `b1bf50dac248` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 23 | 「查分类」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.range`） ＋ 场景资产 query_category ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:110`（场景 query-8-1）、`references/路由表.md:29`（#58）、`src/policy/wakewords.ts:61`、`SKILL.md:59`、sha `77f3fda7e586` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 24 | 「搜备注」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.search`） ＋ 场景资产 query_search ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:128`（场景 query-9-1）、`references/路由表.md:30`（#59）、`src/policy/wakewords.ts:65`、`SKILL.md:62`、sha `ba9e61b81347` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 25 | 「查标签」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.search`） ＋ 场景资产 query_tag ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:142`（场景 query-10-1）、`references/路由表.md:31`（#60）、`src/policy/wakewords.ts:66`、`SKILL.md:63`、sha `ceace390b05c` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 26 | 「查账户」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.range`） ＋ 场景资产 query_account ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:156`（场景 query-11-1）、`references/路由表.md:32`（#61）、`src/policy/wakewords.ts:62`、`SKILL.md:60`、sha `b4179465b7f0` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 27 | 「查账本」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.range`） ＋ 场景资产 query_ledger ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:171`（场景 query-12-1）、`references/路由表.md:33`（#62）、`src/policy/wakewords.ts:63`、`SKILL.md:61`、sha `0036ca6bf9f6` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 28 | 「查欠款」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.search`） ＋ 场景资产 query_debt ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:188`（场景 query-13-1）、`references/路由表.md:34`（#63）、`src/policy/wakewords.ts:67`、`SKILL.md:64`、sha `51ecedfead11` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 29 | 「查待报销」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.search`） ＋ 场景资产 query_pending_reimburse ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:202`（场景 query-14-1）、`references/路由表.md:35`（#64）、`src/policy/wakewords.ts:68`、`SKILL.md:65`、sha `1667978c523b` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 30 | 「查分期」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.record.search`） ＋ 场景资产 query_installment ＋ SKILL 速查；实测路由 **命中** | `scenes/query.yaml:214`（场景 query-15-1）、`references/路由表.md:36`（#65）、`src/policy/wakewords.ts:69`、`SKILL.md:66`、sha `a6ddddebe5ae` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 31 | 「看月度」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.overview`） ＋ 场景资产 monthly_summary ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:12`（场景 analysis-1-1）、`references/路由表.md:37`（#81）、`src/policy/wakewords.ts:73`、`SKILL.md:68`、sha `aa1d0070ba8a` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 32 | 「看年度」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.overview`） ＋ 场景资产 yearly_summary ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:26`（场景 analysis-2-1）、`references/路由表.md:38`（#82）、`src/policy/wakewords.ts:74`、`SKILL.md:69`、sha `d5c9b158a1d4` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 33 | 「看总览」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.overview`） ＋ 场景资产 range_overview ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:40`（场景 analysis-3-1）、`references/路由表.md:39`（#83）、`src/policy/wakewords.ts:75`、`SKILL.md:70`、sha `db54e974fbfc` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 34 | 「看周报」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.overview`） ＋ 场景资产 week_brief ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:55`（场景 analysis-4-1）、`references/路由表.md:40`（#84）、`src/policy/wakewords.ts:76`、`SKILL.md:71`、sha `81d892c7d5e5` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 35 | 「看分类」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.overview`） ＋ 场景资产 category_breakdown ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:71`（场景 analysis-5-1）、`references/路由表.md:41`（#85）、`src/policy/wakewords.ts:77`、`SKILL.md:72`、sha `0afe84129320` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 36 | 「看账户」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.overview`） ＋ 场景资产 account_breakdown ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:87`（场景 analysis-6-1）、`references/路由表.md:42`（#86）、`src/policy/wakewords.ts:78`、`SKILL.md:73`、sha `3d37c1a77c3b` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 37 | 「看账本」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.overview`） ＋ 场景资产 ledger_summary ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:101`（场景 analysis-7-1）、`references/路由表.md:43`（#87）、`src/policy/wakewords.ts:79`、`SKILL.md:74`、sha `e22e2443810d` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 38 | 「看结构」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.overview`） ＋ 场景资产 income_expense_structure ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:115`（场景 analysis-8-1）、`references/路由表.md:44`（#88）、`src/policy/wakewords.ts:80`、`SKILL.md:75`、sha `793b530f11c9` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 39 | 「看对比」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.compare`） ＋ 场景资产 period_compare ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:131`（场景 analysis-9-1）、`references/路由表.md:45`（#89）、`src/policy/wakewords.ts:83`、`SKILL.md:77`、sha `148dacf2d542` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 40 | 「看双区间」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.compare`） ＋ 场景资产 range_compare ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:145`（场景 analysis-10-1）、`references/路由表.md:46`（#90）、`src/policy/wakewords.ts:84`、`SKILL.md:78`、sha `61999692af4e` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 41 | 「看同比」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.compare`） ＋ 场景资产 year_over_year ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:160`（场景 analysis-11-1）、`references/路由表.md:47`（#91）、`src/policy/wakewords.ts:85`、`SKILL.md:79`、sha `e444b1732e2f` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 42 | 「看分类对比」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.compare`） ＋ 场景资产 category_compare ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:174`（场景 analysis-12-1）、`references/路由表.md:48`（#92）、`src/policy/wakewords.ts:86`、`SKILL.md:80`、sha `a8f93d90c2d6` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 43 | 「看趋势」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 monthly_trend ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:191`（场景 analysis-13-1）、`references/路由表.md:49`（#93）、`src/policy/wakewords.ts:88`、`SKILL.md:81`、sha `d44410466510` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 44 | 「看分类趋势」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 category_trend ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:205`（场景 analysis-14-1）、`references/路由表.md:50`（#94）、`src/policy/wakewords.ts:89`、`SKILL.md:82`、sha `7b47e824cdb9` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 45 | 「看大额」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 top_expense ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:222`（场景 analysis-15-1）、`references/路由表.md:51`（#95）、`src/policy/wakewords.ts:90`、`SKILL.md:83`、sha `fd4dc71215ef` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 46 | 「看高频」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 top_frequency ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:237`（场景 analysis-16-1）、`references/路由表.md:52`（#96）、`src/policy/wakewords.ts:91`、`SKILL.md:84`、sha `3954fccab774` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 47 | 「看分布」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 amount_distribution ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:252`（场景 analysis-17-1）、`references/路由表.md:53`（#97）、`src/policy/wakewords.ts:92`、`SKILL.md:85`、sha `516847d8aa21` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 48 | 「做统计」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.overview`） ＋ 场景资产 stats ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:269`（场景 analysis-18-1）、`references/路由表.md:54`（#98）、`src/policy/wakewords.ts:81`、`SKILL.md:76`、sha `a8cb41c7fc79` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 49 | 「看活跃」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 activity ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:281`（场景 analysis-19-1）、`references/路由表.md:55`（#99）、`src/policy/wakewords.ts:93`、`SKILL.md:86`、sha `b619ef2eecee` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 50 | 「看洞察」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 insight ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:293`（场景 analysis-20-1）、`references/路由表.md:56`（#100）、`src/policy/wakewords.ts:94`、`SKILL.md:87`、sha `b7b0c9857a0b` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 51 | 「看异常」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 anomaly ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:307`（场景 analysis-21-1）、`references/路由表.md:57`（#101）、`src/policy/wakewords.ts:95`、`SKILL.md:88`、sha `5b50875ce34e` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 52 | 「看借贷」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 debt_summary ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:323`（场景 analysis-22-1）、`references/路由表.md:58`（#102）、`src/policy/wakewords.ts:96`、`SKILL.md:89`、sha `4d62d134c39c` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 53 | 「看报销」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 reimburse_summary ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:335`（场景 analysis-23-1）、`references/路由表.md:59`（#103）、`src/policy/wakewords.ts:97`、`SKILL.md:90`、sha `8f575c27b99d` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 54 | 「看分期」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 installment_summary ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:349`（场景 analysis-24-1）、`references/路由表.md:60`（#104）、`src/policy/wakewords.ts:98`、`SKILL.md:91`、sha `a184d2e17014` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 55 | 「看退款」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.analysis.trend`） ＋ 场景资产 refund_summary ＋ SKILL 速查；实测路由 **命中** | `scenes/analysis.yaml:361`（场景 analysis-25-1）、`references/路由表.md:61`（#105）、`src/policy/wakewords.ts:99`、`SKILL.md:92`、sha `f6cc727ddf54` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 56 | 「设定预算」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.goal.write`） ＋ 场景资产 goal_set_budget ＋ SKILL 速查；实测路由 **命中** | `scenes/goal.yaml:10`（场景 goal-1-1）、`references/路由表.md:62`（#111）、`src/policy/wakewords.ts:101`、`SKILL.md:93`、sha `25a245ddd3e1` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 57 | 「看预算」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.goal.query`） ＋ 场景资产 goal_budget_status ＋ SKILL 速查；实测路由 **命中** | `scenes/goal.yaml:26`（场景 goal-2-1）、`references/路由表.md:63`（#112）、`src/policy/wakewords.ts:104`、`SKILL.md:95`、sha `945cdeb6184b` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 58 | 「设定目标」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.goal.write`） ＋ 场景资产 goal_set_saving ＋ SKILL 速查；实测路由 **命中** | `scenes/goal.yaml:42`（场景 goal-3-1）、`references/路由表.md:64`（#113）、`src/policy/wakewords.ts:102`、`SKILL.md:94`、sha `5e2886a77e20` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 59 | 「看目标」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.goal.query`） ＋ 场景资产 goal_saving_status ＋ SKILL 速查；实测路由 **命中** | `scenes/goal.yaml:58`（场景 goal-4-1）、`references/路由表.md:65`（#114）、`src/policy/wakewords.ts:105`、`SKILL.md:96`、sha `d7912d0938c4` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 60 | 「新增账户」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.account.write`） ＋ 场景资产 account_add ＋ SKILL 速查；实测路由 **命中** | `scenes/account.yaml:10`（场景 account-1-1）、`references/路由表.md:66`（#121）、`src/policy/wakewords.ts:107`、`SKILL.md:97`、sha `fc5fd6f4364d` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 61 | 「改账户」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.account.write`） ＋ 场景资产 account_update ＋ SKILL 速查；实测路由 **命中** | `scenes/account.yaml:25`（场景 account-2-1）、`references/路由表.md:67`（#122）、`src/policy/wakewords.ts:108`、`SKILL.md:98`、sha `d6b488a8a1a3` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 62 | 「账户转账」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.account.write`） ＋ 场景资产 account_transfer ＋ SKILL 速查；实测路由 **命中** | `scenes/account.yaml:40`（场景 account-3-1）、`references/路由表.md:68`（#123）、`src/policy/wakewords.ts:109`、`SKILL.md:99`、sha `4f5adb107d7c` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 63 | 「看账户汇总」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.account.query`） ＋ 场景资产 account_summary ＋ SKILL 速查；实测路由 **命中** | `scenes/account.yaml:57`（场景 account-4-1）、`references/路由表.md:69`（#124）、`src/policy/wakewords.ts:111`、`SKILL.md:100`、sha `83abcb91a51f` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 64 | 「买东西」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.link.submit`） ＋ 场景资产 link_purchase ＋ SKILL 速查；实测路由 **命中** | `scenes/link.yaml:10`（场景 link-1-1）、`references/路由表.md:70`（#131）、`src/policy/wakewords.ts:113`、`SKILL.md:101`、sha `ce2fed7e7e56` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 65 | 「吃饭」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.link.submit`） ＋ 场景资产 link_meal ＋ SKILL 速查；实测路由 **命中** | `scenes/link.yaml:26`（场景 link-2-1）、`references/路由表.md:71`（#132）、`src/policy/wakewords.ts:114`、`SKILL.md:102`、sha `e1d2a9310891` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 66 | 「初始化」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.setup.run`） ＋ 场景资产 setup_init_wizard ＋ SKILL 速查；实测路由 **命中** | `scenes/setup.yaml:14`（场景 setup-1-1）、`references/路由表.md:72`（#1）、`src/policy/wakewords.ts:116`、`SKILL.md:103`、sha `65622e8ee9fb` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 67 | 「初始化状态」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.setup.run`） ＋ 场景资产 setup_init_status ＋ SKILL 速查；实测路由 **命中** | `scenes/setup.yaml:26`（场景 setup-1-2）、`references/路由表.md:73`（#2）、`src/policy/wakewords.ts:117`、`SKILL.md:104`、sha `4cd34c50c9f2` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 68 | 「备份」 | 老 **2 场景**；新仓在位：`WAKE_TABLE`（`bill.setup.run`） ＋ 场景资产 setup_backup_create、setup_backup_list ＋ SKILL 速查；实测路由 **命中** | `scenes/setup.yaml:40`（场景 setup-2-1、setup-2-2）、`references/路由表.md:74`（#3）、`src/policy/wakewords.ts:118`、`SKILL.md:105`、sha `70e372abbae5` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 69 | 「恢复备份」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.setup.run`） ＋ 场景资产 setup_restore ＋ SKILL 速查；实测路由 **命中** | `scenes/setup.yaml:61`（场景 setup-2-3）、`references/路由表.md:75`（#4）、`src/policy/wakewords.ts:119`、`SKILL.md:106`、sha `1ae486278078` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 70 | 「导入」 | 老 **1 场景**；新仓在位：`WAKE_TABLE`（`bill.setup.run`） ＋ 场景资产 setup_import ＋ SKILL 速查；实测路由 **命中** | `scenes/setup.yaml:77`（场景 setup-3-1）、`references/路由表.md:76`（#5）、`src/policy/wakewords.ts:120`、`SKILL.md:107`、sha `576d81bb0631` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 71 | 「饼干记账 HELP」 | 老 **0 场景**（HELP 短语，非场景词）；新仓在位：`WAKE_TABLE`（`bill.help.lookup`）（场景目录不收 HELP 短语，防自指） ＋ SKILL 速查；实测路由 **命中** | `references/路由表.md:77`（#141）、`src/policy/wakewords.ts:25`、`SKILL.md:31`、sha `b8440b10848d` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 72 | 「饼干记账 帮助」 | 老 **0 场景**（HELP 短语）；**onlyOld**：新表**没有这一条**，实测 `routeWakeword('饼干记账 帮助')` 抛「无命中唤醒词」；新表另有一条**无空格**的变体「饼干记账帮助」（见第 78 行） | `references/路由表.md:78`（#142）、**新表无此词**、**速查表无此行**、sha `7c06ec0529ae` | 补（成本一行：把这 4 条 HELP 短语按老侧逐字补进 `WAKE_TABLE`） | #681 本体图（词层收口）／#686 机器面 |
| 73 | 「查帮助」 | 老 **0 场景**（HELP 短语，非场景词）；新仓在位：`WAKE_TABLE`（`bill.help.lookup`）（场景目录不收 HELP 短语，防自指） ＋ SKILL 速查；实测路由 **命中** | `references/路由表.md:79`（#143）、`src/policy/wakewords.ts:27`、`SKILL.md:33`、sha `661a89b428ed` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 74 | 「能做什么」 | 老 **0 场景**（HELP 短语，非场景词）；新仓在位：`WAKE_TABLE`（`bill.help.lookup`）（场景目录不收 HELP 短语，防自指） ＋ SKILL 速查；实测路由 **命中** | `references/路由表.md:80`（#144）、`src/policy/wakewords.ts:28`、`SKILL.md:34`、sha `2ede4ed1a505` | 不补（老词在位，逐字一致） | #681 本体图（词层已定：清单权威 ＝ 老 `scenes/*.yaml`） |
| 75 | 「记一笔」 | **onlyNew**（老侧无此词）；新仓在位：`WAKE_TABLE` ＋ 场景资产 write_record ＋ SKILL 速查 | `src/policy/wakewords.ts:42`、`SKILL.md:47`、`test/wake-assets.test.mjs:12`（`ADDED_IDS`）；sha `5a15649c2481` | 不补（新增 3 条是 #681 Q8=A 已批的口径） | #681 本体图 |
| 76 | 「查账单」 | **onlyNew**（老侧无此词）；新仓在位：`WAKE_TABLE` ＋ 场景资产 query_bills ＋ SKILL 速查 | `src/policy/wakewords.ts:56`、`SKILL.md:55`、`test/wake-assets.test.mjs:12`（`ADDED_IDS`）；sha `22926953dba9` | 不补（新增 3 条是 #681 Q8=A 已批的口径） | #681 本体图 |
| 77 | 「查账单详情」 | **onlyNew**（老侧无此词）；新仓在位：`WAKE_TABLE` ＋ 场景资产 query_bill_detail ＋ SKILL 速查 | `src/policy/wakewords.ts:71`、`SKILL.md:67`、`test/wake-assets.test.mjs:12`（`ADDED_IDS`）；sha `b1307d63179c` | 不补（新增 3 条是 #681 Q8=A 已批的口径） | #681 本体图 |
| 78 | 「饼干记账帮助」 | **onlyNew（HELP 变体）**：老侧那一条是「饼干记账 帮助」（中间一个空格，`references/路由表.md:78`），新表写成了**无空格**版本——即这一条替换掉了老侧同一位置的第 2 条 HELP 词（上表第 72 行） | `src/policy/wakewords.ts:26`、`SKILL.md:32`；sha `c57a4e3afe38` | 补（与第 72 行同一条处置：两条并存，按老侧再补带空格那条） | #681 本体图（词层收口）／#686 机器面 |

**小计**：老 74 行里 **73 条逐字在位 ＋ 1 条 onlyOld**（「饼干记账 帮助」，只差一个空格）；新表 77 条 ＝ 老 73 ＋ **onlyNew 4**（3 条功能新词 ＋ 1 条 HELP 空格变体）。

## 3 键层清单（16 行）

四处口径：① **能力声明**＝各能力目录 `commands.ts`（权威源）② **SKILL 速查**＝`SKILL.md` 构建期注入表 ③ **分派**＝`src/cli/cmd_read.ts` ④ **生成物**＝`src/cli/registry.ts`（`pnpm gen` 派生，`gen:check` 验真）。

判定档：**可用** ＝ 有专测断言 ＋ 有域整页；**可用（弱）** ＝ 只在 `cli.test.mjs` 冒烟过（或只有自洽性专测），页面只有 16 行空壳；后缀 `· 域页缺口` ＝ 老侧对应的那张域整页／图表在新仓**整件不在**（销账处在 §4）。

| # | 项（命令） | 现状（实测） | 证据（file / issue） | 处置建议（补／不补） | 归属 |
| --- | --- | --- | --- | --- | --- |
| 1 | `bill.record.add`（写·receipt；13 条词） | **可用**；合成库实测 **exit 0**，shape `receipt`；HTML **77,247 B／2554 行**（**域整页**）；专测：`test/record-write.test.mjs:51`、`t410-lock`、`frozen-blocks`、`shared-judgments`、`user-wording`、`desktop-copy`；四处：能力声明 `src/record/commands.ts:18` ✓／SKILL 速查 ✓／分派（注册表，`cmd_read.ts:457`）✓／生成物 ✓ | `src/record/commands.ts:18`、`SKILL.md:35`、`.scratch/t687/probe.json` | 不补（本票只审计；写入域的手艺在 #689 那张票里） | #689 write 域优化票 |
| 2 | `bill.record.update`（写·receipt；3 条词） | **可用**；合成库实测 **exit 0**，shape `receipt`；HTML **76,062 B／2554 行**（**域整页**）；专测：`test/record-write.test.mjs:51`、`t410-lock`、`frozen-blocks`、`shared-judgments`、`user-wording`；四处：能力声明 `src/record/commands.ts:27` ✓／SKILL 速查 ✓／分派（注册表，`cmd_read.ts:457`）✓／生成物 ✓ | `src/record/commands.ts:27`、`SKILL.md:48`、`.scratch/t687/probe.json` | 不补（同上） | #689 write 域优化票 |
| 3 | `bill.record.today`（读·list；5 条词） | **可用**；合成库实测 **exit 0**，shape `list`；HTML **76,715 B／2584 行**（**域整页**）；专测：`test/t412-record-today.test.mjs`、`t416-query-wiring`、`t417-query-lock`；四处：能力声明 `src/query/commands.ts:19` ✓／SKILL 速查 ✓／分派（注册表，`cmd_read.ts:457`）✓／生成物 ✓ | `src/query/commands.ts:19`、`SKILL.md:51`、`.scratch/t687/probe.json` | 不补（查询域的手艺在 #690 那张票里） | #690 query 域优化票 |
| 4 | `bill.record.range`（读·list；6 条词） | **可用**；合成库实测 **exit 0**，shape `list`；HTML **80,322 B／2609 行**（**域整页**）；专测：`test/t413-record-range.test.mjs`、`t416`、`t417`；四处：能力声明 `src/query/commands.ts:28` ✓／SKILL 速查 ✓／分派（注册表，`cmd_read.ts:457`）✓／生成物 ✓ | `src/query/commands.ts:28`、`SKILL.md:56`、`.scratch/t687/probe.json` | 不补（同上） | #690 query 域优化票 |
| 5 | `bill.record.search`（读·list；5 条词） | **可用**；合成库实测 **exit 0**，shape `list`；HTML **74,921 B／2572 行**（**域整页**）；专测：`test/t414-record-search.test.mjs`、`t416`、`t417`、`t418-query-visual`；四处：能力声明 `src/query/commands.ts:37` ✓／SKILL 速查 ✓／分派（注册表，`cmd_read.ts:457`）✓／生成物 ✓ | `src/query/commands.ts:37`、`SKILL.md:62`、`.scratch/t687/probe.json` | 不补（同上） | #690 query 域优化票 |
| 6 | `bill.record.detail`（读·detail；1 条词） | **可用**；合成库实测 **exit 0**，shape `detail`；HTML **75,186 B／2580 行**（**域整页**）；专测：`test/t415-record-detail.test.mjs`、`t416`、`t417`、`t418`；四处：能力声明 `src/query/commands.ts:46` ✓／SKILL 速查 ✓／分派（注册表，`cmd_read.ts:457`）✓／生成物 ✓ | `src/query/commands.ts:46`、`SKILL.md:67`、`.scratch/t687/probe.json` | 不补；另记一条页型标记存疑（见 §3.2 注 1） | #690 query 域优化票 |
| 7 | `bill.analysis.overview`（读·stat；9 条词） | **可用（弱）· 域页缺口**；合成库实测 **exit 0**，shape `stat`；HTML **1,247 B／16 行**（**16 行空壳页**：模板原样 ＋ 1 个 section 片段）；专测：**无专测**：仅 `test/cli.test.mjs:76-87` 冒烟 ＋ `test/policy.test.mjs:33` 路由；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:165` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:11`） | `src/cli/cmd_read.ts:165`、`SKILL.md:68`、`.scratch/t687/probe.json` | 补（搬进 `analysis/` 能力目录 ＋ 老那 25 场景的域整页） | analysis 域票（#681「Not yet specified」待毕业） |
| 8 | `bill.analysis.compare`（读·analysis；4 条词） | **可用（弱）· 域页缺口**；合成库实测 **exit 0**，shape `analysis`；HTML **1,068 B／16 行**（**16 行空壳页**：模板原样 ＋ 1 个 section 片段）；专测：**无专测**：仅 `test/cli.test.mjs:82` 冒烟 ＋ `test/policy.test.mjs:32` 路由；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:184` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:12`） | `src/cli/cmd_read.ts:184`、`SKILL.md:77`、`.scratch/t687/probe.json` | 补（同上） | analysis 域票（#681 雾区） |
| 9 | `bill.analysis.trend`（读·analysis；12 条词） | **可用（弱）· 域页缺口**；合成库实测 **exit 0**，shape `analysis`；HTML **1,183 B／16 行**（**16 行空壳页**：模板原样 ＋ 1 个 section 片段）；专测：**无专测**：仅 `test/cli.test.mjs:85` 冒烟；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:211` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:13`） | `src/cli/cmd_read.ts:211`、`SKILL.md:81`、`.scratch/t687/probe.json` | 补（同上） | analysis 域票（#681 雾区） |
| 10 | `bill.goal.write`（写·receipt；2 条词） | **可用（弱）· 域页缺口**；合成库实测 **exit 0**，shape `receipt`；HTML **992 B／16 行**（**16 行空壳页**：模板原样 ＋ 1 个 section 片段）；专测：**无专测**：仅 `test/cli.test.mjs:89-91` 冒烟（含冲突 exit 2）；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:228` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:14`） | `src/cli/cmd_read.ts:228`、`SKILL.md:93`、`.scratch/t687/probe.json` | 补（搬进 `goal/` ＋ 老 4 张里的采集表单） | goal 域票（#681 雾区） |
| 11 | `bill.goal.query`（读·list；2 条词） | **可用（弱）· 域页缺口**；合成库实测 **exit 0**，shape `list`；HTML **1,100 B／16 行**（**16 行空壳页**：模板原样 ＋ 1 个 section 片段）；专测：**无专测**：仅 `test/cli.test.mjs:92` 冒烟；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:259` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:15`） | `src/cli/cmd_read.ts:259`、`SKILL.md:95`、`.scratch/t687/probe.json` | 补（搬进 `goal/` ＋ 老 4 张里的进度条视图） | goal 域票（#681 雾区） |
| 12 | `bill.account.write`（写·receipt；3 条词） | **可用（弱）· 域页缺口**；合成库实测 **exit 0**，shape `receipt`；HTML **976 B／16 行**（**16 行空壳页**：模板原样 ＋ 1 个 section 片段）；专测：**无专测**：仅 `test/cli.test.mjs:93-94` 冒烟；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:284` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:16`） | `src/cli/cmd_read.ts:284`、`SKILL.md:97`、`.scratch/t687/probe.json` | 补（#691 端到端搬迁的样板二） | #691 account 域票 |
| 13 | `bill.account.query`（读·list；1 条词） | **可用（弱）· 域页缺口**；合成库实测 **exit 0**，shape `list`；HTML **1,101 B／16 行**（**16 行空壳页**：模板原样 ＋ 1 个 section 片段）；专测：**无专测**：仅 `test/cli.test.mjs:95` 冒烟；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:317` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:17`） | `src/cli/cmd_read.ts:317`、`SKILL.md:100`、`.scratch/t687/probe.json` | 补（同上） | #691 account 域票 |
| 14 | `bill.link.submit`（不写库（采单回执）·receipt；2 条词） | **可用（弱）· 页不补（non-exec）**；合成库实测 **exit 0**，shape `receipt`；HTML **1,134 B／16 行**（**16 行空壳页**：模板原样 ＋ 1 个 section 片段）；专测：**无专测**：仅 `test/cli.test.mjs:98-100` 冒烟；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:329` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:18`） | `src/cli/cmd_read.ts:329`、`SKILL.md:101`、`.scratch/t687/probe.json` | 不补页（按 #681 non-exec 收口）；另记一条口径对齐（见 §3.2 注 2） | #681 link 域收口（先例：卡路里 `src/triggers/routing.ts:23-24`） |
| 15 | `bill.setup.run`（写·receipt；5 条词） | **可用（弱）· 域页缺口**；合成库实测 **exit 0**，shape `receipt`；HTML **1,091 B／16 行**（**16 行空壳页**：模板原样 ＋ 1 个 section 片段）；专测：**无专测**：仅 `test/cli.test.mjs:101-102` 冒烟 ＋ `test/policy.test.mjs:34` 路由；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:344` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:19`） | `src/cli/cmd_read.ts:344`、`SKILL.md:103`、`.scratch/t687/probe.json` | 补（搬进 `setup/` ＋ 老 6 张向导／列表页） | setup 域票（#681 雾区） |
| 16 | `bill.help.lookup`（读·list；4 条词） | **可用（弱）**；合成库实测 **exit 0**，shape `list`；HTML **132,905 B／2077 行**（**共享 help 模板整页**）；专测：`test/help-delivery-144.test.mjs`、`help-exit-148`、`help-file-145`、`help-reuse-245`；四处：能力声明 ✗／SKILL 速查 ✓／分派 `cmd_read.ts:404` ✓／生成物 ✗（形状住过渡表 `src/render/envelope.ts:20`） | `src/cli/cmd_read.ts:404`、`SKILL.md:31`、`.scratch/t687/probe.json` | 补（搬进 `help/` 能力目录，生成物与棘轮一并接上） | #686 机器面照卡路里装齐 |

### 3.1 四处一致矩阵

| 命令 | ① 能力声明 | ② SKILL 速查 | ③ 分派 | ④ 生成物（`registry.ts`） |
| --- | --- | --- | --- | --- |
| `bill.record.add` | ✓ | ✓ | ✓ | ✓ |
| `bill.record.update` | ✓ | ✓ | ✓ | ✓ |
| `bill.record.today` | ✓ | ✓ | ✓ | ✓ |
| `bill.record.range` | ✓ | ✓ | ✓ | ✓ |
| `bill.record.search` | ✓ | ✓ | ✓ | ✓ |
| `bill.record.detail` | ✓ | ✓ | ✓ | ✓ |
| `bill.analysis.overview` | — | ✓ | ✓ | — |
| `bill.analysis.compare` | — | ✓ | ✓ | — |
| `bill.analysis.trend` | — | ✓ | ✓ | — |
| `bill.goal.write` | — | ✓ | ✓ | — |
| `bill.goal.query` | — | ✓ | ✓ | — |
| `bill.account.write` | — | ✓ | ✓ | — |
| `bill.account.query` | — | ✓ | ✓ | — |
| `bill.link.submit` | — | ✓ | ✓ | — |
| `bill.setup.run` | — | ✓ | ✓ | — |
| `bill.help.lookup` | — | ✓ | ✓ | — |

读数：**①6／②16／③16／④6**。10 条未迁移命令的形状只住 `src/render/envelope.ts:10-21`（过渡表），机器面**没有**棘轮拦「往分派层加 `case` 却不登记」——`t406-复核-结构纪律对账.md` 第五节已挂号，本表据实复述（**未复查该缺陷是否已修**）。

### 3.2 键层注记

1. **`bill.record.detail` 的页型标记与形状不一致**：形状 `detail`，实测 `--html` 出的是 `data-page="list"`／`data-slot="ilife:bill:list"` 的列表页（`probe.json`）。`src/shared/pageShell.ts:36` 的 `slot/page` 只有 `collect`／`receipt`／`list` 三值，**没有 `detail`**——所以这是「契约上就没给 detail 这一档」而不是漏写。交 #690 判要不要补一档。
2. **`bill.link.submit` 与 #681 的 non-exec 收口不一致**：#681「两条已定的口径」写「`link` 域按 non-exec 正式收口：词保留路由 ＋ HELP，**执行层不承接、不产 HTML**」，而实测 `src/cli/cmd_read.ts:329-343` 有执行分支、回 receipt 文案，`--html` 还能落 16 行空壳页（1,134 B）。**本清单只记录冲突，不替任何一边改口径**。
3. **`bill.setup.run` 的六种 op 只有一句回执文案**：`init`／`init-status`／`backup-create`／`backup-list`／`restore`／`import` 全走 `buildRecordReceipt`（`src/cli/cmd_read.ts:344-402`），而老侧这六种各有一张模板页（§4 第 16–21 行）。
4. **`bill.help.lookup` 不在能力目录**：它是唯一「有 4 件专测却仍无能力声明、形状住过渡表」的命令；HELP 在**开库之前**分派（`src/cli/cmd_read.ts:456`），与 `REGISTRY` 那条路互斥。

## 4 页面层清单（老 24 张模板 ＋ 2 类形态）

口径：**老侧 24 张落盘模板**逐张给「老承载者」与「新仓落点」；新仓落点以本次合成库实测的页型为准（`probe.json`）。这里的「落点」指**域整页**（`ilife-block-page-shell` 那一套，2000 行量级），**不是**「页里有没有内容片段」——16 行空壳页里也照样有一个 section 片段（KPI 卡／数据表），但它不是老侧那张页。

| # | 项（老模板） | 现状（实测） | 证据（file / issue） | 处置建议（补／不补） | 归属 |
| --- | --- | --- | --- | --- | --- |
| 1 | `写入/expense_form.html` | 有落点：记支出采集页／回执页（`src/record/scene-expense.ts:20-21` → `collectBody.ts`／`receiptBody.ts`），实测 `record.add` 出 **2554 行整页／77,247 B** | 老承载者 `scripts/render_write.py:41`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 不补（已落） | #689 write 域优化票（逐块对老） |
| 2 | `写入/update_confirm.html` | 有落点：改记录回执页（`src/record/scene-update.ts` ＋ `src/shared/diffTable.ts`），实测 `record.update` 出 **2554 行整页／76,062 B** | 老承载者 `scripts/render_write.py:45`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 不补（已落） | #689 write 域优化票 |
| 3 | `写入/batch_confirm.html` | 有落点：逐行可编辑表（`src/record/scene-batch.ts:132` 调 `src/shared/rowEditorTable.ts:116`）；**「多行同屏」那一块未接**（页面自己写明还没接） | 老承载者 `scripts/render_write.py:42`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（多行同屏那一块） | #689 write 域优化票 |
| 4 | `写入/installment_confirm.html` | 有落点：分摊预览表（`src/record/scene-installment.ts:76` 调 `src/shared/installmentPreview.ts:149`）；独立复跑实测 **12 × 300.00 ＝ 总价 3600** 相符 | 老承载者 `scripts/render_write.py:44`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 不补（已落） | #689 write 域优化票 |
| 5 | `写入/flow_confirm.html` | 有落点：流程三段式（`src/shared/flowSteps.ts:58`；六件各调一次——`scene-refund`／`scene-reimburse-done`／`scene-lend`／`scene-borrow`／`scene-collect`／`scene-repay`） | 老承载者 `scripts/render_write.py:43`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 不补（已落） | #689 write 域优化票 |
| 6 | `查询/query_view.html` | 有落点：查询列表页（`src/query/list.ts`），实测 `record.today` 出 **2584 行整页／76,715 B** | 老承载者 `scripts/bill_inject.py:47`、`:107`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 不补（已落） | #690 query 域优化票 |
| 7 | `分析/analysis_view.html` | **无落点**：`analysis_*` 模板实测 **16 行空壳页**（1,068–1,247 B）；老侧此一件承载 25 场景 ＋ 环／柱／双折线／直方四图 | 老承载者 `scripts/bill_inject.py:48`、`:107`、`:364`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（分析域整页 ＋ 四图） | analysis 域票（#681 雾区） |
| 8 | `目标/budget_form.html` | **无落点**：`goal_write` 模板实测 **16 行空壳页**（992 B） | 老承载者 `scripts/goal/render.py:65`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（设定预算采集表单） | goal 域票（#681 雾区） |
| 9 | `目标/budget_view.html` | **无落点**（`goal_query` 空壳页 1,100 B，是 `budget`／`saving` 两种 op 共用的一张） | 老承载者 `scripts/goal/render.py:66`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（预算执行进度条页） | goal 域票（#681 雾区） |
| 10 | `目标/saving_form.html` | **无落点** | 老承载者 `scripts/goal/render.py:67`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（设定目标采集表单） | goal 域票（#681 雾区） |
| 11 | `目标/saving_view.html` | **无落点** | 老承载者 `scripts/goal/render.py:68`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（目标进度条页） | goal 域票（#681 雾区） |
| 12 | `账户/account_form.html` | **无落点**：`account_write` 模板实测 **16 行空壳页**（976 B） | 老承载者 `scripts/account/render.py:120`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（新增账户采集表单） | #691 account 域票 |
| 13 | `账户/transfer_confirm.html` | **无落点** | 老承载者 `scripts/account/render.py:163`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（转账确认页） | #691 account 域票 |
| 14 | `账户/confirm.html` | **无落点** | 老承载者 `scripts/account/render.py:222`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（改账户 diff 确认页） | #691 account 域票 |
| 15 | `账户/account_view.html` | **无落点**：`account_query` 模板实测 **16 行空壳页**（1,101 B） | 老承载者 `scripts/account/render.py:276`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（余额卡 ＋ 最近流水） | #691 account 域票 |
| 16 | `开始使用/init_wizard.html` | **无落点**：`setup_run` 模板实测 **16 行空壳页**（1,091 B） | 老承载者 `scripts/setup/render.py:54`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（4 步向导） | setup 域票（#681 雾区） |
| 17 | `开始使用/init_status.html` | **无落点** | 老承载者 `scripts/setup/render.py:56`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（三重判定卡） | setup 域票（#681 雾区） |
| 18 | `开始使用/backup.html` | **无落点** | 老承载者 `scripts/setup/render.py:58`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（备份回执页） | setup 域票（#681 雾区） |
| 19 | `开始使用/backup_list.html` | **无落点** | 老承载者 `scripts/setup/render.py:60`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（备份列表 ＋ 空态引导） | setup 域票（#681 雾区） |
| 20 | `开始使用/restore.html` | **无落点** | 老承载者 `scripts/setup/render.py:62`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（恢复向导） | setup 域票（#681 雾区） |
| 21 | `开始使用/import.html` | **无落点** | 老承载者 `scripts/setup/render.py:64`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 补（列映射向导） | setup 域票（#681 雾区） |
| 22 | `联动/purchase_confirm.html` | **无落点**：`link_submit` 模板实测 **16 行空壳页**（1,134 B）；命令只回一句 receipt 文案 | 老承载者 `scripts/link/cli.py:59`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 不补页（按 #681 non-exec 收口）；口径对齐见 §3.2 注 2 | #681 link 域收口 |
| 23 | `联动/meal_confirm.html` | **无落点** | 老承载者 `scripts/link/cli.py:82`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 不补页（同上） | #681 link 域收口 |
| 24 | `联动/receipt.html` | 部分落点：`bill.link.submit` 出 receipt envelope 文案，不出页 | 老承载者 `scripts/link/cli.py:457`；新仓落点见 §3 对应命令行与 `.scratch/t687/probe.json` | 不补页（同上） | #681 link 域收口 |
| 25 | `scenes/*.yaml` 声明面里的 28 个「仓中不存在」的模板路径 | 老 `scenes/*.yaml` 的 `html.template` 共 71 条引用／**50 个取值**，其中 **28 个文件路径在仓里没有**（如 `分析/monthly.html`、`查询/today.html`、`查询/list.html`） | 老侧真实渲染链不吃这些名字：`scripts/bill_inject.py:107` 按类型二选一（`query_view.html`／`分析/analysis_view.html`） | 不补（老侧从无这些文件——属老侧「场景声明面」与「渲染链」的内部漂移；本清单据实以 24 张落盘模板为准） | 本体图 #681（口径注记） |
| 26 | 「文字回执」（非文件形态） | `scenes/write.yaml` 两处引用（`write-6-1` 撤销、`write-7-1` 恢复） | 新仓落点：receipt envelope ＋ 回执页（`src/record/receipt.ts`、`receiptBody.ts`） | 不补（形态已等价） | #689 write 域优化票 |

### 4.1 缺失按类归并（要补的一共五类 ＋ 一类不补）

| 类 | 缺什么 | 老的形态 | 落的票 |
| --- | --- | --- | --- |
| **A · 分析域整页** | 25 条词的域整页 ＋ 环／柱／双折线／直方四图 | `分析/analysis_view.html`（`bill_inject.py:364` 一处承载 25 场景） | analysis 域票（#681 雾区） |
| **B · 目标域 4 张** | 采集表单 2 ＋ 进度条视图 2 | `目标/budget_form.html` 等 4 张（`goal/render.py:65-68`） | goal 域票（#681 雾区） |
| **C · 账户域 4 张** | 采集 2 ＋ diff 确认 1 ＋ 汇总 1 | `账户/*.html` 4 张（`account/render.py:120-276`） | #691 account 域票 |
| **D · 开始使用 6 张** | 向导 3 ＋ 查看 1 ＋ 回执 1 ＋ 列表 1 | `开始使用/*.html` 6 张（`setup/render.py:54-64`） | setup 域票（#681 雾区） |
| **E · 写入域残留 1 块** | 批量录入的「多行同屏」表（其余场景特有块均已落） | `写入/batch_confirm.html`（`scripts/render_write.py:42`）；现状见 `t407-复核-十六页-独立复跑.md:236` | #689 write 域优化票 |
| （不补） | 联动 3 张确认页 | `联动/*.html` 3 张（`link/cli.py:59,82,457`） | 按 #681 non-exec 收口 → 不补页 |

## 5 订正与注记（与既有票面／中途笔记不一致的读数 ＋ 两条新发现）

| # | 既有说法 / 领域 | 本次实测 | 证据 | 处置 |
| --- | --- | --- | --- | --- |
| 订正 1 | 本票：「老侧 24 张模板／**58 个可渲染形态**」 | 24 张模板 ✓（落盘 `.html`，另 `help.html.bak.v2.4` 1 个）；**58 复现不出唯一来源**。三个可复现读数：场景级 **71** 条、去重 **50** 个（49 文件路径 ＋「文字回执」）、老渲染器入口 **58** 个（25 类型 ＋ 16 写入 ＋ 4 目标 ＋ 4 账户 ＋ 6 开始使用 ＋ 2 联动 ＋ 1 HELP） | `scenes/*.yaml` 71 条 `html.template`；`SKILL.md:925-959`（25 类型）；`scripts/*/render.py`、`scripts/render_write.py`、`scripts/link/cli.py` | **订正**：本清单口径写死为「模板 24 张／场景级 71 条／去重 50 个」；票面 58 若另有所指，补锚点后再对 |
| 订正 2 | 本票：「仍住 `cmd_read.ts` **485 行**的过渡表 10 条」 | `src/cli/cmd_read.ts` 实测 **493 行**（LF 口径）；485 是 #411 之后的读数，#677 的设置页配置 key 拦截加了 8 行 | `src/cli/cmd_read.ts`（493 行）；`packages/skill-bill/AGENTS.md` 记 485（#411 当刻） | **订正**：后续票按 493 起算；过渡表仍是 10 条（`src/render/envelope.ts:10-21`） |
| 订正 3 | `t403-manifest.json:12`／`t410-验收墙.mjs:8`：「其余 5 域（分析／目标／账户／联动／开始使用）**61 词**」 | 按新表逐域实数：分析 25 ＋ 目标 4 ＋ 账户 4 ＋ 联动 2 ＋ 开始使用 5 ＝ **40 词**（＋HELP 4 ＝ 44）。61 ＝ 77 − 16（写入域 16 词），即「非写入域的全部词」，把查询域 17 与 HELP 4 也算进去了 | `src/policy/wakewords.ts` 逐 key 计数（本清单 §2）；`docs/skills/skill-bill/t403-manifest.json:12` | **订正**：写成「其余 5 域 40 词／非写入域 61 词」两说，别混用 |
| 订正 4 | 本票：「74 条唤醒词（老 70 ＋ HELP 4）」 | 成立：老 `scenes/*.yaml` 70 唯一词（71 场景，`备份` 一词两场景）＋ 路由表 4 条 HELP ＝ 74 | `test/wake-assets.test.mjs:80`；本清单 §2 | 无需处置（算术已对） |
| **新发现 1** | 词层：老侧 4 条 HELP 短语在新仓的在位情况 | 第 2 条**不在位**：老「饼干记账 帮助」（U+0020 空格，`references/路由表.md:78` ＋ `references/scenarios.yaml:5`）在新表里被写成了无空格的「饼干记账帮助」；实测 `routeWakeword('饼干记账 帮助')` **抛「无命中唤醒词」**（另 3 条 HELP 词命中正常）。`test/wake-assets.test.mjs:79-81` 的「老 70 个唯一唤醒词 100% 在位」只覆盖 scenes 的 70 个功能词，**不覆盖 HELP 4 条**，所以这条差异没有任何机器门拦着 | `references/路由表.md:78`、`references/scenarios.yaml:5`、`src/policy/wakewords.ts:26`、`SKILL.md:32`；本清单 §2 第 72／75 行；`.scratch/t687/help-probe.mjs` 实跑 | **补**（一行）：`WAKE_TABLE` 按老侧补回带空格那条，并给 HELP 4 条加一条**逐字断言**（现在只有自洽断言） |
| **新发现 2** | 老侧 `references/` 三份副本 | `scenarios.yaml` 70 词与 `scenes/*.yaml` **零差集**（可当第二见证）；`scenarios.json` 只剩 18 个顶层键／15 个 `wake_word`，是**陈旧副本** | `references/scenarios.yaml`（1265 行）；`references/scenarios.json`（915 行） | **注记**：`scenarios.json` 不得再当权威（#681 偏好 5 已定 `scenes/*.yaml` 为权威） |
| **订正 5** | `t407-场景落点清单.md:46-49` 的「遗留」三条（拍账单图片入口／分期分摊预览表／流程三段式）当现状用 | 三条**都已落**：`src/shared/photoEscape.ts`（拍账单图片入口）、`installmentPreview.ts:149`（分摊预览）、`flowSteps.ts:58`（流程三段式）；`t407-恢复-稳定化证据.md:96-103` 逐件记「完整可用…不动」。真残留只有批量录入的「多行同屏」一块 | `packages/skill-bill/src/shared/`（五件在盘）；`t407-恢复-稳定化证据.md:96-103`；`t407-复核-十六页-独立复跑.md:236` | **订正**：读页面层现状**按盘上代码判**，别按中途笔记（`t407-场景落点清单.md` 那一节是三族并发铺开时的派单说明，已被各族销账） |

## 6 可毕业性自查（抽 5 行：谁去做、做完怎么验）

| 抽到哪一行 | 谁去做 | 做完怎么验 |
| --- | --- | --- |
| §2 第 72 行「饼干记账 帮助」（onlyOld） | 词层收口的人（或 #686 顺手） | `WAKE_TABLE` 里出现带空格那条 → `routeWakeword('饼干记账 帮助')` 命中 `bill.help.lookup`；`test/wake-assets.test.mjs` 加一条 HELP 4 条逐字断言后变红过再变绿 |
| §3 `bill.analysis.overview` | analysis 域票（#681 雾区毕业时） | 老 `分析/analysis_view.html`（4 图）逐块对照；新页 `--html` 后量整页行数（现在 16 行）与四图 DOM；§4 第 7 行销账 |
| §3 `bill.account.write` | #691（样板二，已立） | 老 `scripts/account/render.py:120,163,222` 三张逐块对照；采集页＋diff 确认页各出样张；§4 第 12–14 行销账 |
| §3 `bill.help.lookup` | #686（机器面照卡路里装齐） | 搬进 `help/commands.ts` 后 `pnpm gen:check` 命令数 6→7；§3.1 矩阵 ①④ 由 — 变 ✓ |
| §4 第 3 行 `写入/batch_confirm.html` 的「多行同屏」 | #689（write 域优化票） | `src/shared/rowEditorTable.ts` 接多行数据后采集页出 N 行编辑表（现在只 1 行）；老 `scripts/render_write.py:42` 逐块对照 |

—— 本清单只审计、不做任何改动；三张表的每一行都带 `file:行号` 或票号锚点，可直接逐条毕业为票。
