/** dsh-life-pack 客户端存根（P10 脚手架）。
 *
 * 只导航：写死槽位原生组件描述，不做动态按需加载，不做外嵌页。
 * 面板只经 host.call 触发导航，跨技能取数由各单品走自家 host.call 链，
 * 总管不 import 单品实现（见 boundaries 断言）。
 * 缺席纯条件渲染，无轮询（本文件无任何定时器）。
 */

import { MANAGER_TABS, openManagerTab } from './nav.js';
import type { HasTabsPort } from './nav.js';

export interface HostCaller {
  call(method: string, args: unknown): Promise<unknown>;
}

export const MANAGER_COMPONENT = { kind: 'native', name: 'LifePackNav' } as const;

export function mountManagerClient(port: HasTabsPort): () => void {
  const order = [...MANAGER_TABS].sort((a, b) => a.order - b.order);
  void order;
  return () => {};
}

export function requestOpenViaHost(host: HostCaller, slotId: string): Promise<unknown> {
  return host.call('ilife.manager.open', { slotId });
}

export function openViaPort(port: HasTabsPort, slotId: string, sessionId?: string): void {
  openManagerTab(port, slotId, sessionId);
}
