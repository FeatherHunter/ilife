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
 * ＋ 作息特有 2 条（飞书 CLI／包内模板目录）。
 * 检查表上「分类允许清单」那条已撤：它探的是 `src/policy/category.ts`——包按设计只发 dist，
 * 装机态恒没有 `src/`，这条红不可达（真缺 dist 产物则静态 import 先崩、报告本身出不来）。
 * **本家第 4 条（作息第二份库 `daily_recorder.db`）已由编者从检查表里撤回**，见票 #706 的遗留出口
 * （老技能默认链算出的 `D:\.db\daily_recorder.db` 与实测那个不是同一个文件，事实在核）——故未实现，
 * 报告里也不出现这一项。
 *
 * **判据查的路径一律是新仓的**（票面第 2 条「缺配置会怎样按新仓＋新机制写」）：检查表里那些老仓
 * 文件名只作注释里的出处，不进用户看到的报文。
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
import { configPaths, dirFaultCodeOf } from 'base-link-core';
// 故障码的唯一定义地在 base-link-core（#1327 评审 HARD2：三家不许各抄一遍）；本件转出给测试用。
export { dirFaultCodeOf } from 'base-link-core';
import { SCHEDULE_CONFIG_DEFAULTS, SCHEDULE_CONFIG_STEM } from './config.js';
// #764：落点算式只有一处定义地（`src/fetch/paths.ts`）——体检报的就是那几个落点，两处不许走散。
// 本件只调**纯算式**（`*Of` 一族，不读配置、不碰盘）：体检不许调 `loadScheduleConfig()`（文件不在即落一份默认件）。
import { dbDirOf, dbFileOf, htmlDirOf, resolvedHtmlDirs } from './fetch/paths.js';
// #764：飞书 CLI 的查找只剩兜底探测（配置项 `lark.cliPath` 已删），候选顺序的唯一定义地是
// `src/fetch/feishu.ts` 的 `larkCliCandidates()`——本件直接调它，不留第二份表。
import { findLarkCli, larkVersion, shortLarkVersion, larkVersionCell, maskLarkCli, type LarkStatusReading } from './fetch/feishu.js';
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

export interface ScheduleHealthReport {
  readonly skill: string;
  readonly configPath: string;
  readonly dataDir: string;
  readonly items: readonly HealthItem[];
  /** #936：面板「飞书 CLI」状态区要的三格（三档 ＋ 路径 ＋ 版本号），与备忘录 `memo.config.read` 回执里
   *  那个 `lark` 格**同组名、同字段名**（形状＝`LarkStatusReading`，住 `src/fetch/feishu.ts`）。
   *  为什么住在体检回执而不进 `schedule.config.read`：那一条读路径不许探 lark（见 `src/cli/config.ts` 的注），
   *  面板本来也只在这通体检电话里取「飞书 CLI」那一行。`items` 里那条 `lark.cli` 的话术不动，两处同源。 */
  readonly lark: LarkStatusReading;
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
    return { kind: 'bad', message: m('skill-schedule.health.c001', {
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
  const fail = (line: number, why: string) => ({ ok: false as const, message: m('skill-schedule.health.c002', { p0: String(String(line)), p1: String(why), p2: String(file) }) });
  const closeGroup = (): string | null => {
    if (openGroup !== null && Object.keys(values[openGroup] as Record<string, unknown>).length === 0) {
      return fail(openGroupLine, m('skill-schedule.health.c003', { p0: String(openGroup) })).message;
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
    if (head.includes('\t')) return fail(lineNo, m('skill-schedule.health.c004'));
    if (body.startsWith('-')) return fail(lineNo, m('skill-schedule.health.c005'));
    const matched = /^([A-Za-z_][A-Za-z0-9_.-]*)[ \t]*:[ \t]*(.*)$/.exec(body);
    if (matched === null) return fail(lineNo, m('skill-schedule.health.c006', { p0: String(body.trim()) }));
    const key = matched[1] as string;
    const rest = (matched[2] ?? '').trim();
    if (head.length > 0) {
      if (head.length !== 2) return fail(lineNo, m('skill-schedule.health.c007', { p0: String(String(head.length)) }));
      if (openGroup === null) return fail(lineNo, m('skill-schedule.health.c008', { p0: String(key) }));
      const group = values[openGroup] as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(group, key)) {
        return fail(lineNo, m('skill-schedule.health.c009', {
          p0: String(openGroup),
          p1: String(key),
          p2: String(String(lineOf.get(openGroup + '.' + key))),
        }));
      }
      if (rest === '') return fail(lineNo, m('skill-schedule.health.c010', { p0: String(openGroup), p1: String(key) }));
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
      return fail(lineNo, m('skill-schedule.health.c011', { p0: String(key), p1: String(String(lineOf.get(key))) }));
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
      onError(fail(lineNo, m('skill-schedule.health.c012', { p0: String(text) })).message);
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
    onError(fail(lineNo, m('skill-schedule.health.c013')).message);
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
  return present.has(key) ? m('skill-schedule.health.c014') : m('skill-schedule.health.c015');
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
    if (!statSync(dir).isDirectory()) return { exists: false, writable: false, reason: m('skill-schedule.health.c016') };
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

/** `db.dir` 那一项的体检结论（#915 第二步：`*.config.read` 的行告警复用它，不自己再判一遍）。
 *
 * 只碰目录本身（`dirVerdict` 那一支），不跑 lark 链——`config.read` 落盘只许 `.ilife` 那一份，
 * 体检链里那个来路不明的家目录写盘（`.lark-cli`）不许跟进行告警这条路。 */
export function dbDirHealthItem(
  values: Record<string, Record<string, unknown>>,
  present: ReadonlySet<string>,
  defaultDataDir: string,
): HealthItem {
  const dbDirConfigured = textOf(readValue(values, 'db', 'dir'));
  const dataDir = dbDirOf(defaultDataDir, dbDirConfigured);
  const dataDirSource = sourceOf(present, 'db.dir');
  const dataDirVerdict = dirVerdict(dataDir);
  return {
    id: 'db.dir', title: m('skill-schedule.health.c017'),
    status: !dataDirVerdict.exists || !dataDirVerdict.writable ? 'red' : 'green',
    message: !dataDirVerdict.exists
      ? m('skill-schedule.health.c018', {
        p0: String(p(dataDir)),
        p1: String(dataDirVerdict.reason !== '' ? '（' + dataDirVerdict.reason + '）' : ''),
      })
      : dataDirVerdict.writable
        ? m('skill-schedule.health.c019', { p0: String(p(dataDir)) })
        : m('skill-schedule.health.c020', { p0: String(p(dataDir)), p1: String(dataDirVerdict.reason) }),
    action: !dataDirVerdict.exists
      ? m('skill-schedule.health.c021')
      : dataDirVerdict.writable ? '' : m('skill-schedule.health.c022'),
    source: dataDirSource,
  };
}

/** `db.dir` 的故障码：与 `dbDirHealthItem` 同一份只读推导（#1327 供行告警用，不解析本地化报文）。 */
export function dbDirFaultCode(
  values: Record<string, Record<string, unknown>>,
  present: ReadonlySet<string>,
  defaultDataDir: string,
): 'DIR_MISSING' | 'DIR_UNWRITABLE' | undefined {
  const dataDir = dbDirOf(defaultDataDir, textOf(readValue(values, 'db', 'dir')));
  return dirFaultCodeOf(dirVerdict(dataDir));
}

/** `*.config.read` 行告警用的 `db.dir` 结论：红才回 `{code, message}`（`message` 原样），否则缺席。
 *  只读：读配置不落盘、不探 lark（见 `dbDirHealthItem` 的注释）。 */
export function dbDirAlert(): { readonly code: string; readonly message: string } | undefined {
  const paths = configPaths(SCHEDULE_CONFIG_STEM);
  const read = readScheduleConfigReadOnly();
  if (read.kind !== 'ok') return undefined;
  const item = dbDirHealthItem(read.values, read.present, paths.dataDir);
  if (item.status !== 'red') return undefined;
  const code = dbDirFaultCode(read.values, read.present, paths.dataDir);
  if (code === undefined) return undefined;
  return { code, message: item.message };
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
  const where = relocated ? m('skill-schedule.health.c023') : m('skill-schedule.health.c024');
  if (read.kind === 'bad') {
    items.push({
      id: 'config.file', title: m('skill-schedule.health.c025'), status: 'red',
      message: read.message,
      action: m('skill-schedule.health.c026'),
      source: m('skill-schedule.health.c027'),
    });
  } else if (read.kind === 'missing') {
    items.push({
      id: 'config.file', title: m('skill-schedule.health.c028'), status: 'yellow',
      message: m('skill-schedule.health.c029', { p0: String(p(paths.configFile)) }),
      action: m('skill-schedule.health.c030'),
      source: m('skill-schedule.health.c031'),
    });
  } else {
    items.push({
      id: 'config.file', title: m('skill-schedule.health.c032'), status: 'green',
      message: m('skill-schedule.health.c033', { p0: String(p(paths.configFile)), p1: String(where) }),
      action: '',
      source: m('skill-schedule.health.c034'),
    });
  }

  // ② 数据目录：在不在、能不能写（结论构造只有一处定义地＝上面的 `dbDirHealthItem`，行告警复用它）。
  items.push(dbDirHealthItem(values, present, paths.dataDir));
  // 后面几条还要用生效数据目录与它的来源：同一条 `dbDirOf` 算式与 `sourceOf` 口径，不另算一份。
  const dataDir = dbDirOf(paths.dataDir, textOf(readValue(values, 'db', 'dir')));
  const dataDirSource = sourceOf(present, 'db.dir');

  // ③ 库文件：在不在 ＋ 表数够不够。
  const dbNameConfigured = textOf(readValue(values, 'db', 'name'));
  const dbFile = dbFileOf(dataDir, dbNameConfigured);
  const dbSource = sourceOf(present, 'db.name');
  if (!existsSync(dbFile)) {
    items.push({
      id: 'db.file', title: m('skill-schedule.health.c035'), status: 'red',
      message: m('skill-schedule.health.c036', { p0: String(p(dbFile)) }),
      action: m('skill-schedule.health.c037'),
      source: dbSource,
    });
  } else {
    const tables = tableCount(dbFile);
    if (!tables.ok) {
      items.push({
        id: 'db.file', title: m('skill-schedule.health.c038'), status: 'red',
        message: m('skill-schedule.health.c039', { p0: String(p(dbFile)), p1: String(tables.reason) }),
        action: m('skill-schedule.health.c040'),
        source: dbSource,
      });
    } else if (tables.count < DB_TABLE_THRESHOLD) {
      items.push({
        id: 'db.file', title: m('skill-schedule.health.c041'), status: 'yellow',
        message: m('skill-schedule.health.c042', {
          p0: String(p(dbFile)),
          p1: String(String(tables.count)),
          p2: String(String(DB_TABLE_THRESHOLD)),
        }),
        action: m('skill-schedule.health.c043'),
        source: dbSource,
      });
    } else {
      items.push({
        id: 'db.file', title: m('skill-schedule.health.c044'), status: 'green',
        message: m('skill-schedule.health.c045', { p0: String(String(tables.count)), p1: String(p(dbFile)) }),
        action: '',
        source: dbSource,
      });
    }
  }

  // ④ 产物**根**目录：在不在、能不能写（还没建＝绿：交付页面时才落这里，那时自动建）。
  // #843 起产品分两支：页面落这个根下，HELP 落根下的 `html.helpDir` 子目录（面板那一行显示的是子目录）。
  // 根一律取 `resolvedHtmlDirs()` 的生效值——老配置文件里的两级 `html.dir` 由它认账（#862），
  // 体检与设置页不许各算一份（同一件事只有一个定义地）。
  const htmlDir = htmlDirOf(dataDir, resolvedHtmlDirs().rootDir);
  const htmlVerdict = dirVerdict(htmlDir);
  const htmlSource = sourceOf(present, 'html.dir');
  items.push({
    id: 'html.dir', title: m('skill-schedule.health.c046'),
    status: !htmlVerdict.exists ? 'green' : htmlVerdict.writable ? 'green' : 'yellow',
    message: !htmlVerdict.exists
      ? m('skill-schedule.health.c047', { p0: String(p(htmlDir)) })
      : htmlVerdict.writable
        ? m('skill-schedule.health.c048', { p0: String(p(htmlDir)) })
        : m('skill-schedule.health.c049', { p0: String(p(htmlDir)) }),
    action: !htmlVerdict.exists || htmlVerdict.writable ? '' : m('skill-schedule.health.c050'),
    source: htmlSource,
  });

  // ⑤ 这个值从哪来：只陈述数据目录与库文件名的来源，不判好坏（六家通用最后一条）。
  // #1223：条件尾句抽成中转变量——整句化只认「一段文案 ＋ 若干变量」。
  const sourceTail = read.kind === 'missing' ? m('skill-schedule.health.c051') : '。';
  items.push({
    id: 'value.source', title: m('skill-schedule.health.c052'), status: 'green',
    message: m('skill-schedule.health.c053', {
      p0: String(dataDirSource),
      p1: String(dbSource),
      p2: String(sourceTail),
    }),
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
  // #895：报文是正文位，可执行文件名（含 `lark-cli`）与 `--version` 原文都不许上屏——
  // 版本与工具名遮蔽都走 `fetch` 门的同一口径（`shortLarkVersion`／`maskLarkCli`），这里只传参。
  // 目录取所在目录（可执行文件名已剥掉）；scoop 那档目录名本身含工具名，一并遮蔽。
  const larkDir = larkCli === null ? '' : maskLarkCli(p(dirname(larkCli)));
  // #936：版本读数**一次读、两处用**——报文那一格（只在全通档给，口径不变）与回执那一格（找到 CLI 就照实给）。
  // 读失败（超时／非 0 退出／程序起不来）只让版本这一格留空：**不抛**（体检不许因为读版本崩），
  // 也不改上面那三档判定——`larkTier` 早就把档位定完了，这里只是顺手把版本号读回来。
  let larkRawVersion = '';
  if (larkCli !== null) {
    try { larkRawVersion = larkVersion(larkCli); } catch { larkRawVersion = ''; }
  }
  const larkVersionNum = tier !== 'full' || larkCli === null ? '' : shortLarkVersion(larkRawVersion);
  const larkReading: LarkStatusReading = {
    tier,
    cliPath: larkCli,
    // 「拿不到就不交这一格」：没找到 CLI 或读不到版本号 ⇒ null（面板据此不画版本胶囊），不编任何占位串。
    version: larkCli === null || larkRawVersion === '' ? null : larkVersionCell(larkRawVersion),
  };
  items.push({
    id: 'lark.cli', title: m('skill-schedule.health.c054'),
    status: tier === 'full' ? 'green' : tier === 'partial' ? 'yellow' : 'red',
    message: tier === 'full'
      ? m('skill-schedule.health.c055', { p0: String(larkVersionNum), p1: String(larkDir) })
      : tier === 'partial'
        ? m('skill-schedule.health.c056', { p0: String(larkDir) })
        : m('skill-schedule.health.c057'),
    action: tier === 'full'
      ? ''
      : tier === 'partial'
        ? m('skill-schedule.health.c058')
        : m('skill-schedule.health.c059'),
    source: m('skill-schedule.health.c060'),
  });

  // ⑧ 包内模板目录（作息特有）：业务页模板是包内固定件，缺了页面就渲染不出来 ⇒ 红。报文给件数。
  const templatesDir = join(packageRoot(), 'templates');
  const templatesOk = existsSync(templatesDir);
  const templateCount = templatesOk ? templateFileCount(templatesDir) : 0;
  items.push({
    id: 'templates.dir', title: m('skill-schedule.health.c061'),
    status: templatesOk ? 'green' : 'red',
    message: templatesOk
      ? m('skill-schedule.health.c062', { p0: String(String(templateCount)), p1: String(p(templatesDir)) })
      : m('skill-schedule.health.c063', { p0: String(p(templatesDir)) }),
    action: templatesOk ? '' : m('skill-schedule.health.c064'),
  });

  return { skill: SKILL, configPath: p(paths.configFile), dataDir: p(dataDir), items, lark: larkReading };
}
