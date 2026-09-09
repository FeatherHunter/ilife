#!/usr/bin/env node
/**
 * tooling/check-gate-audit.mjs —— 机械门禁对账（协议 §2.4）：证据里**声称**的每次
 * build／test 运行，必须在审计日志 `<lock-dir>/gate-runs.log` 里找到**一对一**对应条目；
 * 缺失／反向未声明／未绑定 runId／非 0 退出码 → 默认 exit ≠ 0。
 *
 * 用法：
 *   node tooling/check-gate-audit.mjs --evidence docs/research/t88-impl-governance-fix.md --ticket 88
 *   node tooling/check-gate-audit.mjs --evidence <文件> --log .scratch/locks/gate-runs.log --ticket 88 --since 2026-09-09T13:00:00Z
 *   node tooling/check-gate-audit.mjs --evidence <文件> --export docs/research/t88-gate-runs.log   # 导出受跟踪的对账源
 *
 * 声明写法（证据文件里，一行一条，`-`／`*`／表格 `|` 前缀可带）：
 *   GATE-RUN runId=<本次运行的 runId> cmd=<命令>        ← 默认口径（runId 必填）
 *   GATE-RUN ticket=88 cmd="pnpm test"                  ← 历史口径（须 --allow-no-runid 且写 GATE-RELAX）
 *
 * 默认（严格）口径 —— 每条都可用对应开关放宽，**但放宽必须写进证据**（见下）：
 *   ① `--require-claims`（默认开）：证据里没有任何 `GATE-RUN` 声明即 FAIL（`--allow-no-claims` 放宽）。
 *   ② **反向对账**：对账窗口内存在**无人声明**的 `RUN` 条目 → FAIL（`--allow-undeclared` 放宽）。
 *   ③ **runId 一对一绑定**：声明必须引 `runId`，只认 runId 相同的条目；禁止「同 cmd 历史条目顶替」
 *      （`--allow-no-runid` 放宽后，无 runId 的声明只认**无 runId 的历史条目**）。
 *   ④ **看 `exit`**：默认只认领 `exit=0` 的条目（`--allow-nonzero` 放宽）。
 *   ⑤ `--export <路径>`：把本次对账窗口内的 `RUN` 条目导出到**受 git 跟踪**的文件，
 *      使对账源不再只存在于 gitignored 的 `.scratch/locks/gate-runs.log`。
 *
 * 放宽留痕：使用任一 `--allow-*` 开关时，证据文件里**必须**有一条
 *   `GATE-RELAX flag=--allow-undeclared reason=<为什么>`
 * 否则本工具 exit ≠ 0（私自放宽＝协议 §6 的 S1-交付缺陷）。
 *
 * 匹配口径（`cmdMatches`）：
 *   ① 归一化后逐字相等；② 一侧是另一侧的前缀（按 token 边界，例如 `pnpm test` ⊂ `pnpm test test/x.test.mjs`）；
 *   ③ `node --test` 的命令按**文件名集合**比对（证据常写 basename，日志记完整相对路径）。
 *   同一条审计条目只认领一次（声称跑两次就得有两条），避免「一条记录顶多次声称」。
 *
 * 边界（协议 §2.4-4）：本工具只能**对账已声明运行**；裸跑本身不可机械检测（`node --test` 尤其），
 * 对账**查漏不防伪**（日志与工具同在可写工作区）。造假按 S1-交付缺陷处置。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLAIM_RE = /^\s*(?:[-*+]\s+|\|\s*)?GATE-RUN\s+(.*)$/;
const RELAX_RE = /^\s*(?:[-*+]\s+|\|\s*)?GATE-RELAX\s+(.*)$/;
const FIELD_RE = /([A-Za-z_][\w-]*)=("(?:[^"\\]|\\.)*"|\S*)/g;
const RUN_LINE_RE = /^\s*RUN\s+/;

/** 放宽开关 → 证据里必须出现的 `GATE-RELAX` 标记名。 */
export const RELAXATION_FLAGS = {
  allowNoClaims: '--allow-no-claims',
  allowUndeclared: '--allow-undeclared',
  allowNonzero: '--allow-nonzero',
  allowNoRunId: '--allow-no-runid',
};

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

/**
 * 解析一条 `GATE-RUN` 声明体：`cmd=` 之后到行尾整段都是命令（可含空格），另可带 `ticket=`／`runId=`。
 */
export function parseClaimBody(body) {
  let rest = String(body ?? '').trim();
  let ticket;
  let runId;
  const tm = /(?:^|\s)ticket=("(?:[^"\\]|\\.)*"|\S+)(?=\s|$)/.exec(rest);
  if (tm) {
    ticket = unquote(tm[1]);
    rest = `${rest.slice(0, tm.index)} ${rest.slice(tm.index + tm[0].length)}`.trim();
  }
  const rm = /(?:^|\s)runId=("(?:[^"\\]|\\.)*"|\S+)(?=\s|$)/.exec(rest);
  if (rm) {
    runId = unquote(rm[1]);
    rest = `${rest.slice(0, rm.index)} ${rest.slice(rm.index + rm[0].length)}`.trim();
  }
  const cm = /(?:^|\s)cmd=([\s\S]+)$/.exec(rest);
  if (!cm) return null;
  const cmd = unquote(cm[1]);
  return cmd ? { cmd, ticket, runId } : null;
}

/** 从证据文本抽取 `GATE-RUN` 声明。 */
export function parseClaims(text) {
  const claims = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const m = CLAIM_RE.exec(raw);
    if (!m) return;
    const claim = parseClaimBody(m[1]);
    if (!claim) return;
    claims.push({ line: i + 1, cmd: claim.cmd, ticket: claim.ticket, runId: claim.runId });
  });
  return claims;
}

/** 从证据文本抽取 `GATE-RELAX` 放宽留痕（返回其中出现的开关名集合）。 */
export function parseRelaxations(text) {
  const flags = new Set();
  text.split(/\r?\n/).forEach((raw) => {
    const m = RELAX_RE.exec(raw);
    if (!m) return;
    const fields = parseFields(m[1]);
    const body = m[1];
    for (const flag of Object.values(RELAXATION_FLAGS)) {
      if (fields.flag === flag || body.includes(flag)) flags.add(flag);
    }
  });
  return flags;
}

/** 从审计日志抽取 `RUN` 条目（忽略 START／LOCK-STOLEN 等其它前缀）。 */
export function parseAuditLog(text) {
  const entries = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!RUN_LINE_RE.test(raw)) return;
    const fields = parseFields(raw.replace(RUN_LINE_RE, ''));
    if (fields.cmd === undefined) return;
    entries.push({ ...fields, line: i + 1, raw });
  });
  return entries;
}

/** 窗口过滤：票号（可选）＋ 起始时间（可选，`at` 缺失的条目视为始终在窗口内）。 */
export function inWindow(entry, { ticket = '', sinceMs = null } = {}) {
  if (ticket && entry.ticket !== ticket) return false;
  if (sinceMs !== null && entry.at) {
    const at = Date.parse(entry.at);
    if (Number.isFinite(at) && at < sinceMs) return false;
  }
  return true;
}

/** 单条声明能否认领某条审计条目（严格口径：runId 绑定 ＋ exit=0）。 */
export function claimMatchesEntry(claim, entry, { ticket = '', allowNoRunId = false, allowNonzero = false } = {}) {
  const wantTicket = claim.ticket || ticket || '';
  if (wantTicket && entry.ticket !== wantTicket) return false;
  if (!allowNonzero && entry.exit !== '0') return false;
  if (claim.runId) return entry.runId === claim.runId && cmdMatches(claim.cmd, entry.cmd);
  // 无 runId 的声明：严格口径直接判不成立（由 reconcile 给出原因）；放宽后只认无 runId 的历史条目。
  if (!allowNoRunId) return false;
  return entry.runId === undefined && cmdMatches(claim.cmd, entry.cmd);
}

/**
 * 逐条对账：返回 `{ missing, undeclared, matched, duplicateRunIds }`。
 * - `missing`：未被任何条目认领的声明（附 `reason`）；
 * - `undeclared`：**反向对账窗口**内无人声明的条目（窗口＝`--ticket` 过滤 ＋ `--since`）；
 * - `duplicateRunIds`：窗口内重复出现的 runId（日志可疑）。
 *
 * 说明：**声明侧**不按 `--ticket` 预筛——带显式 `ticket=` 的声明可跨票号认领（例如
 * `pnpm gate:selftest` 记 `ticket=selftest`），票号仍由 `claimMatchesEntry` 逐条强制。
 */
export function reconcile(claims, entries, opts = {}) {
  const { ticket = '', sinceMs = null, allowNoRunId = false, allowNonzero = false } = opts;
  const pool = entries.filter((e) => inWindow(e, { sinceMs })).map((e) => ({ ...e, used: false }));
  const missing = [];
  for (const claim of claims) {
    const wantTicket = claim.ticket || ticket || '';
    if (!claim.runId && !allowNoRunId) {
      missing.push({ ...claim, ticket: wantTicket || undefined, reason: 'no-runId（声明必须引 runId；--allow-no-runid 可放宽）' });
      continue;
    }
    const hit = pool.find((e) => !e.used
      && claimMatchesEntry(claim, e, { ticket, allowNoRunId, allowNonzero }));
    if (hit) hit.used = true;
    else missing.push({ ...claim, ticket: wantTicket || undefined, reason: claim.runId ? `runId=${claim.runId} 未命中（或 exit≠0）` : '未命中' });
  }
  const undeclared = pool.filter((e) => !e.used && inWindow(e, { ticket }));
  const seen = new Map();
  const duplicateRunIds = [];
  for (const e of pool.filter((x) => inWindow(x, { ticket }))) {
    if (!e.runId) continue;
    if (seen.has(e.runId)) duplicateRunIds.push({ runId: e.runId, lines: [seen.get(e.runId), e.line] });
    else seen.set(e.runId, e.line);
  }
  return { missing, undeclared, matched: claims.length - missing.length, duplicateRunIds };
}

/** 兼容旧签名的薄封装（只做「声明 → 条目」方向）。 */
export function auditMismatches(claims, entries, ticket = '') {
  return reconcile(claims, entries, { ticket }).missing;
}

function parseArgs(argv) {
  const opts = {
    evidence: '',
    log: '',
    ticket: '',
    since: '',
    export: '',
    requireClaims: true,
    allowNoClaims: false,
    allowUndeclared: false,
    allowNonzero: false,
    allowNoRunId: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { opts.help = true; return opts; }
    if (arg === '--require-claims') { opts.requireClaims = true; continue; }
    if (arg === '--allow-no-claims') { opts.allowNoClaims = true; continue; }
    if (arg === '--allow-undeclared') { opts.allowUndeclared = true; continue; }
    if (arg === '--allow-nonzero') { opts.allowNonzero = true; continue; }
    if (arg === '--allow-no-runid') { opts.allowNoRunId = true; continue; }
    if (arg === '--json') { opts.json = true; continue; }
    if (['--evidence', '--log', '--ticket', '--since', '--export'].includes(arg)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} 缺少取值`);
      if (arg === '--evidence') opts.evidence = value;
      else if (arg === '--log') opts.log = value;
      else if (arg === '--ticket') opts.ticket = value;
      else if (arg === '--since') opts.since = value;
      else opts.export = value;
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

function parseSince(raw) {
  if (!raw) return null;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && String(asNumber) === raw.trim()) return asNumber;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) throw new Error(`--since 无法解析：${raw}`);
  return parsed;
}

function exportRuns(exportPath, { entries, logPath, ticket, since }) {
  const lines = entries.map((e) => e.raw.replace(/\r?\n$/, ''));
  const content = [
    '# gate-runs 导出（受 git 跟踪的对账源，协议 §2.4）',
    '',
    `> 来源日志：\`${logPath}\`（gitignored，不可单独作为第三方复核依据）`,
    `> 票号过滤：${ticket || '（无）'}｜since：${since || '（无）'}｜条目数：${lines.length}｜导出时间：${new Date().toISOString()}`,
    '> 复核用法：`node tooling/check-gate-audit.mjs --evidence <证据文件> --log <本文件> --ticket <票号> --since <同上>`',
    '',
    '```text',
    ...lines,
    '```',
    '',
  ].join('\n');
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  fs.writeFileSync(exportPath, content, 'utf8');
  return lines.length;
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
  const sinceMs = parseSince(opts.since);
  const evidenceText = fs.readFileSync(evidencePath, 'utf8');
  const claims = parseClaims(evidenceText);
  const relaxations = parseRelaxations(evidenceText);
  const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  const entries = parseAuditLog(logText);
  const result = reconcile(claims, entries, {
    ticket: opts.ticket,
    sinceMs,
    allowNoRunId: opts.allowNoRunId,
    allowNonzero: opts.allowNonzero,
  });
  const scoped = entries.filter((e) => inWindow(e, { ticket: opts.ticket, sinceMs }));

  const usedRelaxations = [];
  if (opts.allowNoClaims) usedRelaxations.push(RELAXATION_FLAGS.allowNoClaims);
  if (opts.allowUndeclared) usedRelaxations.push(RELAXATION_FLAGS.allowUndeclared);
  if (opts.allowNonzero) usedRelaxations.push(RELAXATION_FLAGS.allowNonzero);
  if (opts.allowNoRunId) usedRelaxations.push(RELAXATION_FLAGS.allowNoRunId);
  const unrecordedRelaxations = usedRelaxations.filter((f) => !relaxations.has(f));

  const problems = [];
  if (result.duplicateRunIds.length > 0) {
    problems.push(`${result.duplicateRunIds.length} 个 runId 在窗口内重复出现（日志可疑）：`
      + result.duplicateRunIds.map((d) => `${d.runId}(:${d.lines.join(',')})`).join('、'));
  }
  if (result.missing.length > 0) problems.push(`${result.missing.length}/${claims.length} 条声明在审计日志中找不到对应条目`);
  if (opts.requireClaims && !opts.allowNoClaims && claims.length === 0) problems.push('证据里没有任何 `GATE-RUN runId=… cmd=…` 声明');
  if (!opts.allowUndeclared && result.undeclared.length > 0) problems.push(`反向对账：窗口内有 ${result.undeclared.length} 条无人声明的 RUN 条目`);
  if (unrecordedRelaxations.length > 0) problems.push(`放宽未写进证据（缺 GATE-RELAX）：${unrecordedRelaxations.join('、')}`);

  if (opts.json) {
    console.log(JSON.stringify({
      evidence: evidencePath,
      log: logPath,
      ticket: opts.ticket || null,
      since: opts.since || null,
      claims: claims.length,
      auditEntries: entries.length,
      scopedEntries: scoped.length,
      matched: result.matched,
      missing: result.missing,
      undeclared: result.undeclared.map((e) => ({ line: e.line, runId: e.runId, cmd: e.cmd, at: e.at })),
      duplicateRunIds: result.duplicateRunIds,
      relaxations: usedRelaxations,
      unrecordedRelaxations,
      problems,
      pass: problems.length === 0,
    }, null, 2));
  } else {
    console.log(`证据：${evidencePath}`);
    console.log(`审计：${logPath}（RUN 条目 ${entries.length} 条；窗口内 ${scoped.length} 条${opts.ticket ? `，ticket=${opts.ticket}` : ''}${opts.since ? `，since=${opts.since}` : ''}）`);
    console.log(`声称运行 ${claims.length} 条${opts.allowNoRunId ? '（--allow-no-runid）' : ''}`);
    for (const c of claims) console.log(`  - 证据 :${c.line} runId=${c.runId || '（无）'} cmd=${c.cmd}${c.ticket ? ` ticket=${c.ticket}` : ''}`);
    if (result.undeclared.length > 0) {
      console.log(`反向对账：窗口内无人声明的 RUN 条目 ${result.undeclared.length} 条`);
      for (const e of result.undeclared) console.log(`  - 日志 :${e.line} runId=${e.runId || '（无）'} exit=${e.exit} at=${e.at || ''} cmd=${e.cmd}`);
    }
    for (const p of problems) console.error(`FAIL: ${p}`);
    if (result.missing.length > 0) {
      for (const m of result.missing) console.error(`  缺失 证据 :${m.line} runId=${m.runId || '（无）'} cmd=${m.cmd}${m.ticket ? ` ticket=${m.ticket}` : ''} — ${m.reason}`);
    }
  }

  if (opts.export) {
    const exportPath = path.resolve(repoRoot, opts.export);
    const count = exportRuns(exportPath, { entries: scoped, logPath, ticket: opts.ticket, since: opts.since });
    if (!opts.json) console.log(`EXPORT: ${exportPath}（窗口内 RUN 条目 ${count} 条，受 git 跟踪）`);
  }

  const pass = problems.length === 0;
  if (!opts.json) {
    console.log(`RESULT: matched=${result.matched}/${claims.length} auditEntries=${entries.length}`
      + ` scoped=${scoped.length} undeclared=${result.undeclared.length}`);
  }
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
