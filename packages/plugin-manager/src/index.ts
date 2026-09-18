/** dsh-life-pack host 半（六边形：host 侧；总管机制范围此前无 RPC，现在是面板的取数与动作口）。
 *
 * 形态：cordis 插件（name/inject/apply）+ dsh.bundle.patch 装配行。
 * 本包无单品依赖、无单品 import。对外只保留纯数据口径（nav）与安装口径（install）。
 *
 * 本文件做两件事：
 * 1. 建电话表（`buildUpdatePhoneTable`：七组更新电话 ＋ 两个总管自有电话）；
 * 2. 把电话表挂到 DSH 公开的 `/api` 载体上（`connection.fetch.register`，样板：
 *    `packages/plugin-calorie/src/index.ts:51-88`，即 #80 的迁移写法）。
 *
 * 信封与卡路里/备忘录同形：客户端发 `{type:'client-request', rpcId, method:'<通道名>',
 * payload:{method, payload}}`，宿主回 `{type:'server-response', rpcId, result}`，
 * `result` 是 `{ok:true,value}` 或 `{ok:false,error:{code,message,details}}`（cookbook §6）。
 */
import { MANAGER_RPC, reasonText } from './update-contract.js';
import { buildUpdatePhoneTable } from './update-host.js';
import type { ManagerReply } from './update-host.js';
import type { HostCtx } from './dsh-ctx.js';

export const name = 'dsh-life-pack';
export const inject: readonly string[] = ['connection'];

interface HostLogger {
  info?(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  error?(...args: unknown[]): void;
}

function loggerOf(ctx: HostCtx): HostLogger {
  const source: unknown = ctx?.logger;
  return (typeof source === 'function' ? (source as (scope: string) => HostLogger)(name) : (source as HostLogger | null)) ?? console;
}

export function apply(ctx: HostCtx): void {
  const logger = loggerOf(ctx);
  const table = buildUpdatePhoneTable(ctx);
  const reply = (rpcId: string, result: ManagerReply): Response => Response.json({ type: 'server-response', rpcId, result });
  const fail = (rpcId: string, code: string, details: Record<string, unknown> = {}): Response =>
    reply(rpcId, { ok: false, error: { code, message: reasonText(code), details } });
  try {
    const dispose = ctx.connection.fetch.register({
      path: MANAGER_RPC.path,
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request: Request): Promise<Response> {
        if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });
        let message: {
          type?: unknown;
          rpcId?: unknown;
          method?: unknown;
          payload?: { method?: unknown; payload?: unknown };
        };
        try {
          message = (await request.json()) as typeof message;
        } catch {
          return new Response('body is not JSON', { status: 400 });
        }
        const rpcId = typeof message?.rpcId === 'string' ? message.rpcId : 'invalid-request';
        const call = message?.payload;
        if (
          message?.type !== 'client-request' ||
          typeof message.rpcId !== 'string' ||
          message.method !== MANAGER_RPC.endpoint ||
          !call ||
          typeof call.method !== 'string' ||
          !Object.hasOwn(call, 'payload')
        ) {
          return fail(rpcId, 'bad-request');
        }
        return reply(rpcId, await table.call(call.method, (call.payload ?? {}) as Record<string, unknown>));
      },
    });
    ctx.effect(() => () => dispose(), 'dsh-life-pack: fetch route cleanup');
  } catch (error) {
    // 通道是宿主共享单例：重装配时上一实例可能已注册，此时退让（照抄卡路里样板），他错重抛。
    if (/already registered|duplicate prefix route/.test(String((error as Error)?.message ?? error))) {
      logger.warn?.('[dsh-life-pack] fetch route ' + MANAGER_RPC.path + ' already registered by another instance; yielding');
      return;
    }
    throw error;
  }
}

export { MANAGER_TABS, tabsForPresence } from './nav.js';
export { MANAGER_PACKAGE, SINGLE_PLUGINS, reconcileBundles, assertDualBundles, assertNegativeSingleOnly } from './install.js';
export { UPDATE_TARGETS } from './update-targets.js';
export { MANAGER_ACTIONS, MANAGER_RPC, manualInstallCommand, reasonText } from './update-contract.js';
