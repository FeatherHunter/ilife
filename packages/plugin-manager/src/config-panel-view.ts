/** 共用配置面板 · 视图半：一行怎么画（`Row`）、整面怎么画（`PanelBody`）。
 *
 * 本件是**纯函数**：吃一份状态与一组回调，回一棵 React 元素树，自己不留任何状态、不取任何数。
 * 为什么这么分：状态机与副作用住在 `config-panel.ts` 那一层，于是本件在 Node 里就能直测
 * （照 `directory-browser-ui.ts` 的既有作法：用例把组件当普通函数调，直接读回那棵树）。
 *
 * 手写 `React.createElement`（本包 client 束禁 JSX）。样式表 `S` 就在本件里——面板怎么画只有这一处。
 *
 * **外观真源＝`docs/agents/配置区域视觉模型-v3.1.html`（#920 阶段二起）**：本件的 `S` 逐项照它的
 * CSS（`:32-205`）、行模板照它的 `rowShell`／`masterShell`／`cardShell`（`:349-451`）、状态徽标照它的
 * `badgeHTML`（`:544-552`）那七档。**颜色／间距／圆角／字号／层级一律照取值，不许自己重新设计**；
 * 与本件不同的只有下面这四条（每条都在这里写明为什么，改之前先读 #920 的证据件）：
 *   ① **字号一律 em，没有 px**：跨包锁 `test/panel-type-739.test.mjs` 钉死「零 `font:` 简写／零字族／
 *      字号一律相对单位」——宿主没有界面字号 token，绝对 px 会在别的窗口尺寸上失真。v3.1 的 px 按它
 *      自己已锁死的那两对锚点换算（`13.5px↔1.08em`、`11.5px↔0.92em` ⇒ **1px＝0.08em**），一个不丢。
 *   ② **值列不写等宽字族**：v3.1 的值列要 `font-family: var(--ic-mono)`，而 `#739 ①` 明令共用件零
 *      `fontFamily`／零 `font:` 简写 ⇒ 值继承宿主字族。这是与 v3.1 的**一处已知不同**（#920 证据件有账）。
 *   ③ **换行判据交给 CSS，不按字符数估宽**：v3.1 靠 JS 量文本宽在两套模板间两选一（审查 P0-4／P0-5：
 *      每列 6.048px、真阈值 40–43 列而注释按 34 估 ⇒ 9 行被无谓拆两行、快面一次性长高 194px）。
 *      本件没有 DOM 可量，故照审查给的修法把同一个决定交给排版引擎：行是 `flex-wrap` 容器，标签列定宽、
 *      值列 `flex-basis:auto`（＝内容的自然宽）——装不下时**整行让位**（值落第二行、按钮仍在第一行行尾，
 *      与 v3.1 的 `.is-wide` 同形）；值再长就在自己那一行里 `overflow-wrap:anywhere` 折下去。
 *      **零省略号、零截断**（`white-space` 不用 `nowrap`、`text-overflow` 一次都不出现）。
 *   ④ **画不出来的三样**用等价形态顶上：分组箭头 `::before`／`[open]` 旋转／keyframes 动画内联样式
 *      给不出 ⇒ 画静态「›」与静态环（形状与 v3.1 同，只少了动）。
 *
 * 三条定稿（v3）在本件落地：
 *   ① **只读行的目录按钮不画**（不画一枚点了也没反应的死按钮）；
 *   ② 目录行的按钮字面**两档合一**，一律「浏览文件夹」（入口供不了时整枚不画）；
 *   ③ **每行一枚「复制」**：复制这一行完好的值文本；点下去按钮就地变「已复制」再变回，不弹提示。
 *
 * 对外只经 `config-panel-api.ts` 那一道门；本件自己不出门。
 */

import * as React from 'react';
import { ADVANCED_GROUP_NOTE, ADVANCED_GROUP_TITLE } from './config-panel-contract.js';
import type { ConfigItem, ConfigSurfaceReply } from './config-panel-contract.js';
import { DirectoryBrowserFromRow } from './directory-browser-ui.js';
import type { DirectoryRowBrowser } from './directory-browser-state.js';
import type { DirectoryRowEntry } from './directory-browser-api.js';

/** 面板的样式表：取值逐项照 v3.1（颜色走 DSH 主题别名，写死值只做回退；字号一律相对单位 em）。
 *
 * 键名一个都不许改：六家附加块真消费 `okText`／`error`／`rows`／`label`／`muted`／`hint`／`info`／
 * `bar`／`btn` 这九格（`plugin-memo-ilife/src/client.ts`、`plugin-schedule-ilife/src/client.ts` 的
 * `PanelStyleSlots`），跨包锁另钉 `card`／`input`／`btnPrimary`／`btnPick`／`summary`／`title`／`version`。 */
const S = {
  /** `.ic-card`：`background:var(--ic-surface)`（＝bg-layer-1）＋`border:1px solid var(--ic-line-strong)`
   *  ＋`border-radius:12px`＋`padding:14px`＋`box-shadow:inset 0 1px 0 rgba(255,255,255,.06)`。
   *  基准字号**不钉在卡片上**（#739 ⑤：跟着宿主走）。 */
  card: {
    padding: 14,
    borderRadius: 12,
    border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12))',
    background: 'var(--dsw-alias-bg-layer-1, #232324)',
    color: 'var(--dsw-alias-label-primary, #f9fafb)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)',
  } as React.CSSProperties,
  /** `.ic-head{display:flex;align-items:center;gap:10px;min-height:22px}`（徽标靠 `margin-left:auto` 右贴）。 */
  head: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 22 } as React.CSSProperties,
  /** `.ic-title{font-size:13.5px;font-weight:640}`——字号按 60 行那条锚点换算成 `1.08em`。 */
  title: { fontSize: '1.08em', fontWeight: 640 } as React.CSSProperties,
  /** `.ic-file{margin-top:4px}` 的那 4px 挂在两行的公共容器上：`info` 自己一格 margin 都不写
   *  （#743 ①：头部两行间距不一家一个数，故这一项一律不写 margin）。 */
  fileWrap: { marginTop: 4 } as React.CSSProperties,
  /** `.ic-file b{color:var(--ic-faint);font-weight:400;margin-right:5px}`（「配置文件」「数据目录」那两个字）。 */
  fileLabel: {
    color: 'var(--dsw-alias-label-tertiary, #adb2b8)',
    fontWeight: 400,
    marginRight: 5,
  } as React.CSSProperties,
  /** `.ic-file{color:var(--ic-muted);font-size:11.5px;word-break:break-all}`（11.5px ⇒ `0.92em`）。 */
  info: {
    color: 'var(--dsw-alias-label-secondary, #cfd3d6)',
    fontSize: '0.92em',
    wordBreak: 'break-all',
  } as React.CSSProperties,
  /** `.ic-muted` 那一档（次要字）。 */
  muted: { color: 'var(--dsw-alias-label-secondary, #cfd3d6)', fontSize: '0.92em' } as React.CSSProperties,
  /** 错误字：取 v3.1 的 `--ic-danger`；字号 `1em`（#739 钉死）。 */
  error: {
    marginTop: 8,
    color: 'var(--dsw-alias-state-error-primary, #e0685f)',
    fontSize: '1em',
    whiteSpace: 'pre-wrap',
  } as React.CSSProperties,
  /** 成功字：取 v3.1 的 `--ic-ok`；字号 `0.96em`（#739 钉死）。 */
  okText: {
    marginTop: 8,
    color: 'var(--dsw-alias-state-success-primary, #4ec9a0)',
    fontSize: '0.96em',
  } as React.CSSProperties,
  /** 行组的容器（六家附加块也拿它当外框；v3.1 没有对应类，故只给一个中性块）。 */
  rows: { display: 'block' } as React.CSSProperties,
  /** `.ic-row`：三列栅格 ＋ `gap:4px 10px` ＋ `padding:7px 0` ＋ 一条 `.ic-line` 下边线。
   *  本件把它落成**换行弹性盒**（见文件头 ③）：标签定宽在第一行，值装不下时整行让位，
   *  动作槽绝对定位贴在行尾（`.ic-row .ic-slot[data-slot^="a:"]` 那一格）。 */
  row: {
    position: 'relative',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px 10px',
    padding: '7px 0',
    borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.06))',
  } as React.CSSProperties,
  /** `.ic-row:last-child{border-bottom:0}`——内联样式没有 `:last-child`，由画它的人明说。 */
  rowLast: {
    position: 'relative',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px 10px',
    padding: '7px 0',
  } as React.CSSProperties,
  /** `.ic-row .ic-k{font-size:11.5px;color:var(--ic-muted)}`；`--ic-kw:118px` 是标签列的定宽。 */
  rowKey: {
    flex: '0 0 auto',
    minWidth: 118,
    fontSize: '0.92em',
    color: 'var(--dsw-alias-label-secondary, #cfd3d6)',
  } as React.CSSProperties,
  /** `.ic-row .ic-v{font-size:11px;min-width:0}`（11px ⇒ `0.88em`）＋ 文件头 ③ 的让位口径：
   *  `flex:1 1 auto` ⇒ 装不下整行让位；`overflow-wrap:anywhere` ⇒ 折下去、零省略号；
   *  `paddingRight` 给行尾那枚按钮（＋列间距）让出宽度——就是 `.ic-row` 第三列那一格。 */
  rowValue: {
    flex: '1 1 auto',
    minWidth: 0,
    paddingRight: 56,
    fontSize: '0.88em',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    lineHeight: 1.5,
  } as React.CSSProperties,
  /** 行尾动作槽（复制／跟随标记）：绝对定位贴行尾，行一换行它仍留在第一行行尾（＝`.is-wide` 那一形）。 */
  rowActs: {
    position: 'absolute',
    right: 0,
    top: 7,
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  } as React.CSSProperties,
  /** `.ic-follow{font-size:11px;color:var(--ic-attn);white-space:nowrap}`（11px ⇒ `0.88em`）。 */
  follow: {
    fontSize: '0.88em',
    color: 'var(--dsw-alias-state-warn-primary, #e0a33e)',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  } as React.CSSProperties,
  /** `.ic-follow::before{content:'↳';opacity:.8}`——内联样式给不出伪元素，画成真的那一个字符。 */
  followMark: { opacity: 0.8 } as React.CSSProperties,
  /** `.ic-master`：母版行那一块盒子（`--ic-sunken` 底 ＋ `border-radius:8px` ＋ `padding:11px 12px`
   *  ＋ `margin-top:11px` ＋ 内高光）。 */
  master: {
    background: 'var(--dsw-alias-bg-layer-3, #353638)',
    border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12))',
    borderRadius: 8,
    padding: '11px 12px',
    marginTop: 11,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
  } as React.CSSProperties,
  /** `.ic-master .ic-lab{font-weight:600;display:flex;align-items:center;gap:7px}`；
   *  字号**不写**（#739 ④：`label` 这一项该继承宿主字号）。 */
  label: { display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600 } as React.CSSProperties,
  /** `.ic-chip{font-size:10.5px;border:1px solid var(--ic-accent);border-radius:999px;padding:0 6px}`（10.5px ⇒ `0.84em`）。 */
  chip: {
    fontSize: '0.84em',
    border: '1px solid var(--dsw-alias-brand-primary, #f9fafb)',
    borderRadius: 999,
    padding: '0 6px',
    color: 'var(--dsw-alias-brand-primary, #f9fafb)',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  /** `.ic-master .ic-hint{color:var(--ic-muted);font-size:11.5px;margin-top:3px;line-height:1.5}`。 */
  hint: {
    color: 'var(--dsw-alias-label-secondary, #cfd3d6)',
    fontSize: '0.92em',
    marginTop: 3,
    lineHeight: 1.5,
  } as React.CSSProperties,
  /** `.ic-master input`：整行宽、`margin-top:7px`、`padding:5px 8px`、`--ic-bg` 底、`--ic-line-strong` 描边、
   *  `border-radius:6px`。字号与字族**不写**（#739 ④／①：`input` 继承宿主）。 */
  input: {
    display: 'block',
    width: '100%',
    marginTop: 7,
    padding: '5px 8px',
    boxSizing: 'border-box',
    background: 'var(--dsw-alias-bg-base, #151517)',
    border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12))',
    borderRadius: 6,
    color: 'var(--dsw-alias-label-primary, #f9fafb)',
  } as React.CSSProperties,
  /** `.ic-master input.is-dirty`：`border:2px solid var(--ic-attn)` ＋ `padding:4px 7px`
   *  ＋ `box-shadow:0 0 0 3px <琥珀 22%>`；2px 描边与 5→4 的内边距对消，宽高不变
   *  （审查「站得住」第 7 条）。 */
  inputDirty: {
    display: 'block',
    width: '100%',
    marginTop: 7,
    padding: '4px 7px',
    boxSizing: 'border-box',
    background: 'var(--dsw-alias-bg-base, #151517)',
    border: '2px solid var(--dsw-alias-state-warn-primary, #e0a33e)',
    borderRadius: 6,
    color: 'var(--dsw-alias-label-primary, #f9fafb)',
    boxShadow: '0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-warn-primary, #e0a33e) 22%, transparent)',
  } as React.CSSProperties,
  /** 布尔档那枚方框（v3.1 的母版行只有文本框，这一格按输入框的同一套外边距对齐）。 */
  checkbox: { marginTop: 7 } as React.CSSProperties,
  /** `.ic-acts{display:flex;gap:5px;margin-top:7px;flex-wrap:wrap;align-items:center}`（母版行的按钮行）。 */
  acts: { display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' } as React.CSSProperties,
  /** `.ic-btn.is-mini{font-size:11px;padding:2px 7px;color:var(--ic-muted)}`——`btnPick` 是锁钉死的那一格，
   *  字号**不写**（#739 ④：该继承宿主字号），形状照 v3.1。 */
  btnPick: {
    padding: '2px 7px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12))',
    background: 'transparent',
    color: 'var(--dsw-alias-label-secondary, #cfd3d6)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  /** `.ic-invalid{margin-top:7px;padding:7px 9px;border-radius:6px;font-size:11.5px;line-height:1.5;
   *  background:color-mix(in srgb, var(--ic-attn) 16%, transparent);border:1px solid var(--ic-attn)}`。 */
  invalid: {
    marginTop: 7,
    padding: '7px 9px',
    borderRadius: 6,
    fontSize: '0.92em',
    lineHeight: 1.5,
    background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary, #e0a33e) 16%, transparent)',
    border: '1px solid var(--dsw-alias-state-warn-primary, #e0a33e)',
    color: 'var(--dsw-alias-label-primary, #f9fafb)',
  } as React.CSSProperties,
  /** `.ic-group{margin-top:14px}`（高级组默认收起）。 */
  advanced: { marginTop: 14 } as React.CSSProperties,
  /** `.ic-group > .ic-ghead{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;
   *  font-weight:600;padding:2px 0}`——字号**不写**（#739 ④：`summary` 该继承宿主字号）。 */
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    listStyle: 'none',
    fontWeight: 600,
    padding: '2px 0',
  } as React.CSSProperties,
  /** `.ic-ghead::before{content:'›';color:var(--ic-muted)}`——画成真的那一个字符（内联样式给不出伪元素）。 */
  groupMark: { color: 'var(--dsw-alias-label-secondary, #cfd3d6)' } as React.CSSProperties,
  /** `.ic-ghead .ic-gnote{color:var(--ic-faint);font-weight:400;font-size:11.5px}`（11.5px ⇒ `0.92em`）。 */
  groupNote: {
    color: 'var(--dsw-alias-label-tertiary, #adb2b8)',
    fontWeight: 400,
    fontSize: '0.92em',
  } as React.CSSProperties,
  /** `.ic-group > .ic-gbody{margin-top:9px;padding:11px 12px;background:var(--ic-sunken);
   *  border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}`。 */
  groupBody: {
    marginTop: 9,
    padding: '11px 12px',
    background: 'var(--dsw-alias-bg-layer-3, #353638)',
    border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12))',
    borderRadius: 8,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
  } as React.CSSProperties,
  /** `.ic-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px;padding-top:12px;
   *  border-top:1px solid var(--ic-line)}` ＋ **贴下沿吸住**（v3.1 的 `.ic-attnbar.is-sticky` 是它唯一的
   *  吸底口径：`position:sticky;bottom:6px;z-index:3`；本票按票面「贴下沿」取 0，好让底栏与下沿齐平）。 */
  bar: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
    paddingTop: 12,
    borderTop: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.06))',
    position: 'sticky',
    bottom: 0,
    zIndex: 3,
    background: 'var(--dsw-alias-bg-layer-1, #232324)',
  } as React.CSSProperties,
  /** `.ic-bar .ic-note{margin-left:auto;color:var(--ic-faint);font-size:11.5px}`（就绪态那半句）。 */
  barNote: {
    marginLeft: 'auto',
    color: 'var(--dsw-alias-label-tertiary, #adb2b8)',
    fontSize: '0.92em',
  } as React.CSSProperties,
  /** 有改动时底栏那半句（黄字，粘在按钮组左侧）。 */
  saveMsg: {
    marginLeft: 'auto',
    color: 'var(--dsw-alias-state-warn-primary, #e0a33e)',
    fontSize: '0.92em',
  } as React.CSSProperties,
  /** `.ic-btn{font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid var(--ic-line-strong);
   *  background:transparent;color:var(--ic-text)}`——字号**不写**（#739 ④）。 */
  btn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12))',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, #f9fafb)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  /** `.ic-btn.is-primary{background:var(--ic-accent);border-color:var(--ic-accent);color:var(--ic-accent-ink);
   *  font-weight:500}`——`--ic-accent` 取 `--dsw-alias-brand-primary`，前景取 `label-primary-foreground`。 */
  btnPrimary: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-brand-primary, #f9fafb)',
    background: 'var(--dsw-alias-brand-primary, #f9fafb)',
    color: 'var(--dsw-alias-label-primary-foreground, #0f1115)',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  /** 附加块（版本行／状态行）那份字面：`--ic-faint` ＋ `0.92em`（#739 ③ 钉死这一格）。 */
  version: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px dashed var(--dsw-alias-border-l1, rgba(255,255,255,.06))',
    color: 'var(--dsw-alias-label-tertiary, #adb2b8)',
    fontSize: '0.92em',
  } as React.CSSProperties,
  /** `.ic-badge{font-size:11px;line-height:1;padding:4px 9px;border-radius:999px;white-space:nowrap;
   *  display:inline-flex;align-items:center;gap:6px;border:1px solid transparent}`（11px ⇒ `0.88em`）。 */
  badge: {
    fontSize: '0.88em',
    lineHeight: 1,
    padding: '4px 9px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid transparent',
  } as React.CSSProperties,
  /** `.ic-badge .ic-bd{width:6px;height:6px;border-radius:50%;background:currentColor}`。 */
  badgeDot: { width: 6, height: 6, borderRadius: '50%', background: 'currentColor' } as React.CSSProperties,
  /** `.ic-spin{width:11px;height:11px;border-radius:50%;border:1.5px solid rgba(0,0,0,.25);
   *  border-top-color:currentColor}`——旋转那半要 `@keyframes`（内联样式给不出），故只画环。 */
  badgeSpinner: {
    width: 11,
    height: 11,
    borderRadius: '50%',
    border: '1.5px solid rgba(0,0,0,.25)',
    borderTopColor: 'currentColor',
    display: 'inline-block',
  } as React.CSSProperties,
  /** `.ic-badge.is-dirty`：`--ic-attn` 实底 ＋ `--ic-attn-ink` 深字（那 3:1 是设计专门解过的对比度）。 */
  badgeDirty: {
    color: '#241703',
    background: 'var(--dsw-alias-state-warn-primary, #e0a33e)',
    borderColor: 'var(--dsw-alias-state-warn-primary, #e0a33e)',
    fontWeight: 600,
  } as React.CSSProperties,
  /** `.ic-badge.is-busy`：与 dirty 同色（写的时候还在那一档上）。 */
  badgeBusy: {
    color: '#241703',
    background: 'var(--dsw-alias-state-warn-primary, #e0a33e)',
    borderColor: 'var(--dsw-alias-state-warn-primary, #e0a33e)',
    fontWeight: 600,
  } as React.CSSProperties,
  /** `.ic-badge.is-ok{color:var(--ic-ok);border-color:var(--ic-ok);background:color-mix(in srgb, var(--ic-ok) 14%, transparent)}`。 */
  badgeOk: {
    color: 'var(--dsw-alias-state-success-primary, #4ec9a0)',
    borderColor: 'var(--dsw-alias-state-success-primary, #4ec9a0)',
    background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary, #4ec9a0) 14%, transparent)',
  } as React.CSSProperties,
  /** `.ic-badge.is-bad{color:var(--ic-danger-ink);background:var(--ic-danger);border-color:var(--ic-danger)}`。 */
  badgeBad: {
    color: '#fff5f4',
    background: 'var(--dsw-alias-state-error-primary, #e0685f)',
    borderColor: 'var(--dsw-alias-state-error-primary, #e0685f)',
    fontWeight: 600,
  } as React.CSSProperties,
};

/** 样式表的形状（附加块照面板的视觉写，不各写一套内联样式）。 */
export type ConfigStyles = typeof S;

/** 附加块拿到的那两格。 */
export interface PanelParts {
  /** 面板自己的样式表。 */
  readonly styles: ConfigStyles;
  /** 配置面整面回执；还没读到（读取中／读取失败）时为 null。 */
  readonly reply: ConfigSurfaceReply | null;
}

/** 一行点「复制」之后就地显示成哪一档字面。 */
export type CopyState = 'idle' | 'done' | 'failed';

/** 复制那一枚按钮的字面（定稿 v3 第三条：就地变，不弹提示）。 */
export function copyLabelOf(state: CopyState | undefined): string {
  if (state === 'done') return '已复制';
  if (state === 'failed') return '复制失败';
  return '复制';
}

/** 面板状态徽标那七档（v3.1 的 `SKILL_STATES` 与 `badgeHTML` 逐档对应）。
 *
 * 七档的落点各不相同：`readFailed` 不画徽标——它把整面换成「一整屏错误 ＋ 恰两枚按钮」那一支；
 * `ready`（就绪）也不画（v3.1 的 `badgeHTML` 在就绪态回空串）；其余五档画在卡片标题行右端。 */
export type PanelBadge = 'ready' | 'dirty' | 'busy' | 'saved' | 'invalid' | 'writeFailed' | 'readFailed';

/** 算徽标要看的几格事实（全是面板已经拿到的东西，不另取数）。 */
export interface BadgeFacts {
  readonly readFailed: boolean;
  readonly busy: boolean;
  readonly writeFailed: boolean;
  /** 技能侧报出「配置里有值用不了」这一事实（#915 第二步落地前恒为 false，见票面「遗留出口」）。 */
  readonly invalid: boolean;
  readonly dirtyCount: number;
  readonly saved: boolean;
}

/** 状态 → 徽标那一档（v3.1 `paint()` 里的先后次序：读取失败／写入中／写入失败／值非法／有改动／已保存／就绪）。 */
export function panelBadgeOf(facts: BadgeFacts): PanelBadge {
  if (facts.readFailed) return 'readFailed';
  if (facts.busy) return 'busy';
  if (facts.writeFailed) return 'writeFailed';
  if (facts.invalid) return 'invalid';
  if (facts.dirtyCount > 0) return 'dirty';
  if (facts.saved) return 'saved';
  return 'ready';
}

/** 徽标那一档画的字（v3.1 `badgeHTML` 的字面，只把「已保存 · 刚刚」的演示时刻换成档名）。 */
export function badgeTextOf(kind: PanelBadge, dirtyCount: number): string {
  if (kind === 'dirty') return `${dirtyCount} 项未保存`;
  if (kind === 'busy') return '正在写入';
  if (kind === 'saved') return '已保存';
  if (kind === 'invalid') return '配置里有值用不了';
  if (kind === 'writeFailed') return '写入失败';
  return '';
}

/** 徽标那一档的底色（v3.1 的四条 `.ic-badge.is-*`）。 */
function badgeStyleOf(kind: PanelBadge): React.CSSProperties {
  if (kind === 'dirty' || kind === 'invalid') return { ...S.badge, ...S.badgeDirty };
  if (kind === 'busy') return { ...S.badge, ...S.badgeBusy };
  if (kind === 'saved') return { ...S.badge, ...S.badgeOk };
  if (kind === 'writeFailed') return { ...S.badge, ...S.badgeBad };
  return S.badge;
}

/** 画卡片标题行右端那枚状态徽标（就绪态与读取失败那一支不画）。 */
export function PanelBadgeView(props: { readonly kind: PanelBadge; readonly dirtyCount: number }): React.ReactElement | null {
  const text = badgeTextOf(props.kind, props.dirtyCount);
  if (text === '') return null;
  return React.createElement(
    'span',
    { style: badgeStyleOf(props.kind) },
    props.kind === 'busy'
      ? React.createElement('span', { style: S.badgeSpinner })
      : React.createElement('span', { style: S.badgeDot }),
    text,
  );
}

export interface RowProps {
  readonly item: ConfigItem;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (key: string, next: string) => void;
  /** 目录行才有：入口三态（`native`／`browse`／`none`）。 */
  readonly browser?: DirectoryRowEntry | null | undefined;
  /** 脏行：这一行与刚读到的整面不一致时画标记。 */
  readonly dirty?: boolean;
  /** 跟随行：只读派生行在触发键变脏时给「将跟随更新」态。 */
  readonly follow?: boolean;
  /** 点这一行的「复制」：把该行的值文本交出去。
   *  定稿 v3 要求每行一枚，所以按钮**一律画**；这一格缺席时按钮 `disabled` 而不是点了就炸
   *  （面板那边永远给这一格，缺席只可能是别的调用点少交了东西）。 */
  readonly onCopy?: ((key: string, text: string) => void) | undefined;
  /** 复制那一枚按钮当刻的字面（不给＝「复制」）。 */
  readonly copyState?: CopyState | undefined;
  /** 这一行是所在那一组的最后一行（v3.1 的 `.ic-row:last-child{border-bottom:0}`；
   *  内联样式没有 `:last-child`，行序是客户端常量，故由画整面的人算好交进来）。 */
  readonly last?: boolean | undefined;
}

/** 一行怎么画（照 v3.1 的两套行模板）：
 *
 * **只读行**（`.ic-row`）＝标签—值同行、值装不下整行让位、行尾一枚「复制」——**不画输入框**
 * （值来自技能侧解析，页面上本来就不给改），也不画那行说明（v3.1 的 `rowShell` 里没有它）。
 * **可改行**（`.ic-master`）＝标签 ＋「可改」小徽标 ＋ 说明 ＋ 整行输入框 ＋ 按钮行。
 *
 * 目录档＝文本框 ＋ 一枚唤起目录选择的按钮；入口三态是 `none`（命名空间拿不到、或这条路已被拒）
 * **就不画按钮**，文本框照旧——那是该缝自己的契约（供不了就收起入口，不是失败）。
 * 只读行：目录入口**一枚都不画**（定稿 v3 ①）。 */
export function Row(props: RowProps): React.ReactElement {
  const { item } = props;
  const readonly = item.readonly === true;
  const disabled = props.disabled || readonly;
  const copy = React.createElement(
    'button',
    {
      style: S.btnPick,
      type: 'button',
      disabled: props.onCopy === undefined,
      onClick: () => props.onCopy?.(item.key, props.value),
    },
    copyLabelOf(props.copyState),
  );
  const follow =
    props.follow === true
      ? React.createElement(
          'span',
          { style: S.follow },
          React.createElement('span', { style: S.followMark }, '↳'),
          '将跟随更新',
        )
      : null;

  if (readonly) {
    return React.createElement(
      'div',
      { style: props.last === true ? S.rowLast : S.row },
      React.createElement('span', { style: S.rowKey }, item.title),
      React.createElement('span', { style: S.rowValue }, props.value),
      React.createElement('span', { style: S.rowActs }, follow, copy),
    );
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(item.key, e.target.value);
  const control =
    item.control === 'switch'
      ? React.createElement('input', {
          type: 'checkbox',
          style: S.checkbox,
          checked: props.value === 'true',
          disabled,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            props.onChange(item.key, e.target.checked ? 'true' : 'false'),
        })
      : React.createElement('input', {
          style: props.dirty === true ? S.inputDirty : S.input,
          type: item.control === 'number' ? 'number' : 'text',
          value: props.value,
          disabled,
          spellCheck: false,
          onChange,
        });
  /** 目录入口：只读行不画（定稿 v3 ①），供不了（`none`／缺席）也不画。 */
  const entry = props.browser ?? null;
  const browse =
    item.control === 'directory' && entry !== null && entry.mode !== 'none'
      ? React.createElement(
          'button',
          {
            style: S.btnPick,
            type: 'button',
            disabled,
            // 回这枚 Promise 是有意的：React 不看 onClick 的返回值，而用例能直接 await 它。
            onClick: () => entry.onOpen(item.key),
          },
          '浏览文件夹',
        )
      : null;
  return React.createElement(
    'div',
    { style: S.master },
    React.createElement(
      'div',
      { style: S.label },
      item.title,
      React.createElement('span', { style: S.chip }, '可改'),
    ),
    React.createElement('div', { style: S.hint }, item.hint),
    control,
    React.createElement('div', { style: S.acts }, browse, copy),
  );
}

/** 面板状态：读取中／就绪／整面读取失败。 */
export type PanelState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly surface: ConfigSurfaceReply }
  | { readonly kind: 'failed'; readonly message: string };

/** 整面的全部输入：状态 ＋ 行表 ＋ 各档回调（本件只读它、只回调）。 */
export interface PanelBodyProps {
  /** 卡片标题（各家自己的产品名）。 */
  readonly title: string | undefined;
  readonly items: readonly ConfigItem[];
  readonly state: PanelState;
  readonly draft: Readonly<Record<string, string>>;
  readonly busy: boolean;
  /** 成功提示（已保存／已重置）。 */
  readonly notice: string | null;
  /** 写入失败那一支：落点在底栏紧下面（与「就地失败」分开摆）。 */
  readonly writeError: string | null;
  /** 就地失败那一支（选目录那类）。 */
  readonly error: string | null;
  readonly picking: boolean;
  readonly browseRow: DirectoryRowBrowser | null;
  readonly rowEntry: DirectoryRowEntry | null;
  readonly dirtyKeys: readonly string[];
  readonly followKeys: readonly string[];
  readonly copy: { readonly key: string; readonly ok: boolean } | null;
  /** 技能侧报出的「配置里有值用不了」那一格事实（#915 第二步落地前缺席＝不亮那一档）。 */
  readonly invalid?: boolean | undefined;
  readonly onCopy: (key: string, text: string) => void;
  readonly onChange: (key: string, next: string) => void;
  readonly onSave: () => void;
  readonly onReset: () => void;
  readonly onRetry: () => void;
  /** 自家附加块（版本行／状态行）：给了就画在面板主体之后、动作条之前。 */
  readonly extra?: ((parts: PanelParts) => React.ReactNode) | undefined;
}

/** 应用内浏览器对话框的文案（面板自带，逐条对应图上那几个位置）。 */
const BROWSER_LABELS = {
  title: '选择文件夹',
  close: '关闭',
  up: '上一级',
  pathPlaceholder: '直接填绝对路径，回车即进入',
  go: '转到',
  showHidden: (n: number) => '显示隐藏目录（' + n + '）',
  empty: '这个目录里没有子目录。',
  loading: '正在读取',
  newFolder: '新建文件夹',
  createConfirm: '创建',
  createCancel: '取消',
  select: '选',
  selected: '已选',
  open: '选定这个目录',
  cancel: '取消',
  willPick: '将选定：',
} as const;

/** 画整面（四支控件、三支错误落位、底栏、附加块槽都在这里）。 */
export function PanelBody(props: PanelBodyProps): React.ReactElement {
  const { state, title } = props;
  const surface = state.kind === 'ready' ? state.surface : null;
  const headText = title === undefined ? '配置' : `${title} · 配置`;
  const headDataDir = surface === null ? '' : surface.resolved?.['dbDir'] ?? surface.dataDir;
  const ready = state.kind === 'ready';
  const dirtyCount = ready ? props.dirtyKeys.length : 0;
  const badge = panelBadgeOf({
    readFailed: state.kind === 'failed',
    busy: props.busy,
    writeFailed: props.writeError !== null,
    invalid: props.invalid === true,
    dirtyCount,
    saved: props.notice !== null,
  });
  const head = React.createElement(
    'div',
    { style: S.head },
    React.createElement('div', { style: S.title }, headText),
    React.createElement(PanelBadgeView, { kind: badge, dirtyCount }),
  );
  const fileLines =
    surface === null
      ? null
      : React.createElement(
          'div',
          { style: S.fileWrap },
          React.createElement(
            'div',
            { style: S.info },
            React.createElement('b', { style: S.fileLabel }, '配置文件'),
            surface.path,
          ),
          React.createElement(
            'div',
            { style: S.info },
            React.createElement('b', { style: S.fileLabel }, '数据目录'),
            headDataDir,
          ),
          surface.created ? React.createElement('div', { style: S.muted }, '（配置文件刚按默认值生成）') : null,
        );

  const parts: PanelParts = { styles: S, reply: surface };
  const extra = props.extra === undefined ? null : props.extra(parts);

  if (state.kind === 'failed') {
    return React.createElement(
      'div',
      { style: S.card },
      head,
      fileLines,
      React.createElement('div', { style: S.error }, state.message),
      extra,
      React.createElement(
        'div',
        { style: S.bar },
        React.createElement('button', { style: S.btn, type: 'button', onClick: props.onRetry }, '重试'),
        React.createElement('button', { style: S.btn, type: 'button', onClick: props.onReset }, '重置为默认'),
      ),
    );
  }

  const common = props.items.filter((item) => item.tier === 'common');
  const advanced = props.items.filter((item) => item.tier === 'advanced');
  /** 还没读到整面（`loading`）时**框架照画**：行表与控件形状是客户端常量，不必等任何回执。
   *  值先空着、控件与三枚底栏键一律不可用；回执到了由 `ready` 那一支把值填上（见 `config-panel.ts`）。 */
  const frozen = props.busy || !ready;
  const renderRow = (item: ConfigItem, last: boolean) =>
    React.createElement(Row, {
      key: item.key,
      item,
      value: props.draft[item.key] ?? '',
      disabled: frozen,
      onChange: props.onChange,
      browser: props.rowEntry,
      dirty: ready && props.dirtyKeys.includes(item.key),
      follow: ready && props.followKeys.includes(item.key),
      onCopy: ready ? props.onCopy : undefined,
      copyState: props.copy !== null && props.copy.key === item.key ? (props.copy.ok ? 'done' : 'failed') : 'idle',
      last,
    });
  /** 每组最后那一行才免掉下边线（`.ic-row:last-child`）；母版行自己不带线，不必管。 */
  const lastIndexOf = (list: readonly ConfigItem[]) => {
    for (let i = list.length - 1; i >= 0; i -= 1) if (list[i].readonly === true) return i;
    return -1;
  };
  const commonLast = lastIndexOf(common);
  const advancedLast = lastIndexOf(advanced);

  const dirty = ready && dirtyCount > 0;
  return React.createElement(
    'div',
    { style: S.card },
    head,
    fileLines,
    ready ? null : React.createElement('div', { style: S.muted }, '配置读取中'),
    React.createElement(
      'div',
      { style: S.rows },
      common.map((item, index) => renderRow(item, index === commonLast)),
    ),
    advanced.length === 0
      ? null
      : React.createElement(
          'details',
          { style: S.advanced },
          React.createElement(
            'summary',
            { style: S.summary },
            React.createElement('span', { style: S.groupMark }, '›'),
            ADVANCED_GROUP_TITLE,
            React.createElement('span', { style: S.groupNote }, ADVANCED_GROUP_NOTE),
          ),
          React.createElement(
            'div',
            { style: S.groupBody },
            advanced.map((item, index) => renderRow(item, index === advancedLast)),
          ),
        ),
    extra,
    React.createElement(
      'div',
      { style: S.bar },
      React.createElement(
        'button',
        { style: dirty ? S.btnPrimary : S.btn, type: 'button', disabled: frozen || !dirty, onClick: props.onSave },
        props.busy ? '处理中' : dirty ? `保存（${dirtyCount} 项未保存）` : '保存',
      ),
      React.createElement('button', { style: S.btn, type: 'button', disabled: frozen, onClick: props.onReset }, '重置为默认'),
      React.createElement('button', { style: S.btn, type: 'button', disabled: frozen, onClick: props.onRetry }, '重新读取'),
      // 那半句话是**最后一个孩子**：v3.1 的 `.ic-bar .ic-note{margin-left:auto}` 靠它把说明顶到行尾，
      // 三枚按钮留在左边（顺序反了就会成「说明靠左、按钮靠右」，与真源相反）。
      dirty
        ? React.createElement('div', { style: S.saveMsg }, `浏览改动后请点保存（${dirtyCount} 项未保存），保存后跟随项自动更新`)
        : ready
          ? React.createElement('div', { style: S.barNote }, '没有未保存的改动')
          : null,
    ),
    props.picking ? React.createElement('div', { style: S.muted }, '已唤起系统文件夹对话框：选中后自动填上，取消则不动。') : null,
    props.browseRow !== null
      ? React.createElement(DirectoryBrowserFromRow, { open: true, row: props.browseRow, labels: BROWSER_LABELS })
      : null,
    props.writeError !== null
      ? React.createElement('div', { style: S.error, role: 'alert' }, props.writeError)
      : null,
    props.error !== null ? React.createElement('div', { style: S.error }, props.error) : null,
    props.notice !== null ? React.createElement('div', { style: S.okText }, props.notice) : null,
  );
}
