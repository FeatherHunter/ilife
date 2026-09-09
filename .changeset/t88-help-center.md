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
