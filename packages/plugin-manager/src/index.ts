/** dsh-life-pack host 半（票 1168 缺席态：更新区藏入口，仅保留根清单电话）。
 *
 * 形态：cordis 插件（name/inject/apply）+ dsh.bundle.patch 装配行。
 * 更新电话已全部移除，面板不再调更新能力；宿主电话表仅应答 roots，其余回 bad-request。
 * wire 票 1170 在此基础上重建 0.5.1 接线。
 */
import { MANAGER_ACTIONS, MANAGER_RPC, reasonText } from './update-contract.js';
import { rootsReply } from './roots.js';
import type { HostCtx } from './dsh-ctx.js';

export const name = 'dsh-life-pack';
export const inject: readonly string[] = ['connection'];

export type ManagerReply =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string; readonly details: Record<string, unknown> } };

export interface UpdatePhoneTable {
  call(method: string, args: Record<string, unknown>): Promise<ManagerReply>;
}

function failure(code: string, details: Record<string, unknown> = {}): ManagerReply {
  return { ok: false, error: { code, message: reasonText(code), details } };
}

export function buildUpdatePhoneTable(_ctx: unknown): UpdatePhoneTable {
  return {
    async call(method: string, _args: Record<string, unknown>): Promise<ManagerReply> {
      if (method === MANAGER_ACTIONS.roots) return rootsReply() as Promise<ManagerReply>;
      return failure('bad-request', { method });
    },
  };
}

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
    if (/already registered|duplicate prefix route/.test(String((error as Error)?.message ?? error))) {
      logger.warn?.('[dsh-life-pack] fetch route ' + MANAGER_RPC.path + ' already registered by another instance; yielding');
      return;
    }
    throw error;
  }
}

export { MANAGER_TABS, tabsForPresence } from './nav.js';
export { MANAGER_PACKAGE, SINGLE_PLUGINS, reconcileBundles, assertDualBundles, assertNegativeSingleOnly } from './install.js';
export { MANAGER_ACTIONS, MANAGER_RPC, reasonText } from './update-contract.js';
export { clearRootsCache, listRoots, parseDriveRows, rootsReply } from './roots.js';
export type { RootsDeps } from './roots.js';
export { installedVersionOf } from './manager-version.js';
