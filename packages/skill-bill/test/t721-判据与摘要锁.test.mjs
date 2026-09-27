/** #721 · 结构判据 ＋ 内容摘要锁（**件头写明：这不是行为断言，是判据**）。
 *
 * 两件东西单列在这里，不混进行为测试（照 #721「Testing Decisions」的「两条不是行为测试的东西，单列」）：
 *
 *   ① **结构性判据（D4）**：一条唤醒词的字面量**只准住它所属那份域声明**里。
 *      机器口径＝扫 `src/**` 手写件（**排除 8 份声明**）的**代码文本**（去注释、去散文串），
 *      凡「整串字面量恰好等于某条唤醒词」即红；两条有出处的豁免：
 *        · `title:` 的值位——命令名与唤醒词是**两种事实**（#684 D3），同名是巧合，不是第二处书写；
 *        · 长于该词的字符串（页面文案、prompt 串里嵌着的词）不算——它不承担路由，
 *          D4 的理由句也承认「照字面 grep 的命中全是页面文案与别的词 prompt 里的子串」。
 *      它为什么是结构判据而不是计数判据：计数要人解释边界（15～71 处全是噪声），结构判据解释不出去。
 *
 *   ② **内容摘要锁**：对**产物**（真渲染出来的 HELP 页）里那段 `help-data` payload 求摘要并锁值。
 *      它钉的是**内容**、不是渲染（锁渲染会让模板改动假红）；属**冻结值台账**一类。
 *      两行值：`PRODUCT_DIGEST`＝74 条场景逐字（今天的事实）；`LEGACY_DIGEST`＝老 71 条逐字
 *      （与老权威 0 差异的机器证据——搬运器的读数由它复核）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpFileData, renderHelpFileHtml } from '../dist/index.js';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(PKG, 'src');

/** 8 份域声明（字面量**准住在这里**）。 */
const DECLARATION_FILES = [
  'help/declaration.ts',
  'write/declaration.ts',
  'query/declaration.ts',
  'analysis/declaration.ts',
  'goal/declaration.ts',
  'account/declaration.ts',
  'link/declaration.ts',
  'setup/declaration.ts',
];

/** 老实物 71 条摘要（历史值，已退役；#977 文字全改后现内容不再与之逐字一致）。
 *  历史值：'93099ecd345b85c65d69231c348fea663af40617a72509968e3829d6e2e108a0'（搬运 0 差异的机器证据，见 docs/skills/skill-bill/t721-证据.md）。 */
const LEGACY_DIGEST = '93099ecd345b85c65d69231c348fea663af40617a72509968e3829d6e2e108a0';
/** 74 条重写后（#977：卡路里式首行＋{{}}＋editable_fields；返修：标题去括号机制注记＋date hint 收选择器口径）的 SHA-256——今天的内容事实。
 *  口径＝canonical（id/title/wake_word/status/prompt_template/types）；editable_fields 另由 #977 专项断言覆盖。 */
const PRODUCT_DIGEST = 'f15a71f9c5d1dea99d6e394c80de61b9db15408c7977368fea59cdcfea111cf3';
/** 词 → 命令 表（77 条，按词排序）的 SHA-256——取自**改前**那份手写词表（#721 搬运前当刻）。
 *  它钉的是「一条词还路由到与今天相同的命令」，属搬运 0 差异的机器证据。 */
const ROUTE_DIGEST = 'd51353d5fda05cb39de7aad5909ae533d7d6408868f0ff3d7098b4b88c7bc9b9';
const ADDED_IDS = new Set(['write_record', 'query_bills', 'query_bill_detail']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** 去注释 ＋ 取代码里的字符串字面量（只认单/双引号；模板串不参与判据——本包页面文案不用它装唤醒词）。 */
function codeLiterals(text) {
  const out = [];
  let i = 0;
  let line = 1;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '\n') { line += 1; i += 1; continue; }
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i += 1; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) { if (text[i] === '\n') line += 1; i += 1; } i += 2; continue; }
    if (c === '\'' || c === '"') {
      const quote = c;
      let j = i + 1;
      let v = '';
      while (j < text.length && text[j] !== quote) {
        if (text[j] === '\\') { v += text[j] + text[j + 1]; j += 2; continue; }
        v += text[j];
        j += 1;
      }
      const before = text.slice(Math.max(0, i - 16), i);
      out.push({ value: v, line, field: /title:\s*$/.test(before) ? 'title' : '' });
      i = j + 1;
      continue;
    }
    if (c === '`') { // 跳过模板串（不参与判据）
      i += 1;
      while (i < text.length && text[i] !== '`') { if (text[i] === '\\') i += 2; else i += 1; }
      i += 1;
      continue;
    }
    i += 1;
  }
  return out;
}

/** 产物 HELP 页里那段 help-data payload（模板直转、零改写——内容目录本身）。 */
function productPayload() {
  const html = renderHelpFileHtml(buildHelpFileData(new Date('2026-09-11T14:30:00'), { initialized: false }));
  const open = html.indexOf('<script id="help-data"');
  assert.ok(open >= 0, 'HELP 产物里没有 help-data 锚点');
  const start = html.indexOf('>', open) + 1;
  const end = html.indexOf('</script>', start);
  return JSON.parse(html.slice(start, end));
}

const canonical = (rows) => JSON.stringify(rows.map((s) => [s.id, s.title, s.wake_word, s.status, s.prompt_template, s.types]));

describe('#721 · 结构性判据：一条唤醒词只准住它所属那份域声明', () => {
  it('非声明件的代码文本里，整串字面量命中即红（title 值位除外）', async () => {
    const { WAKE_TABLE } = await import('../dist/triggers/wakeTable.js');
    const phrases = new Set(WAKE_TABLE.map((e) => e.phrase));
    const allowed = new Set(DECLARATION_FILES.map((f) => f.replace(/\//g, '\\')));
    const hits = [];
    for (const abs of walk(SRC)) {
      const rel = relative(SRC, abs);
      if (allowed.has(rel) || rel === 'triggers\\wakeTable.ts') continue; // 声明件；wakeTable 只有类型与逻辑、无字面量
      for (const lit of codeLiterals(readFileSync(abs, 'utf8'))) {
        if (lit.field === 'title') continue;
        if (phrases.has(lit.value)) hits.push(rel + ':' + lit.line + ' 「' + lit.value + '」');
      }
    }
    assert.deepEqual(hits, [], '唤醒词字面量出现在非声明件里（一条词只有一个书写位）：\n' + hits.join('\n'));
  });

  it('自证：判据对「在别处再写一遍」发红（改坏一处即命中）', () => {
    const sample = 'const w = \'记支出\';\n    title: \'记支出\',\n// 注释里的 记支出 不算\nconst prose = \'要记一笔就说「记支出」。\';\n';
    const got = codeLiterals(sample).filter((l) => l.value === '记支出');
    assert.equal(got.length, 2, '判据应命中两处（赋值位 ＋ title 位）');
    assert.equal(got.filter((l) => l.field !== 'title').length, 1, '除去 title 位应还剩一处');
  });
});

describe('#721 · 内容摘要锁（冻结值台账一类，不是行为断言）', () => {
  it('产物 payload 的 74 条场景逐字锁', () => {
    const rows = productPayload().groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
    assert.equal(rows.length, 74);
    const digest = createHash('sha256').update(canonical(rows), 'utf8').digest('hex');
    assert.equal(digest, PRODUCT_DIGEST, '内容摘要变了：改的是域声明里的字就不是白改，摘要锁要跟着重钉（并在证据件里记一行）');
  });

  it('老 71 条逐字锁已退役（#977 文字全改；历史值见常量注释，現内容不再逐字一致）', () => {
    const rows = productPayload().groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes))
      .filter((s) => !ADDED_IDS.has(s.id));
    assert.equal(rows.length, 71);
    assert.notEqual(createHash('sha256').update(canonical(rows), 'utf8').digest('hex'), LEGACY_DIGEST, '老锁应已变红（重写生效的证据）；若此断言失败说明重写被回滚');
  });

  it('#977 字段锁：60 有参带 editable_fields（kind 闭集＋{{}}一一对应），14 零参缺席', async () => {
    const { WAKE_ASSETS } = await import('../dist/triggers/wake-assets.js');
    const KINDS = new Set(['text', 'number', 'select', 'date', 'week']);
    const withFields = WAKE_ASSETS.filter((s) => s.editable_fields !== undefined);
    assert.equal(withFields.length, 60);
    assert.equal(WAKE_ASSETS.filter((s) => s.editable_fields === undefined).length, 14);
    for (const s of withFields) {
      assert.ok(s.editable_fields.length > 0, s.id + ' 空数组（零参须缺席，不发空数组）');
      const names = new Set();
      for (const f of s.editable_fields) {
        assert.ok(f.name && f.label, s.id + ' 字段缺 name/label');
        assert.ok(!names.has(f.name), s.id + ' 字段名重复：' + f.name);
        names.add(f.name);
        assert.ok(KINDS.has(f.kind ?? 'text'), s.id + ' 非法 kind：' + f.kind);
        assert.ok(s.prompt_template.includes('{{' + f.name + '}}'), s.id + ' 字段无对应占位：' + f.name);
        if (f.kind === 'select') assert.ok(Array.isArray(f.options) && f.options.length > 0, s.id + ' select 无 options');
      }
      for (const m of s.prompt_template.matchAll(/\{\{(\w+)\}\}/g)) {
        assert.ok(names.has(m[1]), s.id + ' 占位无字段定义：' + m[1]);
      }
    }
  });

  it('词 → 命令 表逐条与改前相同（77 条，按词排序后摘要锁）', async () => {
    const { WAKE_TABLE } = await import('../dist/triggers/wakeTable.js');
    assert.equal(WAKE_TABLE.length, 77);
    const pairs = WAKE_TABLE.map((e) => [e.phrase, e.key]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    assert.equal(createHash('sha256').update(JSON.stringify(pairs), 'utf8').digest('hex'), ROUTE_DIGEST);
  });
});
