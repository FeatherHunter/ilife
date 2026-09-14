#!/usr/bin/env node
/**
 * tooling/plan-check.mjs —— 编辑集静态校验（#327 其一）。
 *
 * 只验"删除/移动集 ＋ 写手集≡核对集"：只读输入、只报结论，不替人执行。
 *
 * 用法：
 *   node tooling/plan-check.mjs --edit <编辑集.json> [--root <仓库根>]
 *   node tooling/plan-check.mjs --help
 *
 * 输入形状（冻结；形状不符即 FAIL，不做校验）：
 *   { "deletes": ["<仓库相对路径>", …],
 *     "moves": [{ "from": "<仓库相对路径>", "to": "<仓库相对路径>" }, …],
 *     "writers": ["<仓库相对路径>", …],
 *     "checks": ["<仓库相对路径>", …] }
 *   路径一律仓库相对、POSIX 分隔；缺字段视为空集。
 *
 * 校验（每条失败都点名路径）：
 *   ① 源存在：deletes／moves.from 在当刻树上存在；
 *   ② 目标父目录可建：moves.to 的每一级已存在前缀都不是文件；
 *   ③ 无重复：deletes／from／to／writers／checks 各自无重复，单条 from≠to；
 *   ④ 无残留旧路：消失集（deletes＋from）∩ 出现集（to＋writers＋checks）＝∅；
 *   ⑤ 写手集≡核对集：writers 与 checks 作多重集相等。
 * 退出码：0 通过；1 校验不通过；2 用法／形状错。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 仓库相对 POSIX 路径 → root 下绝对路径（拒绝 root 外逃逸）。 */
export function resolveInRoot(root, rel) {
  const base = path.resolve(root);
  const abs = path.resolve(base, rel);
  if (abs !== base && !abs.startsWith(base + path.sep)) throw new Error(`路径逃逸出仓库根：${rel}`);
  return abs;
}

/** 读编辑集并冻结形状：返回 { deletes, moves, writers, checks }；形状错抛错。 */
export function loadEditSet(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch { throw new Error(`编辑集文件不可读：${file}`); }
  let obj;
  try { obj = JSON.parse(raw); }
  catch { throw new Error(`编辑集不是合法 JSON：${file}`); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('编辑集顶层须是对象');
  const strs = (v, name) => {
    if (v === undefined) return [];
    if (!Array.isArray(v) || !v.every((s) => typeof s === 'string')) throw new Error(`字段 ${name} 须是字符串数组`);
    return v;
  };
  const moves = obj.moves === undefined ? [] : obj.moves;
  if (!Array.isArray(moves) || !moves.every((m) => m && typeof m.from === 'string' && typeof m.to === 'string')) {
    throw new Error('字段 moves 须是 {from,to} 数组');
  }
  return { deletes: strs(obj.deletes, 'deletes'), moves, writers: strs(obj.writers, 'writers'), checks: strs(obj.checks, 'checks') };
}

/** 静态校验：返回点名报错串数组（空＝通过）。 */
export function checkEditSet(edit, root) {
  const errs = [];
  for (const p of edit.deletes) {
    if (!fs.existsSync(resolveInRoot(root, p))) errs.push(`源不存在（deletes）：${p}`);
  }
  const froms = [], tos = [];
  for (const m of edit.moves) {
    froms.push(m.from); tos.push(m.to);
    if (!fs.existsSync(resolveInRoot(root, m.from))) errs.push(`源不存在（moves.from）：${m.from}`);
    if (m.from === m.to) errs.push(`原地移动（from＝to）：${m.from}`);
    const segs = m.to.split('/').slice(0, -1);
    let prefix = '';
    for (const seg of segs) {
      prefix = prefix ? `${prefix}/${seg}` : seg;
      const abs = resolveInRoot(root, prefix);
      if (fs.existsSync(abs) && !fs.statSync(abs).isDirectory()) {
        errs.push(`目标父目录不可建（被文件挡住）：${m.to}（挡路：${prefix}）`);
        break;
      }
    }
  }
  const dup = (arr, name) => {
    const seen = new Set();
    for (const p of arr) {
      if (seen.has(p)) errs.push(`重复项（${name}）：${p}`);
      seen.add(p);
    }
  };
  dup(edit.deletes, 'deletes'); dup(froms, 'moves.from'); dup(tos, 'moves.to');
  dup(edit.writers, 'writers'); dup(edit.checks, 'checks');
  const gone = new Set([...edit.deletes, ...froms]);
  for (const p of [...tos, ...edit.writers, ...edit.checks]) {
    if (gone.has(p)) errs.push(`残留旧路（消失路径又被出现）：${p}`);
  }
  const count = (arr) => {
    const m = new Map();
    for (const p of arr) m.set(p, (m.get(p) || 0) + 1);
    return m;
  };
  const w = count(edit.writers), c = count(edit.checks);
  for (const [p, n] of w) {
    if ((c.get(p) || 0) !== n) errs.push(`写手集≡核对集不一致（只在写手集）：${p}`);
  }
  for (const [p, n] of c) {
    if ((w.get(p) || 0) !== n) errs.push(`写手集≡核对集不一致（只在核对集）：${p}`);
  }
  return errs;
}

function usage() {
  const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const block = text.match(/\/\*\*([\s\S]*?)\*\//);
  return block ? block[1].replace(/^\s*\*?/gm, '').trim() : 'plan-check.mjs';
}

function main(argv) {
  let edit = '', root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { console.log(usage()); return 0; }
    else if (a === '--edit') { edit = argv[++i] ?? ''; }
    else if (a === '--root') { root = argv[++i] ?? ''; }
    else { console.error(`FAIL: 未知参数：${a}。用法见 --help`); return 2; }
  }
  if (!edit) { console.error('FAIL: 缺少 --edit <编辑集.json>。用法见 --help'); return 2; }
  let set;
  try { set = loadEditSet(path.resolve(edit)); }
  catch (err) { console.error(`FAIL: ${err.message}`); return 2; }
  let errs;
  try { errs = checkEditSet(set, path.resolve(root)); }
  catch (err) { console.error(`FAIL: ${err.message}`); return 2; }
  for (const e of errs) console.error(`FAIL: ${e}`);
  console.log(`plan-check: ${errs.length === 0 ? 'PASS' : 'FAIL'}（${errs.length} 项）`);
  return errs.length === 0 ? 0 : 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error(`FAIL: ${err.message}`); process.exit(1); }
}
