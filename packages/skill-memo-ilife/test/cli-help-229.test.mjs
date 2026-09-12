/** #229 · 「备忘录 help」出口与命名落盘的回归锁：零 IO 通式／独占递补／三支显式口径／真 spawn 出口。
 *
 * 分工：#230 负责「跑完不建库」的深锁与变异自证；本文件锁本票交付的三块
 * （`manifest` 三条值 ＋ `memoOutput` 管线 ＋ 出口真 spawn 的缺省分支）。
 *
 * 跑法（**只构建本包**，禁仓根 `tsc -b`，见 #241 的 loader 工厂雷）：
 *   node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json
 *   node --test packages/skill-memo-ilife/test/cli-help-229.test.mjs
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HELP_HTML_DIR_NAME, HELP_FILE_STEM, LOOKUP_FILE_STEM,
  formatHelpStamp, buildHelpFileName, resolveStemTarget, nextExclusiveCandidate,
  writeFileExclusiveWithRetry, deliverMemoHtml,
} from '../dist/help/memoOutput.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const AT = new Date(2026, 8, 12, 13, 37, 4); // 本地 2026-09-12 13:37:04

let TMP = '';
before(() => { TMP = mkdtempSync(join(tmpdir(), 'memo-229-')); });

/** 真 spawn 出口：`--params` 逐字传，不经任何 shell（Windows 上 PowerShell/cmd 会吃掉内层引号）。 */
function run(dbDir, args) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dbDir }, maxBuffer: 64 * 1024 * 1024,
  });
}

describe('#229 命名与落点（零 IO）', () => {
  it('三条值与裁决 1／2 逐字一致（扁平、两支分名）', () => {
    assert.equal(HELP_HTML_DIR_NAME, 'memo_html');
    assert.equal(HELP_FILE_STEM, '备忘录_HELP');
    assert.equal(LOOKUP_FILE_STEM, '备忘录_速查表');
    assert.notEqual(HELP_FILE_STEM, LOOKUP_FILE_STEM, '两支产物必须分名（#139 判法）');
  });

  it('时间戳与通式照老口径（本地时区、零填充、同秒 _N 从 _2 起）', () => {
    assert.equal(formatHelpStamp(AT), '20260912_133704');
    assert.equal(buildHelpFileName(HELP_FILE_STEM, AT), '备忘录_HELP_20260912_133704.html');
    assert.equal(buildHelpFileName(HELP_FILE_STEM, AT, 2), '备忘录_HELP_20260912_133704_2.html');
    assert.equal(buildHelpFileName(LOOKUP_FILE_STEM, AT), '备忘录_速查表_20260912_133704.html');
    assert.throws(() => formatHelpStamp(new Date('nope')), /有效 Date/);
    assert.throws(() => buildHelpFileName('', AT), /非空字符串/);
  });

  it('落点＝<dbDir>/memo_html/<主体>_<stamp>.html（只出初候选、不建目录、不加 help/ 层）', () => {
    const t = resolveStemTarget(TMP, HELP_FILE_STEM, AT);
    assert.ok(t.startsWith(TMP), '落点在 SKILLS_DB_PATH 下：' + t);
    assert.ok(t.endsWith(join(HELP_HTML_DIR_NAME, '备忘录_HELP_20260912_133704.html')), t);
    assert.equal(existsSync(join(TMP, HELP_HTML_DIR_NAME)), false, '纯命名不做 IO');
    assert.equal(t.includes('help' + sep), false, '裁决 1：不加 help/ 一层');
  });

  it('下一独占候选：`_N` 递增，无 `_N` 则 `_2`（裁决 3 硬条件 2）', () => {
    assert.match(nextExclusiveCandidate('D:/x/备忘录_HELP_20260912_133704.html'), /_20260912_133704_2\.html$/);
    assert.match(nextExclusiveCandidate('D:/x/备忘录_HELP_20260912_133704_2.html'), /_20260912_133704_3\.html$/);
    assert.match(nextExclusiveCandidate('D:/x/备忘录_HELP_20260912_133704_9.html'), /_20260912_133704_10\.html$/);
  });
});

describe('#229 落盘（本包唯一入口）', () => {
  it('独占写：同秒连写三次得本体／_2／_3，各自内容不被覆盖', () => {
    const dir = join(TMP, 'excl');
    const target = join(dir, '备忘录_HELP_20260912_133704.html');
    const a = writeFileExclusiveWithRetry(target, 'A');
    const b = writeFileExclusiveWithRetry(target, 'B');
    const c = writeFileExclusiveWithRetry(target, 'C');
    assert.equal(readFileSync(a, 'utf8'), 'A');
    assert.equal(readFileSync(b, 'utf8'), 'B');
    assert.equal(readFileSync(c, 'utf8'), 'C');
    assert.deepEqual(readdirSync(dir).sort(), [
      '备忘录_HELP_20260912_133704.html', '备忘录_HELP_20260912_133704_2.html', '备忘录_HELP_20260912_133704_3.html',
    ]);
  });

  it('deliverMemoHtml：给绝对路径 ＋ 字节数；explicit 优先且为覆盖写；缺落点即抛', () => {
    const html = '<!DOCTYPE html><p>备忘录</p>';
    const d = deliverMemoHtml({ target: join(TMP, 'd1', '备忘录_HELP_20260912_133704.html'), html });
    assert.equal(d.mode, 'file');
    assert.equal(d.bytes, Buffer.byteLength(html, 'utf8'));
    assert.equal(readFileSync(d.path, 'utf8'), html);
    const explicit = join(TMP, 'deep', 'nested', '自定义.html');
    deliverMemoHtml({ explicit, target: join(TMP, 'd1', 'x.html'), html: 'X' });
    const e2 = deliverMemoHtml({ explicit, target: join(TMP, 'd1', 'x.html'), html: 'Y' });
    assert.equal(e2.path, explicit, 'explicit 逐字使用（不递补）');
    assert.equal(readFileSync(explicit, 'utf8'), 'Y', '显式路径＝覆盖写');
    assert.throws(() => deliverMemoHtml({ html: 'Z' }), /缺落点/);
  });
});

describe('#229 端到端（真 spawn 出口，全程不建库）', () => {
  it('缺省＝HELP 文件：stdout 给绝对路径、路径上有全壳 HTML、且不建 memo 库目录', () => {
    const db = join(TMP, 'prod');
    const r = run(db, ['memo.help.lookup']);
    assert.equal(r.status, 0, r.stderr);
    const env = JSON.parse(r.stdout);
    assert.equal(env.key, 'memo.help.lookup');
    assert.equal(env.shape, 'list');
    assert.equal(env.delivery.mode, 'file');
    assert.ok(env.delivery.path.startsWith(db), '回执路径为绝对路径：' + env.delivery.path);
    assert.ok(env.delivery.path.includes(HELP_HTML_DIR_NAME), env.delivery.path);
    assert.match(env.delivery.path, /备忘录_HELP_\d{8}_\d{6}\.html$/);
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.equal(env.delivery.bytes, Buffer.byteLength(html, 'utf8'), '回执字节数＝实测字节数');
    assert.ok(html.includes('<script id="help-data" type="application/json">'), '落盘物是全壳页，不是片段');
    assert.ok(html.includes('备忘录 · 使用手册'));
    // 裁决 1：扁平落盘，不在 memo_html 下再开子目录
    assert.deepEqual(readdirSync(join(db, HELP_HTML_DIR_NAME)).filter((f) => !f.endsWith('.html')), []);
    assert.equal(existsSync(join(db, 'memo')), false, '看帮助不建 memo 库目录');
  });

  it('同秒连跑 → `_2` 递补（不是覆盖，也不退化成别的名字）', () => {
    const db = join(TMP, 'prod-dup');
    const outs = [];
    for (let i = 0; i < 3; i++) {
      const r = run(db, ['memo.help.lookup']);
      assert.equal(r.status, 0, r.stderr);
      outs.push(JSON.parse(r.stdout).delivery.path);
    }
    assert.equal(new Set(outs).size, 3, '三次回执路径互不相同：' + outs.join(' | '));
    for (const p of outs) assert.ok(existsSync(p));
  });

  it('显式 mode:"lookup" ＝速查表分名文件；q ＝只回命中不落盘', () => {
    const db = join(TMP, 'prod2');
    const m = run(db, ['memo.help.lookup', '--params', JSON.stringify({ mode: 'lookup' })]);
    assert.equal(m.status, 0, m.stderr);
    const me = JSON.parse(m.stdout);
    assert.match(me.delivery.path, /备忘录_速查表_\d{8}_\d{6}\.html$/, me.delivery.path);
    assert.ok(existsSync(me.delivery.path));
    assert.ok(me.data.total >= 28, '速查表含全量唤醒词：' + me.data.total);
    assert.equal(me.data.items[0].category.startsWith('memo.'), true, '每行给 key');
    assert.ok(readFileSync(me.delivery.path, 'utf8').includes('<section data-skill="memo"'), '速查表是 envelope 片段');

    // q 支用**独立**的 db 目录：mode 那支已经把 memo_html 建出来了，共用目录测不出「q 不落盘」。
    const dbQ = join(TMP, 'prod2q');
    const q = run(dbQ, ['memo.help.lookup', '--params', JSON.stringify({ q: '查提醒' })]);
    assert.equal(q.status, 0, q.stderr);
    const qe = JSON.parse(q.stdout);
    assert.equal(qe.delivery, undefined, '现找不默认落盘');
    assert.equal(qe.data.total, 1);
    assert.equal(qe.data.items[0].category, 'memo.remind');
    // 实测更强：q 支连 `SKILLS_DB_PATH` 本身都不建（`deliverMemoHtml` 一次都没调）⇒ 只 stat，不 mkdir。
    assert.equal(existsSync(dbQ), false, 'q 支连 db 目录都不建（只回命中，零落盘）');
  });

  it('--html 逐字覆盖写（同路径跑两次不递补、不新增件）', () => {
    const db = join(TMP, 'prod3');
    const out = join(TMP, 'prod3', 'sub', '我的帮助.html');
    assert.equal(run(db, ['memo.help.lookup', '--html', out]).status, 0);
    assert.equal(run(db, ['memo.help.lookup', '--html', out]).status, 0);
    assert.equal(readdirSync(dirname(out)).length, 1, '覆盖写不产生 _2');
    assert.ok(readFileSync(out, 'utf8').includes('<script id="help-data" type="application/json">'));
    assert.equal(existsSync(join(db, HELP_HTML_DIR_NAME)), false, '显式落点时不写默认目录');
  });

  it('q 与 mode 互斥／mode 非法 → exit 2；落盘失败 → exit 5', () => {
    const db = join(TMP, 'prod4');
    const both = run(db, ['memo.help.lookup', '--params', JSON.stringify({ q: 'x', mode: 'lookup' })]);
    assert.equal(both.status, 2);
    assert.match(both.stderr, /ERR 2/);
    const bad = run(db, ['memo.help.lookup', '--params', JSON.stringify({ mode: 'nope' })]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /ERR 2/);
    mkdirSync(db, { recursive: true });
    const blocker = join(db, 'blocker');
    writeFileSync(blocker, 'x');
    const w = run(db, ['memo.help.lookup', '--html', join(blocker, 'a.html')]);
    assert.equal(w.status, 5, w.stderr);
    assert.match(w.stderr, /ERR 5/);
  });
});
