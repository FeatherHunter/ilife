// #730 · goal 域**真出口探针**（证据件之一，可复跑）：4 条唤醒词逐条真跑 ＋ 进度条两处卡口 ＋ 三态预测。
//
// 跑法（持锁，与仓规一致）：
//   node tooling/run-locked.mjs --ticket 730 -- node docs/skills/skill-bill/t730-探针-真出口.mjs
// 它只读 `packages/skill-bill/dist/`，产物与库都落临时目录（不改工作区）；末行打 `RESULT: n/m`。
//
// 「今天」钉在 2026-09-15（`test/helpers/freeze-clock.cjs` 预载）：月底预测三态与目标期算法都要一个固定的今天，
// 否则判据随真实日期漂移（本域探针的第一版就因为真实日期跑出过「预计持平」以外的读数）。
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
const FREEZE = join(ROOT, 'packages', 'skill-bill', 'test', 'helpers', 'freeze-clock.cjs');
const OUT = mkdtempSync(join(tmpdir(), 't730-html-'));
const TODAY = '2026-09-15';

/** 一个隔离的配置基座：库与产物都落这个临时目录（#726 起落点由配置文件唯一决定）。 */
function configBase(tag) {
  const dir = mkdtempSync(join(tmpdir(), tag));
  writeFileSync(join(dir, 'bill.yaml'), 'db:\n  dir: ' + JSON.stringify(dir) + '\n', 'utf8');
  return dir;
}
function envOf(dir) {
  return { ...process.env, ILIFE_CONFIG_DIR: dir, NODE_OPTIONS: '--require ' + FREEZE, FAKE_NOW_ISO: TODAY + 'T12:00:00' };
}
function run(dir, args) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd: ROOT, encoding: 'utf8', env: envOf(dir) });
}
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

/** 跑一页并断言「exit 0 ＋ 落盘 ＋ 是整页 ＋ 字节如实」；返回 {json, text}。 */
function page(dir, args, file) {
  const r = run(dir, [...args, '--html', file]);
  check(r.status === 0, 'exit=' + r.status + ' stderr=' + String(r.stderr).slice(0, 300));
  const env0 = lastJson(r.stdout);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  check(/<!doctype html>/i.test(text), '产物非整页');
  check(text.includes('<section'), '产物没有 section');
  check(statSync(file).size === env0.delivery.bytes, '文件大小≠delivery.bytes');
  check(isAbsolute(env0.delivery.path), 'delivery.path 不是绝对路径');
  return { json: env0, text };
}
/** 上屏的正文：剔掉公共层样式段（`<style>`）、复制载荷（`data-t`）与两处「口令原文」块
 *  （`<pre>` 里的命令原文，只给看不给复制）。**判「某块在不在」一律在正文上量**——
 *  样式段里每个块位都有类名，拿整份产物判会一路假绿（本探针第一版就吃过这一发）。 */
const visible = (text) => text
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/data-t="[^"]*"/g, '')
  .replace(/<pre class="[^"]*ilife-block-pre-block-code[^"]*">[\s\S]*?<\/pre>/g, '');
const money = (n) => n.toFixed(2);

/** 一个库：先落几条账单，再逐条设预算。 */
function seed(tag, bills) {
  const dir = configBase(tag);
  for (const b of bills) {
    const r = run(dir, ['bill.record.add', '--params', P(b)]);
    check(r.status === 0, 'seed 失败：' + b.category + ' exit=' + r.status + ' ' + String(r.stderr).slice(0, 200));
  }
  return dir;
}
/** 落一条预算（真出口，不是直接写库）。 */
function setBudget(dir, params) {
  const r = run(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', ...params })]);
  check(r.status === 0, 'set-budget exit=' + r.status + ' ' + String(r.stderr).slice(0, 200));
  return lastJson(r.stdout);
}

/* ① 设定预算：缺项采集页 → 齐了回执页 → 冲突阻断页 → 确认覆盖后覆盖成功 */
const D1 = seed('t730-budget-', [
  { category: '餐饮/外卖', amount: -900, time: '2026-09-05 12:00:00', account: '支付宝', note: '午饭' },
  { category: '出行/地铁', amount: -600, time: '2026-09-08 08:00:00', account: '支付宝', note: '通勤' },
]);
step('设定预算 · 缺项出采集页（exit 0／ok:false／不写库）', () => {
  const { json, text } = page(D1, ['bill.goal.write', '--params', P({ op: 'set-budget' })], join(OUT, 'budget-collect.html'));
  check(json.data.ok === false, 'data.ok 应为 false：' + JSON.stringify(json.data));
  check(text.includes('ilife-block-param-form'), '采集页缺字段卡');
  check(text.includes('ilife-block-disclosure'), '缺项应折进折叠区');
  check(text.includes('还缺哪一项'), '缺项表缺表头');
  check(!/<nav[^>]*aria-label="页内导航"/.test(text), '过程型采集页不出页内导航');
  check(text.includes('data-page="collect"'), '采集页 data-page 应为 collect');
  check(!existsSync(join(D1, 'goals.json')), '缺项那一次不该落预算表');
  return 'bytes=' + json.delivery.bytes;
});
step('设定预算 · 齐了写库出回执页（读数／导航／明细／对账／复制区／脚注）', () => {
  const { json, text } = page(D1, ['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 2500 })], join(OUT, 'budget-receipt.html'));
  check(json.data.ok === true, 'data.ok 应为 true');
  check(json.data.receipt.affectedRows === 1, '目标表那一层应报 1 处，实得 ' + json.data.receipt.affectedRows);
  check(json.data.receipt.overwritten === null, '首次设定不该有覆盖');
  check(/<nav[^>]*aria-label="页内导航"/.test(text), '结果型回执页应出页内导航');
  check(text.includes('data-page="receipt"'), '回执页 data-page 应为 receipt');
  check(text.includes('写进去的这份预算'), '缺明细表');
  check(text.includes('对账信息'), '缺对账折叠区');
  check(text.includes('数据来源'), '缺来源脚注');
  const goals = JSON.parse(readFileSync(join(D1, 'goals.json'), 'utf8'));
  check(goals.budgets.length === 1, '预算表应落一条');
  check(goals.budgets[0].month === '2026-09' && goals.budgets[0].amount === 2500, '落盘字段不对：' + JSON.stringify(goals.budgets[0]));
  check(goals.budgets[0].category === '', '不填分类＝总预算（空串）');
  check(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(goals.budgets[0].created_at)), 'created_at 形态不对');
  return 'goals.budgets=' + goals.budgets.length;
});
step('设定预算 · 同月同类已存在出阻断页（exit 0、不写库、页上点名冲突）', () => {
  const { json, text } = page(D1, ['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3500 })], join(OUT, 'budget-conflict.html'));
  check(json.data.ok === false, '冲突应走阻断页');
  check(text.includes('同月同类预算已存在'), '页上缺冲突提示块');
  check(text.includes('2500.00'), '冲突提示没写清原来那条的金额');
  check(text.includes('确认覆盖'), '冲突提示没给出路');
  const goals = JSON.parse(readFileSync(join(D1, 'goals.json'), 'utf8'));
  check(goals.budgets.length === 1 && goals.budgets[0].amount === 2500, '冲突那一次不该写库');
  return 'ok';
});
step('设定预算 · 确认覆盖后覆盖成功（新编号、旧条不在、回执带改前对照）', () => {
  const { json, text } = page(D1, ['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3500, force: true })], join(OUT, 'budget-overwrite.html'));
  check(json.data.ok === true, '确认覆盖应写库');
  check(json.data.receipt.overwritten !== null && json.data.receipt.overwritten.amount === 2500, '回执缺被覆盖的那一条');
  check(text.includes('被这一条替掉的旧预算'), '缺覆盖结果块');
  const goals = JSON.parse(readFileSync(join(D1, 'goals.json'), 'utf8'));
  check(goals.budgets.length === 1, '覆盖＝删旧加新，仍应只剩一条，实得 ' + goals.budgets.length);
  check(goals.budgets[0].amount === 3500 && goals.budgets[0].id !== 1, '覆盖后应是新的一条（新编号）：' + JSON.stringify(goals.budgets[0]));
  return 'id=' + goals.budgets[0].id;
});
step('设定预算 · 金额非正数与月份形态不认都进阻断表', () => {
  const a = page(D1, ['bill.goal.write', '--params', P({ op: 'set-budget', amount: -5 })], join(OUT, 'budget-neg.html'));
  check(a.json.data.ok === false && a.text.includes('要写正数'), '负数金额没挡住 / 没点名');
  const b = page(D1, ['bill.goal.write', '--params', P({ op: 'set-budget', amount: 100, month: '8月' })], join(OUT, 'budget-badmonth.html'));
  check(b.json.data.ok === false && b.text.includes('年-月'), '月份形态没挡住 / 没点名');
  return 'ok';
});

/* ② 设定目标：缺项采集页 → 齐了回执页 → 截止日形态不认阻断 */
const D2 = seed('t730-saving-', [
  { category: '工资/基本工资', amount: 8000, time: '2026-09-01 09:00:00', account: '招行卡', note: '9月工资' },
]);
step('设定目标 · 缺项出采集页（目标名与金额都缺）', () => {
  const { json, text } = page(D2, ['bill.goal.write', '--params', P({ op: 'set-saving' })], join(OUT, 'saving-collect.html'));
  check(json.data.ok === false, 'data.ok 应为 false');
  check(text.includes('ilife-block-param-form'), '采集页缺字段卡');
  check(text.includes('还差 2 项'), '缺项数应为 2（目标名与金额）：' + (text.match(/还差 \d+ 项/) || ['(没找到)'])[0]);
  return 'ok';
});
step('设定目标 · 齐了写库出回执页（目标名／金额／截止日／目标数）', () => {
  const { json, text } = page(D2, ['bill.goal.write', '--params', P({ op: 'set-saving', name: '换手机', amount: 10000, deadline: '2026-12-31' })], join(OUT, 'saving-receipt.html'));
  check(json.data.ok === true, 'data.ok 应为 true');
  check(text.includes('换手机') && text.includes('10000.00') && text.includes('2026-12-31'), '回执页缺三样事实');
  const goals = JSON.parse(readFileSync(join(D2, 'goals.json'), 'utf8'));
  check(goals.savings.length === 1 && goals.savings[0].name === '换手机', '目标表没落盘');
  check(goals.savings[0].deadline === '2026-12-31', '截止日字段不对');
  return 'goals.savings=' + goals.savings.length;
});
step('设定目标 · 截止日不是真实日期进阻断表（2 月 30 这类要挡住）', () => {
  const { json, text } = page(D2, ['bill.goal.write', '--params', P({ op: 'set-saving', name: 'X', amount: 1, deadline: '2026-02-30' })], join(OUT, 'saving-badday.html'));
  check(json.data.ok === false && text.includes('年-月-日'), '坏日期没挡住 / 没点名');
  return 'ok';
});

/* ③ 看预算：一整页（读数／进度卡／占比条／口径／脚注）＋ 超支项 0 出「✓ 无」＋ 进度百分比双端夹取 */
const D3 = seed('t730-budgetview-', [
  { category: '餐饮/外卖', amount: -1200, time: '2026-09-05 12:00:00', account: '支付宝' },
  { category: '出行/地铁', amount: -300, time: '2026-09-08 08:00:00', account: '支付宝' },
]);
setBudget(D3, { month: '2026-09', amount: 2500, force: true });
step('看预算 · 一整页（读数／进度卡／占比条／口径行／导航／脚注）', () => {
  const { json, text } = page(D3, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })], join(OUT, 'budget-view.html'));
  const d = json.data;
  check(d.total === 1, '预算条数应为 1，实得 ' + d.total);
  check(d.items[0].month === '2026-09' && d.items[0].actual === 1500, '实际支出应 1500：' + JSON.stringify(d.items[0]));
  check(d.totals.budget === 2500 && d.totals.actual === 1500, '合计不对：' + JSON.stringify(d.totals));
  check(text.includes('data-page="list"'), '结果型进度页 data-page 应为 list');
  check(/<nav[^>]*aria-label="页内导航"/.test(text), '结果型页恒出页内导航');
  check(visible(text).includes('ilife-block-kpi-card'), '缺读数卡');
  check(visible(text).includes('ilife-block-kpi-card-bar-fill'), '缺读数卡里的进度条');
  check(visible(text).includes('ilife-block-dist-row'), '缺占比条');
  check(text.includes('数据来源') && text.includes('共 2 条'), '缺来源脚注或条数不对');
  return 'bytes=' + json.delivery.bytes + ' total=' + d.total;
});
step('看预算 · 超支项为 0 时写「✓ 无」而不是画一个 0', () => {
  const { text } = page(D3, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })], join(OUT, 'budget-view-nover.html'));
  check(text.includes('✓ 无'), '超支项为 0 应写「✓ 无」');
  check(text.includes('没有超支的预算'), '缺那一格的口径句');
  return 'ok';
});
step('看预算 · 超支那条：进度百分比双端夹取（条长 100%、进度 100.0%、仍写清超出多少）', () => {
  const dir = seed('t730-over-', [
    { category: '餐饮/外卖', amount: -1200, time: '2026-09-05 12:00:00', account: '支付宝' },
    { category: '餐饮/堂食', amount: -300, time: '2026-09-06 12:00:00', account: '支付宝' },
  ]);
  setBudget(dir, { month: '2026-09', amount: 1000 });
  const { text } = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })], join(OUT, 'budget-over.html'));
  check(text.includes('进度 100.0%'), '进度超过 100% 时上屏值应夹到 100.0%，实测未夹取');
  check(!text.includes('进度 150.0%'), '不该把 150% 直接上屏');
  check(text.includes('超出 500.00 元'), '夹取之后仍要说清超出多少');
  check(text.includes('已超支'), '状态徽章应为已超支');
  const width = /class="ilife-block-kpi-card-bar-fill[^"]*" style="width:(\d+(?:\.\d+)?)%"/.exec(visible(text));
  check(width !== null && Number(width[1]) <= 100, '条宽不该超过 100%：' + (width ? width[1] : '没找到条'));
  return '条宽=' + (width ? width[1] : '?') + '%';
});
step('看预算 · 口径函数自证：夹取函数对负值与超界值都收在 0–100', async () => {
  const mod = await import(pathToFileURL(join(ROOT, 'packages', 'skill-bill', 'dist', 'goal', 'pageParts.js')).href);
  check(mod.clampPct(-20) === 0, '负值应夹到 0，实得 ' + mod.clampPct(-20));
  check(mod.clampPct(180) === 100, '超界值应夹到 100，实得 ' + mod.clampPct(180));
  check(mod.clampPct(63.4) === 63.4, '区间内的值不该被动');
  return 'clampPct(-20)=0 clampPct(180)=100';
});
step('看预算 · 月底预测三态：预计超／预计省／预计持平（今天钉在 ' + TODAY + '）', () => {
  const cases = [
    ['预计超', 2500, 1500, '预计超 500.00 元'],
    ['预计省', 3500, 1500, '预计省 500.00 元'],
    ['预计持平', 3000, 1500, '预计持平'],
  ];
  for (const [label, amount, spent, want] of cases) {
    const dir = seed('t730-proj-', [
      { category: '餐饮/外卖', amount: -spent, time: '2026-09-05 12:00:00', account: '支付宝' },
    ]);
    setBudget(dir, { month: '2026-09', amount });
    const { text } = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })], join(OUT, 'proj-' + amount + '.html'));
    check(text.includes('按此节奏月底预计'), label + '：缺预测句');
    check(text.includes(want), label + '：期望「' + want + '」，产物里没有这句');
  }
  return '三态各自跑得出来';
});
step('看预算 · 过去月预测＝实际、未来月不给预测', () => {
  const dir = seed('t730-proj2-', [
    { category: '餐饮/外卖', amount: -800, time: '2026-08-05 12:00:00', account: '支付宝' },
  ]);
  setBudget(dir, { month: '2026-08', amount: 1000 });
  setBudget(dir, { month: '2026-11', amount: 1000 });
  const past = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-08' })], join(OUT, 'proj-past.html'));
  check(past.text.includes('预计省 200.00 元'), '过去月应「预测＝实际」（800 vs 1000 ⇒ 预计省 200.00）');
  check(/月底预计 800\.00 元/.test(past.text), '过去月月底预计应等于实际 800.00');
  const future = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-11' })], join(OUT, 'proj-future.html'));
  check(!future.text.includes('按此节奏月底预计'), '未来月不该给预测');
  return 'ok';
});
step('看预算 · 空表照出完整页（空态 ＋ 引导句 ＋ 脚注；不画全 0 读数卡）', () => {
  const dir = configBase('t730-empty-');
  const { json, text } = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })], join(OUT, 'budget-empty.html'));
  check(json.data.total === 0, '空表条数应为 0');
  check(text.includes('还没有设置预算'), '空库缺空态句');
  check(text.includes('就能开始'), '空态后缺引导句');
  check(text.includes('数据来源'), '空库页也要有来源脚注');
  check(!visible(text).includes('ilife-block-kpi-card'), '空态不该画读数卡（裁定 6 同判法）');
  return 'ok';
});

/* ④ 看目标：一整页（目标卡／预计达成日／月均净存／占比条）＋ 空态 */
const D4 = seed('t730-savingview-', [
  { category: '工资/基本工资', amount: 8000, time: '2026-09-01 09:00:00', account: '招行卡' },
  { category: '餐饮/外卖', amount: -1000, time: '2026-09-05 12:00:00', account: '支付宝' },
]);
step('看目标 · 一整页（读数／目标卡带进度条／预计达成日／占比条／脚注）', () => {
  const r1 = run(D4, ['bill.goal.write', '--params', P({ op: 'set-saving', name: '换手机', amount: 10000, deadline: '2027-06-30' })]);
  check(r1.status === 0, 'set-saving exit=' + r1.status + ' ' + String(r1.stderr).slice(0, 200));
  const { json, text } = page(D4, ['bill.goal.query', '--params', P({ op: 'saving' })], join(OUT, 'saving-view.html'));
  const d = json.data;
  check(d.total === 1, '目标数应为 1，实得 ' + d.total);
  check(d.items[0].saved === 7000, '期内净存应为 7000（8000 − 1000），实得 ' + d.items[0].saved);
  check(d.items[0].pct === 70, '进度应为 70，实得 ' + d.items[0].pct);
  check(d.items[0].monthly_avg === 7000, '月均净存应为 7000（只过了一个月）');
  check(text.includes('ilife-block-kpi-card-bar-fill'), '目标卡缺进度条');
  check(text.includes('预计 2026-10 达成'), '缺预计达成日：' + (text.match(/预计 \d{4}-\d{2} 达成/) || ['(没找到)'])[0]);
  check(text.includes('月均净存'), '缺月均净存');
  check(text.includes('截止前达标还需每月'), '有截止日且未达成时应给达标所需月存');
  check(text.includes('ilife-block-dist-row'), '缺占比条');
  check(/<nav[^>]*aria-label="页内导航"/.test(text), '结果型页恒出页内导航');
  check(text.includes('数据来源'), '缺来源脚注');
  return 'saved=' + d.items[0].saved + ' pct=' + d.items[0].pct;
});
step('看目标 · 已达成那个目标写「已达成」且不再给预计达成日', () => {
  const dir = seed('t730-done-', [
    { category: '工资/基本工资', amount: 9000, time: '2026-09-01 09:00:00', account: '招行卡' },
  ]);
  const r1 = run(dir, ['bill.goal.write', '--params', P({ op: 'set-saving', name: '旅行基金', amount: 5000, deadline: '2026-12-31' })]);
  check(r1.status === 0, 'set-saving exit=' + r1.status);
  const { json, text } = page(dir, ['bill.goal.query', '--params', P({ op: 'saving' })], join(OUT, 'saving-done.html'));
  check(json.data.done_count === 1, '已完成数应为 1');
  check(json.data.items[0].status === 'done', '状态应为 done，实得 ' + json.data.items[0].status);
  check(text.includes('目标已达成'), '缺「目标已达成」那句');
  check(!text.includes('截止前达标还需每月'), '已达成不该再给达标所需月存');
  return 'status=done';
});
step('看目标 · 空表照出完整页（空态 ＋ 引导句 ＋ 脚注）', () => {
  const dir = configBase('t730-empty2-');
  const { text } = page(dir, ['bill.goal.query', '--params', P({ op: 'saving' })], join(OUT, 'saving-empty.html'));
  check(text.includes('还没有储蓄目标'), '空库缺空态句');
  check(text.includes('就能开始'), '空态后缺引导句');
  check(text.includes('数据来源'), '空库页也要有来源脚注');
  check(!visible(text).includes('ilife-block-kpi-card'), '空态不该画读数卡');
  return 'ok';
});

/* ⑤ 判据③：#688 裁定 1／2／4／6／7／9／11／12 的可判形式逐条（同一批产物上量） */
step('裁定 1 · 可见文本 grep 内部标识全 0 命中（复制载荷区与口令原文除外）', () => {
  const files = ['budget-view.html', 'budget-receipt.html', 'saving-view.html', 'saving-receipt.html', 'budget-empty.html'];
  const hits = [];
  for (const f of files) {
    const text = visible(readFileSync(join(OUT, f), 'utf8'));
    for (const re of [/bill\./g, /\.py\b/g, /scripts\//g, /goals\.json/g, /undefined/g, /NaN/g]) {
      const n = [...text.matchAll(re)].length;
      if (n > 0) hits.push(f + ' ' + re + '×' + n);
    }
  }
  check(hits.length === 0, '可见文本里出现内部标识：' + JSON.stringify(hits));
  return files.length + ' 张页 0 命中';
});
step('裁定 2 · 结果型页三条恒出：页内导航（1 个）＋ 口径说明行 ＋ 来源脚注', () => {
  for (const f of ['budget-view.html', 'saving-view.html', 'budget-receipt.html', 'saving-receipt.html']) {
    const text = readFileSync(join(OUT, f), 'utf8');
    const nav = [...text.matchAll(/<nav[^>]*aria-label="页内导航"/g)].length;
    check(nav === 1, f + '：页内导航应恰 1 个，实得 ' + nav);
    check(text.includes('ilife-block-caliber'), f + '：缺口径说明行');
    check(/数据来源 · .+ · .+ → .+ · 共 \d+ 条/.test(text), f + '：缺来源脚注或形态不对');
  }
  return '4 张结果型页三条齐';
});
step('裁定 4 · 缺值写「—」；全产物 grep 不到字面 undefined／NaN', () => {
  const files = ['budget-view.html', 'saving-view.html', 'budget-collect.html', 'saving-collect.html', 'budget-receipt.html'];
  for (const f of files) {
    const text = readFileSync(join(OUT, f), 'utf8');
    check(!/\bundefined\b/.test(text), f + '：出现字面 undefined');
    check(!/\bNaN\b/.test(text), f + '：出现字面 NaN');
  }
  return files.length + ' 张页 0 命中';
});
step('裁定 6 · 采集页不画「同形空卡」：缺项时没有读数卡网格', () => {
  const text = readFileSync(join(OUT, 'budget-collect.html'), 'utf8');
  check(!visible(text).includes('ilife-block-kpi-card'), '采集页不该出读数卡');
  check(!visible(text).includes('未给'), '采集页不该出现「未给」空卡');
  check(visible(text).includes('ilife-block-param-form'), '缺项标签与字段卡要在');
  check(visible(text).includes('ilife-block-disclosure'), '缺项阻断条要在');
  return 'ok';
});
step('裁定 7 · 一个形状一处定义：产物 `<style` 命中 1；装配件里 0 色值／0 断点', () => {
  const text = readFileSync(join(OUT, 'budget-view.html'), 'utf8');
  const styles = [...text.matchAll(/<style/g)].length;
  check(styles === 1, '产物样式段应恰 1 处，实得 ' + styles);
  const dir = join(ROOT, 'packages', 'skill-bill', 'src', 'goal');
  const files = ['pageParts.ts', 'template-form.ts', 'template-progress.ts', 'scene-budget.ts', 'scene-saving.ts', 'scene-set-budget.ts', 'scene-set-saving.ts'];
  const bad = [];
  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf8');
    const noComment = src.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const re of [/#[0-9a-fA-F]{3,6}\b/g, /rgb\(/g, /hsl\(/g, /@media/g]) {
      const n = [...noComment.matchAll(re)].length;
      if (n > 0) bad.push(f + ' ' + re + '×' + n);
    }
  }
  check(bad.length === 0, '页面装配件里出现色值／断点：' + JSON.stringify(bad));
  return 'style=1 色值/断点 0 命中';
});
step('裁定 9 · 缺项时那条写库口令只给看不给复制（任何 data-t 都不含占位符形态）', () => {
  const text = readFileSync(join(OUT, 'budget-collect.html'), 'utf8');
  check(text.includes('口令原文（只给看不给复制）'), '缺项折叠里应有那条口令');
  check(/<pre class="[^"]*ilife-block-pre-block-code[^"]*">[^<]*&lt;金额&gt;/.test(text), '那条口令应是占位符形态（不给可跑的值）');
  check(!/data-t="[^"]*&lt;/.test(text), '复制载荷里不该出现占位符形态的指令（缺什么就不给复制）');
  const fold = /<details class="ilife-block ilife-block-disclosure"[\s\S]*?<\/details>/.exec(text);
  check(fold !== null, '缺项阻断折叠区不在产物里');
  check(!/<button/.test(fold[0]), '缺项折叠里那条口令不该带复制按钮');
  return 'ok';
});
step('裁定 11 · 结果型页不出独立页脚按钮组（本域不触达撤销出口那一半）', () => {
  for (const f of ['budget-view.html', 'saving-view.html', 'budget-receipt.html', 'saving-receipt.html']) {
    const text = readFileSync(join(OUT, f), 'utf8');
    check(!/<footer[\s\S]{0,2000}?<button/i.test(text), f + '：页脚里出现按钮');
    check(!/undoExit|撤销这一笔/.test(text), f + '：本域结果页不该有撤销出口');
  }
  return '4 张结果型页无页脚按钮';
});
step('裁定 12 · 禁入 token 与深色区全 0 命中；主色未被改写', () => {
  const files = ['budget-view.html', 'saving-view.html', 'budget-receipt.html', 'saving-receipt.html', 'budget-collect.html'];
  for (const f of files) {
    const text = readFileSync(join(OUT, f), 'utf8');
    for (const token of ['--r-xl', '--pink', '[data-theme', 'prefers-color-scheme: dark']) {
      check(!text.includes(token), f + '：出现禁入 token ' + token);
    }
  }
  const css = readFileSync(join(OUT, 'budget-view.html'), 'utf8');
  check(css.includes('#007aff'), '主色 B1（--blue:#007aff）应在样式段里');
  return '5 张页 0 命中';
});
step('裁定 8 · 一命令一页：每条命令自己的 data-page／data-slot／data-key', () => {
  const collect = readFileSync(join(OUT, 'budget-collect.html'), 'utf8');
  const receipt = readFileSync(join(OUT, 'budget-receipt.html'), 'utf8');
  const view = readFileSync(join(OUT, 'budget-view.html'), 'utf8');
  check(collect.includes('data-page="collect"') && collect.includes('data-key="goal.write"'), '采集页标记不对');
  check(receipt.includes('data-page="receipt"') && receipt.includes('data-key="goal.write"'), '回执页标记不对');
  check(view.includes('data-page="list"') && view.includes('data-slot="ilife:bill:list"') && view.includes('data-key="goal.query"'), '进度页标记不对');
  return 'collect／receipt／list 三态各自到位';
});

/* ⑥ 命令面与路由层：两条键进注册表、四条词路由到本域 */
await (async () => {
  total += 1;
  try {
    const reg = await import(pathToFileURL(join(ROOT, 'packages', 'skill-bill', 'dist', 'cli', 'registry.js')).href);
    const shapes = await import(pathToFileURL(join(ROOT, 'packages', 'skill-bill', 'dist', 'index.js')).href);
    for (const key of ['bill.goal.write', 'bill.goal.query']) {
      check(reg.REGISTRY_KEYS.includes(key), key + ' 没进注册表');
      check(shapes.BILL_KEY_SHAPES[key] === reg.REGISTRY[key].shape, key + ' 的形状须由注册表派生');
    }
    check(reg.REGISTRY['bill.goal.write'].shape === 'receipt', '写命令形状应为 receipt');
    check(reg.REGISTRY['bill.goal.query'].shape === 'list', '读命令形状应为 list');
    const wake = await import(pathToFileURL(join(ROOT, 'packages', 'skill-bill', 'dist', 'triggers', 'wakeTable.js')).href);
    const ctx = { amount: 1, name: 'X' };
    for (const [word, key] of [['设定预算', 'bill.goal.write'], ['看预算', 'bill.goal.query'], ['设定目标', 'bill.goal.write'], ['看目标', 'bill.goal.query']]) {
      check(wake.routeWakeword(word, ctx).key === key, word + ' 没路由到 ' + key);
    }
    check(wake.projectWakeWord({ key: 'bill.goal.write', op: 'set-budget' }) === '设定预算', '写命令第一支代表词不对');
    check(wake.projectWakeWord({ key: 'bill.goal.query', op: 'budget' }) === '看预算', '读命令第一支代表词不对');
    pass += 1;
    out.push('PASS 命令面与路由层 · 两条键进注册表 ＋ 4 条词逐条路由 ｜ 4/4');
  } catch (e) {
    out.push('FAIL 命令面与路由层 ｜ ' + (e && e.message ? e.message : String(e)));
  }
})();

/* ⑦ 读数：本域 6 张页的字节与行数（对账 T6 §3 第 10–11 行那两条键的「16 行空壳页」改前读数） */
step('读数 · 本域 6 张页的字节与行数（写 2 张 ＋ 读 4 张）', () => {
  const files = [
    'budget-collect.html', 'budget-receipt.html', 'saving-collect.html', 'saving-receipt.html',
    'budget-view.html', 'saving-view.html',
  ];
  const parts = files.map((f) => {
    const text = readFileSync(join(OUT, f), 'utf8');
    return f.replace('.html', '') + '=' + statSync(join(OUT, f)).size + 'B/' + (text.split('\n').length - 1) + 'LF';
  });
  for (const p of parts) check(!/=\d+B\/16LF$/.test(p), '还是 16 行空壳页：' + p);
  return parts.join(' ');
});

console.log(out.join('\n'));
console.log('RESULT: ' + pass + '/' + total);
process.exit(pass === total ? 0 : 1);
