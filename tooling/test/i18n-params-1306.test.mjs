/**
 * #1306 · 空串语义与占位符门的自证（门禁工具自证族，与 tooling/test/*.test.mjs 同层；不在 canonical `pnpm test` 的 glob 内，须单跑）。
 *
 * 覆盖四条：
 *   ① 取词语义：空白值＝未录（沿回退链取下一站）；全站空白必须抛 MissingMessageError，不把空串交给端口。
 *   ② 缺词条门：空白词条逐件点名并判红；填上译文必绿（夹具）。
 *   ③ 占位符门：同 key 的占位符集合不一致必红、补齐必绿；集合口径（顺序／重复不判红）、缺列只报数、读不出必红。
 *   ④ 真仓库读数：四道 i18n 门 exit 0 且报真读数；两道门的 --selftest 七条自证都过。
 *
 * 跑法：node --test tooling/test/i18n-params-1306.test.mjs
 * 前置：包装好（tsc -b）——第 ① 组读 packages/base-entries/dist/index.js，与包内 test/entries.test.mjs 同形。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { MissingMessageError, defineCatalog, resolve } from '../../packages/base-entries/dist/index.js';
import { audit as entriesAudit } from '../check-i18n-entries.mjs';
import { audit as paramsAudit } from '../check-i18n-params.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const NODE = process.execPath;

/** 造一份最小夹具：packages/demo/src/entries/{zh,en}.json ＋ 一件 import 词条层的源件，返回根与件路径。 */
function fixture(tables, source) {
  const tmp = mkdtempSync(join(tmpdir(), 't1306-'));
  const dir = join(tmp, 'packages', 'demo', 'src', 'entries');
  mkdirSync(dir, { recursive: true });
  for (const [lang, body] of Object.entries(tables)) writeFileSync(join(dir, lang + '.json'), JSON.stringify(body), 'utf8');
  if (source !== undefined) writeFileSync(join(tmp, 'demo.ts'), source, 'utf8');
  return tmp;
}

const SRC = "import { resolve } from 'base-entries';\nexport const a = resolve(SKILL_CATALOG, 'zh', 'demo.title');\n";
const SCOPE = { files: ['demo.ts'], allowlist: [] };

test('#1306 取词：空白值视同未录、沿回退链取下一站；全站空白必须抛', () => {
  const blankEn = defineCatalog({ zh: { greeting: 'ZH:{name}' }, en: { greeting: '' } });
  assert.equal(resolve(blankEn, 'en', 'greeting', { name: 'A' }), 'ZH:A', 'en 空白必须回退到 zh，不得把空串交出去');
  assert.equal(resolve(blankEn, 'ja', 'greeting', { name: 'A' }), 'ZH:A', '没有该语言的表时同样落到 zh');

  // 纯空白与空串同口径：都是「未录」。
  const whitespaceZh = defineCatalog({ zh: { greeting: '   ' } });
  assert.throws(() => resolve(whitespaceZh, 'zh', 'greeting'), (err) => err instanceof MissingMessageError,
    '纯空白视同未录，全缺必须抛 MissingMessageError');

  const allBlank = defineCatalog({ zh: { greeting: '' }, en: { greeting: ' ' } });
  assert.throws(() => resolve(allBlank, 'en', 'greeting'), (err) =>
    err instanceof MissingMessageError && err.languages.join(',') === 'en,zh',
  '两站都空白时必须抛，且把走过的链报出来');

  // 端口看到的事实：读者语言＝请求语言，实际取词语言＝回退命中站（数字／复数形态按后者判）。
  const seen = [];
  const viaPort = defineCatalog({ zh: { greeting: 'ZH' }, en: { greeting: '' } });
  const out = resolve(viaPort, 'en', 'greeting', undefined, {
    evaluate: (req) => { seen.push(req.language + '/' + req.sourceLanguage); return req.template; },
  });
  assert.equal(out, 'ZH');
  assert.deepEqual(seen, ['en/zh'], '端口须看到：读者语言 en、实际取词语言 zh');
});

test('#1306 缺词条门：空白词条逐件点名并判红；填上译文必绿', () => {
  const tmp = fixture({ zh: { 'demo.title': 'ZH-TITLE' }, en: { 'demo.title': '   ' } }, SRC);
  try {
    const bad = entriesAudit(SCOPE, tmp);
    assert.equal(bad.blanks.length, 1, '一个空白值＝1 处（实得 ' + bad.blanks.length + '）');
    assert.equal(bad.blanks[0].lang + ':' + bad.blanks[0].key, 'en:demo.title', '空白词条必须点名语言与 key');
    assert.ok(bad.blanks[0].path.endsWith('en.json'), '空白词条必须点名落在哪份表');

    writeFileSync(join(tmp, 'packages', 'demo', 'src', 'entries', 'en.json'), JSON.stringify({ 'demo.title': 'EN-TITLE' }), 'utf8');
    const good = entriesAudit(SCOPE, tmp);
    assert.equal(good.blanks.length, 0, '填上译文后必须零空白');
    assert.equal(good.missing.length, 0, '填上译文后必须零缺词条');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('#1306 占位符门：同 key 集合不一致必红、补齐必绿、集合口径与缺列口径', () => {
  const dir = (tmp) => join(tmp, 'packages', 'demo', 'src', 'entries');
  const setTables = (tmp, zh, en) => {
    writeFileSync(join(dir(tmp), 'zh.json'), JSON.stringify(zh), 'utf8');
    writeFileSync(join(dir(tmp), 'en.json'), JSON.stringify(en), 'utf8');
  };
  const tmp = fixture({ zh: { 'demo.total': 'ZH {count}' }, en: { 'demo.total': 'EN {n}' } });
  try {
    const red = paramsAudit(tmp);
    assert.equal(red.mismatch.length, 1, '占位符名字不同必须报 1 处（实得 ' + red.mismatch.length + '）');
    assert.equal(red.mismatch[0].key, 'demo.total');
    assert.deepEqual(red.mismatch[0].want, ['count'], '必须给出基准语言的占位符集合');
    assert.deepEqual(red.mismatch[0].got, ['n'], '必须给出对照语言的占位符集合');

    setTables(tmp, { 'demo.total': 'ZH {count}' }, { 'demo.total': 'EN {count}' });
    const green = paramsAudit(tmp);
    assert.equal(green.mismatch.length, 0, '同名占位符必须零不一致');
    assert.equal(green.pairs, 1, '同一 key 在两门语言里＝1 对（实得 ' + green.pairs + '）');

    // 多一个占位符＝运行期 MissingParamError，必红。
    setTables(tmp, { 'demo.total': 'ZH {count}' }, { 'demo.total': 'EN {count} of {all}' });
    const extra = paramsAudit(tmp);
    assert.equal(extra.mismatch.length, 1, '多一个占位符必须报 1 处（实得 ' + extra.mismatch.length + '）');
    assert.deepEqual(extra.mismatch[0].got, ['all', 'count'], '多出来的占位符必须点出来');

    // 集合口径：顺序不同／重复出现不是不一致（语序重排与重复插入都是合法模板）。
    setTables(tmp, { 'demo.total': 'ZH {count}' }, { 'demo.total': '{count} total, {count} again' });
    assert.equal(paramsAudit(tmp).mismatch.length, 0, '顺序不同／重复出现不得判红');

    // 语言缺列：只报数不判红（覆盖缺口的判据归缺词条门，它按已迁入件判）。
    setTables(tmp, { 'demo.total': 'ZH {count}', 'demo.only-zh': 'ZH-ONLY' }, { 'demo.total': 'EN {count}' });
    const skew = paramsAudit(tmp);
    assert.equal(skew.mismatch.length, 0, '缺列不是占位符不一致');
    assert.deepEqual(skew.skew.map((s) => s.key), ['demo.only-zh'], '缺列必须报数');
    assert.deepEqual(skew.skew[0].missingLangs, ['en'], '缺列必须点名缺哪门语言');

    // 表读不出（值不是字符串字面量）＝门看不见，必红而不是静默跳过。
    writeFileSync(join(dir(tmp), 'en.ts'), "export const en = {\n  'demo.total': count,\n};\n", 'utf8');
    rmSync(join(dir(tmp), 'en.json'));
    const broken = paramsAudit(tmp);
    assert.equal(broken.errors.length, 1, '词条值读不出必须报 errors（实得 ' + broken.errors.length + '）');
    assert.ok(broken.errors[0].path.endsWith('en.ts'), '读不出必须点名文件');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('#1306 真仓库读数：四道 i18n 门 exit 0 且报真读数', () => {
  const run = (gate) => spawnSync(NODE, [join(ROOT, 'tooling', gate)], { encoding: 'utf8', cwd: ROOT });
  const entries = run('check-i18n-entries.mjs');
  assert.equal(entries.status, 0, '缺词条门必须 exit 0：' + entries.stderr + entries.stdout);
  assert.match(entries.stdout, /RESULT: files=[1-9]\d* keys=[1-9]\d* missing=0 blanks=0\b/,
    '缺词条门必须读到真范围且零缺、零空白：' + entries.stdout);
  assert.match(entries.stdout, /PASS: [1-9]\d* 件已迁入文件/, '缺词条门末行必须说清查了几件');

  const params = run('check-i18n-params.mjs');
  assert.equal(params.status, 0, '占位符门必须 exit 0：' + params.stderr + params.stdout);
  assert.match(params.stdout, /RESULT: keys=[1-9]\d* pairs=[1-9]\d* mismatch=0/, '占位符门必须读到真表且零不一致：' + params.stdout);
  assert.match(params.stdout, /PASS: [1-9]\d* 个包的 [1-9]\d* 对同 key/, '占位符门末行必须说清比了几对');

  const keys = run('check-i18n-keys.mjs');
  assert.equal(keys.status, 0, 'key 残留门必须 exit 0：' + keys.stderr + keys.stdout);
  assert.match(keys.stdout, /RESULT: files=[1-9]\d* literals=[1-9]\d* residue=0\b/, 'key 残留门必须读到真范围且零残留');

  const typo = run('check-typography-langs.mjs');
  assert.equal(typo.status, 0, '排印门必须 exit 0：' + typo.stderr + typo.stdout);
  assert.match(typo.stdout, /PASS: 结构约束语言无关/, '排印门末行必须说清结构约束语言无关');
});

test('#1306 两道带自证的门：--selftest 自证都过（红绿样例随门走，不靠人手复现）', () => {
  const expected = { 'check-i18n-entries.mjs': /七条自证 OK/, 'check-i18n-params.mjs': /九条自证 OK/ };
  for (const [gate, tag] of Object.entries(expected)) {
    const r = spawnSync(NODE, [join(ROOT, 'tooling', gate), '--selftest'], { encoding: 'utf8', cwd: ROOT });
    assert.equal(r.status, 0, gate + ' --selftest 必须 exit 0：' + r.stderr + r.stdout);
    assert.match(r.stdout, tag, gate + ' 必须报自证条数：' + r.stdout);
  }
});
