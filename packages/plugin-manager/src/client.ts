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
import { MANAGER_PLUGIN, MANAGER_TABS, MORE_PLUGINS, PANEL_LINKS, recoFor } from './nav.js';
import { clampSpread, planManual, spreadOfPage } from './manual-plan.js';
import type { ManualScene, ManualSheet } from './manual-plan.js';
import { SCENES, manualContentCss, renderManualPage } from './manual-content.js';
import type { ManagerTab } from './nav.js';
import { CONFIG_TAB_SLOT } from './update-contract.js';
import { managerCallAdapter, mountLifeBatchEntry, mountLifeInstallButton } from './update-dialog.js';
import { interactionCss, tabInteractionCss } from './config-panel-view.js';
import { ManualEntryButton, ManualPopoverShell, manualEntryCss } from './manual-entry.js';
import { LIQUID_BASE_MS, LIQUID_DIST_FACTOR, LIQUID_EASE, LIQUID_GHOST_MS, LIQUID_MAX_MS, LIQUID_MIN_MS, LIQUID_STRETCH_X, LIQUID_STRETCH_Y, NOTICE_FADE_MS, NOTICE_RISE_PX } from './config-panel-contract.js';
import { useHealthPanel } from './health-panel.js';
import { HealthTable, STATUS_TEXT, TAB_DOT, TAB_NOTE_STYLE, lightsOf, tabDotColor, tabNote } from './health-view.js';
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
  /** 铜扣行：在**红框之外**的页面底色上居中（原型 `.deck` 是 `.scroll` 的兄弟节点），间距随纸宽。
   *
   * #1240 关闭钮被挡：deck 盒（满宽透明区）与关闭槽同处书下同一带、z 同为 40 且 deck 后画，
   * 盒的空区会吃掉关闭钮左侧约 50px 的点击。盒本身点透、钮自己可点（父 none 子 auto），
   * 空区不再挡关闭，铜扣仍可点。 */
  manualDeck: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'max(8px, calc(var(--paper-w) * .009))',
    margin: '.5em auto 0',
    maxWidth: 'var(--paper-w)',
    position: 'relative',
    pointerEvents: 'none',
  } as React.CSSProperties,
  manualBrass: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'calc(var(--paper-w) * .005)',
    cursor: 'pointer',
    pointerEvents: 'auto',
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
  /** 缺席页签的安装按钮挂载位（#1282）：容器只占位，按钮本体由上游安装控件渲染；落在提示文案与手动命令之间。 */
  installSlot: {
    display: 'block',
    marginTop: 8,
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
  /** 标题行体检按钮：接原来第二行汇总行里那颗「体检一次」（行删了搬上来），改名「体检」放「检查更新」左侧；
   *  形状照页签 pill（999 圆角、13 字、4px 12px），颜色走主题别名。 */
  healthBtn: {
    border: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.35))',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 13,
    cursor: 'pointer',
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

/** 缺席标记（#1282）：下载箭头＝"待安装"；描边取缺席标记色，与 PanelLinkIcon 同线形语言。
 *  注意不用圆点：圆＝体检档位，缺席没有健康值，不进那套分级（形状即第二通道）。 */
function AbsentDownloadIcon(props: { readonly color: string }): React.ReactElement {
  return React.createElement(
    'svg',
    {
      viewBox: '0 0 12 12',
      width: 11,
      height: 11,
      fill: 'none',
      stroke: props.color,
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    React.createElement('line', { x1: 6, y1: 1.5, x2: 6, y2: 7.5 }),
    React.createElement('path', { d: 'M3.2 5.6 L6 8.4 L8.8 5.6' }),
    React.createElement('line', { x1: 2, y1: 10.5, x2: 10, y2: 10.5 }),
  );
}

/** 掀页动效的样式（逐条取自冻结原型 `.leaf` 一族；选择器加前缀，免得与宿主类名撞）。
 *
 * 三条不动：660ms cubic-bezier(.45,.05,.55,.95) 的 3D 掀页、`.face:after` 的明暗遮罩、
 * 反面 `rotateY(180deg)`；叶宽 50%，转轴落在中缝（右叶转轴在左缘、左叶在右缘）。 */
function manualTurnCss(): string {
  return [
    '.ilife-manual-leaf{position:absolute;top:0;bottom:0;width:50%;z-index:10;pointer-events:none;transform-style:preserve-3d;will-change:transform;backface-visibility:hidden}',
    '.ilife-manual-leaf-r{right:0;transform-origin:left center}',
    '.ilife-manual-leaf-l{left:0;transform-origin:right center}',
    '.ilife-manual-leaf .face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:visible;background:#ece0c2;padding:0;font-size:calc(var(--paper-w) * .015)}',
    '.ilife-manual-leaf .face.back{transform:rotateY(180deg)}',
    '.ilife-manual-leaf .face:after{content:"";position:absolute;inset:0;background:#2a1c0c;opacity:0;pointer-events:none}',
    '.ilife-manual-leaf .face .tab{bottom:100%}',
    '.ilife-manual-leaf.to-left .face:after,.ilife-manual-leaf.to-right .face:after{animation:ilifeShadeTurn .66s ease-in-out both}',
    '.ilife-manual-leaf.to-left{animation:ilifeToLeft .66s cubic-bezier(.45,.05,.55,.95) both}',
    '.ilife-manual-leaf.to-right{animation:ilifeToRight .66s cubic-bezier(.45,.05,.55,.95) both}',
    '@keyframes ilifeToLeft{0%{transform:rotateY(0deg)}100%{transform:rotateY(-180deg)}}',
    '@keyframes ilifeToRight{0%{transform:rotateY(0deg)}100%{transform:rotateY(180deg)}}',
    '@keyframes ilifeShadeTurn{0%{opacity:0}50%{opacity:.38}100%{opacity:0}}',
    '@media (prefers-reduced-motion:reduce){.ilife-manual-leaf.to-left,.ilife-manual-leaf.to-right,.ilife-manual-leaf.to-left .face:after,.ilife-manual-leaf.to-right .face:after{animation:none}}',
    // 开图时藏钮：浮层一开，铜扣行与关闭钮整组消失（谁也不盖谁，不存在半遮半点不动）；
    // 图一关就回来。铜扣行是壳的后兄弟，关闭钮住在壳里，各走各的找法。
    // #1240 开图抖动：铜扣行原来用 display:none 藏，整行（含 .5em 上边距）从布局里抽掉，
    // 弹层 flex 居中重算，书上下跳。改占位藏（visibility）：盒子留着、钮隐身且点不到，
    // 书所在容器高度不动。visibility 没有行内对手，不用 !important；关闭槽是绝对定位
    //（本来就不占布局），display 藏它不抖，保持不动。
    '[data-ilife-manual="shell"]:has(.pop.open)~[data-ilife-manual="deck"]{visibility:hidden}',
    '[data-ilife-manual="shell"]:has(.pop.open) [data-ilife-manual="close-slot"]{display:none}',
  ].join('');
}

/** 掀页时长（原型 660ms）；动画缺席时的兜底落定比它多一点。 */
const TURN_MS = 660;

/** 一趟掀页：翻走哪张纸（sheet）、从哪个跨页到哪个跨页、朝哪边翻。 */
interface ManualTurn {
  readonly dir: 1 | -1;
  readonly from: number;
  readonly to: number;
  readonly sheet: number;
}

/** 书签的样子（纸层里的与纸面上的同一份口径；只差挂在哪儿：`sideValue`／`bottom` 由调用方给）。 */
function tabFaceStyle(
  tab: { width: number; height: number; font: number; radius: number },
  on: boolean,
  side: 'left' | 'right',
  sideValue: string,
  bottom: number | string,
): React.CSSProperties {
  return {
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
    bottom,
    [side]: sideValue,
  } as React.CSSProperties;
}

/** 纸上的那枚签（原型 `faceTab`）：叶只有半本书宽，横向偏移按两倍算，签骑在纸面之上。 */
function leafTab(
  pg: number,
  side: 'left' | 'right',
  offset: number,
  tab: { width: number; height: number; font: number; radius: number },
): React.ReactElement {
  return React.createElement(
    'span',
    {
      'data-ilife-manual': 'tab',
      'data-ilife-leaf-tab': String(pg),
      'aria-hidden': 'true',
      style: tabFaceStyle(tab, true, side, offset * 2 + '%', '100%'),
    },
    String(pg),
  );
}

/** 书签（一枚纸一枚：点签直达，悬停出卡；几何与在不在读的都是 plan 那份结果）。 */
function tabButton(
  sh: ManualSheet,
  at: number,
  tab: { width: number; height: number; font: number; radius: number },
  goPage: (pg: number) => void,
  setHover: (h: { pg: number; other: number | null; x: number; y: number } | null) => void,
  hidden: boolean,
): React.ReactElement {
  const on = sh.facing === at * 2 + 1 || sh.facing === at * 2 + 2;
  // 反面那一页：露出的若是正面就取反面，反之取正面（原型 data-other 口径）；首签那张纸没有反面。
  const other = sh.facing === sh.front ? sh.back : sh.front;
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
      onMouseEnter: (e: React.MouseEvent) => { setHover({ pg: sh.facing, other, x: e.clientX, y: e.clientY }); },
      onMouseLeave: () => { setHover(null); },
      style: {
        ...tabFaceStyle(tab, on, sh.side === 'left' ? 'right' : 'left', 'calc(50% + ' + sh.tabOffset + '%)', 0),
        cursor: 'pointer',
        pointerEvents: 'auto',
        // 掀页期间纸上的那枚签由纸自己带着走，纸层里这枚先隐掉（原型 visibility:hidden）。
        ...(hidden ? { visibility: 'hidden' as const } : null),
      },
    },
    String(sh.facing),
  );
}

/** 悬停卡上的一行：页号＋场景名，名按原型取 `name || title`（内容层才有短名，见 `manual-content.ts` 的
 *  `ManualContentScene.name`）；待补充（`state === 'pending'`）的条目名后带锁。
 *  没有这一页（首签那张纸的反面）就不出行——卡上只留本页行与末行。
 *  真值：`proto-manual-4scenes.html` 第 355-357／364 行。 */
function tabCardLine(page: number | null, scene: ManualScene | null): React.ReactElement | null {
  if (page === null || scene === null) return null;
  const named = scene as ManualScene & { readonly name?: string };
  return React.createElement('div', null, String(page) + ' ' + (named.name || scene.title) + (scene.state === 'pending' ? ' 🔒' : ''));
}

/** popover 书籍壳（票 #1238 空壳跑通；票 #1239 加 renderPage 注入点喂真场景；#1240 加 closeSlot 与掀页）。
 *
 * 排版口径唯一出处是 planManual（本组件只读结果，不自算）；页内正文是 #1239 的活，
 * 页框留空（data-ilife-manual="page-frame"）。翻页协议＝预显目标页＋无目标页预清空＋
 * 交接无入场动画（票面口径）；冻高＝开书瞬间量遍各跨页取最高、上限锁 A4 高
 * （量具缺席如测试替身时退回自然高度，不硬写）。旧外壳定稿件已背离，不跟它。
 * 掀页＝原型 `turnLeaf`：一趟只翻一张纸，忙时压住跳转；关闭钮经 closeSlot 跟书走。 */
function ManualBookShell(props: {
  scenes: ManualScene[];
  renderPage?: (page: { page: number; key: string; state: string } | null, goPage: (pg: number) => void) => React.ReactNode;
  /** 书框**右下角外侧**那一格（2026-10-10 用户口径：关闭钮与「上一页／下一页」同一行、放右侧，
   *  钮的右边与书框右边对齐 —— 所以它挂在书壳上，跟着书的几何走）。 */
  closeSlot?: React.ReactNode;
}): React.ReactElement {
  const scenes = props.scenes;
  const renderPage = props.renderPage ?? (() => null);
  const [spread, setSpread] = React.useState(0);
  const at = clampSpread(scenes, spread);
  const [frozen, setFrozen] = React.useState<number | null>(null);
  const [measuring, setMeasuring] = React.useState(-1);
  const [lockH, setLockH] = React.useState<number | null>(null);
  const [hover, setHover] = React.useState<{ pg: number; other: number | null; x: number; y: number } | null>(null);
  const bookRef = React.useRef<HTMLDivElement | null>(null);
  const leftRef = React.useRef<HTMLDivElement | null>(null);
  const rightRef = React.useRef<HTMLDivElement | null>(null);
  const heights = React.useRef<number[]>([]);
  const bookW = React.useRef(0);
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
    setLockH(null);
  }, [scenes.length]);
  React.useEffect(() => {
    if (measuring < 0) {
      if (!freezePending.current || bookRef.current === null) return;
      const bw = bookRef.current.clientWidth;
      bookW.current = bw;
      setLockH(frozen ?? (bw > 0 ? Math.floor(bw / 1.41421356) : null));
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
    bookW.current = book.clientWidth;
    freezePending.current = false;
    setMeasuring(-1);
  });
  // 窗口变化重冻：只认元素量具，观察器缺席即跳过（禁 window 直写）。
  // 高度自扰不重来：冻高落定与量尺塌陷都是高度变化，会再次触发 RO；只认宽度变化才重冻。
  React.useEffect(() => {
    const book = bookRef.current;
    if (book === null || typeof ResizeObserver === 'undefined') return;
    const watcher = new ResizeObserver(() => {
      const w = book.clientWidth;
      if (w === bookW.current) return;
      bookW.current = w;
      freezePending.current = true; heights.current = []; setMeasuring(0);
    });
    watcher.observe(book);
    return () => { watcher.disconnect(); };
  }, []);
  /** 掀页状态机（原型 `turnLeaf`）：一趟只翻一张纸，翻的过程中压住一切跳转（忙锁）。 */
  const [turn, setTurn] = React.useState<ManualTurn | null>(null);
  const pendingTurn = React.useRef<ManualTurn | null>(null);
  const turnTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTurnTimer = () => {
    if (turnTimer.current !== null) { clearTimeout(turnTimer.current); turnTimer.current = null; }
  };
  /** 落定一趟：跨页换到目标、收掉纸、解忙锁（原型 `animationend` 那一段）。 */
  const settleTurn = () => {
    const t = pendingTurn.current;
    if (t === null) return;
    pendingTurn.current = null;
    clearTurnTimer();
    setSpread(t.to);
    setTurn(null);
  };
  React.useEffect(() => () => { clearTurnTimer(); }, []);
  /** 起一趟掀页：算翻哪张纸、承接边先预显目标页、纸上正反面各印一页，动画跑完才落定。
   *
   * 没有 DOM 就没有动效（用例替身、无浏览器）：直接落定，别把忙锁挂死。 */
  const startTurn = (dir: 1 | -1) => {
    if (pendingTurn.current !== null || measuring >= 0) return;
    const fromPlan = planManual(scenes, at);
    const sheet = fromPlan.sheets[dir > 0 ? at + 1 : at];
    if (sheet === undefined) return;
    const facing = sheet.facing;
    const other = facing === sheet.front ? sheet.back : sheet.front;
    if (facing === null || other === null) return;
    const to = clampSpread(scenes, at + dir);
    if (to === at) return;
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') { setSpread(to); return; }
    const nextTurn: ManualTurn = { dir, from: at, to, sheet: sheet.sheet };
    pendingTurn.current = nextTurn;
    setTurn(nextTurn);
    if (typeof setTimeout === 'function') {
      // 兜底：动效被系统关掉（prefers-reduced-motion）或事件没到，也不能把书锁死。
      turnTimer.current = setTimeout(() => { settleTurn(); }, TURN_MS + 140);
    }
  };
  const base = turn === null ? at : turn.from;
  const basePlan = planManual(scenes, base);
  const targetPlan = turn === null ? basePlan : planManual(scenes, turn.to);
  const shown = measuring >= 0 ? planManual(scenes, measuring) : basePlan;
  /** 承接边：翻页时先把这一边预显成目标页（原型 `preEl`），翻走的那一边保持原样。 */
  const preSide: 'left' | 'right' | null = turn === null || measuring >= 0 ? null : (turn.dir > 0 ? 'right' : 'left');
  const framePage = (side: 'left' | 'right') => {
    const source = preSide === side ? targetPlan : shown;
    return source.pages.find((p) => p.side === side) ?? null;
  };
  const leafSheet = turn === null || measuring >= 0 ? null : basePlan.sheets[turn.sheet] ?? null;
  const leafOther = leafSheet === null ? null : (leafSheet.facing === leafSheet.front ? leafSheet.back : leafSheet.front);
  const leafFront = leafSheet === null ? null : basePlan.pages.find((p) => p.page === leafSheet.facing) ?? null;
  const leafBack = leafOther === null ? null : targetPlan.pages.find((p) => p.page === leafOther) ?? null;
  const goPage = (pg: number) => {
    if (pendingTurn.current !== null) return;
    setHover(null);
    setSpread(spreadOfPage(scenes, pg));
  };
  const prevOff = at === 0;
  const nextOff = at === plan.spreadCount - 1;
  const hoverScene = hover === null ? null : scenes[hover.pg - 1] ?? null;
  // 悬停卡第二行＝这张纸的反面那一页（原型 data-other 口径；首签那张纸没有反面 ⇒ 不出这一行）。
  const hoverOtherPage = hover === null ? null : hover.other;
  const hoverOtherScene = hoverOtherPage === null ? null : scenes[hoverOtherPage - 1] ?? null;
  /** 页内图片浮层的开关委托：点徽标开关它那一枚（先关别人，一次只看一张），
   *  点图外任意处或 × 即收；点图本身保持打开。无打开的浮层且没点中徽标时直接返回，
   *  不影响签跳与铜扣。状态全在 DOM class 上，不进 React 状态（翻页重渲染即清场）。 */
  const toggleShot = (e: React.MouseEvent) => {
    const host = e.currentTarget as unknown as Element | null;
    if (host === null || typeof host.querySelector !== 'function') return;
    const t = e.target as unknown as Element | null;
    const at = (sel: string): Element | null => (t !== null && typeof t.closest === 'function' ? t.closest(sel) : null);
    const hit = at('[data-pop-toggle]');
    if (hit !== null) {
      const pop = hit.closest('.pop');
      const wasOpen = pop !== null && pop.classList.contains('open');
      host.querySelectorAll('.pop.open').forEach((one) => { one.classList.remove('open'); });
      if (pop !== null && !wasOpen) pop.classList.add('open');
      return;
    }
    // #1240 问题三：点 × 即收它那一枚（关钮由内容层随 view 配发，见 manual-content.ts 的 withShotClose）。
    const x = at('[data-pop-x]');
    if (x !== null) {
      const pop = x.closest('.pop');
      if (pop !== null) pop.classList.remove('open');
      return;
    }
    if (at('img') !== null) return;
    const open = host.querySelector('.pop.open');
    if (open !== null) open.classList.remove('open');
  };
  /** 键盘等价：聚焦徽标回车／空格即开关，聚焦 × 即关闭（span 无原生行为，逻辑里补上）。 */
  const toggleShotKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target as unknown as Element | null;
    if (t === null || typeof t.closest !== 'function') return;
    const host = e.currentTarget as unknown as Element | null;
    if (t.closest('[data-pop-x]') !== null) {
      e.preventDefault();
      const near = t.closest('.pop.open') ?? (host !== null && typeof host.querySelector === 'function' ? host.querySelector('.pop.open') : null);
      if (near !== null) near.classList.remove('open');
      return;
    }
    if (t.closest('[data-pop-toggle]') === null) return;
    e.preventDefault();
    const pop = t.closest('.pop');
    const wasOpen = pop !== null && pop.classList.contains('open');
    if (host !== null && typeof host.querySelectorAll === 'function') {
      host.querySelectorAll('.pop.open').forEach((one) => { one.classList.remove('open'); });
    }
    if (pop !== null && !wasOpen) pop.classList.add('open');
  };
  const frame = (page: { page: number; key: string; state: string } | null, side: 'left' | 'right', ref: React.Ref<HTMLDivElement>) => React.createElement(
    'div',
    {
      key: side,
      ref,
      'data-ilife-manual': 'page-frame',
      'data-ilife-page': page === null ? 'empty' : page.page,
      'data-ilife-state': page === null ? 'empty' : page.state,
      style: { ...(side === 'left' ? S.manualPageL : S.manualPageR), ...S.manualPage },
      onClick: toggleShot,
      onKeyDown: toggleShotKey,
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
    React.createElement('style', { 'data-ilife-manual': 'turn-css' }, manualTurnCss()),
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
            // 锁高量自然高：读的是框的 scrollHeight，与书定多高无关；首开无锁时回退旧行为。
            ...(measuring >= 0 ? (lockH !== null && lockH > 0 ? { visibility: 'hidden', height: lockH, minHeight: lockH, maxHeight: lockH, overflow: 'hidden' } : { visibility: 'hidden', height: 'auto', minHeight: 0 }) : null),
            ...(frozen === null ? null : { height: frozen, minHeight: frozen, maxHeight: '80vh' }),
          } as React.CSSProperties,
        },
        React.createElement(
          'div',
          { style: S.manualTabLayer },
          plan.sheets.map((sh) => tabButton(sh, at, plan.tab, goPage, setHover, turn !== null && turn.sheet === sh.sheet)),
        ),
        frame(framePage('left'), 'left', leftRef),
        React.createElement('div', { style: S.manualSpineSlot, 'aria-hidden': 'true' },
          React.createElement('span', { style: S.manualSpineLine })),
        frame(framePage('right'), 'right', rightRef),
        // 掀页的纸：正面＝正翻走的那一页，反面＝翻过来要露出的那一页；两页各带自己那枚签。
        leafSheet === null || turn === null
          ? null
          : React.createElement(
            'div',
            {
              key: 'leaf-' + turn.sheet + '-' + turn.dir,
              'data-ilife-manual': 'leaf',
              'data-ilife-leaf': turn.dir > 0 ? 'next' : 'prev',
              'aria-hidden': 'true',
              className: 'ilife-manual-leaf ' + (turn.dir > 0 ? 'ilife-manual-leaf-r to-left' : 'ilife-manual-leaf-l to-right'),
              onAnimationEnd: (e: React.AnimationEvent) => { if (e.target === e.currentTarget) settleTurn(); },
            },
            React.createElement(
              'div',
              { className: 'face front' },
              leafFront === null ? null : renderPage(leafFront, goPage),
              leafTab(leafSheet.facing, turn.dir > 0 ? 'left' : 'right', leafSheet.tabOffset, plan.tab),
            ),
            React.createElement(
              'div',
              { className: 'face back' },
              leafBack === null ? null : renderPage(leafBack, goPage),
              leafOther === null ? null : leafTab(leafOther, turn.dir > 0 ? 'right' : 'left', leafSheet.tabOffset, plan.tab),
            ),
          ),
      ),
    ),
    // 书框右下角外侧那一格（关闭钮）：挂在 manualRoot（红框本体）里、绝对定位到框的下方 —— 它跟着
    // **书**的几何走，不跟弹层走（用户 2026-10-10 口径：与「上一页／下一页」同一行、放右侧，
    // 钮的右边与书框右边对齐）。
    props.closeSlot ?? null,
    ),
    React.createElement(
      'div',
      // 铜扣行与书同层；开图时整组由 :has 规则藏起（见 manualTurnCss 尾），平时 z40 保底。
      { style: { ...S.manualDeck, zIndex: 40 }, 'data-ilife-manual': 'deck' },
      React.createElement(
        'button',
        {
          type: 'button',
          style: { ...S.manualBrass, ...(prevOff ? S.manualBrassOff : null) },
          disabled: prevOff,
          'aria-label': '上一跨页',
          'data-ilife-manual': 'prev',
          'data-ilife-press': 'manual-prev',
          onClick: () => { startTurn(-1); },
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
          onClick: () => { startTurn(1); },
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
        tabCardLine(hover.pg, hoverScene),
        tabCardLine(hoverOtherPage, hoverOtherScene),
        React.createElement('div', null, '点一下翻到这一页 ›'),
      ),
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
/** 缺席页签的单包安装按钮（#1282）：挂载位＋挂载一体，连接不到或目标表无此包就不画。
 *
 *  与标题行批量入口同形（ref 占位＋effect 挂载＋卸载 unmount），区别只有两处：调的是单包安装
 *  件（`prefix: ilife-<skill>` 的单包五电话），以及容器落在缺席提示与手动命令之间。
 *
 *  上游首查回包里的 `manual`（精确手工命令）读出来交 `onManual`：带精确版本号与 registry，
 *  调用方拿它画自己的命令行＋复制按钮（单一定位，不复述上游 details 里的同一条）。
 *  只读、不重查：每秒读一次、读到为止、最多 10 次（0.3.60 现场：固定两次读不到，首查落定比预期晚）。 */
function TabInstallSlot(props: {
  tab: ManagerTab;
  getCall: () => RpcCallFace | null;
  onManual?: (manual: string) => void;
}): React.ReactElement | null {
  const slotRef = React.useRef<HTMLDivElement | null>(null);
  const callReady = props.getCall() !== null;
  const onManualRef = React.useRef(props.onManual);
  React.useEffect(() => {
    onManualRef.current = props.onManual;
  }, [props.onManual]);
  React.useEffect(() => {
    const mount = slotRef.current;
    if (mount === null || !callReady) return;
    const button = mountLifeInstallButton(mount, managerCallAdapter(props.getCall()), props.tab);
    if (button === null) return;
    let alive = true;
    let attempts = 0;
    const readOnce = () => {
      if (!alive) return;
      attempts += 1;
      try {
        const manual = button.state().manual;
        if (typeof manual === 'string' && manual.length > 0) {
          onManualRef.current?.(manual);
          return;
        }
      } catch { /* 读不到继续轮，不挡面板 */ }
      if (attempts < 10 && typeof setTimeout === 'function') {
        timer = setTimeout(readOnce, 1000);
      }
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (typeof setTimeout === 'function') {
      timer = setTimeout(readOnce, 800);
    }
    return () => {
      alive = false;
      if (timer !== null) clearTimeout(timer);
      button.unmount();
    };
    // getCall 本身是取用器（引用稳定），只跟连接就绪态与页签重跑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callReady, props.tab]);
  return React.createElement('div', { ref: slotRef, style: S.installSlot, 'data-ilife-install': 'slot' });
}

/** 缺席面板步骤化样式（#1282 v4 原型定稿）：序号圆点／命令行／复制按钮三态／Toast／上游主按钮覆盖。
 *
 *  全收敛在 `[data-ilife-absent]` 作用域下；容器 `S.reco` 与子顺序一字不动。
 *  上游主按钮换色用容器覆盖（`button[data-primary="1"]` 特异度压上游缺省；上游自带 CSS 无 hover
 *  规则，见 update-dialog.ts 注释——themeTokens 对安装控件无视觉效果，故悬停也收在这里）。
 *  悬停取深橙＋白字＋投影（用户 verdict：8% 提亮看不见）；颜色原型定稿 hex，见 v4 原型。
 *  常态橙底（0.3.61 补上：首版只写了 hover 没写常态，线上按钮常态掉回宿主灰——原型 L33 整条）。
 *  上游自带折叠手工行（0.3.60 现场：②里贴着按钮又冒出一条“手工命令”）：默认不动，
 *  只有当③的精确命令取到了（`data-manual="ready"`）才藏它——取不到时它仍是兜底。 */
const ABSENT_TOAST_MS = 1500 as const;
function absentStepsCss(): string {
  return (
    '[data-ilife-absent="panel"]>.ilife-step{display:block;position:relative;padding:10px 4px 10px 40px;border-bottom:1px solid rgba(255,255,255,.07)}' +
    '[data-ilife-absent="panel"]>.ilife-step:last-child{border-bottom:0}' +
    '[data-ilife-absent="panel"]>.ilife-step::before{content:attr(data-step);position:absolute;left:4px;top:10px;width:24px;height:24px;border-radius:50%;background:#2b2b2b;color:#9a9a9a;font-size:12px;display:flex;align-items:center;justify-content:center;font-weight:700}' +
    '[data-ilife-absent="panel"]>.ilife-step[data-step="1"]::before{background:#e5534b;color:#fff}' +
    '[data-ilife-absent="panel"]>.ilife-step[data-step="2"]::before{background:#f2a65a;color:#1a1206}' +
    '[data-ilife-absent="panel"] .ilife-step-t{display:block;color:#fff;font-weight:700;font-size:14px;margin-bottom:2px}' +
    '[data-ilife-absent="panel"] .ilife-tray{display:block;background:rgba(242,166,90,.14);border-radius:8px;padding:10px 12px}' +
    '[data-ilife-absent="panel"] .ilife-tray:empty,[data-ilife-absent="panel"] .ilife-tray:has([data-ilife-install="slot"]:empty){display:none}' +
    '[data-ilife-absent="panel"] [data-ilife-install="slot"]:empty{display:none}' +
    '[data-ilife-absent="panel"] .dsh-upd-ib button[data-primary="1"]{background:#f2a65a;color:#1a1206;border:0;border-radius:8px;padding:9px 24px;font-size:14px;font-weight:700;cursor:pointer;transition:background .15s,color .15s,transform .06s,box-shadow .15s}' +
    '[data-ilife-absent="panel"][data-manual="ready"] .dsh-upd-ib-manual{display:none}' +
    '[data-ilife-absent="panel"] .dsh-upd-ib button[data-primary="1"]:hover{background:#cf6f1f;color:#fff;transform:translateY(-1px);box-shadow:0 4px 14px rgba(207,111,31,.45)}' +
    '[data-ilife-absent="panel"] .dsh-upd-ib button[data-primary="1"]:active{transform:translateY(1px);box-shadow:none;background:#a8561a;color:#fff}' +
    '[data-ilife-absent="panel"] .dsh-upd-ib button[data-primary="1"]:disabled{opacity:.55;cursor:default;transform:none;box-shadow:none}' +
    '[data-ilife-absent="panel"] .dsh-upd-ib button[data-primary="1"]:focus-visible{outline:2px solid #f2a65a;outline-offset:2px}' +
    '[data-ilife-absent="panel"] .ilife-cmdrow{display:flex;gap:8px;align-items:stretch;margin-top:8px}' +
    '[data-ilife-absent="panel"] .ilife-cmdrow>code{flex:1;padding:8px 10px;border-radius:8px;background:rgba(128,128,128,.12);color:#57b883;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;user-select:all;white-space:pre-wrap;overflow-wrap:anywhere}' +
    '[data-ilife-absent="panel"] .ilife-cmdrow>code.plain{color:#e8e8e8}' +
    '[data-ilife-absent="panel"] .ilife-copycmd{flex:0 0 auto;align-self:center;background:#2b2b2b;color:#e8e8e8;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 14px;font-size:12.5px;cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .06s,box-shadow .15s}' +
    '[data-ilife-absent="panel"] .ilife-copycmd:hover{border-color:#f2a65a;color:#f2a65a;background:#353535;transform:translateY(-1px);box-shadow:0 2px 8px rgba(242,166,90,.25)}' +
    '[data-ilife-absent="panel"] .ilife-copycmd:active{transform:translateY(1px);box-shadow:none;background:#242424}' +
    '[data-ilife-absent="panel"] .ilife-copycmd:focus-visible{outline:2px solid #f2a65a;outline-offset:2px}' +
    '[data-ilife-absent="toast"]{position:fixed;left:50%;bottom:48px;transform:translateX(-50%) translateY(' + String(NOTICE_RISE_PX) + 'px);background:#1f1f1f;color:#fff;border:1px solid rgba(87,184,131,.6);border-radius:999px;padding:6px 18px;font-size:13px;z-index:99;animation:absentToastIn ' + String(NOTICE_FADE_MS / 1000) + 's ease}' +
    '@keyframes absentToastIn{from{opacity:0;transform:translateX(-50%) translateY(' + String(NOTICE_RISE_PX) + 'px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}'
  );
}

/** 命令行文本进剪贴板：先走 Clipboard API，摸不到（老宿主／非安全上下文）就地降级为隐藏 textarea。
 *  文案保持「复制」二字不动（用户口径）：成功只弹 Toast，不改按钮字。 */
async function copyCmdText(text: string): Promise<void> {
  try {
    const clip = (globalThis as unknown as { navigator?: { clipboard?: { writeText?: (t: string) => Promise<void> } } }).navigator?.clipboard;
    if (clip !== undefined && typeof clip.writeText === 'function') {
      await clip.writeText(text);
      return;
    }
  } catch { /* 掉进降级分支 */ }
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  try {
    area.select();
    document.execCommand('copy');
  } catch { /* 复制失败不抛：Toast 照弹“已复制”会撒谎，故调用方只在成功路上弹 */ throw new Error('copy-unavailable');
  } finally {
    document.body.removeChild(area);
  }
}

/** 命令行右端复制按钮（#1282）：文案恒为「复制」；点下走剪贴板，成了调 `onCopied` 弹 Toast。
 *  复制失败（剪贴板摸不到）吞掉不弹——弹“已复制”会撒谎。 */
function CopyCmdButton(props: { text: string; onCopied: () => void }): React.ReactElement {
  return React.createElement(
    'button',
    {
      type: 'button',
      className: 'ilife-copycmd',
      onClick: () => {
        void copyCmdText(props.text).then(props.onCopied, () => undefined);
      },
    },
    '复制',
  );
}

/** 缺席页签整块面板（#1282 v4）：容器 `S.reco` 不动，子顺序 hint→槽→命令不动，只做三步呈现。
 *
 *  ①状态标题（包名＋未安装，不复述命令）；②一键安装（上游槽，版本与按钮归上游画）；
 *  ③备选手动安装（上游首查落定的精确命令＋双包命令，各配复制按钮，默认即展开态）。
 *  Toast 常驻条件挂载（`notice` 同形，进场即跑 `absentToastIn`），1.5s 自散。 */
function AbsentTabPanel(props: {
  tab: ManagerTab;
  installCmd: string;
  getCall: () => RpcCallFace | null;
}): React.ReactElement {
  const [manual, setManual] = React.useState<string | null>(null);
  const [toastOn, setToast] = React.useState(false);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
  }, []);
  const pokeToast = () => {
    setToast(true);
    if (typeof setTimeout !== 'function') return;
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setToast(false); }, ABSENT_TOAST_MS);
  };
  const cmdRows: Array<{ key: string; text: string; plain: boolean }> = [];
  if (manual !== null) cmdRows.push({ key: 'exact', text: manual, plain: false });
  cmdRows.push({ key: 'dual', text: props.installCmd, plain: true });
  return React.createElement(
    'div',
    { style: S.reco, 'data-ilife-absent': 'panel', 'data-manual': manual !== null ? 'ready' : 'pending' },
    React.createElement('style', { 'data-ilife-absent': 'steps-css' }, absentStepsCss()),
    React.createElement(
      'div',
      { className: 'ilife-step', 'data-step': '1' },
      React.createElement('span', { className: 'ilife-step-t' }, props.tab.plugin + ' 未安装'),
      '请补装后使用。',
    ),
    React.createElement(
      'div',
      { className: 'ilife-step', 'data-step': '2' },
      React.createElement('span', { className: 'ilife-step-t' }, '一键安装'),
      React.createElement(
        'div',
        { className: 'ilife-tray' },
        React.createElement(TabInstallSlot, {
          tab: props.tab,
          getCall: props.getCall,
          onManual: (text: string) => { setManual(text); },
        }),
      ),
    ),
    React.createElement(
      'div',
      { className: 'ilife-step', 'data-step': '3' },
      React.createElement('span', { className: 'ilife-step-t' }, '备选：手动安装'),
      cmdRows.map((row) => React.createElement(
        'span',
        { key: row.key, className: 'ilife-cmdrow' },
        React.createElement('code', { className: row.plain ? 'plain' : undefined }, row.text),
        React.createElement(CopyCmdButton, { text: row.text, onCopied: pokeToast }),
      )),
    ),
    toastOn ? React.createElement('div', { 'data-ilife-absent': 'toast', role: 'status' }, '✓ 已复制') : null,
  );
}

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

/** 右下角那本书离面板两沿的距离：用户口径「一直处于面板右下角、不随列表滑动消失」
 *  ⇒ sticky 吸附（面板相对，视口多大都落在面板角上）；INSET＝右沿，BOTTOM＝底沿。 */
const MANUAL_ENTRY_INSET = 16;

/** 书盒子离视口底沿的距离（与上条同一次口径）。 */
const MANUAL_ENTRY_BOTTOM = 16;

/** 书框**右下角外侧**那枚关闭钮那一格（2026-10-10 用户口径：与「上一页／下一页」同一行、放在右侧，
 *  钮的右边与书框右边对齐）：`right:0` 贴住书框右边；`bottom:0` ＋ `translateY(100% + 8px)` 把它
 *  整枚挪到框的下方，正好落进翻页钮那一行的带子里。它挂在书壳（红框本体）里，所以左右永远跟书框
 *  对齐，与弹层框多大无关。zIndex 与铜扣行同取 40：三枚钮与书同层，页内浮层（z30）盖不住它们。
 *  #1240 窄屏真重叠：纸窄时铜扣会伸到关闭钮底下，同 z 时后画的 deck 压住关闭，关闭取 41 压回去
 * （仍在悬停卡 z60 之下）。 */
const MANUAL_CLOSE_SLOT: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  bottom: 0,
  transform: 'translateY(calc(100% + 8px))',
  zIndex: 41,
};

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
  /** 使用手册弹出开合（票 #1237：纯 UI 状态，不进脏基线；书体是 #1238 的活）。 */
  const [manualOpen, setManualOpen] = React.useState(false);
  /** 使用手册弹层那枚 `<dialog>`（#1240）。**挂上 DOM 的那一刻**就 `showModal()` 送进浏览器
   *  top layer——2026-10-10 用户实测：面板底部那条「保存／重置为默认／重新读取」与右上角那组
   *  插件浮层都盖在书上，只靠 z-index 压不住，top layer 才是不看 z-index 的那一层。
   *  用回调 ref 而不是 effect：元素每次真正挂上去都会调一次（宿主重挂也跟得上）；`showModal()`
   *  拿不到时补一个 `open` 属性兜底，至少保证书看得见。 */
  const attachManualDialog = React.useCallback((element: HTMLDialogElement | null) => {
    if (element === null) return;
    try {
      element.showModal();
      return;
    } catch {
      // 还没挂进文档（个别自制渲染器先交 ref 再 append）或宿主没有 showModal：先补 open 兜底，
      // 再等一帧重试一次（重试前要把 open 摘掉，带 open 的 dialog 调 showModal 会抛）。
      try { element.setAttribute('open', ''); } catch { /* 属性也写不了就作罢 */ }
    }
    try {
      setTimeout(() => {
        try {
          element.removeAttribute('open');
          element.showModal();
        } catch {
          try { element.setAttribute('open', ''); } catch { /* 作罢 */ }
        }
      }, 0);
    } catch { /* 没有 setTimeout 的宿主：保持兜底态 */ }
  }, []);
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
  /** 面板宽度不许跟着宿主滚动条变：宿主承载本面板的滚动体一出现滚动条，
   *  内容盒就窄 5px（主题里 `--dsh-scrollbar-width:5px`），标题行右对齐的按钮组便跟着左右挪；
   *  而滚动条出不出，取决于**当前页签**的内容高——装了的那家有配置卡，必然要滚，缺席页签不必。
   *
   *  这里不动面板高度、也不改宿主样式表，只给**最近的可滚动祖先**钉一条内联
   *  `scrollbar-gutter: stable`：槽位恒定预留，滚动条本身仍按需出现/消失，内容盒宽度因此恒定。
   *  卸载时还原（宿主本来就有 stable 时压根不写），改动不留在宿主上。
   *  替身渲染台（test/helpers/panel-render.mjs）里 ref 拿不到元素 ⇒ 这里天然空过，不碰 window。 */
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const root = rootRef.current;
    if (root === null || typeof window === 'undefined') return;
    let node: HTMLElement | null = root.parentElement;
    while (node !== null) {
      const overflowY = window.getComputedStyle(node).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      node = node.parentElement;
    }
    const scroller = node;
    if (scroller === null) return;
    if (window.getComputedStyle(scroller).getPropertyValue('scrollbar-gutter').trim() === 'stable') return;
    const previous = scroller.style.getPropertyValue('scrollbar-gutter');
    scroller.style.setProperty('scrollbar-gutter', 'stable');
    return () => {
      if (previous.length > 0) scroller.style.setProperty('scrollbar-gutter', previous);
      else scroller.style.removeProperty('scrollbar-gutter');
    };
  }, []);
  return React.createElement(
    'div',
    {
      style: { position: 'relative' },
      ref: (element: HTMLDivElement | null) => {
        rootRef.current = element;
      },
    },
    // 使用手册入口住卡片末尾（右下角常驻，见文件尾 sticky 块）。
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
          React.createElement(
            'button',
            {
              type: 'button',
              style: health.running ? { ...S.healthBtn, opacity: 0.55, cursor: 'default' } : S.healthBtn,
              disabled: health.running,
              onClick: health.run,
              title: '对六家各跑一次配置体检（只看不改：不建目录、不改配置、不自动重置）',
              'aria-label': '体检',
              'data-ilife-press': 'health-run',
              'data-ilife-longpress': 'health-run',
            },
            health.running ? '体检中…' : '体检',
          ),
          React.createElement('style', { 'data-ilife-interaction': 't1' }, interactionCss()),
          React.createElement('span', {
            style: S.updateEntrySlot,
            ref: (element: HTMLSpanElement | null) => {
              entryRef.current = element;
            },
          }),
          React.createElement(PanelActions, null),
        ),
      ),
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
        // 缺席判给分支不判颜色：TAB_DOT.absent 恰好等于 STATUS_DOT.red，
        // 按颜色判会把"装了但体检飘红"也画成箭头——缺席当且仅当走出缺席分支。
        const isAbsent = light === undefined
          ? !present.has(tab.plugin)
          : !light.hasChannel;
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
          isAbsent
            ? React.createElement('span', {
              'data-ilife-health': 'tab-dot',
              style: {
                width: 11,
                height: 11,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
              },
            }, AbsentDownloadIcon({ color: dotColor }))
            : React.createElement('span', {
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
              return React.createElement(AbsentTabPanel, {
                tab,
                installCmd: reco.installCmd,
                getCall: props.getCall,
              });
            })(),
      );
    }),
    React.createElement(MorePluginsCard, null),
    // 用户口径（右下角常驻）：入口放大 30%，吸附在**面板**右下角——sticky 贴着滚动视口底沿，
    // 面板相对（视口多大都落在面板角上，不随列表滑走）；只能住末尾（置顶会被上面滑走）。
    // 外层点透（整条只剩书可点），marginTop 撑开与上一张卡的距离；弹层仍走 dialog top layer 居中。
    React.createElement(
      'div',
      { style: { position: 'sticky', bottom: MANUAL_ENTRY_BOTTOM, zIndex: 60, display: 'flex', justifyContent: 'flex-end', paddingRight: MANUAL_ENTRY_INSET, marginTop: 8, pointerEvents: 'none' }, 'data-ilife-manual': 'entry-dock' },
      React.createElement(
        'span',
        { style: { display: 'inline-flex', pointerEvents: 'auto' } },
        React.createElement('style', null, manualEntryCss()),
        React.createElement(ManualEntryButton, { onOpen: () => { setManualOpen(true); } }),
        // 书体挂在同一个弹层里（#1240：弹层从空壳改成真书；定位与外观在 manualEntryCss 的
        // `.manual-popover` 一处定义，关着不渲染）。
        React.createElement(
          ManualPopoverShell,
          { open: manualOpen, onClose: () => { setManualOpen(false); }, dialogRef: attachManualDialog },
          React.createElement(ManualBookShell, {
            scenes: [...SCENES],
            renderPage: (page, goPage) => page === null ? null : renderManualPage(SCENES, page, goPage),
            // 关闭钮（2026-10-10 用户口径）：材质照「上一页／下一页」那两枚（同一份 S.manualBrass），
            // 钉在**书框**右上角**外侧**——那一格挂在书壳里，所以它跟着书走，不跟弹层框走。
            closeSlot: React.createElement(
              'span',
              { style: MANUAL_CLOSE_SLOT, 'data-ilife-manual': 'close-slot' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  style: S.manualBrass,
                  title: '关闭使用手册',
                  'aria-label': '关闭使用手册',
                  'data-ilife-press': 'manual-close',
                  onClick: () => { setManualOpen(false); },
                },
                '关闭',
              ),
            ),
          }),
        ),
      ),
    ),
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
