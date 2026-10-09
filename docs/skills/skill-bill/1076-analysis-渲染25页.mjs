/** #1076 执行席 · 分析域 25 页「真跑产物」生成 ＋ 冻结原型同目录副本（只写 .scratch/1076-analysis/）。
 *
 * 拆两件事：
 *   ① 样本：**不再造第二份**——直接用仓内 #729 分析域夹具（test/helpers/bill-seed.mjs 的 SEED_RECORDS，
 *      39 条，2025-05 ~ 2026-06），它本来就是为这 25 个场景设计的（空月／去年同月／本周上周／多账户多账本
 *      多分类／四类 #标签／金额分层）。夹具的「今天」= SEED_TODAY(2026-06-14)，用 freezeClock 钉住。
 *   ② 真跑：spawn dist/cli/cmd_read.js 的 25 条命令，逐页落 <id>-真跑.html；产物与原型的字节／sha256 逐条记。
 *
 * 隔离落点：$env:TEMP\tick-1076（本票号命名，不碰真实家目录的库）。
 * 用法：node .scratch/1076-analysis/run-1076.mjs
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
const OUT = resolve(ROOT, outArg >= 0 && argv[outArg + 1] !== undefined ? argv[outArg + 1] : '.scratch/1076-analysis');
const HOME_DIR = join(tmpdir(), 'tick-1076');
const BIN = join(ROOT, 'packages', 'skill-bill', 'dist', 'cli', 'cmd_read.js');
const PROTO_MANIFEST = join(ROOT, 'docs', 'skills', 'skill-bill', 'proto', 'manifest.json');

/** 25 页：id ／ 唤醒词 ／ 命令键 ／ 参数（窗口按夹具的「今天」2026-06-14 与它覆盖的月份搬）／
 *  这一格该确认什么（前半＝分析域专有判据，后半＝本页自己的读数点，逐字取自分析域 manifest 的 check）。 */
const EIGHT = '八件套：结论句聚合不换行／主数字唯一／落点 LEDGER／占比 SCALE／明细 DETAIL／对账 CHECK／✂ 裁切线／页脚只有场景名';
const PAGES = [
  ['a01', '看月度', 'bill.analysis.overview', { kind: 'monthly', month: '2026-05' }, '2026-05 月度：条卡按完整分类归堆、前 8 类；' + EIGHT],
  ['a02', '看年度', 'bill.analysis.overview', { kind: 'yearly', year: 2026 }, '2026 年度：12 个月序列在（含 2025 空月段）；' + EIGHT],
  ['a03', '看总览', 'bill.analysis.overview', { kind: 'overview', start: '2026-04-01', end: '2026-06-14' }, '2026-04-01~06-14 总览：日均支出在、无条卡；' + EIGHT],
  ['a04', '看周报', 'bill.analysis.overview', { kind: 'week' }, '本周(06-08~06-14) vs 上周：变更结论句在、本周前 5 大额在；' + EIGHT],
  ['a05', '看分类', 'bill.analysis.overview', { kind: 'category', month: '2026-05' }, '2026-05 按 L1 归堆（与看月度的全路径归堆不同）；' + EIGHT],
  ['a06', '看账户', 'bill.analysis.overview', { kind: 'account', month: '2026-05' }, '2026-05 按账户归堆（3 个账户）；' + EIGHT],
  ['a07', '看账本', 'bill.analysis.overview', { kind: 'ledger', month: '2026-05' }, '2026-05 按账本归堆（生活／工作／学习／旅行）；' + EIGHT],
  ['a08', '看结构', 'bill.analysis.overview', { kind: 'structure', month: '2026-05' }, '2026-05 收支结构占比在；' + EIGHT],
  ['a09', '做统计', 'bill.analysis.overview', { kind: 'stats', month: '2026-05' }, '2026-05 统计读数卡在；' + EIGHT],
  ['a10', '看对比', 'bill.analysis.compare', { kind: 'period', monthA: '2026-04', monthB: '2026-05' }, '2026-04 vs 2026-05：变化金额与百分比在；' + EIGHT],
  ['a11', '看双区间', 'bill.analysis.compare', { kind: 'range', from1: '2026-05-01', to1: '2026-05-15', from2: '2026-05-16', to2: '2026-06-14' }, '两段自定义区间对比在；' + EIGHT],
  ['a12', '看同比', 'bill.analysis.compare', { kind: 'yoy', month: '2026-05' }, '同比 2026-05 vs 2025-05（夹具特意两笔都在）；' + EIGHT],
  ['a13', '看分类对比', 'bill.analysis.compare', { kind: 'category', startA: '2026-05-01', endA: '2026-05-15', startB: '2026-05-16', endB: '2026-06-14' }, '两段区间的 L1 分类双段对比（前 10 类）；' + EIGHT],
  ['a14', '看趋势', 'bill.analysis.trend', { kind: 'trend', months: 12 }, '近 12 月序列：缺口按缺口画、口径句点名没有记录的月份（2025-07~12）；' + EIGHT],
  ['a15', '看分类趋势', 'bill.analysis.trend', { kind: 'category', category: '餐饮', months: 12 }, '餐饮单类 12 月序列在；' + EIGHT],
  ['a16', '看大额', 'bill.analysis.trend', { kind: 'top', limit: 5 }, 'TOP5 大额：支出从大到小、同额先出时间晚的；' + EIGHT],
  ['a17', '看高频', 'bill.analysis.trend', { kind: 'frequent', limit: 5 }, 'TOP5 高频在；' + EIGHT],
  ['a18', '看分布', 'bill.analysis.trend', { kind: 'distribution', month: '2026-05' }, '2026-05 五档分布（10 元以下／10~50／50~100／100~500／500 以上）；' + EIGHT],
  ['a19', '看活跃', 'bill.analysis.trend', { kind: 'activity', month: '2026-05' }, '2026-05 活跃（天／笔）在；' + EIGHT],
  ['a20', '看洞察', 'bill.analysis.trend', { kind: 'insight', month: '2026-05' }, '2026-05 解读多卡在、结论句非空；' + EIGHT],
  ['a21', '看异常', 'bill.analysis.trend', { kind: 'anomaly', months: 12 }, '近 12 月异常点在（含空月段）；' + EIGHT],
  ['a22', '看借贷', 'bill.analysis.trend', { kind: 'debt' }, '借贷未还行在、已还排除（#借给张三 #向李四借）；占比条按同组最大值折算、百分比行内有文案',
  ],
  ['a23', '看报销', 'bill.analysis.trend', { kind: 'reimburse' }, '待报销行在、已报销排除；明细卡：序号＋单行文本＋44px 行高'],
  ['a24', '看分期', 'bill.analysis.trend', { kind: 'installment' }, '分期行在（手机 第 N 期/12）；明细逐槽独立、缺槽不留空位'],
  ['a25', '看退款', 'bill.analysis.trend', { kind: 'refund' }, '退款行在；空态直写「空」字、禁「见复制区」式间接行'],
].map(([id, wake, key, params, check], i) => ({ seq: i + 1, id, wake, key, params, check }));

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ── ① 样本：隔离家目录 ＋ 仓内夹具
rmSync(HOME_DIR, { recursive: true, force: true });
mkdirSync(join(HOME_DIR, '.ilife'), { recursive: true });
const env = billEnv(HOME_DIR, freezeClock(SEED_TODAY));
const dbPath = seedBillDb(HOME_DIR);
const fixtureSha = sha256(readFileSync(dbPath));

// ── ② 冻结原型：按 #1073 manifest 的 domain=analysis 逐件 sha256 核对，再同目录副本
const protoMan = JSON.parse(readFileSync(PROTO_MANIFEST, 'utf8'));
const protoItems = (protoMan.items ?? []).filter((it) => it.domain === 'analysis' && it.kind === 'proto');
const protoByWake = new Map(protoItems.map((it) => [it.wake, it]));
if (protoByWake.size !== 25) throw new Error('冻结原型 analysis 应为 25 件，实得 ' + protoByWake.size);

mkdirSync(OUT, { recursive: true });
// 只清本票自己生成的那些名字（**不整目录删**：运行器与日志住同一目录）
for (const p of PAGES) {
  for (const n of [p.id + '-真跑.html', p.id + '-原型.html']) rmSync(join(OUT, n), { force: true });
}
for (const n of ['manifest.json', '样本集.json', 'run-1076.log']) rmSync(join(OUT, n), { force: true });

const rows = [];
const log = [];
for (const p of PAGES) {
  const proto = protoByWake.get(p.wake);
  if (!proto) throw new Error('冻结原型里没有唤醒词 ' + p.wake);
  const protoSrc = join(ROOT, proto.file);
  const buf = readFileSync(protoSrc);
  const got = sha256(buf);
  if (got !== proto.sha256) throw new Error('冻结原型 sha256 不符：' + proto.file + ' got=' + got);
  const protoCopy = p.id + '-原型.html';
  copyFileSync(protoSrc, join(OUT, protoCopy));

  const prodName = p.id + '-真跑.html';
  const prodPath = join(OUT, prodName);
  const r = spawnSync(process.execPath, [BIN, p.key, '--params', JSON.stringify(p.params), '--html', prodPath], {
    cwd: ROOT, encoding: 'utf8', env,
  });
  const last = String(r.stdout ?? '').trim().split(/\r?\n/).filter(Boolean).pop() ?? '';
  let json = null;
  try { json = JSON.parse(last); } catch { /* 非 envelope，下面按红记 */ }
  const exists = existsSync(prodPath);
  const bytes = exists ? statSync(prodPath).size : 0;
  const html = exists ? readFileSync(prodPath, 'utf8') : '';
  const problems = [];
  if (r.status !== 0) problems.push('exit=' + r.status + ' stderr=' + String(r.stderr ?? '').slice(-200));
  if (!exists) problems.push('未落盘');
  if (exists && !/<!doctype html>/i.test(html)) problems.push('非整页');
  if (exists && json && json.delivery && json.delivery.bytes !== bytes) problems.push('字节不符 envelope=' + json.delivery.bytes + ' 盘上=' + bytes);
  if (exists && !/ilife-bill-sheet-page/.test(html)) problems.push('非票据纸根类');
  const ext = [...html.matchAll(/(?:src|href)="(?!#|data:|https?:|\/\/)([^"]+)"/g)].map((m) => m[1]);
  rows.push({
    seq: p.seq, id: p.id, wake: p.wake, key: p.key, params: p.params,
    file: prodName, proto: protoCopy,
    protoSrc: proto.file, protoSha256: proto.sha256,
    check: p.check, window: p.key + ' ' + JSON.stringify(p.params),
    exit: r.status, bytes, envelopeBytes: json?.delivery?.bytes ?? null,
    externalRefs: ext, problems,
  });
  log.push('PAGE ' + p.id + ' ' + p.wake + ' key=' + p.key + ' exit=' + r.status + ' bytes=' + bytes
    + ' proto=' + proto.rel + ' protoSha=' + proto.sha256.slice(0, 12) + ' extRefs=' + ext.length
    + (problems.length ? ' PROBLEMS=' + problems.join(' | ') : ''));
}

const bad = rows.filter((r) => r.problems.length > 0);
const gitHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const gitStatus = spawnSync('git', ['status', '--porcelain', '--', 'packages'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const distHash = sha256(readFileSync(BIN));

const manifest = {
  wall: '1076-analysis',
  ticket: 1076,
  domain: 'analysis',
  total: rows.length,
  sample: {
    fixture: 'packages/skill-bill/test/helpers/bill-seed.mjs（#729 分析域夹具，只读引用、未改一字）',
    records: SEED_RECORDS.length,
    today: SEED_TODAY,
    dbSha256: fixtureSha,
    isolatedHome: HOME_DIR,
  },
  snapshot: { gitHead, gitStatusPackages: gitStatus, cmdReadDistSha256: distHash, at: new Date().toISOString() },
  rows,
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
writeFileSync(join(OUT, '样本集.json'), JSON.stringify({
  ticket: 1076, today: SEED_TODAY, fixture: manifest.sample.fixture,
  records: SEED_RECORDS, pages: rows.map((r) => ({ seq: r.seq, id: r.id, wake: r.wake, key: r.key, params: r.params })),
}, null, 2), 'utf8');
writeFileSync(join(OUT, 'run-1076.log'), log.join('\n') + '\n', 'utf8');

console.log(log.join('\n'));
console.log('SNAPSHOT gitHead=' + gitHead + ' dist=' + distHash.slice(0, 12) + ' packages 工作区改动行数=' + (gitStatus ? gitStatus.split('\n').length : 0));
console.log('RESULT: ' + (rows.length - bad.length) + '/' + rows.length + ' 真跑成功；缺件/问题页 ' + bad.length
  + (bad.length ? ' -> ' + bad.map((b) => b.id + '(' + b.problems.join(';') + ')').join(' ') : ''));
process.exit(bad.length === 0 ? 0 : 1);
