/** dsh-bill-ilife 客户端存根（P10 脚手架）。
 *
 * 写死槽位原生组件，不做动态按需加载，不做外嵌页。
 * 面板取数只经 host.call 进 host 桥（见 bridge.ts），不 import 技能实现。
 * 缺席纯条件渲染，无轮询（本文件无任何定时器）。
 */

import { TAB_COMPONENT, registerSingle, openSingle } from './slot.js';
import type { TabsPort } from './slot.js';
import { HOST_CALL_METHOD } from './bridge.js';

export interface HostCaller {
  call(method: string, args: unknown): Promise<unknown>;
}

export const CLIENT_COMPONENT = TAB_COMPONENT;
export const CLIENT_METHOD = HOST_CALL_METHOD;

/** 客户端插件声明的 ctx 服务短名（loader 契约之一）。占位实现不读任何服务，故为空数组；
 *  `package.json` 的 `dsh.client.inject` 与本数组同为空；真面板接线见 #59。 */
export const inject: readonly string[] = [];

/** 客户端插件入口（loader 契约之二）：DSH 客户端 runner 只把「有 `apply` 函数」的对象当插件
 *  （`dsh-cordis-client-runner` 里 `typeof value === 'object' && typeof value.apply === 'function'`）。
 *
 *  **这是占位**：真面板接线（slots 注册／软依赖有界重试／AbortSignal 超时／三态渲染）属 #59 那票。
 *  做成空实现只为让客户端产物在 loader 里是**合法插件**、不阻碍 web profile 启动——
 *  不是把面板「做完」。 */
export function apply(): void {
  // 面板接线见 #59。
}

export function mountSingleClient(port: TabsPort): (() => void) | null {
  return registerSingle(port);
}

export function openSingleClient(port: TabsPort, sessionId?: string): void {
  openSingle(port, sessionId);
}

export function requestReadViaHost(host: HostCaller, key: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return host.call(HOST_CALL_METHOD, { key, params });
}
