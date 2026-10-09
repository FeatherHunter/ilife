#!/usr/bin/env node
/**
 * #1199 · 排印门语言无关化（③）。
 *
 * 票面口径：排印门的谓词改成**语言无关的结构约束**（不溢出／不换行／字号与盒模型），并按语言分名册。
 * 本门把这句话变成可机器判的两件事：
 *
 *   ① **结构约束不许按语言放宽**：STRUCTURAL_RULES（版心不溢出／版式位不换行／最小字号下限／
 *      可点面积下限／盒模型 4px 栅格）是**所有语言同一套**；被禁的是「为某门语言把溢出判据放宽」。
 *   ② **语言相关的书写阀值各有一套**：并列分隔符集／并列段长上限／半角标点集／允许清单／
 *      是否判裸拉丁词／字号下限——从 tooling/i18n-langs.mjs 的 LANG_REGISTERS 读，加语言＝加一条名册。
 *
 * 另有一条**现场对照**（有读数就判、没读数就显式报 SKIPPED，不静默）：
 *   packages/base-render/test/fixtures/判分/夹具/fmt.json 是既有版式读数（三档宽度下的
 *   minFontPxNoSvg／touchSmall／outOfBounds）。本门对它逐语言判：outOfBounds 必须为 0（不溢出），
 *   minFontPxNoSvg 必须 ≥ 该语言名册的字号下限。
 *
 * 用法：
 *   node tooling/check-typography-langs.mjs              # 门禁口径
 *   node tooling/check-typography-langs.mjs --list       # 列名册与结构约束，不判
 *   node tooling/check-typography-langs.mjs --selftest   # 变异自证：把结构约束按语言放宽必红、还原必绿
 * 末行固定：RESULT: langs=<n> structural=<n> fixtures=<n> violations=<n>
 * 依赖：零第三方；读产品侧语言唯一定义地与版式夹具，**不写任何文件**。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { LANGUAGES, DEFAULT_LANGUAGE, ROSTER_SOURCE, STRUCTURAL_RULES, LANG_REGISTERS, sameRoster } from './i18n-langs.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const FIXTURE = join(ROOT, 'packages', 'base-render', 'test', 'fixtures', '判分', '夹具', 'fmt.json');

const argv = process.argv.slice(2);
const LIST = argv.includes('--list');
const SELFTEST = argv.includes('--selftest');

/** 结构约束必须**语言无关**：这些 id 的判定口径不许出现在语言名册里（只许出现在 STRUCTURAL_RULES）。 */
export const LANG_INDEPENDENT_IDS = ['overflow', 'noWrap', 'boxModel'];

/**
 * 版式读数的**基线账本**（#1199 本轮现状）。
 *
 * 为什么要有它：排印门这一轮是「把谓词改成语言无关的结构约束 ＋ 按语言分名册」，**不是**顺手改版式。
 * 但既有版式读数夹具里已经有 2 处与结构约束冲突的读数（下面那两条，出处 packages/skill-render 侧的
 * 甲-02 夹具）。本门起步必须绿（#1199 票面硬要求），于是这 2 条**逐条登记为已知存量债**：
 *   · 基线里 + 台面上各自出现一次 → 与基线一致，绿（不是「没判」，是「判了、与登记一致」）；
 *   · 台面上出现基线里没有的 → 红（新债不许静默进来）；
 *   · 基线里有、台面上没了 → 红（**债还清了要显式改基线**，不然门会一直替一段已经不存在的债开绿灯）。
 * 债还清时改这里＝一次显式动作；改完记得连 README／票面一起更新。
 */
export const FIXTURE_BASELINE = [
  { code: 'OVERFLOW', page: '甲-02-待办清单.html', width: '390', value: 1, why: '甲-02 夹具在 390 宽度下 outOfBounds=1（版心溢出）：存量债，出处 fixtures/判分/夹具/fmt.json' },
];

/** 基线比对：返回 {stale, fresh}——stale＝基线里已经不存在的（要改基线），fresh＝台面上新出现的（要修）。 */
export function compareBaseline(violations, baseline = FIXTURE_BASELINE) {
  const key = (v) => [v.code, v.page, v.width].join('|');
  const left = [...baseline];
  const fresh = [];
  for (const v of violations) {
    const i = left.findIndex((b) => key(b) === key(v));
    if (i >= 0) left.splice(i, 1);
    else fresh.push(v);
  }
  return { stale: left, fresh };
}

/** 名册自洽判据（返回违规清单，空＝绿）。registers 可在自证里注入变异。 */
export function auditRegisters({ languages = LANGUAGES, registers = LANG_REGISTERS, rules = STRUCTURAL_RULES } = {}) {
  const violations = [];
  const push = (code, msg) => violations.push({ code, msg });
  if (!rules.length) push('NO-STRUCTURAL-RULES', '语言无关结构约束一条都没有');
  for (const id of LANG_INDEPENDENT_IDS) {
    if (!rules.some((r) => r.id === id)) push('MISSING-STRUCTURAL-RULE', '缺语言无关结构约束：' + id);
    for (const lang of languages) {
      if (Object.prototype.hasOwnProperty.call(registers[lang] || {}, id)) {
        push('LANG-WEAKENED-STRUCTURAL', '结构约束 ' + id + ' 出现在语言 ' + lang + ' 的名册里（＝按语言放宽，禁）');
      }
    }
  }
  const base = registers[DEFAULT_LANGUAGE];
  for (const lang of languages) {
    const r = registers[lang];
    if (!r) { push('MISSING-REGISTER', '缺语言名册：' + lang); continue; }
    for (const k of ['separators', 'maxSegChars', 'halfPunct', 'allow', 'bareLatinIsFault', 'fontFloorPx', 'boxGridPx', 'scriptRe', 'why']) {
      if (r[k] === undefined) push('REGISTER-FIELD-MISSING', lang + ' 名册缺字段：' + k);
    }
    if (!Array.isArray(r.separators)) push('BAD-FIELD', lang + '.separators 必须是数组');
    if (!(r.maxSegChars > 0)) push('BAD-FIELD', lang + '.maxSegChars 必须为正数');
    if (!(r.fontFloorPx > 0)) push('BAD-FIELD', lang + '.fontFloorPx 必须为正数');
    if (!(r.boxGridPx > 0)) push('BAD-FIELD', lang + '.boxGridPx 必须为正数');
    try { new RegExp(r.scriptRe); } catch (e) { push('BAD-FIELD', lang + '.scriptRe 不是合法正则：' + e.message); }
    for (const a of r.allow || []) {
      try { new RegExp(a.re); } catch (e) { push('BAD-FIELD', lang + '.allow 条目不是合法正则：' + a.re); }
      if (!a.why) push('ALLOW-WITHOUT-WHY', lang + '.allow 有条目没写 why（放行必须带理由）');
    }
  }
  if (base) {
    for (const lang of languages) {
      const r = registers[lang];
      if (!r || lang === DEFAULT_LANGUAGE) continue;
      if (!(r.maxSegChars > base.maxSegChars)) {
        push('SEG-LIMIT-NOT-WIDER', lang + ' 的并列段长上限 ' + r.maxSegChars + ' 没宽于基准语言 ' + base.maxSegChars + '（同一句话拉丁字母占位更长，等宽＝英文页假红）');
      }
      const sameSep = JSON.stringify(r.separators) === JSON.stringify(base.separators);
      const sameHalf = r.halfPunct === base.halfPunct;
      if (sameSep && sameHalf) push('REGISTER-NOT-SPLIT', lang + ' 的分隔符集与半角标点集都与基准语言相同（＝没分语言）');
      if (typeof r.fontFloorPx === 'number' && typeof base.fontFloorPx === 'number' && r.fontFloorPx < base.fontFloorPx) {
        push('FONT-FLOOR-ORDER', lang + ' 的字号下限 ' + r.fontFloorPx + ' 低于基准语言 ' + base.fontFloorPx + '（拉丁字形同 px 更小，下限不得低于基准语言）');
      }
    }
  }
  return violations;
}

/** 现场对照：版式读数夹具逐语言判（不溢出 ＋ 字号下限）。
 *  夹具形状（packages/base-render/test/fixtures/判分/夹具/fmt.json，出处探针 t516-判据-版式.mjs）：
 *  { at, dir, widths:[390,768,1440], rows:[{ path, name, widths:{"<vw>":{ outOfBounds, minFontPxNoSvg, touchSmall } } }] }。
 *  取不到 rows 就报 skipped（读数为空＝门失明，不许当绿）。 */
export function auditFixture(fixture, { languages = LANGUAGES, registers = LANG_REGISTERS } = {}) {
  const out = { rows: [], violations: [], skipped: [] };
  if (!fixture || !Array.isArray(fixture.rows)) {
    out.skipped.push('版式夹具没有 rows 数组（形状对不上＝门读不到读数，不许当绿）');
    return out;
  }
  for (const entry of fixture.rows) {
    const page = entry.name || entry.path || '(unnamed)';
    const widths = entry && entry.widths ? entry.widths : {};
    for (const [w, m] of Object.entries(widths)) {
      const oob = m && m.outOfBounds;
      if (typeof oob === 'number' && oob !== 0) {
        out.violations.push({ page, width: w, code: 'OVERFLOW', msg: page + '@' + w + ' outOfBounds=' + oob + '（版心溢出：语言无关的结构约束，任何语言都不许非 0）' });
      }
      const minFont = m && m.minFontPxNoSvg;
      if (typeof minFont === 'number') {
        for (const lang of languages) {
          const floor = (registers[lang] || {}).fontFloorPx;
          if (typeof floor === 'number' && minFont < floor) {
            out.violations.push({ page, width: w, code: 'FONT-FLOOR', msg: page + '@' + w + ' minFontPxNoSvg=' + minFont + ' < ' + lang + ' 下限 ' + floor });
          }
        }
      }
      out.rows.push({ page, width: w, outOfBounds: oob, minFontPxNoSvg: minFont, touchSmall: m && m.touchSmall });
    }
  }
  if (!out.rows.length) out.skipped.push('版式夹具没有任何 widths 读数（读数为空＝门失明，不许当绿）');
  return out;
}

async function productRoster() {
  const p = join(ROOT, 'packages', 'base-link-core', 'dist', 'index.js');
  if (!existsSync(p)) return { ok: false, why: 'dist 缺失：packages/base-link-core/dist/index.js —— 请先 pnpm build' };
  const m = await import(pathToFileURL(p).href);
  return { ok: true, languages: [...(m.AVAILABLE_LANGUAGES || [])], default: m.DEFAULT_LANGUAGE };
}

async function main() {
  const roster = await productRoster();
  const violations = auditRegisters({ languages: LANGUAGES, registers: LANG_REGISTERS, rules: STRUCTURAL_RULES });
  if (!roster.ok) violations.push({ code: 'ROSTER-UNREADABLE', msg: roster.why });
  else {
    if (!sameRoster(roster.languages, LANGUAGES)) {
      violations.push({ code: 'ROSTER-DRIFT', msg: '语言闭集与产品侧 ' + ROSTER_SOURCE + ' 不一致：门侧 ' + JSON.stringify(LANGUAGES) + ' vs 产品侧 ' + JSON.stringify(roster.languages) });
    }
    if (roster.default !== DEFAULT_LANGUAGE) {
      violations.push({ code: 'DEFAULT-DRIFT', msg: '缺省语言不一致：门侧 ' + DEFAULT_LANGUAGE + ' vs 产品侧 ' + roster.default });
    }
  }

  const fixtureResult = { rows: [], violations: [], skipped: [] };
  if (existsSync(FIXTURE)) {
    try {
      const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));
      const fr = auditFixture(fixture);
      fixtureResult.rows = fr.rows; fixtureResult.violations = fr.violations; fixtureResult.skipped = fr.skipped;
    } catch (e) {
      violations.push({ code: 'FIXTURE-UNREADABLE', msg: '版式夹具读不了：' + FIXTURE + ' → ' + e.message });
    }
  } else {
    fixtureResult.skipped.push('版式夹具不存在（' + FIXTURE + '）：这一轮没有版式读数，显式报，不当绿');
  }

  if (SELFTEST) return selftest();

  console.log('# #1199 排印门语言无关化（语言列：' + LANGUAGES.join('／') + '；基准语言 ' + DEFAULT_LANGUAGE + '）');
  console.log('ROSTER: 产品侧=' + JSON.stringify(roster.languages || []) + ' 门侧=' + JSON.stringify(LANGUAGES) + ' 同值=' + (roster.ok && sameRoster(roster.languages, LANGUAGES)));
  console.log('STRUCTURAL（语言无关，所有语言同一套）: ' + STRUCTURAL_RULES.map((r) => r.id + (r.enforced === true ? '' : '(本工具未判)')).join(', '));
  for (const lang of LANGUAGES) {
    const r = LANG_REGISTERS[lang];
    console.log('REGISTER ' + lang + ': separators=' + JSON.stringify(r.separators) + ' maxSegChars=' + r.maxSegChars
      + ' fontFloorPx=' + r.fontFloorPx + ' boxGridPx=' + r.boxGridPx + ' bareLatinIsFault=' + r.bareLatinIsFault
      + ' halfPunct=' + JSON.stringify(r.halfPunct));
  }
  if (LIST) {
    for (const row of fixtureResult.rows) console.log('FIXTURE ' + row.page + '@' + row.width + ' outOfBounds=' + row.outOfBounds + ' minFontPxNoSvg=' + row.minFontPxNoSvg);
    console.log('RESULT: langs=' + LANGUAGES.length + ' structural=' + STRUCTURAL_RULES.filter((r) => r.enforced === true).length + '/' + STRUCTURAL_RULES.length + '（有判据／声明） fixtures=' + fixtureResult.rows.length + ' violations=' + violations.length);
    return;
  }
  for (const s of fixtureResult.skipped) console.log('SKIPPED ' + s);
  // 版式夹具的读数与**基线账本**比：基线内＋台面上各有一次＝绿（判了、与登记一致）；
  // 新出现＝红（新债不许静默进来）；基线里有、台面上没了＝红（债还清了要显式改基线）。
  const cmp = compareBaseline(fixtureResult.violations, FIXTURE_BASELINE);
  for (const v of cmp.stale) console.error('RED [BASELINE-STALE] ' + v.code + ' @' + v.page + '@' + v.width + '：基线登记过、台面上已经没有了 → 存续债还清了，请显式更新 FIXTURE_BASELINE');
  for (const v of cmp.fresh) console.error('RED [' + v.code + '] ' + v.msg + '（基线里没有这条＝新债）');
  for (const v of violations) console.error('RED [' + v.code + '] ' + v.msg);
  const total = violations.length + cmp.stale.length + cmp.fresh.length;
  console.log('BASELINE: 存续债 ' + FIXTURE_BASELINE.length + ' 条（' + FIXTURE_BASELINE.map((b) => b.code + '@' + b.page + '@' + b.width).join('、') + '）· 命中 ' + (fixtureResult.violations.length - cmp.fresh.length) + ' · 新增 ' + cmp.fresh.length + ' · 已清 ' + cmp.stale.length);
  console.log('RESULT: langs=' + LANGUAGES.length + ' structural=' + STRUCTURAL_RULES.filter((r) => r.enforced === true).length + '/' + STRUCTURAL_RULES.length + '（有判据／声明） fixtures=' + fixtureResult.rows.length + ' violations=' + total);
  if (total > 0) {
    console.error('FAIL: 排印门语言无关化未过（' + total + ' 处；结构约束不许按语言放宽，语言阀值不许两边一样，新债不许静默进来）');
    process.exit(1);
  }
  console.log('PASS: 结构约束语言无关（本工具判 ' + STRUCTURAL_RULES.filter((r) => r.enforced === true).length + '／声明 ' + STRUCTURAL_RULES.length + ' 条）× 语言阀值分列（' + LANGUAGES.length + ' 门）＋ 版式夹具 ' + fixtureResult.rows.length + ' 条读数（存续债 ' + FIXTURE_BASELINE.length + ' 条已登记、新增 0）');
}

function selftest() {
  const bad = [];
  const want = (cond, msg) => { if (!cond) bad.push(msg); };
  const base = auditRegisters({});
  want(base.length === 0, '现状名册应零违规（实得 ' + base.length + '：' + JSON.stringify(base.map((v) => v.code)) + '）');
  const weakened = { ...LANG_REGISTERS, en: { ...LANG_REGISTERS.en, overflow: 'allow' } };
  const v1 = auditRegisters({ registers: weakened });
  want(v1.some((v) => v.code === 'LANG-WEAKENED-STRUCTURAL'), '按语言放宽结构约束必须红（实得 ' + JSON.stringify(v1.map((v) => v.code)) + '）');
  console.log('SELFTEST 改坏读数：violations=' + v1.length + ' codes=' + JSON.stringify([...new Set(v1.map((v) => v.code))]));
  const narrow = { ...LANG_REGISTERS, en: { ...LANG_REGISTERS.en, maxSegChars: 40 } };
  const v2 = auditRegisters({ registers: narrow });
  want(v2.some((v) => v.code === 'SEG-LIMIT-NOT-WIDER'), '英文段长上限不宽于中文必须红');
  const identical = { ...LANG_REGISTERS, en: { ...LANG_REGISTERS.zh } };
  const v3 = auditRegisters({ registers: identical });
  want(v3.some((v) => v.code === 'REGISTER-NOT-SPLIT'), '两门语言名册一样必须红');
  const restored = auditRegisters({});
  want(restored.length === 0, '还原后必须零违规');
  console.log('SELFTEST 还原读数：violations=' + restored.length);
  const fake = { rows: [{ name: 'demo', widths: { '390': { outOfBounds: 1, minFontPxNoSvg: 8, touchSmall: 0 } } }] };
  const fv = auditFixture(fake);
  want(fv.violations.some((v) => v.code === 'OVERFLOW'), 'outOfBounds≠0 必须红（不溢出＝语言无关结构约束）');
  want(fv.violations.some((v) => v.code === 'FONT-FLOOR'), '字号跌破下限必须红');
  console.log('SELFTEST 版式变异读数：violations=' + fv.violations.length + ' codes=' + JSON.stringify(fv.violations.map((v) => v.code)));
  const emptyFix = auditFixture({ rows: [{ name: 'demo', widths: {} }] });
  want(emptyFix.skipped.length > 0, '版式读数全空必须报 skipped（门失明不许当绿）');
  if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
  console.log('SELFTEST: 结构约束语言无关／按语言放宽必红／段长不宽必红／名册不分裂必红／还原必绿／版式变异必红／读数空必报 七条自证 OK');
}

await main();