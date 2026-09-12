// #144 · 出口与命名落盘锁：命名通式／独占递补／显式覆盖／真 spawn 出口。
// 分工：#148 负责「CLI 级用例（真 spawn 出口）」的深锁；本文件锁本票交付的那两块
// （落点意图 ＋ 交付入口）与一条端到端冒烟（缺省分支真拿到文件）。
//
// #237 迁移（维护者 2026-09-12 裁决 8 ＋ 地图 #208 Q7 裁「乙」）：时间戳格式／同秒递补／绝对路径回执
// 由共用件 `base-paint/save-html` 的 `saveHtmlFile` 执行。原先在本文件里对
// `formatHelpStamp`／`buildHelpFileName`／`resolveStemTarget`／`nextExclusiveCandidate`／
// `writeFileExclusiveWithRetry` 的直接单测随之**改判为行为锁**（经 `deliverHtml` 与真 spawn 验名字／递补／
// 覆盖／字节数）——通式本身的唯一定义地已不在本包，金值型单测留给共用件自己的用例。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELP_HTML_DIR_NAME, LOOKUP_FILE_STEM, HELP_FILE_STEM } from '../dist/render/index.js';
import { deliverHtml } from '../dist/output.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');

let TMP = '';
before(() => { TMP = mkdtempSync(join(tmpdir(), 'bill-144-')); });

/** 本地时区零填充时间戳（与共用件同口径；测试侧独立算一份，不做同义反复）。 */
function localStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return String(d.getFullYear()) + p(d.getMonth() + 1) + p(d.getDate())
    + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

/** 允许 ±2 秒：断言「时间戳＝本地时区、形如 YYYYMMDD_HHMMSS」，不把跨秒竞态当契约。 */
function stampWindow() {
  const t = Date.now();
  return [-2, -1, 0, 1, 2].map((d) => localStamp(new Date(t + d * 1000)));
}

const NAME_RE = /^(.+)_(\d{8}_\d{6})(?:_(\d+))?\.html$/;

describe('#237 名字通式与同秒递补（共用件口径，经交付入口验行为）', () => {
  it('名字＝<主体>_<本地 YYYYMMDD_HHMMSS>.html；HELP 与速查表两支分名', () => {
    const dir = join(TMP, 'naming', HELP_HTML_DIR_NAME);
    const ok = stampWindow();
    const h = deliverHtml({ target: { dir, stem: HELP_FILE_STEM }, html: 'H' });
    const l = deliverHtml({ target: { dir, stem: LOOKUP_FILE_STEM }, html: 'L' });
    const mh = NAME_RE.exec(basename(h.path));
    const ml = NAME_RE.exec(basename(l.path));
    assert.ok(mh && ml, '名字须为通式：' + basename(h.path) + ' / ' + basename(l.path));
    assert.equal(mh[1], HELP_FILE_STEM);
    assert.equal(ml[1], LOOKUP_FILE_STEM);
    assert.ok(ok.includes(mh[2]), '时间戳须为本地时区零填充：' + mh[2] + ' not in ' + ok.join(','));
    assert.ok(ok.includes(ml[2]), '时间戳须为本地时区零填充：' + ml[2]);
    assert.notEqual(h.path, l.path, '两支产物分名');
    assert.equal(dirname(h.path), dir, '落 <dir> 下（dir 由调用者给）');
  });

  it('同秒递补：连写三次得本体／_2／_3，各自内容不被覆盖', () => {
    const dir = join(TMP, 'excl');
    const t = { dir, stem: HELP_FILE_STEM };
    const a = deliverHtml({ target: t, html: 'A' });
    const b = deliverHtml({ target: t, html: 'B' });
    const c = deliverHtml({ target: t, html: 'C' });
    assert.equal(readFileSync(a.path, 'utf8'), 'A');
    assert.equal(readFileSync(b.path, 'utf8'), 'B');
    assert.equal(readFileSync(c.path, 'utf8'), 'C');
    assert.equal(new Set([a.path, b.path, c.path]).size, 3, '三次落点互异');
    // 同秒：槽位须从本体起连续（`_2`／`_3`）；跨秒：各自独立（两种都合法，#139 去时间竞态口径）。
    const byStamp = new Map();
    for (const p of [a.path, b.path, c.path]) {
      const m = NAME_RE.exec(basename(p));
      const key = m[2];
      byStamp.set(key, [...(byStamp.get(key) ?? []), m[3] ?? '1']);
    }
    for (const [, slots] of byStamp) {
      assert.deepEqual([...slots].sort(), ['1', '2', '3'].slice(0, slots.length), '同秒槽位须连续：' + JSON.stringify(slots));
    }
  });
});

describe('#237 交付入口 deliverHtml', () => {
  it('target：返回绝对路径 ＋ 真实落盘字节数', () => {
    const html = '<!DOCTYPE html><p>甲</p>';
    const d = deliverHtml({ target: { dir: join(TMP, 'd1'), stem: HELP_FILE_STEM }, html });
    assert.equal(d.mode, 'file');
    assert.ok(d.path.startsWith(TMP) && basename(d.path).startsWith(HELP_FILE_STEM + '_'));
    assert.equal(d.bytes, Buffer.byteLength(html, 'utf8'));
    assert.equal(readFileSync(d.path, 'utf8'), html);
  });

  it('explicit 优先且为覆盖写（落点逐字，不递补）；缺落点即抛', () => {
    const explicit = join(TMP, 'deep', 'nested', '自定义.html');
    const e1 = deliverHtml({ explicit, target: { dir: join(TMP, 'd1'), stem: HELP_FILE_STEM }, html: 'X' });
    const e2 = deliverHtml({ explicit, target: { dir: join(TMP, 'd1'), stem: HELP_FILE_STEM }, html: 'Y' });
    assert.equal(e1.path, explicit, 'explicit 逐字使用（绝对化后）');
    assert.equal(e2.path, e1.path, 'explicit 不派生子名');
    assert.equal(readFileSync(explicit, 'utf8'), 'Y', '显式路径＝覆盖写');
    assert.throws(() => deliverHtml({ html: 'Z' }), /缺落点/);
  });
});

describe('#144 端到端冒烟（真 spawn 出口）', () => {
  it('缺省＝HELP 文件：stdout 给绝对路径，路径上真有全壳 HTML，且不建库', () => {
    const db = join(TMP, 'prod');
    const r = spawnSync(process.execPath, [bin, 'bill.help.lookup'], {
      env: { ...process.env, SKILLS_DB_PATH: db },
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);
    const env = JSON.parse(r.stdout);
    assert.equal(env.key, 'bill.help.lookup');
    assert.equal(env.delivery.mode, 'file');
    assert.ok(env.delivery.path.startsWith(db), '回执路径为绝对路径：' + env.delivery.path);
    assert.ok(env.delivery.path.includes(HELP_HTML_DIR_NAME));
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.equal(env.delivery.bytes, Buffer.byteLength(html, 'utf8'));
    assert.ok(html.includes('<script id="help-data" type="application/json">'), '落盘物是全壳页');
    assert.ok(html.includes('饼干记账 · 使用手册(HELP)'));
    assert.equal(spawnSync(process.execPath, [bin, 'bill.help.lookup'], { env: { ...process.env, SKILLS_DB_PATH: db }, encoding: 'utf8' }).status, 0);
    assert.equal(readdirSync(db).filter((f) => f.endsWith('.db')).length, 0, '看帮助不建记账库');
  });

  it('显式参数两支：mode=lookup 落速查表文件；q 只回命中不落盘', () => {
    const db = join(TMP, 'prod2');
    const m = spawnSync(process.execPath, [bin, 'bill.help.lookup', '--params', '{"mode":"lookup"}'], {
      env: { ...process.env, SKILLS_DB_PATH: db }, encoding: 'utf8',
    });
    assert.equal(m.status, 0, m.stderr);
    const me = JSON.parse(m.stdout);
    assert.ok(me.delivery.path.includes('饼干记账_速查表_'), me.delivery.path);
    assert.ok(existsSync(me.delivery.path));
    assert.ok(me.data.items.length >= 70, '速查表含全量短语');

    const q = spawnSync(process.execPath, [bin, 'bill.help.lookup', '--params', '{"q":"查今天"}'], {
      env: { ...process.env, SKILLS_DB_PATH: db }, encoding: 'utf8',
    });
    assert.equal(q.status, 0, q.stderr);
    const qe = JSON.parse(q.stdout);
    assert.equal(qe.delivery, undefined, '现找不默认落盘');
    assert.equal(qe.data.items.length, 1);
    assert.equal(qe.data.items[0].key, 'bill.record.today');
  });

  it('--html 显式覆盖：写到用户逐字给的路径（缺父目录也建）', () => {
    const db = join(TMP, 'prod3');
    const out = join(TMP, 'prod3', 'sub', '我的帮助.html');
    const r = spawnSync(process.execPath, [bin, 'bill.help.lookup', '--html', out], {
      env: { ...process.env, SKILLS_DB_PATH: db }, encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);
    const env = JSON.parse(r.stdout);
    assert.equal(env.delivery.path, out);
    assert.ok(readFileSync(out, 'utf8').includes('<script id="help-data" type="application/json">'));
    assert.equal(existsSync(join(db, HELP_HTML_DIR_NAME)), false, '显式落点时不写默认目录');
  });
});

// 防呆：显式写坏路径（父级是文件）必须 exit 5（落盘失败），不静默当成功。
describe('#144 落盘失败＝exit 5', () => {
  it('父级是文件时真跑 exit 5 且 stderr 有 ERR 5', () => {
    const db = join(TMP, 'prod4');
    const blocker = join(TMP, 'prod4', 'blocker');
    mkdirSync(join(TMP, 'prod4'), { recursive: true });
    writeFileSync(blocker, 'x');
    const r = spawnSync(process.execPath, [bin, 'bill.help.lookup', '--html', join(blocker, 'a.html')], {
      env: { ...process.env, SKILLS_DB_PATH: db }, encoding: 'utf8',
    });
    assert.equal(r.status, 5, r.stderr);
    assert.match(r.stderr, /ERR 5/);
  });
});
