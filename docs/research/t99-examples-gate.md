# #99 G1 SKILL.md 示例可执行门 · 证据（可复跑）

> 票：wayfinder 地图 #63 / 票 #99《G1 SKILL.md 示例可执行门》（**解锁 #82**）
> 结论：**验收①②均达成** —— ① 99 行示例逐行可执行（生成期门 `pnpm help:examples:check` 断言，实测 `RESULT: 99/99`）；② 门已接入 CI（`.github/workflows/ci.yml` `build-test` 作业，矩阵 ubuntu/macos/windows × node 22.13/24）。
> 环境：`D:\ilife`，分支 `master`，起始 HEAD `a544461`；node v24.19.0／pnpm 11.8.0。
> 事故纪律：`packages/skill-calorie/SKILL.md` 是事故 #124 现场（进程被杀即等长零填充）。本票**每次写它前后**都记 `size`／前 3 字节／`git hash-object`，见 §7。

## 1. 产物（全部受 git 跟踪）

| 文件 | 作用 |
|---|---|
| `packages/skill-calorie/scripts/build-help.mjs` | 生成器：补 18 个 case（`:138-157`）＋ `default` 改抛错（`:201-203`）＋ `renderSkillMd()`／`isMain` 守卫（`:222-244`） |
| `packages/skill-calorie/SKILL.md` | AUTO 块由生成器重写（99 行示例） |
| `packages/skill-calorie/scripts/check-examples.mjs` | **生成期门**：逐行 spawn 断言 exit 0 |
| `package.json:20` | 新增 script `help:examples:check` |
| `.github/workflows/ci.yml:30-32` | `pnpm build` 之后 `pnpm help:examples:check` |
| `docs/research/t99-probe-examples.mjs` | 只读探针（现状实测，`RESULT: n/m`） |

## 2. 现状实测（修前）

探针：`node docs/research/t99-probe-examples.mjs [--db seed|empty]`（只读；不写 SKILL.md）。

| 口径 | 结果 | 说明 |
|---|---|---|
| 标准种子库（`--db seed`，与 #81「exec ⟺ exit 0」同一份种子 `docs/research/t81-seed.mjs`） | **96/99** | 红 3 行 |
| 空库（`--db empty`，用户「照抄进空环境」的裸基线） | **24/99** | 75 行 exit 4 = **缺失阻断口径**（#100 既定行为，非本票缺陷） |

修前 3 行红（签名逐字）：

```
RED  exit=2  calorie.view.anomaly        stderr="ERR 2: 缺参数 kind"
RED  exit=2  calorie.view.plan-wizard    stderr="ERR 2: 缺参数 plan（PlanInput 对象）"
RED  exit=2  calorie.view.weight-compare stderr="ERR 2: 缺参数 start"
```

**票面前提订正（如实登记）**：票面写「5/77 行示例照抄即失败（…；goal-predict／predict exit 4）」。本次实测：示例行数已是 **99**（#111 +6／#112 +4／#113 +8 追加后），且在**标准种子库**下 `goal-predict`／`predict` 的示例（无 `--params`）恰好 exit 0 —— 它们的红只在**数据不足**的种子下出现（票面所用种子）。本票仍把这两个键补上显式 `--params`（与 #41 同参），故两种种子下都稳。

### 2.1 18 个缺 case 定位（可复算）

```
combos=99  exampleFor 显式 case=81  missing=18
```

18 个键与 `packages/skill-calorie/test/cli-smoke-t41.test.mjs:75-94` 的 `CASES` **逐字一致**（即 #41 的 18 个新读键）：`view.weight`／`weight-history`／`weight-compare`／`weight-review`／`volatility`／`body-composition`／`body-measure`／`plan`／`plan-wizard`／`exercise-goal`／`goal-expiring`／`goal-predict`／`goal-vs-actual`／`predict`／`anomaly`／`contraindication`／`dedupe`／`profile`。

## 3. 修法

1. **补 18 个 case**（`build-help.mjs:138-157`）：参数逐字取自 `cli-smoke-t41.test.mjs` 的 `CASES`（同一验收口径，不另造参数）。`plan-wizard` 的 `plan` 取该测试的 `WIZARD_PLAN` 全量 JSON。
2. **`default` 由「返回无参命令」改为抛错**（`:201-203`）：旧写法会把「漏补示例的新键」静默渲染成 `calorie-cmd-read <key>`（无 `--params`）——照抄即 exit 2／4，而 SKILL.md 表面看不出来。现在生成器立即失败并点名键。该断言在 canonical `pnpm test` 中被 `skill-t11`（导入 `buildHelpBlock`）实际触发。
3. **去掉 import 写盘副作用**（`:222-244`，照 `packages/base-combos/scripts/build-help.mjs:98-102` 同形）：写盘移入 `runMain()` 并加 `isMain` 守卫。理由两条：
   - 原实现被 import 即重写受跟踪的 `SKILL.md`——`pnpm test`（`skill-t11` 导入本模块）会在测试进程里写它，进程被杀即等长零填充（事故 #124 的机制）；
   - 原实现让 `skill-t11` 的「互联区新鲜」断言**恒真**（导入先自己重写、再自己比对），该断言当时无鉴别力。守卫后它恢复鉴别力（见 §6 M1a）。

修后实测：`RESULT: 99/99`（探针，标准种子库）；门 `RESULT: 99/99`（12.5 s）。

## 4. 门设计（`packages/skill-calorie/scripts/check-examples.mjs`）

四条判据，缺一即 `FAIL`（exit 1）：

| # | 判据 | 为什么需要 |
|---|---|---|
| ① | AUTO 块存在且 `renderSkillMd(text) === text`（产物新鲜） | 防「改生成器不重生成」，门必须验**文件本体** |
| ② | 示例行数 == `CALORIE_COMBOS` 键数，且**每键恰好一行** | 防「删示例／漏行」换绿 |
| ③ | 每行 `--params` 可 `JSON.parse` | 防「恰好 exit 0 的拼错 JSON」 |
| ④ | 逐行 spawn 真 CLI（`dist/cli/cmd_read.js`）→ `exit 0` **且 envelope `key` == 该行 key** | 票面验收本体；`key` 相等防「示例打错键但照样 exit 0」 |

- **种子库**：`docs/research/t81-seed.mjs`（#81 的「单一定义」）——每次运行在系统 tmp 复制一份种子库副本，写键互不干扰；占位符（`<照片路径>`）按该文件登记的替换值换成 tmp 下真实文件后再 spawn；未登记替换值的占位符即红（不静默跳过）。
- **白名单**：`NON_EXECUTABLE`（`check-examples.mjs:38`）**当前为空**。语义上不可执行的行才允许登记，且必须逐条写理由；**禁止**删示例／放宽断言换绿。
- **接入点**：`package.json:20` → `help:examples:check`；CI `build-test` 在 `pnpm build`（dist 就绪）之后、`pnpm doctor` 之前（`.github/workflows/ci.yml:30-32`）。
- **不进 canonical `pnpm test`**：99 次 spawn ≈ 12 s，与协议 §2.4.6 的「自证测试单独触发」同思路（也避免测试进程反复起 CLI 的抖动）。

## 5. 门禁实测（持锁，逐条 exit）

**四门 ＋ 本票新门**（一次持锁区内顺序执行，`node .scratch/t99/run-gates.mjs`；逐门日志 `.scratch/t99/gate-*.log`）：

| 门 | exit | 关键行 |
|---|---|---|
| `pnpm build` | **0** | `tsc -b` 无 error |
| `pnpm boundaries` | **0** | `boundaries: PASS` |
| `pnpm snapshot:check` | **0** | `OK: 快照 == 实际拉取版（0.1.0@932e7b250d278d50）` |
| `pnpm publish:pre` | **0** | `check-publish --pre：PASS` |
| `pnpm help:examples:check` | **0** | `RESULT: 99/99` |

> 五门在**同一个持锁区**内顺序跑（协议 §2「持锁区尽量短，把要跑的命令一次写完」），故审计日志里对应**一条** RUN 条目（`runId=8a85d5a1-5fab-4272-a148-ebf737a7366e`），逐门 exit 见上表与 `.scratch/t99/gates-all.log` 的 `MARK_*` 行。

**canonical `pnpm test`（1 轮，`runId=d5b272e8-4a3a-49ba-b4f7-b77e58c5aa27`，exit 1＝既有红基线）**：

| 指标 | 本轮 | 基线（`t88-baseline`） |
|---|---|---|
| tests／suites／pass／fail | 1102／131／1077／**25** | 1017／129／991／26 |

delta 判定（口径冻结于 `docs/research/t88-baseline/BASELINE.md:110-111`）：

```
node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t99/pnpm-test-1.log
base=34 after=29 新增=0 消失=5
```

- **新增 = 0** → 达成（判据是具名测试名集合，不以 exit 码为准）。
- 消失 5 条即基线 §4 的五条**抖动项**（`#41 M3 真 CLI 串行冒烟`／`#76 无宿主可执行证据`／`#80 HELP 生成与键名一致性`／`helpers JS ≤820px`／`③ check-combos 全绿`），本轮恰全部通过 → 属抖动，不改变结论。
- **白名单 diff 0 行**：本票未触碰 `docs/research/t88-baseline/test-failset.txt`。
- **并发上下文**：本轮前后（14:18–14:23Z）锁内另有 **#91 session** 在跑（`gate-runs.log`：`ticket=91` 的 `pnpm test`／`pnpm build`／`node --test` 等 12 条），**无浏览器实证**同跑。本票 delta 无新增，未触发 `t88-delta-flake-ruling.md` §2／§5／§6／§7／§8 的任一分类需求（分类表备用：若出现新增才需逐条按 A/B/C 分类）。
- **`pnpm test` 不再写 SKILL.md**：本轮跑完 `SKILL.md` 的 `git hash-object` 仍为 `51bcf2cf…`（修前每轮测试都会重写它）。

## 6. 变异自证（5 处，全部红→还原→绿）

| # | 变异 | 层级 | 结果 |
|---|---|---|---|
| M1a | `build-help.mjs` 删掉 `weight-compare` 的 `"start"` 参数，**不重生成** | **src 级（生成器）** | `node --test …/skill-t11.test.mjs` **exit 1**，红在「互联区新鲜」（`AssertionError`）；证明新鲜度断言恢复鉴别力 |
| M1b | 同上变异后**重生成** SKILL.md | src 级 | 门 **exit 1**：`RED exit=2 calorie.view.weight-compare … stderr="ERR 2: 缺参数 start"`，`RESULT: 98/99` |
| M2 | `build-help.mjs` 删掉 `case 'calorie.view.dedupe'` | src 级 | 生成器 **exit 1**：`Error: exampleFor 缺 case：calorie.view.dedupe（新增键必须补可执行示例，不得落 default）`；SKILL.md 未被写（blob 仍 `51bcf2cf…`） |
| M3 | 副本删 3 行示例 | 副本级 | 门 **exit 1**：`STRUCT 示例行数 96 != 组合键数 99` ＋ 逐键 `缺示例行` |
| M4 | 副本把 `--params '{"days":7}'` 改成 `{"days":0}`（合法 JSON、语义错） | 副本级 | 门 **exit 1**：`RED exit=2 … stderr="ERR 2: days 须为 1..365 整数"` |
| M5 | 副本把 `--params` 改成非法 JSON | 副本级 | 门 **exit 1**：`STRUCT --params 非合法 JSON：calorie.view.search` |

还原自证：`build-help.mjs` sha256 回到 `741b33f6…`；`SKILL.md` blob 回到 `51bcf2cf…`；`git status --short packages/skill-calorie` 空。变异期间日志：`.scratch/t99/mut1-*.log`／`mut2-gen.log`／`mut3-gate.log`／`mut4-gate.log`／`mut5-gate.log`。M1／M2 为**src 级**（满足派单「≥1 处 src 级」）。

## 7. `SKILL.md` 完整性记录（每次生成前后）

生成器包装脚本 `.scratch/t99/gen-with-integrity.mjs`（前 3 字节为 `00 00 00` 即 exit 2／3 停报）。全部记录（`.scratch/t99/skill-integrity.log`）：

```
PRE  size=26992 first3=2d 2d 2d sha256=10a3e7acaa1ff228 gitBlob=4f4a557e9813fe14e06cd41503db889211205970 zeroed=false
POST size=27965 first3=2d 2d 2d sha256=e81c4b2ff80281d6 gitBlob=51bcf2cffe84a3da285eb49e29ddd52155b22db1 zeroed=false   ← 正式生成（commit 2775822）
PRE  size=27965 first3=2d 2d 2d sha256=e81c4b2ff80281d6 gitBlob=51bcf2cf… zeroed=false
POST size=27944 first3=2d 2d 2d sha256=d35a423187616ac0 gitBlob=8288af7b39c6dd2ec0ffcd6b99c278d65acc4d85 zeroed=false   ← 变异 M1b
PRE  size=27944 first3=2d 2d 2d sha256=d35a423187616ac0 gitBlob=8288af7b… zeroed=false
POST size=27965 first3=2d 2d 2d sha256=e81c4b2ff80281d6 gitBlob=51bcf2cffe84a3da285eb49e29ddd52155b22db1 zeroed=false   ← 还原生成
```

- 三次生成**首 3 字节均为 `2d 2d 2d`（`---`）**，`zeroed=false`，无零填充。
- 终态：`size=27965`、`git hash-object = 51bcf2cffe84a3da285eb49e29ddd52155b22db1`、`git status` 干净。
- 每次生成都在持锁区内（`runId=05d25ca3…`／`6a4e302b…`／`092e41a2…`），且**生成完立即 commit**。

## 8. 偏离记账／未做／风险

**偏离（有意，逐条说明）**

1. **改了 `build-help.mjs` 的 import 副作用**（`isMain` 守卫）——票面只要求补 case ＋ 建门。理由：门必须能安全导入生成器做「产物新鲜」判定，且该守卫消除事故 #124 的测试期写盘路径；同仓 `base-combos` 已有同形实现。**#124 本身仍 OPEN**（其它写者被杀仍可能零填充），本票不关它。
2. **门不进 canonical `pnpm test`**——派单允许「独立 script」；理由见 §4。
3. **`--allow-nonzero` 放宽一次**（见文末 `GATE-RELAX`）：变异运行与既有红 `pnpm test` 必须**如实登记**在窗口内，否则反向对账会把它们报成「无人声明的 RUN」。放宽**只用于登记**，门禁证据仍只认 exit 0 条目。

**未做／未确证**

1. 门**未在 CI 实跑**（本会话不能 push）；CI 接线是静态检查（YAML 语法／命令存在性＋本地同口径 `pnpm help:examples:check` 已绿）。
2. `build-help.mjs` 的「漏 case 即抛」**没有专门单测**（`packages/skill-calorie/test/**` 不在本票路径所有权内）；目前靠 `skill-t11` 导入 `buildHelpBlock()` 间接触发＋M2 手工自证。
3. 空库口径的 24/99 **未修**（属 #100 的「缺失阻断」既定口径，不是示例缺陷）。

**风险 top3**

1. **门依赖 `docs/research/t81-seed.mjs`**：该文件若被后续票改动／移走，门会整体报错（`exit 2`，非静默绿）。缓解：门对依赖缺失显式 `FAIL: 门依赖不可用（先 pnpm build）`；若将来种子漂移，需同步复核 #81 的 exec 口径。
2. **99 次 spawn 的平台差异**：本地 Windows 绿；macOS／Linux CI 首次跑可能出现 spawn 抖动（`0xC0000005` 同族仅 Windows）。若 CI 抖动，应按 `t88-delta-flake-ruling.md` §5 单独复跑 ≥2 次再定性。
3. **`--params` 里含中文与长 JSON**（`plan-wizard` 一行 ~400 字符）：若未来 SKILL.md 加 markdown 表格列，超长单元格可能被渲染工具截断；门读的是文件字节，不受渲染影响。

## 9. 复跑命令

```sh
# 现状探针（只读，两种种子口径）
node docs/research/t99-probe-examples.mjs                 # 期望 RESULT: 99/99
node docs/research/t99-probe-examples.mjs --db empty      # 期望 RESULT: 24/99（缺失阻断口径）

# 本票门（经持锁包装器）
node tooling/run-locked.mjs --ticket 99 -- pnpm help:examples:check

# 门禁四门 ＋ 本票门
node tooling/run-locked.mjs --ticket 99 -- pnpm build
node tooling/run-locked.mjs --ticket 99 -- pnpm boundaries
node tooling/run-locked.mjs --ticket 99 -- pnpm snapshot:check
node tooling/run-locked.mjs --ticket 99 -- pnpm publish:pre

# 全量 delta（canonical）
node tooling/run-locked.mjs --ticket 99 -- pnpm test > .scratch/t99/pnpm-test-1.log 2>&1
node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t99/pnpm-test-1.log

# 对账（受跟踪对账源见 docs/research/t99-gate-runs.log）
node tooling/check-gate-audit.mjs --evidence docs/research/t99-examples-gate.md --log docs/research/t99-gate-runs.log \
  --ticket 99 --since 2026-09-09T14:17:00Z --until 2026-09-09T14:23:00Z --allow-nonzero
```

## 10. 门禁运行声明（协议 §2.4.3）

对账窗口：`--since 2026-09-09T14:17:00Z --until 2026-09-09T14:23:00Z`，`--ticket 99`。
本票在窗口内的**全部** 15 条 RUN 条目逐条声明如下（含变异运行与既有红 `pnpm test`，后者**不**充作门禁证据）。

GATE-RELAX flag=--allow-nonzero reason=窗口内必须如实登记 3 条故意变红运行（skill-t11 变异、门变异红、生成器抛错）与 1 条既有红 canonical pnpm test；放宽只用于「声明→条目」匹配，门禁证据仍只认 exit=0 条目（build/boundaries/snapshot:check/publish:pre/help:examples:check）

- GATE-RUN runId=20583188-c581-405b-b071-ad58587d202b （exit 0） cmd=git add docs/research/t99-probe-examples.mjs
- GATE-RUN runId=acf65cb1-3de2-470e-9ebe-189062f6e4a2 （exit 0） cmd=git commit -F .scratch/t99/msg-probe.txt
- GATE-RUN runId=05d25ca3-256a-4884-8586-3d992fb7efec （exit 0，正式生成） cmd=node .scratch/t99/gen-with-integrity.mjs
- GATE-RUN runId=10a7d5d8-8d2d-41ee-9b86-502ca5bc3bb6 （exit 0） cmd=git add packages/skill-calorie/scripts/build-help.mjs packages/skill-calorie/SKILL.md
- GATE-RUN runId=1c2e9ff5-4a15-4856-aab9-085ac5f96269 （exit 0） cmd=git commit -F .scratch/t99/msg-gen.txt
- GATE-RUN runId=0942a26a-a4d1-44cf-82af-59a205b091b0 （exit 0，本票门） cmd=pnpm help:examples:check
- GATE-RUN runId=ffee7301-f8e5-4da3-979a-94612fcec861 （exit 0） cmd=git add packages/skill-calorie/scripts/check-examples.mjs package.json .github/workflows/ci.yml
- GATE-RUN runId=4281fd71-da31-4df2-8e3c-c719dcad7a63 （exit 0） cmd=git commit -F .scratch/t99/msg-gate.txt
- GATE-RUN runId=d4be3162-8679-4187-8239-09c520c5b4f4 （exit 1，变异 M1a） cmd=node --test packages/skill-calorie/test/skill-t11.test.mjs
- GATE-RUN runId=6a4e302b-ea63-4a65-add4-ea11524ff9f7 （exit 0，变异 M1b 生成） cmd=node .scratch/t99/gen-with-integrity.mjs
- GATE-RUN runId=d4651ab7-a1cd-48f0-9b18-f0c775046ad3 （exit 1，变异 M1b 门红） cmd=pnpm help:examples:check
- GATE-RUN runId=092e41a2-2c5d-44df-bf02-2c8c6f3ffc5e （exit 0，还原生成） cmd=node .scratch/t99/gen-with-integrity.mjs
- GATE-RUN runId=2e1102c8-1b8c-46e7-a88d-5ac75a44510f （exit 1，变异 M2） cmd=node packages/skill-calorie/scripts/build-help.mjs
- GATE-RUN runId=8a85d5a1-5fab-4272-a148-ebf737a7366e （exit 0，四门＋本票门） cmd=node .scratch/t99/run-gates.mjs
- GATE-RUN runId=d5b272e8-4a3a-49ba-b4f7-b77e58c5aa27 （exit 1，既有红基线；delta 新增 0） cmd=pnpm test
