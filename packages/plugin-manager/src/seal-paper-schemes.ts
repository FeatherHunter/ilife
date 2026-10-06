/** 卷轴纸面字排方案 · **原型选型件（临时）**。
 *
 * 为什么单独一件：选型期要一次看十几个方向，全塞进 `seal-scroll.ts` 会把生产组件撑过告警线
 * （实测 547 行 > 350）。故所有方案住这里，`seal-scroll.ts` 只留一个委托点。
 * **定稿后只保留胜出那一档，其余全部删除。**（结构纪律：超线即重构；这是原型脚手架，不长期并存。）
 *
 * 本件是纯函数：吃 ctx 回五件（纸底／头部／档位语／饰线／三段），不留状态、不取数。
 */
import * as React from 'react';
import { SEAL_ROUGH_EDGE_ID, SEAL_ROUGH_METAL_ID } from './seal-scroll.js';

/** 纸面字排方案。'classic'＝当前线上形状（缺席即它）。 */
export type PaperScheme =
  | 'classic' | 'vertical' | 'song' | 'kai' | 'monument'
  | 't-bigtier' | 't-notitle' | 't-badge' | 't-left' | 't-vtight'
  | 't-grid' | 't-rail' | 't-cards' | 't-night' | 't-dense'
  | 't-gilt' | 't-cardmix' | 't-vcards' | 't-sealmark' | 't-ductitle' | 't-bignum'
  | 't-verse'
  /** 定稿候选：10 的紧凑行内 ＋ 金色楷书档位语 ＋ 13 的朱砂印泥标签。 */
  | 't-final';

/** 方案要用到的样式（由 `seal-scroll.ts` 传进来，避免两处各写一份取值）。 */
/** 关闭钮原型（原型选型期）：四档都是「把卷轴收起来」这个动作的物化——轴杆／轴头／绦带／卷筒。 */
/** 关闭钮：只留「绦带·飘尾」这一版（3C）。 */
export type CloseVariant = 'classic' | 'tie';

/** 一档关闭钮的样子：样式 ＋ 字面 ＋ 可选装饰件（卷轴「收卷」语汇要的轴头／纸芯等小件）。 */
export interface CloseLook {
  readonly style: React.CSSProperties;
  /** 字面（可为节点：绦带那档要把字反转回正立）。 */
  readonly label: React.ReactNode;
  readonly decor?: React.ReactNode;
}

/** 金属小件（轴头／铆钉用）：一点高光＋内阴影，缩到很小仍读得出是圆的。 */
function knob(style: React.CSSProperties): React.ReactElement {
  return React.createElement('span', { 'aria-hidden': true, style });
}

/** 材质底层：**糙边滤镜只挂这一层**——文字住在它外面，所以字是清晰的（照插件章「金属带＋印文」两层的老做法）。 */
function bgLayer(style: React.CSSProperties, children?: React.ReactNode): React.ReactElement {
  return React.createElement('span', { 'aria-hidden': true, style: { position: 'absolute', inset: 0, ...style } }, children ?? null);
}

/** 清晰字面：压在材质层之上，不参与任何滤镜。 */
function crisp(text: React.ReactNode, style?: React.CSSProperties): React.ReactElement {
  return React.createElement('span', { style: { position: 'relative', zIndex: 1, ...style } }, text);
}

const GOLD_TEXT: React.CSSProperties = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg,#f6e27a 0%,#d9b53c 45%,#a5811b 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
};

/** 取一档关闭钮（`classic`＝线上那枚深色胶囊；其余为本轮原型）。 */
export function closeLook(variant: CloseVariant, base: React.CSSProperties): CloseLook {
  if (variant === 'tie') {
    // 收卷·绦带（3C 定稿版）：右上角一枚斜披的朱砂菱形绦带（材质层过糙边、圆点已去、字独立成层正立清晰），
    // 两条飘尾分挂菱形两条下边——**左下边一条往左下垂、右下边一条往右下垂**；尾先画、带后画，带面压住尾根不留缝。
    const crimson = 'linear-gradient(135deg,#c63d2a 8%,#a32216 50%,#7e1a10)';
    const ribbon = bgLayer(
      { borderRadius: '0.375em', background: crimson, boxShadow: '0 2px 8px #3d241066, inset 0 0 0 1px #f5d97a66', transform: 'rotate(45deg)', filter: 'url(#' + SEAL_ROUGH_METAL_ID + ')' },
      null,
    );
    /** 尾色＝绦带上亮一档的朱砂（悬在纸上也不发灰、不发黑）：两条尾同色，不许一条偏金、一条偏暗红。 */
    const TAIL_FILL = 'linear-gradient(180deg,#e8573c 0%,#c33a24 55%,#a52612 100%)';
    /** 飘尾：屏幕坐标（不随菱形旋转）——左尾往左下、右尾往右下，两条对外张开（CSS 正角＝尾梢往左）。
     *  两层：外层过糙边滤镜出毛边，内层纯色芯不受滤镜像影响——尾悬在纸上还是悬在暗底上都是同一色，
     *  不会因背后是纸而被穿出一片浅斑（照「材质层＋清晰层」的老做法）。 */
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
        boxShadow: '0 0 0 1px #6d150c40, 0 1px 3px #00000055',
        filter: 'url(#' + SEAL_ROUGH_METAL_ID + ')',
      }),
      // 纯色芯几乎铺满（只留 0.5px 给毛边），这样尾的观感＝上面那档朱砂，不被滤镜的破洞拉灰。
      React.createElement('span', { 'aria-hidden': true, style: { position: 'absolute', inset: '0.5px', borderRadius: '0 0 0.15625em 0.15625em', background: TAIL_FILL } }));
    return {
      label: crisp('收卷', {
        fontFamily: '"Kaiti SC","KaiTi","STKaiti",serif', fontSize: '0.8125em', letterSpacing: '0.22em', textIndent: '0.22em',
        color: '#f8f1e2', textShadow: '0 1px 2px #000000aa',
      }),
      decor: React.createElement(React.Fragment, null,
        // 尾根压在带面之下（top 取在菱形内），梢头各自朝外：tL +26° ⇒ 尾梢往左，tR −26° ⇒ 尾梢往右。
        // 两条尾沿菱形下边各向底尖挪 0.3125em（左尾往右下、右尾往左下各 45°），挪完仍压在带面之下。
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
  return { label: '关闭', style: base };
}

export interface PaperSchemeStyles {
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

export interface PaperSchemeCtx {
  readonly scheme: PaperScheme;
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
  readonly styles: PaperSchemeStyles;
}

/** 方案产出：五件里只有需要覆盖的才给。 */
export interface PaperSchemeParts {
  /** 纸底覆盖（缺席＝原纸）。 */
  readonly paper?: React.CSSProperties | undefined;
  /** 头部覆盖（缺席＝原头部）。 */
  readonly head?: React.CSSProperties | undefined;
  /** 档位语节点。 */
  readonly tier: React.ReactNode;
  /** 饰线节点（null＝本方案无饰线）。 */
  readonly orn: React.ReactNode | null;
  /** 三段。 */
  readonly body: React.ReactNode;
}

const KAI = '"Kaiti SC","KaiTi","STKaiti",serif';

/** 档位语三档金属（鎏金／银／铜）：主色＋渐变（`backgroundClip:text` 描出金属光泽）。
 *  金＝鎏金（暖金到深金）；银＝冷银（高光偏蓝灰，不发灰脏）；铜＝暖铜（橘铜到焦铜）。 */
export const TIER_METAL: Record<string, { readonly flat: string; readonly gradient: string }> = {
  gold: { flat: '#b8912a', gradient: 'linear-gradient(180deg,#f6e27a 0%,#d9b53c 45%,#a5811b 100%)' },
  silver: { flat: '#8b959d', gradient: 'linear-gradient(180deg,#f7fafc 0%,#c3ccd3 45%,#8b959d 100%)' },
  copper: { flat: '#a8663a', gradient: 'linear-gradient(180deg,#f0bd8e 0%,#c07b45 45%,#8a4a24 100%)' },
};
const SONG = '"Songti SC","STSong","SimSun",serif';
const RED = '#b73124';

/** 画一条饰线（方向 90/270 决定渐变朝向）。 */
function ornament(st: PaperSchemeStyles, ruler: string, gap?: string): React.ReactNode {
  const line = (key: string, dir: string): React.ReactElement =>
    React.createElement('span', { key, style: { ...st.ornLine, background: 'linear-gradient(' + dir + 'deg,#0000,' + ruler + ')' } });
  const base = gap === undefined ? st.orn : { ...st.orn, margin: gap };
  return React.createElement('div', { style: base }, line('l', '90'), React.createElement('i', { style: { ...st.ornDot, background: ruler } }), line('r', '270'));
}

/** 三段的常规形态（标签＋正文，可逐段给覆盖）。 */
function blocks(
  st: PaperSchemeStyles,
  ctx: PaperSchemeCtx,
  opts: { readonly labelColor?: string; readonly divided?: boolean; readonly gap?: string; readonly size?: string; readonly lineHeight?: number; readonly family?: string } = {},
): React.ReactNode {
  const divided = opts.divided !== false;
  const one = (key: string, name: string, text: string, isLast: boolean): React.ReactElement => {
    const sep = '1px solid ' + ctx.paperEdge;
    const style: React.CSSProperties = isLast
      ? (divided ? { ...st.blockLast, paddingTop: '0.625em', borderTop: sep } : st.blockLast)
      : (divided ? { ...st.block, paddingTop: '0.625em', borderTop: sep } : st.block);
    return React.createElement(
      'div',
      { key, style: opts.gap === undefined ? style : { ...style, margin: opts.gap } },
      React.createElement('div', { style: { ...st.label, color: opts.labelColor ?? ctx.accent } }, name),
      React.createElement('p', { style: { ...st.text, fontSize: opts.size ?? '0.875em', lineHeight: opts.lineHeight ?? 1.75, fontFamily: opts.family } }, text),
    );
  };
  return React.createElement(
    React.Fragment,
    null,
    one('progress', '进展', ctx.progress, false),
    one('status', '状态', ctx.status, false),
    one('plan', '计划', ctx.plan, true),
  );
}

/** 三张小卡（横排）。 */
function smallCards(st: PaperSchemeStyles, ctx: PaperSchemeCtx, vertical = false): React.ReactNode {
  const one = (key: string, name: string, text: string): React.ReactElement => {
    const inner = [
      React.createElement('div', { key: 'lb', style: { ...st.label, textIndent: '0', letterSpacing: '0.2em', marginBottom: '0.375em', color: ctx.accent } }, name),
      React.createElement('p', { key: 'tx', style: { ...st.text, margin: 0, fontSize: '0.8em', lineHeight: 1.6 } }, text),
    ];
    return React.createElement(
      'div',
      { key, style: { flex: '1 1 0', background: '#fffdf6', border: '1px solid ' + ctx.paperEdge, borderRadius: '0.5em', padding: '0.75em 0.5em', textAlign: 'center' as const } },
      vertical
        ? React.createElement('div', { style: { writingMode: 'vertical-rl', height: '5.5em', margin: '0 auto', width: 'fit-content' } }, ...inner)
        : inner,
    );
  };
  return React.createElement(
    'div',
    { style: { display: 'flex', gap: '0.75em', marginTop: '0.25em' } },
    one('progress', '进展', ctx.progress),
    one('status', '状态', ctx.status),
    one('plan', '计划', ctx.plan),
  );
}

/** 一行紧凑（标签与正文同一行）。 */
function inlineRows(st: PaperSchemeStyles, ctx: PaperSchemeCtx, mark?: boolean, skipProgress = false): React.ReactNode {
  // 末行吃回半个行距：行高 1.9 会在字形下留 ~6px 半行距，叠在纸底内垫上就是“底比顶空一截”。
  // 实测（像素扫描）：不吃回时 顶 24／底 32；吃回 0.5em 后两端齐。
  const one = (key: string, name: string, text: string, last = false): React.ReactElement =>
    React.createElement(
      'div',
      { key, style: { margin: last ? '0 0 -0.5em' : '0 0 0.5em', display: 'flex', alignItems: 'baseline', gap: '0.5em' } },
      mark
        ? React.createElement('span', { style: { flex: '0 0 auto', background: RED, color: '#f8f1e2', fontSize: '0.7em', lineHeight: 1.6, padding: '0 0.375em', borderRadius: '0.1875em' } }, name.slice(0, 1))
        : null,
      React.createElement('span', { style: { ...st.label, flex: '0 0 auto', display: 'inline', marginBottom: 0, fontSize: '0.8em', color: ctx.accent } }, mark ? name + '：' : name + '：'),
      React.createElement('span', { style: { ...st.text, flex: '1 1 auto', display: 'inline', margin: 0, fontSize: '0.9em' } }, text),
    );
  return React.createElement(
    React.Fragment,
    null,
    skipProgress ? null : one('progress', '进展', ctx.progress),
    one('status', '状态', ctx.status),
    one('plan', '计划', ctx.plan, true),
  );
}

/** 竖排三列（height 给定高度）。 */
function verticalCols(st: PaperSchemeStyles, ctx: PaperSchemeCtx, height: string): React.ReactNode {
  const col = (key: string, name: string, text: string): React.ReactElement =>
    React.createElement(
      'div',
      { key, style: { margin: '0 0 0 0.875em' } },
      React.createElement('span', { style: { display: 'inline-block', background: RED, color: '#f8f1e2', fontSize: '0.75em', width: '1.375em', height: '1.375em', lineHeight: '1.375em', textAlign: 'center', borderRadius: '0.1875em', margin: '0 0 0.5em' } }, name.slice(0, 1)),
      React.createElement('p', { style: { ...st.text, fontFamily: SONG, fontSize: '0.875em', lineHeight: 1.9, letterSpacing: '0.08em', margin: 0 } }, text),
    );
  return React.createElement(
    'div',
    { style: { writingMode: 'vertical-rl', height, margin: '0 auto', width: 'fit-content' } },
    col('progress', '进展', ctx.progress),
    col('status', '状态', ctx.status),
    col('plan', '计划', ctx.plan),
  );
}

/** 档位语（一行）：各方案第一眼。 */
function tierNode(ctx: PaperSchemeCtx): React.ReactNode {
  const st = ctx.styles;
  const t = ctx.tierText;
  if (ctx.scheme === 't-notitle') return React.createElement('div', { style: { ...st.tier, fontFamily: KAI, fontSize: '1.25em', letterSpacing: '0.2em', textIndent: '0.2em', marginTop: '0.375em', color: '#7e2f1d' } }, t);
  if (ctx.scheme === 't-badge') return React.createElement('div', { style: { ...st.tier, marginTop: '0.625em' } }, React.createElement('span', { style: { display: 'inline-block', background: RED, color: '#f8f1e2', fontSize: '0.8125em', letterSpacing: '0.3em', textIndent: '0.3em', fontWeight: 700, borderRadius: '1em', padding: '0.375em 1.1em' } }, t));
  if (ctx.scheme === 't-left') return React.createElement('div', { style: { ...st.tier, fontSize: '0.9em', textAlign: 'left' as const, textIndent: '0', color: ctx.accent } }, t);
  if (ctx.scheme === 't-night') return React.createElement('div', { style: { ...st.tier, fontSize: '1em', color: '#e3c565' } }, t);
  if (ctx.scheme === 't-gilt') return React.createElement('div', { style: { ...st.tier, fontFamily: KAI, fontSize: '1.0625em', letterSpacing: '0.34em', textIndent: '0.34em', color: '#b8912a' } }, t);
  if (ctx.scheme === 't-bignum' || ctx.scheme === 't-cardmix' || ctx.scheme === 't-vcards' || ctx.scheme === 't-sealmark') return React.createElement('div', { style: { ...st.tier, fontSize: '0.9375em', color: ctx.accent } }, t);
  if (ctx.scheme === 't-verse') return React.createElement('div', { style: { ...st.tier, fontFamily: SONG, fontSize: '1.125em', letterSpacing: '0.24em', textIndent: '0.24em', color: '#7e2f1d' } }, t);
  if (ctx.scheme === 't-final') {
    const metal = TIER_METAL[ctx.tierKey] ?? TIER_METAL['gold']!;
    return React.createElement('div', {
      style: {
        ...st.tier,
        fontFamily: KAI,
        fontSize: '1.0625em',
        letterSpacing: '0.34em',
        textIndent: '0.34em',
        // 鎏金／银／铜：底色渐变裁进字里（铜金色随档走，不再一律金）
        color: 'transparent',
        backgroundImage: metal.gradient,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
      },
    }, t);
  }
  if (ctx.scheme === 't-vtight') return React.createElement('div', { style: { ...st.tier, fontSize: '0.8em', color: ctx.accent } }, t);
  return React.createElement('div', { style: { ...st.tier, fontSize: '0.9em', color: ctx.accent } }, t);
}

/** 头部（双题并排那一档要改排法）。 */
function headNode(ctx: PaperSchemeCtx): React.CSSProperties | undefined {
  if (ctx.scheme === 't-ductitle') return { ...ctx.styles.head, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75em', flexWrap: 'wrap' as const, textAlign: 'center' as const };
  if (ctx.scheme === 't-left') return { ...ctx.styles.head, textAlign: 'left' as const };
  return undefined;
}

/** 饰线（撤饰线那一档返回 null）。 */
function ornNode(ctx: PaperSchemeCtx): React.ReactNode | null {
  const st = ctx.styles;
  if (ctx.scheme === 't-notitle' || ctx.scheme === 't-cards' || ctx.scheme === 't-cardmix' || ctx.scheme === 't-vcards' || ctx.scheme === 't-gilt') return null;
  if (ctx.scheme === 't-ductitle') return ornament(st, ctx.ruler, '0.375em 0 0.5em');
  if (ctx.scheme === 't-dense' || ctx.scheme === 't-bigtier' || ctx.scheme === 't-sealmark' || ctx.scheme === 't-bignum' || ctx.scheme === 't-final') return ornament(st, ctx.ruler, '0.5em 0 0.75em');
  return ornament(st, ctx.ruler);
}

/** 三段（各方案）。 */
function bodyNode(ctx: PaperSchemeCtx): React.ReactNode {
  const st = ctx.styles;
  switch (ctx.scheme) {
    case 'song':
      return blocks(st, ctx, { size: '0.875em', lineHeight: 1.75, family: SONG });
    case 'kai': {
      const one = (key: string, name: string, text: string): React.ReactElement =>
        React.createElement(
          'div',
          { key, style: st.block },
          React.createElement('div', { style: { ...st.label, fontFamily: KAI, letterSpacing: '0.25em', textIndent: '0', color: RED } }, name),
          React.createElement('p', { style: { ...st.text, fontFamily: KAI, fontSize: '0.9375em', lineHeight: 2, textIndent: '2em' } }, text),
        );
      return React.createElement(React.Fragment, null, one('progress', '进展', ctx.progress), one('status', '状态', ctx.status), one('plan', '计划', ctx.plan));
    }
    case 'vertical':
      return verticalCols(st, ctx, '15em');
    case 'monument':
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'div',
          { key: 'progress', style: st.block },
          React.createElement('div', { style: { ...st.label, color: ctx.accent } }, '进展'),
          React.createElement('p', { style: { ...st.text, fontFamily: SONG, fontSize: '1.375em', lineHeight: 1.4 } }, ctx.progress),
        ),
        React.createElement('div', { key: 'status', style: { ...st.block, paddingTop: '0.625em', borderTop: '1px solid ' + ctx.paperEdge } }, React.createElement('div', { style: { ...st.label, color: ctx.accent } }, '状态'), React.createElement('p', { style: { ...st.text, fontSize: '0.875em' } }, ctx.status)),
        React.createElement('div', { key: 'plan', style: { ...st.blockLast, paddingTop: '0.625em', borderTop: '1px solid ' + ctx.paperEdge } }, React.createElement('div', { style: { ...st.label, color: ctx.accent } }, '计划'), React.createElement('p', { style: { ...st.text, fontSize: '0.875em' } }, ctx.plan)),
      );
    case 't-bigtier':
      return blocks(st, ctx, { gap: '0 0 0.625em' });
    case 't-notitle':
      return blocks(st, ctx, { labelColor: RED, divided: false, gap: '0 0 0.75em' });
    case 't-badge':
    case 't-left':
    case 't-cardmix':
      if (ctx.scheme === 't-cardmix') {
        return React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'div',
            { key: 'progress', style: { background: '#fffdf6', border: '1px solid ' + ctx.paperEdge, borderRadius: '0.5em', padding: '0.75em 0.875em', margin: '0 0 0.75em' } },
            React.createElement('div', { style: { ...st.label, color: ctx.accent } }, '进展'),
            React.createElement('p', { style: { ...st.text, margin: 0, fontSize: '1.25em', lineHeight: 1.4, fontFamily: SONG } }, ctx.progress),
          ),
          React.createElement(
            'div',
            { key: 'two', style: { display: 'flex', gap: '0.75em' } },
            React.createElement('div', { style: { flex: '1 1 0', background: '#fffdf6', border: '1px solid ' + ctx.paperEdge, borderRadius: '0.5em', padding: '0.625em 0.75em' } }, React.createElement('div', { style: { ...st.label, marginBottom: '0.25em', color: ctx.accent } }, '状态'), React.createElement('p', { style: { ...st.text, margin: 0, fontSize: '0.85em' } }, ctx.status)),
            React.createElement('div', { style: { flex: '1 1 0', background: '#fffdf6', border: '1px solid ' + ctx.paperEdge, borderRadius: '0.5em', padding: '0.625em 0.75em' } }, React.createElement('div', { style: { ...st.label, marginBottom: '0.25em', color: ctx.accent } }, '计划'), React.createElement('p', { style: { ...st.text, margin: 0, fontSize: '0.85em' } }, ctx.plan)),
          ),
        );
      }
      return blocks(st, ctx, { divided: false, gap: '0 0 0.75em' });
    case 't-vtight':
      return verticalCols(st, ctx, '10.5em');
    case 't-grid': {
      const one = (key: string, name: string, text: string, divided: boolean): React.ReactElement =>
        React.createElement(
          'div',
          { key, style: { display: 'flex', gap: '0.75em', alignItems: 'baseline', margin: 0, padding: '0.625em 0', borderTop: divided ? '1px solid ' + ctx.paperEdge : 'none' } },
          React.createElement('div', { style: { ...st.label, flex: '0 0 3.2em', marginBottom: 0, color: ctx.accent } }, name),
          React.createElement('p', { style: { ...st.text, flex: '1 1 auto', margin: 0, fontSize: '0.875em' } }, text),
        );
      return React.createElement(React.Fragment, null, one('progress', '进展', ctx.progress, false), one('status', '状态', ctx.status, true), one('plan', '计划', ctx.plan, true));
    }
    case 't-rail': {
      const one = (key: string, name: string, text: string): React.ReactElement =>
        React.createElement(
          'div',
          { key, style: { position: 'relative', paddingLeft: '1em', margin: '0 0 0.75em' } },
          React.createElement('span', { style: { position: 'absolute', left: '-0.3125em', top: '0.375em', width: '0.5em', height: '0.5em', borderRadius: '50%', background: ctx.accent } }),
          React.createElement('div', { style: { ...st.label, marginBottom: '0.25em', color: ctx.accent } }, name),
          React.createElement('p', { style: { ...st.text, margin: 0, fontSize: '0.875em', lineHeight: 1.7 } }, text),
        );
      return React.createElement('div', { style: { borderLeft: '2px solid #c9a22766', paddingLeft: '0.25em', marginTop: '0.25em' } }, one('progress', '进展', ctx.progress), one('status', '状态', ctx.status), one('plan', '计划', ctx.plan));
    }
    case 't-cards':
      return smallCards(st, ctx, false);
    case 't-vcards':
      return smallCards(st, ctx, true);
    case 't-night':
      return blocks(st, ctx, { labelColor: '#e3c565', gap: '0 0 0.625em' });
    case 't-dense':
      return inlineRows(st, ctx, false);
    case 't-sealmark':
      return inlineRows(st, ctx, true);
    case 't-final':
      return inlineRows(st, ctx, true);
    case 't-gilt': {
      const one = (key: string, name: string, text: string, isLast: boolean): React.ReactElement =>
        React.createElement(
          'div',
          { key, style: isLast ? st.blockLast : { ...st.block, margin: '0 0 0.625em' } },
          React.createElement('div', { style: { ...st.label, color: '#b8912a' } }, name),
          React.createElement('p', { style: { ...st.text, fontSize: '0.9em', lineHeight: 1.75, color: '#3a3227' } }, text),
        );
      return React.createElement(React.Fragment, null, one('progress', '进展', ctx.progress, false), one('status', '状态', ctx.status, false), one('plan', '计划', ctx.plan, true));
    }
    case 't-verse': {
      const one = (key: string, name: string, text: string, last = false): React.ReactElement =>
        React.createElement(
          'div',
          { key, style: { margin: last ? 0 : '0 0 0.75em' } },
          React.createElement('div', { style: { ...st.label, fontFamily: SONG, fontSize: '0.75em', color: '#b8912a' } }, name),
          React.createElement('p', { style: { ...st.text, margin: 0, fontFamily: SONG, fontSize: '1.0625em', lineHeight: 1.7 } }, text),
        );
      return React.createElement(React.Fragment, null, one('progress', '进展', ctx.progress), one('status', '状态', ctx.status), one('plan', '计划', ctx.plan, true));
    }
    case 't-bignum':
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'div',
          { key: 'progress', style: { ...st.block, margin: '0 0 0.625em' } },
          React.createElement('div', { style: { ...st.label, color: ctx.accent } }, '进展'),
          React.createElement('p', { style: { ...st.text, margin: 0, fontFamily: SONG, fontSize: '1.5em', lineHeight: 1.3 } }, ctx.progress),
        ),
        // 大字已展示进展 ⇒ 行内只留状态与计划，不许重复
        inlineRows(st, ctx, false, true),
      );
    case 't-ductitle':
      return blocks(st, ctx, { gap: '0 0 0.625em' });
    default:
      return blocks(st, ctx, { divided: true, gap: '0 0 0.625em' });
  }
}

/** 纸底覆盖（只有暗夜那一档反转；其余恒原纸）。 */
function paperNode(ctx: PaperSchemeCtx): React.CSSProperties | undefined {
  if (ctx.scheme === 't-night') return { ...ctx.styles.paper, background: '#211d17', boxShadow: '0 1px 3px #000a,0 0 0 1px #8a6a3a,inset 0 1px 0 #ffffff14' };
  return undefined;
}

/** 组装一件：纸底／头部／档位语／饰线／三段。 */
export function paperSchemeParts(ctx: PaperSchemeCtx): PaperSchemeParts {
  return {
    paper: paperNode(ctx),
    head: headNode(ctx),
    tier: tierNode(ctx),
    orn: ornNode(ctx),
    body: bodyNode(ctx),
  };
}
