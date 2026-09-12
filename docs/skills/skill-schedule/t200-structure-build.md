# t200 施工报告：结构就位（共用位 ＋ 门转发 ＋ html.ts 瘦身）

> 票：[#200](https://github.com/FeatherHunter/ilife/issues/200)（作息管家HELP 3/10）· 2026-09-12
> 施工图：[`t199-structure-verdict.md`](t199-structure-verdict.md)（下称「裁定」）。本文是必报五步里**第一、三、四、五步**的成文；事实出处一律指裁定 §①–§⑥ 与 [`t199-evidence.md`](t199-evidence.md)。
> 只碰裁定影响清单点到 `#200` 的件；本票不动 `docs/**`（本文件除外）、`tooling/**`、`SKILL.md`、别的包。

## 第一步 · 影响清单（事前）

| 目录／文件 | 处置 | 一句话理由 |
| --- | --- | --- |
| `packages/skill-schedule/src/shared/templateFill.ts` | **新增** | 共用件：`SHARED_CSS`／`SHARED_HELPERS`／`fillTemplate` 从 `render/html.ts` 原样搬入（写入与同步的回执页、查询与浏览的查询页都在用，同一个调用点 `cmd_read.ts:286`） |
| `packages/skill-schedule/src/render/html.ts` | **改** | 签出共用件后 11 件减到 5 件，落回铁律五的 5 件以内 |
| `packages/skill-schedule/src/render/index.ts` | **改** | 3 条转发改指 `../shared/templateFill.js`；转发必须保留（快照门读 `dist/render/index.js`） |
| `packages/skill-schedule/src/cli/cmd_read.ts` | **不碰** | 裁定点名的那两处（help 分支 `:239-243`、`--html` 落盘 `:284-294`）在影响清单里标的是 `#202`／`#203`；本票在门口保留同名转发，出口零改动 |
| `packages/skill-schedule/src/shared/` 以外的五个能力目录 `write`／`query`／`plan`／`analyze`／`admin` | **不建目录、不搬码** | 裁定 §①：目录与该目录的第一件东西同时建；今天这五个目录里没有一件属于自己的代码 |
| `packages/skill-schedule/package.json` | **不改** | 依赖（`base-paint`）与 script 的改动归 `#202`（裁定「消费共享 help 模板的技术路线」第 1 步）；本票不新增依赖 |
| `tooling/check-boundaries.mjs` | **不改** | 裁定 §③：保留工作树里已做的名单改动，本票只确认它仍 PASS |
| `docs/skills/skill-schedule/t200-structure-build.md` | **新增** | 本报告 |

对账口径（`docs/agents/structure.md:80-83`）：前四行每行只指向一个能力目录或一个文件；后四行各写了理由（共用件／技能级出口／依赖声明／工具／报告）。

## 第三步 · 写代码要点

1. **搬动范围**：`html.ts:61-79`（`:61` 是该段的说明注释，`:62-78` 是三个标记常量 ＋ 两个常量 ＋ `fillTemplate`，`:79` 是函数收尾）。搬完原段从 `html.ts` 整段移除，`html.ts` 79 → 59 行。
2. **字节零改的核对**：搬动后的那 19 行（`templateFill.ts:4-22`）与 `HEAD` 里同段（`html.ts:61-79`）**逐行只差 3 行**，即三个标记常量少了 `export ` 前缀、按裁定改文件内自用 —— 故这一段**不是字节零改**。归一段 sha256（算法＝19 行按 LF 拼接、**不带**尾换行）：`HEAD` 侧 `8bc2b73ece0aa5a34800f395a91477aff09aeb4609a57c8de28b133064cc15c1`，新件侧 `60fdf30e6be607f062379e685e863cc99059d96ceb4cdead19e79dc7420c952c`，**两侧不等**（若两侧各带一个尾换行，则分别为 `b90272229d4aec27abeaa64ae7a3a13f2e8d0bcb70d4159a997961527611195e` 与 `bf942d02fdbf8275f6909bbeb3b9b73788ca9226b30d134ee70201cef809695c`）；`SHARED_CSS` 419 字符、`SHARED_HELPERS` 145 字符，与 `HEAD` 逐字符相同。
3. **对外给什么**：`src/shared/templateFill.ts` 给 3 件（`SHARED_CSS`／`SHARED_HELPERS`／`fillTemplate`）；`src/render/html.ts` 余 5 件（`SCHEDULE_HTML_MAX_BYTES`／`escapeHtml`／`renderEnvelopeHtml`／`estimateBytes`／`assertHtmlSize`）；`render/index.ts` 的转发块一分为二，余下 5 件仍指 `./html.js`，搬走的 3 件指 `../shared/templateFill.js`。
4. **常量与类型只写一处**：`SHARED_CSS`／`SHARED_HELPERS`／`fillTemplate` 在本包里的定义地只剩 `shared/templateFill.ts` 一处，`html.ts` 不再各写一份；错误类型仍只有 `render/errors.ts` 一处（新件从 `../render/errors.js` 取 `ScheduleRenderError`，错误码 `SCHEDULE_MARKER_INVALID` 未变）。
5. **不做的事**：不删两个常量、不换成公共层的 `buildStyleSheet()`（裁定 §④）、不动三个标记的字面、不动 `templates/*.html`、不加导出到 `src/help/index.ts`、不建能力目录占位。
6. **类型纪律**：新增与改动的代码零 `any`；新件无 `unknown`；无跨能力引用（本票未新增任何跨能力调用）。

## 第四步 · 超线报警

**本包今天没有文件行数告警线**（裁定「已知风险」第 3 条已记：`packages/` 下 `AGENTS.md` 数量＝0，`package.json`／`SKILL.md` 都没有该字段），故无报警可发。报一句行数变化：`src/shared/templateFill.ts` 新增 22 行；`src/render/html.ts` 79 → 59 行；`src/render/index.ts` 14 → 15 行（净 ＋1 行：一条说明注释 ＋ 拆开的转发行）。无一件显著变大。

## 第五步 · 交付对账

| 第一步清单 | 实际处置 | 偏差 |
| --- | --- | --- |
| `src/shared/templateFill.ts` 新增 | 新增（22 行） | 无 |
| `src/render/html.ts` 改 | 改（`git diff --stat`：20 行删除，其余零改动） | 无 |
| `src/render/index.ts` 改 | 改（2 加 1 减：转发块拆两段，其中 3 件改指共用位） | 无 |
| `src/cli/cmd_read.ts` 不碰 | 未碰（`git status` 与 `git diff` 都无此件） | 无 |
| 五个能力目录不建 | 未建（`git status` 无 `write`／`query`／`plan`／`analyze`／`admin`） | 无 |
| `package.json` 不改 | 未改（工作树里它是别的会话的在途改动：`test` script 补 `test/*.test.mjs`，开工前就是 `M`） | 无 |
| `tooling/check-boundaries.mjs` 不改 | 未改（工作树里那处名单改动是别的会话的在途改动，本票只复跑确认 PASS） | 无 |
| 本报告新增 | 新增（本文件） | 无 |

**偏差数＝0。** 落地件共 3 个源码件 ＋ 1 个报告件，与事前清单逐行对得上。

## 与裁定的不一致或自行判断（逐条）

1. **`render/index.ts` 的公开面**：裁定 §② 写「`dist/render/index.js` 的公开面不变」，结构设计表却写「三个标记常量改为文件内自用」——两句不能同时字面成立。取舍＝按表施工：门少给 3 个名字（`SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／`CONTENT_MARKER`）。理由三条：① 表是「每个文件对外给什么」的唯一规格，且它点名这三件「全仓零外部消费者」；② 要 6 件全留，`templateFill.ts` 就对外 6 件，超铁律五；③ 已逐处核实：快照门只读 `SHARED_CSS`／`SHARED_HELPERS`／`fillTemplate`，`cmd_read.ts`／`lookup.ts`／`scripts/build-help.mjs` 都不读这三个标记，全仓其余命中都在别家包自己的同名定义里。
2. **`cmd_read.ts` 本票不动**：票面正文第 4 条读作「（若要碰它）只改裁定点名的那两处」，而裁定的影响清单把这两处标成 `#202`／`#203` 的活。本票按裁定不动它：门口转发保留同名，出口一行都不用改，行为零变。若认为「本票也该动它」，需票面与裁定裁一次。
3. **搬动范围含 `:61` 的注释行**，原样保留（其中「壳」字样属搬动前的原文；按用词纪律改写它就会破坏「字节零改」，留给该文件的下一票）。
4. **新件头两行是新增的**：一句文件头注释（本包每个文件都有）＋ 一行 `import`（错误类型从 `render/errors.js` 取，搬动所必需）。

## 自证（本票跑过的门，真实输出）

| 命令 | 结果 |
| --- | --- |
| `node tooling/check-boundaries.mjs` | 11 行 OK ＋ `boundaries: PASS`，exit 0 |
| `node tooling/skill-html-snapshot.mjs --check` | `artifacts=185 changed=0 added=0 removed=0`，exit 0（改动前后同值） |
| `pnpm -C packages/skill-schedule exec tsc -b` | 无输出，exit 0 |
| `pnpm -C packages/skill-schedule build` | `HELP 已注入：…SKILL.md`，exit 0；`SKILL.md` sha256 前后同为 `E7CC625E…203C9` |
| `node --test packages/skill-schedule/test/*.test.mjs` | `tests 42`／`pass 42`／`fail 0`，exit 0（改动前后同值） |
| 端到端一次 `schedule.help.lookup --html`（`dist/cli/cmd_read.js`，落点取临时目录） | exit 0，产物 8498 字节，含 `<style>`／`<section data-skill="schedule"`／`copyItem`，三个标记无残留 |

## 结论

共用位 `src/shared/templateFill.ts` 就位（一处定义、对外 3 件），`render/html.ts` 回到 5 件，门口转发保留并改指新定义地；页面外观零变化（快照门 185 件逐件同 sha256），边界门与快照门仍绿；五个能力目录按裁定不建占位。本文件与源码改动一并待提交（本票不 commit／push／add）。
