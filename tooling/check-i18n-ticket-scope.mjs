#!/usr/bin/env node
/**
 * #1308 · 票级范围清单（tooling/i18n-ticket-scope.json）的判据脚本。
 *
 * 它守什么：28 张迁移票的「文件清单」是开工前置——清单错了，迁移票会漏件、重件或改到别票的件，
 * 收工时又拿「两道门绿了」当完成（门只判已挂号的范围）。所以清单本身要机械可判：
 *   ① 每票都有 files，且每件在盘上存在、在 ledger 里有登记、条数与 ledger 一致；
 *   ② 票间零重叠、与 tooling/i18n-scope.json 已迁件零重叠；
 *   ③ 28 票待迁件并集 = ledger 全量 − scope 已迁件（既不漏也不多）；
 *   ④ 每票 totals 与按 ledger 复算一致，全局 scopeSummary 与复算一致；
 *   ⑤ 票面登记的 migrated 件恰好等于 scope 已迁件（已经迁走的件不许留在待办里）。
 *
 * 本脚本是**咨询清单的判据**，不是门：不进门禁链、不判迁移做没做完（那归两道门）。
 * 用法：
 *   node tooling/check-i18n-ticket-scope.mjs            # 逐票清单 + 全局读数
 *   node tooling/check-i18n-ticket-scope.mjs --selftest # 变异自证（漏件／重叠／条数不符必红）
 * 末行固定：RESULT: tickets=<n> files=<n> literals=<n> problems=<n>
 * 依赖：零第三方；只读，不写任何文件。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** 读取三份事实：票级清单、ledger（件级条数与分类）、scope（已迁件）。 */
export function load(root = ROOT) {
  const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
  return {
    scopeJson: read('tooling/i18n-ticket-scope.json'),
    ledger: read('tooling/i18n-codemod.ledger.json'),
    scope: read('tooling/i18n-scope.json'),
  };
}

/** 主判据：返回 {tickets:[{n,files,literals}], pendingFiles, pendingLiterals, problems:[string]}。 */
export function audit({ scopeJson, ledger, scope }, root = ROOT) {
  const problems = [];
  const ledgerByPath = new Map((ledger.files || []).map((f) => [f.path, f]));
  const scopeFiles = new Set(scope.files || []);
  const classKeys = ['copy', 'concat', 'payload', 'ident', 'data', 'cmdkey', 'derived'];
  const wanted = new Set(ledgerByPath.keys());
  for (const p of scopeFiles) if (!wanted.has(p)) problems.push('scope 里的件不在 ledger 里：' + p);

  const tickets = [];
  const seen = new Map();
  const migratedSeen = new Map();
  for (const [key, t] of Object.entries(scopeJson.tickets || {})) {
    const n = Number(key);
    const files = Array.isArray(t.files) ? t.files : [];
    if (files.length === 0) problems.push('#' + key + ' 没有文件清单（开工前置缺失）');
    let literals = 0;
    for (const f of files) {
      const path = f.path;
      if (typeof path !== 'string' || path === '') { problems.push('#' + key + ' 有一条文件缺 path'); continue; }
      const row = ledgerByPath.get(path);
      if (row === undefined) { problems.push('#' + key + ' 的件不在 ledger：' + path); continue; }
      if (seen.has(path)) problems.push('票间重复分配：' + path + '（#' + seen.get(path) + ' 与 #' + key + '）');
      seen.set(path, n);
      if (scopeFiles.has(path)) problems.push('#' + key + ' 的待迁件已在 scope 里（已迁件不许留在待办）：' + path);
      if (!existsSync(resolve(root, path))) problems.push('#' + key + ' 的件在盘上不存在：' + path);
      if (row.literals !== f.literals) problems.push('#' + key + ' 的件条数与 ledger 不符：' + path + '（清单 ' + f.literals + '／ledger ' + row.literals + '）');
      literals += row.literals;
      for (const c of classKeys) {
        const claimed = f.byClass?.[c] ?? 0;
        const actual = row.byClass?.[c] ?? 0;
        if (claimed !== actual) problems.push('#' + key + ' 的分类条数与 ledger 不符：' + path + ' 的 ' + c + '（清单 ' + claimed + '／ledger ' + actual + '）');
      }
    }
    const totals = t.totals || {};
    if (totals.files !== files.length) problems.push('#' + key + ' 的 totals.files=' + totals.files + ' ≠ 实得 ' + files.length);
    if (totals.literals !== literals) problems.push('#' + key + ' 的 totals.literals=' + totals.literals + ' ≠ 实得 ' + literals);
    for (const m of Array.isArray(t.migrated) ? t.migrated : []) {
      if (!scopeFiles.has(m.path)) problems.push('#' + key + ' 把未迁件记成已迁：' + m.path);
      if (migratedSeen.has(m.path)) problems.push('已迁件在两张票上重复登记：' + m.path);
      migratedSeen.set(m.path, n);
    }
    tickets.push({ n, files: files.length, literals, byClass: { ...Object.fromEntries(classKeys.map((c) => [c, (t.totals?.[c] ?? 0)])) } });
  }
  for (const p of scopeFiles) if (!migratedSeen.has(p)) problems.push('scope 已迁件没在票面 migrated 里登记：' + p);

  const expected = new Set([...wanted].filter((p) => !scopeFiles.has(p)));
  for (const p of expected) if (!seen.has(p)) problems.push('ledger 里有件没分给任何票：' + p);
  for (const p of seen.keys()) if (!expected.has(p)) problems.push('票里分了 ledger/scope 之外或不存在的件：' + p);

  const pendingFiles = tickets.reduce((s, t) => s + t.files, 0);
  const pendingLiterals = tickets.reduce((s, t) => s + t.literals, 0);
  const summary = scopeJson.scopeSummary || {};
  if (summary.ledgerFiles !== ledgerByPath.size) problems.push('scopeSummary.ledgerFiles=' + summary.ledgerFiles + ' ≠ ledger ' + ledgerByPath.size);
  if (summary.migratedFiles !== scopeFiles.size) problems.push('scopeSummary.migratedFiles=' + summary.migratedFiles + ' ≠ scope ' + scopeFiles.size);
  if (summary.pendingFiles !== pendingFiles) problems.push('scopeSummary.pendingFiles=' + summary.pendingFiles + ' ≠ 实得 ' + pendingFiles);
  if (summary.pendingLiterals !== pendingLiterals) problems.push('scopeSummary.pendingLiterals=' + summary.pendingLiterals + ' ≠ 实得 ' + pendingLiterals);
  return { tickets, pendingFiles, pendingLiterals, ledgerFiles: ledgerByPath.size, migratedFiles: scopeFiles.size, problems };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) return selftest();
  const data = load(ROOT);
  const r = audit(data, ROOT);
  console.log('# #1308 票级范围清单判据（咨询清单；不判迁移进度）');
  for (const t of r.tickets.sort((a, b) => a.n - b.n)) {
    console.log('#' + t.n + ' files=' + t.files + ' literals=' + t.literals);
  }
  for (const p of r.problems) console.error('RED ' + p);
  console.log('RESULT: tickets=' + r.tickets.length + ' files=' + r.pendingFiles + ' literals=' + r.pendingLiterals
    + ' problems=' + r.problems.length);
  if (r.problems.length > 0) { console.error('FAIL: 票级清单与 ledger／scope 对不上（' + r.problems.length + ' 处）'); process.exit(1); }
  console.log('PASS: ' + r.tickets.length + ' 张票的清单合计 ' + r.pendingFiles + ' 件／' + r.pendingLiterals
    + ' 条 = ledger ' + r.ledgerFiles + ' 件 − scope 已迁 ' + r.migratedFiles + ' 件；票间零重叠、盘上都在');
}

/** 自证：三处变异必红、还原必绿（清单是开工前置，判据本身也要能被判真假）。 */
function selftest() {
  const bad = [];
  const want = (cond, msg) => { if (!cond) bad.push(msg); };
  const data = load(ROOT);
  const clean = audit(data, ROOT);
  want(clean.problems.length === 0, '真清单必须零问题（实得 ' + clean.problems.length + '：' + clean.problems.slice(0, 3).join('；') + '）');

  // ① 漏件：从第一张票拿掉一件 → 必报「没分给任何票」
  const n0 = Object.keys(data.scopeJson.tickets)[0];
  const dropped = JSON.parse(JSON.stringify(data));
  const victim = dropped.scopeJson.tickets[n0].files.shift();
  dropped.scopeJson.tickets[n0].totals.files -= 1;
  dropped.scopeJson.tickets[n0].totals.literals -= victim.literals;
  const r1 = audit(dropped, ROOT);
  want(r1.problems.some((p) => p.includes('没分给任何票')), '漏件必须报「没分给任何票」');
  want(r1.pendingFiles === clean.pendingFiles - 1, '漏件后全局待迁件数必须少 1（实得 ' + r1.pendingFiles + '）');

  // ② 重叠：把第二张票的一件改成第一张票已有的件 → 必报重复分配
  const n1 = Object.keys(dropped.scopeJson.tickets)[1];
  const dup = JSON.parse(JSON.stringify(data));
  const first = dup.scopeJson.tickets[n0].files[0];
  dup.scopeJson.tickets[n1].files[0] = { ...first };
  const r2 = audit(dup, ROOT);
  want(r2.problems.some((p) => p.includes('重复分配')), '票间重复分配必须报');

  // ③ 条数不符：改高一件的 literals → 必报条数与 ledger 不符
  const lie = JSON.parse(JSON.stringify(data));
  lie.scopeJson.tickets[n0].files.push({ ...lie.scopeJson.tickets[n0].files[0], literals: lie.scopeJson.tickets[n0].files[0].literals + 1 });
  const r3 = audit(lie, ROOT);
  want(r3.problems.some((p) => p.includes('条数与 ledger 不符')), '条数被改必须报与 ledger 不符');

  if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
  console.log('SELFTEST: 真清单零问题／漏件必红／票间重叠必红／条数不符必红 四条自证 OK');
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
