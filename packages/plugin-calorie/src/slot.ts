/** dsh-calorie 槽位描述（P10 脚手架，P3 #4 定案）。
 *
 * 写死槽位原生组件：id 命名空间 ilife:calorie，order 75。
 * 注册与打开只走 registerTab/openTab 的路径导航；子页后缀（如 ilife:calorie:*）
 * 只在主面板内导航，不占栏。缺席纯条件渲染，不轮询（本文件无定时器；
 * 有界重试归一由 base-render 拥有，单品不自建）。
 */

export const SKILL = 'calorie' as const;
export const SLOT_ID = 'ilife:calorie' as const;
export const SLOT_ORDER = 75 as const;
export const SLOT_TITLE = '卡路里' as const;
export const PLUGIN = 'dsh-calorie' as const;
export const MANAGER_PLUGIN = 'dsh-life-pack' as const;
export const SKILL_PACKAGE = 'skill-calorie' as const;

/** #130：手写版本常量（旧 PLUGIN_VERSION／SKILL_VERSION）已删除，旧「发版 bump 时同步改这里」纪律一并废止。
 *
 * 版本号唯一真相源＝已安装的磁盘 package.json，本文件不再持有任何版本值（也不再有版本兼容层）。
 * 两个原因必须如此：
 * ① 手写常量是第二真相源，发版只 bump package.json 时面板就会撒谎（#130 的缺陷本身）；
 * ② 本文件被 src/client.ts 引入（client 束），而版本读取在 host 侧——若在此 import
 *    './bridge.js'，bridge 的 5 个 node: 导入会被带进浏览器束，破 DSH client 纯度契约。
 * 面板版本只走一条路：host（bridge.readInstalledVersions，读双 package.json）→ RPC
 * （键见 bridge.VERSION_READ_KEY）→ client 纯渲染（读不到侧显示 unknown）。
 */

export interface SlotDescriptor {
  readonly skill: string;
  readonly slotId: string;
  readonly order: number;
  readonly title: string;
  readonly kind: 'page';
}

export function slotDescriptor(): SlotDescriptor {
  return { skill: SKILL, slotId: SLOT_ID, order: SLOT_ORDER, title: SLOT_TITLE, kind: 'page' };
}

/** 写死原生组件描述（纯数据，无按需加载，无外嵌页）。 */
export const TAB_COMPONENT = { kind: 'native', name: 'CaloriePanel' } as const;

export interface TabsPort {
  hasTabs(): boolean;
  registerTab(entry: { readonly id: string; readonly title: string; readonly order: number; readonly single: boolean; readonly component: unknown }): () => void;
  openTab(seed: { readonly type: string; readonly path: string }, scope?: { readonly sessionId?: string }): void;
}

/** 自注册：幂等（调用方持 disposer），失败返回 false 由调用方决定重试。 */
export function registerSingle(port: TabsPort): (() => void) | null {
  if (!port.hasTabs()) return null;
  return port.registerTab({ id: SLOT_ID, title: SLOT_TITLE, order: SLOT_ORDER, single: true, component: TAB_COMPONENT });
}

/** 内容型打开：path seed，折叠面板自动展开。 */
export function openSingle(port: TabsPort, sessionId?: string): void {
  if (!port.hasTabs()) return;
  port.openTab({ type: SLOT_ID, path: SLOT_ID }, sessionId ? { sessionId } : undefined);
}
