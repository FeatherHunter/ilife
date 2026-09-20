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

/** 爱生活页签槽名（总管声明 `children`、各单品技能设置页注册进来；单段名，避开官方 `settings.*` 前缀）。
 *
 * 为什么住这里：这个名字**两侧都要用**——面板侧 `client.ts` 拿它注册／投影槽，
 * 宿主侧（`update-env.ts` 的 `readPanelRegistered`）拿它判「已装产物里到底有没有注册代码」。
 * 一处定义、两边引用（结构纪律「概念唯一」）：名字改了只有这一行要动。
 * 宿主判据为什么要读这个字面量、以及它的边界，见 `readPanelRegistered` 的头注。 */
export const CONFIG_TAB_SLOT = 'ilife.config-tab' as const;

/** 载体基段：`connection.rpc.call` 的**第一段**参数，宿主注册路径与它同源（`'/api' ＋ 通道名`）。
 *
 * 一处定义（#735）：总管自己的电话、以及面板到各家的每一通电话，第一段都必须是它。
 * 真机实现（`dsh-client-connection/lib/client.js`）：URL ＝ `${第一段}/${第二段}`、信封 `method` ＝ 第二段。
 * 传错第一段就是 404：总管自己的电话在 #678 栽过一次，各家的配置体检在 #735 又栽过一次
 * （那次传的是通道名 `/ilife-<技能>`，拼出来的地址上没有注册过那条路由，六家全 404）。 */
export const CARRIER_BASE = '/api' as const;

/** 载体：宿主注册 `connection.fetch.register` 的路径 / 面板 `connection.rpc.call` 的两段参数。 */
export const MANAGER_RPC = {
  /** 载体基段（`connection.rpc.call` 的**第一段**参数）。传错第一段就是 404：真机上踩过一次。 */
  base: CARRIER_BASE,
  /** 单段通道名，须 match `/^\/[A-Za-z0-9._~-]+$/`（cookbook §6）。 */
  channel: '/ilife-manager',
  /** 面板侧第二段参数（等于通道名去掉前导斜杠那一段）。 */
  endpoint: 'ilife-manager',
  /** 宿主侧注册的完整路径（＝ `base` ＋ `channel`）。 */
  path: '/api/ilife-manager',
} as const;

/** 总管自有电话名：更新包的三个动作名是冻结集合（`config.ts:14`），这里另起名字不撞车。 */
export const MANAGER_ACTIONS = {
  /** 装上缺席的目标包：入参 `{packageName, version}`，回包 `{packageName, version}`。 */
  install: 'ilife-manager.install',
  /** 七个更新目标的表：入参 `{}`，回包 `{targets: [{key, title, packageName, phones, runningVersion, installedVersion, panelRegistered, skill}]}`。
   *
   * 电话名为什么由宿主转交而不是面板侧写死：更新包的三个电话名只有它自己知道
   * （`update.phoneNames`，`host.ts:335`）；面板侧既不能 import 更新包（浏览器产物纯度门）
   * 也不该把名字再写一份（写两份必然走散）。宿主把名字表连同版本行一起交出去，
   * 面板一行字面量都不留。 */
  targets: 'ilife-manager.targets',
  /** 总管自述版本（票 #737）：入参 `{}`，回包 `{version}`。
   *
   * 宿主读**自己这份已安装包**的 `package.json`（`manager-version.ts`），面板只渲染读到的值。
   * 为什么走电话：面板是浏览器产物，禁 node 内建（`test/client-bundle-48.test.mjs` 看门），
   * 读盘只许在宿主半；与卡路里 #130 同一条路（host 读 → RPC → client 纯渲染）。 */
  version: 'ilife-manager.version',
} as const;

/** 版本读不到时两侧共用的降级字面量（面板照原样显示，不假装知道版本）。
 *
 * 一处定义、两侧引用：宿主半 `manager-version.ts` 读失败时回它，面板半 `update-client.ts`
 * 归一化时也认它——面板侧不许 import 宿主半（会把 node 内建带进浏览器束）。 */
export const VERSION_UNKNOWN = 'unknown' as const;

/** 更新包默认官方源（`config.ts:20`，总管侧拼手工命令时用同一个值）。 */
export const DEFAULT_REGISTRY = 'https://registry.npmjs.org/' as const;

/** 装不了 / 装不成的人话原因表：八种 `blockedReason` ＋ 过程错误码（更新包 README 第 8、12 节）。
 *
 * 每条都要三段齐全（票 #740 的文案判据）：**事实**（哪里对不上）→ **后果**（这家现在能不能装）
 * → **动作**（用户做得到、且面板上真有的那一步；面板代劳不了的走「下面这条命令」）。
 * 禁用口语与自造词：「半截任务」「电话没接上」「回执异常」「还出现就重装」「查宿主日志」一律不写。 */
const REASON_TEXT: Record<string, string> = {
  'unknown-profile': '认不出这台机器上的安装位置（使用范围的目录不存在，或名字不合法）。检查使用范围目录后再点「检查更新」。',
  'source-install': '这一份不是从 npm 发行包装的（源码装），面板不能更新它。要用更新，先按下面这条命令重装：',
  'invalid-installation': '磁盘上这一份装得不完整（包名或版本对不上、入口文件缺失）。用下面这条命令重装，再点「检查更新」。',
  'installation-changed': '这台机器的安装清单变了（在别处装过、或清单被手工改过），这一家现在不能装。点「重新检查」重新读一次，再点「装上更新」。',
  'pending-restart': '新版已装到磁盘，正在运行的是旧版本。重启 DSH（退出后重新打开）后生效。',
  'registry-conflict': '使用范围清单里写的版本与磁盘上的实际版本对不上。打开使用范围的 `package.json`，把这一行改成磁盘上的版本号，再点「检查更新」。',
  'incompatible-node': '新版本要求 Node 22 或更高，当前运行的是更低版本。升级 Node、重启 DSH 后，再点「检查更新」。',
  // 这条只在「磁盘上的版本与正在运行的一致（或磁盘那份读不到）」时才会印出来——「磁盘 ≠ 运行中」
  // 那一态被事实判据先截走，印的是 `restartLine`。故这里**不许**再教人去重启（那在眼下没用）。
  'recovery-required': '上次安装没有收尾。点「重试安装」再跑一次；仍出现这一条，就用下面这条命令重装。',
  'check-failed': '查不到最新版本：联网失败，或官方源（registry.npmjs.org）不可达。确认网络与源地址后再点「检查更新」。',
  'invalid-release': '官方源上这个版本的元数据不完整（包名或版本不合法、包地址或校验值缺失）。换一个版本，或稍后重试。',
  'check-expired': '上次检查的结果已过期。点「检查更新」重新检查，再点「装上更新」。',
  'update-busy': '同一时间只能安装一个插件。等当前这次安装结束后，再点「装上更新」。',
  'install-failed': '安装没有完成。在终端里执行下面这条命令来完成安装。',
  'manager-unreachable': '面板连不上总管插件（宿主里没注册，或版本对不上）。重启 DSH 后重试；仍不行就在 DSH 日志里找 `[dsh-life-pack]` 的报错。',
  'bad-request': '面板与总管之间的请求出错了（属程序缺陷）。请在 DSH 日志里找 `[dsh-life-pack]` 的报错，连同这家插件的名字报到本仓 issue。',
  internal: '面板与总管之间的请求出错了（属程序缺陷）。请在 DSH 日志里找 `[dsh-life-pack]` 的报错，连同这家插件的名字报到本仓 issue。',
};

/** 原因码 → 人话（认不出的码不猜、原样回码并说明这是未知原因）。 */
export function reasonText(code: string): string {
  return REASON_TEXT[code] ?? '面板不认识这个原因码（' + code + '）。请在 DSH 日志里找同一处报错，报到本仓 issue。';
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
