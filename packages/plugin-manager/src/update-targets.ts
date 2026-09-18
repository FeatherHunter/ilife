/** 七个更新目标（总管自己 ＋ 六个单品），以及每个目标的电话名前缀。
 *
 * 为什么要这张表：更新包一次只管一个**目标包**（`createHostUpdate` 的 `targetPackageName`），
 * 面板的「一个按钮查七家」要七组电话；七组之间靠**各自的前缀**与**各自的插件标识**隔离
 * （更新包 README 第 12 节：前缀相同就是串台）。
 *
 * 包名不新开一处定义：六个单品的包名取自 `nav.ts` 的 `MANAGER_TABS`（导航表是唯一真相），
 * 总管自己的包名取自 `install.ts` 的 `MANAGER_PACKAGE`。
 * 安装与更新的单位都是**插件包**：技能包是插件包精确 pin 的传递依赖，不单独查更新。
 */
import { MANAGER_PACKAGE } from './install.js';
import { MANAGER_TABS } from './nav.js';

export interface UpdateTarget {
  /** 稳定键（= 导航表的 `skill`；总管自己用 `life-pack`）。 */
  readonly key: string;
  /** 中文名（面板行首用）。 */
  readonly title: string;
  /** 更新与安装的目标包。 */
  readonly packageName: string;
  /** 更新包的电话名前缀（七个必须互不相同，否则串台）。 */
  readonly phonePrefix: string;
}

/** 总管自己的键：不占六个技能的键名。 */
export const MANAGER_TARGET_KEY = 'life-pack' as const;

/** 七个目标：总管自己在前，六家按导航表顺序。 */
export const UPDATE_TARGETS: readonly UpdateTarget[] = [
  { key: MANAGER_TARGET_KEY, title: '爱生活', packageName: MANAGER_PACKAGE, phonePrefix: 'ilife-life-pack' },
  ...MANAGER_TABS.map((tab) => ({
    key: tab.skill,
    title: tab.title,
    packageName: tab.plugin,
    phonePrefix: 'ilife-' + tab.skill,
  })),
];

/** 按包名取一个目标（总管自有的「装上」电话只认这七个，别的一律拒绝）。 */
export function targetFor(packageName: string): UpdateTarget | undefined {
  return UPDATE_TARGETS.find((target) => target.packageName === packageName);
}
