---
'base-link-core': patch
'dsh-bill-ilife': patch
'dsh-calorie': patch
'dsh-chef': patch
'dsh-home-ilife': patch
'dsh-life-pack': patch
'dsh-memo-ilife': patch
'dsh-schedule-ilife': patch
'skill-bill': patch
'skill-calorie': patch
'skill-chef': patch
'skill-home': patch
'skill-memo-ilife': patch
'skill-schedule': patch
---

#1323 宿主语言来路接线：DSH 设置 `locale.preference` → 技能 CLI 的 caller。

- `base-link-core`：新增 `CALLER_LANGUAGE_ARG='--caller-language'`、`isCallerLanguageArg`、`callerLanguageFromArgv`；`resolveLanguage` 从 argv 现摘调用方偏好（缺值／值以 `--` 开头报 `CONFIG_LANGUAGE_ARGV_MISSING`），优先级固定为 argv `--language` ＞ 配置文件 ＞ caller ＞ `zh`。`isLanguageArg`／`parseLanguageArgs` 的两键形状不动。
- 六家技能 CLI（bill／calorie／chef／home／memo／schedule）：参数解析件跳过 `--caller-language` 的值（否则会被当未知参数 exit 2）；实际取值由 `resolveLanguage` 统一摘，非法 caller 报 `CONFIG_UNKNOWN_LANGUAGE` 并列出可用语言。
- `dsh-life-pack`：新增 `skill-cli/host-locale` 三件并出根入口——`localePreferenceOf`（同步读 `ctx.get('settings').describe()` 的 locale 条目 `value.preference`，任何缺席／异常降级 undefined）、`callerLanguageReader`（每次调用现读，设置可 live 改）、`withCallerLanguage`（把值追加成 `--caller-language <BCP47>`）；桥规格新增可选 `callerLanguage`，spawn 前追加。
- 六家插件（bill／calorie／chef／home／memo／schedule）：`apply` 登记 `callerLanguageReader(ctx)`，桥与 agent 工具（`run_*_command`）都经同一个现读来源；`SkillHostCtx`／`HostCtx` 新增可选 `get`（**不写进 inject**，settings 是可选服务）。
- 无设置／web 空配置／读取异常 ⇒ argv 与接线前逐字相同（中文缺省不变）；显式 `--language` 仍最高。
- 验收：新增根测试 `test/i18n-language-1323.test.mjs`（优先级链／非法值／镜像常量）、总管 `packages/plugin-manager/test/host-locale-1323.test.mjs`（读取面／argv 追加）、bill 进程边界 `packages/skill-bill/test/i18n-1323-caller.test.mjs`（`--caller-language en` ⇒ 回执英文），六家 `skill-tool-734` 各补两条（argv 追加／apply 接线）。
