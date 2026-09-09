# #91 蓝队审查报告（独立复核 · blue9）

> 被审：`a245431`（实现）／`a544461`（证据）。复核工作树：HEAD=`a544461`、无已跟踪改动（四门／canonical／复跑窗口 22:16:06–22:18:06）。复核期间他席在飞：红队 `red9`（`14:17:04Z` 持锁，exit 1）、随后 `05cac10`（#99）提交与 `scripts/build-help.mjs` WIP（22:18:14/20，均与本票无关）。
> 依据：协议 §2／§2.3／§2.4／§3／§5.1／§6＋§6.1；`dispatch-rules.md` §4.5／§4.6；`t88-delta-flake-ruling.md` §2／§5／§6／§7／§8；`t88-final.md` §7。

## ① 路径／禁区

- `git show --name-only`：`a245431`＝`cmd_read.ts`＋`test/help-center-91.test.mjs`＋`docs/research/t88-gate-runs.log`；`a544461`＝`t91-{help-center-cli.md,probe.mjs,gate-runs.log,canonical-test.log}`＋`.changeset/t91-help-center-cli.md`。声明路径内 ✔。
- **禁区逐条自查**（`git diff <commit>^ <commit> -- <path>` 全空）：`render/helpCenter.ts`／`keys.ts`／`output.ts`／`render/help.ts`／`triggers/**`／`base-render/**`／`base-combos/**`／`routing.ts`；两既有测试 `git diff a245431^ HEAD -- …` 亦空（**零改动**）。实施者「均未动」属实。
- 唯一越界：`a245431` 连带提交 #88 的 `t88-gate-runs.log`（共享 index，双方证据＋`158ec35` 已如实登记）→ §4.6 **S3**。

## ② envelope 契约 ＋ 接线口径

- 实测（我的新探针＋实施者脚本双证）：恒 `version/skill/shape/key/data`（顺序一致）、**无 `status`**、`shape='list'`；`data`＝`items`(10 分组)/`total`/`sceneTotal 436`/`subgroupTotal 54`/`mode`/`bytes`（`output` 由出口追加；`text` 态另附 `text`）。**全 additive**：`list` 形守卫只要求 `items` 数组、不校验额外键（`cmd_read.ts:212-217`；`base-link-core/src/envelope.ts:55-59`）。
- 消费方无破坏：`plugin-calorie/test/smoke.test.mjs:54-75` 只断言 `env.key`／`data.total>=1`（现 10，仍成立）；`plugin-calorie/src` 无 `help.center` 读取；`tooling/check-publish.mjs:63` 的 `CONTRACT_KEY` 执行该键 → `publish:pre` exit 0。
- `t88-final.md` §7.3 逐条：①显式 `--params mode`＋`q/keyword` 走照片＋互斥 exit 2 ✔；②产物不塞回 envelope、`--output` 落盘、`data` 只回索引＋元信息 ✔；③保持 `list`／**不新增 `delivery`**／`text` 放 `data.text`／`file·inline` 不塞 1MB ✔；④未动 base-render／`src/spec/**`／F3 常量／`analysis/**` ✔。

## ③ 照片 10 键不回归

- 两条既有测试**零改动、原样绿**：我独立跑 `cmd-read-t11`＋`render-copy-90`＋`render-t10`＋`output-naming-87`＝**41/41 pass／fail 0／exit 0**（含 `cmd-read-t11:182-183` 的 `q` 断言）。
- `routing.ts:632`／`combos.yaml`／`keys.ts`／`render/help.ts` **零 diff**；`q` 非空＝现找、`q:""`＝10 键、`keyword` 别名同义（新探针 P1）逐字保留。

## ④ 门禁／对账（全部我自己持锁跑）

| 项 | runId | 实测 |
|---|---|---|
| `pnpm build` | `8c615000…` | **exit 0** |
| `pnpm boundaries` | 同上 | **exit 0**（`boundaries: PASS`） |
| `pnpm snapshot:check` | 同上 | **exit 0**（`OK: 快照 == 实际拉取版`） |
| `pnpm publish:pre` | 同上 | **exit 0**（`check-publish --pre：PASS`） |
| 新测 `help-center-91.test.mjs` | 同上 | 5/5 **exit 0** |
| 靶向 4 文件 | 同上 | 41/41 **exit 0** |
| `t91-probe.mjs` | 同上 | `RESULT: 28/28` **exit 0** |
| canonical `pnpm test` 1 轮 | `1eaa1368…` | tests 1102／suites 131／pass 1076／fail 26，**exit 1**（＝冻结基线既有红） |

- **delta（我复跑 `t101-fail-set.mjs`）**：`base=34 after=30 新增=1 消失=5`。我的轮新增＝`T10 照片 parity…`（`cmd-read-t11.test.mjs:177` `calorie.photo.compare` → `3221225477`，stderr 空）；实施者轮新增＝`#109 命名底座可用…`（`sport-homogeneity-109.test.mjs:282` `calorie.view.exercise`，同签名）。
- **B 类守卫逐条事实（只核事实、不主张豁免）**：①签名＝NTSTATUS 进程级终止＋stderr 无断言差异 ✔；②两文件均不在本票所有权内，且崩溃对象**非**本票改动分支（本票改动面＝`case 'calorie.help.center'`＋helper；`photo.compare`／`view.exercise` 不经该分支）✔；③基线两轮均 ✔（`09b:956`／`09c:954`；`09b:745`／`09c:743`）✔；④各仅 1 轮，不存在连续 ≥3 轮 ✔；⑤我独立「干净重建（`pnpm build` exit 0）＋单独复跑 2× 全绿」：`#109` 12/12×2（`ffd26768…`）、`T10` 5/5×2（`64ae52fa…`）✔。→ **真 delta 是否 0 由编排者按 §5／§6／§8 裁**。
- 白名单：`git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt`＝**0 行** ✔。
- `check-gate-audit`（我复跑，`--log t91-gate-runs.log --ticket 91 --since …14:09:30Z --until …14:13:00Z --allow-undeclared --allow-nonzero`）→ `matched=18/18 undeclared=7` **PASS exit 0**；两条 `GATE-RELAX`（`:161`／`:163`）留痕 ✔，7 条未声明条目全为 exit=1 的过程运行（红跑／变异红／commit 形态失败），不充门禁证据 ✔。

## ⑤ 提交／tracker

无 `git add -A`（两提交仅 3／5 文件，含他席已 `git add` 的 #88 文件）；reflog 无 `stash/reset/checkout/clean/switch`（#91 条目仅 commit）；**无 push**（`## master...origin/master [ahead 15]`）。变异还原 sha256 我独立复算＝`893D34EB…90469`（与证据逐字相同），`MUT-91` 残留扫描 0。票面 `#91`：**OPEN**、assignee `FeatherHunter`、真实换行／无 BOM／无字面 `\n`、**旧进度块保留**为「进度历史（v1 · 0%）」、未提前 close；认领自述为第一笔写操作。证据全部受跟踪 ✔。

## ⑥ 交接项登记核查

`routing.ts:632` 唤醒词入口／`keys.ts:87` title 改名（须同步 `combos.yaml`）／`SKILL.md:184` 口径——**票面「交接①②③」、证据 §7-1/2/3、changeset「未含」三处均明确登记为「非本票路径、需另票或授权」**，非悄悄忽略 ✔。**须提示编排者**：地图验收②「`卡路里HELP` 打开完整速查台」在本票**未达成**（用户可见入口仍指照片现找），另票方可闭环。

## ⑦ 新探针（`.scratch/orchestrator/blue9-probe.mjs`，15/15 exit 0；均不在被审两脚本覆盖内）

P1 `keyword` 别名；P2 `q:""`＋`mode` 同给（事实：mode 胜出、`q:""` 被静默忽略、exit 0）；P3 `mode` 大小写／空白敏感（`FILE`／`" text"`→exit 2）；P4 未知 `--params` 键静默忽略（exit 0）；P5 落盘失败（ENOTDIR）→**exit 5 且 stdout 0 B**；P6 `--output` 覆盖＋mode（819,941 B＝`data.bytes`）；P7 同一 `sceneData` 跨三态渲染后回渲 file 逐字相同、不改写入参（单测每次 dispatch 新建对象→覆盖不到）；P8 `subgroupCount` 求和＝`subgroupTotal` 54；P9 三态 `bytes`＝落盘 size、`data.text` 仅 text 态、436 id 同序。

## ⑧ 缺陷清单

- **B-1 S3（本票范围）**：`q:""`＋`mode` 组合语义未定义（静默择 `mode`）；票面只声明「非空 q 互斥」，D6 未被违反（`mode` 显式）。建议文档化或改 exit 2。
- **B-2 S3（本票范围，已登记）**：共享 index 连带提交 `t88-gate-runs.log`。
- **B-3 S3（范围外／环境）**：两轮 canonical 各 1 条进程级崩溃（事实形态合规，裁定权在编排者）。
- **B-4 S3（交接）**：唤醒词入口未接线 → 地图验收②未达成（已登记）。
- **B-5 S3（未确证）**：`gate:selftest`／`changeset:status` 未跑（已登记）。
- **B-6 S3（文档）**：`SKILL.md:184` 口径过时（已登记）。
- **无 S1-交付缺陷、无 S1-过程违规。**

## ⑨ 五维 ＋ verdict

契约一致 **28**／30（B-1）｜证据真实可复现 **24**／25（`gate:selftest` 未跑）｜parity **19**／20｜工程红线 **14**／15（B-2）｜文档同步 **8**／10（`SKILL.md`）→ **均分 93**。

**verdict：PASS**（无 S1；均分 ≥85）。**附条件**：若编排者把两轮 canonical 的新增裁为真 delta，则本票**不得关闭**（B-3）。

## ⑩ 我的运行留痕（`GATE-RUN`，可对账）

```text
RUN ticket=91 runId=8c615000-05fe-4828-b523-80a4f0de6f28 cmd="powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/orchestrator/blue9-gates.ps1" waitedMs=0 exit=0 at=2026-09-09T14:16:17.258Z
RUN ticket=91 runId=1eaa1368-97af-4e8d-b232-f4e7cf1d77cd cmd="powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/orchestrator/blue9-canonical.ps1" waitedMs=0 exit=0 at=2026-09-09T14:17:00.020Z
RUN ticket=91 runId=64ae52fa-d98a-497c-bd5d-f8e6839c8300 cmd="powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/orchestrator/blue9-rerun.ps1" waitedMs=10004 exit=0 at=2026-09-09T14:17:51.106Z
RUN ticket=91 runId=ffd26768-4bad-4104-9f90-252ad0f8bc6f cmd="powershell -NoProfile -ExecutionPolicy Bypass -File .scratch/orchestrator/blue9-rerun109.ps1" waitedMs=0 exit=0 at=2026-09-09T14:18:06.043Z
```

GATE-RUN runId=8c615000-05fe-4828-b523-80a4f0de6f28 cmd="四门＋新测＋靶向＋t91-probe"
GATE-RUN runId=1eaa1368-97af-4e8d-b232-f4e7cf1d77cd cmd="pnpm test（canonical 1 轮）"
GATE-RUN runId=64ae52fa-d98a-497c-bd5d-f8e6839c8300 cmd="pnpm build ＋ cmd-read-t11 ×2 ＋ help-center-91 ＋ blue9-probe"
GATE-RUN runId=ffd26768-4bad-4104-9f90-252ad0f8bc6f cmd="pnpm build ＋ sport-homogeneity-109 ×2"

GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 因冻结基线既有红必然 exit=1（判据＝失败集新增，非 exit 码），与实施者／BASELINE §5 同口径
GATE-RELAX flag=--allow-undeclared reason=复跑实施者对账时沿用其窗口内 7 条 exit=1 过程运行（红跑／变异红／commit 形态失败），按 §2.4-4 不得充门禁证据

> 本报告为蓝队席唯一提交物（`docs/research/t91-review-blue.md`）；探针／日志留 `.scratch/orchestrator/blue9-*`（gitignored）。**verdict 为初审，关闭以合并点安静态复核为准。**
