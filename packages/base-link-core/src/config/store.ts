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

/** 键名形状（组名与子项名同一套：字母数字与 `_` `-`）——已退休键清单的键名护栏用它。 */
const KEY_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** 拿配置件的键表去对默认值表：不认识的键、类型不符一律抛错（校验后才取值）。
 *
 *  `retired`（#762）是**我们自己删过的键**的叶子全路径：命中的键**跳过校验**、不进取值——
 *  老配置文件里必然留着它们，升级后不该让用户为我们的改动买单。集合**外**的未知键照旧硬失败
 *  （护栏不动：用户手写错一个键名照样响亮报错，带行号与文件名）。 */
function validateAgainstDefaults(
  got: ConfigRecord,
  defaults: ConfigRecord,
  lineOf: ReadonlyMap<string, number>,
  file: string | null,
  retired: ReadonlySet<string>,
): void {
  for (const [key, value] of Object.entries(got)) {
    const def = defaults[key];
    if (def === undefined) {
      if (retired.has(key)) continue;
      // 整组退休：默认值表里那一层已整组删掉，故老文件里这一层「不认识」——但它的子项全是已退休键时
      // 照旧放行（一个子项都不是退休键 ⇒ 不是这个形状，照常硬失败；见 #762 与 assertRetiredKeys 的判据③）。
      if (isConfigGroup(value) && Object.keys(value).every((child) => retired.has(key + '.' + child))) continue;
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
        if (retired.has(full)) continue;
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

/**  retirees 清单自身合法吗：父路径必须真的存在、必须是组、键本身不许还在默认值表里。
 *
 *  这是**构造即拒**（不是靠用例事后检查）：清单是一个字符串数组——坏清单会让护栏静默失效
 *  （命中一个我们从没删过的键＝那个位置永久免检），故一律在收下清单的那一刻拦住，报文点名是哪一条。
 *  四类判据（读、写两边都走同一处）：
 *   ① 每项是「组.子项」形状、每段都过键名（字母数字与 `_` `-`）——这条同时兜住"组名打错"那一类
 *      （组名打错时那一层在默认值表里不存在，与"整组退休"同形，只能靠键名形状与下面 ③ 一起兜）；
 *   ② 父路径在默认值表里存在时必须**是组**（写到叶子下面即拒）；
 *   ③ 父路径不存在＝那一层组整组退休了（允许：整组退休时默认值表里那一层必须整组删掉，
 *      因为空组写出去解析不回来）；
 *   ④ 键**不在**默认值表里（退休键与活键不可能同名）。
 *  `null`／`undefined` 即「没有已退休键」。 */
function assertRetiredKeys(defaults: ConfigRecord, retired: readonly string[] | null | undefined): readonly string[] {
  if (retired === null || retired === undefined) return [];
  if (!Array.isArray(retired)) {
    throw new ConfigError('CONFIG_RETIRED_INVALID', '已退休键清单须为字符串数组：' + typeName(retired));
  }
  for (const key of retired) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new ConfigError('CONFIG_RETIRED_INVALID', '已退休键清单里有非字符串项：' + JSON.stringify(key));
    }
    const parts = key.split('.');
    if (parts.length < 2) {
      throw new ConfigError('CONFIG_RETIRED_INVALID',
        '已退休键「' + key + '」须是「组.子项」的全路径（退休键都是叶子）');
    }
    for (const part of parts) {
      if (!KEY_NAME_RE.test(part)) {
        throw new ConfigError('CONFIG_RETIRED_INVALID',
          '已退休键「' + key + '」里有不合键名的段「' + part + '」（只许字母数字与 _ -，且不许空段）');
      }
    }
    let cursor: Record<string, unknown> = defaults;
    for (let i = 0; i < parts.length - 1; i++) {
      const step: unknown = cursor[parts[i] as string];
      if (step === undefined) break; // 父路径不存在＝那一层组整组退休了（③ 的地盘之外；越往下越由 ② 兜）
      if (!isConfigGroup(step)) {
        throw new ConfigError('CONFIG_RETIRED_INVALID',
          '已退休键「' + key + '」的父路径「' + parts.slice(0, i + 1).join('.') + '」在默认值表里不是一组键：'
          + '清单写错了（打错键名等于放一个陌生键免检）');
      }
      cursor = step;
    }
    if (typeof cursor[parts[parts.length - 1] as string] !== 'undefined') {
      throw new ConfigError('CONFIG_RETIRED_INVALID',
        '已退休键「' + key + '」还在默认值表里：退休键是**已经删掉**的键，删干净了才写进清单');
    }
  }
  return retired;
}

/** 取值的键表与默认值表逐项对齐：文件里缺的项回落到默认值（默认值本身不可变，故按默认值重排一份）。
 *
 *  已退休键（`retired`）**不出现在结果里**；**整组退休 ⇒ 该组整层不写**（组里一个活子项都不剩时
 *  连组一起去掉）——空组写出去解析不回来，且老文件里那一层组名本身就是「已退休」的东西。 */
function fillDefaults(got: ConfigRecord, defaults: ConfigRecord, retired: ReadonlySet<string>): ConfigRecord {
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
      if (retired.has(key + '.' + child)) continue;
      const inner = source[child];
      group[child] = typeof inner === typeof childDef ? inner : childDef;
    }
    if (Object.keys(group).length === 0) continue;
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
 * `retiredKeys`（#762）＝这份技能**自己删过**的键的叶子全路径：命中的键跳过校验、不进取值。
 */
export function loadConfig(stem: string, defaults: ConfigRecord, retiredKeys?: readonly string[]): LoadedConfig {
  assertConfigRecord(defaults, '默认值');
  const retired = new Set(assertRetiredKeys(defaults, retiredKeys));
  const paths = ensureConfigDirs(stem);
  if (!existsSync(paths.configFile)) {
    const values = fillDefaults({}, defaults, retired);
    writeConfigFile(paths.configFile, values);
    return { path: paths.configFile, dataDir: paths.dataDir, values, created: true };
  }
  const parsed = parseConfigYaml(readConfigFile(paths.configFile), paths.configFile);
  validateAgainstDefaults(parsed.values, defaults, parsed.lineOf, paths.configFile, retired);
  return { path: paths.configFile, dataDir: paths.dataDir, values: fillDefaults(parsed.values, defaults, retired), created: false };
}

/**
 * 写一份配置（保存即生效：每次调用现读现取，没有长连接）。
 *
 * 写出去的是**完整一份**：给的项落盘，没给的项按默认值补齐——所以盘上的文件永远只有默认值表那一组键。
 * `retiredKeys`（#762）与读同义：清单里的键**收下但不写回**——设置页在键删掉之后仍会带着那几行提交，
 * 不能因此让用户存一次盘就撞校验错；而"收下不写回"正好就是裁决要的**写即清**。
 */
export function saveConfig(stem: string, defaults: ConfigRecord, values: ConfigRecord, retiredKeys?: readonly string[]): { path: string } {
  assertConfigRecord(defaults, '默认值');
  assertConfigRecord(values, '配置取值');
  const retired = new Set(assertRetiredKeys(defaults, retiredKeys));
  validateAgainstDefaults(values, defaults, new Map(), null, retired);
  const paths = ensureConfigDirs(stem);
  writeConfigFile(paths.configFile, fillDefaults(values, defaults, retired));
  return { path: paths.configFile };
}

/**
 * 重置为默认：现有文件先另存 `<配置目录>/<技能>.yaml.bak`（已有 `.bak` 即覆盖），再按默认值重写。
 * 备份失败即不写盘，原文件保持不动。文件本来就不存在时只落一份默认值，`backupPath` 为 null。
 * 写出去的是默认值表那一份（已退休键天然不在其中——重置因此也是一次净化）。
 */
export function resetConfig(stem: string, defaults: ConfigRecord, retiredKeys?: readonly string[]): { path: string; backupPath: string | null } {
  assertConfigRecord(defaults, '默认值');
  const retired = new Set(assertRetiredKeys(defaults, retiredKeys));
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
  writeConfigFile(paths.configFile, fillDefaults({}, defaults, retired));
  return { path: paths.configFile, backupPath };
}
