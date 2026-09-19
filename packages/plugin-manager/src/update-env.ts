/** 环境读数：把本机的真实情况翻成更新核心要的 `EnvironmentView`。
 *
 * 为什么总管要自己读环境：更新包默认的读取器（`reader.ts:172-236`）从**它自己的文件位置**
 * 向上找同名包（`containingPackage(import.meta.url, 目标包名)`），所以它只能服务「把它装在
 * 自己内部」的那一个包。实测（2026-09-18，票 #678，复现命令与读数见实施记录）：
 *
 *   node 探针 import 已装的 dsh-plugin-update@0.1.1 →
 *   以 targetPackageName 为 dsh-calorie 调 updateStatus 回
 *   {"ok":false,"error":"unknown-profile","errorKind":"unknown-profile"}
 *
 * 六个单品与总管是**兄弟包**（都在 `<使用范围>/node_modules/` 下），向上找不到同名包 ⇒
 * 默认读数必抛 `unknown-profile`；即便硬给运行版本号，`sameLoadedPackage` 也永远为假 ⇒
 * 一律落进 `installation-changed`（`reader.ts:218-232`）。所以总管按更新包公开的接缝
 * `readerOverrides.readInstalled`（`host.ts:141`、`:211`）**自备这一家的环境读数**：
 * 事实（谁装了、装到哪、版本多少、是不是按版本号装的）逐条照读，原因码阶梯照更新包的语义
 * 写，只把「找得到自己包」这一步换成本包已知的安装位置。
 *
 * 纪律：本文件的每一步都只做「读事实」，不决定能不能装（能不能装是更新核心的事）。
 */
import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultHomeDir, profileNameValid, registrySpec } from 'dsh-plugin-update';
import type { EnvironmentKind, EnvironmentView } from 'dsh-plugin-update';
import { CONFIG_TAB_SLOT } from './update-contract.js';

/** 缺席包给读取器的占位运行版本：这家读数是「没装」，不显示、也不参与能不能装（`eligible` 已为假）。 */
export const MISSING_RUNNING_VERSION = '0.0.0' as const;

/** 使用范围的落盘清单与锁文件（与更新包读的四处同名，`reader.ts:20`）。 */
const PROFILE_STATE_FILES = ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'package-lock.json'] as const;

/** 指纹绑定：第一次读到自洽的环境就把指纹记下来，之后再变即 `installation-changed`（同更新包语义）。 */
const boundKeys = new Map<string, string>();

interface LoadedPackage {
  readonly directory: string;
  readonly manifest: Record<string, unknown>;
  readonly contents: string;
}

async function packageAt(directory: string): Promise<LoadedPackage> {
  const contents = await readFile(join(directory, 'package.json'), 'utf8');
  const manifest = JSON.parse(contents) as Record<string, unknown>;
  return { directory: await realpath(directory), manifest, contents };
}

async function readOptional(filename: string): Promise<string> {
  try {
    return await readFile(filename, 'utf8');
  } catch (error) {
    if (error && (error as { code?: unknown }).code === 'ENOENT') return '';
    throw error;
  }
}

function inside(directory: string, filename: string): boolean {
  const suffix = relative(directory, filename);
  return suffix !== '..' && !suffix.startsWith('..' + sep) && !isAbsolute(suffix);
}

/** 包是否完整：名字对得上、三个入口（main / 客户端出口 / 装配行）都在包内且真存在。
 * 规则照更新包 `reader.ts:84-109`；它没有把这条对外出口，只能在这里照写一遍。 */
async function packageComplete(pkg: LoadedPackage, packageName: string): Promise<boolean> {
  if (pkg.manifest.name !== packageName || typeof pkg.manifest.version !== 'string') return false;
  const exportsField = pkg.manifest.exports as Record<string, unknown> | undefined;
  const dshField = pkg.manifest.dsh as Record<string, unknown> | undefined;
  const bundle = dshField?.bundle as Record<string, unknown> | undefined;
  for (const entry of [pkg.manifest.main, exportsField?.['./client'], bundle?.patch]) {
    if (typeof entry !== 'string' || !entry || isAbsolute(entry) || entry.includes('\0')) return false;
    const filename = resolve(pkg.directory, entry);
    if (!inside(pkg.directory, filename)) return false;
    let target = filename;
    try {
      target = await realpath(filename);
    } catch {
      return false;
    }
    if (!inside(pkg.directory, target)) return false;
    try {
      if (!(await stat(target)).isFile()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export interface TargetEnvOptions {
  /** 使用范围目录（绝对路径）。 */
  readonly profileDir: string;
  /** 使用范围名（不传即取目录名）。 */
  readonly profileName?: string;
  /** 这家包的**运行版本**：宿主启动那一刻磁盘上的版本（见 `captureRunningVersion`）。 */
  readonly runningVersion: string;
  readonly environmentKind: EnvironmentKind;
  /** 本家的插件标识（指纹绑定用，七家互不相同）。 */
  readonly pluginId: string;
  /** 目录根：不传即走更新包同一套推导（`DSH_HOME` 优先，否则家目录下 `.dsh`）。 */
  readonly homeDir?: string;
}

/** 读一家的环境（更新包 `readInstalled` 接缝的实现）。 */
export async function readTargetEnvironment(packageName: string, options: TargetEnvOptions): Promise<EnvironmentView> {
  const view: EnvironmentView = {
    profileName: null,
    environmentKind: options.environmentKind,
    homeDir: null,
    profileDir: null,
    installedVersion: null,
    packageValid: false,
    sourceInstall: false,
    blockedReason: null,
    installationKey: null,
    eligible: false,
  };
  const profileName = options.profileName ?? basename(options.profileDir);
  view.profileName = profileName;
  if (!profileNameValid(profileName)) {
    view.blockedReason = 'unknown-profile';
    return view;
  }
  const homeDirInput = options.homeDir ?? defaultHomeDir(process.env, homedir());
  let homeDir: string;
  let profileDir: string;
  try {
    homeDir = await realpath(homeDirInput);
    profileDir = await realpath(options.profileDir);
  } catch {
    view.blockedReason = 'unknown-profile';
    return view;
  }
  view.homeDir = homeDir;
  view.profileDir = profileDir;
  let profile: LoadedPackage;
  let installed: LoadedPackage;
  try {
    profile = await packageAt(profileDir);
  } catch {
    view.blockedReason = 'invalid-installation';
    return view;
  }
  try {
    installed = await packageAt(join(profileDir, 'node_modules', packageName));
  } catch {
    // 包还没装：与更新包同码（`reader.ts:204-210` 读不到已装位置时报同一个原因）。
    view.blockedReason = 'invalid-installation';
    return view;
  }
  const dependencies = (profile.manifest.dependencies ?? {}) as Record<string, unknown>;
  view.installedVersion = typeof installed.manifest.version === 'string' ? installed.manifest.version : null;
  view.packageValid = await packageComplete(installed, packageName);
  view.sourceInstall = !registrySpec(dependencies[packageName]) || !inside(join(profileDir, 'node_modules'), installed.directory);
  const stateFiles = await Promise.all(PROFILE_STATE_FILES.map((name) => readOptional(join(profileDir, name))));
  view.installationKey = createHash('sha256')
    .update(
      JSON.stringify([
        homeDir,
        profileDir,
        profileName,
        options.pluginId,
        profile.contents,
        installed.directory,
        installed.contents,
        ...stateFiles,
      ]),
    )
    .digest('hex');
  const bindKey = options.pluginId + '\0' + packageName;
  const bound = boundKeys.get(bindKey);
  if (bound === undefined) {
    if (view.packageValid && !view.sourceInstall) boundKeys.set(bindKey, view.installationKey);
  } else if (bound !== view.installationKey && view.packageValid && !view.sourceInstall) {
    view.blockedReason = 'installation-changed';
  }
  if (view.blockedReason === null) {
    if (!view.packageValid) view.blockedReason = 'invalid-installation';
    else if (view.sourceInstall) view.blockedReason = 'source-install';
    else if (view.installedVersion !== options.runningVersion) view.blockedReason = 'pending-restart';
  }
  view.eligible = view.blockedReason === null;
  return view;
}

/** 启动期捕获一家的运行版本：加载那一刻磁盘上的版本，读不到即 null（这家还没装）。 */
export async function captureRunningVersion(packageName: string, profileDir: string): Promise<string | null> {
  try {
    const raw = await readFile(join(profileDir, 'node_modules', packageName, 'package.json'), 'utf8');
    const manifest = JSON.parse(raw) as { version?: unknown };
    return typeof manifest.version === 'string' && manifest.version.length > 0 ? manifest.version : null;
  } catch {
    return null;
  }
}

/** 面板产物读数缓存：key 是客户端出口文件的绝对路径，value 是「上一次读到的产物事实 ＋ 判它失效的两个数字」。
 *
 * 为什么敢缓存：宿主半的存活期以天计，而每次轮询都重读 17～70 kB 的产物太浪费；
 * 失效判据取文件的**大小与修改时间**——安装／重装必然换掉这两个数字（包内容变了），
 * 所以在「装完不重启」这类真机上会变的场景下，下一次读数就会重新读文件把新事实读出来。
 * 缓存条目随进程存活（一个使用范围最多七个目标），不是无界增长。 */
const panelCache = new Map<string, { size: number; mtimeMs: number; registered: boolean }>();

/** 读一家**已装产物**里有没有爱生活页签槽的注册代码（面板缺席卡三态要的第三个事实）。
 *
 * 为什么要读产物而不是只问版本号：这个事实**版本号答不出来**。真机实测（2026-09-19）：
 * 作息／居家／大厨／记账四家的已发布 0.2.0 产物里根本没有注册代码（票 #723），
 * 它们的页签槽永远空着；只按「装了没有」分态，面板就会把这种情形说成「已装但没接上，
 * 重启试试」——那是叫用户去做一件不可能有用的事。判据只能是产物里那个槽名字面量。
 *
 * 边界（必须说清，否则这个读数会被当成保证）：
 * - 判据是**源码里那个槽名常量（`CONFIG_TAB_SLOT`）的字符串**。产物是构建期打包的（tsdown），
 *   故字面量会原样留在产物里（两侧同源：单品的注册代码里写的也是这个名字）。
 * - 打包器若哪天把表达式改写成「拼接出名字」（如 `'ilife' + '.config-tab'`），本读数会漏报；
 *   那时表现为面板少一态、退回「装了但没接上」，不会误报成「没装」。
 * - 读不到出口文件、或产物读不出这个字符串 ⇒ 一律 false：**判据缺席时不给肯定结论**
 *   （宁可让用户看到「等它发新版」这句偏保守的话，不可把可能已注册的产物说成已注册）。
 */
export async function readPanelRegistered(packageName: string, profileDir: string): Promise<boolean> {
  const directory = join(profileDir, 'node_modules', packageName);
  let entry: string | undefined;
  try {
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as {
      exports?: Record<string, unknown>;
    };
    const exportsField = manifest.exports?.['./client'];
    if (typeof exportsField === 'string') entry = exportsField;
    else if (exportsField && typeof exportsField === 'object') {
      const value = (exportsField as { default?: unknown }).default;
      if (typeof value === 'string') entry = value;
    }
  } catch {
    return false;
  }
  if (!entry || isAbsolute(entry) || entry.includes('\0')) return false;
  const filename = resolve(directory, entry);
  if (!inside(directory, filename)) return false;
  let size: number;
  let mtimeMs: number;
  try {
    const info = await stat(filename);
    if (!info.isFile()) return false;
    size = info.size;
    mtimeMs = info.mtimeMs;
  } catch {
    return false;
  }
  const cached = panelCache.get(filename);
  if (cached && cached.size === size && cached.mtimeMs === mtimeMs) return cached.registered;
  let registered = false;
  try {
    registered = (await readFile(filename, 'utf8')).includes(CONFIG_TAB_SLOT);
  } catch {
    return false;
  }
  panelCache.set(filename, { size, mtimeMs, registered });
  return registered;
}

/** 版本行要的「技能包随插件」事实：插件包 manifest 里那条 `skill-*` 依赖（精确 pin）。 */
export async function readSkillRide(
  packageName: string,
  profileDir: string,
): Promise<{ packageName: string; version: string } | null> {
  try {
    const raw = await readFile(join(profileDir, 'node_modules', packageName, 'package.json'), 'utf8');
    const manifest = JSON.parse(raw) as { dependencies?: Record<string, unknown> };
    const dependencies = manifest.dependencies ?? {};
    const key = Object.keys(dependencies).find((name) => name.startsWith('skill-'));
    if (!key) return null;
    const version = dependencies[key];
    return typeof version === 'string' ? { packageName: key, version } : null;
  } catch {
    return null;
  }
}

/** 本包（总管）装在哪个使用范围：从自己的文件位置向上找自己的包目录，取它上面那层 `node_modules` 的父目录。
 *
 * 与更新包 `host.ts:102-121` 同一手法，只改一处：取**第一次**出现的 `/node_modules/<包名>`
 * （更新包取的是最后一次）——pnpm 的 `.pnpm/<包>@<版本>/node_modules/<包>` 布局下，
 * 最后一次会把使用范围认成虚拟目录，第一次才是真正的使用范围根。
 */
export async function resolveProfileDir(): Promise<{ dir: string; name: string }> {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  let directory = moduleDir;
  let found: string | null = null;
  for (let depth = 0; depth < 12; depth += 1) {
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
    try {
      const raw = await readFile(join(directory, 'package.json'), 'utf8');
      const manifest = JSON.parse(raw) as { name?: unknown };
      if (manifest.name === 'dsh-life-pack') {
        found = directory;
        break;
      }
    } catch {
      // 这个目录没有 package.json：继续向上
    }
  }
  if (found) {
    const marker = sep + 'node_modules' + sep + 'dsh-life-pack';
    const at = found.indexOf(marker);
    if (at > 0) {
      const dir = found.slice(0, at);
      try {
        const real = await realpath(dir);
        return { dir: real, name: basename(real) };
      } catch {
        return { dir, name: basename(dir) };
      }
    }
  }
  const fallback = join(defaultHomeDir(process.env, homedir()), 'profiles', 'web');
  return { dir: fallback, name: basename(fallback) };
}
