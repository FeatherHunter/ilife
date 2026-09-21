// config/dirs：配置文件与数据目录住在哪。**只有一处落点**：`~/.ilife/`（由 `os.homedir()` 派生，平台无关）——
// 配置的真相只在配置文件里，环境变量一律不参与（「位置覆盖」那个口子已随 #754 删除）。
//
// #763：测试隔离走**家目录**（Windows `USERPROFILE`／POSIX `HOME`，见 test/helpers/home-test-base.mjs），
// 落点因此不需要任何测试专用开关：测试改的是 `os.homedir()` 的**输入**，与生产走同一条路。
// 测试护栏＝**跑在测试运行器里却要落到真实家目录的 `.ilife`** 即抛——「真实家目录」取自**账号**
// （`os.userInfo().homedir`，注入改不动它），不读我们定义的任何变量。
import { mkdirSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join, resolve } from 'node:path';
import { ConfigError } from '../errors.js';

/** 配置文件后缀：每个技能一份 `<技能>.yaml`。 */
export const CONFIG_FILE_EXT = '.yaml';

/** 数据目录在配置目录下的名字：默认 `~/.ilife/data/`。 */
export const DATA_DIR_NAME = 'data';

/** 一个技能的两处落点：配置文件与数据目录。 */
export interface ConfigPaths {
  readonly configDir: string;
  readonly configFile: string;
  readonly dataDir: string;
}

/** 文件名主体：技能名（ASCII），不许带路径分隔符与后缀，免得越出配置目录。 */
const STEM_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** 跑在 node 测试运行器里（`node --test` 的每个测试进程都带这个变量；Node 自己的变量，不是我们定义的）。 */
function isTestRun(): boolean {
  const context = process.env.NODE_TEST_CONTEXT;
  return typeof context === 'string' && context.length > 0;
}

/**
 * **真实**家目录（账号那一份）：win32 走账号资料目录、POSIX 走 getpwuid —— 实测不跟
 * `USERPROFILE`／`HOME` 的注入走（#753 的实测表 ＋ #763 复测：注入 `USERPROFILE=C:\__fake_up2`
 * 之后 `os.homedir()` 跟着走、本函数仍返回 `C:\Users\辰辰洋洋`）。
 *
 * win32 兜底 `HOMEDRIVE`＋`HOMEPATH`（Windows 自己写的两格，我们从不碰）。两样都拿不到时回 null
 * ⇒ 守卫放行——那一档由测试侧的「真实 `~/.ilife` 树快照」门禁兜底（`tooling/check-real-home-untouched.mjs`）。
 */
function realAccountHome(): string | null {
  try {
    const home = userInfo().homedir;
    if (typeof home === 'string' && home.length > 0) return home;
  } catch { /* 没有 passwd 条目一类的环境：往下兜 */ }
  if (process.platform === 'win32') {
    const drive = process.env.HOMEDRIVE ?? '';
    const path = process.env.HOMEPATH ?? '';
    if (drive !== '' && path !== '') return drive + path;
  }
  return null;
}

/** 路径相等（win32 大小写不敏感）。 */
function samePath(a: string, b: string): boolean {
  const na = resolve(a);
  const nb = resolve(b);
  return process.platform === 'win32' ? na.toLowerCase() === nb.toLowerCase() : na === nb;
}

/**
 * 配置目录的绝对路径：**只有一个来源** —— `os.homedir()/.ilife`。
 *
 * 测试护栏（#763 换判据；原判据挂的位置覆盖变量已随 #754 删除）：
 * **跑在测试运行器里，却要落到真实家目录的 `.ilife`** ⇒ 当场抛错（在 `mkdir` 之前，零写）。
 * 判据取自账号（见 `realAccountHome()`），**不读我们定义的任何变量**——家目录注入生效时不触发，
 * 忘了注入即响亮失败。测试侧另有一条同向的树快照判据（跑全量前后真实 `~/.ilife` 逐字节不变）。
 */
export function resolveConfigDir(): string {
  const configDir = join(homedir(), '.ilife');
  if (isTestRun()) {
    const accountHome = realAccountHome();
    if (accountHome !== null && samePath(configDir, join(accountHome, '.ilife'))) {
      throw new ConfigError('CONFIG_TEST_ISOLATION_MISSING',
        '测试缺隔离：跑在 node 测试运行器里却要落到真实家目录 ' + configDir
        + '。测试一律把家目录指到临时目录（Windows 设 USERPROFILE／POSIX 设 HOME；'
        + '技能基座见 test/helpers/home-test-base.mjs）——缺了直接报错，不许落到真实家目录');
    }
  }
  return configDir;
}

/** 只算路径、不碰盘。 */
export function configPaths(stem: string): ConfigPaths {
  if (typeof stem !== 'string' || !STEM_RE.test(stem)) {
    throw new ConfigError('CONFIG_STEM_INVALID',
      '配置文件主体名非法：' + JSON.stringify(stem) + '（只许字母数字与 - _，不许路径分隔符与后缀）');
  }
  const configDir = resolveConfigDir();
  return {
    configDir,
    configFile: join(configDir, stem + CONFIG_FILE_EXT),
    dataDir: join(configDir, DATA_DIR_NAME),
  };
}

/** 算路径并把配置目录与数据目录建出来（首次运行自动建，`mkdir -p` 语义）。 */
export function ensureConfigDirs(stem: string): ConfigPaths {
  const paths = configPaths(stem);
  for (const dir of [paths.configDir, paths.dataDir]) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch (err) {
      throw new ConfigError('CONFIG_IO_FAILED', '建目录失败：' + dir, { cause: err });
    }
  }
  return paths;
}
