/** dsh-bill-ilife host 半（P10 脚手架，照抄 DSH 官方插件包模式）。
 *
 * 形态：cordis 插件（name/inject/apply）+ dsh.bundle.patch 装配行。
 * 单品硬依赖总管（dependencies，非 peer，见 package.json）；设置页住本包。
 *
 * #150：`inject` 加 `skills`，`apply` 注册**打包技能提供方**（见 skill-provider.ts）——
 * DSH 里的 agent 由此知道有 `skill-bill` 这个技能（名＋介绍，可按需读全文调 CLI）。
 * 提供方是宿主按名去重的单例：重装配时退让（照 #56 卡路里样板），他错重抛。
 *
 * #677：本包原先**没有任何 RPC 通道**。设置页要读改配置，这里按卡路里那套补齐：
 * `inject` 加 `connection`／`webServer`，`apply` 注册 `/api/ilife-bill-ilife` 路由，
 * 端点分发到 bridge（取数）与三个配置端点（配置）。client 侧禁 node，只经这条通道取用。
 */
import { RPC_CHANNEL, RPC_ENDPOINT_READ, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, RPC_ENDPOINT_CONFIG_CHECK, ok, fail, parseReadPayload, parseSavePayload } from './contract.js';
import type { RpcResult } from './contract.js';
import { SkillBridgeError, readViaCli, readConfigSurface, writeConfigValues, resetConfigToDefaults, readConfigHealth } from './bridge.js';
import { PROVIDER_NAME, provider as skillProvider } from './skill-provider.js';
import type { RpcHandler, SkillHostCtx } from './dsh-ctx.js';

export const name = 'dsh-bill-ilife';
export const inject: readonly string[] = ['skills', 'connection', 'webServer'];

interface HostLogger {
  info?(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  error?(...args: unknown[]): void;
}

/** RPC 处理函数：endpoint 分发 → 载荷校验 → bridge → 信封包装（#56 卡路里样板同形）。
 *
 * #677 起多三个配置端点（`config.get`／`config.save`／`config.reset`）：设置页只经它们
 * 读改自家配置，不 spawn 技能进程，也不直读磁盘（client 侧禁 node）。 */
const handleBillRpc: RpcHandler = async (endpoint, payload): Promise<RpcResult> => {
  try {
    if (endpoint === RPC_ENDPOINT_READ) {
      const parsed = parseReadPayload(payload ?? {});
      if (!parsed) return fail('bad-request', '载荷须为 {key: string, params: object}');
      return ok(readViaCli(parsed.key, parsed.params));
    }
    if (endpoint === RPC_ENDPOINT_CONFIG_GET) return ok(readConfigSurface());
    if (endpoint === RPC_ENDPOINT_CONFIG_SAVE) {
      const parsed = parseSavePayload(payload ?? {});
      if (!parsed) return fail('bad-request', '载荷须为 {values: object}');
      return ok(writeConfigValues(parsed.values));
    }
    if (endpoint === RPC_ENDPOINT_CONFIG_RESET) return ok(resetConfigToDefaults());
    // #706 配置体检：只读一次，把技能侧那份报告原样交回面板（本包不校验、不重写）。
    if (endpoint === RPC_ENDPOINT_CONFIG_CHECK) return ok(readConfigHealth());
    return fail('bad-request', `未知端点：${String(endpoint)}`);
  } catch (e) {
    // 配置面的报错也走这条：技能侧 cli/config.ts 把 base-link-core 的
    // ConfigError 报文原样交出来（已带行号与文件名），readViaCli 把它带在
    // fetch-failed 的报文里，页面照原样给用户看。
    if (e instanceof SkillBridgeError) return fail(e.code, e.message);
    return fail('internal', e instanceof Error ? e.message : String(e));
  }
};

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

  const conn = ctx.connection as unknown as { fetch: { register: (options: Record<string, unknown>) => () => void } } | undefined;
  if (conn === undefined || typeof conn.fetch?.register !== 'function') {
    // 宿主没给连接面（老宿主／单测直调 apply）：退让并留痕，不抛——提供方那半照常生效。
    logger.warn?.('[dsh-bill-ilife] connection.fetch 缺席：设置页的配置端点未注册');
    return;
  }
  const reply = (rpcId: string, result: unknown) => Response.json({ type: 'server-response', rpcId, result });
  try {
    const dispose = conn.fetch.register({
      path: '/api' + RPC_CHANNEL,
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request: any) {
        if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });
        let message: any;
        try { message = await request.json(); } catch { return new Response('body is not JSON', { status: 400 }); }
        const rpcId = typeof message?.rpcId === 'string' ? message.rpcId : 'invalid-request';
        const call = message?.payload;
        if (message?.type !== 'client-request' || typeof message.rpcId !== 'string'
          || message.method !== RPC_CHANNEL.slice(1) || !call || typeof call.method !== 'string'
          || !Object.hasOwn(call, 'payload')) {
          return reply(rpcId, { ok: false, error: { code: 'gateway/bad-request', message: 'Invalid bill request.', details: {} } });
        }
        try { return reply(rpcId, await handleBillRpc(call.method, call.payload)); }
        catch { return new Response('bill handler failed', { status: 500 }); }
      },
    });
    ctx.effect?.(() => () => dispose(), 'dsh-bill-ilife: fetch route cleanup');
  } catch (error) {
    // 通道是宿主共享单例：重装配时上一实例可能已注册，此时退让（照抄 companion），他错重抛。
    if (/(duplicate prefix route|already registered)/.test(String((error as Error)?.message ?? error))) {
      logger.warn?.('[dsh-bill-ilife] rpc channel ' + RPC_CHANNEL + ' already registered by another instance; yielding');
      return;
    }
    throw error;
  }
}

export { SKILL, SLOT_ID, SLOT_ORDER, SLOT_TITLE, PLUGIN, MANAGER_PLUGIN, slotDescriptor, TAB_COMPONENT, registerSingle, openSingle } from './slot.js';
export type { SlotDescriptor, TabsPort } from './slot.js';
export { SETTINGS_OWNER, SETTINGS_SLOT, CONFIG_STEM, CONFIG_ITEMS, COMMON_ITEM_COUNT, ADVANCED_GROUP_TITLE, ADVANCED_GROUP_NOTE, readPath, writePath } from './settings.js';
export type { ConfigItem, ConfigTier, ConfigControl } from './settings.js';
export { SKILL_PACKAGE, SKILL_CLI, SKILL_CLI_REL, HOST_CALL_METHOD, MANAGER_MISSING_HINT, SkillBridgeError, cliPath, assertCliPresent, handleHostCall, requestViaHost, readViaCli, readConfigSurface, writeConfigValues, resetConfigToDefaults, readConfigHealth, CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY, CONFIG_CHECK_KEY } from './bridge.js';
export { RPC_CHANNEL, RPC_ENDPOINT_READ, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, RPC_ENDPOINT_CONFIG_CHECK, ok, fail, parseReadPayload, parseSavePayload, isRpcResult } from './contract.js';
export type { ReadPayload, SavePayload, ConfigSurfaceReply, RpcError, RpcResult } from './contract.js';
// #310 拆雷（照 #218 大厨／居家样板）：宿主**不**导出 `./client.js` 的值也不引用它的类型——
// 客户端产物是 **loader 工厂包**（`window.__ModuleLoader__.load({id, factory})` 的 CJS，由 tsdown 打），
// 不是 ESM 模块；值导出会让插件树在启动期报整棵树起不来，连 type-only 引用也会把 client.ts
// 拉进宿主 `tsc -b` 的编译程序，把 loader 工厂包覆写成裸 ESM。HostCaller 现只住 client.ts（浏览器侧）。
export { PROVIDER_NAME, SKILL_NAME, BUNDLED_SKILL_RANK, SKILL_FILE, skillDir, skillFile, parseSkillText, provider as skillProvider } from './skill-provider.js';
export type { SkillCandidate, SkillDefinition, SkillProvider, SkillInvocationPolicy, SkillsFace, SkillHostCtx } from './dsh-ctx.js';
