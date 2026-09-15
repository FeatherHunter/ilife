# 票 #351 · 场景05 · 186「定训练计划」换装（构建向导预检页 → 计划编辑器可写页）· **独立复核席报告**

**复核席身份**：地图 #157／票 #351 的**独立复核席**（不派下级 agent、不是换装执行席）。
执行席的每一句「已绿／已落盘」**一律不采信**：本件里出现的每个读数都是我自己跑出来的；执行席自述只当**对照物**。

**口径（先写清，免得拿 green 冒充结论）**

- 运行一律持锁：`node tooling/run-locked.mjs --ticket 351 --run-id t351rv-*`（排队是常态，实测 waitedMs 10s～80s）。
- 判内容用 **sha256**，不看 mtime；**逐字节比对只把 `YYYY-MM-DD HH:MM:SS` 换成 `<TS>`**，其余一个字节不放宽（票面口径，见 §二 ⑬）。
- 我自己写的脚本 10 件（8 件 `.mjs` ＋ 2 份页内探针 `.js`）全在 `.scratch/t351-swap-review/**`；**墙的改动只在我自己的副本** `.scratch/t351-swap-review/wall-copy/` 里做，仓内墙目录一个字节没碰。
- **我自己的两次红如实记**：`t351rv-probe`／`t351rv-probe2` 两次 exit=1 都是**我脚本自己的笔误**（① 有氧参数格索引写错训练段号 ② 把 `#pe-state` 这个**服务端初始载荷**当成交互后的读数 ③ 从路由声明里取 cli 字面时没还原 `\'` 转义、参数被截成半截），与被测物无关；第三次 `t351rv-probe3` 全绿。中间两次不计入被测物读数。

---

## 一、判定

**PASS（无 S1；缺陷清单 5 条＝1 条 S2 ＋ 2 条 S3 ＋ 2 条 S3 备查，其中 D2 建议关闭前处理或由编排者具名承接）**

| 判据（票面要求逐条） | 我的读数 | 判 |
|---|---|---|
| ① 契约门 `t554-plan-editor-gate.mjs --phase=gate` | **18/18，exit 0**（`runId=t351rv-gate`，waitedMs=10005） | 绿 |
| ② 墙自检正例（仓内） | `37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发` **exit 0** | 绿 |
| ② 墙自检反例（**我自己副本**、**我自选第 23 行**） | **exit 1** 且逐字点名 `清单点名却没有文件：23 定休息日 -> 定休息日-反例-盘上没有-复核351.html`；还原后 sha256 `b34406e5…` IDENTICAL=true 回 exit 0 | 绿 |
| ③ 186 标记前后对照（我自己量） | `ilw-` **119 → 0**；`pe-tabs` **0 → 4**；`pe-daytabs` **0 → 4**；`pe-day` **0 → 17**；`data-act` **6 → 31**；`#pe-out-body` 0 → 1；`<script>` 1 → 3（含 1 块 `#pe-state`）；73484 → 93908 B | 绿 |
| ④ 抽样真出口 3 条（含 186 ＋ 2 条写命令） | **3/3**：exit 0；回执给的绝对路径 **Test-Path 真**且与 `--html` 落点同路径；复制数据标题逐字对得上表一；表形对得上；真 `id` 各一；写命令的**库内真值**也对 | 绿 |
| ⑤ 回归 `node --test test/scene05-*.test.mjs`（四条逐字） | **exit 0**；`tests 4／pass 4／fail 0／cancelled 0／skipped 0／todo 0`（`runId=t351rv-regress`） | 绿 |
| **A 专盯**：改一格只动一行 | 我自造夹具（同名动作跨周、参数不同）＋ 我自写页内探针：三族参数各改一次，整表 8 行**每次都只有 1 行变**；同名动作在第 1 周那一行**逐字不动**；换页签来回重渲后值仍在（**写回的是状态**）；落库依据 `data-t` 同步跟着变 | 绿 |
| **B 专盯**：锁周结构真锁死／参数真可改 | 句一（禁用）：`add-train` disabled 且有属性、`add-move` 1/1 禁用、`del-train`＝0、`del-move`＝0、时段胶囊 4/4 禁用；**功能面**：真 `click()` 训练段数 1→1、点「加动作」不开选择层、禁用钮拿不到焦点。句二（可改＋写回）：锁周四件齐（`set-sets`／`set-reps`／`set-load`／`set-min`）且**缺坐标的格＝0**，改即变、重渲后仍在 | 绿 |
| **C 专盯**：186 的 CLI 预填与空态兜底 | 给 `plan`：页内状态与页上输入格逐件对得上我的夹具（标题／起日／周数／locked=[false,true]／动作名／3 组 8 次 60kg／有氧 30 分钟）；不给参数：空态盒在、**表 0 行**、周/日页签各 0；点「定一份计划」出 4 周母版（周页签 4＋加一周／日页签 7／只渲一天／加一次训练可点）；两种态下复制指令都指同一条落库唤醒词 | 绿 |
| **新试法**：从 186 这条唤醒词那一头走整链 ＋ 暗路径排查 | 19/19（17 条硬判据全绿）：SKILL.md 速查表 → 场景词表 → 路由声明 → 生成物 → keys.ts → **运行时注册表 `run.name=viewPlanEditor`** → 真命令 → 产物；**暗路径四条全无命中**（legacy 层无这条键、`cmd_read` 无回落分支、旧入口零调用方、旧页装配只在已退场的函数下） | 绿 |

**为什么不是 FAIL**：票面点名的 S1 五类（契约违反／用户可见回归／证据造假／私自放宽／数据丢失风险）我自己逐类查过——
契约门 18/18；用户可见面（编辑器页真渲染＋写回＋落库依据同步）抽样与逐字节比对都过；执行席给的**绝对路径 76 条 Test-Path 真＝76／假＝0**、**改前基线副本与 git 里那一版 sha 相同**（证据不假）；
机检件判据条数 **29 → 29**、唯一那次口径改动（`thead`／`tbody` 从整页改正文）**只影响编辑器那一份**（我自量 36 份非编辑器页读数不变），没有放宽；库一律隔离在 `.scratch/`（我自己的三条抽样也隔离在 `.scratch/t351-swap-review/products/dbs/`），无数据丢失面。

---

## 二、机器证据

### 2.1 持锁运行（逐字 `GATE-RUN`，取自 `.scratch/locks/gate-runs.log`）

```text
GATE-RUN runId=t351rv-gate     cmd="node docs/skills/skill-calorie/t554-plan-editor-gate.mjs --phase=gate" waitedMs=10005 exit=0
GATE-RUN runId=t351rv-probe    cmd="node .scratch/t351-swap-review/run-all.mjs" waitedMs=80077 exit=1   ← 我脚本自身笔误（见口径），不计被测物
GATE-RUN runId=t351rv-probe2   cmd="node .scratch/t351-swap-review/run-all.mjs" waitedMs=70080 exit=1   ← 同上
GATE-RUN runId=t351rv-probe3   cmd="node .scratch/t351-swap-review/run-all.mjs" waitedMs=10009 exit=0   ← 定稿读数
GATE-RUN runId=t351rv-regress  cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs" waitedMs=60057 exit=0
```

### 2.2 摘要行（逐项；每行的原始日志都在 §三 的路径里）

| # | 项 | 摘要行 | exit |
|---|---|---|---|
| ① | 契约门 | `RESULT: 18/18`（另：C3.4「锁周可填格＝set-sets／set-reps／set-load／set-min，纯文本参数行＝[]，缺坐标的格＝[]」；X1「改『第 3 周 周四 椭圆机』时长 → 表里变动行＝1 条、另一行逐字不动」） | 0 |
| ② | 墙正例（仓内） | `37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发` | 0 |
| ② | 墙反例（我副本） | `36 格；链接 189 条；缺失 1 -> 不可发` ＋ `清单点名却没有文件：23 定休息日 -> 定休息日-反例-盘上没有-复核351.html` | 1 |
| ② | 我自加的反例乙（页上引用坏掉） | `37 格；链接 190 条；缺失 1 -> 不可发` ＋ `页上引用却落不到：复核351-页上引用-盘上没有.html`（自检的 `dropped` 与 `dead` **两半都真判**） | 1 |
| ③ | 186 前后（我自量，整页子串口径） | 改前 `ilw-=119 pe-tabs=0 pe-daytabs=0 pe-day=0 data-act=6 pe-out-body=0 script=1 json=0 73484B`；改后 `ilw-=0 pe-tabs=4 pe-daytabs=4 pe-day=17 data-act=31 pe-out-body=1 script=3 json=1 93908B` | — |
| ③ | 改前基座真伪 | 旧页（`git show d243619:…/定训练计划-预检.html`）sha256 `26717eba…` ＝ 执行席留的基线副本 sha256（**IDENTICAL=true**） | — |
| ③ | 墙内那一格 ≡ 新批产物 | 两边 sha256 均 `0cb52dbb4157a7b0…66ecc2`（**逐字节同**） | — |
| ④ | 抽样三条 | `SAMPLE 汇总：3/3`（`s1-order186-process`／`s2-order186-receipt`／`s3-order191-receipt`）；三条的回执路径 `data.output` Test-Path 全真、且 `resolve(data.output) === resolve(--html 落点)`；复制数据标题＝`【calorie · 定训练计划】`／`【calorie · 定训练计划】`／`【calorie · 改训练计划】`；表列 `[]`（186 过程页声明 none）／`["项","值"]`／`["项","值"]`；无一份含「组数×次数」列；真 `id="ilife-copy-data"`／`id="ilife-copy-log"` 各恰 1（剔掉 `data-action-id` 子串后数）；**写命令库内真值**：②`config.title="示例计划"`、`workout_plans` 1 行、首行 `{week_number:1,day_of_week:1,session_label:"上肢",movements:[{name:"俯卧撑"}]}`；③`config.title="示例改名"` | 0 |
| ④′ | 证据件里**凡给绝对路径的** | 从 `t351-v18-evidence.md` 抠出 **76 条**绝对路径（产物目录 38 ＋ 墙目录 38），**Test-Path 真＝76／假＝0** | — |
| ⑤ | 回归四条（逐字命令） | `ℹ tests 4 ℹ pass 4 ℹ fail 0 ℹ cancelled 0 ℹ skipped 0 ℹ todo 0` | 0 |
| A | 改一格只动一行（我的夹具／我的探针） | A1 `变动行数=1`：`第 2 周｜周四｜下午｜深蹲｜腿｜力量｜1 组乘 6 次｜80 kg → 92.5 kg`（输入格坐标 `<input data-act="set-load" data-d="3" data-s="0" data-m="0" value="80">`）；A2 第 1 周同名深蹲行**逐字不动**；A3 行数 `8 → 8`；A4 `data-t` 第 2 周行成 `下午　深蹲　腿　力量　1 组乘 6 次　92.5 kg`、第 1 周行仍旧 `80 kg`；A5 次数 `→ 12 次`（仍只 1 行变）；A6 有氧 `25 分钟 → 41 分钟`（第 1 周爬楼机仍 30 分钟）；A7 重渲后 `负重=92.5 次数=12 时长=41`、表逐字不变 | 0 |
| B | 句一：结构真锁死 | `add-train disabled=true（有属性=true，文案=「训练安排由第 1 周决定，这里只改参数」） add-move 禁用 1/1 del-train=0 del-move=0 set-slot 禁用 4/4 锁图标=1 周头=「动作与第 1 周相同，只改参数」`；功能面 `训练段数 1→1；点加动作后选择层=0；禁用钮可聚焦=false` | 0 |
| B | 句二：参数真可改且写回生效 | 四件齐：锁周周四 `["set-slot","set-sets","set-reps","toggle-mode","set-load","add-move","add-train"]`、锁周周一（含爬楼机）`[…,"set-min",…]`；**缺坐标的参数格＝0**；改组数 → `1 组乘 12 次 → 9 组乘 12 次`（只 1 行）；RM↔kg 切换 → `92.5 kg → 92.5 RM`（只 1 行）；母版周对照：`add-train disabled=false del-move=1 del-train=1 set-slot 禁用=0` | 0 |
| C | 预填生效 | `title=复核351计划 startDate=2026-10-05 weeks=2 locked=[false,true]`；`w1d1m0={name:"杠铃卧推",part:"胸",kind:"力量",sets:3,reps:8,mode:"kg",load:60}`；时段 `["上午","晚上"]`；页上 `周页签=2 日页签=7 天元素=1 该天动作=["杠铃卧推","爬楼机","平板支撑"]`；输入格 `sets=3 reps=8 load=60 cardioMinute=30`；口径行＝「这份计划是按我们刚才讨论的结果填好的，你看着改。…」 | 0 |
| C | 空态兜底仍可用 | `状态周数=0 空态盒=true 主按钮=「定一份计划」 周页签=0 日页签=0`；表＝`计划明细（0 行）…还没有排动作`；复制指令首段＝`请你加载技能 卡路里，执行唤醒词「定训练计划」。`；点主按钮后 `周页签=4 日页签=7 天元素=1 空态盒已消失=true 加一次训练可点=true` | 0 |
| 新试法 | 整链 19/19（硬判据 17） | 见 2.3 | 0 |
| ⑩ | 生成物门 `gen-cli.mjs --check` | `GEN-CHECK PASS：键 128（写 46 ＋ 读 82）；能力 10 个；未搬迁清单 0 条` | 0 |
| ⑪ | 告警线台账门 `check-warning-line.mjs`（只读，无参） | `RESULT: 87/87` ＋ `PASS: 告警线台账齐全且与实况一致`（台账 42 行／扫描面 327 件／超线 38 件／剔出生成物 3 件） | 0 |
| ⑫ | 私自放宽核查：机检件判据条数 | `check(` 条数 **现盘 29 ＝ HEAD 29**（`git show HEAD:…t351-v7-run-176-207.mjs` 数出来的） | — |
| ⑫′ | 私自放宽核查：`thead`／`tbody` 从整页改正文口径 | 37 份产物里**整页≠正文的只有 1 份**——`order186-process.html thead 1→0 tbody 1→0`；**36 份非编辑器页读数一字不变**（这就是「改口径只为编辑器页」的机器凭据） | — |
| ⑬ | 逐字节比对（只抹渲染时刻） | 我的 2 份产物 ＋ 执行席原批 ＋ 墙内那一格：原始 sha 相同 **2/4**、**归一化后 sha 相同 4/4**（`归一化sha=bac76490…`，差异只住在那 1 处 `YYYY-MM-DD HH:MM:SS`） | 0 |
| ⑭ | src → 产物 直连（不重编、不改 dist） | 产物里那块页内运行时 **17776 B，sha256 `bcf118c18b30…`，与 `src/render/planEditorRuntime.ts` 模板字面的 cooked 值逐字节相同**；页内样式前 400B 逐字在 `planEditorCss.ts`；`#pe-state` 的 10 个键与 `planEditor.ts` 形状同源；共享 helpers 块与另一份产物**逐字节同**（`d232b27c5a30`） | 0 |

### 2.3 新试法（我自选的角度：从 186 那条唤醒词那一头走整链 ＋ 查暗路径）

理由（为什么选它）：换装把「这条词指向哪张页」这件事从**页内形状**挪到了**链的接线**上；上游所有人判的都是产物页本身，
**没人从唤醒词那一头逐段核对「键与命令是否自洽」**，也没人查过「186 这条链上有没有别的分支能把人送回旧页」。
逐段的机器读数（`CHAIN-RESULT: 19/19`）：

1. **SKILL.md** 速查表里这条键的示例命令抠出来的键 ＝ `calorie.view.plan-wizard`（自洽）。
2. **场景词表**（冻结 parity 源）`scene-05-workout.ts:15`：`main_prompt.cli` 与 `data_source` 都指这把键。
3. **路由声明** `routes.ts`：`order 186 定训练计划 key=… kind=exec`；`new order 27 看构建向导` 亦指同一把键。
4. **生成物** `routes.generated.ts` 两条记录同键；`keys.ts` 登记 `shape:'stat'`。
5. **运行时注册表（dist，真身份）**：`REGISTRY['calorie.view.plan-wizard'].run.name = 'viewPlanEditor'`，与旧向导函数**不是同一引用**；
   `routesFor('定训练计划')` 命中 **1 条 exec 路由**，键正确。
6. **暗路径排查（四条全无命中）**：`src/cli/legacy/**` 无这条键（老路没有「未搬迁」的暗路径承接它）；`cmd_read.ts` 命中即走 `REGISTRY`、
   未命中即 `fail(3)`、正文里根本不提旧向导（无回落分支）；旧入口 `viewPlanWizard` 除定义件与一句注释外**零调用方**；
   旧页装配 `renderPlanWizardHtml` 只在已退场的 `wizard.ts` 下。
7. **真命令 → 产物**：照**路由里那条 cli 字面**跑（键与参数都取自路由）→ exit 0、回执路径落盘、产物 `pe-tabs=4 pe-daytabs=4 pe-day=17 data-act=31 ilw-=0`、
   页内落库指令＝`执行唤醒词「定训练计划」`、复制数据标题＝`【calorie · 定训练计划】`。
8. **副作用读数（记账）**：`order 27`「看构建向导」用同键参数跑出来的是**同一张编辑器页**（归一化后逐字节同）——执行席如实交代过，我复量成立，**归负责人／编排者裁**。

---

## 三、逐条路径

**我写的脚本（10 件：8 件 `.mjs` ＋ 2 份页内探针 `.js`，全在 `.scratch/t351-swap-review/`）**

| 脚本 | 干什么 |
|---|---|
| `01-recon.mjs` | 186 前后标记对照（我自量）＋ 证据件绝对路径逐条 Test-Path ＋ 关键件 sha256／LF ＋ dist 认口 |
| `02-samples.mjs` | 抽样三条真出口（186 过程页 ＋ 2 条写命令）＋ 回执路径 Test-Path ＋ 库内真值 |
| `03-probe.mjs` / `probe-in-page.js` / `probe-empty-in-page.js` | **我自造的夹具＋我自写的页内探针**（A／B／C 三条专盯；页由真出口跑出、不是我直接调装配函数） |
| `04-chain.mjs` | 新试法：唤醒词整链逐段对账 ＋ 暗路径排查 |
| `05-wall-red.mjs` | 墙自检反例（在我自己的 `wall-copy/` 副本里；含我自加的 `dead` 反例） |
| `run-all.mjs` | 一次持锁跑完 02／03／04 ＋ `gen-check` ＋ 告警线门 ＋ 我自加的 `thead` 口径核对 |
| `08-normalized-cmp.mjs` | 逐字节比对（只抹渲染时刻，票面口径） |
| `09-src-dist-product.mjs` | src → 产物 直连核对（不重编、不改 dist；含共享 helpers 指纹复算） |

**日志（`.scratch/t351-swap-review/logs/`）**：`gate.log`（契约门全文）／`run-all-console*.log`／`02-samples.log`／`03-probe.log`／
`04-chain.log`／`wall-red.log`／`06-ledger-check.log`／`05-gen-check.log`／`regress-scene05.log`／
`recon.log`／`normalized-cmp.log`／`src-dist.log`／`run-all.json`／`samples.json`／`probe.json`／`chain.json`／`recon.json`／
`evidence-paths.txt`／`wall-copy-manifest.sha256`／`diff-runner.txt`（机检件相对 HEAD 的完整 diff）／`runner-head.mjs`（HEAD 版机检件留底）。

**产物与留底（`.scratch/t351-swap-review/`）**：`products/`（我的三条抽样 ＋ 两张探针页 ＋ 186 链那一份 ＋ `dbs/` 隔离库）／
`probe-pages/`（页 ＋ 我探针的合成页）／`wall-copy/`（墙的**我的副本**，含被改过的清单与还原后的清单）／`old-186-from-git.html`（改前基座，取自 `d243619`）。

**只读引用（未改）**：`docs/skills/skill-calorie/t351-v18-evidence.md`（对照物）／`t351-v18-gate-runs.md`／
`docs/skills/skill-calorie/scene05-验收墙/**`（含 `gen-wall.mjs`／`manifest.json`／`逐格缺陷清单.md`）／
`packages/skill-calorie/{SKILL.md, src/**, dist/**, AGENTS.md}`。

---

## 四、未做项 ＋ 下一手缺什么

1. **全量 37 份重跑批我没跑**（`t351-v7-run-176-207.mjs --out …`）。理由：票面只要求抽样 3 条；全量批是执行席的跑批件，
   持锁排队实测 80s～220s，且它的产物已在盘上、我用「抽样 ＋ 逐字节比对（只抹时间戳）」覆盖了它。
   ⇒ **下一手**：若要把「29 条判据全绿」这句话钉死到**当刻**工作区，请由编排者跑一次
   `node tooling/run-locked.mjs --ticket 351 --run-id <id> -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t351-v7-recheck`，
   期望 `RESULT: 66/66` ＋ `PROBE: PASS（29/29）`。
2. **我没编译**（`tsc -b` 会改 `dist/` 与 `.tsbuildinfo`，属变异，不在复核席写集内）。因此「当刻 dist 就是当刻 src 编出来的」
   我给的是**旁证链**而不是重编自证：`dist` 认口 `run: viewPlanEditor,` 命中 1／`run: viewPlanWizard,` 命中 0；`gen:check` exit 0；
   以及**不经过 dist 的直连**——产物里那段运行时与 `src/render/planEditorRuntime.ts` 模板字面的 cooked 值**逐字节相同**（`bcf118c18b30…`）。
   ⇒ **下一手**：要硬凭据就跑 `node tooling/run-locked.mjs --ticket 351 --run-id <id> -- node node_modules/typescript/bin/tsc -b --force` 再复跑批；
   注意 `t351-v18-evidence.md` §八 记的那个坑：**Windows 上 `CopyFile` 会带旧时间戳，增量 `tsc -b` 会跳过 emit**，必须 `--force`。
3. **视觉／像素判定我没做、也不代做**（票面：判定归负责人）。我核过 `逐格缺陷清单.md` 是**空骨架**：37 行「症状」「要不要改」两列
   共 **74 处 `—（待填）`，一个字没填**（这是对的，我不越界去填）。
4. **我自己的浏览器探针是 1280 宽视口下的 DOM 读数**，没有真人滚两张墙、没有 390 窄屏目视（票面派给负责人）。
5. **没碰的东西**：`packages/**` 源码一行没改（只读）；没跑 `git add/commit/push/stash/reset/checkout --/clean`；没装包；没进他席件。
   `packages/skill-calorie/AGENTS.md` 在我复核期间被别的窗口改过两次（台账行有增删），我引用的是**我跑那一刻**的读数（`87/87` exit 0）。
6. **我这条读数的时效**：本仓有别的窗口在并发落盘，§二 的所有读数都对应 §2.1 那几行 `GATE-RUN` 的时刻；结论只对那一刻的盘面负责。

---

## 五、缺陷清单（每条标「本票引入／本票范围／范围外发现」）

### D1 · 锁周结构只靠 `disabled` 挡，委派处理器没有 lock 守卫 — **本票范围**｜S3 记账

- **我自量的读数**：往锁周那颗 `disabled` 的「加一次训练」钮上**合成派发一次** click，训练段数 **1 → 2**。
- **同一组的反面读数**（为什么不是 S1）：真 `el.click()` 之后再量仍是 **1 → 1**；点「加动作」不开选择层（`.pe-sheet`＝0）；
  `addT.focus()` 后 `document.activeElement !== addT`——**真实指针与键盘都够不到 disabled 钮**，用户可见面没破。
- **风险**：将来有人用程序化点击／自动化测试驱动这一页时，锁周结构可被绕过（`src/render/planEditorRuntime.ts` 的委派处理器里没有 `lock()` 判）。
- **修法**：`add-train`／`add-move`／`set-slot`／`del-*` 这几条分支在处理器里也判一次 `lock()`（三行）。
- 结论：与执行席跑批件的 `备注①` 是同一件事，**我独立复量成立**；属记账，不阻塞关闭。

### D2 · SKILL.md 仍写「训练计划当前不可写」，与本次交付的链路首段相反 — **本票范围**（陈化源头不在本票）｜**S2 关闭前必修或具名承接**

- **矛盾读数（我自量）**：`packages/skill-calorie/SKILL.md`
  - 第 63 行：``| `定训练计划` | `plan_builder_wizard.html` | **当前不可写**：95 键无训练计划写键（见下） |``
  - 第 73 行：「**训练计划 95 键无写键，当前不可写**——`NON_EXEC_REASONS.planWriteMissing` 逐字…，命中回 `non-exec` 并告知用户属二期，**不得**承诺 verify 后写入。」
  - 而**同一份文件**第 11 行又把「定训练计划」列进「配置型写词（…先按 Wizard Verify 铁则分流再调会改数据库的命令）」——**自己跟自己相反**。
- **事实读数**：命令面上 `calorie.workout.plan-set` 是**写键**（`kind:'write'`，`wakeWord:'定训练计划'`）；路由 `new order 58 确认定训练计划` 是 `exec`；
  `NON_EXEC_REASONS.planWriteMissing`（`src/triggers/routing.ts:70`）在 `routes.generated.ts` 里**零命中**（已是死常量）。
- **为什么算本票范围**：本票的第一性原理是「让用户在页面上把计划真的定下来，然后交出可复制产物给 AI 落库」；SKILL.md 这一行说的就是
  **186 这条词的过程页**，而它是 AI 读的那份说明书——它写着「不得承诺 verify 后写入」，是这条链上**唯一会让 AI 拒绝落库**的文本。
- **为什么不算 S1**：不是本票造成的回归（「95 键」是旧时代的陈化），也不涉及造假／放宽／数据丢失。
- **修法（很便宜）**：改两处字面（SKILL.md 第 63／73 行的「当前不可写／无写键」口径改成本页的实际分流）；顺手删 `routing.ts` 的那个死常量。
  注意 `build-help.mjs` **只重写标记块**，这两句在标记块**外**，重跑生成器带不走，得手改；本票已如实交代「SKILL.md 未重出」，但交代的理由（没加键、没改标题与示例）**覆盖不到这两句**。

### D3 · `commands.ts` 件头注释与本文件自己的声明相反 — **本票范围**（在写集内、本票改过同一段）｜S3 记账

- **读数**：`packages/skill-calorie/src/workout/commands.ts` 件头仍写「「定训练计划」「落地训练」「同步到训记」这些词**本场景无写键**（理由逐字住 `routes.ts`）」，
  而**同一个文件**第 42 行就声明了 `{ kind: 'write', key: 'calorie.workout.plan-set', …, wakeWord: '定训练计划', … }`。
- 本票改的正是这段注释的紧邻上下文（把「定训练计划（检视半）」改成「过程页」那一段），却没带走这一句 ⇒ 一行字的事。
- 用户不可见（注释），不判 S1／S2。

### D4 · 冻结场景词表里这条词的 `html_template` 盘上不存在 — **范围外发现**｜S3 备查

- 读数：`src/triggers/scene-05-workout.ts:15` 的 `html_template = templates/plan_builder_wizard.html`，**盘上不存在**
  （`packages/skill-calorie/templates/` 只有 6 个 html；全仓引用只剩该冻结表与 `test/skill-t11.test.mjs:47`）。
- 影响：无（该表按 `routing.ts` D-1 是**冻结 parity 源、不是路由**，运行时按路由走）。登记备查，不判缺陷。

### D5 · 同一把键在命令登记面与墙面叫法不同 — **范围外发现**｜S3 备查（执行席已如实交代）

- 读数：`src/cli/keys.ts:144` 里这条键的 `title` 仍是「**构建向导**」；而墙的 `manifest.json` 第 11 格已改成
  `title="定训练计划 · 计划编辑器（可写页）"`、`family="计划编辑器 · 可写页（order 186）"`。两处说的是同一把键。
- 执行席在 `t351-v18-evidence.md` §十 第 5／4 条如实交代（含发布名仍为 `定训练计划-预检.html`），我复量成立 ⇒ 归负责人／编排者裁，不判缺陷。

### 不构成缺陷但要点名的一条（副作用，交负责人裁）

- **`new order 27`「看构建向导」现在拿到的也是编辑器页**（我实测：同键同参，归一化后与 186 那份逐字节同）。执行席已如实交代；
  要不要给这条词留旧页或另开一条词，**不属复核席可裁**。

---

**（本报告不填 `逐格缺陷清单.md` 的任何一列——那是负责人的两列。）**
