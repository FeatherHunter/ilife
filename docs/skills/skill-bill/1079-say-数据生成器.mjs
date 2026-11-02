#!/usr/bin/env node
/** #1079 · 从 16 件判地原型生成 SAY 采集页的数据表（入仓，随票走）。
 *
 * 出什么：\`packages/skill-bill/src/write/sayWords.ts\`——一份版式（saySheet.ts）配的 16 份数据。
 * 数据全部从判地原型的**可见文本**反推：店头两态／缺项徽章／已填行／表单字段与候选项／选填组／提示行／
 * 槽位配置（含 \`needs\`／\`nochip\` 两个门控位）。
 *
 * 三条硬口径：
 *   ① **唤醒词一个都不写进数据表**——词面一律写占位符 \`{word}\`，渲染时由域声明投影（判据 \`t721\`）；
 *   ② 文案不落本件：每条可见文案从词条层取（\`m('<包>.<区段>.cNNN')\`，#1203 迁入 \`src/entries/{zh,en}.ts\`），
 *      模板里的 \`{word}\` 由调用方把投影出来的唤醒词当参数传进来；
 *   ③ 键是「哪条场景」的判别位：写入域＝kind（记一笔是 \`plain\`），改记录族＝\`update:none|undo|restore\`。
 *
 * 用法（仓根）：\`node docs/skills/skill-bill/1079-say-数据生成器.mjs\`（幂等：不改原型它就不改产物）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DIR = join(ROOT, 'docs/skills/skill-bill/proto/say-collect');
const TARGET = join(ROOT, 'packages/skill-bill/src/write/sayWords.ts');
const SECTION = 'skill-bill.write-sayWords';

const PAGES = [
  ['x01-记支出', 'expense'], ['x03-记收入', 'income'], ['x05-拍账单', 'photo'], ['x07-批量录入', 'batch'],
  ['x09-记退款', 'refund'], ['x11-记报销', 'reimburse'], ['x13-报销到账', 'reimburse-done'],
  ['x15-记借出', 'lend'], ['x17-记借入', 'borrow'], ['x19-记收回', 'collect'], ['x21-记偿还', 'repay'],
  ['x23-记分期', 'installment'], ['x25-记一笔', 'plain'], ['x27-改记录', 'update:none'],
  ['x29-撤销', 'update:undo'], ['x31-恢复', 'update:restore'],
];

/** 候选判据与迁移器同形（tooling/i18n-migrate/rewrite.mjs 的 CANDIDATE_RE）：含汉字或假名才建词条。 */
const CANDIDATE_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF]/;
const attr = (s, re) => { const m = s.match(re); return m ? m[1] : ''; };
const q = (s) => JSON.stringify(String(s));
/** 词条序号：按本件出现顺序 c001 起（与迁移器同一口径：同值不去重）。 */
let seq = 0;
/** 可见文案：含汉字／假名就从词条层取，否则留字面量（"TODO"、槽位键这类不是文案）。 */
const t = (s) => {
  const v = String(s);
  if (!CANDIDATE_RE.test(v)) return q(v);
  seq += 1;
  const key = SECTION + '.c' + String(seq).padStart(3, '0');
  return "m('" + key + "'" + (v.indexOf('{word}') >= 0 ? ', { word }' : '') + ')';
};
/** 槽位配置：与 JSON.stringify 逐字节同形，只把 label 换成取词调用。 */
const cfgJson = (slots) => '[' + slots.map((s) => {
  const parts = ['"key":' + q(s.key), '"label":' + t(s.label), '"ftype":' + q(s.ftype)];
  if (s.opt) parts.push('"opt":true');
  if (s.ph) parts.push('"ph":' + q(s.ph));
  if (s.needs) parts.push('"needs":' + q(s.needs));
  if (s.nochip) parts.push('"nochip":true');
  return '{' + parts.join(',') + '}';
}).join(',') + ']';
/** 分类槽的选项（value 非空、且不是「其他（手填）」占位）是写进库的数据（手册 §5「数据不译」）：value 与 label 都留中文字面量。 */
const catData = (x, o) => x.slot === 'cat' && o.value !== '' && o.value !== '__other';
const fieldValue = (x, o) => (catData(x, o) ? q(o.value) : t(o.value));
const fieldLabel = (x, o) => (catData(x, o) ? q(o.label) : t(o.label));
const rows = [];
for (const [f, sayKey] of PAGES) {
  const word = f.replace(/^x\d+-/, '');
  const t0 = readFileSync(join(DIR, f + '-采集-v2.3.html'), 'utf8');
  const cfg = JSON.parse(attr(t0, /window\.__SAYCFG = (\{[^\n]*\});/) || '{}');
  /** 词面一律换成占位符（本表不写字面唤醒词）。 */
  const S = (s) => String(s).split(word).join('{word}');
  const slots = (cfg.slots || []).map((s) => Object.assign(
    { key: s.key, label: s.label, ftype: s.ftype },
    s.opt ? { opt: true } : {}, s.ph ? { ph: s.ph } : {}, s.needs ? { needs: s.needs } : {}, s.nochip ? { nochip: true } : {},
  ));
  const body = t0.slice(t0.indexOf('<body'));
  const form = (body.match(/<div class="say-form" id="sayForm"([\s\S]*?)<\/div>\s*(?:<p class="say-hint")/) || [, ''])[1];
  const di = form.indexOf('<details');
  const fieldsOf = (src) => [...src.matchAll(/<label class="say-field"><span>([^<]*?)(?:<i class="req">\*<\/i>)?<\/span>([\s\S]*?)<\/label>/g)].map((m) => {
    const label = m[1].trim(); const inner = m[2];
    const req = /<i class="req">/.test(m[0]);
    const sel = inner.match(/<select data-slot="([^"]+)"/);
    if (sel) {
      const options = [...inner.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map((o) => ({ value: o[1], label: o[2] }));
      return { slot: sel[1], label, kind: 'select', req, options };
    }
    const inp = inner.match(/<input type="([^"]*)"[^>]*data-slot="([^"]+)"(?:[^>]*placeholder="([^"]*)")?/);
    return inp ? { slot: inp[2], label, kind: inp[1] || 'text', req, ...(inp[3] ? { placeholder: inp[3] } : {}) } : null;
  }).filter(Boolean);
  const fields = fieldsOf(di >= 0 ? form.slice(0, di) : form);
  const optFields = fieldsOf(di >= 0 ? form.slice(di) : '');
  const chips = [...body.matchAll(/<span class="slot ([a-z]+)" data-chip="([^"]+)">([^<]*)\s*<small>([^<]*)<\/small>/g)].map((m) => ({ key: m[2], label: m[3].trim(), small: m[4] }));
  const fills = [...body.matchAll(/<div class="fill-line"><span class="k">([^<]*)<\/span><span class="dots"><\/span><span class="v">([^<]*)</g)].map((x) => ({ label: x[1], value: x[2] }));
  const L = [];
  L.push('    ' + q(sayKey) + ': {');
  L.push('      titleWait: ' + t(S(attr(body, /<h2[^>]*data-wait="([^"]*)"/))) + ',');
  L.push('      titleReady: ' + t(S(attr(body, /<h2[^>]*data-ready="([^"]*)"/))) + ',');
  L.push('      subWait: ' + t(S(attr(body, /<p class="shop-sub"[^>]*data-wait="([^"]*)"/))) + ',');
  L.push('      subReady: ' + t(S(attr(body, /<p class="shop-sub"[^>]*data-ready="([^"]*)"/))) + ',');
  L.push('      todoWait: ' + t(attr(body, /<span id="sayTodoNo">([^<]*)</)) + ',');
  L.push('      todoTagWait: ' + t(attr(body, /<span class="no" id="sayTodoTag">([^<]*)</)) + ',');
  L.push('      chips: [' + chips.map((c) => '{ key: ' + q(c.key) + ', label: ' + t(S(c.label)) + ', small: ' + t(c.small) + ' }').join(', ') + '],');
  L.push('      fills: [' + fills.map((x) => '{ label: ' + t(x.label) + ', value: ' + t(S(x.value)) + ' }').join(', ') + '],');
  L.push('      fields: [' + fields.map((x) => '{ slot: ' + q(x.slot) + ', label: ' + t(S(x.label)) + ', kind: ' + q(x.kind) + ', req: ' + (x.req ? 'true' : 'false') + (x.options ? ', options: [' + x.options.map((o) => '{ value: ' + fieldValue(x, o) + ', label: ' + fieldLabel(x, o) + ' }').join(', ') + ']' : '') + (x.placeholder ? ', placeholder: ' + t(S(x.placeholder)) : '') + ' }').join(', ') + '],');
  if (optFields.length) {
    L.push('      optFields: [' + optFields.map((x) => '{ slot: ' + q(x.slot) + ', label: ' + t(x.label) + ', kind: ' + q(x.kind) + ', req: false' + (x.placeholder ? ', placeholder: ' + t(x.placeholder) : '') + ' }').join(', ') + '],');
    L.push('      optSummary: ' + t(attr(body, /<span class="sub">([^<]*)<\/span>/)) + ',');
    L.push('      optNote: ' + t(attr(body, /<p class="say-opt-note">([^<]*)</)) + ',');
  }
  L.push('      hint: ' + t(S(attr(body, /<p class="say-hint"[^>]*>([^<]*)</))) + ',');
  L.push('      cfg: ' + cfgJson(slots) + ',');
  L.push('    },');
  rows.push(L.join(String.fromCharCode(10)));
}
const head = [
  '/** 采集页（SAY）逐词数据表——一份版式（./saySheet.ts）＋ 16 份数据（本件）。',
  ' *',
  ' * 数据全部从 16 件判地原型的可见文本反推；**唤醒词一个都不写在这里**——词面一律写占位符 {word}，',
  ' * 渲染时由调用方把投影出来的唤醒词当参数传进来（判据 t721：一条唤醒词只准住它所属那份域声明）。',
  ' * 键是「哪条场景」的判别位：写入域＝kind（记一笔是 plain），改记录族＝update:none／update:undo／update:restore。',
  ' *',
  ' * 文案住在 ./../entries/{zh,en}.ts（#1203 迁入）：每条可见文案走 m() 按渲染语言取词。',
  ' * 例外：分类槽的 value 与 label 是写进库的数据（手册 §5「数据不译」），留中文字面量。',
  ' *',
  ' * 本件由 docs/skills/skill-bill/1079-say-数据生成器.mjs 从判地原型生成（幂等）：改原型后重跑它，别手改。',
  ' */',
  '',
  "import type { SayWordSpec } from './saySheet.js';",
  "import { m } from '../entries/index.js';",
  '',
  'export function sayWords(word: string): Readonly<Record<string, SayWordSpec>> {',
  '  return {',
].join(String.fromCharCode(10));
writeFileSync(TARGET, head + String.fromCharCode(10) + rows.join(String.fromCharCode(10)) + String.fromCharCode(10) + '  };' + String.fromCharCode(10) + '}' + String.fromCharCode(10), 'utf8');
console.log('wrote ' + TARGET + '（' + rows.length + ' 行，' + seq + ' 条词条）');
