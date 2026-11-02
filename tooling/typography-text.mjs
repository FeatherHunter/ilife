#!/usr/bin/env node
/**
 * #1199 S5 · 排印门**语言列文本读数**（唯一实现；gate 与测试同读这一份）。
 *
 * 要证的那句话：「英文页在排印门下不再整批红」。
 * 要证它，得先有**两列可比、由产品自己渲染**的页文本——本件读 #1202 读数基座
 * （packages/base-render/scripts/i18n-pilot-1202.mjs 的 collectAll：固定 now、零随机，4 件产物 × 2 语言）。
 *
 * 三条口径（每条都写在读数里，不许降级成注释）：
 *   ① **只判语言列改写过的那几行**（两列逐行取差集）。两列逐字相同的行是**数据**（夹具入参），
 *      判它等于判夹具、不判产品；一件产物两列逐行相同 ⇒ 报 SAME-TEXT（这件没有语言列，不判，显式报）。
 *   ② **数据位先归一**：日期／时间／记录号／AI（名册 allow）与数字（1,189／2.4／611）先换成占位符，
 *      再判标点——不然「1,189」会被判成半角逗号假红（中文页实测 9 处全是这个）。
 *   ③ **每条读数带反事实行**：把非基准语言的列按**基准语言（中文）名册**再判一遍，报出
 *      「整批红」的条数——那正是改造前排印门的形态；改造后按本语言名册判只剩真债。
 *
 * 零依赖；纯函数（不读盘、不写盘），产物由调用方喂进来。
 */

/** 判据代码（读数与基线都按它比对）。 */
export const TEXT_CODES = ['SEP', 'HALF-PUNCT', 'BARE-LATIN', 'SCRIPT-MISMATCH'];

const CJK_RE_CACHE = new Map();

/** HTML 文本 → 可见文本行：去注释／style／script，去标签，解常见实体，逐行 trim，丢空行。 */
export function visibleTextLines(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 数据位归一：名册 allow 条目 ＋ 数字（含千分位与小数）。返回 { masked, allowHits }。 */
export function maskData(line, register) {
  let t = String(line);
  let allowHits = 0;
  for (const a of register.allow || []) {
    const re = new RegExp(a.re, 'g');
    t = t.replace(re, () => { allowHits += 1; return ' § '; });
  }
  t = t.replace(/\d+(?:[.,]\d+)*/g, ' § ');
  return { masked: t, allowHits };
}

/** 判一行文本：返回 [{code, detail}]（空数组＝这一行合该语言名册）。 */
export function judgeTextLine(line, lang, { registers, defaultLanguage }) {
  const reg = registers[lang];
  if (!reg) throw new Error('没有语言名册：' + lang);
  const { masked } = maskData(line, reg);
  const out = [];
  for (const sep of reg.separators || []) if (masked.includes(sep)) out.push({ code: 'SEP', detail: sep });
  const half = masked.match(new RegExp(reg.halfPunct, 'g'));
  if (half) out.push({ code: 'HALF-PUNCT', detail: [...new Set(half)].join('') });
  if (reg.bareLatinIsFault) {
    const words = masked.match(/[A-Za-z]{2,}/g);
    if (words) out.push({ code: 'BARE-LATIN', detail: [...new Set(words)].join(',') });
  }
  // 非基准语言里出现汉字＝这几句没译（单位「卡／毫升／千克」正是这样漏出来的）。
  if (lang !== defaultLanguage) {
    if (!CJK_RE_CACHE.has(lang)) CJK_RE_CACHE.set(lang, new RegExp(registers[defaultLanguage].scriptRe, 'g'));
    const cjk = masked.match(CJK_RE_CACHE.get(lang));
    if (cjk) out.push({ code: 'SCRIPT-MISMATCH', detail: [...new Set(cjk)].join('') });
  }
  return out;
}

/** 两列差集：返回 { [lang]: 该列独有的行[] }。 */
export function columnDiff(byLang) {
  const langs = Object.keys(byLang);
  const sets = new Map(langs.map((l) => [l, new Set(byLang[l])]));
  const out = {};
  for (const l of langs) {
    const others = new Set();
    for (const o of langs) if (o !== l) for (const s of sets.get(o)) others.add(s);
    out[l] = [...sets.get(l)].filter((s) => !others.has(s));
  }
  return out;
}

/** 基线比对（与 check-typography-langs.mjs 的 FIXTURE_BASELINE 同一套语义）。 */
export function compareTextBaseline(violations, baseline) {
  const key = (v) => [v.lang, v.artifact, v.line].join('|');
  const left = [...baseline];
  const fresh = [];
  for (const v of violations) {
    const i = left.findIndex((b) => key(b) === key(v));
    if (i >= 0) left.splice(i, 1);
    else fresh.push(v);
  }
  return { stale: left, fresh };
}

/**
 * 语言列文本读数。
 *   artifacts：Map<'<lang>/<id>', {text, src}>（#1202 基座 collectAll 的形状）
 *   languages／registers／defaultLanguage：唯一事实源 tooling/i18n-langs.mjs
 * 返回 { columns: Map<lang, {artifacts, lines, violations, stale, fresh}>, sameText: [id], skipped: [{id,why}], counterfactual }。
 */
export function textColumn(artifacts, { languages, registers, defaultLanguage, baseline = [] }) {
  const base = languages[0];
  const ids = [...artifacts.keys()]
    .filter((k) => k.startsWith(base + '/'))
    .map((k) => k.slice(base.length + 1))
    .sort();
  const sameText = [];
  const skipped = [];
  const perLang = new Map(languages.map((l) => [l, { artifacts: 0, lines: [], violations: [] }]));
  const counterfactual = new Map();
  for (const id of ids) {
    const cols = {};
    let ok = true;
    for (const lang of languages) {
      const a = artifacts.get(lang + '/' + id);
      if (!a) { skipped.push({ id, why: '语言 ' + lang + ' 没采到这一件' }); ok = false; break; }
      if (!/^\s*<!doctype html/i.test(a.text) && !/<html[\s>]/i.test(a.text)) {
        skipped.push({ id, why: '不是 HTML 产物（没有可见文本可判）' });
        ok = false;
        break;
      }
      cols[lang] = visibleTextLines(a.text);
    }
    if (!ok) continue;
    const diff = columnDiff(cols);
    const allSame = languages.every((l) => diff[l].length === 0);
    if (allSame) { sameText.push(id); continue; }
    for (const lang of languages) {
      const c = perLang.get(lang);
      c.artifacts += 1;
      for (const line of diff[lang]) {
        c.lines.push(line);
        for (const v of judgeTextLine(line, lang, { registers, defaultLanguage })) {
          c.violations.push({ lang, artifact: id, line, code: v.code, detail: v.detail });
        }
      }
      // 反事实：把这一列按基准语言名册判——改造前就是这么判的。
      const red = diff[lang].filter((line) => judgeTextLine(line, defaultLanguage, { registers, defaultLanguage }).length > 0).length;
      const prev = counterfactual.get(lang) || { lines: 0, red: 0 };
      counterfactual.set(lang, { lines: prev.lines + diff[lang].length, red: prev.red + red });
    }
  }
  for (const lang of languages) {
    const c = perLang.get(lang);
    const cmp = compareTextBaseline(c.violations, baseline.filter((b) => b.lang === lang));
    c.stale = cmp.stale;
    c.fresh = cmp.fresh;
  }
  return { columns: perLang, sameText, skipped, counterfactual };
}
