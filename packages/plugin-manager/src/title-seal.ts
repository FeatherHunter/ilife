/** 共用标题 + 印章书签 · 纯组件（#996，不认任何一家）。
 *
 * 来源：原型 #995 变体 A（行尾悬签，人裁已定形）——标题左、签贴同行行尾向右探出。
 * 用法分两档（#1069 收窄后）：`TitleBlock` 两家——`config-panel-view.ts` 的 `PanelBody`
 * （`product`＝各家产品名／`purpose`＝`配置`）与 `health-view.ts` 的 `HealthTable`
 * （`product`＝各家产品名／`purpose`＝`体检`）；`Seal` 只跟 `PanelBody` 走——**签只印在配置头，
 * 体检头不带签**（负责人 2026-10-03 定；签的第二个用法是 `HealthTable`，本票已摘掉，签回到单一用法）。
 * 别处要同形标题才用 `TitleBlock`，用不出来就留在那两家；签再要第二个用法，先问负责人。
 *
 * 形状（逐值照原型锁死，不许自己重新设计）：
 *   标题：同行双样式、无 `·`——`product` 700／1.15em 主色 ＋ `purpose` 400／0.85em 次色，
 *     同行基线、`gap .5em`（16px 下＝8px，满足地图 8px），整块 `h2`（`aria-label`＝`product purpose`）。
 *     字号取原型锁（地图 Notes 写 1.08em／640 是 grill 共识早值，原型后锁 1.15em／700，以原型为准）。
 *   签：横向书签固定色 `#a5281b` 白字、`clip-path` 右端 V 尾切角 ＋ 微旋 `-3°`、
 *     `white-space:pre` 保空格、`role="note"` 纯展示不可点（无点击、无 tabindex）。
 *     印文由调用方交 `sealText`（显示形一律带空格大写 HELP，空格＝U+0020，997 接线）；只配头给。
 *
 * 纪律（#739／#941）：
 *   零字族（无 `fontFamily`、无 `font:` 简写）、字号一律 em；颜色走 DSH 主题别名，
 *   唯签固定色沿 health 红黄固定色先例（纸变印不变，印不管纸面派生）。
 *
 * 本件是纯函数：吃 props 回元素树，不留状态、不取数。手写 `React.createElement`（本包 client 束禁 JSX）。
 */

import * as React from 'react';

const S = {
  /** 整块 `h2`：同行基线双样式容器（原型 `.titleblock`；`flex:1 1 auto` 把签顶到行尾，390 宽可换行不挤）。 */
  titleBlock: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: '0 0.5em',
    margin: 0,
    fontSize: '1em',
    lineHeight: 1.5,
    flex: '1 1 auto',
    minWidth: '9em',
  } as React.CSSProperties,
  /** 产品名（原型 `.product`：700／1.15em 主色）。 */
  product: {
    fontSize: '1.15em',
    fontWeight: 700,
    color: 'var(--dsw-alias-label-primary, #f9fafb)',
  } as React.CSSProperties,
  /** 用途（原型 `.purpose`：400／0.85em 次色）。 */
  purpose: {
    fontSize: '0.85em',
    fontWeight: 400,
    color: 'var(--dsw-alias-label-secondary, #9a9a9a)',
  } as React.CSSProperties,
  /** 签（原型 `.seal`：固定印色＋右端 V 尾＋微旋，纯展示）。 */
  seal: {
    display: 'inline-block',
    flexShrink: 0,
    fontSize: '0.78em',
    lineHeight: 1.6,
    color: '#fff',
    background: '#a5281b',
    padding: '0.15em 0.9em 0.15em 0.8em',
    whiteSpace: 'pre',
    transform: 'rotate(-3deg)',
    clipPath: 'polygon(0 0, calc(100% - 0.65em) 0, 100% 50%, calc(100% - 0.65em) 100%, 0 100%)',
  } as React.CSSProperties,
} as const;

export interface TitleBlockProps {
  /** 产品名（各家自己的那一格；缺席＝空串，只印用途）。 */
  readonly product: string;
  /** 用途（`配置`／`体检`两档，不认第三档）。 */
  readonly purpose: string;
}

export interface SealProps {
  /** 印文（显示形一律产品名＋空格＋大写 HELP，空格＝U+0020；纯展示不可点）。 */
  readonly sealText: string;
}

/** 标题分层（同行双样式，无 `·`，整块 `h2`）。 */
export function TitleBlock(props: TitleBlockProps): React.ReactElement {
  const label = (props.product + ' ' + props.purpose).trim();
  return React.createElement(
    'h2',
    { style: S.titleBlock, 'aria-label': label },
    React.createElement('span', { style: S.product }, props.product),
    React.createElement('span', { style: S.purpose }, props.purpose),
  );
}

/** 印章书签（横向固定印，纯展示）。 */
export function Seal(props: SealProps): React.ReactElement {
  return React.createElement(
    'span',
    { style: S.seal, role: 'note', 'aria-label': props.sealText },
    props.sealText,
  );
}
