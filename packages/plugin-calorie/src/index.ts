/** dsh-calorie host 适配器（六边形：port=contract，adapter=本文件+bridge）。
 *
 * 形态：cordis 插件（name/inject/apply）。RPC 通道与信封由 contract 定义，
 * apply 真注册通道，取数只经 bridge.readViaCli（spawn 技能 CLI），
 * 从不 import 任何技能实现。
 * 单品硬依赖总管（dependencies，非 peer，见 package.json）；设置页住本包。
 * 打包技能提供方见 skill-provider.ts（badge 同形，#56）：单份 SKILL.md 按包名解析，
 * rank 内联 600，名用 skill-calorie；面板/桥行为不受其影响。
 */
import { RPC_CHANNEL, RPC_ENDPOINT_READ, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, RPC_ENDPOINT_CONFIG_CHECK, ok, fail, parseReadPayload, parseSavePayload } from './contract.js';
import type { RpcResult } from './contract.js';
import { SkillBridgeError, readViaCli, readConfigSurface, writeConfigValues, resetConfigToDefaults, readConfigHealth } from './bridge.js';
import type { HostCtx, RpcHandler } from './dsh-ctx.js';
import { PROVIDER_NAME, provider as skillProvider } from './skill-provider.js';
import { SKILL_TOOL_NAME, createSkillTool, resolveSkillEntry } from './skill-tool.js';

export const name = 'dsh-calorie';
export const inject = ['connection', 'skills', 'webServer', 'tools'];

interface HostLogger {
  info?(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  error?(...args: unknown[]): void;
}

/** RPC 处理函数：endpoint 分发 → 载荷校验 → readViaCli／配置件 → 信封包装（companion rpc.ts 同形）。
 *
 * #676 起多三个配置端点（`config.get`／`config.save`／`config.reset`）：设置页只经它们
 * 读改自家配置，不 spawn 技能进程，也不直读磁盘（client 侧禁 node）。 */
const handleCalorieRpc: RpcHandler = async (endpoint, payload): Promise<RpcResult> => {
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

export function apply(ctx: HostCtx): void {
  const loggerSource: unknown = ctx?.logger;
  const logger: HostLogger =
    (typeof loggerSource === 'function'
      ? (loggerSource as (scope: string) => HostLogger)(name)
      : (loggerSource as HostLogger | null | undefined)) ?? console;
  try {
    ctx.skills.registerProvider(() => skillProvider);
  } catch (error) {
    // 提供方是宿主按名去重的单例：重装配时上一实例可能已注册，此时退让（RPC 通道退让同形），他错重抛。
    if (!String((error as Error)?.message ?? error).includes('already registered')) throw error;
    logger.warn?.('[dsh-calorie] skill provider ' + PROVIDER_NAME + ' already registered by another instance; yielding');
  }
  // #734 路线①：把技能唯一出口开成 agent 工具。宿主进程里 spawn（自带运行时，不读 PATH），
  // 纯 DSH 机器上会话没有 `node` 也照样能用。契约与两级回退见 docs/agents/技能调用契约.md。
  try {
    const disposeTool = ctx.tools?.register(createSkillTool());
    if (disposeTool) ctx.effect(() => disposeTool, 'dsh-calorie: skill tool cleanup');
    else logger.warn?.('[dsh-calorie] tools face missing; agent tool ' + SKILL_TOOL_NAME + ' not registered');
  } catch (error) {
    // 工具名是宿主按名去重的单例：重装配时上一实例可能已注册，此时退让（提供方／通道退让同形）。
    if (/already registered|duplicate/.test(String((error as Error)?.message ?? error))) {
      logger.warn?.('[dsh-calorie] agent tool ' + SKILL_TOOL_NAME + ' already registered by another instance; yielding');
    } else {
      throw error;
    }
  }
  // #80：迁移到 DSH 公开的 /api 载体（ctx.connection.fetch.register）。
  // 旧写法 ctx.connection.rpc.handle() 会以 connection 服务自身的 Context 去调
  // webServer.register 注册前缀路由，而那个 Context 没有 webServer 注入 → 装配期必抛
  // cannot get property "webServer" without inject（实测：给本插件加 webServer 声明也无效）。
  // 参考实现：@xmanrui/dsh-im 的 plugin-src/management-rpc.mjs（上游 503a24a 的改道）。
  const conn = ctx.connection as unknown as {
    fetch: { register: (options: Record<string, unknown>) => () => void };
  };
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
          return reply(rpcId, { ok: false, error: { code: 'gateway/bad-request', message: 'Invalid calorie request.', details: {} } });
        }
        try { return reply(rpcId, await handleCalorieRpc(call.method, call.payload)); }
        catch { return new Response('calorie handler failed', { status: 500 }); }
      },
    });
    ctx.effect(() => () => dispose(), 'dsh-calorie: fetch route cleanup');
  } catch (error) {
    // 通道是宿主共享单例：重装配时上一实例可能已注册，此时退让（照抄 companion），他错重抛。
    if (/(duplicate prefix route|already registered)/.test(String((error as Error)?.message ?? error))) {
      logger.warn?.('[dsh-calorie] rpc channel ' + RPC_CHANNEL + ' already registered by another instance; yielding');
      return;
    }
    throw error;
  }
}

export { SKILL, SLOT_ID, SLOT_ORDER, SLOT_TITLE, PLUGIN, MANAGER_PLUGIN, slotDescriptor, TAB_COMPONENT, registerSingle, openSingle } from './slot.js';
export type { SlotDescriptor, TabsPort } from './slot.js';
export { SETTINGS_OWNER, SETTINGS_SLOT, CONFIG_STEM, CONFIG_ITEMS, COMMON_ITEM_COUNT, ADVANCED_GROUP_TITLE, ADVANCED_GROUP_NOTE, readPath, writePath } from './settings.js';
export type { ConfigItem, ConfigTier, ConfigControl, ResolvedField } from './settings.js';
export { SKILL_PACKAGE, SKILL_CLI, SKILL_CLI_REL, HOST_CALL_METHOD, MANAGER_MISSING_HINT, SkillBridgeError, cliPath, assertCliPresent, handleHostCall, requestViaHost, readViaCli, readConfigSurface, writeConfigValues, resetConfigToDefaults, readConfigHealth, CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY, CONFIG_CHECK_KEY } from './bridge.js';
export { PROVIDER_NAME, SKILL_NAME, BUNDLED_SKILL_RANK, SKILL_FILE, skillDir, skillFile, parseSkillText, provider as skillProvider } from './skill-provider.js';
export { SKILL_TOOL_NAME, createSkillTool, resolveSkillEntry } from './skill-tool.js';
export { RPC_CHANNEL, RPC_ENDPOINT_READ, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, RPC_ENDPOINT_CONFIG_CHECK, DEFAULT_READ_KEY, ok, fail, parseReadPayload, parseSavePayload } from './contract.js';
export type { ReadPayload, SavePayload, ConfigSurfaceReply, ResolvedPaths, RpcError, RpcResult } from './contract.js';
