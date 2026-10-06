/** 卷轴纸面字排 ＋ 关闭钮样子 · **定稿件**（2026-10-06 定档，原型选型期结束）。
 *
 * 定稿形状（逐值锁死，改动须同步 `test/seal-scroll.test.mjs` 与 `test/seal-bundle-1158.test.mjs`）：
 *   纸面：三段紧凑行内（进展／状态／计划），行首一枚朱砂小方印（进／状／计），标签与正文同行基线对齐；
 *       末行吃回 0.5em 行距（不然底比顶空一截）；饰线上距加宽到 `0.5em 0 0.75em`；纸底与头部沿用原样式。
 *   档位语：该档金属渐变压进字里（金＝鎏金／银＝冷银／铜＝暖铜），不再一律金。
 *   关闭钮：右上角斜披的朱砂菱形绦带（正立「收卷」字独立成层），两条飘尾沿菱形两条下边各向底尖收，
 *          各自朝外 26°（左尾朝左下、右尾朝右下）；尾是两层——外层过糙边出毛边，内层纯色芯不受滤镜。
 *
 * 为什么单独一件：`seal-scroll.ts` 已接近告警线（外框／纸／浮层／滤镜都住那里），纸面字排与关闭钮住这里。
 * 本件是纯函数：吃 ctx 回五件，不留状态、不取数。原型期的二十余档方案已按「定稿后只留胜出那一档」删除。
 */
import * as React from 'react';
import { SEAL_ROUGH_INK_ID, SEAL_ROUGH_METAL_ID } from './seal-scroll.js';

/** 关闭钮的样子：样式 ＋ 字面 ＋ 可选装饰件。 */
export interface CloseLook {
  readonly style: React.CSSProperties;
  /** 字面（可为节点：绦带那档要把字反转回正立）。 */
  readonly label: React.ReactNode;
  readonly decor?: React.ReactNode;
}

/** 材质底层：**糙边滤镜只挂这一层**——文字住在它外面，所以字是清晰的（照插件章「金属带＋印文」的老做法）。 */
function bgLayer(style: React.CSSProperties, children?: React.ReactNode): React.ReactElement {
  return React.createElement('span', { 'aria-hidden': true, style: { position: 'absolute', inset: 0, ...style } }, children ?? null);
}

/** 清晰字面：压在材质层之上，不参与任何滤镜。 */
function crisp(text: React.ReactNode, style?: React.CSSProperties): React.ReactElement {
  return React.createElement('span', { style: { position: 'relative', zIndex: 1, ...style } }, text);
}

/** 档位语三档金属（鎏金／冷银／暖铜）：主色＋渐变（`backgroundClip:text` 描出金属光泽）。 */
export const TIER_METAL: Record<string, { readonly flat: string; readonly gradient: string }> = {
  gold: { flat: '#b8912a', gradient: 'linear-gradient(180deg,#f6e27a 0%,#d9b53c 45%,#a5811b 100%)' },
  silver: { flat: '#8b959d', gradient: 'linear-gradient(180deg,#f7fafc 0%,#c3ccd3 45%,#8b959d 100%)' },
  copper: { flat: '#a8663a', gradient: 'linear-gradient(180deg,#f0bd8e 0%,#c07b45 45%,#8a4a24 100%)' },
};
/** 档位金属边（铜／银／金）：章与绦带共用这一份取值。 */
const TIER_EDGE: Record<string, string> = { gold: '#f5d97a', silver: '#d8dee3', copper: '#a5652f' };
const KAI = '"Kaiti SC","KaiTi","STKaiti",serif';

/** 关闭钮（定稿：绦带·飘尾）。右上角一枚斜披 45° 的朱砂菱形，两条飘尾分挂两条下边，尾先画、带后画压住尾根。 */
export function closeLook(tierKey: string): CloseLook {
  const crimson = 'linear-gradient(135deg,#c63d2a 8%,#a32216 50%,#7e1a10)';
  /** 档位金属边（铜／银／金）：绦带**只借这一条**——主体恒朱砂，边随档走，跟章「红底＋金属边」同构。 */
  const edge = TIER_EDGE[tierKey] ?? TIER_EDGE['gold']!;
  const ribbon = bgLayer(
    { borderRadius: '0.375em', background: crimson, boxShadow: '0 2px 8px #3d241066, inset 0 0 0 1px ' + edge + '66', transform: 'rotate(45deg)', filter: 'url(#' + SEAL_ROUGH_METAL_ID + ')' },
    null,
  );
  /** 尾色＝绦带上亮一档的朱砂（悬在纸上也不发灰、不发黑）：两条尾同色。 */
  const TAIL_FILL = 'linear-gradient(180deg,#e8573c 0%,#c33a24 55%,#a52612 100%)';
  /** 飘尾：屏幕坐标（不随菱形旋转）——左尾往左下、右尾往右下（CSS 正角＝尾梢往左）。
   *  两层：外层过糙边滤镜出毛边，内层纯色芯不受滤镜——尾悬在纸上还是悬在暗底上都是同一色。 */
  const loose = (key: string, left: string, deg: number, len: string, top: string): React.ReactElement =>
    React.createElement('span', {
      key, 'aria-hidden': true,
      style: { position: 'absolute', left, top, width: '0.4375em', height: len, transformOrigin: 'top center', transform: 'rotate(' + deg + 'deg)' },
    },
    bgLayer({
      borderRadius: '0 0 0.1875em 0.1875em',
      background: TAIL_FILL,
      // 只留一道暗红描边把尾从纸面/暗底上切出来；**不给金边**——尾只有 6px 宽，
      // 1px 金边被糙边滤镜一搅会把整条尾染成金灰（左尾「不够亮」就是这么来的）。
      boxShadow: '0 0 0 1px ' + edge + '73, 0 1px 3px #00000055',
      filter: 'url(#' + SEAL_ROUGH_METAL_ID + ')',
    }),
    // 纯色芯几乎铺满（只留 0.5px 给毛边），这样尾的观感＝上面那档朱砂，不被滤镜的破洞拉灰。
    React.createElement('span', { 'aria-hidden': true, style: { position: 'absolute', inset: '0.5px', borderRadius: '0 0 0.15625em 0.15625em', background: TAIL_FILL } }));
  return {
    label: crisp('收卷', {
      fontFamily: KAI, fontSize: '0.8125em', letterSpacing: '0.22em', textIndent: '0.22em',
      color: '#f8f1e2', textShadow: '0 1px 2px #000000aa',
    }),
    decor: React.createElement(React.Fragment, null,
      // 尾根压在带面之下（top 取在菱形内），梢头各自朝外：tL +26° ⇒ 尾梢往左，tR −26° ⇒ 尾梢往右。
      loose('tL', 'calc(50% - 0.8125em)', 26, '2em', '2.8125em'),
      loose('tR', 'calc(50% + 0.4375em)', -26, '2em', '2.8125em'),
      ribbon),
    style: {
      boxSizing: 'border-box', padding: 0, position: 'absolute', right: '-1.5em', top: '-1.5em', width: '3.25em', height: '3.25em',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', border: 'none', background: 'transparent',
    },
  };
}

export interface PaperStyles {
  readonly head: React.CSSProperties;
  readonly paper: React.CSSProperties;
  readonly tier: React.CSSProperties;
  readonly orn: React.CSSProperties;
  readonly ornLine: React.CSSProperties;
  readonly ornDot: React.CSSProperties;
  readonly block: React.CSSProperties;
  readonly blockDivided: React.CSSProperties;
  readonly blockLast: React.CSSProperties;
  readonly label: React.CSSProperties;
  readonly text: React.CSSProperties;
}

export interface PaperCtx {
  /** 档位（gold／silver／copper；决定档位语用哪一档金属）。 */
  readonly tierKey: string;
  /** 档位话（金＝精雕细琢中／银＝全打通中／铜＝基础建设中；定义在 `seal-scroll.ts`）。 */
  readonly tierText: string;
  readonly progress: string;
  readonly status: string;
  readonly plan: string;
  /** 印色（材质那一份，固定色）。 */
  readonly accent: string;
  /** 分隔线同族色。 */
  readonly ruler: string;
  /** 纸边色。 */
  readonly paperEdge: string;
  readonly styles: PaperStyles;
}

/** 纸面产出：五件里只有需要覆盖的才给（定稿不覆盖纸底与头部）。 */
export interface PaperParts {
  readonly paper?: React.CSSProperties | undefined;
  readonly head?: React.CSSProperties | undefined;
  readonly tier: React.ReactNode;
  readonly orn: React.ReactNode | null;
  readonly body: React.ReactNode;
}

/** 画一条饰线（方向 90/270 决定渐变朝向；定稿的段上距是 0.5em 0 0.75em）。 */
function ornament(st: PaperStyles, ruler: string): React.ReactNode {
  const line = (key: string, dir: string): React.ReactElement =>
    React.createElement('span', { key, style: { ...st.ornLine, background: 'linear-gradient(' + dir + 'deg,#0000,' + ruler + ')' } });
  return React.createElement('div', { style: { ...st.orn, margin: '0.5em 0 0.75em' } },
    line('l', '90'), React.createElement('i', { style: { ...st.ornDot, background: ruler } }), line('r', '270'));
}

/** 行首那枚朱砂小印（进／状／计）：**两层**——材质层过印那条糙边滤镜（印泥压出来的毛边与斑驳），
 *  字独立成层保持清晰；方块各带一点歪斜（真印章不会次次压得方正）。
 *  外框仍是 0.7em 字／1.6 行高／左右 0.375em 垫——换的是质感，版面逐值不动。 */
function inkMark(name: string): React.ReactElement {
  const tilt = name === '进展' ? -2.4 : name === '状态' ? 1.6 : -1.2;
  return React.createElement('span', {
    style: { position: 'relative', flex: '0 0 auto', fontSize: '0.7em', lineHeight: 1.6, padding: '0 0.375em', transform: 'rotate(' + tilt + 'deg)' },
  },
  // 印泥层：中心偏亮（按下去的那一下）、四周吃墨更深，再压一道内影当「厚」
  React.createElement('span', { 'aria-hidden': true, style: {
    position: 'absolute', inset: 0, borderRadius: '0.1875em',
    // 大红色（真印泥的朱砂）：边上只略微吃墨，不许发暗发褐——一暗就成"过期印泥"。
    background: 'radial-gradient(circle at 36% 30%,#f4593a 0%,#d92b1c 52%,#be1d10 100%)',
    boxShadow: 'inset 0 0 0 0.5px #ffffff2e, inset 0 -1px 2px #00000033',
    filter: 'url(#' + SEAL_ROUGH_INK_ID + ')',
  } },
  // 墨色不匀：三团深浅斑＋一道斜向留白（印泥压不匀、边上吃不到墨的常态）
  React.createElement('span', { 'aria-hidden': true, style: {
    position: 'absolute', inset: 0, borderRadius: 'inherit',
    background: 'radial-gradient(circle at 74% 78%,#00000024 0%,#0000 56%), radial-gradient(circle at 18% 64%,#ffffff33 0%,#0000 46%), radial-gradient(circle at 52% 14%,#ffffff24 0%,#0000 40%), linear-gradient(118deg,#0000 42%,#ffffff1f 52%,#0000 62%)',
  } })),
  // 字层：不参与滤镜（小方印上的字一糊就白做了）
  React.createElement('span', { style: { position: 'relative', color: '#fdf7ea', opacity: 0.95 } }, name.slice(0, 1)));
}

/** 三段：一行紧凑（行首朱砂小方印＋标签＋正文同一基线）。 */
function inlineRows(st: PaperStyles, ctx: PaperCtx): React.ReactNode {
  // 末行吃回半个行距：行高 1.9 会在字形下留 ~6px 半行距，叠在纸底内垫上就是“底比顶空一截”。
  // 实测（像素扫描）：不吃回时 顶 24／底 32；吃回 0.5em 后两端齐。
  const one = (key: string, name: string, text: string, last = false): React.ReactElement =>
    React.createElement(
      'div',
      { key, style: { margin: last ? '0 0 -0.5em' : '0 0 0.5em', display: 'flex', alignItems: 'baseline', gap: '0.5em' } },
      inkMark(name),
      React.createElement('span', { style: { ...st.label, flex: '0 0 auto', display: 'inline', marginBottom: 0, fontSize: '0.8em', color: ctx.accent } }, name + '：'),
      React.createElement('span', { style: { ...st.text, flex: '1 1 auto', display: 'inline', margin: 0, fontSize: '0.9em' } }, text),
    );
  return React.createElement(React.Fragment, null,
    one('progress', '进展', ctx.progress),
    one('status', '状态', ctx.status),
    one('plan', '计划', ctx.plan, true));
}

/** 档位语（一行）：该档金属渐变压进字里。 */
function tierNode(ctx: PaperCtx): React.ReactNode {
  const metal = TIER_METAL[ctx.tierKey] ?? TIER_METAL['gold']!;
  return React.createElement('div', {
    style: {
      ...ctx.styles.tier,
      fontFamily: KAI,
      fontSize: '1.0625em',
      letterSpacing: '0.34em',
      textIndent: '0.34em',
      color: 'transparent',
      backgroundImage: metal.gradient,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
    },
  }, ctx.tierText);
}

/** 组装一件：纸底／头部／档位语／饰线／三段（定稿不覆盖纸底与头部，故两者缺席＝用 `seal-scroll.ts` 的原样式）。 */
export function paperParts(ctx: PaperCtx): PaperParts {
  return {
    paper: undefined,
    head: undefined,
    tier: tierNode(ctx),
    orn: ornament(ctx.styles, ctx.ruler),
    body: inlineRows(ctx.styles, ctx),
  };
}
