/** dsh-home-ilife host 半（P10 脚手架，照抄 DSH 官方插件包模式）。
 *
 * 形态：cordis 插件（name/inject/apply）+ dsh.bundle.patch 装配行。
 * 单品硬依赖总管（dependencies，非 peer，见 package.json）；设置页住本包。
 *
 * #193：`inject` 加 `skills`，`apply` 注册**打包技能提供方**（见 skill-provider.ts）——
 * DSH 里的 agent 由此知道有 `skill-home` 这个技能（名＋介绍，可按需读全文调 CLI）。
 * 提供方是宿主按名去重的单例：重装配时退让（照 #56 卡路里／#150 记账／#206 作息／#218 大厨样板），他错重抛。
 */
import { PROVIDER_NAME, provider as skillProvider } from './skill-provider.js';
import type { SkillHostCtx } from './dsh-ctx.js';

export const name = 'dsh-home-ilife';
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
    logger.warn?.('[dsh-home-ilife] skill provider ' + PROVIDER_NAME + ' already registered by another instance; yielding');
  }
}

export { SKILL, SLOT_ID, SLOT_ORDER, SLOT_TITLE, PLUGIN, MANAGER_PLUGIN, slotDescriptor, TAB_COMPONENT, registerSingle, openSingle } from './slot.js';
export type { SlotDescriptor, TabsPort } from './slot.js';
export { SETTINGS_OWNER, SETTINGS_SLOT, SETTING_ROWS } from './settings.js';
export type { SettingRow } from './settings.js';
export { SKILL_PACKAGE, SKILL_CLI, SKILL_CLI_REL, HOST_CALL_METHOD, MANAGER_MISSING_HINT, SkillBridgeError, cliPath, assertCliPresent, handleHostCall, requestViaHost, readViaCli } from './bridge.js';
// #218 拆雷：宿主**不**导出 `./client.js` 的值也不引用它的类型——客户端产物是 **loader 工厂包**
// （`window.__ModuleLoader__.load({id, factory})` 的 CJS，由 tsdown 打），不是 ESM 模块；
// 宿主 `export … from './client.js'` 会让插件树在启动期报
// 「The requested module './client.js' does not provide an export named 'CLIENT_COMPONENT'」而整棵树起不来；
// 连 type-only 引用也会把 client.ts 拉进宿主 `tsc -b` 的编译程序，把 loader 工厂包覆写成裸 ESM。
export { PROVIDER_NAME, SKILL_NAME, BUNDLED_SKILL_RANK, SKILL_FILE, skillDir, skillFile, parseSkillText, provider as skillProvider } from './skill-provider.js';
export type { SkillCandidate, SkillDefinition, SkillProvider, SkillInvocationPolicy, SkillsFace, SkillHostCtx } from './dsh-ctx.js';
