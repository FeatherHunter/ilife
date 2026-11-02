/** 总管与面板之间的共享常量：载体、槽名、电话名、版本降级字面量。
 *
 * 说明（票 1168 缺席态）：本仓更新代码已全部移除，更新区藏入口。
 * 本文件仅保留仍被非更新代码取用的共享位，更新专用部分已随更新代码删除。
 * 0.5.1 新接线由 wire 票 1170 重建，此处不预留。
 */

import { m } from './entries/index.js';
export const CONFIG_TAB_SLOT = 'ilife.config-tab' as const;

export const CARRIER_BASE = '/api' as const;

export const MANAGER_RPC = {
  base: CARRIER_BASE,
  channel: '/ilife-manager',
  endpoint: 'ilife-manager',
  path: '/api/ilife-manager',
} as const;

export const MANAGER_ACTIONS = {
  roots: 'ilife-manager.roots',
} as const;

export const VERSION_UNKNOWN = 'unknown' as const;

/** 三种失败原因的文案（渲染期现取）。 */
function reasonTextTable(): Record<string, string> {
  return {
    'manager-unreachable': m('plugin-manager.update-contract.c002'),
    'bad-request': m('plugin-manager.update-contract.c003'),
    internal: m('plugin-manager.update-contract.c004'),
  };
}

export function reasonText(code: string): string {
  return reasonTextTable()[code] ?? m('plugin-manager.update-contract.c001', { p0: String(code) });
}
