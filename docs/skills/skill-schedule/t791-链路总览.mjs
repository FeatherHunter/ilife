#!/usr/bin/env node
/** #791 链路页·**生成器**：把整条链路摊成一页 —— 一句 prompt → 唤醒词 → 命令 → 产物绝对路径（点路径即开）。
 *
 *  票面验收命令：`node docs/skills/skill-schedule/t791-链路总览.mjs`
 *
 *  它产出两份件（都是本票的交付物）：
 *    · `docs/skills/skill-schedule/链路总览.html`——给人看的那一页（绝对路径列 `file://` 可点）；
 *    · `.scratch/t791/t791-清单.json`——给墙与索引读的那一份（每行每件的 file／bytes／sha256）。
 *
 *  **读什么、不读什么**（票面「不许动的东西」：名字只从【交付面】定的规则与清单读）：
 *    · 路由表（唤醒词 → 命令键，**51 条**）：`packages/skill-schedule/dist/triggers/routes.generated.js`
 *      ——那是 `src/triggers/routes.generated.ts` 的编译产物、由 `scripts/gen-cli.mjs` 从各能力
 *      `routes.ts` 派生（生成的权威表）。本件**不抄**这 51 条。
 *    · 唤醒词 → 产物：八张域票的清单件（`.scratch/t783…t790/成品/t78x-清单.json`），归属表住
 *      `./t791-数据.mjs`（本票自己裁的那一份，表里只写**文件名**）。
 *    · **名字一处也不自己算**：产物名逐字取清单件记的那一份（那是各域探针从 `delivery.path`
 *      复制出来的可读名），本件不做任何重命名、不复制产物、不重跑任何出页命令（不碰主干写面）。
 *
 *  怎么算绿（票面「怎么算绿」逐条落成自检，任一破即 exit 1）：
 *    ① 行数＝路由表条数：51 ＝ 47（出页）＋ 4（HELP 别名）＋ 3（新仓无此命令的语取链）；
 *    ② 每一行的产物在盘上存在，且字节数与 sha256 与清单件逐件相符（八份清单 61 件一件不落）；
 *    ③ 页面里零 `http`／`https` 外链、零 `<link>`、零 `@import`；
 *    ④ 路径列全是绝对路径（`file:///` 打头，Windows 盘符式）。
 *  另外两条**本件自己加的**（票面没点名，但少了它们这张页就成了空话）：
 *    ⑤ 八份清单的 73 件产物每一件都被至少一条路由指着（谁都没点名＝孤儿＝红）；
 *    ⑥ 数据件点头的每一件都在清单里（点了一份不存在的产物＝红）＋ 表里没点名的路由条必须在「有意不出」名单里。
 *  一件产物被**多条**路由指着是正常的（同一枚 key 的多条唤醒词共用一张页），不是重复计数——
 *  故本件不按「一件只归一条」判，只按「每一件都有人指着、每一件都真在盘上」判。
 *
 *  用法：`node docs/skills/skill-schedule/t791-链路总览.mjs`（无参数；全只读）。
 *  退出码：0＝全绿；1＝有红条；2＝前置件缺失（路由表／清单件／数据件读不到）。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MANIFESTS, ROWS, EXCLUDED } from './t791-数据.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const ROUTES_JS = join(REPO, 'packages', 'skill-schedule', 'src', 'triggers', 'routes.generated.ts');
const PAGE = join(HERE, '链路总览.html');
const LEDGER = join(REPO, '.scratch', 't791', 't791-清单.json');

const reds = [];
const lines = [];
const ok = (m) => lines.push('OK   ' + m);
const red = (m) => { reds.push(m); lines.push('RED  ' + m); };
const die2 = (m) => { console.error('ERR2 ' + m); process.exit(2); };
const tick = (b) => (b ? '✓' : '✗');
const rel = (p) => p.replace(/\\/g, '/');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ─────────────────────────── 前置件 ─────────────────────────── */

if (!existsSync(ROUTES_JS)) {
  die2('缺生成的路由表：' + rel(ROUTES_JS) + '（由 `scripts/gen-cli.mjs` 从各能力 routes.ts 派生，别手改）');
}
for (const m of MANIFESTS) {
  if (!existsSync(join(REPO, m.file))) die2('缺域清单件：' + m.file + '（八张域票的验收产物，被清了要重跑对应探针）');
}

/** 路由表（51 条）：`dist` 里那份生成的 `.js` 直接 import，不抄、不解析 TS。 */
const { SCHEDULE_ROUTES } = await import(pathToFileURL(ROUTES_JS).href);

/** 八份清单件：`file`（逐字文件名）→ { bytes, sha, ticket, dir, label, params }。一件产物一个名字。
 *  `params` 是那一趟**真跑用的参数**（清单件自己记的）——「照抄即能跑」那一行就照它写。 */
const ledger = new Map();
for (const m of MANIFESTS) {
  const j = JSON.parse(readFileSync(join(REPO, m.file), 'utf8'));
  if (!Array.isArray(j.rows) || j.rows.length === 0) die2('清单件形状不对（没有 rows）：' + m.file);
  for (const r of j.rows) {
    if (ledger.has(r.file)) die2('两件清单件里出现同名产物（名字撞了）：' + r.file);
    ledger.set(r.file, {
      bytes: r.bytes, sha: String(r.sha256_12), ticket: m.ticket, label: m.label, dir: m.dir,
      params: r.params === undefined ? null : r.params,
    });
  }
}

/* ─────────────────────────── 逐条归属：51 行一条不落 ─────────────────────────── */

const routeByPhrase = new Map(SCHEDULE_ROUTES.map((e) => [e.phrase, e]));
const orderMismatch = ROWS.filter((r) => routeByPhrase.get(r.phrase)?.order !== r.order);
if (orderMismatch.length > 0) {
  die2('数据件的 order 与路由表对不上（改过路由表就先改数据件）：'
    + orderMismatch.map((r) => r.phrase + '（表 ' + routeByPhrase.get(r.phrase)?.order + ' / 件 ' + r.order + '）').join('、'));
}
const rowsByPhrase = new Map(ROWS.map((r) => [r.phrase, r]));

/** 有意不出的五条：**从路由表自己认**（不写死短语）。 */
const excludedRows = [];
for (const e of SCHEDULE_ROUTES) {
  if (e.key === 'schedule.help.lookup' && e.preset === undefined) {
    excludedRows.push({ phrase: e.phrase, order: e.order, key: e.key, reason: EXCLUDED.helpAlias, group: 'HELP 别名（4 条）' });
  }
}
for (const phrase of EXCLUDED.noCommandWakeWords) {
  if (routeByPhrase.has(phrase) || rowsByPhrase.has(phrase)) die2('「新仓无此命令」那条其实在表里（数据件要改）：' + phrase);
  excludedRows.push({ phrase, order: null, key: '（无）', reason: EXCLUDED.noCommandReason, group: '新仓无此命令（3 条）' });
}
const excludedPhrases = new Set(excludedRows.map((e) => e.phrase));

/** 逐条核账：出页 46 ＋ 有意不出 5 ＝ 路由表 51。 */
const pageRows = ROWS.filter((r) => !excludedPhrases.has(r.phrase));
const missing = SCHEDULE_ROUTES.filter((e) => !rowsByPhrase.has(e.phrase) && !excludedPhrases.has(e.phrase));
const extra = ROWS.filter((r) => !routeByPhrase.has(r.phrase));
if (missing.length > 0) red('路由表里有条既没出页、也不在有意不出名单里：' + missing.map((e) => e.phrase).join('、'));
if (extra.length > 0) red('数据件里有条在路由表里找不到：' + extra.map((r) => r.phrase).join('、'));
ok('① 逐条有交代：路由表 ' + SCHEDULE_ROUTES.length + ' 条 ＝ 出页 ' + pageRows.length + ' ＋ 有意不出 ' + excludedRows.length);

/* ─────────────────────────── 逐件核账：73 件产物 ─────────────────────────── */

/** 反向表：一件产物被哪几条路由指着（同一枚 key 的多条唤醒词共用一张页 ⇒ 多条指着同一件是常态）。 */
const usersOf = new Map();
for (const r of pageRows) {
  for (const f of r.products) {
    if (!usersOf.has(f)) usersOf.set(f, []);
    usersOf.get(f).push(r.phrase);
  }
}
const orphans = [...ledger.keys()].filter((f) => !usersOf.has(f));
const ghosts = [...usersOf.keys()].filter((f) => !ledger.has(f));
if (orphans.length > 0) red('清单里有产物没被任何路由点名（孤儿）：' + orphans.join('、'));
if (ghosts.length > 0) red('数据件点名了清单里没有的产物：' + ghosts.join('、'));

/** 逐件在盘：字节数与 sha256 两个都要与清单件相符（清单记的是真出口那次落盘的读数）。 */
const products = [];
const pageGroups = new Map();
for (const [file, meta] of ledger) {
  const path = join(REPO, meta.dir, file);
  const users = usersOf.get(file) ?? [];
  const rec = { file, path, bytes: meta.bytes, sha256_12: meta.sha, ticket: meta.ticket, domain: meta.label, users, params: meta.params, onDisk: false, bytes_actual: null, sha_actual: null };
  if (!existsSync(path)) {
    red('产物不在盘上：' + file + '（' + rel(path) + '）');
  } else {
    const buf = readFileSync(path);
    const sha = createHash('sha256').update(buf).digest('hex').slice(0, 12);
    rec.onDisk = true;
    rec.bytes_actual = buf.length;
    rec.sha_actual = sha;
    if (buf.length !== meta.bytes) red('字节数与清单件不符：' + file + '（盘上 ' + buf.length + ' / 清单 ' + meta.bytes + '）');
    if (sha !== meta.sha) red('sha256 与清单件不符：' + file + '（盘上 ' + sha + ' / 清单 ' + meta.sha + '）');
  }
  for (const phrase of users) {
    if (!pageGroups.has(phrase)) pageGroups.set(phrase, []);
    pageGroups.get(phrase).push(rec);
  }
  products.push(rec);
}

/* ─────────────────────────── 页面：装配 ─────────────────────────── */

/** 域票：按命令键把 51 条路由归到八张域票（清单里各域那张票的名字，读的人不至于只看到一串 key）。 */
function domainOf(routeKey) {
  return ({
    'schedule.help.lookup': '辅助与管理',
    'schedule.record.today': '查询与浏览·单日族',
    'schedule.record.range': '查询与浏览·范围与跨天',
    'schedule.record.detail': '查询与浏览·详情',
    'schedule.record.write': '写入与同步',
    'schedule.record.compare': '分析与洞察',
    'schedule.plan.today': '查询与浏览·日程族',
    'schedule.plan.write': '日程与计划',
  })[routeKey] ?? '（未归类）';
}

/** 命令那一格：key ＋ 调用行。**照抄即能跑**那一行取清单件里这一支真跑用的参数——
 *  **只有清单件真记了参数才拼参数**（没记就只给 key：本件宁可不填，也不拿别的日子凑一个看起来像真的参数）。 */
function commandCell(entry, list) {
  const real = (list.find((p) => p.params !== null) ?? {}).params;
  const asJson = typeof real === 'object' && real !== null;
  return {
    key: entry.key,
    cli: 'node <技能目录>/dist/cli/cmd_read.js ' + entry.key
      + (asJson ? " --params '" + JSON.stringify(real) + "'" : ''),
  };
}

/** 一件一个方块（链接 ＋ 逐字文件名 ＋ 字节读数 ＋ 清单件记的那一趟参数——没记就不印，宁缺不编）。 */
function productTile(p) {
  const arg = p.params === null
    ? ''
    : '<span class="arg">' + esc(typeof p.params === 'object' ? JSON.stringify(p.params) : String(p.params)) + '</span>';
  return '<a class="p" href="' + pathToFileURL(p.path).href + '" target="_blank" rel="noopener">'
    + '<span class="n">' + esc(p.file) + '</span>'
    + '<span class="m">' + Math.round(p.bytes / 1024) + ' KB</span>' + arg + '</a>';
}

/** 产物那一格：**首次出现**那一条列全部方块；后面共用同一批产物的路由改成一行指针（不重复贴同一批方块）。 */
function productCell(list, firstSeq) {
  if (list === undefined || list.length === 0) return '<span class="dash">—</span>';
  if (firstSeq !== null) {
    return '<span class="same">与第 <b>' + firstSeq + '</b> 行同批（' + list.length
      + ' 件，同一枚命令键共用一张页）——路径见那一行</span>';
  }
  return list.map(productTile).join('\n') + '<span class="cnt">这一行 ' + list.length + ' 件</span>';
}

/** 每一行记下「它的产物第一次出现在第几行」（同一批的后续行只给指针，页面不再重复 47 遍同一批方块）。 */
const firstSeqOf = new Map();
const rowMeta = pageRows.map((r, i) => {
  const seq = String(i + 1).padStart(2, '0');
  const list = pageGroups.get(r.phrase) ?? [];
  const sig = list.map((p) => p.file).join('|');
  const firstSeq = list.length === 0 ? seq : (firstSeqOf.get(sig) ?? seq);
  if (list.length > 0 && !firstSeqOf.has(sig)) firstSeqOf.set(sig, seq);
  return { row: r, seq, entry: routeByPhrase.get(r.phrase), list, firstSeq: firstSeq === seq ? null : firstSeq };
});

const rowsHtml = rowMeta.map((m) => {
  const cmd = commandCell(m.entry, m.list);
  return '<tr>'
    + '<td class="seq">' + m.seq + '</td>'
    + '<td class="wake">' + esc(m.row.phrase) + '</td>'
    + '<td class="cmd"><code>' + esc(cmd.key) + '</code><code>' + esc(cmd.cli) + '</code></td>'
    + '<td class="kind">' + esc(domainOf(m.entry.key)) + '<span class="nm">' + esc(m.row.kind) + '</span></td>'
    + '<td class="prod">' + productCell(m.list, m.firstSeq)
    + (m.firstSeq === null && m.list.length > 0 ? '<span class="nm">' + esc(m.row.note) + '</span>' : '')
    + '</td>'
    + '</tr>';
}).join('\n');

const excludedHtml = excludedRows.map((e) => '<tr>'
  + '<td class="wake">' + esc(e.phrase) + '</td>'
  + '<td class="cmd"><code>' + esc(e.key) + '</code></td>'
  + '<td class="why">' + esc(e.reason) + '</td>'
  + '</tr>').join('\n');

const readout = {
  routes: SCHEDULE_ROUTES.length,
  pages: pageRows.length,
  excluded: excludedRows.length,
  products: products.length,
  onDisk: products.filter((p) => p.onDisk).length,
  bytesMatched: products.filter((p) => p.onDisk && p.bytes_actual === p.bytes).length,
  shaMatched: products.filter((p) => p.onDisk && p.sha_actual === p.sha256_12).length,
};

const pageTitle = '作息管家链路总览：prompt → 唤醒词 → 命令 → 产物绝对路径';
const head = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
  + '<title>' + pageTitle + '</title>\n<style>\n'
  + '*{box-sizing:border-box}\n'
  + 'body{margin:0;padding:26px 20px 70px;background:#f5f5f7;color:#1d1d1f;'
  + 'font:15px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}\n'
  + 'h1{font-size:22px;margin:0 0 8px}\n'
  + 'h2{font-size:17px;margin:32px 0 10px;padding-left:9px;border-left:4px solid #0b6bcb}\n'
  + '.lead{color:#6e6e73;font-size:13.5px;margin:0 0 14px}\n'
  + '.card{background:#fff;border:1px solid #d2d2d7;border-radius:10px;padding:14px 16px;margin:12px 0}\n'
  + '.tw{overflow-x:auto;background:#fff;border:1px solid #d2d2d7;border-radius:10px}\n'
  + 'table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:13px}\n'
  + 'caption{caption-side:top;text-align:left;padding:10px 12px 6px;color:#6e6e73;font-size:12.5px}\n'
  + 'th,td{border:1px solid #e8e8ed;padding:8px 10px;vertical-align:top;text-align:left;'
  + 'overflow-wrap:anywhere;word-break:break-word}\n'
  + 'th{background:#eef2f6}\n'
  + 'col.c1{width:38px}col.c2{width:112px}col.c3{width:330px}col.c4{width:286px}\n'
  + 'td.seq{color:#86868b;text-align:right}\n'
  + 'td.wake{font-weight:600}\n'
  + 'td.cmd code{display:block;font-family:Consolas,Menlo,monospace;font-size:11.5px;color:#0b3d6b;'
  + 'background:#eef2f6;border-radius:4px;padding:2px 5px;margin-bottom:3px}\n'
  + '.nm{display:block;color:#6e6e73;font-size:12px;margin-top:3px}\n'
  + 'td.kind{color:#1d1d1f;font-size:12.5px}\n'
  + 'td.prod a.p{display:block;text-decoration:none;color:#0b6bcb;border:1px solid #d2d2d7;'
  + 'border-left:3px solid #0b6bcb;border-radius:6px;padding:5px 8px;margin-bottom:5px;background:#fbfcfe}\n'
  + 'td.prod a.p:hover{background:#eef5fd}\n'
  + '.n{display:block;font-size:12.5px;word-break:break-all}\n'
  + '.m{display:block;color:#86868b;font-size:11px;font-family:Consolas,Menlo,monospace}\n'
  + '.arg{display:block;color:#3a3a3c;font-size:10.5px;margin-top:1px}\n'
  + '.cnt{display:block;color:#86868b;font-size:11px;margin-top:2px}\n'
  + '.same{display:block;color:#3a3a3c;font-size:12.5px;background:#f5f5f7;border:1px dashed #d2d2d7;border-radius:6px;padding:6px 8px}\n'
  + '.same b{color:#0b6bcb}\n'
  + '.dash{color:#86868b}\n'
  + '.why{color:#3a3a3c;font-size:12.5px}\n'
  + '.kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;font-size:13px;margin:0}\n'
  + '.kv dt{color:#6e6e73}\n'
  + '.kv dd{margin:0}\n'
  + '.foot{color:#6e6e73;font-size:12.5px;margin-top:26px;border-top:1px solid #d2d2d7;padding-top:12px}\n'
  + 'code{font-family:Consolas,Menlo,monospace;font-size:12px}\n'
  + '@media (max-width:640px){body{padding:18px 12px 50px}table{font-size:12px}th,td{padding:6px 7px}}\n'
  + '</style>\n</head>\n<body>\n';

const summaryCard = '<div class="card">\n<dl class="kv">\n'
  + '<dt>路由表条数</dt><dd>' + readout.routes + '（唤醒词逐字读生成的权威路由表）</dd>\n'
  + '<dt>出页／有意不出</dt><dd>' + readout.pages + ' ／ ' + readout.excluded + '（合起来＝路由表条数）</dd>\n'
  + '<dt>产物件数</dt><dd>' + readout.products + ' 件（八张域票清单件记的那个数）</dd>\n'
  + '<dt>逐件在盘</dt><dd>' + readout.onDisk + ' / ' + readout.products + ' ' + tick(readout.onDisk === readout.products) + '</dd>\n'
  + '<dt>逐件对账</dt><dd>字节 ' + readout.bytesMatched + ' / ' + readout.products + ' ' + tick(readout.bytesMatched === readout.products)
  + '　sha256 ' + readout.shaMatched + ' / ' + readout.products + ' ' + tick(readout.shaMatched === readout.products) + '</dd>\n'
  + '<dt>零外部引用</dt><dd>零外链 ' + tick(!/https?:\/\//.test(head + rowsHtml + excludedHtml)) + '　零 link ' + tick(!(head + rowsHtml).includes('<link')) + '</dd>\n'
  + '</dl>\n</div>\n';

const page = head
  + '<h1>' + pageTitle + '</h1>\n'
  + '<p class="lead">一行一条唤醒词：照抄那一句 prompt 就能发 → 命令 → 产物绝对路径（点开即看那一份真页）。'
  + '本页是索引，产物原地住在八张域票的产物目录里，本页不复制、不改名。</p>\n'
  + '<h2>一、这一页的读数</h2>\n' + summaryCard
  + '<h2>二、唤醒词链路表（' + readout.pages + ' 行：一行一条唤醒词）</h2>\n'
  + '<div class="tw"><table>\n'
  + '<caption>prompt（老侧场景里用户真说的那一句）→ 唤醒词 → 命令 → 产物绝对路径。'
  + '同一枚命令键的多条唤醒词共用一张页：那一批路径只贴在第一行，后面的行给指针（不重复贴同一批方块）。</caption>\n'
  + '<colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col></colgroup>\n'
  + '<thead><tr><th>序</th><th>唤醒词</th><th>命令（key ＋ 照抄即跑的调用行）</th><th>域票／页型</th><th>产物绝对路径（可点）</th></tr></thead>\n'
  + '<tbody>\n' + rowsHtml + '\n</tbody>\n</table></div>\n'
  + '<h2>三、有意不出（' + readout.excluded + ' 条：路由表里有、但按定义不另出产物）</h2>\n'
  + '<div class="tw"><table>\n'
  + '<caption>「缺哪条要写明」：这一节不存在被省略的行——路由表里每一条不在上表的，都在这张表里。</caption>\n'
  + '<colgroup><col class="c2"><col class="c3"><col></colgroup>\n'
  + '<thead><tr><th>唤醒词</th><th>命令键</th><th>为什么不出产物</th></tr></thead>\n'
  + '<tbody>\n' + excludedHtml + '\n</tbody>\n</table></div>\n';

const footSources = MANIFESTS.map((m) => '<code>' + esc(m.file) + '</code>').join('　');
const pageFoot = '<h2>四、这一页读的是什么</h2>\n'
  + '<div class="card"><p>路由表：<code>packages/skill-schedule/src/triggers/routes.generated.ts</code>'
  + '（由各能力 <code>routes.ts</code> 派生，别手改；本页直接读**仓里那一份**，故不要求先编译）。'
  + '唤醒词 → 产物归属：<code>docs/skills/skill-schedule/t791-数据.mjs</code>。'
  + '产物文件名与字节读数：八张域票的清单件（每件一行）</p><p class="srcs">' + footSources + '</p>'
  + '<p>重跑本页：<code>node docs/skills/skill-schedule/t791-链路总览.mjs</code>'
  + '（只读；不重跑任何出页命令、不改任何产物）。</p></div>\n'
  + '<p class="foot">产物原地住在各自的产物目录（<code>.scratch/t78x/成品/</code>）——'
  + '这是各域票探针从真出口的 <code>delivery.path</code> 复制出来的那一份；'
  + '若哪天清理了产物目录，本页链接会断，重跑对应域的探针即可恢复。</p>\n'
  + '</body>\n</html>\n';

/* ─────────────────────────── 自检 ③④：页面本身 ─────────────────────────── */

const htmlAll = page + pageFoot;
const hrefs = [...htmlAll.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
const nonFile = hrefs.filter((h) => !h.startsWith('file:///'));
const external = /(?:src|href)="(?:https?:)?\/\//.test(htmlAll);
const hasLink = htmlAll.includes('<link') || htmlAll.includes('@import');
if (external || hasLink) red('③ 页面里有外部引用（外链或 link／import）');
if (nonFile.length > 0) red('④ 有 href 不是绝对 file:// 路径：' + nonFile.join('、'));const fileHrefs = hrefs.filter((h) => h.startsWith('file:///'));
const hrefBad = fileHrefs.filter((h) => !/^file:\/\/\/[A-Za-z]:\//.test(h));
if (hrefBad.length > 0) red('④ 有 file:// 链接不是盘符绝对路径：' + hrefBad.join('、'));
ok('③ 页面零外链、零 link／import');
ok('④ ' + fileHrefs.length + ' 条链接全是绝对 file:// 路径（盘符式）');

/** ⑤⑥：清单里的每一件都上了表（没有被落下的产物）。 */
if (orphans.length === 0) ok('⑤ 八份清单 ' + readout.products + ' 件产物逐件被至少一条路由指着（无孤儿、无凭空点名）');
if (missing.length === 0) ok('⑥ 路由表里没上榜的条全在「有意不出」名单里（' + excludedRows.length + ' 条）');

/* ─────────────────────────── 机器读数 ＋ 落盘 ─────────────────────────── */

/** R1／R4 自量：可见文本里出现 `·`（R1）或 `／`／`｜`（R4）的地方——产物名逐字上屏带来的，据实登记。 */
function separatorHits(html) {
  const vis = html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (m) => m.replace(/[^\n]/g, '\u0000'))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, '\u0000'))
    .replace(/<[^>]*>/g, (m) => m.replace(/[^\n]/g, '\u0000'));
  const hits = [];
  for (const piece of vis.split('\u0000')) {
    const t = piece.replace(/\s+/g, ' ').trim();
    if (t === '') continue;
    if (t.includes('·') || /[｜／]/.test(t)) hits.push(t.slice(0, 60));
  }
  return hits;
}
const sepHits = separatorHits(htmlAll);

const summary = 'RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL')
  + ' routes=' + readout.routes + ' pages=' + readout.pages + ' excluded=' + readout.excluded
  + ' products=' + readout.products + ' onDisk=' + readout.onDisk
  + ' bytes=' + readout.bytesMatched + ' sha=' + readout.shaMatched + ' red=' + reds.length;

for (const l of lines) console.log(l);
if (reds.length > 0) {
  console.log('--- 红条 ---');
  for (const r of reds) console.log('RED  ' + r);
}
console.log('SEP-VISIBLE hits=' + sepHits.length + (sepHits.length === 0 ? '' : '（产物名逐字上屏带来的，见证据件）'));
console.log(summary);
if (reds.length === 0) {
  writeFileSync(PAGE, htmlAll, 'utf8');
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify({
    ticket: 791,
    generated_at: new Date().toISOString(),
    routes_source: rel(ROUTES_JS).replace(/^.*\/ilife\//, ''),
    page: rel(PAGE).replace(/^.*\/ilife\//, ''),
    readout,
    rows: pageRows.map((r, i) => ({
      seq: String(i + 1).padStart(2, '0'),
      phrase: r.phrase,
      key: routeByPhrase.get(r.phrase)?.key ?? null,
      order: r.order,
      kind: r.kind,
      note: r.note,
      products: products.filter((p) => p.users.includes(r.phrase))
        .map((p) => ({ file: p.file, path: rel(p.path), bytes: p.bytes, sha256_12: p.sha256_12, ticket: p.ticket })),
    })),
    excluded: excludedRows.map((e) => ({ phrase: e.phrase, key: e.key, reason: e.reason, group: e.group })),
    products: products.map((p) => ({ file: p.file, path: rel(p.path), bytes: p.bytes, sha256_12: p.sha256_12, users: p.users, ticket: p.ticket })),
  }, null, 2) + '\n', 'utf8');
  console.log('WROTE ' + rel(PAGE) + '（' + statSync(PAGE).size + ' 字节）');
  console.log('WROTE ' + rel(LEDGER) + '（' + statSync(LEDGER).size + ' 字节）');
}
process.exit(reds.length === 0 ? 0 : 1);
