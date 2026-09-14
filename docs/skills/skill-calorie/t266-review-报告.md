# 票 #266 独立对抗审查报告（与实施席不同人；只信提交号与自己的复跑）

**判定：PASS**——无 S1，五维 **97/100**，S3 记账 5 条。被审提交 `505002d`（`505002d2d2c8e80419112f159982890e9036d57c`，已推送：`git merge-base --is-ancestor 505002d origin/master` exit=0），三件＝`packages/skill-calorie/src/exercise/commands.ts`（4 处 `wakeWord`）、`packages/skill-calorie/test/exercise-wakewords-266.test.mjs`（新）、`docs/skills/skill-calorie/t266-接线证据.md`（新）。

## 一、机器证据（全部经 `tooling/run-locked.mjs --ticket 266`；不采信实施席结论）

**GATE-RUN 三窗口**（本席运行，逐字）：`runId=a30d8389-3bfc-4004-993b-4d6eccd11a16`（waitedMs=10002）、`runId=77cbc610-4816-4071-bf0d-c75d6ea91a11`（waitedMs=50003）、`runId=514e8db0-421e-4d14-8960-f9c3a064442f`（waitedMs=20002）。

**1. 复跑判据**：实施席声称的 4/4 在我手里**重现两次**——`JUDGE[base] exit=0` ＋ `RESULT: 4/4 通过 exit=0`（a30d8389）；`JUDGE[restored] exit=0` ＋ `RESULT: 4/4 通过`（77cbc610）。判据件 174 行、4 件断言，已在 `pnpm test` 通配内（探针 P4 实测 YES）。

**2. 自设变异（不与实施席同处：我选 `-strength`）**：
- **红行**：`wakeWord: '看力量训练总览'` → `wakeWord: '看力量总览'`（命中恰 1 次；该词由机器读数证明不在 436 词表）→ dist 含新词=1／含旧词=0 → `JUDGE[mutant] exit=1`、`RESULT: 0/4 通过`，**四件全红**；重心第三件红条逐字：`HELP 两边打架：HELP 场景页没列「看力量总览」（命令 calorie.view.exercise-strength）；冻结表里没有「看力量总览」指向 calorie.view.exercise-strength（该命令在冻结表的词：看力量训练总览）`。
- **绿行**：`git checkout -- packages/skill-calorie/src/exercise/commands.ts` exit=0 ＋ `git diff --quiet` exit=0（与 HEAD 逐字节一致）→ `JUDGE[restored] exit=0`、`RESULT: 4/4 通过`。收尾五件指纹与变异前**逐件相同**（`0B1C46414FB6`／`01B6AC190237`／`27F41C135EF4`／`70AB27CC44F5`／`C8179D81E306`），`commands.ts` 树上零脏。

**3. 自设探针 `t266-review-probe.mjs`（终版，只读，exit=0）**：
- **P1 以唤醒词为起点**：39 条权威唤醒词走 `lookupWake`——解析到命令 39/39；命中的命令＝冻结表该词自己的命令 39/39；与 `wake` 路由声明逐条对账 39/39（`src/exercise/routes.ts` 29 ＋ `src/home/routes.ts` 10）；其中 **29 条落在 `EXERCISE_COMMANDS` 那 10 条之内**，其余 10 条指向 `calorie.view.exercise`（场景 01 的命令，属既有分区事实，非本票引入）。**P1e**：10 条代表词在真产物「卡路里_HELP」HTML 里 10/10 命中（不靠词表代理）。
- **P2 A 走法的代价量化**：6 个新拟词在**用户可见面命中 0**——`SKILL.md` 全文 0／`SKILL.md` AUTO 块 0／HELP 文件产物 0／`calorie.help.center` file·inline·text 三态 0；只存活于**机器面 12 处**（`src/exercise/routes.ts` `new` 表 6 条@51–56 ＋ `routes.generated.ts` 6 条@480–491）；`lookupWake` 命中 0、`routesFor` 命中 1（exec）。定级 **S3 记账**（依据见 D1）。
- **P3 交付自洽的范围**：当刻树上 `pnpm gen:check` **exit=0**（三窗口读数一致，`GEN-CHECK PASS：键 118（写 46 ＋ 读 72）；能力 10 个…声明 118 条，未搬迁清单 0 条`）；另 `pnpm help:examples:check` exit=0（`RESULT: 118/118`、`PASS: SKILL.md 示例逐行可执行`）。**本票只做到树上自洽；干净检出自洽由 #392 统一重导收口**（生成物三件未入仓）——不把树上临时自洽当交付自洽，也不因此单独判 FAIL（另有一票在管）。
- **P4 逐条核票面**：六行表逐行 6/6 与源码文本一致。

**4. 红线核查**：提交恰 3 件、全在票面路径；提交内 0 件生成物（无手改生成物）；`src/exercise/routes.ts` 一行未动（未新增唤醒词，`WAKE_ASSETS.length=436` 实测）；提交路径无别家能力目录／样张。

## 二、逐条路径

| 票面条目 | 我的独立读数 | 判定 |
|---|---|---|
| 行 1 `-distribution`：看运动分类占比→看运动类型分布 | `git show dc16ba1:` 实测旧值为「看运动分类占比」，现值为「看运动类型分布」 | 已改，逐字对 |
| 行 2 `-trend`：看运动消耗趋势→看运动趋势 | 旧值实测「看运动消耗趋势」→ 现「看运动趋势」 | 已改，逐字对 |
| 行 3 `-recap`：看运动复盘→运动复盘（本周） | 旧值实测「看运动复盘」→ 现「运动复盘（本周）」 | 已改，逐字对 |
| 行 4 `-goal`：看运动目标→看今日运动（vs 目标） | HEAD 上**无该字段**（grep 只得 9 处 `wakeWord`，不含 -goal）→ 现补齐 | 补字段（票面写「换成」，实为新增，结果逐字对） |
| 行 5 `-strength`→看力量训练总览 | HEAD 上**已是真词** | **已是真词，无需改** |
| 行 6 `-cardio`→看有氧训练总览 | HEAD 上**已是真词** | **已是真词，无需改** |
| 第三件「HELP 两边不打架」 | 判据第 3 件对每条命令逐条比 ①场景页列着 ②冻结表里同命令 ③`lookupWake` 命中同命令；我的变异腿把它咬红 ⇒ **真被断言盯住，不是靠人读** | 成立 |
| 不许动：生成器／生成物／新词／命令键形状 | 提交无 `scripts/`、无生成物；436 条不变；diff 仅 4 处 `wakeWord`＋文件头注释 | 合规 |

## 三、缺陷清单（每条标注归属；范围外只记 S3＋转票措辞）

**D1（本票范围·S3 记账）A 的代价表述需校准。** 票面表写「代价：HELP 里仍然存在用户不会说的词」，P2 实测 HELP 三面命中 **0**；真残留面是**机器路由层** 6 条 `new` 记录（＋生成物 6 条）。实施席自己在证据 §2 与票面评论里写的是「路由层仍留 6 个用户不会说的新拟词」，与实测一致 ⇒ 不改判、不返修。**转票措辞**：删这 6 条 `new` 并入 #81／#111 收口票或另立一票，连带 `test/calorie-routing-81.test.mjs` 三处 `68→62`（`:246`／`:287`／`:288`）与 `exercise-port-111.test.mjs` 5 行命中表（`:114`／`:117`／`:118`／`:119`／`:127`）——我对这三处做了只读核对，B 走法确实会红别图冻结断言，判 A 的依据成立。

**D2（本票范围·S3 记账）票面「缺口实测」的记名错位。** 票面把 `看力量总览`／`看有氧总览` 记在 `commands.ts` 名下（六行表第 5／6 行据此写「现在的代表唤醒词」），实测这两个词住 `routes.ts` 的 `new` 表（`:52`／`:53`）。实施席已在文件头注释与证据 §1.3 记明 ⇒ 票面口径问题，非实施缺陷。

**D3（范围外发现·S3＋转票）框架级缺口的全包量化。** 生成器不校验 `wakeWord`：`packages/skill-calorie/scripts/*.mjs` **0 处**引用 436 词表（结构上不可能校验）。逐行扫 `packages/*/src/*/commands.ts`：118 条声明行里 109 条带 `wakeWord`，其中 **24 条不在 436 词表**（analysis 8／photo 4／diet 4／body 3／goal 2／weight 1／workout 1／profile 1），另 9 条无该字段；本票只清了自己那 10 条。**转票措辞**：补「代表唤醒词 ∈ `WAKE_ASSETS`」生成期门禁（框架级变更，须抢 `gate.lock` ＋ 广播），并按能力目录逐条清账。

**D4（范围外发现·S3 记账）当刻树上 `tsc -b packages/skill-calorie` exit=1**，报错件是**别席在途**的 `src/photo/pickerDoc.ts:100`（TS2353 `selectedId`）；同窗口另一读数为 `src/weight/receipt.ts`／`src/workout/precheckPrompt.ts`——错误面随笔主编辑漂移，与本票路径零交（我的变异腿里 4 处换词 0 报错）。⇒「链四步 0/0/0/0」是 10:26–10:27 窗口的读数（实施席证据 §9 已如实附记）；**本席未复跑链四步**（第一步 `tsc -b` 当刻被别席拦红），以 `pnpm gen:check`=0 ×3 ＋ `help:examples:check`=0 替代。

**D5（范围外发现·S3 记账）跨图 6 红**（`test/calorie-routing-81.test.mjs` 计数面 4 ＋ `exercise-port-111`／`sport-homogeneity-109` 唤醒词错键 2）由别席在途键数变更与 #342 路由改指引起。我未复跑实施席的「换词后 6 红 ⊂ 换词前 7 红」对照，但 P1 的独立读数与其归因方向一致（#111 冻结期望写 `-strength`／`-cardio`，而路由层今天逐词与冻结表同命令）⇒ 范围外记账，不单独决定 FAIL。

## 四、五维分（次要摘要）

契约一致 30→**30**（四条验收逐条机器读数为证）；证据真实可复现 25→**23**（扣 2：D1 的 HELP 面代价一句未经机器核；链四步读数与当刻树上不可复现，须自辨窗口）；新旧对照 20→**20**（HEAD 逐字对照成立，4 处换词逐词对上；无回退——原 6 词仍在 `new` 表，可达性不掉）；工程红线 15→**15**；文档同步 10→**9**（扣 1：证据 §2 与票面评论沿用票面「HELP 残留」措辞）。合计 **97**，S1 空 ⇒ **PASS**。

**未做项**：干净 worktree 复跑未做（主仓 94 件他席在途脏件）——以「五件指纹前后逐件相同＋`git diff --quiet`=0＋`gen:check`=0」证明我的变异窗口未污染他席；链四步未跑（D4）；跨图 6 红对照未复跑（D5）；6 条 `new` 记录只判定未动手（票面明令）。

**路径**：报告本文；探针 `docs/skills/skill-calorie/t266-review-probe.mjs`（复跑：`node docs/skills/skill-calorie/t266-review-probe.mjs`）；原始读数 `.scratch/t266-review/battery.log`／`battery2.log`／`battery3.log`（含三窗口逐行输出、`hold-review*.ps1`、`mutate.mjs`，未入仓）。
