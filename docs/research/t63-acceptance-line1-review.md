# #63 主线①终局取证 · 对抗式审查（第 1 席）

> 席位：主线①终局取证 · 对抗式审查席（第 1 席）。立场：**攻击被审证据，不复述**。
> 被审对象：commit `afdf8e5e`（未 push）——`docs/research/t63-acceptance-line1.md`（295 行）＋
> `docs/research/t63-line1-bucket.mjs`（251 行）＋ `docs/research/t63-line1-exec12.mjs`（170 行）。
> 本席零产品代码改动；只新增本报告 ＋ 4 个探针脚本（`docs/research/t63-line1-review-*.mjs`）。
>
> 审查时点：本席开工时 `git rev-parse HEAD = afdf8e5e`；取证期间他席（#83／help-parity 等）持续追加
> commit（本席过程中观察到 HEAD 前移到 `6219a31`／`bee97bc` 等），`afdf8e5e` 始终为其祖先
> （`git merge-base --is-ancestor afdf8e5e HEAD` = 0）。本席全部实测均在 `afdf8e5e`
> （＝最终代码 `5fffe1e`）工作区上完成；`5fffe1e` 之后至本席收工无任何 `src` 改动
> （`git diff --stat 5fffe1e HEAD -- packages/skill-calorie/src` 为空）。

## 0. 被审范围与路径合规

| 面 | 实测 | 判定 |
|---|---|---|
| 被审 commit 只含 3 个受跟踪文件 | `git show --stat afdf8e5e`：`t63-acceptance-line1.md` / `t63-line1-bucket.mjs` / `t63-line1-exec12.mjs`（+716 行，无删除） | ✅ 范围一致 |
| 是否碰产品／工具链／既有 docs | `git show --stat afdf8e5e` 无 `packages/**`、`tooling/**`、`test/**`、既有 docs | ✅ |
| 是否 push | `git branch -a --contains afdf8e5e` 仅列出本地 `master`（无 `remotes/origin/master`） | ✅ 未 push |
| 两个脚本是否只读 | 桶层脚本 `grep spawn` = 0（纯进程内 `import` dist）；实跑脚本 `spawnSync` 14 次、只写 `os.tmpdir()` | ✅ 与自陈一致 |
| 编译产物新鲜度 | `npx tsc -b --dry`：`packages/skill-calorie/tsconfig.json is up to date`（全部 16 个项目 up to date） | ✅ |

## 1. 逐条攻击结论（先给判定，后给我自己跑出来的证据）

| # | 被审主张 | 本席判定 | 一句话依据 |
|---|---|---|---|
| 1 | 桶层 46/46：exec 341／non-exec 95，+15/−15 归因 `ee8a1f0`(10)＋`964c41f`(1)＋`b23f72d`(4) | **成立** | 独立复算逐项命中；**独立解析各 commit 的 `routing.ts` 源码**得 326→336→337→341，翻转词逐一实名且与三票自陈一致 |
| 2 | 冻结表 parity：CSV 多重集 436/436、`entry_sha` 436/436、blob sha1 `61e2872…` 未改动 | **成立** | 自算 `git hash-object` ＋ 自写 canon 复算；`git status`/`git diff` 对两冻结源为空 |
| 3 | 12 条抽样 `RESULT: 112/112`、10/10 分组、全 exit 0＋落盘＋`delivery.mode='file'` | **成立（带时效限定）** | 持锁复跑得 `112/112`，12 行**含落盘字节**逐格重现；2 条 envelope 逐字核对通过。限定：字节列被墙钟钉死 |
| 4 | `t81-route-evidence.mjs` exit=1 ＝脚本陈旧（硬编码 77/34/43/361），非回归非环境 | **部分成立** | 「脚本陈旧」定性成立（dist/src 同步、无行为断言失败）；但 `361` 不在脚本内、`paramFlips === 222` 其实**是绿的**，红的是分解式 |
| 5 | 判定「有条件成立」：1 条墙钟破口 ＋ 全量 398 条未重做 | **部分成立** | 两条未闭合项存在且被显式登记；但「全量面现成证据」的时效性**未登记**——该快照早于 5 个改 `src/cli` 的 commit（见 S1） |

## 2. 我新增的探针与结果

| 探针 | 干什么 | 结果（关键行） |
|---|---|---|
| `t63-line1-review-probe.mjs` | 独立复算桶层／parity／t81 断言真值／墙钟面（零 CLI spawn，仅 `git show`） | A1 exec 341／non 95／合 436；A5 10/54/436；A6 闭集 23 越界 0；A7 10＋85；B 各 commit 翻转实名；C4 canon 不符 0；D1 99≠77、D2 56≠34、D3 26=26 |
| `t63-line1-review-paramflips.mjs` | 把被审 t81 脚本的 `paramFlip` 家族块**逐字取出**在本进程 eval，复算它自己的 `paramFlips` | `paramFlips = 222`（＝脚本断言，**绿**）；「家族未派生但路由层为 exec」= **15 词**，实名与 #111/#112/#113 促进词**完全重合**；分解 56+22+26+222 = 326 ≠ 341（差 15） |
| `t63-line1-review-dateshift.mjs` | `--require` 预载把 `Date` 钉死，同种子库真机 spawn 15 词 × 3 个「今天」 | 真实日期：14 PASS ＋ `复制昨日运动` exit 4；钉死 2026-09-08：`复制昨日运动` **exit 0 ＋ file 233 B**；钉死 2027-01-01：**仅** `复制昨日运动` 红，其余 14 全 exit 0＋`mode='file'`（spawn 31） |
| `t63-line1-review-envelope.mjs` | 抽查 2 条 envelope 逐字 | `看今日主页` / `记一餐`：② key 一致 ③ `mode='file'` ④ path 绝对且落盘非空 ⑤ `delivery.bytes`=落盘字节（2499/2499、301/301）⑥ `data.output`=`delivery.path` ⑨ 五字段齐备 —— 全 true |

## 3. 必查项逐条实测

### 3.1 独立复算（不看它的结论）

进程内 `import` dist 路由层自写复算（`t63-line1-review-probe.mjs`）：

```text
A1 WAKE_ROUTES=436 exec=341 non-exec=95 合计=436
A2 routingSummary={"total":436,"exec":341,"nonExec":95,"outOfScope":10,"legacyChain":85,
                   "newEntries":56,"repairEntries":1,"coveredKeys":99}
A4 SoT 436 · id 唯一 436 · wake 字面唯一 434（「记身材照」×3）· CATEGORIES 13
A5 HELP groups=10 subgroups=54 scenes=436 sceneId 唯一=436
A6 NON_EXEC_REASONS 闭集=23 · reason 越界=0
A7 non-exec 细分={"out-of-scope":10,"legacy-chain":85} · bucket 越界=0
A8 registry 读 99／写 35 · exec key 越界=0
A9 路由↔SoT 逐位漂移=0
A10 旧词无路由=0 · 无 HELP=0 · HELP_LOOKUP['记身材照']=3
A11 HELP 数据模型 exec cli=341 · non-exec 场景=95
```

**＋15/−15 的独立归因**（本席自己解析每个 commit 的 `WAKE_ROUTES` 源码，不引用被审表格）：

```text
52e6fc8(#81)  exec 记录 326 / non-exec 110      ← 与 #81 登记值一致
52e6fc8→ee8a1f0  non-exec→exec +10  exec→non-exec 0  新增词 0  删除词 0
   翻转词：看运动记录（按力量筛选）／（按有氧筛选）／看力量训练总览／看有氧训练总览／
           计划复盘（本周）／（本月）／（全部）／看计划完成率／看未完成训练／看动作完成率
ee8a1f0→964c41f  non-exec→exec +1 ：看营养素深度
964c41f→b23f72d  non-exec→exec +4 ：看钠糖纤维趋势／看钠糖纤维综合／看每日 6 因素综合／查卡路里数据
b23f72d→18354fe  +0（#86 只加新拟入口，不动 436 桶）
18354fe→afdf8e5e +0
其余 commit 引入的翻转：无
```

第二路独立佐证（完全不同角度）：把被审 t81 脚本的家族派生块原样取出复算，它**不认识**的那 15 词
恰好就是上表翻转的 15 词——`P2-3 未派生但 exec 的词：看营养素深度／…／查卡路里数据`。两条互不依赖的
证据链指向同一 15 词集合，**归因成立，且是单向 non-exec→exec 的能力补齐，无唤醒词丢失**。

### 3.2 冻结表不可动

```text
C1 CSV  blob sha1=61e28727c43d2091d7ee4058a2705031f1b68cb3 = HEAD blob = #81 冻结值 · 工作区脏=false
C2 SNAP blob sha1=0ec6dde87573b39d3267db97be7c9d6c1394aee5 = HEAD blob
C4 快照 total=436 · entry_sha 条数=436 · 本席自写 canon 不符=0
C5 CSV 数据行 436 · wake 多重集等=true · (cat|wake) 多重集等=true
C6 wake_multiset／scene_counts／summary 全等
```

`git status --porcelain` 与 `git diff` 对 `docs/research/t71-old-trigger-records.csv`、
`test/calorie-sot.snapshot.json` 均为空。**成立**。
残余局限（不构成缺陷、但须写明）：`canon` 必然与快照生成器（`test/calorie-triggers.test.mjs`）
同算法，本席逐字比对确认桶层脚本的副本与测试的 canon **同构**；故 436/436 的含义是
「SoT ＝ 冻结快照」，不是「从旧 Python 源码独立重派生」。

### 3.3 抽样可复现（持锁复跑被审脚本）

`node tooling/run-locked.mjs --ticket 63 -- node docs/research/t63-line1-exec12.mjs`
→ runId=`b92ab432-4320-4d3c-9124-addd9b90949d`，exit=0，`RESULT: 112/112`，
`SUMMARY 抽样 12 条 / 分组 10/10 / 补充诊断 2 条 / spawn 14 次`。
12 行的 `exit`／`delivery.mode`／**落盘字节**与被审报告 §2 表格逐格相同
（2499／301／61674／283／282／1330／275／245／270／272／66301／52221）；补充诊断两行亦相同
（原样 exit 4；显式 `date` exit 0 ＋ file 233 B）。envelope 逐字抽查见 §2 探针④。**成立**。
时效限定：`记一餐` 回执正文含 `已记一餐：鸡胸 2026-09-09 23:53:31（夜宵）`，且文件名带时间戳；
本席日期钉死实验里 `记身材照` 落盘 **272 B（真实日期）→ 274 B（2027-01-01）**——即报告 §2 的
「落盘字节」列是**当日（UTC）钉死**的数字，跨日复跑不会逐格重现（脚本自身断言 `bytes=落盘字节`
是自洽式，故脚本仍绿）。

### 3.4 `t81-route-evidence.mjs` exit=1 的定性（本席自列必红断言与真值）

本席**未跑**该脚本（其内部 `runCached` 会对 222 条家族词 spawn，属大范围 spawn，按纪律回避），
改为静态列出其硬编码断言并逐项自算真值：

| 脚本断言 | 当前真值 | 判定 |
|---|---|---|
| `covered.size === 77` | **99** | 红 |
| `NEW_KEY_ROUTES.length === 34` | **56** | 红 |
| `twinFlips === 26` | 26 | 绿 |
| `paramFlips === 222` | **222**（本席逐字取出其 `paramFlip` 复算） | **绿** |
| `directExec+overrideExec+twinFlips+paramFlips === EXEC_ROUTES.length` | 56+22+26+222 = **326 ≠ 341** | 红（差 15） |
| `drift.length === 0` | **30 处** | 红 |
| `家族未派生但路由层为 exec` | **15 词**（＝上表翻转词） | 红 ×15 |
| `frozenExecKeys.size === 43` / `COVERAGE_REPAIR_ROUTES.length === 1` / `TWIN_FLIPS.size === 24` / `WIZARD.size === 5` / `WAKE_ROUTES.length === 436` / 零 py | 43／1／24／5／436／0 | 绿 |

合计 **1＋15＋1＋1＋1 = 19 项**，与被审报告 §3 的「19 项」一致。
**定性：口径过期（脚本陈旧），非环境、非产品回归。** 三条依据：
① 非环境——`tsc -b --dry` 全部 up to date，脚本自带种子库与 `SKILLS_DB_PATH`，锁正常获取；
② 非回归——其全部红点都是「#81 期常量 vs 已演进的路由层」的比对，**没有一条行为断言失败**
（它真正 spawn 的家族词/覆盖修复词断言仍全绿，因 `paramFlips` 未变）；
③ 最小复现面——脚本最后一次改动停在 `52e6fc8`，此后 `ee8a1f0`／`964c41f`／`b23f72d`／`18354fe` 未同步。
**但被审主张的括注「硬编码 77/34/43/361」不准**：脚本内不含 `361`（361 ＝ #81 期 exec 记录数
326＋34＋1，属快照/测试口径）；且 `paramFlips === 222` 是绿的（红的是分解式）。→ S3。

### 3.5 最脆弱处：`复制昨日运动` 是不是**唯一**的日期炸弹

**静态面**（341 条 exec 的 cli 参数 × CLI 源码 `todayISO()` 面）：

```text
E2 无显式日期兜底的键 = (no-case)／calorie.diet.copy／calorie.water.log
E3 exec 341 条：params 含日期键（date/start/end/targetDate/today/from/…）= 217，无日期锚 = 124
E4 无日期锚 ∩ 键源码有裸 todayISO() = 1 条：记喝水 → calorie.water.log（写默认日，恒 exit 0）
E5 其余 123 条无日期锚词走读侧 latestFoodDate(db) ?? todayISO() 兜底
exec cli 含相对日期字面 = 2 条：复制昨日运动（copyFrom:'yesterday'）／查唤醒词（q 是查询串，非日期）
```

**实证面**（日期钉死，31 次 spawn，同一种子库）：

```text
真实日期（UTC 2026-09-09）：14 词 exit 0＋file；复制昨日运动 exit 4「昨日无运动记录可复制」
钉死 2026-09-08：复制昨日运动 exit 0 ＋ file 233 B
钉死 2027-01-01：复制昨日运动 exit 4；其余 14 词全部 exit 0 ＋ delivery.mode='file'
```

**结论：在 exec 桶的「日期相对型」里，`复制昨日运动` 是唯一破口；验收换日期不会整体变红**
（读侧统一走 `latestFoodDate` 兜底，显式日期词钉死在种子窗口内）。两点须补正：
① 被审报告说「系统日期」不精确——`todayISO()` 是 `new Date().toISOString()`，用的是 **UTC 日期**，
   破口边界是 UTC 零点而非本地零点；
② 静态扫描本身有盲区：`calorie.exercise.add` 的 `date ?? todayISO()` 只兜「目标日」，
   真正随墙钟漂移的是 `copyFrom:'yesterday'` 推出的**源日**（`write.ts:554-558`），
   故「有日期兜底」不等于「无墙钟依赖」——本席的实证实验才是判据。

### 3.6 方法论攻击：白名单吞掉核心不变量红点

本席持锁独立复跑（`node tooling/run-locked.mjs --ticket 63 -- node --test test/calorie-routing-81.test.mjs`）：

```text
runId=e295842f-90b5-4c4f-bd3f-d220f248694e  exit=1
tests 8 / pass 7 / fail 1
✖ FX-81-5 不变量：exec ⟺ 实跑 exit 0（快照逐条 exit 0 ＋ 需参数键必须带 --params）
  AssertionError: smoke 快照存在非零记录（exec 桶应全部 exit 0）  1 !== 0
  at test/calorie-routing-81.test.mjs:300:12
```

即被审报告 §4「失败点唯一且精确」**成立**（唯一红点就是 `1 !== 0`）。
而 `docs/research/t88-baseline/test-failset.txt`（34 条，冻结于 `93e27f9`，**晚于**快照重生成
`aef6ae0`）里存在同名条目：

```text
FX-81-5 不变量：exec ⟺ 实跑 exit 0（快照逐条 exit 0 ＋ 需参数键必须带 --params）
```

判据是**测试名级**集合（不含文件名级条目），且本席逐字节比对确认：failset 条目与该 `it(...)` 名称
**完全相等**（`byte-equal: true`；`describe` 名 `#81 唤醒词路由层（路由与 parity 分家）` 亦逐字命中）。
因此：**若验收只判「失败集新增 0」，这条核心不变量会被判绿**——白名单基线是在该测试已经变红之后
冻结的，它把一个真实的「不变量违反」吸收成了基线。
**处置建议（三管齐下，缺一不可）**：
1. **改判据**：验收判据补一条硬约束——「白名单条目在最终代码上必须**断言全绿**，否则不得以
   『新增 0』判绿」；或把该不变量拆出一条**不列入白名单**的断言（例如只判「当前路由层 cli 在标准
   种子库上 exit 0」，与历史快照解耦）。
2. **修根因（路由层，非种子库）**：给 `复制昨日运动` 的路由 cli 补显式 `date`（该词自身 fill_hint
   即「复制到哪一天(选填)」，实证 exit 0 ＋ 落盘），或按 `t81-route-evidence.md §2.3` 口径改
   `non-exec` ＋ 理由码；随后重生成 `t81-exec-smoke.md` 与路由测试。
   **不要**改种子库窗口——那会污染 #81/#86 的冻结证据链，等于改判据迁就证据。
3. **新开票 ＋ 显式登记**：以「#81 路由层后续维护票」承接上述第 2 条，并在验收判据里把该红点
   标为「已知红，不得计入新增 0」，避免下一次审查再次被白名单吞掉。

## 4. 缺陷清单

| 级别 | 缺陷 | 证据 | 归属建议 |
|---|---|---|---|
| **S1-交付缺陷** | §5「未闭合」第 2 条把「#86 重生成的快照（397/398 exit 0）」当作**现成全量证据**，但该快照停在 `aef6ae0`（19:19），此后到最终代码 `5fffe1e` 之间 **11 个 commit 改 `packages/skill-calorie/src`／`base-combos/src`，其中 5 个直接改 `src/cli`**（`8439976` #83 三态交付/envelope、`a245431` #91、`ef57ccd` #97、`4671169` #97 M5 回执、`4d98e5f` #120 软删过滤）。即：**「exec ⟺ exit 0」在最终代码上没有全量证据**，只有一份早于交付契约落地的快照。报告未登记这一时效性 | `git log --oneline aef6ae0..5fffe1e -- packages/skill-calorie/src packages/base-combos/src`（11 条）；`git log -1 -- docs/research/t81-exec-smoke.md` = `aef6ae0` | 本报告/`#63` 验收席补登记；全量实跑须在最终代码上重做（G3 由「未重做」升级为「现成证据已过期」） |
| **S2** | 判据缺口：`test/calorie-routing-81.test.mjs` 的核心不变量红点位于 `t88-baseline/test-failset.txt` 白名单内，「失败集新增 0」会判绿（§3.6） | failset 含同名条目；本席复跑 exit=1（runId `e295842f…`） | 验收判据席（#63 判据）＋ #88 基线维护 |
| **S2** | 归因只「验量不验身份」：桶层脚本第 130 行把 15 词归因写成 `info()` 文本，无任何断言核对其身份；脚本可复算「漂移＝15」，却无法证明「这 15 词＝#111/#112/#113 促进词」 | `t63-line1-bucket.mjs:126-131`（`check` 只比 `driftExec===15`） | 脚本维护席（把归因改为逐词集合比对断言） |
| **S3** | 主张 4 的括注「硬编码 77/34/43/361」不准：脚本内无 `361`；`paramFlips === 222` 实为**绿**（红的是分解式 326≠341） | `t63-line1-review-paramflips.mjs` P2-1；脚本全文无 361 | 文档修正 |
| **S3** | 「系统日期」口径不精确：`todayISO()` = `new Date().toISOString()`（UTC 日期），破口边界是 UTC 零点 | `src/analysis/utils.ts:45-47` | 文档修正 |
| **S3** | §1.3 引用 `test/calorie-routing-81.test.mjs:95-105` 登记 341/95/56/99，实际断言行号为 `86`（桶计数）／`87-96`（routingSummary）／`112`（覆盖键 99）／`206`（新拟 56） | 本席按行读测试文件 | 文档修正 |
| **S3** | §2「落盘字节」列被墙钟钉死（回执含时间戳）：跨日复跑不逐格重现（实测 `记身材照` 272→274） | `t63-line1-review-dateshift.mjs` | 报告加「当日钉死」限定 |
| **S3** | 桶层 `46/46` 是作者自选检查集的自评，其中若干项为自洽式（如 `coveredKeys===99` 对 `routingSummary()`） | `t63-line1-bucket.mjs` 第 119-123／163／234-236 行 | 表述降级为「自洽检查」 |

## 5. 门禁实测表（本席全部运行，均持锁 `--ticket 63`）

| 命令 | runId | exit |
|---|---|---|
| `node docs/research/t63-line1-review-probe.mjs` | `a5fa1fdb-5790-4e86-9080-ba5b94fc9a2a` | 0 |
| `node docs/research/t63-line1-review-paramflips.mjs` | `19988efe-d255-4772-9546-c151f9a582e6` | 0 |
| `node docs/research/t63-line1-review-dateshift.mjs` | `a0cc3e53-f607-4d77-a6a9-2e5816f35085` | 0 |
| `node docs/research/t63-line1-review-envelope.mjs` | `81ebff21-b489-46f8-817c-b6fcb1fa44fb` | 0 |
| `node docs/research/t63-line1-exec12.mjs`（复跑被审脚本） | `b92ab432-4320-4d3c-9124-addd9b90949d` | 0 |
| `node --test test/calorie-routing-81.test.mjs` | `e295842f-90b5-4c4f-bd3f-d220f248694e` | 1（非零即本席结论本身） |
| `npx tsc -b --dry` | `df61c087-2bd9-462f-a6f2-50dcd53f9ca1` | 0 |
| `npx tsc -b --dry`（取明细） | `a01cf6e7-2ac1-4cf6-89dc-48ec442b014f` | 0 |

- GATE-RUN runId=a5fa1fdb-5790-4e86-9080-ba5b94fc9a2a cmd=node docs/research/t63-line1-review-probe.mjs
- GATE-RUN runId=19988efe-d255-4772-9546-c151f9a582e6 cmd=node docs/research/t63-line1-review-paramflips.mjs
- GATE-RUN runId=a0cc3e53-f607-4d77-a6a9-2e5816f35085 cmd=node docs/research/t63-line1-review-dateshift.mjs
- GATE-RUN runId=81ebff21-b489-46f8-817c-b6fcb1fa44fb cmd=node docs/research/t63-line1-review-envelope.mjs
- GATE-RUN runId=b92ab432-4320-4d3c-9124-addd9b90949d cmd=node docs/research/t63-line1-exec12.mjs
- GATE-RUN runId=e295842f-90b5-4c4f-bd3f-d220f248694e cmd=node --test test/calorie-routing-81.test.mjs
- GATE-RUN runId=df61c087-2bd9-462f-a6f2-50dcd53f9ca1 cmd=npx tsc -b --dry
- GATE-RUN runId=a01cf6e7-2ac1-4cf6-89dc-48ec442b014f cmd=npx tsc -b --dry

说明：
- `e295842f` 的**非零退出即本席结论本身**（核心不变量红点复现），需放宽非零：
  GATE-RELAX flag=--allow-nonzero reason=e295842f 为 routing-81 核心不变量红点的独立复现，非零退出即取证对象，不得以退出码抹去。
- 本席对账窗口内另有**同票号（ticket=63）他席**（#83/help-parity 等）的多条 RUN（如 `ec480511`／`4b6a8c09`／`a7202017`／`4ad96d77`／`da4a1964`／`5df972ee`），本席未运行、不冒认：
  GATE-RELAX flag=--allow-undeclared reason=窗口内存在同票号并发他席的 RUN（help-parity 席的 CLI 探针与 git 提交），本席未运行、不冒认。
- 对账命令（逐字）：

```text
node tooling/check-gate-audit.mjs --evidence docs/research/t63-acceptance-line1-review.md --ticket 63 \
  --since 2026-09-09T15:49:29Z --until 2026-09-09T15:55:30Z --allow-nonzero --allow-undeclared
```

- 被审报告自身的门禁对账，本席按其逐字命令复跑：`matched=5/5 auditEntries=756 scoped=7 undeclared=2`，
  `gate-audit: PASS`（其 §7 的两条 GATE-RELAX 均如实登记，未发现私自放宽）。

## 6. 自检

```text
packages/skill-calorie/SKILL.md 首 3 字节 = 2D 2D 2D（"---"），非 00 00 00 → #124 事故面无复发
本席仅新增：本报告 ＋ docs/research/t63-line1-review-{probe,paramflips,dateshift,envelope}.mjs
未改 packages/**／tooling/**／test/**／既有 docs；git commit --only；未 push
未跑 pnpm test／t81-exec-smoke.mjs（回避他席 spawn 抖动）；最大 spawn 面 = 日期钉死实验 31 次
```

## 7. 五维评分与 verdict

| 维度 | 满分 | 得分 | 依据 |
|---|---|---|---|
| 契约一致 | 30 | **23** | 主张 1/2/3 与实测逐项一致，主张 4 定性对但括注常量错（`361`）、主张 5 的「现成全量证据」时效性未登记（S1） |
| 证据真实可复现 | 25 | **17** | 12 条实跑含字节逐格重现、envelope 逐字通过、桶层可独立复算；扣分：`46/46` 自评、归因仅 `info()` 无断言、字节列墙钟钉死、全量证据过期 |
| parity | 20 | **19** | CSV 多重集／`entry_sha`／blob sha／工作区洁净四路自算全部命中；残余为 canon 与生成器同源的固有循环性 |
| 工程红线 | 15 | **14** | 零产品/工具链/既有 docs 改动、3 个受跟踪新文件、持锁与门禁声明自洽（其自身 audit PASS）；扣分：核心不变量红点被白名单吞掉的判据风险未在交付内闭环 |
| 文档同步 | 10 | **6** | 结构完整、缺口台账诚实；扣分：S1 时效性缺登记、行号/常量/UTC 三处口径不准、红点处置只列建议未落票 |
| **合计** | **100** | **79** | — |

### verdict：**FAIL**

理由（不是「结论错」，而是「交付不合格」）：
1. **S1**：主线①最核心的不变量「exec ⟺ exit 0」在最终代码 `5fffe1e` 上**没有全量证据**——
   唯一的 398 条快照早于 5 个改 `src/cli` 的 commit（含整个 #83 三态交付契约），
   而报告把这份过期快照写成「现成证据」。这一条直接改变验收结论的可信度。
2. **S2**：核心不变量红点位于失败集白名单内，现行「新增 0」判据会把它判绿——交付未给出
   可执行的判据补丁或新票号，只给了建议。
3. 其余主张（1/2/3 与 4 的定性）本席**逐项复现成立**，因此本席的 FAIL 是「带精确返修清单的
   FAIL」，不是「证据造假」：**返修 S1 登记 ＋ S2 判据补丁 ＋ 新开票后，本报告可升为 PASS。**

**升 PASS 的最小条件（可机械验收）**：
- ① 报告新增一节登记「全量 398 条快照早于 `8439976`/`a4671169` 等 5 个 `src/cli` commit」，
  并把 G3 改写为「最终代码上全量重跑 `t81-exec-smoke.mjs`，非零 0 ＋ `git diff` 为空」；
- ② 验收判据补「白名单条目断言须全绿」硬约束，或拆出非白名单不变量断言；
- ③ 为「路由 cli 墙钟依赖」开票（修 cli 显式 `date` 或改 `non-exec`＋理由），票号写进报告。
