#!/usr/bin/env node
/**
 * tooling/make-evidence.mjs —— 证据填数＋格式门（#327 其三）。
 *
 * 只做两件事：① 数字从运行日志取值填入模板；② 格式自检。对账仍走
 * tooling/check-gate-audit.mjs，本件不造对账。
 *
 * 用法：
 *   node tooling/make-evidence.mjs --template <模板> --log <运行日志> --out <输出>
 *   node tooling/make-evidence.mjs --check <文件> [--root <仓库根>]
 *   node tooling/make-evidence.mjs --help
 *
 * 机器摘要行格式（冻结）：运行日志里以 `EVIDENCE ` 开头，一行一条：
 *   EVIDENCE <名>=<值>      （值含空白须用 JSON 双引号包裹）
 * 模板占位符：`{{名}}`（名＝[A-Za-z_][\w-]*）。日志无此名即 FAIL 点名。
 * 格式门（对输出／--check 文件，逐条点名行号）：
 *   ① 无 BOM；② 无 CRLF；③ 无控制符（\n \t 除外）；④ 无字面换行（\ 两字符）；
 *   ⑤ 无残留占位符；⑥ 引用可落地（docs|packages|tooling|test 开头须存在）。
 * 退出码：0 通过；1 填数／格式不通过；2 用法错。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SUMMARY_RE = /^EVIDENCE\s+(.*)$/gm;
const FIELD_RE = /([A-Za-z_][\w-]*)=("(?:[^"\\]|\\.)*"|\S*)/g;
const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_][\w-]*)\s*\}\}/g;
const REF_RE = /(?:docs|packages|tooling|test)\/[^\s`"'\)\]]+/g;

/** 解析运行日志的机器摘要行：返回 Map<名, 值>。 */
export function parseSummary(logText) {
  const out = new Map();
  for (const m of String(logText).matchAll(SUMMARY_RE)) {
    FIELD_RE.lastIndex = 0;
    let f;
    while ((f = FIELD_RE.exec(m[1])) !== null) {
      let v = f[2];
      if (v.startsWith('"')) { try { v = JSON.parse(v); } catch { v = v.slice(1, -1); } }
      out.set(f[1], v);
    }
  }
  return out;
}

/** 填模板：返回 { text, missing }（missing＝日志没有的占位符名）。 */
export function fillTemplate(tplText, values) {
  const missing = [];
  const text = String(tplText).replace(PLACEHOLDER_RE, (all, name) => {
    if (!values.has(name)) { if (!missing.includes(name)) missing.push(name); return all; }
    return String(values.get(name));
  });
  return { text, missing };
}

/** 格式自检：返回点名行号的报错串数组（空＝通过）。 */
export function checkFormat(text, root) {
  const errs = [];
  const s = String(text);
  if (s.charCodeAt(0) === 0xFEFF) errs.push('BOM 头（第 1 行）：文件须是不带 BOM 的 UTF-8');
  const lines = s.split('\n');
  lines.forEach((line, i) => {
    const n = i + 1;
    if (line.endsWith('\r')) errs.push(`CRLF 行尾（第 ${n} 行）：须统一 LF`);
    const bad = line.match(/[\0-\b\v\f\x0e-\x1f\x7f]/);
    if (bad) errs.push(`控制符 U+${bad[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}（第 ${n} 行）`);
    if (/\\n/.test(line)) errs.push(`字面换行 \\n 两字符（第 ${n} 行）：须是真换行`);
    const ph = line.match(/\{\{\s*[A-Za-z_][\w-]*\s*\}\}/);
    if (ph) errs.push(`残留占位符 ${ph[0]}（第 ${n} 行）`);
    for (const ref of line.match(REF_RE) || []) {
      const clean = ref.replace(/[.,!?;:)\]}'"]+$/u, '');
      if (!fs.existsSync(path.resolve(root, clean))) errs.push(`引用不可落地（第 ${n} 行）：${clean}`);
    }
  });
  return errs;
}

function usage() {
  const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const block = text.match(/\/\*\*([\s\S]*?)\*\//);
  return block ? block[1].replace(/^\s*\*?/gm, '').trim() : 'make-evidence.mjs';
}

function main(argv) {
  let tpl = '', log = '', out = '', check = '';
  let root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { console.log(usage()); return 0; }
    else if (a === '--template') { tpl = argv[++i] ?? ''; }
    else if (a === '--log') { log = argv[++i] ?? ''; }
    else if (a === '--out') { out = argv[++i] ?? ''; }
    else if (a === '--check') { check = argv[++i] ?? ''; }
    else if (a === '--root') { root = argv[++i] ?? ''; }
    else { console.error(`FAIL: 未知参数：${a}。用法见 --help`); return 2; }
  }
  const repo = path.resolve(root);
  if (check) {
    let text;
    try { text = fs.readFileSync(path.resolve(repo, check), 'utf8'); }
    catch { console.error(`FAIL: 文件不可读：${check}`); return 2; }
    const errs = checkFormat(text, repo);
    for (const e of errs) console.error(`FAIL: ${e}`);
    console.log(`make-evidence: ${errs.length === 0 ? 'PASS' : 'FAIL'}（格式 ${errs.length} 项）`);
    return errs.length === 0 ? 0 : 1;
  }
  if (!tpl || !log || !out) { console.error('FAIL: 须给 --template ＋ --log ＋ --out，或 --check。用法见 --help'); return 2; }
  let tplText, logText;
  try { tplText = fs.readFileSync(path.resolve(repo, tpl), 'utf8'); }
  catch { console.error(`FAIL: 模板不可读：${tpl}`); return 2; }
  try { logText = fs.readFileSync(path.resolve(repo, log), 'utf8'); }
  catch { console.error(`FAIL: 运行日志不可读：${log}`); return 2; }
  const { text, missing } = fillTemplate(tplText, parseSummary(logText));
  if (missing.length > 0) {
    for (const m of missing) console.error(`FAIL: 日志缺数（模板要、日志无）：{{${m}}}`);
    return 1;
  }
  const abs = path.resolve(repo, out);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');
  const errs = checkFormat(text, repo);
  for (const e of errs) console.error(`FAIL: ${e}`);
  console.log(`make-evidence: ${errs.length === 0 ? 'PASS' : 'FAIL'}（已填 ${abs}；格式 ${errs.length} 项）`);
  return errs.length === 0 ? 0 : 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error(`FAIL: ${err.message}`); process.exit(1); }
}
