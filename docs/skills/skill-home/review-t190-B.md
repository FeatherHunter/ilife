# 票 #190 对抗审查（B 席：结构纪律与风险）

- 被审：`docs/skills/skill-home/t190-impl-notes.md`（`src/help/{manifest,output,index}.ts`、`src/cli/cmd_read.ts`）；依据 `t187-decision.md` §8–§15／§32。
- **裁决：整改后通过**（总分 **77/100**：A 结构合规 29／35，B 上游约束 29／35，C 风险与遗留 19／30）。
- 独立核对手段：`grep`＋定点 `read`；自写探针 `.scratch/home-t190-B/probe-B.mjs`／`probe-B2.mjs`（跑 `packages/skill-home/dist/cli/cmd_read.js`，`SKILLS_DB_PATH` 指临时目录；未改任何源码、未 add／commit）。

## 一、必须整改

1. **交付面零锁 ⇒「改了却仍全绿」（本票核心不可自证）**：`test/cli.test.mjs:93-99` 只断 `status===0` 与 `data.total>=88`；全仓 `packages/skill-home/test/` **0 处**引用 `delivery`／`居家管家_HELP`／`home_manager_html`／`.db`（grep 实测）。反例：删掉 `src/cli/cmd_read.ts:791-798` 整块、或把 `manifest.ts:18/21` 两个落点值改名，`pnpm test` 仍全绿。兄弟三家各有专件（`skill-bill/test/help-delivery-144|help-exit-148|help-reuse-245.test.mjs`、`skill-schedule/test/help-delivery-203|204.test.mjs`、`skill-memo-ilife/test/cli-help-229|230.test.mjs`）。**整改**：补一件 HELP 交付锁（缺省落点名＋绝对路径＋`bytes===statSync().size`、`{items,total}` 仍在且 `delivery` 只追加、窗口内回同一路径、`reuseHours:0` 落新件、`q` 无 `delivery`、产物目录 `.db` 数 0）。
2. **记录不实（`q` 支坏参静默）**：`t190-impl-notes.md:28` 写「坏 `reuseHours` → exit 2」是无条件句；实测 `{"q":"查物品","reuseHours":"abc"}` → **exit 0**、无 `ERR`（`cmd_read.ts:93` 在 `:98/:104` 取窗口之前就返回）。与共用件口径 `saveHtml.ts:110`「坏参阻断，不静默当 0」相反（`skill-bill/src/cli/cmd_read.ts:118-121` 同病 ⇒ 属继承而非自创，但记录不得写成无条件成立，且 `q`＋坏参应归 `fail(2)`）。
3. **`--html` 措辞与副作用**：分支本身**等价**（渲染三行原样搬进 `cmd_read.ts:775-779` 的 `sectionHtml()`，仍在同一 `try` ⇒ `HomeRenderError`→`fail(5)` 不变）；但 `:781-789` 之后 `:791-798` 恒跑缺省交付 ⇒ 冷目录下 `home.help.lookup --html X` 落**两份**文件（探针 B2 实测：`X` ＋ `home_manager_html/居家管家_HELP_<ts>.html`）。兄弟家不同形：bill `:539-541`／schedule `:372-378` 是 `explicit: o.html` 优先、不再落缺省件，而居家 `deliverHomeHelp` 的 `explicit` 支（`src/help/output.ts:50-59`）**无调用者＝死路**。§32 明写不许动 `--html`，故不算越界，但记录「行为原样保留」（`t190-impl-notes.md:8`）只对分支成立、对整次调用不成立，须在票面写明或另立票对齐。

## 二、风险与遗留

4. **守卫是「事后报警」，且它「能红」靠的是撞上别处的断言**：路由改坏（如把 `cmd_read.ts:772` 的 `key === 'home.help.lookup'` 去掉）→ `dispatch` 走到 `:729-730` 的 `fail(1)` → exit 1，`cli.test.mjs:95` 的 `status===0` 会红 ⇒ **能红，但没有一条锁是专门为它写的**。问题在位置：`fail(1)` 在 `dispatch` 内部，其前 `:109-110` 已 `resolveDbPath()`（`src/fetch/paths.ts:21` 自带 `mkdirSync`）＋`openHomeDb`（建库＋DDL）⇒ 路由一旦被改坏，`.db` 已建出来再 exit 1（硬约束当刻已被破坏）。另 `fail(1)` 在本件头注释 `:3` 的定义里是「预检」，与「内部错误」语义不符（四家先例同形，故不单独扣）。
5. **错误码与落点信息不准**：`src/help/output.ts:35-36` 把所有落盘失败（`EACCES`／占位目录等）一律塞 `HOME_HTML_TOO_LARGE`——机器可读码与真实原因不符（errno 只在消息里；照 schedule `src/help/output.ts:40-41` 先例，属既有取舍）；`:72` 报的路径是 `dir/stem`（无戳、无 `.html`），与真实落点不同。
6. **铁律二压力（遗留）**：`src/help/output.ts:40-74` 与 `skill-schedule/src/help/output.ts:58-89` 逐字同构（只差错误类与一条空载荷校验）＝第 5 份同名薄封装。机制确在共用件，但封装仍在复制；建议另立票把交付封装收进 `base-paint`（不属本票范围）。
7. 行数记录差 1：实测 `cmd_read.ts` **811 行**（`wc -l` 口径，与 HEAD 741 同口径；记录 `:32` 写 812／＋71）。超线结论不变（超 461，报警合规）。

## 三、已核合规（逐条给落点）

- **自持残留＝0**：三新件里 `wx`／`EEXIST`／`nextCandidate`／时间戳通式只出现在注释（`manifest.ts:7-11`、`output.ts:5-6`）；`output.ts` 只调 `saveHtmlFile` ×2（`:53`、`:65`），无 `writeFileSync`／`mkdirSync`；`cmd_read.ts:87` 的 `new Date()` 只喂页面显示，不参与命名。
- **`reuseHours` 键名与共用件一致**：`cmd_read.ts:83` 用共用件工厂 `helpReuseWindowOf`（`saveHtml.ts:136-147`），后者从 `params.reuseHours` 读（`saveHtml.ts:141`）＋缺省 `HELP_REUSE_DEFAULT_HOURS`；与 bill `cmd_read.ts:98`、卡路里 `src/output.ts:205` 同键同工厂 ⇒ **一致，无误读**。实测生效：窗口内回同一路径（目录仍 1 件）、`reuseHours:0` 落 `…_204742_2.html`。
- **越界＝0 成立**：`git status --short` 全量看，本记录自述四件（`src/help/{manifest,output,index}.ts`、`src/cli/cmd_read.ts`）外，`base-combos/combos.yaml:506`＋`src/present.ts`＋`test/combos-p8.test.mjs` 的改动**归同日另一会话**（`t190-combo-notes.md`，mtime 20:41-20:42）；`SKILL.md`（17:44）、`scripts/build-help.mjs`（9/7）、`src/fetch/paths.ts`（9/6）、`base-render` 未被本票动过。
- **§8**：`package.json` 有 `base-paint ^0.3.0`；`node tooling/check-boundaries.mjs` → `boundaries: PASS`，home 三行 OK（含「源码真的 import base-*（实得 3 文件）」，记录一致）。
- **§9／§2／§3**：实测顶层键序 `version,skill,shape,key,data,delivery`（只追加）；缺省与 `mode:"lookup"` 载荷均回 `{items,total}`（total 91）、`q` 无 `delivery`；`mode`＋`q` → exit 2、非法 `mode` → exit 2，文案与 bill `:116-117` 逐字同。
- **§5**：复用窗口按「回执路径存在且可打开」验（path 存在、`bytes===statSync().size`、无 `https`/`file://` 串），未写成「文件数增加」；`reuseHours:0` 走共用件逃生口，未自造开关。
- **§12②／§13／§14／§15**：`manifest.ts` 只出 3 个值、无函数（铁律五）；超线当场报，`t190-impl-notes.md:32-34` 逐字含「已超线，需要根据规则进行重构。」＋超 462 的原因＋三段拆法（`src/help/dispatch.ts`／按域拆分派／`parseArgs` 与 envelope 各一件）——可执行；生成器已拆（51／197／219 行，均在线内）；`deprecated` 分组过滤落 `src/help/helpFile.ts:127-133`。
- **落地不建库**（探针实测）：缺省支跑完 `SKILLS_DB_PATH` 下 `.db` 数 0、产物目录仅 1 个 HELP 文件，stdout 仍单行 JSON、进度只进 stderr。
