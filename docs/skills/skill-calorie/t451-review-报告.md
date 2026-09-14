# #451 独立对抗审查报告（记录级明细族融合）

**判定：PASS**（无 S1；五维 30／24／19／15／9 ＝ 97／100，均分 97 ≥ 85）

审查对象：提交 `875375d`（实现 `packages/skill-calorie/src/exercise/records.ts` 303 LF／13918 字节、
判据 `packages/skill-calorie/test/exercise-records-fusion-451.test.mjs` 342 行、证据 `docs/skills/skill-calorie/t451-明细族融合.md` 93 行）。
本席只读：被审三件 ＋ `scene-04-exercise.ts`（冻结表）＋ `test/doc-page-assert.mjs` ＋ `packages/skill-calorie/AGENTS.md` 台账 ＋ `t422-融合共用件.md` §七 ＋ 交付物目录 ＋ `base-render/src/blocks.ts` 的可打印段，未读全仓。

## 一、机器证据（每条给 runId 与读数）

1. **复跑门禁**（全部走 `node tooling/run-locked.mjs --ticket 451 -- …`）：
   - `pnpm build` → `runId=02e46503` exit **0**（首跑口径）。后两次建仓级红：`runId=dd03d34b`／`runId=ce1beebd` 段内 `pnpm build` exit **2**——
     红全来自**别席在途件** `packages/skill-bill/src/{record/scene-income.ts,record/scene-reimburse.ts,help/lookup.ts}`（TS1490「File appears to be binary」等 **64** 条，逐件归账 35／22／7），
     本票包内 **0** 条。定向编译 `npx tsc -b packages/skill-calorie` → `runId=ce1beebd` exit **0**。
   - 新判据 `node packages/skill-calorie/test/exercise-records-fusion-451.test.mjs` → `runId=a7c52e72` exit **0**，8／8 通过（`08-empty-blocked` exit 4 为实测真值）；
     产物字节 65711／65717／66278／65814／65815／88184／66634 与证据件表逐格同值。
   - `node --test …/exercise-records-342.test.mjs` → 5／5、exit 0；`node --test …/doc-page-assert.mjs` → 1／1、exit 0（同在 `runId=f1dac406` 段内）。
   - 告警线：首跑 `runId=f1dac406` **红**（`RESULT: 55/57`、`RED 台账陈化：src/render/sportPortDocs.ts 台账=531 实况=702`、`RED 漏报：src/render/sportDocs.ts LF=351`）——
     两件都是**别席在途件**；随后别席同步台账，复跑 `runId=a47ad367` **exit 0／RESULT: 58/58／PASS**。
2. **自设变异两处**（四步序：变异→定向编译→判据红→写回原字节＋刷 mtime→编译→判据绿；判据读 `dist/`，两次都重编译）：
   - A「表标题去上限明示」：变异 `sha256=4D38E215…`→编译 exit 0→判据 **exit 1**（前三处红：`✖ 看今日运动`／`✖ 看昨日运动`／`✖ 看记录（有备注）`，共 6 条）；写回后 `sha256=B318105B…`（与变异前同值，13918 字节）→编译 exit 0→判据 **exit 0**（`runId=3aa8eb62`）。
   - B「八列表头换序（距离／心率对调）」：变异 `sha256=C7291DBC…`→编译 exit 0→判据 **exit 1**（7 条红）；写回后同值 `B318105B…`→编译 exit 0→判据 **exit 0**（同在 `runId=ccd3cc7f` 段内，还原后 8／8 全绿）。
     还原只写回本席另存原字节（`writeFileSync(备份)`），未用 `git checkout --`／整目录还原。
3. **本席自设探针** `docs/skills/skill-calorie/t451-review-probe.mjs`（`runId=1eaa0c45` exit 1 为探针自身写法缺陷、修正后 `runId=a5327bb9` **exit 0／122 项全 PROBE-OK**）：
   - **P1**：冻结表 39 行解出；五条词各唯一、主命令都＝`calorie.view.exercise-records`、参数逐字对上（`{"window":"今日"}`／`{"window":"昨日"}`／`{"window":"7d","hasNote":true}`／`{"window":"7d","category":"力量"}`／`{"window":"7d","category":"有氧"}`），
     且与判据件里真跑的那 5 个调用**逐条同参**（非手挑子集）；判据件未混入 `exercise-goal`／「（vs 目标）」那支。
   - **P2**：五份产物剥样式与脚本后，命令键／票号样式／「移植」三类命中各 **0**，可见文本无 `snake_case` 参数名。
   - **P3**：五份产物悬空锚点 **0**（各 4 个锚点、去重 4）；`ilife-page-printable` **恰好 1 处**且由版面根 `<section class="…ilife-block-page-shell ilife-page-printable">` 承载；具名页绑定在位。
   - **P4**：`06-truncated.html` 表标题「…（共 52 条，本页显示 50 条；每页最多 50 条）」、可见行 **50**、页眉「共 52 条，本页显示 50 条」、截断口径句恰好 1 次；未超上限件不出截断句。
   - **P5（本席加打，判据盲区）**：备注含 `<b>…` `&` `"` 时表格未被穿破（`&lt;b&gt;` 已转义、行数仍 1）——**这一项实施席判据没有覆盖**。

## 二、逐条核票面（独立复算，不复用实施席判据函数）

八列逐字逐序 ×5 ✔；三条筛选口径句各出现且只出现一次、互不串（无筛选页 0 次）✔；空态带下一句话（`说「记运动」就能记下第一条`，力量／有氧各指名）✔；来源脚注 `数据来源 · exercise_log…` ✔；`data-fmt` 顺序 `["text","json","csv"]` 逐份固定 ✔；页头三处无命令键／票号 ✔。

**归属**：`git show --name-only 875375d` ＝ 声明三件，无第四件；`git diff 875375d --` 对 `src/exercise/{commands.ts,routes.ts,receipt.ts}`／`src/render/{sportPortDocs.ts,sportDocs.ts}` 读数**空**（零差异；这两个「别族页面」当前的在途改动全来自 #452／#453 别席，与本票提交无关）。

## 三、缺陷段

- **S1：无**（不改判）。
- **S3（本票范围）①**：证据件第五节告警线读数「56/56、台账 25 行、超线 24 件」已成陈化读数——复跑当刻是 **58/58、26 行、25 件**（台账由别席同步、本票件 `records.ts` 303 < 350 不入表）。读数本身可信，缺一句「同刻复跑」的对账。
- **S3（本票范围）②**：证据件写「样例 7 件」，当刻 `.scratch/t451/out/` 为 **11 件**（多出 seed-0/1/2 与 08-empty-blocked 的 0 字节产物）——多出的是复跑新增、口径不变，缺一句计数说明。
- **S3（范围外，注记不判）**：空态在真正交付出口被缺失阻断（exit 4），空页只能装配层构造——同一口径 #423 样板已记（`packages/skill-calorie/test/exercise-receipt-fusion-423.test.mjs:350`），本票不必处理。
- **已裁定口径复核**：① 可见标签直写中文、未调 `shared/fieldLabel.ts`——探针 P2 复核「可见文本无 `snake_case`」，**通过**；② 来源脚注 `exercise_log` 是数据来源名，**通过**。两条都不当缺陷判。
- **器件归类复核**：不接四态头与变更卡载具的声明**有据**——`docs/skills/skill-calorie/t422-融合共用件.md` §七 表第 1 行把 `operationHead` 划给 `#423` 回执族，本族只读页。

## 四、五维分

| 维 | 分 | 依据 |
|---|---|---|
| 票面符合度 | 30／30 | 六条逐条落点齐（八列／截断明示／三口径句／页头人话／构件接线／空态下一句话），无缺条 |
| 机器证据强度 | 24／25 | 8／8＋两类回归 5／5、1／1；两处自设变异先红后绿且源码 sha256 同值；扣 1：证据件告警线读数为陈化同刻值（S3①） |
| 独立对抗性 | 19／20 | 自设两变异均非实施席那两处；新增 P1–P4＋P5 转义盲区；扣 1：P5 属加固项，未发现真实 S1 |
| 文档与证据记录 | 15／15 | 量现场三行、5 条真跑表、变异表、未做项齐（两处陈化读数已在缺陷段逐条记，不重复扣分） |
| 纪律合规 | 9／10 | 提交只含声明三件、还原未用 `checkout --`、判据读 `dist/` 且变异后重编译；扣 1：仓级 `pnpm build` 在窗口内被别席在途件打断，终局绿读数只能靠本票包定向编译取证 |

**均分 97／100，无 S1 → PASS。**
