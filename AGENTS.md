## 结构纪律（最高优先级）

管 `packages/` 下全部源码的形状（技能／插件／公共层）；测试、页面模板、构建产物、生成资产、文档不归它管。改源码、建能力或排目录、文件行数超告警线时，先读 `docs/agents/structure.md`：五条铁律 ＋ 结构标准 ＋ 必报五步。

## Agent skills

### ISSUE 创建纪律（开票凭判据）

**没有判据就不建。** 建之前先写出它的验收命令：当场跑得**红**的那一条。写不出这条命令，就是不建——想法、改进、看不顺眼的、拿不准的，一律写进文档，不占票。

建之前还要过 `docs/agents/编排纪律.md` 第十条的三问（能复现／有现存票或 MAP 可认领／是已承诺的目标），**三问全过**才建；有现存票就回写那张，不另起新票。照这三问回头自检已建的票，过不了的自己关掉。

违反：没判据也建 = 这张票没人能认领、没人能验收，落在仓库里当噪音；该建而有判据的票照样建，不因为这条而少建。

### Issue tracker

Issue tracker（`gh` CLI）：建／读／评论／打标签／关 issue、外部 PR 分流、技能说 publish／fetch 时的转译、`/wayfinder` 的 map／child／blocking／frontier —— 见 `docs/agents/issue-tracker.md`。

### Triage labels

Default five canonical roles, label string equals role name. See `docs/agents/triage-labels.md`.

### 用词纪律

写文件名、写卡路里命令与页面组件、写 issue 时：禁用黑话，一律用规范词。见 `docs/agents/wording.md`。

### 术语纪律

任何名词都可以直接用计算机领域的专业术语（必要时附英文原词）；**禁止自造中文简称、比喻与黑话**。读的人要能靠术语本身查到定义——查不到，就说明这个词用错了。指代一个具体的变量、机制或数据结构时，先写它**是什么、干什么**，再决定要不要给它起名字。见 `docs/agents/wording.md`。

### 会话纪律

提问一律写在对话正文里：**禁止**用弹窗／问卷工具（含 `ask_user_question`）把问题甩给用户点选。

### 文档归属

写工作文档时落在归属件自己的目录：技能 `docs/skills/<件名>/`、插件 `docs/plugins/<件名>/`、公共层包 `docs/base/<件名>/`、跨件共用 `docs/agents/`；件名＝`packages/` 下的目录名逐字。见 `docs/agents/doc-homes.md`。

### Domain docs

探索代码库前读：单上下文 `CONTEXT.md` ＋ `docs/adr/`，多上下文见 `CONTEXT-MAP.md`；命名领域概念、或疑似与 ADR 冲突时也读 `docs/agents/domain.md`。

### 命令登记

加／改／搬一条命令、碰共用位之前，先读 `docs/agents/命令登记纪律.md`：一条命令的事实只住它自己的能力目录（`src/<能力>/commands.ts`），共用位一律由 `pnpm gen` 派生、`pnpm gen:check` 守。

### 技能调用契约（技能侧与插件侧各管一半）

写／改技能包或 DSH 插件之前读 `docs/agents/技能调用契约.md`：**技能侧**只声明「唯一出口 ＋ 与宿主无关的调用形态」（不许出现 `dsh-`／`DSH_`／仓内相对路径，也不许假设 PATH 里有自家命令名）；**插件侧**负责「装上插件＝技能装好」并给 agent 一条在 DSH 里真能用的调用通道（入口按包 `bin` 声明解析、运行时用 `resolveNodeBin(process.execPath)`，不读 PATH）。背景：DSH 会话 PATH 上只有 `dsh`／`pnpm` 两条命令，纯 DSH 机器上会话里连 `node` 都没有。

### 发版（npm 发布）

要发公共层／技能／插件的新版本时走 `tooling/wizard-publish.ps1`：按「**云端已有该版本就跳过；版本不一样才登录并发布**」逐个处理现场发现的包（公共层 ＋ 全部技能 ＋ 全部插件），顺序依赖先行。**由 AI 驱动、人只负责浏览器里批准 2FA**：AI 在**侧边栏终端**里起它（`pwsh -NoProfile -File tooling\wizard-publish.ps1 -Auto`；Windows 上 `powershell` 5.1 按 GBK 读中文会解析失败），用终端工具读回执；npm 问 “Press ENTER to open in the browser” 时**由 AI 送回车**，授权链接**由 AI 转给人**（人只在浏览器批准，不敲键）；**别用自己的 pwsh 工具直接跑**（脚本会拒绝非 TTY 的跑法）。失败或中断后**直接重跑即可**，已发布的会被跳过。里程碑同时追加到 `.scratch\publish-log.txt`（`-LogPath` 可换），回执里的关键字：`TODO`／`SKIP`／`NEED-HUMAN`／`PKG-BEGIN`／`PKG-OK`／`PKG-FAIL`／`DONE`。发完装到本机走 `tooling/wizard-install.ps1 -Auto`（按精确版本装进 `-Profile` 指定的 profile，读回版本与 LinkType）。逐包驱动用 `-Package <包名>`，选几个用 `-Only a,b,c`。

### awesome 插件市场投稿

要把插件上架到 awesome 精选列表、改条目里的描述或分类、或补截图／下载量／README 时读 `docs/agents/awesome插件市场投稿.md`——那一份自包含，可以整份拷给别的项目；本仓七个插件上架到哪一步、下载量与截图的现场读数看 `docs/agents/awesome插件市场-上架台账.md`。

### 编排纪律

切票、派活、收活之前，或盯窗口、没有票的一人一活时，读 `docs/agents/编排纪律.md`；窗口内的机械做法见 `docs/subagent-concurrency-protocol.md`。

### 并发纪律（共享工作区，硬规矩）

多席共用同一个工作区，**禁止**切分支（`git switch`／`git checkout <分支>`）、`git reset`、`git stash`、`git clean`、`git restore .`、`--amend`／`rebase`／`push --force*`——它们会把别席已提交或在途的产出孤儿化（2026-09-15 实测发生过两次）。**只许** `git add <自己声明的路径>` ＋ `git commit -m "<中文信息>" -- <路径>`，且提交前用 `git diff --cached --name-only` 复核暂存区只含自己的件；编译／测试／git 写操作一律经 `node tooling/run-locked.mjs --ticket <票号> -- <命令>` 排队。编译入口写死 `node node_modules/typescript/bin/tsc -b <包>`（本机 `node_modules\.bin` 不存在，`npx tsc` 是假出口、不编译却可能出假绿）。细则见 `docs/subagent-concurrency-protocol.md` §2–§3。
