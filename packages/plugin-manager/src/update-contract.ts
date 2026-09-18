/** 总管与面板之间的定案形状：载体、电话名、原因人话表、手工兜底命令。
 *
 * 分工：本文件只管「两侧都认的常量与文案」；宿主半见 `update-host.ts`，面板见 `client.ts`。
 * 电话名分两类：
 * - 七个**更新电话组**（每组三个 `updateStatus` / `updateCheck` / `updateInstall`）由更新包
 *   自己拼（`update.phoneNames`），面板侧取值见构建期派生的 `update-phones.ts`；
 * - 两个**总管自有电话**（装上缺席包、取版本行数据）是本包定义的，见 `MANAGER_ACTIONS`。
 *
 * 原因码的人话文案逐条抄更新包 README 第 8 节「用户该做什么」列与第 12 节排错表；
 * 手工命令形状抄第 9 节（`commands.ts:104-122` 的 `manualCommand`）。
 */
import type { BlockedReason } from 'dsh-plugin-update';

/** 载体：宿主注册 `connection.fetch.register` 的路径 / 面板 `connection.rpc.call` 的两段参数。 */
export const MANAGER_RPC = {
  /** 单段通道名，须 match `/^\/[A-Za-z0-9._~-]+$/`（cookbook §6）。 */
  channel: '/ilife-manager',
  /** 面板侧第二段参数（等于注册路径去掉 `/api` 前缀后那一段）。 */
  endpoint: 'ilife-manager',
  /** 宿主侧注册的完整路径（`/api` 是 DSH 公开载体）。 */
  path: '/api/ilife-manager',
} as const;

/** 总管自有电话名：更新包的三个动作名是冻结集合（`config.ts:14`），这里另起名字不撞车。 */
export const MANAGER_ACTIONS = {
  /** 装上缺席的目标包：入参 `{packageName, version}`，回包 `{packageName, version}`。 */
  install: 'ilife-manager.install',
  /** 七个更新目标的表：入参 `{}`，回包 `{targets: [{key, title, packageName, phones, runningVersion, installedVersion, skill}]}`。
   *
   * 电话名为什么由宿主转交而不是面板侧写死：更新包的三个电话名只有它自己知道
   * （`update.phoneNames`，`host.ts:335`）；面板侧既不能 import 更新包（浏览器产物纯度门）
   * 也不该把名字再写一份（写两份必然走散）。宿主把名字表连同版本行一起交出去，
   * 面板一行字面量都不留。 */
  targets: 'ilife-manager.targets',
} as const;

/** 更新包默认官方源（`config.ts:20`，总管侧拼手工命令时用同一个值）。 */
export const DEFAULT_REGISTRY = 'https://registry.npmjs.org/' as const;

/** 装不了 / 装不成的人话原因表：八种 `blockedReason` ＋ 过程错误码（更新包 README 第 8、12 节）。 */
const REASON_TEXT: Record<string, string> = {
  'unknown-profile': '使用范围认不出（名字非法或目录不存在）：先检查使用范围名与目录，这种情形不给手工命令。',
  'source-install': '当前是从源码装的，不是按版本号装的：想走更新，先按版本号重装一次。',
  'invalid-installation': '已装的包不完整（名字对不上、版本非法、入口文件缺失）：重装当前版本，修好已装目录再查。',
  'installation-changed': '安装位置在使用中途变了：重新打开宿主再查一次；还出现就重装。',
  'pending-restart': '新版已装到磁盘，正在跑的还是旧版：重启宿主后生效。',
  'registry-conflict': '本地声明的版本与磁盘实际版本互相矛盾：打开使用范围的清单，把目标包名那行改成版本号再试。',
  'incompatible-node': '新版要求的 Node 与当前运行的 Node 对不上：先把 Node 升到 22 或更高，再查。',
  'recovery-required': '上次安装被打断，留下一个半截任务：重新点一次安装；一直出现就查宿主日志。',
  'check-failed': '查新版失败（联网不通或官方源不可达）：检查网络与官方源地址，再查一次。',
  'invalid-release': '远端发行信息不合规（名字对不上、版本非法、包地址或完整性校验不过）：换个版本再查。',
  'check-expired': '上次查新版的凭证过期了：重新查一次再点安装（不要重试旧编号）。',
  'update-busy': '同一个使用范围同时只装一个：等当前任务结束再点。',
  'install-failed': '安装没跑成：按下面那条手工命令在终端执行一次。',
  'bad-request': '回执异常（请求形状不对）：把宿主日志里的事件名报给作者。',
  internal: '回执异常（总管内部错误）：把宿主日志里的事件名报给作者。',
};

/** 原因码 → 人话（认不出的码不猜、原样回码并说明这是未知原因）。 */
export function reasonText(code: string): string {
  return REASON_TEXT[code] ?? '未知原因（' + code + '）：把宿主日志里的事件名报给作者。';
}

/** 手工兜底命令（更新包 README 第 9 节形状）：使用范围名含特殊字符时加引号。 */
export function manualInstallCommand(input: {
  profileName: string | null;
  packageName: string;
  version: string;
  registryUrl?: string;
}): string | null {
  const name = typeof input.profileName === 'string' ? input.profileName.trim() : '';
  if (!name || name.length > 255 || name.startsWith('-') || ['.', '..', 'node_modules'].includes(name)) return null;
  const version = typeof input.version === 'string' && /^\d+\.\d+\.\d+$/.test(input.version) ? input.version : '';
  if (!version) return null;
  const registry = input.registryUrl ?? DEFAULT_REGISTRY;
  const profileArg = /^[A-Za-z0-9_.-]+$/.test(name) ? name : JSON.stringify(name);
  return 'dsh plugin --profile ' + profileArg + ' add --save-exact ' + input.packageName + '@' + version + ' --registry=' + registry;
}

/** 八种装不了原因码（给门禁与测试对表用；值就是 `BlockedReason` 全集）。 */
export const BLOCKED_REASONS: readonly BlockedReason[] = [
  'unknown-profile',
  'source-install',
  'invalid-installation',
  'installation-changed',
  'pending-restart',
  'registry-conflict',
  'incompatible-node',
  'recovery-required',
];
