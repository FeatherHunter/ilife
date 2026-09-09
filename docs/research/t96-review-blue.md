# #96 蓝队审查报告（wayfinder #63 · 其余 5 技能不回归门）

- 被审：`a87df7b`／`8727d9d`／`a29f803`（不 push）。审查席：蓝队（独立复跑，不采信实施者结论）。
- 结论：**verdict PASS**（无 S1；S2×1＋S3×5；五维 **86**≥85）。S2 须关闭前修完或由编排者具名改期。

## ① 路径／禁区（含变异期临时动作）

- `git show --stat` 三笔：`a87df7b`（6 文件，+1686/−1）＝`tooling/skill-html-snapshot.mjs`／`tooling/skill-html.snapshot.json`／`tooling/test/skill-html-snapshot.test.mjs`／`tooling/check-boundaries.mjs`／`.github/workflows/ci.yml`／`package.json`；`8727d9d`（3 文件）；`a29f803`（4 文件，全 `docs/research/t96-*`）。**全部落在声明路径内**；`packages/base-render/**`／`packages/skill-calorie/**`／`packages/skill-{bill,chef,home,schedule,memo-ilife}/**`／`packages/plugin-*` **零命中**。
- 变异期临时改动（T1/T2/B1/B2 命中 `skill-bill`，T3 命中 `skill-home`，均在本票所有权之外）：`git log --stat a87df7b~2..HEAD -- packages/…` **空**；`git status --short -- packages/` 无残留；5 个目标当前 `sha256(16)` 与证据还原值**逐字相同**（`159298b2a5876b5e`／`909a288b1af0f90d`／`b95a95263894303f`／`c98cb457df437dd7`／`ac6b472965ff2120`）。脚本侧合规：`owner.runId` 锁内自证、锚点恰 1 次、逐字节回写＋sha 双证、`finally` 兜底还原、前后 `porcelain` 校验、路径守卫。**判定：协议 §5 的临时动作，合规、零残留，非违规**；副作用见 D-2（还原写回更新 mtime）。

## ② CI 与门禁口径

- `ci.yml:37` `pnpm snapshot:html:check` ＝ `package.json:18` **同一条命令** ✓；`ci.yml:39` `pnpm gate:selftest:html` ＝ `package.json:29` ✓。`package.json` 仅加 script（+5/−1，−1 为前一行补逗号）；`check-boundaries.mjs` **+29/−0**（原 7 条一字未动，实跑 13 条 OK）。
- 新增负担：快照 114,273 B／1147 行（受跟踪），185 件 sha256；实测门 1.3 s、自证 0.2 s，CI 6 个矩阵格 ≈ +10 s。**可接受**。
- 缺陷：`gate:selftest:html` 自身即包装器调用 → 再经 §2.4.1 包装器执行**死锁**（D-1）。
- 探针源：`.scratch/orchestrator/blue8-*.mjs`（gitignored；按派单本席只入仓报告，如需入仓请编排者裁定）。

## ③ `--allow-nonzero` 口径

- 留痕**完备**：`t96-gate.md:195` `GATE-RELAX flag=--allow-nonzero reason=…`（引基线 exit 1、判据为失败集新增 0）；窗口 `--since/--until` 齐；导出源 `docs/research/t96-gate-runs.log` 受跟踪（12 条）。我按 §6 原样命令对**导出源**与**活日志**各跑一次 → 均 `matched=12/12 scoped=12 undeclared=0` exit 0。
- 待修项 `--expect-exit 1 --reason`：全仓 grep **0 命中**（未实现、未引用）→ 本票是**绕开使用**（沿用旧钝开关），非新口径。探针 F 实证其后果：合成条目 `exit=3221225477` ＋ `GATE-RELAX` → `--allow-nonzero` 下 **PASS**（无法区分「预期 exit 1」与「进程崩溃」）→ D-4。

## ④ 门禁实测（全部经 `run-locked --ticket 96-review-blue`，我方 runId 见文末）

| 命令 | exit | 关键行 |
|---|---|---|
| `pnpm build` | 0 | 51.4 s |
| `pnpm boundaries` | 0 | 13 条 OK／`boundaries: PASS` |
| `pnpm snapshot:check` | 0 | 快照 == 实际 |
| `pnpm publish:pre` | 0 | PASS |
| `pnpm snapshot:html:check` | 0 | `artifacts=185 changed=0 added=0 removed=0`，指纹 `fd6299e2…`，**WARN×2** |
| `node --test tooling/test/skill-html-snapshot.test.mjs` | 0 | `tests 9 pass 9 fail 0` |
| `pnpm test`（canonical，1 轮） | 1 | `tests 1095 suites 131 pass 1070 fail 25` |
| `t101-fail-set` | 0 | `base=34 after=29 新增=0 消失=5`（即基线 5 条抖动项） |
| 白名单 `git diff --numstat` | — | **0 行** |

事故 #124 自检：跑完 `git status --short` **无** `SKILL.md` 改动。

## ⑤ 提交／tracker 纪律

无 `git add -A`／`git add .`（`.scratch/t96/git-add-*.log` 均为显式路径）；`git commit --only … -F`；危险 git 检测 0 命中；reflog 仅 commit；**未 push**（`origin/master`＝`8727d9d`，远端由编排者收口，非本席行为）。#96 票面 **OPEN**（未提前 close）、25 行**真实换行**、无 BOM、无字面 `\n`；认领事件 `assigned` 13:47:48Z 早于首笔提交 13:50:48Z，与「第一笔写操作」一致（**票面 body 编辑无 API 事件，不可证**，同 #88 蓝队口径）。证据 4 件全部受跟踪。

## ⑥ 跨票影响（关键）

风险 1 表述**方向正确但不完整**。核：迁移任一技能后确实会红，但触发面为 **5 处**，且 #96 的两份证据脚本会被冻结成假红。派单须写明：

1. **同一 commit** 跑 `pnpm snapshot:html` 并附 185 件差异摘要（**6 件 `textOmitted` 必须附 `--show <id>` 全文**，见 D-3）；
2. `check-boundaries.mjs:35-40` 该技能的零依赖断言须**改为正向断言**（含 base-paint），不得只删；`:41-56` import 断言同步（注意：`devDependencies` 也计入，测试期依赖同样触发）；
3. `skill-html-snapshot.mjs:55` `MARKER_ALLOW` 只加该技能该 id 的条目，或改成「必须出现」断言——**注意 `ilife-` 标记不出现≠迁移未发生**，须以依赖断言为准；
4. 同步更新 `docs/research/t96-base-impact.mjs`（FIVE／正对照冻结了迁移前态）与 `t96-mutation-evidence.mjs`（锚点字符串失效）；
5. 门的采集面假定 5 技能导出 `*_KEY_SHAPES`／`renderEnvelopeHtml`／`escapeHtml`／`loadTemplate`／`fillTemplate` 等；迁移若改导出名，门会以裸栈报错（exit 1 但定位差）→ 迁移票须同步改采集器。

建议：把上述 5 条作为**任何触碰 `packages/skill-{bill,chef,home,schedule,memo-ilife}/**` 的票**的派单模板（含「#96 门被判红属预期，须审快照 diff」）。

## ⑦ 自设新探针（被审脚本覆盖不到；脚本 `.scratch/orchestrator/blue8-*.mjs`）

- **A** 缺 dist：shim root 无 `packages/` → `exit 1`，`FAIL: dist 缺失：packages/base-link-core/dist/index.js —— 请先 pnpm build`（**显式失败，不静默**）。
- **B** 缺快照文件（junction 接 `packages`、删 snapshot）→ `exit 1`（ENOENT 栈；提示可读性见 D-6），**不静默通过**。
- **D** 缺 dist 跑 CI 的自证测试 → `exit 1`，`fail>0`（**非 skip**）。
- **C** `textOmitted` 手改不可检出：同步改 `sha256`＋`bytes` → `changed=0 staleText=0`；`artifactCount=1` 亦不被 CLI 校验 → **D-3**。
- **E** 影子树（**不动真实受跟踪文件**）：基线绿 → **只改 src 内容不重建 → 门仍绿**（假绿窗口 CONFIRMED）→ 改 `dist/render/html.js` 错误码 → 红（`changed=1`）→ 还原绿 → **D-2**。
- **F** 合成对账源：`exit=3221225477` 在 `--allow-nonzero` 下 PASS → **D-4**。

## ⑧ 缺陷清单

| # | 级 | 归属 | 内容 |
|---|---|---|---|
| D-1 | **S2** | 本票范围 | `gate:selftest:html`（`package.json:29`）与协议 §2.4.1 冲突：再经包装器即**死锁**（外层持锁等子进程、内层等同一把锁、双方无超时）。实测：外层 `7b674cba` 13:56:59 持锁起、内层持续 `WAIT-OWNER-ALIVE`，直至本席取消（≈67 s；其间他席同票运行 `6efa1876` 已先等 100068 ms）。CI 命令因此**无法按协议本地同口径复跑**（实施者用内层命令，未声明该偏离）。修法：加 `--lock-dir .scratch/locks-selftest` 或 script 直跑 `node --test`；`gate:selftest`（#88 同类）建议一并修。 |
| D-2 | S3 | 本票范围 | 假绿窗口：门只读 dist、`staleness()` 只 WARN 不 exit≠0（探针 E 实证）。且真实仓库的声明运行本身带 2 条 WARN（成因＝变异还原写回使 mtime 变新，证据未注记）。建议 staleness 升为 exit≠0（CI 中 dist 恒新、无副作用）。 |
| D-3 | S3 | 本票范围 | 6 件 `textOmitted`（memo 模板）快照更新**不可从 git diff 审阅**（探针 C）；建议迁移/重写快照时附 `--show` 全文，或另存可审摘要。 |
| D-4 | S3 | 范围外（待修项） | `--allow-nonzero` 无鉴别力（探针 F）；`--expect-exit 1 --reason` 未实现。本票留痕完备故不判缺陷；建议转票并要求此后非零声明附「exit 值＋失败集判据」。 |
| D-5 | S3 | 本票范围 | 风险 1 表述不完整（见 ⑥ 的 5 条）。 |
| D-6 | S3 | 本票范围 | 缺快照文件时仅裸 ENOENT 栈，缺「请先 `pnpm snapshot:html`」指引。 |

## ⑨ 五维＋verdict

契约一致 **26**／30（验收①②满足、只加不放宽；扣 D-1）｜证据真实可复现 **23**／25（四门＋新门＋对账＋delta 独立复现，变异还原 sha 逐字核验；扣 WARN 成因未注记、本地命令偏离未声明）｜parity **17**／20（185 件／63 key／59 模板／7 形状／空态／转义／必抛＋正对照 calorie；扣 D-3）｜工程红线 **12**／15（无危险 git／无 push／零残留；扣 D-1 阻塞共享锁）｜文档同步 **8**／10（扣 D-1／D-2 未记载）。**合计 86／100，均分 86 ≥85，无 S1 → verdict PASS**（S2 须修完方可关闭；本席不自行关票）。

## 附：本报告声称的运行（协议 §2.4.2）

GATE-RUN runId=757158c5-6ef3-41c6-a0b8-ef1b4a464258 cmd="pnpm build"
GATE-RUN runId=1f3464e1-67e5-4b80-b623-c2abea7f64be cmd="pnpm boundaries"
GATE-RUN runId=c12da669-907c-41e6-aa57-2a6d0e3d021b cmd="pnpm snapshot:check"
GATE-RUN runId=69beed39-3522-476a-b659-7c67c47d564d cmd="pnpm publish:pre"
GATE-RUN runId=06d35b52-fe0d-4ad0-be37-6e3916969880 cmd="pnpm snapshot:html:check"
GATE-RUN runId=f2315af4-710b-46c3-9aea-33144dd63984 cmd="node --test tooling/test/skill-html-snapshot.test.mjs"
GATE-RUN runId=ffed4dc5-caca-4b1c-b94f-e5172600e7a0 cmd="pnpm test"
GATE-RUN runId=942e8189-5f74-4af4-b890-252da8354e3b cmd="node .scratch/orchestrator/blue8-probes.mjs"
GATE-RUN runId=71425df0-d8c2-4dde-86fb-3a4016a24860 cmd="node .scratch/orchestrator/blue8-probe-stale.mjs"
GATE-RUN runId=8ec4a063-4131-4c0c-8eac-55f91e2544d1 cmd="node .scratch/orchestrator/blue8-diag5.mjs"
GATE-RUN runId=125628df-2516-4b56-99ba-a738d31e3699 cmd="node .scratch/orchestrator/blue8-probes.mjs"
GATE-RUN runId=50a0be36-8c39-4f5d-a686-d695325e68be cmd="node .scratch/orchestrator/blue8-probe-stale.mjs"
GATE-RUN runId=744590fd-4395-464c-8390-a0e1591bcfbd cmd="node .scratch/orchestrator/blue8-probe-stale.mjs"

注（exit≠0 的四笔，按实登记）：`942e8189`＝探针脚本自身 `*/` 注释 bug 首轮；`71425df0`＝他席重建期撕裂拷贝致影子树基线非绿（探针自判结论不可用，已加重拷重试）；`50a0be36`＝E2 正向对照选错 dist 文件未红；`ffed4dc5`＝canonical `pnpm test` 基线红。`125628df`／`744590fd` 为定稿轮（exit=0）。

GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 基线即 exit 1（`BASELINE.md` §4：991 pass／26 fail），本席判据为失败集新增 0；另探针首轮三笔（`942e8189`／`71425df0`／`50a0be36`）为本席探针自身缺陷与撕裂拷贝，按实记 exit≠0。g06 死锁事件：外层 `runId=7b674cba…` 被本席主动取消（未写 RUN 行），锁由内层孤儿进程正常接管并释放（`gate-runs.log` 可见 `282b3f99… exit=0`），无残留锁。

对账命令（本席自证）：`node tooling/check-gate-audit.mjs --evidence docs/research/t96-review-blue.md --ticket 96-review-blue --since 2026-09-09T13:56:00.000Z --until 2026-09-09T14:01:30.000Z --allow-nonzero` → `matched=13/13 undeclared=0`（本报告的入仓 commit 按构造在窗口外）。
