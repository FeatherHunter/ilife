/** 总管与面板之间的共享常量：载体、槽名、电话名、版本降级字面量。
 *
 * 说明（票 1168 缺席态）：本仓更新代码已全部移除，更新区藏入口。
 * 本文件仅保留仍被非更新代码取用的共享位，更新专用部分已随更新代码删除。
 * 0.5.1 新接线由 wire 票 1170 重建，此处不预留。
 */

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

const REASON_TEXT: Record<string, string> = {
  'manager-unreachable': '面板连不上总管插件。重启 DSH 后重试。',
  'bad-request': '面板与总管之间的请求出错了（属程序缺陷）。',
  internal: '面板与总管之间的请求出错了（属程序缺陷）。',
};

export function reasonText(code: string): string {
  return REASON_TEXT[code] ?? '面板不认识这个原因码（' + code + '）。';
}
