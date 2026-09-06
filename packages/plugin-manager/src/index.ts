/** dsh-life-pack host 半（P10 脚手架，照抄 DSH 官方插件包模式）。
 *
 * 形态：cordis 插件（name/inject/apply）+ dsh.bundle.patch 装配行。
 * 本包无单品依赖、无单品 import；设置页不住这里（住各单品包，
 * 由一次 registerTab 自动在 DSH 设置页 side 卡片多一张小卡）。
 */

export const name = 'dsh-life-pack';
export const inject: readonly string[] = [];

export function apply(_ctx: unknown): void {
  void _ctx;
}

export { MANAGER_TABS, MANAGER_PLUGIN, DUAL_ADD_PREFIX, dualInstallCmd, recoFor, tabsForPresence, openManagerTab } from './nav.js';
export type { ManagerTab, RecoTab, Presence, HasTabsPort, OpenPort } from './nav.js';
export { MANAGER_PACKAGE, SINGLE_PLUGINS, reconcileBundles, assertDualBundles, assertNegativeSingleOnly } from './install.js';
export { MANAGER_COMPONENT, mountManagerClient, requestOpenViaHost, openViaPort } from './client.js';
export type { HostCaller } from './client.js';
