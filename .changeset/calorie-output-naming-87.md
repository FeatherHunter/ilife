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

**行为变更（调用方可见）**：不再需要传 `--html` 才落盘——默认即落 `calorie_html/`。
**没有「不落盘」开关**：`--output <路径>`／`--html <路径>` 只是把产物改写到指定路径，**仍然写盘**；
`parseArgs` 与 `cmd_read.ts` 出口都不存在「只回传 envelope、不写文件」的模式（旧行为=「不传 `--html` 就不落盘」已不存在，
迁移只能通过改写到自己选定的路径来避免写默认目录）。

**返修（第二轮审查 A2 缺陷，本票同批修）**：

1. **截断按 Unicode 码点**（旧 Python `s[:32]` 语义）：原按 UTF-16 码元切，`'a' + '😀'×20` 会劈出孤立代理项，
   落盘被文件系统换成 U+FFFD，而 `data.output` 回传原串 → **回传路径 ≠ 实际落盘文件**。
2. **同秒冲突计数大小写不敏感**（旧 `glob.glob()` 在 Windows 走 `fnmatch.filter` → `os.path.normcase`）：
   原实现大小写敏感，目录内已有 `…_123000.HTML` 时仍会选 `…_123000.html` → **Windows 上覆盖原文件**。
3. **默认落点解析失败归位 exit 5**：`<SKILLS_DB_PATH>/calorie_html` 被同名文件占位（`mkdirSync` 抛 `EEXIST`）时，
   原实现漏到外层兜底 → `ERR 4: 未知失败：…`（4＝取数/超时）；现为 `ERR 5: 渲染失败：HTML 落点解析失败（…）`。

**未复刻（如实记账，本票不实现，补丁见 `docs/research/t87-output-naming.md` §5.1）**：旧
`html_scene_path()` 的**类型段**（`_回执`／`_结果`／`_过程`）与 `html_name(suffix=)` 的**内容标识段**（如 `_香蕉`），
以及**动态 command 段**（`食物排行_高热量` 等，现全部落成 `食品排行_<TS>[_N]`）。
实测影响面：`shape==='receipt'` 的 **35/77** 写键缺 `_回执` 段；ranking 5 榜＋全榜同名同秒互撞 `_2.._N`。
issue #87 票面与验收只写基础规则，故本票按票面实现；是否补齐由编排者裁定。

**测试与证据**：`packages/skill-calorie/test/output-naming-87.test.mjs`（14 条：清洗／码点截断／时间戳／
命令名真值 77 键／同秒 `_2`/`_3`／大小写不敏感冲突／目录跟随／CLI 默认落盘／CLI 同秒冲突／
`--output` 覆盖与 `--html` 别名／落点解析失败 exit 5）；
证据 `docs/research/t87-output-naming.md`、`docs/research/t87-fix-evidence.mjs`、
变异自证 `docs/research/t87-mutation-evidence.{md,mjs}`。
