/** 总管宿主半的电话表：七组更新电话（更新包建）＋ 两个总管自有电话（本包建）。
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
import type { EnvironmentKind } from 'dsh-plugin-update';
import { DEFAULT_REGISTRY, MANAGER_ACTIONS, reasonText } from './update-contract.js';
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

interface HostFacts {
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

/** 总管自有电话一：装上缺席的目标包（更新包的三个电话只管已装的包，见 `update-env.ts` 头注）。 */
async function installMissing(facts: HostFacts, target: UpdateTarget, args: Record<string, unknown>): Promise<ManagerReply> {
  const version = typeof args.version === 'string' && /^\d+\.\d+\.\d+$/.test(args.version) ? args.version : '';
  if (!version) return failure('invalid-release', { packageName: target.packageName });
  try {
    // 装的动作交回更新包的执行器：路由（桌面服务 / 子进程）与参数数组（精确版本、官方源、
    // --save-exact）都是它冻结的配方（`commands.ts:71-96`），总管不自己拼命令、不按系统分支。
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
    });
    await runInstall({ version, profileName: facts.profileName, environmentKind: facts.environmentKind });
  } catch {
    return failure('install-failed', { packageName: target.packageName, version });
  }
  return { ok: true, value: { packageName: target.packageName, version } };
}

/** 总管自有电话二：七个更新目标的表 —— 每家的三个电话名 ＋ 版本行事实 ＋ 轮询间隔。 */
async function readTargets(
  facts: HostFacts,
  phones: ReadonlyMap<string, Record<string, string>>,
  pollMs: number,
): Promise<ManagerReply> {
  const targets: unknown[] = [];
  for (const target of UPDATE_TARGETS) {
    targets.push({
      key: target.key,
      title: target.title,
      packageName: target.packageName,
      phones: phones.get(target.key) ?? null,
      runningVersion: facts.runningVersions.get(target.key) ?? null,
      installedVersion: await captureRunningVersion(target.packageName, facts.profileDir),
      // 面板缺席卡三态要的第三个事实：已装产物里有没有爱生活页签槽的注册代码。
      // 它答的是「重装／重启有没有用」，版本号答不出来（票 #723，见 `readPanelRegistered` 头注）。
      panelRegistered: await readPanelRegistered(target.packageName, facts.profileDir),
      skill: await readSkillRide(target.packageName, facts.profileDir),
    });
  }
  return { ok: true, value: { targets, pollMs } };
}

async function buildTable(ctx: unknown): Promise<(method: string, args: Record<string, unknown>) => Promise<ManagerReply>> {
  const { dir: profileDir, name: profileName } = await resolveProfileDir();
  const environmentKind = detectEnvironmentKind(ctx);
  const runningVersions = new Map<string, string | null>();
  for (const target of UPDATE_TARGETS) {
    runningVersions.set(target.key, await captureRunningVersion(target.packageName, profileDir));
  }
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
        return installMissing(facts, target, args);
      },
    ],
    [MANAGER_ACTIONS.targets, () => readTargets(facts, phonesByTarget, pollMs)],
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

/** 建电话表（懒建：首次调用时才读磁盘）。 */
export function buildUpdatePhoneTable(ctx: unknown): UpdatePhoneTable {
  let table: Promise<(method: string, args: Record<string, unknown>) => Promise<ManagerReply>> | null = null;
  return {
    async call(method: string, args: Record<string, unknown>): Promise<ManagerReply> {
      table ??= buildTable(ctx);
      return (await table)(method, args ?? {});
    },
  };
}
