## Question

把内容资产接进通用 help 模板，走 **A 路**（`packages/base-render/assets/help-template.html` → 生成物 `src/helpShell.ts` → `base-paint/help-shell` 的 `renderHelpShellHtml`；**不是** `src/help.ts` 那套组件式渲染）：**零 IO 出全页 HTML**（渲染字节数留证）。

**要喂的键与取值**（票 3 `#186` 实测；`subtitle`／`meta_blocks` 在 A 路**不渲染**但照传——一处算、两处用）：

| 键 | 值 |
|---|---|
| `skill_name` | `居家管家` |
| `title` | `居家管家 · 使用手册(HELP)`（自带技能名 ⇒ 文档标题不重复前缀，`composeDocTitle` 走「原样」支） |
| `subtitle` | `9 功能域 · 73 场景 · 版本 2.0 · 更新于 <时间>`（计数从资产 `WAKE_GROUPS`／`WAKE_ASSETS` 派生，不写第二份数） |
| `contact` | 老 `help_center.py:31-35` 三项（邮箱／GitHub／Issues，后两项 `url:true` ＋ `copy_all:true`） |
| `groups` | 资产直转（只读引用不 clone） |
| `meta_blocks` | 两块：`help_summary`（html＝`subtitle` 那一个字符串）／`help_wake_words`（3 条 HELP 短语，从 `WAKE_TABLE` 派生） |
| `version` | `'2.0'`（技能数据世代，不是 npm 包版本） |
| `init_banner` | 横幅；`hidden = 已初始化`，键常在、显隐只走 `hidden`（模板判 `!INIT_BANNER.hidden`） |
| `recommendations` | **不传**（老居家 HELP 全页没有「其他技能」段） |

**初始化状态怎么判**：照老家＝**DB 文件存在即已初始化**（老 `help_center.py:38-49`）；读失败照显（fail-open）；**不调 `openHomeDb`**（会建库跑 DDL）。⚠️ 居家坑：`src/fetch/paths.ts:20-23` 的 `resolveDbPath()` 自己带 `mkdirSync`——判初始化别直接用它，否则「判一下」就把目录建出来了。

**本票还要同批改边界门**（票 1 `#184` 查出来的硬事实，照 #145 对 bill 的先例）：

- `tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 名单里有 `skill-home`——不移出，一 `import 'base-paint/help-shell'` 就被依赖闭包与源码两道断言拦下（`:39-60`）＝ `pnpm boundaries` FAIL；
- 移出时在 `:34-37` 同批写注释（那里已有 #145 给 bill 移出的先例注释），并同步 `packages/skill-home/package.json` 的依赖闭包加 `base-paint`（`^0.3.0`；注意目录名 `base-render`／包名 `base-paint`）。

**两处禁手改**（生成物）：`packages/base-render/src/helpShell.ts` 与 `packages/skill-home` 侧的内容资产；改模板源要跑 `pnpm --filter base-paint gen:help-shell` 并过 `gen:help-shell:check`（模板源必须全 CRLF）。

**本图已裁的前提**（票 13 `#196`，2026-09-11 用户答复）：

- HELP 主数用 **73 场景**；21 条命令写口径区。
- 3 条带 `(HTML)` 的词**不进**渲染清单（口径区写一行）；`src/help/lookup.ts` 与 `scripts/build-help.mjs` 要支持排除。
- 联动 3 条**不列**（骨架里有登记位，渲染时过滤掉）；「看标签」不单独成卡（作「管标签」卡附属词）。
- ⚠️ **一条算术待用户点头**：联动 3 条不列 ⇒ 实际列出 70 张卡，而主数写 73。本席建议副标题计数按**实际列出**派生、口径区写一行「骨架 73 条，联动 3 条已停用不列」；报「结构设计」时一并请用户点头。

**结构按新代码架构规则**（用户 Q8=(a)）：新增件住哪个能力目录（目录名取自 HELP 一级分组、写成英文名）、每个文件的公开接口给什么（导出几个、各一句）；共用件要写得出哪两个能力在用——**落点以结构设计票的裁决为准**；被碰到的旧件就地摆正；第一步「影响清单」与第二步「结构设计」先报用户点头；交付时报第五步「交付对账」；超告警线当场报「已超线，需要根据规则进行重构。」。

## 进度：0%

下一步：等票 1（照抄清单）＋票 3（模板契约）＋结构设计票关票。
