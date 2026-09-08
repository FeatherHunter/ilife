/** dsh-memo-ilife 端口（port）：DSH 世界与备忘录 hexagon 之间的契约。
 *
 * browser 安全：零 node 导入。host 适配器（注册 RPC 通道）与 client
 * 适配器（调用 RPC）共用同一份定义；单测与 loader 回路以此为准。
 * 通道命名遵守宿主约束：单段且不等于 /api（见 cookbook「RPC 通道」）。
 */
export const RPC_CHANNEL = '/ilife-memo' as const;
export const RPC_ENDPOINT_READ = 'read' as const;

/** 读请求载荷：与技能 CLI 的 key/params 同形（见 skill-memo-ilife SKILL.md）。 */
export interface ReadPayload {
  readonly key: string;
  readonly params: Record<string, unknown>;
}

export interface RpcError {
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;
}

export type RpcResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: RpcError };

export function ok(value: unknown): RpcResult {
  return { ok: true, value };
}

export function fail(code: string, message: string): RpcResult {
  return { ok: false, error: { code, message, details: {} } };
}

/** 载荷校验：形状不对返回 null，由调用方按 bad-request 回绝（不抛）。 */
export function parseReadPayload(raw: unknown): ReadPayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { key, params } = raw as { key?: unknown; params?: unknown };
  if (typeof key !== 'string' || key.length === 0) return null;
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return null;
  return { key, params: params as Record<string, unknown> };
}

/** 面板默认读键：memo.search 无参直读，空库安全（items []、total 0）。 */
export const DEFAULT_READ_KEY = 'memo.search' as const;
