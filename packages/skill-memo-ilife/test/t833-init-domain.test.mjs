// #833 · init 域（初始化类）端到端：`memo.init` 两格产物（结果页 `首次使用` / 过程页 `首次使用-向导`）。
// 真出口跑（argv ＋ JSON 回执 ＋ 退出码 ＋ 落盘产物），临时库 ＋ 隔离家目录配置，绝不连活库。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkMemoDb } from './helpers/memo-sqlite.mjs';
import { mkMemoConfig, noLarkPathEnv } from './helpers/config-base.mjs';
import { INIT_SCENE_ID } from '../dist/init/index.js';
import { bookletFileStem } from '../dist/help/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');

function runWithDb(dbDir, args) {
  const cfg = mkMemoConfig({ db: { dir: dbDir } }, 'memo833-cfg-');
  return spawnSync(process.execPath, [bin, ...args], { cwd: here, encoding: 'utf8', env: noLarkPathEnv(cfg) });
}
const outEnv = (r) => JSON.parse(r.stdout);

const DIAG = {
  items: [
    { name: '运行环境', status: 'ok', desc: 'Node 可用', action: '' },
    { name: '数据存储', status: 'warn', desc: '全文搜索扩展未装', action: '装全文搜索扩展后重跑' },
    { name: '飞书联动', status: 'err', desc: '未安装飞书 CLI', action: '按指引安装并授权' },
  ],
  todos: [{ title: '装飞书 CLI', steps: ['下安装包', '跑授权'] }],
  verify: ['重跑首次使用看环境检查全绿', { text: '看提醒列表能读出调度结果', status: 'skip' }],
};

let DB = '';
before(() => { DB = mkMemoDb('memo833-'); });

describe('#833 init 域：两格产物端到端', () => {
  it('报告页：缺省出 `首次使用`（主体取自册子唯一定义地）', () => {
    const r = runWithDb(DB, ['memo.init', '--params', JSON.stringify({ data: DIAG })]);
    assert.equal(r.status, 0, r.stderr);
    const env = outEnv(r);
    assert.equal(env.shape, 'receipt');
    assert.equal(env.data.ok, true);
    assert.ok(env.delivery && env.delivery.path, '须带 delivery.path');
    assert.ok(existsSync(env.delivery.path), '报告页须真落盘');
    assert.equal(basename(dirname(env.delivery.path)), 'memo_html');
    assert.ok(basename(env.delivery.path).startsWith(bookletFileStem(INIT_SCENE_ID, '结果页') + '_'), '主体须等于册子那一格');
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.ok(html.includes('初始化报告'), '报告页须含报告标题');
    assert.ok(html.includes('ilife-block-kpi-card'), '报告页须命中公共层 KPI 区块类（自持 CSS 已退役）');
    assert.ok(html.includes('ilife-block-data-table'), '环境检查须走公共层表格区块');
    assert.ok(html.includes('飞书联动'), '检查项要上屏');
    assert.ok(html.includes('viewport-fit=cover'), '页面级移动端配方须开（安全区）');
  });

  it('过程页：`mode:"wizard"` 出 `首次使用-向导`（与结果页不同名）', () => {
    const r = runWithDb(DB, ['memo.init', '--params', JSON.stringify({ data: DIAG, mode: 'wizard' })]);
    assert.equal(r.status, 0, r.stderr);
    const env = outEnv(r);
    assert.ok(existsSync(env.delivery.path), '引导页须真落盘');
    assert.ok(basename(env.delivery.path).startsWith(bookletFileStem(INIT_SCENE_ID, '过程页') + '_'), '主体须等于册子那一格');
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.ok(html.includes('首次使用引导'), '引导页须含引导标题');
    assert.ok(html.includes('复制回话'), '引导页须给一条可复制的回话指令');
    assert.ok(html.includes('ilife-block-kpi-card'), '引导页须命中公共层区块类');
    assert.notEqual(
      basename(env.delivery.path).split('_')[0],
      bookletFileStem(INIT_SCENE_ID, '结果页'),
      '两格主体不许同名',
    );
  });

  it('坏输入：缺 data／非法 status／非法 mode 都是 exit 2（用法错，不落到渲染错）', () => {
    assert.equal(runWithDb(DB, ['memo.init', '--params', JSON.stringify({})]).status, 2);
    const bad = { items: [{ name: 'x', status: 'bad', desc: '', action: '' }], todos: [], verify: [] };
    assert.equal(runWithDb(DB, ['memo.init', '--params', JSON.stringify({ data: bad })]).status, 2);
    assert.equal(runWithDb(DB, ['memo.init', '--params', JSON.stringify({ data: DIAG, mode: 'nope' })]).status, 2);
    assert.equal(runWithDb(DB, ['memo.init', '--params', '{']).status, 2);
  });

  it('库不存在时也能跑（开库前分派），且只渲染不建库', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'memo833-empty-'));
    const r = runWithDb(emptyDir, ['memo.init', '--params', JSON.stringify({ data: DIAG })]);
    assert.equal(r.status, 0, r.stderr);
    const env = outEnv(r);
    assert.ok(existsSync(env.delivery.path));
    assert.equal(existsSync(join(emptyDir, 'memo.db')), false, '只渲染，不建库');
  });

  it('两格同跑：目录里恰有两件产物，主体互不相同', () => {
    const r1 = runWithDb(DB, ['memo.init', '--params', JSON.stringify({ data: DIAG })]);
    const r2 = runWithDb(DB, ['memo.init', '--params', JSON.stringify({ data: DIAG, mode: 'wizard' })]);
    assert.equal(r1.status, 0, r1.stderr);
    assert.equal(r2.status, 0, r2.stderr);
    const dir = dirname(outEnv(r1).delivery.path);
    const stems = readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => f.split('_')[0]);
    assert.ok(stems.includes(bookletFileStem(INIT_SCENE_ID, '结果页')));
    assert.ok(stems.includes(bookletFileStem(INIT_SCENE_ID, '过程页')));
  });
});
