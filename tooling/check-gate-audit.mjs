#!/usr/bin/env node
/**
 * tooling/check-gate-audit.mjs —— 机械门禁对账（协议 §2.4）：证据里**声称**的每次
 * build／test 运行，必须在审计日志 `<lock-dir>/gate-runs.log` 里找到对应条目；缺失即 exit ≠ 0。
 *
 * 用法：
 *   node tooling/check-gate-audit.mjs --evidence docs/research/t88-disposition-lock-violation.md
 *   node tooling/check-gate-audit.mjs --evidence <文件> --log .scratch/locks/gate-runs.log --ticket 88
 *   node tooling/check-gate-audit.mjs --evidence <文件> --require-claims   # 无任何声明也判 FAIL
 *
 * 声明写法（证据文件里，一行一条，`-`／`*`／表格 `|` 前缀可带）：
 *   GATE-RUN cmd=pnpm build
 *   GATE-RUN ticket=88 cmd="pnpm test"
 *
 * 匹配口径（`cmdMatches`）：
 *   ① 归一化后逐字相等；② 一侧是另一侧的前缀（按 token 边界，例如 `pnpm test` ⊂ `pnpm test test/x.test.mjs`）；
 *   ③ `node --test` 的命令按**文件名集合**比对（证据常写 basename，日志记完整相对路径）。
 *   同一条审计条目只认领一次（声称跑两次就得有两条），避免「一条记录顶多次声称」。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLAIM_RE = /^\s*(?:[-*+]\s+|\|\s*)?GATE-RUN\s+(.*)$/;
const FIELD_RE = /([A-Za-z_][\w-]*)=("(?:[^"\\]|\\.)*"|\S*)/g;
const RUN_LINE_RE = /^\s*RUN\s+/;

/** 解析 `key=value` 串（值含空白时为 JSON 双引号形态）。 */
export function parseFields(text) {
  const out = {};
  FIELD_RE.lastIndex = 0;
  let m;
  while ((m = FIELD_RE.exec(text)) !== null) {
    let value = m[2];
    if (value.startsWith('"')) {
      try { value = JSON.parse(value); } catch { value = value.slice(1, -1); }
    }
    out[m[1]] = value;
  }
  return out;
}

/** 归一化命令：去反引号／去 `$` 前缀／剥掉 run-locked 包装／压缩空白。 */
export function normalizeCmd(raw) {
  let s = String(raw ?? '').trim();
  s = s.replace(/^`+|`+$/g, '').trim();
  s = s.replace(/^\$\s+/, '');
  s = s.replace(/^(?:node\s+)?(?:tooling[\\/]run-locked\.mjs|pnpm\s+gate:run)\b.*?\s--\s+/, '');
  return s.replace(/\s+/g, ' ').trim();
}

/** `node --test` 的测试文件名集合（不含开关参数）；非 `node --test` 返回 null。 */
export function testFileSet(cmd) {
  const n = normalizeCmd(cmd);
  if (!/^node\s+--test\b/.test(n)) return null;
  const args = n.split(' ').slice(2).filter((a) => !a.startsWith('-'));
  return args.map((a) => path.basename(a.replace(/^"|"$/g, ''))).sort();
}

const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export function cmdMatches(claimCmd, auditCmd) {
  const a = normalizeCmd(claimCmd);
  const b = normalizeCmd(auditCmd);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.startsWith(`${a} `) || a.startsWith(`${b} `)) return true;
  const fa = testFileSet(a);
  const fb = testFileSet(b);
  if (fa && fb && fa.length > 0 && fb.length > 0) return sameSet(fa, fb);
  return false;
}

function unquote(value) {
  const s = String(value ?? '').trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  return s;
}

/** 解析一条 `GATE-RUN` 声明体：`cmd=` 之后到行尾整段都是命令（可含空格），另可带 `ticket=`。 */
export function parseClaimBody(body) {
  let rest = String(body ?? '').trim();
  let ticket;
  const tm = /(?:^|\s)ticket=("(?:[^"\\]|\\.)*"|\S+)(?=\s|$)/.exec(rest);
  if (tm) {
    ticket = unquote(tm[1]);
    rest = `${rest.slice(0, tm.index)} ${rest.slice(tm.index + tm[0].length)}`.trim();
  }
  const cm = /(?:^|\s)cmd=([\s\S]+)$/.exec(rest);
  if (!cm) return null;
  const cmd = unquote(cm[1]);
  return cmd ? { cmd, ticket } : null;
}

/** 从证据文本抽取 `GATE-RUN` 声明。 */
export function parseClaims(text) {
  const claims = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const m = CLAIM_RE.exec(raw);
    if (!m) return;
    const claim = parseClaimBody(m[1]);
    if (!claim) return;
    claims.push({ line: i + 1, cmd: claim.cmd, ticket: claim.ticket });
  });
  return claims;
}

/** 从审计日志抽取 `RUN` 条目（忽略 START 等其它前缀）。 */
export function parseAuditLog(text) {
  const entries = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!RUN_LINE_RE.test(raw)) return;
    const fields = parseFields(raw.replace(RUN_LINE_RE, ''));
    if (fields.cmd === undefined) return;
    entries.push({ ...fields, line: i + 1 });
  });
  return entries;
}

/** 逐条认领：返回未能匹配到审计条目的声明。 */
export function auditMismatches(claims, entries, ticket = '') {
  const pool = entries.map((e) => ({ ...e, used: false }));
  const missing = [];
  for (const claim of claims) {
    const wantTicket = claim.ticket || ticket || '';
    const hit = pool.find((e) => !e.used
      && (wantTicket ? e.ticket === wantTicket : true)
      && cmdMatches(claim.cmd, e.cmd));
    if (hit) hit.used = true;
    else missing.push({ ...claim, ticket: wantTicket || undefined });
  }
  return missing;
}

function parseArgs(argv) {
  const opts = { evidence: '', log: '', ticket: '', requireClaims: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { opts.help = true; return opts; }
    if (arg === '--require-claims') { opts.requireClaims = true; continue; }
    if (arg === '--json') { opts.json = true; continue; }
    if (['--evidence', '--log', '--ticket'].includes(arg)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} 缺少取值`);
      if (arg === '--evidence') opts.evidence = value;
      else if (arg === '--log') opts.log = value;
      else opts.ticket = value;
      continue;
    }
    throw new Error(`未知参数：${arg}`);
  }
  return opts;
}

function usage() {
  const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const block = text.match(/\/\*\*([\s\S]*?)\*\//);
  return block ? block[1].replace(/^\s*\*?/gm, '').trim() : 'check-gate-audit.mjs';
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage()); return 0; }
  if (!opts.evidence) {
    console.error('FAIL: 缺少 --evidence <证据文件>。用法见 --help');
    return 2;
  }
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const evidencePath = path.resolve(repoRoot, opts.evidence);
  let logPath;
  if (opts.log) logPath = path.resolve(repoRoot, opts.log);
  else if (process.env.ILIFE_GATE_LOCK_DIR) logPath = path.resolve(repoRoot, process.env.ILIFE_GATE_LOCK_DIR, 'gate-runs.log');
  else logPath = path.resolve(repoRoot, '.scratch/locks/gate-runs.log');

  if (!fs.existsSync(evidencePath)) { console.error(`FAIL: 证据文件不存在：${evidencePath}`); return 2; }
  const evidenceText = fs.readFileSync(evidencePath, 'utf8');
  const claims = parseClaims(evidenceText);
  const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  const entries = parseAuditLog(logText);
  const missing = auditMismatches(claims, entries, opts.ticket);

  if (opts.json) {
    console.log(JSON.stringify({ evidence: evidencePath, log: logPath, ticket: opts.ticket || null, claims: claims.length, auditEntries: entries.length, missing }, null, 2));
  } else {
    console.log(`证据：${evidencePath}`);
    console.log(`审计：${logPath}（RUN 条目 ${entries.length} 条）`);
    console.log(`声称运行 ${claims.length} 条${opts.ticket ? `（票号过滤 ticket=${opts.ticket}）` : ''}`);
    for (const c of claims) console.log(`  - 证据 :${c.line} cmd=${c.cmd}${c.ticket ? ` ticket=${c.ticket}` : ''}`);
    if (missing.length === 0) {
      console.log(`OK: 声称的 ${claims.length} 条运行全部在审计日志中命中`);
    } else {
      console.error(`FAIL: ${missing.length}/${claims.length} 条声称运行在审计日志中找不到对应条目：`);
      for (const m of missing) console.error(`  缺失 证据 :${m.line} cmd=${m.cmd}${m.ticket ? ` ticket=${m.ticket}` : ''}`);
    }
  }

  if (claims.length === 0 && opts.requireClaims) {
    console.error('FAIL: 证据里没有任何 `GATE-RUN cmd=…` 声明（--require-claims）');
    return 1;
  }
  const pass = missing.length === 0;
  if (!opts.json) console.log(`RESULT: matched=${claims.length - missing.length}/${claims.length} auditEntries=${entries.length}`);
  console.log(`gate-audit: ${pass ? 'PASS' : 'FAIL'}`);
  return pass ? 0 : 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    process.exit(main());
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  }
}
