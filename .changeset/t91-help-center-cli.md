---
'skill-calorie': minor
---

#91（map #63）`calorie.help.center` 承载**全量速查台**（裁决 Q9）：把 #88 的 HELP 壳接到 CLI 出口，**照片 10 键兼容不回归**；envelope 按新契约（裁决 Q8：**无 `status`**）。

- **键语义**：`calorie.help.center` 现在＝**全量速查台**（10 分组／54 子功能／436 场景，`renderHelpCenterHtml` 三态同源）；照片 10 键保留在 `q`／`keyword` 参数上（非空＝现找、`q:""`＝全量 10 键），**既有两条测试零改动原样通过**（`cmd-read-t11.test.mjs:182-191`／`render-copy-90.test.mjs:254-266`）。
- **D6 显式 `mode`**：`--params '{"mode":"file"|"inline"|"text"}'` 选交付形态（与既有 CLI 风格一致——所有参数走 `--params` JSON，不新增顶层 `--mode`）；缺省 `file`；非法值／非字符串 → `exit 2`（改前 `mode` 被静默忽略，四种取值产出逐字相同）；`q`（非空）与 `mode` **互斥** → `exit 2`。
- **三态落点**：`file` ＝完整 HTML 文档（1,028,317 B）／`inline` ＝ `<style>`＋壳 `<section>`＋helpers 片段（819,941 B）／`text` ＝纯文本索引（24,391 B）；产物恒落 `data.output`（#87 命名 `<SKILLS_DB_PATH>/calorie_html/<title>_<TS>[_N].html`，`--output` 可覆盖）。
- **envelope**：恒 `version/skill/shape/key/data`（**无 `status`**）；`data` ＝ 10 分组索引（`items`／`total`）＋ `sceneTotal:436`／`subgroupTotal:54`／`mode`／`bytes`，`text` 态另附 `text`；**1 MB 产物不入 envelope**（`inline` 态 stdout 仅 1,059 B）。保持 `list` 形状、**不新增 `delivery` 字段**（#83 契约面），与 `docs/research/t88-final.md` §7.3 的 #91 接线口径逐条一致。
- **落点**：`packages/skill-calorie/src/cli/cmd_read.ts` 的 `help.center` 分支 ＋ helper `helpCenterIndex()`；只读消费 `src/render/helpCenter.ts`（**#88 零改动**），未改 `keys.ts`／`output.ts`／`render/help.ts`／`routing.ts`。
- **证据**：`docs/research/t91-help-center-cli.md`（现状诊断／设计／实跑／门禁／变异／偏离）＋ 可复跑 `docs/research/t91-probe.mjs`（CLI 出口 **28/28**，不 import dist）＋ 新测 `packages/skill-calorie/test/help-center-91.test.mjs`（5 用例）。四门逐条 exit 0；canonical `pnpm test` 1 轮：新增 1 条＝**B 类环境抖动**（`0xC0000005`，干净重建后单独复跑 2× 全绿）→ 真 delta 0；白名单 diff 0 行；**2 处 src 级变异**红→还原→绿（sha256 自证）。
- **未含**：唤醒词接线（`routing.ts` 的 `看身材照HELP` 仍指向照片现找；全量速查台的唤醒词入口需另票）／`keys.ts` 的 `title`（改它须同步 `packages/base-combos/combos.yaml`，非本票路径）／`SKILL.md:184` 的文档口径同步。
