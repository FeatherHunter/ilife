/** dsh-life-pack 导航表（P10 脚手架，P3 #4 定案 order）。
 *
 * 总管只导航：6 tab 描述子仅做 openTab 路径导航，内容由各单品包自注册
 * slot 提供；总管不 import 任何单品页/单品包（见 boundaries 断言）。
 * 缺席纯条件渲染：present 缺谁就回谁的 reco（推荐安装+补装提示），不轮询。
 * 子页不占栏：卡路里 diet/exercise/goal 等 ilife:calorie:* 后缀只在单品
 * 主面板内导航，绝不在此表另起 tab 行。
 * 60 deck:map 为 matt 探针已占位，本表不动它。
 *
 * 面板外壳的静态文案表也在本文件（票 #679）：使用手册入口 MANUAL_ENTRY。文案与网址
 * 集中在这里，组件只负责画——改文案不碰组件（map #671 的 Q11 决议）。
 * #12 起底部作者推荐卡与联系入口改由 dsh-featherhunter-plugin-base 渲染（清单/二维码/离线兜底
 * 单一真源在 base 的 data/manifest.json）；页头三件套（联系／Star／Issue）同样改由 base 0.1.1
 * 的 ActionGroup 提供，本仓不再维护入口表。
 */

import { m } from './entries/index.js';
import { PLUGIN_CHANNELS } from './shared-copy.generated.js';
export interface ManagerTab {
  readonly skill: string;
  readonly slotId: string;
  readonly order: number;
  /** 页签名（屏上逐字印这个）＝**产品名**（票 #738：作息管家／居家管家／私家大厨／饼干记账）。
   *
   *  它是各家自己那个 `SLOT_TITLE` 的镜像，两处必须同值：页签注册缺席时由这一格兜底，
   *  更新列表那一行的行首也用它（`update-targets.ts` 原样取 `title`）。
   *  对齐由 `test/plugin-p10-boundaries.test.mjs` 逐家咬住——真 import 两边的产物来比，不搜字符串。 */
  readonly title: string;
  /** 提供该 tab 的单品插件包名（仅文档级引用，不 import）。 */
  readonly plugin: string;
  /** 本家自己那条客户端通道（单段，例 `/ilife-calorie`）：面板按它取配置体检（体检那个端点挂在上面）。
   *
   *  这条事实为什么住在这里（票 #735）：各家注册页签槽时**也**会交一份（各包契约件的 `RPC_CHANNEL`），
   *  但装机上的槽位面**不透传自定义注册选项**——条目 options 只留 `{key,id,order,label,priority}`，
   *  总管从账本上读到的那一格恒是空串。后果是六家恒被判成「没有体检出口」，
   *  面板的体检目标表恒为空，「体检一次」按下去毫无反应（第 1 版的实现就是这么哑掉的）。
   *  这份镜像由 `test/plugin-p10-boundaries.test.mjs` 逐家与各包契约件的常量对齐守着。
   *  各家注册里那一格**留着不删**：上游哪天开始透传自定义选项，可以一行切回账本。
   *
   *  #1231 起这一格不再是手写副本：七份镜像（六家契约件＋本表）的唯一可编辑处是
   *  `tooling/shared-copy.json`，本表取 `shared-copy.generated.ts` 的 `PLUGIN_CHANNELS`——
   *  与各家契约件的 `RPC_CHANNEL` 同一份派生，改值只改那张表再跑 `node tooling/gen-shared-copy.mjs`。 */
  readonly channel: string;
}

export interface RecoTab extends ManagerTab {
  readonly kind: 'reco';
  /** 补装命令（单命令双包口径，总管必须已在位）。 */
  readonly installCmd: string;
  readonly hint: string;
}

export const MANAGER_PLUGIN = 'dsh-life-pack' as const;

/** 版本号**不在本文件**：它由构建期从本包 `package.json` 注入面板产物（票 #986，见
 *  `tsdown.config.ts` 与 `client.ts` 的 `__LIFE_PACK_VERSION__`）——手写常量会与包版本
 *  无声漂开一整版（#737 实测过），而注入值由构造派生、并有一条构建门咬住
 *  「产物里的注入值 ≡ 包版本」；定版仍只剩改 `package.json` 一处。 */

export const DUAL_ADD_PREFIX = 'dsh plugin add dsh-life-pack' as const;

export function dualInstallCmd(singlePlugin: string): string {
  return DUAL_ADD_PREFIX + ' ' + singlePlugin;
}

/** P3 定案 6 tab（order 升序即 + 号菜单顺序；已打开条不受 order 控制）。 */
function buildManagerTabs(): readonly ManagerTab[] {
  return [
    { skill: 'bill', slotId: 'ilife:cookie', order: 70, title: m('plugin-manager.nav.c002'), plugin: 'dsh-bill-ilife', channel: PLUGIN_CHANNELS.bill },
    { skill: 'calorie', slotId: 'ilife:calorie', order: 75, title: m('plugin-manager.nav.c003'), plugin: 'dsh-calorie', channel: PLUGIN_CHANNELS.calorie },
    { skill: 'memo', slotId: 'ilife:memo', order: 80, title: m('plugin-manager.nav.c004'), plugin: 'dsh-memo-ilife', channel: PLUGIN_CHANNELS.memo },
    { skill: 'schedule', slotId: 'ilife:schedule', order: 85, title: m('plugin-manager.nav.c005'), plugin: 'dsh-schedule-ilife', channel: PLUGIN_CHANNELS.schedule },
    { skill: 'home', slotId: 'ilife:home', order: 90, title: m('plugin-manager.nav.c006'), plugin: 'dsh-home-ilife', channel: PLUGIN_CHANNELS.home },
    { skill: 'chef', slotId: 'ilife:chef', order: 95, title: m('plugin-manager.nav.c007'), plugin: 'dsh-chef', channel: PLUGIN_CHANNELS.chef },
  ];
}

/** 渲染期现取：产品名随语言走（#1229）。 */
export function managerTabs(): readonly ManagerTab[] {
  return buildManagerTabs();
}

/** 兼容镜像：模块加载期取一次（仓库级边界测试与 update-batch 按常量读）；渲染路径用 managerTabs()。 */
export const MANAGER_TABS: readonly ManagerTab[] = buildManagerTabs();

export function recoFor(tab: ManagerTab): RecoTab {
  const installCmd = dualInstallCmd(tab.plugin);
  return {
    ...tab,
    kind: 'reco',
    installCmd,
    hint: m('plugin-manager.nav.c001', { p0: String(tab.plugin), p1: String(installCmd) }),
  };
}

export type Presence = ReadonlySet<string>;

export function tabsForPresence(present: Presence): readonly (ManagerTab | RecoTab)[] {
  return managerTabs().map((t) => (present.has(t.slotId) ? t : recoFor(t)));
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

/** 面板顶部使用手册入口（票 #1237）：甲腰封书（红封＋书脊＋米色腰封＋名牌），点开弹出书。
 *
 * 文案住表、组件只画（map #671 的 Q11 决议）；书的样子逐字取定版甲，书体是 #1238 的活。 */
export interface ManualEntryRow {
  readonly key: 'manual';
  readonly title: string;
  readonly tip: string;
}

/** 使用手册入口那一行（渲染期现取）。 */
export function manualEntry(): ManualEntryRow {
  return {
    key: 'manual',
    title: m('plugin-manager.nav.c008'),
    tip: m('plugin-manager.nav.c009'),
  };
}

/** 兼容镜像：模块加载期取一次；渲染路径用 manualEntry()。 */
export const MANUAL_ENTRY: ManualEntryRow = manualEntry();

