// #865 · 统计取数补齐用例（分布明细／价值与趋势／闲置过期回执字段／盘点明细）。
//
// 跑法（仓根，经排队）：
//   node tooling/run-locked.mjs --ticket 865 --max-wait-ms 600000 -- node --test packages/skill-home/test/stats-thick-865.test.mjs
// 前提：`node node_modules/typescript/bin/tsc -b packages/skill-home`（页模块走 dist）。
// 隔离：家目录指临时目录，不碰生产库与种子源。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');

let HOME = '';
const dbPath = () => join(HOME, '.ilife', 'data', 'home.db');
const homeEnv = () => ({ ...process.env, USERPROFILE: HOME, HOME });
function run(key, params) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  return spawnSync(process.execPath, [bin, ...a], { encoding: 'utf8', env: homeEnv() });
}
function runOk(key, params, label) {
  const r = run(key, params);
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' ERR=' + (r.stderr || '').trim().slice(0, 300));
  const lines = (r.stdout || '').split('\n').map((s) => s.trim()).filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}
function ymd(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

before(() => {
  assert.ok(existsSync(bin), 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
  HOME = mkdtempSync(join(tmpdir(), 'stats865-'));
  runOk('home.stats.overview', {}, 'seed overview');
  const cats = runOk('home.tag.query', { kind: 'categories' }, 'seed categories').data.items;
  const cid = cats.find((c) => String(c.name).startsWith('分类:')).count;
  runOk('home.item.add', { name: '用例牛奶', category_id: cid, location: '客厅/冰箱', expiration_date: ymd(5), price: 59 }, 'seed exp-future');
  runOk('home.item.add', { name: '用例雨衣', category_id: cid, location: '阳台/柜子', expiration_date: ymd(-3), price: 129 }, 'seed exp-past');
  runOk('home.item.add', { name: '用例扳手', category_id: cid, location: '书房/抽屉', price: 35 }, 'seed plain');
  runOk('home.item.add', { name: '用例旧包', category_id: cid, location: '阳台/收纳箱', price: 329 }, 'seed idle');
  runOk('home.item.add', { name: '用例水壶', category_id: cid, location: '厨房/吊柜', price: 149 }, 'seed idle2');
  // 旧件回拨：两件真闲置（120 天前用过），一件从没用过且 200 天前录入（走「估算」分支）
  const db = new DatabaseSync(dbPath());
  try {
    const past = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
    db.prepare('UPDATE items SET last_accessed_at=? WHERE name IN (?,?)').run(past(120), '用例旧包', '用例水壶');
    db.prepare('UPDATE items SET last_accessed_at=NULL, created_at=? WHERE name=?').run(past(200).slice(0, 19).replace('T', ' '), '用例扳手');
  } finally {
    db.close();
  }
  runOk('home.inventory.round', { op: 'round', scope: 'all' }, 'seed round');
  runOk('home.inventory.round', { op: 'round', scope: 'location', location: '客厅/冰箱' }, 'seed round 2');
});

describe('#865 总览：分布明细／价值排行／趋势', () => {
  it('summary 带四维逐项计数、价值与高频排行、趋势四桶', () => {
    const env = runOk('home.stats.overview', { kind: 'summary' }, 'summary');
    const d = env.data;
    for (const k of ['categories', 'locations', 'statuses', 'owners']) {
      assert.ok(Array.isArray(d.distributions[k]), '缺分布维：' + k);
      assert.ok(d.distributions[k].length > 0, '分布维为空：' + k);
      for (const r of d.distributions[k]) {
        assert.equal(typeof r.name, 'string');
        assert.ok(Number.isInteger(r.count) && r.count > 0, k + ' 计数非正整数：' + JSON.stringify(r));
      }
    }
    // 分类分布合计＝库里能归到分类的物品件数（未分类也各成一档）
    const total = d.distributions.categories.reduce((a, r) => a + r.count, 0);
    assert.equal(total, d.metrics.items);
    // 价值排行：带分类名，单价降序，价格大于 0
    assert.ok(Array.isArray(d.topValue) && d.topValue.length > 0);
    for (const v of d.topValue) {
      assert.equal(typeof v.category, 'string');
      assert.ok(v.category.length > 0, '价值排行缺分类名：' + JSON.stringify(v));
      assert.ok(v.price > 0);
    }
    const prices = d.topValue.map((v) => v.price);
    assert.deepEqual(prices, [...prices].sort((a, b) => b - a), '价值排行未按单价降序');
    // 高频排行：完整名称与最后使用日
    assert.ok(Array.isArray(d.topFreq) && d.topFreq.length > 0);
    for (const f of d.topFreq) assert.ok(typeof f.lastAccessedAt === 'string');
    // 趋势：四桶，逐桶 has added/discarded
    assert.equal(d.trend.days, 30);
    assert.equal(d.trend.buckets.length, 4);
    for (const b of d.trend.buckets) {
      assert.ok(typeof b.label === 'string' && b.label.length > 0);
      assert.ok(Number.isInteger(b.added) && Number.isInteger(b.discarded));
    }
    // 本用例库里：四件今天录入、一件 200 天前录入（回拨过，出 30 天窗口）→ 窗口内应恰好是前者
    const inWindow = d.trend.buckets.reduce((a, b) => a + b.added, 0);
    assert.equal(inWindow, d.metrics.items - 1, '窗口内录入数应对上（只有 200 天那件出窗）：' + JSON.stringify(d.trend.buckets));
    assert.equal(d.trend.buckets[0].added, inWindow, '今天的录入应全落在近 7 天那一桶');
    assert.equal(d.trend.buckets.slice(1).reduce((a, b) => a + b.added, 0), 0);
  });
  it('既有键与形状不动（metrics 老键仍在）', () => {
    const m = runOk('home.stats.overview', { kind: 'summary' }, 'summary').data.metrics;
    for (const k of ['items', 'quantity', 'locations', 'tags', 'categories', 'price.total', 'price.covered', 'price.cover']) {
      assert.equal(typeof m[k], 'number', '老键丢了：' + k);
    }
    assert.ok(Object.keys(m).some((k) => k.startsWith('top.')));
    assert.ok(Object.keys(m).some((k) => k.startsWith('value.')));
  });
});

describe('#865 闲置与过期：逐条天数与档位', () => {
  it('闲置逐条带天数与来源，回执带本次 days 与 allowed', () => {
    const env = runOk('home.stats.alert', { kind: 'idle', days: 90 }, 'idle');
    const d = env.data;
    assert.equal(d.days, 90);
    assert.deepEqual(d.allowed, [90, 180, 365]);
    assert.ok(d.items.length >= 3, '闲置件数应含三日回拨件：' + d.items.length);
    for (const it of d.items) {
      assert.ok(Number.isInteger(it.daysIdle) && it.daysIdle >= 90, '闲置天数应达阈值：' + JSON.stringify(it));
      assert.ok(['访问记录', '估算'].includes(it.source), '来源取值非法：' + JSON.stringify(it));
      assert.equal(typeof it.location, 'string');
    }
    const days = d.items.map((it) => it.daysIdle);
    assert.deepEqual(days, [...days].sort((a, b) => b - a), '闲置清单未按闲置时长排序');
    // 从没用过但 200 天前录入的那件：走估算分支且天数按录入日算
    const est = d.items.find((it) => it.name === '用例扳手');
    assert.ok(est, '按录入日估算的件应算闲置');
    assert.equal(est.source, '估算');
    assert.ok(est.daysIdle >= 199 && est.daysIdle <= 201, '估算天数应对上录入日：' + est.daysIdle);
    // 阈值抬到 180：只有 200 天那件还在
    const env180 = runOk('home.stats.alert', { kind: 'idle', days: 180 }, 'idle180');
    assert.equal(env180.data.items.length, 1);
    assert.equal(env180.data.allowed.includes(180), true);
  });
  it('今天刚录入、从没用过的件不算闲置（口径回归）', () => {
    const before150 = runOk('home.stats.alert', { kind: 'idle', days: 150 }, 'idle150').data.items.map((it) => it.name);
    assert.ok(!before150.includes('用例牛奶'), '刚录入的件不该算闲置：' + JSON.stringify(before150));
  });
  it('过期逐条带剩余天数与分类，回执带本次 days 与 allowed', () => {
    const env = runOk('home.stats.alert', { kind: 'expiring', days: 30 }, 'expiring');
    const d = env.data;
    assert.equal(d.days, 30);
    assert.deepEqual(d.allowed, [7, 30, 90]);
    assert.ok(d.items.length >= 2);
    const milk = d.items.find((it) => it.name === '用例牛奶');
    const rain = d.items.find((it) => it.name === '用例雨衣');
    assert.equal(milk.daysLeft, 5);
    assert.equal(rain.daysLeft, -3);
    for (const it of d.items) {
      assert.ok(Number.isInteger(it.daysLeft), '剩余天数应为整数：' + JSON.stringify(it));
      assert.ok(typeof it.category === 'string' && it.category.length > 0, '缺分类：' + JSON.stringify(it));
    }
    // 已过期件不因 days 变小而消失于 expired_only 之外
    const onlyExpired = runOk('home.stats.alert', { kind: 'expiring', days: 30, expired_only: true }, 'expiredOnly');
    assert.ok(onlyExpired.data.items.every((it) => it.daysLeft < 0));
    assert.ok(onlyExpired.data.items.some((it) => it.name === '用例雨衣'));
  });
});

describe('#865 盘点：真实条数与明细', () => {
  it('records 是真实条数（不再被 limit 1 截断），明细逐条可读', () => {
    const env = runOk('home.stats.overview', { kind: 'inventory' }, 'inventory');
    const d = env.data;
    const db = new DatabaseSync(dbPath());
    let real = 0;
    try { real = Number(db.prepare('SELECT count(*) AS c FROM inventory_records').get().c); } finally { db.close(); }
    assert.ok(real >= 2, '本用例应至少有两条盘点记录：' + real);
    assert.equal(d.metrics.records, real, 'records 应等于全表条数');
    assert.equal(d.inventoryDetail.length, real, '明细应逐条给全（上限 20）');
    for (const r of d.inventoryDetail) {
      assert.equal(typeof r.date, 'string');
      assert.equal(typeof r.scope, 'string');
      assert.ok(Number.isInteger(r.missing) && Number.isInteger(r.extra));
    }
    assert.equal(d.inventoryDiffTotal, d.inventoryDetail.reduce((a, r) => a + r.missing + r.extra + (r.diff ?? 0), 0));
  });
  it('表形状自适应：老库权威 DDL 形状下「异」与「状态」点亮', () => {
    const db = new DatabaseSync(dbPath());
    try {
      // 换成老库权威 DDL（occurred_at／missing_cnt／extra_cnt／diff_cnt／status），验证读侧不挑列名
      db.exec('DROP TABLE inventory_records');
      db.exec(`CREATE TABLE inventory_records (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT NOT NULL,
        occurred_at TIMESTAMP NOT NULL, missing_cnt INTEGER DEFAULT 0, extra_cnt INTEGER DEFAULT 0,
        diff_cnt INTEGER DEFAULT 0, pending_cnt INTEGER DEFAULT 0, detail_json TEXT NOT NULL DEFAULT '[]',
        status TEXT DEFAULT '进行中', created_at TIMESTAMP NOT NULL)`);
      db.prepare("INSERT INTO inventory_records (scope, occurred_at, missing_cnt, extra_cnt, diff_cnt, status, created_at) VALUES (?,?,?,?,?,?,?)")
        .run('全屋', '2026-09-01 10:00:00', 2, 1, 3, '已完成', '2026-09-01 10:00:00');
      db.prepare("INSERT INTO inventory_records (scope, occurred_at, missing_cnt, extra_cnt, diff_cnt, status, created_at) VALUES (?,?,?,?,?,?,?)")
        .run('厨房', '2026-09-10 10:00:00', 0, 0, 1, '进行中', '2026-09-10 10:00:00');
    } finally { db.close(); }
    const d = runOk('home.stats.overview', { kind: 'inventory' }, 'inventory-old-shape').data;
    assert.equal(d.metrics.records, 2);
    const top = d.inventoryDetail[0];
    assert.equal(top.diff, 1);
    assert.equal(top.status, '进行中');
    assert.equal(d.inventoryDiffTotal, 7, '缺2+多1+异3 + 异1 = 7');
    assert.deepEqual(d.completion, { done: 1, total: 2, pct: 50 });
  });
});

describe('#865 四页重出即变实（页面层接线）', () => {
  const fams = [
    ['overview', 'home.stats.overview', { kind: 'summary' }],
    ['idle', 'home.stats.alert', { kind: 'idle', days: 90 }],
    ['expiring', 'home.stats.alert', { kind: 'expiring', days: 30 }],
    ['inventory_stat', 'home.stats.overview', { kind: 'inventory' }],
  ];
  const html = new Map();
  before(async () => {
    for (const [fam, key, params] of fams) {
      const env = runOk(key, params, '装配 ' + fam);
      const page = await import(pathToFileURL(join(pkgDir, 'dist', 'stats', 'pages', fam + '.js')).href);
      html.set(fam, page.renderFamilyPage(env));
    }
  });
  it('总览页出现逐项计数、价值价格与分类名、趋势四桶', () => {
    const h = html.get('overview');
    assert.ok(h.includes('分类分布') && h.includes('位置分布') && h.includes('状态分布') && h.includes('归属分布'));
    assert.ok(h.includes('st-drow'), '分布逐项行没上屏');
    assert.ok(h.includes('用具牛奶') === false);
    assert.ok(/st-dname[^>]*>[^<]*(食物|衣物|数码)/.test(h), '分布项名没上屏');
    assert.ok(h.includes('元'), '价值排行没出价格');
    assert.ok(/st-tb/.test(h), '趋势桶没上屏');
    assert.ok(h.includes('近7天'));
  });
  it('闲置页出现天数与来源，过期页出现剩余天数与所在位置', () => {
    const idle = html.get('idle');
    assert.ok(/闲置<\/b>\s*120 天/.test(idle), '闲置天数没上屏');
    assert.ok(idle.includes('时长来源'), '时长来源标签没上屏');
    assert.ok(idle.includes('访问记录'), '时长来源值没上屏');
    assert.ok(/90 天/.test(idle), '档位没上屏');
    const exp = html.get('expiring');
    assert.ok(/已过期3天/.test(exp), '剩余天数徽章没上屏');
    assert.ok(/5天后到期/.test(exp), '未来预告天数没上屏');
    assert.ok(exp.includes('客厅/冰箱'), '所在位置没上屏');
  });
  it('盘点页出现明细与遗留差异总数', () => {
    const h = html.get('inventory_stat');
    assert.ok(h.includes('盘点明细'));
    assert.ok(h.includes('st-drow'), '明细行没上屏');
    assert.ok(/遗留差异<\/b><span>7 件/.test(h.replace(/\n/g, '')), '遗留差异总数没上屏：' + h.slice(0, 200));
    assert.ok(h.includes('完成率'), '老库形状下完成率应上屏');
  });
});
