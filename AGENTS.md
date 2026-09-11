## 结构纪律（最高优先级）

管 `packages/` 下全部代码的形状（技能／插件／公共层）。改源码、建能力、排目录层级、或文件行数超告警线时，先读 `docs/agents/structure.md`：五条铁律、结构标准、能力目录形状、必报五步。

## Agent skills

### Issue tracker

Issues live in GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical roles, label string equals role name. See `docs/agents/triage-labels.md`.

### 用词纪律

禁用黑话，一律用规范词。见 `docs/agents/wording.md`。

### 会话纪律

提问一律写在对话正文里：**禁止**用弹窗／问卷工具（含 `ask_user_question`）把问题甩给用户点选。

### 文档归属

文档落在归属件自己的目录：技能 `docs/skills/<件名>/`、插件 `docs/plugins/<件名>/`、公共层包 `docs/base/<件名>/`、跨件共用 `docs/agents/`；件名＝`packages/` 下的目录名逐字。见 `docs/agents/doc-homes.md`。

### Domain docs

Single-context (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.
