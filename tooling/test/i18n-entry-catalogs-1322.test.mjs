/**
 * #1322 · 词条目录自动发现与语言清单派生的自证（门禁工具自证族，定位同 tooling/test/*.test.mjs；不在 canonical 测试 glob 内，须单跑）。
 *
 * 覆盖四条：
 *   ① 扫描：packages/<包>/src/entries 下的 <语言>.ts / <分册>.<语言>.ts 被认出，语言并集按基准语言优先、其余字母序。
 *   ② 生成：每包 catalog.generated.ts 静态 import 各语言表、暴露窄类型 EntryTables；加语言只改生成数据，不改 index。
 *   ③ 清单：base-link-core 的 AVAILABLE_LANGUAGES 与目录同源，第三语言出现即进清单。
 *   ④ 失败面：JSON 词条表、缺具名导出必须显式抛（不静默生成空表）。
 *
 * 跑法：node --test tooling/test/i18n-entry-catalogs-1322.test.mjs
 */
import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { entryLanguages, isLanguageTag, parseEntryFileName, scanEntryTables } from '../entry-languages.mjs';
import { expectedFiles, renderCatalog, renderRoster } from '../gen-entry-catalogs.mjs';
import { LANGUAGES, ROSTER_SOURCE } from '../i18n-langs.mjs';

function makeRepo({ third = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 't1322-cat-'));
  const dir = join(root, 'packages', 'demo', 'src', 'entries');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'zh.ts'), "export const zh = { 'demo.title': '标题' };\n", 'utf8');
  writeFileSync(join(dir, 'en.ts'), "export const en = { 'demo.title': 'Title' };\n", 'utf8');
  if (third) writeFileSync(join(dir, 'ja.ts'), "export const ja = { 'demo.title': 'タイトル' };\n", 'utf8');
  return { root, dir };
}

test('#1322 词条文件命名：只认 <语言> 与 <分册>.<语言>，逻辑件不收', () => {
  assert.deepEqual(parseEntryFileName('zh.ts'), { part: null, lang: 'zh', ext: 'ts' });
  assert.deepEqual(parseEntryFileName('errors.en.json'), { part: 'errors', lang: 'en', ext: 'json' });
  assert.equal(parseEntryFileName('index.ts'), null);
  assert.equal(parseEntryFileName('catalog.generated.ts'), null);
  assert.equal(parseEntryFileName('manifest.json'), null);
  assert.equal(isLanguageTag('zh-hant'), true);
  assert.equal(isLanguageTag('zh_cn'), false);
});

test('#1322 目录扫描：基准语言在前、其余字母序；第三语言进并集', () => {
  const { root } = makeRepo();
  try {
    assert.deepEqual(entryLanguages(root), ['zh', 'en', 'ja']);
    const pkgs = scanEntryTables(root);
    assert.equal(pkgs.length, 1);
    assert.equal(pkgs[0].pkg, 'demo');
    assert.deepEqual([...pkgs[0].languages.keys()].sort(), ['en', 'ja', 'zh']);
    assert.equal(pkgs[0].languages.get('ja')[0].symbol, 'ja');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('#1322 生成 catalog：加语言只改 ENTRY_TABLES，不动 index；窄类型只引用表导出', () => {
  const { root } = makeRepo();
  try {
    const files = expectedFiles(root);
    const cat = files.find((f) => f.rel === 'packages/demo/src/entries/catalog.generated.ts');
    assert.ok(cat, '每包必须生成 catalog.generated.ts');
    assert.match(cat.text, /^import \{ zh as _t_zh_0 \} from '\.\/zh\.js';$/m);
    assert.match(cat.text, /^import \{ ja as _t_ja_0 \} from '\.\/ja\.js';$/m);
    assert.match(cat.text, /readonly ja: typeof _t_ja_0;/);
    assert.match(cat.text, /ja: _ja,/);
    assert.ok(!files.some((f) => f.rel.endsWith('/index.ts')), '生成器不许改词条入口 index.ts');
    const roster = files.find((f) => f.rel === ROSTER_SOURCE);
    assert.ok(roster, '必须生成语言清单 ' + ROSTER_SOURCE);
    assert.match(roster.text, /export const AVAILABLE_LANGUAGES = \['zh', 'en', 'ja'\] as const;/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('#1322 名册与目录同源；正常仓仍是 zh+en', () => {
  const { root } = makeRepo({ third: false });
  try {
    assert.deepEqual(entryLanguages(root), ['zh', 'en']);
    assert.match(renderRoster(root), /\['zh', 'en'\]/);
  } finally { rmSync(root, { recursive: true, force: true }); }
  assert.deepEqual([...LANGUAGES], ['zh', 'en']);
  assert.equal(ROSTER_SOURCE, 'packages/base-link-core/src/config/languages.generated.ts');
});

test('#1322 失败面：JSON 表与缺具名导出必须显式抛，不静默生成', () => {
  const { root, dir } = makeRepo();
  try {
    writeFileSync(join(dir, 'fr.json'), JSON.stringify({ 'demo.title': 'Titre' }), 'utf8');
    assert.throws(() => expectedFiles(root), /只收 \.ts/);
    rmSync(join(dir, 'fr.json'));
    writeFileSync(join(dir, 'de.ts'), "const de = { 'demo.title': 'Titel' };\nexport default de;\n", 'utf8');
    assert.throws(() => expectedFiles(root), /找不到 export const/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('#1322 多分册同语言：合并成一个语言键，生成对象展开', () => {
  const pkg = {
    pkg: 'demo',
    dir: '/tmp/demo/src/entries',
    languages: new Map([
      ['zh', [{ file: 'zh.ts', ext: 'ts', symbol: 'zh' }, { file: 'errors.zh.ts', ext: 'ts', symbol: 'errorsZh' }]],
    ]),
  };
  const text = renderCatalog(pkg);
  assert.match(text, /const _zh = \{ \.\.\._t_zh_0, \.\.\._t_zh_1 \};/);
  assert.match(text, /readonly zh: typeof _t_zh_0 & typeof _t_zh_1;/);
});
