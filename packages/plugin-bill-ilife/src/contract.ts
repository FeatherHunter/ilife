/** dsh-bill-ilife 端口（port）：DSH 世界与饼干记账 hexagon 之间的契约。
 *
 * browser 安全：零 node 导入。host 适配器（注册 RPC 通道）与 client
 * 适配器（调用 RPC）共用同一份定义；单测与 loader 回路以此为准。
 * 通道命名遵守宿主约束：单段且不等于 /api（见 cookbook「RPC 通道」）。
 *
 * 照 #56 卡路里样板同形（`packages/plugin-calorie/src/contract.ts`）：记账插件原先
 * **没有任何 RPC 通道**，本件是它第一份端口定义（#677）。
 */
export const RPC_CHANNEL = '/ilife-bill-ilife' as const;
export const RPC_ENDPOINT_READ = 'read' as const;

/** #677 配置端点：读设置页整面、保存一份取值、重置为默认。同走一条通道，靠端点名分发。 */
export const RPC_ENDPOINT_CONFIG_GET = 'config.get' as const;
export const RPC_ENDPOINT_CONFIG_SAVE = 'config.save' as const;
export const RPC_ENDPOINT_CONFIG_RESET = 'config.reset' as const;
/** #706 配置体检端点：只读一次，回一份报告（判据由技能侧出，本包只透传，不重写一个字）。
 *
 * 端点名与技能侧那条只读命令同名（`<技能>.config.check`）；报告形状的唯一真相在技能侧
 * `packages/skill-<技能>/src/health.ts`，面板侧镜像在 `packages/plugin-manager/src/health-contract.ts`。 */
export const RPC_ENDPOINT_CONFIG_CHECK = 'config.check' as const;

/** 读请求载荷：与技能 CLI 的 key/params 同形（见 skill-bill SKILL.md）。 */
export interface ReadPayload {
  readonly key: string;
  readonly params: Record<string, unknown>;
}

/** 保存载荷：一份键值（键路径 → 值）。缺项由技能侧按默认值补齐，故只收用户真改的那些。 */
export interface SavePayload {
  readonly values: Record<string, unknown>;
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

/** 读载荷校验：形状不对返回 null，由调用方按 bad-request 回绝（不抛）。 */
export function parseReadPayload(raw: unknown): ReadPayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { key, params } = raw as { key?: unknown; params?: unknown };
  if (typeof key !== 'string' || key.length === 0) return null;
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return null;
  return { key, params: params as Record<string, unknown> };
}

/** 保存载荷校验：形状不对返回 null，由调用方按 bad-request 回绝（不抛）。 */
export function parseSavePayload(raw: unknown): SavePayload | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { values } = raw as { values?: unknown };
  if (typeof values !== 'object' || values === null || Array.isArray(values)) return null;
  return { values: values as Record<string, unknown> };
}

/** 解析后的绝对路径组（#749）：技能侧算好的落点，设置页的只读行**只显示、不计算**
 *  （口径「面板不算默认值、不拼路径」，见 #677 冻结的边界）。
 *
 *  格名与技能侧 `packages/skill-bill/src/fetch/paths.ts` 的 `BillResolvedPaths` 逐字同形
 *  （那是算式与取值的唯一定义地）；六家的 `*.config.read` 都扩这样一组，各自的格子按自家落点项来。 */
export interface ResolvedPaths {
  /** 生效数据目录（面板上唯一可改的那一项的生效值）。 */
  readonly dbDir: string;
  /** 库文件绝对路径。 */
  readonly dbFile: string;
  /** 第二份库（预算／账户）绝对路径。 */
  readonly goalsFile: string;
  /** HELP 产物目录绝对路径。 */
  readonly htmlDir: string;
  /** 备份目录绝对路径。 */
  readonly backupDir: string;
  /** 备份文件名示例（`<前缀><时间戳>.db`，前缀按当刻配置）。 */
  readonly backupSample: string;
}

/** 配置面回执：形状与技能侧 `bill.config.read` 的 data 逐字段同形（唯一定义地在那边的 cli/config.ts）。 */
export interface ConfigSurfaceReply {
  /** 配置文件绝对路径。 */
  readonly path: string;
  /** 数据目录绝对路径。 */
  readonly dataDir: string;
  /** 本次是不是「文件不存在、按默认值落了一份」。 */
  readonly created: boolean;
  /** 当前取值（文件里的 ⊕ 缺项按默认值补）。 */
  readonly values: Record<string, unknown>;
  /** 一组解析后的绝对路径（#749 起技能侧回执带上）。
   *  **可选**：装的是旧技能时这一格缺席，只读行显示空串（面板不自己拼路径，绝不编一条出来）。 */
  readonly resolved?: ResolvedPaths;
}

/** 信封守卫：供 client 拆包前校验（port 拥有信封定义，守卫住 port）。 */
export function isRpcResult(raw: unknown): raw is RpcResult {
  if (typeof raw !== 'object' || raw === null) return false;
  const okFlag = (raw as { ok?: unknown }).ok;
  return okFlag === true || okFlag === false;
}
