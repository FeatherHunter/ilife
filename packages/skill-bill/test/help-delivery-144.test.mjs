// #144 · 出口与命名落盘锁：命名通式／独占递补／显式覆盖／真 spawn 出口。
// 分工：#148 负责「CLI 级用例（真 spawn 出口）」的深锁；本文件锁本票交付的那两块（helpPaths／output）
// 与一条端到端冒烟（缺省分支真拿到文件）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpFileName, formatHelpStamp, resolveStemTarget, HELP_HTML_DIR_NAME, LOOKUP_FILE_STEM, HELP_FILE_STEM } from '../dist/render/index.js';
import { deliverHtml, nextExclusiveCandidate, writeFileExclusiveWithRetry } from '../dist/output.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const AT = new Date(2026, 8, 11, 15, 38, 12); // 本地 2026-09-11 15:38:12

let TMP = '';
before(() => { TMP = mkdtempSync(join(tmpdir(), 'bill-144-')); });

describe('#144 命名与落点（零 IO）', () => {
  it('时间戳与通式照老口径（本地时区、零填充、同秒 _N 从 _2 起）', () => {
    assert.equal(formatHelpStamp(AT), '20260911_153812');
    assert.equal(buildHelpFileName(HELP_FILE_STEM, AT), '饼干记账_HELP_20260911_153812.html');
    assert.equal(buildHelpFileName(HELP_FILE_STEM, AT, 2), '饼干记账_HELP_20260911_153812_2.html');
    assert.equal(buildHelpFileName(LOOKUP_FILE_STEM, AT), '饼干记账_速查表_20260911_153812.html');
    assert.ok(buildHelpFileName(HELP_FILE_STEM, AT) !== buildHelpFileName(LOOKUP_FILE_STEM, AT), '两支产物分名');
  });

  it('落点＝<dbDir>/biscuit_accountant_html/<主体>_<stamp>.html（只出初候选、不建目录）', () => {
    const t = resolveStemTarget(TMP, HELP_FILE_STEM, AT);
    assert.ok(t.startsWith(TMP), '落点在 SKILLS_DB_PATH 下：' + t);
    assert.ok(t.includes(HELP_HTML_DIR_NAME), '子目录名照老口径');
    assert.ok(t.endsWith('饼干记账_HELP_20260911_153812.html'));
    assert.equal(existsSync(join(TMP, HELP_HTML_DIR_NAME)), false, '纯命名不做 IO');
    assert.throws(() => formatHelpStamp(new Date('nope')), /有效 Date/);
    assert.throws(() => buildHelpFileName('', AT), /非空字符串/);
  });

  it('下一独占候选：`_N` 递增，无 `_N` 则 `_2`', () => {
    assert.match(nextExclusiveCandidate('D:/x/甲_20260911_153812.html'), /甲_20260911_153812_2\.html$/);
    assert.match(nextExclusiveCandidate('D:/x/甲_20260911_153812_2.html'), /甲_20260911_153812_3\.html$/);
    assert.match(nextExclusiveCandidate('D:/x/甲_20260911_153812_9.html'), /甲_20260911_153812_10\.html$/);
  });
});

describe('#144 落盘（唯一入口）', () => {
  it('独占写：同秒连写三次得本体／_2／_3，且各自内容不被覆盖', () => {
    const dir = join(TMP, 'excl');
    const target = join(dir, '甲_HELP_20260911_153812.html');
    const a = writeFileExclusiveWithRetry(target, 'A');
    const b = writeFileExclusiveWithRetry(target, 'B');
    const c = writeFileExclusiveWithRetry(target, 'C');
    assert.equal(readFileSync(a, 'utf8'), 'A');
    assert.equal(readFileSync(b, 'utf8'), 'B');
    assert.equal(readFileSync(c, 'utf8'), 'C');
    assert.deepEqual(readdirSync(dir).sort(), ['甲_HELP_20260911_153812.html', '甲_HELP_20260911_153812_2.html', '甲_HELP_20260911_153812_3.html']);
  });

  it('deliverHtml：返回绝对路径 ＋ 字节数；explicit 优先且为覆盖写；缺落点即抛', () => {
    const html = '<!DOCTYPE html><p>甲</p>';
    const d = deliverHtml({ target: join(TMP, 'd1', '甲_HELP_20260911_153812.html'), html });
    assert.equal(d.mode, 'file');
    assert.ok(d.path.startsWith(TMP) && d.path.includes('甲_HELP_20260911_153812.html'));
    assert.equal(d.bytes, Buffer.byteLength(html, 'utf8'));
    assert.equal(readFileSync(d.path, 'utf8'), html);

    const explicit = join(TMP, 'deep', 'nested', '自定义.html');
    const e1 = deliverHtml({ explicit, target: join(TMP, 'd1', '甲_HELP_20260911_153812.html'), html: 'X' });
    const e2 = deliverHtml({ explicit, target: join(TMP, 'd1', '甲_HELP_20260911_153812.html'), html: 'Y' });
    assert.equal(e1.path, e2.path, 'explicit 逐字使用（不递补）');
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
