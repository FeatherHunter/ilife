# #99 蓝队审查报告（G1 SKILL.md 示例可执行门）

> 被审：地图 #63 票 #99，`05cac10`／`2775822`／`c0fb6d2`／`33c166a`（起始 HEAD `a544461`）。环境 `D:\ilife`，node v24.19.0／pnpm 11.8.0。
> 本席全部复跑经持锁包装器（`--ticket 99-blue`）：`2da226aa…`（门禁＋canonical test）／`8ee74666…`（写盘残留面）／`f938db8e…`（自设探针）／`a1997e6a…`（空库复算）。
> **verdict PASS（五维 93；S1 0／S2 0／S3 6）**。

## ① 路径／禁区
四笔共 9 文件，全在声明路径内：`t99-probe-examples.mjs`(119)／`SKILL.md`+`build-help.mjs`(28+63)／`check-examples.mjs`+`package.json`+`ci.yml`(157)／`t99-examples-gate.md`+`t99-gate-runs.log`+`.changeset/t99-*`(232)。`git show --name-only` **零命中** `src/**`／`packages/base-*`／`tooling/**`／`test/**`／`templates/**`／`plugin-*`；`packages/skill-calorie/test/**` 确实未动（实施者自述属实）。

## ② SKILL.md 改动性质
- 生成器重写、非手工：终态 blob `51bcf2cf…`，判据①（`renderSkillMd(text)===text`）独立跑绿。
- 只动示例行：`2775822` 的 28 条 `+/-` **全部**为 `| … |` 表行；`4f4a557e`→`51bcf2cf` 字节对比：AUTO 块**外**前段 5238／后段 1533 字符**逐字相同**，仅 14 行变化、总行数 202 不变（M6 等块外零改动）。
- 事故面：size 27965、前 3 字节 `2d 2d 2d`、201 LF／0 CRLF／无 BOM、`zeroed=false`。

## ③ package.json／CI
`package.json` 仅加 1 行 script(`:20`)；CI 位于 `pnpm build` 之后、`pnpm doctor`／`pnpm test` 之前（`ci.yml:30-32`）——门依赖 `dist/`，位置合理；矩阵 `ubuntu/macos/windows × node 22.13.0/24.x`＝**3 OS 全覆盖**。99 次 spawn **未**进 canonical `pnpm test`（`test` glob 不含 `scripts/`，独立 script）。

## ④ #124 根因切断（重点·独立验证）
| 动作 | 结果 |
|---|---|
| `node -e "import('…/build-help.mjs')"` | exit 0；POST blob **＝** PRE `51bcf2cf…` |
| 四门＋本票门之后 | blob 不变 |
| canonical `pnpm test` 1 轮（32.7 s，exit 1 既有红）后 | blob **不变**（size／前 3 字节／sha256 全同） |

→ 测试期写 `SKILL.md` 这条路径**确已切断**（修前每轮测试重写）。
**残留面（范围外）**：靶向跑 `skill-chef`／`skill-schedule` 的 `skill.test.mjs`（`8ee74666…`，exit 0）后，这两份**受跟踪** `SKILL.md` 的 mtime 前进、sha 不变——二者 `build-help.mjs` 无 `isMain` 守卫且被各自测试导入，**#124 机制仍活**（S3-1）。

## ⑤ 门禁／对账（逐条自跑）
`build=0`／`boundaries=0`／`snapshot:check=0`／`publish:pre=0`／`help:examples:check=0`（`RESULT: 99/99`，13.7 s）／`pnpm test=1`（既有红）。delta `base=34 after=29 新增=0 消失=5`（消失＝基线 5 条抖动项）；白名单 `git diff 93e27f9 -- …test-failset.txt` **0 行**。对账（受跟踪对账源）：`matched=15/15 undeclared=0 PASS`（`--allow-nonzero`，`GATE-RELAX` 见证据 `:185`）；去掉放宽即报 4 条非 0 条目缺失，与证据自述一致。

## ⑥ 提交／tracker
无 `git add -A`／`git add .`（4 次 `git add` 均列明路径）、无危险 git、无 push；`reflog` 无异常；证据 3 份受跟踪；票面 raw 1092 B、无 BOM、17 LF／0 CRLF、无字面 `\n`；旧「进度历史」块保留（仅追加「认领时 0%」）＋`## 进度：90%`；**未提前 close**（OPEN）。认领：timeline `assigned 14:15:42Z` 早于首个写盘（14:16:43Z）与首个 commit（14:18:14Z）→ 与「认领＝第一笔写操作」一致；因全仓同一 GitHub 账号，无法区分自认领／编排者指派。

## ⑦ 并发污染判定
**未污染**。#107 首个 scratch 文件 14:23:17Z、首个锁活动 14:24:02Z、提交 14:30:51Z；#99 canonical 窗口 14:22:01→14:22:33Z，早 44 s。反证：#107 新增的两条测试名（「模板 6 件被 HELP 速查台真正渲染」「入口块自负转义」）在 `.scratch/t99/pnpm-test-1.log` **0 命中**，在我的 canonical 日志**命中且全绿**。`skill-t11.test.mjs` 被 #107 改动不影响本票门（门不导入它）；#107 WIP 在位时我跑门仍 99/99。

## ⑧ 自设探针（被审脚本覆盖不到；隔离副本树 `.scratch/orchestrator/blue10-repo`，跑完 `skillSame/seedSame=true`）
- **P1 判据①有牙**：副本删 1 行示例不重生成 → `STRUCT 产物不新鲜…`＋`示例行数 98 != 99` exit 1（实施者 5 处变异**未覆盖判据①**）。
- **P2 缺种子**：移走 `t81-seed.mjs` → exit 2 `FAIL: 门依赖不可用`（显式失败，非静默绿）。
- **P3 种子被改**：真 harness＋坏示例（`--params '{}'`）exit 1；副本 harness 改恒 exit 0 后**同一坏示例** → `RESULT: 99/99 PASS` ⇒ 判据④无独立 oracle。
- **P4 空库**：副本不灌种子 → 门 exit 1（红 74/99）⇒ 门的绿是**种子条件绿**。
- 空库复算：pre-fix 红 75/99 vs post-fix 红 74/99，唯一变化键 `calorie.view.plan-wizard`（补参后空库亦 exit 0）→ 见 S3-3。

## ⑨ 缺陷清单（S1 0／S2 0／S3 6）
- **S3-1（范围外·转 #124）**：`skill-chef`／`skill-schedule` 的 `SKILL.md` 仍被 `pnpm test` 重写（④ 实证）。
- **S3-2（本票·门设计）**：判据④无独立 oracle（P3）；证据风险 #1 只覆盖「种子漂移→exit 2」，未覆盖「种子被放宽→静默绿」。建议门内钉 `t81-seed.mjs` blob 哈希。
- **S3-3（本票·证据陈旧）**：§9 复跑配方「`--db empty` 期望 24/99」实测 **25/99**（差 1 由本票改动自身造成）。
- **S3-4（本票·记账）**：`NON_EXECUTABLE` 非空时 SKIP 计入 pass（`check-examples.mjs:148` `RESULT:(pass+skipped)/picked`），摘要把跳过行算通过（当前为空 `:38`）。
- **S3-5（本票·契约措辞）**：验收「逐行可执行」＝标准种子库口径；空库 25/99（#100 边界）。建议关票时在票面收窄措辞。
- **S3-6（本票·对账口径）**：窗口 14:17–14:23Z 切在同票一条 RUN（`b4ae6b24…`，14:24:20→14:24:34Z，exit 0）之前；证据 §10 已限定「窗口内」，故不构成 undeclared，但「本票全部运行」仍有窗口外漏项。

## ⑩ 五维与 verdict
契约一致 **28**/30（验收①②达成；口径边界未收窄）｜证据真实可复现 **23**/25（全部主张独立复现；§9 陈旧／窗口漏项）｜parity **19**/20（18 键参数与 `cli-smoke-t41` CASES 抽检逐字一致；与空库判据不互通）｜工程红线 **14**/15（git／锁／留痕干净；#124 残留面属范围外）｜文档同步 **9**/10。
**总分 93，均分 93 ≥85，无 S1 → verdict PASS**（S3×6 记账，S3-1 转 #124）。
