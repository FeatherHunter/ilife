/** dsh-life-pack 导航表（P10 脚手架，P3 #4 定案 order）。
 *
 * 总管只导航：6 tab 描述子仅做 openTab 路径导航，内容由各单品包自注册
 * slot 提供；总管不 import 任何单品页/单品包（见 boundaries 断言）。
 * 缺席纯条件渲染：present 缺谁就回谁的 reco（推荐安装+补装提示），不轮询。
 * 子页不占栏：卡路里 diet/exercise/goal 等 ilife:calorie:* 后缀只在单品
 * 主面板内导航，绝不在此表另起 tab 行。
 * 60 deck:map 为 matt 探针已占位，本表不动它。
 *
 * 面板外壳的两张文案表也在本文件（票 #679）：右上角两个入口 PANEL_LINKS、
 * 底部「作者其他插件」卡 MORE_PLUGINS。文案与网址集中在这里，
 * 组件只负责画——改文案不碰组件（map #671 的 Q11 决议）。
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

/** 总管版本号（与 package.json 同步，release 时一起 bump；设置页总设置区版本行唯一来源）。 */
export const MANAGER_VERSION = '0.2.6' as const;

export const DUAL_ADD_PREFIX = 'dsh plugin add dsh-life-pack' as const;

export function dualInstallCmd(singlePlugin: string): string {
  return DUAL_ADD_PREFIX + ' ' + singlePlugin;
}

/** P3 定案 6 tab（order 升序即 + 号菜单顺序；已打开条不受 order 控制）。 */
export const MANAGER_TABS: readonly ManagerTab[] = [
  { skill: 'memo', slotId: 'ilife:memo', order: 70, title: '备忘录', plugin: 'dsh-memo-ilife' },
  { skill: 'calorie', slotId: 'ilife:calorie', order: 75, title: '卡路里', plugin: 'dsh-calorie' },
  { skill: 'schedule', slotId: 'ilife:schedule', order: 80, title: '作息', plugin: 'dsh-schedule-ilife' },
  { skill: 'home', slotId: 'ilife:home', order: 85, title: '居家', plugin: 'dsh-home-ilife' },
  { skill: 'chef', slotId: 'ilife:chef', order: 90, title: '大厨', plugin: 'dsh-chef' },
  { skill: 'bill', slotId: 'ilife:cookie', order: 95, title: '记账', plugin: 'dsh-bill-ilife' },
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

/** 面板右上角一个入口：图标 ＋ 悬停说明 ＋ 目标网址。 */
export interface PanelLinkRow {
  readonly key: 'star' | 'feedback';
  /** 图标字形（照参照实现 dsh-mattpocock-skills-deck，星星只留 ⭐、反馈只留 💬）。 */
  readonly glyph: string;
  /** 鼠标悬停给出的说明文字。 */
  readonly tip: string;
  readonly url: string;
}

/** 面板右上角两个入口：星（去本仓点 star）＋ 气泡（去本仓开 issue）。
 *
 * 两处都指本仓 FeatherHunter/ilife——这是 map #671 裁定过的（「星与气泡指向哪个仓」
 * 一问：反馈要落在本仓的需求池，「引流到作者其他技能」是底部那张卡的事）。
 * 三件并排里的第三件「检查更新」住隔壁票（#678），本表不管它。
 */
export const PANEL_LINKS: readonly PanelLinkRow[] = [
  { key: 'star', glyph: '⭐', tip: '去 GitHub 点 Star', url: 'https://github.com/FeatherHunter/ilife' },
  { key: 'feedback', glyph: '💬', tip: '反馈问题', url: 'https://github.com/FeatherHunter/ilife/issues/new' },
];

/** 底部「作者其他插件」卡里的一行：包名 ＋ 一句说明 ＋ 行尾外链图标指向的仓库。 */
export interface MorePluginRow {
  readonly pkg: string;
  readonly desc: string;
  readonly url: string;
}

/** 「作者其他插件」四行：包名 ＋ 一句说明 ＋ 仓库地址。
 *
 * 文案口径（用户 2026-09-18 拍板）：**不写数字**——数字会过期（用户截图里的「34 款」实测已到 38 款），
 * 写错最伤推荐位的可信度；第一行也不用 deck 自己面板里的自指「本面板自己」，改成不自指的说法。
 * 只收真实存在的仓库，网址已逐个验真。第一行的说明描述的是 deck 那个包（工程技能面板），不是爱生活面板。
 */
export const MORE_PLUGINS: readonly MorePluginRow[] = [
  {
    pkg: 'dsh-mattpocock-skills-deck',
    desc: '工程技能面板：装好就能在右侧直接用',
    url: 'https://github.com/FeatherHunter/dsh-mattpocock-skills-deck',
  },
  {
    pkg: 'dsh-opencode-palette',
    desc: '多款长时间编程护眼配色，一键换上',
    url: 'https://github.com/FeatherHunter/dsh-opencode-palette',
  },
  {
    pkg: 'dsh-prompt',
    desc: '常用提示模板随手点，不用来回复制粘贴',
    url: 'https://github.com/FeatherHunter/dsh-prompt',
  },
  {
    pkg: 'dsh-im-companion',
    desc: '聊天机器人的伴侣插件：扫码或填凭据就把飞书、微信等聊天接进来',
    url: 'https://github.com/FeatherHunter/dsh-im-companion',
  },
];
