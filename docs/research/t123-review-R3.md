# #123 发版窗口 — 对抗式审查报告 R3（第二轮）

- 审查者角色：**对抗式审查者 R3**（第二轮）。被审对象 = **C1 发版前置代码修复**：commit `ca46495`（13 文件 / +384 −34）＋ `docs/research/t123-release-prep.md`（317 行）。
- 审查锚点：`git rev-parse ca46495` = `ca4649552a6ba473c7e05ab795e08ae9ff7e2ef9`；审查时 HEAD = `981a3b5`（本票之后仅有 docs 提交）。
- 环境实测：Windows PowerShell `5.1.26100.9168`、Node `v24.19.0`、pnpm `11.8.0`、npm 随 Node 24 内置。取证时间 `2026-09-09 13:24–13:31 (+08:00)`。
- 方法：**不引用作者任何结论**。每条断言自己跑一次；长命令落盘 `.scratch/t123review-R3/run-*.log`（`Out-File -Encoding utf8`）并打 `MARK_*=exit`；build/test/install/变异全部持 `D:\ilife\.scratch\locks\gate.lock`（协议 §2，锁区间见 §7）。单 sidebar 终端 `t123-review-R3`。
- 未读 `docs/research/t123-review-R4.md`（实测该文件**不存在**，`Test-Path` = False）。
- 硬约束：未改源码（变异自证为唯一例外，已还原并比对 SHA256）、未 `npm publish`、未在 `D:\ilife` 内 `npm install`（唯一 install 均在 `%TEMP%` 仓外镜像，自带最小 `package.json`，用后即清并留 `CLEANED_* EXISTS=false`）、无危险 git、无 commit/push。

---

## 1 逐条复验表（断言 → 我的命令 → 输出摘录 → 判据）

| # | 被审断言（来源） | 我的命令 | 我的输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| 1 | 13 文件 / +384 −34（commit message） | `git show --stat ca46495` | `13 files changed, 384 insertions(+), 34 deletions(-)` | **PASS** |
| 2 | 13 文件全部属本票声明写路径、无越界（§0/§8 写路径清单） | `git show --name-status --format="" ca46495` | 13 行 `M/A`：`docs/public-installer-47.md`、`docs/research/t123-release-prep.md`、3×`package.json`、`slot.ts`、`smoke.test.mjs`、`SKILL.md`、`pnpm-lock.yaml`、3×`test/*.mjs`、`tooling/check-publish.mjs` | **PASS** |
| 3 | 未触碰 #75 占用路径 | 对照协议 §1 的 #75 路径清单 | 13 文件中**无** `packages/base-render/src/**`、`test-d/contract-signatures.ts`、`test/style.test.mjs`、`docs/base-paint-contract.md`、`.changeset/base-paint-style-sheet.md` | **PASS** |
| 4 | 三包版本 = `0.2.0` | `node -e` 逐包读 `version` | `base-paint 0.2.0` / `skill-calorie 0.2.0` / `dsh-calorie 0.2.0` | **PASS** |
| 5 | 三处 range = `^0.2.0` | 逐 manifest 读 `dependencies` | `plugin-calorie: dsh-life-pack ^0.2.0, skill-calorie ^0.2.0`；`skill-calorie: base-paint ^0.2.0` | **PASS** |
| 6 | `slot.ts:19,20` 常量 = 0.2.0（§1.4） | `Select-String -Path packages/plugin-calorie/src/slot.ts` | `19: export const PLUGIN_VERSION = '0.2.0' as const;` / `20: export const SKILL_VERSION = '0.2.0' as const;` | **PASS** |
| 7 | 变更无 `workspace:` 泄漏 | 全仓 `package.json` grep `workspace:` | 命中 2 处：`.scratch/t123/regbase/package/package.json`（草稿）与 `packages/base-combos/package.json:15`（`base-link-core: workspace:^0.1.0`，**`73c6815` 既有**，非本票） | **PASS（本票零泄漏）**；另见 FX-R3-5 附注 |
| 8 | dist 已重建、面板版本行同源（§2） | `node --input-type=module` 导入 `dist/slot.js`；grep `dist/client.js` | `DIST_SLOT=0.2.0\|0.2.0`；`client.js:55 const PLUGIN_VERSION = "0.2.0";` `:56 const SKILL_VERSION = "0.2.0";`（命中数 2） | **PASS** |
| 9 | `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts` exit 0（§3 #2） | 持锁跑 | `Scope: all 18 workspace projects` / `Lockfile passes supply-chain policies` / `Done in 266ms` / `MARK_FROZEN=0` | **PASS** |
| 10 | `pnpm build` exit 0（§3 #3） | 持锁跑 | `$ tsc -b` 无诊断 / `MARK_BUILD=0` | **PASS** |
| 11 | `pnpm boundaries` exit 0（§3 #4） | 持锁跑 | `boundaries: PASS` / `MARK_BOUNDARIES=0` | **PASS** |
| 12 | `pnpm snapshot:check` exit 0（§3 #5） | 持锁跑 | `OK: 快照 == 实际拉取版（0.1.0@2fc0b42170d9604a）` / `MARK_SNAPSHOT=0`（与作者摘录逐字一致） | **PASS** |
| 13 | `pnpm publish:pre` exit 0（§3 #6） | 持锁跑 | `OK: dsh-calorie 声明 dsh-life-pack ^0.2.0（工作区 0.2.0，同版本线）` / `… skill-calorie ^0.2.0 …` / `check-publish --pre：PASS` / `MARK_PUBLISHPRE=0` | **PASS** |
| 14 | `pnpm test` 失败集 delta = 0（§6：21/21/0/0） | 持锁跑 `pnpm test` + **我自己写的** `.scratch/t123review-R3/test-delta.mjs` | `FAIL_NOW=21 BASELINE=21 ADDED=0 FIXED=0 DELTA_EMPTY=true`；`MARK_TEST=1` | **PASS** |
| 15 | 基线文件未被篡改 | `Get-Item .scratch/t75/baseline-failing.txt` | `LastWriteTime 2026/9/9 6:08:29`（早于 `ca46495` 的 12:58:28）、21 行、1936B | **PASS** |
| 16 | 变异自证：`^0.2.0`→`^0.1.0` 门禁红、还原后绿且 sha 一致（§5） | 我自己做一遍（见 §2） | `MARK_BEFORE=0` → `MARK_MUT_RED=1` → `SHA_RESTORED_EQ=True` → `MARK_AFTER=0` | **PASS** |
| 17 | 锁文件 diff = 14/8（§4.1） | `git show --numstat --format="" ca46495 -- pnpm-lock.yaml` | `14	8	pnpm-lock.yaml` | **PASS** |
| 18 | 5 个兄弟单品翻 registry `0.1.1`（§4.2） | 读 `pnpm-lock.yaml` importer 段 | `plugin-bill-ilife / chef / home-ilife / memo-ilife / schedule-ilife`：`specifier: ^0.1.0 | version: 0.1.1`；`plugin-calorie`：`^0.2.0 | link:../plugin-manager` | **PASS** |
| 19 | 「源码零 import」（§8 R2） | 全仓 `packages/ test/ tooling/`（排除 node_modules/dist）grep `(from\|require\()['"]dsh-life-pack` | **零命中**（仅字符串常量 `MANAGER_PACKAGE` / 报错文案） | **PASS** |
| 20 | 「不影响 build/test」（§8 R2） | 看现网链接 + 门禁 | `packages/plugin-chef/node_modules/dsh-life-pack` = `Junction → D:\ilife\packages\plugin-manager`（`--lockfile-only` 未动 node_modules）；#9–#14 全绿 | **PASS** |
| 21 | `node_modules/.bin` = 9（§4.1） | `Get-ChildItem node_modules\.bin` | 9 条：`changeset/tsc/tsserver` × (无后缀/`.CMD`/`.ps1`) | **PASS** |
| 22 | 仓内无 `packages/*/package-lock.json` | `Get-ChildItem -Recurse -Filter package-lock.json` | `packages/` 下**零命中**（命中项全在 `.scratch/t95*` 历史草稿） | **PASS** |
| 23 | 反向对照 `OLD_PREDICATE_PASS=5 RED=1`（§5） | 用**真门禁代码**跑 12 例矩阵（§3-①） | `^0.2.0` 在旧正则下 `OLD_PASS=false`；5 个兄弟 `^0.1.0` 在旧正则下 true | **PASS** |
| 24 | `--pre` 全量模式在 `:98` 崩（§3 附注） | `node tooling/check-publish.mjs --pre` | `ERR_INVALID_ARG_TYPE … at join (node:path:513:7) at file:///D:/ilife/tooling/check-publish.mjs:98:165` / `MARK_FULL=1` | **PASS（复现）**；归因见 §3-③ |
| 25 | changesets CLI 已损坏（§1.1 依据） | `pnpm changeset:status` | `Error: Cannot find module '@changesets/errors'` / `MARK_CS=1` | **PASS** |
| 26 | 版本号口径 = `semver.inc(旧版, minor)`（§1.1 依据） | 我自己聚合 53 个 changeset 的 bump 类型 | `base-paint n=9 minor=9`、`skill-calorie n=21 minor=16 patch=5`、`dsh-calorie n=6 minor=1 patch=5`、`dsh-life-pack n=2 minor=2` → top 全为 `minor`；旧版 0.1.0/0.1.1/0.1.6 → 0.2.0 **一致** | **PASS**（但见 FX-R3-2） |
| 27 | 本票未 `npm publish` / 未危险 git | `git reflog`、`git status --short` | 审查窗口内无本票新 commit；工作树 clean；registry 上 `base-paint` 仅 `0.1.0`、`skill-calorie` 仅 `0.1.0/0.1.1`、`dsh-calorie` 仅到 `0.1.6` → 三包 0.2.0 **未发布** | **PASS** |
| 28 | 新增断言「比 `/^\^\d+\.\d+\.\d+$/` 强、零版本号硬编码」（§1.3 / commit message） | 读 `tooling/check-publish.mjs:83-95` + 真码矩阵 | 代码内无任何具体版本号字面量；矩阵见 §3-①（`^0.9.9` 红） | **PASS（但「同版本线」只到 major.minor，见 FX-R3-4）** |
| 29 | 收尾干净（协议 §3.1） | `git status --porcelain` | 空 | **PASS** |

**复验小结**：29 条断言中 **29 条 PASS**，无 FAIL、无 UNKNOWN。作者的自报门禁结论、变异自证、测试 delta、锁文件 frozen 校验**全部独立复现成立**。

---

## 2 变异自证（我自己做的一遍）

脚本 `.scratch/t123review-R3/mutation2.ps1` + `mutate.mjs`，单次持锁区内完成；日志 `run-mut-before.log` / `run-mut-red.log` / `run-mut-after.log`。

```
LOCK_ACQUIRED=2026-09-09T13:26:06.0648124+08:00
SHA_BEFORE=A0C2349BEE0C83F2D994033C29713E52209B35EA2B8341F44961FCB973D2DB26
MARK_BEFORE=0
MUTATED=^0.1.0|^0.1.0
MUT_BOM=false
MUT_BYTES=1239
MARK_MUT_RED=1
SHA_RESTORED=A0C2349BEE0C83F2D994033C29713E52209B35EA2B8341F44961FCB973D2DB26
SHA_RESTORED_EQ=True
GIT_DIRTY_AFTER=[]
MARK_AFTER=0
LOCK_RELEASED=2026-09-09T13:26:09.1432125+08:00
```

红的两条签名（`run-mut-red.log`，与作者摘录逐字一致）：

```
FAIL: dsh-calorie 的 dsh-life-pack 范围「^0.1.0」与工作区版本 0.2.0 的 major.minor 不一致
FAIL: dsh-calorie 的 skill-calorie 范围「^0.1.0」与工作区版本 0.2.0 的 major.minor 不一致
check-publish --pre：2 处红
[ELIFECYCLE] Command failed with exit code 1.
```

还原校验：`SHA_RESTORED_EQ=True`（与 `SHA_BEFORE` 全等）、`git status --porcelain` 为空、无 BOM（`MUT_BOM=false`）。
**中途教训（记账）**：第一次尝试用 `node -e "…\"…\""` 内联变异，PowerShell 5.1 的 `\"` 不是转义符 → 变异未生效（`MARK_MUTATE=1`、红判据 `MARK_MUT_RED=0` 是**假绿**）。改为 `.mjs` 文件后重跑才得到上表。**这条本身是审查方法学教训：变异自证必须回读变异后的值（`MUTATED=…`）再信「红/绿」结论。**

---

## 3 反事实与推翻尝试

### ① 试图推翻「新断言真的比旧断言强」→ 用真门禁代码跑 12 例矩阵

手法：`%TEMP%` 建仓外镜像（拷 `tooling/check-publish.mjs` 本体 + `git show HEAD:` 出的全部 `packages/*/package.json`），逐个候选 range 改写 `plugin-calorie` 的 `dsh-life-pack` 与 `skill-calorie`，跑**真脚本** `node tooling/check-publish.mjs --pre --only dsh-calorie,skill-calorie`，记 exit（日志 `run-range-probe.log`，镜像已清 `CLEANED_EXISTS=false`）。

| range | 新门禁 exit | 新门禁判定 | 旧谓词 `/^\^0\.1\./` |
| --- | --- | --- | --- |
| `^0.2.0` | 0 | PASS | **false**（旧门禁会红 = 本票要修的那件事） |
| `^0.2.9` | 0 | **PASS** | false |
| `^0.1.0` | 1 | FAIL（major.minor 不一致） | true |
| `^0.9.9` | 1 | FAIL（major.minor 不一致） | false |
| `^0.20.0` | 1 | FAIL | false |
| `^1.2.0` | 1 | FAIL | false |
| `~0.2.0` / `0.2.0` / `^0.2` | 1 | FAIL（非 `^major.minor.patch` 形态） | false |
| `>=0.2.0 <0.3.0` | 1 | FAIL（形态） | false |
| `workspace:^0.2.0` | 1 | FAIL ×3（含 `:102` workspace: 外泄） | false |
| `^0.2.0-beta.1` | 1 | FAIL（形态） | false |
| 缺声明 | 1 | FAIL `未声明 dsh-life-pack` | n/a |

**结论**：`^0.9.9`、`^0.20.0`、`^1.2.0` **无法绕过**；`^0.2.0` 通过是**预期值**（正是旧正则误杀的那个值）。作者在 §1.3 拿 `/^\^\d+\.\d+\.\d+$/` 做对照（会放行 `^9.9.9`）——该说法成立。但**与旧谓词不是单调强弱关系**：旧谓词钉死 `0.1.x`、放行 `^0.1.9` 却杀 `^0.2.0`；新谓词钉死「工作区版本线」、放行 `^0.2.9`。`caret major.minor == 工作区 major.minor` **在 0.x 语义下是正确判据**（0.x 的 caret 本来就锁 minor，`^0.2.0 ≡ >=0.2.0 <0.3.0`），唯一漏洞是 patch 未比 → FX-R3-4。

### ② 试图推翻「5 兄弟翻 registry 与本次改动无关」→ 仓外镜像 A/B 对照

手法：`.scratch/t123review-R3/mirror.mjs`，两个镜像都用 **HEAD 现 manifest** + 当前锁文件，只差一个变量（日志 `run-mirror.log`）：

| 变体 | 变量 | `pnpm install --lockfile-only` exit | 5 兄弟 importer | plugin-calorie importer |
| --- | --- | --- | --- | --- |
| A（现状） | `plugin-manager` 0.2.0 | 0 | `^0.1.0 | version: 0.1.1` × 5（`SIB_REGISTRY_COUNT=5`） | `^0.2.0 | link:../plugin-manager` |
| B | **只**把 `plugin-manager` 版本改回 0.1.1 | 0 | `^0.1.0 | link:../plugin-manager` × 5（`SIB_LINK_COUNT=5`） | `^0.2.0 | version: 0.2.0`（registry） |

**结论**：唯一决定变量是 **`packages/plugin-manager` 的工作区版本（0.2.0）vs 兄弟包声明 `^0.1.0`**；把 `plugin-calorie` 提到 `^0.2.0` 反而让它**回到** `link:`。作者 §4.2 的因果结论**独立成立**。（附带发现：变体 B 下 `plugin-calorie` 会翻成 registry `0.2.0`——说明 `pnpm-workspace.yaml:7 linkWorkspacePackages: true` 只对**满足 range** 的依赖建 link，其 `:6` 注释「锁文件永保 link:」现已被推翻。）

### ③ 试图推翻「`:98` 崩不是本票引入」→ blame / log -S / diff 三路

```
git blame -L 96,100 --date=short tooling/check-publish.mjs
  967d08fe (王辰浩 2026-09-07  98)   const names = SCOPE ? [...SCOPE] : readdirSync(join(root,'packages'), {withFileTypes:true})…
git log --oneline -S "readdirSync(join(root, 'packages'), { withFileTypes: true })" -- tooling/check-publish.mjs
  967d08f feat(48): 卡路里样板线落地…
```

`ca46495` 对 `check-publish.mjs` 只有两个 hunk（`@@ -70,6 +70,30 @@` 新增函数、`@@ -81,10 +105,8 @@` 换调用），**均不含 `:98`**。且该行逻辑与版本无关：`SCOPE` 为空时必然走到 `join(root,'packages', <Dirent>, …)`。**结论：既有缺陷，本票未引入、也未加剧**（`pnpm publish:pre` 恒带 `--only`，走 `SCOPE` 分支）。作者 §8 R1 记账准确。

### ④ 试图推翻「`pnpm test` delta=0」→ 换一套独立脚本 + 查基线可信度

自写 `.scratch/t123review-R3/test-delta.mjs`（同样只取末尾 `✖ failing tests:` 小节的叶子项、去重、去 CR）→ `FAIL_NOW=21 BASELINE=21 ADDED=0 FIXED=0 DELTA_EMPTY=true`。**额外反事实**：若基线被篡改（把新增失败塞进基线），`ADDED` 会假 0 —— 查 `.scratch/t75/baseline-failing.txt` mtime = `2026/9/9 6:08:29`（早于本票 6.5 小时）、21 行、且 21 条名字全部落在既有失败族（envelope 契约 / client classic 执行 / 纯度门），无本票改动文件相关条目。**结论：delta 判定可信**。

### ⑤ 试图推翻「装上即用」→ 发布态可解析性

```
npm view "base-paint@^0.2.0" version   → npm error 404 No match found for version ^0.2.0
npm view "skill-calorie@^0.2.0" version → npm error 404 No match found for version ^0.2.0
npm view dsh-life-pack versions         → ["0.1.0","0.1.1","0.2.0"]   ← 已满足 ^0.2.0
```

⇒ `pnpm publish:tarball --only …` 我复跑 **PASS**（`run-tarball-window.log`：skill-calorie 含 `dist/cli/cmd_read.js` + 6 件模板；dsh-calorie 含 `dist/index.js` + `cordis.patch.yml`）；`--tmp-hygiene` **PASS**。但 CI 的 `--fresh-tmp --only skill-calorie`（`ci.yml:80`）在 `base-paint@0.2.0` 上架前**必然 ETARGET 红**——这是**发版顺序的预期态**（作者 §8「未做」已记 publish:fresh 待 registry 有新版本），不是本票缺陷，但**发版必须严格按 base-paint → skill-calorie → dsh-life-pack → dsh-calorie**（`pnpm publish:plan` 我复跑 exit 0，输出该顺序）。

---

## 4 缺陷清单

> 分级：**S1** = 发版后腿挂 / 损坏仓库；**S2** = 结论或设计有错但可补救；**S3** = 表述 / 完备性。
> **本票 0 条 S1。**

### FX-R3-1（S2）新门禁的「同版本线」不变量与仓内 5 个兄弟单品的 `^0.1.0` 直接冲突，且测试反向钉死

- 位置：`tooling/check-publish.mjs:83-95,105-110` ↔ `packages/plugin-{bill-ilife,chef,home-ilife,memo-ilife,schedule-ilife}/package.json`、`test/plugin-p10-boundaries.test.mjs:34-39`、`test/plugin-p10-install.test.mjs:43-46`。
- 证据（我的命令与输出）：
  ```
  node tooling/check-publish.mjs --pre --only dsh-chef,skill-chef
  OK: dsh-chef 无 workspace: 外泄
  FAIL: dsh-chef 的 dsh-life-pack 范围「^0.1.0」与工作区版本 0.2.0 的 major.minor 不一致
  check-publish --pre：1 处红        MARK_CHEF=1
  ```
  而 `test/plugin-p10-boundaries.test.mjs:41` 的注释与 `:36` 的 `rangeOf()` 明确要求这 5 包**保持** `^0.1.0`。⇒ **门禁与测试编码了互相矛盾的不变量**；今天只因 `publish:pre` 恒带 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint`（`PLUGINS.filter(inScope)` 只剩 `dsh-calorie`）而未暴露。
- 影响：不阻塞本票发版窗口（窗口内 4 包全绿）；但任何一次扩围 / 去掉 `--only`（CI 注释 `ci.yml:58` 明说「复制到其余 5 对后去掉 `--only` 跑全量」）就会红，届时会被误判为「新门禁坏了」。反过来，这 5 包**确实**带着与 `dsh-life-pack@0.2.0` 不一致的 range（registry 上 `dsh-chef@0.1.0` 的 `client.js` 同样缺 `ilife.config-tab` 槽），即**新门禁抓到的是一类真实缺陷**。
- 最小修复（二选一，都 ≤ 10 行）：
  1. **记账式**（推荐给本票）：在 `t123-release-prep.md` §8 追加一行「新门禁 `assertSameVersionLine` 的适用范围 = 发版窗口内插件；窗口外 5 单品 `^0.1.0` 是**已知门禁红**，需开票随各自发版窗口提到 `^0.2.0`」，并在 `check-publish.mjs:83` 的注释里写明该前提。
  2. **根治式**（跨票）：把 5 单品的 `dsh-life-pack` 提到 `^0.2.0`，同步 5 个 `packages/plugin-*/test/smoke.test.mjs:29/32` 的 `/^\^0\.1\./` 与两张映射表 —— 顺带让锁文件 5 条 importer **自动回到 `link:`**。

### FX-R3-2（S2）手工 bump 与 53 个未消费 changeset 冲突：一旦 `changeset version` 能跑，版本会变 `0.3.0`

- 位置：`docs/research/t123-release-prep.md:303`（偏离 #3「未删任何 changeset」）↔ `tooling/publish-chain.mjs` 的 `--plan` 提示「changeset 定版后跑」。
- 证据（我的命令与输出，`.scratch/t123review-R3/changeset-agg.mjs`）：
  ```
  base-paint     n=9  major=0 minor=9  patch=0 | top=minor | workspace=0.2.0 | changeset-would-bump=0.3.0
  dsh-calorie    n=6  major=0 minor=1  patch=5 | top=minor | workspace=0.2.0 | changeset-would-bump=0.3.0
  dsh-life-pack  n=2  major=0 minor=2  patch=0 | top=minor | workspace=0.2.0 | changeset-would-bump=0.3.0
  skill-calorie  n=21 major=0 minor=16 patch=5 | top=minor | workspace=0.2.0 | changeset-would-bump=0.3.0
  CHANGESET_COUNT=53
  ```
  即：作者按「**旧版** + minor」算出的 0.2.0 是对的，但 changeset 未消费 ⇒ 在**已 bump 的 0.2.0** 之上再 minor 就是 0.3.0；届时三条 range `^0.2.0` 与工作区 0.3.0 不一致。**不会静默**——新门禁会立刻红（这恰是 FX-R1-10 修好后的正向收益）。
- 影响：`changeset version` 目前**跑不起来**（`Cannot find module '@changesets/errors'`，我复现 exit 1），所以今天无实害；但「修好 CLI 后按 publish-chain 提示跑」会得到与发版计划不同的版本号，需返工。
- 最小修复：在发版走查单里加**硬闸门**「窗口内 4 包的 changeset 必须先删/标记已消费，或**禁止**跑 `changeset version`（版本号以手工 bump 为准）」，并在 `publish-chain.mjs --plan` 输出里把「changeset 定版后跑」改成「本窗口版本已手工定版，勿跑 changeset version」。

### FX-R3-3（S2）`dist/client.js`（面板产物）不被任何门禁断言，而 `pnpm build` 根本不产出它

- 位置：`tooling/check-publish.mjs:138-145`（`gateTarball` 对 PLUGINS 只断言 `dist/index.js` + `cordis.patch.yml`）；`packages/plugin-calorie/tsconfig.json`（`"exclude": ["src/client.ts"]`）；`packages/plugin-calorie/package.json`（`build:host = tsc -b`，`build:client = tsdown`）。
- 证据（我的命令与输出）：
  ```
  Select-String tooling/check-publish.mjs -Pattern 'client\.js'   → 零命中
  packages/plugin-calorie/dist/  → index.js mtime 13:05:39，client.js mtime 13:21:52（两者不同源）
  npm pack --dry-run（plugin-calorie）→ 13.9kB dist/client.js 由 files:["dist"] 带入
  node tooling/check-publish.mjs --tarball --only dsh-calorie,… → PASS（未看 client.js）
  ```
- 影响：本票**做对了**（偏离记账 #2 已重建 client.js，我验证 `dist/client.js` 内 `PLUGIN_VERSION/SKILL_VERSION = 0.2.0`）。但门禁对「tarball 缺面板产物」零覆盖：若发版只跑 `pnpm build`（tsc -b，不含 client），`npm pack` 出的 `dsh-calorie` 将缺 `dist/client.js` 而**四条门禁全绿**。作者只记了「不重建 → 面板显示旧版本号」，未记「门禁绿也可能发出缺面板产物的包」。
- 最小修复（1 行）：`gateTarball()` 的 PLUGINS 循环追加
  `if (!out.includes('dist/client.js')) fail(p + ' tarball 缺 dist/client.js（面板产物只由 tsdown 产出）'); else ok(p + ' tarball 含 dist/client.js');`

### FX-R3-4（S3）`assertSameVersionLine` 只比 major.minor，不比 patch：`^0.2.9` 会通过，而它并不包含工作区 0.2.0

- 位置：`tooling/check-publish.mjs:87-93`。
- 证据：§3-① 矩阵行 `^0.2.9 | 0 | PASS`。
- 影响：`^0.2.9` 既不满足工作区 `0.2.0`（pnpm 会退回 registry 解析，正是本票 §4.2 的翻车机制），也与「同版本线」的意图相悖；另外对 `major ≥ 1` 会**过严**（`^1.2.0 ≡ >=1.2.0 <2.0.0` 本可含 1.3.0，却因 minor 不等被判红）。当前全仓皆 0.x，无即时影响。
- 最小修复：判据换成 `semver.satisfies(want, range)`（需引 semver，与仓库「零依赖」取向冲突）或保持零依赖的 `if (m[3] !== '0') fail(...)`（要求 patch 必须是 0）——后者最省。

### FX-R3-5（S3）三处 range 中的 `skill-calorie → base-paint` 无任何门禁/单测覆盖

- 位置：`tooling/check-publish.mjs:105-110`（`gatePre` 只遍历 `PLUGINS`，`SKILLS` 的 `base-paint` 不查）；`test/**`。
- 证据：`Select-String test\*.mjs,packages\*\test\*.mjs -Pattern 'base-paint' | Where Line -match '\^0\.'` → **零命中**。
- 影响：本票第 3 处 range（`skill-calorie:22` 的 `^0.2.0`，由并发提交 `42a5b49` 落地、本票锁文件同步）**回退成 `^0.1.0` 也不会有人红**。这是「三处 range」验收条款里唯一没有机器守卫的一处。
- 最小修复（3 行）：`gatePre()` 末尾追加 `for (const s of SKILLS.filter(inScope)) assertSameVersionLine(s, 'base-paint', (pkgJson(s).dependencies || {})['base-paint']);`

### FX-R3-6（S3，非本票）仓内出现 npm 型安装残留（协议 §2.1 规则 1 的 S1 级违规，属**其它 session**）

- 位置：`packages/plugin-calorie/node_modules/.package-lock.json`（6269 B，`LastWriteTime 2026/9/9 13:21:46`，`lockfileVersion: 3`，`"name":"dsh-calorie","version":"0.2.0"`，条目指向 `../../node_modules/.pnpm/...`）；同目录 `dist/` mtime `13:21:52`。
- 证据：本票 commit 时间 `12:58:28` ⇒ **非本票**；`git check-ignore` 命中 `.gitignore:1:node_modules/` ⇒ 不入 git、不影响 tarball（`npm pack` 排除 node_modules）与四门禁（我复跑全绿）。
- 处置：按任务书「发现异常**停下报告**、不要自行清理他人文件」→ **仅报告，未删除**。请编排者确认 13:21 的 `packages/plugin-calorie` 操作者身份并核销；若确认是仓内 `npm install`，按协议 §6 记 S1 违规（另：根 `node_modules/.package-lock.json` **不存在**，说明未污染共享根，`.bin` 仍为 9）。

---

## 5 评分表

被审交付物 = **C1（`ca46495` + `docs/research/t123-release-prep.md`）**。五轴（权重 35/25/20/10/10）：

| 轴 | 权重 | 得分 | 判据 |
| --- | --- | --- | --- |
| 事实准确性 | 35 | **33** | 29/29 条关键断言独立复现成立（§1）。扣 2：commit message 与 §1.3 把新断言描述为「保留同版本线语义」而未标注**只到 major.minor**（FX-R3-4）；§4.1 断言「`node_modules` 未动」属实但未点明 `packages/*/node_modules` 的 link 仍存在（现网才使「不影响 build/test」成立）。 |
| 证据可复现 | 25 | **23** | 命令原文 + exit code + 日志名 + 环境元组（PS 5.1.26100.9168 / Node v24.19.0 / pnpm 11.8.0）+ 持锁区间起止时间 + 内联复跑脚本（§7.1–7.3）齐备；`pnpm test` 的 delta 脚本内联可复跑。扣 2：未给 commit 自身 sha 的 `git rev-parse` 锚点；未跑/未记 `--tarball`、`--tmp-hygiene`（CI 会跑的两条）。 |
| 结论完整性 | 20 | **16** | 版本 / range / 门禁 / 常量 / 4 处测试断言 / 版本串 / 锁文件 / 变异 / delta / 三条风险均覆盖。漏 4 项：新门禁与 5 兄弟的**矛盾不变量**（FX-R3-1）、changeset 未消费→0.3.0 冲突（FX-R3-2）、`dist/client.js` 门禁盲区（FX-R3-3）、`base-paint` range 无守卫（FX-R3-5）。 |
| 与票面一致 | 10 | **9** | 与 #123 发版窗口（三包 0.2.0、自底向上 base-paint→skill-calorie→dsh-calorie）、「禁 workspace:」、「已发布正式号 + 本地 link」口径一致；偏离 3 条均自曝记账。扣 1：未把「5 兄弟不在窗口内」这一范围约束与**新门禁的全局语义**对齐。 |
| 风险识别 | 10 | **7** | 识别 R1（`:98` 既有崩）、R2（5 兄弟锁文件翻 registry，含根因与两条处置选项）、R3（手工 bump vs changeset）。漏：FX-R3-1、FX-R3-2、FX-R3-3 三类（尤其 client.js 门禁盲区属「装上即用」风险）。 |

**综合分 = 33 + 23 + 16 + 9 + 7 = 88 / 100**
**S1 缺陷数 = 0**
**判定门槛（≥85 且无 S1）→ PASS**

---

## 6 两条待裁决项：我的建议

### 待裁决 1：锁文件把 5 个兄弟单品的 `dsh-life-pack` 从 `link:../plugin-manager` 翻成 registry `0.1.1`

**我的独立核实（全部成立）**：

1. **与本次改动无关** —— 成立，且我做了**更强**的因果实验（§3-② A/B 镜像）：唯一决定变量是 `plugin-manager` 工作区版本 0.2.0 vs 兄弟声明 `^0.1.0`；把 `plugin-manager` 改回 0.1.1，5 条 importer 立刻回到 `link:`。
2. **源码零 import** —— 成立，我用 `(from|require\()['"]dsh-life-pack` 扫 `packages/ test/ tooling/`（排除 node_modules/dist）**零命中**，只有字符串常量与报错文案。
3. **不影响 build/test** —— 成立，但**有条件**：当前 `packages/plugin-chef/node_modules/dsh-life-pack` 仍是 `Junction → D:\ilife\packages\plugin-manager`（`--lockfile-only` 不动 node_modules），且根测试是直接 `import '../packages/plugin-manager/dist/install.js'`，不经 node_modules。干净 CI 安装会给这 5 包 registry `0.1.1`——仍不影响 build/test，但**改变了这 5 包的安装态语义**。
4. 新发现：`pnpm-workspace.yaml:6` 的注释「锁文件永保 link:」**已被推翻**（该注释的成立前提是「声明的 range 覆盖工作区版本」）。

**我的裁决建议：接受（不改 `linkWorkspacePackages`），但必须补两项记账/开票**：

- **不要**改 `linkWorkspacePackages: deep`。理由：`deep` 会无视 range 强行 link，把「5 包声明的 `^0.1.0` 根本不覆盖工作区 0.2.0」这个**真实偏差**藏进锁文件里，正是 FX-R3-1 里新门禁要抓的东西；用它等于「为了让门禁/锁文件好看而掩盖版本偏斜」。
- **接受本票现状**：`--only` 范围内 4 包全绿、锁文件 frozen 通过、build/test 不受影响；这 5 包的 range 不在本票写路径（协议 §1 路径所有权）。
- **必须开票（建议与本窗口同批）**：把 5 单品的 `dsh-life-pack` 提到 `^0.2.0`（含 5 个 `packages/plugin-*/test/smoke.test.mjs` 与两张映射表），一步同时消解 FX-R3-1 的门禁红与锁文件翻法；顺带修 `pnpm-workspace.yaml:6` 的过期注释。若本窗口来不及，则至少在 `t123-release-prep.md` §8 把「这 5 条 importer 是已知偏斜、门禁在全量口径下会红」写进**发版走查单的检查项**。

### 待裁决 2：`node tooling/check-publish.mjs --pre`（无 `--only`）在 `:98` 崩于 `Dirent` → `path.join`

**我的裁决：既有缺陷，非本票引入；本票记账准确，无需返修，但建议单开 1 行修复票。**

- 复现（我跑的）：`ERR_INVALID_ARG_TYPE … at join (node:path:513:7) at file:///D:/ilife/tooling/check-publish.mjs:98:165`，`MARK_FULL=1`。
- 归因（三路一致）：`git blame -L 96,100` → `967d08fe (2026-09-07)`；`git log -S "readdirSync(join(root, 'packages'), { withFileTypes: true })"` → 仅 `967d08f`；`ca46495` 对 `check-publish.mjs` 的两个 hunk 均不含 `:98`。
- 另一处**未被任何人记账**的隐患（我实测）：即使把 `d → d.name` 修好，`:98` 之后还会撞第二个既有 bug —— `packages/` 下有 `plugin-bill`、`plugin-home`、`plugin-memo`、`plugin-schedule`、`skill-memo` 五个**没有 `package.json`** 的目录，`readFileSync` 会 `ENOENT`。建议修复票一次修两处：
  `readdirSync(join(root,'packages'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).filter((n) => existsSync(join(root,'packages',n,'package.json'))).map((n) => JSON.parse(readFileSync(join(root,'packages',n,'package.json'),'utf8'))).filter((j) => j && j.name && !j.private).map((j) => j.name)`
- 与 `pnpm publish:pre` 无关：脚本恒带 `--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint`，走 `SCOPE` 分支（我复跑 exit 0）。

---

## 7 并发合规结论

| 检查项 | 我的命令 | 结果 | 判据 |
| --- | --- | --- | --- |
| 持锁执行 build/test/install | 锁协议包裹（`gates.ps1` / `mutation2.ps1` 的 `while` 抢锁 + `finally` 释放） | `LOCK_ACQUIRED=13:25:18.668 → LOCK_RELEASED=13:25:49.275`；`LOCK_ACQUIRED=13:26:06.065 → LOCK_RELEASED=13:26:09.143` | **PASS** |
| 持锁区外不跑重命令 | 阅读/编辑/`git status`/grep 均未持锁 | — | **PASS** |
| 长命令落盘 + 打 exit 标记 | 全部 `Out-File -Encoding utf8` + `MARK_*=$LASTEXITCODE` | `.scratch/t123review-R3/run-*.log` 21 份 | **PASS** |
| 终端使用 | 单 sidebar 终端 `t123-review-R3`（uuid `8a8ac0ae-6627-4d48-9f2c-8eebd80e9953`） | 收尾 `terminal_close` | **PASS** |
| 仓内 install | 全仓无 `npm/pnpm install` 由我执行；唯一 install 在 `%TEMP%` 镜像（A/B 与 range 探针），镜像自带最小 `package.json`、用后即清 | `CLEANED_* EXISTS=false` ×3 | **PASS** |
| `node_modules/.bin` | `Get-ChildItem node_modules\.bin` | **9**（与基线一致） | **PASS** |
| 仓内临时残留 | `ilife-*` 目录扫描（仓根 + `.scratch/`） | 零残留；`--tmp-hygiene` PASS | **PASS** |
| `git status` 污染 | `git status --porcelain` | 空（我的报告写入前） | **PASS** |
| 危险 git | 未执行 `stash/checkout/reset/clean/restore`、未切分支、未 commit/push | 变异自证用 `Copy-Item` 备份还原，非 git 操作 | **PASS** |
| 异常发现（他人在场） | `packages/plugin-calorie/node_modules/.package-lock.json`（13:21:46） | **已报告，未清理**（FX-R3-6） | 待编排者核销 |

---

## 8 与编排者/第一轮结论的不一致之处

1. **第一轮闭包未登记「新门禁 vs 5 兄弟 `^0.1.0`」的矛盾**：R1 FX-R1-10 只要求把谓词改成「major.minor 与本地版本比对」，未指出该改动一旦落地，就会把 5 个**有意保留 `^0.1.0`** 的兄弟包判红。C1 忠实执行了 FX-R1-10，于是把这个矛盾带进仓库（FX-R3-1）。**修法建议见 §6 待裁决 1。**
2. **第一轮 R2 FX-R2-8 已指出 `^0.2.0` 与 `>=0.2.0 <0.3.0` 是同一条规范化区间（伪选项）** —— 我的 range 矩阵进一步证实：新门禁把 `>=0.2.0 <0.3.0` 判**红**（形态不符），所以「保持零依赖」与「接受区间写法」不可兼得；C1 选择只认 `^major.minor.patch` 是对的，但应在文档里显式写「本门禁不接受区间写法」。
3. **闭包计划「发版前 `pnpm test` 失败集 delta 为空」这条验收**：我复跑成立（21/21/0/0），但需注意 `pnpm test` 的 21 条既有失败里，**6 条是 envelope 契约、12 条是 5 兄弟 client 纯度**——它们与 `dsh-life-pack@0.1.1` 版本偏斜同源。若本窗口把 5 单品 range 提到 `^0.2.0`（§6 建议），这 12 条**可能**转绿，届时基线需要重取，否则 `FIXED>0` 会被误读为「修好了不该修的」。
4. **对编排者「锁文件永保 link:」的期望**：`pnpm-workspace.yaml:6` 的这条注释已被本票锁文件推翻（§3-② 变体 A），请以「link 的前提是 range 覆盖工作区版本」更新该注释。

---

## 9 未确证 / UNKNOWN

| 项 | 为什么现在无法判定 | 用什么命令能判定 |
| --- | --- | --- |
| 真机（junction profile）面板版本行是否显示 `0.2.0` | 需 GUI 真机，本审查为只读仓内取证 | 按走查单装 junction profile 后截图面板版本行（C1 §2 已给 `dist/client.js` 命中证据，但那是产物层而非真机层） |
| `--fresh-tmp --only skill-calorie`（CI `ci.yml:80`） | 依赖 registry 上 `base-paint@0.2.0`，当前 404 | `npm view base-paint@^0.2.0 version` 返回版本后再跑 `node tooling/check-publish.mjs --fresh-tmp --only skill-calorie` |
| 13:21 那次 `packages/plugin-calorie` 操作是否含仓内 `npm install` | 只有产物证据（`.package-lock.json` + `dist` mtime），无操作者日志 | 查该 session 的终端记录/`.scratch/*/` 日志；`git reflog` 已排除提交 |
| `changeset version` 实际会算出的版本 | changesets CLI 当前损坏（`Cannot find module '@changesets/errors'`） | 修好依赖后 `pnpm changeset status --output` / 干跑 `changeset version` |

---

**审查者签名**：R3（第二轮）｜锚点 `ca46495`｜综合分 **88**｜S1 = 0｜**PASS**
