/** #729 · analysis 域（分析）的靶向测试：**缝＝真出口**（spawn `dist/cli/cmd_read.js` ＋ `--html` 读回落盘页）。
 *
 * 钉五件事（票面判据逐条）：
 *   ① 25 条唤醒词逐条路由到本域三条命令；三条键进注册表、形状与搬迁前一致（能力声明 ＋ 生成物两处齐）；
 *   ② 读数对得上：夹具（`test/helpers/bill-seed.mjs`）的合成库上，各页读数与手算值逐条相同
 *      （本件挑三条代表页：看月度／看趋势／看借贷；25 条的全量读数核验住 `docs/skills/skill-bill/t729-探针-真出口.mjs`）；
 *   ③ **图表四条**（#688 §四 裁定 3 的可判形式）：纵轴刻度读得到、零值处无柱身、无记录的月不出现在图元里
 *      而在口径句里被点名、点数不足出说明句；
 *   ④ **空窗与空库两态**（裁定 4）：窗口内零记录照出完整页；库里一条都没有仍是 exit 4（不变）；
 *   ⑤ **页面骨架三条**（裁定 1／2／7／11／12）：恰好一个页内导航块、一行来源脚注、可见文本无内部标识与
 *      `undefined`／`NaN`、无禁入色与深色区标记、页脚无按钮。
 *
 * 测试隔离：走 `test/helpers/config-base.mjs` 的 `billEnv` ＋ `freezeClock`（#726 起落点由配置文件唯一决定）。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-bill/test/t729-分析域.test.mjs`。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_TODAY, seedBillDb } from './helpers/bill-seed.mjs';
import { billConfigDir, billEnv, freezeClock } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const P = (o) => JSON.stringify(o);

let DB; let OUT;
function run(args, dir = DB) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: here, encoding: 'utf8', env: { ...billEnv(dir), ...freezeClock(SEED_TODAY) },
  });
}
function envOf(r) {
  const last = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() ?? '';
  try { return JSON.parse(last); } catch { throw new Error('stdout 末行非 envelope：' + last + '｜stderr=' + r.stderr); }
}
/** 跑一页，断言机器面（exit 0／落盘／字节如实／整页），返回 { json, text }（text 已剔复制载荷区）。 */
function page(key, params, name) {
  const file = join(OUT, name + '.html');
  const r = run([key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' 应 exit 0：' + r.stderr);
  const json = envOf(r);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  assert.ok(isAbsolute(json.delivery.path), '回执须带绝对路径的 delivery.path');
  assert.equal(resolve(json.delivery.path), resolve(file));
  const raw = readFileSync(file, 'utf8');
  assert.equal(statSync(file).size, json.delivery.bytes, '文件字节须＝delivery.bytes');
  assert.match(raw, /<!doctype html>/i, '产物应是整页');
  return { json, text: raw.replace(/data-t="[^"]*"/g, ''), raw };
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't729-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't729-html-'));
  billConfigDir(DB);
  seedBillDb(DB);
});

describe('#729 · analysis 域：命令面与 25 条词', () => {
  it('三条键进注册表，形状与搬迁前一致（能力声明＋生成物两处齐）', async () => {
    const { REGISTRY } = await import('../dist/cli/registry.js');
    assert.equal(REGISTRY['bill.analysis.overview'].shape, 'stat');
    assert.equal(REGISTRY['bill.analysis.compare'].shape, 'analysis');
    assert.equal(REGISTRY['bill.analysis.trend'].shape, 'analysis');
    assert.equal(Object.keys(REGISTRY).length, 14, '注册表＝已迁移的十四条');
  });

  it('25 条唤醒词逐条路由到本域三条命令', async () => {
    const { routeWakeword } = await import('../dist/triggers/wakeTable.js');
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
    assert.equal(words.length, 25);
    for (const [w, key] of words) assert.equal(routeWakeword(w, {}).key, key, w + ' 路由错了');
  });

  it('落点表 25 行，覆盖三条命令的每个 kind', async () => {
    const { ANALYSIS_SCENES } = await import('../dist/analysis/scene.js');
    assert.equal(ANALYSIS_SCENES.length, 25);
    const pairs = new Set(ANALYSIS_SCENES.map((s) => s.key + '|' + s.kind));
    assert.equal(pairs.size, 25, '（命令名 ＋ kind）不该重复');
  });
});

describe('#729 · 读数（夹具合成库）', () => {
  it('看月度 2026-05：读数与手算值一致', () => {
    const { json, text } = page('bill.analysis.overview', { kind: 'monthly', month: '2026-05' }, 'monthly');
    const m = json.data.metrics;
    assert.equal(m.expense, 5640.2, '支出');
    assert.equal(m.income, 13759, '收入');
    assert.equal(m.net, 8118.8, '净额');
    assert.equal(m.count, 14, '笔数');
    for (const v of Object.values(m)) assert.equal(typeof v, 'number', 'stat 形 metrics 必须全 number');
    assert.ok(text.includes('5640.20') && text.includes('13759.00'), '页面上要读得到这两个数');
  });

  it('看借贷：未还对象与合计对得上（#标签聚合）', () => {
    const { text } = page('bill.analysis.trend', { kind: 'debt' }, 'debt');
    assert.ok(text.includes('2000.00'), '借出未还 2000.00');
    assert.ok(text.includes('1500.00'), '借入未还 1500.00');
    assert.ok(text.includes('张三') && text.includes('李四'), '对象列表要写出对象名');
  });
});

describe('#729 · 图表四条（裁定 3）与页面骨架（裁定 1／2／7／11／12）', () => {
  it('看趋势：纵轴刻度 ＋ 空月不出点 ＋ 口径句点名空月（裁定 3）', () => {
    const { text } = page('bill.analysis.trend', { kind: 'trend', months: 12 }, 'trend');
    assert.match(text, /ilife-block-chart-block/, '这一页应有图卡');
    assert.match(text, /ilife-charts-line/, '趋势图画的是折线');
    assert.match(text, /ilife-charts-ytick/, '图中要读得到纵轴刻度（yTicks）');
    assert.match(text, /ilife-charts-xlabel/, '横轴要读得到月份标签');
    assert.match(text, /没有记录/, '口径句要点名没有记录的那几个月（裁定 3 第四条）');
    assert.match(text, /2025-(07|08|09|10|11|12)/, '空月要点名到具体月份');
  });

  it('看分布：五档明细齐全，柱图带刻度（裁定 3）', () => {
    const { text } = page('bill.analysis.trend', { kind: 'distribution', month: '2026-05' }, 'distribution');
    assert.match(text, /ilife-charts-bar/, '这一页应有柱图');
    assert.match(text, /ilife-charts-ytick/, '柱图要读得到纵轴刻度');
    for (const b of ['10 元以下', '10~50', '50~100', '100~500', '500 以上']) {
      assert.ok(text.includes(b), '五档要在页面上：' + b);
    }
  });

  it('页面骨架：一个页内导航块 ＋ 来源脚注 ＋ 口径行 ＋ 复制区 ＋ 无内部标识', () => {
    const { text } = page('bill.analysis.overview', { kind: 'yearly', year: 2026 }, 'yearly');
    assert.equal([...text.matchAll(/<nav[^>]*aria-label="页内导航"/g)].length, 1, '页内导航块恰一个');
    assert.ok(text.includes('数据来源'), '来源脚注（裁定 2）');
    assert.match(text, /ilife-block-caliber/, '口径说明行（裁定 2）');
    assert.match(text, /ilife-copy|ilife-block-copy/, '复制区（裁定 5）');
    for (const [what, re] of [['bill.', /bill\./g], ['.py', /\.py/g], ['scripts/', /scripts\//g], ['undefined', /undefined/g], ['NaN', /NaN/g]]) {
      assert.equal([...text.matchAll(re)].length, 0, '可见文本不该出现 ' + what);
    }
    for (const [what, re] of [['--r-xl', /--r-xl/g], ['--pink', /--pink/g], ['深色区', /prefers-color-scheme:\s*dark/g]]) {
      assert.equal([...text.matchAll(re)].length, 0, '禁入项：' + what);
    }
    assert.ok(!/<footer[\s\S]*?<button/.test(text), '结果型页页脚不出按钮（裁定 11）');
  });
});

describe('#729 · 空窗与空库两态（裁定 4）＋ 转账口径', () => {
  it('窗口内零记录：照出完整页（标题 ＋ 空态 ＋ 引导句 ＋ 来源脚注）', () => {
    const { text } = page('bill.analysis.overview', { kind: 'monthly', month: '2025-09' }, 'empty-window');
    assert.match(text, /还没有|没有记录|暂无/, '空态句');
    assert.ok(text.includes('数据来源'), '空窗页仍有来源脚注');
  });

  it('库为空：仍是 exit 4（设计行为，本条不得改）', () => {
    const EMPTY = mkdtempSync(join(tmpdir(), 't729-empty-'));
    const r = run(['bill.analysis.overview', '--params', P({ kind: 'monthly', month: '2026-05' })], EMPTY);
    assert.equal(r.status, 4, '空库应 exit 4：' + r.stderr);
  });

  it('转账不算收支：转出转入两笔都不进本域读数', () => {
    const T = mkdtempSync(join(tmpdir(), 't729-transfer-'));
    billConfigDir(T);
    seedBillDb(T, [
      ['2026-05-10 12:00:00', '餐饮/外卖', -100, '支付宝', '生活', '午饭'],
      ['2026-05-11 12:00:00', '转账/转出', -500, '支付宝', '转账', '#转账 转出至招行卡'],
      ['2026-05-11 12:00:01', '转账/转入', 500, '招行卡', '转账', '#转账 转入自支付宝'],
    ]);
    const r = run(['bill.analysis.overview', '--params', P({ kind: 'monthly', month: '2026-05' }), '--html', join(OUT, 'transfer.html')], T);
    assert.equal(r.status, 0, r.stderr);
    const m = envOf(r).data.metrics;
    assert.equal(m.expense, 100, '转账不算支出');
    assert.equal(m.income, 0, '转账不算收入');
    assert.equal(m.count, 1, '转账不进笔数');
  });
});
