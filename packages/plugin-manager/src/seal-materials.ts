/** 九档材质 · **单一定义处**（印本体、卷轴外框、卷轴纸面共用一份取值）。
 *
 * 为什么要单独一件：同一档的「章」与「卷」必须读成同一份材质——原先印面那九枚（`seal-stamp.ts` 的 `FACE`）
 * 与卷轴外框那九档（`seal-scroll.ts` 的 `MATERIALS`）各写一份底色＋边线，两处一旦漂移，
 * 点开卷就会看到「章是银的、框是金的」。这张表把两条消费端收成一份：**改色只改这里**。
 *
 * 每档分六格，谁用哪格写死：
 *   `background`／`border`  印与卷外框共用（插件三档没有边线，走 `band`）；
 *   `face`     只有印用（字色＋内圈高光）；`frame` 只有卷外框用（内阴影）；
 *   `accent`／`ruler`  只有卷的纸面用（档位字色、分隔线色）；
 *   `band`／`rivet`  只有插件档用（整面金属带描边、两颗铆钉）。
 *
 * 档位级的两个色（绦带金属边、档位语金属渐变）也住这里，免得又散成几处。
 */
import type * as React from 'react';
import type { SealRole, SealTier } from './config-panel-contract.js';

/** 一档材质。 */
export interface SealMaterial {
  readonly background: string;
  readonly border?: string;
  readonly face?: React.CSSProperties;
  readonly frame?: React.CSSProperties;
  readonly accent: string;
  readonly ruler: string;
  readonly band?: React.CSSProperties;
  readonly rivet?: React.CSSProperties;
}

/** 九档材质（3 角色 × 3 档）。键就是契约里的 `role`／`tier`。 */
export const SEAL_MATERIALS: Record<SealRole, Record<SealTier, SealMaterial>> = {
  skill: {
    copper: {
      background: 'linear-gradient(180deg,#8a4a28,#6e3418)',
      border: '3px solid #a5652f',
      face: { color: '#f8f1e2', boxShadow: 'inset 0 0 0 1px #f8f1e2aa' },
      frame: { boxShadow: 'inset 0 0 0 1px #f8f1e2aa, inset 0 2px 0 #ffffff26, inset 0 -3px 6px #0000004d' },
      accent: '#9a5f2a',
      ruler: '#c08145b3',
    },
    silver: {
      background: 'linear-gradient(180deg,#b73124,#8e1f14)',
      border: '3px double #eef3f6',
      face: { color: '#f8f1e2', boxShadow: 'inset 0 0 0 1px #fff' },
      frame: { boxShadow: 'inset 0 0 0 1px #fff, inset 0 2px 0 #ffffff2e, inset 0 -3px 6px #0000004d' },
      accent: '#6f767c',
      ruler: '#9aa0a6b3',
    },
    gold: {
      background: 'linear-gradient(180deg,#d34a35,#a32216)',
      border: '3px double #f5d97a',
      face: { color: '#fff8e0', boxShadow: 'inset 0 0 0 1px #fff8,0 4px 16px #c9a22755' },
      frame: { boxShadow: 'inset 0 0 0 1px #fff8, inset 0 2px 0 #ffffff33, inset 0 -3px 6px #0000004d' },
      accent: '#9c7a16',
      ruler: '#d8b338b3',
    },
  },
  help: {
    copper: {
      background: 'linear-gradient(180deg,#b06a3a,#7e3f1d)',
      border: '3px solid #a5652f',
      frame: { boxShadow: 'inset 0 2px 0 #ffffff26, inset 0 -3px 6px #0000004d' },
      accent: '#9a5f2a',
      ruler: '#c08145b3',
    },
    silver: {
      background: 'linear-gradient(180deg,#8f979e,#5f666d)',
      border: '3px double #e8eef2',
      frame: { boxShadow: 'inset 0 2px 0 #ffffff2e, inset 0 -3px 6px #0000004d' },
      accent: '#6f767c',
      ruler: '#9aa0a6b3',
    },
    gold: {
      background: 'linear-gradient(180deg,#c63d2a,#a32216)',
      border: '3px double #f5d97a',
      frame: { boxShadow: 'inset 0 2px 0 #ffffff33, inset 0 -3px 6px #0000004d' },
      accent: '#9c7a16',
      ruler: '#d8b338b3',
    },
  },
  plugin: {
    copper: {
      background: 'linear-gradient(180deg,#b4773c,#7e3f1d 60%,#66300f)',
      band: { boxShadow: 'inset 0 1px 0 #d99a5e88, inset 0 -2px 5px #0006, 0 0 0 1px #5e2c12' },
      frame: { boxShadow: 'inset 0 1px 0 #d99a5e88, inset 0 -2px 5px #0006, 0 0 0 1px #5e2c12, inset 0 2px 0 #ffffff26' },
      accent: '#9a5f2a',
      ruler: '#c08145b3',
      rivet: { background: 'radial-gradient(circle at 34% 28%,#f0c088,#a5652f 55%,#6a3216)', boxShadow: 'inset 0 -1px 1px #00000055,0 1px 2px #00000088' },
    },
    silver: {
      background: 'linear-gradient(180deg,#d8dee3,#a7aeb4 55%,#818990)',
      band: { boxShadow: 'inset 0 1px 0 #ffffffdd, inset 0 -2px 5px #0005, 0 0 0 1px #6f767c' },
      frame: { boxShadow: 'inset 0 1px 0 #ffffffdd, inset 0 -2px 5px #0005, 0 0 0 1px #6f767c, inset 0 2px 0 #ffffff33' },
      accent: '#6f767c',
      ruler: '#9aa0a6b3',
      rivet: { background: 'radial-gradient(circle at 34% 28%,#ffffff,#c3cad0 50%,#7d848b)', boxShadow: 'inset 0 -1px 1px #00000044,0 1px 2px #00000077' },
    },
    gold: {
      background: 'linear-gradient(180deg,#f2dc86,#c9a227 55%,#9c7d16)',
      band: { boxShadow: 'inset 0 1px 0 #fff8d8dd, inset 0 -2px 5px #0005, 0 0 0 1px #8a6a15, 0 3px 14px #c9a22766' },
      frame: { boxShadow: 'inset 0 1px 0 #fff8d8dd, inset 0 -2px 5px #0005, 0 0 0 1px #8a6a15' },
      accent: '#9c7a16',
      ruler: '#d8b338b3',
      rivet: { background: 'radial-gradient(circle at 34% 28%,#fffbe0,#e3c565 50%,#a5841d)', boxShadow: 'inset 0 -1px 1px #00000044,0 1px 2px #00000077,0 0 6px #c9a22788' },
    },
  },
};

/** 档位金属边（铜／银／金）：绦带（关闭钮）只借这一条，主体恒朱砂。 */
export const TIER_EDGE: Record<SealTier, string> = { gold: '#f5d97a', silver: '#d8dee3', copper: '#a5652f' };

/** 档位语三档金属（鎏金／冷银／暖铜）：主色＋渐变（`backgroundClip:text` 描出金属光泽）。 */
export const TIER_METAL: Record<SealTier, { readonly flat: string; readonly gradient: string }> = {
  gold: { flat: '#b8912a', gradient: 'linear-gradient(180deg,#f6e27a 0%,#d9b53c 45%,#a5811b 100%)' },
  silver: { flat: '#8b959d', gradient: 'linear-gradient(180deg,#f7fafc 0%,#c3ccd3 45%,#8b959d 100%)' },
  copper: { flat: '#a8663a', gradient: 'linear-gradient(180deg,#f0bd8e 0%,#c07b45 45%,#8a4a24 100%)' },
};
