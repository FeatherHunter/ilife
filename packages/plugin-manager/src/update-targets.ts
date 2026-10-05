/** 七个更新目标（总管自己 ＋ 六个单品），薄接线唯一定义地（票 1170）。
 *
 * 包名不新开第二源：六单品取自 nav.ts 的 MANAGER_TABS，总管自己取自 install.ts。
 * 七个 phonePrefix 必须互不相同，否则串台。
 */
import { MANAGER_PACKAGE } from './install.js';
import { MANAGER_TABS } from './nav.js';

export interface UpdateTarget {
  readonly key: string;
  readonly title: string;
  readonly packageName: string;
  readonly phonePrefix: string;
}

export const MANAGER_TARGET_KEY = 'life-pack' as const;

/** 批量电话前缀：宿主与面板共用，唯一定义地（面板 mount 参数与宿主登记同源）。 */
export const BATCH_PREFIX = 'life' as const;

export const UPDATE_TARGETS: readonly UpdateTarget[] = [
  { key: MANAGER_TARGET_KEY, title: '爱生活', packageName: MANAGER_PACKAGE, phonePrefix: 'ilife-life-pack' },
  ...MANAGER_TABS.map((tab) => ({
    key: tab.skill,
    title: tab.title,
    packageName: tab.plugin,
    phonePrefix: 'ilife-' + tab.skill,
  })),
];

export function targetFor(packageName: string): UpdateTarget | undefined {
  return UPDATE_TARGETS.find((target) => target.packageName === packageName);
}
