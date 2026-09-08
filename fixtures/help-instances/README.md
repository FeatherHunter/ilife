# 旧版 HELP 实例冻结区（fixtures/help-instances/）

本目录是**只读归档区**。存放卡路里一期旧版 HELP 页面的两个权威实例快照，
用于 `#89` 视觉锁 B1 的**逐值验收对照**，由 `#94` 冻结入本仓。

> **纪律：本目录只读。**
> 目录内任何文件（两个 `.html` 与 `SHA256SUMS.txt`）**不得改写、不得格式化、不得重新生成**。
> 需要新版本对照物时，**新增**文件并在 `SHA256SUMS.txt` 追加一行，不要覆盖既有条目。
> 一旦哈希与 `SHA256SUMS.txt` 不符，视为对照物被污染，必须停下来报 `#94` 裁定。

## 内容清单

| 文件 | 字节数 | 行数 | SHA-256（小写） |
| --- | ---: | ---: | --- |
| `卡路里_HELP_20260730_130429.html` | 65,366 | 492 | `56807c11bd32be7afd7a3a2623ee1a79ef2bf41e6ecb08077b758de144befa28` |
| `卡路里_HELP_20260731_201530.html` | 73,811 | 596 | `1c7a0f1168fb34badbc83e73115ad4d6dd6fb9b9f7b677d2f0aee8184d84e8c1` |

两个文件均为完整独立 HTML 文档：首行 `<!DOCTYPE html>`，末行 `</html>`，UTF-8 **无 BOM**。
文件名与原文件**逐字保持一致**（含中文前缀与时间戳）。

## 来源（绝对路径，只读复制）

```
D:\2Study\StudyNotes\SKILLS\卡路里\calorie_html\卡路里_HELP_20260730_130429.html
D:\2Study\StudyNotes\SKILLS\卡路里\calorie_html\卡路里_HELP_20260731_201530.html
```

复制方式：`Copy-Item -LiteralPath <源> -Destination <本目录>`（二进制安全，逐字节一致）。
**源目录 `D:\2Study\StudyNotes\SKILLS\卡路里\calorie_html\` 全程只读，从未写入。**

## 为什么这两个文件需要在本仓冻结

上游仓库 `github.com/FeatherHunter/SKILLS.git` 对这两个文件**零跟踪**，它们在上游没有版本历史，
随时可能被重新生成覆盖或删除。实测证据（在 `D:\2Study\StudyNotes\SKILLS` 执行）：

```
$ git -C D:\2Study\StudyNotes\SKILLS ls-files -- "卡路里/calorie_html"
(空输出，跟踪数 = 0)

$ git -C D:\2Study\StudyNotes\SKILLS check-ignore -v -- "卡路里/calorie_html/卡路里_HELP_20260730_130429.html"
.gitignore:92:卡路里/calorie_html/	卡路里/calorie_html/卡路里_HELP_20260730_130429.html
```

即：被上游**根 `.gitignore` 第 92 行**（`卡路里/calorie_html/`）整体忽略，同时
`卡路里/.gitignore` 第 41 行 `calorie_html/*.html` 也命中。
这是**显式忽略规则**导致的零跟踪，而不是「尚未 add」——所以不能指望上游补跟踪。
上游同类的其它对照物（如 `图眼/图眼_HELP.html`、`居家管家/.notes/HELP_demo.html`）**已被跟踪**；
在本票涉及的对照物集合内，这两个是唯一未跟踪者。

> 限定：上句的「唯一」是就**本票对照物集合**而言（复核了这两个文件的零跟踪状态与成因，
> 并抽样确认上游其它 HELP 对照物已被跟踪）；本票**未**对上游全仓做穷举扫描，
> 故不宣称「上游仅此两个未跟踪 HTML」。

## 用途

- `#89`：视觉锁 B1 的**逐值验收对照物**——B1 的每一个取值（token／组件／断点／文案）都要能在这两个
  旧版实例里找到对应物，作为「迁移前行为」的基准。
- `#94`：冻结入仓，使对照物脱离上游 `.gitignore` 的不可控状态，获得本仓版本历史与哈希校验。

## 复现／校验方式

### 1. 单文件哈希（PowerShell）

```powershell
Get-FileHash -LiteralPath .\卡路里_HELP_20260730_130429.html -Algorithm SHA256
Get-FileHash -LiteralPath .\卡路里_HELP_20260731_201530.html -Algorithm SHA256
```

### 2. 按清单整体校验（PowerShell，跨平台通用）

```powershell
Get-Content .\SHA256SUMS.txt | ForEach-Object {
  if ($_ -match '^([0-9a-f]{64})\s{2}(.+)$') {
    $expect = $Matches[1]; $name = $Matches[2]
    $actual = (Get-FileHash -LiteralPath $name -Algorithm SHA256).Hash.ToLower()
    "{0}  {1}" -f $(if ($actual -eq $expect) { 'OK  ' } else { 'FAIL' }), $name
  }
}
```

期望输出两行 `OK`。

### 3. coreutils 校验（Git Bash / WSL / Linux）

```bash
cd fixtures/help-instances && sha256sum -c SHA256SUMS.txt
```

期望输出两行 `OK`。`SHA256SUMS.txt` 为**标准 `sha256sum` 两列格式**（小写哈希 + 两个空格 + 文件名），
UTF-8 无 BOM，故可被 `sha256sum -c` 直接消费。

> 注：在部分 Windows 环境的 Git Bash 中，中文文件名可能受控制台代码页影响而报
> `No such file or directory`；这不是哈希不符，改用上面第 2 节的方法即可。

## 相关

- 冻结证据与逐条命令输出：`docs/research/t94-freeze-evidence.md`
- 视觉锁验收规格：`docs/research/benchmark-visual-spec.md`
