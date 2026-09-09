---
'skill-calorie': minor
---

#88（map #63）HELP 速查台**实施 A 段**（S1 数据模型 ＋ S2 壳落地 ＋ S3 三守卫）：新增 `src/render/helpCenter.ts`（＋ `src/render/index.ts` 只加导出），把 436 条唤醒词 SoT **运行期投影**成 `SceneData` 并复用 `base-paint` 的冻结 HELP 壳 —— **base-render 零改动、零新增契约面**（冻结面仍 130 条 implemented／0 pending）。

- **数据模型**：`HELP_GROUPS`（十组，label／图标／序逐字取 F3 `render_help_center.py:44-53`）＋ `HELP_SUBFUNC_ORDER`（七分类显式序）＋ `buildHelpSceneData({updatedAt?})` → **10 分组／54 子功能／436 场景**，`id` 436/436 唯一，子功能 id 54/54 唯一；`types` 恒发 `SceneTypeBadge{text,bg,fg}`（F3 `TYPE_DEFAULT` 三档：结果／回执 `#e8f2ff/#0a63ce`、过程 `#e2f7f5/#00897b`，发字符串会走 CSS 默认色丢色）。
- **R1-7**：22 条 legacy 的 `Scene.id` 取 `main_prompt.cli` 原文（不再显示 F3 的 `legacy_{wake_word}` —— 那条命令在新架构里**不存在**）；差异登记台账 **L-19**（`docs/research/t88-impl-a.md` §5）。
- **壳落地**：`renderHelpCenterHtml({mode:'file'|'inline'|'text'})` 三态同源，恒走 `renderHelpShell`；资产恒取 base-paint 唯一产出者（helpers = `COPY_RUNTIME_JS`，css = `buildStyleSheet().css`）；`inline` 只取 `<section id="ilife-help-shell">` 片段（按深度配对）且 `<style>` 落点钉死＝片段最前、helpers 在片段最后。
- **三守卫**（`test/help-center-88.test.mjs`，23 用例）：① 六标记逐个残留 0 ＋ 泛化 `<!--[A-Z0-9-]+-->` 0 ＋ `report.markers` 六键；② id 唯一（数据层／HTML 层 ＋ 人为重复抛 `duplicate-id`）；③ `COPY_RUNTIME_JS === buildSharedHelpersJs()` ＋ 剥 helpers 后 `navigator.clipboard`／`execCommand`／`onclick=` 命中 0 ＋ 源码级零复制通道。
- **证据**：`docs/research/t88-impl-a.md`（A1–A8／R-cond-1…8／门禁／变异／台账）＋ `docs/research/t88-probe-impl-a.mjs`（断言式 **44/44**，含 F3 逐条对账：436 条 prompt／title／wake_word 逐字相等、10 组 × 54 子功能序相等）。四门 exit 0；canonical `pnpm test` 三轮失败集**新增 0**；4 处 src 级变异红→还原→绿（sha256 自证）。
- **未含**（实施 B）：扩 `buildSharedHelpersJs`（搜索／高亮／跳页／Sheet 实时预览／`#backTop`）、卡级复制按钮运行时注入（R1-1）、`style.ts` helpShell 新类 CSS；CLI 接线归 #91 —— **#88 关闭时用户仍看不到新版速查台**。

## 实施 B 段（S4：helpers 扩展 ＋ 卡级复制按钮 ＋ helpShell CSS）

- **`buildSharedHelpersJs` 功能面扩展（签名不变，`SharedHelpersInput` 未动）**：全部挂进**既有 `boot()`**、共用**既有幂等 marker**（`MARKER_SEL` ＋ `querySelector` 早退，**不新增第二个标记**），非 HELP 页逐项早退（helpers 被所有技能页面共享）。新增：① 卡级复制按钮（每张场景卡卡头 1 个，`actionId`／文案恒读 `HELP_COPY_ACTIONS.prompt`，`data-t` 取同卡 `<pre class="prompt">` 原文（S5 起以 `<pre>` 为主源；读不到才回落 Sheet prompt 按钮），复用既有 `[data-action-id]` 委派 → **零契约变更、零新增 actionId**）；② 搜索（过滤 ＋ `<mark>` 高亮 ＋ 命中卡片 Sheet／子功能组自动展开 ＋ 命中计数「匹配 N 个场景」＋ 清空复原 ＋ `Enter` 在命中分组页间跳页）；③ Sheet 参数实时预览（`editable_fields` 静态值换输入框，输入即重组「prompt ＋ 空行 ＋ `label: value` 行」，并同步 prompt／params 复制按钮的 `data-t`）；④ `#backTop`（`scrollTop > 400` 加 `-show`，点击平滑回顶）。
- **纯度**：只用 `document.*`（含只读 `document.scrollingElement`）＋ 既有只读 `window.matchMedia`；零 `window.<id>=`／`globalThis.<id>=`／`node:`／`classList`／内联 `on*`／`<canvas>`（`contract-signatures` ＋ `style.test.mjs` T23／T28 逐条过门）。
- **`src/style.ts` helpShell 区新增 11 个类**（`card-copy`／`card-mark`／`card-hidden`／`subgroup-hidden`／`tab-search`／`tab-search-input`／`tab-search-clear`／`page-hitcount`／`field-input`／`btn-backtop`／`btn-backtop-show`）：全部落在 `ilife-help-shell` 命名空间内（T9 闭集）且后缀 `startsWith` 既有 `cls()` 实参（T11 归属）；**不新增 token、不越区、不走技能侧 `extraCss`**；`prefers-reduced-motion` 下 `#backTop` 过渡归零。
- **无 JS 降级**：不注入 helpers 时页面＝今日 CSS-only 壳（436 卡／1308 静态复制按钮／Tab 可切换／搜索框与 `#backTop` 均不存在）。
- **证据**：`docs/research/t88-impl-b.md` ＋ `packages/base-render/test/help-center-js-88.test.mjs`（7 用例，含真实 headless Chrome）＋ `docs/research/t88-browser-evidence-b.mjs`（CDP **29/29**：436/436 卡头按钮、`data-t` 逐字、委派复制、搜索 44 命中／99 mark／计数、`#backTop` 原生滚动出现＋可信点击回顶、删 marker 后二次注入幂等、禁用脚本引擎下 436 卡／0 注入／原生点击 Tab 可切换）＋ `docs/research/t88-probe-impl-b.mjs`（59/59）。四门 exit 0；canonical `pnpm test` **8 轮**失败集并集：新增 3 条**全为 B 类（子进程 NTSTATUS 崩溃／环境抖动，均单独复跑全绿）**、真 delta 0；2 处 src 级变异红→还原→绿（sha256 自证）。
- **仍未含**：CLI 接线（#91）—— **#88 关闭时用户仍看不到新版速查台**。

## 收尾 S5（审查缺陷修复 ＋ 门禁工具）

- **卡级复制按钮不再倍增**：`boot()` 重入只挂一次委派，并在**事件对象**上做跨实例去重（helpers 被多次注入时每个实例各有闭包）→ 一次点击恒只复制 1 次／只出 1 个 toast（修前实测 4 次）。
- **卡级按钮主源改为同卡 `<pre class="prompt">` 原文**：无 Sheet prompt 按钮的卡不再被静默跳过，且解掉「卡级按钮跟 Sheet 按钮走」的耦合；真实壳 436/436 卡恒有 `<pre>`。
- **补三档徽章色逐条断言**（`TYPE_DEFAULT[text] → {bg,fg}` 逐档钉死）＋ `text` 态裸 `<N>` 判为 legacy CLI 原文（逐字保留、非 HTML）。
- **`tooling/run-locked.mjs` 补子进程超时**：`--child-timeout-ms`（默认 900000）超时杀进程树 ＋ `RUN … timeout=1` ＋ exit 124 ＋ 放锁（防「子进程挂死 → 包装器永久持锁 → 堵死其他 session」）；`pnpm gate:selftest` 改用独立锁目录，**调用方不得再套 `run-locked`**。
- **证据**：`docs/research/t88-final.md`（A1–A8 总表／四门与 canonical 实测／9 轮 delta 分类／变异索引／偏离总账／未做项／#91 接线说明）；靶向 220/220、`gate:selftest` 20/20、canonical 新增 0、S5 三处 src 级变异 3/3。
