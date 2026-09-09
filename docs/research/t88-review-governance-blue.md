# #88 治理蓝队审查（协议修订 · 机械门禁 · 具名处置）

> 席：**蓝队（治理席：合规／纪律／门禁）**｜被审：`a8d5c1f`（协议 §2.3／§2.4／§6.1 ＋ `tooling/run-locked.mjs`／`tooling/check-gate-audit.mjs` ＋ 9 条自证测试 ＋ `package.json` 2 条 script）、`ce3e234`（`docs/research/t88-disposition-lock-violation.md`）
> 判据：协议全文（167 行）／A 档简报 `t88-decision-lock-violation.html`／`t88-baseline/BASELINE.md`／上轮 `t88-review-impl-a-blue.md`
> 现场：HEAD `ce3e234`、工作区干净；一切 build／test 经 `run-locked.mjs --ticket 88 -- …`。

## ① 协议修订：纯追加成立，无改写历史、无冲突

- `git diff --numstat a8d5c1f~1 a8d5c1f -- docs/subagent-concurrency-protocol.md` = **+55／-0**，diff 内 **0 行**以 `-` 开头。
- 逐字校验：父版 112 行是子版的**连续前缀 ＋ 连续中段**（插入点仅两处：`:67` 前插 §2.3／§2.4 共 24 行；EOF 追加 §6.1 共 31 行）。父版 §6（`:106-112`）→ 子版 `:130-136`，**7 行逐字相同**；处置 §7「§6 原文一字未改」**成立**。
- 无冲突：§2.3 锁目录 `.scratch/locks`＋锁名 `gate.lock` 与 §2 片段 `D:\ilife\.scratch\locks\gate.lock` **同路径**（`run-locked.mjs:154-155`），无双锁分裂。§2.4-4 与 §6.1 ① 对「裸跑／绕过锁」同判 S1-过程违规。
- **S1-过程违规默认后果仍是 FAIL**：§6.1 ① 表「默认 **FAIL ＋ 按字面作废重做**，唯一例外＝②」；④ 首条重申「默认 FAIL」。未见降级。
- **权力边界写死**：§6.1 ③「比例处置是**编排者的具名行为**；**实施者／审查者无权自行援引**……审查者只能出建议，不能出裁决」。

## ② `package.json` 与门禁

- 父/子逐键比对：scripts 仅多 `gate:run`／`gate:audit`；`dependencies`／`devDependencies`／`version`／`engines`／`packageManager` **全同**。唯一 `-1` 行是 `changeset:status` 行尾补逗号，**语义零变化**。
- 本席持锁复跑四门：`pnpm build`／`pnpm boundaries`／`pnpm snapshot:check`／`pnpm publish:pre` → **0／0／0／0**（`12:47:49–12:47:51Z`，审计日志 `:13-16`）。

## ③ 工具质量 ＋ 自设新探针

- 9 条覆盖**真实**：①获取／释放＋RUN 字段逐项断言＋owner.json 与锁目录清除（`:61-74`）；①b 失败透传；②**真并发**（waiter `waitedMs>0` 落盘、owner.json 指向持锁者，`:86-115`）；②b 死锁抢回＋`LOCK-STOLEN`；③缺参；审计侧 ③缺失 exit≠0＋列缺失＋补齐 exit 0、③b 一条记录不得顶两次声称、③c `--require-claims`、匹配口径单测。**无「只断言文件存在」式自我满足**。
- 独立复跑：`… -- node --test tooling/test/{run-locked,check-gate-audit}.test.mjs` → **tests 9／suites 2／pass 9／fail 0／exit 0**；该次外层 `waitedMs=10008`（另一 session 持锁）——**现场实证并发串行化 ＋ §2.3 落盘**。
- 自设探针 `.scratch/orchestrator/blue4-probe.mjs`（4 条，均不在被审 9 条内）：**P1** 声称无记录 → exit=1 并列缺失；**P2** 见 ④；**P3** `assertSafeToRemove` 守卫：根自身／`docs`／`packages`／`tooling`／仓库外均抛错、临时目录放行——**9 条自证测试完全未覆盖此守卫**，本席证明其有效；**P4** 含双引号命令的机读记录可解析命中。

## ④ 审计对账的鉴别力

- `node tooling/check-gate-audit.mjs --evidence docs/research/t88-disposition-lock-violation.md --ticket 88` → 7 条声称（`:110-116`）**全命中**，`RESULT: matched=7/7`，**exit 0**。
- 反例：伪造证据（3 条声称／1 条记录）→ **exit 1**，stderr 逐条列出 `pnpm boundaries`／`pnpm gate:selftest-never-ran`。**对「无记录」有鉴别力**。
- 但**对「跑了却失败」无鉴别力**（P2）：审计条目全部 `exit=1`（含 `signal=SIGTERM`、时间戳 2020 年）时仍 `matched=3/3 exit 0`——实现只按 `ticket＋cmd` 认领（`check-gate-audit.mjs:123-135`），不看 `exit`／`at`。§2.4-2 字面只要求「找到对应条目」，故属**口径缺口**，非实现 bug。

## ⑤ 提交纪律

- `a8d5c1f`：协议 ＋ `package.json` ＋ 2 个 `tooling/*.mjs` ＋ 2 个 `tooling/test/*.test.mjs`（6 文件 +786/-1）；`ce3e234`：处置正本（1 文件 +151）。**全部落在声明路径内**。
- `packages/**`／`docs/research/t88-baseline/**`／`t88-plan.md`／`t88-impl-a.md` 命中 **0**；白名单 blob `b7a48bbe…` 与 `93e27f9` 逐字相同。
- `git reflog --all` 无 `reset／checkout／clean／stash／rebase`；`git add` 均为显式路径（审计 `:3`／`:11`）；**无 push**（`origin/master` 仍 `90128d8`）。

## ⑥ 并发污染判定

- 治理席四门实测 `12:44:54–12:45:42Z`，**晚于** S4 对 `packages/base-render/src/{controls,style}.ts` 的最后改动（mtime 20:40:36／20:35:14，提交 `e3690df` 20:37:10、`f2d4be0` 20:41:26）；本席此刻在干净工作区独立复跑四门 **0／0／0／0** → **结论未被污染**。
- 计数 1040→1047：`red3-pnpmtest.log`／`blue3-test-1.log`／`.scratch/t88/after-1.log` 均 `tests 1040／suites 129／pass 1015／fail 25`；处置 R1／R2 为 `1047／131／1022／25` → 差值恰为 **+7 tests／+2 suites／+7 pass**，来源是 S4 新测 `help-center-js-88.test.mjs`（7 用例）。**fail 恒为 25**；判据按具名集合：`t101-fail-set.mjs` 对 R1／R2 均输出 `base=34 after=29 新增=0 消失=5`，消失的 5 条＝BASELINE §4 五条抖动项（非修复项）。**计数变化不影响「新增=0」判据**。

## ⑦ 必答：§6.1 ④ 读法

- **读法成立**：A 档＝「不重做 ＋ 三项补偿控制 ＋ 记 S3 不阻断关闭 ＋ 再犯即字面作废」；④ 与之逐条对应，且 §6 字面 0 删改。
- **需要留痕**：票面**已留**（#88 评论 `12:47:02Z`：引条号 §6.1／一次性／不类推／四要件）；地图 **#63 `## Decisions so far` 未追加**（`gh issue view 63` updatedAt `11:23:57Z`、0 评论）。§6.1 ②-1 的文本是「票面 **＋** 地图 Decisions」，#88 评论「#88 关闭时同步」**不构成 §6.1 允许的改期**。

## ⑧ 缺陷与评分

| 编号 | 级别 | 归属 | 内容 |
|---|---|---|---|
| **G-1** | **S2** | 本票引入 | 四要件①（票面＋地图）只落地票面；未补登前该违规仍按 §6 字面 **FAIL＋作废重做**。修法：编排者在 #63 追加一行，或由维护者书面改口径。 |
| G-2 | S3 | 本票引入 | `check-gate-audit` 对「跑了却失败」无鉴别力（P2）。建议加 `--require-exit-zero`。 |
| G-3 | S3 | 本票引入 | `tooling/test/*.test.mjs` 不在 `pnpm test` 的 15 个 glob、也不在 CI；#88 评论给出的「纳入会自死锁」理由被 §8.3 与本席复跑（持锁下 9/9）证伪——真实原因是 glob 不含该目录。 |
| G-4 | S3 | 本票引入 | `run-locked.test.mjs:69` 的 `waitedMs<=50` 是墙钟断言（§8.5 首轮即因此红过），高负载下易 flake。 |

五维：契约一致 **27/30**（纯追加成立；扣 要件①未落地 ＋ §2 与 §2.4 读法并存）｜证据真实可复现 **23/25**（四门 0、7/7、9/9、`新增=0`×2、§8.5 逐字一致；扣审计 exit 盲区）｜parity **20/20**（`packages/**` 零改动）｜工程红线 **14/15**（无危险 git／无 push／守卫有效；扣自证测试未入门禁）｜文档同步 **8/10**（行号指针全对；扣 地图未同步、计数差异未注明来源）。

**均分 92/100 → verdict PASS**（无 S1-交付缺陷；**附 1 条 S2 关闭前置条件**：地图 #63 Decisions 补登；若编排者不补登，则按 §6.1 ② 四要件缺一，本次违规回到 §6 字面 FAIL）。
