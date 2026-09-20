/** dsh-schedule-ilife host 半（P10 脚手架，照抄 DSH 官方插件包模式）。
 *
 * 形态：cordis 插件（name/inject/apply）+ dsh.bundle.patch 装配行。
 * 单品硬依赖总管（dependencies，非 peer，见 package.json）；设置页住本包。
 *
 * #206：`inject` 加 `skills`，`apply` 注册**打包技能提供方**（见 skill-provider.ts）——
 * DSH 里的 agent 由此知道有 `skill-schedule` 这个技能（名＋介绍，可按需读全文调 CLI）。
 * 提供方是宿主按名去重的单例：重装配时退让（照 #56 卡路里／#150 记账／#218 大厨样板），他错重抛。
 *
 * #696：本包原先**没有任何 RPC 通道**。设置页要读改配置，这里按卡路里／记账／大厨那套补齐：
 * `inject` 加 `connection`／`webServer`，`apply` 注册 `/api/ilife-schedule-ilife` 路由，端点分发到 bridge
 * 的三个配置口。client 侧禁 node，只经这条通道取用。
 */
import { RPC_CHANNEL, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, RPC_ENDPOINT_CONFIG_CHECK, ok, fail, parseSavePayload } from './contract.js';
import type { RpcResult } from './contract.js';
import { SkillBridgeError, readConfigSurface, writeConfigValues, resetConfigToDefaults, readConfigHealth } from './bridge.js';
import type { RpcHandler, SkillHostCtx } from './dsh-ctx.js';
import { PROVIDER_NAME, provider as skillProvider } from './skill-provider.js';
import { SKILL_TOOL_NAME, createSkillTool, resolveSkillEntry } from './skill-tool.js';

export const name = 'dsh-schedule-ilife';
export const inject: readonly string[] = ['skills', 'connection', 'webServer', 'tools'];

interface HostLogger {
  info?(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  error?(...args: unknown[]): void;
}

/** RPC 处理函数：endpoint 分发 → 载荷校验 → bridge 配置口 → 信封包装（#676 卡路里样板同形）。
 *
 * #696 起只有三个配置端点（`config.get`／`config.save`／`config.reset`）：设置页只经它们
 * 读改自家配置，不 spawn 技能进程，也不直读磁盘（client 侧禁 node）。 */
const handleScheduleRpc: RpcHandler = async (endpoint, payload): Promise<RpcResult> => {
  try {
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
    logger.warn?.('[dsh-schedule-ilife] skill provider ' + PROVIDER_NAME + ' already registered by another instance; yielding');
  }
  // #734 路线①：把技能唯一出口开成 agent 工具。宿主进程里 spawn（自带运行时，不读 PATH），
  // 纯 DSH 机器上会话没有 `node` 也照样能用。契约与两级回退见 docs/agents/技能调用契约.md。
  try {
    const disposeTool = ctx.tools?.register(createSkillTool());
    if (disposeTool) ctx.effect?.(() => disposeTool, 'dsh-schedule-ilife: skill tool cleanup');
    else logger.warn?.('[dsh-schedule-ilife] tools face missing; agent tool ' + SKILL_TOOL_NAME + ' not registered');
  } catch (error) {
    // 工具名是宿主按名去重的单例：重装配时上一实例可能已注册，此时退让（提供方／通道退让同形）。
    if (/already registered|duplicate/.test(String((error as Error)?.message ?? error))) {
      logger.warn?.('[dsh-schedule-ilife] agent tool ' + SKILL_TOOL_NAME + ' already registered by another instance; yielding');
    } else {
      throw error;
    }
  }

  const conn = ctx.connection;
  if (conn === undefined || typeof conn.fetch?.register !== 'function') {
    // 宿主没给连接面（老宿主／单测直调 apply）：退让并留痕，不抛——提供方那半照常生效。
    logger.warn?.('[dsh-schedule-ilife] connection.fetch 缺席：设置页的配置端点未注册');
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
          return reply(rpcId, { ok: false, error: { code: 'gateway/bad-request', message: 'Invalid schedule request.', details: {} } });
        }
        try { return reply(rpcId, await handleScheduleRpc(call.method, call.payload)); }
        catch { return new Response('schedule handler failed', { status: 500 }); }
      },
    });
    ctx.effect?.(() => () => dispose(), 'dsh-schedule-ilife: fetch route cleanup');
  } catch (error) {
    // 通道是宿主共享单例：重装配时上一实例可能已注册，此时退让（照抄 companion），他错重抛。
    if (/(duplicate prefix route|already registered)/.test(String((error as Error)?.message ?? error))) {
      logger.warn?.('[dsh-schedule-ilife] rpc channel ' + RPC_CHANNEL + ' already registered by another instance; yielding');
      return;
    }
    throw error;
  }
}

export { SKILL, SLOT_ID, SLOT_ORDER, SLOT_TITLE, PLUGIN, MANAGER_PLUGIN, slotDescriptor, TAB_COMPONENT, registerSingle, openSingle } from './slot.js';
export type { SlotDescriptor, TabsPort } from './slot.js';
export { SETTINGS_OWNER, SETTINGS_SLOT, CONFIG_STEM, CONFIG_ITEMS, COMMON_ITEM_COUNT, ADVANCED_GROUP_TITLE, ADVANCED_GROUP_NOTE, readPath, writePath } from './settings.js';
export type { ConfigItem, ConfigTier, ConfigControl } from './settings.js';
export { SKILL_PACKAGE, SKILL_CLI, SKILL_CLI_REL, HOST_CALL_METHOD, MANAGER_MISSING_HINT, SkillBridgeError, cliPath, assertCliPresent, handleHostCall, requestViaHost, readViaCli, resolveNodeBin, SPAWN_TIMEOUT_MS, readConfigSurface, writeConfigValues, resetConfigToDefaults, readConfigHealth, CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY, CONFIG_CHECK_KEY } from './bridge.js';
export { RPC_CHANNEL, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, RPC_ENDPOINT_CONFIG_CHECK, ok, fail, parseSavePayload, isRpcResult } from './contract.js';
export type { SavePayload, ConfigSurfaceReply, RpcError, RpcResult } from './contract.js';
// #218 拆雷：宿主**不**导出 `./client.js` 的值也不引用它的类型——客户端产物是 **loader 工厂包**
// （`window.__ModuleLoader__.load({id, factory})` 的 CJS，由 tsdown 打），不是 ESM 模块；
// 宿主 `export … from './client.js'` 会让插件树在启动期报
// 「The requested module './client.js' does not provide an export named 'CLIENT_COMPONENT'」而整棵树起不来；
// 连 type-only 引用也会把 client.ts 拉进宿主 `tsc -b` 的编译程序，把 loader 工厂包覆写成裸 ESM。
export { PROVIDER_NAME, SKILL_NAME, BUNDLED_SKILL_RANK, SKILL_FILE, skillDir, parseSkillText, provider as skillProvider } from './skill-provider.js';
export { SKILL_TOOL_NAME, createSkillTool, resolveSkillEntry } from './skill-tool.js';
export type { SkillCandidate, SkillDefinition, SkillProvider, SkillInvocationPolicy, SkillsFace, SkillHostCtx, ClientCtx, RpcCallFace } from './dsh-ctx.js';
