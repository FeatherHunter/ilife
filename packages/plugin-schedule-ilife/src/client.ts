/** dsh-schedule-ilife 客户端存根（P10 脚手架）。
 *
 * 写死槽位原生组件，不做动态按需加载，不做外嵌页。
 * 面板取数只经 host.call 进 host 桥（见 bridge.ts），不 import 技能实现。
 * 缺席纯条件渲染，无轮询（本文件无任何定时器）。
 *
 * 产物由 tsdown 打成 loader 工厂包（browser/CJS，见 tsdown.config.ts）：
 * `tsc -b` 排除了本文件，裸 ESM 在 DSH 那条合并 `<script>` 里必成语法错（#150）。
 */

import { TAB_COMPONENT, registerSingle, openSingle } from './slot.js';
import type { TabsPort } from './slot.js';
import { HOST_CALL_METHOD } from './bridge.js';

export interface HostCaller {
  call(method: string, args: unknown): Promise<unknown>;
}

export const CLIENT_COMPONENT = TAB_COMPONENT;
export const CLIENT_METHOD = HOST_CALL_METHOD;

/** 客户端插件声明的 ctx 服务短名（loader 契约之一）。本存根不读任何服务，故为空数组；
 *  `package.json` 的 `dsh.client.inject` 与本数组同为空。 */
export const inject: readonly string[] = [];

/** 客户端插件入口（loader 契约之二）：DSH 客户端 runner 只把「有 `apply` 函数」的对象当插件。
 *
 *  **这是占位**：真面板接线（槽位注册／软依赖有界重试／超时／三态渲染）属作息面板那条线。
 *  做成空实现只为让客户端产物在 loader 里是**合法插件**、不阻碍 web profile 启动。 */
export function apply(): void {
  // 面板接线见作息面板票。
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
