/** dsh-life-pack 导航表（P10 脚手架，P3 #4 定案 order）。
 *
 * 总管只导航：6 tab 描述子仅做 openTab 路径导航，内容由各单品包自注册
 * slot 提供；总管不 import 任何单品页/单品包（见 boundaries 断言）。
 * 缺席纯条件渲染：present 缺谁就回谁的 reco（推荐安装+补装提示），不轮询。
 * 子页不占栏：卡路里 diet/exercise/goal 等 ilife:calorie:* 后缀只在单品
 * 主面板内导航，绝不在此表另起 tab 行。
 * 60 deck:map 为 matt 探针已占位，本表不动它。
 */

export interface ManagerTab {
  readonly skill: string;
  readonly slotId: string;
  readonly order: number;
  readonly title: string;
  /** 提供该 tab 的单品插件包名（仅文档级引用，不 import）。 */
  readonly plugin: string;
}

export interface RecoTab extends ManagerTab {
  readonly kind: 'reco';
  /** 补装命令（单命令双包口径，总管必须已在位）。 */
  readonly installCmd: string;
  readonly hint: string;
}

export const MANAGER_PLUGIN = 'dsh-life-pack' as const;

export const DUAL_ADD_PREFIX = 'dsh plugin add dsh-life-pack' as const;

export function dualInstallCmd(singlePlugin: string): string {
  return DUAL_ADD_PREFIX + ' ' + singlePlugin;
}

/** P3 定案 6 tab（order 升序即 + 号菜单顺序；已打开条不受 order 控制）。 */
export const MANAGER_TABS: readonly ManagerTab[] = [
  { skill: 'memo', slotId: 'ilife:memo', order: 70, title: '备忘录', plugin: 'dsh-memo' },
  { skill: 'calorie', slotId: 'ilife:calorie', order: 75, title: '卡路里', plugin: 'dsh-calorie' },
  { skill: 'schedule', slotId: 'ilife:schedule', order: 80, title: '作息', plugin: 'dsh-schedule' },
  { skill: 'home', slotId: 'ilife:home', order: 85, title: '居家', plugin: 'dsh-home' },
  { skill: 'chef', slotId: 'ilife:chef', order: 90, title: '大厨', plugin: 'dsh-chef' },
  { skill: 'bill', slotId: 'ilife:cookie', order: 95, title: '记账', plugin: 'dsh-bill' },
];

export function recoFor(tab: ManagerTab): RecoTab {
  const installCmd = dualInstallCmd(tab.plugin);
  return {
    ...tab,
    kind: 'reco',
    installCmd,
    hint: '未安装[' + tab.plugin + ']，请补装后使用：' + installCmd,
  };
}

export type Presence = ReadonlySet<string>;

export function tabsForPresence(present: Presence): readonly (ManagerTab | RecoTab)[] {
  return MANAGER_TABS.map((t) => (present.has(t.slotId) ? t : recoFor(t)));
}

export interface OpenPort {
  openTab(seed: { readonly type: string; readonly path: string }, scope?: { readonly sessionId?: string }): void;
}

export interface HasTabsPort extends OpenPort {
  hasTabs(): boolean;
}

/** 总管导航：只做 openTab 路径导航（内容型打开），缺席由调用方渲染 reco。 */
export function openManagerTab(port: HasTabsPort, slotId: string, sessionId?: string): void {
  if (!port.hasTabs()) return;
  port.openTab({ type: slotId, path: slotId }, sessionId ? { sessionId } : undefined);
}
