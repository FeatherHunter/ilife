/** 印章卷轴 · 纯组件（`title-seal.ts` 的配套件，不认任何一家）。
 *
 * 来源：原型定稿 2026-10-05（记录见 `docs/plugins/plugin-manager/印章原型-定稿.md` 第九节）。
 * 点印后弹出的那块：**外框逐档照抄对应那枚印的材质**（底色＋边线都照抄，不许简化成"一圈金属色"），
 * **中间是纯纸**，内容固定三段——进展／状态／计划。
 *
 * 三条形状（逐值照原型锁死）：
 *   外框：厚 1.125em（16px 下＝18px，这是下限；只给 10px 整张卡会读成"白底加一圈边"），
 *     材质随 `role`×`tier` 九档之一，挂 `roughFrame` 糙边滤镜。
 *   纸：`bg-layer-2` 底＋`border-l1` 描边，压在材质上（外框那层在纸下面，只露一圈）。
 *   字：标题居中 1em／字距 .16em；档位字 .66em／字距 .42em；三段标签 .66em／字距 .34em；
 *     正文 .84em／行高 1.9；段间 1px 细线＋.94em 上距。
 *
 * 颜色分治（照 `title-seal.ts` 的先例）：
 *   印那一份（外框材质、档位字色）**固定色**——纸变印不变，印不管纸面派生；
 *   纸那一份（纸底、纸边、标题、正文、段间线）走 DSH 主题别名。
 *
 * 糙边滤镜两条分开：印是小块，`scale 2.2` 就够；外框有几百像素宽，同一条会被稀释到看不出，
 * 故外框单用 `scale 5` 的 `roughFrame`。滤镜只挂外框那层，纸不挂（否则纸的直边也会被抖）。
 *
 * 本件是纯函数：吃 props 回元素树，不留状态、不取数。手写 `React.createElement`（本包 client 束禁 JSX）。
 */

import * as React from 'react';
import type { SealRole, SealTier } from './config-panel-contract.js';
// 卷轴标题直接复用印本体（与外面那枚同组件同 props，UI 天然一致）。
// 与 `seal-stamp.ts` 是渲染期互引（双方只在组件函数体内用对方，无模块求值期依赖）。
import { SealStamp } from './seal-stamp.js';
// 定稿的纸面字排与关闭钮样子（原型期方案已删，只此一件）。
import { closeLook, paperParts } from './seal-paper-schemes.js';
// 底色与边线从调色板取（与印面同一份取值）；下面那张 `FRAME_INSET` 是**外框自己的排法**。
import { SEAL_PALETTE, SEAL_RIVET } from './seal-palette.js';

/** 糙边滤镜 id（文档作用域，故每页只许挂一次 `SealFilterDefs`）。 */
const ROUGH_EDGE = 'dshLifeSealRoughEdge';
const ROUGH_FRAME = 'dshLifeSealRoughFrame';
/** 中等件（轴杆／纸筒／绦带这类几十像素宽的件）那条糙边：2.2 太细、5 会抖过头。 */
const ROUGH_METAL = 'dshLifeSealRoughMetal';
/** 印泥那条（行首那几枚小印）：同 2.2 的抖动，末尾再加一点高斯模糊——印泥压在纸上边缘会洇开，
 *  光有抖动边只会读成「毛边贴纸」。字住在滤镜之外，所以糊的只有泥、不是字。 */
const ROUGH_INK = 'dshLifeSealInkEdge';

/** 印那条糙边滤镜 id（`seal-stamp.ts` 引用，定义只此一处）。 */
export const SEAL_ROUGH_EDGE_ID = ROUGH_EDGE;

/** 中等件那条糙边 id（关闭钮引用；定义只此一处）。 */
export const SEAL_ROUGH_METAL_ID = ROUGH_METAL;

/** 印泥那条糙边 id（纸面行首小印引用；定义只此一处）。 */
export const SEAL_ROUGH_INK_ID = ROUGH_INK;


/** 档位话：标题下那一行不再印档位字，直接说档位所处的阶段（渲染期用，顶层可放行）。 */
export const TIER_TEXT: Record<SealTier, string> = {
  gold: '精雕细琢中',
  silver: '全打通中',
  copper: '基础建设中',
};

/** 卷轴展开动画名（文档作用域，印前缀防撞；`S.popInner` 求值期即用，必须住 `S` 之前）。 */
const UNROLL_ANIMATION = 'dshLifeSealUnroll';

/** 一档材质：外框那一份是固定色（印），档位字色也是固定色。 */
interface Material {
  /** 外框底色＋边线（逐值照该枚印）。 */
  readonly frame: React.CSSProperties;
  /** 档位字与标签的色（印派生，固定色）。 */
  readonly accent: string;
  /** 分隔线同族色。 */
  readonly ruler: string;
  /** 四角铆钉（只有插件章的整面金属带有）。 */
  readonly rivet?: React.CSSProperties;
}

/** 纸面四色是印自带的（羊皮纸底＋ availability 墨色），不跟宿主主题跑——
 *  深色下宿主变量会把纸染黑，故这里写死定稿值；字族仍继承（定稿零字族）。 */
const PAPER_BG = '#fdfaf2';
const PAPER_EDGE = '#e6d9bd';
const LABEL_MAIN = '#42506b';
const LABEL_SUB = '#4b4335';



const S = {
  /** 外框（`.frame`）：绝对铺满，挂糙边滤镜；纸压在它上面，只露一圈。 */
  frame: {
    position: 'absolute',
    inset: 0,
    borderRadius: '1em',
    zIndex: 1,
    filter: 'url(#' + ROUGH_FRAME + ')',
  } as React.CSSProperties,
  /** 四角铆钉（只有插件章的整面金属带有）。 */
  rivet: {
    position: 'absolute',
    width: '0.69em',
    height: '0.69em',
    borderRadius: '50%',
  } as React.CSSProperties,
  /** 卷轴根：padding 就是外框厚度（.frame 铺满、纸在 padding 内）。 */
  scroll: {
    position: 'relative',
    fontSize: '1em',
    lineHeight: 1.7,
    borderRadius: '0.875em',
    padding: '1.125em',
  } as React.CSSProperties,
  /** 纸（`.paper`）：纯纸，无纹理。 */
  paper: {
    position: 'relative',
    zIndex: 2,
    borderRadius: '0.25em',
    background: PAPER_BG,
    boxShadow: '0 1px 3px #3d241052, 0 0 0 1px ' + PAPER_EDGE + ', inset 0 1px 0 #fffefb',
  } as React.CSSProperties,
  inner: {
    position: 'relative',
    // 上下内垫同值（28px）：底比顶多 2px 会读成“底部空一截”，三段内容也不需要对位字基线。
    padding: '1.75em 2em',
  } as React.CSSProperties,
  head: { textAlign: 'center', marginBottom: '0.5em' } as React.CSSProperties,
  /** 档位语（标题下那一行）：档位字退役，改说档位话（金＝精雕细琢中／银＝全打通中／铜＝基础建设中）。 */
  tier: {
    marginTop: '0.4375em',
    fontSize: '0.66em',
    letterSpacing: '0.42em',
    textIndent: '0.42em',
    fontWeight: 600,
  } as React.CSSProperties,
  orn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5625em',
    margin: '1em 0 1.25em',
  } as React.CSSProperties,
  ornLine: { flex: '1 1 auto', height: 1 } as React.CSSProperties,
  ornDot: { width: '0.3125em', height: '0.3125em', transform: 'rotate(45deg)', opacity: 0.75, flex: '0 0 auto' } as React.CSSProperties,
  block: { margin: '0 0 0.9375em' } as React.CSSProperties,
  blockDivided: { margin: '0 0 0.9375em', paddingTop: '0.9375em', borderTop: '1px solid ' + PAPER_EDGE } as React.CSSProperties,
  blockLast: { margin: 0 } as React.CSSProperties,
  label: {
    fontSize: '0.66em',
    letterSpacing: '0.34em',
    textIndent: '0.34em',
    fontWeight: 600,
    marginBottom: '0.375em',
  } as React.CSSProperties,
  text: {
    margin: 0,
    fontSize: '0.84em',
    lineHeight: 1.9,
    letterSpacing: '0.02em',
    color: LABEL_SUB,
  } as React.CSSProperties,
  /** 卷轴浮层：卡片内绝对定位（卡片 `S.card` 是 relative 定位祖先），上沿悬在三枚章之下、左右各留半 em——
   *  不是 modal：无遮罩、不锁滚动，点章切换、点「关闭」收起。 */
  dialog: { position: 'absolute', left: '0.5em', right: '0.5em', top: '8.8em', zIndex: 20, display: 'flex', justifyContent: 'center', pointerEvents: 'auto' } as React.CSSProperties,
  /** 浮层内框：**宽随内容**（`max-content`，正好包住最长那一行；不是固定 25em 那块大纸）。
   *  `maxWidth:100%` 是窄卡的兜底（收满可用宽、永不捅破卡片），此时长行换行、高度自己长。
   *  挂卷轴展开动画（从上而下舒卷，240ms；纯声明式，无 hook，纯函数可直测）。 */
  popInner: { position: 'relative', width: 'max-content', maxWidth: '100%', transformOrigin: '50% 0', animation: UNROLL_ANIMATION + ' 240ms ease-out' } as React.CSSProperties,
  close: {
    position: 'absolute',
    right: '-0.375em',
    top: '-2.25em',
    font: 'inherit',
    fontSize: '0.75em',
    color: '#fff',
    background: '#241f19b3',
    border: 'none',
    borderRadius: '0.875em',
    padding: '0.25em 0.875em',
    cursor: 'pointer',
  } as React.CSSProperties,
} as const;

/** 卷轴要显示的东西：角色 × 档位 ＋ 标题 ＋ 三段文案。 */
export interface SealScrollProps {
  /** 角色（技能章／HELP 章／插件章；决定外框是不是整面金属带、有没有铆钉）。 */
  readonly role: SealRole;
  /** 档位（决定外框材质）。 */
  readonly tier: SealTier;
  /** 标题（印文那一行，如 `技能`／`饼干记账 HELP`／`插件`）。 */
  readonly title: string;
  /** 进展。 */
  readonly progress: string;
  /** 状态。 */
  readonly status: string;
  /** 计划。 */
  readonly plan: string;
}

/** 外框专有的内阴影（随档；底色与边线不在这张表里，从调色板来）。
 *  外框比印面大得多，同一圈金色在小章上够、在几百像素的框上会被稀释，故这一层是外框自己的排法。 */
const FRAME_INSET: Record<SealScrollProps['role'], Record<SealScrollProps['tier'], string>> = {
  skill: {
    copper: 'inset 0 0 0 1px #f8f1e2aa, inset 0 2px 0 #ffffff26, inset 0 -3px 6px #0000004d',
    silver: 'inset 0 0 0 1px #fff, inset 0 2px 0 #ffffff2e, inset 0 -3px 6px #0000004d',
    gold: 'inset 0 0 0 1px #fff8, inset 0 2px 0 #ffffff33, inset 0 -3px 6px #0000004d',
  },
  help: {
    copper: 'inset 0 2px 0 #ffffff26, inset 0 -3px 6px #0000004d',
    silver: 'inset 0 2px 0 #ffffff2e, inset 0 -3px 6px #0000004d',
    gold: 'inset 0 2px 0 #ffffff33, inset 0 -3px 6px #0000004d',
  },
  plugin: {
    copper: 'inset 0 1px 0 #d99a5e88, inset 0 -2px 5px #0006, 0 0 0 1px #5e2c12, inset 0 2px 0 #ffffff26',
    silver: 'inset 0 1px 0 #ffffffdd, inset 0 -2px 5px #0005, 0 0 0 1px #6f767c, inset 0 2px 0 #ffffff33',
    gold: 'inset 0 1px 0 #fff8d8dd, inset 0 -2px 5px #0005, 0 0 0 1px #8a6a15',
  },
};

/** 取一档材质：底色与边线从调色板来（与印共用一份取值），外框专有的内阴影与铆钉在这里合成。 */
function materialOf(role: SealScrollProps['role'], tier: SealScrollProps['tier']): Material {
  const palette = SEAL_PALETTE[role]?.[tier];
  if (palette === undefined) throw new Error('未知的印档：' + role + '／' + tier);
  return {
    frame: { background: palette.background, ...(palette.border === undefined ? {} : { border: palette.border }), boxShadow: FRAME_INSET[role][tier] },
    accent: palette.accent,
    ruler: palette.ruler,
    rivet: role === 'plugin' ? SEAL_RIVET[tier] : undefined,
  };
}

/** 糙边滤镜定义：两条分开（印用 edge，卷轴外框用 frame），每页只挂一次。
 *
 * 挂在文档任意位置都行（`width/height=0` 不占位），同页重复挂会撞 id。
 * 印章交互（悬停上浮高亮／按压回缩／焦点环／级别 tooltip）也住这里：scoped 类名，纯 CSS、无 hook。
 * 悬停高亮须把糙边 url 原样带上（filter 单属性，另写会把糙边冲掉）。 */
export function SealFilterDefs(): React.ReactElement {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement('style', null,
      '.dshLifeSealBtn{position:relative;transition:transform 160ms ease-out,filter 160ms ease-out}' +
      '.dshLifeSealBtn:hover{transform:translateY(-2px);filter:url(#' + ROUGH_EDGE + ') brightness(1.12)}' +
      '.dshLifeSealBtn:active{transform:translateY(0) scale(.96)}' +
      '.dshLifeSealBtn:focus-visible{outline:2px solid #f5d97a;outline-offset:2px}' +
      '.dshLifeSealBtn::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#241f19ee;color:#f8f1e2;font-size:.72em;letter-spacing:.1em;padding:.4em .9em;border-radius:.5em;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 150ms ease;z-index:30}' +
      '.dshLifeSealBtn:hover::after,.dshLifeSealBtn:focus-visible::after{opacity:1}' +
      // 面板那套交互 CSS 给 [data-ilife-press] 加了 overflow:hidden（按压反馈要裁），
      // 可绦带那枚关闭钮的菱形与两条飘尾本来就骑在按钮方框外——一裁就成"被正方形切掉"。
      // 这一条专给关闭钮开个口子（两属性选择器，权重高过面板那条）。
      '[data-ilife-press][data-ilife-close]{overflow:visible}' +
      // 气泡改挂**槽位包裹层**（不过糙边滤镜的那一层）：挂在印本体里，字会被滤镜抖糊；
      // 抬到 z-index 60，并让整枚槽位在悬停时一起抬起来，免得被卡片里后面的内容盖住。
      '[data-tip]{position:relative}' +
      '[data-tip]::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#241f19ee;color:#f8f1e2;font-size:.72em;letter-spacing:.1em;padding:.4em .9em;border-radius:.5em;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 150ms ease;z-index:60}' +
      '[data-tip]:hover::after,[data-tip]:focus-within::after{opacity:1}' +
      // 槽位里那枚印不再自带气泡（同一句话会在包裹层上出一次）
      '.dshLifeSealSlot .dshLifeSealBtn::after{content:none}'),
    React.createElement(
    'svg',
    { width: 0, height: 0, 'aria-hidden': true, focusable: false, style: { position: 'absolute' } },
    React.createElement(
      'filter',
      { id: ROUGH_EDGE, key: ROUGH_EDGE },
      React.createElement('feTurbulence', { baseFrequency: 0.9, numOctaves: 2, result: 'n' }),
      React.createElement('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 2.2 }),
    ),
    React.createElement(
      'filter',
      { id: ROUGH_FRAME, key: ROUGH_FRAME, x: '-6%', y: '-6%', width: '112%', height: '112%' },
      // 0.6 ＋ 3 倍频：一条低频底噪叠两层细纹 ⇒ 金边碎成大小不一的斑块（颗粒感、斑点感）。
      // 位移 6.5 让四边四角碎到同一档；斑块感来自那条低频，纯高频（0.9/2）只会得到一条细金粉线。
      React.createElement('feTurbulence', { baseFrequency: 0.6, numOctaves: 3, result: 'n' }),
      React.createElement('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 6.5 }),
    ),
    // 中等件（轴杆／纸筒／绦带）：同一套湍流，位移取 3.2。
    React.createElement(
      'filter',
      { id: ROUGH_METAL, key: ROUGH_METAL, x: '-8%', y: '-14%', width: '116%', height: '128%' },
      React.createElement('feTurbulence', { baseFrequency: 0.9, numOctaves: 2, result: 'n' }),
      React.createElement('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 3.2 }),
    ),
    // 印泥：抖动（毛边）→ 洇开（纸上晕）→ **噪点蒙版**（吃墨不匀，有几处纸没吃透）。
    // 最后那步是「像印泥」的关键：平涂＋高光只会读成塑料，真正像泥的是浓淡不匀的覆盖率。
    React.createElement(
      'filter',
      { id: ROUGH_INK, key: ROUGH_INK, x: '-25%', y: '-25%', width: '150%', height: '150%' },
      React.createElement('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 2, result: 'n' }),
      React.createElement('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 2.2, result: 'd' }),
      React.createElement('feGaussianBlur', { in: 'd', stdDeviation: 0.3, result: 'b' }),
      React.createElement('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.75, numOctaves: 3, result: 'g' }),
      // 覆盖率底数 .35：不满不满也不到透——印泥是「吃墨不匀」，不是「纱网」。
      React.createElement('feColorMatrix', { in: 'g', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .7 .45 0 0 .35', result: 'mask' }),
      React.createElement('feComposite', { in: 'b', in2: 'mask', operator: 'in' }),
    ),
    ),
  );
}

/** 一卷：外框材质 ＋ 纯纸 ＋ 进展／状态／计划三段。 */
export function SealScroll(props: SealScrollProps): React.ReactElement {
  const material = materialOf(props.role, props.tier);
  // 【已还原】框面噪点层（grain/fleck）撤掉：它们整体提亮了红底，框色与原版不一致。
  // 需要“碎金”效果时再按需加回（原型留档见 .scratch）。
  const frameChildren =
    props.role === 'plugin' && material.rivet
      ? [
          React.createElement('span', { key: 'tl', style: { ...S.rivet, ...material.rivet, left: '0.4375em', top: '0.4375em' } }),
          React.createElement('span', { key: 'tr', style: { ...S.rivet, ...material.rivet, right: '0.4375em', top: '0.4375em' } }),
          React.createElement('span', { key: 'bl', style: { ...S.rivet, ...material.rivet, left: '0.4375em', bottom: '0.4375em' } }),
          React.createElement('span', { key: 'br', style: { ...S.rivet, ...material.rivet, right: '0.4375em', bottom: '0.4375em' } }),
        ]
      : [];
  const line = (key: string, dir: string): React.ReactElement =>
    React.createElement('span', {
      key,
      style: { ...S.ornLine, background: 'linear-gradient(' + dir + 'deg,#0000,' + material.ruler + ')' },
    });
  const block = (key: string, name: string, text: string, divided: boolean, last = false): React.ReactElement =>
    React.createElement(
      'div',
      { key, style: last ? (divided ? { ...S.blockLast, paddingTop: '0.9375em', borderTop: '1px solid ' + PAPER_EDGE } : S.blockLast) : divided ? S.blockDivided : S.block },
      React.createElement('div', { style: { ...S.label, color: material.accent } }, name),
      React.createElement('p', { style: S.text }, text),
    );
  /** 纸面字排：定稿件直出五件。 */
  const parts = paperParts({
    tierKey: props.tier,
    tierText: TIER_TEXT[props.tier],
    progress: props.progress,
    status: props.status,
    plan: props.plan,
    accent: material.accent,
    ruler: material.ruler,
    paperEdge: PAPER_EDGE,
    styles: {
      head: S.head, paper: S.paper, tier: S.tier, orn: S.orn, ornLine: S.ornLine, ornDot: S.ornDot,
      block: S.block, blockDivided: S.blockDivided, blockLast: S.blockLast, label: S.label, text: S.text,
    },
  });
  return React.createElement(
    'div',
    { style: S.scroll },
    React.createElement('div', { style: { ...S.frame, ...material.frame } }, ...frameChildren),
    React.createElement(
      'div',
      { style: parts.paper === undefined ? S.paper : parts.paper },
      React.createElement(
        'div',
        { style: S.inner },
        React.createElement(
          'div',
          { style: parts.head === undefined ? S.head : parts.head },
          React.createElement(SealStamp, { role: props.role, tier: props.tier, label: props.title }),
          parts.tier,
        ),
        parts.orn,
        parts.body,
      ),
    ),
  );
}

/** 卷轴浮层：popover ＋ 点击别处关闭 ＋ 卷轴展开动画 ＋ 关闭。`open` 为假时不渲染（纯函数，不收自己的状态）。 */
export function SealScrollDialog(
  props: SealScrollProps & {
    readonly open: boolean;
    readonly onClose: () => void;
    /** 锚点覆盖（面板传：贴在点击那枚章的下方）；缺席＝整卡居中那套老样子。 */
    readonly anchor?: React.CSSProperties | undefined;
  },
): React.ReactElement | null {
  if (!props.open) return null;
  const scroll: SealScrollProps = {
    role: props.role,
    tier: props.tier,
    title: props.title,
    progress: props.progress,
    status: props.status,
    plan: props.plan,
  };
  return React.createElement(
    React.Fragment,
    null,
    // 收卷层：全屏透明，只收“点别处即关”，不 dim、不锁滚动（无 role，不算 modal 遮罩）。
    React.createElement('div', { style: { position: 'fixed', inset: 0, zIndex: 9, background: 'transparent' }, 'aria-hidden': true, onClick: props.onClose }),
    React.createElement(
      'div',
      { style: props.anchor === undefined ? S.dialog : { ...S.dialog, ...props.anchor }, role: 'dialog', 'aria-modal': false, 'aria-label': props.title },
      // 展开关键帧住在这里（scoped 名，宿主无样式表可借时唯一一条纯声明式动画路）。
      React.createElement('style', null, '@keyframes ' + UNROLL_ANIMATION + '{from{opacity:0;transform:translateY(-10px) scaleY(.7)}to{opacity:1;transform:none}}'),
      React.createElement(
        'div',
        { style: S.popInner },
        // #1160 T1：按压收缩＋焦点双环（卷轴浮层渲染在卡片内，样式由卡片那枚 <style> 罩住；印章本体仍豁免）。
        (() => {
          const look = closeLook(props.tier);
          // zIndex 20：关闭钮要压在卷轴（框＋纸）之上，否则骑在边上的那几档会被红框吃掉半边。
          return React.createElement('button', { type: 'button', className: 'dshLifeSealBtn', style: { zIndex: 20, ...look.style }, 'data-ilife-press': 'seal-close', 'data-ilife-close': 'tie', onClick: props.onClose }, look.decor ?? null, look.label);
        })(),
        React.createElement(SealScroll, scroll),
      ),
    ),
  );
}
