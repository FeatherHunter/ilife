/** dsh-ilife-bill 客户端存根（P10 脚手架）。
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

export function mountSingleClient(port: TabsPort): (() => void) | null {
  return registerSingle(port);
}

export function openSingleClient(port: TabsPort, sessionId?: string): void {
  openSingle(port, sessionId);
}

export function requestReadViaHost(host: HostCaller, key: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return host.call(HOST_CALL_METHOD, { key, params });
}
