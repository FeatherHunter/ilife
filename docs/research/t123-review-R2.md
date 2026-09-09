# #123 发版窗口 — 对抗式审查 R2（可复现与合规）

> 审查者：R2（可复现与合规）。仓库 `D:\ilife`，只读审查。
> 取证窗口：**2026-09-09 12:42–12:48（+08）**。取证期间 HEAD **发生 4 次移动**：`dfd4db6` → `42a5b49`(12:41:11) → `336a6e0`(12:42:38) → `f4d57ba`(12:42:51)；本报告结论以 **`f4d57ba`** 为准。
> 版本元组：`skill-calorie@0.1.1` / `dsh-calorie@0.1.6` / `base-paint@0.1.0` / `dsh-life-pack@0.2.0`；Node `v24.19.0`、npm `10.9.2`、pnpm `11.8.0`、Windows PowerShell `5.1.26100.9168`（`pwsh` 工具与 sidebar 终端同版本，实测）。
> 我的写入面：仅 `docs/research/t123-review-R2.md` 与 `.scratch/t123review-R2/**`；安装态实证全部落 `$env:TEMP\ilife-t123rev2-687457`（先写最小 `package.json`）；未 build／未 test（故未持 `gate.lock`）；未 `npm publish`；未执行 `git stash/checkout/reset/clean/restore/commit`。
> 未读 `docs/research/t123-review-R1.md`（按硬约束）。

---

## 0 结论速览

| 项 | 结论 |
| --- | --- |
| 判定门槛 | **FAIL**（三份综合分均值 **80.5**；存在 **2 条 S1**） |
| 我推翻的断言 | **0 条**（核心事实全部复现成立）；**但我推翻了「闸门①/闸门②」与「range 现值」三条时效性断言**（闭包计划），并**发现 1 条内部自相矛盾**（诊断报告 §9.1 A4 vs §10.1/§10.3） |
| 我证实的最关键一条 | **「现在取证会假绿」成立，且比原断言更强**：真机四包全是 Junction，`skill-calorie`/`base-paint` 经 profile 内 `.dsh-module-fallback` **再套一层**仍解析进 `D:\ilife`；`dsh-calorie/dist/client.js` SHA256 真机=工作区 `5CB259AE…59714E` ≠ registry 0.1.6 `211C8622…79D7` |
| 最严重的**新增**缺陷（两个交付物均未登记） | `42a5b49` 把 `skill-calorie` 的 `base-paint` 范围改成 `^0.2.0` 却**未同步 `pnpm-lock.yaml`** → `pnpm install --frozen-lockfile` **exit 1 / ERR_PNPM_OUTDATED_LOCKFILE**，而 `.github/workflows/ci.yml` 有 **3 处** `--frozen-lockfile` → **CI 现红** |

---

## 1 逐条复验表

### 1.1 真机 junction 与「假绿」（最高优先）

| # | 被审断言（出处） | 我的命令 | 我的输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| J1 | 四包均为 Junction，前两者直指工作区（诊断 §8；prereq P-1） | `Get-Item $env:USERPROFILE\.dsh\profiles\web\node_modules\<pkg> \| Select LinkType,Target` | `dsh-calorie LinkType=Junction Target=D:\ilife\packages\plugin-calorie`；`dsh-life-pack Junction → D:\ilife\packages\plugin-manager`；`skill-calorie Junction → …\.dsh-module-fallback\node_modules\skill-calorie`；`base-paint Junction → …\.dsh-module-fallback\node_modules\base-paint`；`dsh-better-sidebar LinkType=`（真实目录） | **PASS** |
| J2 | （原断言未做）fallback 只是「非注册表安装态」 | `Get-Item …\.dsh-module-fallback\node_modules\{skill-calorie,base-paint} \| Select LinkType,Target` | `skill-calorie LinkType=Junction Target=D:\ilife\packages\plugin-calorie\node_modules\skill-calorie`；`base-paint LinkType=Junction Target=…\skill-calorie\node_modules\base-paint` | **PASS（比原断言更强：四包最终都落 `D:\ilife`）** |
| J3 | 嵌套解析也是 junction（诊断 §8） | 同 J1 于 `…\node_modules\dsh-calorie\node_modules\*` | `dsh-life-pack → D:\ilife\packages\plugin-manager`；`skill-calorie → D:\ilife\packages\skill-calorie` | **PASS** |
| J4 | 真机 `dist/client.js` 与工作区构建 SHA256 完全一致、与 registry 不同（诊断 §8） | `Get-FileHash … -Algorithm SHA256`（三处） | 真机 `5CB259AE2F68…E59714E`；工作区 `5CB259AE2F68…E59714E`；registry tarball `211C8622C83C…7779D7`（23906 B vs 13882 B） | **PASS** |
| J5 | `skill-calorie/dist/cli/cmd_read.js` 亦与工作区一致（诊断 §8） | 同上 | 真机/fallback `43058900149185C1…E7741C776C`；工作区同值；registry 0.1.1 `5B83E7B7…68AA1A` | **PASS** |
| J6 | 真机目录已有 `SKILL.md`/`templates/`（registry 0.1.1 没有）（诊断 §8） | `Test-Path`；`Get-ChildItem templates` | `SKILL.md=True`；`templates=6`；`dsh-calorie/dist/skill-provider.js=True` | **PASS** |
| J7 | profile 声明 `dsh-calorie ^0.1.5`（诊断 §8；prereq P-4） | `(Get-Content …\profiles\web\package.json -Raw \| ConvertFrom-Json).dependencies` | `"dsh-calorie":"^0.1.5"`、`"dsh-life-pack":"^0.2.0"`、`"dsh-better-sidebar":"0.18.0"` | **PASS** |
| J8 | 结论「现在取证会假绿」（诊断 §8；prereq P-1） | 由 J1–J6 合成 | 真机读到的代码/产物 = 工作区字节；「真机落盘版本与注册表一致」在解除 junction 前不可能成立 | **PASS（成立）** |

### 1.2 npm 凭据与发版前置

| # | 被审断言 | 我的命令（终端 `t123-review-R2`，落盘 `.scratch/t123review-R2/run-npm-*.log`） | 输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| A1 | `npm whoami --registry=npmjs` 401（诊断 §7） | `npm whoami --registry=https://registry.npmjs.org/ > run-npm-whoami.log 2>&1; echo MARK_WHOAMI=$LASTEXITCODE` | `npm error 401 Unauthorized - GET https://registry.npmjs.org/-/whoami`；`MARK_WHOAMI=1` | **PASS** |
| A2 | `npm profile get` E401（诊断 §7） | `npm profile get --registry=… --json > run-npm-profile.log 2>&1` | `"detail": "To correct this please try logging in again with:\n  npm login"`；`MARK_PROFILE=1` | **PASS** |
| A3 | `npm ping` 通（诊断 §7） | `npm ping --registry=… > run-npm-ping.log 2>&1` | `npm notice PONG 948ms`；`MARK_PING=0` | **PASS** |
| A4 | token 形态 `len=40` / `prefix=npm_`（诊断 §7） | 正则取 `~/.npmrc` 的 `_authToken`（**只算长度与前缀，不落值**） | `len=40 prefix=npm_`；`registry=https://registry.npmmirror.com`；`//registry.npmjs.org/:_authToken=<redacted>` | **PASS** |
| A5 | 2FA 是否必需 = UNKNOWN（诊断 §7） | 无有效凭据无法到达 publish 授权阶段 | — | **UNKNOWN（同意）**；判定命令：修好 token 后 `npm profile get` 看 `tfa` 字段 |
| A6 | `pnpm changeset status` 不可用（诊断 §1.4） | `pnpm changeset status > run-changeset-status.log 2>&1; echo MARK_CS=$LASTEXITCODE` | 日志尾部 `Node.js v24.18.1`；`MARK_CS=1` | **PASS（exit 1）** |
| A7 | `.pnpm` 内多个 `@changesets/*` 为空目录（诊断 §1.4） | `Get-ChildItem node_modules\.pnpm\@changesets+errors@0.2.0\node_modules\@changesets\errors -Force -Recurse` | **0 条**（空）；`node -e "require.resolve('@changesets/errors')"` → `MODULE_NOT_FOUND` | **PASS** |
| A8 | 仓库内 `semver` 不可解析（诊断 §1.4） | `node -e require.resolve('semver')`；ESM 动态 import | `NO_SEMVER: MODULE_NOT_FOUND`；`ESM semver fail: ERR_MODULE_NOT_FOUND`；`.pnpm\semver@7.8.5\node_modules\semver` **0 条** | **PASS** |
| A9 | 2FA/`--otp` 路径（诊断 §9.2 H2） | 未执行 | — | **UNKNOWN**（不得在无凭据下编造） |

### 1.3 两条发版前置闸门（闭包计划 §2.7）——**两条都不再成立**

| # | 被审断言 | 我的命令 | 我的输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| G1 | 闸门①：`npm publish` 打工作树；当前 t-chartfix 在 4 个文件有未提交改动 → 会被编译进 tarball；闸门命令 `git status --short -- <包目录>` 必须为空 | `git status --short`；`git status --short -- packages/base-render`；`git reflog -6`；`git show --name-status 336a6e0 f4d57ba` | `git status --short` = 仅 3 个 `?? docs/research/t123-*.md`；base-render 目录**干净**；reflog：`336a6e0 commit`、`f4d57ba commit`（12:42:38 / 12:42:51） | **FAIL（断言已过期）**：改动已在审查窗口内提交，闸门①**现在通过**；命令本身可判定 |
| G2 | 闸门②：`packages/base-render/dist/charts.js` 同时含旧 `charts-bar .charts-xlabel{font-size:10.5px}`(L1614) 与新 `9.5px`(L1623)，dist mtime `12:31:52` 早于 src `12:35:57` | `Select-String dist\charts.js -Pattern 'font-size:\s*10\.5px','9\.5px'`；`Get-Item` mtime | dist：L1614 `charts-bar .charts-xlabel{font-size:9.5px}`、L1626 同为 `9.5px`，**`charts-xlabel` 的 10.5px 命中 0**（另有 L1610/L1613 是 `charts-value-last`/`charts-mptext` 的合法 10.5px）；dist mtime `12:41:33` **晚于** src `12:35:57` | **FAIL（不可复现）**：dist 已于 12:41:33 重建，陈旧产物消失；该闸门**没有给出判定命令** |
| G3 | 闸门①的机制前提「`npm publish` 打工作树而非 git HEAD」 | `git ls-files packages/base-render/dist`；`git check-ignore -v …dist\charts.js`；`npm pack --dry-run --json --ignore-scripts`（于 `packages/base-render`） | `git_ls_files_dist=0`；`.gitignore:2 packages/*/dist/`；`PACK_BASEPAINT_FILES=69`、`PACK_HAS_DIST_CHARTS=true`、`PACK_HAS_SRC=false` | **PASS（机制成立）**：dist 不在 git 里却被打进 tarball → 打包读的是文件系统（工作树） |

### 1.4 版本计算、依赖范围与闭包

| # | 被审断言 | 我的命令 | 输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| V1 | 全仓 53 changeset / 17 包；`base-paint→0.2.0`、`skill-calorie→0.2.0`、`dsh-calorie→0.2.0`、`dsh-life-pack→0.3.0`（诊断 §1.1；闭包 §2.1） | 自写 `recompute.mjs`（独立解析 frontmatter ＋ **npm 自带真 semver** `semver.inc`） | `CHANGESET_FILES=53`；`WORKSPACE_PKGS=17`；`TARGET base-paint \| 0.1.0 \| minor \| 0.2.0`、`skill-calorie \| 0.1.1 \| minor \| 0.2.0`、`dsh-calorie \| 0.1.6 \| minor \| 0.2.0`、`dsh-life-pack \| 0.2.0 \| minor \| 0.3.0` | **PASS** |
| V2 | `skill-calorie` 21 个 changeset（16 minor ＋ 5 patch）；`dsh-calorie` 6 个（诊断 §1.2） | 同上（逐文件列举） | 16 minor ＋ 5 patch = 21；dsh-calorie 1 minor ＋ 5 patch = 6 | **PASS** |
| V3 | `^0.1.0` 解析不到 `0.2.0`（诊断 §2.2；闭包 §2.5） | `node .scratch/t123review-R2/semver-probe.mjs`（用 `D:\2Study\nodejs\node_modules\npm\node_modules\semver`） | `^0.1.0 0.1.1 satisfies=true`；`^0.1.0 0.2.0 satisfies=false`；`range=>=0.1.0 <0.2.0-0` | **PASS** |
| V4 | 三处 range 现值 `^0.1.0`（诊断 §2.1/§2.2/§2.3#3/§10.3；闭包 §2.5 第 48 行） | `read packages\skill-calorie\package.json`；`git show -s --format=%ai 42a5b49` | `packages/skill-calorie/package.json:22` = **`"base-paint": "^0.2.0"`**（已于 `42a5b49`，12:41:11 改）；plugin-calorie `:28/:29` 仍 `^0.1.0`/`^0.1.0` | **FAIL（已过期）**：两份文档仍写 `^0.1.0`，且诊断 §2.3 表「判据 = FAIL（未修）」对该行不再成立 |
| V5 | 隔离安装 `dsh-calorie@0.1.6` 落盘 `dsh-life-pack@0.1.1`（诊断 §2.2/§10.2） | `$env:TEMP\ilife-t123rev2-687457\p3-install`（最小 package.json）＋ `npm install dsh-calorie@0.1.6 --registry=npmjs` | `base-paint@0.1.0`、`dsh-calorie@0.1.6`、`dsh-life-pack@0.1.1`、`skill-calorie@0.1.1` | **PASS** |
| V6 | registry 只有 `base-paint@0.1.0`（闭包 §2.1/§2.2） | `npm view base-paint versions --json`；`npm view base-paint time --json` | `["0.1.0"]`；`0.1.0 = 2026-09-07T04:23:39.794Z` | **PASS** |
| V7 | `dsh-life-pack@0.2.0` 发布于 2026-09-08T04:03:06Z，工作区最后一个 commit `f02bf12`（16:38:42+08）晚于它（闭包 §2.6） | `npm view dsh-life-pack time --json`；`git log -1 --format='%h %ci' -- packages/plugin-manager` | `"0.2.0": "2026-09-08T04:03:06.532Z"`；`f02bf12 2026-09-08 16:38:42 +0800` | **PASS** |
| V8 | 门禁 `check-publish.mjs:84,86` 硬要求 `^0.1.x`，改 range 即变红（诊断 §2.3#4/#5） | `read tooling/check-publish.mjs`（L84/L86）；`node -e` 跑同一正则 | L84 `/^\^0\.1\./.test(dep['dsh-life-pack'])`；L86 同 `dep[skill]`；`^0.1.0 gate_ok=true`、`^0.2.0 gate_ok=false`、`^0.3.0 gate_ok=false` | **PASS**（注意：门禁只遍历 `PLUGINS`（L54），**不校验** `skill-calorie` 的 `base-paint` 范围 → `42a5b49` 的改动没触发门禁） |
| V9 | changeset 跨包耦合：`p10-plugin-scaffold.md`/`p48-client-rewire.md` 含 `dsh-life-pack` 与 5 个其它单品（诊断 §6.2 硬坑1） | 我的 `recompute.mjs` 逐文件映射 | `p10-plugin-scaffold.md :: dsh-life-pack:minor + dsh-calorie:minor + dsh-memo-ilife + dsh-schedule-ilife + dsh-home-ilife + dsh-chef + dsh-bill-ilife`；`p48-client-rewire.md :: dsh-calorie:patch + dsh-life-pack:minor` | **PASS** |
| V10 | 先例 `1519c10` 只删 1 个 changeset ＋ 改 2 个 version（诊断 §6.0） | `git show --name-status 1519c10` | `D .changeset/skill-landing-48-calorie.md`；`M packages/plugin-calorie/package.json`；`M packages/skill-calorie/package.json` | **PASS** |

### 1.5 registry 现状 vs 工作区（反事实实测，非 grep）

| # | 被审断言 | 我的命令 | 输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| R1 | registry `base-paint@0.1.0` 缺 `ACTION_ID_ATTR`/`DEFAULT_DATA_ATTR`/`HELP_COPY_ACTIONS`/`buildSharedHelpersJs`/`renderActionBar`（诊断 §10.1；闭包 §2.2） | 仓外 `p1-basepaint`：`npm install base-paint@0.1.0`＋**真实 import** | `EXPORT_COUNT=18`；`HAS_ACTION_ID_ATTR=false`（5 个全 false）；具名 import → `SyntaxError … does not provide an export named 'ACTION_ID_ATTR'`，`NAMED_MARK=1` | **PASS（导出面缺 5 个，链接期崩）** |
| R2 | 工作区 `base-paint` 已具备这 5 个符号 → 修复动作只有「发布」（闭包 §2.3） | `node probe-ws.mjs`：`import file:///D:/ilife/packages/base-render/dist/index.js` | `WS_BASEPAINT_EXPORT_COUNT=106`；`ACTION_ID_ATTR:true,DEFAULT_DATA_ATTR:true,HELP_COPY_ACTIONS:true,buildSharedHelpersJs:true,renderActionBar:true`；`ACTION_ID_ATTR=data-action-id` | **PASS** |
| R3 | `calorie-cmd-read` 静态依赖 `render/copy.js`（闭包 §2.4） | 读 dist 链 ＋ 动态 import 计数 | `dist/cli/cmd_read.js:40 import { …40 个渲染函数… } from '../render/html.js'`；`dist/render/html.js:16 from './copy.js'`；`dist/render/copy.js:18 import { ACTION_ID_ATTR, DEFAULT_DATA_ATTR, HELP_COPY_ACTIONS, buildSharedHelpersJs, renderActionBar } from 'base-paint'`；dist/cli＋dist/render 的 `import(` 计数 **0** | **PASS（无动态 import 旁路）** |
| R4 | registry `skill-calorie@0.1.1` 373 项 / 无 `SKILL.md` / 无 `templates/`（诊断 §3/§4） | 仓外重新 `npm pack skill-calorie@0.1.1`（`.tgz` 351932 B）＋ `tar -tzf` | `REG_SKILL_ENTRIES=373`、`SKILLMD=0`、`TEMPLATES=0`、`CMDREAD=1`；manifest `files=["dist"]`、`deps={"base-paint":"^0.1.0"}` | **PASS** |
| R5 | registry `dsh-calorie@0.1.6` 30 项 / 无 `dist/skill-provider.js`（诊断 §4） | 仓外 `npm pack dsh-calorie@0.1.6`（24464 B）＋ `tar -tzf` | `REG_DSH_ENTRIES=30`、`DIST=28`、`SKILLPROV=0` | **PASS** |
| R6 | registry 0.1.6 的 `dist/client.js:84` = `const inject = ["slots"];`；manifest 已含 connection（诊断 §3④/§0.8） | 解包读文件 ＋ `ConvertFrom-Json` | registry `REG_L84: const inject = ["slots"];`；工作区 `WS_L84: const inject = ["slots", "connection"];`；manifest `dsh.client.inject=["@deepseek-ai/dsh-client-ui-slots","@deepseek-ai/dsh-client-connection"]` | **PASS（manifest PASS / bundle FAIL 表述准确）** |
| R7 | 默认落盘 HTML 在工作区存在、registry 缺失（诊断 §3②） | `Select-String` 两侧 `dist/cli/cmd_read.js` | registry：`resolveDefaultHtmlPath=0`、`calorie_html=0`、`output:=0`；工作区：`2` / `3`；源码 `src/cli/cmd_read.ts:694 htmlTarget = o.output ?? o.html ?? resolveDefaultHtmlPath(...)`、`:704 { ...out.data, output: … }` | **PASS** |

### 1.6 同步点与票面一致性

| # | 被审断言 | 我的命令 | 输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| S1 | `SKILL.md` 命中 3 行 / 4 次 `0.1.1`（诊断 §5） | `Select-String SKILL.md -Pattern '0\.1\.1'` | L172、L173（2 次）、L179 → **3 行 / 4 次** | **PASS** |
| S2 | `docs/public-installer-47.md:22`、`test/skills-export-47.test.mjs:55,57` 是额外同步点（诊断 §5） | 同法 | `public-installer-47.md:22 没有可执行文件；运行时走 npm（\`skill-calorie@0.1.1\` 已发布）。`；`skills-export-47.test.mjs:55 // 版本钉死 @0.1.1…`、`:57 assert.ok(text.includes('@0.1.1'), …)` | **PASS** |
| S3 | `docs/calorie-dual-path-acceptance.md:37` 写「待发版（`skill-calorie 0.1.2` + `dsh-calorie 0.1.7`）」（诊断 §0.6） | `read docs/calorie-dual-path-acceptance.md`（offset 37） | L37：`**待发版**（\`skill-calorie 0.1.2\` + \`dsh-calorie 0.1.7\`）与真机确认（票 #56）` | **PASS** |
| S4 | 闭包计划 §3 写「SKILL.md 版本串：3 处」 | 同 S1/S2 | SKILL.md 4 次 ＋ 外部 2 文件 3 处 = **7 处**；其中 `test/skills-export-47.test.mjs` 不同步则**单测必红** | **FAIL（计数与范围都不足）** |
| S5 | §9 七条逐条覆盖（诊断 §9.3） | 对照 `docs/calorie-dual-path-acceptance.md:118-124` 逐条读 | 见 §3 缺陷 FX-R2-6：条 1 的版本元组留 `skills@?`/`opencode@?`/`dsh-life-pack@<目标>` 占位符，且全流程无 exit-code 落盘约定 | **部分覆盖** |

### 1.7 证据文件与命令可判定性

| # | 被审断言 | 我的命令 | 输出摘录 | 判据 |
| --- | --- | --- | --- | --- |
| E1 | 诊断 agent 的日志按协议 `echo MARK=$LASTEXITCODE` 落盘（协议 §2.2.1） | `Select-String .scratch\t123\*.log -Pattern 'MARK=\|EXIT=\|exit code'` | **18 个 log 全部 `mark_hits=0`**（含 `build-skill-calorie.log`、`build-dsh-calorie.log`、`install-dsh-calorie-0.1.6.log`、`changeset-status.log`） | **FAIL** |
| E2 | 诊断 §1.4 引用的 `EXIT=1` 出自 `changeset-status.log` | `Get-Content .scratch\t123\changeset-status.log -Tail 3` | 尾部为 `}` ／空行／`Node.js v24.18.1`，**无 `EXIT=` 行** | **FAIL（摘录为拼接，非原文）** |
| E3 | `git-status.log` 作为工作区未污染证据（诊断 §11.4/附录） | `Get-Item .scratch\t123\git-status.log` | 长度 **0 字节** | **FAIL（证据为空文件）** |
| E4 | 证据文件名与用途对应（诊断附录） | `Get-ChildItem .scratch\t123 -Recurse -File` | 41 个文件；`computed.log`/`changeset-map.log`/`pack-*.json`/`reg-*.tgz`/`install-*.log` 均在；**无 `run-*` 命名的 MARK 日志** | **PASS（文件齐）/ FAIL（命名与协议不符）** |

### 1.8 环境与命令可判定性附注

| # | 事实 | 我的命令 | 输出 | 判据 |
| --- | --- | --- | --- | --- |
| X1 | 诊断 §0 称「pwsh 工具与 sidebar 终端均为 PS 5.1」 | `$PSVersionTable`（工具侧与终端侧各一次） | 工具：`5.1.26100.9168 / Desktop`；终端标题 `Windows PowerShell` | **PASS** |
| X2 | 行号引用必须用 `Select-String`/read，**不能用 `Get-Content` 下标** | `(Get-Content file).Count` vs `[System.IO.File]::ReadAllLines(file).Count` | `check-publish.mjs`：GC=**271** vs RAL=**292**；`calorie-dual-path-acceptance.md`：GC=69 vs 127（`Get-Content` 在本环境**丢空行**） | **环境事实**（诊断/闭包的 `file:line` 均按 grep 编号，抽查 6 处全部正确） |

---

## 2 反事实结果（5 条，逐条「我试图这样推翻 → 结果」）

**CF-1 「registry `base-paint@0.1.0` 缺 5 个具名导出」——我试图用 `export *` 通配再导出推翻它。**
不 grep，直接在仓外 `$env:TEMP\ilife-t123rev2-687457\p1-basepaint`（先写最小 `package.json`）装 `base-paint@0.1.0` 并**真实 import**：`Object.keys(m).length = 18`，`ACTION_ID_ATTR/DEFAULT_DATA_ATTR/HELP_COPY_ACTIONS/buildSharedHelpersJs/renderActionBar` **全为 false**；`import { ACTION_ID_ATTR } from 'base-paint'` 抛 `SyntaxError: The requested module 'base-paint' does not provide an export named 'ACTION_ID_ATTR'`，exit 1。
→ **推翻失败，原断言成立。** 对照组：工作区 `packages/base-render/dist/index.js` 真实 import 得 **106** 个导出且 5 个全在（`ACTION_ID_ATTR=data-action-id`）→ 「修复动作只有发布」成立。
→ 额外旁证（**不是我推的**）：仓库自带门禁 `tooling/check-publish.mjs:202-204,222,244` 早已登记「registry 上的 base-paint 落后工作区（实测缺 `ACTION_ID_ATTR`）——版本偏斜是**真崩**」，且把 `import(<skill>/render)` 断言记为「未跑」。**该结论有先于本票的独立来源。**

**CF-2 「`calorie-cmd-read` 静态依赖 `render/copy.js`」——我试图用动态 import／条件导出推翻它。**
不读源码，直接读 **dist** 的三段静态 import：`cmd_read.js:40 → ../render/html.js`（40 个渲染函数）→ `html.js:16 → './copy.js'` → `copy.js:18 → base-paint` 的 5 个具名导出；再统计 `dist/cli/*.js` ＋ `dist/render/*.js` 里 `import(` 出现次数 = **0**。
→ **推翻失败**：不存在动态 import 旁路；ESM 链接期即解析具名导出 → 配 registry `base-paint@0.1.0` 必在 `calorie-cmd-read` 启动时崩（exit≠0）。
→ 补充一个**原文档没写**的旁路检查：`cmd_read.js:703 const invokedAsCli = (process.argv[1] ?? '').replace(/\\/g,'/').endsWith('cmd_read.js')` — CLI 入口判定与 import 链无关，不会因为「非 CLI 调用」而跳过 copy.js。

**CF-3 「`^0.1.0` 解析不到 `0.2.0`」——我试图用仓库内 semver／手写实现推翻它。**
仓库内 `semver` 确实不可用（空目录），所以我改用 **npm 自带的真实 semver 实现**（`D:\2Study\nodejs\node_modules\npm\node_modules\semver`，经 `createRequire` 载入，`SEMVER_IMPL` 已打印）：`^0.1.0` 的规范化区间是 **`>=0.1.0 <0.2.0-0`**，`satisfies('0.2.0','^0.1.0')=false`、`satisfies('0.1.1')=true`；`semver.inc('0.1.1','minor')='0.2.0'`、`inc('0.1.6','minor')='0.2.0'`。
→ **推翻失败，原断言成立**（且诊断 §1.3 用 `semverInc` 复算版本号的做法被独立验证）。

**CF-4 「三处 range 的目标值是否最优」——我试图证明闭包计划 §5.4 的三个选项是三个真选项。**
实测：`^0.2.0` 与 `>=0.2.0 <0.3.0` 的规范化区间**完全相同**（都是 `>=0.2.0 <0.3.0-0`）→ 二者不是「两个选项」，是**同一语义的两种写法**。真正可分的只有两条：
- **路线甲 `^0.2.0` ＋ 发 `base-paint@0.2.0`**：与 9 个 minor changeset 的语义一致；`42a5b49` 已经把 `skill-calorie:22` 改成 `^0.2.0`，选甲**不需要再改源码**。代价：必须发 base-paint，且必须同步锁文件（见 FX-R2-2）。
- **路线乙 发 `base-paint@0.1.1`（patch）＋ 保持 `^0.1.0`**：`^0.1.0` 自动吃到 0.1.1，第三方安装无需改 range。代价：把 9 个 minor（新增 `fillTemplate`、控件层、图表/HELP 等**新增 API**）谎报成 patch，违反 semver 与 changesets 声明；且要**回退 `42a5b49`**（写操作，需编排者裁定）。
- **路线丙 `>=0.2.0 <0.3.0`**：与甲等价，纯冗余。
→ **结论：不是三个选项，是两个；甲的「最优」成立但不是唯一，且两份交付物都**没有**给乙的利弊**（诊断 §2.3 只给甲，闭包 §5.4 把甲/丙当两选）。

**CF-5 「`npm publish` 打工作树而非 git HEAD」——我试图用「dist 在 git 里」推翻它。**
`git ls-files packages/base-render/dist` = **0**；`git check-ignore -v packages/base-render/dist/charts.js` → `.gitignore:2:packages/*/dist/`；而在 `packages/base-render` 跑 `npm pack --dry-run --json --ignore-scripts` → **69 个文件、含 `dist/charts.js`、`PACK_HAS_SRC=false`**。
→ **推翻失败**：tarball 内容来自文件系统（工作树构建产物），**完全不含 git 追踪的 src**；即 `npm publish` 的输入是磁盘上的 `files:["dist"]`，与 HEAD 无因果关系。
→ 由此**闸门①的机制成立，但闸门①的现状判断已过期**（G1）；同时给出**闸门②的缺失命令**（见 FX-R2-3）。

---

## 3 缺陷清单

| ID | 级别 | 位置 | 证据 | 最小修复 |
| --- | --- | --- | --- | --- |
| **FX-R2-1** | **S1** | 诊断报告 §9.1 A4（对照 §10.1/§10.3） | A4 写「bump 版本：skill-calorie → 0.2.0；dsh-calorie → 0.2.0；**（可选** `packages/base-render/package.json` → 0.2.0**）**」；而 §10.1 标题为「必须发」、§10.3 表格把 base-paint 列为**必须发**。若照 A4 跳过 base-render 的版本 bump：`skill-calorie@0.2.0` 声明 `base-paint: ^0.2.0` 而 registry 无 0.2.0 → 第三方 `npm install` **ETARGET**（腿2 挂）；若强行发布未 bump 的 base-paint → npm 拒绝（0.1.0 已存在） | 删掉 A4 里的「（可选 …）」，把 base-render 的 bump 写成**必做第一步**；并在 A4 后追加「`node -e require('./packages/base-render/package.json').version` → `0.2.0`」作为可判定断言 |
| **FX-R2-2** | **S1** | 仓内 `42a5b49`（release-prep 提交）＋ 诊断 §2.3 的修复表（未列锁文件步骤） | `pnpm-lock.yaml` 的 `packages/skill-calorie` importer 仍为 `specifier: ^0.1.0 / version: link:../base-render`，而 `packages/skill-calorie/package.json:22` 已是 `^0.2.0`。仓外复本实测 `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts` → **exit 1**：`[ERR_PNPM_OUTDATED_LOCKFILE] … specifiers in the lockfile don't match specifiers in package.json: * 1 dependencies are mismatched: - base-paint (lockfile: ^0.1.0, manifest: ^0.2.0)`。`.github/workflows/ci.yml` 第 28/69/103 行均为 `pnpm install --frozen-lockfile` → **CI 现红**；任何人跑一次非 frozen 的 install 都会改写锁文件（仓内写操作） | ① 把「同步 `pnpm-lock.yaml`（持锁 `pnpm install --lockfile-only` 或 `pnpm install`）＋ `pnpm install --frozen-lockfile` exit 0」登记为发版前置闸门**第 3 条**；② 诊断 §2.3 表的每一条 range 修改后都追加「锁文件同步」子项；③ 编排者持锁执行一次并留 `run-lockcheck.log`（含 `MARK=$LASTEXITCODE`） |
| **FX-R2-3** | S2 | 闭包计划 §2.7（两条闸门） | 闸门①的现状句（t-chartfix 4 个未提交改动）已被 `336a6e0`(12:42:38)/`f4d57ba`(12:42:51) 提交掉；闸门②的现状句（dist 同含 10.5px 与 9.5px、dist mtime 早于 src）已被 12:41:33 的重建消解（现 dist 只有 9.5px×2，dist mtime 12:41:33 > src 12:35:57）。两条闸门**都没有「发版时重跑」的命令**（闸门①给了 `git status --short -- <包目录>`，闸门②只写「强制重建并断言」） | 闸门①补上「`git status --short -- packages/base-render packages/skill-calorie packages/plugin-calorie` 为空 **且** `git status --short -- pnpm-lock.yaml` 为空」；闸门②写成可跑命令：`pnpm --filter base-paint build; Select-String packages\base-render\dist\charts.js -Pattern 'charts-xlabel\{font-size:10\.5px\}' → 命中 0`（持锁），并断言 `(Get-Item dist\charts.js).LastWriteTime -gt (Get-Item src\charts.ts).LastWriteTime` |
| **FX-R2-4** | S2 | 诊断 §2.1/§2.2/§2.3#3/§10.3；闭包 §2.5 第 48 行 | 两处仍写 `packages/skill-calorie/package.json:22` = `^0.1.0`；实测已是 `^0.2.0`（`42a5b49`，12:41:11）。诊断 §2.3 表「判据 = FAIL（未修）」对该行不再成立；§2.2 的 compute 输出行 `skill-calorie.dependencies.base-paint = ^0.1.0 → resolvable=false` 亦已过期（新值 `^0.2.0` 在 registry 无对应版本 → 仍是 FAIL，但**原因不同**：现在是 ETARGET 而非「解析到缺符号的 0.1.0」） | 两份文档各加一行「快照锚点：HEAD `<sha>` / `<时间>`；本表由 `node .scratch/t123/compute.mjs` 生成，改动后必须重跑」；把 §2.3 #3 从「待改」改为「已由 `42a5b49` 完成，需复核锁文件」 |
| **FX-R2-5** | S2 | 诊断 §9.1 A5（build 范围） | A5 只写 `pnpm --filter skill-calorie build` ＋ `pnpm --filter dsh-calorie build`，**不含 base-paint**；而 base-paint 的 tarball 只含 `dist/`（`files:["dist"]`，`git ls-files …/dist`=0，`npm pack` 列出 `dist/charts.js`）→ dist 陈旧即发陈旧代码。闸门②（闭包 §2.7-2）要求的「强制重建」在诊断的执行计划里没有落点 | A5 追加 `pnpm --filter base-paint build`（持锁），并追加断言「`dist/charts.js` 内 `charts-xlabel{font-size:10.5px}` 命中 0 且 dist mtime > src mtime」 |
| **FX-R2-6** | S2 | 诊断 §9.3 第 1 条映射（§9 七条之一） | 映射行写「版本元组 = `skill-calorie@0.2.0` / `dsh-calorie@0.2.0` / `dsh-life-pack@<目标>` / `skills@?` / `opencode@?` / `git rev-parse --short HEAD`」——`<目标>`、`?` 是**占位符**，而 §9-1 要求「每条证据附…版本元组＋取证日期」；且 A1–A9/H1–H6 无「落盘 exit code」的列或命令模板，实测 `.scratch/t123/*.log` 18 个文件 **0 条** `MARK=`/`EXIT=` | ① 把 `skills@?`/`opencode@?` 换成实际版本（`npm ls -g skills opencode` 或 `npx skills@latest --version`）并写进版本元组；② 每个 A/H 步骤的命令模板统一为 `… > .scratch/t123/run-<步>.log 2>&1; echo MARK_<步>=$LASTEXITCODE`，证据表增加「exit 码」列 |
| **FX-R2-7** | S3 | 诊断 §1.4 的证据摘录 | 摘录含 `EXIT=1`，但 `.scratch/t123/changeset-status.log` 尾部为 `}` / `Node.js v24.18.1`，**无 `EXIT=` 行**；`.scratch/t123/git-status.log` 为 **0 字节** | 摘录与日志逐字对齐（或明确标注「EXIT 由本次终端另取」）；`git-status.log` 重新落盘 |
| **FX-R2-8** | S3 | 闭包计划 §3（SKILL.md 3 处）与 §5.4（range 选项） | 实测 SKILL.md 为 **3 行 / 4 次**，另有 `docs/public-installer-47.md:22`、`test/skills-export-47.test.mjs:55,57`（不同步则单测必红）；`^0.2.0` 与 `>=0.2.0 <0.3.0` 经真 semver 规范化后**完全同义** | §3 改为「SKILL.md 4 处 ＋ `docs/public-installer-47.md:22` ＋ `test/skills-export-47.test.mjs:55,57`」；§5.4 把前两项合并，只保留「`^0.2.0` ＋ 发 0.2.0」vs「发 0.1.1 patch ＋ 保持 `^0.1.0`」两案并逐条给利弊 |
| **FX-R2-9** | S3 | 两份文档的元信息 | 诊断头部 `HEAD dfd4db6`（现 `f4d57ba`）；闭包计划无 HEAD/时间戳，§2.7 的两条现状句在写完 **2 分钟**内即被推翻 | 头部统一加「快照锚点：`git rev-parse --short HEAD` = `<sha>` / 取证时间 `<ISO>`」；对时效敏感的表加「重跑命令」 |
| **FX-R2-10** | S3 | 交付物（合规） | `.scratch/locks/` **空**、无锁日志；诊断 §11.1 自曝 2 次 build 未持锁（协议 §2 要求持锁）；两个 t123 文档仍为 `?? `（未提交，协议 §3.1 要求收尾干净） | ① build/test 一律走协议 §2 的锁包裹，并在证据里留「持锁区间起止时间」；② 交付物由编排者统一 `git add` 提交 |

> 说明：**未发现**任一交付物在核心事实上造假——J1–J8、A1–A9、V1–V10、R1–R7、S1–S3、G3 共 40 余条断言全部复现成立。上述 S1 中，**FX-R2-2 的直接肇事者是 `42a5b49`（release-prep 提交，不在本次被审交付物清单内）**，但两个被审交付物都**未登记**该前置闸门，属闭包缺项。

---

## 4 并发合规结论（R2 必填）

| 检查项 | 命令/方法 | 结论 |
| --- | --- | --- |
| 仓内 `npm install`／`npm ci`／`pnpm install` 痕迹（协议 §2.1，违反＝S1） | `Get-ChildItem .scratch -Recurse -Directory -Filter node_modules`（无命中）；`Get-ChildItem $env:TEMP -Directory -Filter 't123-*','ilife-t123*'` | **合规**。安装态实证全部在仓外：`t123-install`、`t123-baseprobe`、`ilife-t123-regpack`（诊断 agent）、`ilife-t123rev1-*`（R1）、`ilife-t123rev2-687457`（我）；日志 `install-dsh-calorie-0.1.6.log` 仅 `added 4 packages in 443ms`，无仓内路径 |
| `node_modules/.bin` 条目数（基线 9） | `(Get-ChildItem node_modules\.bin \| Measure-Object).Count` | **9**（`changeset`/`tsc`/`tsserver` × 3 shim），与协议 §2.1 修复后基线一致 |
| 危险 git 命令（`stash/checkout/reset/clean/restore`，协议 §3） | `Select-String .git\logs\HEAD -Pattern 'stash\|reset\|checkout\|clean\|restore'`；`git stash list` | **合规**。reflog 在本次窗口（`HEAD@{0..3}`）全为 `commit:`；命中的 checkout 记录是 2026-09-07 的历史条目；`git stash list` 空 |
| `git commit`／`push` | `git reflog -6` | 审查窗口内确有 3 次 commit（`42a5b49`、`336a6e0`、`f4d57ba`）由**其它 session** 完成（协议 §3.1 允许持锁 commit）；无 `push` 痕迹。**但它们是「移动靶」**：被审文档的 HEAD 锚点因此失效（FX-R2-9） |
| 终端输出节流（协议 §2.2.1：`… 2>&1; echo MARK=$LASTEXITCODE`，只读尾 5 行） | `Select-String .scratch\t123\*.log -Pattern 'MARK=\|EXIT='` | **不合规**：18 个 log **全部 0 命中**。日志本身命名与体量正常（最大 `run-pack-reg-skill.log` 35 KB、`pack-dry-skill-calorie.json` 44 KB，均未超长），但没有机器可读 exit 标记 |
| git 工作区污染 | `git status --short` | **无源码污染**：仅 `?? docs/research/t123-realmachine-prereq.md`、`?? t123-release-runbook.md`、`?? t123-release-window-diagnosis.md`（＋我本报告）。4 个 t-chartfix 改动已在 12:42:51 前提交 |
| 目录锁（协议 §2） | `Get-ChildItem .scratch\locks -Force`；`Test-Path .scratch\locks\gate.lock` | **空目录 / 锁不存在** → 当前无人持锁。诊断 agent 自曝 2 次 build **未持锁**（§11.1）；release-prep 自述持锁 build，但**盘上无锁日志可核**（协议只要求 `finally` 释放，未要求留痕）→ 锁纪律**不可独立核验** |
| 交付物提交状态（协议 §3.1） | `git status --short` | 两份 t123 交付物**仍未提交**（未跟踪），不满足「收尾时工作区必须干净」 |
| 我的自身合规 | — | 仅写 `docs/research/t123-review-R2.md` ＋ `.scratch/t123review-R2/**`；安装态实证落 `$env:TEMP\ilife-t123rev2-687457`（含最小 `package.json`）；**未 build/test**（故未持锁，无锁竞争）；未 `npm publish`；未危险 git；长命令均落 `run-*.log 2>&1` 且带 `MARK_*=$LASTEXITCODE`（`run-npm-whoami.log` 等） |

---

## 5 评分表

| 交付物 | 事实准确性 (35) | 证据可复现 (25) | 结论完整性 (20) | 与票面一致 (10) | 风险识别 (10) | 综合分 | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/research/t123-release-window-diagnosis.md` | 86 | 74 | 84 | 95 | 90 | **83.9 → 84** | **FAIL**（含 FX-R2-1 的 S1） |
| `.scratch/orch/t123-closure-plan.md` | 78 | 60 | 60 | 85 | 62 | **69.0 → 69** | **FAIL**（3 条时效断言失效＋漏两个阻断前置） |
| `docs/research/t123-realmachine-prereq.md`（事实核对） | 95 | 82 | 85 | 90 | 88 | **88.6 → 89** | **PASS** |
| `docs/research/t123-release-runbook.md` | — | — | — | — | — | **未评** | 超出 R2 焦点（我的被审对象是诊断／闭包／真机事实），未逐条复验，不给分以免误导 |

**判定门槛（任务书 §3）**：综合分 ≥ 85 **且** 无 S1 → PASS。本次 **三份综合分均值 80.5，且存在 2 条 S1（FX-R2-1、FX-R2-2）→ FAIL。**

扣分要点：
- 诊断报告：核心事实几乎全对、票面偏离表与风险清单质量很高；扣分在（a）执行计划内部矛盾（A4「可选」vs §10.1「必须发」）；（b）18 个日志无 exit 标记、版本元组留占位符、`git-status.log` 空文件、§1.4 摘录拼接；（c）range 现值与 HEAD 已过期且无重跑钩子。
- 闭包计划：作为「编排侧综合」它漏掉了两个**阻断级**前置（**npm token 已 401**、**真机 junction 假绿**），这两条恰恰是诊断报告的核心发现；再叠加 §2.7 两条闸门在成文 2 分钟内双双失效、§3 的 SKILL.md 计数不足、§5.4 的伪选项。

---

## 6 与编排者综合文件（`.scratch/orch/t123-closure-plan.md`）不一致之处

| # | 闭包计划的说法 | 我的复验 | 定性 |
| --- | --- | --- | --- |
| 1 | §2.5 第 48 行：`packages/skill-calorie/package.json:22` = `"base-paint": "^0.1.0"` | 实测 `^0.2.0`（`42a5b49`，12:41:11） | 事实过期（FX-R2-4） |
| 2 | §2.7-1：「当前并发 session t-chartfix 在 4 个文件有未提交改动 → 会被编译进 tarball」 | `git status --short` 现只剩 3 个未跟踪 md；改动已由 `336a6e0`/`f4d57ba` 提交 | 事实过期（FX-R2-3） |
| 3 | §2.7-2：「dist 同时含 10.5px 与 9.5px，dist mtime 早于 src」 | dist 12:41:33 重建，`charts-xlabel` 的 10.5px 命中 0，dist mtime 晚于 src | 事实过期（FX-R2-3） |
| 4 | §3「SKILL.md 版本串：3 处」 | SKILL.md 3 行/4 次；另有 `docs/public-installer-47.md:22`、`test/skills-export-47.test.mjs:55,57` | 计数与范围不足（FX-R2-8） |
| 5 | §5.4 把 `^0.2.0` 与 `>=0.2.0 <0.3.0` 当作两个候选 | 真 semver：两者规范化后同为 `>=0.2.0 <0.3.0-0` | 伪选项（FX-R2-8） |
| 6 | 全篇未提 npm 凭据（`npm whoami` 401）与真机 junction | 实测 401（A1–A4）＋ 四包全 Junction 且落回工作区（J1–J3） | **闭包缺项（阻断级前置）** |
| 7 | 全篇未提 `pnpm-lock.yaml` 同步 / CI `--frozen-lockfile` | 实测 `ERR_PNPM_OUTDATED_LOCKFILE` exit 1；`ci.yml` 3 处 `--frozen-lockfile` | **闭包缺项（S1，FX-R2-2）** |
| 8 | 全篇未提 changeset 删除的跨包耦合风险 | `p10-plugin-scaffold.md`/`p48-client-rewire.md` 含 `dsh-life-pack`＋5 单品 | 闭包缺项（诊断 §6.2 已覆盖） |
| 9 | §2.6「life-pack 工作区领先 registry 一个 commit」 | `npm view time` 0.2.0 = 2026-09-08T04:03:06.532Z；`f02bf12` = 2026-09-08 16:38:42 +0800 | **一致（我确认其成立）** |
| 10 | §2.2 registry 0.1.0 导出面清单 / §2.3 工作区已具备符号 | 真实 import 实测：registry 18 项缺 5；工作区 106 项含 5 | **一致（我确认其成立）** |
| 11 | §2.4「CLI 静态依赖 copy.js → 链接期崩」 | dist 三段静态 import ＋ 0 动态 import ＋ 门禁 L202-204 的独立旁证 | **一致（我确认其成立）** |

---

## 7 我的复现资产（`.scratch/t123review-R2/`）

| 文件 | 内容 |
| --- | --- |
| `semver-probe.mjs` / `run-semver.log` | 用 npm 自带真 semver 复核 `^0.1.0`／`^0.2.0`／`>=0.2.0 <0.3.0` 与 `inc` |
| `recompute.mjs` / `run-recompute.log` | 独立重算 changeset→包/bump/下一版（53 文件 / 17 包 / 逐文件耦合） |
| `probe-all.ps1` / `run-p1-*.log` / `run-p2-*.log` / `run-p3-*.log` / `run-p4-frozen.log` | 仓外四个探针：registry base-paint 真实 import、registry tarball 拉取、隔离安装落盘版本、**冻结锁文件校验** |
| `probe-registry.mjs`、`probe-ws.mjs` / `run-ws-baseline.log` | registry/工作区导出面真实 import ＋ `npm pack --dry-run` 取证 |
| `run-npm-whoami.log` / `run-npm-profile.log` / `run-npm-ping.log` / `run-changeset-status.log` | 凭据与 changesets CLI 现状（含 `MARK_*=$LASTEXITCODE`） |
| `skill-calorie-0.1.1.tgz` / `dsh-calorie-0.1.6.tgz` / `regsk/` / `regdsh/` | 从 registry 现拉的 tarball 与解包目录（351932 B / 24464 B，与诊断 agent 所拉同尺寸） |
