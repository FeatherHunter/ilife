#!/usr/bin/env node
/** #1197 · 迁移器与回填器的自测：在临时目录里搭一个最小包，逐条验口径（不碰仓库里的真件）。
 *
 *  跑法：node tooling/i18n-migrate.mjs --selftest ／ node tooling/i18n-fill.mjs --selftest
 *  末行固定：RESULT: passed=<n> failed=<n>；有 FAIL 时进程码 1。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import { readTable, tablePath } from '../i18n-migrate/table.mjs';
import { loadTablesByPackage } from '../i18n-tables.mjs';

/** 模板字面量的定界符：本文件整段用 String.raw 落盘，反引号与美元花括号都从字符码拼出来。 */
const BT = String.fromCharCode(96);
const DOL = String.fromCharCode(36);

/** 最小 entries/index.ts：只要能过 entriesHasM 的判据（export function m(）。 */
const BASE_INDEX = [
  'export function m(id: string, params?: Record<string, string | number>): string {',
  "  return id + String(params === undefined ? '' : JSON.stringify(params));",
  '}',
  '',
].join('\n');

const EMPTY_ZH = 'export const zh = {\n};\n';
const EMPTY_EN = 'export const en = {\n};\n';

/** 搭一个临时仓根：最小包 ＋ 本用例要的文件。 */
function makeRoot(files) {
  const root = mkdtempSync(join(tmpdir(), 'i18n-selftest-'));
  const write = (rel, text) => {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text, 'utf8');
  };
  write('packages/demo-pkg/src/entries/index.ts', BASE_INDEX);
  write('packages/demo-pkg/src/entries/zh.ts', EMPTY_ZH);
  write('packages/demo-pkg/src/entries/en.ts', EMPTY_EN);
  for (const rel of Object.keys(files)) write(rel, files[rel]);
  return root;
}

function makeRunner() {
  const state = { passed: 0, failures: [], lines: [] };
  const check = (name, ok, detail) => {
    if (ok) {
      state.passed += 1;
      state.lines.push('PASS  ' + name);
      return true;
    }
    state.failures.push(name + (detail === undefined ? '' : '：' + detail));
    state.lines.push('FAIL  ' + name + (detail === undefined ? '' : '：' + detail));
    return false;
  };
  return { state, check };
}

function finish(state) {
  state.lines.push('RESULT: passed=' + state.passed + ' failed=' + state.failures.length);
  return { passed: state.passed, failed: state.failures.length, text: state.lines.join('\n'), failures: state.failures };
}

function readText(root, rel) {
  return readFileSync(join(root, rel), 'utf8');
}
/** 12 条：口径（迁什么、怎么整句化、什么不迁、fail-closed、幂等、门禁可读）。
 *  migrate 由调用方注入（不从 CLI 反向 import：那会与 --selftest 的动态 import 成环）。
 */
export function runMigrateSelftest(api) {
  const { migrate } = api;
  const { state, check } = makeRunner();
  const roots = [];
  const mk = (files) => { const root = makeRoot(files); roots.push(root); return root; };
  try {
    // ① 单字面量 → m('key')，zh 值逐字等于原字面量，分节注释与仓内既成节同形
    const REL1 = 'packages/demo-pkg/src/ui/copy.ts';
    const root1 = mk({ [REL1]: ['export function title(): string {', "  return '还缺什么';", '}', ''].join('\n') });
    const report1 = migrate({ root: root1, files: [REL1], ticket: 997, dry: false });
    const text1 = readText(root1, REL1);
    check('单字面量改写成 m(...)', text1.indexOf("return m('demo-pkg.ui-copy.c001');") >= 0, text1);
    check('取词 import 注入到 ../entries/index.js', text1.indexOf("import { m } from '../entries/index.js';") >= 0, text1);
    check('原字面量被整句替换（源码里不再有那句中文）', text1.indexOf('还缺什么') < 0, text1);
    const zh1 = readTable(root1, 'demo-pkg', 'zh');
    check('zh 值逐字等于改造前字面量', zh1.ok && zh1.entries.length === 1 && zh1.entries[0].value === '还缺什么', JSON.stringify(zh1.ok ? zh1.entries : zh1.why));
    check('en 先写空串（未录）', zh1.ok && readTable(root1, 'demo-pkg', 'en').entries[0].value === '');
    check('分节注释与仓内 #1205 既成节同形',
      readText(root1, 'packages/demo-pkg/src/entries/zh.ts').indexOf('  /* ── packages/demo-pkg/src/ui/copy.ts（#997 迁入） ── */') >= 0,
      readText(root1, 'packages/demo-pkg/src/entries/zh.ts'));
    check('报告读数 migrated=1 entries=1', report1.totals.migrated === 1 && report1.totals.entries === 1, JSON.stringify(report1.totals));

    // ② + 链整句化：字面量片段逐字进模板，非字面量操作数成 {p0}…（外面包 String(...)）
    const REL2 = 'packages/demo-pkg/src/ui/hint.ts';
    const root2 = mk({ [REL2]: [
      'export function hint(require: string, amount: number): string {',
      "  return '方向对不上：' + require + '，给的是 ' + money2(amount);",
      '}',
      '',
    ].join('\n') });
    migrate({ root: root2, files: [REL2], ticket: 997, dry: false });
    const zh2 = readTable(root2, 'demo-pkg', 'zh');
    check('+ 链整句化成一个模板', zh2.ok && zh2.entries[0].value === '方向对不上：{p0}，给的是 {p1}', JSON.stringify(zh2.ok ? zh2.entries : zh2.why));
    const text2 = readText(root2, REL2);
    check('非字面量操作数包 String(...)', text2.indexOf('p0: String(require)') >= 0 && text2.indexOf('p1: String(money2(amount))') >= 0, text2);

    // ③ 数值加法不被拆开：a + b + ' 笔' 里 a+b 整段成一个参数
    const REL3 = 'packages/demo-pkg/src/ui/count.ts';
    const root3 = mk({ [REL3]: [
      'export function label(count: number, n: number): string {',
      "  return count + n + ' 笔';",
      '}',
      '',
    ].join('\n') });
    migrate({ root: root3, files: [REL3], ticket: 997, dry: false });
    const zh3 = readTable(root3, 'demo-pkg', 'zh');
    const text3 = readText(root3, REL3);
    check('数值加法整段保留（不被拆成两个参数）', zh3.ok && zh3.entries[0].value === '{p0} 笔' && text3.indexOf('String(count + n)') >= 0, (zh3.ok ? JSON.stringify(zh3.entries) : zh3.why) + ' / ' + text3);

    // ④ 带插值的模板 → 同形模板
    const REL4 = 'packages/demo-pkg/src/ui/total.ts';
    const root4 = mk({ [REL4]: [
      'export function total(n: number): string {',
      '  return ' + BT + '共 ' + DOL + '{n} 笔' + BT + ';',
      '}',
      '',
    ].join('\n') });
    migrate({ root: root4, files: [REL4], ticket: 997, dry: false });
    const zh4 = readTable(root4, 'demo-pkg', 'zh');
    check('模板插值整句化成 {p0}', zh4.ok && zh4.entries[0].value === '共 {p0} 笔', JSON.stringify(zh4.ok ? zh4.entries : zh4.why));
    check('模板参数取表达式原文', readText(root4, REL4).indexOf('p0: String(n)') >= 0, readText(root4, REL4));

    // ⑤ 开发期失败报文不迁（throw／new Error／fail(...)）
    const REL5 = 'packages/demo-pkg/src/ui/guard.ts';
    const src5 = [
      'export function check(why: string): void {',
      "  if (why === '') throw new Error('内部：空值');",
      "  fail('不该走到这里：' + why);",
      '}',
      '',
    ].join('\n');
    const root5 = mk({ [REL5]: src5 });
    const report5 = migrate({ root: root5, files: [REL5], ticket: 997, dry: false });
    check('dev 报文整件不迁（skip）', report5.files[0].status === 'skip', report5.files[0].status + ' ' + report5.files[0].why);
    check('dev 报文一个字节都不动', readText(root5, REL5) === src5, readText(root5, REL5));
    check('dev 报文两条都进报告（SKIP_DEV_MESSAGE）',
      report5.files[0].skips.filter((skip) => skip.reason === 'SKIP_DEV_MESSAGE').length === 2,
      JSON.stringify(report5.files[0].skips));

    // ⑥ 比较操作数不迁，同文件里的真文案照迁
    const REL6 = 'packages/demo-pkg/src/ui/why.ts';
    const root6 = mk({ [REL6]: [
      'export function whyOf(why: string): string {',
      "  if (why === '没给') return '未提供';",
      "  return '说了：' + why;",
      '}',
      '',
    ].join('\n') });
    const report6 = migrate({ root: root6, files: [REL6], ticket: 997, dry: false });
    check('比较操作数按 SKIP_COMPARISON 记进报告',
      report6.files[0].skips.some((skip) => skip.reason === 'SKIP_COMPARISON' && skip.value.indexOf('没给') >= 0),
      JSON.stringify(report6.files[0].skips));
    check('同文件里的真文案照迁（2 条）', report6.totals.entries === 2, String(report6.totals.entries));
    check('比较串留在源码里', readText(root6, REL6).indexOf("why === '没给'") >= 0, readText(root6, REL6));

    // ⑦ 派生件整件 skip
    const REL7 = 'packages/demo-pkg/src/helpAssets.ts';
    const src7 = "export const HELP = '帮助文本';\n";
    const root7 = mk({ [REL7]: src7 });
    const report7 = migrate({ root: root7, files: [REL7], ticket: 997, dry: false });
    check('派生件整件 skip（不手改生成物）', report7.files[0].status === 'skip' && report7.files[0].why.indexOf('派生件') >= 0, report7.files[0].why);
    check('派生件不写盘', readText(root7, REL7) === src7);

    // ⑧ 重跑幂等：第二次 0 改动、表逐字节不变
    const zhText1 = readText(root1, 'packages/demo-pkg/src/entries/zh.ts');
    const report8 = migrate({ root: root1, files: [REL1], ticket: 997, dry: false });
    check('重跑幂等（第二次 migrated=0）', report8.totals.migrated === 0 && report8.totals.entries === 0, JSON.stringify(report8.totals));
    check('重跑后表逐字节不变', readText(root1, 'packages/demo-pkg/src/entries/zh.ts') === zhText1);

    // ⑨ 门禁读得懂：loadTablesByPackage 读得到、zh 值逐字相同、en 记空白
    const gate = loadTablesByPackage(root1, ['zh', 'en']);
    const pkgTables = gate.packages.get('demo-pkg');
    const zhGate = pkgTables === undefined ? undefined : pkgTables.get('zh');
    const enGate = pkgTables === undefined ? undefined : pkgTables.get('en');
    check('门禁（loadTablesByPackage）读得出本包表且无错', gate.errors.length === 0 && zhGate !== undefined, JSON.stringify(gate.errors));
    check('门禁读到的 zh 值逐字相同', zhGate !== undefined && zhGate.entries.get('demo-pkg.ui-copy.c001') === '还缺什么', zhGate === undefined ? 'no zh' : String(zhGate.entries.get('demo-pkg.ui-copy.c001')));
    check('门禁把 en 记为空白（未录）', enGate !== undefined && enGate.blanks.length === 1, enGate === undefined ? 'no en' : JSON.stringify(enGate.blanks));

    // ⑩ fail-closed：字面量里含 {count} 形态 → 整件 UNSUPPORTED，一个字节都不写
    const REL10 = 'packages/demo-pkg/src/ui/raw.ts';
    const src10 = ['export function raw(count: number): string {', "  return '共 {count} 条';", '}', ''].join('\n');
    const root10 = mk({ [REL10]: src10 });
    const zhBefore10 = readText(root10, 'packages/demo-pkg/src/entries/zh.ts');
    const report10 = migrate({ root: root10, files: [REL10], ticket: 997, dry: false });
    check('字符里含 {name} 形态 → 整件 UNSUPPORTED', report10.files[0].status === 'unsupported' && report10.totals.unsupported === 1, report10.files[0].status + ' ' + report10.files[0].why);
    check('UNSUPPORTED 的件一个字节都不写', readText(root10, REL10) === src10);
    check('UNSUPPORTED 的件不往表里加条目', readText(root10, 'packages/demo-pkg/src/entries/zh.ts') === zhBefore10);

    // ⑪ import 注入：已有同源具名 import 就并进去
    const REL11 = 'packages/demo-pkg/src/ui/merge.ts';
    const root11 = mk({ [REL11]: [
      "import { SKILL_BILL_CATALOG } from '../entries/index.js';",
      '',
      'export function merged(): string {',
      "  return '并进来';",
      '}',
      '',
    ].join('\n') });
    migrate({ root: root11, files: [REL11], ticket: 997, dry: false });
    check('已有同源 import 时并入 , m', readText(root11, REL11).indexOf("import { SKILL_BILL_CATALOG, m } from '../entries/index.js';") >= 0, readText(root11, REL11));

    // ⑫ --dry 不写盘
    const REL12 = 'packages/demo-pkg/src/ui/dry.ts';
    const src12 = ['export function dry(): string {', "  return '别写我';", '}', ''].join('\n');
    const root12 = mk({ [REL12]: src12 });
    const report12 = migrate({ root: root12, files: [REL12], ticket: 997, dry: true });
    check('--dry 算出条目但不写盘', report12.totals.entries === 1 && readText(root12, REL12) === src12);
    check('--dry 不动表', readText(root12, 'packages/demo-pkg/src/entries/zh.ts') === EMPTY_ZH);

    // ⑬ 表里有多行块注释（仓内确有）→ 解析得动、注释逐字保留、新条目接在既有最大序号之后
    const REL13 = 'packages/demo-pkg/src/ui/multi.ts';
    const ZH13 = [
      'export const zh = {',
      '  /* #1 多行说明：这一行是注释',
      '     续行也逐字保留。 */',
      '  \'demo-pkg.ui-multi.c900\': "老词条",',
      '};',
      '',
    ].join('\n');
    const root13 = mk({ [REL13]: ['export function multi(): string {', "  return '新文案';", '}', ''].join('\n') });
    writeFileSync(join(root13, 'packages/demo-pkg/src/entries/zh.ts'), ZH13, 'utf8');
    const report13 = migrate({ root: root13, files: [REL13], ticket: 997, dry: false });
    const zh13 = readText(root13, 'packages/demo-pkg/src/entries/zh.ts');
    check('多行块注释的表解析得动（迁移照走）', report13.totals.migrated === 1, JSON.stringify(report13.totals) + ' ' + (report13.files[0].why || ''));
    check('多行块注释逐字保留', zh13.indexOf('     续行也逐字保留。 */') >= 0, zh13);
    check('半迁移的件从既有最大序号 +1 接（c900 → c901，不撞旧 key）', zh13.indexOf("'demo-pkg.ui-multi.c901'") >= 0 && zh13.indexOf('老词条') < zh13.indexOf("'demo-pkg.ui-multi.c901'"), zh13);
    check('接完后表仍可解析', readTable(root13, 'demo-pkg', 'zh').ok, zh13);

    // ⑭ 本件已有同一条分节注释（上一轮迁过一半）→ 条目接进那一节，不重复插注释
    const REL14 = 'packages/demo-pkg/src/ui/reuse.ts';
    const MARK14 = '  /* ── ' + REL14 + '（#997 迁入） ── */';
    const ZH14 = ['export const zh = {', MARK14, '  \'demo-pkg.ui-reuse.c001\': "旧一条",', '};', ''].join('\n');
    const root14 = mk({ [REL14]: ['export function reuse(): string {', "  return '再接一条';", '}', ''].join('\n') });
    writeFileSync(join(root14, 'packages/demo-pkg/src/entries/zh.ts'), ZH14, 'utf8');
    const report14 = migrate({ root: root14, files: [REL14], ticket: 997, dry: false });
    const zh14 = readText(root14, 'packages/demo-pkg/src/entries/zh.ts');
    const marks14 = zh14.split('（#997 迁入） ── */').length - 1;
    check('已有分节时不重复插注释（只一条分节头）', marks14 === 1, String(marks14) + '\n' + zh14);
    check('新条目续号 c002 且紧跟在旧条目之后', zh14.indexOf("'demo-pkg.ui-reuse.c002'") > zh14.indexOf("'demo-pkg.ui-reuse.c001'"), zh14);
    check('复用分节的那批也算迁移成功', report14.totals.migrated === 1 && report14.totals.entries === 1, JSON.stringify(report14.totals));

    // ⑮ key 里的件名大小写原样保留（仓内既成 key 是 write-candidatePick 这种）
    const REL15 = 'packages/demo-pkg/src/ui/candidatePick.ts';
    const root15 = mk({ [REL15]: ['export function pick(): string {', "  return '大小写要留着';", '}', ''].join('\n') });
    migrate({ root: root15, files: [REL15], ticket: 997, dry: false });
    check('件名大小写原样保留（ui-candidatePick，不折成 candidatepick）', readText(root15, 'packages/demo-pkg/src/entries/zh.ts').indexOf("'demo-pkg.ui-candidatePick.c001'") >= 0, readText(root15, 'packages/demo-pkg/src/entries/zh.ts'));
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
  return finish(state);
}
/** 10 条：回填器的口径（只填空串、三条报错、顺序与幂等）。 */
export function runFillSelftest(api) {
  const { applyMap, pendingOf } = api;
  const { state, check } = makeRunner();
  const roots = [];
  const ZH_TABLE = [
    'export const zh = {',
    '  /* ── packages/demo-pkg/src/ui/copy.ts（#997 迁入） ── */',
    '  \'demo-pkg.ui-copy.c001\': "还缺什么",',
    '  \'demo-pkg.ui-copy.c002\': "共 {p0} 笔",',
    '};',
    '',
  ].join('\n');
  const EN_TABLE = [
    'export const en = {',
    '  /* ── packages/demo-pkg/src/ui/copy.ts（#997 迁入） ── */',
    '  \'demo-pkg.ui-copy.c001\': "",',
    '  \'demo-pkg.ui-copy.c002\': "",',
    '};',
    '',
  ].join('\n');
  const mk = (files) => { const root = makeRoot(files); roots.push(root); return root; };
  const withTables = (zhText, enText) => mk({
    'packages/demo-pkg/src/entries/zh.ts': zhText,
    'packages/demo-pkg/src/entries/en.ts': enText,
  });
  try {
    const root1 = withTables(ZH_TABLE, EN_TABLE);
    const zh = readTable(root1, 'demo-pkg', 'zh');
    const en = readTable(root1, 'demo-pkg', 'en');
    check('两张表都读得出', zh.ok && en.ok, (zh.ok ? '' : zh.why) + (en.ok ? '' : en.why));

    const pending = pendingOf(zh, en);
    check('待译清单列出两条空白', pending.length === 2 && pending[0].key === 'demo-pkg.ui-copy.c001', JSON.stringify(pending.map((one) => one.key)));
    check('待译清单带出 zh 原文与占位符', pending[1].zh === '共 {p0} 笔' && pending[1].placeholders.join(',') === 'p0', JSON.stringify(pending[1]));

    const first = applyMap({ zh, en, rows: [{ key: 'demo-pkg.ui-copy.c001', text: 'What is missing' }] });
    check('只填给定的那一条', first.ok && first.filled === 1 && first.blanks === 1, JSON.stringify({ ok: first.ok, filled: first.filled, blanks: first.blanks, errors: first.errors }));
    check('写回 en 时保留 zh 的顺序与分节注释',
      first.ok && first.text.indexOf('c001\': "What is missing"') >= 0 && first.text.indexOf('c002\': ""') >= 0
        && first.text.indexOf('/* ── packages/demo-pkg/src/ui/copy.ts（#997 迁入） ── */') >= 0,
      first.text === null ? 'text=null' : first.text);

    // 已有译文不覆盖：拿一份 c001 已经录好英文的表来试（同一份表的空白状态不算「已有」）
    const filledRoot = withTables(ZH_TABLE, [
      'export const en = {',
      '  \'demo-pkg.ui-copy.c001\': "What is missing",',
      '  \'demo-pkg.ui-copy.c002\': "",',
      '};',
      '',
    ].join('\n'));
    const again = applyMap({ zh, en: readTable(filledRoot, 'demo-pkg', 'en'), rows: [{ key: 'demo-pkg.ui-copy.c001', text: 'Retranslated' }] });
    check('已有译文不覆盖（报错不写）', again.ok === false && again.errors.some((one) => one.indexOf('已有译文') >= 0), JSON.stringify(again.errors));

    const unknown = applyMap({ zh, en, rows: [{ key: 'demo-pkg.ui-copy.c999', text: 'x' }] });
    check('未知 key 报错', unknown.ok === false && unknown.errors.some((one) => one.indexOf('不在 zh.ts') >= 0), JSON.stringify(unknown.errors));

    const dupe = applyMap({ zh, en, rows: [
      { key: 'demo-pkg.ui-copy.c001', text: 'A' },
      { key: 'demo-pkg.ui-copy.c001', text: 'B' },
    ] });
    check('重复 key 报错', dupe.ok === false && dupe.errors.some((one) => one.indexOf('出现两次') >= 0), JSON.stringify(dupe.errors));

    const blank = applyMap({ zh, en, rows: [{ key: 'demo-pkg.ui-copy.c001', text: '   ' }] });
    check('空白译文报错', blank.ok === false && blank.errors.some((one) => one.indexOf('空白') >= 0), JSON.stringify(blank.errors));

    const placeholder = applyMap({ zh, en, rows: [{ key: 'demo-pkg.ui-copy.c002', text: 'Total items' }] });
    check('占位符漏了报错（与 zh 不一致）', placeholder.ok === false && placeholder.errors.some((one) => one.indexOf('占位符') >= 0), JSON.stringify(placeholder.errors));

    const full = applyMap({ zh, en, rows: [
      { key: 'demo-pkg.ui-copy.c001', text: 'What is missing' },
      { key: 'demo-pkg.ui-copy.c002', text: '{p0} items' },
    ] });
    check('两条都填得上', full.ok && full.filled === 2 && full.blanks === 0, JSON.stringify({ ok: full.ok, filled: full.filled, blanks: full.blanks, errors: full.errors }));
    writeFileSync(join(root1, 'packages/demo-pkg/src/entries/en.ts'), full.text, 'utf8');
    const en2 = readTable(root1, 'demo-pkg', 'en');
    const noop = applyMap({ zh, en: en2, rows: [] });
    check('重跑幂等（无新译文时 en 逐字节不变）', noop.ok && noop.text === full.text, noop.ok ? 'byte diff' : JSON.stringify(noop.errors));
    check('全部填完后清单为空', pendingOf(zh, en2).length === 0, JSON.stringify(pendingOf(zh, en2).map((one) => one.key)));

    const orphanRoot = withTables(ZH_TABLE, [
      'export const en = {',
      '  \'demo-pkg.ui-copy.c001\': "",',
      '  \'demo-pkg.ui-copy.c002\': "",',
      '  \'demo-pkg.ui-copy.c777\': "orphan",',
      '};',
      '',
    ].join('\n'));
    const orphan = applyMap({ zh: readTable(orphanRoot, 'demo-pkg', 'zh'), en: readTable(orphanRoot, 'demo-pkg', 'en'), rows: [] });
    check('en 里有 zh 没有的 key → 报错不写', orphan.ok === false && orphan.errors.some((one) => one.indexOf('c777') >= 0), JSON.stringify(orphan.errors));

    check('表路径按包定位（entries/en.ts）', tablePath(root1, 'demo-pkg', 'en').endsWith(join('entries', 'en.ts')), tablePath(root1, 'demo-pkg', 'en'));
  } finally {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
  return finish(state);
}
