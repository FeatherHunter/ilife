/** 总管宿主半的电话表：七组更新电话（更新包建）＋ 三个总管自有电话（本包建）。
 *
 * 形状：`buildUpdatePhoneTable(ctx).call(方法名, 入参)` —— 一条入口，内部按方法名派发。
 * 表的建成是**懒的**（首次调用时建）：要读磁盘拿使用范围与七个目标的运行版本，
 * 而 cordis 的 `apply` 是同步的。
 *
 * 七组电话来自更新包的 `createHostUpdate`（`host.ts:326-367`），每组一套
 * `{phoneNames, handlers}`；七组之间靠各自的前缀与插件标识隔离。读数按更新包公开的接缝
 * `readerOverrides` 注入（`host.ts:123-155`），理由见 `update-env.ts` 头注。
 */
import { createHostUpdate, createUpdateExecutor, detectEnvironmentKind, resolveUpdateConfig } from 'dsh-plugin-update';
import type { EnvironmentKind, ExecutorParts } from 'dsh-plugin-update';
import { DEFAULT_REGISTRY, MANAGER_ACTIONS, reasonText } from './update-contract.js';
import { desktopInstallSpec, desktopManagerOf } from './desktop-install.js';
import type { DesktopPluginManager } from './desktop-install.js';
import { rootsReply } from './roots.js';
import { UPDATE_TARGETS, targetFor } from './update-targets.js';
import type { UpdateTarget } from './update-targets.js';
import { MISSING_RUNNING_VERSION, captureRunningVersion, readPanelRegistered, readSkillRide, readTargetEnvironment, resolveProfileDir } from './update-env.js';

/** 面板侧认的回执信封（与 DSH 载体的 `RpcCallResult` 同形，见 cookbook §6）。 */
export type ManagerReply =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string; readonly details: Record<string, unknown> } };

export interface UpdatePhoneTable {
  call(method: string, args: Record<string, unknown>): Promise<ManagerReply>;
}

type UpdateHandler = (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
type ManagerAction = (args: Record<string, unknown>) => Promise<ManagerReply>;

/** 建表那一刻的现场事实（导出只为单测能拼一份替身喂给 `installMissing`）。 */
export interface HostFacts {
  readonly ctx: unknown;
  readonly profileDir: string;
  readonly profileName: string;
  readonly environmentKind: EnvironmentKind;
  readonly runningVersions: ReadonlyMap<string, string | null>;
}

function service(ctx: unknown, name: string): unknown {
  try {
    const get = (ctx as { get?: (key: string) => unknown })?.get;
    return typeof get === 'function' ? get.call(ctx, name) : undefined;
  } catch {
    return undefined;
  }
}

function failure(code: string, details: Record<string, unknown> = {}): ManagerReply {
  return { ok: false, error: { code, message: reasonText(code), details } };
}

/** 一次安装的落点与留痕（可注入：单测用替身替掉执行器与宿主出口，不碰真机）。 */
export interface InstallPorts {
  /** 装的动作（缺省走更新包执行器：路由与参数都是它冻结的配方）。 */
  readonly runExecutor?: (target: UpdateTarget, version: string) => Promise<void>;
  /** 执行器工厂（缺省 `createUpdateExecutor`；单测用它捕获传给更新包的零件，断言路由）。 */
  readonly createExecutor?: (
    parts: ExecutorParts,
  ) => (args?: { version?: string; profileName?: string | null; environmentKind?: EnvironmentKind }) => Promise<void>;
  /** 宿主进程内的插件管理器（官方桌面客户端的安装出口）；缺省从 ctx 现取。 */
  readonly desktopManager?: () => DesktopPluginManager | null;
  /** 安装留痕：与宿主日志同一条路（info／warn／error）。 */
  readonly log?: (level: string, event: string, fields: Record<string, unknown>) => void;
}

function trace(log: InstallPorts['log'], level: string, event: string, fields: Record<string, unknown>): void {
  try {
    log?.(level, event, fields);
  } catch {
    /* 留痕不许影响安装本身 */
  }
}

/** 从异常里取出能报给用户的那句人话（0.2.0 实测形状：`store.js:460-466` 抛出的错恒带
 * `debug`（原始堆栈）与 `exitCode`（有则带）；走 desktop-manager 路由失败时还带 `detail`
 * （宿主原话，已脱敏截断，见 `withDetail`／`sanitizeDetail`：`store.js:299-309`）。
 *
 * 取值顺序：`detail`（宿主原话，给用户看的那句）＞ `debug`（执行器堆栈，排查用）＞
 * `message`。漏取 `detail` 会把堆栈摊上屏（票 #988 复查时发现）。 */
export function installErrorDetail(error: unknown): string {
  const seen = error as { debug?: unknown; detail?: unknown; exitCode?: unknown; message?: unknown } | null | undefined;
  const raw =
    typeof seen?.detail === 'string' && seen.detail.length > 0
      ? seen.detail
      : typeof seen?.debug === 'string' && seen.debug.length > 0
        ? seen.debug
        : typeof seen?.message === 'string' && seen.message.length > 0
          ? seen.message
          : String(error);
  const exit = typeof seen?.exitCode === 'number' ? ' exit=' + String(seen.exitCode) : '';
  return (exit + ' ' + raw.replace(/\s+/g, ' ').trim()).trim().slice(0, 600);
}

/** 总管自有电话一：装上缺席的目标包（更新包的三个电话只管已装的包，见 `update-env.ts` 头注）。
 *
 * 两条落点，按宿主有没有「进程内插件管理器」分（票 #988）：
 * 1. 有（官方桌面客户端）：执行器的 desktop-manager 路由——0.2.0 `commands.js:48-57`
 *    按 kind 冻结规格 `["add", "<包>@<精确版本>"]`（零开关），`store.js:375-416` 跑
 *    `installBundle`（三态算成功、超时取消、失败原文脱敏进 `error.detail`）。
 *    总管只定 kind ＋ 把这家 manager 交进去，不自己调 `installBundle`、不重写成功判定——
 *    安装语义与更新包三电话同一套（能力自治：不抄对方那份）。
 * 2. 没有（普通 DSH／第三方宿主）：照旧交回更新包执行器，路由与参数仍是它冻结的配方。
 *
 * 为什么这里要显式定 kind：本机官方宿主**不发布** `desktopProfiles`／`desktopPnpm`，
 * `detectEnvironmentKind` 只能认出 `'cli'`，配方会走 cli-process 而 Electron 下认不出
 * CLI 入口（`store.js:420` 的 `resolveCliEntry` 回 null）⇒ 必然 `install-failed`。
 * 第三方桌面（kind `'desktop'`）不走这条，沿既有 desktop-service 路由。
 *
 * 失败一律**留痕 ＋ 把原文回给面板**：此前这里是个空 `catch`，屏上只剩一句「安装没有完成」，
 * 真因无处可查（票 #988 的现象就是这么来的）。 */
export async function installMissing(
  facts: HostFacts,
  target: UpdateTarget,
  args: Record<string, unknown>,
  ports: InstallPorts = {},
): Promise<ManagerReply> {
  const version = typeof args.version === 'string' && /^\d+\.\d+\.\d+$/.test(args.version) ? args.version : '';
  if (!version) return failure('invalid-release', { packageName: target.packageName });
  const managerOf = ports.desktopManager ?? (() => desktopManagerOf(facts.ctx));
  let manager: DesktopPluginManager | null = null;
  try {
    manager = managerOf();
  } catch {
    manager = null;
  }
  const spec = desktopInstallSpec(target.packageName, version);
  if (manager && spec && facts.environmentKind !== 'desktop') {
    const create = ports.createExecutor ?? createUpdateExecutor;
    const runInstall = create({
      profileName: facts.profileName,
      environmentKind: 'desktop-manager',
      profileDir: facts.profileDir,
      pluginManager: () => manager,
      targetPackageName: target.packageName,
      registryUrl: DEFAULT_REGISTRY,
      pluginId: 'dsh-life-pack-' + target.key,
      // 执行器自带的留痕口（`store.js:268-282`）：给它一条路，路由与退出码才有人记下来。
      log: (level: string, event: string, fields: Record<string, unknown>) => trace(ports.log, level, event, fields),
    });
    try {
      await runInstall({ version, profileName: facts.profileName, environmentKind: 'desktop-manager' });
    } catch (error) {
      const detail = installErrorDetail(error);
      trace(ports.log, 'warn', 'ilife.install.failed', {
        route: 'desktop-manager',
        packageName: target.packageName,
        version,
        detail,
      });
      return failure('install-failed', { packageName: target.packageName, version, route: 'desktop-manager', detail });
    }
    trace(ports.log, 'info', 'ilife.install.done', { route: 'desktop-manager', packageName: target.packageName, version });
    return { ok: true, value: { packageName: target.packageName, version, route: 'desktop-manager' } };
  }
  try {
    // 装的动作交回更新包的执行器：路由（桌面服务 / 子进程）与参数数组（精确版本、官方源、
    // --save-exact）都是它冻结的配方（0.2.0 `commands.js:38-65`），总管不自己拼命令、不按系统分支。
    const runExecutor =
      ports.runExecutor ??
      (async (_target: UpdateTarget, installVersion: string): Promise<void> => {
        const runInstall = createUpdateExecutor({
          profileName: facts.profileName,
          environmentKind: facts.environmentKind,
          profileDir: facts.profileDir,
          subprocess: () => service(facts.ctx, 'subprocess'),
          desktopPnpm: () => service(facts.ctx, 'desktopPnpm'),
          desktopProfiles: () => service(facts.ctx, 'desktopProfiles'),
          targetPackageName: target.packageName,
          registryUrl: DEFAULT_REGISTRY,
          pluginId: 'dsh-life-pack-' + target.key,
          // 执行器自带的留痕口（`store.js:268-282`）：给它一条路，路由与退出码才有人记下来。
          log: (level: string, event: string, fields: Record<string, unknown>) => trace(ports.log, level, event, fields),
        });
        await runInstall({ version: installVersion, profileName: facts.profileName, environmentKind: facts.environmentKind });
      });
    await runExecutor(target, version);
  } catch (error) {
    const detail = installErrorDetail(error);
    trace(ports.log, 'warn', 'ilife.install.failed', {
      route: 'executor',
      environmentKind: facts.environmentKind,
      packageName: target.packageName,
      version,
      detail,
    });
    return failure('install-failed', {
      packageName: target.packageName,
      version,
      route: 'executor',
      environmentKind: facts.environmentKind,
      detail,
    });
  }
  trace(ports.log, 'info', 'ilife.install.done', { route: 'executor', packageName: target.packageName, version });
  return { ok: true, value: { packageName: target.packageName, version, route: 'executor' } };
}

/** 七个目标 version 行的组装（票 #986 第二半：独立 I/O 并行化）。
 *
 * 住这里（不是调用方各自写一份并发）：七目标之间、单目标三次读之间都并发——
 * 墙上时间取最慢那一次读，不随目标数与读次数线性累加。读不到的按原语义回 null／false，不抛。
 * 读替身可注入（单测给每次耗时 T 的假读数验并发），缺省走真读数。
 */
export interface TargetRowReaders {
  readonly capture: (packageName: string, profileDir: string) => Promise<string | null>;
  readonly panel: (packageName: string, profileDir: string) => Promise<boolean>;
  readonly skill: (packageName: string, profileDir: string) => Promise<{ packageName: string; version: string } | null>;
}

export interface AssembledTargetRow {
  readonly key: string;
  readonly title: string;
  readonly packageName: string;
  readonly installedVersion: string | null;
  readonly panelRegistered: boolean;
  readonly skill: { packageName: string; version: string } | null;
}

const defaultRowReaders: TargetRowReaders = {
  capture: (packageName, profileDir) => captureRunningVersion(packageName, profileDir),
  panel: (packageName, profileDir) => readPanelRegistered(packageName, profileDir),
  skill: (packageName, profileDir) => readSkillRide(packageName, profileDir),
};

export async function assembleTargetRows(
  targets: readonly UpdateTarget[],
  profileDir: string,
  readers: TargetRowReaders = defaultRowReaders,
): Promise<AssembledTargetRow[]> {
  return Promise.all(
    targets.map(async (target) => {
      const [installedVersion, panelRegistered, skill] = await Promise.all([
        readers.capture(target.packageName, profileDir),
        readers.panel(target.packageName, profileDir),
        readers.skill(target.packageName, profileDir),
      ]);
      return {
        key: target.key,
        title: target.title,
        packageName: target.packageName,
        installedVersion,
        panelRegistered,
        skill,
      };
    }),
  );
}

/** 总管自有电话二：七个更新目标的表 —— 每家的三个电话名 ＋ 版本行事实 ＋ 轮询间隔。 */
async function readTargets(
  facts: HostFacts,
  phones: ReadonlyMap<string, Record<string, string>>,
  pollMs: number,
): Promise<ManagerReply> {
  const rows = await assembleTargetRows(UPDATE_TARGETS, facts.profileDir);
  const targets: unknown[] = rows.map((row) => ({
      key: row.key,
      title: row.title,
      packageName: row.packageName,
      phones: phones.get(row.key) ?? null,
      runningVersion: facts.runningVersions.get(row.key) ?? null,
      installedVersion: row.installedVersion,
      // 面板缺席卡三态要的第三个事实：已装产物里有没有爱生活页签槽的注册代码。
      // 它答的是「重装／重启有没有用」，版本号答不出来（票 #723，见 `readPanelRegistered` 头注）。
      panelRegistered: row.panelRegistered,
      skill: row.skill,
    }));
  return { ok: true, value: { targets, pollMs } };
}

async function buildTable(
  ctx: unknown,
  ports: InstallPorts = {},
): Promise<(method: string, args: Record<string, unknown>) => Promise<ManagerReply>> {
  const { dir: profileDir, name: profileName } = await resolveProfileDir();
  const environmentKind = detectEnvironmentKind(ctx);
  const runningPairs = await Promise.all(
    UPDATE_TARGETS.map(async (target) => ({
      key: target.key,
      version: await captureRunningVersion(target.packageName, profileDir),
    })),
  );
  const runningVersions = new Map<string, string | null>(runningPairs.map((pair) => [pair.key, pair.version]));
  const facts: HostFacts = { ctx, profileDir, profileName, environmentKind, runningVersions };
  const updatePhones = new Map<string, UpdateHandler>();
  const phonesByTarget = new Map<string, Record<string, string>>();
  let pollMs = 1000;
  for (const target of UPDATE_TARGETS) {
    const pluginId = 'dsh-life-pack-' + target.key;
    const runningVersion = runningVersions.get(target.key) ?? MISSING_RUNNING_VERSION;
    const update = createHostUpdate(
      {
        ctx,
        readerOverrides: {
          profileDir,
          profileName,
          runningVersion,
          environmentKind,
          readInstalled: () =>
            readTargetEnvironment(target.packageName, {
              profileDir,
              profileName,
              runningVersion,
              environmentKind,
              pluginId,
            }),
        },
      },
      { pluginId, prefix: target.phonePrefix, targetPackageName: target.packageName },
    );
    for (const [phoneName, handler] of Object.entries(update.handlers)) updatePhones.set(phoneName, handler);
    phonesByTarget.set(target.key, {
      status: update.phoneNames.updateStatus,
      check: update.phoneNames.updateCheck,
      install: update.phoneNames.updateInstall,
    });
    // 面板轮询间隔取更新包自己的取值（`resolveUpdateConfig` 的冻结默认，见其 README 第 11 节），
    // 面板侧一律不写死数字。
    if (pollMs === 1000) pollMs = resolveUpdateConfig({ pluginId }).panelPollMs;
  }
  const managerActions = new Map<string, ManagerAction>([
    [
      MANAGER_ACTIONS.install,
      (args) => {
        const packageName = typeof args.packageName === 'string' ? args.packageName : '';
        const target = targetFor(packageName);
        if (!target) return Promise.resolve(failure('bad-request', { packageName }));
        return installMissing(facts, target, args, ports);
      },
    ],
    [MANAGER_ACTIONS.targets, () => readTargets(facts, phonesByTarget, pollMs)],
    // 本机「根」清单（#744）：一次系统调用换全部盘符，超时即空。同样恒成功——
    // 列不出来只是「图上不画那一行」，不该给面板弹一条失败。
    [MANAGER_ACTIONS.roots, () => rootsReply()],
  ]);
  return async (method, args) => {
    const action = managerActions.get(method);
    if (action) {
      try {
        return await action(args);
      } catch (error) {
        return failure('internal', { detail: String((error as Error)?.message ?? error) });
      }
    }
    const handler = updatePhones.get(method);
    if (!handler) return failure('bad-request', { method });
    try {
      // 更新包的电话回包（`host.ts:294-315`）：成功带快照与手工命令，失败带原因码。
      const out = await handler(args);
      if (out.ok === true) {
        return { ok: true, value: { snapshot: out.snapshot, manual: out.manual ?? null, receipt: out.receipt ?? null } };
      }
      const code = typeof out.error === 'string' ? out.error : 'internal';
      return failure(code, { errorKind: String(out.errorKind ?? '') });
    } catch (error) {
      return failure('internal', { detail: String((error as Error)?.message ?? error) });
    }
  };
}

/** 建电话表（懒建：首次调用时才读磁盘）。
 *
 * 自足动作不排队（票 #986 第二半）：本机根清单不经表构建——入口先分流，
 * 只有需要表的方法才懒建表。overrides 只在单测里给（慢建表验分流），线上走缺省；
 * `log` 由插件入口交进来（票 #988：安装留痕走宿主日志同一条路）。 */
export function buildUpdatePhoneTable(
  ctx: unknown,
  overrides?: {
    readonly buildTable?: (ctx: unknown) => Promise<(method: string, args: Record<string, unknown>) => Promise<ManagerReply>>;
    readonly rootsReply?: () => Promise<ManagerReply>;
    readonly log?: InstallPorts['log'];
  },
): UpdatePhoneTable {
  const build = overrides?.buildTable ?? ((host: unknown) => buildTable(host, { log: overrides?.log }));
  const roots = overrides?.rootsReply ?? rootsReply;
  let table: Promise<(method: string, args: Record<string, unknown>) => Promise<ManagerReply>> | null = null;
  return {
    async call(method: string, args: Record<string, unknown>): Promise<ManagerReply> {
      if (method === MANAGER_ACTIONS.roots) return roots();
      table ??= build(ctx);
      return (await table)(method, args ?? {});
    },
  };
}
