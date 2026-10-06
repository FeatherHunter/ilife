/** 九档材质 · **调色板（token 层）**。
 *
 * 这一层只放「取值」：某档什么底色、什么边线、档位字什么色、分隔线什么色，外加档位级两个金属色
 * 与那两颗铆钉小件。**不放任何一个组件怎么摆**——印面的内圈高光、外框的内阴影、插件带的描边，
 * 都是各自组件的排法（住 `seal-stamp.ts`／`seal-scroll.ts`），它们只从这里取色。
 *
 * 这样分工的好处：
 *   一、同档的章与卷外框必然同底色同边线（唯一来源，不会各漂各的）；
 *   二、哪个组件想换排法（加高光、改内阴影、给角上加铆钉），改自己那份，不必来动这里；
 *   三、接线只有一条：底色／边线是**共享语义**（「这档是什么金属／什么漆」），排法是**本地语义**。
 *
 * 不在这里的：纸面上的绦带朱砂、飘尾亮朱砂、印泥大红——它们与档位无关，也只被 `seal-paper-schemes.ts`
 * 一个消费端用（一份定义、一个消费端），住那个件里就行，不必外借。
 */
import type * as React from 'react';
import type { SealRole, SealTier } from './config-panel-contract.js';

/** 一档的共享取值。插件三档没有边线（整面金属带走描边，见 `seal-stamp.ts` 的 band）。 */
export interface SealPalette {
  readonly background: string;
  readonly border?: string;
  /** 档位字色（纸面标签）。 */
  readonly accent: string;
  /** 分隔线色（纸面饰线）。 */
  readonly ruler: string;
}

/** 九档调色板（3 角色 × 3 档）。键就是契约里的 `role`／`tier`。 */
export const SEAL_PALETTE: Record<SealRole, Record<SealTier, SealPalette>> = {
  skill: {
    copper: { background: 'linear-gradient(180deg,#8a4a28,#6e3418)', border: '3px solid #a5652f', accent: '#9a5f2a', ruler: '#c08145b3' },
    silver: { background: 'linear-gradient(180deg,#b73124,#8e1f14)', border: '3px double #eef3f6', accent: '#6f767c', ruler: '#9aa0a6b3' },
    gold: { background: 'linear-gradient(180deg,#d34a35,#a32216)', border: '3px double #f5d97a', accent: '#9c7a16', ruler: '#d8b338b3' },
  },
  help: {
    copper: { background: 'linear-gradient(180deg,#b06a3a,#7e3f1d)', border: '3px solid #a5652f', accent: '#9a5f2a', ruler: '#c08145b3' },
    silver: { background: 'linear-gradient(180deg,#8f979e,#5f666d)', border: '3px double #e8eef2', accent: '#6f767c', ruler: '#9aa0a6b3' },
    gold: { background: 'linear-gradient(180deg,#c63d2a,#a32216)', border: '3px double #f5d97a', accent: '#9c7a16', ruler: '#d8b338b3' },
  },
  plugin: {
    copper: { background: 'linear-gradient(180deg,#b4773c,#7e3f1d 60%,#66300f)', accent: '#9a5f2a', ruler: '#c08145b3' },
    silver: { background: 'linear-gradient(180deg,#d8dee3,#a7aeb4 55%,#818990)', accent: '#6f767c', ruler: '#9aa0a6b3' },
    gold: { background: 'linear-gradient(180deg,#f2dc86,#c9a227 55%,#9c7d16)', accent: '#9c7a16', ruler: '#d8b338b3' },
  },
};

/** 插件档那两颗铆钉（**两处共用的小件**：印面两颗、卷轴外框四角，必须同形，故住这一层）。 */
export const SEAL_RIVET: Record<SealTier, React.CSSProperties> = {
  copper: { background: 'radial-gradient(circle at 34% 28%,#f0c088,#a5652f 55%,#6a3216)', boxShadow: 'inset 0 -1px 1px #00000055,0 1px 2px #00000088' },
  silver: { background: 'radial-gradient(circle at 34% 28%,#ffffff,#c3cad0 50%,#7d848b)', boxShadow: 'inset 0 -1px 1px #00000044,0 1px 2px #00000077' },
  gold: { background: 'radial-gradient(circle at 34% 28%,#fffbe0,#e3c565 50%,#a5841d)', boxShadow: 'inset 0 -1px 1px #00000044,0 1px 2px #00000077,0 0 6px #c9a22788' },
};

/** 档位金属边（铜／银／金）：绦带（关闭钮）只借这一条，主体恒朱砂。 */
export const TIER_EDGE: Record<SealTier, string> = { gold: '#f5d97a', silver: '#d8dee3', copper: '#a5652f' };

/** 档位语三档金属（鎏金／冷银／暖铜）：主色＋渐变（`backgroundClip:text` 描出金属光泽）。 */
export const TIER_METAL: Record<SealTier, { readonly flat: string; readonly gradient: string }> = {
  gold: { flat: '#b8912a', gradient: 'linear-gradient(180deg,#f6e27a 0%,#d9b53c 45%,#a5811b 100%)' },
  silver: { flat: '#8b959d', gradient: 'linear-gradient(180deg,#f7fafc 0%,#c3ccd3 45%,#8b959d 100%)' },
  copper: { flat: '#a8663a', gradient: 'linear-gradient(180deg,#f0bd8e 0%,#c07b45 45%,#8a4a24 100%)' },
};
