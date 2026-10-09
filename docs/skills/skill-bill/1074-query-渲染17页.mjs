/** #1074 执行席 · 查询域 17 页「真跑产物」生成 ＋ 冻结原型同目录副本（只写 .scratch/1074-query/ 与 $env:TEMP\tick-1074）。
 *
 * 拆三件事：
 *   ① 样本：隔离家目录 $env:TEMP\tick-1074，仓内 #729 合成记账库夹具（test/helpers/bill-seed.mjs SEED_RECORDS 39 条）
 *      ＋ 本票只加 1 条「今天」（2026-06-14 12:00:00 餐饮/外卖 -68 支付宝 生活 「今天午饭」）——夹具的「今天」
 *      是 2026-06-14 而 SEED_RECORDS 最后一条落在 06-13，不加这条则 w01 查今天零行（会回落老列表页）。
 *      夹具「今天」用 freezeClock(SEED_TODAY) 钉住子进程时钟。
 *   ② 真跑：spawn dist/cli/cmd_read.js 的 17 条命令，逐页落 <id>-真跑.html；冻结原型按 proto/manifest.json
 *      domain=query 登记 sha256 逐件核对后，逐字节副本落 <id>-原型.html（同目录，iframe 相对路径落得到）。
 *   ③ 机检：逐页读产物，按**页族**分判（本域当刻两种页族）——
 *      ticket（票据纸 16 页）：8 主块位 ilife-page-ui／ilife-bill-sheet-page／ilife-skin-ticket／ilife-block-sheet／
 *        ilife-sheet-title／ilife-block-summary-head／ilife-block-ledger-rows／ilife-ticket-rule；
 *        页内导航 0 个；页脚位（可见文本「饼干记账 · <唤醒词>」）≥1；来源脚注**不上屏**（据实 0，另记）。
 *      list（回落老列表页 1 页 w00）：8 主块位 ilife-page-ui／ilife-block-page-shell／ilife-block-kpi-card／
 *        ilife-block-conclusion／ilife-block-copy-block／ilife-block-caliber／ilife-block-chip／ilife-block-empty-block；
 *        页内导航恰 1 个；来源脚注「数据来源」≥1。
 *      两族共判：无 undefined／NaN／loading=lazy、引用目录外资源 0、整页、envelope 字节与盘上一致。
 *      另记**据实读数**（不下判定）：占比 SCALE（ilife-block-dist-row）／明细 DETAIL（ilife-ticket-entries）／
 *      复制区（ilife-block-copy-block）／对账 CHECK（可见文本含 CHECK）／✂ 裁切线文本各行是否在位。
 *
 * 用法：node .scratch/1074-query/run-1074.mjs
 * 红线：只读 src/dist/原型，只写本票自己的目录；不改任何 packages/ 代码、不改原型、不重建 dist（W2 规则三）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_RECORDS, SEED_TODAY, seedBillDb } from '../../../packages/skill-bill/test/helpers/bill-seed.mjs';
import { billEnv, freezeClock } from '../../../packages/skill-bill/test/helpers/config-base.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const outArg = argv.indexOf('--out');
const OUT = resolve(ROOT, outArg >= 0 && argv[outArg + 1] !== undefined ? argv[outArg + 1] : '.scratch/1074-query');
const HOME_DIR = join(tmpdir(), 'tick-1074');
const BIN = join(ROOT, 'packages', 'skill-bill', 'dist', 'cli', 'cmd_read.js');
const PROTO_MANIFEST = join(ROOT, 'docs', 'skills', 'skill-bill', 'proto', 'manifest.json');

/** 本票唯一的样本增量：给夹具补一条「今天」的记录（理由见件头 ①）。 */
const TODAY_ROW = ['2026-06-14 12:00:00', '餐饮/外卖', -68, '支付宝', '生活', '今天午饭'];
const RECORDS = [...SEED_RECORDS, TODAY_ROW];

const BASE_TICKET = '查询域票据纸八部位：纸头「饼干记账 · 词」／H2 笔数与支出／主数字唯一＋结论句进小字／落点 LEDGER／占比 SCALE／明细 DETAIL／对账 CHECK／✂ 裁切线／页脚只有场景名（页内导航 0 个、来源脚注不上屏＝本页型据实读数）';
const BASE_LIST = '回落老列表页（零行才走这一支）：页面壳＋块位族＋KPI 卡＋结论块＋分类聚合＋空态直写＋来源脚注「数据来源 记账库（只读）」＋页内导航 1 个';

/** 17 页：序号 ／ 页号 ／ 唤醒词 ／ 命令键 ／ 参数 ／ 页族 ／ 这一格该确认什么。 */
const PAGES = [
  // w00 页族更新（#1121 提交 b6e6d5e9：零行不再回落老列表页，改出票据纸空态；Lead 2026-10-04 口令已确认 根div=1／裁切线=1／旧壳=0）
  [1, 'w00', '查某天', 'bill.record.today', { date: '2026-06-04' }, 'ticket',
    '空态那一格（原型的 w00 空态纸）：这一天没有记录、空态直写＋下一步提示、主数字 0 笔、明细区写「本窗没有记录」那一支。#1121（提交 b6e6d5e9）后零行**出票据纸空态**（不再回落老列表页）：读数 根div=1／✂ 裁切线=1／旧壳=0（`1081-页族总检 --only w00` 佐证），与判地同族。' + BASE_TICKET],
  [2, 'w01', '查今天', 'bill.record.today', {}, 'ticket',
    '2026-06-14 这一天（1 笔 午饭 −68.00）：H2「今天共 N 笔，支出 X 元」、别名句「查账单和查今天是一样的。」、对账分隔（#1110 记录：实现半角 / 、原型全角 ／，判据归负责人）。' + BASE_TICKET],
  [3, 'w02', '查昨天', 'bill.record.today', { date: 'yesterday' }, 'ticket',
    '昨天＝2026-06-13（1 笔 周末外卖 −76.00）：与查今天同款版式，H2 换「昨天 N 笔」；空态四句与票据纸两支的边界一眼可辨。' + BASE_TICKET],
  [4, 'w03', '查某天', 'bill.record.today', { date: '2026-05-15' }, 'ticket',
    '指定某天 2026-05-15（1 笔 五月水电 −186.40）：副题写具体日期、H2 无「今天／昨天」前缀。' + BASE_TICKET],
  [5, 'w04', '查最近', 'bill.record.today', { recent: true, limit: 10 }, 'ticket',
    '最近 10 笔按时间倒序：H2「最近 N 笔，支出 X 元」、副题「最近 10 笔（按时间倒序）」、无时间窗走「不限」位。' + BASE_TICKET],
  [6, 'w06', '查周', 'bill.record.range', { range: 'week', today: '2026-06-14' }, 'ticket',
    '本周 2026-06-08 ~ 2026-06-14（5 笔，截到锚点）：H2「本周共 N 笔」；#1110 笔数注记（本样本窗口无转账 ⇒ 两处均无注记）。' + BASE_TICKET],
  [7, 'w07', '查月', 'bill.record.range', { range: 'month', today: '2026-06-14' }, 'ticket',
    '本月 2026-06-01 ~ 2026-06-14（7 笔）：与查周同款版式，只有窗口与 H2 字面不同。' + BASE_TICKET],
  [8, 'w08', '查区间', 'bill.record.range', { start: '2026-05-01', end: '2026-05-31' }, 'ticket',
    '自定义区间 2026-05-01 ~ 2026-05-31：H2 用「区间共 N 笔」、日期只在副题出现一处。' + BASE_TICKET],
  [9, 'w09', '查分类', 'bill.record.range', { category: '餐饮' }, 'ticket',
    '分类＝餐饮（全部时间）：H2「餐饮共记 N 笔，支出 X 元」（#1110 句式）、占比芯片「占全部支出的 N%」与占比条口径一致。' + BASE_TICKET],
  [10, 'w10', '查账户', 'bill.record.range', { account: '支付宝' }, 'ticket',
    '账户＝支付宝（全部时间）：H2「支付宝共 N 笔，支出 X 元」；转账不计收支的 KPI 口径；#1110 注记（本样本该窗口 K=0）。' + BASE_TICKET],
  [11, 'w11', '查账本', 'bill.record.range', { ledger: '旅行' }, 'ticket',
    '账本＝旅行（全部时间，3 笔）：账本＝转账那一页的口径（#1110 §3.4）；落点行只留一数一处。' + BASE_TICKET],
  [12, 'w12', '搜备注', 'bill.record.search', { q: '午饭' }, 'ticket',
    '备注含「午饭」（9 笔）：H2「备注含「午饭」共 N 笔，支出 X 元」、副题写命中词；搜的是备注不是分类。' + BASE_TICKET],
  [13, 'w13', '查标签', 'bill.record.search', { kind: 'tag', tag: '未还' }, 'ticket',
    '标签「未还」精确匹配（2 笔：借贷/借出 −2000 ＋ 借贷/借入 +1500）：#tag 精确不是关键词模糊搜；两笔一负一正都要上榜。' + BASE_TICKET],
  [14, 'w14', '查欠款', 'bill.record.search', { kind: 'debt' }, 'ticket',
    '未还的账（2 笔）：已还那两笔必须排除；明细逐行备注带 #借出／#借入；明细逐槽独立、缺槽不留空位。' + BASE_TICKET],
  [15, 'w15', '查待报销', 'bill.record.search', { kind: 'reimburse' }, 'ticket',
    '#待报销（1 笔 05-06 差旅 −760）：#报销到账 那笔必须排除；H2 写「等报销 N 笔」。' + BASE_TICKET],
  [16, 'w16', '查分期', 'bill.record.search', { kind: 'installment' }, 'ticket',
    '#分期（3 笔：04-10／05-10／06-10 手机 第1~3期/12）：分类与 #分期 两串并存都算；明细逐槽独立、缺槽不留空位。' + BASE_TICKET],
  [17, 'w17', '账单详情', 'bill.record.detail', { id: 8 }, 'ticket',
    'id=8（借贷/借出 −2000，#借出 #借给张三 #未还）：单记录页字段表逐列交代（含写入／已撤销两列）、对账「编号 8 / 写入 … / 异常：无」；不冒充正常。' + BASE_TICKET],
].map(([seq, id, wake, key, params, family, check]) => ({ seq, id, wake, key, params, family, check }));

/** 判地原型：proto/manifest.json 的 domain=query 17 件（w05 查账单已并入 w01，不单独出纸）。 */
const PROTO_REL = {
  w00: 'query/w00-空态-查某天无记录-v2.1.html',
  w01: 'query/w01-查今天-v2.1.html',
  w02: 'query/w02-查昨天-v2.1.html',
  w03: 'query/w03-查某天-v2.1.html',
  w04: 'query/w04-查最近-v2.1.html',
  w06: 'query/w06-查周-v2.1.html',
  w07: 'query/w07-查月-v2.1.html',
  w08: 'query/w08-查区间-v2.1.html',
  // 第 09 格判地 = 负责人已批已落地的 v2.2 件（Lead 2026-10-03 裁决；v2.1 是同页旧版、#1081 起不再计行）
  w09: 'w09/w09-查分类-v2.2.html',
  w10: 'query/w10-查账户-v2.1.html',
  w11: 'query/w11-查账本-v2.1.html',
  w12: 'query/w12-搜备注-v2.1.html',
  w13: 'query/w13-查标签-v2.1.html',
  w14: 'query/w14-查欠款-v2.1.html',
  w15: 'query/w15-查待报销-v2.1.html',
  w16: 'query/w16-查分期-v2.1.html',
  w17: 'query/w17-查账单详情-v2.1.html',
};

/** 页族块位（主位 8 个，逐条取自共用家具实际产出的类名）。 */
const TICKET_BLOCKS = ['ilife-page-ui', 'ilife-bill-sheet-page', 'ilife-skin-ticket', 'ilife-block-sheet', 'ilife-sheet-title', 'ilife-block-summary-head', 'ilife-block-ledger-rows', 'ilife-ticket-rule'];
const LIST_BLOCKS = ['ilife-page-ui', 'ilife-block-page-shell', 'ilife-block-kpi-card', 'ilife-block-conclusion', 'ilife-block-copy-block', 'ilife-block-caliber', 'ilife-block-chip', 'ilife-block-empty-block'];
const FAMILY = { ticket: { blocks: TICKET_BLOCKS, nav: 0 }, list: { blocks: LIST_BLOCKS, nav: 1 } };
/** 据实读数位（不下判定）：占比 SCALE／明细 DETAIL／复制区／对账 CHECK 文本。 */
const EXTRA_MARKERS = ['ilife-block-dist-row', 'ilife-ticket-entries', 'ilife-block-copy-block'];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const classesOf = (html) => {
  const vis = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  return new Set([...vis.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean));
};
const visibleText = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ');
const countOf = (s, n) => s.split(n).length - 1;
const countClass = (html, cls) => (html.match(new RegExp('class="[^"]*\\b' + cls + '\\b', 'g')) || []).length;

// ── ① 样本：隔离家目录 ＋ 仓内夹具（＋本票那 1 条）
rmSync(HOME_DIR, { recursive: true, force: true });
mkdirSync(join(HOME_DIR, '.ilife'), { recursive: true });
const env = billEnv(HOME_DIR, freezeClock(SEED_TODAY));
const dbPath = seedBillDb(HOME_DIR, RECORDS);
const fixtureSha = sha256(readFileSync(dbPath));

// ── ② 冻结原型：proto/manifest.json domain=query 17 件，逐件核 sha256
const protoMan = JSON.parse(readFileSync(PROTO_MANIFEST, 'utf8'));
const protoItems = (protoMan.items ?? []).filter((it) => it.domain === 'query' && it.kind === 'proto');
if (protoItems.length !== 17) throw new Error('冻结原型 query 应为 17 件，实得 ' + String(protoItems.length));
/** 判地查找面＝全部 proto 件（第 09 格用的是 domain=w09 的 v2.2 件，不在这 17 件里）。 */
const protoByRel = new Map((protoMan.items ?? []).map((it) => [it.rel, it]));

mkdirSync(OUT, { recursive: true });
for (const p of PAGES) {
  for (const n of [p.id + '-真跑.html', p.id + '-原型.html']) rmSync(join(OUT, n), { force: true });
}
for (const n of ['manifest.json', '样本集.json', 'run-1074.log']) rmSync(join(OUT, n), { force: true });

const rows = [];
const log = [];
for (const p of PAGES) {
  const rel = PROTO_REL[p.id];
  const reg = protoByRel.get(rel);
  if (!reg) throw new Error('proto/manifest.json 里没有登记 ' + rel);
  const protoSrc = join(ROOT, reg.file);
  const buf = readFileSync(protoSrc);
  const got = sha256(buf);
  if (got !== reg.sha256) throw new Error('冻结原型 sha256 不符：' + reg.file + ' got=' + got);
  const protoCopy = p.id + '-原型.html';
  copyFileSync(protoSrc, join(OUT, protoCopy));

  const prodName = p.id + '-真跑.html';
  const prodPath = join(OUT, prodName);
  const r = spawnSync(process.execPath, [BIN, p.key, '--params', JSON.stringify(p.params), '--html', prodPath], { cwd: ROOT, encoding: 'utf8', env });
  const last = String(r.stdout ?? '').trim().split(/\r?\n/).filter(Boolean).pop() ?? '';
  let json = null;
  try { json = JSON.parse(last); } catch { /* 非 envelope，下面按红记 */ }
  const exists = existsSync(prodPath);
  const bytes = exists ? statSync(prodPath).size : 0;
  const html = exists ? readFileSync(prodPath, 'utf8') : '';
  const problems = [];
  if (r.status !== 0) problems.push('exit=' + String(r.status) + ' stderr=' + String(r.stderr ?? '').slice(-200));
  if (!exists) problems.push('未落盘');
  if (exists && !/<!doctype html>/i.test(html)) problems.push('非整页');
  if (exists && json && json.delivery && json.delivery.bytes !== bytes) problems.push('字节不符 envelope=' + String(json.delivery.bytes) + ' 盘上=' + String(bytes));
  if (exists && !/ilife-page-ui/.test(html)) problems.push('非页面壳（ilife-page-ui 不在）');

  const fam = FAMILY[p.family];
  const cls = exists ? classesOf(html) : new Set();
  const vis = exists ? visibleText(html) : '';
  const missingBlocks = fam.blocks.filter((c) => !cls.has(c));
  const navCount = exists ? countClass(html, 'ilife-block-toc') : 0;
  const srcCount = exists ? countOf(vis, '数据来源') : 0;
  const footText = exists ? (vis.split(/\s+/).join(' ').includes('饼干记账 · ' + p.wake) ? 1 : 0) : 0;
  const lazyCount = exists ? countOf(html, 'loading="lazy"') : 0;
  const undefCount = exists ? countOf(vis, 'undefined') : 0;
  const nanCount = exists ? countOf(vis, 'NaN') : 0;
  const ext = exists ? [...html.matchAll(/(?:src|href)="(?!#|data:|https?:|\/\/)([^"]+)"/g)].map((m) => m[1]) : [];
  const extras = {};
  for (const m of EXTRA_MARKERS) extras[m] = cls.has(m);
  const checkText = exists ? countOf(vis, 'CHECK') : 0;
  const cutText = exists ? countOf(vis, '✂ 裁切线') : 0;

  if (missingBlocks.length) problems.push('缺块位：' + missingBlocks.join('、'));
  if (navCount !== fam.nav) problems.push('页内导航 ' + String(navCount) + ' 个（' + p.family + ' 页应为 ' + String(fam.nav) + ' 个）');
  if (p.family === 'list' && srcCount < 1) problems.push('无来源脚注');
  if (p.family === 'ticket' && footText < 1) problems.push('无页脚（饼干记账 · ' + p.wake + '）');
  if (lazyCount > 0) problems.push('出现 loading=lazy ' + String(lazyCount) + ' 处');
  if (undefCount > 0) problems.push('可见文本出现 undefined ' + String(undefCount) + ' 处');
  if (nanCount > 0) problems.push('可见文本出现 NaN ' + String(nanCount) + ' 处');
  if (ext.length > 0) problems.push('引用目录外资源 ' + String(ext.length) + ' 处：' + ext.join(','));

  rows.push({
    seq: p.seq, id: p.id, wake: p.wake, key: p.key, params: p.params, family: p.family,
    file: prodName, proto: protoCopy, protoSrc: reg.file, protoSha256: reg.sha256,
    check: p.check, window: p.key + ' ' + JSON.stringify(p.params),
    exit: r.status, bytes, envelopeBytes: json?.delivery?.bytes ?? null,
    blocksIn: [...cls].filter((c) => c.startsWith('ilife-')).sort(),
    blocksExpected: fam.blocks, blocksMissing: missingBlocks,
    navCount, navExpected: fam.nav, srcCount, footText,
    lazyCount, undefCount, nanCount, externalRefs: ext,
    extras, checkText, cutText,
    problems,
  });
  log.push('PAGE ' + p.id + ' ' + p.wake + ' family=' + p.family + ' key=' + p.key + ' exit=' + String(r.status)
    + ' bytes=' + String(bytes) + ' proto=' + rel + ' protoSha=' + reg.sha256.slice(0, 12)
    + ' 块位缺=' + String(missingBlocks.length) + ' nav=' + String(navCount) + '/' + String(fam.nav)
    + ' src=' + String(srcCount) + ' 页脚=' + String(footText) + ' SCALE=' + String(extras['ilife-block-dist-row'])
    + ' DETAIL=' + String(extras['ilife-ticket-entries']) + ' 复制区=' + String(extras['ilife-block-copy-block'])
    + ' CHECK=' + String(checkText) + ' 裁切线=' + String(cutText)
    + ' extRefs=' + String(ext.length) + (problems.length ? ' PROBLEMS=' + problems.join(' | ') : ''));
}

const bad = rows.filter((r) => r.problems.length > 0);
const gitHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const gitStatus = spawnSync('git', ['status', '--porcelain', '--', 'packages'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const distHash = sha256(readFileSync(BIN));

const manifest = {
  wall: '1074-query', ticket: 1074, domain: 'query', total: rows.length,
  sample: {
    fixture: 'packages/skill-bill/test/helpers/bill-seed.mjs（#729 合成记账库夹具，只读引用、未改一字）',
    records: RECORDS.length, today: SEED_TODAY, dbSha256: fixtureSha, isolatedHome: HOME_DIR,
    extra: '本票只加 1 条：[2026-06-14 12:00:00, 餐饮/外卖, -68, 支付宝, 生活, 今天午饭]（夹具「今天」2026-06-14 原本零行）',
  },
  snapshot: { gitHead, gitStatusPackages: gitStatus, cmdReadDistSha256: distHash, at: new Date().toISOString() },
  expectations: { ticketBlocks: TICKET_BLOCKS, listBlocks: LIST_BLOCKS, navByFamily: { ticket: 0, list: 1 }, extraMarkers: EXTRA_MARKERS },
  rows,
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
writeFileSync(join(OUT, '样本集.json'), JSON.stringify({
  ticket: 1074, today: SEED_TODAY, fixture: manifest.sample.fixture, extra: manifest.sample.extra,
  records: RECORDS,
  pages: rows.map((r) => ({ seq: r.seq, id: r.id, wake: r.wake, key: r.key, params: r.params, family: r.family })),
}, null, 2), 'utf8');
writeFileSync(join(OUT, 'run-1074.log'), log.join('\n') + '\n', 'utf8');

console.log(log.join('\n'));
console.log('SNAPSHOT gitHead=' + gitHead + ' dist=' + distHash.slice(0, 12) + ' packages 工作区改动行数=' + String(gitStatus ? gitStatus.split('\n').length : 0));
console.log('RESULT: ' + String(rows.length - bad.length) + '/' + String(rows.length) + ' 真跑成功；出问题的页 ' + String(bad.length)
  + (bad.length ? ' -> ' + bad.map((b) => b.id + '(' + b.problems.join(';') + ')').join(' ') : ''));
console.log('OUT: ' + OUT);
process.exit(bad.length === 0 ? 0 : 1);
