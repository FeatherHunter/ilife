# #342 收口（b646d6f）独立对抗审查报告（docs/skills/skill-calorie/t342-收口-review-报告.md）

**结论：PASS（87/100，无 S1）**。被审提交 b646d6f；复跑基线＝现树（被审四件与 HEAD 一致，`git log b646d6f..HEAD` 未再碰四件，`git status` 四件干净）。

## 1. 被审内容（只读核验，与 diff 一致）

- `src/home/routes.ts`：删 order 150（看今日运动）/151（看昨日运动）两行；余 10 条（152–158/164–166）仍指旧键，一字未动。
- `src/exercise/routes.ts`：149/159 间插入同 order 两条，指 `calorie.view.exercise-records`（window 今日/昨日）；头注释 33→35 条、12→10 条余量同步。
- `src/triggers/scene-04-exercise.ts`：仅该两词 `main_prompt.cli`/`data_source` 改新键（窗口不变），与路由值逐字一致（本审查探针 C 逐字节比对绿）。
- `test/exercise-records-342.test.mjs`：第 5 条由命令直跑升级为路由断言（两词有 exec 且 key 为新键＋实跑今日/昨日记录页）。

## 2. 持锁复跑机器证据（runId 见 t342-收口-review-导出.md，全部 exit=0）

- `t342-review-build` pnpm build → exit 0；`t342-review-t342` 主测 **pass 5/fail 0**。
- `t342-review-gen` pnpm gen → 键 118（写 46＋读 72）；`t342-review-build2` → exit 0。
- `t342-review-help` help:build → exit 0；`t342-review-gencheck` **GEN-CHECK PASS 键 118**。
- `t342-review-probe3/probe4` 自设探针 → exit 0，11 项全绿（红绿两行见 §3）。
- 附带只读：`exercise-routes-265` 3/3 绿（冻结 7 条守卫无回归）；`routes.generated.ts` 复跑前后 sha256 同为 `047ad63b…`，本次复跑零新增脏。
- 锁纪律：gen 等 ticket 160 活锁 10s、gencheck 等 ticket 269 活锁 40s，均排队未抢回（活进程一律不抢回）。

## 3. 自设新探针（`t342-收口-review-探针.mjs`，只读：走 dist＋真 CLI，不碰实施件）

- 探针 A-绿：今日/昨日路由指新命令；本周仍指旧键、今日（vs 目标）仍指 goal 键（余窗口词不动）。
- 探针 A-红：实跑旧命令 `calorie.view.exercise`＋今日窗口，产物缺「运动记录明细」→ 若改回旧键，第 5 条 `assertRecordsPage` 必红（红线可执行复现）。
- 探针 B-绿：今日页含今日日期且无昨日独有行（户外跑）；昨日页含昨日日期且无今日独有行（步行）——窗口不混淆。
- 探针 C-绿/红：冻结两词 cli/data_source 与路由逐字一致；以旧串比对即 mismatch（少同步 1 条即被 D2④/路由断言咬住）。
- 收窄样例：window=今日 → 仅当日行（含步行，不含卧推）；放宽样例：window=7d → 含三日行。

## 4. GATE-RUN 对账（`.scratch/locks/gate-runs.log` 中 t342-shoukou 共 40 行）

20 START/20 RUN 一一配对，无孤儿。exit 非零仅 `mutred2 exit=1`（变异红，第 5 条红线信息逐字命中旧键，见 `.scratch/t342-收口/mutred2.log`），
其后 `restore-green exit=0`（5/5 还原绿）。另有 `mutred exit=0`（首次变异未咬，证据未将其充作红线，如实记录，未隐藏）。
缺口：`t342-收口-gate-runs.md` 导出缺 build1/gen1/commit/commit2/push 共 5 对（自称逐字导出，S4 扣分项）。

## 5. 五维打分（合计 87/100；S1 缺陷 0 → PASS）

- D1 路由改指与实跑 20/20：删/收/改指/实跑记录页全部复跑证实。
- D2 冻结同步 20/20：两条 cli/data_source 逐字一致；265 守卫 3/3 绿。
- D3 parity/快照 10/20：`t81-exec-smoke.md:153-154` 仍记旧串（快照滞后）；106 场景数手跟未做。证据已自声明“待树干净”（现树他票脏 28+ 件属实），按口径记 S3、不 FAIL。
- D4 测试与自证 17/20：主测 5/5 复跑绿；mutred2 红＋restore 绿精准咬住第 5 条。扣分：首变异绿未作说明；测试头注释变异描述（改标题）与实际红变异（改回旧指）不一致；gate 导出缺 5 对。
- D5 范围纪律 20/20：余窗口词不动；未碰 commands/分派层；生成物未手改（gen:check 绿）；复跑零新增脏。

## 6. 未做项（非 FAIL）

1. parity 三件手跟（help-center-106 场景数、routing-81 登记、t81 快照重跑）：树脏（他票 diet/help 等 28+ 件）故未做，与证据自述一致；其中 106 现树 6/10（红在 `diet_scan_label` 别域脏，非本票）。
2. 首变异（mutred exit=0）所改何物未深挖：禁碰实施件＋属历史过程，不影响本票红线有效性。
3. changeset 未立：本审查零实施改动，立 changeset 会触发空版本 bump，故不立（允许写路径未动用属合规）。

## 7. 路径

- 报告：`docs/skills/skill-calorie/t342-收口-review-报告.md`（本件）
- 探针：`docs/skills/skill-calorie/t342-收口-review-探针.mjs`（草稿同源 `.scratch/t342-收口-review/probe-150-151.mjs`）
- 导出：`docs/skills/skill-calorie/t342-收口-review-导出.md`
- 未 close/comment/edit 票面。
