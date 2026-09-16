# #588 · 波动页三处天数印条改天口径：判据先行＋体重域回归＋变异两行证据

> 票 [#588](https://github.com/FeatherHunter/ilife/issues/588)（地图 #156 范围外发现）。负责人拍板由本图直接实施，取代票面“只登记不实施”（旧字不动，取代关系以 #588 关票评论为准）。
> 文件名说明：票面点名的 `t588-证据.md` 现为 #591 的有效证据（被 #603 复核引用），不可覆盖、不可改名，故本票证据落本件，特此声明。

## 一、改了什么（三行文案＋一行注释行内改，共 5 行，LF 411 不变）

`packages/skill-calorie/src/weight/volatilityDoc.ts`：301 页脚来源行 `共 N 条`→`共 N 天有记录`；321–322 前提提示 `只有 N 条记录，少于 M 条`→`只有 N 天有记录，少于 M 天`；343 窗口条胶囊 `共 N 条`→`共 N 天有记录`；294 注释行内注明末段恒报量（条数位／天数位，#588）。

为什么改：同一数字 `warnDays`（`volatility.ts:156` 即 `points.length`，按日记即天数）本件 :173 已印 `N/M 天有记录`，三处印 `条` 与件内口径互斥，且与 #460 同形（天数当条数）。314 行 `只有 1 条体重记录` 用的是真实记录数，不动。

## 二、回执四段

**第一行：PASS**（本票三处＋编译全绿；2 条回归红与 3 条门禁红经举证全属范围外，记 S3）。

**第二段：机器证据**（一律 `node tooling/run-locked.mjs --ticket 588 --`）：编译 `tsc -b packages/skill-calorie` exit 0（runId `e6754943`）；三处探针 `.scratch/t588/check3.mjs` 变异红 exit 1（runId `17a3df67`，点名 343 行）→还原绿 exit 0（runId `546a10e2`，哈希 `3FBAD95F…41E6` 与改前一致）；体重域回归 7 件共 106 测／104 绿／2 红（runId `6f25c41d`）；告警线门只读（runId `ff64c5d7`，本件 LF=411 与台账一致）。

**第三段：路径**：改 `packages/skill-calorie/src/weight/volatilityDoc.ts`（5 行）；证据本件；探针与日志 `.scratch/t588/check3.mjs`、`compile.log`、`regress.log`、`mut-red2.log`、`mut-green2.log`、`warn.log`（不入库）。

**第四段：未做项**：①回归 2 红属范围外未修——#514 对齐③红在 `.scratch/t375` 他席产物（无口径行 `<p>`，log.ts 页与本票无关）；#336 首例 `metrics.points>=2` 未用 `today`（种子锚定 07-20，实跑按今日 09-16，30 天窗无点，日期腐烂），本票 diff 纯字面量不可能改动数值口径，转票措辞见下；②门禁 3 红全属他席在途（build-help 744→743、sportDocs 434→466、planEditorRuntime 425→426），未跑 `--sync`；③未推送（总工程师统一收）。转票措辞：“[S3] runId=6f25c41d（#588 回归）#336 首例日期腐烂请归属票钉 `today`；runId=ff64c5d7（#588 门禁）三件陈化请归属票 `--sync` 认领。”

**自曝**：首轮变异用嵌套 pwsh 探针，红绿两行测的是脚手架失败而非断言，已作废（runId `11030a66`、`b0c32b6a` 不得引用），重做的 `check3.mjs` 逐字针式探针才有效。
