#!/usr/bin/env node
/**
 * #1306 · 占位符门（同一 key 在 zh／en 的 {name} 集合必须相等）。
 *
 * 它守什么：词条表是数据，占位符是代码与表之间的接口。同一条 key 在 zh 与 en 的占位符集合不同，
 * 运行期就会踩两类已知 BUG：① 少一个参 → 值里留着 {name} 原文上屏；② 多一个参 → MissingParamError
 * 直接抛（缺参口径见 packages/base-entries/src/evaluate.ts）。两门语言各写各的时，这类错在中文下全绿、
 * 英文下才炸——所以必须在门禁里按 key 逐对判，不能靠人眼比。
 *
 * 判据（缺一即 FAIL，exit 1）：
 *   ① 逐包读表：packages/<包>/src/entries/<语言>.{ts,json} 与 <分册>.<语言>.{ts,json}（读法见 tooling/i18n-tables.mjs）；
 *   ② 同一包内、同一条 key 在各门语言里的具名占位符集合必须相等（集合比较，不看顺序、不看重复）；
 *   ③ 表读不出值（不是字符串字面量／JSON 坏）＝RED——门看不见就不许当绿；
 *   ④ 一个包都没有两门语言时显式报 EMPTY（空转不许当绿，照 check-i18n-entries.mjs 的空范围口径）。
 * 只报数不判红：某条 key 只在部分语言里有（覆盖缺口的判据归缺词条门：它按「已迁入件用到的 key」判）。
 *
 * 用法：
 *   node tooling/check-i18n-params.mjs              # 门禁口径
 *   node tooling/check-i18n-params.mjs --selftest   # 变异自证：占位符不一致必红、补齐必绿
 *   node tooling/check-i18n-params.mjs --root <目录>  # 夹具／变异入口
 * 末行固定：RESULT: keys=<n> pairs=<n> mismatch=<n>
 * 依赖：零第三方；只读源码与词条表，不写任何文件。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LANGUAGES, DEFAULT_LANGUAGE } from './i18n-langs.mjs';
import { loadTablesByPackage, placeholdersOf } from './i18n-tables.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const SELFTEST = argv.includes('--selftest');
const ROOT_DIR = flag('--root', ROOT);

/** 基准语言：与 packages/base-entries/src/catalog.ts 的 BASE_LANGUAGE 同口径（zh 是 key 集合的权威）。 */
const REFERENCE = DEFAULT_LANGUAGE;

/**
 * 主判据：返回 {packages, keys, pairs, mismatch:[{pkg,key,lang,refLang,want,got,refValue,value}], skew:[...], errors}。
 *
 * 比对口径：集合相等。占位符重复（{x} {x}）不是不一致——那是求值端口的重复插入，门只管集合；
 * 顺序不同也不是不一致——同一门语言的模板顺序本就可能为语序重排。
 */
export function audit(root = ROOT_DIR, langs = LANGUAGES) {
  const loaded = loadTablesByPackage(root, langs);
  const mismatch = [];
  const skew = [];
  const singles = [];
  const emptyTables = [];
  const keys = new Set();
  let pairs = 0;
  let comparable = 0;
  for (const [pkg, byLang] of loaded.packages) {
    // 空表（0 条、合法暂态）：不是读不出，但必须显式报数，免得把「还没迁」当成「比过没问题」。
    for (const [lang, table] of byLang) if (table.entries.size === 0) emptyTables.push(pkg + '/' + lang);
    const present = [...byLang.keys()];
    // 只有一门语言的包没有「同 key 跨语言」可对，本门不比；但必须报数，免得当成「比过没问题」。
    if (present.length < 2) { singles.push(pkg + '(' + present.join('+') + ')'); continue; }
    comparable += 1;
    const union = new Map();
    for (const [lang, table] of byLang) {
      for (const [key, value] of table.entries) {
        if (!union.has(key)) union.set(key, new Map());
        union.get(key).set(lang, value);
      }
    }
    for (const [key, values] of union) {
      keys.add(pkg + '/' + key);
      const missingLangs = present.filter((lang) => !values.has(lang));
      if (missingLangs.length > 0) {
        skew.push({ pkg, key, missingLangs });
        if (!values.has(REFERENCE)) continue;
      }
      pairs += 1;
      const refValue = values.get(REFERENCE);
      const want = placeholdersOf(refValue);
      for (const [lang, value] of values) {
        if (lang === REFERENCE) continue;
        const got = placeholdersOf(value);
        if (want.join(',') === got.join(',')) continue;
        mismatch.push({ pkg, key, lang, refLang: REFERENCE, want, got, refValue, value });
      }
    }
  }
  return { packages: comparable, singles, keys: keys.size, pairs, mismatch, skew, errors: loaded.errors, emptyTables };
}

/** 门禁入口的读数（门禁与自证共用，免得两边报法分家）。 */
export function report(result) {
  const lines = [];
  lines.push('PACKAGES: 可比 ' + result.packages + ' 个包（单语言 ' + result.singles.length + ' 个：'
    + (result.singles.length === 0 ? '无' : result.singles.join(',')) + '） keys=' + result.keys + ' pairs=' + result.pairs
    + ' mismatch=' + result.mismatch.length + ' skew=' + result.skew.length + ' 空表=' + result.emptyTables.length);
  if (result.emptyTables.length > 0) {
    lines.push('EMPTY-TABLES: ' + result.emptyTables.join('、')
      + '（0 条空表＝迁移期暂态：这一包／这一门语言还没录，显式报数，不算「比过没问题」）');
  }
  for (const e of result.errors) lines.push('RED 词条表读不出：' + e.path + ' → ' + e.why);
  for (const m of result.mismatch) {
    lines.push('RED 占位符不一致：packages/' + m.pkg + ' 的 key ' + m.key + '：' + m.refLang + ' "'
      + m.refValue + '" 占位 {' + m.want.join('}、{') + '} ≠ ' + m.lang + ' "' + m.value
      + '" 占位 {' + m.got.join('}、{') + '}');
  }
  return lines;
}

function main() {
  if (SELFTEST) return selftest();

  const result = audit(ROOT_DIR);
  console.log('# #1306 占位符门（同一 key 在 ' + LANGUAGES.join('／') + ' 的 {name} 集合必须相等；基准语言 ' + REFERENCE + '）');
  console.log('ROOT: ' + ROOT_DIR);
  if (result.packages === 0) {
    console.log('EMPTY: 一个有两门语言词条表的包都没有（显式报数：这一轮什么都没比，不是「比过没问题」）');
  }
  for (const line of report(result)) console.log(line);
  console.log('RESULT: keys=' + result.keys + ' pairs=' + result.pairs + ' mismatch=' + result.mismatch.length);
  const skewNote = result.skew.length === 0 ? '' : '（另有 ' + result.skew.length + ' 个 key 只在部分语言里有：缺词条门按已迁入件判，本门只报数）';
  if (result.errors.length > 0 || result.mismatch.length > 0) {
    console.error('FAIL: 占位符门未过（' + (result.errors.length + result.mismatch.length) + ' 处；两门语言的同一条 key 必须用同一套占位符）' + skewNote);
    process.exit(1);
  }
  console.log(result.packages === 0
    ? 'PASS: 空转（显式报数：还没有可比的词条表）'
    : 'PASS: ' + result.packages + ' 个包的 ' + result.pairs + ' 对同 key 在多门语言里占位符集合一致' + skewNote);
}

/** 自证：变异必红／还原必绿（#1306 票面要求给出先红后绿的样例，门自己带一份，免得靠人手工复现）。 */
function selftest() {
  const bad = [];
  const want = (cond, msg) => { if (!cond) bad.push(msg); };
  const tmp = mkdtempSync(join(tmpdir(), 't1306-params-'));
  const write = (pkg, lang, body) => {
    const dir = join(tmp, 'packages', pkg, 'src', 'entries');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, lang + '.ts'), body, 'utf8');
  };
  try {
    const empty = audit(tmp);
    want(empty.packages === 0 && empty.mismatch.length === 0, '没有词条表时必须报 0 包、零不一致');
    console.log('SELFTEST 空转读数：packages=' + empty.packages + ' pairs=' + empty.pairs);

    // ⓪b 只有一门语言的包：没有跨语言可比的同 key，必须报数而不是静默跳过。
    write('solo', 'zh', "export const zh = {\n  'solo.title': 'ZH-TITLE',\n};\n");
    const solo = audit(tmp);
    want(solo.packages === 0 && solo.singles.length === 1 && solo.singles[0].startsWith('solo('),
      '单语言包必须报数（实得 singles=' + solo.singles.length + '）');
    console.log('SELFTEST 单语言读数：singles=' + solo.singles.join(','));

    write('demo', 'zh', "export const zh = {\n  'demo.total': '共 {count} 件',\n};\n");
    write('demo', 'en', "export const en = {\n  'demo.total': 'Total {n}',\n};\n");
    const red = audit(tmp);
    want(red.mismatch.length === 1, '占位符名字不同必须报 1 处（实得 ' + red.mismatch.length + '）');
    want(red.mismatch[0] && red.mismatch[0].key === 'demo.total', '必须点名 key');
    want(red.mismatch[0] && red.mismatch[0].want.join(',') === 'count' && red.mismatch[0].got.join(',') === 'n', '必须给出两边的占位符集合');
    console.log('SELFTEST 红读数：mismatch=' + red.mismatch.length + '（' + report(red).filter((l) => l.startsWith('RED ')).join('；') + '）');

    write('demo', 'en', "export const en = {\n  'demo.total': 'Total {count}',\n};\n");
    const green = audit(tmp);
    want(green.mismatch.length === 0, '同名占位符必须零不一致（实得 ' + green.mismatch.length + '）');
    want(green.pairs === 1, '同一 key 在两门语言里＝1 对（实得 ' + green.pairs + '）');
    console.log('SELFTEST 绿读数：pairs=' + green.pairs + ' mismatch=' + green.mismatch.length);

    write('demo', 'en', "export const en = {\n  'demo.total': 'Total {count} of {all}',\n};\n");
    const extra = audit(tmp);
    want(extra.mismatch.length === 1, '多一个占位符必须报 1 处（实得 ' + extra.mismatch.length + '）');
    want(extra.mismatch[0] && extra.mismatch[0].got.join(',') === 'all,count', '多出来的占位符必须点出来');

    write('demo', 'en', "export const en = {\n  'demo.total': '{count} total, {count} again',\n};\n");
    const order = audit(tmp);
    want(order.mismatch.length === 0, '顺序不同／重复出现不得判红（实得 ' + order.mismatch.length + '）');

    write('demo', 'zh', "export const zh = {\n  'demo.total': '共 {count} 件',\n  'demo.only-zh': '只有中文',\n};\n");
    const skew = audit(tmp);
    want(skew.mismatch.length === 0, '缺列不是占位符不一致（实得 ' + skew.mismatch.length + '）');
    want(skew.skew.length === 1 && skew.skew[0].key === 'demo.only-zh', '缺列必须报数（实得 ' + skew.skew.length + '）');

    write('demo', 'en', "export const en = {\n  'demo.total': count,\n};\n");
    const broken = audit(tmp);
    want(broken.errors.length === 1, '词条值不是字符串字面量必须报读不出（实得 ' + broken.errors.length + '）');

    // ⑨ 同一包同一语言的多份表里 key 重复 → 必红（不许第一份悄悄盖掉第二份）
    write('demo', 'en', "export const en = {\n  'demo.total': 'EN {count}',\n};\n");
    writeFileSync(join(tmp, 'packages', 'demo', 'src', 'entries', 'i18n_extra.en.ts'),
      "export const extra = {\n  'demo.total': 'EN-HIDDEN',\n};\n", 'utf8');
    const dup = audit(tmp);
    want(dup.errors.some((e) => e.why.includes('重复')), '多份表里 key 重复必须报 errors（实得 ' + dup.errors.length + '）');

    // ⑩ 空表（0 条、合法暂态）：不算读不出、不产生假不一致，但必须显式报数（#1197 迁移期每包先立空表）
    write('vacant', 'zh', "export const zh = {} as const satisfies MessageTable;\n");
    write('vacant', 'en', "export const en = {} as const satisfies MessageTable;\n");
    const vacant = audit(tmp);
    want(!vacant.errors.some((e) => String(e.path).includes('vacant')), '空表不许当「词条表读不出」（errors=' + vacant.errors.length + '）');
    want(vacant.emptyTables.length === 2, '空表必须显式报数（实得 ' + vacant.emptyTables.length + '）');
    console.log('SELFTEST 空表读数：emptyTables=' + vacant.emptyTables.join(','));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
  console.log('SELFTEST: 空转显式报数／单语言包报数／占位符不一致必红／补齐必绿／多占位必红／顺序重复不判红／缺列只报数／读不出必红／多份表重复 key 必红／空表显式报数 十条自证 OK');
}

/** 入口守卫（照 check-i18n-entries.mjs 先例）：被别处 import 时不跑 CLI。 */
const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
