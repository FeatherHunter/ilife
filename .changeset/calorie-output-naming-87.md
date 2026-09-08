---
'skill-calorie': minor
---

#87（图 #63）输出命名规范复刻（M10）：默认落盘目录 ＋ 同秒冲突后缀 ＋ `--output` 覆盖。

**新增模块**（`src/output.ts`，不新增 package.json `exports` 条目——该文件归 #95 独占，本票不碰）：
`HTML_DIR_NAME`／`HTML_EXT`／`sanitizeFilenamePart`／`formatStamp`／`chineseCommandFor`／
`htmlFileName`／`htmlDir`／`resolveDefaultHtmlPath`／`resolveExplicitHtmlPath`。

**旧版真值**（只读基线 `D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`）：
`calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html`，目录＝`DATA_DIR/calorie_html`（跟随 `SKILLS_DB_PATH`），
同秒冲突 `N = 同秒同名数 + 1`（首个冲突 `_2`），`--output` 显式覆盖绕过命名规则，
字段清洗 `\\ / : * ? " < > | [ ]` → `_`、trim、截断 32 字符。

**接线**（`src/cli/cmd_read.ts`）：落点优先级 `--output` ＞ `--html`（legacy 别名）＞ 默认
`<SKILLS_DB_PATH>/calorie_html/<中文command>_<TS>[_N].html`；落点随 envelope `data.output` 回传
（additive 字段，六形状守卫只校验 `data` 内既有键，`assertStatMetrics` 只看 `metrics`）。
`<中文command>` 真值 = `CALORIE_COMBOS[key].title`（`packages/base-combos/combos.yaml` 同值镜像，77 键逐键相等）；
**不取** triggers 的 `wake_word`（含空格/括号、与 CLI 键非一一对应）。

**行为变更（调用方可见）**：不再需要传 `--html` 才落盘——默认即落 `calorie_html/`。需要旧行为（不落盘）时传
`--output` 指向自己选定路径即可；`--html <路径>` 语义不变。

**测试与证据**：`packages/skill-calorie/test/output-naming-87.test.mjs`（清洗／时间戳／命令名真值 77 键／
同秒 `_2`/`_3`／目录跟随／CLI 默认落盘／CLI 同秒冲突／`--output` 覆盖与 `--html` 别名）；
证据 `docs/research/t87-output-naming.md` ＋ 变异自证 `docs/research/t87-mutation-evidence.{md,mjs}`。
