/** dsh-life-pack 安装口径（P10 脚手架，P1 #2 定案单命令双包）。
 *
 * 真相（#2 真机结论）：dsh plugin 是 pnpm 薄转发，add 单品等价 pnpm add，
 * 传递依赖落盘是；激活否：reconcile 只扫直接 dependencies，传递的 manager
 * 不进 bundles；pnpm 隔离布局下从 profile 解析不到它。
 *
 * 口径：任何单品落地时总管必须已在位导航。实现为单命令双包：
 *   dsh plugin add dsh-life-pack dsh-calorie
 * 两者皆直接依赖，由 reconcile 按序激活。单品 package 内保留对总管的
 * dependencies 只作本地开发兜底，不作为单 add 即激活的依据。
 * 不许单卸总管：缺席时总管对应 tab 显示推荐安装并提示补装（见 nav.ts）。
 * 安装验收以 bundles 双含为准，另加单 add 单品后 bundles 无总管的负向断言。
 */

export const MANAGER_PACKAGE = 'dsh-life-pack' as const;

export const SINGLE_PLUGINS: readonly string[] = [
  'dsh-memo',
  'dsh-calorie',
  'dsh-schedule',
  'dsh-home',
  'dsh-chef',
  'dsh-bill',
];

/** reconcile 语义仿真：只扫直接 dependencies，按序进 bundles（P1 定案）。 */
export function reconcileBundles(directDeps: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of directDeps) {
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}

export function assertDualBundles(bundles: readonly string[], single: string): void {
  if (!bundles.includes(MANAGER_PACKAGE)) {
    throw new Error('bundles 缺总管[' + MANAGER_PACKAGE + ']：请用单命令双包补装：dsh plugin add dsh-life-pack ' + single);
  }
  if (!bundles.includes(single)) {
    throw new Error('bundles 缺单品[' + single + ']');
  }
}

export function assertNegativeSingleOnly(bundles: readonly string[]): void {
  if (bundles.includes(MANAGER_PACKAGE)) {
    throw new Error('负向断言失败：单 add 单品时 bundles 不应含总管（传递依赖不激活，P1 #2）');
  }
}
