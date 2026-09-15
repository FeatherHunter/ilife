# 票 #351 · 场景05「真机端到端 ＋ 肉眼终审」· **独立复核席（#351）报告**

**本件是什么**：本席**不是**任何一件交付的作者，**不采信任何票面读数**——本报告每一条「已绿／已落盘」都是本席当刻自己跑出来的。范围＝本图收口链：三处修法（`24fb121` 435／`a05feda` 554／`ecb665d` 550）＋收口窗五步（台账 → 重编重签 → 全量重跑 → 墙整目录换代 → 两份 v17 证据件），提交集 `24fb121`／`a05feda`／`ecb665d`／`d1af159`／`d243619`／`9b27549`。

- 工作目录 `D:\ilife`（Windows／pwsh）。开工时 `git log` 顶端＝`9b27549`（与本席核对项一致）；复核期间他席持续提交，收工时顶端已漂到 `89d9250`——本席**只读、只写自己声明的新文件**。
- **改动白名单（本席实际改过的盘上文件）**：`packages/skill-calorie/src/shared/sceneEnvelope.ts`（**变异自证**用，**已逐字节还原**，见 §2.5）；其余全部新增件在 `.scratch/t351-final-review/**` 与本报告件。**未** `git add`／`commit`／`push`／切分支／`stash`／`reset`／`checkout -- `／`clean`；**未**动 `docs/skills/skill-calorie/scene05-验收墙/**` 任何入仓件（墙的反例与 dead 腿都在 `.scratch/t351-final-review/copy/` 的副本里做）。
- **票号口径**：墙与台账里出现的 `#157`／`t157-*`／`--ticket 157` 是**收口窗自己的票号**（跑批件 `t351-v7-run-176-207.mjs` 当刻的持锁票号），与本图 `#351` 不是同一张票；本席一律按票面用 `--ticket 351 --run-id t351fr-*`。

---

## 〇、判定：**FAIL**

**唯一**的 FAIL 由头是 §3 的 **D1（S2）**：v17 证据件里两处**身份凭据／结构读数已陈化**，与当刻盘上不符。**本图的实质内容（墙、37 份产物、三处修法读数、真出口、变异自证、回归）本席逐条实跑——全绿、无一条被打回。**

D1 是**一张证据件的两行字**（修法＝证据件补一句日期注或改数，**不改源码**）；若编排者裁定「历史读数＋提交信息已可自证、关前不改」，可降为 S3，判定随之改 PASS——**但证据件必须写明这次重出，否则下一个读书的人会以为清单被人动过**。

> 量刑口径照票面：S1（契约违反／用户可见回归／证据造假／私自放宽／数据丢失风险）→ FAIL；S2 关闭前必修；S3 记账跟进。**本席未发现 S1**：三处修法都没有引入契约违反或用户可见回归；证据件那两行数**在其窗口内为真**（本席用 `git cat-file blob` 算出 `086E6975…` 正是 `d243619` 版清单的 sha256），**不是造假**，只是没跟上同一收口链里后一步的重出。

---

## 一、机器证据（全部本席当刻实跑）

### 1.1 门禁运行（逐条给 runId）

| # | GATE-RUN | exit | 摘要读数 |
|---|---|---|---|
| 1 | `runId=t351fr-samples cmd="node .scratch/t351-final-review/t351fr-samples.mjs"` | **0** | 抽样 5 条真出口全项合格 `SAMPLES 5/5`（`waitedMs=50044`） |
| 2 | `runId=t351fr-wake-trace2 cmd="node …/t351fr-wake-trace.mjs"` | **0** | 唤醒词这一头 3 条逐段核对 `WAKE-TRACE PASS`（抽中：复制训练计划／看上周计划／看指定周计划） |
| 3 | `runId=t351fr-tsc-dry cmd="node node_modules/typescript/bin/tsc -b --dry"` | 0 | 认口：各引用工程最新 |
| 4 | `runId=t351fr-tsc-base cmd="node node_modules/typescript/bin/tsc -b"` | **0**（14:08:13）／**2**（14:09:07 复跑） | 同一条命令两次读数不同：后一次红是他席**未入仓在途件** `packages/skill-bill/src/help/writeWire.ts:98` TS2367（见 D4） |
| 5 | `runId=t351fr-base cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t351-final-review/base"` | **0** | `RESULT: 66/66（产物 37 ＋ 判据 29）`＋`PROBE: PASS（29/29）` |
| 6 | `runId=t351fr-tsc-mut` ／ `runId=t351fr-mut cmd="…--out .scratch/t351-final-review/mut"` | 2 ／ **0** | 变异已进 dist；变异跑批 `66/66`＋`PROBE: PASS`（**跑批件自身 29 条判据对双前缀照样全绿**——正是 #550 修前盲区） |
| 7 | `runId=t351fr-tsc-restored` ／ `runId=t351fr-restore cmd="…--out .scratch/t351-final-review/restore"` | 2 ／ **0** | 还原后跑批 `66/66` |
| 8 | `runId=t351fr-regress cmd="node .scratch/t351-final-review/t351fr-regress.mjs"` | **0** | `ℹ tests 4 ／ ℹ pass 4 ／ ℹ fail 0 ／ cancelled 0`（cwd＝仓根，票面命令逐字；跑 10.08s，**等锁 320266ms**） |

> 未走持锁的三条（票面把「跑批与测试」划在 `run-locked` 下；墙自检与台账门都不是跑批／测试，且票面点名了墙自检的**逐字命令**，故按原样跑并在 §2.1 逐条给命令）：墙正／反例与 dead 腿、台账门、以及只读读数脚本。

### 1.2 墙（票面四条验收命令，本席实跑）

```text
正例  $ cd docs/skills/skill-calorie/scene05-验收墙 ; node gen-wall.mjs --check .
      37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发     exit=0
反例  （副本里）把清单第 1 行 file 改成「看本周计划-反例-盘上没有.html」
      36 格；链接 189 条（…同上…）；缺失 1 -> 不可发                                                   exit=1
        清单点名却没有文件：1 看本周计划 -> 看本周计划-反例-盘上没有.html
改回  37 格；链接 189 条；缺失 0 -> 可发                                                               exit=0
```

- 反例／改回在 `.scratch/t351-final-review/copy/scene05-验收墙/` 做：改前/改后 `manifest.json` sha256 **逐字一致** ＝ `2C33EDB3C450599E7FB0A1BA60F6AD13631010599720037514BCFE2E175EDDA1`，**且与入仓件同值**（本席自己算的两遍）。
- **dead 腿（本席加跑，票面没要求）**：把副本手机墙某格 `iframe src` 改成盘上没有的名字 → `缺失 1 -> 不可发` ＋ `页上引用却落不到：看本周计划-页上引用-盘上没有.html`，exit 1；改回 exit 0 且页 sha 还原 `IDENTICAL=true`。⇒ 仓规 §6.2／§7 要的「`dropped` 与 `dead` 一起判」**两条腿都活着**，不是只堵了半条。

### 1.3 三条换代读数（本席自己量的，全部命中票面期望）

| 面 | 读数 |
|---|---|
| 墙目录 37 份发布名副本 | `CALORIE-DOUBLE-PREFIX(wall copies) hitFiles=0 hitOccurrences=0`（37 份全落盘、缺 0） |
| `撤销训练计划-回执.html` | 「已写入训练计划」**0**；「已删除训练计划」**1**；**「状态」卡读作「已改动 已删除训练计划」**（KPI 卡 `ilife-block-kpi-card-label`＝状态）；页 sha256 `3A427A188102595541182C77AD535571923493455B4E79E9A05B68182983E887` |
| 手机墙-390.html | `<iframe `**37**、`loading="lazy"`**0**、首字符 `<!doctype html>`、无 BOM、`transform:scale` 无（1:1）、格内链接 37／死链 0 |
| 桌面墙-1280.html | `<iframe `**37**、`loading="lazy"`**0**、首字符 `<!doctype html>`、无 BOM、`scale=0.469`（＝`min(0.5,600/1280)`，缩的是显示不是视口） |
| 总索引.html | `iframe` **0**、链接 **39**（37 产物＋两墙）、卡 **37**、「有意不出产物及其原因」一节**在**（三条 `notShipped` 的 `why` 全文在页上） |
| 全目录 43 件 | 37 份副本**首字符全是** `<!doctype html>`、**BOM 0 份**；清单不带 BOM；对账：清单 rows 37 ＝ 索引卡 37 ＝ 两墙 figure 各 37 |

### 1.4 抽样 5 条真出口（表一自己跑）

抽：`order183-result`（看计划概览）／`order191-process`（改训练计划·预检）／`order191-receipt`（`calorie.workout.plan-update`，**写命令**）／`order195-receipt`（`calorie.workout.plan-delete`，**写命令**）／`order207-result`（扫禁忌）。夹具＝本席自建（读页共用一库；写命令各独占一库），逐条照表里的 key＋参数。

- **exit**：`0 / 0 / 0 / 0 / 0`；产物**全部落盘**；**回执给的是绝对路径**（`data.output` ＝ `delivery.path`，同值同源）——PowerShell 原生 `Test-Path -LiteralPath`：**真 5 ／ 假 0**。
- 机检读数与表里写的**逐条一致**：④ 表形 `four / own1 / own1 / own1 / own1`（与逐份声明对照）；① `<!doctype html>`；② 真 `id="ilife-copy-data"`／`id="ilife-copy-log"` 各 1；⑤ 日志钮 1 颗无禁用态；正文禁词 0；`calorie.calorie.` **0**。
- 195 回执页：`已写入训练计划` 0、`已删除训练计划` 1、状态卡读作「已删除训练计划」——**与 #435 的换代方向一致**。
- **dbs 隔离**：全部读写落在 `.scratch/t351-final-review/samples/dbs/`，**未碰生产库**。

### 1.5 表里凡给绝对路径的：逐条 `Test-Path`

对 `docs/skills/skill-calorie/t351-v17-evidence.md` 做机械抽取（反引号 span ＋ 围栏代码块里的裸路径；带空格／全角括号的名字按最长可落盘前缀取）：

```text
PATH-EXISTS 抽出=78 真=78 假=0
```

（初版抽取器把 `看计划 vs 实际.html`（名字里带空格）与 `计划复盘（本周）.html`（全角括号）截断成两条假项——**是本席工具的口径问题，不是盘上缺件**；换成「最长可落盘前缀」后 78/78 真。这条如实记账，免得读者误以为有两个缺件。）

### 1.6 变异自证（`sceneEnvelope.ts` 的剥离那步改坏 → 回弹 → 逐字节还原）

```text
BASELINE  src-tree files=315 digest=D602DC85… ；src/shared/sceneEnvelope.ts sha256=A4C66F49…3F863
BREAK     return { ...envelope, key: key.slice(prefix.length) }; -> return envelope;（该串处数 2 -> 3）
          BREAK 后 sha256=FFA63AB2…129D8E     ← 与 v17 证据件 §七 记的变异 sha 逐字同
变异已进 dist：dist/shared/sceneEnvelope.js sha256 3CDADD19… -> BA593272…（≠基线）
RED:      CALORIE-DOUBLE-PREFIX products=37 hitFiles=27 hitOccurrences=27 dir=mut （--expect any）
          落点逐条同旧批：`data-t="场景标识 calorie.calorie.view.plan（list）…`（37 份里 27 份各 1 处）
RESTORE:  备份=A4C66F49…3F863 盘上=A4C66F49…3F863 IDENTICAL=true（逐字节回写，不是整目录还原、没有 git checkout --）
还原后 dist 3CDADD19…（＝基线 true）；还原批 hitFiles=0 hitOccurrences=0
CMP 基线批 vs 变异批：原始 sha 相等=0 归一化后 sha 相等=10 不等=27   → RED
CMP 基线批 vs 还原批：原始 sha 相等=0 归一化后 sha 相等=37 不等=0   → 绿
```

**比对口径（照票面）**：产物页脚写**本次渲染时刻**，任意两跑原始 sha256 必然不同；本席的 `cmp` **只把 `YYYY-MM-DD HH:MM:SS` 换成 `<TS>`**，其余字节一个都不放（不 trim、不归一化换行、不忽略任何别的行）。因此上表「原始 sha 相等=0」是**口径所致**，判据看归一化列。

**墙副本 ≡ 当刻源码的真渲染（本席加做的独立验证）**：`cmpwall` 墙 37 份发布名副本 ↔ 本席自己的基线批（按清单 `file→src` 映射逐件比）＝ **归一化后 37/37 全等、不等 0、缺 0**。⇒ 墙上的 37 格**确实是当刻源码跑出来的那一版**，不是别的批次的旧货。

**源码树指纹的诚实记账**：本席窗口内 `packages/skill-calorie/src` 的树 digest 起止**不等**（315 件不变、内容有变）——这是**他席在同一仓里并行改源码**所致（本席只动 `sceneEnvelope.ts` 一件，且已逐字节回位到基线 sha）。凡把「源码树指纹全等」当变异证据的写法，在本仓并发条件下**不成立**；本席改用「单件 sha256 全等 ＋ dist 单件 sha256 全等 ＋ 产物归一化全等」三条判。

### 1.7 台账门与全仓重编（当刻，如实记账）

- `node packages/skill-calorie/scripts/check-warning-line.mjs` → **exit=1**，`RESULT: 84/86`，两条陈化：`src/render/sportPortDocs.ts 台账=763 实况=805`、`src/home/goalProgressDocs.ts 台账=452 实况=446`。**本席五分钟内跑了两次，红的件还变过一次**（前一次是 `sportDocs.ts 423→417`）⇒ 共享件，他席正在改超线件，**不是本图的账**；照票面**如实记账、未去改**。
- `tsc -b` 当刻全仓红（D4），所以 v17 证据件 §1.2 的「重编 exit 0」**当刻不可复现**（它记的是它窗口内的读数，为真）。

---

## 二、本席的**新试法**：端到端从「唤醒词」这一头走一遍

**做法**：从 `src/triggers/scene-05-workout.ts` 取 27 条可执行词，用 `crypto.randomInt`（无种子）**随机抽 1 条写词族＋2 条读词族**；对每条逐段核对：① `SKILL.md` 的代表词行 → ② 场景词表（`wake_word`／`key`／`main_prompt.cli`／`output_type`／`html_template` ＋ 行号） → ③ 路由登记 `routes.generated.ts`（＋**编译产物** `dist/triggers/routes.generated.js` 同词命中） → ④ 页面册子 `manifest.json` 的 `file`／`key`／`order` → ⑤ **照路由给的那条 cli** 真跑一次（写词再另跑「确认<词>」那一半）。→ `WAKE-TRACE PASS`（runId `t351fr-wake-trace2`，exit 0）。

抽中（本次）与逐段读数：

| 段 | 复制训练计划（写词） | 看上周计划 | 看指定周计划 |
|---|---|---|---|
| ① SKILL.md | 行 201：`calorie.workout.plan-copy` receipt | 无代表词行 | 无代表词行 |
| ② 场景词表 | 行 16 `key=plan_copy` `output_type=receipt` `templates/crud_receipt.html`，cli＝`calorie.view.plan-write-preview --params '{"op":"copy"}'` | 行 7 `plan_view_last_week`／result／`workout_plan_view.html`，cli＝`calorie.view.plan --params '{"weekOffset":-1}'` | 行 8 `plan_view_week`，cli＝`calorie.view.plan --params '{"week":1}'` |
| ③ 路由（＋编译产物同词） | 行 199 `key=calorie.view.plan-write-preview`，命令＝预览键（与②命令一致） | 行 190 `key=calorie.view.plan`（与②一致） | 行 191 `key=calorie.view.plan`（与②一致） |
| ④ 册子 | 行 12 `复制训练计划-预检.html` key=预览键；行 22 `复制训练计划-回执.html` key=写键 | 行 3 `看上周计划.html` key=`calorie.view.plan` | 行 4 `看指定周计划.html` key=`calorie.view.plan` |
| ⑤ 真跑 | exit 0、落盘、回执给绝对路径且存在 | 同左 | 同左 |
| ⑤b 写词另一半 | 路由行 511 词「确认复制训练计划」→ `calorie.workout.plan-copy`，exit 0、落盘、绝对路径存在 | — | — |

⇒ **「唤醒词 → 路由登记的 key → 真命令 → 产物落盘」四段在三条词上全通，且路由键／命令与场景词表逐字一致、编译产物与源码生成物同词**。这一头此前没人独立验过；本席补上了。

**普查（机器读数，非结论）**：27 条可执行词里，`SKILL.md` 有「代表词行」的 13 条中——**3 条与路由键同键**、**10 条不同键**（10 条正是写词族：SKILL.md 写的是**写命令**键，路由登记的是**预检命令**键，例如 `撤销训练计划`：SKILL.md 行 202＝`calorie.workout.plan-delete`／路由行 207＝`calorie.view.plan-write-preview`；写命令另有一条词「确认撤销训练计划」在路由行 519）。两处**各自都自洽**（`SKILL.md` 行 211 自述本表是**命令中心**的「代表词」列；路由是**词中心**的入口键），但同一条词在两处指向不同命令——**只读一处的读者会走到不同命令**。这条不由本席裁定（见 D3）。

---

## 三、缺陷清单（每条标「本票引入／本票范围／范围外发现」）

| 编号 | 分级 | 范围 | 缺陷 | 事实与出处 | 修法 |
|---|---|---|---|---|---|
| **D1** | **S2**（本席判 FAIL 的唯一由头；可降 S3，见 §〇） | **本票范围** | **v17 证据件两处读数已陈化，与当刻盘上不符** | ① `t351-v17-evidence.md:207`「改回的完整性凭据 ＝ `086E6975…0371E78`」——本席用 `git cat-file blob` 逐字节算：该 sha256 **正是 `d243619` 版** `scene05-验收墙/manifest.json`（21,309 B）；**当刻盘上＝`2C33EDB3…5EDDA1`（22,609 B）**。② 同件 `:243`「`总索引.html` 26,103 B」——**当刻＝27,268 B**（本席 `--check` 与读数脚本都读到 27,268；26,103 是 `d243619` 版字节数）。因由：`9b27549` 重出清单／索引／逐格缺陷清单后**没回头改证据件**；证据件通篇没有一句交代这次重出（本席把两件证据件里 `9b27549`／`归位`／`陈化`／`重出`／`换代` 全查过，只提台账陈化）。**不影响墙与产物** | 证据件补一句日期注或改这处数（**不改源码**）；顺手把 `--stage` 重出后的字节读数重记一次 |
| D2 | S3 | 范围外发现 | 台账**两行同件**：`scripts/build-help.mjs`（两行逐字相同，`—`／553／同一句结论） | `d243619` 时 1 行（386）；`1f9bce2`（#278）加了一行 553、旧行 386 留着 ⇒ 2 行；`9b27549` 的 `--sync` 把旧行也刷成 553 ⇒ **两行相同**。当刻台账 41 行／扫描面 322 件 | 删掉多余那行（属共享台账，**本席未动**）；若同步器该去重，另开小票 |
| D3 | S3 | 范围外发现 | `SKILL.md` 代表词键与路由键**同词不同键**（写词族 10/10） | 见 §二 普查；出处：`SKILL.md:200–209`／`routes.generated.ts:198–207`＋`:510–519`／`scene-05-workout.ts:15–24` | 需要**口径裁定**（谁是谁的入口）——本席只报读数，不替编排者判 |
| D4 | S3 | 范围外发现 | 当刻**全仓 `tsc -b` 红**：`packages/skill-bill/src/help/writeWire.ts:98` `TS2367`（该件 `git status` 为 `??` 未入仓，他席在途） | 同一条命令 14:08:13 exit 0、14:09:07 exit 2 ⇒ 中途被他席写进去的 | 他席收尾即可；**它不影响本席变异证**（本席用「dist 单件 sha 变了」证明变异确已落进编译产物） |
| D5 | S3 | 共享件（非本图账） | 台账门当刻 **84/86 红** | `sportPortDocs.ts 763→805`、`goalProgressDocs.ts 452→446`；两次读数还变过（见 §1.7） | 归他席与收口复核；**本席未改** |
| D6 | 记账（不判缺陷） | 本票范围 | 逐格缺陷清单「症状」「要不要改」两列是 **`—（待填）` 占位**（不是真空格）；37 行、前三列机器照清单抄齐 | `逐格缺陷清单.md:18–54`（37 行，答复两列全为 `—（待填）`） | 归负责人肉眼终审逐格填（**本席不代填**，也不替负责人判版式） |

---

## 四、未做项 ＋ 下一手缺什么

1. **「人拿真浏览器滚两张墙、逐格记缺陷」本席未做、也不代做**——那是仓规 `docs/agents/视觉验收墙.md` §4 的**负责人**动作；本席只判可机判的那一半（格数、链接、`dropped`／`dead` 两条腿、标签「该确认什么」齐不齐、`lazy`／BOM／首字符、双端缩放算式）。**下一手缺的就是负责人的两列签字**。
2. **滚动截图／像素比对未做**：本票不做视觉判定。本席**没有**用截图或视觉模型给任何一格下「版式正常」的结论。
3. **`pnpm gen:check` 未跑**（与 v17 同口径：`pnpm` 会先做依赖自检并要求安装，票面禁装包）；未按提示设 `CI=true` 去动 `node_modules`。v17 证据件 §1.2 用 `node packages/skill-calorie/scripts/gen-cli.mjs --check` 等价替代，**本席未复跑那条**（不在票面四条验收命令内），**如实记为未做**。
4. **D1 的修法未执行**：改证据件不在本席写集（本席只写自己的报告与脚本），留给编排者一行落笔或开票。
5. **台账门／全仓重编当刻不可复现绿**（D4／D5）：这两条是共享面，**与收口链的交付内容无关**；下一手若要「全绿交回执」，得等 `skill-bill` 那个在途件收尾、且台账再同步一次。
6. **下一手缺什么（一句话）**：把 D1 那两行读数（或一句日期注）补进 `t351-v17-evidence.md`，然后由负责人按 `逐格缺陷清单.md` 逐格看图签字——**墙这一侧机器能判的，本席已判完并全绿**。

---

## 附：本席脚本与日志（全部在 `.scratch/t351-final-review/`）

| 件 | 干什么 |
|---|---|
| `t351fr-readings.mjs` | 墙目录三条换代读数（双前缀／撤销回执状态卡／双墙 iframe／首字符／BOM／对账） |
| `t351fr-wall-mutate.mjs` ＋ `t351fr-wall-dead.mjs` | 副本里的清单反例（dropped）与 dead 腿，各自备份／改名／改回并比 sha256 |
| `t351fr-samples.mjs` ＋ `t351fr-pathexists.mjs` | 抽样 5 条真出口；证据件绝对路径逐条 Test-Path |
| `t351fr-wake-trace.mjs` | **新试法**：唤醒词→键→命令→产物 逐段核对 ＋ 27 条普查 |
| `t351fr-mut-driver.mjs` ＋ `t351fr-mutate-scene.mjs` ＋ `t351fr-cmp.mjs` ＋ `t351fr-hash.mjs` | 变异三批（base／mut／restore）＋ 归一化逐件比对 ＋ 单件／树 sha256（异常兜底还原） |
| `t351fr-regress.mjs` | 四条验收测试（cwd＝仓根，票面命令逐字） |
| `logs/*.log`、`logs-samples.json`、`samples/`、`base/`、`mut/`、`restore/`、`wake-trace/`、`copy/` | 逐次运行的原始输出与产物 |
