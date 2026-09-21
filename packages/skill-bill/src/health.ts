/** 饼干记账自己的配置体检（票 #706）：一份只读的报告，回答「我配的东西现在通不通」。
 *
 * 口径（票面「开工前的形状裁定」）：
 *   · **判据住技能侧**——每条的有效值（库在哪、产物落哪个目录、第二份库叫什么）只有本包算得出来；
 *     插件包与总管只透传与渲染，不重写这里的任何一个字。
 *   · **只报不改**——不建目录、不写文件、不落那份默认配置；凡是要建目录才算得出的结论，一律当「不在」报。
 *     所以本件**不许**调 `loadBillConfig()`（文件不在即落一份默认件），配置一律本件只读解析
 *     （`base-link-core` 的受限子集解析器**没有对外**，见其包门只有四条）。
 *   · 报告形状见面板侧镜像 `packages/plugin-manager/src/health-contract.ts`（唯一消费者）。
 *
 * 检查项与检查表 `docs/research/check-table-671-life-panel-20260917.html` 逐条对应：
 * 六家通用 5 条（配置文件本身／数据目录／库文件表数／产物目录／这个值从哪来）
 * ＋ 记账特有 2 条（第二份库 goals.json／备份目录）。
 *
 * 本件与卡路里那份 `packages/skill-calorie/src/health.ts` 同形（同一套受限子集解析、同一套写探针、
 * 同一个 `node:sqlite` 只读读表数），只换本家那份配置表与自有项——读的人一眼认得出是同一条链。
 */
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { configPaths } from 'base-link-core';
import { BILL_CONFIG_DEFAULTS, BILL_CONFIG_STEM } from './config.js';
// #749：落点算式只有一处定义地（`src/fetch/paths.ts`）——体检报的就是那几个落点，两处不许走散。
// 本件只调**纯算式**（`*Of` 一族，不读配置、不碰盘）：体检不许调 `loadBillConfig()`（文件不在即落一份默认件）。
import { backupDirOf, dbDirOf, dbFileOf, goalsFileOf, htmlDirOf } from './fetch/paths.js';

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

export interface BillHealthReport {
  readonly skill: string;
  readonly configPath: string;
  readonly dataDir: string;
  readonly items: readonly HealthItem[];
}

/** 库表数门槛：`src/fetch/db.ts` 只建一张业务表 `bills`（＋同表两个索引）。 */
export const DB_TABLE_THRESHOLD = 1 as const;

const SKILL = 'bill' as const;

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
export function readBillConfigReadOnly(): ConfigRead {
  const file = configPaths(BILL_CONFIG_STEM).configFile;
  if (!existsSync(file)) return { kind: 'missing' };
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (e) {
    return { kind: 'bad', message: '读配置文件失败：' + file + '（' + (e instanceof Error ? e.message : String(e)) + '）' };
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
  const fail = (line: number, why: string) => ({ ok: false as const, message: '配置件第 ' + String(line) + ' 行：' + why + '（文件：' + file + '）' });
  const closeGroup = (): string | null => {
    if (openGroup !== null && Object.keys(values[openGroup] as Record<string, unknown>).length === 0) {
      return fail(openGroupLine, '键「' + openGroup + '」冒号后没有值，也没有子项').message;
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
    if (head.includes('\t')) return fail(lineNo, '缩进里有制表符：本子集只许空格，且嵌套缩进恰好 2 个空格');
    if (body.startsWith('-')) return fail(lineNo, '本子集不支持列表（「-」开头的行）');
    const matched = /^([A-Za-z_][A-Za-z0-9_.-]*)[ \t]*:[ \t]*(.*)$/.exec(body);
    if (matched === null) return fail(lineNo, '不是「键: 值」形状：' + body.trim());
    const key = matched[1] as string;
    const rest = (matched[2] ?? '').trim();
    if (head.length > 0) {
      if (head.length !== 2) return fail(lineNo, '缩进必须恰好 2 个空格（本子集只支持一层嵌套），实为 ' + String(head.length) + ' 个空格');
      if (openGroup === null) return fail(lineNo, '缩进的子项「' + key + '」上面没有开着子的顶层键');
      const group = values[openGroup] as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(group, key)) {
        return fail(lineNo, '键「' + openGroup + '.' + key + '」重复定义（第 ' + String(lineOf.get(openGroup + '.' + key)) + ' 行已定义）');
      }
      if (rest === '') return fail(lineNo, '键「' + openGroup + '.' + key + '」冒号后没有值');
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
      return fail(lineNo, '键「' + key + '」重复定义（第 ' + String(lineOf.get(key)) + ' 行已定义）');
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
      onError(fail(lineNo, '引号没有闭合：' + text).message);
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
    onError(fail(lineNo, '冒号后没有值（只有注释）').message);
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
  for (const [group, def] of Object.entries(BILL_CONFIG_DEFAULTS)) {
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
  return present.has(key) ? '配置文件' : '默认值';
}

/** 目录那一项的形状是**段串**（`biscuit_accountant_html`；大厨／作息是两段）。段数与算式住
 *  `src/fetch/paths.ts` 的 `dirSegments`（#749 起落点算式只有那一处定义地），本件不自己再切一遍。
 */

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
    if (!statSync(dir).isDirectory()) return { exists: false, writable: false, reason: '同名文件占了它的位置' };
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

/** 跑一次体检，返回整份报告。**只读**：任何一处都不落盘（只有写探针那一个文件，且当场删掉）。 */
export function buildBillHealthReport(): BillHealthReport {
  const paths = configPaths(BILL_CONFIG_STEM);
  const items: HealthItem[] = [];
  const read = readBillConfigReadOnly();
  const values = read.kind === 'ok' ? read.values : projectOnDefaults({});
  const present: ReadonlySet<string> = read.kind === 'ok' ? read.present : new Set<string>();

  // ① 配置文件本身：能不能解析（只陈述，不评价）。
  if (read.kind === 'bad') {
    items.push({
      id: 'config.file', title: '配置文件', status: 'red',
      message: read.message,
      action: '照报文指的行号改回「键: 值」的写法；改不动就删掉这个文件，让技能按默认值重落一份。',
      source: '配置文件',
    });
  } else if (read.kind === 'missing') {
    items.push({
      id: 'config.file', title: '配置文件', status: 'yellow',
      message: '配置文件还不存在：' + p(paths.configFile) + '（现在跑的是默认值）。',
      action: '在面板上保存一次即会落一份；也可点「重置为默认」。',
      source: '默认值',
    });
  } else {
    items.push({
      id: 'config.file', title: '配置文件', status: 'green',
      message: '能解析：' + p(paths.configFile) + '。',
      action: '',
      source: '配置文件',
    });
  }

  // ② 数据目录：在不在、能不能写。
  const dbDirConfigured = textOf(readValue(values, 'db', 'dir'));
  const dataDir = dbDirOf(paths.dataDir, dbDirConfigured);
  const dataDirSource = sourceOf(present, 'db.dir');
  const dataDirVerdict = dirVerdict(dataDir);
  items.push({
    id: 'db.dir', title: '数据目录',
    status: !dataDirVerdict.exists || !dataDirVerdict.writable ? 'red' : 'green',
    message: !dataDirVerdict.exists
      ? '不在：' + p(dataDir) + (dataDirVerdict.reason !== '' ? '（' + dataDirVerdict.reason + '）' : '')
      : dataDirVerdict.writable
        ? '在且能写：' + p(dataDir) + '。'
        : '在，但写不进去：' + p(dataDir) + '（' + dataDirVerdict.reason + '）。',
    action: !dataDirVerdict.exists
      ? '先建这个目录，或把配置里的「数据目录」改到一个已存在的位置。'
      : dataDirVerdict.writable ? '' : '去掉这个目录的只读属性，或把「数据目录」改到别处。',
    source: dataDirSource,
  });

  // ③ 库文件：在不在 ＋ 表数够不够。
  const dbNameConfigured = textOf(readValue(values, 'db', 'name'));
  const dbFile = dbFileOf(dataDir, dbNameConfigured);
  const dbSource = sourceOf(present, 'db.name');
  if (!existsSync(dbFile)) {
    items.push({
      id: 'db.file', title: '库文件', status: 'red',
      message: '不在：' + p(dbFile) + '。',
      action: '新装的话，跑一条会写库的命令即会建库；要换库文件名，编辑配置文件里的 db.name。',
      source: dbSource,
    });
  } else {
    const tables = tableCount(dbFile);
    if (!tables.ok) {
      items.push({
        id: 'db.file', title: '库文件', status: 'red',
        message: '在，但打不开：' + p(dbFile) + '（' + tables.reason + '）。',
        action: '这个文件可能不是库文件或已损坏；先备份，再看要不要让技能重建一份。',
        source: dbSource,
      });
    } else if (tables.count < DB_TABLE_THRESHOLD) {
      items.push({
        id: 'db.file', title: '库文件', status: 'yellow',
        message: '在，但表不全：' + p(dbFile) + '（' + String(tables.count) + ' / ' + String(DB_TABLE_THRESHOLD) + ' 张表）。',
        action: '缺表会让对应的功能报错；跑一次会写库的命令让它补齐，或从备份恢复。',
        source: dbSource,
      });
    } else {
      items.push({
        id: 'db.file', title: '库文件', status: 'green',
        message: '在，' + String(tables.count) + ' 张表齐：' + p(dbFile) + '。',
        action: '',
        source: dbSource,
      });
    }
  }

  // ④ 产物目录：在不在、能不能写（还没建＝绿：交付页面时才落这里，那时自动建）。
  const htmlDirValue = textOf(readValue(values, 'html', 'dir'));
  const htmlDir = htmlDirOf(dataDir, htmlDirValue);
  const htmlVerdict = dirVerdict(htmlDir);
  const htmlSource = sourceOf(present, 'html.dir');
  items.push({
    id: 'html.dir', title: '产物目录',
    status: !htmlVerdict.exists ? 'green' : htmlVerdict.writable ? 'green' : 'yellow',
    message: !htmlVerdict.exists
      ? '还没建：' + p(htmlDir) + '（交付页面时才落这里，那时自动建）。'
      : htmlVerdict.writable
        ? '在且能写：' + p(htmlDir) + '。'
        : '在，但写不进去：' + p(htmlDir) + '（交付会转成内联回执，不再落盘）。',
    action: !htmlVerdict.exists || htmlVerdict.writable ? '' : '去掉这个目录的只读属性；要换目录，编辑配置文件里的 html.dir。',
    source: htmlSource,
  });

  // ⑤ 这个值从哪来：只陈述数据目录与库文件名的来源，不判好坏（六家通用最后一条）。
  items.push({
    id: 'value.source', title: '这个值从哪来', status: 'green',
    message: '数据目录走「' + dataDirSource + '」，库文件名走「' + dbSource + '」'
      + (read.kind === 'missing' ? '（配置文件还不存在，落点全按默认值）。' : '。'),
    action: '', source: dataDirSource,
  });

  // ⑥ 第二份库 goals.json（记账特有）：不在＝绿（预算功能没在用）；在但坏了＝红。
  const goalsFile = goalsFileOf(dataDir, textOf(readValue(values, 'db', 'goals')));
  const goalsSource = sourceOf(present, 'db.goals');
  if (!existsSync(goalsFile)) {
    items.push({
      id: 'goals.file', title: '第二份库 goals.json', status: 'green',
      message: '还没建：' + p(goalsFile) + '（预算功能没在用）。',
      action: '', source: goalsSource,
    });
  } else {
    let broken = '';
    try {
      JSON.parse(readFileSync(goalsFile, 'utf8'));
    } catch (e) {
      broken = e instanceof Error ? e.message : String(e);
    }
    items.push({
      id: 'goals.file', title: '第二份库 goals.json',
      status: broken === '' ? 'green' : 'red',
      message: broken === '' ? '在，能解析：' + p(goalsFile) + '。' : '在，但坏了：' + p(goalsFile) + '（' + broken + '）。',
      action: broken === '' ? '' : '预算与储蓄目标读不出来；从备份里拿回一份，或删掉它让预算功能从零开始（本技能不会自动重建）。',
      source: goalsSource,
    });
  }

  // ⑦ 备份目录（记账特有）：在且能写＝绿；不在＝黄、不可写＝黄——面板**不自动建**，只报。
  const backupDirConfigured = textOf(readValue(values, 'backup', 'dir'));
  const backupDir = backupDirOf(dataDir, backupDirConfigured);
  const backupVerdict = dirVerdict(backupDir);
  items.push({
    id: 'backup.dir', title: '备份目录',
    status: backupVerdict.exists && backupVerdict.writable ? 'green' : 'yellow',
    message: !backupVerdict.exists
      ? '还没建：' + p(backupDir) + '（备份功能没在用；本技能不自动建它）。'
      : backupVerdict.writable
        ? '在且能写：' + p(backupDir) + '。'
        : '在，但写不进去：' + p(backupDir) + '（' + backupVerdict.reason + '）。',
    action: !backupVerdict.exists
      ? '要用备份就先把这个目录建出来；也可以用「备份」那条命令第一次跑时让它自己落这里。'
      : backupVerdict.writable ? '' : '去掉这个目录的只读属性；要换目录，编辑配置文件里的 backup.dir。',
    source: sourceOf(present, 'backup.dir'),
  });

  return { skill: SKILL, configPath: p(paths.configFile), dataDir: p(dataDir), items };
}
