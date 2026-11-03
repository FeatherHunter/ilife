/** 卡路里自己的配置体检（票 #706）：一份只读的报告，回答「我配的东西现在通不通」。
 *
 * 口径（票面「开工前的形状裁定」）：
 *   · **判据住技能侧**——每条的有效值（库在哪、产物落哪个目录、包内预置件在不在）只有本包算得出来；
 *     插件包与总管只透传与渲染，不重写这里的任何一个字。
 *   · **只报不改**——不建目录、不写文件、不落那份默认配置；凡是要建目录才算得出的结论，一律当「不在」报。
 *     所以本件**不许**调 `loadCalorieConfig()`（文件不在即落一份默认件）与 `resolveDbPath()`（它 `mkdir`），
 *     配置一律本件只读解析（`base-link-core` 的受限子集解析器**没有对外**，见其包门只有四条）。
 *   · 报告形状见面板侧镜像 `packages/plugin-manager/src/health-contract.ts`（唯一消费者）。
 *
 * 检查项与检查表 `docs/research/check-table-671-life-panel-20260917.html` 逐条对应：
 * 六家通用 5 条（配置文件本身／数据目录／库文件表数／产物目录／这个值从哪来）
 * ＋ 卡路里特有 7 条（照片目录／GIF 子目录／训记 KEY／训记 CLI／训记状态目录／跨技能两个出口／动作库预置）。
 */
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { configPaths } from 'base-link-core';
import { CALORIE_CONFIG_DEFAULTS, CALORIE_CONFIG_STEM } from './config.js';
import { dbDirOf, gifsDirOf, htmlDirOf, photosDirOf, stateDirOf } from './paths.js';
import { XUNJI_CATALOG } from './xunji/index.js';
import { m } from './entries/index.js';

/** 报告里的三档判据（与面板侧镜像同值）。 */
export type HealthStatus = 'red' | 'yellow' | 'green';

export interface HealthItem {
  readonly id: string;
  readonly title: string;
  readonly status: HealthStatus;
  readonly message: string;
  readonly action: string;
  readonly source?: string;
}

export interface CalorieHealthReport {
  readonly skill: string;
  readonly configPath: string;
  readonly dataDir: string;
  readonly items: readonly HealthItem[];
}

/** 库表数门槛：`src/schema.ts` 那 11 张表齐了才算正常（少了报黄：还能用，但缺功能的表要重建或迁移）。 */
export const DB_TABLE_THRESHOLD = 11 as const;

const SKILL = 'calorie' as const;

/** 包根：`dist/health.js` 上一级。 */
function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..');
}

/** 人话里的路径一律用正斜杠：报告给页面看，也让跨平台读数可比。 */
function p(path: string): string {
  return path.replace(/\\/g, '/');
}

/** 只读解析结果：文件不在／读得出取值与「哪些键真在文件里」／读不出来（报文带行号与文件名）。 */
export type ConfigRead =
  | { readonly kind: 'missing' }
  | { readonly kind: 'ok'; readonly values: Record<string, Record<string, unknown>>; readonly present: ReadonlySet<string> }
  | { readonly kind: 'bad'; readonly message: string };

/**
 * 只读解析那份配置文件（与 `base-link-core` 的受限子集同一套校验，口径逐条对齐）：
 * 剥 BOM、去 `\r`、空行与整行注释跳过、缩进只许 2 个空格且不许制表符、不支持列表、
 * 一行须是「键: 值」、不许重复定义、顶层键冒号后没值即开一个组。
 *
 * 与 `loadConfig()` 的差别只有一处、也正是本件要的那一处：**文件不在时不落默认件**。
 * 取值语义与它一致：文件里缺的项按默认值补。
 */
export function readCalorieConfigReadOnly(): ConfigRead {
  const file = configPaths(CALORIE_CONFIG_STEM).configFile;
  if (!existsSync(file)) return { kind: 'missing' };
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (e) {
    return { kind: 'bad', message: m('skill-calorie.health.c001', {
      p0: String(file),
      p1: String(e instanceof Error ? e.message : String(e)),
    }) };
  }
  const parsed = parseSubset(text, file);
  if (!parsed.ok) return { kind: 'bad', message: parsed.message };
  return { kind: 'ok', values: projectOnDefaults(parsed.values), present: presentKeysOf(parsed.values) };
}

/** 文件里真写了哪些键（扁平成 `组.键`）：给「这个值从哪来」那条判据用。
 *
 * 为什么不能直接看投到默认值表之后的值：**空串＝按默认落点**——留空的项值看起来与默认值一样，
 * 但它的来源是「用户写了空串」，不是「文件里没有这一项」。混起来就会把来源报错。 */
function presentKeysOf(values: Record<string, unknown>): ReadonlySet<string> {
  const out = new Set<string>();
  for (const [group, got] of Object.entries(values)) {
    if (typeof got !== 'object' || got === null) {
      out.add(group);
      continue;
    }
    for (const key of Object.keys(got as Record<string, unknown>)) out.add(group + '.' + key);
  }
  return out;
}

/** 受限子集的极简解析：只算值与行号，不算别的（校验口径与配置件同一套）。 */
function parseSubset(text: string, file: string):
  | { readonly ok: true; readonly values: Record<string, unknown> }
  | { readonly ok: false; readonly message: string } {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const values: Record<string, unknown> = {};
  const lineOf = new Map<string, number>();
  let openGroup: string | null = null;
  let openGroupLine = 0;
  /** 标量解析的失败口：`parseScalar` 把报文写进 `scalarError`，调用处读它即可（不抛，免得类型糊）。 */
  let scalarError = '';
  const fail = (line: number, why: string) => ({ ok: false as const, message: m('skill-calorie.health.c002', { p0: String(String(line)), p1: String(why), p2: String(file) }) });
  const closeGroup = (): string | null => {
    if (openGroup !== null && Object.keys(values[openGroup] as Record<string, unknown>).length === 0) {
      return fail(openGroupLine, m('skill-calorie.health.c003', { p0: String(openGroup) })).message;
    }
    openGroup = null;
    return null;
  };
  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const raw = lines[i] ?? '';
    if (raw.trim() === '') continue;
    if (/^\s*#/.test(raw)) continue;
    const head = /^[ \t]*/.exec(raw)?.[0] ?? '';
    const body = raw.slice(head.length);
    if (head.includes('\t')) return fail(lineNo, m('skill-calorie.health.c004'));
    if (body.startsWith('-')) return fail(lineNo, m('skill-calorie.health.c005'));
    const matched = /^([A-Za-z_][A-Za-z0-9_.-]*)[ \t]*:[ \t]*(.*)$/.exec(body);
    if (matched === null) return fail(lineNo, m('skill-calorie.health.c006', { p0: String(body.trim()) }));
    const key = matched[1] as string;
    const rest = (matched[2] ?? '').trim();
    if (head.length > 0) {
      if (head.length !== 2) return fail(lineNo, m('skill-calorie.health.c007', { p0: String(String(head.length)) }));
      if (openGroup === null) return fail(lineNo, m('skill-calorie.health.c008', { p0: String(key) }));
      const group = values[openGroup] as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(group, key)) {
        return fail(lineNo, m('skill-calorie.health.c009', {
          p0: String(openGroup),
          p1: String(key),
          p2: String(String(lineOf.get(openGroup + '.' + key))),
        }));
      }
      if (rest === '') return fail(lineNo, m('skill-calorie.health.c010', { p0: String(openGroup), p1: String(key) }));
      const scalar = parseScalar(rest, lineNo, fail, (message) => {
        scalarError = message;
      });
      if (scalarError !== '') return { ok: false, message: scalarError };
      group[key] = scalar;
      lineOf.set(openGroup + '.' + key, lineNo);
      continue;
    }
    const closedError = closeGroup();
    if (closedError !== null) return { ok: false, message: closedError };
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return fail(lineNo, m('skill-calorie.health.c011', { p0: String(key), p1: String(String(lineOf.get(key))) }));
    }
    lineOf.set(key, lineNo);
    if (rest === '') {
      values[key] = {};
      openGroup = key;
      openGroupLine = lineNo;
      continue;
    }
    const scalar = parseScalar(rest, lineNo, fail, (message) => {
      scalarError = message;
    });
    if (scalarError !== '') return { ok: false, message: scalarError };
    values[key] = scalar;
  }
  const tailError = closeGroup();
  if (tailError !== null) return { ok: false, message: tailError };
  return { ok: true, values };
}

/** 标量：带引号／数字／布尔／裸字符串（值后的 `#` 注释照配置件同一口径切掉）。 */
function parseScalar(
  text: string,
  lineNo: number,
  fail: (line: number, why: string) => { readonly ok: false; readonly message: string },
  onError: (message: string) => void,
): string | number | boolean {
  const first = text[0];
  if (first === '"' || first === "'") {
    const quote = first;
    let out = '';
    let i = 1;
    let closed = false;
    for (; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === quote) {
        if (quote === "'" && text[i + 1] === "'") {
          out += "'";
          i += 1;
          continue;
        }
        closed = true;
        break;
      }
      if (quote === '"' && ch === '\\') {
        const next = text[i + 1];
        out += next === 'n' ? '\n' : next === 't' ? '\t' : (next ?? '');
        i += 1;
        continue;
      }
      out += ch;
    }
    if (!closed) {
      onError(fail(lineNo, m('skill-calorie.health.c012', { p0: String(text) })).message);
      return '';
    }
    return out;
  }
  let cut = text.length;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '#' && (i === 0 || /\s/.test(text[i - 1] as string))) {
      cut = i;
      break;
    }
  }
  const body = text.slice(0, cut).trim();
  if (body === '') {
    onError(fail(lineNo, m('skill-calorie.health.c013')).message);
    return '';
  }
  if (body === 'true') return true;
  if (body === 'false') return false;
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(body)) return Number(body);
  return body;
}

/** 把文件里读到的取值投到默认值表的形状上（缺项补默认值；组内只取默认值表认得的键）。 */
function projectOnDefaults(values: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [group, def] of Object.entries(CALORIE_CONFIG_DEFAULTS)) {
    const bucket: Record<string, unknown> = {};
    const got = values[group];
    const source = typeof got === 'object' && got !== null ? (got as Record<string, unknown>) : {};
    for (const [key, defValue] of Object.entries(def as Record<string, unknown>)) {
      const mine = source[key];
      bucket[key] = typeof mine === typeof defValue ? mine : defValue;
    }
    out[group] = bucket;
  }
  return out;
}

/** 取值：一层嵌套按 `组.键` 读（缺层或类型不符回 undefined）。 */
function readValue(values: Record<string, Record<string, unknown>>, group: string, key: string): unknown {
  return values[group]?.[key];
}

/** 有值的字符串（空串＝未配，按 `undefined` 处理，语义与各取用处一致）。 */
function textOf(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : '';
}

/** 「这个值从哪来」：真在文件里写了就是「配置文件」，否则按默认值（文件不存在则全按默认值）。 */
function sourceOf(present: ReadonlySet<string>, key: string): string {
  return present.has(key) ? m('skill-calorie.health.c014') : m('skill-calorie.health.c015');
}

/** 目录项：在不在 ＋ 能不能写。 */
interface DirVerdict {
  readonly exists: boolean;
  readonly writable: boolean;
  readonly reason: string;
}

/** 目录能不能写：建一个探针文件再删掉（老技能三家同一套做法）。**不建目录本身**。 */
function writeProbe(dir: string): { readonly ok: boolean; readonly reason: string } {
  const probe = join(dir, '.ilife-health-probe-' + String(process.pid) + '-' + String(Date.now()));
  try {
    writeFileSync(probe, 'probe', { encoding: 'utf8', flag: 'wx' });
    unlinkSync(probe);
    return { ok: true, reason: '' };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** 已算过的目录结论按路径记一份：同一份报告里同一个目录不重复起写探针。 */
const dirMemo = new Map<string, DirVerdict>();

function dirVerdict(dir: string): DirVerdict {
  const memoized = dirMemo.get(dir);
  if (memoized !== undefined) return memoized;
  const verdict = dirVerdictUncached(dir);
  dirMemo.set(dir, verdict);
  return verdict;
}

function dirVerdictUncached(dir: string): DirVerdict {
  if (!existsSync(dir)) return { exists: false, writable: false, reason: '' };
  try {
    if (!statSync(dir).isDirectory()) return { exists: false, writable: false, reason: m('skill-calorie.health.c016') };
  } catch (e) {
    return { exists: false, writable: false, reason: e instanceof Error ? e.message : String(e) };
  }
  const probe = writeProbe(dir);
  return { exists: true, writable: probe.ok, reason: probe.reason };
}

/** 开库读表数（只读打开，不建库、不迁移）。打不开即当作「读不出」。 */
function tableCount(file: string): { readonly ok: boolean; readonly count: number; readonly reason: string } {
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name?: unknown }>;
    const names = rows.map((row) => String(row.name ?? '')).filter((name) => name !== '' && !name.startsWith('sqlite_'));
    return { ok: true, count: names.length, reason: '' };
  } catch (e) {
    return { ok: false, count: 0, reason: e instanceof Error ? e.message : String(e) };
  } finally {
    try {
      db?.close();
    } catch {
      /* 关不掉不影响结论 */
    }
  }
}

/** 目录结论 → 故障码（#1327）：只看结构化读数（在不在／能不能写），不看本地化报文。 */
export function dirFaultCodeOf(verdict: { readonly exists: boolean; readonly writable: boolean }): 'DIR_MISSING' | 'DIR_UNWRITABLE' | undefined {
  if (!verdict.exists) return 'DIR_MISSING';
  return verdict.writable ? undefined : 'DIR_UNWRITABLE';
}

/** `db.dir`／`photos.dir` 的故障码：与体检②⑥同一份只读推导（#1327 供行告警用，不解析本地化报文）。
 *  照片目录另有「还没建」（不在且没有同名挡位）＝绿，不给码。 */
export function calorieDirFaultCode(id: 'db.dir' | 'photos.dir'): 'DIR_MISSING' | 'DIR_UNWRITABLE' | undefined {
  const paths = configPaths(CALORIE_CONFIG_STEM);
  const read = readCalorieConfigReadOnly();
  const values = read.kind === 'ok' ? read.values : projectOnDefaults({});
  const dataDir = dbDirOf(paths.dataDir, textOf(readValue(values, 'db', 'dir')));
  if (id === 'db.dir') return dirFaultCodeOf(dirVerdict(dataDir));
  const verdict = dirVerdict(photosDirOf(dataDir, textOf(readValue(values, 'photos', 'dir'))));
  if (!verdict.exists) return verdict.reason === '' ? undefined : 'DIR_MISSING';
  return verdict.writable ? undefined : 'DIR_UNWRITABLE';
}

/** 跑一次体检，返回整份报告。**只读**：任何一处都不落盘（只有写探针那一个文件，且当场删掉）。 */
export function buildCalorieHealthReport(): CalorieHealthReport {
  const paths = configPaths(CALORIE_CONFIG_STEM);
  const items: HealthItem[] = [];
  const read = readCalorieConfigReadOnly();
  const values = read.kind === 'ok' ? read.values : projectOnDefaults({});
  const present: ReadonlySet<string> = read.kind === 'ok' ? read.present : new Set<string>();

  // ① 配置文件本身：能不能解析；它落在默认位置还是别处（只陈述，不评价）。
  const defaultConfigFile = join(homedir(), '.ilife', CALORIE_CONFIG_STEM + '.yaml');
  const relocated = paths.configFile !== defaultConfigFile;
  const where = relocated ? m('skill-calorie.health.c017') : m('skill-calorie.health.c018');
  if (read.kind === 'bad') {
    items.push({
      id: 'config.file', title: m('skill-calorie.health.c019'), status: 'red',
      message: read.message,
      action: m('skill-calorie.health.c020'),
      source: m('skill-calorie.health.c021'),
    });
  } else if (read.kind === 'missing') {
    items.push({
      id: 'config.file', title: m('skill-calorie.health.c022'), status: 'yellow',
      message: m('skill-calorie.health.c023', { p0: String(p(paths.configFile)) }),
      action: m('skill-calorie.health.c024'),
      source: m('skill-calorie.health.c025'),
    });
  } else {
    items.push({
      id: 'config.file', title: m('skill-calorie.health.c026'), status: 'green',
      message: m('skill-calorie.health.c027', { p0: String(p(paths.configFile)), p1: String(where) }),
      action: '',
      source: m('skill-calorie.health.c028'),
    });
  }

  // ② 数据目录：在不在、能不能写（算式唯一定义地＝`src/paths.ts` 的 `dbDirOf`，本件只给只读值）。
  const dbDirConfigured = textOf(readValue(values, 'db', 'dir'));
  const dataDir = dbDirOf(paths.dataDir, dbDirConfigured);
  const dataDirSource = sourceOf(present, 'db.dir');
  const dataDirVerdict = dirVerdict(dataDir);
  items.push({
    id: 'db.dir', title: m('skill-calorie.health.c029'),
    status: !dataDirVerdict.exists || !dataDirVerdict.writable ? 'red' : 'green',
    message: !dataDirVerdict.exists
      ? m('skill-calorie.health.c030', {
        p0: String(p(dataDir)),
        p1: String(dataDirVerdict.reason !== '' ? '（' + dataDirVerdict.reason + '）' : ''),
      })
      : dataDirVerdict.writable
        ? m('skill-calorie.health.c031', { p0: String(p(dataDir)) })
        : m('skill-calorie.health.c032', { p0: String(p(dataDir)), p1: String(dataDirVerdict.reason) }),
    action: !dataDirVerdict.exists
      ? m('skill-calorie.health.c033')
      : dataDirVerdict.writable ? '' : m('skill-calorie.health.c034'),
    source: dataDirSource,
  });

  // ③ 库文件：在不在 ＋ 表数够不够。
  const dbNameConfigured = textOf(readValue(values, 'db', 'name'));
  const dbName = dbNameConfigured !== '' ? dbNameConfigured : CALORIE_CONFIG_DEFAULTS.db.name;
  const dbFile = join(dataDir, dbName);
  const dbSource = sourceOf(present, 'db.name');
  if (!existsSync(dbFile)) {
    items.push({
      id: 'db.file', title: m('skill-calorie.health.c035'), status: 'red',
      message: m('skill-calorie.health.c036', { p0: String(p(dbFile)) }),
      action: m('skill-calorie.health.c037'),
      source: dbSource,
    });
  } else {
    const tables = tableCount(dbFile);
    if (!tables.ok) {
      items.push({
        id: 'db.file', title: m('skill-calorie.health.c038'), status: 'red',
        message: m('skill-calorie.health.c039', { p0: String(p(dbFile)), p1: String(tables.reason) }),
        action: m('skill-calorie.health.c040'),
        source: dbSource,
      });
    } else if (tables.count < DB_TABLE_THRESHOLD) {
      items.push({
        id: 'db.file', title: m('skill-calorie.health.c041'), status: 'yellow',
        message: m('skill-calorie.health.c042', {
          p0: String(p(dbFile)),
          p1: String(String(tables.count)),
          p2: String(String(DB_TABLE_THRESHOLD)),
        }),
        action: m('skill-calorie.health.c043'),
        source: dbSource,
      });
    } else {
      items.push({
        id: 'db.file', title: m('skill-calorie.health.c044'), status: 'green',
        message: m('skill-calorie.health.c045', { p0: String(String(tables.count)), p1: String(p(dbFile)) }),
        action: '',
        source: dbSource,
      });
    }
  }

  // ④ 产物目录：在不在、能不能写（还没建＝绿：交付页面时才落这里，那时自动建；算式＝`htmlDirOf`）。
  const htmlDirName = textOf(readValue(values, 'html', 'dir'));
  const htmlDir = htmlDirOf(dataDir, htmlDirName);
  const htmlVerdict = dirVerdict(htmlDir);
  const htmlSource = sourceOf(present, 'html.dir');
  items.push({
    id: 'html.dir', title: m('skill-calorie.health.c046'),
    status: !htmlVerdict.exists ? 'green' : htmlVerdict.writable ? 'green' : 'yellow',
    message: !htmlVerdict.exists
      ? m('skill-calorie.health.c047', { p0: String(p(htmlDir)) })
      : htmlVerdict.writable
        ? m('skill-calorie.health.c048', { p0: String(p(htmlDir)) })
        : m('skill-calorie.health.c049', { p0: String(p(htmlDir)) }),
    action: !htmlVerdict.exists || htmlVerdict.writable ? '' : m('skill-calorie.health.c050'),
    source: htmlSource,
  });

  // ⑤ 这个值从哪来：只陈述数据目录与库文件名的来源，不判好坏（六家通用最后一条）。
  const missingNote = read.kind === 'missing' ? m('skill-calorie.health.c051') : '。';
  items.push({
    id: 'value.source', title: m('skill-calorie.health.c052'), status: 'green',
    message: m('skill-calorie.health.c053', {
      p0: String(dataDirSource),
      p1: String(dbSource),
      p2: String(missingNote),
    }),
    action: '', source: dataDirSource,
  });

  // ⑥ 照片目录（卡路里特有，#757 新口径）：空串＝按默认落点 `<数据目录>/photos`，「未配置」状态消失。
  // 还没建＝绿（首次记身材照时自动建）；在但写不进去／同名文件占位＝红。算式＝`photosDirOf`。
  const photosConfigured = textOf(readValue(values, 'photos', 'dir'));
  const photosDir = photosDirOf(dataDir, photosConfigured);
  const photosVerdict = dirVerdict(photosDir);
  const photosBlocked = !photosVerdict.exists
    ? photosVerdict.reason !== ''
    : !photosVerdict.writable;
  items.push({
    id: 'photos.dir', title: m('skill-calorie.health.c054'),
    status: photosBlocked ? 'red' : 'green',
    message: !photosVerdict.exists
      ? (photosVerdict.reason !== ''
        ? m('skill-calorie.health.c055', { p0: String(p(photosDir)), p1: String(photosVerdict.reason) })
        : m('skill-calorie.health.c056', { p0: String(p(photosDir)) }))
      : photosVerdict.writable
        ? m('skill-calorie.health.c057', { p0: String(p(photosDir)) })
        : m('skill-calorie.health.c058', { p0: String(p(photosDir)), p1: String(photosVerdict.reason) }),
    action: photosBlocked
      ? m('skill-calorie.health.c059')
      : '',
    source: sourceOf(present, 'photos.dir'),
  });

  // ⑦ 照片 GIF 子目录：不在＝黄（合成 GIF 时自动建；算式＝`gifsDirOf`）。
  const gifsSub = textOf(readValue(values, 'photos', 'gifs'));
  const gifsDir = gifsDirOf(photosDir, gifsSub);
  const gifsExists = existsSync(gifsDir);
  items.push({
    id: 'photos.gifs', title: m('skill-calorie.health.c060'),
    status: gifsExists ? 'green' : 'yellow',
    message: gifsExists ? m('skill-calorie.health.c061', { p0: String(p(gifsDir)) }) : m('skill-calorie.health.c062', { p0: String(p(gifsDir)) }),
    action: gifsExists ? '' : m('skill-calorie.health.c063'),
    source: sourceOf(present, 'photos.gifs'),
  });

  // ⑧ 训记 KEY：只查「配了没有」，**绝不显示值**。
  const xunjiKey = textOf(readValue(values, 'xunji', 'key'));
  items.push({
    id: 'xunji.key', title: m('skill-calorie.health.c064'),
    status: 'green',
    message: xunjiKey === '' ? m('skill-calorie.health.c065') : m('skill-calorie.health.c066'),
    action: xunjiKey === '' ? m('skill-calorie.health.c067') : '',
    source: xunjiKey === '' ? m('skill-calorie.health.c068') : m('skill-calorie.health.c069'),
  });

  // ⑨ 训记 CLI 入口：那个编译产物在不在（不在＝红）。
  const xunjiCli = join(packageRoot(), 'dist', 'xunji', 'cli.js');
  const xunjiCliExists = existsSync(xunjiCli);
  items.push({
    id: 'xunji.cli', title: m('skill-calorie.health.c070'),
    status: xunjiCliExists ? 'green' : 'red',
    message: xunjiCliExists ? m('skill-calorie.health.c071', { p0: String(p(xunjiCli)) }) : m('skill-calorie.health.c072', { p0: String(p(xunjiCli)) }),
    action: xunjiCliExists ? '' : m('skill-calorie.health.c073'),
  });

  // ⑩ 训记三份状态文件目录：`<数据目录>/xunji` 能不能写（不可写＝黄；算式＝`stateDirOf`，#757 起不再 `~/.mavis`）。
  const stateDirConfigured = textOf(readValue(values, 'xunji', 'stateDir'));
  const stateDir = stateDirOf(dataDir, stateDirConfigured);
  const stateVerdict = dirVerdict(stateDir);
  items.push({
    id: 'xunji.stateDir', title: m('skill-calorie.health.c074'),
    status: !stateVerdict.exists || !stateVerdict.writable ? 'yellow' : 'green',
    message: !stateVerdict.exists
      ? m('skill-calorie.health.c075', { p0: String(p(stateDir)) })
      : stateVerdict.writable ? m('skill-calorie.health.c076', { p0: String(p(stateDir)) }) : m('skill-calorie.health.c077', { p0: String(p(stateDir)) }),
    action: !stateVerdict.exists || stateVerdict.writable ? '' : m('skill-calorie.health.c078'),
    source: sourceOf(present, 'xunji.stateDir'),
  });

  // ⑪ 跨技能出口（作息／备忘 CLI）：不在＝黄（只在用「落地训练」时才是红；#757 起删键，出口按包布局推断）。
  const siblingRoot = join(packageRoot(), '..');
  const scheduleCli = join(siblingRoot, 'skill-schedule', 'dist', 'cli', 'cmd_read.js');
  const memoCli = join(siblingRoot, 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');
  const missingLand: string[] = [];
  if (!existsSync(scheduleCli)) missingLand.push(m('skill-calorie.health.c079', { p0: String(p(scheduleCli)) }));
  if (!existsSync(memoCli)) missingLand.push(m('skill-calorie.health.c089', { p0: p(memoCli) }));
  items.push({
    id: 'land.cli', title: m('skill-calorie.health.c080'),
    status: missingLand.length === 0 ? 'green' : 'yellow',
    message: missingLand.length === 0
      ? m('skill-calorie.health.c081')
      : m('skill-calorie.health.c082', { p0: String(missingLand.join('；')) }),
    action: missingLand.length === 0 ? '' : m('skill-calorie.health.c083'),
    source: m('skill-calorie.health.c084'),
  });

  // ⑫ 训记动作库包内预置：包内数据件在不在（不在＝黄；路径唯一定义地＝`XUNJI_CATALOG.preset`）。
  const catalogConfigured = textOf(readValue(values, 'xunji', 'catalog'));
  const catalog = catalogConfigured !== '' ? catalogConfigured : XUNJI_CATALOG.preset;
  const catalogExists = existsSync(catalog);
  items.push({
    id: 'xunji.catalog', title: m('skill-calorie.health.c085'),
    status: catalogExists ? 'green' : 'yellow',
    message: catalogExists ? m('skill-calorie.health.c086', { p0: String(p(catalog)) }) : m('skill-calorie.health.c087', { p0: String(p(catalog)) }),
    action: catalogExists ? '' : m('skill-calorie.health.c088'),
    source: sourceOf(present, 'xunji.catalog'),
  });

  return { skill: SKILL, configPath: p(paths.configFile), dataDir: p(dataDir), items };
}
