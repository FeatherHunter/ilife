/** 九枚印章 · 纯组件（`title-seal.ts` 的配套件，不认任何一家）。
 *
 * 来源：验收页 `.scratch/seal-9-restore-approve-v1.html` v2（逐值照 `.scratch/seal-9-roles-v6.html`：
 * 技能横条 1／HELP 旧版 2b／插件双铆 3，渐变、边线、铆钉、糙边、字号 padding 全锁）。
 * 印文：技能签统一“技能”、插件签统一“插件”（印面不带档位字，档位只看颜色边线）；
 * HELP 签印产品名加空格加大写 HELP。点击弹卷（`seal-scroll.ts` 的 `SealScrollDialog`，调用方持 open），
 * 故印是 `button`（`aria-haspopup="dialog"`），hover 不出东西。
 *
 * 字号一律 em（16px 下与原型 px 逐值对齐：1.3125em＝21px、1.0625em＝17px）；
 * 糙边走印那条（`SEAL_ROUGH_EDGE_ID`，定义只在 `seal-scroll.ts`，此处引用）。
 *
 * 本件是纯函数：吃 props 回元素树，不留状态、不取数。手写 `React.createElement`（本包 client 束禁 JSX）。
 */

import * as React from 'react';
import { SEAL_ROUGH_EDGE_ID, TIER_TEXT } from './seal-scroll.js';
// 底色与边线从调色板取（与卷轴外框同一份取值）；**下面这三张表是印面自己的排法**，不是共享值。
import { SEAL_PALETTE, SEAL_RIVET } from './seal-palette.js';
import type { SealRole, SealTier } from './config-panel-contract.js';

/** 印的角色与档位见 `config-panel-contract.ts`（定义只那一处，此处引用）。 */

export interface SealStampProps {
  /** 角色：skill＝技能横条／help＝HELP 旧版 2b／plugin＝插件双铆。 */
  readonly role: SealRole;
  /** 档位：copper＝铜／silver＝银／gold＝金。 */
  readonly tier: SealTier;
  /** 印文那一行（技能／某 HELP／插件）。 */
  readonly label: string;
  readonly onSelect?: (() => void) | undefined;
}

/** 三角色底座（字号 padding 随角色，材质随档位）。 */
const ROLE_BASE: Record<SealRole, React.CSSProperties> = {
  skill: { fontSize: '1.0625em', padding: '0.5em 1.75em', letterSpacing: '.14em', borderRadius: '3px' },
  help: { fontSize: '1.0625em', padding: '0.5em 1em', letterSpacing: '.14em', borderRadius: '3px', color: '#f8f1e2' },
  plugin: { position: 'relative', justifyContent: 'center', fontSize: '1.0625em', padding: '0.5em 2em', letterSpacing: '.18em', borderRadius: '4px', color: '#f8f1e2' },
};


/** 印面专有的内圈高光与外发光（随档；底色与边线不在这张表里，从调色板来）。 */
const FACE_EXTRA: Record<SealRole, Record<SealTier, React.CSSProperties>> = {
  skill: {
    copper: { color: '#f8f1e2', boxShadow: 'inset 0 0 0 1px #f8f1e2aa' },
    silver: { color: '#f8f1e2', boxShadow: 'inset 0 0 0 1px #fff' },
    gold: { color: '#fff8e0', boxShadow: 'inset 0 0 0 1px #fff8,0 4px 16px #c9a22755' },
  },
  help: { copper: {}, silver: {}, gold: {} },
  plugin: { copper: {}, silver: {}, gold: {} },
};

/** 插件整面金属带的描边（随档）。 */
const BAND_EDGE: Record<SealTier, string> = {
  copper: 'inset 0 1px 0 #d99a5e88,inset 0 -2px 5px #0006,0 0 0 1px #5e2c12',
  silver: 'inset 0 1px 0 #ffffffdd,inset 0 -2px 5px #0005,0 0 0 1px #6f767c',
  gold: 'inset 0 1px 0 #fff8d8dd,inset 0 -2px 5px #0005,0 0 0 1px #8a6a15,0 3px 14px #c9a22766',
};

/** 一枚印章（button，点章弹卷）。未知组合直接抛错，不静默退化。 */
export function SealStamp(props: SealStampProps): React.ReactElement {
  const palette = SEAL_PALETTE[props.role]?.[props.tier];
  if (palette === undefined) throw new Error('未知印章组合：' + String(props.role) + '/' + String(props.tier));
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontWeight: 800,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    filter: 'url(#' + SEAL_ROUGH_EDGE_ID + ')',
    ...ROLE_BASE[props.role],
    background: palette.background,
    ...(palette.border === undefined ? {} : { border: palette.border }),
    ...FACE_EXTRA[props.role][props.tier],
  };
  // 悬停 tooltip 讲清级别含义（档位话即完善进度）；样式住 `SealFilterDefs` 旁那枚 scoped `<style>`，纯 CSS、无 hook。
  const tierName = props.tier === 'copper' ? '铜' : props.tier === 'silver' ? '银' : '金';
  const buttonProps = { type: 'button' as const, style, className: 'dshLifeSealBtn', 'aria-label': props.label, 'aria-haspopup': 'dialog' as const, 'data-tip': tierName + '章 · ' + TIER_TEXT[props.tier], onClick: props.onSelect };
  if (props.role !== 'plugin') return React.createElement('button', buttonProps, props.label);
  const band: React.CSSProperties = { position: 'absolute', top: '-1px', bottom: '-1px', left: '-1px', right: '-1px', zIndex: 1, borderRadius: '4px', boxShadow: BAND_EDGE[props.tier], background: palette.background };
  const rivet: React.CSSProperties = { position: 'absolute', zIndex: 3, width: '0.5em', height: '0.5em', borderRadius: '50%', top: '50%', transform: 'translateY(-50%)', ...SEAL_RIVET[props.tier] };
  return React.createElement('button', buttonProps,
    React.createElement('span', { style: band, 'data-seal-band': '1' }),
    React.createElement('span', { style: { ...rivet, left: '0.5em' }, 'data-seal-rivet': 'left' }),
    React.createElement('span', { style: { ...rivet, right: '0.5em' }, 'data-seal-rivet': 'right' }),
    React.createElement('span', { style: { position: 'relative', zIndex: 2, textShadow: '0 1px 2px #00000088' } }, props.label),
  );
}