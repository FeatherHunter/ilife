/** dsh-calorie 端口（port）：DSH 世界与卡路里 hexagon 之间的契约。
 *
 * browser 安全：零 node 导入。host 适配器（注册 RPC 通道）与 client
 * 适配器（调用 RPC）共用同一份定义；单测与 loader 回路以此为准。
 * 通道命名遵守宿主约束：单段且不等于 /api（见 cookbook「RPC 通道」）。
 */
export const RPC_CHANNEL = '/ilife-calorie' as const;
export const RPC_ENDPOINT_READ = 'read' as const;

/** #676 配置端点：读设置页整面、保存一份取值、重置为默认。同走一条通道，靠端点名分发。 */
export const RPC_ENDPOINT_CONFIG_GET = 'config.get' as const;
export const RPC_ENDPOINT_CONFIG_SAVE = 'config.save' as const;
export const RPC_ENDPOINT_CONFIG_RESET = 'config.reset' as const;

/** #706 配置体检端点：只读一次，回一份报告（判据由技能侧出，本包只透传）。
 *
 * 端点名与技能侧那条只读命令同名（`calorie.config.check`），两端各写一份、值相同：
 * 插件侧这份是面板的第二段参数，技能侧那份是 CLI 要认的命令名。**报告形状**的唯一真相在
 * 技能侧 `packages/skill-calorie/src/health.ts`；面板侧镜像在
 * `packages/plugin-manager/src/health-contract.ts`。本包不校验、不重写那份报告。 */
export const RPC_ENDPOINT_CONFIG_CHECK = 'config.check' as const;

/** 保存载荷：一份键值（键路径 → 值）。缺项由宿主按默认值补齐，故只收用户真改的那些。 */
export interface SavePayload {
  readonly values: Record<string, unknown>;
}

/** 保存载荷校验：形状不对返回 null，由调用方按 bad-request 回绝（不抛）。 */
export function parseSavePayload(raw: unknown): SavePayload | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { values } = raw as { values?: unknown };
  if (typeof values !== 'object' || values === null || Array.isArray(values)) return null;
  return { values: values as Record<string, unknown> };
}

/** 配置面回执：设置页一次拿齐「文件在哪、数据在哪、当前值、是不是这次新建的」。
 *
 * 形状与技能侧 `calorie.config.read` 的 data 逐字段同形（唯一定义地在那边的 cli/config.ts）。
 * 这里不带默认值表——页面不猜默认值，「留空＝按默认落点」由行文案说清，
 * 「重置为默认」由技能侧 `calorie.config.reset` 执行。
 */
export interface ConfigSurfaceReply {
  /** 配置文件绝对路径。 */
  readonly path: string;
  /** 数据目录绝对路径。 */
  readonly dataDir: string;
  /** 本次是不是「文件不存在、按默认值落了一份」。 */
  readonly created: boolean;
  /** 当前取值（文件里的 ⊕ 缺项按默认值补）。 */
  readonly values: Record<string, unknown>;
}

/** 读请求载荷：与技能 CLI 的 key/params 同形（见 skill-calorie SKILL.md）。 */
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

/** 面板默认读键（与 HITL 一致性对比同键）。 */
export const DEFAULT_READ_KEY = 'calorie.view.home' as const;

/** 信封守卫：供 client 拆包前校验（port 拥有信封定义，守卫住 port）。 */
export function isRpcResult(raw: unknown): raw is RpcResult {
  if (typeof raw !== 'object' || raw === null) return false;
  const ok = (raw as { ok?: unknown }).ok;
  return ok === true || ok === false;
}
