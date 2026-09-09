# #88 实施 B 段红队审查（独立复跑 · 自设探针 · delta／变异复核）

> 审查者：**red5**（红队席）。被审链：`e3690df`→`f2d4be0`→`c49b608`→`0ff4deb`→`a300403`（起审 HEAD `a300403`；审查期间 HEAD 前移至 `4c96b8a`）。
> 纪律：只读＋只写本文件与 `.scratch/orchestrator/red5-*`；一切 build／test 经 `node tooling/run-locked.mjs --ticket 88 --`。**未读** `t88-review-impl-b-blue.md`（保持独立性）。
> 复跑产物：`.scratch/orchestrator/red5-{probe-impl-b,probe-impl-a,probe-shell3,browser-b,targeted,after,delta,mut,probe-b}.log`。

## ① 复跑清单（本人执行，runId 见 `.scratch/locks/gate-runs.log`）

| 命令 | runId | exit |
|---|---|---|
| `node docs/research/t88-probe-impl-b.mjs` | `bebc75dc…` | **0**（59/59；样本 sha256 `6b60752b…`／1,027,870 B／4,042 行，与证据逐字一致） |
| `node docs/research/t88-probe-impl-a.mjs` | `811ff3ef…` | **0**（44/44） |
| `node docs/research/t88-probe-shell3.mjs` | `eb38bd3e…` | **0**（436 卡／卡头按钮 0／helpers 18,446 B） |
| `node docs/research/t88-browser-evidence-b.mjs` | `a4d34cb2…` | **0**（29/29） |
| `node --test {help-center-js-88,help,style,contract-signatures,controls}.test.mjs` | `9b3614f3…` | **0**（195/195） |
| `pnpm test`（canonical 1 轮，我方） | `6866ab6d…` | 1（新增 35／消失 5） |
| `node --test …cmd-write-40.test.mjs` ×2 | `d3d4cf72…`／`ff5693f0…` | **0／0**（各 13/13） |
| `node .scratch/orchestrator/red5-mut.mjs` | `17d145fd…` | **0** |

跑后自检：`git status --short -- packages/skill-calorie/SKILL.md` 空（#124 未复现）；774 个受跟踪文件零填充扫描 **0 命中**。

## ② S4 三项对表

- **A. helpers 扩**：签名／`SharedHelpersInput`／`src/spec/*` 零改动（`contract-signatures` 195 项内 exit 0）；`var MARKER_ATTR =`／`setAttribute(MARKER_ATTR`／`function boot()` 各 1 处（探针 B-P10/11 我复跑 59/59）；`help.ts` 全链零改动（`git log e3690df~1..a300403 -- src/help.ts` 空）。**成立**。
- **B. 卡级注入（R1-1）**：浏览器独立复现 **436/436**（B1–B7：每卡恰 1 个、落点 `card-top`、`data-t` 与同卡 `<pre>` 逐字、actionId／文案恒读冻结常量、`className` 恰为 `ilife-help-shell-card-copy`）；委派复制 436/436（B10）；静态 HTML 卡头按钮 0（B-S3／B27）。**成立**。
- **C. 新类 CSS（R1-6）**：11 类 T9／T11 双绿（`style.test.mjs` 在我 195/195 内）；`computed` 生效（B8：`999px`／`rgb(0,122,255)`／`flex`）；reduced-motion 归零、不新增 token（探针 B-C1/C2）。**成立**。

## ③ 浏览器 29 项核对（逐项，实际值）

①B1–B3 `436／436/436`；②B4–B7 `436／436／436／436`；③B10 `clicked=436 copied=436 equalsPre=true`；④B25 `{cardCopy:436,searchBoxes:1,backTops:1,markers:1}`；⑤B-S3/B27 静态卡头按钮 **0**；⑥B12–B19 `placeholder=搜索全部场景`／`hidden=392 visible=44`／`marks=99`／`匹配 44 个场景`／`tab-0→tab-1`／清空复原全 0；⑦B20–B24 `scrollY 900→-show→opacity 1→可信点击→0→再隐藏`；⑧B27–B29 `436 卡／436 prompt／1308 静态按钮／0 注入／0 搜索框／0 #backTop`＋`labels=11`＋原生点击 `tab-1→tab-0`。**8/8 项、29/29 断言全 PASS，无一项对不上。**

## ④ 自设新探针（`.scratch/orchestrator/red5-probe-b.mjs`，**30/30**）

- **(a) 文本来源／无 Sheet 按钮场景**：同卡 Sheet prompt 按钮**不存在**时 `injectCardCopy` 静默 `continue` → 卡级按钮 **436→434**，卡 0／1 **无按钮**（A3）；篡改 Sheet 按钮 `data-t` 后卡级按钮跟随哨兵、**不等于** `<pre>`（A5）→ 来源是 Sheet 按钮而非 `<pre>`，属**设计耦合**（现由「data-t==<pre>」断言兜住）。
- **(b) 幂等**：连续 3 次 `boot()` 后仍 `copy=436／search=1／bt=1／marker=1`（B1-1/2）；但删 marker 后每次 boot **重复挂 `document` 点击委派** → 一次点击 **3 次复制／3 个 toast**（B1-3）。marker 在 `initHelpShell()` **之前**落盘：`initSearch` 抛错后 `copy=436／search=0／bt=0／marker=1`，再注入被 marker 早退 → **半初始化不可自愈**（B2-1/2）。
- **(c) 纯度／零依赖**：产出文本与 `controls.ts` 追加块均**零** `window.<id>=`／`globalThis.<id>=`／`node:`／`<canvas>`／`classList`／`eval`／`localStorage`／内联 `on*`；`window.*` 只读引用**仅** `matchMedia(…).matches` 1 处（C1–C12）；运行期**零新增 window 自有属性**、`matchMedia` 未被替换、`canvas=0`（C13–C17）。注：`window.backTop` 存在＝`id="backTop"` 的**命名访问**（H-19 逐字点名），非赋值。

## ⑤ delta 分类复核（§5 五条守卫，逐条自算）

- 守卫③（基线本就红）：我在**冻结基线两轮**（`baseline/09b`／`09c`）逐名核对——`#87 ⑧ --output 覆盖`、`T9 目标分析盘 parity`、`落库 · 体重 log/update/batch/remove`、`体重记/改/删/批量 + 缺身高仍记（C5 #43）` 四条**两轮均 ✔ PASS** → 守卫③不触发。守卫①（路径所有权／被测对象）四条均不在 #88 面；守卫④无同名连续 ≥3 轮；守卫⑤轮 1／2／8 有单独复跑（我抽检 `run-flake-87-1`14/14、`t11-1`5/5、`persist-1`17/17 全绿）。
- **轮 9 第 4 条（`体重记/改/删/批量…`，`cmd-write-40.test.mjs:53`，`exit=3221225477`）：证据 §3.2 表内**无**单独复跑列 → 触发 **§5.2-5 → 一律判 C 类（真 delta）**。我独立单独复跑 **2× exit 0（13/13）**，即实质属 B 类，但按裁定字面「不得主张 B 类」→ **新增≠0、本票不得关闭**，须补证据后由编排者改判。
- 轮 9 另 3 条（A 类 `AssertionError`，`softdelete-120.test.mjs`／`cmd-write-40-persist.test.mjs`）确属他票在途 WIP，但实施者在**污染窗口内自判 delta**，与 `t120-ruling-softdelete.md` §冲突C-43（「不得在他人 WIP 窗口内据此判定 delta；拿不到干净窗口时如实登记『门禁未取得（他票 WIP）』」）相悖（该裁定 21:00:32 落地，轮 9 为 21:09）。我方 canonical 轮同样被污染：**新增 35 条全为 `#97 · M5 四要素`**（编排者 §6 已裁定该文件为 #97 的 S2 夹具顺序依赖），故我**不主张**本票 delta 结论，如实登记「门禁未取得（他票 WIP）」。

## ⑥ 变异复核（独立重跑，持锁，`tsc -b --force`）

| 变异 | sha256 前→后→还原 | 红 | 还原后 |
|---|---|---|---|
| MUT-B1 `controls.ts:805` `getAttribute(TEXT_ATTR)`→`textContent` | `771E4B74…353C`→`41E22AE2…93F0`→**`771E4B74…353C`** | S4-6 exit 1（`✖` data-t 断言） | exit 0 |
| MUT-B2 `style.ts:862` →`help-shell-search {` | `C2596FB1…5D93`→`60C08E3A…7573`→**`C2596FB1…5D93`** | `style.test.mjs` T11 exit 1 ＋ S4-3 exit 1 | 双 exit 0 |

sha256 与实施者报告**逐字一致**；还原后 `git status --short -- packages/base-render` 0 行。

## ⑦ 缺陷清单

1. **S1-过程违规（本票 B 段引入）**：§2.4-1／§2.4-5 **裸跑**。证据：`gates-b2/b3/b4.ps1`（20:51／20:54／20:55）、`round9-b.ps1`（21:04:30）、`close-b.ps1`（21:08:26）**自建目录锁直跑** `pnpm test`／`pnpm build`／`node --test`，全程不经 `tooling/run-locked.mjs`（§2.4 自 20:44:49 `a8d5c1f` 生效）。机械实证：20:52–21:09 窗口内 `.scratch/locks/gate-runs.log` **无本段任何 RUN 条目**（同窗口 13:04–13:10 只有治理 session 的条目）；证据 §3 却称「全部持锁」。附带：证据**无** `GATE-RUN`／`GATE-RELAX` 行，亦无 §2.4-4 的受跟踪对账源（`docs/research/t88-gate-runs.log` 不存在）→ 按 §2.4-3 其 exit 码表**不得作为门禁证据引用**。**累犯**：同票 #88 已有一次具名书面处置（`ce3e234`，一次性／不类推）→ §6.1②-4 比例处置路径**关闭** → 字面**作废重做**（**仅编排者可裁**；若派单曾具名豁免，请以派单为准——证据中无 `GATE-RELAX` 留痕）。
2. **S2（本票）**：轮 9 B 类新增缺 §5.2-5「单独复跑 ≥2 次全绿」证据 → 按字面 C 类／真 delta（我方 2× 绿，补证即可改判）。
3. **S3（本票）**：(a) 无 Sheet prompt 按钮的卡静默跳过（探针 A3，无回落）；(b) marker 早于 `initHelpShell()` 落盘 → 半初始化不可自愈（探针 B2）；(c) 删 marker 后重复注入使点击委派**倍增**（探针 B1-3），B25「更强幂等」仅 DOM 判据成立；(d) 污染窗口内自判 delta（见 ⑤）；(e) `e3690df` 提交信息样本 1,027,850 B vs 证据／实测 1,027,870 B（历史陈述不一致，不改写）。
4. **范围外**：`m5-receipt-97.test.mjs` 全量下 35 条红（已由 §6 裁定归 #97 S2）；`.scratch/locks/owner.json` 262 B **全 NUL**（21:10:41 被杀的治理 session 运行残留，**第 4 次零填充实例**，untracked、事故票 #124 登记用）。

## ⑧ 五维与 verdict

契约一致 **30/30**｜证据真实可复现 **19/25**（复跑全绿、样本 sha256 一致；扣：机械对账缺失、轮 9 B 类缺 §5.2-5、污染窗口自判）｜parity **18/20**（436/436 逐字、H-19／F3 文案逐字；扣：无 Sheet 按钮卡静默跳过、F3 搜索作用域未逐值比对）｜工程红线 **10/15**（纯度／零依赖全绿；扣 §2.4 裸跑）｜文档同步 **9/10**。**均分 86**。

**verdict：FAIL**——技术面（S4 三项、浏览器 29/29、变异自证）**全部独立复现成立**，无 S1-交付缺陷；但存在**未被处置的 S1-过程违规**，且 §6.1②-4 累犯条款使比例处置路径关闭 → 按 §6.1④ 字面 FAIL。建议编排者：①就本次裸跑出具书面裁定（并据累犯条款判是否作废重做）；②令实施者补轮 9 B 类的单独复跑证据（我方 2× 绿可复用）；③转 #97 修 `m5-receipt-97.test.mjs` 夹具顺序依赖；④#124 登记 `owner.json` 零填充第 4 实例。
