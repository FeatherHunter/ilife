# Subagent 并发执行协议（编排者与各 subagent 约定，逐条生效）

> 正本。2026-09-09 由 `.scratch/t75/concurrency-protocol.md` 转正（原文件保留为过程稿，不再更新）。
> 适用：同一工作区内多个 subagent 并发执行。每个派单必须附带"先读本文件并逐条遵守"的要求，否则本协议不自动生效。

## 0. 总原则

**共享同一个工作区**（单一 git 仓库、单一 `node_modules`、单一 `dist/`）。因此并发安全的唯一保障是**路径所有权 ＋ 共享资源串行化**。任何"我只是顺手改一下别人的文件"都会静默损坏他人的工作。

## 1. 路径所有权（硬约束）

- 每票在开工前必须**声明自己会写的路径集合**（文件级，写进派单），只允许写这些路径。
- **禁止**修改其他票已声明占用的路径。需要跨票改动时：**停下来报告**，不要自己动手。
- 各自证据文件写 `docs/research/t<票号>-*`（天然不重叠）；工作草稿写 `.scratch/t<票号>/`；changeset 文件名各自唯一（`.changeset/<票号专属名>.md`）。

## 2. 共享资源串行化（目录锁）

以下操作**必须持锁**执行：`pnpm build`／`tsc -b`、`pnpm test`／`node --test`、`git add`／`git commit`（共享 `dist/`、`.tsbuildinfo`、git index）。
**不需要持锁**：读文件、编辑自己路径下的文件、`grep`、`git status`／`git diff`／`git log`。

锁协议（pwsh，复制即用；锁目录创建是原子操作）：

```powershell
$lock = 'D:\ilife\.scratch\locks\gate.lock'
New-Item -ItemType Directory -Force -Path 'D:\ilife\.scratch\locks' | Out-Null
while ($true) {
  if (Test-Path $lock) {
    $age = (Get-Date) - (Get-Item $lock).LastWriteTime
    if ($age.TotalMinutes -gt 10) { Remove-Item $lock -Recurse -Force -ErrorAction SilentlyContinue; continue }  # 抢回死锁
    Start-Sleep -Seconds 10; continue
  }
  try { New-Item -ItemType Directory -Path $lock -ErrorAction Stop | Out-Null; break }
  catch { Start-Sleep -Seconds 5 }
}
try {
  # ===== 持锁区：build / test / git add / git commit =====
} finally {
  Remove-Item $lock -Recurse -Force -ErrorAction SilentlyContinue
}
```

- 持锁区尽量短：把要跑的命令**一次写完**，不要持锁做阅读／编辑。
- 跑完立刻在 `finally` 里释放；**不要**持锁等待人工输入。

### 2.1 包管理器禁令（2026-09-09 全仓事故后新增，硬约束）

**事故实录**：仓库内无 `package.json` 的临时目录跑 `npm install` → npm 上溯到 workspace 根并重写共享 `.bin`，全仓 build 瘫痪。教训：包管理器分不清"临时目录"和"工程根"，只能靠禁令隔离。

**规则（违反＝S1）**：

1. **禁止**在仓库内任何位置运行 `npm install`／`npm ci`／`pnpm install`／`pnpm add`（唯一例外：编排者持锁显式授权）。
2. 需要「安装态实证」时，安装目标必须落在**仓库之外**（如 `$env:TEMP\ilife-<票号>-<随机>`），且该目录**必须先写最小 `package.json`**，确保 npm 不会向上解析到 workspace 根。
3. **任何 `rmSync`／`Remove-Item -Recurse` 必须先做路径守卫**：断言目标绝对路径以自己声明的临时根开头，且**不在** `node_modules`、`packages`、`docs`、`test`、`tooling`、`.git` 之下；守卫失败即抛错退出。
4. 临时目录用完即清；**不得**把临时根放在共享的 `.scratch/tXX/` 下供多个 agent 互相删除（各自用带票号与随机后缀的独占目录）。
5. 事故恢复口径：任何 agent 发现 `node_modules/.bin` 异常或 build 因缺 `tsc` 失败 → **立即停下报告编排者**，不要自行 `pnpm install`。

### 2.2 终端输出节流（上下文保护，硬约束）

**事实**：一次全量 `pnpm test` 输出约 150KB（≈4 万 token，占单 agent 上下文预算 1/4 以上）；`terminal_read` 单次最多回 500 行。把**成功日志全文**读进上下文是最大浪费——一次全绿的全部信息量就是 `exit 0` 三个 token。

**规则**：

1. 长命令一律落盘：`... > .scratch/<你的目录>/run-<用途>.log 2>&1; echo <唯一标记>=$LASTEXITCODE`，用 `terminal_wait_for` 等**标记行**，然后只读**最后 5 行**确认 exit 码。
2. exit 非 0 时才 grep 失败签名（`FAIL|✖|not ok|AssertionError|Error`），只读命中行及前后 10 行；修完重跑后同样只看尾 5 行。
3. 证据脚本必须打机器可读摘要行（`RESULT: n/m`、`PASS/FAIL`）；复核只读摘要行＋exit 码，明细留在文件里备查，**不读全文**。
4. 禁止重复 read 同一份输出；禁止把 `.log` 大文件通读进上下文。
5. 变异/探针脚本的输出同样适用：只看"红没红（fail>0）＋还原 sha 是否一致"两行。

## 3. git 纪律（最危险区）

- **禁止**：`git stash`、`git checkout -- .`、`git reset --hard`、`git clean`、`git restore .`、切分支（`git switch`／`git checkout <branch>`）。这些会**摧毁并发伙伴的未提交工作**。
- 只允许 `git add <自己声明的路径>` ＋ `git commit`（持锁）。**不要 `git add -A`／`git add .`**。
- **不要 push**（编排者统一收口）。

### 3.1 提交纪律（硬约束）

- **增量提交**：每完成一个有意义步骤（实现一块／补一组测试／补证据／跑完门禁）就**立即持锁 commit**，不要攒到最后。**宁可多 commit，也不要让成果停留在未提交状态**——未提交的代码无法溯源、无法恢复。
- **提交信息用中文、说清做了什么**，格式：`feat(<票号>): <一句话概括> ＋ <关键落点／文件／验证>`。
  - 正例：`feat(87): 输出命名规范复刻（默认目录＋同秒后缀＋中文 command 名）＋ 新增 paths.ts 解析与 12 条单测`
  - 反例：`update`、`fix bug`、`feat(87): 修改` —— 无信息量，禁止。
- 为防终端代码页损坏中文信息：用 write 工具写 UTF-8 消息文件 → `git commit -F <文件>`；提交后 `git log -1 --format=%s` 自检中文正常。
- 每次提交前 `git status --short` 确认**只包含自己独占路径**的文件；新文件（测试／证据／changeset）必须 `git add` 进去，**别漏**。
- **收尾时工作区必须干净**（自己路径下无未提交改动、无未跟踪文件）；报告里给出**全部 commit sha ＋ 提交信息**清单。

## 4. 终端使用

- 需要终端时**使用 sidebar 终端**：`terminal_create`（标题 `<票号>-<用途>`）→ 长命令按 §2.2 落盘＋等标记＋只读尾 5 行 → 结束前 `terminal_close` 释放。
- 不要用 `pwsh` 工具跑长命令；不要开多个终端；长跑命令在同一终端内顺序执行。

## 5. 验收与报告

- 门禁口径以派单给出的**变更前基线**为准；基线由编排者冻结，任何人不得自行改口径。
- 每票必须自证：**变异自证**（故意破坏 → 对应测试变红 → 还原变绿；**默认 src 级变异**，还原＝`git checkout`；`dist/` 级为例外，需在报告里论证必要性；变异须持锁＋跑前 sha256＋还原自证，清理须路径守卫）。

### 5.1 审查者纪律

- **独立复跑**：不采信实施者任何结论；每句"已满足／已绿"都要自己跑。实施者不得兼任自己票的审查者。
- **自设新探针**：必须至少设计 **1 个被审脚本覆盖不到**的新变异或新探针（专打"脚本自我满足"盲区）；没有此条，审查结论不予采信。
- **归属标注**：每个缺陷必须标注**本票引入／本票范围／范围外发现**；范围外发现不得单独决定 FAIL（只能 S3＋转票措辞），除非它直接证伪本票的验收结论。
- **关闭 verdict 以合并点安静态复核为准**；单票审查是初审。
- 分数（如用）只是次要摘要：verdict＋缺陷清单才是正文；五维（契约一致 30／证据真实可复现 25／parity 20／工程红线 15／文档同步 10）供参考，不跨票比较。
- 证据入仓 `docs/research/t<票号>-*.md` ＋ 可复跑 `.mjs`；**必须被 git 跟踪**。
- 报告 ≤1200 词：① commit sha ＋ 改动文件清单（`git show --stat`）；② 逐条验收「怎么满足＋证据 file:line」；③ 门禁实测；④ 变异自证；⑤ 偏离记账；⑥ 未做／未确证；⑦ 风险 top3。
- 完成后**停止**，等编排者安排对抗式审查。

## 6. 量刑与违规判定

**缺陷分级**：**S1**＝关闭阻塞项（契约违反／用户可见回归／证据造假或私自放宽／数据丢失风险）；**S2**＝关闭前必须修完，除非编排者书面改期并给出具名票号；**S3**＝记账跟进，不阻塞关闭。

**量刑律**：任一 S1 → **FAIL**（分数再高也否决）；均分 <85 → **FAIL**；无 S1 且均分 ≥85 → **PASS**。

**违规**：未经声明改动他人路径、绕过锁跑 build/test/git、使用危险 git 命令、违反 §2.1／§2.2 = **S1 违规**，该票成果作废并重做。
