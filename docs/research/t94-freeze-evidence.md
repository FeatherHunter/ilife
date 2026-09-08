# t94 冻结旧版 HELP 实例入仓 ＋ 验收规格迁 docs/ —— 证据

- 票：`#94`（map `#63`，`wayfinder:task`）
- 仓库：`FeatherHunter/ilife`，分支 `master`
- 本文件：`docs/research/t94-freeze-evidence.md`
- 执行约束：不执行任何 `git add/commit/push/checkout/stash/clean`；不写入 `D:\2Study` 任何文件；
  未读取 `D:\2Study\StudyNotes\SKILLS\卡路里\.个人笔记不允许参考`；未运行 `pnpm build`／`pnpm test`。

---

## 结论（前置）

### A. 冻结两个 HELP 实例 —— **完成**

两个旧版 HELP 实例已从上游**只读复制**入仓，源哈希与仓内哈希**逐字相同**。

| 仓内路径 | 字节数 | 行数 | SHA-256（源 = 仓内） |
| --- | ---: | ---: | --- |
| `fixtures/help-instances/卡路里_HELP_20260730_130429.html` | 65,366 | 492 | `56807c11bd32be7afd7a3a2623ee1a79ef2bf41e6ecb08077b758de144befa28` |
| `fixtures/help-instances/卡路里_HELP_20260731_201530.html` | 73,811 | 596 | `1c7a0f1168fb34badbc83e73115ad4d6dd6fb9b9f7b677d2f0aee8184d84e8c1` |

哈希清单：`fixtures/help-instances/SHA256SUMS.txt`（标准 `sha256sum` 两列格式，204 B，UTF-8 无 BOM，LF）。
说明文档：`fixtures/help-instances/README.md`（4,686 B）。

### B. 第二条验收（视觉规格／t67-t72 报告在 `docs/` 且被 git 跟踪）—— **已满足**

`git ls-files docs/research` 命中全部 8 个预期文件（`benchmark-visual-spec.md` ＋ `t67/t68/t69/t71/t72` 系列），
且 `.scratch/research/` 下的同名副本与 `docs/research/` 版本**逐字节相同**，迁移未丢内容。
逐条判定见第 6 节。

### C. 收尾裁定已执行 —— 遗留副本登记保留 ＋ 2 处指针已修

`docs/` 迁移是**复制而非移动**：`.scratch/research/` 仍留有逐字节相同的 8 个重复副本。
编排者裁定：**保留**（**权威在 `docs/research/`**，`.scratch/` 从不入库）、修 2 处指针、第 3 处历史陈述不动。
执行结果：2 处指针已修，**指向已迁入 `docs/` 的 8 份文档的残留引用 = 0**；
剩余 12 处命中全部指向 `.scratch/` 独有产物（目标均存在）。详见第 7.1 节。

---

## 1. 认领

```
$ gh issue edit 94 --add-assignee "@me"
https://github.com/FeatherHunter/ilife/issues/94

$ gh issue view 94 --json assignees
{"assignees":[{"id":"MDQ6VXNlcjEyOTY3Nzg1","login":"FeatherHunter","name":"王辰浩","databaseId":12967785}]}
```

assignee = `FeatherHunter`。票仍为 `OPEN`，未关闭、未回贴（按约定由编排者统一处理）。

## 2. 落位决策：本仓无既有 `fixtures/` 约定

任务要求「先查仓内既有 `fixtures/` 约定；无既有约定则用 `fixtures/help-instances/`（新建）」。实测：

```
$ git -C D:\ilife ls-files | Select-String -Pattern 'fixture|golden|testdata'
(空输出，命中 0)

$ Get-ChildItem D:\ilife -Recurse -Directory -Force | Where-Object { $_.Name -match 'fixture|fixtures|__fixtures__|golden|testdata' }
(空输出，命中 0)

$ Test-Path D:\ilife\fixtures
False
```

→ **无既有约定**，故新建 `fixtures/help-instances/`。`.gitignore` 未忽略 `fixtures/`（`.gitignore` 仅 3 行：
`node_modules/`、`packages/*/dist/`、`*.tsbuildinfo`），故新增文件可被跟踪。

## 3. 冻结产物（新增文件精确路径与字节数）

| 路径 | 字节数 | 说明 |
| --- | ---: | --- |
| `fixtures/help-instances/卡路里_HELP_20260730_130429.html` | 65,366 | 只读复制自上游，文件名逐字保持 |
| `fixtures/help-instances/卡路里_HELP_20260731_201530.html` | 73,811 | 只读复制自上游，文件名逐字保持 |
| `fixtures/help-instances/SHA256SUMS.txt` | 204 | 标准 `sha256sum` 两列格式 |
| `fixtures/help-instances/README.md` | 4,686 | 来源／用途／复现方式／只读纪律 |
| `docs/research/t94-freeze-evidence.md` | 本文件 | 证据 |

**另修改 2 个既有文件**（收尾裁定，各 1 行，见 7.1.2）：

| 路径 | 改动 |
| --- | --- |
| `docs/research/t71-old-baseline-inventory.md` | 第 637 行绝对路径 → 仓内相对路径 |
| `docs/research/t72-shared-layer-gap.md` | 第 10 行 `.scratch/research/` → `docs/research/` |

来源绝对路径（**源目录全程只读，从未写入**）：

```
D:\2Study\StudyNotes\SKILLS\卡路里\calorie_html\卡路里_HELP_20260730_130429.html
D:\2Study\StudyNotes\SKILLS\卡路里\calorie_html\卡路里_HELP_20260731_201530.html
```

复制命令（`Copy-Item` 二进制安全）：

```powershell
$src='D:\2Study\StudyNotes\SKILLS\卡路里\calorie_html'
$dst='D:\ilife\fixtures\help-instances'
Copy-Item -LiteralPath "$src\卡路里_HELP_20260730_130429.html" -Destination $dst
Copy-Item -LiteralPath "$src\卡路里_HELP_20260731_201530.html" -Destination $dst
```

## 4. 逐字自证（源哈希 vs 仓内哈希）

复制后重新哈希并与源文件逐字比对：

```
$src='D:\2Study\StudyNotes\SKILLS\卡路里\calorie_html'; $dst='D:\ilife\fixtures\help-instances'
$ns=@('卡路里_HELP_20260730_130429.html','卡路里_HELP_20260731_201530.html')
foreach($n in $ns){ $h1=(Get-FileHash -LiteralPath "$src\$n" -Algorithm SHA256).Hash
                    $h2=(Get-FileHash -LiteralPath "$dst\$n" -Algorithm SHA256).Hash
                    "FILE: $n"; "  src: $h1"; "  dst: $h2"; "  IDENTICAL: " + ($h1 -eq $h2) }
```

输出：

```
FILE: 卡路里_HELP_20260730_130429.html
  src: 56807C11BD32BE7AFD7A3A2623EE1A79EF2BF41E6ECB08077B758DE144BEFA28
  dst: 56807C11BD32BE7AFD7A3A2623EE1A79EF2BF41E6ECB08077B758DE144BEFA28
  IDENTICAL: True
FILE: 卡路里_HELP_20260731_201530.html
  src: 1C7A0F1168FB34BADBC83E73115AD4D6DD6FB9B9F7B677D2F0AEE8184D84E8C1
  dst: 1C7A0F1168FB34BADBC83E73115AD4D6DD6FB9B9F7B677D2F0AEE8184D84E8C1
  IDENTICAL: True
```

→ **两文件源／仓内哈希逐字相同（`IDENTICAL: True` ×2）。**

字节数／行数／首行／末行／BOM 体检：

```
$dst='D:\ilife\fixtures\help-instances'
foreach($n in $ns){ $p="$dst\$n"; $b=[System.IO.File]::ReadAllBytes($p)
  $bom=($b.Length -ge 3 -and $b[0] -eq 239 -and $b[1] -eq 187 -and $b[2] -eq 191)
  $lines=@(Get-Content -LiteralPath $p -Encoding UTF8)
  "FILE: $n"; "  bytes=$($b.Length) lines=$($lines.Count) bom=$bom lastbyte=$($b[$b.Length-1])"
  "  first120=<<" + $lines[0].Substring(0,[Math]::Min(120,$lines[0].Length)) + ">>" }
```

输出：

```
FILE: 卡路里_HELP_20260730_130429.html
  bytes=65366 lines=492 bom=False lastbyte=62
  first120=<<<!DOCTYPE html>>>
FILE: 卡路里_HELP_20260731_201530.html
  bytes=73811 lines=596 bom=False lastbyte=62
  first120=<<<!DOCTYPE html>>>
```

末行（确认是完整 HTML 文档，非截断）：

```
  卡路里_HELP_20260730_130429.html -> </html>
  卡路里_HELP_20260731_201530.html -> </html>
```

`lastbyte=62` 即 `>`，与末行 `</html>` 一致；两文件首行均为 `<!DOCTYPE html>`，**均为完整 HTML 文档**，
UTF-8 无 BOM。

哈希清单自校验（按 `SHA256SUMS.txt` 逐行复核）：

```
$d='D:\ilife\fixtures\help-instances'
$b=[System.IO.File]::ReadAllBytes("$d\SHA256SUMS.txt")
"bytes=$($b.Length) bom=... crlf=... lf=..."
Get-Content -LiteralPath "$d\SHA256SUMS.txt" -Encoding UTF8 | ForEach-Object {
  if ($_ -match '^([0-9a-f]{64})\s{2}(.+)$') { ... } }
```

输出：

```
=== SHA256SUMS.txt bytes/BOM/EOL ===
bytes=204 bom=False crlf=0 lf=2
=== verify against SHA256SUMS.txt ===
OK    卡路里_HELP_20260730_130429.html
OK    卡路里_HELP_20260731_201530.html
```

→ 清单本身可被消费，两行均 `OK`。

## 5. 零跟踪判定（上游 `github.com/FeatherHunter/SKILLS.git`）

```
$ git -C D:\2Study\StudyNotes\SKILLS remote -v
origin  https://github.com/FeatherHunter/SKILLS.git (fetch)
origin  https://github.com/FeatherHunter/SKILLS.git (push)

$ git -C D:\2Study\StudyNotes\SKILLS -c core.quotepath=false ls-files -- "卡路里/calorie_html"
(空输出)
$ (… | Measure-Object).Count
0

$ git -C D:\2Study\StudyNotes\SKILLS -c core.quotepath=false check-ignore -v -- "卡路里/calorie_html/卡路里_HELP_20260730_130429.html"
.gitignore:92:卡路里/calorie_html/    卡路里/calorie_html/卡路里_HELP_20260730_130429.html
```

对照上游根 `.gitignore` 第 91–92 行：

```
91: # 卡路里 calorie_html 进程输入 JSON(运行时交互中间产物,不入库)
92: 卡路里/calorie_html/
```

以及 `卡路里/.gitignore` 第 41 行：

```
41: calorie_html/*.html
```

**判定**：两文件在上游跟踪数 = 0，成因是**显式 gitignore 规则**（根 `.gitignore:92` 整体忽略该目录，
`卡路里/.gitignore:41` 亦命中），并非「尚未 `git add`」。因此不能指望上游补跟踪，冻结入本仓是必要动作。

上游同类对照物**已被跟踪**，可佐证这两个是唯一漏网的（`git ls-files -- "*HELP*"` 摘录）：

```
图眼/图眼_HELP.html
居家管家/.notes/HELP_demo.html
居家管家/.notes/HELP_demo_FINAL.html
居家管家/.notes/HELP_fixed.html
居家管家/.notes/HELP_shots/REPORT.md
```

## 6. 第二条验收复核（不照抄预查结论，实测）

### 6.1 实测命令与输出

```
$ git -C D:\ilife ls-files -- docs/research | Select-String -Pattern 'benchmark-visual-spec|t6[789]|t7[12]'

docs/research/benchmark-visual-spec.md
docs/research/t67-key-audit.md
docs/research/t68-parity-gaps.md
docs/research/t69-dual-path-evidence.md
docs/research/t71-help-dissect.md
docs/research/t71-old-baseline-inventory.md
docs/research/t71-old-trigger-records.csv
docs/research/t72-shared-layer-gap.md
```

### 6.2 逐条判定

| 预期文件 | `git ls-files` 命中 | 磁盘字节数 | 判定 |
| --- | --- | ---: | --- |
| `docs/research/benchmark-visual-spec.md` | 是 | 72,182 | 已满足 |
| `docs/research/t67-key-audit.md` | 是 | 38,297 | 已满足 |
| `docs/research/t68-parity-gaps.md` | 是 | 21,096 | 已满足 |
| `docs/research/t69-dual-path-evidence.md` | 是 | 19,974 | 已满足 |
| `docs/research/t71-help-dissect.md` | 是 | 40,642 | 已满足 |
| `docs/research/t71-old-baseline-inventory.md` | 是 | 90,195 | 已满足 |
| `docs/research/t71-old-trigger-records.csv` | 是 | 42,052 | 已满足 |
| `docs/research/t72-shared-layer-gap.md` | 是 | 49,976 | 已满足 |

`benchmark-visual-spec.md` 字节数与预查给出的 72,182 B **一致**（独立复核，非照抄）。

### 6.3 迁移内容完整性（`docs/` vs `.scratch/research/` 哈希比对）

```
$fs=@('benchmark-visual-spec.md','t67-key-audit.md','t68-parity-gaps.md','t69-dual-path-evidence.md',
      't71-help-dissect.md','t71-old-baseline-inventory.md','t71-old-trigger-records.csv','t72-shared-layer-gap.md')
foreach($f in $fs){ 比对 (Get-FileHash '.scratch\research\$f') 与 (Get-FileHash 'docs\research\$f') }
```

输出（SHA-256 前 12 位）：

```
benchmark-visual-spec.md           scratch=BC40E9C98830 docs=BC40E9C98830 same=True
t67-key-audit.md                   scratch=ABB3F5527D20 docs=ABB3F5527D20 same=True
t68-parity-gaps.md                 scratch=9CC7F98E2357 docs=9CC7F98E2357 same=True
t69-dual-path-evidence.md          scratch=1364CA48E536 docs=1364CA48E536 same=True
t71-help-dissect.md                scratch=69DB8408226F docs=69DB8408226F same=True
t71-old-baseline-inventory.md      scratch=73AA4F90AF7B docs=73AA4F90AF7B same=True
t71-old-trigger-records.csv        scratch=04759F7C4C2A docs=04759F7C4C2A same=True
t72-shared-layer-gap.md            scratch=B3D14B4AAFB2 docs=B3D14B4AAFB2 same=True
```

→ 8/8 逐字节相同，**迁移未丢内容、未改写内容**。

### 6.4 结论

**第二条验收「视觉规格／t67-t72 报告在 `docs/` 且被 git 跟踪」= 已满足。**
（`.scratch/` 整体跟踪数仍为 0，见下：`git ls-files -- .scratch | Measure-Object` → `0`。）

## 7. 已知限制／登记

### 7.1 编排者裁定与执行（收尾）

裁定：**保留** `.scratch/research/`（地图定义 `.scratch/` = 工作副本、永不跟踪、非权威）；
**修 2 处指针**；**第 3 处历史陈述保持原样**。

#### 7.1.1 登记：`.scratch/research/` 保留

> `.scratch/research/` 存有 8 个逐字节相同副本，**权威在 `docs/research/`**；保留原因：仍有 3 处文档引用其路径，且 `.scratch/` 从不入库。

（对应 6.3 节的哈希比对：`.scratch/research/` 与 `docs/research/` 8/8 逐字节相同。）

#### 7.1.2 已修指针（2 处，逐条记录「文件:行 → 旧值 → 新值」）

| 文件:行 | 旧值 | 新值 |
| --- | --- | --- |
| `docs/research/t71-old-baseline-inventory.md:637` | `D:\ilife\.scratch\research\benchmark-visual-spec.md`（**绝对路径，换机即失效**） | `docs/research/benchmark-visual-spec.md` |
| `docs/research/t72-shared-layer-gap.md:10` | `.scratch/research/t67-key-audit.md` | `docs/research/t67-key-audit.md` |

`git diff --unified=1` 实测：

```
- > 深度证据（逐行）另见：`D:\ilife\.scratch\research\benchmark-visual-spec.md`（758 行，含 C1 裁决依据与全部 token/组件/断点取值）。
+ > 深度证据（逐行）另见：`docs/research/benchmark-visual-spec.md`（758 行，含 C1 裁决依据与全部 token/组件/断点取值）。

-   5. 既有研究：`.scratch/research/t67-key-audit.md`、`docs/calorie-parity-39.md`。
+   5. 既有研究：`docs/research/t67-key-audit.md`、`docs/calorie-parity-39.md`。
```

#### 7.1.3 保持原样（1 处，按裁定不动）

`docs/research/benchmark-visual-spec.md:13` —— 溯源句提及「唯一写入是
`D:\ilife\.scratch\research\benchmark-visual-spec.md`」，属**历史事实陈述**而非失效链接，
按裁定**保持原样**。

#### 7.1.4 全仓残留引用扫描（复核结果）

```
$ git --no-pager grep -n --no-color "scratch/research" -- docs
（12 行命中，分类见下表；EXIT=0）

$ git --no-pager grep -n --no-color -E "scratch/research/(benchmark-visual-spec|t67-key-audit|t68-parity-gaps|t69-dual-path-evidence|t71-help-dissect|t71-old-baseline-inventory|t71-old-trigger-records|t72-shared-layer-gap)"
MIGRATED_DOC_REFS=0
```

→ **指向已迁入 `docs/` 的 8 份文档的引用 = 0**（原 2 处已修；第 3 处是历史陈述，非路径引用）。

剩余 12 处命中**全部指向 `.scratch/` 独有产物**（未迁移；按地图定义本就属工作副本），逐条：

| 文件:行 | 指向 | 目标存在 |
| --- | --- | --- |
| `docs/calorie-dual-path-acceptance.md:101` | `.scratch/research/t69-evidence/` | 是 |
| `docs/research/t68-parity-gaps.md:26` | `.scratch/research/count-keys.mjs` | 是 |
| `docs/research/t68-parity-gaps.md:84` | `.scratch/research/probe-old-bak.mjs` | 是 |
| `docs/research/t68-parity-gaps.md:114` | `.scratch/research/count-triggers.mjs` | 是 |
| `docs/research/t68-parity-gaps.md:116` | `.scratch/research/count-old-sot.mjs` | 是 |
| `docs/research/t68-parity-gaps.md:147` | `.scratch/research/count-legacy.mjs` | 是 |
| `docs/research/t68-parity-gaps.md:150` | `.scratch/research/count-triggers.mjs` | 是 |
| `docs/research/t68-parity-gaps.md:167` | 章节标题「本次产生的证据文件（均在 `.scratch/research/`）」 | — |
| `docs/research/t69-dual-path-evidence.md:179,186,187,188` | `.scratch/research/t69-evidence/` | 是 |

存在性实测：`count-keys.mjs`／`probe-old-bak.mjs`／`count-triggers.mjs`／`count-old-sot.mjs`／
`count-legacy.mjs`／`t69-evidence/` → **True ×6**（无悬空目标）。

> 说明：`git grep` 仅覆盖**已跟踪**文件，故上表未含本证据文件
> `docs/research/t94-freeze-evidence.md` 自身对 `.scratch/research/` 的叙述（它尚未提交）。

### 7.2 本票的执行限制（按要求，非遗漏）

- **未执行任何 git 写操作**（无 `add/commit/push/checkout/stash/clean`）。上述 5 个新增文件目前为
  工作区未跟踪状态，2 个既有文件的改动处于已修改未暂存状态，均由编排者统一提交。
- **未运行 `pnpm build`／`pnpm test`**（避免与 `#78` 的构建验收互相干扰）；本票不需要构建即可自证。
- 未触碰 `packages/**`、`.changeset/**`、`docs/base-paint-contract.md`、`docs/research/t78-*.md`、`.scratch/t78/**`。
- 未写入 `D:\2Study` 任何文件；未读取 `D:\2Study\StudyNotes\SKILLS\卡路里\.个人笔记不允许参考`。
- `SHA256SUMS.txt` 使用 **LF** 行尾与**小写**哈希，以匹配 GNU coreutils `sha256sum -c` 的解析；
  Windows 版 Git Bash 消费中文文件名时可能受控制台代码页影响（详见 `README.md` 注记），
  此时改用 README 第 2 节的 PowerShell 校验方法。

## 8. 复现命令汇总

```powershell
# 1) 哈希自证
Get-FileHash -LiteralPath D:\ilife\fixtures\help-instances\卡路里_HELP_20260730_130429.html -Algorithm SHA256
Get-FileHash -LiteralPath D:\ilife\fixtures\help-instances\卡路里_HELP_20260731_201530.html -Algorithm SHA256

# 2) 按清单整体校验（期望两行 OK）
Get-Content -LiteralPath D:\ilife\fixtures\help-instances\SHA256SUMS.txt -Encoding UTF8 | ForEach-Object {
  if ($_ -match '^([0-9a-f]{64})\s{2}(.+)$') {
    $expect = $Matches[1]; $name = $Matches[2]
    $actual = (Get-FileHash -LiteralPath "D:\ilife\fixtures\help-instances\$name" -Algorithm SHA256).Hash.ToLower()
    "{0}  {1}" -f $(if ($actual -eq $expect) { 'OK  ' } else { 'FAIL' }), $name
  }
}

# 3) 上游零跟踪复核（只读）
git -C D:\2Study\StudyNotes\SKILLS -c core.quotepath=false ls-files -- "卡路里/calorie_html"
git -C D:\2Study\StudyNotes\SKILLS -c core.quotepath=false check-ignore -v -- "卡路里/calorie_html/卡路里_HELP_20260730_130429.html"

# 4) 第二条验收复核（只读）
git -C D:\ilife ls-files -- docs/research | Select-String -Pattern 'benchmark-visual-spec|t6[789]|t7[12]'
```
