/** dsh-memo-ilife 槽位描述（P10 脚手架，P3 #4 定案）。
 *
 * 写死槽位原生组件：id 命名空间 ilife:memo，order 70。
 * 注册与打开只走 registerTab/openTab 的路径导航；子页后缀（如 ilife:memo:*）
 * 只在主面板内导航，不占栏。缺席纯条件渲染，不轮询（本文件无定时器；
 * 有界重试归一由 base-render 拥有，单品不自建）。
 */

import { m } from './entries/index.js';
export const SKILL = 'memo' as const;
export const SLOT_ID = 'ilife:memo' as const;
export const SLOT_ORDER = 80 as const;
/** 页签名（产品名）：渲染期现取，词条随语言走（#1229）。 */
export function slotTitle(): string {
  return m('plugin-memo-ilife.slot.c001');
}

/** 兼容镜像：模块加载期取一次（仓库级边界测试与跨包消费方按常量读）；渲染路径一律走 slotTitle()。 */
export const SLOT_TITLE = slotTitle();
export const PLUGIN = 'dsh-memo-ilife' as const;
export const MANAGER_PLUGIN = 'dsh-life-pack' as const;
export const SKILL_PACKAGE = 'skill-memo-ilife' as const;

/** #918：面板版本行不再有手写常量——两个号由宿主半按包名读**已装**的那份 `package.json`
 *  （总管 `installedVersionOf`，见 `bridge.ts` 的 `readInstalledVersions`），客户端只渲染宿主回的值。
 *  故本文件不持任何版本号：发版只改各处 `package.json` 一处，屏上那行由构造保证跟着走。 */

export interface SlotDescriptor {
  readonly skill: string;
  readonly slotId: string;
  readonly order: number;
  readonly title: string;
  readonly kind: 'page';
}

export function slotDescriptor(): SlotDescriptor {
  return { skill: SKILL, slotId: SLOT_ID, order: SLOT_ORDER, title: slotTitle(), kind: 'page' };
}

/** 写死原生组件描述（纯数据，无按需加载，无外嵌页）。 */
export const TAB_COMPONENT = { kind: 'native', name: 'MemoPanel' } as const;

export interface TabsPort {
  hasTabs(): boolean;
  registerTab(entry: { readonly id: string; readonly title: string; readonly order: number; readonly single: boolean; readonly component: unknown }): () => void;
  openTab(seed: { readonly type: string; readonly path: string }, scope?: { readonly sessionId?: string }): void;
}

/** 自注册：幂等（调用方持 disposer），失败返回 false 由调用方决定重试。 */
export function registerSingle(port: TabsPort): (() => void) | null {
  if (!port.hasTabs()) return null;
  return port.registerTab({ id: SLOT_ID, title: slotTitle(), order: SLOT_ORDER, single: true, component: TAB_COMPONENT });
}

/** 内容型打开：path seed，折叠面板自动展开。 */
export function openSingle(port: TabsPort, sessionId?: string): void {
  if (!port.hasTabs()) return;
  port.openTab({ type: SLOT_ID, path: SLOT_ID }, sessionId ? { sessionId } : undefined);
}
