## 结构纪律（最高优先级）

管 `packages/` 下全部源码的形状（技能／插件／公共层）；测试、页面模板、构建产物、生成资产、文档不归它管。改源码、建能力或排目录、文件行数超告警线时，先读 `docs/agents/structure.md`：五条铁律 ＋ 结构标准 ＋ 必报五步。

## Agent skills

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

### 执行纪律

终端命令一律由 agent 自己执行：**禁止**要求用户替跑命令（贴命令让人粘、让人开终端敲键都算）。用户只做 AI 做不了的事（扫码这类 AI 触不到的事）；通道不顺就换通道，不把执行动作推给用户。

### 文档归属

写工作文档时落在归属件自己的目录：技能 `docs/skills/<件名>/`、插件 `docs/plugins/<件名>/`、公共层包 `docs/base/<件名>/`、跨件共用 `docs/agents/`；件名＝`packages/` 下的目录名逐字。见 `docs/agents/doc-homes.md`。

### Domain docs

探索代码库前读：单上下文 `CONTEXT.md` ＋ `docs/adr/`，多上下文见 `CONTEXT-MAP.md`；命名领域概念、或疑似与 ADR 冲突时也读 `docs/agents/domain.md`。

### 命令登记

加／改／搬一条命令、碰共用位之前，先读 `docs/agents/命令登记纪律.md`：一条命令的事实只住它自己的能力目录（`src/<能力>/commands.ts`），共用位一律由 `pnpm gen` 派生、`pnpm gen:check` 守。

### 技能调用契约（技能侧与插件侧各管一半）

写／改技能包或 DSH 插件之前读 `docs/agents/技能调用契约.md`：**技能侧**只声明「唯一出口 ＋ 与宿主无关的调用形态」（不许出现 `dsh-`／`DSH_`／仓内相对路径，也不许假设 PATH 里有自家命令名）；**插件侧**负责「装上插件＝技能装好」并给 agent 一条在 DSH 里真能用的调用通道（入口按包 `bin` 声明解析、运行时用 `resolveNodeBin(process.execPath)`，不读 PATH）。背景：DSH 会话 PATH 上只有 `dsh`／`pnpm` 两条命令，纯 DSH 机器上会话里连 `node` 都没有。

### 发版（npm 发布）

要发公共层／技能／插件的新版本时走 `tooling/wizard-publish.ps1`：按「**云端已有该版本就跳过；版本不一样才发布**」逐个处理现场发现的包（公共层 ＋ 全部技能 ＋ 全部插件），顺序依赖先行。认证一律用预置 token 做非交互发布（正式版本只用 token 发；不走 web 登录、不弹浏览器 2FA——交互式 2FA 发布形式已废弃）；Agent 只轮询 `.scratch\publish-log.txt` ＋ registry 复查为准，不靠口述。失败或中断后**直接重跑即可**，已发布的会被跳过。回执关键字：`TODO`／`SKIP`／`NEED-HUMAN`／`PKG-BEGIN`／`PKG-OK`／`PKG-FAIL`／`DONE`。逐包驱动用 `-Package <包名>`，选几个用 `-Only a,b,c`。**Agent 不帮用户安装**：装机（装哪个版本、装进哪个 profile）由用户自己做。

### awesome 插件市场投稿

要把插件上架到 awesome 精选列表、改条目里的描述或分类、或补截图／下载量／README 时读 `docs/agents/awesome插件市场投稿.md`——那一份自包含，可以整份拷给别的项目；本仓七个插件上架到哪一步、下载量与截图的现场读数看 `docs/agents/awesome插件市场-上架台账.md`。