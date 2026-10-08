/**
 * #1199 · 语言列与两道新门的自证（门禁工具自证族，与 tooling/test/*.test.mjs 同层；不在 canonical `pnpm test` 的 glob 内，须单跑）。
 *
 * 覆盖四条：
 *   ① 语言列路径：中文列＝存量路径（逐字节不动），英文列另起一份账本；未识别语言必须抛。
 *   ② 排印名册：语言无关的结构约束与语言相关的阀值分开；英文段长上限宽于中文。
 *   ③ 缺词条门：范围 0 件时**显式报「范围 0 件」**且 exit 0；塞一件缺词条必红；删回去必绿。
 *   ④ key 残留门：注释里的中文不算残留、命令关键字不算残留、真残留必红、搬进词条表必绿。
 *
 * 跑法：node --test tooling/test/i18n-langs-1199.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, mkdirSync as _m, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { LANGUAGES, DEFAULT_LANGUAGE, ledgerPath, normalizeLang, registerOf, STRUCTURAL_RULES, EMPTY_SCOPE_VERDICT } from '../i18n-langs.mjs';
import { audit as entriesAudit } from '../check-i18n-entries.mjs';
import { audit as keysAudit, literalsOf, residueOf, isFrozen } from '../check-i18n-keys.mjs';
import { auditRegisters as typoRegisters, auditFixture as typoFixture, compareBaseline, FIXTURE_BASELINE } from '../check-typography-langs.mjs';
import { LANG_REGISTERS } from '../i18n-langs.mjs';
import { loadEnColumn, enGaps } from '../calorie-html-snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const NODE = process.execPath;

test('#1199 语言列：中文列走存量路径、英文列另起、未识别语言抛', () => {
  assert.deepEqual([...LANGUAGES], ['zh', 'en']);
  assert.equal(DEFAULT_LANGUAGE, 'zh');
  assert.equal(ledgerPath('tooling/skill-html.snapshot.json', 'zh'), 'tooling/skill-html.snapshot.json');
  assert.equal(ledgerPath('tooling/skill-html.snapshot.json', 'en'), 'tooling/skill-html.snapshot.en.json');
  assert.equal(normalizeLang(''), 'zh');
  assert.throws(() => normalizeLang('ja'), /未识别语言/);
  assert.ok(STRUCTURAL_RULES.length >= 3, '语言无关结构约束至少三条');
  assert.ok(registerOf('zh').maxSegChars < registerOf('en').maxSegChars, '英文并列段长上限须宽于中文');
  assert.equal(registerOf('en').separators.length, 0, '英文列不得把半角分号当懒政');
});

test('#1199 缺词条门：范围 0 件显式报数且 exit 0；缺词条必红；补上必绿', () => {
  const empty = entriesAudit({ files: [], allowlist: [] }, ROOT);
  assert.equal(empty.files.length, 0);
  assert.equal(empty.missing.length, 0);
  assert.ok(EMPTY_SCOPE_VERDICT.includes('范围 0 件'), '空范围判词必须显式说「范围 0 件」');

  const tmp = mkdtempSync(join(tmpdir(), 't1199-ent-'));
  try {
    const dir = join(tmp, 'packages', 'base-entries', 'src', 'entries');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'zh.json'), JSON.stringify({ 'demo.title': '标题' }), 'utf8');
    writeFileSync(join(dir, 'en.json'), JSON.stringify({ 'demo.title': 'Title' }), 'utf8');
    writeFileSync(join(tmp, 'demo.ts'), "import { e } from 'base-entries';\nexport const a = e('demo.title');\nexport const b = e('demo.gone');\n", 'utf8');
    const bad = entriesAudit({ files: ['demo.ts'], allowlist: [] }, tmp);
    assert.equal(bad.missing.length, 2, ' 缺 1 个 key × 2 门语言＝2 处');
    assert.deepEqual(bad.missing.map((m) => m.lang).sort(), ['en', 'zh']);
    writeFileSync(join(dir, 'en.json'), JSON.stringify({ 'demo.title': 'Title', 'demo.gone': 'Gone' }), 'utf8');
    writeFileSync(join(dir, 'zh.json'), JSON.stringify({ 'demo.title': '标题', 'demo.gone': '没了' }), 'utf8');
    const good = entriesAudit({ files: ['demo.ts'], allowlist: [] }, tmp);
    assert.equal(good.missing.length, 0, '补上词条后必须零缺');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('#1199 key 残留门：注释与命令关键字豁免、真残留必红、搬进词条表必绿', () => {
  const tmp = mkdtempSync(join(tmpdir(), 't1199-keys-'));
  try {
    const dir = join(tmp, 'packages', 'base-entries', 'src', 'entries');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'zh.json'), JSON.stringify({ 'demo.title': '标题' }), 'utf8');
    writeFileSync(join(dir, 'en.json'), JSON.stringify({ 'demo.title': 'Title' }), 'utf8');
    const src = [
      "import { e } from 'base-entries';",
      '// 注释里的中文不算残留',
      "export const key = 'bill.record.add';",
      "export const a = e('demo.title');",
      "export const leak = '这里是硬编码的中文文案';\n",
    ].join('\n');
    writeFileSync(join(tmp, 'demo.ts'), src, 'utf8');
    const lits = literalsOf(src);
    assert.equal(lits.length, 4, '非注释字面量应 4 条（注释不抽）');
    assert.ok(isFrozen('bill.record.add'), '命令关键字必须判冻结');
    assert.equal(residueOf('bill.record.add', 'zh'), null);
    assert.ok(residueOf('这里是硬编码的中文文案', 'zh'), '中文残留必须命中');
    const bad = keysAudit({ files: ['demo.ts'], allowlist: [] }, tmp);
    assert.equal(bad.residue.length, 1, '应恰好 1 处残留');
    writeFileSync(join(tmp, 'demo.ts'), src.replace("'这里是硬编码的中文文案'", "e('demo.title')"), 'utf8');
    const good = keysAudit({ files: ['demo.ts'], allowlist: [] }, tmp);
    assert.equal(good.residue.length, 0, '搬进词条表后必须零残留');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('#1199 排印门：结构约束不许按语言放宽、语言阀值不许两边一样', () => {
  assert.deepEqual(typoRegisters({}), [], '现状名册必须零违规');
  const weakened = { ...LANG_REGISTERS, en: { ...LANG_REGISTERS.en, overflow: 'allow' } };
  assert.ok(typoRegisters({ registers: weakened }).some((v) => v.code === 'LANG-WEAKENED-STRUCTURAL'),
    '按语言放宽结构约束必须红');
  const narrow = { ...LANG_REGISTERS, en: { ...LANG_REGISTERS.en, maxSegChars: LANG_REGISTERS.zh.maxSegChars } };
  assert.ok(typoRegisters({ registers: narrow }).some((v) => v.code === 'SEG-LIMIT-NOT-WIDER'),
    '英文并列段长上限不宽于中文必须红');
  const identical = { ...LANG_REGISTERS, en: { ...LANG_REGISTERS.zh } };
  assert.ok(typoRegisters({ registers: identical }).some((v) => v.code === 'REGISTER-NOT-SPLIT'),
    '两门语言名册一样必须红');
  const lowerFloor = { ...LANG_REGISTERS, en: { ...LANG_REGISTERS.en, fontFloorPx: 8 } };
  assert.ok(typoRegisters({ registers: lowerFloor }).some((v) => v.code === 'FONT-FLOOR-ORDER'),
    '拉丁语言字号下限低于基准语言必须红');
});

test('#1199 排印门：版式读数与基线账本比对（新债必红、还清要显式改基线）', () => {
  const fake = { rows: [{ name: 'demo', widths: { '390': { outOfBounds: 1, minFontPxNoSvg: 8, touchSmall: 0 } } }] };
  const fv = typoFixture(fake);
  assert.ok(fv.violations.some((v) => v.code === 'OVERFLOW'), 'outOfBounds≠0 必须报（不溢出＝语言无关结构约束）');
  assert.ok(fv.violations.some((v) => v.code === 'FONT-FLOOR'), '字号跌破下限必须报');
  const cmp = compareBaseline(fv.violations, FIXTURE_BASELINE);
  assert.ok(cmp.fresh.length > 0, '基线里没有的读数＝新债，必须报 fresh（不许静默进来）');
  assert.ok(compareBaseline([], FIXTURE_BASELINE).stale.length === FIXTURE_BASELINE.length,
    '台面上一条都没有时，基线全部记 stale（还清要显式改基线）');
  const emptyFix = typoFixture({ rows: [{ name: 'demo', widths: {} }] });
  assert.ok(emptyFix.skipped.length > 0, '版式读数全空必须报 skipped（门失明不许当绿）');
});

test('#1199 calorie 列：英文列空列＝0 件待录入（不当绿也不当红）；同哈希记录必须抛', () => {
  const zhPath = join(ROOT, 'tooling', 'calorie-html.snapshot.json');
  const enPath = join(ROOT, 'tooling', 'calorie-html.snapshot.en.json');
  const col = loadEnColumn(enPath, zhPath);
  assert.equal(col.lang, 'en');
  assert.equal(Object.keys(col.records).length, 0, '英文列骨架起步必须是 0 件');
  assert.equal(Object.keys(col.artifacts).length, 2, '中文列须有 2 件（help-html／help-meta）');
  assert.equal(enGaps(col, null).pending, true, '没有英文列对照读数时必须报 pending');
  const same = { 'calorie/help-html': { sha256: col.artifacts['calorie/help-html'].sha256 } };
  assert.deepEqual(enGaps(col, same).undocumented, [], '与中文列同哈希＝没偏离，不算漏记');
  const diff = { 'calorie/help-html': { sha256: '11111111111111111111111111111111' } };
  assert.deepEqual(enGaps(col, diff).undocumented, ['calorie/help-html'], '偏离中文列又没记录＝漏记，必须点出来');
  const tmp = join(tmpdir(), 't1199-cal-en-' + process.pid + '.json');
  writeFileSync(tmp, JSON.stringify({
    lang: 'en', basedOn: 'tooling/calorie-html.snapshot.json',
    records: { 'calorie/help-html': { sha256: col.artifacts['calorie/help-html'].sha256 } },
  }), 'utf8');
  assert.throws(() => loadEnColumn(tmp, zhPath), /同件同哈希/, '英文列记一条与中文列同哈希的记录必须抛');
  rmSync(tmp, { force: true });
});

test('#1199 三道新门在真实仓库上：范围 0 件＝显式报数且 exit 0；排印门绿', () => {
  for (const gate of ['check-i18n-entries.mjs', 'check-i18n-keys.mjs']) {
    const r = spawnSync(NODE, [join(ROOT, 'tooling', gate)], { encoding: 'utf8', cwd: ROOT });
    assert.equal(r.status, 0, gate + ' 范围 0 件必须 exit 0（起步绿）：' + r.stderr);
    assert.match(r.stdout, /EMPTY-SCOPE .*范围 0 件/, gate + ' 必须显式报「范围 0 件」：' + r.stdout);
    assert.match(r.stdout, /PASS: 范围 0 件/, gate + ' 末行必须说清「这一轮什么都没查」：' + r.stdout);
  }
  const typo = spawnSync(NODE, [join(ROOT, 'tooling', 'check-typography-langs.mjs')], { encoding: 'utf8', cwd: ROOT });
  assert.equal(typo.status, 0, '排印门必须 exit 0：' + typo.stderr + typo.stdout);
  assert.match(typo.stdout, /BASELINE: 存续债 \d+ 条/, '排印门必须印基线读数');
  assert.match(typo.stdout, /PASS: 结构约束语言无关/, '排印门末行必须说清结构约束语言无关');
});