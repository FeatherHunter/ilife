// #831 · mood 域 3 场景端到端（真出口用例）＋「通用回执」页族定义级用例。
//
// 为什么从 dist 的**副本**跑：`src/init/page.ts`（#833 在途）导入了 `base-paint/blocks` 里不存在的
// `renderStatusBadge`，仓内 dist 加载即 SyntaxError，整个 CLI 一条命令都跑不动。本件把 dist 与 templates
// 拷进临时目录、只把那份坏掉的文件换成空壳，其余逐字照跑 —— 本票的用例因此**不与在途票互相锁死**，
// 待 #833 落定后把 `sandboxBin()` 换回仓内 `dist/cli/cmd_read.js` 即可（一行）。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkMemoDb, seedNote, countNotes } from './helpers/memo-sqlite.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const NODE = process.execPath;

let DB = '';
let HOME = '';
let BIN = '';
let TEMPLATE = '';

/** dist ＋ templates 的临时副本（只换掉 #833 在途那份加载即死的 init 页）。
 *  副本必须住在包**里面**：`base-paint`／`base-link-core` 靠向上查找 `node_modules` 解析，
 *  放系统临时目录就 ERR_MODULE_NOT_FOUND（实测）。目录以 `.` 开头，不进仓。 */
function sandbox() {
  const dir = join(pkg, '.t831-sandbox');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(pkg, 'dist'), join(dir, 'dist'), { recursive: true });
  cpSync(join(pkg, 'templates'), join(dir, 'templates'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'memo-831-sbx', private: true, type: 'module' }), 'utf8');
  const bad = join(dir, 'dist', 'init', 'page.js');
  if (existsSync(bad)) {
    writeFileSync(bad, 'export function renderInitReportPage(){throw new Error("sandbox stub")}\nexport function renderInitGuidePage(){throw new Error("sandbox stub")}\n', 'utf8');
  }
  return join(dir, 'dist', 'cli', 'cmd_read.js');
}

function run(args) {
  return spawnSync(NODE, [BIN, ...args], {
    cwd: dirname(BIN), encoding: 'utf8',
    env: { ...process.env, USERPROFILE: HOME, HOME },
  });
}
const outData = (r) => JSON.parse(r.stdout).data;
const landingDir = () => join(DB, 'memo_html');
const listing = () => (existsSync(landingDir()) ? readdirSync(landingDir()) : []);

before(() => {
  DB = mkMemoDb('memo-831-');
  HOME = mkdtempSync(join(tmpdir(), 'memo-831-home-'));
  mkdirSync(join(HOME, '.ilife'), { recursive: true });
  writeFileSync(join(HOME, '.ilife', 'memo.yaml'),
    ['db:', '  dir: ' + JSON.stringify(DB.replace(/\\/g, '/')), '  name: memo.db'].join('\n') + '\n', 'utf8');
  BIN = sandbox();
  TEMPLATE = readFileSync(join(pkg, 'templates', 'receipt.html'), 'utf8');
});

after(() => {
  rmSync(join(pkg, '.t831-sandbox'), { recursive: true, force: true });
});

describe('#831 · 通用回执族（定义级）', () => {
  it('模板随包，三标记齐（共享 filler 一次填完）', () => {
    assert.ok(TEMPLATE.includes('<!--SHARED-CSS-->'));
    assert.ok(TEMPLATE.includes('<!--SHARED-HELPERS-->'));
    assert.ok(TEMPLATE.includes('<!--INJECT-DATA-->'));
    assert.ok(!TEMPLATE.includes('loading="lazy"'), '墙生成器禁 loading="lazy"');
  });
  it('零新断点：@media 里出现的断点全在仓内既有集合（400／640／820／1001／1200）里', () => {
    const allowed = new Set(['400px', '640px', '820px', '1001px', '1200px']);
    const used = [...TEMPLATE.matchAll(/@media[^{]*?max-width:\s*(\d+px)/g)].map((m) => m[1]);
    assert.ok(used.length > 0, '回执页必须有一档窄屏适配');
    for (const bp of used) assert.ok(allowed.has(bp), '新造了断点：' + bp);
  });  it('带视口覆盖声明（安全区前提）', () => {
    assert.match(TEMPLATE, /viewport-fit=cover/);
  });
});

describe('#831 · mood 域 3 场景端到端（真出口）', () => {
  it('记情绪：memo.create exit 0 ＋ 产物落册子主体「记情绪」', () => {
    const r = run(['memo.create', '--params', JSON.stringify({ title: '今天心情不错', body: '今天心情不错', category: '情绪日记', sub: '开心' })]);
    assert.equal(r.status, 0);
    assert.match(outData(r).message, /已记一条/);
    const fresh = listing().filter((f) => f.startsWith('记情绪_'));
    assert.equal(fresh.length, 1, '产物：' + listing().join(','));
    assert.match(fresh[0], /^记情绪_\d{8}_\d{6}(_\d+)?\.html$/, '库侧实例名＝主体_时间戳');
    const html = readFileSync(join(landingDir(), fresh[0]), 'utf8');
    assert.match(html, /备忘录回执/);
    assert.match(html, /情绪日记/, '页内分类取自 notes 表那一行');
    assert.match(html, /今天心情不错/);
    assert.ok(!html.includes('<!--INJECT-DATA-->'), '载荷已注入');
  });

  it('改情绪：memo.update exit 0 ＋ 产物「改情绪」且页内是改后正文', () => {
    const id = seedNote(DB, { content: '今天有点累', category: '情绪日记', sub: '疲惫' });
    const r = run(['memo.update', '--params', JSON.stringify({ id, body: '今天有点累（改后）' })]);
    assert.equal(r.status, 0);
    const fresh = listing().filter((f) => f.startsWith('改情绪_'));
    assert.equal(fresh.length, 1, '产物：' + listing().join(','));
    const html = readFileSync(join(landingDir(), fresh[0]), 'utf8');
    assert.match(html, /今天有点累（改后）/);
    assert.match(html, new RegExp('笔记 ID ' + id));
  });

  it('删情绪：memo.remove exit 0 ＋ 产物「删情绪」且笔记真删', () => {
    const id = seedNote(DB, { content: '该删掉的情绪', category: '情绪日记' });
    const before = countNotes(DB);
    const r = run(['memo.remove', '--params', JSON.stringify({ id, confirm: true })]);
    assert.equal(r.status, 0);
    assert.equal(countNotes(DB), before - 1, '笔记真删');
    const fresh = listing().filter((f) => f.startsWith('删情绪_'));
    assert.equal(fresh.length, 1, '产物：' + listing().join(','));
    const html = readFileSync(join(landingDir(), fresh[0]), 'utf8');
    assert.match(html, new RegExp('情绪日记 #' + id), '删前那一行是权威（删完取不到）');
  });

  it('三格产物齐全（册子 seq 26／27／28 的主体各一件）', () => {
    const stems = listing().map((f) => f.replace(/_\d{8}_\d{6}(_\d+)?\.html$/, ''));
    for (const stem of ['记情绪', '改情绪', '删情绪']) assert.ok(stems.includes(stem), stem + ' 缺产物');
  });

  it('反例：非情绪类笔记的改／删**不出本族页**（不冒充本域交付物）', () => {
    const id = seedNote(DB, { content: '一条普通备忘', category: '备忘' });
    const before = listing().length;
    const u = run(['memo.update', '--params', JSON.stringify({ id, body: '改过的普通备忘' })]);
    assert.equal(u.status, 0, '普通备忘照样能改');
    const d = run(['memo.remove', '--params', JSON.stringify({ id, confirm: true })]);
    assert.equal(d.status, 0, '普通备忘照样能删');
    assert.equal(countNotes(DB) > 0, true);
    assert.equal(listing().length, before, '本族页数不变：' + listing().join(','));
  });

  it('反例：无此笔记即 exit 4，且不落任何产物', () => {
    const before = listing().length;
    const r = run(['memo.remove', '--params', JSON.stringify({ id: 999999, confirm: true })]);
    assert.equal(r.status, 4);
    assert.match(String(r.stderr), /无此笔记/);
    assert.equal(listing().length, before);
  });

  it('反例：显式 --html 逐字落点仍生效（覆盖写，不吃缺省落点）', () => {
    const explicit = join(HOME, 'explicit-831.html');
    const r = run(['memo.create', '--params', JSON.stringify({ title: '显式落点', body: '显式落点', category: '情绪日记' }), '--html', explicit]);
    assert.equal(r.status, 0);
    assert.ok(existsSync(explicit), '--html 逐字落点须落盘');
    assert.match(readFileSync(explicit, 'utf8'), /备忘录回执/);
  });
});
