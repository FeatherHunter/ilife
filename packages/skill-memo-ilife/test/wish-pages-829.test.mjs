// #829 · wish 域 5 场景端到端（真出口用例）：唤醒词能路由、命令能跑、产物真落盘、**六格主体与册子逐字相同**。
//
// 一个缝：唯一出口（`spawnSync` 跑 `dist/cli/cmd_read.js`）＋ 两个注入点（临时库 `db.dir`、家目录隔离）。
// 不测内部函数；只断言外部行为——退出码、回执键、落盘件的主体与页内内容。
//
// **每个用例自带一套夹具**（新临时库 ＋ 新家目录）：产物目录不跨用例累积，故「产物件数」类断言
// 在任何执行顺序下都成立（首版把夹具放在 `before` 里，第二次跑就因累积而假红——这是本件的修法）。
//
// 两条要记住的读数语义（**不是缺陷**）：
//   ① `记心愿`／`改心愿` 走「ensure 型合成写」，本夹具里飞书挡板缺席 ⇒ `exit=4` 而**本地侧已落**
//      （回执 `local=created`／`updated`）——这正是 #657／#658 的契约：回执照打、退出码如实反映「没达成」。
//      故本件对这两条**断言产物存在**、不断言 exit 0。
//   ② 分隔符门那 1 处命中（只在两张向导过程页上）是共用件「复制区说明行」那一句，
//      `t824-视觉基准.md` §3 判给 #851 收口；本域只许引用、不许另写第二句——本件照此断言。
//
// 跑法：node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife
//       node --test packages/skill-memo-ilife/test/wish-pages-829.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkMemoDb, seedNote, countNotes } from './helpers/memo-sqlite.mjs';
import { mkMemoConfig, stubPathEnv } from './helpers/config-base.mjs';
import { BOOKLET_ROWS } from '../dist/help/booklet.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const REPO = join(pkg, '..', '..');
const BIN = join(pkg, 'dist', 'cli', 'cmd_read.js');
const SEPARATOR_PROBE = join(REPO, 'packages', 'base-render', 'test', 'separator-probe.mjs');

/** 一套自带夹具：新临时库 ＋ 新家目录 ＋ 三条种子心愿。每个用例调一次，互不累积。 */
function fixture() {
  const db = mkMemoDb('wish-829-');
  const home = mkMemoConfig({ db: { dir: db } }, 'wish-829-home-');
  const env = stubPathEnv(home, mkdtempSync(join(tmpdir(), 'wish-829-stub-')));
  const ids = {
    swim: seedNote(db, { content: '学游泳', category: '心愿' }),
    run: seedNote(db, { content: '跑马拉松', category: '心愿', due: '2026-10-05' }),
    clay: seedNote(db, { content: '学陶艺', category: '心愿' }),
  };
  const landing = join(db, 'memo_html');
  return {
    db, ids,
    run: (key, params) => spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params)], { encoding: 'utf8', env }),
    listing: () => (existsSync(landing) ? readdirSync(landing) : []),
    landing,
    /** 本域某一格落了哪些件（主体由册子定，本件不自己拼名字）。 */
    pagesOf: (stem) => (existsSync(landing) ? readdirSync(landing) : []).filter((f) => f.startsWith(stem + '_')),
    html: (file) => readFileSync(join(landing, file), 'utf8'),
  };
}

const outData = (r) => JSON.parse(r.stdout).data;

/** 逐件跑分隔符门（节点级为准），返回 `[[文件, [命中文本…]], …]`。 */
function sepHits(landing, files) {
  const out = [];
  for (const f of files) {
    let raw = '';
    try {
      // 探针按**当刻 cwd** 解析路径，故一律给绝对路径（给错时它吐 EISDIR，会误报成「0 命中」）。
      raw = execFileSync(process.execPath, [SEPARATOR_PROBE, join(landing, f), '--json'], { encoding: 'utf8', cwd: REPO });
    } catch (e) {
      raw = String(e.stdout ?? ''); // 有命中即 exit 1，输出仍在 stdout（门的正常口径）
    }
    out.push([f, (JSON.parse(raw.replace(/^\uFEFF/, '')).node.hits ?? []).map((h) => String(h.text))]);
  }
  return out;
}

describe('#829 · 册子六格主体（定义级：与 BOOKLET_ROWS 对齐）', () => {
  it('本域七格主体与册子逐字相同（含两格向导过程页）', () => {
    const want = BOOKLET_ROWS
      .filter((r) => ['记心愿', '删心愿', '改心愿', '完成心愿', '心愿排期'].includes(r.wake))
      .map((r) => r.file)
      .sort();
    assert.deepEqual(want, ['删心愿', '完成心愿', '完成心愿-向导', '改心愿', '心愿排期', '心愿排期-向导', '记心愿'].sort());
  });
});

describe('#829 · wish 域 5 场景端到端（真出口）', () => {
  it('序20 记心愿：memo.create 出「记心愿」，页内是那一条心愿', () => {
    const s = fixture();
    const r = s.run('memo.create', { title: '学吉他', body: '学吉他', category: '心愿' });
    // 合成写：远端没成 ⇒ exit 4，但本地侧已落、页照出（契约见件头 ①）。
    const fresh = s.pagesOf('记心愿');
    assert.equal(fresh.length, 1, '产物：' + s.listing().join(','));
    assert.match(fresh[0], /^记心愿_\d{8}_\d{6}(_\d+)?\.html$/);
    const html = s.html(fresh[0]);
    assert.match(html, /学吉他/);
    assert.ok(!html.includes('<!--INJECT-DATA-->'), '载荷已注入');
    assert.equal(outData(r).local, 'created');
  });

  it('序22 改心愿：memo.update 出「改心愿」，页内是改后正文', () => {
    const s = fixture();
    s.run('memo.update', { id: s.ids.swim, body: '学游泳（改后）' });
    const fresh = s.pagesOf('改心愿');
    assert.equal(fresh.length, 1, '产物：' + s.listing().join(','));
    const html = s.html(fresh[0]);
    assert.match(html, /学游泳（改后）/);
    assert.match(html, new RegExp('心愿编号 ' + s.ids.swim));
  });

  it('序21 删心愿：memo.remove 出「删心愿」，笔记真删、页内是删前那一行', () => {
    const s = fixture();
    const before = countNotes(s.db);
    const r = s.run('memo.remove', { id: s.ids.clay, confirm: true });
    assert.equal(r.status, 0, String(r.stderr));
    assert.equal(countNotes(s.db), before - 1, '笔记真删');
    const fresh = s.pagesOf('删心愿');
    assert.equal(fresh.length, 1, '产物：' + s.listing().join(','));
    assert.match(s.html(fresh[0]), /学陶艺/, '删前那一行是权威（删完取不到）');
  });

  it('序18 完成心愿：memo.update done 出结果页「完成心愿」，心愿转成打卡', () => {
    const s = fixture();
    const before = countNotes(s.db);
    const r = s.run('memo.update', { id: s.ids.run, done: true });
    assert.equal(r.status, 0, String(r.stderr));
    assert.equal(countNotes(s.db), before, '一删一建：条数不变');
    const fresh = s.pagesOf('完成心愿');
    assert.equal(fresh.length, 1, '产物：' + s.listing().join(','));
    assert.match(s.html(fresh[0]), /跑马拉松/);
  });

  it('序32 完成心愿-向导：memo.wish wizard=complete 出过程页', () => {
    const s = fixture();
    const r = s.run('memo.wish', { wizard: 'complete' });
    assert.equal(r.status, 0, String(r.stderr));
    const fresh = s.pagesOf('完成心愿-向导');
    assert.equal(fresh.length, 1, '产物：' + s.listing().join(','));
    assert.match(s.html(fresh[0]), /心愿完成向导/);
  });

  it('序19 心愿排期：memo.wish（不带向导参数）出结果页「心愿排期」', () => {
    const s = fixture();
    const r = s.run('memo.wish', {});
    assert.equal(r.status, 0, String(r.stderr));
    assert.ok(Array.isArray(outData(r).items), 'envelope 仍是 list 形（数据面不因出页而改）');
    const fresh = s.pagesOf('心愿排期').filter((f) => !f.startsWith('心愿排期-向导_'));
    assert.equal(fresh.length, 1, '产物：' + s.listing().join(','));
    assert.match(s.html(fresh[0]), /心愿/);
  });

  it('序33 心愿排期-向导：memo.wish wizard=plan 出过程页（与结果页同名不同主体）', () => {
    const s = fixture();
    const r = s.run('memo.wish', { wizard: 'plan' });
    assert.equal(r.status, 0, String(r.stderr));
    const fresh = s.pagesOf('心愿排期-向导');
    assert.equal(fresh.length, 1, '产物：' + s.listing().join(','));
    assert.match(s.html(fresh[0]), /心愿排期向导/);
  });

  it('5 个场景逐条真跑：六格产物齐全、主体两两不同（册子逐字）', () => {
    const s = fixture();
    s.run('memo.create', { title: '学吉他', body: '学吉他', category: '心愿' });
    s.run('memo.update', { id: s.ids.swim, body: '学游泳（改后）' });
    s.run('memo.remove', { id: s.ids.clay, confirm: true });
    s.run('memo.update', { id: s.ids.run, done: true });
    s.run('memo.wish', { wizard: 'complete' });
    s.run('memo.wish', {});
    s.run('memo.wish', { wizard: 'plan' });
    const stems = s.listing().map((f) => f.replace(/_\d{8}_\d{6}(_\d+)?\.html$/, ''));
    for (const stem of ['记心愿', '改心愿', '删心愿', '完成心愿', '完成心愿-向导', '心愿排期', '心愿排期-向导']) {
      assert.ok(stems.includes(stem), stem + ' 缺产物；实测：' + stems.join(','));
    }
    assert.equal(new Set(stems).size, stems.length, '主体撞名：' + stems.join(','));
  });
});

describe('#829 · 反例（不冒充本域交付物）', () => {
  it('非心愿类的改／删**不出心愿页**（普通备忘照样能改能删，页归备忘域自己的格）', () => {
    const s = fixture();
    const id = seedNote(s.db, { content: '一条普通备忘', category: '备忘' });
    assert.equal(s.run('memo.update', { id, body: '改过的普通备忘' }).status, 0);
    assert.equal(s.run('memo.remove', { id, confirm: true }).status, 0);
    // 只断言**本域七格**一个都没出（普通备忘可能出别的格，那不归本票管——`删备忘`／`改备忘` 是备忘域的格）。
    const wishStems = ['记心愿', '改心愿', '删心愿', '完成心愿', '完成心愿-向导', '心愿排期', '心愿排期-向导'];
    const leaked = s.listing().filter((f) => wishStems.some((stem) => f.startsWith(stem + '_')));
    assert.deepEqual(leaked, [], '非心愿类不该出心愿页：' + leaked.join(','));
  });

  it('无此笔记即 exit 4，且不落任何产物', () => {
    const s = fixture();
    const before = s.listing().length;
    const r = s.run('memo.remove', { id: 999999, confirm: true });
    assert.equal(r.status, 4);
    assert.match(String(r.stderr), /无此笔记/);
    assert.equal(s.listing().length, before);
  });
});

describe('#829 · 分隔符门（本域读数与共用件归属）', () => {
  it('4 张「通用回执」结果页：节点级 **0 命中**（共用件已收，本域只有派生的调用）', () => {
    const s = fixture();
    s.run('memo.create', { title: '学吉他', body: '学吉他', category: '心愿' });
    s.run('memo.update', { id: s.ids.swim, body: '学游泳（改后）' });
    s.run('memo.remove', { id: s.ids.clay, confirm: true });
    s.run('memo.update', { id: s.ids.run, done: true });
    // 排除向导过程页（`完成心愿-向导_…` 也会被 `完成心愿_` 前缀之外的规则漏进，故显式点名）。
    const files = s.listing().filter((f) => ['记心愿', '改心愿', '删心愿', '完成心愿'].some((stem) => f.startsWith(stem + '_')));
    assert.equal(files.length, 4, '四张结果页应收齐，实测：' + s.listing().join(','));
    for (const [f, texts] of sepHits(s.landing, files)) {
      assert.deepEqual(texts, [], f + ' 仍有分隔符债：' + texts.join(' ／ '));
    }
  });

  it('2 张向导过程页：节点级 **0 命中**（#870 共用件收口后归零，本域不留第二句）', () => {
    const s = fixture();
    s.run('memo.wish', { wizard: 'complete' });
    s.run('memo.wish', { wizard: 'plan' });
    const files = s.listing().filter((f) => ['完成心愿-向导', '心愿排期-向导'].some((stem) => f.startsWith(stem + '_')));
    assert.equal(files.length, 2, '两张过程页应收齐，实测：' + s.listing().join(','));
    for (const [f, texts] of sepHits(s.landing, files)) {
      assert.deepEqual(texts, [], f + ' 仍有分隔符债：' + texts.join(' ／ '));
    }
  });
});
