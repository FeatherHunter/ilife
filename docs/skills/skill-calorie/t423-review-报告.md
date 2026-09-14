# T423 独立对抗审查报告（运动写后回执页融合版式 · 地图 #156 页面族**先验形状**票）

> 审查席＝独立第三方（非实施者）。被审＝提交 `1aa59e7`（三件／+825／−153）＋补记 `6e1276d`（证据件 1 行），两者都已是 `origin/master` 祖先。
> 票面正本 `gh issue view 423` 与编排者五条补充评论（10:23／10:25／10:57／11:56／12:33）逐条读过；本席按「形状是否立得住、判据是否有鉴别力」审查。
> **不采信实施者任何结论**：本件每条读数都是本席自己跑出来的（探针 `docs/skills/skill-calorie/t423-review-probe.mjs` 与报告同轮入仓）。
> 红线遵守：变异还原只写回本席另存的原字节（`.scratch/t423-review/receipt.ts.baseline`），未用 `git checkout --`／未整目录还原；被审件在变异窗口外只读；`add`／`commit`／`push` 三步都在包装器内。

## 判定：PASS

无 S1／S2；三条 S3 记账（两条本票范围、一条范围外，均不改产品结论）。五维：契约一致 29 ／ 证据真实可复现 25 ／ 新旧对照 20 ／ 工程红线 15 ／ 文档同步 10 ＝ **99/100**。

## 一、机器证据（本席复跑读数，命令一律 `node tooling/run-locked.mjs --ticket 423 -- …`）

| 命令 | runId | exit | 摘要行 |
| --- | --- | --- | --- |
| `pnpm build` | `a710df1d-1f2b-4bf5-a563-4fea73cb6336` | 0 | 全仓编译 ＋ 命令汇总派生 ＋ 各包 client 构建全绿 |
| `node packages/skill-calorie/test/exercise-receipt-fusion-423.test.mjs` | `27e56ee3-bcd1-426c-9b5b-c6a77be247a8` | 0 | `tests 20／pass 20／fail 0` |
| `node --test packages/skill-calorie/test/exercise-receipt-264.test.mjs` | `25523fc0-a538-4aca-8d36-871b4c69da14` | 0 | `tests 13／pass 13／fail 0`（零回归） |
| `node --test packages/skill-calorie/test/doc-page-assert.mjs` | `262fdfef-2053-472c-a8d1-3c9b9b4ef6f4` | 0 | `tests 1／pass 1／fail 0` |
| 探针 `t423-review-probe.mjs`（P1／P2／P3） | `b2ca3804-aa53-43e7-ac2e-9a6d6e528267` | 0 | `PROBE-RESULT PASS fail=0` |

基线读数（本席自测，与证据件同值）：源码 `packages/skill-calorie/src/exercise/receipt.ts` sha256 `502CC8D87EC9CFFE39D991294B397E6DB1196F1B2C713BF5E789D982D46A0555`／348 LF；`dist/exercise/receipt.js` sha256 `9CBB977EB6885E93E3635A9FD9AD76061343D0BE342E969B430A2124A8D5919F`。

### 变异两行（**本席自设，两处都与实施席那两处不同**；每行都是「改坏 → 定向编译 → 判据 → 写回原字节 → 定向编译 → 判据」）

| 行 | 变异 | 改坏后编译 → dist sha256 | 改坏后判据 | 写回原字节 → 编译 | 改回后判据 |
| --- | --- | --- | --- | --- | --- |
| M-A | 无撤销指令也出撤销入口（`undoBlock` 去掉空值提前返回，改成兜底命令） | `a81ab960-07ed-45f0-8d97-c1225b82e07f` exit=0 → `2231CC55…` | `f0fa713a-6c8c-4f7e-a9f8-1667e2678949` exit=1；复跑 `b26d6ee5-6b34-4c8c-97b7-41236adbb165`：`tests 20／pass 3／fail 17`，13 条写词页全红 ＋ 零变更×2 ＋ 空明细 ＋ 撤销两方向，断言「没有撤销指令却出了撤销入口」 | 写回后源码 sha256 `502CC8D8…`（同基线）、mtime 刷新 → `9bf1f78b-c58d-428d-ba46-d49d26314dbe` exit=0 → dist 回 `9CBB977E…` | `23eab7de-f85e-41c3-98dd-8b898f49ef49` exit=0，20/20 |
| M-B | 去掉来源脚注（`sourceCard` 的判空改成恒真） | `6ed6b1c3-66ec-430a-8b4a-e70ae8186259` exit=0 → `2A06EBDE…` | `97261629-3c05-437c-9fd2-7754d42f6c5d` exit=1：`tests 20／pass 5／fail 15`，13 条「缺来源脚注」＋ 两条零变更页「页内导航只有 2 个锚点」 | 写回后源码 sha256 `502CC8D8…`（同基线）、mtime 刷新 → `a52ead52-37bd-4a07-954b-d1c29f46319b` exit=0 → dist 回 `9CBB977E…` | `5b72b1b3-9501-4737-ac9b-f8e835fbf440` exit=0，20/20 |

两行的关键读数：**每次变异后 dist 的 sha256 都变了，写回后又精确回到基线值** ⇒ 判据读的确实是 `dist/`，编译不是空转；写回后源码 sha256 与基线同值 ⇒ 没有把变异留在盘上。

### 证据对账（GATE-RUN runId=…）

实施席证据件 §二／§四／§五里点名的 **14 个 runId 全部在 `.scratch/locks/gate-runs.log`（7056 行）里对得上**，命令与 exit 逐条一致：`b6b05842` 红读数 exit=1、`f7c76d2c`／`961fdbca` 两次 `pnpm build` exit=0、`08c13ab4` 绿读数 exit=0、`a75e0c3d`／`b8a85f4f` exit=0；变异四步序 `6262bc37→9e5c6bea(exit=1)→4de9b5fd→df096889` 与 `e504e66e→adaed559(exit=1)→1e7a72c0→0187c5ad` 时序正确（每次变异前后都有定向编译，无「改了源码不编译」的假读数）。
13 份产物的字节数与证据件 §三 表**逐件同值**（66473／66807／67071／67148／67127／66513／67573／67602／64840／64868／66293／66393／68311），即证据可复现。

### 探针读数（打在实施席脚本的盲区上）

- **P1 冻结表对账**：`src/triggers/scene-04-exercise.ts` 共 39 条唤醒词，写词恰 **13 条**；被审测试 25 次 `runCli` 里 `NN-*` 主跑 17 次，13 条写词**逐条**找到真跑的命令与参数，冻结表 `"<日期>"` 占位按票面约定比真实日期；冻结 13 条之外只剩 `15-no-change` 一次（票面要求的零变更用例）。⇒ 不是手挑子集，也没有自造参数。
- **P2 可见文本**：13 份产物剥掉样式段／脚本段／标记后的**用户可见文本**里，命令名（`calorie.view.`／`calorie.*`）0、工序词「移植」0、票号样式 `t\d{3}` 0。
- **P3 锚点与打印**：13 件悬空锚点 **0**、导航漏卡 **0**（导航项数与卡数逐件相等）、`ilife-page-printable` 由版面根那一个 `section` 承载、样式段五条打印规则 13/13 齐。

## 二、票面八条逐条路径（机器读数）

| 票面条目 | 本席读数 |
| --- | --- |
| ① 四态表驱动 | 13/13 产物含 `ilife-block-op-head-<档>`（`ok` 8 件／`warn` 2 件／`danger` 3 件，与新增／改／删逐一对应）；三张表定义地全仓各 **1 处**＝`src/shared/operationHead.ts` |
| ② 变更卡共用一张 | `ilife-block-change-row` 标记 **345** 处，行内三段（旧／新／箭头位）同属一行类；**旧栏＝新栏＝箭头位计数逐件相等** ⇒ 增删形态箭头位仍占位，行样式只有一套 |
| ③ 四卡判空 | 空卡外壳 **0** 处；零变更 2 例 ＋ 空明细 1 例整卡不出现（判据 3 条钉住）；`12-remove-day`／`13-remove-range` 无 `sec-day` |
| ④ 无撤销指令不出按钮 | 13 件「撤销」命中 **0**；装配层两个方向都有断言（无→不出、有→出且撤销指令原文可复制） |
| ⑤ 来源脚注 | 13/13 命中 `数据来源 · `；`ilife-block-caliber` 共 **26** 处＝13 口径行 ＋ 13 来源脚注 |
| ⑥ 运动口径明细列 | 有明细卡的 5 件列头逐件＝日期／类型／时长／消耗／备注；「克」13 件命中 **0**；食物／碳水／蛋白 0 |
| ⑦ 页内导航 ＋ 可打印 ＋ 口径行 | 导航 13/13、可打印类 52 处且落版面根、口径行 13/13 |
| ⑧ 三格式复制走既有 `copyArea.ts` | `data-fmt` 三项 13/13 且顺序恒为 text／json／csv；`data-fmt` 定义地全仓 **1 处**＝`packages/base-render/src/controls.ts`；`receipt.ts` 未自写 `data-fmt`、引用 `src/shared/copyArea.ts` |

**归属与红线**：`1aa59e7` numstat **恰三件**（证据件 133/0、`receipt.ts` 235/153、测试 457/0），补记 `6e1276d` 只动证据件 1 行。`1aa59e7~1..1aa59e7` 区间对 `packages/base-render`、`exercise/commands.ts`、`exercise/routes.ts`、`render/sportDocs.ts`、`render/sportPortDocs.ts`、`exercise/records.ts`、`shared/receiptParts.ts`、`shared/docPage.ts`、`shared/copyArea.ts`、两张样张的差异**为空**；工作区里 `receipt.ts` 与上述路径无脏改、`packages/base-render` 干净。`receipt.ts` 348 LF，在 350 告警线内（无需改台账）。

## 三、缺陷段

- **D1 · S3 · 本票范围**：判据少盖半条工程话。编排者要求「命令名／票号／工序词三类**各**写成一条断言（产物可见文本命中 0）」，被审测试对 `calorie.view.` 与「移植」是全文断言，**票号只钉了 `<title>` 与眉标两处**。今天 13 份产物页身票号命中 0（本席 P2 读数），所以不是假绿；但后续四张页面族票照抄这套判据形状时，票号／工序词落进页身就会漏检。建议族票把三条都写成全文断言，或直接复用本席 P2 的可见文本取法。
- **D2 · S3 · 本票范围**：可打印绑定走「装配后字符串定点替换」。`withPrintableRoot` 用 `'<section class="ilife-block ilife-block-page-shell">'` 做一次字面替换（命中非 1 次即抛错）。功能上成立（本席 P3 实测五条打印规则齐、类确实由版面根承载），票面也允许「缺构件当场开票」而实施席选择登记遗留；但这是**先验形状票最容易被后四票照抄的一处**，而票面写集本可含 `src/shared/`（给 `docPage.ts` 加一个 `printable?: boolean` 透传位就能删掉这段字符串手术）。建议下一票先补透传位，别让字符串手术成为页面族的默认形状。
- **D3 · S3 · 范围外**：「13 条写词」的真跑不进唤醒词路由。13 次调用都以命令＋参数直调交付出口，唤醒词→命令的接线（`routes.generated.ts`）未受判据覆盖；票面已把接线划给 #266，本席 P1 又逐条对上了冻结表参数，故不构成假读数——只是「13 条唤醒词各跑一次」在判据里实际是「13 组冻结参数各跑一次」。族票沿用同一句式时，值得在证据件里写明这一层。

**五维分**：契约一致 **29**（D1 扣 1：契约要求的三条断言只到两条半）／证据真实可复现 **25**（14 个 runId 与门禁日志逐条对上、13 份产物字节逐件复现、变异四步序含编译与 dist 读数）／新旧对照 **20**（#264 13/13 绿；`本次明细` 8/13、`当日累计` 10/13 两处语义增量在证据件写明，且没有改测试迁就实现）／工程红线 **15**（三件、禁改路径零差异、还原只写回原字节）／文档同步 **10**。合计 **99/100**。
