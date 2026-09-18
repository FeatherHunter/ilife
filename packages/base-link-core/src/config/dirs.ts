// config/dirs：配置文件与数据目录住在哪。默认 `~/.ilife/`（由 os.homedir() 派生，平台无关）；
// `ILIFE_CONFIG_DIR` 设定且非空即整体接管配置目录（它同时是测试隔离的唯一口子）。
// 只认这两个来源：不读 $DSH_HOME，也不读别家的变量——技能要能在没有 DSH 的平台上单独跑。
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { ConfigError } from '../errors.js';

/** 位置覆盖变量的名字：设定且非空即接管配置目录。 */
export const CONFIG_DIR_ENV = 'ILIFE_CONFIG_DIR';

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

/** 跑在 node 测试运行器里（`node --test` 的每个测试进程都带这个变量）。 */
function isTestRun(): boolean {
  const context = process.env.NODE_TEST_CONTEXT;
  return typeof context === 'string' && context.length > 0;
}

/**
 * 配置目录的绝对路径。
 *
 * 测试护栏（#675 解决评论：删掉五个写库开关之后的替代护栏）：跑在测试运行器里却没设
 * `ILIFE_CONFIG_DIR` 即抛错——把「忘了配」从静默写到真实家目录变成响亮失败。
 */
export function resolveConfigDir(): string {
  const override = process.env[CONFIG_DIR_ENV];
  if (override !== undefined && override.trim() !== '') return resolve(override);
  if (isTestRun()) {
    throw new ConfigError('CONFIG_TEST_ISOLATION_MISSING',
      '测试缺隔离：跑在 node 测试运行器里却没有设置 ' + CONFIG_DIR_ENV
      + '。测试一律用 ILIFE_CONFIG_DIR 指向临时目录（缺了直接报错，不许落到真实家目录）');
  }
  return join(homedir(), '.ilife');
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
