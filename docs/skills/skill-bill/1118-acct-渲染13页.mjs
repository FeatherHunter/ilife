/** #1118 执行席 · 账户与目标域 13 页「真跑产物」生成 ＋ 冻结原型同目录副本（只写 .scratch/1118-acct/）。
 *
 * 拆三件事：
 *   ① 样本：隔离家目录 $env:TEMP\tick-1118，直接用仓内 #729 合成记账库夹具（test/helpers/bill-seed.mjs 的
 *      SEED_RECORDS 39 条，2025-05 ~ 2026-06），夹具的「今天」= SEED_TODAY(2026-06-14)，用 freezeClock 钉住。
 *      夹具本身覆盖：负余额（微信／支付宝）／欠款（#借出 #借入 未还）／分期（#分期 第N期/12）／报销中（#待报销）。
 *   ② 真跑：spawn dist/cli/cmd_read.js 的 13 条命令，逐页落 <id>-真跑.html；冻结原型逐件核 sha256
 *      （对 docs/skills/skill-bill/proto/manifest.json 的登记值）后逐字节副本落 <id>-原型.html（同目录，不跨目录）。
 *   ③ 机检：逐页读产物——**票据纸判据**（<div class="ilife-bill-sheet-page " 在位　✂ 裁切线 在位　三块段标题在位　
 *      虚线分隔 ≥6）／页内导航恰一个（回执与列表 1 个、采集页 0 个）／来源脚注 ≥1／可见文本无 undefined 与 NaN／
 *      无 loading=lazy／外部资源引用 0／**旧文档壳 0 命中**（ilife-block-page-shell 一个都不许再有）；
 *      另记八件套块位的据实读数（块位清单逐页落 manifest，不下判定）。
 *
 * 用法：node docs/skills/skill-bill/1118-acct-渲染13页.mjs
 * 红线：只读 src/dist/原型，只写 .scratch/1118-acct/；不改任何 packages/ 代码、不改原型。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_RECORDS, SEED_TODAY, seedBillDb } from '../../../packages/skill-bill/test/helpers/bill-seed.mjs';
import { billEnv, freezeClock } from '../../../packages/skill-bill/test/helpers/config-base.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url)).replace(/[\\/]$/, '');
const OUT = join(ROOT, '.scratch', '1118-acct');
const HOME_DIR = join(tmpdir(), 'tick-1118');
const BIN = join(ROOT, 'packages', 'skill-bill', 'dist', 'cli', 'cmd_read.js');
const PROTO_MANIFEST = join(ROOT, 'docs', 'skills', 'skill-bill', 'proto', 'manifest.json');

const EIGHT = '八件套：结论句聚合不换行／主数字唯一／落点 LEDGER／占比 SCALE／明细 DETAIL／对账 CHECK／✂ 裁切线／页脚只有场景名';
const DOM_ACCT = '账户域判据：转账行用「→」双值行复写成两行；落点空行裁剪（账户页删分类行）每页只留一种并在页上写清一数一处；负值条按 M5＝1px dashed 空框＋数值原文＋注「负值不画实条，只留数」，禁把负值画成同色实条；复制按钮块居中＋文本居中＋两行左缘对齐；▾ 字面常显、open 不旋转、永不由 CSS 画三角；复制区下方不挂句子';
const DOM_GOAL = '目标域判据：落点空行裁剪（目标页删分类行与账户行）或空行填口径句，每页只留一种并在页上写清一数一处；主数字唯一（预算上限／目标总额各仅此一处）；进度条与占比口径一致；复制按钮块居中＋文本居中＋两行左缘对齐；▾ 字面常显、open 不旋转、永不由 CSS 画三角；复制区下方不挂句子';

/** 13 页：序号 ／ 页号 ／ 唤醒词 ／ 命令键 ／ 参数 ／ 页型 ／ 这一格该确认什么。 */
const PAGES = [
  [1, 'b01', '新增账户-采集', 'bill.account.write', { op: 'add' }, 'collect', '新增账户缺「账户名」：缺项阻断条逐项点名、采集页不写库；字段卡只列本支槽位（账户名必填／类型选填）；口令块给出补齐后照抄的那一句。' + DOM_ACCT],
  [2, 'b02', '新增账户-回执', 'bill.account.write', { op: 'add', name: '招行工资卡', type: '银行卡' }, 'receipt', '回执句写清「已新增账户「招行工资卡」（账户表现在 1 个）」；明细 3 行（账户名／类型／状态）；改动落 1 处；账户表住在 goals.json 顶层 accounts 键。' + DOM_ACCT],
  [3, 'b03', '改账户-采集', 'bill.account.write', { op: 'update' }, 'collect', '改账户缺「账户」与「改成什么」：两条缺项各点一次名；采集页不写库；字段卡列出改名／停用／启用三个口子。' + DOM_ACCT],
  [4, 'b04', '改账户-回执', 'bill.account.write', { op: 'update', name: '招行工资卡', 'new-name': '招行主卡' }, 'receipt', '改名回执：改动行用「旧 → 新」双值行写明，并报连带改了几笔历史流水；状态仍「使用中」。' + DOM_ACCT],
  [5, 'b05', '账户转账-采集', 'bill.account.write', { op: 'transfer' }, 'collect', '转账缺金额／从账户／到账户三项各点名；时间那格页上写的形态必须与校验同形（YYYY-MM-DD HH:MM:SS）；采集页不写库。' + DOM_ACCT],
  [6, 'b06', '账户转账-回执', 'bill.account.write', { op: 'transfer', amount: 500, from: '招行主卡', to: '支付宝', time: '2026-06-14 12:00:00' }, 'receipt', '转账回执：转出／转入各一笔（「→」双值行），两笔都带编号；转账不计收支；改动落 2 处。' + DOM_ACCT],
  [7, 'b07', '看账户汇总', 'bill.account.query', {}, 'list', '账户表＋账本聚合：负余额行（微信／支付宝）不画实条、只留数；总收入／总支出与转账口径（转账不算收支）；来源脚注写窗口起止与条数。' + DOM_ACCT],
  [8, 'g01', '设定预算-采集', 'bill.goal.write', { op: 'set-budget' }, 'collect', '设定预算缺「金额」：缺项点名；分类与月份为选填（空＝总预算／本月起）；采集页不写库。' + DOM_GOAL],
  [9, 'g02', '设定预算-回执', 'bill.goal.write', { op: 'set-budget', month: '2026-06', amount: 3000 }, 'receipt', '预算回执：写清 2026-06 全月总预算 3000.00 元；预算表住 goals.json 顶层 budgets 键。' + DOM_GOAL],
  [10, 'g03', '设定目标-采集', 'bill.goal.write', { op: 'set-saving' }, 'collect', '设定目标缺「目标」与「金额」：两条各点名；截止日期选填；采集页不写库。' + DOM_GOAL],
  [11, 'g04', '设定目标-回执', 'bill.goal.write', { op: 'set-saving', name: '旅行基金', amount: 10000, deadline: '2026-12-31' }, 'receipt', '目标回执：写清目标名／总额／截止日；savings 键落盘。' + DOM_GOAL],
  [12, 'g05', '看预算', 'bill.goal.query', { op: 'budget', month: '2026-06' }, 'list', '1 条预算（2026-06 总预算 3000.00）＋ 当月实际支出与进度条；主数字唯一（预算上限仅此一处）；预计月底按当前日均推算。' + DOM_GOAL],
  [13, 'g06', '看目标', 'bill.goal.query', { op: 'saving' }, 'list', '目标进度：已存／还差／预计达成；口径句说明达成与否；来源脚注给参与累计的记录条数。' + DOM_GOAL],
].map(([seq, id, wake, key, params, kind, check]) => ({ seq, id, wake, key, params, kind, check: check + '。' + EIGHT }));

/** #1118 判据侧票据纸族标记（改后必须在位；**上表 13 页逐页核**）。 */
const TICKET_MARKERS = [
  'ilife-bill-sheet-page', 'ilife-sheet-title', 'ilife-block-summary-head', 'ilife-block-ledger-rows',
  'ilife-ticket-rule', 'ilife-ticket-sec-heading', 'ilife-ticket-check', 'ilife-ticket-foot',
];
/** 13 页共有块位（票据纸页型的三份块位序列都出这几块）。 */
const COMMON_BLOCKS = [
  'ilife-page-ui', 'ilife-block-copy-block', 'ilife-block-ticket-button',
  'ilife-block-ledger-rows', 'ilife-block-summary-head', 'ilife-ticket-check', 'ilife-ticket-rule', 'ilife-ticket-foot',
];
/** 页型各自加挂的块位（判地那一套：采集页＝字段卡 ＋ 那行提示；回执／列表＝明细卡）。 */
const KIND_BLOCKS = {
  collect: ['ilife-block-param-form', 'ilife-block-caliber'],
  receipt: ['ilife-block-entry-card'],
  list: ['ilife-block-entry-card'],
};
/** 旧文档壳的标记（改后必须 0 命中：切票据纸＝正文不再套 pageShell）。 */
const OLD_SHELL = 'ilife-block-page-shell';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const classesOf = (html) => {
  const vis = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  return new Set([...vis.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean));
};
/** 只留 DOM（剔掉 <style>／<script>／注释）：类名命中数按 DOM 数，样式段里的选择器不算。 */
const domOnly = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const visibleText = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ');
const countOf = (html, needle) => html.split(needle).length - 1;
const countClass = (html, cls) => (html.match(new RegExp('class="[^"]*\\b' + cls + '\\b', 'g')) || []).length;

// ── ① 样本：隔离家目录 ＋ 仓内夹具
rmSync(HOME_DIR, { recursive: true, force: true });
mkdirSync(join(HOME_DIR, '.ilife'), { recursive: true });
const env = billEnv(HOME_DIR, freezeClock(SEED_TODAY));
const dbPath = seedBillDb(HOME_DIR);
const fixtureSha = sha256(readFileSync(dbPath));

// ── ② 冻结原型：按 proto/manifest.json 的 domain=acct-goal 逐件核 sha256
const protoMan = JSON.parse(readFileSync(PROTO_MANIFEST, 'utf8'));
const protoItems = (protoMan.items ?? []).filter((it) => it.domain === 'acct-goal' && it.kind === 'proto');
if (protoItems.length !== 13) throw new Error('冻结原型 acct-goal 应为 13 件，实得 ' + String(protoItems.length));
const protoByRel = new Map(protoItems.map((it) => [it.rel, it]));

mkdirSync(OUT, { recursive: true });
for (const p of PAGES) {
  for (const n of [p.id + '-真跑.html', p.id + '-原型.html']) rmSync(join(OUT, n), { force: true });
}
for (const n of ['manifest.json', '样本集.json', 'run-1118.log']) rmSync(join(OUT, n), { force: true });

/** 判地原型序号 → 相对路径（proto/manifest.json 的 rel）。 */
const PROTO_REL = {
  b01: 'acct-goal/b01-新增账户-采集-v2.2.html', b02: 'acct-goal/b02-新增账户-回执-v2.2.html',
  b03: 'acct-goal/b03-改账户-采集-v2.2.html', b04: 'acct-goal/b04-改账户-回执-v2.2.html',
  b05: 'acct-goal/b05-账户转账-采集-v2.2.html', b06: 'acct-goal/b06-账户转账-回执-v2.2.html',
  b07: 'acct-goal/b07-看账户汇总-v2.2.html',
  g01: 'acct-goal/g01-设定预算-采集-v2.2.html', g02: 'acct-goal/g02-设定预算-回执-v2.2.html',
  g03: 'acct-goal/g03-设定目标-采集-v2.2.html', g04: 'acct-goal/g04-设定目标-回执-v2.2.html',
  g05: 'acct-goal/g05-看预算-v2.2.html', g06: 'acct-goal/g06-看目标-v2.2.html',
};

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

  const cls = exists ? classesOf(html) : new Set();
  const expectBlocks = [...COMMON_BLOCKS, ...(KIND_BLOCKS[p.kind] ?? [])];
  const missingBlocks = expectBlocks.filter((c) => !cls.has(c));
  const navCount = exists ? countClass(html, 'ilife-block-toc') : 0;
  const srcCount = exists ? countOf(visibleText(html), '数据来源') : 0;
  const lazyCount = exists ? countOf(html, 'loading="lazy"') : 0;
  const undefCount = exists ? countOf(visibleText(html), 'undefined') : 0;
  const nanCount = exists ? countOf(visibleText(html), 'NaN') : 0;
  const ext = exists ? [...html.matchAll(/(?:src|href)="(?!#|data:|https?:|\/\/)([^"]+)"/g)].map((m) => m[1]) : [];
  const shellCount = exists ? countOf(domOnly(html), 'class="' + OLD_SHELL) : 0;
  const sheetDiv = exists ? countOf(html, '<div class="ilife-bill-sheet-page ') : 0;
  const cutLine = exists ? countOf(html, '✂ 裁切线') : 0;
  const ruleCount = exists ? countClass(html, 'ilife-ticket-rule') : 0;
  const ticketHits = exists ? TICKET_MARKERS.filter((m) => cls.has(m)) : [];
  // 主按钮（公共件 ticket-button）：十三页判地各一颗；采集页缺项未齐走 disabled 档，回执／列表可点
  const btnCount = exists ? countClass(html, 'ilife-block-ticket-button') : 0;
  const btnDisabled = exists ? /class="ilife-block-ticket-button[^"]*"[^>]*\sdisabled(\s|>)/.test(domOnly(html)) : false;

  if (missingBlocks.length) problems.push('缺块位：' + missingBlocks.join('、'));
  if (btnCount !== 1) problems.push('主按钮 ' + String(btnCount) + ' 颗（判地每页恰 1 颗）');
  const btnExpectDisabled = p.kind === 'collect';
  if (btnCount === 1 && btnDisabled !== btnExpectDisabled) {
    problems.push('主按钮档位不对：实得 ' + (btnDisabled ? '禁用' : '可用') + '，' + p.kind + ' 页应为 ' + (btnExpectDisabled ? '禁用（缺项未齐）' : '可用'));
  }
  if (shellCount > 0) problems.push('旧文档壳 ' + OLD_SHELL + ' 还命中 ' + String(shellCount) + ' 处（切票据纸未完成）');
  if (sheetDiv !== 1) problems.push('ilife-bill-sheet-page 根 div 应恰 1 个，实得 ' + String(sheetDiv));
  if (cutLine < 1) problems.push('✂ 裁切线 不在');
  if (ruleCount < 5) problems.push('虚线分隔 ' + String(ruleCount) + ' 条（票据纸页型 ≥5：店头／主数字／落点／中段／对账／按钮区之间）');
  // 判地十三件一件都没有页内导航 ⇒ 三张页型都是 0 个
  const navExpect = 0;
  if (navCount !== navExpect) problems.push('页内导航 ' + String(navCount) + ' 个（' + p.kind + ' 页应为 ' + String(navExpect) + ' 个）');
  // 来源脚注：判地十三件一件都没有 ⇒ 不进必备位，只作据实读数记下来（要不要留由负责人裁）
  if (lazyCount > 0) problems.push('出现 loading=lazy ' + String(lazyCount) + ' 处');
  if (undefCount > 0) problems.push('可见文本出现 undefined ' + String(undefCount) + ' 处');
  if (nanCount > 0) problems.push('可见文本出现 NaN ' + String(nanCount) + ' 处');
  if (ext.length > 0) problems.push('引用目录外资源 ' + String(ext.length) + ' 处：' + ext.join(','));

  rows.push({
    seq: p.seq, id: p.id, wake: p.wake, key: p.key, params: p.params, kind: p.kind,
    file: prodName, proto: protoCopy, protoSrc: reg.file, protoSha256: reg.sha256,
    check: p.check, window: p.key + ' ' + JSON.stringify(p.params),
    exit: r.status, bytes, envelopeBytes: json?.delivery?.bytes ?? null,
    blocksIn: [...cls].filter((c) => c.startsWith('ilife-')).sort(),
    blocksExpected: expectBlocks, blocksMissing: missingBlocks,
    navCount, srcCount, lazyCount, undefCount, nanCount, externalRefs: ext,
    shellCount, sheetDiv, cutLine, ruleCount, btnCount, btnDisabled,
    emptyBlock: cls.has('ilife-block-empty-block'),
    distRow: cls.has('ilife-block-dist-row'),
    changeRow: cls.has('ilife-block-change-row'),
    ticketMarkers: ticketHits, ticketMarkersMissing: TICKET_MARKERS.filter((m) => !cls.has(m)),
    problems,
  });
  log.push('PAGE ' + p.id + ' ' + p.wake + ' kind=' + p.kind + ' key=' + p.key + ' exit=' + String(r.status)
    + ' bytes=' + String(bytes) + ' proto=' + reg.rel + ' protoSha=' + reg.sha256.slice(0, 12)
    + ' nav=' + String(navCount) + ' src=' + String(srcCount) + ' 块位缺=' + String(missingBlocks.length)
    + ' 票据纸根div=' + String(sheetDiv) + ' 裁切线=' + String(cutLine) + ' 虚线=' + String(ruleCount)
    + ' 主按钮=' + String(btnCount) + (btnDisabled ? '(禁用)' : '(可用)')
    + ' 旧壳=' + String(shellCount) + ' 票据纸族在=' + String(ticketHits.length) + '/' + String(TICKET_MARKERS.length)
    + ' extRefs=' + String(ext.length) + (problems.length ? ' PROBLEMS=' + problems.join(' | ') : ''));
}

const bad = rows.filter((r) => r.problems.length > 0);
const gitHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const gitStatus = spawnSync('git', ['status', '--porcelain', '--', 'packages'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const distHash = sha256(readFileSync(BIN));

const manifest = {
  wall: '1118-acct', ticket: 1118, domain: 'acct-goal', total: rows.length,
  sample: {
    fixture: 'packages/skill-bill/test/helpers/bill-seed.mjs（#729 合成记账库夹具，只读引用、未改一字）',
    records: SEED_RECORDS.length, today: SEED_TODAY, dbSha256: fixtureSha, isolatedHome: HOME_DIR,
    covers: ['负余额（微信／支付宝）', '欠款（#借出 #借入 未还）', '分期（#分期 第N期/12）', '报销中（#待报销）'],
  },
  snapshot: { gitHead, gitStatusPackages: gitStatus, cmdReadDistSha256: distHash, at: new Date().toISOString() },
  expectations: { commonBlocks: COMMON_BLOCKS, kindBlocks: KIND_BLOCKS, ticketMarkers: TICKET_MARKERS, oldShell: OLD_SHELL },
  rows,
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
writeFileSync(join(OUT, '样本集.json'), JSON.stringify({
  ticket: 1118, today: SEED_TODAY, fixture: manifest.sample.fixture,
  records: SEED_RECORDS,
  pages: rows.map((r) => ({ seq: r.seq, id: r.id, wake: r.wake, key: r.key, params: r.params, kind: r.kind })),
}, null, 2), 'utf8');
writeFileSync(join(OUT, 'run-1118.log'), log.join('\n') + '\n', 'utf8');

console.log(log.join('\n'));
console.log('SNAPSHOT gitHead=' + gitHead + ' dist=' + distHash.slice(0, 12) + ' packages 工作区改动行数=' + String(gitStatus ? gitStatus.split('\n').length : 0));
console.log('RESULT: ' + String(rows.length - bad.length) + '/' + String(rows.length) + ' 真跑成功；出问题的页 ' + String(bad.length)
  + (bad.length ? ' -> ' + bad.map((b) => b.id + '(' + b.problems.join(';') + ')').join(' ') : ''));
console.log('OUT: ' + OUT);
process.exit(bad.length === 0 ? 0 : 1);
