# #123 卡路里·发版走查单（维护者执行 · 2FA 发版）

- 票：[卡路里·发版窗口](https://github.com/FeatherHunter/ilife/issues/123)（父图 #64）。**agent 不发布；本单由维护者本人执行，2FA OTP 只在维护者手上。**
- 本单形态：**可一条条照着执行的走查单**（阶段式，S0–S13 共 14 阶段；每阶段给①精确命令 ②期望可观察结果 ③失败判据／中止条件 ④证据文件名与落点）。
- 执行环境：Windows + PowerShell 5.1（sidebar 终端实测 `5.1.26100.9168`）、Node `v24.19.0`、npm `10.9.2`、pnpm `11.8.0`。
- 复现约定：命令在 `D:\ilife` 下执行；`<X>` = `--registry=https://registry.npmjs.org/`（**默认源是 npmmirror，发 npmjs 必须显式加**）。
- 记号：`[HITL]` = 只有人能做的步骤（2FA OTP／`npm login`／托盘 Quit 重启／真机截图／opencode 手跑）；`[AFK]` = 可脚本化、无需人工交互。
- 快照锚点：本单修订时 `git rev-parse --short HEAD` = `f4d57ba`、取证 2026-09-09；**工作树含 C1 未提交的发版前置修复（见 §0.1）**。**所有 `file:line` 都必须用现场命令复核**（并发 session 会移动 HEAD，见 S1）。
- 证据标记：`[实测·本单 2026-09-09]` = 本单修订时现场跑过；`[转引 R1/R2]` = 审查报告实测（`docs/research/t123-review-R1.md`／`t123-review-R2.md`）；`[未验证]` = 本单未跑过，**执行时必须先跑并留 exit 码**。

---

## 0 闭包与版本：**已定案，不再二选一**

> **闭包已定案，依据诊断 §10.1／§10.3 ＋ R1／R2 复核**（`docs/research/t123-release-window-diagnosis.md` §10.1 判「base-paint 必须发」、§10.3 给最小一致发布集；R1 的 C4 独立扫 dist 裸依赖得 `{base-paint, skill-calorie, dsh-calorie}`，R2 的 V1 独立重算三包目标版本）。**本单只给这一套序列；原先的「集合 A（只发两包）／集合 B（含 base-paint）二选一」已作废**（作废理由见本节末）。

| 占位符 | 含义 | 定案值 | 依据 |
| --- | --- | --- | --- |
| `<V_BASEPAINT>` | `base-paint` 发布版本 | `0.2.0` | 诊断 §1.1／§10.3；R1 V3（9 个 minor changeset → `0.2.0`） |
| `<V_SKILL_CALORIE>` | `skill-calorie` 发布版本 | `0.2.0` | 诊断 §1.3；R1 V1／R2 V1 |
| `<V_DSH_CALORIE>` | `dsh-calorie` 发布版本 | `0.2.0` | 诊断 §1.3；R1 V2／R2 V1 |
| `<V_LIFEPACK>` | `dsh-calorie` 依赖的 `dsh-life-pack` 版本（**本次不发此包**） | `0.2.0`（registry 已发布） | 诊断 §10.3「可选发」＋R1 P2/P3：`dsh-calorie` 的 range 必须提到 `^0.2.0`，否则干净安装解析到 `0.1.1`（不含 `ilife.config-tab` 槽 → 卡路里设置页静默缺席） |

**唯一发布序列（依赖自底向上，顺序错会导致中途 `ETARGET`）：**

```
base-paint@0.2.0  →  skill-calorie@0.2.0  →  dsh-calorie@0.2.0
```

- `dsh-life-pack` **本次不发布**（它工作区 `0.2.0` 已领先 registry 一笔 `f02bf12`，且不发它不阻塞本票 —— R1 P3），但 `dsh-calorie` 的 `dsh-life-pack` 依赖范围**必须**写成 `^0.2.0` 指向 registry 已发布版。
- `base-paint` 不是可选项：`skill-calorie` 的 `render/copy.ts:18-24` 从 `base-paint` 取 5 个具名导出，registry `base-paint@0.1.0` 缺这 5 个 → ESM **链接期** `SyntaxError`，`calorie-cmd-read` 连取数都到不了（诊断 §10.1；R1 L4 用真实 `import('skill-calorie/cli')` 实测 exit 7；R2 CF-1/CF-2 独立复现）。
- **集合 A 作废的记账**：集合 A（只发两包）会让第三方安装拿 `base-paint@0.1.0` → 腿2 必挂；保留它只会让执行者在「二选一」上停下来等裁定。若日后诊断改判，改判动作是**改本单并留 commit**，不是执行时临时选。

**三条阻断级前置（P-1／P-3 未解除 → 本单无意义；P-2 已由 C1 修复，闸门保留用于验证与防回归）：**

| # | 阻断项 | 现场判据 | 落点 |
| --- | --- | --- | --- |
| P-1 | npm 凭据失效 | `npm whoami <X>` → `E401 / 401 Unauthorized`（**本单实测仍为 401**，`WHOAMI_EXIT=1`） | S0-0（维护者 `npm login`） |
| P-2 | 锁文件一致性（**曾失配，C1 已修**） | 肇因 `42a5b49`：`packages/skill-calorie/package.json:22` 改成 `^0.2.0` 而 `pnpm-lock.yaml` 仍 `specifier: ^0.1.0` → `--frozen-lockfile` 报 `ERR_PNPM_OUTDATED_LOCKFILE`（R2 FX-R2-2 在仓外复本实测 exit 1），`ci.yml:28,69,103` 三处因此红。**本单实测：C1 已同步锁文件，两个 importer 均 `^0.2.0`** → 闸门保留用于**验证与防回归**（S7 若再改 range 会再次失配） | S3（新增闸门） |
| P-3 | 真机是 junction 直连工作区 | 真机四包全是 Junction，两层链仍解析进 `D:\ilife` → 现在取证**假绿**（R2 J1–J8；本单 S12-0 复验） | S12（两条解除路径） |

### 0.1 C1 发版前置修复的现状（**本单实测 2026-09-09，工作树未提交**）

> 另一 agent（C1）的发版前置修复**已落在工作树**（`git status --short` 显示 12 个文件 `M`，尚未 commit）。本单据此把 S7 改为**逐项复核**，但每条都保留「若未改」的修法，用于回归或 C1 改动丢失时兜底。

| 项 | C1 现状（本单实测） | 本单落点 |
| --- | --- | --- |
| 三包 version | `base-render 0.2.0`／`skill-calorie 0.2.0`／`plugin-calorie 0.2.0` | S7-0／7-1 复核 |
| 三处 range | `skill-calorie/package.json:22` `^0.2.0`；`plugin-calorie/package.json:28` `^0.2.0`；`:29` `^0.2.0` | S7-2 复核 |
| 门禁断言 | `tooling/check-publish.mjs:83` 新增 `assertSameVersionLine`（同 major.minor 断言，无版本硬编码；`:108,109` 调用）→ `--pre` **实测 PASS／exit 0** | S7-3 复核 ＋ 变异自证 |
| 面板版本常量 | `packages/plugin-calorie/src/slot.ts:19-20` = `0.2.0`／`0.2.0` | S7-4 复核 |
| 四处测试断言 | `smoke.test.mjs:33,34` → `/^\^0\.2\./`；`plugin-p10-boundaries.test.mjs:34` 新增 `WINDOW123`（plugin-calorie→`^0.2.0`）、`:38,39` 用它比对；`plugin-p10-install.test.mjs:43` 新增 `LIFEPACK123`、`:46` 用它比对；`skills-export-47.test.mjs:55,57` → `@0.2.0` | S7-5 复核 |
| 文档版本串 | `SKILL.md:172,173,179` 与 `docs/public-installer-47.md:22` 均 `0.2.0` | S7-6 复核 |
| 锁文件 | `pnpm-lock.yaml` 的 `packages/skill-calorie` 与 `packages/plugin-calorie` importer specifier 均 `^0.2.0` | S3／S7-8 复核 |
| **未完成 ①** | **changeset 消费**：`.changeset/` 未被 C1 触碰（实测仍 53 个 `.md`） | S7-7 |
| **未完成 ②** | **`dist` 未重建**：`packages/plugin-calorie/dist/slot.js` 实测仍是 `0.1.6`／`0.1.1`（`src` 已是 `0.2.0`）→ 不重建则 `smoke.test.mjs:93-94` 必红 | S4／S7-4／S8 |

---

## 平台事实（执行前必读；与命令写法直接相关）

1. **落盘一律 `Out-File -Encoding utf8`**：PS 5.1 的 `>`／`*>` 写 **UTF-16LE**，会把日志/脚本写成别人读不了的编码。本单所有重定向都写成 `2>&1 | Out-File <path> -Encoding utf8`（或 `Tee-Object -FilePath`）。
2. **`Select-String` 没有 `-Recurse`**（PS 5.1）：要递归搜目录必须 `Get-ChildItem <dir> -Recurse -File | Select-String …`。
3. **`Get-Content` 在本环境会丢空行**（R2 X2 实测：同一文件 `Get-Content` 271 行 vs `ReadAllLines` 292 行）→ **行号一律以 `Select-String`／读文件工具为准**，不要用 `Get-Content` 下标。
4. **bash 脚本必须用 Git Bash 全路径 + LF**（wizard 生成的安装/校验脚本、`bash -n` 语法检查同理）：
   - PATH 上的 `bash` 是 **WSL2**（`C:\Windows\System32\bash.exe`，bash `5.1.16`）；同一份 **CRLF** 脚本在 WSL 下直接报 `set: pipefail: invalid option name`（CRLF 未剥离）。
   - 正确调用：`& 'C:\Program Files\Git\bin\bash.exe' <脚本>`（MSYS2 Git Bash `5.2.37`，CRLF 不致命）。脚本一律 **LF** 保存；`chmod +x` 在 Windows 上无实际意义。
   - 复验命令（`[转引 R1/R2]` 的 prereq P-2）：`& 'C:\Program Files\Git\bin\bash.exe' --version`。
5. **npm 默认源是 npmmirror**：`npm config get registry` → `https://registry.npmmirror.com`（`[实测·本单]`）。所有 npmjs 操作显式带 `<X>`。
6. **插件真名是 `dsh-better-sidebar`**（`0.18.0`，真实目录非 junction），**不是 `better-sidebar`**（`[实测·本单]`；`docs/calorie-dual-path-acceptance.md:42` 与 #123 票面写的 `better-sidebar` 是简称）。S12 查在位时按真名查。
7. **pnpm 11 有版本冷静期**：任何安装类命令带 `--config.minimumReleaseAge=0`，漏加可能装到旧版。
8. **持锁模板 §L（后续所有 build／test／仓内 install／git 动作都用它包裹）**：

```powershell
$lock = 'D:\ilife\.scratch\locks\gate.lock'
New-Item -ItemType Directory -Force -Path 'D:\ilife\.scratch\locks' | Out-Null
while ($true) {
  if (Test-Path $lock) {
    $age = (Get-Date) - (Get-Item $lock).LastWriteTime
    if ($age.TotalMinutes -gt 10) { Remove-Item $lock -Recurse -Force -ErrorAction SilentlyContinue; continue }
    Start-Sleep -Seconds 10; continue
  }
  try { New-Item -ItemType Directory -Path $lock -ErrorAction Stop | Out-Null; break } catch { Start-Sleep -Seconds 5 }
}
try {
  # ===== 持锁区：一次写完，不要持锁做阅读/编辑 =====
} finally { Remove-Item $lock -Recurse -Force -ErrorAction SilentlyContinue }
```

---

## S0 `[HITL]` 开工：**先修凭据**、填版本、备证据位

> **顺序是硬的**：凭据未修好之前，S9 的一切操作都无意义（P-1）。所以 S0 的第一条就是 `npm login`。

① 命令

```powershell
cd D:\ilife
New-Item -ItemType Directory -Force -Path D:\ilife\.scratch\t123w | Out-Null
# 0-0 凭据闸门（[HITL] 维护者亲手；本单实测现状 = 401，必须修）
npm config get registry                                   # 期望 https://registry.npmmirror.com
npm whoami <X> 2>&1 | Out-File .scratch\t123w\whoami-before.log -Encoding utf8
"WHOAMI_BEFORE_EXIT=$LASTEXITCODE"                        # 期望修复后为 0；修复前实测为 1（E401）
# 备份 ~/.npmrc（**落在仓库外**：该文件含 token，不得进仓、不得写进任何证据）
Copy-Item "$env:USERPROFILE\.npmrc" "$env:USERPROFILE\.npmrc.bak-$(Get-Date -Format yyyyMMdd-HHmmss)" -Force
npm login --registry=https://registry.npmjs.org/          # 交互：用户名/密码/（若开了 2FA）OTP
npm whoami <X> 2>&1 | Out-File .scratch\t123w\whoami-after.log -Encoding utf8
"WHOAMI_AFTER_EXIT=$LASTEXITCODE"                         # 期望 0 且打出维护者用户名
npm ping <X> 2>&1 | Out-File .scratch\t123w\ping.log -Encoding utf8
"PING_EXIT=$LASTEXITCODE"                                 # 期望 0（PONG）
npm config get registry                                   # 必须仍是 npmmirror（登录不应改默认源）

# 0-1 本次版本元组（值已由 §0 定案，直接抄）
$V_BASEPAINT      = '0.2.0'
$V_SKILL_CALORIE  = '0.2.0'
$V_DSH_CALORIE    = '0.2.0'
$V_LIFEPACK       = '0.2.0'      # 本次不发此包，仅作为依赖范围目标
$HEAD             = (git rev-parse --short HEAD).Trim()
$TODAY            = (Get-Date).ToString('yyyy-MM-dd')
$STAMP            = (Get-Date).ToString('yyyyMMdd-HHmmss')

# 0-2 证据位（原始日志落 .scratch，入仓证据落 docs/research，执行后 git add）
New-Item -ItemType Directory -Force -Path D:\ilife\.scratch\t123w | Out-Null
New-Item -ItemType Directory -Force -Path D:\ilife\docs\research\t123-release-evidence | Out-Null

# 0-3 版本元组头（§9-1 要求：命令 + exit + 版本元组 + 取证日期）
"ticket=#123 head=$HEAD date=$TODAY node=$(node --version) npm=$(npm --version) pnpm=$(pnpm --version) base-paint=$V_BASEPAINT skill-calorie=$V_SKILL_CALORIE dsh-calorie=$V_DSH_CALORIE dsh-life-pack=$V_LIFEPACK closure=base-paint>skill-calorie>dsh-calorie" |
  Out-File D:\ilife\.scratch\t123w\version-tuple.txt -Encoding utf8
Get-Content D:\ilife\.scratch\t123w\version-tuple.txt
```

② 期望可观察结果：`WHOAMI_AFTER_EXIT=0`（打出用户名）、`PING_EXIT=0`、`npm config get registry` 仍为 npmmirror；`version-tuple.txt` 一行，含三包目标版本 + `HEAD` + 取证日期 + 工具版本 + `closure=` 序列。

③ 失败判据／中止条件：

- `WHOAMI_AFTER_EXIT ≠ 0`（`E401`／`ENEEDAUTH`／`EOTP`）→ **中止**，不要往下走。改换有效 token 后重跑 0-0 直到 exit 0。**凭据没修好之前，本单整单无意义**（诊断 §7）。
- `npm ping <X>` 不通 → 网络/registry 侧问题，先排查再继续。
- 诊断票或本单 §0 的闭包结论缺失 → **中止**（本单已定案，若文件被改，先确认改判依据）。
- `git status --short` 出现你不认识的改动 → 记录后进 S1，**不擅自处理**。

④ 证据：`.scratch/t123w/whoami-before.log`／`whoami-after.log`／`ping.log`／`version-tuple.txt`（**不要把 token 值写进证据**）→ 入仓 `docs/research/t123-release-evidence/`。

---

## S1 `[AFK]` 工作树洁净闸门（**未提交即中止**；含锁文件）

> **为什么必须**：`npm publish` 打的是**工作树**（`files` 白名单内的磁盘内容），**不是 git HEAD**。R2 CF-5／G3 实证：`git ls-files packages/base-render/dist` = 0（dist 被 `.gitignore:2` 忽略），而 `npm pack --dry-run` 列出 69 项含 `dist/charts.js` → 发布输入完全来自磁盘。未提交的 `src` 会被编译进 `dist` 再进 tarball → 发出与任何 commit 都不对应的代码。
> **不写死结论**：本单不预判「谁脏」。R1 X12／R2 G1 实测修订时 chartfix 已提交、工作树只剩 3 个未跟踪文档 —— **但那是快照，不是现状**。下面给现场复验命令，以输出为准。

① 命令

```powershell
cd D:\ilife
$log = 'D:\ilife\.scratch\t123w\gate-worktree-clean.log'
"# $(Get-Date -Format o)  head=$HEAD" | Out-File $log -Encoding utf8
$pkgDirs = @('packages/base-render','packages/skill-calorie','packages/plugin-calorie')
$dirty = @()
foreach ($d in $pkgDirs) {
  $o = @(git status --short -- $d)
  if ($o.Count -eq 0) { "CLEAN  $d" | Tee-Object -FilePath $log -Append }
  else { $o | ForEach-Object { "DIRTY  $_" | Tee-Object -FilePath $log -Append }; $dirty += $d }
}
# 锁文件必须与 manifest 同批提交（见 S3）
$lockDirty = @(git status --short -- pnpm-lock.yaml)
if ($lockDirty.Count) { $lockDirty | ForEach-Object { "DIRTY  $_" | Tee-Object -FilePath $log -Append }; $dirty += 'pnpm-lock.yaml' }
else { "CLEAN  pnpm-lock.yaml" | Tee-Object -FilePath $log -Append }
("GATE_WORKTREE_CLEAN=" + $(if ($dirty.Count) { 'FAIL:' + ($dirty -join ',') } else { 'PASS' })) | Tee-Object -FilePath $log -Append
# 附全仓状态原文备查（含他人改动，只读）
git status --short | Out-File $log -Encoding utf8 -Append
```

② 期望可观察结果：三行 `CLEAN <pkgdir>` ＋ 一行 `CLEAN pnpm-lock.yaml`，末行 `GATE_WORKTREE_CLEAN=PASS`。

③ 失败判据／中止条件：**任一行 `DIRTY` 或末行 `FAIL:…` → 立即中止本次发版**（不 publish、不改版本、不删 changeset），在 #123 留一条评论：`待 <文件清单> 提交后再发`。**三包中只要有一个脏，整个窗口就等它提交**（`base-paint` 尤其：它的 tarball 只含 `dist/`，`src` 脏 = 发陈旧代码）。

④ 证据：`.scratch/t123w/gate-worktree-clean.log`（含 `git status --short` 原文与时间戳）→ 入仓 `docs/research/t123-release-evidence/gate-worktree-clean.log`。

---

## S2 `[AFK]` 共享环境基线闸门

① 命令

```powershell
cd D:\ilife
$log = 'D:\ilife\.scratch\t123w\gate-env-baseline.log'
"# $(Get-Date -Format o)" | Out-File $log -Encoding utf8

# 2-1 协议事故基线：node_modules\.bin 必须 = 9（0 即全仓 build 挂；本单实测 = 9）
$bin = (Get-ChildItem D:\ilife\node_modules\.bin -Force | Measure-Object).Count
"BIN_COUNT=$bin (expect 9)" | Tee-Object -FilePath $log -Append
Get-ChildItem D:\ilife\node_modules\.bin -Name | Out-File $log -Encoding utf8 -Append

# 2-2 凭据复验（S0 已修；这里是发版前的第二道锁）
"registry(default)=" + (npm config get registry) | Tee-Object -FilePath $log -Append
npm whoami <X> 2>&1 | Tee-Object -FilePath $log -Append
"WHOAMI_EXIT=$LASTEXITCODE" | Tee-Object -FilePath $log -Append
"minimumReleaseAge=" + (pnpm config get minimumReleaseAge 2>&1) | Tee-Object -FilePath $log -Append

# 2-3 changesets CLI 现状（本工作区 .pnpm 内多个 @changesets/* 为空目录 → changeset version 不可执行）
pnpm changeset status 2>&1 | Out-File $log -Encoding utf8 -Append
"CHANGESET_STATUS_EXIT=$LASTEXITCODE" | Tee-Object -FilePath $log -Append

# 2-4 包管理器禁令自检（本次执行日志里不应出现仓内 install 痕迹）
Get-ChildItem D:\ilife\.scratch\t123w -Filter *.log -File -ErrorAction SilentlyContinue |
  Select-String -Pattern 'npm install|pnpm install' | Out-File $log -Encoding utf8 -Append
```

② 期望可观察结果：`BIN_COUNT=9`；`WHOAMI_EXIT=0`；默认 registry = `https://registry.npmmirror.com`；`CHANGESET_STATUS_EXIT≠0`（**这是已知事实，不是本步的失败**——手工 bump 路线不依赖它，见 S7）。

③ 失败判据／中止条件（**任一命中即中止，且不得自行 `pnpm install` 修**）：

- `BIN_COUNT ≠ 9` → 共享 `node_modules` 异常，**停下报告编排者**（协议 §2.1⑤），本窗口作废。
- `WHOAMI_EXIT ≠ 0` → 回 S0-0 修凭据。
- 安装类命令一律带 `--config.minimumReleaseAge=0`。
- `pnpm changeset status` 若**意外成功** → 说明有人修好了 node_modules；此时可评估改用 `changeset version`（全仓 53 changeset / 17 包，爆炸半径大，**须编排者裁定**），否则仍走 S7 的手工 bump。

④ 证据：`.scratch/t123w/gate-env-baseline.log`（**不要**把 `.npmrc` 里的 token 值写进证据）→ 入仓 `docs/research/t123-release-evidence/gate-env-baseline.log`。

---

## S3 `[AFK]` **新增闸门：锁文件一致**（`pnpm-lock.yaml` ↔ `package.json`）

> **为什么新增**：`42a5b49` 曾把 `packages/skill-calorie/package.json:22` 的 `base-paint` 从 `^0.1.0` 改成 `^0.2.0` 而**没有同步 `pnpm-lock.yaml`**（当时该 importer 仍是 `specifier: ^0.1.0`）→ pnpm 判 `ERR_PNPM_OUTDATED_LOCKFILE`，`.github/workflows/ci.yml:28`／`:69`／`:103` 三处 `pnpm install --frozen-lockfile` 因此**全红**；任何人跑一次非 frozen 的 install 都会改写锁文件（仓内写操作）。
> **现状（本单实测 2026-09-09）**：C1 已同步锁文件 —— `packages/skill-calorie` 与 `packages/plugin-calorie` 两个 importer 的 `base-paint`／`dsh-life-pack`／`skill-calorie` specifier **均为 `^0.2.0`** → 本闸门现在应绿。
> **为什么仍然保留**：① 它是**回归闸门**——S7 每改一处 range（`packages/plugin-calorie/package.json:28,29`），锁文件会再次失配；② 它是 CI 三处红线的**本地等价物**；③ C1 的改动**尚未提交**，后续任何人改 range 而不改锁文件都会重新踩中。

① 命令（**校验型**：`--frozen-lockfile` 不写锁文件、`--lockfile-only` 不写 `node_modules`；但它是仓内 install 命令，协议 §2.1 属例外项 → **必须持锁并取得编排者授权**）

```powershell
cd D:\ilife
$log = 'D:\ilife\.scratch\t123w\gate-lockfile-frozen.log'
"# $(Get-Date -Format o)" | Out-File $log -Encoding utf8
# 先留证据：manifest 与锁文件的 specifier 现值
node -e "console.log('manifest base-paint =', require('./packages/skill-calorie/package.json').dependencies['base-paint'])"
Select-String -Path pnpm-lock.yaml -Pattern 'base-paint' -Context 0,2 |
  ForEach-Object { "LOCK L$($_.LineNumber): $($_.Line.Trim())" } | Out-File $log -Encoding utf8 -Append
# 持锁（§L）跑冻结校验
pnpm install --frozen-lockfile --lockfile-only --ignore-scripts 2>&1 | Out-File $log -Encoding utf8 -Append
"FROZEN_LOCKFILE_EXIT=$LASTEXITCODE" | Tee-Object -FilePath $log -Append
# 校验型命令不应改动任何文件
git status --short -- pnpm-lock.yaml | Out-File $log -Encoding utf8 -Append
"LOCKFILE_UNCHANGED=" + [bool](@(git status --short -- pnpm-lock.yaml).Count -eq 0) | Tee-Object -FilePath $log -Append
```

② 期望可观察结果：`FROZEN_LOCKFILE_EXIT=0`；`LOCKFILE_UNCHANGED=True`。

③ 失败判据／中止条件：

- `FROZEN_LOCKFILE_EXIT ≠ 0` 且日志含 `ERR_PNPM_OUTDATED_LOCKFILE`（形如 `1 dependencies are mismatched: - base-paint (lockfile: ^0.1.0, manifest: ^0.2.0)`）→ **中止发版**，先修锁文件：
  - **修法（由 C1／编排者持锁执行）**：`pnpm install --lockfile-only`（或完整 `pnpm install`）重生成 `pnpm-lock.yaml`，随后 `git status --short -- pnpm-lock.yaml` 必须显示该文件被修改 → **与 manifest 同批提交** → 回到本步重跑到 `exit 0`。
  - **禁止**跳过：锁文件失配 = CI 三处红（`ci.yml:28,69,103`）＋ 任何人的非 frozen install 都会污染工作树。
- `LOCKFILE_UNCHANGED=False` → 说明这条命令写了文件（版本/参数不符预期）→ 记录后报告编排者，不要继续。
- **若本步就报红** → 锁文件又被改坏（C1 的同步丢失、或 S7 改了 range 后没同步）→ 按上面修法处理，**不得**跳过。
- **本单未在仓内实测该命令**（协议禁仓内 install）→ 首次执行时以实际 exit 码为准；R2 在**仓外复本**实测 exit 1（`[转引 R2]` FX-R2-2）；C1 同步锁文件后**应转绿**，但该 exit 码仍未实测。

④ 证据：`.scratch/t123w/gate-lockfile-frozen.log`（含 manifest/锁文件现值、exit、`LOCKFILE_UNCHANGED`）→ 入仓 `docs/research/t123-release-evidence/gate-lockfile-frozen.log`。

---

## S4 `[AFK]` 强制重建 + `dist`↔`src` 一致性闸门

> **为什么必须**：`tsc -b` 是**增量**构建，靠 `tsconfig.tsbuildinfo` 判新鲜度。删了 `dist` 但留着 `.tsbuildinfo` 时，tsc 会认为「已是最新」而不重新产出；而 `npm publish` 打的是磁盘上的 `dist`，陈旧产物会被原样发出去。
> **不写死结论**：R1 X11／R2 G2 实测修订时 `dist/charts.js` 的 `charts-xlabel` 已是 `9.5px`、dist mtime 晚于 src —— **旧现象已不复现，但风险机制仍在**。本步判据是机器可判的「强制重建后 mtime 关系 + 导出面 + 关键串」，**不是复述旧现象**。

① 命令（**持锁 §L**：锁必须包住删除 + 重建；持锁区只做这件事）

```powershell
cd D:\ilife
$log = 'D:\ilife\.scratch\t123w\gate-rebuild-dist.log'
# —— 用 §L 包裹下面整块 ——
$dirs = @('base-render','skill-calorie','plugin-calorie')
foreach ($p in $dirs) {
  Remove-Item "D:\ilife\packages\$p\dist" -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item "D:\ilife\packages\$p\tsconfig.tsbuildinfo" -Force -ErrorAction SilentlyContinue   # 关键：连 tsbuildinfo 一起删
}
pnpm build 2>&1 | Out-File $log -Encoding utf8
"BUILD_EXIT=$LASTEXITCODE" | Tee-Object -FilePath $log -Append
# —— 释放锁 ——

# 4-1 mtime 关系：dist 内最旧文件必须不早于 src 内最新文件
foreach ($p in $dirs) {
  $srcMax  = (Get-ChildItem "D:\ilife\packages\$p\src"  -Recurse -File | Measure-Object LastWriteTime -Maximum).Maximum
  $distMin = (Get-ChildItem "D:\ilife\packages\$p\dist" -Recurse -File | Measure-Object LastWriteTime -Minimum).Minimum
  $verdict = if ($distMin -lt $srcMax) { 'STALE' } else { 'FRESH' }
  "MTIME $p srcMax=$($srcMax.ToString('HH:mm:ss')) distMin=$($distMin.ToString('HH:mm:ss')) => $verdict" | Tee-Object -FilePath $log -Append
}

# 4-2 base-paint：工作区导出面必须齐全（#90 copy.ts 与 #75/#107 的消费面）
node --input-type=module -e "import * as m from './packages/base-render/dist/index.js'; const need=['ACTION_ID_ATTR','DEFAULT_DATA_ATTR','HELP_COPY_ACTIONS','buildSharedHelpersJs','renderActionBar','buildStyleSheet','fillTemplate','cx','escapeHtml','token']; const miss=need.filter(k=>!(k in m)); console.log(miss.length?'BASE_PAINT_MISS:'+miss.join(','):'BASE_PAINT_EXPORTS_OK='+need.length); process.exit(miss.length?1:0)"
"BASE_PAINT_EXPORT_EXIT=$LASTEXITCODE" | Tee-Object -FilePath $log -Append
# 4-3 base-paint：字号串 src vs dist 计数必须相等（[转引 R1 X11/R2 G2] 旧现象已消失，此处只做一致性断言）
foreach ($s in '9.5px','10.5px') {
  $a = (Select-String -Path D:\ilife\packages\base-render\src\charts.ts  -Pattern $s -SimpleMatch -Encoding utf8 | Measure-Object).Count
  $b = (Select-String -Path D:\ilife\packages\base-render\dist\charts.js -Pattern $s -SimpleMatch -Encoding utf8 | Measure-Object).Count
  "CHART_STR $s src=$a dist=$b => " + $(if ($a -eq $b) { 'MATCH' } else { 'MISMATCH' }) | Tee-Object -FilePath $log -Append
}
# 4-4 skill-calorie：落盘器与模板装载器必须在 dist 里（Select-String 无 -Recurse，必须走 Get-ChildItem）
foreach ($s in 'resolveDefaultHtmlPath','calorie_html','readFileSync') {
  $n = (Get-ChildItem D:\ilife\packages\skill-calorie\dist -Recurse -File | Select-String -Pattern $s -SimpleMatch | Measure-Object).Count
  ("SKILL_DIST $s = $n") | Tee-Object -FilePath $log -Append
}
# 4-5 dsh-calorie：bundle 层 inject 必须含 connection（#48）
Select-String -Path D:\ilife\packages\plugin-calorie\dist\client.js -Pattern 'const inject' -Encoding utf8 | ForEach-Object { "DSH_CLIENT L$($_.LineNumber): $($_.Line.Trim())" | Tee-Object -FilePath $log -Append }
"DSH_SKILL_PROVIDER_EXISTS=" + (Test-Path D:\ilife\packages\plugin-calorie\dist\skill-provider.js) | Tee-Object -FilePath $log -Append
```

② 期望可观察结果：`BUILD_EXIT=0`；三包均 `=> FRESH`；`BASE_PAINT_EXPORTS_OK=10` 且 `BASE_PAINT_EXPORT_EXIT=0`；`CHART_STR` 两行均 `MATCH`；`SKILL_DIST resolveDefaultHtmlPath/calorie_html/readFileSync` 均 > 0；`const inject = ["slots", "connection"];`；`DSH_SKILL_PROVIDER_EXISTS=True`。

③ 失败判据／中止条件：`BUILD_EXIT ≠ 0`、任一 `STALE`（**强制重建后仍 STALE** 说明 tsc 没真正全量重建 → 查 `tsbuildinfo` 位置与项目引用，先修再发）、任一 `MISMATCH`、`BASE_PAINT_MISS:…`、`inject` 只有 `["slots"]`、`skill-provider.js` 不存在 → **中止**。**不允许**「反正 dist 里有新串就行」——`src`／`dist` 计数不等即判陈旧。

④ 证据：`.scratch/t123w/gate-rebuild-dist.log`（含 build 全量输出，**只读尾 5 行判断 exit**；明细留文件）→ 入仓 `docs/research/t123-release-evidence/gate-rebuild-dist.log`。

---

## S5 `[AFK]` 包内容断言闸门（`npm pack --dry-run --json`）

① 命令

```powershell
cd D:\ilife
$out = 'D:\ilife\.scratch\t123w'
$sum = foreach ($p in @(@('skill-calorie','packages\skill-calorie'), @('dsh-calorie','packages\plugin-calorie'), @('base-paint','packages\base-render'))) {
  $name = $p[0]; $dir = $p[1]
  Push-Location "D:\ilife\$dir"
  npm pack --dry-run --json 2>&1 | Out-File "$out\pack-dryrun-$name.json" -Encoding utf8
  ("PACK_EXIT $name=$LASTEXITCODE")
  Pop-Location
  $j = Get-Content "$out\pack-dryrun-$name.json" -Raw -Encoding utf8 | ConvertFrom-Json
  $files = $j[0].files.path
  $ws = (Get-Content "D:\ilife\$dir\package.json" -Raw -Encoding utf8) -match 'workspace:'
  "== $name entryCount=$($j[0].entryCount)"
  "   SKILL.md      : " + [bool]($files -contains 'SKILL.md')
  "   templates     : " + (($files | Where-Object { $_ -like 'templates/*' }) -join ',')
  "   distCount     : " + ($files | Where-Object { $_ -like 'dist/*' }).Count
  "   cordis.patch  : " + [bool]($files -contains 'cordis.patch.yml')
  "   manifest workspace: : " + [bool]$ws
}
$sum | Tee-Object -FilePath "$out\gate-pack-dryrun.log"
```

② 期望可观察结果（`entryCount` 随版本串同步会变；下表为 `[转引 R1 X3]` 修订时实测值）：

| 包 | entryCount | `SKILL.md` | `templates/*.html` | `dist` | 其他 |
| --- | --- | --- | --- | --- | --- |
| `skill-calorie` | 400 | **有** | **6 件**（diet／exercise／goal／help／home／photo-gallery） | 392 文件（含 `dist/cli/cmd_read.js`） | `package.json` |
| `dsh-calorie` | 34 | — | — | 32 文件（含 `dist/index.js`） | `cordis.patch.yml` |
| `base-paint` | 69 | — | — | 68 文件（含 `dist/index.js`、`dist/charts.js`） | — |

③ 失败判据／中止条件：任一包 `PACK_EXIT ≠ 0`；`skill-calorie` 缺 `SKILL.md` 或模板 ≠ 6 件；`dsh-calorie` 缺 `dist/index.js` 或 `cordis.patch.yml`；`base-paint` 缺 `dist/index.js`；manifest 出现 `workspace:` → **中止**（`workspace:` 外泄会让第三方 `npm install` 直接 `EUNSUPPORTEDPROTOCOL`，见 `docs/public-installer-47.md`「已发布包阻塞」）。

④ 证据：`.scratch/t123w/pack-dryrun-<pkg>.json`（原始 JSON）+ `.scratch/t123w/gate-pack-dryrun.log` → 入仓 `docs/research/t123-release-evidence/`。

---

## S6 `[AFK]` 闭包自证探针（**给已定案闭包留可执行证据，不再用来裁定闭包**）

> 目的：**在花掉 2FA 窗口之前**，用仓外隔离安装实证「闭包 `{base-paint, skill-calorie, dsh-calorie}` 充分且必要」：① registry `base-paint@0.1.0` 缺 5 个具名导出（反例，证明不发 base-paint 必挂）；② 本仓 `base-paint` tarball 齐全（正例，证明发出去的版本能修好它）。

① 命令（**仓外**临时根 + 最小 `package.json`，协议 §2.1② 硬要求；**绝不在 `D:\ilife` 内 npm install**）

```powershell
$t = Join-Path $env:TEMP ('ilife-t123w-' + (-join ((1..8) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $t | Out-Null
'{ "name": "ilife-t123w-closure-probe", "version": "0.0.0", "private": true }' | Out-File "$t\package.json" -Encoding utf8
Push-Location $t

# 6-1 反例面：registry base-paint@0.1.0（= 不发 base-paint 的后果）
npm install base-paint@0.1.0 --no-audit --no-fund <X> 2>&1 | Out-File "$t\probe-reg-install.log" -Encoding utf8
"PROBE_REG_INSTALL_EXIT=$LASTEXITCODE"
node --input-type=module -e "import('base-paint').then(m=>{const miss=['ACTION_ID_ATTR','DEFAULT_DATA_ATTR','HELP_COPY_ACTIONS','buildSharedHelpersJs','renderActionBar'].filter(k=>!(k in m));console.log(miss.length?'REG_MISSING_EXPORTS:'+miss.join(','):'REG_EXPORTS_OK');process.exit(miss.length?1:0)})" 2>&1 | Out-File "$t\probe-reg-exports.log" -Encoding utf8
"PROBE_REG_EXPORT_EXIT=$LASTEXITCODE"

# 6-2 正例面：本仓 base-paint tarball（= 本次要发的 0.2.0）
npm pack D:\ilife\packages\base-render --pack-destination $t 2>&1 | Out-File "$t\probe-local-pack.log" -Encoding utf8
npm install (Get-ChildItem "$t\base-paint-*.tgz").FullName --no-audit --no-fund 2>&1 | Out-File "$t\probe-local-install.log" -Encoding utf8
"PROBE_LOCAL_INSTALL_EXIT=$LASTEXITCODE"
node --input-type=module -e "import('base-paint').then(m=>{const miss=['ACTION_ID_ATTR','DEFAULT_DATA_ATTR','HELP_COPY_ACTIONS','buildSharedHelpersJs','renderActionBar','buildStyleSheet','fillTemplate'].filter(k=>!(k in m));console.log(miss.length?'LOCAL_MISSING_EXPORTS:'+miss.join(','):'LOCAL_EXPORTS_OK');process.exit(miss.length?1:0)})" 2>&1 | Out-File "$t\probe-local-exports.log" -Encoding utf8
"PROBE_LOCAL_EXPORT_EXIT=$LASTEXITCODE"
Pop-Location
# 清理（守卫：仅限本临时根，且必须在 %TEMP% 下）
if ($t.StartsWith($env:TEMP) -and $t -notlike 'D:\ilife*') { Remove-Item $t -Recurse -Force }
```

② 期望可观察结果：`PROBE_REG_EXPORT_EXIT=1` ＋ `REG_MISSING_EXPORTS:ACTION_ID_ATTR,DEFAULT_DATA_ATTR,HELP_COPY_ACTIONS,buildSharedHelpersJs,renderActionBar`（`[转引 R1 C1/C2、R2 CF-1]`）；`PROBE_LOCAL_EXPORT_EXIT=0` ＋ `LOCAL_EXPORTS_OK`（`[转引 R1 C3：工作区 dist 106 项导出、5 符号齐]`）。

③ 失败判据／中止条件：

- **正例面失败**（本仓 tarball 也缺符号）→ **中止**：说明工作区回归（`base-render` 的导出面破了），先修 S4 再回来。**不要**改闭包。
- 反例面「竟然通过」→ 说明 registry 上已有更新的 `base-paint`（或探针装错包）→ **停下**、把日志回贴 #123 与诊断票，由编排者裁定，**不要自行改闭包**。
- 临时根不满足守卫（不在 `%TEMP%` 或落在 `D:\ilife` 内）→ **中止**，不得清理。

④ 证据：`probe-reg-*.log`／`probe-local-*.log`（含安装日志与导出面结论）→ 入仓 `docs/research/t123-release-evidence/`，结论行回贴 #123。

---

## S7 `[AFK]` 定版与元数据同步（**C1 已落地 → 本阶段以复核为主**；手工 bump 路线，先例 `1519c10`）

> 定版路径：**乙 = 手工 bump**（先例 `1519c10`，可执行）。甲 = 全仓 `changeset version`：本工作区 `.pnpm` 内多个 `@changesets/*` 为空目录 → 当前不可执行（S2-3 复验），且爆炸半径 17 包（诊断 §6.1）。
> **现状（本单实测 2026-09-09，工作树未提交）**：C1 的发版前置修复**已把 7-0～7-6、7-8 改到位**（见 §0.1 表）。因此本阶段是**逐项复核**；每条都保留「若未改」的修法，用于回归或 C1 改动丢失时兜底。
> **本阶段真正待做的两件事**：① **7-7 changeset 消费**（C1 未触碰 `.changeset/`，实测仍 53 个 `.md`）；② **重建 `dist`** —— `packages/plugin-calorie/dist/slot.js` 实测仍是 `0.1.6`／`0.1.1`（`src/slot.ts` 已是 `0.2.0`），不重建则 `smoke.test.mjs:93-94` 必红。
> **漏一处 → `pnpm test` delta 非空 → 窗口卡住。**

① 命令（按 7-0 → 7-8 顺序；每条「复核 → 不合格才改」）

```powershell
cd D:\ilife
$log = 'D:\ilife\.scratch\t123w\gate-version-bump.log'
"# $(Get-Date -Format o)" | Out-File $log -Encoding utf8

# ---------- 7-0 第一步：base-paint bump（**必做，不是可选**）----------
#   现状实测：packages/base-render/package.json:3 已是 "0.2.0"（C1 已改，未提交）
#   若仍是 0.1.0：skill-calorie@0.2.0 声明 base-paint ^0.2.0 而 registry 无 0.2.0
#   → 第三方 npm install 直接 ETARGET（腿2 挂）；强发未 bump 的 0.1.0 → npm 拒绝（版本已存在）。
node -e "console.log('base-paint =', require('./packages/base-render/package.json').version)" |
  Tee-Object -FilePath $log -Append
#   期望 base-paint = 0.2.0；仍为 0.1.0 → 先改这一处（**第一步**）再往下

# ---------- 7-1 另两包 version ----------
#   现状实测：packages/skill-calorie/package.json:3 = 0.2.0；packages/plugin-calorie/package.json:3 = 0.2.0
node -e "for (const p of ['packages/skill-calorie','packages/plugin-calorie']) console.log(p, require('./'+p+'/package.json').version)" |
  Tee-Object -FilePath $log -Append
#   期望两行均 0.2.0

# ---------- 7-2 依赖范围（**漏一处即发出带旧依赖的包**）----------
#   现状实测：skill-calorie/package.json:22 = ^0.2.0；plugin-calorie/package.json:28 = ^0.2.0；:29 = ^0.2.0
#   （若未改）plugin-calorie:28 "dsh-life-pack": "^0.1.0" → "^0.2.0"（指向 registry 已发布版）
#   （若未改）plugin-calorie:29 "skill-calorie": "^0.1.0" → "^0.2.0"
Select-String -Path packages\skill-calorie\package.json,packages\plugin-calorie\package.json -Pattern '"\^\d' -Encoding utf8 |
  ForEach-Object { "$($_.Filename):$($_.LineNumber): $($_.Line.Trim())" } | Tee-Object -FilePath $log -Append
#   期望：三行分别 ^0.2.0 / ^0.2.0 / ^0.2.0；出现 ^0.1.0 即未改完

# ---------- 7-3 门禁断言（**以 C1 的修复为准**；未修则改 range 会让 publish:pre 变红）----------
#   旧实现：tooling/check-publish.mjs:84,86 硬编码 /^\^0\.1\./ → 改 range 即红（诊断 §2.3 #4/#5）
#   新实现（C1）：:83 assertSameVersionLine() —— ① 必须声明该依赖；② caret 的 major.minor 必须等于
#   该依赖在**工作区**的版本（^0.2.0 ↔ 工作区 0.2.0 通过；^0.1.0 ↔ 工作区 0.2.0 红）；
#   :108,109 调用。它不含任何具体版本号，也不放行 ^9.9.9（R1 FX-R1-10 的顾虑已解）。
Select-String -Path tooling\check-publish.mjs -Pattern 'assertSameVersionLine|0\\\.1\\\.' -Encoding utf8 |
  ForEach-Object { "L$($_.LineNumber): $($_.Line.Trim())" } | Tee-Object -FilePath $log -Append
#   期望：命中 assertSameVersionLine 的定义与两处调用；**不再有** /^\^0\.1\./ 硬编码（命中 0 行）
node tooling\check-publish.mjs --pre --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint 2>&1 |
  Out-File .scratch\t123w\gate-pre-after-range.log -Encoding utf8
"PRE_AFTER_RANGE_EXIT=$LASTEXITCODE" | Tee-Object -FilePath $log -Append
#   期望 PASS / exit 0（[实测·本单] 现状即 PASS，日志含「同版本线」三行 OK）

# ---------- 7-3b 变异自证（证明门禁**还会咬**，不是被改瞎）----------
$f = 'packages\plugin-calorie\package.json'
$shaBefore = (Get-FileHash $f -Algorithm SHA256).Hash
#   手工把 :28 临时改成 **^0.3.0**（换版本线；用编辑器，别用脚本批量替换）
node tooling\check-publish.mjs --pre --only dsh-calorie 2>&1 | Out-File .scratch\t123w\mut-gate-red.log -Encoding utf8
"MUT_GATE_RED_EXIT=$LASTEXITCODE"      # 期望 ≠ 0，且日志含「与工作区版本 0.2.0 的 major.minor 不一致」
#   还原成 ^0.2.0
$shaAfter = (Get-FileHash $f -Algorithm SHA256).Hash
"MUT_RESTORED=" + ($shaBefore -eq $shaAfter) | Tee-Object -FilePath $log -Append   # 期望 True
node tooling\check-publish.mjs --pre --only dsh-calorie 2>&1 | Out-File .scratch\t123w\mut-gate-green.log -Encoding utf8
"MUT_GATE_GREEN_EXIT=$LASTEXITCODE"    # 期望 0

# ---------- 7-4 面板版本行常量：src/slot.ts:19-20（R1 FX-R1-2 新登记）----------
#   现状实测：src/slot.ts:19 PLUGIN_VERSION='0.2.0'、:20 SKILL_VERSION='0.2.0'（C1 已改）
#   **但 dist/slot.js 实测仍是 '0.1.6'/'0.1.1'（未重建）** → 本步必须重建，否则 smoke.test.mjs:93-94 红
Select-String -Path packages\plugin-calorie\src\slot.ts -Pattern 'VERSION' -Encoding utf8 |
  ForEach-Object { "SRC L$($_.LineNumber): $($_.Line.Trim())" } | Tee-Object -FilePath $log -Append
Select-String -Path packages\plugin-calorie\dist\slot.js -Pattern 'VERSION' -Encoding utf8 |
  ForEach-Object { "DIST L$($_.LineNumber): $($_.Line.Trim())" } | Tee-Object -FilePath $log -Append
#   持锁 §L：pnpm --filter dsh-calorie build     ← 关键一步（测试 import 的是 dist/slot.js）
node -e "import('./packages/plugin-calorie/dist/slot.js').then(m=>console.log('dist slot =', m.PLUGIN_VERSION, m.SKILL_VERSION))" |
  Tee-Object -FilePath $log -Append
#   期望 dist slot = 0.2.0 0.2.0；仍是旧值 → build 没生效，先查再发

# ---------- 7-5 四处测试断言（**漏一处 → pnpm test delta 非空 → 窗口卡住**）----------
#   现状实测（C1 已改，写法已变，按现值复核）：
#     packages/plugin-calorie/test/smoke.test.mjs:33,34         /^\^0\.2\./ ×2
#     test/plugin-p10-boundaries.test.mjs:34 新增 WINDOW123（plugin-calorie → '^0.2.0'）；
#       :35 rangeOf() 的 ?? 兜底仍是 '^0.1.0'（**给非 #123 窗口包用，属正常**）；:38,:39 用它比对
#     test/plugin-p10-install.test.mjs:43 新增 LIFEPACK123（plugin-calorie → '^0.2.0'）；
#       :46 (LIFEPACK123[dir] ?? '^0.1.0')（同上，兜底）
#     test/skills-export-47.test.mjs:55,57 钉死 @0.2.0
Select-String -Path packages\plugin-calorie\test\smoke.test.mjs,test\plugin-p10-boundaries.test.mjs,test\plugin-p10-install.test.mjs,test\skills-export-47.test.mjs -Pattern '0\\\.1\\\.|0\\\.2\\\.|WINDOW123|LIFEPACK123' -Encoding utf8 |
  ForEach-Object { "$($_.Filename):$($_.LineNumber): $($_.Line.Trim())" } | Tee-Object -FilePath $log -Append
#   期望：plugin-calorie 的取值处是 '^0.2.0'；`^0.1.0` 只出现在 WINDOW123/LIFEPACK123 的 ?? 兜底；
#         skills-export-47 必须是 @0.2.0（不再是 @0.1.1）
#   注意 smoke.test.mjs:93-94 断言 dist/slot.js 的两个常量 == 两处 package.json 的 version
#   → 7-1 + 7-4 必须同批完成，否则该用例红

# ---------- 7-6 SKILL.md 与两处外部版本串 ----------
#   现状实测：SKILL.md:172/173/179 与 docs/public-installer-47.md:22 均已 @0.2.0；
#             test/skills-export-47.test.mjs:55,57 已钉 @0.2.0（不同步则该单测**必红**）
Select-String -Path packages\skill-calorie\SKILL.md -Pattern '0\.1\.1' -Encoding utf8 |
  ForEach-Object { "SKILL L$($_.LineNumber): $($_.Line.Trim())" } | Tee-Object -FilePath $log -Append
Select-String -Path docs\public-installer-47.md,test\skills-export-47.test.mjs -Pattern '0\.1\.1' -Encoding utf8 |
  ForEach-Object { "$($_.Filename):$($_.LineNumber): $($_.Line.Trim())" } | Tee-Object -FilePath $log -Append
#   期望：三处均命中 0 行（`public-installer-47.md:54,56` 的「0.1.1 重发」是历史登记，**允许保留**）
#   不要误改：SKILL.md:32 的「版本 0.1.0」是 envelope 契约版本，不是 npm 包版本

# ---------- 7-7 changeset 消费（**本阶段真正待做的第一件**；先核对跨包耦合！）----------
#   现状实测：.changeset/ 未被 C1 触碰，仍是 53 个 .md
#   硬坑：.changeset/p10-plugin-scaffold.md 与 p48-client-rewire.md 同时含 dsh-life-pack 与 5 个其它单品的 pending bump
#   → 直删会吞掉本次不发包的 bump。只删「纯本次发版」的文件：
#     保留：p10-plugin-scaffold.md、p48-client-rewire.md（含 dsh-life-pack）
#     可删：skill-provider-56-calorie.md、t95-calorie-templates.md、calorie-output-naming-87.md、calorie-copy-90.md、
#           calorie-triggers.md、calorie-write-chain.md、calorie-readonly-93.md、t20/t22/t23/t24/t26/t27/t28/t29/t30/t38-calorie-*.md、
#           t81-wake-routing.md、t101-delete-wording-persist.md、t98-wizard-verify-rule.md
#           ＋ base-paint-*.md（7 个）＋ p5-scaffold.md／p7-render.md（**注意：这两份还声明 base-link-core/base-combos/ilife-skills**，
#             删前必须逐文件读 frontmatter，含本次不发包的 bump 就保留）
Get-ChildItem .changeset -Filter *.md -Name | Out-File D:\ilife\.scratch\t123w\changeset-before.txt -Encoding utf8

# ---------- 7-8 锁文件复验（现状已同步；若本阶段改过 range 才需先重同步）----------
#   现状实测：pnpm-lock.yaml 的 skill-calorie / plugin-calorie 两个 importer specifier 均 ^0.2.0
#   若本阶段**改动了任何 range**（7-2 兜底路径），先做（**持锁 §L + 编排者授权**，会改写 pnpm-lock.yaml）：
#       pnpm install --lockfile-only
#   随后 git status --short -- pnpm-lock.yaml 必须显示被修改 → 与 manifest 同批提交
#   最后（校验型，必须 exit 0）：
pnpm install --frozen-lockfile --lockfile-only --ignore-scripts 2>&1 | Out-File .scratch\t123w\gate-lockfile-frozen-after-s7.log -Encoding utf8
"FROZEN_AFTER_S7_EXIT=$LASTEXITCODE" | Tee-Object -FilePath $log -Append
git status --short -- pnpm-lock.yaml | Out-File $log -Encoding utf8 -Append
```

② 期望可观察结果：7-0 `base-paint = 0.2.0`；7-1 两包 `0.2.0`；7-2 三行 range 全 `^0.2.0`；7-3 `check-publish.mjs` 不再有 `/^\^0\.1\./` 硬编码、`PRE_AFTER_RANGE_EXIT=0`（`[实测·本单]` 现状即 PASS）；7-3b `MUT_GATE_RED_EXIT≠0` ＋ `MUT_RESTORED=True` ＋ `MUT_GATE_GREEN_EXIT=0`；7-4 `SRC` 两行 `0.2.0` ＋ `dist slot = 0.2.0 0.2.0`（**build 之后**）；7-5 plugin-calorie 取值 `^0.2.0`、`skills-export-47` 为 `@0.2.0`；7-6 三处版本串无 `0.1.1` 残留；7-8 `FROZEN_AFTER_S7_EXIT=0`。

③ 失败判据／中止条件：

- 7-0 `base-paint` 仍是 `0.1.0` → **中止**（后续 `skill-calorie@0.2.0` 的 `^0.2.0` 会 ETARGET）。
- 任一 `version` 未变、任一 range 仍指旧版本、`PRE_AFTER_RANGE_EXIT ≠ 0`、`SKILL.md`／两处外部文件仍命中 `0.1.1`、测试断言里 plugin-calorie 取值仍 `^0.1.0`／`skills-export-47` 仍 `@0.1.1`、`dist slot` 仍旧值 → **中止**并修完重跑本阶段。
- **7-4／7-5 漏改或漏重建的后果**：`pnpm test` 会出现**新增失败**（基线 21 条不含这些用例 —— R1 X7 复核）→ S8 判 delta ≠ 空 → 窗口卡住。特别是 `dist/slot.js` 陈旧时 `smoke.test.mjs:93-94` 必红。
- 7-7 误删了含 `dsh-life-pack` 的 changeset → **中止**（会让本次不发包的 6 个包丢失 pending bump，属不可逆污染，需先 `git status` 确认后由编排者裁定恢复方式）。**本单不允许 `git add -A`**。
- 7-8 若 `FROZEN_AFTER_S7_EXIT ≠ 0` → 锁文件未同步，**不得进 S8**。

④ 证据：`.scratch/t123w/gate-version-bump.log`（三条 `node -e` 输出 + 前后 grep + 变异自证三行 + `dist slot`）、`gate-pre-after-range.log`、`mut-gate-red.log`／`mut-gate-green.log`、`changeset-before.txt`／`changeset-after.txt`、`gate-lockfile-frozen-after-s7.log` → 入仓 `docs/research/t123-release-evidence/`。

---

## S8 `[AFK]` 发版前门禁全绿（**全绿才允许进 S9**）

① 命令（`pnpm build`／`pnpm test`／仓内 install 必须**持锁 §L**；读文件不用锁）

```powershell
cd D:\ilife
$log = 'D:\ilife\.scratch\t123w\gate-all-publish.log'
# —— 用 §L 包裹下面整块 ——
foreach ($c in @('pnpm build','pnpm boundaries','pnpm snapshot:check','pnpm publish:pre','pnpm publish:tarball')) {
  ("=== $c") | Out-File $log -Encoding utf8 -Append
  cmd /c "$c 2>&1" | Out-File $log -Encoding utf8 -Append
  ("$c EXIT=$LASTEXITCODE") | Out-File $log -Encoding utf8 -Append
}
# 锁文件冻结校验（S7-8 之后必须再绿一次；对应 ci.yml:28,69,103）
cmd /c "pnpm install --frozen-lockfile --lockfile-only --ignore-scripts 2>&1" | Out-File $log -Encoding utf8 -Append
("frozen-lockfile EXIT=$LASTEXITCODE") | Out-File $log -Encoding utf8 -Append
# publish:fresh 会 npm install 到仓外临时根（工具自带最小 package.json，符合协议 §2.1②）
cmd /c "pnpm publish:fresh 2>&1" | Out-File $log -Encoding utf8 -Append
("publish:fresh EXIT=$LASTEXITCODE") | Out-File $log -Encoding utf8 -Append
cmd /c "node tooling\check-publish.mjs --tmp-hygiene 2>&1" | Out-File $log -Encoding utf8 -Append
("tmp-hygiene EXIT=$LASTEXITCODE") | Out-File $log -Encoding utf8 -Append
cmd /c "node tooling\publish-chain.mjs --plan --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint 2>&1" | Out-File $log -Encoding utf8 -Append
("publish-chain:plan EXIT=$LASTEXITCODE") | Out-File $log -Encoding utf8 -Append
# 回归：本就有 21 条既有失败（.scratch/t75/baseline-failing.txt），验收 = 失败集 delta 为空
cmd /c "pnpm test 2>&1" | Out-File $log -Encoding utf8 -Append
("pnpm test EXIT=$LASTEXITCODE") | Out-File $log -Encoding utf8 -Append
# —— 释放锁 ——
Get-Content $log -Tail 5
Select-String -Path $log -Pattern 'FAIL|✖|not ok|AssertionError|处红' -Encoding utf8 | Measure-Object
```

② 期望可观察结果：`pnpm build`／`boundaries`／`snapshot:check`／`publish:pre`／`publish:tarball`／`frozen-lockfile`／`publish:fresh`／`--tmp-hygiene` 全 `PASS`（各末行 `check-publish <mode>：PASS`）；`publish-chain:plan` 打印 `base-paint → skill-calorie → dsh-calorie` 顺序；`pnpm test` 失败集与 `.scratch/t75/baseline-failing.txt`（21 条）**delta 为空**。

③ 失败判据／中止条件：任一门非 `PASS`／exit ≠ 0 → **中止**；`pnpm test` 失败集出现**新增**失败（delta ≠ 空）→ **中止**（不得用「本来就有 21 条红」搪塞；尤其 `smoke.test.mjs` 的版本行用例、`plugin-p10-boundaries`／`plugin-p10-install` 的依赖口径用例、`skills-export-47` 的版本钉死用例 —— 这些一变红就是 S7 漏改）；`frozen-lockfile` 非 0 → 回 S7-8；`--tmp-hygiene` 报仓内残留 `ilife-fresh-*`／`ilife-pack-*` → 先清残留再重跑（残留属协议 §2.1④ 违规）。**不要**用 `publish-chain.mjs --live` 代替 S9——它不带 `--registry`，会打向 npmmirror。

④ 证据：`.scratch/t123w/gate-all-publish.log`（**只读尾 5 行 + 失败签名计数**，不读全文）→ 入仓 `docs/research/t123-release-evidence/gate-all-publish.log`。

---

## S9 `[HITL]` 2FA 发布（逐包，顺序 = 依赖自底向上）

> **只有维护者能做**：`--otp` 是手机/密码器上的 6 位数。agent 不发布。
> 每包之间**必须**插入「注册表可见性确认 + 依赖范围解析确认」（见 9-2／9-3），不要一口气发完。

① 命令（**逐包执行**；`cd` 到包目录，`--registry` 必须显式）

```powershell
# 9-1 逐包发布（顺序固定：base-paint → skill-calorie → dsh-calorie）
cd D:\ilife\packages\base-render
npm publish --registry=https://registry.npmjs.org/ --access public --otp=<6位> 2>&1 | Out-File D:\ilife\.scratch\t123w\publish-base-paint.log -Encoding utf8
"PUBLISH_BASEPAINT_EXIT=$LASTEXITCODE"; Get-Content D:\ilife\.scratch\t123w\publish-base-paint.log -Tail 5

cd D:\ilife\packages\skill-calorie
npm publish --registry=https://registry.npmjs.org/ --access public --otp=<6位> 2>&1 | Out-File D:\ilife\.scratch\t123w\publish-skill-calorie.log -Encoding utf8
"PUBLISH_SKILLCALORIE_EXIT=$LASTEXITCODE"; Get-Content D:\ilife\.scratch\t123w\publish-skill-calorie.log -Tail 5

cd D:\ilife\packages\plugin-calorie
npm publish --registry=https://registry.npmjs.org/ --access public --otp=<6位> 2>&1 | Out-File D:\ilife\.scratch\t123w\publish-dsh-calorie.log -Encoding utf8
"PUBLISH_DSHCALORIE_EXIT=$LASTEXITCODE"; Get-Content D:\ilife\.scratch\t123w\publish-dsh-calorie.log -Tail 5
```

**9-2 每包之后的注册表可见性确认**（前一步不确认，不进下一步）

```powershell
npm view base-paint@<V_BASEPAINT> version <X>
npm view skill-calorie@<V_SKILL_CALORIE> version <X>
npm view dsh-calorie@<V_DSH_CALORIE> version <X>
```

**9-3 每包之后的依赖范围解析确认**（用 `--dry-run` 让 npm 真解析一次依赖树；落盘文件是 stdout+stderr 混合，故用 `Select-String` 而非 `ConvertFrom-Json` 解析）

```powershell
$t = Join-Path $env:TEMP ('ilife-t123w-resolve-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $t | Out-Null
'{ "name": "ilife-t123w-resolve", "version": "0.0.0", "private": true }' | Out-File "$t\package.json" -Encoding utf8
Push-Location $t
npm install skill-calorie@<V_SKILL_CALORIE> --dry-run --json <X> 2>&1 | Out-File D:\ilife\.scratch\t123w\resolve-skill-calorie.json -Encoding utf8
npm install dsh-calorie@<V_DSH_CALORIE> --dry-run --json <X> 2>&1 | Out-File D:\ilife\.scratch\t123w\resolve-dsh-calorie.json -Encoding utf8
Pop-Location
Select-String -Path D:\ilife\.scratch\t123w\resolve-*.json -Pattern 'base-paint|skill-calorie|dsh-life-pack' -Encoding utf8 | Select-Object -First 12
```

② 期望可观察结果：三包各 `+ <pkg>@<ver>` 且 `PUBLISH_*_EXIT=0`；`npm view … version` 打出的就是目标版本（**npmmirror 会滞后，务必带 `<X>`**）；`resolve-*.json` 里 `skill-calorie` 解析到 `<V_SKILL_CALORIE>`、`base-paint` 解析到 `<V_BASEPAINT>`、`dsh-life-pack` 解析到 `<V_LIFEPACK>`（`0.2.0`）。

③ 失败判据／中止条件：

- 任一次 publish `exit ≠ 0`（`EOTP`／`E401`／`EPUBLISHCONFLICT`／`403`）→ **停止，不继续发下一个包**。`EOTP` = OTP 过期/输错，重试当前包即可；`E401` = 凭据失效，回 S0-0；`EPUBLISHCONFLICT`/`403 cannot publish over` = 版本未 bump 或已被他人发过，回 S7。
- `npm view` 5 分钟后仍看不到新版本（带 `<X>`）→ **中止**（不要靠「等镜像同步」继续）。
- `resolve-*.json` 里解析到的是旧版本 → **中止**（这正是 `^0.1.0` 陷阱；发出去也装不到新代码）。
- **已发布不可撤回**：npm 对 72 小时内的版本可 `npm unpublish`（有严格限制、且会连带破坏依赖者）；本单**不主张** unpublish，补救路径见附录 B。

④ 证据：`publish-<pkg>.log`（完整发版日志，含 OTP 交互与时间戳）、`resolve-<pkg>.json`、`npm view` 输出 → 入仓 `docs/research/t123-release-evidence/`。

---

## S10 `[AFK]` 发布后复核（注册表侧）

① 命令

```powershell
cd D:\ilife
$log = 'D:\ilife\.scratch\t123w\post-publish-verify.log'
"# $(Get-Date -Format o)" | Out-File $log -Encoding utf8
foreach ($p in 'base-paint','skill-calorie','dsh-calorie') {
  "=== $p" | Out-File $log -Encoding utf8 -Append
  npm view $p version <X> | Out-File $log -Encoding utf8 -Append
  npm view $p dependencies --json <X> | Out-File $log -Encoding utf8 -Append
}
# 工具自带：registry 侧复核（含 workspace: 零容忍，带重试）
node tooling\check-publish.mjs --post --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint <X> 2>&1 | Out-File D:\ilife\.scratch\t123w\gate-post.log -Encoding utf8
"POST_EXIT=$LASTEXITCODE"
Get-Content D:\ilife\.scratch\t123w\gate-post.log -Tail 5
# tarball 下载断言（真从 registry 拉回来数文件）
$t = Join-Path $env:TEMP ('ilife-t123w-regpack-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $t | Out-Null
npm pack skill-calorie@<V_SKILL_CALORIE> --pack-destination $t <X> 2>&1 | Out-File "$t\pack.log" -Encoding utf8
tar -tzf "$t\skill-calorie-<V_SKILL_CALORIE>.tgz" | Select-String -Pattern 'package/SKILL.md|package/templates/'
```

② 期望可观察结果：`npm view` 三包版本 = 目标版本；`dependencies` 无 `workspace:` 且 range 指向新版本（`skill-calorie` 的 `base-paint: ^0.2.0`、`dsh-calorie` 的 `skill-calorie: ^0.2.0` 与 `dsh-life-pack: ^0.2.0`）；`--post` 末行 `PASS`（`POST_EXIT=0`）；registry tarball 里**同时**列出 `package/SKILL.md` 与 `package/templates/*.html`（6 件）。

③ 失败判据／中止条件：`--post` 非 `PASS`；任一 `dependencies` 含 `workspace:`；registry tarball 缺 `SKILL.md` 或模板 ≠ 6 件 → **中止后续真机步骤**（装到真机也是坏的），按附录 B 走补救。**不允许**用本仓 `dist` 的清单冒充 registry tarball 清单。

④ 证据：`.scratch/t123w/post-publish-verify.log`、`gate-post.log`、`tar -tzf` 清单 → 入仓 `docs/research/t123-release-evidence/`。

---

## S11 `[AFK]` 发版后冒烟两条（#123 验收原文）

> 冒烟前先取真库指纹（§9-6 零触碰）：本阶段只应新增 `calorie_html/*.html`，**DB 文件 SHA256 必须前后一致**。

① 命令

```powershell
# 11-0 零触碰基线
(Get-FileHash D:\2Study\StudyNotes\.db\calorie_data.db -Algorithm SHA256).Hash | Out-File D:\ilife\.scratch\t123w\db-hash-before.txt -Encoding utf8
$env:SKILLS_DB_PATH   # 期望 D:\2Study\StudyNotes\.db
$today = (Get-Date).ToString('yyyy-MM-dd')

# 11-1 冒烟①：envelope 必须含 output 且文件存在（§3.2 / #123 验收）
#   在仓外空目录执行，避免 npx 命中本仓 workspace 的本地 bin
$t = Join-Path $env:TEMP ('ilife-t123w-smoke-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $t | Out-Null
'{ "name": "ilife-t123w-smoke", "version": "0.0.0", "private": true }' | Out-File "$t\package.json" -Encoding utf8
Push-Location $t
npx -y -p skill-calorie@<V_SKILL_CALORIE> calorie-cmd-read calorie.view.home --params ('{"date":"' + $today + '"}') 2>&1 | Out-File "$t\smoke-envelope.json" -Encoding utf8
("SMOKE1_EXIT=$LASTEXITCODE")
Pop-Location
$envl = Get-Content "$t\smoke-envelope.json" -Raw -Encoding utf8 | ConvertFrom-Json   # 注意：不要用 $env 作变量名（PowerShell 保留）
("SMOKE1_HAS_OUTPUT=" + [bool]$envl.data.output)
("SMOKE1_OUTPUT_PATH=" + $envl.data.output)
("SMOKE1_FILE_EXISTS=" + (Test-Path $envl.data.output))
("SMOKE1_HAS_ILIFE_PAGE=" + ((Get-Content $envl.data.output -Raw -Encoding utf8) -match 'ilife-page'))

# 11-2 冒烟②：安装态 loadTemplate 能读 6 件模板（#95 的发版后 HITL）
Push-Location $t
npm install skill-calorie@<V_SKILL_CALORIE> --no-audit --no-fund <X> 2>&1 | Out-File "$t\smoke-install.log" -Encoding utf8
("SMOKE2_INSTALL_EXIT=$LASTEXITCODE")
# 走安装态 dist 文件路径：skill-calorie/render 这个公开出口会连带加载 base-paint（与 check-publish G3 同理由）
@'
import { loadTemplate } from "./node_modules/skill-calorie/dist/render/templates.js";
const names = ["diet", "exercise", "goal", "help", "home", "photo-gallery"];
let bad = 0;
for (const n of names) {
  try { const h = loadTemplate(n); if (typeof h !== "string" || h.length < 100) { console.log("BAD:" + n); bad++; } }
  catch (e) { console.log("THROW:" + n + ":" + e.message); bad++; }
}
console.log(bad ? "LOADTPL_FAIL=" + bad : "LOADTPL_OK=6");
process.exit(bad ? 1 : 0);
'@ | Out-File "$t\smoke-loadtemplate.mjs" -Encoding utf8
node "$t\smoke-loadtemplate.mjs"
("SMOKE2_LOADTPL_EXIT=$LASTEXITCODE")
Pop-Location

# 11-3 零触碰复核
(Get-FileHash D:\2Study\StudyNotes\.db\calorie_data.db -Algorithm SHA256).Hash | Out-File D:\ilife\.scratch\t123w\db-hash-after.txt -Encoding utf8
("DB_HASH_MATCH=" + ((Get-Content D:\ilife\.scratch\t123w\db-hash-before.txt) -eq (Get-Content D:\ilife\.scratch\t123w\db-hash-after.txt)))
```

② 期望可观察结果：`SMOKE1_EXIT=0`、`SMOKE1_HAS_OUTPUT=True`、`SMOKE1_FILE_EXISTS=True`、`SMOKE1_HAS_ILIFE_PAGE=True`；`SMOKE2_INSTALL_EXIT=0`、`SMOKE2_LOADTPL_EXIT=0` 且 `LOADTPL_OK=6`；`DB_HASH_MATCH=True`（真库零触碰）。

③ 失败判据／中止条件：

- `SMOKE1_EXIT=4` → 当日窗口无数据（**不是包的问题**）：先按 §4 的 HITL-0 真实记一餐，再重跑；**不得**用空库同文顶替，也不得改系统时钟。
- `SMOKE1_HAS_OUTPUT=False` 或文件不存在 → 发出去的包不含 #87 落盘逻辑 → **记缺证据**，按附录 B 处理（不得进 S12）。
- 出现 `does not provide an export named` → 说明 `base-paint` 版本偏斜（闭包定案要防的正是它）→ 回 S6 复核、按附录 B 处理。
- `LOADTPL_FAIL>0` → 模板未随包或装载器坏 → **中止**。
- DB SHA256 前后不一致 → **立即停手**，记录并报告（§9-6 零触碰被破）。

④ 证据：`smoke-envelope.json`（envelope 原文）、落盘 HTML 路径 + 首行含 `ilife-page`、`smoke-install.log`、`LOADTPL_OK=6` 行、`db-hash-before/after.txt` → 入仓 `docs/research/t123-release-evidence/`（HTML 产物同时给路径与文件大小）。

---

## S12 `[HITL]` 真机安装与重启（**先解除 junction，否则证据无效**）

> **阻断级前置（P-3）**：真机 `~/.dsh/profiles/web/node_modules` 现在是 **junction 直连工作区**，且是**多层链**。本单现场实测（`[实测·本单 2026-09-09]`，逐跳解析）：
>
> ```
> profile\node_modules\dsh-calorie    Junction → D:\ilife\packages\plugin-calorie
> profile\node_modules\dsh-life-pack  Junction → D:\ilife\packages\plugin-manager
> profile\node_modules\skill-calorie  Junction → profile\.dsh-module-fallback\node_modules\skill-calorie
>         └→ Junction → D:\ilife\packages\plugin-calorie\node_modules\skill-calorie
>                 └→ Junction → D:\ilife\packages\skill-calorie
> profile\node_modules\base-paint     Junction → profile\.dsh-module-fallback\node_modules\base-paint
>         └→ Junction → D:\ilife\packages\plugin-calorie\node_modules\skill-calorie\node_modules\base-paint
>                 └→ Junction → D:\ilife\packages\base-render
> profile\node_modules\dsh-better-sidebar  真实目录（非 junction，0.18.0）
> ```
>
> 即：`skill-calorie`／`base-paint` 经 `.dsh-module-fallback` **再套一层**仍解析进 `D:\ilife`（R2 J1–J3 同结论）。**今天在真机取证 = 取到工作区代码（假绿）**；R2 J4 的决定性证据是真机 `dsh-calorie/dist/client.js` SHA256 与工作区产物**完全一致**、与 registry tarball 不同。
> **不解除 junction，则 #115（两处面板截图）与 #56（技能目录可查）的证据一律无效**——`docs/calorie-dual-path-acceptance.md` §9-5「版本一致」与 §9-7「无替代品」都不成立。

**两条可选解除路径（二选一，各自风险写清）：**

| 路径 | 命令要点 | 风险 |
| --- | --- | --- |
| **① 新建干净 profile**（推荐） | `dsh plugin --profile web-clean add dsh-calorie@<V_DSH_CALORIE> dsh-life-pack@<V_LIFEPACK> --config.minimumReleaseAge=0 --registry=https://registry.npmjs.org/`；随后把 **`dsh-better-sidebar`（真名，`0.18.0`）** 一并装上（否则边栏槽缺失 → 截图无从取得，§2.3 前置） | 新 profile 无原 profile 的其它插件与 UI 状态；需确认 DSH 能用新 profile 起来；证据必须标注「新 profile（非原 `web`）」 |
| **② 现有 profile 显式版本重装真包** | 同上命令但 `--profile web`，并**先备份** `profiles\web\package.json` 与 `node_modules` 清单 | 该 profile 已是 dev 链接态（`dsh-memo-ilife`／`dsh-prompt` 本身就是 `link:D:\ilife\...`／`link:D:/dsh-plugin/...`）；若安装器在本地工作区存在时仍走 link/junction，**装完还是假绿**；一旦装坏影响日常使用，回滚靠附录 B-3 |

① 命令

```powershell
# 12-0 装前取证：junction 与 profile range 现状（**先确认阻断存在**）
$nm = Join-Path $env:USERPROFILE '.dsh\profiles\web\node_modules'
$rmBefore = foreach ($n in 'dsh-calorie','dsh-life-pack','skill-calorie','base-paint','dsh-better-sidebar') {
  $p = Join-Path $nm $n
  if (Test-Path $p) { $i = Get-Item $p -Force; "$n :: link=$($i.LinkType) target=$(($i.Target) -join '|')" }
  else { "$n :: MISSING" }
}
$rmBefore | Out-File D:\ilife\.scratch\t123w\realmachine-before.txt -Encoding utf8
$rmBefore
Get-Content (Join-Path (Split-Path $nm) 'package.json') -Encoding utf8 | Select-String 'dsh-calorie|dsh-life-pack|skill-calorie|dsh-better-sidebar'
# 期望看到：profile 声明 "dsh-calorie": "^0.1.5" → **解析不到 0.2.0** → 必须显式版本安装
#   且上述五包里四个 link=Junction → **阻断成立**，不得直接进 12-2

# 12-1 显式版本重装（一条命令装双包；skill-calorie 由依赖链带出）
#   路径①：--profile web-clean（新建）；路径②：--profile web（现有，先备份）
dsh plugin --profile web add dsh-calorie@<V_DSH_CALORIE> dsh-life-pack@<V_LIFEPACK> --config.minimumReleaseAge=0 --registry=https://registry.npmjs.org/ 2>&1 | Out-File D:\ilife\.scratch\t123w\install-realmachine.log -Encoding utf8
"INSTALL_EXIT=$LASTEXITCODE"
Get-Content D:\ilife\.scratch\t123w\install-realmachine.log -Tail 20

# 12-2 落盘三包版本（必须与注册表一致；且**不再是 junction**）
#   走路径①（新 profile）时，把下面两处的 profiles\web 换成 profiles\web-clean
node -e "const p=process.env.USERPROFILE+'\\.dsh\\profiles\\web\\node_modules\\'; for (const n of ['dsh-calorie','dsh-life-pack','skill-calorie','base-paint']) { try { console.log(n, require(p+n+'/package.json').version) } catch(e) { console.log(n, 'MISSING') } }" |
  Out-File D:\ilife\.scratch\t123w\realmachine-versions.txt -Encoding utf8
Get-Content D:\ilife\.scratch\t123w\realmachine-versions.txt
$rmAfter = foreach ($n in 'dsh-calorie','skill-calorie','base-paint') {
  $p = Join-Path $nm $n; if (Test-Path $p) { $i = Get-Item $p -Force; "$n :: link=$($i.LinkType) target=$(($i.Target) -join '|')" }
}
$rmAfter | Out-File D:\ilife\.scratch\t123w\realmachine-after.txt -Encoding utf8
$rmAfter
# 期望 LinkType 全为空（真实目录）；若仍是 Junction → **假绿，证据无效**

# 12-3 托盘 Quit 重启 DSH（不是关窗口）
#   托盘图标右键 → Quit → 重新启动 DSH → 等 30 秒
```

② 期望可观察结果：

- 12-0 打印四个 `link=Junction` ＋ profile `dsh-calorie: ^0.1.5`（**这就是阻断现状，必须解除**）。
- `install-realmachine.log` 里**一条命令同时出现** `dsh-calorie@<V_DSH_CALORIE>` 与 `skill-calorie@<V_SKILL_CALORIE>`（**腿1.1 判据：单命令装双包**）。
- `realmachine-versions.txt` 四行 = `dsh-calorie <V_DSH_CALORIE>` / `dsh-life-pack <V_LIFEPACK>` / `skill-calorie <V_SKILL_CALORIE>` / `base-paint <V_BASEPAINT>`。
- `realmachine-after.txt` 里 `link=` 全为空（junction 已解除）；进一步用 SHA256 反证：真机 `dist/client.js` 与工作区产物**不同**（与 R2 J4 相反）。
- 重启后 DSH 正常起来（面板/技能目录可用）。

③ 失败判据／中止条件：

- **12-0 未确认阻断就跳过** → 直接判**证据无效**（本单不接受「反正版本对上了」）。
- 安装 `exit ≠ 0`；日志里 `skill-calorie` 未随 `dsh-calorie` 落盘（或落成旧版本）→ **中止并记缺证据**（腿1.1 不成立）。
- `link=` 仍为 `Junction`（任一个）→ **验收不成立**，回 12-0 换路径①；**不得**用该环境继续取证。
- 落盘版本 ≠ 注册表版本；重启后 DSH 起不来 → 立即回滚（附录 B-3）。
- 新 profile 路径下 `dsh-better-sidebar` 未装 → 边栏截图无从取得 → 记缺证据（§2.3 前置）。

④ 证据：`install-realmachine.log`（**完整安装日志**，不许截断）、`realmachine-versions.txt`、`realmachine-before.txt`／`realmachine-after.txt`（含 LinkType）、重启前后各一张截图 → 入仓 `docs/research/t123-release-evidence/`。

---

## S13 `[HITL]` 收尾、回贴与证据归档

① 命令 / 动作

```powershell
cd D:\ilife
git status --short
# 把入仓证据加进来（**只加自己声明的路径**，禁 git add -A / git add .）
git add docs/research/t123-release-runbook.md docs/research/t123-release-evidence
git status --short -- docs/research
# 提交（持锁 §L；中文提交信息，格式见协议 §3.1）
```

② 期望可观察结果：`git status --short` 只含本票路径 + 他人的在途改动（不动）；提交成功（提交由维护者/编排者决定，agent 不提交）。

③ 失败判据／中止条件：`git status` 出现本次发版集合的 `package.json`／`SKILL.md`／`slot.ts`／测试断言／changeset／`pnpm-lock.yaml` 改动**未提交** → 先补提交再收尾（协议 §3.1「宁可多 commit」）；出现他人路径改动 → **不要**一起提交。

④ 证据与回贴（**四个 HITL 项都要有落点**）：

| 项 | 谁做 | 落点 |
| --- | --- | --- |
| `npm login`／凭据修复 | `[HITL]` 维护者 | `whoami-before/after.log`；结论回贴 #123 |
| 2FA OTP 发版 | `[HITL]` 维护者 | `publish-<pkg>.log`；结论回贴 #123 |
| 托盘 Quit 重启 | `[HITL]` 维护者 | 重启前后截图；结论回贴 #123 |
| 真机截图（#115 的两处面板截图） | `[HITL]` 维护者 | 本单只登记落点：`docs/research/t123-release-evidence/` 下 `<日期>-panel-settings.png`／`<日期>-panel-sidebar.png`；**执行与对数归 #115** |
| opencode 手跑（#116 真实性旁证） | `[HITL]` 维护者 | 本单只登记落点：`docs/research/t123-release-evidence/opencode-manual-<日期>.png`；**执行与判定归 #116** |
| #56 技能目录可查（一句话确认） | `[HITL]` 维护者 | 截图/文字 → 回贴 #56 |
| #95 模板装载 HITL | 本单 S11-2 已跑 | `LOADTPL_OK=6` → 回贴 #95 |

---

## 附录 A 唯一闭包命令序列（`base-paint` → `skill-calorie` → `dsh-calorie`）

```powershell
# 发版集合 = {base-paint, skill-calorie, dsh-calorie}；dsh-life-pack 不发，但 range 指向已发布 ^0.2.0
cd D:\ilife\packages\base-render
npm publish --registry=https://registry.npmjs.org/ --access public --otp=<6位>
npm view base-paint@<V_BASEPAINT> version --registry=https://registry.npmjs.org/

cd D:\ilife\packages\skill-calorie
npm publish --registry=https://registry.npmjs.org/ --access public --otp=<6位>
npm view skill-calorie@<V_SKILL_CALORIE> dependencies --json --registry=https://registry.npmjs.org/
# 期望：{"base-paint":"^0.2.0"}

cd D:\ilife\packages\plugin-calorie
npm publish --registry=https://registry.npmjs.org/ --access public --otp=<6位>
npm view dsh-calorie@<V_DSH_CALORIE> dependencies --json --registry=https://registry.npmjs.org/
# 期望：{"skill-calorie":"^0.2.0","dsh-life-pack":"^0.2.0"}
```

> 与 S9 的关系：**S9 是本序列的唯一权威落点**（含逐包确认与失败判据）；本附录只作一页速查，若两者不一致，**以 S9 为准**。

## 附录 B 中止与回滚

1. **任何一步失败 → 停止，不继续发下一个包。** 已发布的包无法「收回」；半发布的集合（例如 `base-paint` 发了、`skill-calorie` 挂了）在 registry 上就是**不一致状态**，此时唯一的干净出路是**继续修到能发，再发更高版本**。
2. **补救路径（已发布版本不可撤回时）**：修好根因 → 把版本**再 +1**（`patch` 即可，例如 `0.2.1`）→ 重跑 S1–S8 → 重发。**不要**依赖 `npm unpublish`：72 小时窗口、连带破坏依赖者、且本单未把它列为授权动作。
3. **真机回滚**：若 S12 装完 DSH 起不来 → `dsh plugin --profile <原 profile> add dsh-calorie@<旧版本> dsh-life-pack@<旧版本> --config.minimumReleaseAge=0 --registry=https://registry.npmjs.org/`（旧版本 = S12-0 记录的值），再托盘 Quit 重启。
4. **工作树污染回滚**：S7 改了 `package.json`／`SKILL.md`／`slot.ts`／测试断言／changeset／锁文件但发版失败 → **不要** `git checkout -- .`／`git reset --hard`（协议 §3 明令禁止，会毁掉并发伙伴的未提交工作）；用 `git diff` 逐文件手工还原，或把改动**作为一次提交**留在分支上并注明「未发布」。
5. **协议事故**（`node_modules/.bin` ≠ 9、build 缺 `tsc`）→ 立即停下报告编排者，**不要**自行 `pnpm install`。
6. **锁文件回滚**：`pnpm-lock.yaml` 被误改 → **不要** `git checkout -- pnpm-lock.yaml`（同样是危险 git）；用 `git diff pnpm-lock.yaml` 逐处还原，或按 S3 重新 `pnpm install --lockfile-only` 生成后核对差异。

## 附录 C 证据清单对照 §9 七条

| 证据名 | 命令 | 落点 | 满足 §9 哪一条 |
| --- | --- | --- | --- |
| `whoami-before.log` / `whoami-after.log` / `ping.log` | `npm whoami <X>`（修前/修后）＋ `npm login` | `.scratch/t123w/` → `docs/research/t123-release-evidence/` | 1 可复现（含 exit） |
| `version-tuple.txt` | `git rev-parse --short HEAD` ＋ `node/npm/pnpm --version` ＋ 三包版本 + 日期 + 闭包序列 | 同上 | 1 可复现 |
| `gate-worktree-clean.log` | `git status --short -- <pkgdir>` × 3 ＋ `-- pnpm-lock.yaml` | 同上 | 1 可复现、5 版本一致 |
| `gate-env-baseline.log` | `Get-ChildItem node_modules\.bin`／`npm whoami <X>`／`pnpm changeset status` | 同上 | 1 可复现 |
| `gate-lockfile-frozen.log`（＋ `-after-s7`） | `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts`（改 range 前后各一次） | 同上 | 1 可复现、3 机器可判 |
| `gate-rebuild-dist.log` | 删 `dist`+`tsbuildinfo` → 持锁 `pnpm build` → mtime + 导出面 + 关键串断言 | 同上 | 1 可复现、3 机器可判 |
| `pack-dryrun-<pkg>.json` | `npm pack --dry-run --json` × 3 | 同上 | 3 机器可判 |
| `probe-reg-*.log` / `probe-local-*.log` | 仓外隔离安装 + 导出面断言（反例／正例） | 同上 | 3 机器可判、7 无替代品 |
| `gate-version-bump.log` / `gate-pre-after-range.log` / `mut-gate-*.log` | 版本＋range＋门禁正则＋**变异自证**＋同步点 grep | 同上 | 3 机器可判、1 可复现 |
| `gate-all-publish.log` | `pnpm build`／`boundaries`／`snapshot:check`／`publish:pre`／`publish:tarball`／`frozen-lockfile`／`publish:fresh`／`--tmp-hygiene`／`pnpm test` | 同上 | 3 机器可判 |
| `publish-<pkg>.log` | `npm publish --registry=… --otp=<6位>` × 3 | 同上 | 1 可复现、5 版本一致 |
| `post-publish-verify.log` / `gate-post.log` | `npm view <pkg> version|dependencies` ＋ `check-publish --post` | 同上 | 5 版本一致、3 机器可判 |
| `smoke-envelope.json` ＋ 落盘 HTML | `npx -p skill-calorie@<V> calorie-cmd-read calorie.view.home --params '{"date":"<今天>"}'` | 同上 | 2 可打开（`output` 路径 + `ilife-page`）、7 无替代品 |
| `smoke-install.log` ＋ `LOADTPL_OK=6` | 仓外 `npm install skill-calorie@<V>` ＋ 逐件 `loadTemplate` | 同上 | 3 机器可判、7 无替代品 |
| `realmachine-before.txt` / `realmachine-after.txt` | 逐跳 `Get-Item -Force` 的 LinkType/Target | 同上 | 5 版本一致（junction 已解除）、7 无替代品 |
| `install-realmachine.log` | `dsh plugin --profile <p> add dsh-calorie@<V> dsh-life-pack@<V> …` | 同上 | 1 可复现、腿1.1 单命令装双包 |
| `realmachine-versions.txt` | `node -e require(...package.json).version` × 4 | 同上 | 5 版本一致 |
| `db-hash-before.txt` / `db-hash-after.txt` | `Get-FileHash …calorie_data.db -Algorithm SHA256` | 同上 | 6 零触碰 |
| 面板两处截图 + `opencode` 手跑截图 | 维护者手工 | 同上（**执行归 #115／#116**） | 2 可打开、4 数据标注、7 无替代品 |

> §9-4 数据标注口径：S11-1 冒烟标注「真机真实数据（HITL-0，经 `SKILLS_DB_PATH` 真库）」；S6／S11-2 标注「隔离仿真／仓外临时根」，**两者不得混用**。

## 附录 D 本单与 #123 票面的不一致（只登记，不改票）

1. 票面「同步 SKILL.md 的 **3 处**版本串」→ 实际 SKILL.md 内 4 处（3 行），另有 `test/skills-export-47.test.mjs:55,57`（不同步则该单测必红）与 `docs/public-installer-47.md:22`（诊断 §5）。
2. 票面「必须带上的四项」**未列 `base-paint`** → 不发它则 #87／#95 的成果在第三方安装态 import 即崩（诊断 §10.1；R1 C4／L4）。
3. 票面只提 `skill-calorie` 的依赖范围 → `dsh-calorie` 的 `dsh-life-pack: ^0.1.0` 同样解析不到已发布 `0.2.0`（诊断 §10.2；R1 P2/P3）。
4. 票面「删除对应 changeset 文件（沿用 1519c10）」→ 卡路里 changeset 与 `dsh-life-pack`／5 个其它单品**跨包耦合**，直删会吞掉本次不发包的 pending bump（诊断 §6.2 硬坑 1）。
5. 票面未提发布凭据、锁文件与 changesets CLI 状态 → 本机 npmjs token **401 失效**（本单实测）、`42a5b49` 曾造成 `pnpm-lock.yaml` 不一致（CI 三处 `--frozen-lockfile` 红，C1 已同步）、`@changesets/*` 在 `.pnpm` 内为**空目录**（诊断 §7／§1.4／R2 FX-R2-2）。
6. 票面写 `better-sidebar` → **真名 `dsh-better-sidebar`**（`0.18.0`），按票面名字查会误判「缺失」（prereq P-1／P-4）。
7. 票面未登记两处同步点：`packages/plugin-calorie/src/slot.ts:19-20` 版本常量、四处测试断言（`smoke.test.mjs:33,34`、`plugin-p10-boundaries.test.mjs:34,38,39`、`plugin-p10-install.test.mjs:43,46`）——漏改 → `pnpm test` 新增失败（R1 FX-R1-1／FX-R1-2）。**C1 已补改**（见 §0.1），本单 S7-4／7-5 逐条复核。

## 附录 E 本单的验证状态（**未验证项清单**）

| 项 | 状态 |
| --- | --- |
| 三包当前版本（`0.2.0`／`0.2.0`／`0.2.0`）／三处 range（均 `^0.2.0`）／`slot.ts:19-20`（`0.2.0`）／四处测试断言现值／`skills-export-47.test.mjs:57`（`@0.2.0`）／`check-publish.mjs:83,108,109` 新断言／`ci.yml:28,69,103`／`pnpm-lock.yaml` 两 importer specifier 均 `^0.2.0`／`npm whoami <X>` = 401／真机 junction 多层链／`.bin` = 9／changeset 53 个／基线 21 条 | `[实测·本单 2026-09-09]` |
| `node tooling/check-publish.mjs --pre --only …` 现状 = `PASS`／exit 0 | `[实测·本单 2026-09-09]`（只读跑过，日志 `.scratch/t123c3/gate-pre-now.log`） |
| `packages/plugin-calorie/dist/slot.js` 仍是 `0.1.6`／`0.1.1`（`src` 已 `0.2.0`）→ 未重建 | `[实测·本单 2026-09-09]` |
| `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts` 的 exit 码（本单未在仓内跑，协议禁仓内 install） | `[未验证]`（R2 在仓外复本实测 exit 1，`[转引 R2]`；C1 同步后应转绿但未实测） |
| S7 的 `pnpm install --lockfile-only` 同步后 `git status --short -- pnpm-lock.yaml` 的具体差异 | `[未验证]` |
| 7-3b 变异自证（把 `:28` 改 `^0.3.0` → 门禁红 → 还原 sha 一致 → 绿） | `[未验证]`（本单未改任何 manifest） |
| `pnpm build`／`pnpm test`／`publish:*` 各门禁的 exit 码 | `[未验证]`（本单未跑 build/test，未持锁） |
| `npm publish`／`npm view` 发版后结果、真机 `dsh plugin` 安装、托盘重启、冒烟 `npx` 与 `loadTemplate` | `[未验证]`（只有维护者能执行） |
