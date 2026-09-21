// #691 · account 域**真出口探针**（evidence 件之一，可复跑）：4 条唤醒词逐条真跑 ＋ 转账双写与边界。
//
// 跑法（持锁，与仓规一致）：
//   node tooling/run-locked.mjs --ticket 691 -- node docs/skills/skill-bill/t691-探针-真出口.mjs
// 它只读 `packages/skill-bill/dist/`，产物与库都落临时目录（不改工作区）；末行打 `RESULT: n/m`。
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** 仓根：从本件往上找到含 `packages/skill-bill` 的那一层（本件住 docs/skills/skill-bill/）。 */
function repoRoot(from) {
  let dir = from;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'packages', 'skill-bill', 'package.json'))) return dir;
    dir = dirname(dir);
  }
  throw new Error('找不到仓根（没有 packages/skill-bill）：' + from);
}

const ROOT = repoRoot(dirname(fileURLToPath(import.meta.url)));
const BIN = join(ROOT, 'packages', 'skill-bill', 'dist', 'cli', 'cmd_read.js');
const DB = mkdtempSync(join(tmpdir(), 't691-db-'));
const OUT = mkdtempSync(join(tmpdir(), 't691-html-'));

// 配置基座：库落临时目录（#726 起落点由配置文件唯一决定，环境变量已退役；#754 起配置只落 <家>/.ilife）
mkdirSync(join(DB, '.ilife'), { recursive: true });
writeFileSync(join(DB, '.ilife', 'bill.yaml'), 'db:\n  dir: ' + JSON.stringify(DB) + '\n', 'utf8');
const env = { ...process.env, USERPROFILE: DB, HOME: DB};

const run = (args) => spawnSync(process.execPath, [BIN, ...args], { cwd: ROOT, encoding: 'utf8', env });
const P = (o) => JSON.stringify(o);
const lastJson = (s) => JSON.parse(String(s || '').trim().split(/\r?\n/).filter(Boolean).pop());

let pass = 0;
let total = 0;
const out = [];
function step(name, fn) {
  total += 1;
  try {
    const detail = fn();
    pass += 1;
    out.push('PASS ' + name + (detail ? ' ｜ ' + detail : ''));
  } catch (e) {
    out.push('FAIL ' + name + ' ｜ ' + (e && e.message ? e.message : String(e)));
  }
}
function check(cond, msg) { if (!cond) throw new Error(msg); }

function page(args, file) {
  const r = run([...args, '--html', file]);
  check(r.status === 0, 'exit=' + r.status + ' stderr=' + String(r.stderr).slice(0, 300));
  const env0 = lastJson(r.stdout);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  check(/<!doctype html>/i.test(text), '产物非整页');
  check(text.includes('<section'), '产物没有 section');
  check(statSync(file).size === env0.delivery.bytes, '文件大小≠delivery.bytes');
  check(isAbsolute(env0.delivery.path), 'delivery.path 不是绝对路径');
  return { json: env0, text };
}

/* ① 新增账户（采集页 → 填好 → 回执页） */
step('新增账户 · 缺项出采集页（exit 0／ok:false／不写库）', () => {
  const { json, text } = page(['bill.account.write', '--params', P({ op: 'add' })], join(OUT, 'add-collect.html'));
  check(json.data.ok === false, 'data.ok 应为 false：' + JSON.stringify(json.data));
  check(text.includes('ilife-block-param-form'), '采集页缺字段卡');
  check(text.includes('ilife-block-disclosure'), '缺项应折进折叠区');
  check(!/<nav[^>]*aria-label="页内导航"/.test(text), '采集页不该出页内导航（块位样式表里出现类名不算）');
  check(text.includes('数据来源'), '缺来源脚注');
  return 'bytes=' + json.delivery.bytes;
});
step('新增账户 · 齐了写库出回执页', () => {
  const { json, text } = page(['bill.account.write', '--params', P({ op: 'add', name: '招行卡', type: '银行卡' })], join(OUT, 'add-receipt.html'));
  check(json.data.ok === true, 'data.ok 应为 true');
  check(json.data.receipt.affectedRows === 1, '改动处数应为 1（账户表一处），实得 ' + json.data.receipt.affectedRows);
  check(text.includes('招行卡') && text.includes('银行卡'), '回执页缺账户名／类型');
  check(/<nav[^>]*aria-label="页内导航"/.test(text), '回执页应出页内导航');
  const goals = JSON.parse(readFileSync(join(DB, 'goals.json'), 'utf8'));
  check(goals.accounts.length === 1 && goals.accounts[0].name === '招行卡', '账户表没落盘：' + JSON.stringify(goals.accounts));
  check(goals.accounts[0].disabled === false && goals.accounts[0].type === '银行卡', '账户字段不对');
  check(typeof goals.accounts[0].created_at === 'string' && goals.accounts[0].created_at.length === 19, 'created_at 缺或形态不对');
  return 'goals.accounts=' + goals.accounts.length;
});
step('新增账户 · 重名出阻断页（exit 0、不写库）', () => {
  const { json, text } = page(['bill.account.write', '--params', P({ op: 'add', name: '招行卡' })], join(OUT, 'add-dup.html'));
  check(json.data.ok === false, '重名应走阻断页');
  check(text.includes('已经有这个名字了'), '阻断没点名重名');
  const goals = JSON.parse(readFileSync(join(DB, 'goals.json'), 'utf8'));
  check(goals.accounts.length === 1, '重名不该写库');
  return 'ok';
});

/* ② 账户转账（采集页 → 落两笔 → 回执页） */
step('账户转账 · 缺项出采集页（含「将执行以下操作」预览）', () => {
  const { json, text } = page(['bill.account.write', '--params', P({ op: 'transfer' })], join(OUT, 'transfer-collect.html'));
  check(json.data.ok === false, 'data.ok 应为 false');
  check(text.includes('将执行以下操作'), '转账采集页缺操作预览');
  check(text.includes('转账/转出') && text.includes('转账/转入'), '预览没写清两笔的分类');
  return 'bytes=' + json.delivery.bytes;
});
step('账户转账 · 齐了落两笔出回执页', () => {
  const { json, text } = page(['bill.account.write', '--params', P({ op: 'transfer', amount: 500, from: '支付宝', to: '招行卡' })], join(OUT, 'transfer-receipt.html'));
  check(json.data.receipt.affectedRows === 2, '影响行数应为 2（两笔），实得 ' + json.data.receipt.affectedRows);
  check(text.includes('两笔分录'), '回执页缺两笔分录块');
  const before = run(['bill.account.query']);
  check(before.status === 0, 'query exit=' + before.status);
  const totals = lastJson(before.stdout).data.totals;
  check(totals.transfer_count === 2, '转账笔数应为 2，实得 ' + totals.transfer_count);
  check(totals.income === 0 && totals.expense === 0, '转账不该进收支：income=' + totals.income + ' expense=' + totals.expense);
  check(totals.balance === 0, '两账户一增一减，总余额应为 0，实得 ' + totals.balance);
  const codes = run(['bill.record.range', '--params', P({ start: '2000-01-01', end: '2999-12-31' })]);
  const kpi = lastJson(codes.stdout).data.kpi;
  check(kpi.count === 0, '转账不该进收支统计（kpi.count 应为 0，实得 ' + kpi.count + '）');
  return 'transfer_count=' + totals.transfer_count + ' balance=' + totals.balance;
});
step('账户转账 · 金额非正数／两账户相同都进阻断表', () => {
  const a = page(['bill.account.write', '--params', P({ op: 'transfer', amount: -5, from: 'A', to: 'B' })], join(OUT, 'transfer-neg.html'));
  check(a.json.data.ok === false && a.text.includes('要写正数'), '负数金额没挡住 / 没点名');
  const b = page(['bill.account.write', '--params', P({ op: 'transfer', amount: 5, from: 'A', to: 'A' })], join(OUT, 'transfer-same.html'));
  check(b.json.data.ok === false && b.text.includes('要和转出账户不同'), '同账户没挡住 / 没点名');
  return 'ok';
});

/* ③ 改账户（确认页 → 改名 → 回执页带改前改后与级联读数） */
step('改账户 · 缺「改成什么」出确认页', () => {
  const { json, text } = page(['bill.account.write', '--params', P({ op: 'update', name: '招行卡' })], join(OUT, 'update-confirm.html'));
  check(json.data.ok === false, 'data.ok 应为 false');
  check(text.includes('改成什么'), '确认页缺「改成什么」那一格');
  check(text.includes('要改的就是这个账户'), '确认页没回显原账户');
  return 'bytes=' + json.delivery.bytes;
});
step('改账户 · 认不出来的账户出空态与账户表', () => {
  const { text } = page(['bill.account.write', '--params', P({ op: 'update', name: '不存在的卡', 'new-name': 'X' })], join(OUT, 'update-missing.html'));
  check(text.includes('这个账户认不出来'), '没出空态');
  check(text.includes('账户表里挑一个'), '没出账户表');
  return 'ok';
});
step('改账户 · 改名写库出回执页（级联历史流水）', () => {
  const { json, text } = page(['bill.account.write', '--params', P({ op: 'update', name: '招行卡', 'new-name': '招行工资卡' })], join(OUT, 'update-receipt.html'));
  check(json.data.ok === true, 'data.ok 应为 true');
  check(json.data.receipt.renamedRows === 1, '级联改名笔数应为 1（招行卡那一笔转入），实得 ' + json.data.receipt.renamedRows);
  check(text.includes('改了什么'), '回执页缺改前改后对照');
  check(text.includes('招行卡') && text.includes('招行工资卡'), '对照没写清原值新值');
  const goals = JSON.parse(readFileSync(join(DB, 'goals.json'), 'utf8'));
  check(goals.accounts[0].name === '招行工资卡', '账户表没改名');
  const d = lastJson(run(['bill.account.query']).stdout).data;
  const card = d.items.find((x) => x.name === '招行工资卡');
  check(card !== undefined, '汇总里没有改名后的账户');
  check(card.balance === 500, '改名后余额应为 500，实得 ' + card.balance);
  check(d.totals.disabled_count === 0, '停用数应为 0');
  return 'renamed=' + json.data.receipt.renamedRows + ' balance=' + card.balance;
});
step('改账户 · 停用与启用', () => {
  const off = page(['bill.account.write', '--params', P({ op: 'update', name: '招行工资卡', disable: true })], join(OUT, 'update-disable.html'));
  check(off.json.data.ok === true, '停用应写库');
  let d = lastJson(run(['bill.account.query']).stdout).data;
  check(d.totals.disabled_count === 1 && d.totals.disabled_accounts[0] === '招行工资卡', '停用没进 disabled_accounts');
  check(d.totals.disabled_balance === 500, '停用余额应单列 500，实得 ' + d.totals.disabled_balance);
  check(d.totals.balance === -500, '停用后总余额只算活跃账户（支付宝 −500），实得 ' + d.totals.balance);
  const on = page(['bill.account.write', '--params', P({ op: 'update', name: '招行工资卡', enable: true })], join(OUT, 'update-enable.html'));
  check(on.json.data.ok === true, '启用应写库');
  d = lastJson(run(['bill.account.query']).stdout).data;
  check(d.totals.disabled_count === 0, '启用后不该还有停用账户：' + d.totals.disabled_count);
  check(d.totals.balance === 0, '启用后总余额＝支付宝 −500 ＋ 招行工资卡 ＋500 ＝ 0，实得 ' + d.totals.balance);
  return 'ok';
});

/* ④ 看账户汇总（结果型 ⑥） */
step('看账户汇总 · 一整页（读数／账户卡／占比条／流水／导航／脚注）', () => {
  const { json, text } = page(['bill.account.query'], join(OUT, 'summary.html'));
  const d = json.data;
  check(d.total === 2, '账户数应为 2（支付宝 ＋ 招行工资卡），实得 ' + d.total);
  check(d.items.some((x) => x.name === '支付宝' && x.registered === false), '未登记账户应自动暴露且 registered=false');
  check(/<nav[^>]*aria-label="页内导航"/.test(text), '汇总页应出页内导航');
  check(text.includes('各账户余额'), '缺账户卡区');
  check(text.includes('ilife-block-dist-row'), '缺占比条');
  check(text.includes('最近流水'), '缺流水表');
  check(text.includes('数据来源'), '缺来源脚注');
  const vis = text.replace(/data-t="[^"]*"/g, '');
  const hits = [/bill\./g, /\.py/g, /scripts\//g, /undefined/g, /NaN/g].map((re) => ({ re: String(re), n: [...vis.matchAll(re)].length })).filter((h) => h.n > 0);
  check(hits.length === 0, '可见文本里出现内部标识／脚本路径：' + JSON.stringify(hits));
  return 'total=' + d.total + ' bytes=' + json.delivery.bytes;
});
step('看账户汇总 · 空库照出完整页（空态 ＋ 引导句 ＋ 脚注）', () => {
  const EMPTY = mkdtempSync(join(tmpdir(), 't691-empty-'));
  mkdirSync(join(EMPTY, '.ilife'), { recursive: true });
  writeFileSync(join(EMPTY, '.ilife', 'bill.yaml'), 'db:\n  dir: ' + JSON.stringify(EMPTY) + '\n', 'utf8');
  const file = join(OUT, 'summary-empty.html');
  const r = spawnSync(process.execPath, [BIN, 'bill.account.query', '--html', file], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, USERPROFILE: EMPTY, HOME: EMPTY} });
  check(r.status === 0, '空库 exit=' + r.status);
  const text = readFileSync(file, 'utf8');
  check(/<!doctype html>/i.test(text) && text.includes('数据来源'), '空库页不完整');
  check(text.includes('账户表还是空的') || text.includes('还没有流水'), '空库缺空态句');
  check(text.includes('先说「新增账户」') || text.includes('先说「记支出」'), '空态缺引导句');
  return 'ok';
});

/* ⑤ 路由层：4 条唤醒词都路由到账户域，且代表词算得出来 */
total += 1;
try {
  const m = await import(pathToFileURL(join(ROOT, 'packages', 'skill-bill', 'dist', 'triggers', 'wakeTable.js')).href);
  const ctx = { name: '招行卡', amount: 1, from: 'A', to: 'B' };
  const want = [['新增账户', 'bill.account.write'], ['改账户', 'bill.account.write'], ['账户转账', 'bill.account.write'], ['看账户汇总', 'bill.account.query']];
  for (const [w, k] of want) {
    const hit = m.routeWakeword(w, ctx);
    check(hit.key === k, w + ' → ' + hit.key + '，不是 ' + k);
  }
  check(m.projectWakeWord({ key: 'bill.account.write', op: 'add' }) === '新增账户', 'add 代表词不对');
  check(m.projectWakeWord({ key: 'bill.account.query' }) === '看账户汇总', 'query 代表词不对');
  pass += 1;
  out.push('PASS 路由层 · 4 条唤醒词逐条路由到本域命令 ｜ 4/4');
} catch (e) {
  out.push('FAIL 路由层 · 4 条唤醒词逐条路由到本域命令 ｜ ' + (e && e.message ? e.message : String(e)));
}

console.log(out.join('\n'));
console.log('RESULT: ' + pass + '/' + total);
process.exit(pass === total ? 0 : 1);
