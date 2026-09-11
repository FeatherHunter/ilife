/** dsh-bill-ilife host 半（P10 脚手架，照抄 DSH 官方插件包模式）。
 *
 * 形态：cordis 插件（name/inject/apply）+ dsh.bundle.patch 装配行。
 * 单品硬依赖总管（dependencies，非 peer，见 package.json）；设置页住本包。
 *
 * #150：`inject` 加 `skills`，`apply` 注册**打包技能提供方**（见 skill-provider.ts）——
 * DSH 里的 agent 由此知道有 `skill-bill` 这个技能（名＋介绍，可按需读全文调 CLI）。
 * 提供方是宿主按名去重的单例：重装配时退让（照 #56 卡路里样板），他错重抛。
 */
import { PROVIDER_NAME, provider as skillProvider } from './skill-provider.js';
import type { SkillHostCtx } from './dsh-ctx.js';

export const name = 'dsh-bill-ilife';
export const inject: readonly string[] = ['skills'];

interface HostLogger {
  info?(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  error?(...args: unknown[]): void;
}

export function apply(ctx: SkillHostCtx): void {
  const loggerSource: unknown = ctx?.logger;
  const logger: HostLogger =
    (typeof loggerSource === 'function'
      ? (loggerSource as (scope: string) => HostLogger)(name)
      : (loggerSource as HostLogger | null | undefined)) ?? console;
  try {
    ctx.skills.registerProvider(() => skillProvider);
  } catch (error) {
    // 提供方是宿主按名去重的单例：重装配时上一实例可能已注册，此时退让；他错重抛。
    if (!String((error as Error)?.message ?? error).includes('already registered')) throw error;
    logger.warn?.('[dsh-bill-ilife] skill provider ' + PROVIDER_NAME + ' already registered by another instance; yielding');
  }
}

export { SKILL, SLOT_ID, SLOT_ORDER, SLOT_TITLE, PLUGIN, MANAGER_PLUGIN, slotDescriptor, TAB_COMPONENT, registerSingle, openSingle } from './slot.js';
export type { SlotDescriptor, TabsPort } from './slot.js';
export { SETTINGS_OWNER, SETTINGS_SLOT, SETTING_ROWS } from './settings.js';
export type { SettingRow } from './settings.js';
export { SKILL_PACKAGE, SKILL_CLI, SKILL_CLI_REL, HOST_CALL_METHOD, MANAGER_MISSING_HINT, SkillBridgeError, cliPath, assertCliPresent, handleHostCall, requestViaHost, readViaCli } from './bridge.js';
export { CLIENT_COMPONENT, CLIENT_METHOD, mountSingleClient, openSingleClient, requestReadViaHost } from './client.js';
export type { HostCaller } from './client.js';
export { PROVIDER_NAME, SKILL_NAME, BUNDLED_SKILL_RANK, SKILL_FILE, skillDir, skillFile, parseSkillText, provider as skillProvider } from './skill-provider.js';
export type { SkillCandidate, SkillDefinition, SkillProvider, SkillInvocationPolicy, SkillsFace, SkillHostCtx } from './dsh-ctx.js';
