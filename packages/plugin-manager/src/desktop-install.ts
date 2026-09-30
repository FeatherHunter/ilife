/** 官方桌面客户端安装出口的「认」：宿主进程内那个插件管理器（`ctx.get('pluginManager')`）。
 *
 * 为什么住这里（票 #988 的根因）：本机装的是**官方 Electron 宿主**，它**不发布**
 * `desktopProfiles`／`desktopPnpm` 两项服务（2026-09-30 实测 app.asar：两个名字命中 0）。
 * 于是执行器配方只能走 `cli-process`，而 Electron 下 `process.argv[1]` 是宿主入口不是
 * `dsh` 命令行入口 ⇒ `resolveCliEntry` 回 null ⇒ 必然 `install-failed`。
 *
 * 本文件只「认」——执行不自己做：认出来后由 `update-host.ts` 把 kind 定为
 * `'desktop-manager'` 交回更新包执行器（0.2.0 `commands.js:48-57` 冻结规格、
 * `store.js:375-416` 跑 `installBundle`）。认的口径与更新包自己一致：
 * 更新包三电话同样从 ctx 现取 `pluginManager` 并认 `installBundle`（0.2.0
 * `host.js:32-40`），dshmarket 同理——不是野路，是宿主公开的出口。
 *
 * 纪律：本文件只做「认」一件事——不调安装、不拼命令行、不按系统分支、不缓存服务。
 */

/** 宿主插件管理器：`installBundle` 必备（更新包执行器认它）；`cancelInstall` 有则用于超时取消。 */
export interface DesktopPluginManager {
  installBundle(spec: string, options: { readonly requestId: string; readonly registry?: string }): Promise<unknown> | unknown;
  cancelInstall?(requestId: string): unknown;
}

/** 从宿主上下文现取插件管理器：不是这个形状就回 null（回 null 表示「这个宿主没有这个出口」）。 */
export function desktopManagerOf(ctx: unknown): DesktopPluginManager | null {
  let value: unknown;
  try {
    const get = (ctx as { get?: (key: string) => unknown } | null | undefined)?.get;
    if (typeof get !== 'function') return null;
    value = get.call(ctx, 'pluginManager');
  } catch {
    return null;
  }
  const manager = value as DesktopPluginManager | null | undefined;
  if (!manager || typeof manager.installBundle !== 'function') return null;
  return manager;
}

/** 管理器只吃精确版本规格（`name@x.y.z`）：拿不到就不许走这条路
 * （与更新包 `commands.js:4` 的 `MANAGER_TARGET_RE` 同规则，执行器里还会再验一次）。 */
export function desktopInstallSpec(packageName: string, version: string): string | null {
  if (!/^(@[A-Za-z0-9._~-]+\/)?[A-Za-z0-9._~-]+$/.test(packageName)) return null;
  if (!/^\d+\.\d+\.\d+$/.test(version)) return null;
  return packageName + '@' + version;
}
