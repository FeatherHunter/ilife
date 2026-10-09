/** dsh-life-pack client 适配器（六边形：browser 侧；爱生活单卡方案）。
 *
 * 真实 DSH 契约（出处见 docs/agents/dsh-client-contract.md §5/§11）：
 * - 本文件经 tsdown 打成 loader 工厂包（browser/CJS + 注册包裹），classic 执行
 *   只注册，副作用全在 factory 内；传递闭包禁 node 内建与 ESM 语法（回路
 *   test/client-bundle-48.test.mjs 看门）。
 * - inject 短名 ['slots','connection']：本包现在有 RPC（装与更新的能力由宿主半提供，
 *   电话名与轮询间隔由宿主转交，面板不写死），读了 ctx.connection 就必须声明 'connection'（#48 血例）。
 * - 爱生活页签条走 slot 驱动（settings-plugins 先例，禁纯 useState 手画 tab）：
 *   section 声明 children 爱生活页签槽，各技能往里注册自家技能设置页；
 *   tab 行从 ledger 投影（entries+getVersion+subscribe），面板用 props.renderSlot
 *   按 `{only}` 投影（一次只挂载一个）+ visited 缓存；ledger 无某技能=缺席，
 *   显示推荐安装只读文本（不返空冒充）。
 * - 组件 React.createElement 手写（禁 JSX），无数据轮询、无 document/window/process。
 * - 面板外壳两处（票 #679）：标题行右上角两个入口（星／气泡，悬停出说明文字，
 *   窄窗口折到标题下方）；页签面板之后是底部「作者其他插件」引流卡（四行，点开新窗口）。
 *   文案与网址都取自 nav.ts 的两张静态表，本文件只画不算。
 */

import * as React from 'react';
import { MANAGER_PLUGIN, MANAGER_TABS, MANUAL_ENTRY, MORE_PLUGINS, PANEL_LINKS, recoFor } from './nav.js';
import { clampSpread, planManual, spreadOfPage } from './manual-plan.js';
import type { ManualScene, ManualSheet } from './manual-plan.js';
import { SCENES, manualContentCss, renderManualPage } from './manual-content.js';
import type { ManagerTab } from './nav.js';
import { CONFIG_TAB_SLOT } from './update-contract.js';
import { managerCallAdapter, mountLifeBatchEntry } from './update-dialog.js';
import { tabInteractionCss } from './config-panel-view.js';
import { LIQUID_BASE_MS, LIQUID_DIST_FACTOR, LIQUID_EASE, LIQUID_GHOST_MS, LIQUID_MAX_MS, LIQUID_MIN_MS, LIQUID_STRETCH_X, LIQUID_STRETCH_Y } from './config-panel-contract.js';
import { summaryErrorOf, useHealthPanel } from './health-panel.js';
import { HealthSummaryLine, HealthTable, STATUS_TEXT, TAB_DOT, TAB_NOTE_STYLE, lightsOf, tabDotColor, tabNote } from './health-view.js';
import { HEALTH_ENDPOINT } from './health-contract.js';
import type {
  ClientCtx,
  ConfigTabRow,
  LifePackSectionProps,
  RpcCallFace,
  SlotLedgerEntry,
} from './dsh-ctx.js';

export const inject = ['slots', 'connection'];

/** 爱生活页签槽名：定义在 `update-contract.ts`（宿主判「已装产物有没有注册代码」也用这个名字，一处定义）。 */
export { CONFIG_TAB_SLOT } from './update-contract.js';

/** 共用件「目录浏览器」从包门转出（票 #744）：六个单品插件的设置页要用的就是这两样——
 *  「开图接线 ＋ 入口三态判定」（纯逻辑，`./directory-browser` 子路径）与
 *  「对话框组件」（`./directory-browser-ui` 子路径，吃 React）。
 *
 *  六家的 client 束**不能**从本条 `./client` 取：这一条是 loader 工厂包
 *  （`window.__ModuleLoader__.load(...)` 的注册壳），`require` 拿到的是空 exports。
 *  所以对外要用的是那两个普通子路径；这里只是同源转出，供本包内部与用例使用。 */
export { DirectoryBrowserFromRow } from './directory-browser-ui.js';
export type { DirectoryBrowserLabels, DirectoryBrowserProps } from './directory-browser-ui.js';
export { createBrowseController, createDirectoryRowBrowser, rowsOf, canGoUp, targetOf, entryPath } from './directory-browser-state.js';
export type { BrowseController, BrowseState, DirectoryRowBrowser } from './directory-browser-state.js';
export { pickerModeOf, readPickAnswer } from './directory-browser-contract.js';
export type { DirectoryBrowseFace, DirectoryListing, PickOutcome, RootKind, RootRow } from './directory-browser-contract.js';
export { createRootsSource, readRootsAnswer } from './directory-browser-roots.js';

/** 包名 → 本家那条客户端通道（票 #735）。取值面是导航表那份镜像，不再从页签槽账本的自定义选项里读：
 *  装机槽位面不透传自定义键，读了恒是空串（详见 `nav.ts` 上 `ManagerTab.channel` 的注释）。 */
const CHANNEL_BY_PLUGIN = new Map(MANAGER_TABS.map((tab) => [tab.plugin, tab.channel]));

/** 总管视觉（内联 style；颜色走 DSH 主题别名，深浅主题自适应，写死值只做回退；与技能面板同语言）。 */
const S = {
  headRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    margin: '2px 0 8px',
  } as React.CSSProperties,
  head: { fontSize: 15, fontWeight: 700, flex: '0 0 auto', color: 'var(--dsw-alias-label-primary, inherit)' } as React.CSSProperties,
  headActions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
    flex: '0 0 auto',
  } as React.CSSProperties,
  iconLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 6,
    border: '1px solid transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    textDecoration: 'none',
    fontSize: 14,
    lineHeight: 1,
  } as React.CSSProperties,
  /** #1237：甲腰封书入口（书的样子逐字取定版甲：红封＋书脊＋米色腰封＋名牌）。 */
  manualWrap: { position: 'relative', display: 'inline-flex', flex: '0 0 auto' } as React.CSSProperties,
  manualBook: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 10px 10px',
  } as React.CSSProperties,
  manualStage: { position: 'relative', width: 76, height: 104, filter: 'drop-shadow(0 10px 10px #00000088)' } as React.CSSProperties,
  manualCover: {
    display: 'block',
    position: 'relative',
    width: 72,
    height: 100,
    borderRadius: '5px 8px 8px 5px',
    background: 'linear-gradient(135deg,#9c2f2f,#5f1616 65%,#3a0d0d)',
    border: '1px solid #d9ab3c',
    boxShadow: '5px 7px 12px #0009',
  } as React.CSSProperties,
  manualSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 12,
    background: 'linear-gradient(90deg,#320b0b,#571414)',
    borderRadius: '5px 0 0 5px',
  } as React.CSSProperties,
  manualBand: {
    position: 'absolute',
    left: -4,
    right: -4,
    top: 34,
    height: 26,
    background: '#ece0c2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#5c1010',
    fontSize: 12,
    letterSpacing: '.2em',
    boxShadow: '0 2px 4px #00000066',
  } as React.CSSProperties,
  manualPlate: {
    marginTop: 14,
    background: 'linear-gradient(#4a1f1a,#2a0f0c)',
    border: '1px solid #8a6a15',
    borderRadius: 4,
    color: '#e8c96a',
    fontSize: 13,
    letterSpacing: '.3em',
    textIndent: '.3em',
    padding: '4px 18px',
  } as React.CSSProperties,
  /** #1240：书式弹出层＝**原型那一页**（页面底色铺满 ＋ 四周 20px 页边），书与铜扣直接铺在底色上。
   *
   * 原型里开书就是「把 `.scroll`＋`.deck` 显出来」：没有白卡、没有标题条、也没有框住书的第二层壳
   * （`proto-manual-4scenes.html` L183-197）。纸宽口径只在这里定义一次（`--paper-w`），
   * 壳与铜扣都只读它——与原型 `:root{--paper-w:…}` 同一处口径。 */
  manualShell: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    boxSizing: 'border-box',
    overflowY: 'auto',
    background: '#15130f',
    padding: 20,
    // 字体口径照抄原型 `body{font-family:system-ui,'Microsoft YaHei',sans-serif}`：
    // 换一套字，同一段话的断行位置就变，逐像素对照必然对不上。
    fontFamily: "system-ui,'Microsoft YaHei',sans-serif",
    '--paper-w': 'min(1080px, calc(100vw - 40px - 2.25em))',
  } as React.CSSProperties,
  /** 关闭钮（#1237 的关闭位不改）：钉在页面右上角，不占书的位置、不进书框。 */
  manualClose: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '1px solid #3a352c',
    background: '#1c1913cc',
    color: '#cfc4ad',
    cursor: 'pointer',
    fontSize: 15,
    lineHeight: 1,
  } as React.CSSProperties,
  /** 书的舞台层：书壳与铜扣行都铺在这一层上（原型里是 `body` 上并列的 `.scroll` 与 `.deck`）。 */
  manualStageLayer: { position: 'relative' } as React.CSSProperties,
  /** 书壳（`proto-manual-4scenes.html` 的 `.scroll`）。红框金边＋米纸＋零宽脊鎏金线＋签。
   *
   * 三条口径逐条照抄原型：壳宽＝纸宽（`--paper-w`）＋两侧 1.125em 内缩（框贴壳、纸缩在框里），
   * 顶部让出标签高度的 `margin-top`，纸铺满壳的内缩区（纸自己不带内衬）。 */
  manualRoot: {
    position: 'relative',
    maxWidth: 'var(--paper-w)',
    padding: '1.125em',
    margin: 'calc(var(--paper-w) * .054 + 16px) auto 0',
  } as React.CSSProperties,
  manualFrame: {
    position: 'absolute',
    inset: 0,
    borderRadius: '1em',
    background: 'linear-gradient(180deg,#c63d2a,#a32216)',
    border: '3px double #f5d97a',
    boxShadow: 'inset 0 2px 0 #ffffff33,inset 0 -3px 6px #0000004d,0 0 0 5px #2a140c,0 0 0 6px #c9a22755,0 18px 40px #000000aa',
    filter: 'url(#ilife-rough-frame)',
  } as React.CSSProperties,
  manualWeave: {
    position: 'absolute',
    inset: 0,
    borderRadius: '1em',
    pointerEvents: 'none',
    opacity: .35,
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Cfilter id=\'f\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.5\' numOctaves=\'3\'/%3E%3CfeColorMatrix type=\'matrix\' values=\'0 0 0 0 0.2 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 0.25 0\'/%3E%3C/filter%3E%3Crect width=\'120\' height=\'120\' filter=\'url(%23f)\'/%3E%3C/svg%3E")',
  } as React.CSSProperties,
  /** 纸面：原型冻结版把纸口改成「铺满、无内衬、无高光斑、无内阴影」（`.paper{margin:0;padding:0;box-shadow:none;background-image:none}`）。 */
  manualPaper: {
    position: 'relative',
    borderRadius: '.25em',
    background: '#ece0c2',
  } as React.CSSProperties,
  manualFiber: {
    position: 'absolute',
    inset: 0,
    borderRadius: '.25em',
    pointerEvents: 'none',
    opacity: .8,
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'p\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\'/%3E%3CfeColorMatrix type=\'matrix\' values=\'0 0 0 0 0.45 0 0 0 0 0.36 0 0 0 0 0.22 0 0 0 0.05 0\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23p)\'/%3E%3C/svg%3E")',
  } as React.CSSProperties,
  manualVolume: {
    display: 'flex',
    position: 'relative',
    perspective: '6000px',
    minHeight: 'min(calc(var(--paper-w) / 1.41421356), 80vh)',
  } as React.CSSProperties,
  /** 页根字号＝纸宽的 1.5%（原型 `.page{font-size:calc(var(--paper-w)*.015)}`）：页内一切 `em` 尺寸都由它派生。 */
  manualPage: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'visible',
    fontSize: 'calc(var(--paper-w) * .015)',
  } as React.CSSProperties,
  manualPageL: { position: 'relative', paddingRight: 0 } as React.CSSProperties,
  manualPageR: { position: 'relative', paddingLeft: 0, transformOrigin: 'left center' } as React.CSSProperties,
  manualSpineSlot: { width: 0, position: 'relative', flex: 'none' } as React.CSSProperties,
  manualSpineLine: {
    position: 'absolute',
    left: -1,
    top: 0,
    bottom: 0,
    width: 2,
    margin: 0,
    backgroundImage: 'linear-gradient(to bottom,#f8e7ae,#d9ab3c),radial-gradient(circle .6px at 50% 50%,rgba(232,201,106,.75) 40%,rgba(232,201,106,0) 42%),radial-gradient(circle .5px at 50% 50%,rgba(248,231,174,.65) 40%,rgba(248,231,174,0) 42%)',
    backgroundSize: '1px 100%,2px 9px,2px 13px',
    backgroundPosition: 'center top,center top,center 4px',
    backgroundRepeat: 'no-repeat,repeat,repeat',
  } as React.CSSProperties,
  manualTabLayer: { position: 'absolute', left: 0, right: 0, top: 0, height: 0, zIndex: 8, pointerEvents: 'none' } as React.CSSProperties,
  /** 铜扣行：在**红框之外**的页面底色上居中（原型 `.deck` 是 `.scroll` 的兄弟节点），间距随纸宽。 */
  manualDeck: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'max(8px, calc(var(--paper-w) * .009))',
    margin: '.5em auto 0',
    maxWidth: 'var(--paper-w)',
    position: 'relative',
  } as React.CSSProperties,
  manualBrass: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'calc(var(--paper-w) * .005)',
    cursor: 'pointer',
    border: '1px solid #2a140c',
    borderRadius: 'calc(var(--paper-w) * .0065)',
    padding: 'max(6px, calc(var(--paper-w) * .0065)) max(13px, calc(var(--paper-w) * .015))',
    whiteSpace: 'nowrap',
    flex: 'none',
    fontFamily: 'inherit',
    fontSize: 'max(12px, calc(var(--paper-w) * .0125))',
    letterSpacing: '.12em',
    color: '#3a2607',
    textShadow: '0 1px 0 #ffeaa8',
    userSelect: 'none',
    background: 'linear-gradient(#f8e7ae,#dcb047 26%,#b1831f 60%,#8a6a15)',
    boxShadow: 'inset 0 1px 0 #fff8dc,inset 0 -2px 4px #00000066,0 3px 0 #6b5210,0 8px 16px #000000aa',
  } as React.CSSProperties,
  manualBrassOff: { opacity: .55, cursor: 'default' } as React.CSSProperties,
  manualHoverCard: {
    position: 'fixed',
    zIndex: 60,
    background: 'linear-gradient(#fbf3da,#efdfb4)',
    border: '1px solid #c9a227',
    borderRadius: '.55em',
    boxShadow: '0 14px 30px #00000066,inset 0 1px 0 #fffdf3',
    color: '#2e2418',
    fontSize: 13,
    lineHeight: 1.7,
    padding: '.45em .7em',
    cursor: 'pointer',
  } as React.CSSProperties,
  /** #933：页签格里「配置卡 ＋ 体检卡」这一列的堆叠间距（唯一口径，别再给某一张卡加 margin）。 */
  tabStack: { display: 'flex', flexDirection: 'column', gap: 10 } as React.CSSProperties,
  /** #937：标题行里那枚版本胶囊（形状照真源 v3.1 的 `.ic-ver`：10px 字、1px 描边、999 圆角）。 */
  versionCapsule: {
    fontSize: 10.5,
    lineHeight: 1.6,
    color: 'var(--dsw-alias-label-tertiary, #adb2b8)',
    border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12))',
    borderRadius: 999,
    padding: '0 7px',
    whiteSpace: 'nowrap',
    flex: '0 0 auto',
    fontWeight: 400,
  } as React.CSSProperties,
  tablist: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } as React.CSSProperties,
  tab: {
    border: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.35))',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 13,
    cursor: 'pointer',
  } as React.CSSProperties,
  tabActive: {
    background: 'var(--dsw-alias-brand-primary, #0a84ff)',
    borderColor: 'transparent',
    // 前景取**与 brand-primary 成对**的宿主别名（#931）：写死 `#fff` 会在深色主题下撞色
    // （宿主的 brand-primary 在深色是近白 `#f9fafb`，白字压上去只有 1.045:1）。
    color: 'var(--dsw-alias-label-primary-foreground, #0f1115)',
    fontWeight: 700,
  } as React.CSSProperties,
  reco: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px dashed var(--dsw-alias-border-l1, rgba(128,128,128,.45))',
    color: 'var(--dsw-alias-label-secondary, #9a9a9a)',
    fontSize: 13,
    lineHeight: 1.7,
  } as React.CSSProperties,
  cmd: {
    display: 'block',
    marginTop: 8,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'var(--dsw-alias-bg-base, rgba(128,128,128,.12))',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    userSelect: 'all',
  } as React.CSSProperties,
  moreCard: {
    marginTop: 16,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.35))',
  } as React.CSSProperties,
  moreTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 4,
    color: 'var(--dsw-alias-label-primary, inherit)',
  } as React.CSSProperties,
  moreRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '2px 8px',
    padding: '7px 4px',
    textDecoration: 'none',
    color: 'inherit',
  } as React.CSSProperties,
  morePkg: {
    flex: '0 1 auto',
    minWidth: 0,
    overflowWrap: 'anywhere',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    fontWeight: 650,
  } as React.CSSProperties,
  moreDesc: {
    flex: '1 1 180px',
    minWidth: 0,
    fontSize: 11.5,
    lineHeight: 1.6,
    color: 'var(--dsw-alias-label-secondary, #9a9a9a)',
  } as React.CSSProperties,
  moreIcon: {
    flex: '0 0 auto',
    marginLeft: 'auto',
    display: 'inline-flex',
    color: 'var(--dsw-alias-label-secondary, #9a9a9a)',
  } as React.CSSProperties,
  /** 更新入口挂点：只占位，按钮本体由上游入口件渲染（票 1170）；批量弹窗壳亦由上游提供，本包零自家样式。 */
  updateEntrySlot: {
    display: 'inline-flex',
    alignItems: 'center',
  } as React.CSSProperties,
};

/** 更新区（票 1170 薄接线，完全上游 UI）：标题行挂上游入口按钮，点开即上游 dialog 七目标批量面板；缺席页签仍显示静态推荐，不进批量 targets。 */

/** 标签解析（resolveSlotLabel 同形：thunk 跟活，无则空字串；见 slots lib:27-29）。 */
function resolveLabel(label: SlotLedgerEntry['options']['label']): string {
  if (typeof label === 'function') return label();
  return label ?? '';
}

/** 外链图标（行尾那个；纯装饰，语义在链接自己的 aria-label／文字上）。 */
function ExternalIcon(): React.ReactElement {
  return React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: 13,
      height: 13,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.9,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    React.createElement('path', { d: 'M13.5 4.5H19.5V10.5' }),
    React.createElement('path', { d: 'M19.5 4.5L11 13' }),
    React.createElement('path', { d: 'M18 14.5V18A2 2 0 0 1 16 20H6A2 2 0 0 1 4 18V8A2 2 0 0 1 6 6H9.5' }),
  );
}

/** 标题行入口图标（#1174：星星实心填色、气泡描边，与行尾外链图标同线形语言；语义仍在链接的 title／aria-label 上）。 */
function PanelLinkIcon(props: { readonly filled: boolean; readonly path: string }): React.ReactElement {
  return React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: 14,
      height: 14,
      fill: props.filled ? 'currentColor' : 'none',
      stroke: props.filled ? 'none' : 'currentColor',
      strokeWidth: 1.9,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    React.createElement('path', { d: props.path }),
  );
}

/** 书签（一枚纸一枚：点签直达，悬停出卡；几何与在不在读的都是 plan 那份结果）。 */
function tabButton(
  sh: ManualSheet,
  at: number,
  tab: { width: number; height: number; font: number; radius: number },
  goPage: (pg: number) => void,
  setHover: (h: { pg: number; x: number; y: number } | null) => void,
): React.ReactElement {
  const on = sh.facing === at * 2 + 1 || sh.facing === at * 2 + 2;
  return React.createElement(
    'span',
    {
      key: 'sh' + sh.sheet,
      role: 'button',
      tabIndex: 0,
      'aria-label': '翻到第' + sh.facing + '页',
      title: '翻到第' + sh.facing + '页',
      'data-ilife-manual': 'tab',
      'data-pg': sh.facing,
      onClick: () => { goPage(sh.facing); },
      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') goPage(sh.facing); },
      onMouseEnter: (e: React.MouseEvent) => { setHover({ pg: sh.facing, x: e.clientX, y: e.clientY }); },
      onMouseLeave: () => { setHover(null); },
      style: {
        position: 'absolute',
        width: 'calc(var(--paper-w) * ' + tab.width / 100 + ')',
        height: 'calc(var(--paper-w) * ' + tab.height / 100 + ')',
        paddingTop: 'calc(var(--paper-w) * .008)',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        fontFamily: "Georgia,'Times New Roman',serif",
        fontSize: 'calc(var(--paper-w) * ' + tab.font / 100 + ')',
        lineHeight: 1,
        color: on ? '#3a2607' : '#4a3a22',
        background: on ? 'linear-gradient(#f8e7ae,#d9ab3c)' : 'linear-gradient(#f2e8cc,#d3c098)',
        border: '1px solid #8a7a55',
        borderBottom: 'none',
        borderRadius: 'calc(var(--paper-w) * ' + tab.radius / 100 + ') calc(var(--paper-w) * ' + tab.radius / 100 + ') 0 0',
        boxShadow: on ? '0 -2px 6px #00000088,inset 0 1px 0 #fffbe8' : '0 -2px 5px #00000055,inset 0 1px 0 #fffdf3',
        cursor: 'pointer',
        pointerEvents: 'auto',
        bottom: 0,
        [sh.side === 'left' ? 'right' : 'left']: 'calc(50% + ' + sh.tabOffset + '%)',
      } as React.CSSProperties,
    },
    String(sh.facing),
  );
}

/** popover 书籍壳（票 #1238 空壳跑通；票 #1239 加 renderPage 注入点喂真场景，默认仍是空框）。
 *
 * 排版口径唯一出处是 planManual（本组件只读结果，不自算）；页内正文是 #1239 的活，
 * 页框留空（data-ilife-manual="page-frame"）。翻页协议＝预显目标页＋无目标页预清空＋
 * 交接无入场动画（票面口径）；冻高＝开书瞬间量遍各跨页取最高、上限锁 A4 高
 * （量具缺席如测试替身时退回自然高度，不硬写）。旧外壳定稿件已背离，不跟它。 */
function ManualBookShell(props: { scenes: ManualScene[]; renderPage?: (page: { page: number; key: string; state: string } | null, goPage: (pg: number) => void) => React.ReactNode }): React.ReactElement {
  const scenes = props.scenes;
  const renderPage = props.renderPage ?? (() => null);
  const [spread, setSpread] = React.useState(0);
  const at = clampSpread(scenes, spread);
  const [frozen, setFrozen] = React.useState<number | null>(null);
  const [measuring, setMeasuring] = React.useState(-1);
  const [hover, setHover] = React.useState<{ pg: number; x: number; y: number } | null>(null);
  const bookRef = React.useRef<HTMLDivElement | null>(null);
  const leftRef = React.useRef<HTMLDivElement | null>(null);
  const rightRef = React.useRef<HTMLDivElement | null>(null);
  const heights = React.useRef<number[]>([]);
  const plan = planManual(scenes, at);
  /** 冻高闸门：一趟量完就落下（原型 freezeHeight 用 `FIXED_H` 缓存同一口径：开书量一次、resize 重来）。
   *  没有这个闸门，effect（无依赖数组）每渲染一次就重启一轮量尺 ⇒ 状态机空转，书停在被量到的那一跨页。 */
  const freezePending = React.useRef(true);
  // 量遍各跨页：逐跨页渲染（视觉隐藏）读框高推进；量具缺席直接收工。
  React.useEffect(() => {
    freezePending.current = true;
    heights.current = [];
    setMeasuring(-1);
    setFrozen(null);
  }, [scenes.length]);
  React.useEffect(() => {
    if (measuring < 0) {
      if (!freezePending.current || bookRef.current === null) return;
      heights.current = [];
      setMeasuring(0);
      return;
    }
    const book = bookRef.current;
    if (book === null) { setMeasuring(-1); return; }
    const h = Math.max(leftRef.current?.scrollHeight ?? 0, rightRef.current?.scrollHeight ?? 0);
    heights.current[measuring] = h;
    if (measuring + 1 < plan.spreadCount) { setMeasuring(measuring + 1); return; }
    const tallest = heights.current.reduce((m, v) => Math.max(m, v), 0);
    const capped = Math.floor(book.clientWidth / 1.41421356);
    setFrozen(tallest > 0 && capped > 0 ? Math.min(tallest, capped) : null);
    freezePending.current = false;
    setMeasuring(-1);
  });
  // 窗口变化重冻：只认元素量具，观察器缺席即跳过（禁 window 直写）。
  React.useEffect(() => {
    const book = bookRef.current;
    if (book === null || typeof ResizeObserver === 'undefined') return;
    const watcher = new ResizeObserver(() => { freezePending.current = true; heights.current = []; setMeasuring(0); });
    watcher.observe(book);
    return () => { watcher.disconnect(); };
  }, []);
  const shown = measuring >= 0 ? planManual(scenes, measuring) : plan;
  const goPage = (pg: number) => { setHover(null); setSpread(spreadOfPage(scenes, pg)); };
  const left = shown.pages.find((p) => p.side === 'left') ?? null;
  const right = shown.pages.find((p) => p.side === 'right') ?? null;
  const prevOff = at === 0;
  const nextOff = at === plan.spreadCount - 1;
  const hoverScene = hover === null ? null : scenes[hover.pg - 1] ?? null;
  const frame = (page: { page: number; key: string; state: string } | null, side: 'left' | 'right', ref: React.Ref<HTMLDivElement>) => React.createElement(
    'div',
    {
      key: side,
      ref,
      'data-ilife-manual': 'page-frame',
      'data-ilife-page': page === null ? 'empty' : page.page,
      'data-ilife-state': page === null ? 'empty' : page.state,
      style: { ...(side === 'left' ? S.manualPageL : S.manualPageR), ...S.manualPage },
    },
    page === null ? null : renderPage(page, goPage),
  );
  return React.createElement(
    'div',
    { style: S.manualStageLayer, 'data-ilife-manual': 'stage' },
    React.createElement(
    'div',
    { style: S.manualRoot, 'data-ilife-manual': 'shell' },
    React.createElement(
      'svg',
      { width: 0, height: 0, style: { position: 'absolute' }, 'aria-hidden': 'true' },
      React.createElement(
        'defs',
        null,
        React.createElement('filter', { id: 'ilife-rough-frame', x: '-6%', y: '-6%', width: '112%', height: '112%' },
          React.createElement('feTurbulence', { baseFrequency: '0.6', numOctaves: '3', result: 'n' }),
          React.createElement('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '6.5' }),
        ),
      ),
    ),
    React.createElement('style', { 'data-ilife-manual': 'content-css' }, manualContentCss()),
    React.createElement('div', { style: S.manualFrame, 'aria-hidden': 'true' }),
    React.createElement('div', { style: S.manualWeave, 'aria-hidden': 'true' }),
    React.createElement(
      'div',
      { style: S.manualPaper },
      React.createElement('div', { style: S.manualFiber, 'aria-hidden': 'true' }),
      React.createElement(
        'div',
        {
          ref: bookRef,
          'data-ilife-manual': 'book',
          style: {
            ...S.manualVolume,
            // 冻高按原型 freezeHeight 两步走：量的时候先把 min-height 归零量**自然高**（否则量到的是被撑开的那一版），
            // 量完再把冻住的值写回 height／min-height，并用 80vh 兜住上限（原型 cap＝min(纸宽×.707, 窗高×.8)）。
            ...(measuring >= 0 ? { visibility: 'hidden', height: 'auto', minHeight: 0 } : null),
            ...(frozen === null ? null : { height: frozen, minHeight: frozen, maxHeight: '80vh' }),
          } as React.CSSProperties,
        },
        React.createElement(
          'div',
          { style: S.manualTabLayer },
          plan.sheets.map((sh) => tabButton(sh, at, plan.tab, goPage, setHover)),
        ),
        frame(left, 'left', leftRef),
        React.createElement('div', { style: S.manualSpineSlot, 'aria-hidden': 'true' },
          React.createElement('span', { style: S.manualSpineLine })),
        frame(right, 'right', rightRef),
      ),
    ),
    ),
    React.createElement(
      'div',
      { style: S.manualDeck },
      React.createElement(
        'button',
        {
          type: 'button',
          style: { ...S.manualBrass, ...(prevOff ? S.manualBrassOff : null) },
          disabled: prevOff,
          'aria-label': '上一跨页',
          'data-ilife-manual': 'prev',
          'data-ilife-press': 'manual-prev',
          onClick: () => { setSpread(clampSpread(scenes, at - 1)); },
        },
        '‹ 上一页',
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          style: { ...S.manualBrass, ...(nextOff ? S.manualBrassOff : null) },
          disabled: nextOff,
          'aria-label': '下一跨页',
          'data-ilife-manual': 'next',
          'data-ilife-press': 'manual-next',
          onClick: () => { setSpread(clampSpread(scenes, at + 1)); },
        },
        '下一页 ›',
      ),
    ),
    hover === null
      ? null
      : React.createElement(
        'div',
        {
          role: 'status',
          'data-ilife-manual': 'tab-card',
          onClick: () => { goPage(hover.pg); },
          style: { ...S.manualHoverCard, left: hover.x + 12, top: hover.y + 16 },
        },
        React.createElement('div', null, '第' + hover.pg + '页' + (hoverScene === null ? '' : ' · ' + hoverScene.title)),
        React.createElement('div', null, '点一下翻到这一页 ›'),
      ),
  );
}

/** 面板顶部使用手册入口（票 #1237）：甲腰封书按钮，点开弹出书（空壳，书体是 #1238 的活）。
 *
 * 开合态只用 useState（面板禁 document／window 直写）；文案取导航表那份镜像。 */
function ManualEntry(): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  return React.createElement(
    'span',
    { style: S.manualWrap },
    React.createElement(
      'button',
      {
        type: 'button',
        style: S.manualBook,
        title: MANUAL_ENTRY.tip,
        'aria-label': MANUAL_ENTRY.title,
        'aria-expanded': open,
        'aria-controls': 'ilife-manual-book',
        // #1174：入口挂 press（悬停洗色＋按压收缩＋焦点双环；链接只做反馈不做标记）。
        'data-ilife-press': MANUAL_ENTRY.key,
        onClick: () => { setOpen(true); },
      },
      React.createElement(
        'span',
        { style: S.manualStage, 'aria-hidden': 'true' },
        React.createElement(
          'span',
          { style: S.manualCover },
          React.createElement('span', { style: S.manualSpine }),
          React.createElement('span', { style: S.manualBand }, MANUAL_ENTRY.title),
        ),
      ),
      React.createElement('span', { style: S.manualPlate, 'aria-hidden': 'true' }, MANUAL_ENTRY.title),
    ),
    open
      ? React.createElement(
        'div',
        {
          role: 'dialog',
          id: 'ilife-manual-book',
          'aria-label': MANUAL_ENTRY.title,
          style: S.manualShell,
          'data-ilife-manual': 'book-shell',
        },
        React.createElement(
          'button',
          {
            type: 'button',
            style: S.manualClose,
            'aria-label': '关闭' + MANUAL_ENTRY.title,
            'data-ilife-press': 'manual-close',
            onClick: () => { setOpen(false); },
          },
          '×',
        ),
        React.createElement(ManualBookShell, {
          scenes: [...SCENES],
          renderPage: (page, goPage) => page === null ? null : renderManualPage(SCENES, page, goPage),
        }),
      )
      : null,
  );
}

/** 标题行右上角两件：星（去本仓点 Star）＋ 气泡（去本仓开 issue），SVG 图标＋悬停说明＋按压反馈（#1174）。
 *
 * 三件并排里的第三件「检查更新」住隔壁票（#678）：本票只留位子——它就接在本组件之前，
 * 不画一个点了没反应的假按钮。窄窗口靠 headRow 的 flexWrap 折到标题下方，
 * 标题与两件都是 flex:'0 0 auto'，谁也不挤谁。
 */
function PanelActions(): React.ReactElement {
  return React.createElement(
    'div',
    { style: S.headActions },
    PANEL_LINKS.map((link) =>
      React.createElement(
        'a',
        {
          key: link.key,
          href: link.url,
          target: '_blank',
          rel: 'noreferrer',
          title: link.tip,
          'aria-label': link.tip,
          style: S.iconLink,
          // #1174：入口挂 press（悬停洗色＋按压收缩＋焦点双环；长按环不挂，链接只做反馈不做标记）。
          'data-ilife-press': link.key,
        },
        React.createElement(PanelLinkIcon, { filled: link.icon.filled, path: link.icon.path }),
      ),
    ),
  );
}

/** 底部「作者其他插件」引流卡：四行（包名 ＋ 一句说明 ＋ 行尾外链图标），点开新窗口。
 *
 * 卡片在页签面板之后，六页签切换它都在（它不属于任何一个页签）。
 */
function MorePluginsCard(): React.ReactElement {
  return React.createElement(
    'div',
    { style: S.moreCard },
    React.createElement('div', { style: S.moreTitle }, '作者其他插件'),
    MORE_PLUGINS.map((row) =>
      React.createElement(
        'a',
        {
          key: row.pkg,
          href: row.url,
          target: '_blank',
          rel: 'noreferrer',
          title: row.pkg + ' 的 GitHub 仓库',
          style: S.moreRow,
          // #1174 Q2：引流行的悬停与按压反馈（整行可点就整行有反馈）。
          'data-ilife-press': 'more',
        },
        React.createElement('span', { style: S.morePkg }, row.pkg),
        React.createElement('span', { style: S.moreDesc }, row.desc),
        React.createElement('span', { style: S.moreIcon }, React.createElement(ExternalIcon, null)),
      ),
    ),
  );
}

/** 总管自述版本（票 #737；#937 改口）：**不手写**，问宿主——宿主读自己这份已安装包的 `package.json`。
 *
 * 三态（#937）：`loading`（首帧就画胶囊占位 `…`）／`ready`（读到，画包名 · 版本）／`missing`（读不到，画「版本未知」）。
 * **失败要重试**：原先只取一次、一失败就永远停在未知（#937 查出来的真缺陷）；这里按 1s／3s／8s 退避重试三次。
 * 与卡路里 #130 同一条路：面板是浏览器产物、禁 node 内建，读盘只许在宿主半。 */
/** 读中 / 读不到 两种胶囊文案（#937：占位符用 `…`，读不到给人话，不把 `unknown` 印给人看）。 */
/** 构建期注入的版本号（tsdown `define`，值取自本包 `package.json` 的 `version`；票 #986）。
 *
 * 为什么烙进产物而不是问宿主：这行字是**标签**，延迟不该依赖宿主可用性——此前走
 * `ilife-manager.version` 电话，面板要先过一次往返，接不上还要按退避表等，首帧只能显示占位。
 * 漂移（改了包描述文件却忘了重建产物）由构建门咬住：产物里的注入值必须等于包版本。 */
declare const __LIFE_PACK_VERSION__: string;

/** 版本胶囊那一行字：只在这里拼一次，屏上与用例读的是同一串。 */
const MANAGER_VERSION_TEXT = MANAGER_PLUGIN + ' · ' + __LIFE_PACK_VERSION__;

/** 爱生活面板：总设置区 ＋ 检查更新（七家）＋ 爱生活页签条（slot 驱动）＋ 技能设置页投影/缺席卡。 */
function LifePackSection(props: LifePackSectionProps & { getCall: () => RpcCallFace | null }): React.ReactElement {
  const tabsId = React.useId();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const rows: ConfigTabRow[] = props.useTabs((value) => value);
  const present = new Set(rows.map((r) => r.id));
  // 配置体检（#706）：一张表六份报告，顶部那行汇总与各家那张表都从它读（同一份数据）。
  // 通道名的来源见 CHANNEL_BY_PLUGIN（#735：账本那一格读不到，改取导航表那份镜像）。
  const healthTabs = React.useMemo(
    () => rows.filter((row) => row.channel.length > 0).map((row) => ({ id: row.id, channel: row.channel })),
    [rows],
  );
  const health = useHealthPanel(() => props.getCall(), healthTabs);
  /** 六家的灯（票 #732）：按**页签槽账本**那一排过（装了但没体检通道的也在内，它显缺席态）。 */
  const lights = React.useMemo(
    () => lightsOf(
      rows.map((row) => ({ id: row.id, title: row.label, hasChannel: row.channel.length > 0 })),
      Object.fromEntries(Object.entries(health.rows).map(([id, row]) => [id, row.report ?? undefined])),
    ),
    [rows, health.rows],
  );
  const lightOf = (id: string) => lights.find((light) => light.id === id);
  const [activeId, setActiveId] = React.useState<string | undefined>(undefined);
  /** 批量入口挂载位（一颗按钮看七家聚合；0.5.4 #49 到达，弹窗 dialog 由入口件内置，开关态亦归上游）。 */
  const entryRef = React.useRef<HTMLSpanElement | null>(null);
  const callReady = props.getCall() !== null;
  /** 入口件挂载：连接后到才挂（取用器现取），卸载即 unmount（只停入口轮询）。 */
  React.useEffect(() => {
    const mount = entryRef.current;
    if (mount === null || !callReady) return;
    const entry = mountLifeBatchEntry(mount, managerCallAdapter(props.getCall()));
    return () => {
      entry.unmount();
    };
    // getCall 本身是取用器（引用稳定），只跟连接就绪态重跑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callReady]);
  const [visitedIds, setVisitedIds] = React.useState<ReadonlySet<string>>(() => new Set());
  const active = MANAGER_TABS.some((t) => t.plugin === activeId)
    ? (activeId as string)
    : MANAGER_TABS[0].plugin;
  React.useEffect(() => {
    setVisitedIds((previous) => {
      if (previous.has(active)) return previous;
      return new Set([...previous, active]);
    });
  }, [active]);
  /** 预热：section 一挂载，就把其余几家**错峰**挂上（隐藏面板照常挂载、只切 `hidden`），
   *  让各家那一次配置读提前跑掉——用户点哪个页签，多半值已经在了。
   *  错峰（每 150ms 一家）是为了不让六家子进程同时抢开工：首帧那一口气优先留给框架。
   *  只在页签账本非空时起一次（`rows` 要等各家 slot 注入后才齐）。
   *
   *  **一次性**（p10 定时器门的例外依据）：每个页签只挂一次（`warmed` 闸门 ＋ 一批固定数量的定时器），
   *  不是轮询、也不是重试——它没有「次数」可言；卸载即 `clearTimeout` 清干净。
   *  不做轮询是本意：这里只补一次提前量，取数与刷新仍旧由各家用例自己的通道走。 */
  const warmed = React.useRef(false);
  const tabCount = rows.length;
  React.useEffect(() => {
    if (warmed.current || tabCount === 0) return;
    warmed.current = true;
    const STAGGER_MS = 150;
    const timers = MANAGER_TABS
      .filter((tab) => rows.some((row) => row.id === tab.plugin))
      .map((tab, index) => setTimeout(() => {
        setVisitedIds((previous) => (previous.has(tab.plugin) ? previous : new Set([...previous, tab.plugin])));
      }, STAGGER_MS * (index + 1)));
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [tabCount]);
  function labelFor(tab: ManagerTab): string {
    const row = rows.find((r) => r.id === tab.plugin);
    return row && row.label.length > 0 ? row.label : tab.title;
  }
  void 0;
  function onTabKeyDown(event: React.KeyboardEvent, index: number): void {
    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % MANAGER_TABS.length; break;
      case 'ArrowLeft': nextIndex = (index - 1 + MANAGER_TABS.length) % MANAGER_TABS.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = MANAGER_TABS.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const next = MANAGER_TABS[nextIndex];
    setActiveId(next.plugin);
    tabRefs.current[nextIndex]?.focus();
  }
  /** T6 液态彗星式滑移（#1165）：glider 在下层走 pill，页签自身透明（选中态内联透明＋CSS 兜底）。
   *
   * 原型 `liquidTo` 原式：时长 200＋距离×0.35、夹 220–380ms、缓动 cubic-bezier(.3,1.1,.4,1)；
   * 滑移中 glider 在 45% 处拉伸 1.28/.86（Web Animations，失败则 CSS 过渡仍送到位）；
   * ghost 影子留在起点、180ms 消散（彗星式，非桥接残影）。首挂只摆位不动。
   * 无 document/window/process：只经 refs 量量（offset*）与写样式；减少动态由 CSS 媒体查询接管（本 effect 不判断）。 */
  const gliderRef = React.useRef<HTMLSpanElement | null>(null);
  const ghostRef = React.useRef<HTMLSpanElement | null>(null);
  const prevTabRect = React.useRef<{ readonly left: number; readonly top: number; readonly width: number; readonly height: number } | null>(null);
  React.useEffect(() => {
    const index = MANAGER_TABS.findIndex((tab) => tab.plugin === active);
    const el = index < 0 ? null : tabRefs.current[index];
    const glider = gliderRef.current;
    const ghost = ghostRef.current;
    if (el === null || el === undefined || glider === null || ghost === null) return;
    const next = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    const prev = prevTabRect.current;
    prevTabRect.current = next;
    const place = (rect: { readonly left: number; readonly top: number; readonly width: number; readonly height: number }): void => {
      glider.style.left = String(rect.left) + 'px';
      glider.style.top = String(rect.top) + 'px';
      glider.style.width = String(rect.width) + 'px';
      glider.style.height = String(rect.height) + 'px';
    };
    if (prev === null || (prev.left === next.left && prev.top === next.top && prev.width === next.width)) {
      place(next);
      return;
    }
    const dist = Math.abs(next.left - prev.left);
    const dur = Math.min(LIQUID_MAX_MS, Math.max(LIQUID_MIN_MS, LIQUID_BASE_MS + dist * LIQUID_DIST_FACTOR));
    ghost.style.transition = 'none';
    ghost.style.left = String(prev.left) + 'px';
    ghost.style.top = String(prev.top) + 'px';
    ghost.style.width = String(prev.width) + 'px';
    ghost.style.height = String(prev.height) + 'px';
    ghost.style.opacity = '1';
    void ghost.offsetWidth;
    ghost.style.transition = 'opacity ' + String(LIQUID_GHOST_MS / 1000) + 's ease';
    ghost.style.opacity = '0';
    glider.style.transition = 'none';
    place(prev);
    void glider.offsetWidth;
    glider.style.transition =
      'left ' + String(dur) + 'ms ' + LIQUID_EASE + ',top ' + String(dur) + 'ms ' + LIQUID_EASE + ',width ' + String(dur) + 'ms ' + LIQUID_EASE;
    place(next);
    try {
      glider.animate(
        [
          { transform: 'scaleX(1) scaleY(1)' },
          { transform: 'scaleX(' + String(LIQUID_STRETCH_X) + ') scaleY(' + String(LIQUID_STRETCH_Y) + ')', offset: 0.45 },
          { transform: 'scaleX(1) scaleY(1)', offset: 0.8 },
          { transform: 'scaleX(1) scaleY(1)' },
        ],
        { duration: dur, easing: 'ease-out' },
      );
    } catch {
      // 无 Web Animations 也无妨：left/top/width 的 CSS 过渡仍把滑移送到位
    }
  }, [active]);
  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { style: S.headRow },
      React.createElement('div', { style: S.head }, '爱生活'),
      // #986：版本号构建期注入，首帧就是真值；不再有读中／读不到两态（漂移由构建门守）。
      React.createElement(
        'span',
        { style: S.versionCapsule, 'data-ilife-version': 'capsule' },
        MANAGER_VERSION_TEXT,
      ),
      React.createElement(
        'div',
        { style: S.headActions },
        // #1237：使用手册入口挂头，排在更新入口与星／气泡之前。
        React.createElement(ManualEntry, null),
        React.createElement('span', {
          style: S.updateEntrySlot,
          ref: (element: HTMLSpanElement | null) => {
            entryRef.current = element;
          },
        }),
        React.createElement(PanelActions, null),
      ),
    ),
    React.createElement(HealthSummaryLine, {
      lights,
      running: health.running,
      // #735：取数失败也要在这一行看得见（各家的错只画在那家页签里的表上，摘要行沉默＝用户以为按钮坏了）。
      error: summaryErrorOf(health),
      onRun: health.run,
    }),
    React.createElement(
      'div',
      { role: 'tablist', 'aria-label': '爱生活技能页签', style: { ...S.tablist, position: 'relative', isolation: 'isolate' }, 'data-ilife-tablist': 't6' },
      // T6（#1165）：一枚页签样式＋goo 滤镜＋glider 滑块层；页签按钮本身仍按 slot 账本＋MANAGER_TABS 映射（机制不动，只加表现）。
      React.createElement('style', { 'data-ilife-tabs': 't6' }, tabInteractionCss()),
      React.createElement(
        'svg',
        { width: 0, height: 0, style: { position: 'absolute' }, 'aria-hidden': 'true' },
        React.createElement(
          'defs',
          null,
          React.createElement(
            'filter',
            { id: 'ilife-goo' },
            React.createElement('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 6, result: 'b' }),
            React.createElement('feColorMatrix', { in: 'b', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -11' }),
          ),
        ),
      ),
      React.createElement(
        'span',
        { 'data-ilife-glider-layer': 't6', 'aria-hidden': 'true' },
        React.createElement('span', {
          'data-ilife-ghost': 't6',
          ref: (element: HTMLSpanElement | null) => {
            ghostRef.current = element;
          },
        }),
        React.createElement('span', {
          'data-ilife-glider': 't6',
          ref: (element: HTMLSpanElement | null) => {
            gliderRef.current = element;
          },
        }),
      ),
      MANAGER_TABS.map((tab, index) => {
        const selected = tab.plugin === active;
        const light = lightOf(tab.plugin);
        // 圆点从「实心／空心＝装没装」换成「颜色＝体检档位」（票 #732）：装了就是实心、
        // 颜色按档位走；没装的保持缺席态、不许点（点它只会跳到一张缺席卡）。
        const dotColor = light === undefined
          ? (present.has(tab.plugin) ? TAB_DOT.unchecked : TAB_DOT.absent)
          : tabDotColor(light);
        const note = light === undefined ? null : tabNote(light);
        return React.createElement(
          'button',
          {
            key: tab.plugin,
            ref: (element: HTMLButtonElement | null) => {
              tabRefs.current[index] = element;
            },
            id: tabsId + '-tab-' + tab.plugin,
            type: 'button',
            role: 'tab',
            'data-ilife-tab': 'tab',
            'aria-selected': selected,
            'aria-controls': tabsId + '-panel-' + tab.plugin,
            tabIndex: selected ? 0 : -1,
            // T6（#1165）：选中态自身透明、glider 在下层给 pill（原型 V1 同形）；减少动态时 CSS 以 !important 回实心 pill。
            style: selected ? { ...S.tab, ...S.tabActive, background: 'transparent', borderColor: 'transparent' } : S.tab,
            onClick: () => {
              setActiveId(tab.plugin);
            },
            onKeyDown: (event: React.KeyboardEvent) => {
              onTabKeyDown(event, index);
            },
            title: light === undefined
              ? '这一家没装（或产物没注册页签槽）'
              : light.title + '：' + (light.hasChannel
                ? (light.status === null ? '还没体检' : '体检读数见本页签下方的表')
                : '没有配置体检出口'),
          },
          React.createElement('span', {
            'data-ilife-health': 'tab-dot',
            style: {
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              display: 'inline-block',
              flex: '0 0 auto',
            },
          }),
          labelFor(tab),
          note === null
            ? null
            : React.createElement(
                'span',
                {
                  'data-ilife-health': 'tab-note',
                  // 红黄各自那一截带**自己**的档位色，不许一个色管两档（#706 复评逮过的缺陷）。
                  style: { ...TAB_NOTE_STYLE, color: note.status === null ? undefined : STATUS_TEXT[note.status] },
                },
                note.text,
              ),
        );
      }),
    ),
    MANAGER_TABS.filter((tab) => tab.plugin === active || visitedIds.has(tab.plugin)).map((tab) => {
      const selected = tab.plugin === active;
      return React.createElement(
        'div',
        {
          key: tab.plugin,
          id: tabsId + '-panel-' + tab.plugin,
          role: 'tabpanel',
          'aria-labelledby': tabsId + '-tab-' + tab.plugin,
          // #933：这一格**不能**用 `hidden` 属性——UA 的 `[hidden]{display:none}` 会输给下面内联的
          // `display:flex`，六个预热页签会全露出来。显式写 display 才是唯一口径（未选中的整格不画）。
          style: selected ? undefined : { display: 'none' },
        },
        present.has(tab.plugin)
          ? React.createElement(
              // #933：配置卡与体检卡之间的空隙由**容器**给（原先两张卡边线直接相接、间距 0）。
              // 取 10＝壳里块间距的既有口径（与 `S.head`／`S.tablist` 那几处同值）。
              'div',
              { style: S.tabStack },
              props.renderSlot(CONFIG_TAB_SLOT, {}, { only: tab.plugin }) as React.ReactNode,
              // 那家的体检表：与总览那行读同一份快照（`health.rows`），不是各算一遍。
              // #1069：体检头只留去 `·` 的分层标题，**不带签**（签只留配置头；负责人 2026-10-03 定）。
              React.createElement(HealthTable, {
                title: labelFor(tab),
                phase: health.rows[tab.plugin]?.phase ?? 'idle',
                report: health.rows[tab.plugin]?.report ?? null,
                error: health.rows[tab.plugin]?.error ?? null,
              }),
            )
          : (() => {
              const reco = recoFor(tab);
              return React.createElement(
                'div',
                { style: S.reco },
                reco.hint,
                React.createElement('span', { style: S.cmd }, reco.installCmd),
              );
            })(),
      );
    }),
    React.createElement(MorePluginsCard, null),
  );
}

export function apply(ctx: ClientCtx): void {
  // 调用口取用器：每次取数时现取（connection 后到也不永久缺席），透传给面板组件。
  const getCall = (): RpcCallFace | null => (ctx.connection?.rpc?.call as RpcCallFace | undefined) ?? null;
  // ledger 观测源（settings-plugins:1744-1767 同形；无 locale 面声明，故只订 ledger）。
  let tabsVersion = -1;
  let tabs: ConfigTabRow[] = [];
  const sectionInjected = () => ({
    hooks: {
      tabs: {
        getSnapshot: () => {
          const version = ctx.slots.getVersion(CONFIG_TAB_SLOT);
          if (version !== tabsVersion) {
            tabsVersion = version;
            tabs = ctx.slots
              .entries(CONFIG_TAB_SLOT)
              .map((entry) => ({
                id: entry.options.id ?? '',
                order: entry.options.order ?? 0,
                label: resolveLabel(entry.options.label),
                // #735 配置体检的通道：取自导航表（账本那一格读不到）。表里没有这家 ⇒ 空串 ⇒
                // 这家没有体检出口（灯显缺席态、按钮不会为它取数）。
                channel: CHANNEL_BY_PLUGIN.get(entry.options.id ?? '') ?? '',
              }))
              .sort((a, b) => a.order - b.order);
          }
          return tabs;
        },
        subscribe: (listener: () => void) => ctx.slots.subscribe(CONFIG_TAB_SLOT, listener),
      },
    },
  });
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-life-pack',
        order: 21,
        label: () => '爱生活',
        inject: sectionInjected,
        children: { 'ilife.config-tab': { kind: 'list', scope: 'root' } },
      },
      (props: LifePackSectionProps) => React.createElement(LifePackSection, { ...props, getCall }),
    ),
  );
}
