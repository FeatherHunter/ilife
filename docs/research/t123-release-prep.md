# #123 发版前置（C1）：三包 0.2.0 版本与依赖范围一致化 ＋ 锁文件同步 ＋ 门禁与测试断言同步

- 角色：**发版前置修复 agent C1**（wayfinder 地图 #64 的前沿票 #123）。
- 仓库 `D:\ilife`；进入时 HEAD `f4d57ba`，收尾提交前 HEAD 仍为 `f4d57ba`（本票只做工作区改动 + 一次 commit）。
- 环境实测：Windows PowerShell `5.1.26100.9168`、Node `v24.19.0`、pnpm `11.8.0`（`node -v` / `pnpm -v`）。
- 发版集合（本票收敛面）：`base-paint@0.2.0` → `skill-calorie@0.2.0` → `dsh-calorie@0.2.0`（自底向上）。
- 硬约束遵守：**未** `npm publish`；仓内**未**跑全量 `npm/pnpm install`（唯一例外 = 任务书 §7 显式授权的 `--lockfile-only`，见 §4）；**未** `git stash/checkout/reset/clean/restore`；**未** push；`build`/`test`/`git add`/`git commit`/锁文件同步全部持 `D:\ilife\.scratch\locks\gate.lock`（协议 §2），持锁区起止时间见 §3。
- 写路径（声明即全部）：`packages/base-render/package.json`、`packages/skill-calorie/package.json`、`packages/skill-calorie/SKILL.md`、`packages/plugin-calorie/package.json`、`packages/plugin-calorie/src/slot.ts`、`packages/plugin-calorie/test/smoke.test.mjs`、`test/plugin-p10-boundaries.test.mjs`、`test/plugin-p10-install.test.mjs`、`test/skills-export-47.test.mjs`、`tooling/check-publish.mjs`、`pnpm-lock.yaml`、`docs/public-installer-47.md`、本文件、`.scratch/t123c1/**`。**未触碰**他人路径（`packages/base-render/src/**`、`docs/research/t123-release-*.md`、`docs/research/t123-review-*.md` 等）。
- 工作草稿 `.scratch/t123c1/**` **不入仓**（`.gitignore:5 .scratch/`）→ 复跑脚本在本文件 §7 **内联**留档。

---

## 1 改动清单（file:line 旧 → 新）

### 1.1 版本 bump（任务书 §1）

| # | 文件:行 | 旧值 | 新值 | 依据 |
| --- | --- | --- | --- | --- |
| 1 | `packages/base-render/package.json:3` | `"version": "0.1.0"` | `"version": "0.2.0"` | 诊断 §10.1「必须发」；R2 FX-R2-1（不发则第三方 `ETARGET`） |
| 2 | `packages/skill-calorie/package.json:3` | `"version": "0.1.1"` | `"version": "0.2.0"` | 诊断 §1.3（21 个 changeset 含 16 minor → `semver.inc(0.1.1, minor)`） |
| 3 | `packages/plugin-calorie/package.json:3` | `"version": "0.1.6"` | `"version": "0.2.0"` | 诊断 §1.3（6 个 changeset 含 1 minor → `0.2.0`） |

### 1.2 依赖 range（任务书 §2，禁 `workspace:`）

| # | 文件:行 | 旧值 | 新值 | 依据 |
| --- | --- | --- | --- | --- |
| 4 | `packages/plugin-calorie/package.json:28` | `"dsh-life-pack": "^0.1.0"` | `"dsh-life-pack": "^0.2.0"` | R1 FX-R1-3／P2：registry `dsh-life-pack@0.1.1` 的 `client.js`（3608B）无 `ilife.config-tab` 槽，留 `^0.1.0` 会让卡路里设置页静默缺席；工作区 `plugin-manager` 版本实测 `0.2.0` |
| 5 | `packages/plugin-calorie/package.json:29` | `"skill-calorie": "^0.1.0"` | `"skill-calorie": "^0.2.0"` | 诊断 §2.3 #1：否则装 `dsh-calorie@0.2.0` 带出 `skill-calorie@0.1.1`（无 `SKILL.md`／不落盘 HTML） |
| 6 | `packages/skill-calorie/package.json:22` | `"base-paint": "^0.2.0"` | **无需改**（并发 session `42a5b49` 已改） | 任务书 §2 复核项；实测已是 `^0.2.0` |

- `grep` 复核：`packages/plugin-calorie/package.json` 全文无 `workspace:`；`node tooling/check-publish.mjs --pre` 的 G1（`:78` 零 `workspace:` 命中）实测 PASS（§3）。

### 1.3 发布门禁断言版本无关化（任务书 §3）

| # | 文件:行 | 旧值 | 新值 |
| --- | --- | --- | --- |
| 7 | `tooling/check-publish.mjs:73-95` | 无（新增） | 新增 `assertSameVersionLine(dependent, depName, range)`：① 缺声明即红；② `range` 必须是 `^major.minor.patch` 形态；③ caret 的 `major.minor` 必须等于该依赖**工作区实际版本**的 `major.minor` |
| 8 | `tooling/check-publish.mjs:84,86` | `if (!/^\^0\.1\./.test(dep['dsh-life-pack'] \|\| '')) fail(… ^0.1.x)` / 同款 `dep[skill]` | 改为 `:108` `assertSameVersionLine(plug, 'dsh-life-pack', dep['dsh-life-pack'])` / `:109` `assertSameVersionLine(plug, skill, dep[skill])` |

- 为什么不是 `/^\^\d+\.\d+\.\d+$/`：R1 FX-R1-10 —— 该正则放行 `^9.9.9`，丢掉「同版本线」语义；本实现用**工作区版本**做锚，既不硬编码任何版本号，又保留原意图。

### 1.4 版本常量（R1 FX-R1-2，任务书 §4）

| # | 文件:行 | 旧值 | 新值 |
| --- | --- | --- | --- |
| 9 | `packages/plugin-calorie/src/slot.ts:19` | `PLUGIN_VERSION = '0.1.6'` | `PLUGIN_VERSION = '0.2.0'` |
| 10 | `packages/plugin-calorie/src/slot.ts:20` | `SKILL_VERSION = '0.1.1'` | `SKILL_VERSION = '0.2.0'` |

- 消费者：`src/client.ts` 渲染面板版本行（#123 H6 截图要看的 `dsh-calorie <ver> · skill-calorie <ver>`）、`test/smoke.test.mjs:93-94` 断言其等于两处 `package.json` 版本。改完已重建 dist（§3 附 A）。

### 1.5 硬编码 range 测试断言（R1 FX-R1-1，任务书 §5）

| # | 文件:行 | 旧值 | 新值 |
| --- | --- | --- | --- |
| 11 | `packages/plugin-calorie/test/smoke.test.mjs:33` | `assert.match(dep['dsh-life-pack'] ?? '', /^\^0\.1\./)` | `… /^\^0\.2\./` |
| 12 | `packages/plugin-calorie/test/smoke.test.mjs:34` | `assert.match(dep['skill-calorie'] ?? '', /^\^0\.1\./)` | `… /^\^0\.2\./` |
| 13 | `test/plugin-p10-boundaries.test.mjs:30-39` | `:35` 精确相等 `'^0.1.0'`；`:36` `/^\^0\.1\./` | 新增 `:34` `WINDOW123`（发版窗口映射）+ `:35` `rangeOf()`（窗口外包回落 `^0.1.0`）；`:38`/`:39` 改为按包查表（卡路里线 `^0.2.0`，其余 5 单品仍 `^0.1.0`） |
| 14 | `test/plugin-p10-install.test.mjs:40-46` | `:44` 精确相等 `'^0.1.0'` | `:43` 新增 `LIFEPACK123` 映射；`:46` 改为 `(LIFEPACK123[dir] ?? '^0.1.0')` |

- **注意**：`plugin-chef`/`plugin-home-ilife`/`plugin-bill-ilife`/`plugin-schedule-ilife`/`plugin-memo-ilife` 五个兄弟包**不在本票发版窗口内**，其 `^0.1.0` 必须原样保留（否则改测试即红、且那 5 个 `package.json` 不属本票写路径）。故断言改为**按包查表**而不是全局替换。

### 1.6 版本串同步（任务书 §6）

| # | 文件:行 | 旧值 | 新值 |
| --- | --- | --- | --- |
| 15 | `packages/skill-calorie/SKILL.md:172` | ``skill-calorie@0.1.1`` | ``skill-calorie@0.2.0`` |
| 16 | `packages/skill-calorie/SKILL.md:173`（2 处） | `npm install -g skill-calorie@0.1.1` / `npx -p skill-calorie@0.1.1` | 均 `@0.2.0` |
| 17 | `packages/skill-calorie/SKILL.md:179` | 现为 `@0.1.1` | 现为 `@0.2.0` |
| 18 | `test/skills-export-47.test.mjs:55,57` | 注释 `@0.1.1` / `assert.ok(text.includes('@0.1.1'))` | `@0.2.0`（不同步则该单测必红，诊断 §5 #6） |
| 19 | `docs/public-installer-47.md:22` | ``skill-calorie@0.1.1`` | ``skill-calorie@0.2.0`` |
| 20 | `docs/public-installer-47.md:54,56` | 「版本钉死登记（随 0.1.1 重发同步）」 | 标题补「现为 0.2.0」；`:56` 追加一句「`#123` 已把同一三处硬编码升到 `0.2.0`」（历史句保留） |

- **未动**：`SKILL.md:32` 的 `0.1.0`（envelope 契约版本，与 link-core/render 同值、漂移单测钉死）；`docs/public-installer-47.md:60-67`（「已发布包阻塞」历史小节，诊断 §5 明示保留备查）；`docs/research/t69-dual-path-evidence.md` 历史证据。

### 1.7 锁文件（任务书 §7）

| # | 文件 | 旧值 | 新值 |
| --- | --- | --- | --- |
| 21 | `pnpm-lock.yaml:131-133`（`packages/skill-calorie`） | `base-paint: specifier: ^0.1.0` | `specifier: ^0.2.0`（`version: link:../base-render` 不变） |
| 22 | `pnpm-lock.yaml:48-53`（`packages/plugin-calorie`） | `dsh-life-pack: ^0.1.0` / `skill-calorie: ^0.1.0` | 两者 `specifier: ^0.2.0`（`version:` 仍 `link:`） |
| 23 | `pnpm-lock.yaml`（附带，见 §4.2） | 5 个兄弟单品 `dsh-life-pack: ^0.1.0 → link:../plugin-manager` | `^0.1.0 → 0.1.1`（registry）＋ 新增 `dsh-life-pack@0.1.1` 包/快照条目 |

---

## 2 最终态自证（机器可读）

```
$ node -e "console.log('BASE_PAINT='+require('./packages/base-render/package.json').version);console.log('SKILL_CALORIE='+require('./packages/skill-calorie/package.json').version)"
BASE_PAINT=0.2.0
SKILL_CALORIE=0.2.0

$ node -e "const p=require('./packages/plugin-calorie/package.json');console.log('DSH_CALORIE='+p.version+' life-pack='+p.dependencies['dsh-life-pack']+' skill='+p.dependencies['skill-calorie'])"
DSH_CALORIE=0.2.0 life-pack=^0.2.0 skill=^0.2.0

$ node --input-type=module -e "const s=await import('./packages/plugin-calorie/dist/slot.js');console.log('DIST_SLOT='+s.PLUGIN_VERSION+'|'+s.SKILL_VERSION)"
DIST_SLOT=0.2.0|0.2.0

$ node -e "…读 packages/plugin-calorie/dist/client.js…"（重建后）
CLIENT_VERSION_HITS=2
		const PLUGIN_VERSION = "0.2.0";
		const SKILL_VERSION = "0.2.0";
```

---

## 3 命令与 exit code（9 条核心 + 2 条附）

> 落盘约定：`… 2>&1 | Out-File -Encoding utf8 .scratch/t123c1/run-*.log; echo MARK_X=$LASTEXITCODE`（本环境 `>` 写 UTF-16LE，故一律 `Out-File -Encoding utf8`）。日志在 `.scratch/t123c1/`（gitignore）。

| # | 命令（原文） | 持锁 | exit | 摘要行 / 判据 | 日志 |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm install --lockfile-only --ignore-scripts` | 12:52:45.905→12:52:47.418 | **0** | `Scope: all 18 workspace projects` / `Done in 1s using pnpm v11.8.0` | `run-lockfile-sync.log` |
| 2 | `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts` | 同上 | **0** | `Done in 254ms using pnpm v11.8.0`（`ERR_PNPM_OUTDATED_LOCKFILE` 消失） | `run-lockfile-frozen.log` |
| 3 | `pnpm build` | 12:56:10.144→12:56:15.726 | **0** | `tsc -b` 无诊断输出（成功静默）；`MARK_BUILD=0` | `run-build.log` |
| 4 | `pnpm boundaries` | 同上 | **0** | `boundaries: PASS` | `run-boundaries.log` |
| 5 | `pnpm snapshot:check` | 同上 | **0** | `OK: 快照 == 实际拉取版（0.1.0@2fc0b42170d9604a）` | `run-snapshot.log` |
| 6 | `pnpm publish:pre` | 同上 | **0** | `OK: dsh-calorie 声明 dsh-life-pack ^0.2.0（工作区 0.2.0，同版本线）` / `OK: dsh-calorie 声明 skill-calorie ^0.2.0（工作区 0.2.0，同版本线）` / `check-publish --pre：PASS` | `run-publish-pre.log` |
| 7 | `pnpm test` | 12:56:28.701→12:56:46.925 | **1**（既有 21 条，见 §6） | `[ELIFECYCLE] Test failed.`；失败集 == 基线（delta 0） | `run-test.log` |
| 8 | `pnpm publish:pre`（变异：range 回退 `^0.1.0`） | 12:52:35.220→12:52:38.208 | **1** | `check-publish --pre：2 处红` | `run-mut-red.log` |
| 9 | `pnpm publish:pre`（还原 `^0.2.0` 后） | 同上 | **0** | `check-publish --pre：PASS`；`SHA_RESTORED_EQ=True` | `run-gate-pre-after.log` |
| A | `pnpm --filter dsh-calorie build`（附：重建 host+client，面板版本行同源） | 12:56:10.144→12:56:15.726 | **0** | `dist\client.js 13.88 kB` / `✔ Build complete in 15ms` | `run-build-plugin-calorie.log` |
| B | `node .scratch/t123c1/test-delta.mjs .scratch/t123c1/run-test.log`（附：delta 判定） | 无（只读） | **0** | `FAIL_NOW=21 BASELINE=21 ADDED=0 FIXED=0 DELTA_EMPTY=true` | `run-test-delta.log` |

- 附注（非门禁）：`node tooling/check-publish.mjs --pre`（**不带 `--only`** 的全量模式）在 `tooling/check-publish.mjs:98` 崩于**既有** bug（`readdirSync(...,{withFileTypes:true})` 的 `Dirent` 被直接喂给 `path.join`），与本票改动无关；`pnpm publish:pre` 脚本恒带 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint`，不受影响。见 §8 风险 R1。

---

## 4 锁文件同步（任务书 §7 唯一授权例外）

### 4.1 前后 specifier 摘录（`node .scratch/t123c1/lock-importers.mjs <锁文件>`）

```
=== BEFORE（.scratch/t123c1/pnpm-lock.before.yaml）===
packages/plugin-calorie | dsh-life-pack | specifier: ^0.1.0 | version: link:../plugin-manager
packages/plugin-calorie | skill-calorie | specifier: ^0.1.0 | version: link:../skill-calorie
packages/skill-calorie  | base-paint    | specifier: ^0.1.0 | version: link:../base-render
（另 5 个兄弟单品：dsh-life-pack | ^0.1.0 | link:../plugin-manager）

=== AFTER（pnpm-lock.yaml）===
packages/plugin-calorie | dsh-life-pack | specifier: ^0.2.0 | version: link:../plugin-manager
packages/plugin-calorie | skill-calorie | specifier: ^0.2.0 | version: link:../skill-calorie
packages/skill-calorie  | base-paint    | specifier: ^0.2.0 | version: link:../base-render
packages/plugin-bill-ilife | dsh-life-pack | specifier: ^0.1.0 | version: 0.1.1   ← 见 §4.2
packages/plugin-chef       | dsh-life-pack | specifier: ^0.1.0 | version: 0.1.1
packages/plugin-home-ilife | dsh-life-pack | specifier: ^0.1.0 | version: 0.1.1
packages/plugin-memo-ilife | dsh-life-pack | specifier: ^0.1.0 | version: 0.1.1
packages/plugin-schedule-ilife | dsh-life-pack | specifier: ^0.1.0 | version: 0.1.1
```

- `pnpm-lock.yaml` diff：`1 file changed, 14 insertions(+), 8 deletions(-)`；3 处 specifier `^0.1.0 → ^0.2.0`，`link:` 目标未变；**`node_modules` 未动**（`node_modules/.bin` 条目数 9 → 9）。
- 同步前快照留档：`.scratch/t123c1/pnpm-lock.before.yaml`。

### 4.2 附带影响与独立性实证（**新增发现，非本票改动引起**）

锁文件重解析时，**5 个兄弟单品**（bill/chef/home/memo/schedule）的 `dsh-life-pack: ^0.1.0` 从 `link:../plugin-manager` 变为 registry `0.1.1`，并新增 `dsh-life-pack@0.1.1` 的 packages/snapshots 条目。根因：`packages/plugin-manager` 工作区版本已是 `0.2.0`，而兄弟包声明 `^0.1.0` → 不满足 range，`pnpm-workspace.yaml` 的 `linkWorkspacePackages: true` 只对**满足 range** 的依赖建 `link:`（`deep` 才会无视 range）。

**独立性实证（仓外镜像，协议 §2.1：安装目标在 `%TEMP%`、自带 package.json）**：

| 实验 | 镜像内容 | 命令 | exit | 结果 |
| --- | --- | --- | --- | --- |
| M1 | HEAD 全部 manifest（`git show HEAD:<path>`）+ 同步前锁文件 | `pnpm install --lockfile-only --ignore-scripts` | **1** | `ERR_PNPM_NO_MATCHING_VERSION`：`No matching version found for base-paint@^0.2.0`（HEAD 的 `base-render` 仍是 `0.1.0`）→ 证明「HEAD 现状根本同步不了锁文件」，即 R2 FX-R2-2 的根因链 |
| M2 | HEAD 全部 manifest，**仅把 `base-render` 版本改成 `0.2.0`**（不含 C1 对 `plugin-calorie` 的任何改动） | 同上 | **0** | 5 个兄弟单品**同样**翻成 registry `0.1.1`；`plugin-calorie`（HEAD 的 `^0.1.0`）也翻成 `0.1.1` |

→ **结论**：§4.2 的翻法由「`plugin-manager` 0.2.0 vs 兄弟包 `^0.1.0`」决定，**与 C1 的三包改动无关**；C1 把 `plugin-calorie` 提到 `^0.2.0` 反而让它回到 `link:`。兄弟包 range 不在本票写路径 → 记账给编排者（§8 R2）。两个镜像目录用后即清（路径守卫：必须 `StartsWith($env:TEMP)`，实测 `MIRROR_REMOVED=…`）。

---

## 5 变异自证（任务书 §3）

单次持锁区内完成（12:52:35.220→12:52:38.208）：备份 `package.json` → 跑门禁（绿）→ 把 `packages/plugin-calorie/package.json` 的 `dsh-life-pack`/`skill-calorie` 临时改回 `^0.1.0` → 跑门禁（红）→ 还原备份 → 校验 SHA256 一致 → 跑门禁（绿）。

```
LOCK_ACQUIRED=2026-09-09T12:52:35.2203179+08:00
MARK_PRE_BEFORE=0
MUTATED=^0.1.0|^0.1.0
MARK_MUT_RED=1
SHA_RESTORED_EQ=True
MARK_PRE_AFTER=0
LOCK_RELEASED=2026-09-09T12:52:38.2080551+08:00
```

变异红的两条签名（`run-mut-red.log`）：

```
FAIL: dsh-calorie 的 dsh-life-pack 范围「^0.1.0」与工作区版本 0.2.0 的 major.minor 不一致
FAIL: dsh-calorie 的 skill-calorie 范围「^0.1.0」与工作区版本 0.2.0 的 major.minor 不一致
check-publish --pre：2 处红
```

反向对照（旧门禁在**新 range** 下会红，即本票要修的那件事）：以旧正则 `/^\^0\.1\./` 复算 6 个单品 manifest → `OLD_PREDICATE_PASS=5 RED=1`（红的是 `dsh-calorie`：`^0.2.0` 不被旧正则接受）。**结论：门禁既不再硬编码版本，也仍能抓住 range 与工作区版本不一致。**

---

## 6 测试 delta（任务书 §9）

```
$ node .scratch/t123c1/test-delta.mjs .scratch/t123c1/run-test.log .scratch/t75/baseline-failing.txt
FAIL_NOW=21
BASELINE=21
ADDED=0
FIXED=0
DELTA_EMPTY=true
```

- `pnpm test` exit **1**（既有失败，非新增）；`MARK_TEST=1`。
- 判定口径：只取 spec reporter 末尾「✖ failing tests:」小节的**叶子**失败项（不含 describe 父级，同名用例去重——如 4 个包同名 `#50 envelope 契约：面板路 readViaCli 同键打通不返空`）。
- 与 `.scratch/t75/baseline-failing.txt`（21 条）逐名比对：**新增失败 = 0**，且**没有一条既有失败被"修好"**（`FIXED=0`，失败集完全一致）。
- 本票改动的 4 处断言（`smoke.test.mjs:33,34`、`p10-boundaries:38,39`、`p10-install:46`）与版本常量（`slot.ts:19,20`）全部落在**通过**集合里（否则 `ADDED` 会非 0）。

---

## 7 复跑脚本（`.scratch/` 被 gitignore，故内联）

### 7.1 失败集 delta：`.scratch/t123c1/test-delta.mjs`

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const logPath = process.argv[2] || '.scratch/t123c1/run-test.log';
const basePath = process.argv[3] || '.scratch/t75/baseline-failing.txt';
const norm = (s) => s.replace(/\r/g, '').trim();
const names = (text) => {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  const start = lines.map((l, i) => (/^✖ failing tests:\s*$/.test(l) ? i : -1)).filter((i) => i >= 0).pop();
  const set = new Set();
  if (start === undefined) return set;
  for (const l of lines.slice(start + 1)) {
    const m = /^✖ (.*?) \(\d+(\.\d+)?m?s\)\s*$/.exec(l);
    if (m) set.add(norm(m[1]));
  }
  return set;
};
const now = names(readFileSync(logPath, 'utf8'));
const base = new Set(readFileSync(basePath, 'utf8').split('\n').map(norm).filter(Boolean));
const added = [...now].filter((n) => !base.has(n));
const fixed = [...base].filter((n) => !now.has(n));
console.log('FAIL_NOW=' + now.size);
console.log('BASELINE=' + base.size);
console.log('ADDED=' + added.length);
console.log('FIXED=' + fixed.length);
console.log('DELTA_EMPTY=' + (added.length === 0));
for (const n of added) console.log('ADDED_FAIL: ' + n);
for (const n of fixed) console.log('FIXED_FAIL: ' + n);
```

### 7.2 锁文件 importer 摘录：`.scratch/t123c1/lock-importers.mjs`

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const file = process.argv[2] || 'pnpm-lock.yaml';
const WANT = new Set(['dsh-life-pack', 'skill-calorie', 'base-paint']);
const lines = readFileSync(file, 'utf8').split(/\r?\n/);
let cur = null; const out = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const imp = /^  (packages\/[^:]+):$/.exec(l);
  if (imp) { cur = imp[1]; continue; }
  if (/^  [A-Za-z]/.test(l)) cur = null;
  const dep = /^      ([@A-Za-z0-9._-]+):$/.exec(l);
  if (cur && dep && WANT.has(dep[1])) {
    out.push(cur + ' | ' + dep[1] + ' | ' + (lines[i + 1] || '').trim() + ' | ' + (lines[i + 2] || '').trim());
  }
}
console.log(out.join('\n'));
console.log('IMPORTER_ENTRIES=' + out.length);
```

### 7.3 仓外镜像（§4.2 独立性实证）：`.scratch/t123c1/mirror-baseline.mjs`

```js
#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root = 'D:\\ilife';
const m = join(tmpdir(), 'ilife-t123c1-mirror-' + Date.now());
mkdirSync(join(m, 'packages'), { recursive: true });
const show = (p) => execFileSync('git', ['show', 'HEAD:' + p], { cwd: root, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
for (const f of ['package.json', 'pnpm-workspace.yaml', '.npmrc']) writeFileSync(join(m, f), show(f));
writeFileSync(join(m, 'pnpm-lock.yaml'), readFileSync(join(root, '.scratch/t123c1/pnpm-lock.before.yaml')));
const tracked = execFileSync('git', ['ls-files', 'packages/*/package.json'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
for (const rel of tracked) {
  const p = join(m, 'packages', rel.split('/')[1]);
  mkdirSync(p, { recursive: true });
  writeFileSync(join(p, 'package.json'), show(rel));
}
const bp = (process.argv.find((a) => a.startsWith('--base-paint=')) || '').split('=')[1];
if (bp) { const p = join(m, 'packages/base-render/package.json'); const j = JSON.parse(readFileSync(p, 'utf8')); j.version = bp; writeFileSync(p, JSON.stringify(j, null, 2) + '\n'); }
console.log('MIRROR=' + m);
// 之后：cd 到 MIRROR 跑 pnpm install --lockfile-only --ignore-scripts，再跑 lock-importers.mjs 比对
```

---

## 8 偏离记账 / 未做 / 未确证 / 风险

**偏离记账**

1. `docs/public-installer-47.md:54,56`（「版本钉死登记」小节）也在本票写路径内且与新版本串直接冲突，故同步补注（任务书只点名 `:22`）——历史句保留、只追加现状句。
2. 额外跑了一条**非门禁**命令 `pnpm --filter dsh-calorie build`（附 A）：`pnpm build`（`tsc -b`）只出 host 侧 `dist`，而面板版本行来自 tsdown 的 `dist/client.js`；不重建则真机（junction 直连工作区）面板仍显示旧版本号。
3. 未删任何 changeset（任务书未列；诊断 §6.2 硬坑 1 指出卡路里 changeset 与 `dsh-life-pack`/5 单品跨包耦合，删除需编排者裁定）。

**未做 / 未确证**

- 未 `npm publish`、未动发布凭据（诊断 §7：token 401，HITL 前置）。
- 未在真机（junction profile）取证；`pnpm publish:post` / `publish:fresh` 未跑（需 registry 上有 `base-paint@0.2.0` 等三包新版本，发版后才可跑）。
- `pnpm test` 未与"更早的干净基线"比对——本票口径 = 与 `.scratch/t75/baseline-failing.txt` 的失败集 delta（任务书 §9 指定）。

**风险**

| # | 风险 | 影响 | 处置 |
| --- | --- | --- | --- |
| R1 | `check-publish.mjs --pre` 的**全量模式**（不带 `--only`）在 `:98` 崩于既有 `Dirent` bug | 与 `pnpm publish:pre` 无关（脚本恒带 `--only`）；若将来去 `--only` 跑 13 包会先撞这个 bug | 记账：既有缺陷，不属本票写路径（`:98` 不在本票改动行内），建议单开票修 `d → d.name` |
| R2 | 5 个兄弟单品锁文件解析从 `link:` 翻成 registry `0.1.1`（§4.2） | 与 `pnpm-workspace.yaml` 注释「锁文件永保 link:」的期望不一致；干净 CI 安装会给这 5 包装 registry 版 `dsh-life-pack@0.1.1`（源码零 import，实测 `grep "from 'dsh-life-pack'" packages/**/*.ts` 无命中 → 不影响 build/test） | 根因 = `plugin-manager@0.2.0` vs 兄弟包 `^0.1.0`；兄弟包 `package.json` **不属本票写路径** → 交由编排者：或各复制票把 range 提到 `^0.2.0`，或把 `linkWorkspacePackages` 改成 `deep` |
| R3 | 版本号以"手工 bump"落定（changesets CLI 损坏，诊断 §1.4） | 若后续用 `changeset version` 重新消费，可能算出不同版本 | 与本票既定口径一致（诊断 §1.3 的 `semver.inc(…, minor)`）；发版前以 `pnpm publish:plan` 复核 |
