/** 七个更新目标（总管自己 ＋ 六个单品），薄接线唯一定义地（票 1170）。
 *
 * 包名不新开第二源：六单品取自 nav.ts 的 MANAGER_TABS，总管自己取自 install.ts。
 * 七个 phonePrefix 必须互不相同，否则串台。
 */
import { MANAGER_PACKAGE } from './install.js';
import { managerTabs } from './nav.js';
import { m } from './entries/index.js';

export interface UpdateTarget {
  readonly key: string;
  readonly title: string;
  readonly packageName: string;
  readonly phonePrefix: string;
}

export const MANAGER_TARGET_KEY = 'life-pack' as const;

/** 批量电话前缀：宿主与面板共用，唯一定义地（面板 mount 参数与宿主登记同源）。 */
export const BATCH_PREFIX = 'life' as const;

/** 七行更新目标（渲染期现取：标题随语言走）。 */
function buildUpdateTargets(): readonly UpdateTarget[] {
  return [
    { key: MANAGER_TARGET_KEY, title: m('plugin-manager.update-targets.c001'), packageName: MANAGER_PACKAGE, phonePrefix: 'ilife-life-pack' },
    ...managerTabs().map((tab) => ({
      key: tab.skill,
      title: tab.title,
      packageName: tab.plugin,
      phonePrefix: 'ilife-' + tab.skill,
    })),
  ];
}

/** 渲染期现取。 */
export function updateTargets(): readonly UpdateTarget[] {
  return buildUpdateTargets();
}

/** 兼容镜像：模块加载期取一次（update-batch 按常量读）；渲染路径用 updateTargets()。 */
export const UPDATE_TARGETS: readonly UpdateTarget[] = buildUpdateTargets();

export function targetFor(packageName: string): UpdateTarget | undefined {
  return updateTargets().find((target) => target.packageName === packageName);
}
