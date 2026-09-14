# t421 · 页面融合四件：占比迷你条、分布条行、徽章、字段变更行（公共层增量）

本记录归公共层包 `base-render`（目录名逐字，见 `docs/agents/doc-homes.md`）。票面 #421（地图 #156
卡路里场景 04 运动 · 公共层增量的第二件，前置 #420 已关票）。本票只动 `packages/base-render` 三件：
`src/blocks.ts`、新测试件 `test/page-viz-421.test.mjs`、本证据件。`packages/skill-calorie/` 一行未改；
两张样张、`docs/skills/skill-calorie/` 下证据件、#420 的 `test/page-finish-420.test.mjs` 与
`docs/base/base-render/t420-*.md` 一字未动；生成物（`dist/`）不手改。

**同文件同名函数核对**（派单先读项 2）：票面提到的 `renderDistributionRows` 在改动前**不存在**
（`packages/base-render/src/blocks.ts` 与全包检索 `Distribution|distribution|dist-row` 零命中），
故不存在同名冲突，四件都是本票新收。

## 1. 四件与落点

| 件 | 票面类名（逐字） | 入参 | 空态／夹取 |
| --- | --- | --- | --- |
| 占比迷你条 `renderMiniBar` | `ilife-block-mini-bar`／`-fill` | `{ pct, color? }`；`color` 收 token 名（`--x`）或色值 | `pct` 越界夹取；非数（`NaN`／`Infinity`／字串／缺参）→ `bad-input` |
| 分布条行 `renderDistributionRows` | `ilife-block-dist-row`／`-name`／`-bar`／`-fill`／`-val` | `{ rows: [{ label, value, pct, color?, labelClass? }] }` | `rows: []` → 空串；行缺 `label`／`pct` 非数 → `bad-input` |
| 徽章 `renderChips` | `ilife-block-chip` | `{ items: [{ text }] }` | `items: []` → 空串；`text` 空串／非串 → `bad-input` |
| 字段变更行 `renderChangeRows` | `ilife-block-change-row`／`-label`／`-old`／`-new`／`-arrow` | `{ rows: [{ label, before?, after?, arrow? }] }` | `rows: []` → 空串；`arrow` 缺省为真 |

四条口径（供审查席复核）：

1. **四件都是页面级，不进 `BLOCK_STYLE_SECTIONS`。** 该闭集被 `test/blocks.test.mjs:71-77` 逐字钉死
   12 项，而该测试件不在本票路径所有权内，故样式随 `pageShell` 区落盘（与 #420 同处置）：不新增样式区、
   不改 11 个冻结 token、不产闭集外类名（台账读数见 §5）。新类沿用 #420 的页面级命名法
   （`pageLevelBlock`／新增的伴生 `pageLevelPart`），与 12 区的 `ilife-block-<区 slug>-<件>` 同前缀同形。
2. **颜色只从入参来。** 产物里的 `background` 声明**只在调用方给了颜色时才出现**；不给时填充色由样式段
   的冻结 token（`--blue`）兜底。给 `--x` 这种 token 名会自动包成 `var(--x)`（票面「token 名或色值皆可」），
   给整条 `var(…)` 或色值则逐字透传。公共层自身不写任何领域色（如 `--accent` 这类语义色名一个都没有）。
3. **`arrow: false` 仍占箭位**（票面「与老技能同一手法」）：箭位元素照出、字形 `→` 照留，只加内联
   `style="visibility:hidden"`。用可见性而非 `display: none`——后者会把箭位栏宽一起抽掉，左右两栏就对不齐了。
   测试的鉴别力在这里：假箭头元素与真箭头元素**除可见性外逐字相同**（§3 标了这条判据）。
4. **行即件**：分布条行与徽章都没有外层容器类（票面只列了行／项自身的类名），空集返回空串，
   与「没内容不留空壳」同口径。

## 2. 判据读数（先红 → 后绿）

**先红**（`node tooling/run-locked.mjs --ticket 421 -- node --test packages/base-render/test/page-viz-421.test.mjs`，
当刻四个函数都不存在）：`GATE-RUN runId=1da3bca9-cf84-4231-a461-72bbc98185ab` exit=1

```
SyntaxError: The requested module '../dist/blocks.js' does not provide an export named 'renderChangeRows'
✖ packages\base-render\test\page-viz-421.test.mjs (101.0899ms)
ℹ tests 1 ｜ ℹ pass 0 ｜ ℹ fail 1
```

**后绿**（本包先编译：`GATE-RUN runId=37b21fe8-a361-45ba-9ae9-0d13c5bfbf6f` exit=0
（`pnpm -C packages/base-render exec tsc -b`）；再跑判据：
`GATE-RUN runId=ba1ce3dc-c623-483a-8b24-dcf10100a8c6` exit=0）：
`ℹ tests 22 ｜ ℹ suites 5 ｜ ℹ pass 22 ｜ ℹ fail 0`。22 条＝迷你条 5 条（类名与内联宽／夹取／非数抛错／
不给色值／两种颜色写法）＋ 分布条行 6 条（四栏类名与行即件／逐行宽与色／越界夹取／`labelClass`／空集与非法入参／
转义）＋ 徽章 3 条（逐项／空集／转义与非法入参）＋ 变更行 4 条（四栏与次序／箭头缺省为真／`arrow: false` 占位／
空集与转义与非法入参）＋ 公共层纪律 4 条（产物零色值字面量／11 键与 12 区闭集不动且只读冻结 token／
13 个新类各有规则块／源码零领域词）。

## 3. 变异自证两行（＋一条旁证）

一次持锁内跑完，`GATE-RUN runId=593becc0-f5be-4d08-a3e0-00ee16571c7b` exit=0（首版读数）、
`GATE-RUN runId=609868f6-3918-4b62-ae8a-e654095f07a1` exit=0（补全「失败用例」行的复跑）。
每组都是「改源 → 编译 → 跑判据 → 记读数 → 还原源 → 编译 → 跑判据 → 记读数」，脚本 `.scratch/t421/mutate.mjs`
（草稿目录，不入仓）。**两次运行的收尾都打印「源码还原（sha256 同原值=true）」**，
源文件 sha256 原值／收尾值都是 `bf23e45e7071897b4dba2dd6f5709f3f9fd1528f3bf8c1eac9e4d99b878aa638`。

| 变异 | 红读数 | 复原后读数 |
| --- | --- | --- |
| ① 去掉 `pct` 上限夹取（`Math.min(100, Math.max(0, …))` → `Math.max(0, …)`） | exit=1，`tests 22 pass 20 fail 2`，失败用例 `越界夹取：120 → 100%、-5 → 0%；两端与小数不夹坏`、`越界 pct 同行夹取口径（120 → 100%、-5 → 0%）` | exit=0，`pass 22 fail 0`，无失败用例 |
| ② 去掉 `arrow: false` 的箭位占位（可见性机制整段不落产物） | exit=1，`tests 22 pass 21 fail 1`，失败用例 `arrow: false 仍占箭位（元素在、字形在，只加可见性隐藏）` | exit=0，`pass 22 fail 0`，无失败用例 |
| ②-b 旁证：同一占位换成 `display:none`（占位元素塌掉） | exit=1，`tests 22 pass 21 fail 1`，失败用例同上 | exit=0，`pass 22 fail 0`，无失败用例 |

两行都满足票面要求：① 去上限夹取必红、② 去 `arrow: false` 占位必红；两次复原都必绿。②-b 是旁证——
条「占位」判据不只拦「整段删掉」，也拦「换成会让栏位塌掉的写法」。

## 4. 门禁读数（三条）

| 命令 | runId | exit | 摘要 |
| --- | --- | --- | --- |
| `pnpm build` | `fff232b4-4b27-4905-8ee1-cf5eba47740d` | 0 | 全绿（含 `tsc -b`、`gen-cli --stamp`、各 `build:client`） |
| `node --test packages/base-render/test/blocks.test.mjs` | `ee791ad6-460f-48d9-a26b-cbfdf62b7705` | 0 | `ℹ tests 46 ｜ ℹ pass 46 ｜ ℹ fail 0` |
| `node --test packages/base-render/test/style.test.mjs` | `772517e7-d06e-4945-8f94-6055a8c7b4dd` | 0 | `ℹ tests 29 ｜ ℹ pass 29 ｜ ℹ fail 0` |

**`pnpm build` 归因（票面要求的那一步）**：本轮三条门禁**同一批全绿，无一条红**，故不需要归因。
为防「绿是因为没跑到」这类空话，按票面口径留了正面读数：本票改动落在 `packages/base-render/`，
当刻树上有他席在途件（`git status` 里 `packages/skill-calorie/` 与 `packages/base-render/src/charts.ts`
等 100 余条未提交改动），这些在途件本轮恰好都编译得过；若下一轮 `pnpm build` 转红，按票面口径逐条复核错行归属，
**只认 `packages/base-render/` 下的错行算本票的，且不改别席文件**。

## 5. 公共层纪律台账（探针 `.scratch/t421/ledger-probe.mjs`，只读 `dist`、不改工作区）

```
ilife-block-mini-bar：buildStyleSheet.css 出现=0，blocksCss 出现=2，落控件根名下=否（台账判定面外）
ilife-block-mini-bar-fill：buildStyleSheet.css 出现=0，blocksCss 出现=1，落控件根名下=否
ilife-block-dist-row：buildStyleSheet.css 出现=0，blocksCss 出现=5，落控件根名下=否
ilife-block-dist-row-name／-bar／-fill／-val：buildStyleSheet.css 出现=0，blocksCss 各出现=1
ilife-block-chip：buildStyleSheet.css 出现=0，blocksCss 出现=1，落控件根名下=否
ilife-block-change-row：buildStyleSheet.css 出现=0，blocksCss 出现=5，落控件根名下=否
ilife-block-change-row-label／-old／-new／-arrow：buildStyleSheet.css 出现=0，blocksCss 各出现=1
blocksCss 类名总数=71；前缀不是 ilife-block- 的=["ilife-page-printable"]（#420 的打印开关类，非本票新类）
闭集外类名 .ilife-bar：blocksCss 出现=0   闭集外类名 .ilife-dist：blocksCss 出现=0
blocksCss 用到的 token=--bg,--fg,--blue2,--fg2,--line,--card,--blue,--soft,--shadow,--fg3,--ok；全部冻结=true
BLOCK_STYLE_SECTIONS 项数=12：pageShell,kpiCard,dataTable,chartBlock,listRows,preBlock,detailSection,disclosure,paramForm,emptyBlock,copyBlock,feedbackBlock
四件缺省产物里的色值字面量=[]
```

结论：13 个新类全不落控件台账判定面（`style.test.mjs` 的 T9／T10 只扫 `buildStyleSheet().css`），
12 区闭集仍是 12 项，新样式用的 token 全在 11 键冻结表内，产物零色值字面量 ⇒ **无须补登，也没有放宽任何断言**。
样例产物（`aria-label` 略）：

```html
<span class="ilife-block-mini-bar" role="img" aria-label="…"><span class="ilife-block-mini-bar-fill" style="width:42%"></span></span>
<div class="ilife-block-dist-row"><span class="ilife-block-dist-row-name">甲</span><span class="ilife-block-dist-row-bar"><span class="ilife-block-dist-row-fill" style="width:42%"></span></span><span class="ilife-block-dist-row-val">1</span></div>
<span class="ilife-block-chip">甲</span>
<div class="ilife-block-change-row"><span class="ilife-block-change-row-label">甲</span><span class="ilife-block-change-row-old">1</span><span class="ilife-block-change-row-arrow" aria-hidden="true">→</span><span class="ilife-block-change-row-new">2</span></div>
```

## 6. 同文件他席在途改动与我的 hunk 边界

动手前先复核：`git status --short -- packages/base-render` 当刻只有 `src/charts.ts`、`test/charts.test.mjs`
两件脏（他席在途），`src/blocks.ts` 干净。我的两次改动落成 **2 个 hunk，全是新增**
（`git diff HEAD --stat` ＝ `279 insertions(+)`，0 deletions）：`@@ -261,6 +261,189 @@`（四件实现）与
`@@ -910,6 +1093,102 @@`（`pageShell` 区的样式规则）。因此**不需要按 hunk 过滤**——
本票对 `src/blocks.ts` 的暂存可以整文件 `git add` 而不含别席的活（该文件此刻没有别席在途 hunk）。
若暂存当刻复核发现该文件冒出他席 hunk，则改走 `.scratch` 里的 hunk 过滤路径只暂存本票两段，
并当场回写本节读数——**不做整文件还原、不做 `stash`／`checkout`**。

## 7. GATE-RUN 对账

**对账窗口**（`tooling/check-gate-audit.mjs --ticket 421 --since 2026-09-14T10:51:44Z --until 2026-09-14T10:58:19Z`）
内共 **8 条** `RUN` 条目，逐条声明如下，窗口内无一条未声明（声明行按工具口径写：`cmd=` 之后到行尾整段都是命令，
故退出码注记一律不写在声明行里）：

```
GATE-RUN runId=1da3bca9-cf84-4231-a461-72bbc98185ab cmd="node --test packages/base-render/test/page-viz-421.test.mjs"
GATE-RUN runId=37b21fe8-a361-45ba-9ae9-0d13c5bfbf6f cmd="pnpm -C packages/base-render exec tsc -b"
GATE-RUN runId=ba1ce3dc-c623-483a-8b24-dcf10100a8c6 cmd="node --test packages/base-render/test/page-viz-421.test.mjs"
GATE-RUN runId=593becc0-f5be-4d08-a3e0-00ee16571c7b cmd="node .scratch/t421/mutate.mjs"
GATE-RUN runId=609868f6-3918-4b62-ae8a-e654095f07a1 cmd="node .scratch/t421/mutate.mjs"
GATE-RUN runId=fff232b4-4b27-4905-8ee1-cf5eba47740d cmd="pnpm build"
GATE-RUN runId=ee791ad6-460f-48d9-a26b-cbfdf62b7705 cmd="node --test packages/base-render/test/blocks.test.mjs"
GATE-RUN runId=772517e7-d06e-4945-8f94-6055a8c7b4dd cmd="node --test packages/base-render/test/style.test.mjs"
```

窗口内有 **1 条非零退出**（先红那条：`1da3bca9` exit=1），按工具口径需要放宽开关，故写明：

```
GATE-RELAX flag=--allow-nonzero reason=先红读数 1 条（当刻四函数都不存在，判据必须红），是本票过程读数，须连同非零退出一起入账。
```

窗口外的动作（本票提交／推送的 `git add`／`git commit`／`git push` 走 `run-locked` 的条目，以及只读探针
`.scratch/t421/ledger-probe.mjs`——它不改工作区、不经加锁包装器）时间都在 `--until` 之后，与业务读数无关，
故不写成本节的声明行。
