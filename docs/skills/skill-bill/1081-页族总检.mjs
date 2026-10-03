#!/usr/bin/env node
/** #1081 判据四 · 95 页真跑**页族总检**（只读 src/dist/原型；只写 .scratch/1081-页族/ 与隔离家目录）。
 *
 * 判据（#1081 票面「判据第四条」原文）：
 *   对 95 页各自的唤醒词在隔离家目录里真跑一遍，逐页断言产物是**票据纸族**
 *   （DOM 出 `<div class="ilife-bill-sheet-page …"` ＋ `✂ 裁切线`），输出 95 行表
 *   （seq／域／唤醒词／命令键／页族／产物路径），**全绿 exit 0；任何一页回落老壳即 exit 1 并点名该 seq**。
 *
 * 页清单唯一来源：`docs/skills/skill-bill/proto/manifest.json` 的 **95 件 kind=proto**。
 *   去重：`query/w09-查分类-v2.1.html`（seq 49）与 `w09/w09-查分类-v2.2.html`（seq 99）
 *   是同一页两版，**只检 v2.2 一次**，v2.1 打 NOTE 不计行 ⇒ 实检 **94 行**。
 *   `query/w00-空态-查某天无记录`（seq 41）单列一行：当刻零行回落老列表页是**已知缺口**，
 *   本器**不白名单、不静默**——它照样红、照样点名，读数里如实记。
 *
 * 夹具（照六个既有 runner，逐域一份隔离家目录 `$env:TEMP\tick-1081\<域>`）：
 *   查询／分析／账户目标＝仓内 #729 合成记账库夹具（`test/helpers/bill-seed.mjs`，只读引用）＋ 钉钟；
 *   写入回执＝本票样本集 `docs/skills/skill-bill/1075-write-样本集.json`（10 条垫位 ＋ 16 页参数）；
 *   SAY 采集＝空库（必需槽位不给才出采集页）；设置速查＝空库（`bill.setup.run` 六个 op ＋ `bill.help.lookup`）。
 *
 * 用法：
 *   node docs/skills/skill-bill/1081-页族总检.mjs                      # 全检 94 行
 *   node docs/skills/skill-bill/1081-页族总检.mjs --only x02,w01       # 只检点名页（调试／反例演示）
 *   node docs/skills/skill-bill/1081-页族总检.mjs --swap x02=<文档壳.html>   # 人造反例：把该页产物换成给的那份
 * 反例自证：① 天然负例＝w00（回落老壳，必红并点名）；② 人造负例＝--swap（必红并点名）；还原＝不带 --swap 复跑即绿。
 * 红线：本脚本不改 packages/、不改原型；只写自己的产物目录与隔离家目录。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_RECORDS, SEED_TODAY, seedBillDb } from '../../../packages/skill-bill/test/helpers/bill-seed.mjs';
import { billEnv, freezeClock } from '../../../packages/skill-bill/test/helpers/config-base.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url)).replace(/[\/]$/, '');
const BIN = join(ROOT, 'packages', 'skill-bill', 'dist', 'cli', 'cmd_read.js');
const PROTO_MANIFEST = join(ROOT, 'docs/skills/skill-bill/proto/manifest.json');
const SAMPLE = join(ROOT, 'docs/skills/skill-bill/1075-write-样本集.json');

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const OUT = join(ROOT, argOf('--out', '.scratch/1081-页族'));
const ONLY = argOf('--only', '').split(',').map((s) => s.trim()).filter(Boolean);
const SWAP = new Map(argOf('--swap', '').split(',').filter(Boolean).map((s) => {
  const i = s.indexOf('=');
  return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
}));
const HOME_ROOT = join(process.env.TEMP || '.', 'tick-1081');

/* ── 页清单：六张表（命令键与参数逐条照六个既有 runner） ───────────────────────── */
const Q = (id, wake, key, params) => ({ id, wake, key, params: params ?? {}, group: 'query' });
const QUERY = [
  Q('w00', '查某天', 'bill.record.today', { date: '2026-06-04' }),
  Q('w01', '查今天', 'bill.record.today'),
  Q('w02', '查昨天', 'bill.record.today', { date: 'yesterday' }),
  Q('w03', '查某天', 'bill.record.today', { date: '2026-05-15' }),
  Q('w04', '查最近', 'bill.record.today', { recent: true, limit: 10 }),
  Q('w06', '查周', 'bill.record.range', { range: 'week', today: '2026-06-14' }),
  Q('w07', '查月', 'bill.record.range', { range: 'month', today: '2026-06-14' }),
  Q('w08', '查区间', 'bill.record.range', { start: '2026-05-01', end: '2026-05-31' }),
  Q('w10', '查账户', 'bill.record.range', { account: '支付宝' }),
  Q('w11', '查账本', 'bill.record.range', { ledger: '旅行' }),
  Q('w12', '搜备注', 'bill.record.search', { q: '午饭' }),
  Q('w13', '查标签', 'bill.record.search', { kind: 'tag', tag: '未还' }),
  Q('w14', '查欠款', 'bill.record.search', { kind: 'debt' }),
  Q('w15', '查待报销', 'bill.record.search', { kind: 'reimburse' }),
  Q('w16', '查分期', 'bill.record.search', { kind: 'installment' }),
  Q('w17', '账单详情', 'bill.record.detail', { id: 8 }),
];
const W09 = [{ id: 'w09', wake: '查分类', key: 'bill.record.range', params: { category: '餐饮' }, group: 'query' }];
const A = (id, wake, params, key = 'bill.analysis.overview') => ({ id, wake, key, params, group: 'analysis' });
const ANALYSIS = [
  A('a01', '看月度', { kind: 'monthly', month: '2026-05' }),
  A('a02', '看年度', { kind: 'yearly', year: 2026 }),
  A('a03', '看总览', { kind: 'overview', start: '2026-04-01', end: '2026-06-14' }),
  A('a04', '看周报', { kind: 'week' }),
  A('a05', '看分类', { kind: 'category', month: '2026-05' }),
  A('a06', '看账户', { kind: 'account', month: '2026-05' }),
  A('a07', '看账本', { kind: 'ledger', month: '2026-05' }),
  A('a08', '看结构', { kind: 'structure', month: '2026-05' }),
  A('a09', '做统计', { kind: 'stats', month: '2026-05' }),
  A('a10', '看对比', { kind: 'period', monthA: '2026-04', monthB: '2026-05' }, 'bill.analysis.compare'),
  A('a11', '看双区间', { kind: 'range', from1: '2026-05-01', to1: '2026-05-15', from2: '2026-05-16', to2: '2026-06-14' }, 'bill.analysis.compare'),
  A('a12', '看同比', { kind: 'yoy', month: '2026-05' }, 'bill.analysis.compare'),
  A('a13', '看分类对比', { kind: 'category', startA: '2026-05-01', endA: '2026-05-15', startB: '2026-05-16', endB: '2026-06-14' }, 'bill.analysis.compare'),
  A('a14', '看趋势', { kind: 'trend', months: 12 }, 'bill.analysis.trend'),
  A('a15', '看分类趋势', { kind: 'category', category: '餐饮', months: 12 }, 'bill.analysis.trend'),
  A('a16', '看大额', { kind: 'top', limit: 5 }, 'bill.analysis.trend'),
  A('a17', '看高频', { kind: 'frequent', limit: 5 }, 'bill.analysis.trend'),
  A('a18', '看分布', { kind: 'distribution', month: '2026-05' }, 'bill.analysis.trend'),
  A('a19', '看活跃', { kind: 'activity', month: '2026-05' }, 'bill.analysis.trend'),
  A('a20', '看洞察', { kind: 'insight', month: '2026-05' }, 'bill.analysis.trend'),
  A('a21', '看异常', { kind: 'anomaly', months: 12 }, 'bill.analysis.trend'),
  A('a22', '看借贷', { kind: 'debt' }, 'bill.analysis.trend'),
  A('a23', '看报销', { kind: 'reimburse' }, 'bill.analysis.trend'),
  A('a24', '看分期', { kind: 'installment' }, 'bill.analysis.trend'),
  A('a25', '看退款', { kind: 'refund' }, 'bill.analysis.trend'),
];
const ACCT = [
  { id: 'b01', wake: '新增账户-采集', key: 'bill.account.write', params: { op: 'add' } },
  { id: 'b02', wake: '新增账户-回执', key: 'bill.account.write', params: { op: 'add', name: '招行工资卡', type: '银行卡' } },
  { id: 'b03', wake: '改账户-采集', key: 'bill.account.write', params: { op: 'update' } },
  { id: 'b04', wake: '改账户-回执', key: 'bill.account.write', params: { op: 'update', name: '招行工资卡', 'new-name': '招行主卡' } },
  { id: 'b05', wake: '账户转账-采集', key: 'bill.account.write', params: { op: 'transfer' } },
  { id: 'b06', wake: '账户转账-回执', key: 'bill.account.write', params: { op: 'transfer', amount: 500, from: '招行主卡', to: '支付宝', time: '2026-06-14 12:00:00' } },
  { id: 'b07', wake: '看账户汇总', key: 'bill.account.query', params: {} },
  { id: 'g01', wake: '设定预算-采集', key: 'bill.goal.write', params: { op: 'set-budget' } },
  { id: 'g02', wake: '设定预算-回执', key: 'bill.goal.write', params: { op: 'set-budget', month: '2026-06', amount: 3000 } },
  { id: 'g03', wake: '设定目标-采集', key: 'bill.goal.write', params: { op: 'set-saving' } },
  { id: 'g04', wake: '设定目标-回执', key: 'bill.goal.write', params: { op: 'set-saving', name: '旅行基金', amount: 10000, deadline: '2026-12-31' } },
  { id: 'g05', wake: '看预算', key: 'bill.goal.query', params: { op: 'budget', month: '2026-06' } },
  { id: 'g06', wake: '看目标', key: 'bill.goal.query', params: { op: 'saving' } },
].map((p) => ({ ...p, group: 'acct' }));
const SAY = [
  ['x01', '记支出', 'bill.record.add', { kind: 'expense' }], ['x03', '记收入', 'bill.record.add', { kind: 'income' }],
  ['x05', '拍账单', 'bill.record.add', { kind: 'photo' }], ['x07', '批量录入', 'bill.record.add', { kind: 'batch' }],
  ['x09', '记退款', 'bill.record.add', { kind: 'refund' }], ['x11', '记报销', 'bill.record.add', { kind: 'reimburse' }],
  ['x13', '报销到账', 'bill.record.add', { kind: 'reimburse-done' }], ['x15', '记借出', 'bill.record.add', { kind: 'lend' }],
  ['x17', '记借入', 'bill.record.add', { kind: 'borrow' }], ['x19', '记收回', 'bill.record.add', { kind: 'collect' }],
  ['x21', '记偿还', 'bill.record.add', { kind: 'repay' }], ['x23', '记分期', 'bill.record.add', { kind: 'installment' }],
  ['x25', '记一笔', 'bill.record.add', {}], ['x27', '改记录', 'bill.record.update', {}],
  ['x29', '撤销', 'bill.record.update', { op: 'undo' }], ['x31', '恢复', 'bill.record.update', { op: 'restore' }],
].map(([id, wake, key, params]) => ({ id, wake, key, params, group: 'say' }));
const SETUP = [
  ['s01', '初始化', 'bill.setup.run', { op: 'init' }], ['s02', '初始化状态', 'bill.setup.run', { op: 'init-status' }],
  ['s03', '一键备份', 'bill.setup.run', { op: 'backup-create' }], ['s04', '查看备份', 'bill.setup.run', { op: 'backup-list' }],
  ['s05', '恢复备份', 'bill.setup.run', { op: 'restore' }], ['s06', '导入', 'bill.setup.run', { op: 'import', file: 'bills.csv' }],
  ['h02', '速查表', 'bill.help.lookup', { mode: 'lookup' }],
].map(([id, wake, key, params]) => ({ id, wake, key, params, group: 'setup' }));

/* 写入回执 16 页：样本集是唯一定义地（参数与垫位都在里面） */
const sample = JSON.parse(readFileSync(SAMPLE, 'utf8'));
const WRITE = sample.items.map((it) => ({ id: it.id, wake: it.wake, key: it.key, params: it.params, group: 'write' }));

const SPECS = [...QUERY, ...W09, ...ANALYSIS, ...ACCT, ...SAY, ...SETUP, ...WRITE];
const specOf = new Map(SPECS.map((s) => [s.id, s]));  // 页号全仓唯一（w/a/b/g/x/s/h02），故按 id 取命令

/* ── 页清单与 manifest 对账（95 件 kind=proto；去重 w09 v2.1；逐件必须找到命令） ── */
const protoMan = JSON.parse(readFileSync(PROTO_MANIFEST, 'utf8'));
const protos = (protoMan.items ?? []).filter((it) => it.kind === 'proto');
const DEDUP_REL = 'query/w09-查分类-v2.1.html';
const dedup = protos.filter((p) => p.rel === DEDUP_REL);
const checked = protos.filter((p) => p.rel !== DEDUP_REL);
const pages = [];
for (const p of checked) {
  const id = p.rel.split('/').pop().split('-')[0];
  const spec = specOf.get(id);
  if (!spec) throw new Error('页清单里没有命令登记：' + p.rel + '（domain=' + p.domain + ' id=' + id + '）');
  pages.push({ ...spec, seq: p.seq, domain: p.domain, protoRel: p.rel, protoFile: p.file, wake: spec.wake });
}
if (pages.length !== 94) throw new Error('实检行数应为 94（95 件 − w09 重复 1），实得 ' + pages.length);
if (!ONLY.length) {
  const miss = SPECS.filter((s) => !pages.some((p) => p.id === s.id));
  if (miss.length) throw new Error('命令表里有页没进清单：' + miss.map((m) => m.group + '/' + m.id).join('、'));
}

/* ── 真跑 ─────────────────────────────────────────────────────────────── */
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const domOnly = (h) => h.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
const SHEET_DIV = /<div[^>]*class="ilife-bill-sheet-page[\s"]/;
const OLD_SHELL = /class="ilife-block-page-shell/;

function freshHome(name) {
  const dir = join(HOME_ROOT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, '.ilife'), { recursive: true });
  return dir;
}
function fixtureHome(name) {
  const dir = freshHome(name);
  writeFileSync(join(dir, '.ilife', 'bill.yaml'), 'db:' + String.fromCharCode(10) + '  dir: ' + JSON.stringify(dir) + String.fromCharCode(10), 'utf8');
  seedBillDb(dir, [...SEED_RECORDS, ['2026-06-14 12:00:00', '餐饮/外卖', -68, '支付宝', '生活', '今天午饭']]);
  return dir;
}
function plainHome(name) {
  const dir = freshHome(name);
  writeFileSync(join(dir, '.ilife', 'bill.yaml'), 'db:' + String.fromCharCode(10) + '  dir: ' + JSON.stringify(dir) + String.fromCharCode(10), 'utf8');
  return dir;
}
function spawnRun(home, key, params, outFile) {
  const env = billEnv(home, freezeClock(SEED_TODAY));
  const args = [BIN, key, '--params', JSON.stringify(params)];
  if (outFile) args.push('--html', outFile);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env });
  return { status: r.status, stderr: String(r.stderr ?? '') };
}

const homes = {};
const rows = [];
const log = [];
const picked = (p) => ONLY.length === 0 || ONLY.includes(p.id) || ONLY.includes(String(p.seq));

/* 写回执：先按样本集垫位（编号顶到 11..23／1／2），再逐页跑 */
if (pages.some((p) => p.group === 'write') && (ONLY.length === 0 || pages.some((p) => p.group === 'write' && picked(p)))) {
  homes.write = plainHome('write');
  for (const s of sample.seed) {
    const r = spawnRun(homes.write, 'bill.record.add', s.params, null);
    if (r.status !== 0) throw new Error('垫位失败 exit=' + r.status + ' ' + r.stderr.slice(-200));
  }
}
/* 夹具域的家目录（查询／分析／账户目标），与写／SAY／设置分开，互不污染 */
for (const p of pages) {
  if (!picked(p)) continue;
  if (p.group === 'query' || p.group === 'analysis' || p.group === 'acct') homes[p.group] ??= fixtureHome(p.group);
  else if (p.group === 'say') homes.say ??= plainHome('say');
  else if (p.group === 'setup') homes.setup ??= plainHome('setup');
}

for (const p of pages) {
  if (!picked(p)) continue;
  const home = homes[p.group];
  const prodName = p.seq + '-' + p.id + '-真跑.html';
  const prodPath = join(OUT, 'prod', prodName);
  mkdirSync(join(OUT, 'prod'), { recursive: true });
  const r = spawnRun(home, p.key, p.params, prodPath);
  if (SWAP.has(p.id) || SWAP.has(String(p.seq))) copyFileSync(SWAP.get(p.id) ?? SWAP.get(String(p.seq)), prodPath);
  const html = existsSync(prodPath) ? readFileSync(prodPath, 'utf8') : '';
  const dom = domOnly(html);
  const sheetDiv = SHEET_DIV.test(dom) ? (dom.match(new RegExp(SHEET_DIV.source, 'g')) || []).length : 0;
  const cutLine = (dom.match(/✂ 裁切线/g) || []).length;
  const oldShell = (dom.match(OLD_SHELL) || []).length;
  const problems = [];
  if (r.status !== 0) problems.push('exit=' + r.status + ' ' + r.stderr.slice(-160));
  if (!html) problems.push('未落盘');
  if (sheetDiv < 1) problems.push('非票据纸族：<div class="ilife-bill-sheet-page …"> 不在' + (oldShell > 0 ? '（命中老文档壳 ' + oldShell + ' 处）' : ''));
  if (cutLine < 1) problems.push('✂ 裁切线 不在');
  const family = problems.length === 0 ? '票据纸（ilife-bill-sheet-page）'
    : (sheetDiv >= 1 ? '票据纸（缺 ✂ 裁切线）' : (oldShell > 0 ? '老文档壳（ilife-block-page-shell）' : '非票据纸族'));
  rows.push({
    seq: p.seq, id: p.id, domain: p.domain, wake: p.wake, key: p.key, params: p.params,
    file: prodPath, family, sheetDiv, cutLine, oldShell, bytes: html.length, sha256: html ? sha256(html) : null,
    exit: r.status, problems, swapped: SWAP.has(p.id) || SWAP.has(String(p.seq)),
  });
  log.push('PAGE seq=' + p.seq + ' ' + p.id + ' ' + p.domain + ' ' + p.wake + ' key=' + p.key
    + ' exit=' + r.status + ' bytes=' + html.length + ' 根div=' + sheetDiv + ' 裁切线=' + cutLine
    + ' 旧壳=' + oldShell + (problems.length ? ' PROBLEMS=' + problems.join(' | ') : ' OK'));
}

/* ── 表与读数 ─────────────────────────────────────────────────────────── */
rows.sort((a, b) => a.seq - b.seq);
const tab = (s, w) => String(s ?? '').padEnd(w).slice(0, w);
console.log('seq	域	唤醒词	命令键	页族	产物路径	判定	读数');
for (const r of rows) {
  console.log([r.seq, r.domain, r.wake, r.key, r.family, r.file.replace(ROOT + '\\', '').split('\\').join('/'),
    r.problems.length ? 'RED' : 'PASS', '根div=' + r.sheetDiv + ' 裁切线=' + r.cutLine + ' 旧壳=' + r.oldShell].join('	'));
}
const bad = rows.filter((r) => r.problems.length > 0);
const reading = {
  ticket: 1081, criterion: '判据四 · 95 页真跑页族总检',
  protoTotal: protos.length, dedup: dedup.map((d) => d.rel), checkedRows: rows.length,
  green: rows.length - bad.length, red: bad.length,
  assertSheetRoot: { pass: rows.filter((r) => r.sheetDiv >= 1).length, fail: rows.filter((r) => r.sheetDiv < 1).map((r) => r.seq + ' ' + r.id) },
  assertCutLine: { pass: rows.filter((r) => r.cutLine >= 1).length, fail: rows.filter((r) => r.cutLine < 1).map((r) => r.seq + ' ' + r.id) },
  byProblems: rows.filter((r) => r.problems.length).reduce((a, r) => { const k = r.problems.map((x) => x.split('：')[0]).join(' ＋ '); a[k] = (a[k] ?? 0) + 1; return a; }, {}),
  redSeqs: bad.map((r) => r.seq + ' ' + r.id + '（' + r.problems.join('；') + '）'),
  redIds: bad.map((r) => r.id),
  snapshot: {
    gitHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
    cmdReadDistSha256: sha256(readFileSync(BIN)),
    packagesDirtyLines: spawnSync('git', ['status', '--porcelain', '--', 'packages'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean).length,
    at: new Date().toISOString(),
    isolatedHomeRoot: HOME_ROOT,
  },
  swap: [...SWAP.entries()], only: ONLY, rows,
};
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, '页族总检.json'), JSON.stringify(reading, null, 2), 'utf8');
writeFileSync(join(OUT, '页族总检.log'), log.join('\n') + '\n', 'utf8');
if (dedup.length) console.log('NOTE 去重：' + dedup.map((d) => d.rel + '（seq ' + d.seq + '）').join('、') + ' 已被 v2.2 取代、不计行；实检 ' + rows.length + ' 行');
console.log('READINGS 清单 ' + protos.length + ' 件 proto − 去重 ' + dedup.length + ' = 实检 ' + rows.length + ' 行；绿 ' + (rows.length - bad.length) + '；红 ' + bad.length
  + (bad.length ? ' -> ' + bad.map((r) => 'seq ' + r.seq + '/' + r.id).join('、') : ''));
console.log('断言 A 票据纸根 div：过 ' + reading.assertSheetRoot.pass + '/' + rows.length + (reading.assertSheetRoot.fail.length ? '；不过 -> ' + reading.assertSheetRoot.fail.join('、') : ''));
console.log('断言 B ✂ 裁切线：过 ' + reading.assertCutLine.pass + '/' + rows.length + (reading.assertCutLine.fail.length ? '；不过 -> ' + reading.assertCutLine.fail.join('、') : ''));
console.log('SNAPSHOT gitHead=' + reading.snapshot.gitHead + ' dist=' + reading.snapshot.cmdReadDistSha256.slice(0, 12) + ' 隔离家目录=' + HOME_ROOT);
console.log(bad.length === 0
  ? 'RESULT: 全绿 ' + rows.length + '/' + rows.length + ' 页产物都是票据纸族 -> 页族总检可收'
  : 'RESULT: RED ' + bad.length + ' 页未过「票据纸族」断言（根 div ／ ✂ 裁切线 两项都要在），逐页点名：' + bad.map((r) => 'seq ' + r.seq + ' ' + r.id + ' ' + r.wake + '［' + r.problems.map((x) => x.split('：')[0]).join('／') + '］').join('；'));
process.exit(bad.length === 0 ? 0 : 1);
