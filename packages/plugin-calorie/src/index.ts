/** dsh-calorie host 适配器（六边形：port=contract，adapter=本文件+bridge）。
 *
 * 形态：cordis 插件（name/inject/apply）。RPC 通道与信封由 contract 定义，
 * apply 真注册通道，取数只经 bridge.readViaCli（spawn 技能 CLI），
 * 从不 import 任何技能实现。
 * 单品硬依赖总管（dependencies，非 peer，见 package.json）；设置页住本包。
 */
import { RPC_CHANNEL, RPC_ENDPOINT_READ, ok, fail, parseReadPayload } from './contract.js';
import type { RpcResult } from './contract.js';
import { SkillBridgeError, readViaCli } from './bridge.js';
import type { HostCtx, RpcHandler } from './dsh-ctx.js';

export const name = 'dsh-calorie';
export const inject = ['connection'];

interface HostLogger {
  info?(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  error?(...args: unknown[]): void;
}

/** RPC 处理函数：endpoint 分发 → 载荷校验 → readViaCli → 信封包装（companion rpc.ts 同形）。 */
const handleCalorieRpc: RpcHandler = async (endpoint, payload): Promise<RpcResult> => {
  if (endpoint !== RPC_ENDPOINT_READ) return fail('bad-request', `未知端点：${String(endpoint)}`);
  const parsed = parseReadPayload(payload ?? {});
  if (!parsed) return fail('bad-request', '载荷须为 {key: string, params: object}');
  try {
    return ok(readViaCli(parsed.key, parsed.params));
  } catch (e) {
    if (e instanceof SkillBridgeError) return fail(e.code, e.message);
    return fail('internal', e instanceof Error ? e.message : String(e));
  }
};

export function apply(ctx: HostCtx): void {
  const loggerSource: unknown = ctx?.logger;
  const logger: HostLogger =
    (typeof loggerSource === 'function'
      ? (loggerSource as (scope: string) => HostLogger)(name)
      : (loggerSource as HostLogger | null | undefined)) ?? console;
  try {
    const dispose = ctx.connection.rpc.handle(RPC_CHANNEL, handleCalorieRpc);
    ctx.effect(() => () => dispose(), 'dsh-calorie: rpc channel cleanup');
  } catch (error) {
    // 通道是宿主共享单例：重装配时上一实例可能已注册，此时退让（照抄 companion），他错重抛。
    if (String((error as Error)?.message ?? error).includes('duplicate prefix route')) {
      logger.warn?.('[dsh-calorie] rpc channel ' + RPC_CHANNEL + ' already registered by another instance; yielding');
      return;
    }
    throw error;
  }
}

export { SKILL, SLOT_ID, SLOT_ORDER, SLOT_TITLE, PLUGIN, MANAGER_PLUGIN, slotDescriptor, TAB_COMPONENT, registerSingle, openSingle } from './slot.js';
export type { SlotDescriptor, TabsPort } from './slot.js';
export { SETTINGS_OWNER, SETTINGS_SLOT, SETTING_ROWS } from './settings.js';
export type { SettingRow } from './settings.js';
export { SKILL_PACKAGE, SKILL_CLI, SKILL_CLI_REL, HOST_CALL_METHOD, MANAGER_MISSING_HINT, SkillBridgeError, cliPath, assertCliPresent, handleHostCall, requestViaHost, readViaCli } from './bridge.js';
export { RPC_CHANNEL, RPC_ENDPOINT_READ, DEFAULT_READ_KEY, ok, fail, parseReadPayload } from './contract.js';
export type { ReadPayload, RpcError, RpcResult } from './contract.js';
