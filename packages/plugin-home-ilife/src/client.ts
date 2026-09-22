/** dsh-home-ilife client 适配器（六边形：port=contract，adapter=本文件）。
 *
 * 产物经 tsdown 打成 loader 工厂包（browser/CJS，见 tsdown.config.ts）。
 * 本文件传递闭包：禁 node、禁 DOM 直写（document/window/process）。
 * 注册一处：**技能设置页** → 爱生活页签槽（总管声明的 children，各技能自研自家配置页）。
 *
 * #909：设置页本体（样式表／行渲染／卡片骨架／状态机／取值与填值／配置面三通电话／
 * 目录选择入口）**收进共用件** `dsh-life-pack/config-panel`，本文件只留四处接线：
 *   ① 行表（住 `settings.ts`——那是本家自己的配置数据，不是 UI）；
 *   ② 通道路由名（`RPC_CHANNEL`，本家唯一那个真变量）；
 *   ③ 三个可选钩子（卡片标题／跟随映射／自家附加块；本家只用到前两个）；
 *   ④ 两格宿主取数接线（`getCall`／`getService`）。
 * 本家**不再有**自己的样式表与行渲染函数：改一次共用面板，六家一起变。
 * 照 CONTEXT.md，「技能设置页」只配置、不干活：本页没有查物品、盘物品之类的入口。
 */
import * as React from 'react';
import { ConfigPanel } from 'dsh-life-pack/config-panel';
import { RPC_CHANNEL } from './contract.js';
import { PLUGIN, SLOT_ORDER, SLOT_TITLE } from './slot.js';
import { CONFIG_ITEMS } from './settings.js';
import type { ClientCtx } from './dsh-ctx.js';

/** client 短名声明：只有这两个（#736 的目录选择走**可选查找**，不写进来——
 * 写进来＝硬依赖，提供方缺席时整包被停靠，设置页会跟着装不上；见 cookbook §13）。 */
export const inject: readonly string[] = ['slots', 'connection'];

/** 跟随映射（#863）：触发键一脏，这些只读派生行就进“将跟随更新”态。纯函数，面板与单测共用。 */
const DB_FOLLOWERS: readonly string[] = ['db.name', 'html.dir', 'backup.dir', 'key.file'];

/** 脏键 → 跟随行（#863 纯函数，交给共用面板当钩子）。 */
export function followKeysOf(dirtyKeys: readonly string[]): readonly string[] {
  return dirtyKeys.includes('db.dir') ? [...DB_FOLLOWERS] : [];
}

export function apply(ctx: ClientCtx): void {
  // 调用口取用器：每次取数时现取（connection 后到也不永久缺席）。
  const getCall = (): unknown => ctx.connection?.rpc?.call ?? null;
  // #736 目录选择：**软依赖**。形状守卫与「拿不到就不出入口」都住在共用件里（判断只有一处），
  // 本处只把宿主服务查找原样交出去；提供方后到／中途卸载都不留痕（不声明、不停靠，见 cookbook §13）。
  const getService = (name: string): unknown => (typeof ctx.get === 'function' ? ctx.get(name) : undefined);

  // 技能设置页 → 爱生活页签槽（总管声明；总管缺席时 inject 等待，不断链）。
  ctx.slots.inject('ilife.config-tab', () =>
    ctx.slots.register(
      {
        name: 'ilife.config-tab',
        id: PLUGIN,
        order: SLOT_ORDER,
        label: () => SLOT_TITLE,
        // #706：本包自己那条 RPC 通道交给总管（各家都写这一格），总管据此调配置体检——
        // 它因此不必在源码里写死任何一家的通道名（零单品依赖照旧成立）。
        channel: RPC_CHANNEL,
      },
      () => React.createElement(ConfigPanel, {
        channel: RPC_CHANNEL,
        items: CONFIG_ITEMS,
        title: SLOT_TITLE,
        followKeysOf,
        getCall,
        getService,
      }),
    ),
  );
}
