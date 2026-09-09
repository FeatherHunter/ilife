# t88 变更前门禁基线（编排者冻结）

- 票：wayfinder 地图 #63 / 票 #88《HELP 速查台重建》
- 作用：本文件为**唯一基准**。后续任何 delta 判定（"四门 exit 0"、"`pnpm test` 失败集新增 0"）以本文件为准，任何人不得改口径。
- 基线冻结时间：2026-09-09 19:57 起（本地）
- 执行方式：`pwsh` 工具逐条执行（本会话是 **Windows PowerShell 5.1**，故 `*>` 重定向改写为 `*>&1 | Out-File -Encoding utf8`，语义等价、只修编码），落盘 `.scratch/t88/baseline/<NN>-<门>.log`，只回读 `MARK_<门>=$LASTEXITCODE` 标记行。
- 持锁：锁目录 `D:\ilife\.scratch\locks\gate.lock`（协议 §2 原样片段），一次只跑一条命令，跑完 `finally` 释放。
- 环境：node v24.19.0／pnpm 11.8.0／Chrome（headless 夹具可用）。
- **入仓副本说明**：本文件是入仓副本（采集现场 `.scratch/t88/baseline/` 被 `.gitignore` 忽略）。日志、白名单与脚本随本目录入库；现场名 ↔ 入仓名映射见 `README.md` §4。文中出现的 `.scratch/…` 路径为采集现场。

## 状态：完成（12 个门禁脚本实测 11 个；`pnpm snapshot` 写模式按设计未跑——它会改写 `skill.snapshot.json`，其校验由 `snapshot:check` 覆盖；`changeset:status` 为**环境红**，见 §6）

## 1. 起点记录

| 项 | 值 |
| --- | --- |
| branch | `master` |
| HEAD sha + subject | `90128d853d703457a0f48b419428c7c41c0e8e3f` feat(86): 证据t86+changeset（真机4页exit0+只读sha同值+先看后写receipt） |
| `git status --short` | 3 条未跟踪、无修改：`.tmp-t123logs/`、`.tmp-t86-evidence/`、`docs/research/t123-release-evidence/`（均非本票路径，基线时即存在） |
| 日志 | `01-git-status.log`／`02-git-log.log`／`03-git-branch.log` |

## 2. 门禁命令清单（从 `package.json` scripts ＋ `.github/workflows/ci.yml` ＋ `tooling/` 提取）

### 2.1 `package.json` 全部门禁脚本（确切名字）

| script | 实际命令 |
| --- | --- |
| `build` | `tsc -b` |
| `test:types` | `tsc -b`（与 build 同体） |
| `test` | `node --test` 15 个 glob（`test/*.test.mjs` ＋ 14 个包级 test 目录） |
| `doctor` | `node tooling/skilllink.mjs doctor` |
| `snapshot` | `node tooling/write-snapshot.mjs`（写） |
| `snapshot:check` | `node tooling/write-snapshot.mjs --check` |
| `boundaries` | `node tooling/check-boundaries.mjs` |
| `publish:pre` | `node tooling/check-publish.mjs --pre --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint` |
| `publish:tarball` | `node tooling/check-publish.mjs --tarball --only …` |
| `publish:fresh` | `node tooling/check-publish.mjs --fresh-tmp --only …` |
| `publish:plan` | `node tooling/publish-chain.mjs --plan --only …` |
| `changeset:status` | `changeset status` |

### 2.2 CI（`.github/workflows/ci.yml`）实际跑的门

- `build-test`：`pnpm build` → `pnpm doctor` → `pnpm test` → `pnpm boundaries` → `pnpm snapshot:check` → `pnpm changeset:status`
- `publish-gates`：`pnpm build` → `pnpm publish:pre` → `pnpm publish:tarball` → `pnpm publish:fresh` ＋ t95 四条 `node docs/research/t95-*.mjs` 门
- `win-detail`：`pnpm build` → `pnpm doctor` → `pnpm test`

### 2.3 「四门」口径（本仓既有证据的冻结四项）

`docs/research/t95-…:6` 与 `docs/research/t101-…:324` 一致冻结为：① `pnpm build` ② `pnpm boundaries` ③ `pnpm snapshot:check` ④ `pnpm publish:pre`。
外加**独立口径的全量测试门** `pnpm test`（exit 非 0 属既有基线，判据是**失败集 delta**，不是 exit 码）。

> 实际门数**不止四条**：§2.1 共 12 个门禁脚本，CI 触及 10 个。本基线逐个实测并如实标注。

## 3. 逐条执行结果（命令 → exit）

| # | 命令 | exit | 日志 |
| --- | --- | --- | --- |
| 01–03 | `git status --short`／`git log -1`／`git rev-parse --abbrev-ref HEAD` | 0／0／0 | `01-…`／`02-…`／`03-…` |
| 04 | `pnpm build` | **0** | `04-pnpm-build.log` |
| 05 | `pnpm boundaries` | **0** | `05-boundaries.log` |
| 06 | `pnpm snapshot:check` | **0** | `06-snapshot-check.log` |
| 07 | `pnpm publish:pre` | **0** | `07-publish-pre.log` |
| 08 | `pnpm test:types` | **0** | `08-test-types.log` |
| 09 | `pnpm test`（首跑，会话被打断） | 未捕获（进程死亡） | `09a-pnpm-test-dead.log`（截断证据） |
| 09n | `node --test --test-timeout=120000 …`（同组 glob，兜底模式） | 未捕获（空） | `09-pnpm-test.log` |
| 09b | `pnpm test`（canonical #1） | **1** | `09b-pnpm-test-canonical-1.log`（入仓） |
| 09c | `pnpm test`（canonical #2） | **1** | `09c-pnpm-test-canonical-2.log`（入仓） |
| 09d | `pnpm test`（canonical #3） | **1** | `09d-pnpm-test.log`（现场，未入仓） |
| 10 | `pnpm doctor` | **0** | `10-doctor.log` |
| 11 | `pnpm publish:tarball` | **0** | `11-publish-tarball.log` |
| 12 | `pnpm publish:fresh` | **0** | `12-publish-fresh.log` |
| 13 | `pnpm changeset:status` | **1** | `13-changeset-status.log` |
| 14 | `pnpm publish:plan` | **0** | `14-publish-plan.log` |

**四门实测：`build`=0、`boundaries`=0、`snapshot:check`=0、`publish:pre`=0 → 四门全 exit 0（变更前）。**

## 4. `pnpm test` 失败集（口径：canonical `pnpm test`）

三轮 canonical `pnpm test` 的**计数完全一致**：

| 指标 | 值 |
| --- | --- |
| tests | 1017 |
| suites | 129 |
| pass | **991** |
| fail | **26** |
| cancelled／skipped／todo | 0／0／0 |
| duration_ms | 14552.2／17817.9／… |
| exit code | **1（既有红，非本票引入）** |

- 归一化失败集（`✖` 行去缩进/耗时，脚本 `docs/research/t101-fail-set.mjs`）：每轮 **30–31 条具名条目**，三轮**并集 34 条** → 白名单 `test-failset.txt`（同目录，由 `failset-union.mjs` 生成）。
- **抖动项（三轮中仅 1 轮出现，共 5 条）**：`#41 M3：真 CLI 串行冒烟 18 新键（exit 0 + envelope stat + --html 含 ilife-page）`、`#76 无宿主可执行证据（纯 HTML 页面 ＋ headless 浏览器）`、`#80 HELP 生成与键名一致性`、`helpers JS 在 ≤820px 视口把反馈栈收窄为 3（页面运行时行为，FX-76-2）`、`③ check-combos 全绿（键形/注册一致性构建期门）`；每轮恰命中其中 1–2 条，**fail 计数不变（26）**。
- **稳定红（三轮 3/3，29 条）**：`#48`／`#50` envelope 契约 7 条、`#81 唤醒词路由层`、`FX-81-5`、`#93 ① 64 读键`、`#93 回归 · CLI 读键…`、`dsh-*` client 12 条 ＋ `dsh-* 烟囱` 6 条。逐条清单见 `test-failset.txt`。

### 4.1 ⚠ 模式差异（重要风险）

`node --test` 直跑（09）与 `pnpm test`（09b/c/d）**不等价**：直跑 tests 1011／fail 20，canonical 1017／fail 26；失败集差异 **canonical 独有 17 条 / 直跑独有 9 条**（直跑下 `dsh-* 烟囱`、`#48/#50 envelope`、`#80`、`check-combos` 变绿，另新增 `packages\skill-calorie\test\skill-t11.test.mjs` 文件级崩溃及其级联）。

> **判定口径**：delta 比对**必须用 canonical `pnpm test`**，不得用 `node --test` 直跑结果替代。

### 4.2 与入仓旧名单的漂移

`docs/research/t101-baseline-failures.txt`（27 条）相对本 HEAD **已过期**：**消失 15 条／新增 11 条**（含 `#80 HELP 生成与键名一致性`、`③ check-combos 全绿`、`#47/#56` 等）。本文件 `test-failset.txt`（34 条并集）**取代**其作为 #88 的 delta 基准。

## 5. 后续 delta 口径（冻结）

本票（#88）实施后的验收，**只以本文件为唯一基准**：

1. **四门 exit 0**：`pnpm build`／`pnpm boundaries`／`pnpm snapshot:check`／`pnpm publish:pre` 逐条 exit 0。
2. **`pnpm test` 失败集新增 = 0**：以 `docs/research/t88-baseline/test-failset.txt`（34 条具名白名单，三轮并集）为基准，比对**具名测试名集合**，**不以 exit 码为准**（exit 1 是既有红）。判定命令：
   `node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <after.log>` → 要求 `新增=0`。
3. 抖动项（§4 五条）不计入"新增"，但**也不得**因此放宽其余口径。
4. 任何"基线本身要改"的诉求，必须回到编排者，不得由实施者自行调整。

## 6. 续测记录

### 6.1 全部门禁终态（12 个脚本）

| 命令 | exit | 关键行 |
| --- | --- | --- |
| `pnpm build` | 0 | 无 `error TS`（0 命中） |
| `pnpm test:types` | 0 | 无 `error TS`（0 命中） |
| `pnpm boundaries` | 0 | `boundaries: PASS` |
| `pnpm snapshot:check` | 0 | `OK: 快照 == 实际拉取版（0.1.0@932e7b250d278d50）` |
| `pnpm publish:pre` | 0 | `check-publish --pre：PASS` |
| `pnpm publish:tarball` | 0 | `OK: skill-calorie tarball 含全部 6 件模板` |
| `pnpm publish:fresh` | 0 | `OK: fresh-tmp npm install 2 实包成功` |
| `pnpm publish:plan` | 0 | `PLAN 预演：base-paint → skill-calorie → dsh-life-pack → dsh-calorie` |
| `pnpm doctor` | 0 | `doctor: PASS` |
| `pnpm test` | 1 | 既有红，见 §4（991 pass／26 fail，计数三轮一致） |
| `pnpm changeset:status` | **1** | 环境红，见 §6.2 |
| `pnpm snapshot`（写） | 未跑 | 按设计不跑：会改写 `packages/ilife-skills/skill.snapshot.json`，校验由 `snapshot:check` 覆盖 |

### 6.2 异常：`changeset:status` 环境红（非本票引入，需编排者处置）

```
Error: Cannot find module '@changesets/errors'
  requireStack: node_modules/.pnpm/@changesets+cli@2.31.1_…/node_modules/@changesets/cli/dist/changesets-cli.cjs.js
[ELIFECYCLE] Command failed with exit code 1.
```

- 判定：`node_modules` 里 `@changesets/cli` 依赖缺失（安装态残缺），**与 #88 代码无关**；CI 上 `fetch-depth: 0` ＋ 干净安装不会复现。
- 处置：按协议 **§2.1**，本 agent **不执行** `pnpm install`／`pnpm add`，只上报编排者。
- 对 delta 口径的影响：**无**。四门与 `pnpm test` 不受影响；`changeset:status` 不列入本票验收门（其基线态即为红）。

### 6.3 其他观察

- 报错栈里 Node 版本显示 **v24.18.1**，而 `node --version` 为 **v24.19.0** → `pnpm` 解析到的 node 与 shell PATH 上的 node 可能不同；不影响本次门禁结论，但复核时建议固定同一 node。
- 首跑 `pnpm test` 曾被会话中断杀死并留下悬空锁（mtime 19:48:41），按协议 §2 的 age>10min 抢回后继续；`.scratch/t88/baseline/run-gates.ps1` 是上一个 session 的残留物，本基线**未使用**。
- `git status --short` 全程保持与 §1 相同（本票只写 `.scratch/t88/baseline/**`，该目录被 gitignore）。

