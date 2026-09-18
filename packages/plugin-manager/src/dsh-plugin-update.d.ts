/** dsh-plugin-update 的最小类型声明（type-only 镜像，构建期擦除，零运行时）。
 *
 * 为什么要手写：更新包 `dsh-plugin-update@0.1.1` 的 `files` 只带 9 个 JS（`package.json`
 * 的 `exports` 也只有包根与 `./package.json`，见 `dist/` 实读），**不带任何 `.d.ts`**，
 * 所以 `import { createHostUpdate } from 'dsh-plugin-update'` 在 strict 下报
 * 「找不到声明文件」。本文件只声明总管真正用到的那几个出口，形状逐条抄自更新包源码。
 *
 * 出处（只读消费，均为 `D:\dsh-plugin\dsh-mattpocock-skills-deck\packages\dsh-plugin-update\src\`）：
 * - `createHostUpdate(deps, config)` → `{ phoneNames, handlers }`：`host.ts:326-367`、`:317-320`。
 * - `createUpdateExecutor(parts)` → `runInstall(args)`：`store.ts:357-372`、`:456-465`。
 * - `containingPackage` / `defaultHomeDir` / `profileNameValid` / `registrySpec`：`reader.ts:42-58`、`:112-117`、`:61-70`、`:73-81`。
 * - `EnvironmentView`（环境读数 11 字段）：`ports.ts:123-134`；`UpdateSnapshot`（快照六字段）：`ports.ts:44-57`；
 *   `BlockedReason`（八种原因码）：`ports.ts:16-24`；`UpdateJob`：`ports.ts:60-67`；
 *   `ReaderOverrides`：`host.ts:123-155`；`UpdateConfigInput`：`config.ts:42-61`。
 *
 * 纪律：本文件只放总管实际用到的成员；更新包升版后按上面出处逐条核对再加。
 */
declare module 'dsh-plugin-update' {
  /** 装不了的原因：恰好八种（`ports.ts:16-24`）。 */
  export type BlockedReason =
    | 'unknown-profile'
    | 'source-install'
    | 'invalid-installation'
    | 'installation-changed'
    | 'pending-restart'
    | 'registry-conflict'
    | 'incompatible-node'
    | 'recovery-required';

  /** 宿主种类：桌面宿主或普通 DSH 宿主（`ports.ts:13`）。 */
  export type EnvironmentKind = 'desktop' | 'cli';

  /** 适配器看到的真实环境（`ports.ts:123-134`）。 */
  export interface EnvironmentView {
    profileName: string | null;
    environmentKind: EnvironmentKind;
    homeDir: string | null;
    profileDir: string | null;
    installedVersion: string | null;
    packageValid: boolean;
    sourceInstall: boolean;
    blockedReason: BlockedReason | null;
    installationKey: string | null;
    eligible: boolean;
  }

  /** 任务公开形状（`ports.ts:60-67`）。 */
  export interface UpdateJob {
    id: string;
    state: 'installing' | 'verifying' | 'restart-required' | 'completed' | 'failed' | 'interrupted';
    targetVersion: string | null;
    message: string | null;
    requestId: string | null;
  }

  /** 快照六字段（`ports.ts:44-57`）。 */
  export interface UpdateSnapshot {
    runningVersion: string;
    installedVersion: string | null;
    latestVersion: string | null;
    canInstall: boolean;
    blockedReason: BlockedReason | null;
    job: UpdateJob | null;
  }

  /** 检查凭证（`ports.ts:74-78`）。 */
  export interface CheckReceipt {
    checkId: string;
    checkedAt: number;
    expiresAt: number;
  }

  /** 电话回包（`host.ts:294-315`）。 */
  export type UpdatePhoneResult =
    | { ok: true; snapshot: UpdateSnapshot; manual: string | null; receipt: CheckReceipt | null }
    | { ok: false; error: string; errorKind: string };

  export interface HostUpdate {
    phoneNames: Record<'updateStatus' | 'updateCheck' | 'updateInstall', string>;
    handlers: Record<string, (args: Record<string, unknown>) => Promise<Record<string, unknown>>>;
  }

  /** 建能力时的配置（`config.ts:42-61`，只有 pluginId 必填）。 */
  export interface UpdateConfigInput {
    pluginId: string;
    prefix?: string;
    targetPackageName?: string;
    registryUrl?: string;
    homeDir?: string;
    checkTimeoutMs?: number;
    confirmationTtlMs?: number;
    installTimeoutMs?: number;
    panelPollMs?: number;
  }

  /** 宿主可覆盖的读数（`host.ts:123-155`，总管只用到前四项）。 */
  export interface ReaderOverrides {
    env?: Record<string, string | undefined>;
    osHome?: string;
    runningVersion?: string;
    profileDir?: string;
    profileName?: string | null;
    homeDir?: string;
    environmentKind?: EnvironmentKind;
    ctx?: unknown;
    readInstalled?: () => EnvironmentView | Promise<EnvironmentView>;
  }

  export interface HostUpdateDeps {
    ctx?: unknown;
    logCtx?: { fire: (level: string, event: string, fields: Record<string, unknown>) => void } | null;
    desktopPnpm?: unknown;
    readerOverrides?: ReaderOverrides;
  }

  /** 真执行器的零件（`store.ts:357-372`，总管只用到其中几项）。 */
  export interface ExecutorParts {
    profileName?: string | null | (() => string | null);
    environmentKind?: EnvironmentKind | (() => EnvironmentKind);
    profileDir?: string | (() => string);
    subprocess?: unknown | (() => unknown);
    desktopPnpm?: unknown | (() => unknown);
    desktopProfiles?: unknown | (() => unknown);
    runtimeExecutable?: string | (() => string | undefined);
    runtimeExecArgs?: string[] | (() => string[] | undefined);
    cliEntry?: string | (() => string | undefined);
    targetPackageName?: string | (() => string);
    registryUrl?: string | (() => string);
    installTimeoutMs?: number | (() => number);
    pluginId?: string | (() => string);
    log?: (level: string, event: string, fields: Record<string, unknown>) => void;
  }

  export function createHostUpdate(deps?: HostUpdateDeps, configInput?: UpdateConfigInput): HostUpdate;

  /** 把调用方配置补齐为完整配置（`config.ts:106-135`）：总管用它取冻结的轮询间隔默认值。 */
  export function resolveUpdateConfig(input: UpdateConfigInput): Required<Omit<UpdateConfigInput, 'homeDir'>> & {
    homeDir: string | null;
  };

  /** 宿主种类探测：`ctx.get('desktopProfiles')` 取到即 desktop（`host.ts:70-73`）。 */
  export function detectEnvironmentKind(ctx: unknown): EnvironmentKind;

  export function createUpdateExecutor(
    parts?: ExecutorParts,
  ): (args?: { version?: string; profileName?: string | null; environmentKind?: EnvironmentKind }) => Promise<void>;

  /** 从起点文件向上找名字对得上的包（`reader.ts:42-58`）。 */
  export function containingPackage(
    filename: string,
    name: string,
  ): Promise<{ directory: string; manifest: Record<string, unknown>; contents: string } | null>;

  /** 家目录默认值（`reader.ts:112-117`）。 */
  export function defaultHomeDir(env: Record<string, string | undefined>, osHome: string): string;

  /** 使用范围名是否合法（`reader.ts:61-70`）。 */
  export function profileNameValid(name: unknown): boolean;

  /** 依赖写法是否像从源装的（`reader.ts:73-81`）。 */
  export function registrySpec(spec: unknown): boolean;
}
