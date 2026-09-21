#!/usr/bin/env node
// 居家管家唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。写走 receipt（直通 create/update/remove 即真相）。
// #800 · 通用分派口：21 个 case 已换成 `REGISTRY[key]` 查表分派（能力目录那道门）；
// 新增能力／新增命令都不必碰这个文件，只改它那个能力的 `commands.ts`＋子功能文件。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HomeFetchError, HomePolicyError,
  resolveDbDir, resolveDbPath, resolveHtmlDir, dbFilename, openHomeDb, closeHomeDb,
  createBackup, listBackups, restoreBackup, exportData,
} from '../fetch/index.js';
import type { RestoreOutcome } from '../fetch/backup.js';
import type { HomeKey } from '../policy/index.js';
import {
  homeShapeFor, buildHomeEnvelope, renderEnvelopeHtml, assertHtmlSize,
  loadTemplate, templateFor, fillTemplate, resolveSceneStem,
  buildCareList, buildReceipt, buildHelpItems,
  HomeRenderError,
} from '../render/index.js';
import { buildHelpLookup, buildHomeHelpFileData, renderHomeHelpHtml, deliverHomeHelp } from '../help/index.js';
import type { HomeHtmlDelivery } from '../help/index.js';
import { deliverHtml } from '../output.js';
import { helpDirName, helpFileStem, lookupFileStem } from '../help/manifest.js';
import { REGISTRY } from './registry.js';
import { fail, toast, note } from '../shared/fail.js';
import { isConfigKey, runConfigKey } from './config.js';
// #706 · 配置体检：设置页专用的一条只读命令，同走「进分派层之前拦下」这条口（判据住 src/health.ts）。
import { isHealthCheckKey, runHealthCheckKey } from './health.js';
import { helpReuseWindowOf } from 'base-paint/save-html';

const DEFAULT_TIMEOUT_MS = 30000;

function preflight(): void {
  const v = process.versions.node.split('.').map(Number);
  if (!(v[0] > 22 || (v[0] === 22 && v[1] >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
}

/* ── #190 · 「居家管家HELP」的交付装配（**在开库之前**走，照 skill-bill/src/cli/cmd_read.ts:69-111）────
 *
 * 缺省（无 `mode`、无 `q`）＝ 老实物同款 HELP 文件：`<配置项 db.dir 给的数据目录>/home_manager_html/
 * 居家管家_HELP_<YYYYMMDD_HHMMSS>[_N].html`，独占落盘 ＋ **绝对路径**回执（`delivery` 顶层追加）。
 * 显式 `mode:"lookup"` ＝ 全量速查表产物（主体 `居家管家_速查表`，与 HELP 文件**分名**）。
 * 显式 `q` ＝ 现找：只回命中（stdout），语义与本键今天一字不变；三支互斥，非法 `mode` ⇒ `fail(2)`。
 * 显式 `reuseHours`（小时）＝ 复用窗口：缺省**一天**（24h 内回同一路径、不新建不改写）、
 * `0`＝每次都落一份新的。换算与坏参判定都在共用件（`helpReuseWindowOf`）⇒ 坏参归出口的 exit 2；
 * #190 D2：这道换算**抬到三支分派之前单点跑**——同一个坏 `reuseHours` 不许因「走哪支」而隐身或两副面孔。
 * #190 D1：`q` 给了但**不是字符串**一律 `fail(2)`——不许静默当「没给 q」掉进缺省支白落一份文件。
 * `--html <路径>` 支**保持原样**（`main` 里那支不动）：它是所有 key 通用的产物出口，HELP 交付不走它。
 * 落盘只出**意图**（目录 ＋ 文件名主体），时间戳与同秒递补由共用件 `saveHtmlFile` 钉死（见 `help/output.ts`）。
 *
 * 全程**不开库**：初始化状态＝「DB 文件**存在**」（判据由 `buildHomeHelpFileData` 吃 `dbPath` 现算，
 * 见 `src/help/helpFile.ts` 件头），免得「看帮助」把居家库 `new DatabaseSync` 出来并跑 DDL 自愈。
 * ⚠️ 算这条路径**不许**走 `src/fetch/paths.ts` 的 `resolveDbPath()`——它自带 `mkdirSync`
 * ⇒「判一下」就把目录建出来。这里只用只读出口 `resolveDbDir()`（配置项 `db.dir`，空串＝数据目录）＋ `dbFilename()` 拼。
 */
interface DeliverIntent {
  readonly html?: string;
  readonly targetDir: string;
  readonly stem: string;
  readonly reuseMs?: number;
}
interface HelpDispatch { readonly data: unknown; readonly deliver?: DeliverIntent; }

/** 复用窗口（毫秒）：坏参抛 `RangeError` ⇒ 交出口的「参数错」那一档（共用件工厂，别家同形）。 */
const helpWindowOrFail = helpReuseWindowOf((m) => fail(2, m));

function dispatchHelp(params: Record<string, unknown>): HelpDispatch {
  const dbDir = resolveDbDir();
  const now = new Date();
  const mode = params.mode === undefined ? undefined : String(params.mode);
  if (params.q !== undefined && typeof params.q !== 'string') {
    fail(2, '参数 q 须为字符串（收到 ' + (Array.isArray(params.q) ? 'array' : typeof params.q) + '）：q＝现找关键词');
  }
  const q = params.q as string | undefined;
  if (mode !== undefined && q !== undefined) fail(2, '参数 q 与 mode 互斥：q＝现找，mode＝速查表产物');
  if (mode !== undefined && mode !== 'lookup') fail(2, 'mode 非法（' + String(mode) + '）：本键只认 lookup');
  // 参数面校验单点（#190 D2）：三支分派**之前**一次过完，坏 `reuseHours` 无论走哪支都同一个 exit 2。
  const reuseMs = helpWindowOrFail(params);
  const all = buildHelpLookup().map((h) => ({ phrase: h.phrase, key: h.key, shape: h.shape, cli: h.cli, desc: h.desc }));
  if (q !== undefined) return { data: buildHelpItems(all, q) };
  const targetDir = join(dbDir, helpDirName());
  if (mode === 'lookup') {
    return {
      data: buildHelpItems(all, undefined),
      deliver: { targetDir, stem: lookupFileStem(), reuseMs },
    };
  }
  const html = renderHomeHelpHtml(buildHomeHelpFileData(now, { dbPath: join(dbDir, dbFilename()) }));
  return {
    data: buildHelpItems(all, undefined),
    deliver: { html, targetDir, stem: helpFileStem(), reuseMs },
  };
}

/* ── #707 · 备份导出／导入恢复（**在开库之前**走）───────────────────────────────────────────
 *
 * 为什么不进 `dispatch`：恢复＝拿备份覆盖 `home.db`，而 `dispatch` 一进来就 `openHomeDb` 并持有句柄；
 * 库在手里时覆盖库文件＋清 WAL／SHM 会把库写坏。故照 #190 的 help 支，本函数自管短命连接、在 `dispatch` 之前分派。
 * 认的 (key,kind)：`home.care.query`+`backup-list`／`home.care.write`+`backup`|`export`|`import-preview`|`import`。
 * 其余一律返回 `null` 照旧走 `dispatch`（含开库）；`dispatch` 里那几条 kind 走到就是路由坏了（fail(1)）。
 */
function keepNOf(params: Record<string, unknown>): number | undefined {
  const v = params.keep_n ?? params.keepN;
  if (v === undefined) return undefined;
  if (!Number.isInteger(v) || (v as number) <= 0) fail(2, 'keep_n 须为正整数');
  return v as number;
}

function fmtBytes(n: number): number | string {
  if (n < 1024) return n + ' 字节';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KiB';
  return (n / 1024 / 1024).toFixed(1) + ' MiB';
}

function dispatchBackup(key: string, params: Record<string, unknown>): unknown | null {
  const kind = typeof params.kind === 'string' ? params.kind : '';
  if (key === 'home.care.query' && kind === 'backup-list') {
    const l = listBackups({ keepN: keepNOf(params) });
    const rows = l.history.map((h) => ({
      name: h.file + '（' + fmtBytes(h.size) + '，' + h.days_ago + ' 天前）', count: h.size,
    }));
    return buildCareList(rows.length ? rows : [{ name: '无备份（目录：' + l.dir + '）', count: 0 }]);
  }
  if (key !== 'home.care.write') return null;
  if (kind === 'backup') {
    const r = createBackup({ keepN: keepNOf(params) });
    return buildReceipt('已备份：' + r.items + ' 件 → ' + r.file + '（' + fmtBytes(r.size) + '，保留 ' + r.keep_n + ' 份）。'
      + '本备份不含主密钥文件：换机恢复后要用账号密码，把它一起带过去。');
  }
  if (kind === 'export') {
    const r = exportData({ format: params.format as string | undefined, output: params.output as string | undefined });
    return buildReceipt('已导出：' + r.format.toUpperCase() + ' ' + r.rows + ' 行 → ' + r.file + '（' + fmtBytes(r.size) + '）');
  }
  if (kind !== 'import-preview' && kind !== 'import') return null;
  const file = params.file;
  if (typeof file !== 'string' || !file) fail(2, '导入恢复须给 file（备份文件名或绝对路径）');
  if (kind === 'import-preview') {
    const p = restoreBackup(file, { dryRun: true });
    return buildReceipt('dry_run' in p ? p.message : '');
  }
  if (params.confirm !== true) {
    fail(2, '导入恢复会**整库覆盖**，须显式 confirm:true（先跑 kind=import-preview 看预告）');
  }
  const r: RestoreOutcome = restoreBackup(file, { keepN: keepNOf(params) });
  if ('dry_run' in r) fail(1, '内部错误：确认支不该拿到预告结果');
  return buildReceipt(r.message + '（' + r.before_items + ' → ' + r.items_total + ' 件；恢复前自备份 ' + r.safety_backup + '）');
}

/* ── #800 · 通用分派口 ───────────────────────────────────────────────────────────
 *
 * 命中即走能力目录那道门（`REGISTRY[key].run`），未命中即未知键。开库／关库仍归这里管；
 * 取数逻辑全在各能力目录的子功能文件里，本函数一行不增。
 */
function dispatch(key: string, params: Record<string, unknown>): unknown {
  const dbPath = resolveDbPath();
  const handle = openHomeDb(dbPath);
  try {
    if (handle.initialized) note('居家 DB 已初始化：' + dbPath);
    const spec = REGISTRY[key];
    if (!spec) fail(3, '未知 home key：' + key);
    return spec.run(params, handle);
  } finally {
    closeHomeDb(handle);
  }
}

function parseArgs(a: string[]): { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } {
  const o: { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } = { key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i];
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i];
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || o.timeout <= 0) fail(2, '--timeout 须为正数毫秒');
    }
    else fail(2, '未知参数：' + a[i]);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.key) fail(2, '用法：home-cmd-read <home.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params); } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  // #695：三个配置 key（`home.config.read/write/reset`）在库目录预检与形状表之前拦下——
  // 读写配置不该要求库已配，它们也不进 `HOME_KEY_SHAPES`（不是唤醒词命令，见 `src/cli/config.ts`）。
  if (isConfigKey(o.key)) {
    process.stdout.write(runConfigKey(o.key, params) + '\n');
    return;
  }
  // #706 · 配置体检（`home.config.check`）：同样是设置页专用的只读命令，同样在预检之前拦下——
  // 它要报的正是「库在哪、通不通」，不能先要求库目录已配。只读：不建目录、不写文件、不落默认配置。
  if (isHealthCheckKey(o.key)) {
    process.stdout.write(runHealthCheckKey(o.key) + '\n');
    return;
  }
  preflight();
  try { homeShapeFor(o.key as HomeKey); } catch (e) { fail(3, (e as Error).message); }
  const key = o.key as string;
  const timer = setTimeout(() => {
    toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数');
    process.exit(4);
  }, o.timeout);
  if (typeof timer.unref === 'function') timer.unref();
  let delivery: HomeHtmlDelivery | undefined;
  try {
    // #190：`home.help.lookup` 在**开库之前**分派（只读页不建库）；#707：备份四支同理（恢复要覆盖库文件）。
    const help = key === 'home.help.lookup' ? dispatchHelp(params) : null;
    const offline = help ? null : dispatchBackup(key, params);
    const env = buildHomeEnvelope(key, help ? help.data : offline !== null ? offline : dispatch(key, params));
    // 分节页（模板填充后）：`--html` 支与速查支共用这一处，不抄第二份。
    const sectionHtml = (): string => {
      const html = fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(env));
      assertHtmlSize(html);
      return html;
    };
    // #801 · 数据与过程命令默认落 HTML（`help === null` 才走这里；HELP 键的三支冻结不动）。
    // 落点意图＝ `{dir: <库目录>/home_manager_html/, stem: <命令中文名>_<场景 id>}`（stem 照票 2 契约），
    // 时间戳与同秒递补由共用件钉死。给了 `--html` 则显式优先（只落一份、单回执，照账单／卡路里先例）。
    if (help === null) {
      const landing = { dir: resolveHtmlDir(), stem: resolveSceneStem(key, params) };
      delivery = deliverHtml({
        ...(o.html === undefined ? {} : { explicit: o.html }),
        target: landing,
        html: sectionHtml(),
      });
      note('HTML 已写：' + delivery.path + '（' + delivery.bytes + ' 字节 utf8）');
    } else {
      // `--html <路径>` 既有语义**原样保留**（HELP 键的通用产物出口）：写本包 envelope 分节页。
      if (o.html !== undefined) {
        try {
          writeFileSync(o.html, sectionHtml(), 'utf8');
          note('HTML 已写：' + o.html + '（utf8）');
        } catch (e) {
          if (e instanceof HomeRenderError) fail(5, (e as Error).message);
          fail(5, 'HTML 写盘失败：' + o.html + '（' + (e as Error).message + '）');
        }
      }
      // #190：本键的产物（缺省＝HELP 全壳页自带 html；`mode:"lookup"`＝速查表分节页）。
      if (help?.deliver !== undefined) {
        const html = help.deliver.html ?? sectionHtml();
        if (help.deliver.html !== undefined) assertHtmlSize(html);
        delivery = deliverHomeHelp({
          targetDir: help.deliver.targetDir, stem: help.deliver.stem, html, reuseMs: help.deliver.reuseMs,
        });
        note('HTML 已写：' + delivery.path + '（' + delivery.bytes + ' 字节 utf8）');
      }
    }
    // #83 口径的顶层追加：`delivery{mode,path,bytes}` **只追加**，既有字段一字不改、序不变。
    process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n');
    clearTimeout(timer);
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof HomePolicyError) fail(2, (e as Error).message);
    if (e instanceof HomeFetchError) fail(4, (e as Error).message);
    if (e instanceof HomeRenderError) fail(5, (e as Error).message);
    // 配置件（`base-link-core`）的报错本身就是人话（带行号与文件名）：归「预检」那一档原样交回。
    // #695：这一档也接住「测试缺隔离」——跑在测试运行器里却要落到真实家目录时响亮失败。
    if (/(配置文件|配置项|测试缺隔离)/.test((e as Error).message ?? '')) fail(1, (e as Error).message);
    fail(4, '取数失败：' + (e as Error).message);
  }
}

void main();
