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
