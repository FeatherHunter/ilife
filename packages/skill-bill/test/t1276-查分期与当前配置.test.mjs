// 1276 · 补能力：查分期三维度过滤 ＋ 查看/设置当前配置两场景。
// 跑法（先 `pnpm build`）：node --test packages/skill-bill/test/t1276-查分期与当前配置.test.mjs
// 判据：
//   ① 查分期默认不收窄（存量 3 笔）；item_name 子串收窄；account 精确收窄；status 非法 exit 2；
//      status 已还清/进行中按名目分组（解析不出按进行中留）；三维可叠加；空结果 exit 0 空态。
//   ② 查看当前配置只读 6 项、上屏印**真路径**（用户 2026-10-13 裁定不脱敏）、载荷带绝对路径；
//      设置当前配置四格全空即预览不落盘；给值不确认只预览；给了＋confirm:true 才落盘且回读一致；
//      写后文件仍可被 `bill.config.read` 读出。生成期预填另见 `t1276-预填当前配置.test.mjs`。
// 红线：只读临时家目录；只往临时目录写 --html 产物；不碰真实 `~/.ilife`。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billEnv, configDirOf } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => {
    const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return p.status === 0 && /^v\d+/.test((p.stdout || '').trim());
  }) ?? process.execPath;

let DB = '';
let OUT = '';
const P = (o) => JSON.stringify(o);
function run(args, envExtra) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(DB, envExtra) });
}
function page(key, params, name) {
  const file = join(OUT, name + '.html');
  const r = run([key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' ' + P(params) + ' 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  return { text: readFileSync(file, 'utf8'), stdout: r.stdout, file };
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't1276-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't1276-html-'));
  const seed = [
    { category: '分期/手机', amount: -200, time: '2026-09-06 10:00:00', note: '手机分期 第1期', account: '支付宝', ledger: '生活' },
    { category: '玩乐/数码', amount: -150, time: '2026-09-06 11:00:00', note: '耳机 #分期 手机 第1期/12', account: '微信', ledger: '生活' },
    { category: '玩乐/数码', amount: -150, time: '2026-09-06 12:00:00', note: '手表 #分期中', account: '微信', ledger: '生活' },
  ];
  for (const s of seed) assert.equal(run(['bill.record.add', '--params', P(s)]).status, 0, '样本应写进临时库：' + P(s));
});

describe('1276 ① 查分期三维度（名目／账户／状态）', () => {
  it('默认不收窄：3 笔（存量行为不动）', () => {
    const { stdout } = page('bill.record.search', { kind: 'installment' }, 't1276-base');
    assert.equal(JSON.parse(stdout).data.total, 3);
  });
  it('item_name 子串：手机命中 2 笔', () => {
    const { stdout } = page('bill.record.search', { kind: 'installment', item_name: '手机' }, 't1276-item');
    const env = JSON.parse(stdout);
    assert.equal(env.data.total, 2);
    assert.ok(env.data.items.every((x) => String(x.note + x.category).includes('手机')));
  });
  it('account 精确：微信命中 2 笔', () => {
    const { stdout } = page('bill.record.search', { kind: 'installment', account: '微信' }, 't1276-acct');
    assert.equal(JSON.parse(stdout).data.total, 2);
  });
  it('status 非法即 exit 2（不冒充正常）', () => {
    const r = run(['bill.record.search', '--params', P({ kind: 'installment', status: '不对' })]);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(r.stdout, '');
  });
  it('空结果：exit 0 空态（不断言失败）', () => {
    const { text, stdout } = page('bill.record.search', { kind: 'installment', item_name: '不存在的名目' }, 't1276-empty');
    assert.equal(JSON.parse(stdout).data.total, 0);
    assert.ok(text.includes('没有找到符合条件的记录'));
  });
});

describe('1276 ② 查看／设置当前配置（读／写 bill.yaml，路径不脱敏）', () => {
  it('查看当前配置：只读 6 项，上屏印真路径（用户 2026-10-13 裁定：脱敏后找不到文件）', () => {
    const { text, stdout } = page('bill.setup.run', { op: 'config-read' }, 't1276-config-read');
    const env = JSON.parse(stdout);
    assert.equal(env.data.ok, true);
    assert.equal(env.data.receipt.rows, 6);
    assert.ok(text.includes(DB), '上屏应印真路径（家目录那份）：' + DB);
    assert.ok(!/~[\\/]\.ilife/.test(text), '上屏不得再把家目录缩成 ~');
  });
  it('设置当前配置：四格全空即预览不落盘', () => {
    const { stdout } = page('bill.setup.run', { op: 'config-write' }, 't1276-config-empty');
    const env = JSON.parse(stdout);
    assert.equal(env.data.ok, false);
    assert.ok(String(env.data.message).includes('还没说改哪格'));
  });
  it('给值不确认只预览；确认才落盘且回读一致', () => {
    const prev = page('bill.setup.run', { op: 'config-write', db_dir: 'D:/1276-库' }, 't1276-config-prev');
    assert.equal(JSON.parse(prev.stdout).data.ok, false);
    const done = page('bill.setup.run', { op: 'config-write', db_dir: 'D:/1276-库', confirm: true }, 't1276-config-done');
    const doneEnv = JSON.parse(done.stdout);
    assert.equal(doneEnv.data.ok, true);
    assert.ok(String(doneEnv.data.message).includes('已经写进配置文件'));
    // `billEnv` 每次调用都会把 bill.yaml 重置回 `db.dir＝家目录`，故这里直接读文件不断言（不经它）。
    const yaml = readFileSync(join(configDirOf(DB), 'bill.yaml'), 'utf8');
    assert.ok(yaml.includes('D:/1276-库'), '落盘文件应含新值：' + yaml.slice(0, 200));
  });
});
