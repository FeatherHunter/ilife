/** dsh-chef client 适配器（最小静态注册版）。
 *
 * 目标只有一件事：向总管声明的爱生活页签槽注册自家技能设置页，
 * 让总管 ledger 里有 `dsh-chef`，`present` 为真，补装提示消失。
 * 不取数、不加定时器、无数据轮询；数据取数三态属后续票，不在本文件。
 *
 * 产物经 tsdown 打成 loader 工厂包（browser/CJS，见 tsdown.config.ts）。
 * 本文件传递闭包：禁 node、禁 DOM 直写（document/window/process），
 * 不 import 任何 host 实现（含 bridge，见 #130 纪律），只用自家 slot/settings 常量。
 * 组件 React.createElement 手写，不引入 JSX。
 */

import * as React from 'react';
import { PLUGIN, SLOT_ORDER, SLOT_TITLE } from './slot.js';
import { SETTING_ROWS } from './settings.js';
import type { ClientCtx } from './dsh-ctx.js';

export const inject: readonly string[] = ['slots'];

/** 面板视觉（内联 style；颜色走 DSH 主题别名，深浅主题自适应，写死值只做回退）。 */
const S = {
  card: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.35))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 13,
    lineHeight: 1.6,
  } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 700, marginBottom: 8 } as React.CSSProperties,
  muted: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: 12 } as React.CSSProperties,
  rows: { marginTop: 8, borderTop: '1px solid var(--dsw-alias-border, rgba(128,128,128,.25))', paddingTop: 8 } as React.CSSProperties,
};

function controlLabel(control: string): string {
  if (control === 'switch') return '开关（缺省启用，只读）';
  if (control === 'text') return '文本（只读）';
  if (control === 'number') return '数字（只读）';
  return `${control}（只读）`;
}

/** 技能设置页（静态版）：只读设置行，不取数，不冒充数据。 */
function ChefConfig(): React.ReactElement {
  return React.createElement(
    'div',
    { style: S.card },
    React.createElement('div', { style: S.title }, SLOT_TITLE),
    React.createElement(
      'div',
      { style: S.rows },
      SETTING_ROWS.map((row) =>
        React.createElement('div', { key: row.key }, `${row.title} · ${controlLabel(row.control)}`),
      ),
    ),
    React.createElement('div', { style: S.muted }, `${PLUGIN} 已安装，数据面板接线后续票补齐`),
  );
}

export function apply(ctx: ClientCtx): void {
  // 技能设置页 → 爱生活页签槽（总管声明；总管缺席时 inject 等待，不断链）。
  ctx.slots.inject('ilife.config-tab', () =>
    ctx.slots.register(
      {
        name: 'ilife.config-tab',
        id: PLUGIN,
        order: SLOT_ORDER,
        label: () => SLOT_TITLE,
      },
      () => React.createElement(ChefConfig),
    ),
  );
}
