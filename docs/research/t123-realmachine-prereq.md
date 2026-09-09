# #123 真机前置只读取证（安装目录 / bash 可用性 / 真库路径）

- 票：[卡路里·发版窗口](https://github.com/FeatherHunter/ilife/issues/123)（父图 #64）。本文件是**只读取证**，供 #123 走查单（`docs/research/t123-release-runbook.md`）与 #115（两处截图）／§2.3 前置使用。
- 取证时间：2026-09-09（本机时区）；机器：Windows，PowerShell `5.1.26100.9168`，Node `v24.19.0`，npm `10.9.2`，pnpm `11.8.0`。
- **只读声明**：本文件全部结论只来自读命令（`Get-ChildItem`／`Get-Item`／`Get-Content`／`Test-Path`／`Get-FileHash` 类）。**未写库、未改任何环境变量、未装/卸任何包、未启停 DSH、未改 profile。** 唯一写入是本 agent 自己的 `.scratch/t123w/` 草稿与两个交付文档。
- 输出摘录约定：每条 ≤6 行；完整原始输出见文末证据文件。
- **增补记账（2026-09-09，走查单返修 C3）**：只做**事实增补**，未改任何既有结论与判定——新增 P-1b（junction 链逐跳：两层 junction 仍落回 `D:\ilife`）、复核并加固 `dsh-better-sidebar` 真名、复核 profile `dsh-calorie: ^0.1.5` 解析不到 `0.2.0`。全部为只读命令。

## 结论速览

| # | 项 | 判定 | 一句话 |
| --- | --- | --- | --- |
| P-1 | DSH 插件安装目录 + 三插件在位与版本 | **在位 PASS / 安装态 FAIL** | `dsh-calorie 0.1.6`、`dsh-life-pack 0.2.0`、`dsh-better-sidebar 0.18.0` 三者皆在位；但前两者与 `skill-calorie`／`base-paint` 都是 **Junction 直连工作区**，不是注册表安装态 |
| P-1b | junction 链的层数（**事实增补，2026-09-09 复核**） | **FAIL（多层链，逐跳仍落回 `D:\ilife`）** | `skill-calorie`／`base-paint` 在 profile 内先指向 `.dsh-module-fallback`，**再套一层**仍解析进 `D:\ilife`（共 3 跳），不是「只指向 fallback 就停了」 |
| P-2 | `bash` / git bash 可用性 | **PASS（两种都有）** | PATH 上的 `bash` 是 **WSL2 bash 5.1.16**；Git Bash 为 **MSYS2 bash 5.2.37**。**CRLF 脚本只有 Git Bash 能跑**，WSL 会报 `set: pipefail: invalid option name` |
| P-3 | 真库路径与库文件存在性 | **PASS** | `SKILLS_DB_PATH`（User 层）= `D:\2Study\StudyNotes\.db`，目录存在，`calorie_data.db` 3,072,000 B |
| P-4 | profile 依赖范围 | **FAIL（阻断级）** | profile 声明 `dsh-calorie: ^0.1.5` → 发版后**解析不到** `0.2.0`，必须显式版本安装 |

---

## P-1 DSH 插件安装目录定位与在位版本

① 命令

```powershell
$nm = Join-Path $env:USERPROFILE '.dsh\profiles\web\node_modules'
Get-ChildItem $nm -Force |
  Where-Object { $_.Name -match 'dsh-calorie|dsh-life-pack|dsh-better-sidebar|skill-calorie|base-paint' } |
  ForEach-Object {
    $v = (Get-Content (Join-Path $_.FullName 'package.json') -Raw -Encoding utf8 |
          Select-String -Pattern '"version"\s*:\s*"([^"]+)"').Matches.Groups[1].Value
    "{0,-20} ver={1,-8} link={2,-9} target={3}" -f $_.Name, $v, $_.LinkType, $_.Target
  }
# profile 声明（安装解析的输入）
Get-Content (Join-Path (Split-Path $nm) 'package.json') -Encoding utf8 |
  Select-String 'dsh-calorie|dsh-life-pack|dsh-better-sidebar|skill-calorie'
```

② 输出摘录（≤6 行）

```
dsh-calorie         ver=0.1.6  link=Junction  target=D:\ilife\packages\plugin-calorie
dsh-life-pack       ver=0.2.0  link=Junction  target=D:\ilife\packages\plugin-manager
dsh-better-sidebar  ver=0.18.0 link=          target=
skill-calorie       ver=0.1.1  link=Junction  target=…\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-calorie
base-paint          ver=0.1.0  link=Junction  target=…\.dsh\profiles\web\.dsh-module-fallback\node_modules\base-paint
profile: "dsh-calorie": "^0.1.5"   "dsh-life-pack": "^0.2.0"   "dsh-better-sidebar": "0.18.0"
```

③ 判定

- **在位 = PASS**：`dsh-calorie`、`dsh-life-pack`、`dsh-better-sidebar` 三者都在，版本分别为 `0.1.6` / `0.2.0` / `0.18.0` → §2.3 前置（爱生活卡 + 边栏槽）**成立**，#115 的两处截图**有界面可截**。
- **安装态 = FAIL**：`dsh-calorie`／`dsh-life-pack`／`skill-calorie`／`base-paint` 四者全是 **Junction**，前两者直接指向 `D:\ilife\packages\…`，后两者指向 profile 内的 `.dsh-module-fallback`。**今天在真机取到的代码 = 工作区代码**（会假绿）；#123 验收「真机落盘版本与注册表一致」在 junction 未解除前**不可能成立**。
- **链的深度（P-1b 增补）**：后两者指向 `.dsh-module-fallback` 后**并未终止**——再逐跳解析仍是 Junction，最终落回 `D:\ilife`。详见下节 P-1b。
- **名称更正**：`#123` 与 §2.3 写的是 `better-sidebar`，**真实包名是 `dsh-better-sidebar`**（`0.18.0`，真实目录，非 junction）。查在位时按真名查。
- **另一个 profile**：`profiles\desktop\node_modules\dsh-better-sidebar` 也在位（`0.18.0`），但 `desktop` 下**没有** `dsh-calorie` —— 本票三插件只在 `web` profile 齐备。
- **依赖范围**：profile 声明 `dsh-calorie: ^0.1.5`，`^0.1.5 → >=0.1.5 <0.2.0`，**解析不到 `0.2.0`** → 发版后不加显式版本，真机仍停在 `0.1.6`（走查单 S11 已按显式版本写）。

④ 证据：`.scratch/t123w/realmachine-prereq-p1.txt`（本文件结论由该命令的完整输出得出）。

---

## P-1b junction 链逐跳解析（**事实增补**，2026-09-09 复核）

> 增补原因：P-1 只写了「后两者指向 profile 内的 `.dsh-module-fallback`」，容易被读成「指向 fallback 目录就到此为止、不再是工作区代码」。**逐跳解析后事实更强**：`skill-calorie`／`base-paint` 在 `.dsh-module-fallback` 之下**再套一层 junction**，最终仍解析进 `D:\ilife`（与 R2 J1–J3 同结论）。

① 命令（只读）

```powershell
$nm = Join-Path $env:USERPROFILE '.dsh\profiles\web\node_modules'
foreach ($n in 'dsh-calorie','dsh-life-pack','skill-calorie','base-paint','dsh-better-sidebar') {
  $p = Join-Path $nm $n
  if (Test-Path $p) { $i = Get-Item $p -Force; "$n :: link=$($i.LinkType) target=$(($i.Target) -join '|')" }
}
$fb = Join-Path $env:USERPROFILE '.dsh\profiles\web\.dsh-module-fallback\node_modules'
foreach ($n in 'skill-calorie','base-paint') {
  $p = Join-Path $fb $n
  if (Test-Path $p) { $i = Get-Item $p -Force; "fallback\$n :: link=$($i.LinkType) target=$(($i.Target) -join '|')" }
}
foreach ($p in 'D:\ilife\packages\plugin-calorie\node_modules\skill-calorie',
               'D:\ilife\packages\plugin-calorie\node_modules\skill-calorie\node_modules\base-paint') {
  if (Test-Path $p) { $i = Get-Item $p -Force; "ws-chain :: $p`n   link=$($i.LinkType) target=$(($i.Target) -join '|')" }
}
```

② 输出摘录（逐跳，2026-09-09 实测）

```
dsh-calorie         link=Junction  target=D:\ilife\packages\plugin-calorie
dsh-life-pack       link=Junction  target=D:\ilife\packages\plugin-manager
skill-calorie       link=Junction  target=…\.dsh-module-fallback\node_modules\skill-calorie
base-paint          link=Junction  target=…\.dsh-module-fallback\node_modules\base-paint
dsh-better-sidebar  link=          target=                      ← 真实目录
fallback\skill-calorie  link=Junction  target=D:\ilife\packages\plugin-calorie\node_modules\skill-calorie
fallback\base-paint     link=Junction  target=D:\ilife\packages\plugin-calorie\node_modules\skill-calorie\node_modules\base-paint
ws-chain :: D:\ilife\packages\plugin-calorie\node_modules\skill-calorie
   link=Junction  target=D:\ilife\packages\skill-calorie
ws-chain :: …\skill-calorie\node_modules\base-paint
   link=Junction  target=D:\ilife\packages\base-render
```

③ 判定

- **两层链成立**：`skill-calorie`／`base-paint` 的解析路径是
  `profile\node_modules\<pkg>`（Junction）→ `profile\.dsh-module-fallback\node_modules\<pkg>`（**再一层 Junction**）→ `D:\ilife\packages\plugin-calorie\node_modules\…`（**又一层 Junction**）→ 工作区 `packages\skill-calorie`／`packages\base-render`。即**共 3 跳，全部是 junction，终点都在 `D:\ilife`**。
- **对取证的含义（与 P-1 一致，但更强）**：真机读到的 `skill-calorie`／`base-paint` 字节 = 工作区字节，**没有一跳落在注册表安装态**；因此「解除 junction」不能只处理 profile 顶层那几个链接，**必须整条链都换成真包**（或换干净 profile）。
- **`dsh-better-sidebar` 真名（复核）**：profile 顶层是**真实目录**（`LinkType` 为空、`0.18.0`），包名就是 `dsh-better-sidebar`，不是票面简称 `better-sidebar`；查在位时按真名查。
- **profile range（复核）**：`profiles\web\package.json` 的 `dependencies` 实测为 `"dsh-calorie": "^0.1.5"`、`"dsh-life-pack": "^0.2.0"`、`"dsh-better-sidebar": "0.18.0"` → `^0.1.5` 规范化区间 `>=0.1.5 <0.2.0`，**解析不到 `0.2.0`**（发版后不加显式版本，真机仍停在 `0.1.6`）。
- **同 profile 还有其它 dev 链接**（同次实测）：`dsh-memo-ilife: link:D:/ilife/packages/plugin-memo-ilife`、`dsh-prompt: link:D:/dsh-plugin/dsh-prompt` → 该 profile 本身就是 dev 链接态，走「在现有 profile 里重装真包」这条路时要预期安装器可能继续走 link。

④ 证据：`.scratch/t123c3/realmachine-junction-chain.txt`（本次逐跳输出全文）。

---

## P-2 `bash` / git bash 可用性（wizard 技能生成的脚本能否在 Windows 跑）

① 命令

```powershell
(Get-Command bash).Source                                  # PATH 上的 bash 是谁
& 'C:\Windows\System32\bash.exe' -c 'bash --version | head -1; uname -r'
& 'C:\Program Files\Git\bin\bash.exe' -c 'bash --version | head -1; uname -s'
(Get-Command sh.exe -ErrorAction SilentlyContinue).Source   # 有没有 sh
$PSVersionTable.PSVersion.ToString()                        # 本终端 shell
# 决定性实测：同一份 CRLF 脚本，两个解释器分别跑
$s='D:\ilife\.scratch\t123w'
[System.IO.File]::WriteAllText("$s\probe-crlf2.sh", "#!/usr/bin/env bash`r`nset -euo pipefail`r`necho CRLF_MULTI_OK`r`n")
& 'C:\Program Files\Git\bin\bash.exe' "$s\probe-crlf2.sh"; "GITBASH_EXIT=$LASTEXITCODE"
& 'C:\Windows\System32\bash.exe' -c "bash /mnt/d/ilife/.scratch/t123w/probe-crlf2.sh"; "WSL_EXIT=$LASTEXITCODE"
```

② 输出摘录（≤6 行）

```
C:\Windows\System32\bash.exe
GNU bash, version 5.1.16(1)-release (x86_64-pc-linux-gnu)   /   6.6.87.2-microsoft-standard-WSL2
GNU bash, version 5.2.37(1)-release (x86_64-pc-msys)        /   MINGW64_NT-10.0-26200
(sh.exe 无输出 → 不在 PATH)
5.1.26100.9168                                              ← 本 sidebar 终端 = Windows PowerShell 5.1
Git Bash: CRLF_MULTI_OK   GITBASH_EXIT=0
WSL  bash: set: pipefail: invalid option name               ← CRLF 未被剥离
```

③ 判定

- **两种 bash 都可用 = PASS**：PATH 上的 `bash` = `C:\Windows\System32\bash.exe`（**WSL2**，bash `5.1.16`，能读 `D:` 为 `/mnt/d/`）；`C:\Program Files\Git\bin\bash.exe`（**MSYS2 Git Bash**，bash `5.2.37`）。`sh.exe` 不在 PATH。
- **wizard 脚本的可跑性结论**：**用 Git Bash 跑**。同一份 CRLF 脚本，Git Bash `exit 0` 并正常输出，WSL bash 直接报 `set: pipefail: invalid option name`（CRLF 未剥离）——即「脚本用 CRLF 保存」这件事在 WSL 下是**硬失败**，在 Git Bash 下不致命。
- **必须按全路径调用**：直接写 `bash …` 会落到 WSL（PATH 顺序），此时 `D:\ilife\...` 这种 Windows 路径**不认**（须 `/mnt/d/ilife/...`），且行尾更严格。所以 `bash -n` 语法检查也要写 `& 'C:\Program Files\Git\bin\bash.exe' -n <脚本>`。
- **配套约束**：脚本一律 **LF** 保存（本仓 `docs/**` 现为 LF）；`chmod +x` 在 Windows 上无实际意义（Git Bash 靠解释器调用即可）。

④ 证据：`.scratch/t123w/realmachine-prereq-p2.txt`、探针脚本 `.scratch/t123w/probe-crlf2.sh`。

---

## P-3 真库路径与库文件存在性（**只读**）

① 命令

```powershell
[Environment]::GetEnvironmentVariable('SKILLS_DB_PATH','User')
[Environment]::GetEnvironmentVariable('SKILLS_DB_PATH','Machine')
$env:SKILLS_DB_PATH                                   # 当前进程
$db = 'D:\2Study\StudyNotes\.db'
Test-Path $db
Get-ChildItem $db -Force -File |
  Where-Object { $_.Name -in @('calorie_data.db','calories.db') } |
  Select-Object Name, Length, LastWriteTime
Test-Path (Join-Path $db 'calorie_html')
```

② 输出摘录（≤6 行）

```
SKILLS_DB_PATH(User)    = D:\2Study\StudyNotes\.db
SKILLS_DB_PATH(Machine) = （空）
$env:SKILLS_DB_PATH     = D:\2Study\StudyNotes\.db      ← 与 User 层一致
Test-Path D:\2Study\StudyNotes\.db → True
calorie_data.db   3072000 B   2026/8/29 11:49:11
calorie_html/     True
```

③ 判定

- **PASS**：`SKILLS_DB_PATH` 在 **User 层**设为 `D:\2Study\StudyNotes\.db`，当前进程同值（Machine 层为空，无冲突来源）；目录存在；`calorie_data.db` 存在且非空（3,072,000 B，最后写入 `2026-08-29 11:49:11`）；`calorie_html/` 目录存在（#87 默认落盘的落点）。
- **口径提醒**：`DB_FILENAME = 'calorie_data.db'`（`packages/skill-calorie/src/paths.ts:10`）；同目录另有 `calories.db`（0 B）——**不要**把 0 B 的 `calories.db` 当成真库。
- **零触碰**：本次**未**写库、**未**改任何层级的 `SKILLS_DB_PATH`。发版后冒烟若走真库，必须按走查单 S10 留 `Get-FileHash … calorie_data.db -Algorithm SHA256` 前后值（§9-6）。
- **数据窗口提醒**：该库最新写入日期为 `2026-08-29`；面板写死读「今天」（§2.3 同参 `{"date":"<今天>"}`）。发版后冒烟/对数前需按 HITL-0 **当天真实记一餐**，否则两路只能同报 `ERR4`（空库同文，§9-4 禁止顶替）。

④ 证据：`.scratch/t123w/realmachine-prereq-p3.txt`。

---

## P-4 与 #123 票面的不一致（真机侧，只登记）

| # | #123 的写法 | 真机实际 | 影响 |
| --- | --- | --- | --- |
| 1 | 「**better-sidebar**（边栏槽）在位」 | 真实包名 `dsh-better-sidebar@0.18.0` | 按票面名字查会误判「缺失」；P-1 已按真名确认在位 |
| 2 | 「显式版本重装 `dsh-calorie` + `dsh-life-pack`」（默认是注册表安装态） | 四包全是 **Junction 直连工作区** | 不解除 junction，装完仍可能读到工作区代码 → 验收「落盘版本 = 注册表版本」假绿（走查单 S11-0／S11-2 已加判据） |
| 3 | 未提 profile 依赖范围 | profile `dsh-calorie: ^0.1.5` | 不发显式版本则解析不到 `0.2.0`，真机停在 `0.1.6` |
| 4 | 未提脚本解释器 | PATH `bash` = WSL2 bash 5.1.16；Git Bash 在 `C:\Program Files\Git\bin` | wizard 脚本必须用 Git Bash 全路径 + LF，否则 CRLF 在 WSL 下硬失败 |
| 5 | 未提 junction 的层数 | `skill-calorie`／`base-paint` 经 `.dsh-module-fallback` **再套一层**仍解析进 `D:\ilife`（共 3 跳） | 「解除 junction」必须整条链换真包；只处理 profile 顶层链接仍会假绿（P-1b） |

## 附：本次取证用到的完整原始输出

| 文件 | 内容 |
| --- | --- |
| `.scratch/t123w/realmachine-prereq-p1.txt` | P-1 的插件目录、LinkType、Target、profile 声明全文 |
| `.scratch/t123w/realmachine-prereq-p2.txt` | P-2 的 bash 版本、路径、CRLF 探针两次运行全文 |
| `.scratch/t123w/realmachine-prereq-p3.txt` | P-3 的 env 三值、目录清单、库文件属性全文 |
| `.scratch/t123w/probe-crlf2.sh` | CRLF 探针脚本本体（供复跑） |
| `.scratch/t123c3/realmachine-junction-chain.txt` | P-1b 的逐跳 junction 链输出（2026-09-09 增补复核，含 profile `dependencies` 全文） |
