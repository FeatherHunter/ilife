/** 作息管家自己的配置体检（票 #706）：一份只读的报告，回答「我配的东西现在通不通」。
 *
 * 口径（票面「开工前的形状裁定」）：
 *   · **判据住技能侧**——每条的有效值（库在哪、产物落哪个目录、包内预置件在不在）只有本包算得出来；
 *     插件包与总管只透传与渲染，不重写这里的任何一个字。
 *   · **只报不改**——不建目录、不写文件、不落那份默认配置；凡是要建目录才算得出的结论，一律当「不在」报。
 *     所以本件**不许**调 `loadScheduleConfig()`（文件不在即落一份默认件），配置一律本件只读解析
 *     （`base-link-core` 的受限子集解析器**没有对外**，见其包门只有四条）。
 *   · 报告形状见面板侧镜像 `packages/plugin-manager/src/health-contract.ts`（唯一消费者）。
 *
 * 检查项与检查表 `docs/research/check-table-671-life-panel-20260917.html` 逐条对应：
 * 六家通用 5 条（配置文件本身／数据目录／库文件表数／产物目录／这个值从哪来）
 * ＋ 作息特有 3 条（飞书 CLI／分类允许清单／包内模板目录）。
 * **本家第 4 条（作息第二份库 `daily_recorder.db`）已由编者从检查表里撤回**，见票 #706 的遗留出口
 * （老技能默认链算出的 `D:\.db\daily_recorder.db` 与实测那个不是同一个文件，事实在核）——故未实现，
 * 报告里也不出现这一项。
 *
 * **判据查的路径一律是新仓的**（票面第 2 条「缺配置会怎样按新仓＋新机制写」）：检查表里那些老仓
 * 文件名（例：分类允许清单的老 `category_whitelist.yaml`）只作注释里的出处，不进用户看到的报文。
 *
 * 本件与卡路里那份 `packages/skill-calorie/src/health.ts` 同形（同一套受限子集解析、同一套写探针、
 * 同一个 `node:sqlite` 只读读表数），只换本家那份配置表与自有项——读的人一眼认得出是同一条链。
 */
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { configPaths } from 'base-link-core';
import { SCHEDULE_CONFIG_DEFAULTS, SCHEDULE_CONFIG_STEM } from './config.js';
// #764：落点算式只有一处定义地（`src/fetch/paths.ts`）——体检报的就是那几个落点，两处不许走散。
// 本件只调**纯算式**（`*Of` 一族，不读配置、不碰盘）：体检不许调 `loadScheduleConfig()`（文件不在即落一份默认件）。
import { dbDirOf, dbFileOf, htmlDirOf } from './fetch/paths.js';
// #764：飞书 CLI 的查找只剩兜底探测（配置项 `lark.cliPath` 已删），候选顺序的唯一定义地是
// `src/fetch/feishu.ts` 的 `larkCliCandidates()`——本件直接调它，不留第二份表。
import { findLarkCli, larkVersion } from './fetch/feishu.js';

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

export interface ScheduleHealthReport {
  readonly skill: string;
  readonly configPath: string;
  readonly dataDir: string;
  readonly items: readonly HealthItem[];
}

/** 库表数门槛：`src/fetch/db.ts` 三张建表（`schedule_records`／`daily_summary`／`schedule_plans`）齐了算正常。 */
export const DB_TABLE_THRESHOLD = 3 as const;

const SKILL = 'schedule' as const;

/** 探测两档超时：快段（找 CLI ＋ `auth status`，上限 8 秒）／慢段（`calendar +agenda`，上限 30 秒）——
// #761 定稿「状态行异步两段填」落在技能侧的同一组数字上；面板只显示，不自己计时。 */
const LARK_STATUS_TIMEOUT_MS = 8000 as const;
const LARK_CALENDAR_TIMEOUT_MS = 30000 as const;

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
export function readScheduleConfigReadOnly(): ConfigRead {
  const file = configPaths(SCHEDULE_CONFIG_STEM).configFile;
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
  for (const [group, def] of Object.entries(SCHEDULE_CONFIG_DEFAULTS)) {
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

/** 模板件数：把 `templates/` 数一遍（只数 `.html`，含子目录；读不出来的子树按 0 计）。
 *  报文里给这个数，是为了让「包内模板目录在不在」这句话能自证——件数对不上就是包装不完整。 */
function templateFileCount(dir: string): number {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let out = 0;
  for (const entry of entries) {
    out += entry.isDirectory()
      ? templateFileCount(join(dir, entry.name))
      : (entry.name.endsWith('.html') ? 1 : 0);
  }
  return out;
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

/** 调一次 lark-cli（只读子命令）：同一套 Windows `cmd.exe /d /s /c` 中转（`.cmd` 直 spawn 报 EINVAL）。
 *  失败一律回 `{ok:false}`，**不抛**——体检不许因为探测失败而崩。 */
function runLark(cli: string, args: string[], timeoutMs: number): { readonly ok: boolean; readonly stdout: string } {
  let file = cli;
  let argv = args;
  if (process.platform === 'win32' && /\.cmd$/i.test(cli)) {
    file = 'cmd.exe';
    argv = ['/d', '/s', '/c', cli, ...args];
  }
  try {
    return { ok: true, stdout: execFileSync(file, argv, { stdio: 'pipe', encoding: 'utf8', timeout: timeoutMs }) };
  } catch {
    return { ok: false, stdout: '' };
  }
}

/** 飞书三档（老 `setup_scenarios.py` 的 `tier` 三档现成）：找不到 CLI＝missing；已装但未授权或
 *  日历不可写＝partial；已授权且日历可写＝full。能探测到哪一档就报哪一档——CLI 都不在就停在第 1 档，
 *  **不往下起子进程试登录**。 */
function larkTier(cli: string | null): 'missing' | 'partial' | 'full' {
  if (cli === null) return 'missing';
  const status = runLark(cli, ['auth', 'status'], LARK_STATUS_TIMEOUT_MS);
  if (!status.ok) return 'partial';
  let openId = '';
  try {
    const j = JSON.parse(status.stdout) as { identities?: { user?: { openId?: unknown } } };
    const id = j.identities?.user?.openId;
    if (typeof id === 'string') openId = id;
  } catch {
    return 'partial';
  }
  if (openId === '') return 'partial';
  return runLark(cli, ['calendar', '+agenda'], LARK_CALENDAR_TIMEOUT_MS).ok ? 'full' : 'partial';
}

/** 跑一次体检，返回整份报告。**只读**：任何一处都不落盘（只有写探针那一个文件，且当场删掉）。 */
export function buildScheduleHealthReport(): ScheduleHealthReport {
  const paths = configPaths(SCHEDULE_CONFIG_STEM);
  const items: HealthItem[] = [];
  const read = readScheduleConfigReadOnly();
  const values = read.kind === 'ok' ? read.values : projectOnDefaults({});
  const present: ReadonlySet<string> = read.kind === 'ok' ? read.present : new Set<string>();

  // ① 配置文件本身：能不能解析；它落在默认位置还是别处（只陈述，不评价）。
  const defaultConfigFile = join(homedir(), '.ilife', SCHEDULE_CONFIG_STEM + '.yaml');
  const relocated = paths.configFile !== defaultConfigFile;
  const where = relocated ? '位置与默认不同（见配置文件落点）' : '默认位置';
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
      message: '能解析：' + p(paths.configFile) + '（' + where + '）。',
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
      action: '确认「数据目录」与「库文件名」对不对；新装的话，跑一条会写库的命令即会建库。',
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
        action: '待建库（开始初始化）：缺表会让对应的功能报错，跑一次会写库的命令让它补齐。',
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

  // ④ 产物**根**目录：在不在、能不能写（还没建＝绿：交付页面时才落这里，那时自动建）。
  // #843 起产品分两支：页面落这个根下，HELP 落根下的 `html.helpDir` 子目录（面板那一行显示的是子目录）。
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

  // ⑥ 飞书 CLI（作息特有，#764 照 #761 定稿重写）：三档与面板「飞书 CLI」状态行**同判据、同话术**
  // （判据就跑 `src/fetch/feishu.ts` 里那两条：`auth status` 有 `openId`，且 `calendar +agenda` 退 0）——
  // 面板只显示这一项，不重写一个字。
  //   · 没找到 CLI → 红：「没找到飞书 CLI」＋ 复制 prompt ＋ 官网行；
  //   · 找到了但没就绪 → 黄：「找到了 <路径>，但还没登录／日历读不到」；
  //   · 就绪 → 绿：CLI 路径与版本。
  // **红只留给「没找到 CLI」这个确定性事实**（#761 定稿第 6 条）。
  const larkCli = findLarkCli();
  const tier = larkTier(larkCli);
  const larkWhere = larkCli === null ? '' : p(larkCli);
  const larkVersionText = tier === 'full' && larkCli !== null ? larkVersion(larkCli) : '';
  items.push({
    id: 'lark.cli', title: '飞书 CLI',
    status: tier === 'full' ? 'green' : tier === 'partial' ? 'yellow' : 'red',
    message: tier === 'full'
      ? '已就绪：' + larkWhere + '（版本 ' + larkVersionText + '）。'
      : tier === 'partial'
        ? '找到了 ' + larkWhere + '，但还没登录／日历读不到。'
        : '没找到飞书 CLI：面板「飞书 CLI」那一行有安装指引（复制 prompt 照做）。',
    action: tier === 'full'
      ? ''
      : tier === 'partial'
        ? '按面板那一行的安装 prompt 走完登录与授权，再点重新检测。'
        : '装好并登录后，在面板上点重新检测。',
    source: '默认值',
  });

  // ⑦ 分类允许清单（作息特有）：查的是**新仓这份实现**＝`src/policy/category.ts`
  // （`LEVEL1_WHITELIST` 一级 8 个固定 ＋ `DEFAULT_WHITELIST` 二级内置默认，见该件 :2-3 的口径）。
  // 老仓那个 `category_whitelist.yaml`（以及它那句逐字 action，出处 `scripts/setup_scenarios.py:230-231`）
  // 只作注释里的出处，不出现报文里——新仓没有那个文件，用户 YAML 增量也不迁。
  // 不在＝黄：包内源码件，缺了多半是包装坏了，重装即补齐。
  const whitelistSource = join(packageRoot(), 'src', 'policy', 'category.ts');
  const whitelistExists = existsSync(whitelistSource);
  items.push({
    id: 'whitelist.file', title: '分类允许清单',
    // 档位与 action 都照检查表原话（`docs/research/check-table-671-life-panel-20260917.html` 作息那行：
    // 「不在＝红（action 文案逐字有）」）。中间几轮曾按新仓事实下调成黄、并换掉那句逐字 action——
    // 那是改判据，对抗式审查两轴都点了；这里还原成检查表的写法。
    status: whitelistExists ? 'green' : 'red',
    message: whitelistExists
      ? '在：' + p(whitelistSource) + '（新仓的分类允许清单住这里：一级固定 ＋ 二级内置默认）。'
      : '不在：' + p(whitelistSource) + '（新仓的分类允许清单；包内源码件，缺了多半是包装坏了）。',
    action: whitelistExists ? '' : '缺失 category_whitelist.yaml,请检查技能目录完整性',
  });

  // ⑧ 包内模板目录（作息特有）：业务页模板是包内固定件，缺了页面就渲染不出来 ⇒ 红。报文给件数。
  const templatesDir = join(packageRoot(), 'templates');
  const templatesOk = existsSync(templatesDir);
  const templateCount = templatesOk ? templateFileCount(templatesDir) : 0;
  items.push({
    id: 'templates.dir', title: '包内模板目录',
    status: templatesOk ? 'green' : 'red',
    message: templatesOk
      ? '在，' + String(templateCount) + ' 件模板：' + p(templatesDir) + '。'
      : '不在：' + p(templatesDir) + '。',
    action: templatesOk ? '' : '技能包装得不完整：重装这个技能包，或跑一次它的构建。',
  });

  return { skill: SKILL, configPath: p(paths.configFile), dataDir: p(dataDir), items };
}
