#!/usr/bin/env node
/** #1079 · 从 16 件判地原型生成 SAY 采集页的数据表（入仓，随票走）。
 *
 * 出什么：\`packages/skill-bill/src/write/sayWords.ts\`——一份版式（saySheet.ts）配的 16 份数据。
 * 数据全部从判地原型的**可见文本**反推：店头两态／缺项徽章／已填行／表单字段与候选项／选填组／提示行／
 * 槽位配置（含 \`needs\`／\`nochip\` 两个门控位）。
 *
 * 两条硬口径：
 *   ① **唤醒词一个都不写进数据表**——词面一律写占位符 \`{word}\`，渲染时由域声明投影（判据 \`t721\`）；
 *   ② 键是「哪条场景」的判别位：写入域＝kind（记一笔是 \`plain\`），改记录族＝\`update:none|undo|restore\`。
 *
 * 用法（仓根）：\`node docs/skills/skill-bill/1079-say-数据生成器.mjs\`（幂等：不改原型它就不改产物）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DIR = join(ROOT, 'docs/skills/skill-bill/proto/say-collect');
const TARGET = join(ROOT, 'packages/skill-bill/src/write/sayWords.ts');

const PAGES = [
  ['x01-记支出', 'expense'], ['x03-记收入', 'income'], ['x05-拍账单', 'photo'], ['x07-批量录入', 'batch'],
  ['x09-记退款', 'refund'], ['x11-记报销', 'reimburse'], ['x13-报销到账', 'reimburse-done'],
  ['x15-记借出', 'lend'], ['x17-记借入', 'borrow'], ['x19-记收回', 'collect'], ['x21-记偿还', 'repay'],
  ['x23-记分期', 'installment'], ['x25-记一笔', 'plain'], ['x27-改记录', 'update:none'],
  ['x29-撤销', 'update:undo'], ['x31-恢复', 'update:restore'],
];

const attr = (s, re) => { const m = s.match(re); return m ? m[1] : ''; };
const q = (s) => JSON.stringify(String(s));
const rows = [];
for (const [f, sayKey] of PAGES) {
  const word = f.replace(/^x\d+-/, '');
  const t = readFileSync(join(DIR, f + '-采集-v2.3.html'), 'utf8');
  const cfg = JSON.parse(attr(t, /window\.__SAYCFG = (\{[^\n]*\});/) || '{}');
  /** 词面一律换成占位符（本表不写字面唤醒词）。 */
  const S = (s) => String(s).split(word).join('{word}');
  const slots = (cfg.slots || []).map((s) => Object.assign(
    { key: s.key, label: s.label, ftype: s.ftype },
    s.opt ? { opt: true } : {}, s.ph ? { ph: s.ph } : {}, s.needs ? { needs: s.needs } : {}, s.nochip ? { nochip: true } : {},
  ));
  const body = t.slice(t.indexOf('<body'));
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
  L.push('  ' + q(sayKey) + ': {');
  L.push('    titleWait: ' + q(S(attr(body, /<h2[^>]*data-wait="([^"]*)"/))) + ',');
  L.push('    titleReady: ' + q(S(attr(body, /<h2[^>]*data-ready="([^"]*)"/))) + ',');
  L.push('    subWait: ' + q(S(attr(body, /<p class="shop-sub"[^>]*data-wait="([^"]*)"/))) + ',');
  L.push('    subReady: ' + q(S(attr(body, /<p class="shop-sub"[^>]*data-ready="([^"]*)"/))) + ',');
  L.push('    todoWait: ' + q(attr(body, /<span id="sayTodoNo">([^<]*)</)) + ',');
  L.push('    todoTagWait: ' + q(attr(body, /<span class="no" id="sayTodoTag">([^<]*)</)) + ',');
  L.push('    chips: [' + chips.map((c) => '{ key: ' + q(c.key) + ', label: ' + q(S(c.label)) + ', small: ' + q(c.small) + ' }').join(', ') + '],');
  L.push('    fills: [' + fills.map((x) => '{ label: ' + q(x.label) + ', value: ' + q(S(x.value)) + ' }').join(', ') + '],');
  L.push('    fields: [' + fields.map((x) => '{ slot: ' + q(x.slot) + ', label: ' + q(S(x.label)) + ', kind: ' + q(x.kind) + ', req: ' + (x.req ? 'true' : 'false') + (x.options ? ', options: [' + x.options.map((o) => '{ value: ' + q(o.value) + ', label: ' + q(o.label) + ' }').join(', ') + ']' : '') + (x.placeholder ? ', placeholder: ' + q(S(x.placeholder)) : '') + ' }').join(', ') + '],');
  if (optFields.length) {
    L.push('    optFields: [' + optFields.map((x) => '{ slot: ' + q(x.slot) + ', label: ' + q(x.label) + ', kind: ' + q(x.kind) + ', req: false' + (x.placeholder ? ', placeholder: ' + q(x.placeholder) : '') + ' }').join(', ') + '],');
    L.push('    optSummary: ' + q(attr(body, /<span class="sub">([^<]*)<\/span>/)) + ',');
    L.push('    optNote: ' + q(attr(body, /<p class="say-opt-note">([^<]*)</)) + ',');
  }
  L.push('    hint: ' + q(S(attr(body, /<p class="say-hint"[^>]*>([^<]*)</))) + ',');
  L.push('    cfg: ' + JSON.stringify(slots) + ',');
  L.push('  },');
  rows.push(L.join(String.fromCharCode(10)));
}
const head = [
  '/** 采集页（SAY）逐词数据表——一份版式（./saySheet.ts）＋ 16 份数据（本件）。',
  ' *',
  ' * 数据全部从 16 件判地原型的可见文本反推；**唤醒词一个都不写在这里**——词面一律写占位符 {word}，',
  ' * 渲染时由调用方把投影出来的唤醒词填进去（判据 t721：一条唤醒词只准住它所属那份域声明）。',
  ' * 键是「哪条场景」的判别位：写入域＝kind（记一笔是 plain），改记录族＝update:none／update:undo／update:restore。',
  ' *',
  ' * 本件由 docs/skills/skill-bill/1079-say-数据生成器.mjs 从判地原型生成（幂等）：改原型后重跑它，别手改。',
  ' */',
  '',
  "import type { SayWordSpec } from './saySheet.js';",
  '',
  'export const SAY_WORDS: Readonly<Record<string, SayWordSpec>> = {',
].join(String.fromCharCode(10));
writeFileSync(TARGET, head + String.fromCharCode(10) + rows.join(String.fromCharCode(10)) + String.fromCharCode(10) + '};' + String.fromCharCode(10), 'utf8');
console.log('wrote ' + TARGET + '（' + rows.length + ' 行）');
