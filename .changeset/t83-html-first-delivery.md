---
'skill-calorie': minor
---

#83（map #63）三态交付契约（M4 HTML-First 铁则复刻 ＋ 渲染失败回执）：`cmd_read` 出口现按「有模板／能否落盘／是否要文本」三态交付，并在 envelope **顶层追加** `delivery{mode,path?,template?,bytes?}`——既有五字段 `version/skill/shape/key/data` 与六形状语义**一字未改**，stdout 仍守 P9「一行 JSON」。

- **① 文件态（默认）**：`<SKILLS_DB_PATH>/calorie_html/<中文command>_<TS>[_N].html`，`delivery.path` 与 `data.output` 同值同源、绝对路径、`bytes` 为产物 UTF-8 字节数；`template` 为结构判定的产物族（`help-shell`／`doc-shell`／`receipt`／`fragment`／`text`）。
- **② 内联态**：只读／沙箱写不进去（`EACCES|EPERM|EROFS|EBUSY`）→ 产物随 envelope 的 `data.html` 回传、不写 `data.output`、**绝不降级为文字答**；与文件态产物逐字相同（三态同源）。
- **③ 文本态**：渲染层已定文本（`calorie.help.center` 的 `mode:'text'`，保留 #91 落盘行为）或用户明确要文本（`--params '{"delivery":"text"}'`，只走 envelope）→ `data.text` ＝ 同一份 `data` 经 #77 `buildDataText` 投影。
- **渲染失败回执**：落点结构错（如 `calorie_html` 被同名文件占位）→ 仍 exit 5 ＋ stdout 空，但 stderr 追加一行 `RECEIPT {…}`（`buildErrorReceipt` ＋ `renderErrorHtml` 的**模板化**回执：原因／建议／建议命令；回执自身也走三态），**严禁手写 HTML 兜底**（旧 `SKILL.md:18-19`）。
- **相对落点**：`SKILLS_DB_PATH` 或 `--output` 给**相对路径**时，落点按 cwd 解析后回传（`delivery.path`／`data.output` **恒绝对路径**）——写盘行为与旧版逐字一致，不因归一化改变命名或落点选择。

证据 `docs/research/t83-html-first.md` ＋ 可复跑 `docs/research/t83-evidence.mjs`（真机 21/21 PASS）／`docs/research/t83-mutation.mjs`（3 处 src 级变异 15/15）／红队 `docs/research/t83-review-red.md` ＋ `docs/research/t83-review-red.mjs`（33/33）。
