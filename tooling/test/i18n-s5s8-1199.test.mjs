/**
 * #1199 · S5／S8 两条遗留的机器读数自证（与 tooling/test/*.test.mjs 同层；不在 canonical `pnpm test` 的 glob 内，须单跑）。
 *
 * S5「英文页在排印门下不再整批红」：
 *   ① 合成两列：英文列里出现汉字必红（SCRIPT-MISMATCH）、改成拉丁字必绿、中文列不受影响；
 *   ② 数据位先归一：中文页的「1,189」不算半角标点；
 *   ③ 一件产物两列逐行相同 → 报 SAME-TEXT（没有语言列，不判也不当绿）；非 HTML 产物 → SKIPPED；
 *   ④ 真实语料（#1202 基座渲染的两列）：中文列 0 违规、英文列只剩基线登记的真债、
 *      反事实行证明「按中文名册判英文列」是整批红（en@zh == 差异行数）。
 *
 * S8「改造前锚不是自录的」：
 *   ⑤ 锚的 blob 必须由 git 从 commit:path 解析出来（与锚数据逐字相等）；
 *   ⑥ 改摘要／改工作树／改 blob 各必红；还原必绿；真实仓库 --check exit 0。
 *
 * 跑法：node --test tooling/test/i18n-s5s8-1199.test.mjs
 */
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { LANGUAGES, DEFAULT_LANGUAGE, LANG_REGISTERS } from '../i18n-langs.mjs';
import { textColumn } from '../typography-text.mjs';
import { anchorProblems, ANCHOR_PATHS } from '../i18n-anchor.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const NODE = process.execPath;
const PILOT = join(ROOT, 'packages', 'base-render', 'scripts', 'i18n-pilot-1202.mjs');
const HAS_DIST = existsSync(join(ROOT, 'packages', 'base-render', 'dist', 'blocks.js'));

const html = (s) => '<!doctype html><html><body><p>' + s + '</p></body></html>';
const cols = (zhLine, enLine, baseline = []) => textColumn(new Map([
  ['zh/demo', { text: html(zhLine) }],
  ['en/demo', { text: html(enLine) }],
]), { languages: LANGUAGES, registers: LANG_REGISTERS, defaultLanguage: DEFAULT_LANGUAGE, baseline });

test('S5 合成列：英文列出现汉字必红、改拉丁必绿、中文列不受影响', () => {
  const bad = cols('还差 611 卡', '611 卡 to go');
  const en = bad.columns.get('en');
  assert.ok(en.violations.some((v) => v.code === 'SCRIPT-MISMATCH'), '英文列里的汉字必须判 SCRIPT-MISMATCH');
  assert.equal(bad.columns.get('zh').violations.length, 0, '中文列不许受英文列影响');
  const good = cols('还差 611 卡', '611 cal to go');
  assert.equal(good.columns.get('en').violations.length, 0, '英文列改成拉丁字必须绿');
});

test('S5 数据位归一：千分位数字不是半角标点；全角标点才是', () => {
  const zh = cols('还差 1,189 卡', '611 cal to go');
  assert.equal(zh.columns.get('zh').violations.length, 0, '「1,189」必须先归一成数据位，不算半角标点');
  const punct = cols('还差 611 卡', '611 cal，to go');
  assert.ok(punct.columns.get('en').violations.some((v) => v.code === 'HALF-PUNCT'), '英文列里的全角中文标点必须红');
});

test('S5 两列逐行相同＝SAME-TEXT（不判也不当绿）；非 HTML 产物 SKIPPED', () => {
  const same = cols('卡路里', '卡路里');
  assert.deepEqual(same.sameText, ['demo'], '两列逐行相同的产物必须显式报 SAME-TEXT');
  assert.equal(same.columns.get('en').artifacts, 0, 'SAME-TEXT 的产物不参与读数（不许当绿）');
  const json = textColumn(new Map([
    ['zh/entry', { text: '{"a":"已记录"}' }],
    ['en/entry', { text: '{"a":"已记录"}' }],
  ]), { languages: LANGUAGES, registers: LANG_REGISTERS, defaultLanguage: DEFAULT_LANGUAGE });
  assert.equal(json.skipped.length, 1);
  assert.match(json.skipped[0].why, /不是 HTML 产物/);
});

test('S5 基线三态：登记过的命中不算新债、新债必红、还清必红', () => {
  const debt = [{ lang: 'en', artifact: 'demo', line: '611 卡 to go', code: 'SCRIPT-MISMATCH', why: '自证' }];
  const hit = cols('还差 611 卡', '611 卡 to go', debt);
  assert.equal(hit.columns.get('en').fresh.length, 0);
  assert.equal(hit.columns.get('en').stale.length, 0);
  const moved = cols('还差 611 卡', '800 毫升 to go', debt);
  assert.equal(moved.columns.get('en').fresh.length, 1, '基线里没有的新债必须红');
  assert.equal(moved.columns.get('en').stale.length, 1, '基线里消失的也必须红（还清要显式改基线）');
});

test('S5 真实语料：中文列 0 违规；英文列只剩真债；反事实证明改造前整批红', { skip: !HAS_DIST && 'packages/base-render/dist 没构建' }, async () => {
  const { collectAll } = await import(pathToFileURL(PILOT).href);
  const { artifacts } = await collectAll(LANGUAGES);
  const result = textColumn(artifacts, { languages: LANGUAGES, registers: LANG_REGISTERS, defaultLanguage: DEFAULT_LANGUAGE });
  assert.equal(result.columns.get('zh').violations.length, 0, '中文列必须 0 违规（否则就是名册或数据位归一的问题）');
  assert.ok(result.columns.get('en').violations.length > 0, '英文列此刻确有未译单位（真债），必须是判出来的而不是整批红');
  const enLines = result.columns.get('en').lines.length;
  assert.ok(enLines > 0, '英文列必须有差异行读数');
  const cf = result.counterfactual.get('en');
  assert.equal(cf.lines, enLines);
  assert.equal(cf.red, enLines, '把英文列按中文名册判必须整批红（改造前的形态）——这条是 S5 的对照');
  assert.ok(result.sameText.includes('help'), 'help 两列逐行相同，必须显式报 SAME-TEXT');
  assert.ok(result.skipped.some((s) => s.id === 'entry'), 'entry 不是 HTML，必须 SKIPPED');
});

test('S8 锚的 blob 由 git 从 commit:path 解析（不是自录的）', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'tooling', 'i18n-anchor.json'), 'utf8'));
  assert.equal(data.anchors.length, ANCHOR_PATHS.length);
  for (const a of data.anchors) {
    const r = spawnSync('git', ['rev-parse', a.commit + ':' + a.path], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, 'git 必须能解析 ' + a.commit + ':' + a.path);
    assert.equal(r.stdout.trim(), a.blob, a.path + ' 的锚必须指向已提交对象');
    for (const p of anchorProblems(a)) assert.fail('锚不该有违规：' + p.code + ' ' + p.msg);
  }
});

test('S8 篡改必红、还原必绿（改摘要／改工作树／改 blob）', () => {
  const content = Buffer.from('{"zh":"改造前"}\n');
  const entry = { path: 'demo.json', commit: 'c0ffee', blob: 'b10b', sha256: createHash('sha256').update(content).digest('hex'), bytes: content.length };
  const clean = { revParse: () => 'b10b', catFile: () => content, worktreeBlob: () => 'b10b' };
  assert.equal(anchorProblems(entry, clean).length, 0);
  const flipped = { ...entry, sha256: entry.sha256.slice(0, -1) + (entry.sha256.endsWith('0') ? '1' : '0') };
  assert.ok(anchorProblems(flipped, clean).some((v) => v.code === 'ANCHOR-SHA-MISMATCH'), '改锚里的摘要必须红');
  assert.ok(anchorProblems(entry, { ...clean, worktreeBlob: () => 'deadbeef' }).some((v) => v.code === 'ANCHOR-WORKTREE-DRIFT'), '改工作树一字节必须红');
  assert.ok(anchorProblems(entry, { ...clean, revParse: () => '0ther' }).some((v) => v.code === 'ANCHOR-BLOB-MOVED'), '把锚指到别的 blob 必须红');
});

test('S8 门在真实仓库上 exit 0；篡改过的锚数据必红', () => {
  const r = spawnSync(NODE, [join(ROOT, 'tooling', 'i18n-anchor.mjs')], { encoding: 'utf8', cwd: ROOT });
  assert.equal(r.status, 0, '锚门必须 exit 0：' + r.stderr + r.stdout);
  assert.match(r.stdout, /RESULT: anchors=\d+ verified=\d+ drift=0/, '锚门必须报验证读数');
  assert.equal((r.stdout.match(/worktree=clean/g) || []).length, ANCHOR_PATHS.length, '每件锚都要报 worktree=clean');

  const tmp = mkdtempSync(join(tmpdir(), 't1199-anchor-'));
  try {
    const data = JSON.parse(readFileSync(join(ROOT, 'tooling', 'i18n-anchor.json'), 'utf8'));
    data.anchors[0].sha256 = data.anchors[0].sha256.replace(/^./, (c) => (c === 'f' ? 'e' : 'f'));
    const bad = join(tmp, 'anchor.json');
    writeFileSync(bad, JSON.stringify(data), 'utf8');
    const red = spawnSync(NODE, [join(ROOT, 'tooling', 'i18n-anchor.mjs'), '--check', '--data', bad], { encoding: 'utf8', cwd: ROOT });
    assert.equal(red.status, 1, '篡改锚数据必须 exit 1：' + red.stdout);
    assert.match(red.stderr, /ANCHOR-SHA-MISMATCH/, '必须点名 SHA-MISMATCH');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
