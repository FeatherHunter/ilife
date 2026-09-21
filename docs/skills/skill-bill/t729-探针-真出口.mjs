// #729 · analysis 域**真出口探针**（证据件之一，可复跑）：25 条唤醒词逐条真跑 ＋ 逐条读数对照。
//
// 跑法（持锁，与仓规一致）：
//   node tooling/run-locked.mjs --ticket 729 -- node docs/skills/skill-bill/t729-探针-真出口.mjs
// 它只读 `packages/skill-bill/dist/`；产物与库都落临时目录（不改工作区）；末行打 `RESULT: n/m`。
//
// 每条场景查三档：
//   ① **机器面**：exit 0、产物落盘、`文件字节 = delivery.bytes`、整页（`<!doctype html>` ＋ `<section`）；
//   ② **页面骨架**（#688 §四 裁定 1／2／4／7／11／12 的可判形式）：可见文本里没有内部标识与脚本路径、
//      没有 `undefined`／`NaN`、恰好一个页内导航块、有一行来源脚注、有复制区、页脚没有按钮、
//      没有禁入色／深色区标记；
//   ③ **读数**：这一条场景自己那句断言（读页面上的数，与 `test/helpers/bill-seed.mjs` 的夹具手算值比）。
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_TODAY, seedBillDb } from '../../../packages/skill-bill/test/helpers/bill-seed.mjs';

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
const CFG = mkdtempSync(join(tmpdir(), 't729-cfg-'));
mkdirSync(join(CFG, '.ilife'), { recursive: true }); // #754：配置落 <家>/.ilife，写之前目录得在
const OUT = mkdtempSync(join(tmpdir(), 't729-html-'));

// 配置基座（#726 起落点由配置文件唯一决定）＋ 合成库 ＋ 钉钟（窗口类场景全部以 SEED_TODAY 为「今天」）。
writeFileSync(join(CFG, '.ilife', 'bill.yaml'), 'db:\n  dir: ' + JSON.stringify(CFG) + '\n', 'utf8');
seedBillDb(CFG);
const env = {
  ...process.env,
  USERPROFILE: CFG, HOME: CFG,
  NODE_OPTIONS: '--require ' + FREEZE,
  FAKE_NOW_ISO: SEED_TODAY + 'T12:00:00',
};

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

/** 上屏正文（剔掉复制载荷区：`bill.` 只许住在那里——README／R4 收口）。 */
const visible = (text) => text.replace(/data-t="[^"]*"/g, '');

/** 跑一页并查机器面 ＋ 页面骨架，返回 { json, text, page }。 */
function page(key, params, name) {
  const file = join(OUT, name + '.html');
  const r = run([key, '--params', P(params), '--html', file]);
  check(r.status === 0, 'exit=' + r.status + ' stderr=' + String(r.stderr).slice(0, 400));
  const json = lastJson(r.stdout);
  check(existsSync(file), '产物没落盘：' + file);
  check(isAbsolute(json.delivery.path), 'delivery.path 不是绝对路径');
  check(resolve(json.delivery.path) === resolve(file), 'delivery.path 与 --html 给的路径不一致');
  const text = readFileSync(file, 'utf8');
  check(statSync(file).size === json.delivery.bytes, '文件字节 ≠ delivery.bytes');
  check(/<!doctype html>/i.test(text), '产物不是整页（缺 doctype）');
  check(text.includes('<section'), '产物没有 section');
  const vis = visible(text);
  for (const [name2, re] of [['bill.', /bill\./g], ['.py', /\.py/g], ['scripts/', /scripts\//g], ['undefined', /undefined/g], ['NaN', /NaN/g]]) {
    const n = [...vis.matchAll(re)].length;
    check(n === 0, '可见文本里出现 ' + name2 + ' ×' + String(n));
  }
  const toc = [...vis.matchAll(/<nav[^>]*aria-label="页内导航"/g)].length;
  check(toc === 1, '页内导航块应恰好 1 个（#688 裁定 2），实得 ' + String(toc));
  check(vis.includes('数据来源'), '缺来源脚注（#688 裁定 2）');
  check(/ilife-block-caliber/.test(vis), '缺口径说明行／来源脚注（#688 裁定 2）');
  for (const [name2, re] of [['--r-xl', /--r-xl/g], ['--pink', /--pink/g], ['[data-theme', /\[data-theme/g], ['深色区', /prefers-color-scheme:\s*dark/g]]) {
    const n = [...vis.matchAll(re)].length;
    check(n === 0, '禁入项命中：' + name2 + ' ×' + String(n) + '（#688 裁定 12）');
  }
  return { json, text: vis, raw: text };
}

/** 页面里有没有这句话（可见文本）。 */
const has = (text, needle) => check(text.includes(needle), '页面上找不到「' + needle + '」');

/* ── 汇总 4（bill.analysis.overview · 读数＋条）────────────────────────────────── */
step('看月度 · 2026-05 读数与夹具手算值一致', () => {
  const { json, text } = page('bill.analysis.overview', { kind: 'monthly', month: '2026-05' }, 'monthly');
  has(text, '5640.20');
  has(text, '13759.00');
  has(text, '8118.80');
  has(text, '14');
  check(json.data.metrics.expense === 5640.2, 'metrics.expense=' + String(json.data.metrics.expense));
  check(json.data.metrics.count === 14, 'metrics.count=' + String(json.data.metrics.count));
  return 'bytes=' + json.delivery.bytes;
});
step('看年度 · 2026 全年读数', () => {
  const { json, text } = page('bill.analysis.overview', { kind: 'yearly', year: 2026 }, 'yearly');
  has(text, '2026');
  return 'bytes=' + json.delivery.bytes;
});
step('看总览 · 2026-05-01~05-31', () => {
  const { json } = page('bill.analysis.overview', { kind: 'overview', start: '2026-05-01', end: '2026-05-31' }, 'overview');
  return 'bytes=' + json.delivery.bytes;
});
step('看周报 · 本周 vs 上周', () => {
  const { json, text } = page('bill.analysis.overview', { kind: 'week' }, 'week');
  has(text, '06/08');
  return 'bytes=' + json.delivery.bytes;
});
step('看分类 · 2026-05', () => {
  const { json, text } = page('bill.analysis.overview', { kind: 'category', month: '2026-05' }, 'category');
  has(text, '餐饮');
  return 'bytes=' + json.delivery.bytes;
});
step('看账户 · 2026-05', () => {
  const { json, text } = page('bill.analysis.overview', { kind: 'account', month: '2026-05' }, 'account');
  has(text, '支付宝');
  return 'bytes=' + json.delivery.bytes;
});
step('看账本 · 2026-05', () => {
  const { json, text } = page('bill.analysis.overview', { kind: 'ledger', month: '2026-05' }, 'ledger');
  has(text, '旅行');
  return 'bytes=' + json.delivery.bytes;
});
step('看结构 · 2026-05', () => {
  const { json } = page('bill.analysis.overview', { kind: 'structure', month: '2026-05' }, 'structure');
  return 'bytes=' + json.delivery.bytes;
});
step('做统计 · 全库', () => {
  const { json, text } = page('bill.analysis.overview', { kind: 'stats' }, 'stats');
  has(text, String(39));
  return 'bytes=' + json.delivery.bytes;
});

/* ── 对比 4（bill.analysis.compare · 对比＋变更）──────────────────────────────── */
step('看对比 · 5 月 vs 4 月', () => {
  const { json } = page('bill.analysis.compare', { kind: 'period', monthA: '2026-05', monthB: '2026-04' }, 'compare');
  return 'bytes=' + json.delivery.bytes;
});
step('看双区间 · 4 月 vs 5 月', () => {
  const { json } = page('bill.analysis.compare', { kind: 'range', startA: '2026-04-01', endA: '2026-04-30', startB: '2026-05-01', endB: '2026-05-31' }, 'range-compare');
  return 'bytes=' + json.delivery.bytes;
});
step('看同比 · 2026-05 vs 2025-05', () => {
  const { json, text } = page('bill.analysis.compare', { kind: 'yoy', month: '2026-05' }, 'yoy');
  has(text, '2025-05');
  return 'bytes=' + json.delivery.bytes;
});
step('看分类对比 · 4 月 vs 5 月', () => {
  const { json } = page('bill.analysis.compare', { kind: 'category', startA: '2026-04-01', endA: '2026-04-30', startB: '2026-05-01', endB: '2026-05-31' }, 'cat-compare');
  return 'bytes=' + json.delivery.bytes;
});

/* ── 趋势 2 ＋ 金额 3 ＋ 统计洞察 4（bill.analysis.trend）──────────────────────── */
step('看趋势 · 近 6 个月（含空月：图里不出点、口径句点名）', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'trend', months: 6 }, 'trend');
  has(text, 'ilife-chart');
  return 'bytes=' + json.delivery.bytes;
});
step('看分类趋势 · 餐饮 近 6 个月', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'category', category: '餐饮', months: 6 }, 'cat-trend');
  has(text, '餐饮');
  return 'bytes=' + json.delivery.bytes;
});
step('看大额 · TOP 5', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'top', limit: 5 }, 'top');
  has(text, '2599.00');
  return 'bytes=' + json.delivery.bytes;
});
step('看高频 · TOP 5（按 L1 分类的笔数排，不是全路径）', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'frequent', limit: 5 }, 'frequent');
  // 夹具里 L1「餐饮」共 10 笔（外卖 9 ＋ 聚餐 1）、支出合计 845.50——老侧 `cmd_top_freq` 也是按 L1 归堆。
  has(text, '餐饮');
  has(text, '845.50');
  return 'bytes=' + json.delivery.bytes;
});
step('看分布 · 2026-05 支出五档', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'distribution', month: '2026-05' }, 'distribution');
  has(text, '500 以上');
  return 'bytes=' + json.delivery.bytes;
});
step('看活跃 · 周几与时段', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'activity' }, 'activity');
  has(text, '周一');
  return 'bytes=' + json.delivery.bytes;
});
step('看洞察 · 近 6 个月', () => {
  const { json } = page('bill.analysis.trend', { kind: 'insight', months: 6 }, 'insight');
  return 'bytes=' + json.delivery.bytes;
});
step('看异常 · 近 6 个月', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'anomaly', months: 6 }, 'anomaly');
  has(text, '环比');
  return 'bytes=' + json.delivery.bytes;
});

/* ── 状态聚合 4（bill.analysis.trend · 读数＋表）──────────────────────────────── */
step('看借贷 · 未还合计与对象列表', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'debt' }, 'debt');
  has(text, '2000.00');
  has(text, '张三');
  return 'bytes=' + json.delivery.bytes;
});
step('看报销 · 待报销与已到账', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'reimburse' }, 'reimburse');
  has(text, '760.00');
  return 'bytes=' + json.delivery.bytes;
});
step('看分期 · 手机 12 期进行中', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'installment' }, 'installment');
  has(text, '手机');
  return 'bytes=' + json.delivery.bytes;
});
step('看退款 · 退款总额与明细', () => {
  const { json, text } = page('bill.analysis.trend', { kind: 'refund' }, 'refund');
  has(text, '499.00');
  return 'bytes=' + json.delivery.bytes;
});

/* ── 空窗与空库两态（#688 裁定 4 的澄清）────────────────────────────────────── */
step('空窗 · 窗口内零记录时仍出完整页（不是 exit 4）', () => {
  const { text } = page('bill.analysis.overview', { kind: 'monthly', month: '2025-09' }, 'empty-window');
  check(/还没有|没有记录|暂无/.test(text), '空窗页缺空态句');
  check(text.includes('数据来源'), '空窗页缺来源脚注');
  return 'ok';
});
step('空库 · 一条记录都没有仍是 exit 4（不得改成出页）', () => {
  const EMPTY = mkdtempSync(join(tmpdir(), 't729-empty-'));
  mkdirSync(join(EMPTY, '.ilife'), { recursive: true });
  writeFileSync(join(EMPTY, '.ilife', 'bill.yaml'), 'db:\n  dir: ' + JSON.stringify(EMPTY) + '\n', 'utf8');
  const r = spawnSync(process.execPath, [BIN, 'bill.analysis.overview', '--params', P({ kind: 'monthly', month: '2026-05' })], {
    cwd: ROOT, encoding: 'utf8', env: { ...env, USERPROFILE: EMPTY, HOME: EMPTY},
  });
  check(r.status === 4, '空库应 exit 4，实得 ' + String(r.status) + ' stderr=' + String(r.stderr).slice(0, 200));
  return 'exit=4';
});

/* ── 命令面：三条键进注册表、形状由注册表派生、25 条词各归其位 ───────────────────── */
total += 1;
try {
  const reg = await import(new URL('../../../packages/skill-bill/dist/cli/registry.js', import.meta.url).href);
  const want = { 'bill.analysis.overview': 'stat', 'bill.analysis.compare': 'analysis', 'bill.analysis.trend': 'analysis' };
  for (const [key, shape] of Object.entries(want)) {
    check(reg.REGISTRY[key] !== undefined, '注册表里没有 ' + key);
    check(reg.REGISTRY[key].shape === shape, key + ' 形状应为 ' + shape + '，实得 ' + reg.REGISTRY[key].shape);
  }
  const wake = await import(new URL('../../../packages/skill-bill/dist/triggers/wakeTable.js', import.meta.url).href);
  const words = [
    ['看月度', 'bill.analysis.overview'], ['看年度', 'bill.analysis.overview'], ['看总览', 'bill.analysis.overview'],
    ['看周报', 'bill.analysis.overview'], ['看分类', 'bill.analysis.overview'], ['看账户', 'bill.analysis.overview'],
    ['看账本', 'bill.analysis.overview'], ['看结构', 'bill.analysis.overview'], ['做统计', 'bill.analysis.overview'],
    ['看对比', 'bill.analysis.compare'], ['看双区间', 'bill.analysis.compare'], ['看同比', 'bill.analysis.compare'],
    ['看分类对比', 'bill.analysis.compare'],
    ['看趋势', 'bill.analysis.trend'], ['看分类趋势', 'bill.analysis.trend'], ['看大额', 'bill.analysis.trend'],
    ['看高频', 'bill.analysis.trend'], ['看分布', 'bill.analysis.trend'], ['看活跃', 'bill.analysis.trend'],
    ['看洞察', 'bill.analysis.trend'], ['看异常', 'bill.analysis.trend'], ['看借贷', 'bill.analysis.trend'],
    ['看报销', 'bill.analysis.trend'], ['看分期', 'bill.analysis.trend'], ['看退款', 'bill.analysis.trend'],
  ];
  check(words.length === 25, '词表应是 25 条，实得 ' + String(words.length));
  for (const [w, key] of words) {
    const hit = wake.routeWakeword(w, {});
    check(hit.key === key, w + ' → ' + String(hit.key) + '，不是 ' + key);
  }
  pass += 1;
  out.push('PASS 命令面 · 三条键进注册表 ＋ 25 条词路由正确 ｜ 25/25');
} catch (e) {
  out.push('FAIL 命令面 · 三条键进注册表 ＋ 25 条词路由正确 ｜ ' + (e && e.message ? e.message : String(e)));
}

console.log(out.join('\n'));
console.log('RESULT: ' + pass + '/' + total);
process.exit(pass === total ? 0 : 1);
