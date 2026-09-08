/** dsh-life-pack client 适配器（六边形：browser 侧）。
 *
 * 真实 DSH 契约（出处见 docs/agents/dsh-client-contract.md）：
 * - 本文件经 tsdown 打成 loader 工厂包（browser/CJS + 注册包裹），classic 执行
 *   只注册，副作用全在 factory 内；传递闭包禁 node 内建与 ESM 语法（回路
 *   test/client-bundle-48.test.mjs 看门）。
 * - inject 短名 ['slots']（总管机制范围无 RPC，不声明 connection）；apply 只注册
 *   一处 settings.section（kind list，id 必填）。
 * - 组件 React.createElement 手写（禁 JSX），纯渲染 MANAGER_TABS 六行
 *   （title/slotId/order）+ 每行补装命令（dualInstallCmd）只读文本——无假导航
 *   （无真实导航 API 就不装有）、无轮询、无 document/window/process。
 */

import * as React from 'react';
import { MANAGER_TABS, dualInstallCmd } from './nav.js';
import type { ClientCtx } from './dsh-ctx.js';

export const inject = ['slots'];

function LifePackSection(): React.ReactElement {
  return React.createElement(
    'div',
    null,
    React.createElement('h2', null, '爱生活总管'),
    MANAGER_TABS.map((t) =>
      React.createElement(
        'div',
        { key: t.slotId },
        React.createElement('div', null, t.title + ' · ' + t.slotId + ' · order ' + String(t.order)),
        React.createElement('code', null, dualInstallCmd(t.plugin)),
      ),
    ),
  );
}

export function apply(ctx: ClientCtx): void {
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-life-pack',
        order: 21,
        label: () => '爱生活总管',
        inject: () => ({}),
      },
      LifePackSection,
    ),
  );
}
