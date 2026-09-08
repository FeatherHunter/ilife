/** dsh-life-pack host 半（六边形：host 侧；总管机制范围无 RPC，保持 noop）。
 *
 * 形态：cordis 插件（name/inject/apply）+ dsh.bundle.patch 装配行。
 * 本包无单品依赖、无单品 import。虚构 client 重导出已删（#48 H4：mount/request/open
 * 全是想象 API，测试无用）；真实 client 适配器见 src/client.ts（tsdown 独立打包）。
 * 对外只保留纯数据口径（nav）与安装口径（install）。
 */

export const name = 'dsh-life-pack';
export const inject: readonly string[] = [];

export function apply(_ctx: unknown): void {
  void _ctx;
}

export { MANAGER_TABS, tabsForPresence } from './nav.js';
export { MANAGER_PACKAGE, SINGLE_PLUGINS, reconcileBundles, assertDualBundles, assertNegativeSingleOnly } from './install.js';
