/** 「本机根清单」的取数接线（客户端半）：把一通电话变成图上那一行可跳转的根。
 *
 * **不认识宿主**：载体基段、通道名（第二段）、电话名全由调用方传进来——各家从自己的宿主镜像里拿
 * 那几个字面量（和 `openRowBrowser` 的 `refusalCode` 同一条规矩）。本件只做两件事：
 * 发一次调用、把回执信封拆成根清单；**任何失败都当空清单**（图上少画一行，不报错、不挡路）。
 */

import type { RootKind, RootRow } from './directory-browser-contract.js';

/** 取数口：`connection.rpc.call` 的形状，每次现取（连接后到也不永久缺席）。 */
export type RootsCall = (
  base: string,
  endpoint: string,
  payload: unknown,
  signal?: AbortSignal,
) => Promise<unknown>;

/** 认一认某个值像不像一个根（认不出的行丢掉：图的干净比多画一行重要）。 */
function isRootRow(raw: unknown): raw is RootRow {
  if (typeof raw !== 'object' || raw === null) return false;
  const row = raw as { path?: unknown; kind?: unknown };
  return typeof row.path === 'string' && row.path !== '' && typeof row.kind === 'string';
}

/** 信封 → 根清单（纯函数，**永不抛**）：`{ok:true, value:{roots:[…]}}` 之外的形状一律当空。 */
export function readRootsAnswer(raw: unknown): readonly RootRow[] {
  const answer = (typeof raw === 'object' && raw !== null ? raw : {}) as { ok?: unknown; value?: unknown };
  if (answer.ok !== true) return [];
  const value = (typeof answer.value === 'object' && answer.value !== null ? answer.value : {}) as { roots?: unknown };
  if (!Array.isArray(value.roots)) return [];
  return value.roots.filter(isRootRow).map((row) => ({ path: row.path, kind: row.kind as RootKind }));
}

/** 建一个「根清单取数器」：给调用口与三个名字，回一个 `() => Promise<RootRow[]>`。
 *
 * 界面按需调它（开图一次），不在渲染里调，也不缓存到这里——缓存是宿主半的事。 */
export function createRootsSource(input: {
  readonly getCall: () => unknown;
  readonly base: string;
  readonly endpoint: string;
  readonly method: string;
}): () => Promise<readonly RootRow[]> {
  return async () => {
    const call = input.getCall();
    if (typeof call !== 'function') return [];
    try {
      return readRootsAnswer(
        await (call as RootsCall)(input.base, input.endpoint, { method: input.method, payload: {} }),
      );
    } catch {
      return [];
    }
  };
}
