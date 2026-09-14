# t269 对抗预审报告（静态预审，运行时终验待树绿）

> 审查席独立预审：审提交 `1f88525`（5 件）＋ `25ee756`（1 件）。实施席已挂起，本席未兼任实施。
> 方法：只读检查＋一个免构建新探针（`.scratch/t269-review/probe-dispatch.mjs`，`ALL-PASS-8/8`）。
> 不编译、不测试、不改工作区（除本件与 `.scratch/t269-review/` 外零写入）。

## 判定：PASS（静态预审，运行时终验待树绿）

- 无 S1（无契约违反、无禁区触碰、无证据造假、无数据丢失风险）。
- 五维：契约一致 28／30、证据真实 22／25、新旧对照 18／20、工程红线 13／15、文档同步 9／10，均分 90≥85。
- 本结论只覆盖静态面；`pnpm build` exit 0、13 条落盘、29 条逐 sha256、门禁测试四项必须等绿树后持锁终验（票 #269 保持 OPEN 正确，不得 close）。

## 机器证据

- 审过 sha：`1f88525`（`receipt.ts` 新建 151 加／`write.ts` 6 加 1 减＋证据 3 件＋记账 1 件）、`25ee756`（`t269-gate-runs.md`）。
- 新探针：`node .scratch/t269-review/probe-dispatch.mjs` → `PROBE-RESULT: ALL-PASS-8/8`
 （P1 单出口 `dietReceiptDoc`；P2 零 `../profile` 引用；P3 装配定义唯一在 `shared/docPage.ts:47`；
  P4 饮食键命中饮食分支；P5 档案键仍走档案分支；P6 体重／运动／目标键回退 `res.html`；
  P7 `write.ts` 零 `calorie.*` 字面量；P8 唯一 `??` 链且饮食居中。日志见 `.scratch/t269-review/probe-dispatch.log`）。
- 快照复核（读 `.scratch/t269/after2.json` 原件）：`total=45`，`full=16`（饮食 13＋档案 3），
  `fail=3`（`calorie.exercise.add/remove/update`，皆 `out is not defined`），`42+3=45` 自洽；
  `DIET_FULL=13/13`，`dietMiss=none`。`verify-after2.log` 尾行 `RESULT: 42/45 DIET_FULL=13/13 FAIL=3` 一致。
- 变异／还原：`mut-red-full.log` 含 `TS2552 dietReceiptDocBROKEN`（红成立）；
  `write.ts` 当前 sha256＝`.scratch/t269/write.ts.bak`＝`f9e9d057f0cc7…`（还原一致，本席独立重算确认）。
- 门禁留痕：`t269-gate-runs.md` 10 行 `RUN` 与 `.scratch/locks/gate-runs.log` 一对一对得上
 （含 `t269-verify-after2 exit=1`／`t269-mut-red exit=2`／`t269-mut-green exit=0`；快照脚本 FAIL＞0 时 exit 非零是预期行为，非矛盾）。
- 用词 grep（新增行）：「键」receipt 1＋write 新增行 1＋证据 3（`具名键集`／`其余键`／`非饮食键`／`就地键集查询`），
  其余禁词（写键、补写键、执行层轨、渲染轨、壳、打通、闭环、收敛、沉淀、茎、向导）新增行零命中。
  `write.ts` 旧文件头既有 `写键` 等 5 处是本票前存量，不归本票。
- 票面卫生：`gh issue view 269` → `state=OPEN`；正文 `## 进度：85%` 前为真实换行、无字面 `\n`；
  四证据件无 BOM、无字面 `\n`、LF 无 CRLF。
- 禁区：两笔提交均未碰 `commands.ts`／`routes.ts`／`keys.ts`／生成物（`git show --stat -- <禁区>` 为空）；
  `src/shared/` 两笔零改动；装配定义全仓唯一（`git grep` 仅 `shared/docPage.ts:47` 一处）。

## 路径

- 改动件（本票）：`packages/skill-calorie/src/diet/receipt.ts`（新建，实际 151 行）、
  `packages/skill-calorie/src/cli/write.ts`（分派续接 1 行＋导入 3 行＋注释 2 行）。
- 证据件（本票）：`docs/skills/skill-calorie/t269-receipt-skeleton.md`、`t269-handover-276.md`、
  `t269-gate-runs.md`、`.changeset/t269-diet-receipt.md`。
- 本席件：本报告＋`.scratch/t269-review/probe-dispatch.mjs`（探针）＋`probe-dispatch.log`（输出）。
- 日志件（他人不可复核风险见 D3，随仓外 `.scratch/t269/`：`verify.mjs`、`after2.json`、`mut-*.log`、`build-*.log` 均在忽略清单内）。

## 缺陷清单与下一手

- D1（本票范围，S3）：快照表 sha 转录错一行。`t269-receipt-skeleton.md` 第 46 行
  `calorie.diet.remove-by-range` 的 sha 前缀写成 `af51e4d0e1d5`（与 `update-by-date` 行重复），
  原件 `after2.json` 为 `af3ad404bb25`（字节 60531 无误）。整改：改该格为 `af3ad404bb25`；判据不受影响（`full` 标志位本席已独立复核）。
- D2（本票范围，S3）：行数口径失准。提交信息与证据写 `receipt.ts`“142 行”，实际 LF 口径 151 行
 （`numstat 151`＋本席重算一致）。整改：统一改成 151；告警线结论不变（151＜350）。
- D3（本票范围，S3，可复核性风险）：`.scratch/t269/` 在忽略清单，`after2.json`／`verify.mjs`／各 `.log`
  未入仓；`F9E9D057…` 全值无日志行支撑（本席靠 `write.ts.bak` 重算确认无误，但仓外第三方无法复核）。
  整改：终验时把 `verify.mjs` 与摘要行随终验证据入仓（锁目录导出同 `t269-gate-runs.md` 做法）；本预审如实记录，不脑补为真。
- D4（本票引入，S3）：新增行用词 `键` 4 处（`receipt.ts:29` 具名键集、`write.ts:67` 其余键、
  证据 L24／L60／handover L10）。整改：按下次触碰时顺手改为 `命令`／`命令集`（`具名命令集`／`其余命令`／`非饮食命令`）；
  不单独开票，不阻塞终验。
- D5（范围外发现，S3＋转票措辞，不 FAIL）：工作区现存他席未提交改动
  （`keys.ts`、`routes.generated.ts`、`combos.yaml`、`build-help.mjs` 等，源于 `e6c050e feat(276)` 等），
  与本票两笔提交无关。请编排者转 #276／相关席确认，不归本票处理，本席未碰。
- 下一手缺什么（绿树后持锁终验，#276 提交可构建状态后）：`pnpm build` exit 0；13 条逐条实跑完整文档
  （落盘路径＋字节数）；其余 29 条逐 sha256 不变（真 before 快照届时重跑 `verify.mjs` 即得）；
  全包测试不新增红；补 `GATE-RUN` 对账导出。终验前本票不关闭（当前 OPEN 正确）。
