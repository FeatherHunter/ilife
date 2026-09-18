// config/store：一个技能的配置怎么读、怎么取默认值、怎么重置。
// 三条口径（#675 解决评论冻结）：文件不存在 → 用默认值并落一份；文件存在 → 校验后取值；
// 重置为默认前先把现有文件另存 `.bak`。配置文件是唯一真相，环境变量不参与。
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ConfigError } from '../errors.js';
import { ensureConfigDirs } from './dirs.js';
import { assertConfigRecord, formatConfigYaml, isConfigGroup, parseConfigYaml } from './yaml.js';
import type { ConfigGroup, ConfigRecord, ConfigValue } from './yaml.js';

/** 重置前的备份后缀：`<技能>.yaml.bak`。 */
export const BACKUP_EXT = '.bak';

/** 读回来的一份配置。 */
export interface LoadedConfig {
  /** 配置文件绝对路径。 */
  readonly path: string;
  /** 数据目录绝对路径（首次读时已建出来）。 */
  readonly dataDir: string;
  /** 取值：文件里的值 ⊕ 文件里缺的项按默认值补。 */
  readonly values: ConfigRecord;
  /** 本次是「文件不存在、按默认值落了一份」还是「文件本来就在」。 */
  readonly created: boolean;
}

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return '数组';
  if (typeof value === 'object') return '组';
  if (typeof value === 'string') return '字符串';
  if (typeof value === 'number') return '数字';
  if (typeof value === 'boolean') return '布尔';
  return typeof value;
}

/** 报错文案统一带行号与文件名；`lineOf` 缺项（写入路径）时就只报键名。 */
function site(key: string, lineOf: ReadonlyMap<string, number>, file: string | null): { line: number | null; text: string } {
  const line = lineOf.get(key);
  const at = line === undefined ? '' : '（第 ' + line + ' 行）';
  const where = file === null ? '' : '，文件：' + file;
  return { line: line ?? null, text: at + where };
}

/** 拿配置件的键表去对默认值表：不认识的键、类型不符一律抛错（校验后才取值）。 */
function validateAgainstDefaults(
  got: ConfigRecord,
  defaults: ConfigRecord,
  lineOf: ReadonlyMap<string, number>,
  file: string | null,
): void {
  for (const [key, value] of Object.entries(got)) {
    const def = defaults[key];
    if (def === undefined) {
      const at = site(key, lineOf, file);
      throw new ConfigError('CONFIG_UNKNOWN_KEY',
        '不认识的配置项「' + key + '」：默认值表里没有它' + at.text, { line: at.line });
    }
    if (!isConfigGroup(def)) {
      if (typeof value !== typeof def) {
        const at = site(key, lineOf, file);
        throw new ConfigError('CONFIG_TYPE_MISMATCH',
          '配置项「' + key + '」类型不对：默认值是' + typeName(def) + '，配置件里是' + typeName(value) + at.text, { line: at.line });
      }
      continue;
    }
    if (!isConfigGroup(value)) {
      const at = site(key, lineOf, file);
      throw new ConfigError('CONFIG_TYPE_MISMATCH',
        '配置项「' + key + '」类型不对：默认值是一组键（' + Object.keys(def).join('、') + '），配置件里是' + typeName(value) + at.text,
        { line: at.line });
    }
    for (const [child, inner] of Object.entries(value)) {
      const childDef = def[child];
      const full = key + '.' + child;
      if (childDef === undefined) {
        const at = site(full, lineOf, file);
        throw new ConfigError('CONFIG_UNKNOWN_KEY',
          '不认识的配置项「' + full + '」：默认值表里没有它' + at.text, { line: at.line });
      }
      if (typeof inner !== typeof childDef) {
        const at = site(full, lineOf, file);
        throw new ConfigError('CONFIG_TYPE_MISMATCH',
          '配置项「' + full + '」类型不对：默认值是' + typeName(childDef) + '，配置件里是' + typeName(inner) + at.text, { line: at.line });
      }
    }
  }
}

/** 取值的键表与默认值表逐项对齐：文件里缺的项回落到默认值（默认值本身不可变，故按默认值重排一份）。 */
function fillDefaults(got: ConfigRecord, defaults: ConfigRecord): ConfigRecord {
  const out: ConfigRecord = {};
  for (const [key, def] of Object.entries(defaults)) {
    if (!isConfigGroup(def)) {
      const value = got[key];
      out[key] = typeof value === typeof def ? (value as ConfigValue) : def;
      continue;
    }
    const group: ConfigGroup = {};
    const gotGroup = got[key];
    const source: ConfigGroup = isConfigGroup(gotGroup) ? gotGroup : {};
    for (const [child, childDef] of Object.entries(def)) {
      const inner = source[child];
      group[child] = typeof inner === typeof childDef ? inner : childDef;
    }
    out[key] = group;
  }
  return out;
}

function readConfigFile(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    throw new ConfigError('CONFIG_IO_FAILED', '读配置文件失败：' + path, { cause: err });
  }
}

function writeConfigFile(path: string, record: ConfigRecord): void {
  const text = formatConfigYaml(record);
  try {
    writeFileSync(path, text, 'utf8');
  } catch (err) {
    throw new ConfigError('CONFIG_IO_FAILED', '写配置文件失败：' + path, { cause: err });
  }
}

/**
 * 读一份配置（配置文件是唯一真相）。
 *
 * - 配置文件不存在 → 按默认值落一份，返回默认值（`created: true`）；
 * - 文件存在 → 先校验（不认识的键／类型不符即抛错）再取值，文件里缺的项回落默认值；
 * - 配置目录与数据目录（`<配置目录>/data/`）首次读时自动建。
 *
 * `defaults` 就是这份技能的配置表，逐项等于现有代码常量，由调用方传。
 */
export function loadConfig(stem: string, defaults: ConfigRecord): LoadedConfig {
  assertConfigRecord(defaults, '默认值');
  const paths = ensureConfigDirs(stem);
  if (!existsSync(paths.configFile)) {
    writeConfigFile(paths.configFile, defaults);
    return { path: paths.configFile, dataDir: paths.dataDir, values: fillDefaults({}, defaults), created: true };
  }
  const parsed = parseConfigYaml(readConfigFile(paths.configFile), paths.configFile);
  validateAgainstDefaults(parsed.values, defaults, parsed.lineOf, paths.configFile);
  return { path: paths.configFile, dataDir: paths.dataDir, values: fillDefaults(parsed.values, defaults), created: false };
}

/**
 * 写一份配置（保存即生效：每次调用现读现取，没有长连接）。
 *
 * 写出去的是**完整一份**：给的项落盘，没给的项按默认值补齐——所以盘上的文件永远只有默认值表那一组键。
 */
export function saveConfig(stem: string, defaults: ConfigRecord, values: ConfigRecord): { path: string } {
  assertConfigRecord(defaults, '默认值');
  assertConfigRecord(values, '配置取值');
  validateAgainstDefaults(values, defaults, new Map(), null);
  const paths = ensureConfigDirs(stem);
  writeConfigFile(paths.configFile, fillDefaults(values, defaults));
  return { path: paths.configFile };
}

/**
 * 重置为默认：现有文件先另存 `<配置目录>/<技能>.yaml.bak`（已有 `.bak` 即覆盖），再按默认值重写。
 * 备份失败即不写盘，原文件保持不动。文件本来就不存在时只落一份默认值，`backupPath` 为 null。
 */
export function resetConfig(stem: string, defaults: ConfigRecord): { path: string; backupPath: string | null } {
  assertConfigRecord(defaults, '默认值');
  const paths = ensureConfigDirs(stem);
  let backupPath: string | null = null;
  if (existsSync(paths.configFile)) {
    backupPath = paths.configFile + BACKUP_EXT;
    try {
      copyFileSync(paths.configFile, backupPath);
    } catch (err) {
      throw new ConfigError('CONFIG_IO_FAILED',
        '重置前备份失败（本次不写盘，原文件保持不动）：' + backupPath, { cause: err });
    }
  }
  writeConfigFile(paths.configFile, defaults);
  return { path: paths.configFile, backupPath };
}
