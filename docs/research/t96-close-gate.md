# #96 关闭轮证据 · D-1 自锁修复 ＋ R-S3-1 先校验后落盘

- 席位：实施（收尾轮）。被审两席：红队 `docs/research/t96-review-red.md`（`caf3ebd`，**PASS 91**）／蓝队 `docs/research/t96-review-blue.md`（`6f891f6`，**PASS 86**，S2×1＋S3×5）。
- 本席 commit：`83ebad4`（D-1 ＋ R-S3-1 修复）。路径所有权：`tooling/skill-html-snapshot.mjs`／`tooling/test/skill-html-snapshot.test.mjs`／`package.json`（仅 script）／`.github/workflows/ci.yml`／`docs/research/t96-*`／`.scratch/t96/**`。
- 维护者方针：只修 D-1（真会咬人）＋顺带修 R-S3-1（写脏受跟踪文件）；其余 S3 **只登记不返工**。
- 结论：**关闭前置已闭环**。D-1 修完 ＋ 三件实证（含复现死锁场景的正对照）；R-S3-1 修完 ＋ src 级变异自证（红→逐字节还原→绿，sha256 `a86d4ca0ec4d7b37` 前后一致）；四门＋新门 exit 0；`pnpm gate:selftest:html` exit 0（10/10）；canonical `pnpm test` 失败集**新增 0**；白名单 diff **0 行**；对账 `matched=12/12 undeclared=0`。

---

## 1. D-1（S2 · 蓝队）`gate:selftest:html` 自锁 → 独立锁目录

**缺陷**（蓝队实测）：`package.json:29` 的 script **自身即经持锁包装器**（`node tooling/run-locked.mjs --ticket 96 -- node --test …`）；按协议 §2.4.1 再被包装器套一层 → 外层持主锁等子进程、内层等**同一把锁**、双方无超时 → **死锁**（蓝队实测外层 `7b674cba` 持锁起 67 s 内层持续 `WAIT-OWNER-ALIVE`，其间他席同票运行 `6efa1876` 已先等 100 068 ms）。

**修法（派单选 (a)）**：`package.json:29` 增加 `--lock-dir .scratch/locks-selftest`（与 #88 的 `gate:selftest` 同口径，两个自证 script 互相串行、但都不与主锁互等）：

```
"gate:selftest:html": "node tooling/run-locked.mjs --ticket 96 --lock-dir .scratch/locks-selftest -- node --test tooling/test/skill-html-snapshot.test.mjs"
```

**新口径（写进本文与 `t96-gate.md` §9）：该命令自身持锁，调用方不得再套 `run-locked`／`pnpm gate:run`。**
CI 注释同步注明：`.github/workflows/ci.yml:38-41`。

**自锁消除实证（三件）**：

| # | 实验 | 命令 | 实测 |
| --- | --- | --- | --- |
| ① | 新口径单跑 | `pnpm gate:selftest:html` | exit **0**；`runId=53a348de-5560-4095-b7e8-d75d6a59d370`，`waitedMs=30018`（等 #88 的 `gate:selftest` 持独立锁），`tests 10 / pass 10 / fail 0` |
| ② | 正对照 A：主锁被占时内层是否还依赖主锁 | 先 `runId=t96-close-holdlock` 持**主锁** 22 s，再单跑 `pnpm gate:selftest:html` | 内层 `runId=16a455de-742a-40f7-8340-ccf4056dfe28` **`waitedMs=0`** 取得独立锁 → exit **0**（主锁仍被占）→ 内层不再等待主锁 |
| ③ | 正对照 B：**复现蓝队死锁场景**（外层持主锁 ＋ 内层脚本） | `node tooling/run-locked.mjs --ticket 96 --run-id t96-close-nestctl -- pnpm gate:selftest:html` | 外层 `waitedMs=30037`（等 `t96-close-holdlock` 释放）取得主锁后，内层 `runId=14b787b9-6558-4a3f-98dd-d49316094e98` **`waitedMs=0`** 取得独立锁 → `tests 10 / pass 10 / fail 0` → 外层 exit **0**。**修复前该嵌套必死锁** |

**结构性论证**：外层锁 = `.scratch/locks/gate.lock`，内层锁 = `.scratch/locks-selftest/gate.lock`，**两个不同资源**；本仓所有嵌套的获取顺序恒为「主 → selftest」，不存在 AB-BA 反序，故死锁不可能复现。
（③ 是一次**受控对照实验**，用于证明死锁已消除；**推荐口径仍是①：不套外层包装器**。）

---

## 2. R-S3-1（S3 · 红队）`--write` 先落盘后校验 → 先校验后落盘

**缺陷**（红队探针 e）：`tooling/skill-html-snapshot.mjs` 的 `--write` 在标记校验**之前** `writeFileSync` → 影响面断言失败时 exit 1，但**受跟踪快照已被写脏**。

**修法**：新增导出 `writeSnapshotChecked(artifacts, { snapPath })`（`tooling/skill-html-snapshot.mjs:225-250`）：

1. `buildSnapshot` → `compare` → **标记命中即返回 `{written:false}`，一个字节都不写**；
2. 通过才写同目录临时文件 `.tmp-<pid>` → `renameSync` **原子替换**（避免半截文件）；
3. CLI `--write` 改走该函数，失败时打印「**未落盘**，受跟踪快照逐字节不变」。

**新增用例**（`tooling/test/skill-html-snapshot.test.mjs`，`--write 先校验后落盘：标记命中时快照文件 sha256 不变（R-S3-1）`）：临时目录（`os.tmpdir()`，含路径守卫）内先落一份干净快照 → 记 raw sha256 → 注入 `ilife-` 标记产物 → 断言 `written=false`、`markers=[{id:'a',marker:'ilife-'}]`、**文件 raw sha256 不变**、且目标不存在时**不得创建**。

**变异自证（src 级 · `docs/research/t96-close-mutation.mjs`）**：把 `compare` 的标记判定**挪回落盘之后**（＝复现修复前顺序）：

```
LOCK-SELF-CHECK: runId=t96-close-mut-20260909b … → OK
BASELINE: node --test tooling/test/skill-html-snapshot.test.mjs → exit=0 fail 0
MUTATION: tooling/skill-html-snapshot.mjs 标记判定「落盘前 → 落盘后」
RED: exit=1 fail>0=true 命中用例=true
PASS R-S3-1 [src] sha256=a86d4ca0ec4d7b37→a86d4ca0ec4d7b37 restored=true porcelain_clean=true green=true
RESULT: mutations=1 bad=0 red_then_green=1 restored=1 sha256_16=a86d4ca0ec4d7b37 selftest_exit=0
```

> 说明：变异目标是 `.mjs` 工具源码、**无编译产物**，故不涉及 `pnpm build`（协议 §5 的 `dist/` 例外不适用）；还原为逐字节回写 ＋ sha256 双证 ＋ `git status --porcelain` 干净 ＋ 复跑自证绿。

---

## 3. 门禁实测（本轮，全部经 `node tooling/run-locked.mjs --ticket 96 --run-id <显式 id>`）

| # | 命令 | runId | exit | 关键行 |
| --- | --- | --- | --- | --- |
| 01 | `pnpm build` | `t96-close-g01` | **0** | 无 `error TS` |
| 02 | `pnpm boundaries` | `t96-close-g02` | **0** | `boundaries: PASS`（13 条 OK＝原 7 ＋ 新 6） |
| 03 | `pnpm snapshot:check` | `t96-close-g03` | **0** | `OK: 快照 == 实际拉取版（0.1.0@932e7b250d278d50）` |
| 04 | `pnpm publish:pre` | `t96-close-g04` | **0** | `check-publish --pre：PASS` |
| 05 | `pnpm snapshot:html:check`（新门） | `t96-close-g05` | **0** | `RESULT: artifacts=185 changed=0 added=0 removed=0 base-* fingerprint=7dfa5894e188f228d1b42ed3c15c101a` |
| 06 | canonical `pnpm test`（1 轮） | `t96-close-g06` | **1** | `tests 1097 / suites 131 / pass 1072 / fail 25` |
| 07 | `pnpm gate:selftest:html`（**新口径，不套外层**） | `53a348de…`（独立锁日志） | **0** | `tests 10 / pass 10 / fail 0` |
| 08 | `node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t96/gate-test.log` | —（非 build/test，未持锁） | **0** | `base=34 after=29 新增=0 消失=5` |
| 09 | 白名单 `git diff --numstat -- docs/research/t88-baseline/test-failset.txt` | — | — | **0 行** |

- **基-* 指纹变化是本次的额外收获**：`fd6299e2…` → `7dfa5894…`（#88 在途改 `packages/base-render/src/controls.ts`）。**base-* 真的变了，而 5 技能 185 件 HTML 产物 `changed=0`** —— 这正是票面验收②「base-* 变更后 5 技能快照差异为 0」的**活体实证**（原证据 §7-2 只能用可达性闭包＋正对照间接证明）。
- **`pnpm snapshot:html:check` 本轮 4 条 WARN**（`bill/chef/home/memo: dist 早于 N 个源文件`）：**成因已注记**——变异自证与还原（`writeFileSync` 回写）更新了 5 技能 src 的 mtime，而 `tsc -b` 增量构建**不重写内容未变的产物**，故 `dist/render/index.js` 的 mtime 落后于 src；门的**内容判据**（逐件 sha256）仍绿（`changed=0`）。与证据 §7-3「mtime 判据可能误报、只作 WARN」自洽，**不返工**（升为红会在 CI 之外误红）。
- 事故 #124 自检：跑完 `pnpm test` 后 `git status --short` **无** `packages/skill-calorie/SKILL.md` 改动；`git ls-files --eol` = `i/lf w/lf`。
- `changeset:status` 未跑（基线 §6.2 环境红 `Cannot find module '@changesets/errors'`，协议 §2.1 禁 `pnpm install`）。

---

## 4. 机械对账（协议 §2.4.2／§2.4.3）

**主日志**（`.scratch/locks/gate-runs.log`）声明——runId 均抄自该日志 `RUN` 行：

GATE-RUN runId=t96-close-mut-20260909 cmd="node docs/research/t96-close-mutation.mjs --expect-run-id t96-close-mut-20260909"
GATE-RUN runId=c16f54d3-945d-41d7-8890-69b533c2d5f5 cmd="git add tooling/skill-html-snapshot.mjs tooling/test/skill-html-snapshot.test.mjs package.json .github/workflows/ci.yml docs/research/t96-close-mutation.mjs"
GATE-RUN runId=1fa67527-988b-4e42-b788-d8591f058453 cmd="git commit --only tooling/skill-html-snapshot.mjs tooling/test/skill-html-snapshot.test.mjs package.json .github/workflows/ci.yml docs/research/t96-close-mutation.mjs -F .scratch/t96/commit-close-1.txt"
GATE-RUN runId=t96-close-mut-20260909b cmd="node docs/research/t96-close-mutation.mjs --expect-run-id t96-close-mut-20260909b"
GATE-RUN runId=t96-close-g01 cmd="pnpm build"
GATE-RUN runId=t96-close-g02 cmd="pnpm boundaries"
GATE-RUN runId=t96-close-g03 cmd="pnpm snapshot:check"
GATE-RUN runId=t96-close-g04 cmd="pnpm publish:pre"
GATE-RUN runId=t96-close-g05 cmd="pnpm snapshot:html:check"
GATE-RUN runId=t96-close-g06 cmd="pnpm test"
GATE-RUN runId=t96-close-holdlock cmd="node -e \"setTimeout(()=>{},22000)\""
GATE-RUN runId=t96-close-nestctl cmd="pnpm gate:selftest:html"

GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 的基线态即 exit 1（`docs/research/t88-baseline/BASELINE.md` §4；本票判据是**失败集新增 0**，非 exit 0）；另 `t96-close-mut-20260909` 一笔 exit=1 是**变异脚本自身拒绝在脏目标上变异**（当时 `tooling/skill-html-snapshot.mjs` 的修复尚未提交），按实登记。

对账命令与导出（对账源入仓）：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t96-close-gate.md --ticket 96 \
  --since 2026-09-09T14:04:38.000Z --until 2026-09-09T14:08:00.000Z \
  --allow-nonzero --export docs/research/t96-close-gate-runs.log
```

**独立锁日志**（`.scratch/locks-selftest/gate-runs.log`，D-1 修复后 `gate:selftest:html` 的留痕落点）单独对账，见 `docs/research/t96-selftest-audit.md`（导出 `docs/research/t96-selftest-runs.log`）。

---

## 5. 未做 / 未确证（登记不返工）

| # | 级 | 来源 | 内容 | 本轮处置 |
| --- | --- | --- | --- | --- |
| S3-2 | S3 | 红队 | 快照自洽面只覆盖 `text↔sha256`：删 `text`／改 `bytes`／改顶层 `artifactCount` 仍绿 | **登记**（不返工）；证据 §2.1「反手改快照即红」的口径已在 `t96-gate.md` §9 收窄为「改 `text` 或 `sha256` 即红」 |
| S3-3 | S3 | 红队 | CI 缺「新快照只许工具写」守卫（`ci.yml:46-59` 只覆盖 `skill.snapshot.json`） | **登记**；建议后续票加 `pnpm snapshot:html && git diff --exit-code -- tooling/skill-html.snapshot.json` |
| S3-4 | S3 | 红队 | 「依赖闭包」措辞实为**直接声明依赖**；`SRC_RE` 不匹配动态 `import()` | **登记**；实测补偿：未声明依赖的动态导入运行期 `ERR_MODULE_NOT_FOUND`，非静默变绿路径 |
| S3-5 | S3 | 红队 | 文档行数／体积 nit | **已按实测更新**：工具 `434` 行／`20 750 B`；快照 `1148` 行／`114 273 B`（其余表述不动） |
| D-2 | S3 | 蓝队 | 假绿窗口：门只读 `dist`、`staleness()` 只 WARN 不 exit≠0 | **登记**；成因见 §3 注记（还原更新 mtime／`tsc -b` 不重写未变产物）。升红会误红，故**不返工** |
| D-3 | S3 | 蓝队 | 6 件 `textOmitted` 快照更新不可从 `git diff` 审阅 | **登记**；写进迁移票派单五条第①条（必须附 `--show <id>` 全文） |
| D-4 | S3 | 蓝队 | `--allow-nonzero` 无鉴别力；`--expect-exit 1 --reason` 未实现 | **登记 → 转 #88 收尾清单**（`tooling/check-gate-audit.mjs` 属 #88 路径） |
| D-5 | S3 | 蓝队 | 风险 1 表述不完整（迁移触发面 5 处） | **本轮补全**：以「迁移票派单五条」写入 `t96-gate.md` §9 |
| D-6 | S3 | 蓝队 | 缺快照文件时仅裸 ENOENT 栈，缺「请先 `pnpm snapshot:html`」指引 | **登记**（不返工） |

---

## 6. 偏离记账

1. **`package.json` 提交含 #88 在途改动**：本笔 `83ebad4` 的 `package.json` 同时含 #88 对第 28 行 `gate:selftest` 加的同一 `--lock-dir`（同一 D-1 口径）。按派单 §4.6「提交含他人未提交代码本身不构成缺陷，但须如实补注归属」——**如实归属**，非本席写入。
2. **变异首轮 `t96-close-mut-20260909` exit=1**：脚本的「拒绝在脏目标上变异」守卫命中（当时修复尚未提交）→ 先提交（`83ebad4`）后以 `t96-close-mut-20260909b` 重跑 exit=0。
3. **`t101-fail-set` 首跑 exit=1 且未产出日志**（包装脚本内重定向异常，探针缺陷、非被审对象缺陷）；同命令在终端重跑 exit=0，判据行见 §3-08。
4. **正对照 B（`t96-close-nestctl`）是一次受控嵌套实验**：为复现并证伪蓝队死锁场景；**推荐口径仍是「不套外层包装器」**（§1）。
