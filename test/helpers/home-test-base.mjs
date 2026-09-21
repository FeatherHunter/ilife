/**
 * #763 · 测试隔离的**家目录通道**（跨件共用基座）。
 *
 * 口径（票 #763 的裁决，理由住 #756）：`ILIFE_CONFIG_DIR` 已删（#754，「读我们自己定义的环境变量归零」），
 * 测试隔离改走**操作系统的事实**——把子进程的**家目录**指到临时目录。生产侧算配置目录的那一行
 * （`os.homedir()/.ilife`）一个字不改，测试改的是它的输入。
 *
 * 三件事实（#753 实测）：
 *   · Windows 上 `os.homedir()` **只认 `USERPROFILE`**；只设 `HOME` 无效，删掉 `USERPROFILE` 会回落到真实家目录；
 *   · POSIX 上认 `HOME`。⇒ 两格都设，平台无关。
 *   · **真实家目录**（账号那一份）改不动：`os.userInfo().homedir` 不跟注入走（win32 实测），
 *     兜底 `HOMEDRIVE`＋`HOMEPATH`。本件与生产守卫用同一条判据。
 *
 * 用法（逐件只写一行）：
 *   · 子进程那格：`env: { ...process.env, USERPROFILE: home, HOME: home, ...extra }`
 *     —— 六家 helper 各有自己的 `xxxEnv(home, extra)` 包掉这行；
 *   · 当刻进程：`useHome(home)`（就地接管家目录，等价于原来的「设一个环境变量」）；
 *   · 配置落点断言：`configDirOf(home)` ＝ `<home>/.ilife`；
 *   · 基座自证：`requireIsolatedHome()` —— 建完现场当场断言「当刻家目录 ≠ 真实家目录」，缺了即抛。
 *
 * 本件不是测试件（不匹配 `test/*.test.mjs`）。
 */
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { realHomeDir } from './real-home-snapshot.mjs';

/** 家目录的两格（win32 认前者、POSIX 认后者；两格都设，平台无关）。 */
export const HOME_ENV_KEYS = ['USERPROFILE', 'HOME'];

/** 配置目录在家目录下的名字（与 `base-link-core` 的 `~/.ilife` 同字）。 */
export const CONFIG_DIR_NAME = '.ilife';

/** 路径比较用归一：绝对化 ＋（win32）大小写不敏感。 */
function normPath(p) {
  const abs = resolve(String(p));
  return process.platform === 'win32' ? abs.toLowerCase() : abs;
}

/** 某个家目录是不是**真实**家目录（账号那一份；注入改不动它）。 */
export function isRealHome(home) {
  const real = realHomeDir();
  return normPath(home) === normPath(real.dir);
}

/**
 * 家目录入参守卫（#763 自查补上的一道缝）。
 *
 * 为什么必须有它：`join(String(undefined), '.ilife')` 会拼出**相对路径** `undefined/.ilife`，
 * 于是「调用方把变量名写错／还没赋值」不会报错，而是**在当前工作目录里静默建出一个 `undefined/` 目录**
 * （实测踩到：`packages/skill-bill/test/undefined/` 里落了 `bill.yaml` 与一份 20 KB 的库）。
 * 判据：家目录必须是**具体的、非空字符串**；不是就当场抛，并把用法写在报文里。
 */
function assertHomeArg(home, who) {
  if (typeof home !== 'string' || home.trim() === '') {
    throw new Error(
      who + ' 需要一个「家目录」参数（非空字符串，测试一律传 tmp 目录），实际收到：' + JSON.stringify(home)
      + '。别把未赋值的变量或路径片段传进来——那会拼出相对路径、在当前目录里静默建目录。',
    );
  }
  return home;
}

/**
 * 子进程那格环境：家目录指向 `home`，其余继承当刻进程，`extra` 覆盖在最后。
 *
 * @param {string} home 家目录（测试一律传 tmp 目录）
 * @param {object} [extra] 额外环境（如钉钟；缺省无）
 * @returns {NodeJS.ProcessEnv}
 */
export function homeEnvOf(home, extra = undefined) {
  assertHomeArg(home, 'homeEnvOf');
  return { ...process.env, USERPROFILE: home, HOME: home, ...(extra ?? {}) };
}

/** 当刻进程的家目录就地接管（原「设一个环境变量」的同意图写法）。 */
export function useHome(home) {
  assertHomeArg(home, 'useHome');
  for (const key of HOME_ENV_KEYS) process.env[key] = home;
  return home;
}

/** 配置目录：`<home>/.ilife`（与 `configPaths()` 算出来的一处不差）。 */
export function configDirOf(home) {
  assertHomeArg(home, 'configDirOf');
  return join(home, CONFIG_DIR_NAME);
}

/**
 * 基座自证：当刻家目录必须是**临时**那一份，不是真实家目录。
 *
 * 缺了它（忘了注入／注入没生效／平台不认我们设的那一格）＝配置会落到真实家目录 —— 当场抛，
 * 报文直接给用法。与生产守卫（`base-link-core` 的 `CONFIG_TEST_ISOLATION_MISSING`）同一条判据，
 * 一个在进程内早炸、一个拦住 spawn 出去的子进程。
 *
 * @param {string} [home] 期望的家目录（缺省取当刻 `os.homedir()`）
 * @returns {string} 当刻家目录
 */
export function requireIsolatedHome(home = homedir()) {
  const real = realHomeDir();
  if (isRealHome(home)) {
    throw new Error(
      '测试缺隔离：当刻家目录就是真实家目录（' + home + '，判据源=' + real.source + '）。'
      + '测试一律把家目录指到临时目录：子进程 env 设 USERPROFILE／HOME（win32 认前者、POSIX 认后者），'
      + '当刻进程用 useHome(home)。缺了它配置会落到 ' + real.dir + '/.ilife（真实数据），故这里当场报错',
    );
  }
  return home;
}
