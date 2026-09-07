/** dsh-ilife-bill host 半（P10 脚手架，照抄 DSH 官方插件包模式）。
 *
 * 形态：cordis 插件（name/inject/apply）+ dsh.bundle.patch 装配行。
 * 单品硬依赖总管（dependencies，非 peer，见 package.json）；设置页住本包。
 */

export const name = 'dsh-ilife-bill';
export const inject: readonly string[] = [];

export function apply(_ctx: unknown): void {
  void _ctx;
}

export { SKILL, SLOT_ID, SLOT_ORDER, SLOT_TITLE, PLUGIN, MANAGER_PLUGIN, slotDescriptor, TAB_COMPONENT, registerSingle, openSingle } from './slot.js';
export type { SlotDescriptor, TabsPort } from './slot.js';
export { SETTINGS_OWNER, SETTINGS_SLOT, SETTING_ROWS } from './settings.js';
export type { SettingRow } from './settings.js';
export { SKILL_PACKAGE, SKILL_CLI, HOST_CALL_METHOD, MANAGER_MISSING_HINT, SkillBridgeError, cliPath, assertCliPresent, handleHostCall, requestViaHost, readViaCli } from './bridge.js';
export { CLIENT_COMPONENT, CLIENT_METHOD, mountSingleClient, openSingleClient, requestReadViaHost } from './client.js';
export type { HostCaller } from './client.js';
