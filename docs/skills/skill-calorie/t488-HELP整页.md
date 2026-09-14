# #488 · 场景 09 看身材照HELP（q 支）整页装配（证据）

本件成文当刻 HEAD＝`3f9971a`（2026-09-15 02:07，他席在途提交；本票不改 git 任何状态）。

一句话判定：`calorie.help.center` 的 q 支（照片 HELP）产物由**老片段**（无 doctype／无样式段／裸 `<pre>`）换成**整页**（doctype ＋ charset ＋ viewport ＋ 样式段 ＋ 脚本段 ＋ 每条命中的可复制命令块 ＋ 页尾复制区），路由真值 `{"q":"记身材照"}` 与 `{"q":""}`（全量 10 键）两态在 390／768／1440 三档横向溢出由 **+844／+1636／+964 逐格归零**；`data` 信封与 `target`（落点）改前改后逐字同，`delivery.template` 由 `fragment` 变 `doc-shell`（有意，见 §五）；新件 4 例＋回归 11 件全绿，源码级变异「摘掉复制区」使两处断言必红、复原后产物字节逐字回同。

## 一、根因（当刻复核读数）

| 现 象 | 根因 | 复核方式 |
| --- | --- | --- |
| q 支整页无文档头 | 走 `src/render/html.ts:206` 的 `helpRowHtml`（`:215` `renderPhotoHelpHtml`），早于整页装配件 | 改前产物实测 `<!doctype` 命中 0、`<style>` 段 0 段 |
| 三档都溢出 | 每行是**裸 `<pre>`**（`html.ts:209`，无类名 → 不中公共样式的 `pre-wrap`／`overflow-x`），命令一行 200+ 字符原样撑破版面 | 改前实测裸 `<pre>` 3（现找态）／10（全量态），三档读数见表 §三 |
| 行内命令没有公共层命令块 | 该页用自造 `<div class="item">` ＋ 裸 pre，不经过 `packages/base-render/src/blocks.ts` 的 `renderPreBlock` | 改前实测 `ilife-block-pre-block-code` 命中 0 |

**只读核对（本票一行未动 `src/render/html.ts`）**：

- `html.ts:209`＝`helpRowHtml` 的裸 `<pre>`：**仍是**裸 `<pre>`。它现在只被 `renderHelpLookupHtml`（`:225`，`calorie.help.lookup` 那支）与两条直调测试（`packages/skill-calorie/test/render-t10.test.mjs`／`packages/skill-calorie/test/render-copy-90.test.mjs`）用；照片 q 支本票起不再经过它。
- `html.ts:239`／`:240`＝`renderErrorHtml`（渲染失败回执）**两处真裸 `<pre>`**：现状未变，属该件改版票（本票只读核对、报告不动）。

## 二、逐条改法（写集两件）

| 件 | 改法 |
| --- | --- |
| `packages/skill-calorie/src/photo/helpDoc.ts`（新，79 LF） | 整页装配：`assembleDocPage`（完整文档）＋ `renderKpiGrid`（命中数／查的是什么）＋ 每条命中一个 `renderPreBlock`（命令块 ＋ 复制按钮，actionId／文案取冻结表 `CALORIE_COPY_ACTION`）＋ `dataCopyArea`（页尾复制区，数据＝信封同一份 `{items,total}`）；取数不在这里，命中仍由 `helpLookup.ts` 给 |
| `packages/skill-calorie/src/photo/help.ts`（q 支，113 LF） | 只换装配出口：`renderPhotoHelpHtml(hits, q)` → `buildPhotoHelpDoc(hits, q)`；`data`（`{items,total}`）与 `target`（`calorie_html` 目录 ＋ 主体名 `卡路里_照片HELP`）**一字不动**；删掉对 `render/html.js` 的 import |

复用而不是自拼：整页模板与样式段／脚本段走 `src/shared/docPage.ts` 的 `assembleDocPage`；复制区与复制按钮走 `src/shared/copyArea.ts` 的 `dataCopyArea` 与 `src/render/copy.ts` 的冻结表；命令块走公共层 `renderPreBlock`。**公共层零改动**（`packages/base-render` 本票未碰）。

## 三、三档读数（改前 → 改后）

工具：`node packages/skill-calorie/scripts/measure-responsive.mjs --dir <页目录> --label t488-before|after --json <JSON>`（当刻版本＝#484 落地的提交 `9608f58`，2026-09-15 02:11）；读数＝`document.documentElement.scrollWidth − window.innerWidth`（单位 px）。

| 态 | 页面文件 | 390 档 | 768 档 | 1440 档 |
| --- | --- | --- | --- | --- |
| 改前 | all（`{"q":""}`） | +844 | +1636 | +964 |
| 改前 | route（`{"q":"记身材照"}`） | +844 | +1636 | +964 |
| 改后 | all | **0** | **0** | **0** |
| 改后 | route | **0** | **0** | **0** |

合计：改前 2 页 6 格 **6 格非零**（`OVERFLOW-NONZERO pages=2 cells=6 failed=6`）→ 改后 **0 格非零**（`OVERFLOW-ZERO pages=2 cells=6 failed=0 scopeOutFailed=0`）。两态都无 `<img>`，故 `img-not-fit` 一栏恒空。
改前另有一条读数佐证根因：390 档 `viewport=1560≠390`——老片段没有 viewport 声明，手机档按默认 1560 的版面宽渲染，这正是长命令能把版面撑破的条件之一（改后该行消失）。

## 四、形状／信封／落点对照（改前 → 改后）

| 读数 | 改前 route | 改后 route | 改前 all | 改后 all |
| --- | --- | --- | --- | --- |
| `<!doctype html>` 起 | 否 | **是** | 否 | **是** |
| `<meta charset>`／viewport | 无／无 | **有／有** | 无／无 | **有／有** |
| 样式段／脚本段 | 0／1 | **1／1** | 0／1 | **1／1** |
| 裸 `<pre>` 数 | 3 | **0** | 10 | **0** |
| `renderPreBlock` 命令块数 | 0 | **3** | 0 | **10** |
| 复制按钮（`data-action-id`） | 6 | 4＝命中 3 ＋ 复制区 1 | 20 | 11＝命中 10 ＋ 复制区 1 |
| 字节数 | 27700 | 72379 | 36311 | 93192 |
| 产物 sha256（前 16） | fe452fadf15fe8ef | 58c4245397d4d993 | c70b719db8dcb5de | 354743108b6ddb79 |
| `delivery.template` | fragment | doc-shell | fragment | doc-shell |
| `data` 键集 | `items,total,output` | **逐字同** | 同 | **逐字同** |
| `data.items[0]` 字段 | `wakeWord,key,desc,exec` | **逐字同** | 同 | **逐字同** |
| `data.total` | 3 | **3** | 10 | **10** |
| 落点主体名 | `卡路里_照片HELP_<TS>.html` | **同名式** | 同 | **同名式** |

不溢出的机器面：改后样式段里 `.ilife-block-pre-block-code` 规则带 `white-space: pre-wrap` 与 `overflow-x: auto`（新测试第 ⑤ 条闸门钉住）。

命令面事实（取证，不改取向）：唤醒词「看身材照HELP」在 `packages/skill-calorie/src/photo/routes.ts`（第 28 行）的路由真值逐字是 `{"q":"记身材照"}`；把该词**逐字**当查询词传（`{"q":"看身材照HELP"}`）当刻 **0 命中、exit 4**（`lookupPhotoHelp` 按唤醒词／命令名／说明子串匹配，10 键里没有这个词）。该词属 #450 按项目负责人裁定清掉的**自造入口词**（守卫在 `packages/skill-calorie/test/skill-md-photo-285.test.mjs` 第 118 行的九词清单里），路由表里那一行的清理归 **#446**，本票不动它、只把 exit 4 记在这里。三档判据跑在路由真值与 `{"q":""}` 两态上。

## 五、口径变更（`packages/skill-calorie/test/help-center-91.test.mjs` ③，父席裁定放行）

- **改前两条断言想锁什么**：① `countOf(photoHtml, 'data-action-id="') === data.total`（「每行一个复制按钮」，锁的是片段形状：页里只有逐行按钮）；② `countOf(photoHtml, '<!DOCTYPE') === 0`（「照片页仍是片段（形态不回归）」——按大小写比对，实际只否掉大写写法）。
- **改后锁什么**：① 按钮数＝**命中数 ＋ 复制区那一颗**（`data.total + 1`），并带**负向牙齿**——把任一命中行摘掉后按钮数必须**不再相等**（旧断言在整页化后恒假，改成永真不值钱，故配牙齿）；② 产物**是完整文档**：以 `<!doctype html>` 起、含 `<style>` 段与 `<script>` 段。
- **为什么**：整页装配是 #341 起的既定方向（口径见 `docs/skills/skill-calorie/t341-页面形状.md`），场景 09 其余各页已是完整文档；本票把 q 支补齐，#484 的遗留 1 就是这一条。该件其余用例一行未动。
- **附带的产物族变化**：`delivery.template` 由 `fragment` 变 `doc-shell`（`src/render/envelope.ts:164` 按 `^<!DOCTYPE` 结构判定、大小写不敏感）——这是整页化的结构性后果，不是本票新增字段。

## 六、机器测试读数

- 新件 `packages/skill-calorie/test/photo-helpdoc-488.test.mjs`：4 例**全绿**（① 现找态完整文档＋行／命令块／复制区＋信封与落点；② 全量态 10 键；③ 唤醒词逐字当查询词＝0 命中 exit 4；④ 变异自证）。
- 回归 11 件＋新件合跑：`ℹ tests 83 ／ pass 83 ／ fail 0`（`photo-helpdoc-488`／`help-center-91`／`photo-help-flow-345`／`skill-md-photo-285`／`photo-shape-341`／`photo-picker-283`／`photo-budget-438`／`photo-gif-page-352`／`photo-shape-read-281`／`photo-receipt-docs-282`／`wizard-86`／`photo-responsive-484`），`RESULT: ticket=488 runId=83d953e7-d802-466a-a66c-e7ccf49ecb97 waitedMs=0 exit=0`。
- **源码级变异（本票自证）**：把 `helpDoc.ts` 的复制区整段摘掉 → `pnpm build` → 新件 ①／②／④ **红**（`tests 4／pass 1／fail 3`）、`help-center-91` ③ **红**（`actual: 3, expected: 4`「每条命中一颗复制按钮 ＋ 复制区一颗」）；复原后重编 → 两件 `tests 10／pass 10／fail 0`，且 route 产物 sha256 逐字回同（`58c4245397d4d99337107303c44d26598e5434e4e498266535fcd985a9300d4e`）。
- 产物内变异两行（例 ④ 的原话）：

```
MUTATION-RED #488 四类改坏都必红：删一行=变异一：页内命中行数 ≠ 命中数 ｜ 裸 pre=变异二：出现裸 `<pre>`（无类名 → 不中 pre-wrap／overflow-x，窄屏必溢出） ｜ 无 doctype=变异三：产物不以 `<!doctype html>` 起（老片段无 doctype） ｜ 命令块不折行=变异四：命令块样式缺 white-space: pre-wrap
MUTATION-GREEN #488 改回必绿：四条闸门全过（命中数=3，页内命令块=3，复制按钮=4）
```

## 七、GATE-RUN 单行

```
RUN ticket=488 runId=83d953e7-d802-466a-a66c-e7ccf49ecb97 cmd="node --test …photo-helpdoc-488／help-center-91／photo-help-flow-345／skill-md-photo-285／photo-shape-341／photo-picker-283／photo-budget-438／photo-gif-page-352／photo-shape-read-281／photo-receipt-docs-282／wizard-86／photo-responsive-484" waitedMs=0 exit=0
```

（同票其余运行：构建 `pnpm build` runId `0583d6c7-0b20-40d2-861e-d97259818ec0` exit=2〔实现期一次类型错，当场修〕、`5f0a6054-821e-4f36-8fd1-2138cd5555a0` exit=0、变异期 `45b1b143-a862-4ad7-8be2-12620883662d` exit=0、复原后重编 `b105b216-ed6c-49ae-a94b-7746ac757add` exit=0；改前度量 runId `56579b19-7de9-4c45-883f-0cd6054ad487` exit=1〔**该 1 就是改前的病**，不是工具坏〕、改后度量 runId `0864425b-4f64-4a3c-8978-3e34c6c001bc` exit=0，读数 JSON 见 `.scratch/t488/before-responsive.json`／`.scratch/t488/after-responsive.json`；生成物一致性 `pnpm gen:check` runId `024d363e-0ec8-4623-a01a-3730c9604c9a` exit=0，五件 GEN-CHECK 全 ok——命令声明与生成物本票零改动。）

## 八、必报五步（结构纪律）

1. **影响清单**：`packages/skill-calorie/src/photo/`（新增 `helpDoc.ts`＝这一支的整页装配；改 `help.ts` 的 q 支出口）；`packages/skill-calorie/test/`（新增 `photo-helpdoc-488.test.mjs`；改 `help-center-91.test.mjs` ③ 两条断言，父席裁定放行）；`docs/skills/skill-calorie/`（本证据件）；`.scratch/t488/`（草稿）。**一行一件**，无跨能力行。
2. **结构设计**：不新建能力目录、不新建目录层级；`helpDoc.ts` 对外 1 个名字（`buildPhotoHelpDoc`）；同域 `galleryDoc.ts`／`pickerDoc.ts`／`gifDoc.ts` 是同一层同一形状的姊妹件（域内件不出 `src/photo/`，故不经 `photo/index.ts` 转出）。
3. **写代码**：跨目录只走公开件（`src/shared/docPage.ts`／`src/shared/copyArea.ts`／`src/render/copy.ts`）；常量读单一出处（`CALORIE_COPY_ACTION`／`DOC_VERSION` 口径与同域各页同值）；公共层零改动。
4. **超线报警**：无新增超线——新件 `src/photo/helpDoc.ts` 79 LF、改后 `src/photo/help.ts` 113 LF，均在 350 以内；本票未把任何件撑过线（`src/render/html.ts` 仍是 647 LF，与本包台账的「当场实测」列一致）。**「已超线，需要根据规则进行重构。」**一句在本票不触发。
5. **交付对账**：实际碰到 4 个目录，与第 1 步清单**逐行一致、偏差为零**；额外只写了草稿与证据，未碰 `src/render/html.ts`（一行未动）、未碰命令声明与生成物、未做 git 写操作。

## 九、未做项与下一手

1. **`src/render/html.ts` 的 `:239`／`:240` 两处裸 `<pre>`（渲染失败回执页）**：现状未变、仍不中公共样式，属该件的改版票。本票只读核对。同件 `:209` 的 `renderHelpRowHtml` 仍被 `calorie.help.lookup` 那支用，故该件的改版票要连 `renderHelpLookupHtml` 一起收。
2. **「看身材照HELP」自造入口词与 `src/photo/routes.ts:28`**：清理归 **#446**（含跨场景序号重排与 r81／t81-exec-smoke 同步）；本票不动匹配语义——改 `helpLookup.ts` 等于把这个词又请回来，方向反了。
3. **十页基线重落**：本票改了 q 支产物形状 ⇒ `packages/skill-calorie/scripts/gen-photo-baseline.mjs` 里 `calorie.help.center` 的 sha 必变（改前读数 `fe452fad…` 与基线 `fe452fadf15fe8ef94033bcac573bb6d5e97dc5ea6b2133b86356ce56d91251e` 逐字相同，说明本票改的就是基线里那一页）。本票**禁** `--write`（票面），重落归收口席。
4. **告警线门在本票取证当刻红 4 项，全部落在他席在途件**：`src/render/trendDocs.ts`（台账 892／实况 989）、`src/render/trendMiscPortDocs.ts`（592／597）、`src/analysis/multiTrendPage.ts`（511／516）、`src/weight/review.ts`（647／648）——本票只报不修（改台账＝改 `packages/skill-calorie/AGENTS.md`，不在写集）。**同一窗口内他席已跑同步器把台账对齐，本票末次复跑该门＝`RESULT: 60/60`、`PASS: 告警线台账齐全且与实况一致`**（上面四个数是他席 sync 前的当刻读数，如实留档）。本票新增／改动的件**无一条**出现在它的 OVER／RED 名单里。
5. **本文件窗口内的他席在途噪声（不掩盖）**：HEAD 在本票运行期间由 `f286358` 前进到 `3f9971a`（他席提交）；`packages/base-combos/src/present.ts` 与多条 `src/weight/*`、`src/diet/*` 改动在盘上。另有两处**本票写集之外**的红（附带跑到的、非票面十件）：`packages/skill-calorie/test/render-copy-90.test.mjs` 4 例、`packages/skill-calorie/test/cmd-read-t11.test.mjs` 的 T8 一例——前者根因是 `packages/base-render/src/controls.ts` 的 **#336**「有数据位自动补一颗禁用态复制日志」（该提交已于 2026-09-14 13:28 落地）与旧断言（期望 1 颗按钮／两行 2 颗）不再一致，失败用例全部直调 `copyActionHtml`／`renderHelpLookupHtml`／`renderPhotoHelpHtml`，不经过本票改动件；后者是 `calorie.view.home` 那一页（他席在途）。两条都不属本票，精确归因在此。
6. **草稿与读数落盘**：`.scratch/t488/`（`render-states.mjs` 造页脚本、`pages-before/`／`pages-after/` 冻结页、`before-responsive.json`／`after-responsive.json` 三档读数、`gate-regression.log` 与 `gate-regression-final.log` 回归日志、`help-page-issue-body.md` 票面原稿）。
