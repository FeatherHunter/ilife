#!/usr/bin/env node
/**
 * #1308 · 票级范围清单（tooling/i18n-ticket-scope.json）的判据脚本。
 *
 * 它守什么：迁移票的「文件清单」是开工前置——清单错了，迁移票会漏件、重件或改到别票的件，
 * 收工时又拿「两道门绿了」当完成（门只判已挂号的范围）。所以清单本身要机械可判：
 *   ① 每件在盘上存在、在 ledger 里有登记、条数与 ledger 一致；
 *   ② 每件在全仓只归一处：**待迁（files）／已迁（migrated）／不迁（excluded）** 三者互斥且与票间零重叠；
 *   ③ 已迁件并集 = tooling/i18n-scope.json 的已登记件（迁走的件不许留在待办，也不许证明不了迁过）；
 *   ④ 待迁＋不迁件并集 = ledger 全量 − scope 已迁件（既不漏也不多）；
 *   ⑤ 每票 totals 与三处合计（按 ledger 复算）一致；全局 scopeSummary 与复算一致；
 *   ⑥ 不迁件必须写明理由（excluded[].reason 非空）——「不迁」是处置结论，不是静默漏件。
 *
 * 本脚本是**咨询清单的判据**，不是门：不进门禁链、不判迁移做没做完（那归两道门）。
 * 用法：
 *   node tooling/check-i18n-ticket-scope.mjs            # 逐票清单 + 全局读数
 *   node tooling/check-i18n-ticket-scope.mjs --selftest # 变异自证（漏件／重叠／条数不符／不迁无理由必红）
 * 末行固定：RESULT: tickets=<n> files=<n> literals=<n> excluded=<n> problems=<n>
 * 依赖：零第三方；只读，不写任何文件。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CLASS_KEYS = ['copy', 'concat', 'payload', 'ident', 'data', 'cmdkey', 'derived'];
const PLACES = ['files', 'migrated', 'excluded'];

/** 读取三份事实：票级清单、ledger（件级条数与分类）、scope（已迁件）。 */
export function load(root = ROOT) {
  const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
  return {
    scopeJson: read('tooling/i18n-ticket-scope.json'),
    ledger: read('tooling/i18n-codemod.ledger.json'),
    scope: read('tooling/i18n-scope.json'),
  };
}

function listOf(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * 主判据：返回全局读数与 problems。
 * @returns {{tickets:Array<{n:number,files:number,literals:number,migrated:number,excluded:number}>,
 *   pendingFiles:number,pendingLiterals:number,excludedFiles:number,excludedLiterals:number,
 *   ledgerFiles:number,migratedFiles:number,problems:string[]}}
 */
export function audit({ scopeJson, ledger, scope }, root = ROOT) {
  const problems = [];
  const ledgerByPath = new Map((ledger.files || []).map((f) => [f.path, f]));
  const scopeFiles = new Set(scope.files || []);
  /** path → {ticket, place}：全仓每件只许归一处。 */
  const placed = new Map();
  for (const p of scopeFiles) {
    if (!ledgerByPath.has(p)) problems.push('scope 里的件不在 ledger 里：' + p);
  }

  const place = (path, n, where) => {
    const previous = placed.get(path);
    if (previous !== undefined) {
      problems.push(previous.ticket === n
        ? '#' + n + ' 的同一件重复登记（' + previous.where + '／' + where + '）：' + path
        : '票间重复分配：' + path + '（#' + previous.ticket + ' 的 ' + previous.where + ' 与 #' + n + ' 的 ' + where + '）');
      return false;
    }
    placed.set(path, { ticket: n, where });
    return true;
  };

  const tickets = [];
  let pendingFiles = 0;
  let pendingLiterals = 0;
  let excludedFiles = 0;
  let excludedLiterals = 0;
  for (const [key, t] of Object.entries(scopeJson.tickets || {})) {
    const n = Number(key);
    /** 三处合计（复算 totals 用）＋分类合计。 */
    let literals = 0;
    const byClass = Object.fromEntries(CLASS_KEYS.map((c) => [c, 0]));
    const counts = { files: 0, migrated: 0, excluded: 0 };
    for (const where of PLACES) {
      const rows = listOf(t[where]);
      for (const f of rows) {
        const path = f?.path;
        if (typeof path !== 'string' || path === '') {
          problems.push('#' + key + ' 的 ' + where + ' 有一条缺 path');
          continue;
        }
        const row = ledgerByPath.get(path);
        if (row === undefined) {
          problems.push('#' + key + ' 的 ' + where + ' 件不在 ledger：' + path);
          continue;
        }
        if (!existsSync(resolve(root, path))) problems.push('#' + key + ' 的 ' + where + ' 件在盘上不存在：' + path);
        if (f.literals !== undefined && f.literals !== row.literals) {
          problems.push('#' + key + ' 的 ' + where + ' 件条数与 ledger 不符：' + path + '（清单 ' + f.literals + '／ledger ' + row.literals + '）');
        }
        if (!place(path, n, where)) continue;
        if (where === 'files') {
          if (scopeFiles.has(path)) problems.push('#' + key + ' 的待迁件已在 scope 里（已迁件不许留在待办）：' + path);
          pendingFiles++;
          pendingLiterals += row.literals;
        } else if (where === 'migrated') {
          if (!scopeFiles.has(path)) problems.push('#' + key + ' 把未迁件记成已迁：' + path);
        } else {
          if (scopeFiles.has(path)) problems.push('#' + key + ' 的已迁件不许再记成不迁：' + path);
          if (typeof f.reason !== 'string' || f.reason.trim() === '') problems.push('#' + key + ' 的不迁件没写理由：' + path);
          excludedFiles++;
          excludedLiterals += row.literals;
        }
        counts[where]++;
        literals += row.literals;
        for (const c of CLASS_KEYS) byClass[c] += row.byClass?.[c] ?? 0;
      }
    }
    // 迁移票开工后 files 可能清空（全部迁完／不迁），但票面三处合计必须与原清单 totals 对得上。
    const totals = t.totals || {};
    if (totals.files !== counts.files + counts.migrated + counts.excluded) {
      problems.push('#' + key + ' 的 totals.files=' + totals.files + ' ≠ files＋migrated＋excluded 合计 ' + (counts.files + counts.migrated + counts.excluded));
    }
    if (totals.literals !== undefined && totals.literals !== literals) {
      problems.push('#' + key + ' 的 totals.literals=' + totals.literals + ' ≠ 三处合计 ' + literals);
    }
    for (const c of CLASS_KEYS) {
      const claimed = totals[c];
      if (claimed === undefined) continue;
      if (claimed !== byClass[c]) problems.push('#' + key + ' 的 totals.' + c + '=' + claimed + ' ≠ 三处合计 ' + byClass[c]);
    }
    tickets.push({ n, files: counts.files, literals: pendingLiteralsFor(t), migrated: counts.migrated, excluded: counts.excluded });
  }
  for (const p of scopeFiles) {
    const entry = placed.get(p);
    if (entry === undefined) problems.push('scope 已迁件没在任何票的 migrated 里登记：' + p);
    else if (entry.where !== 'migrated') problems.push('scope 已迁件在票面被登记成 ' + entry.where + '：' + p);
  }

  const expectedPending = new Set([...ledgerByPath.keys()].filter((p) => !scopeFiles.has(p)));
  for (const p of expectedPending) {
    if (!placed.has(p)) problems.push('ledger 里有件没归到任何票的三处之一：' + p);
  }
  for (const p of placed.keys()) {
    if (!ledgerByPath.has(p)) problems.push('票里分了 ledger 之外的件：' + p);
  }

  const summary = scopeJson.scopeSummary || {};
  if (summary.ledgerFiles !== ledgerByPath.size) problems.push('scopeSummary.ledgerFiles=' + summary.ledgerFiles + ' ≠ ledger ' + ledgerByPath.size);
  if (summary.migratedFiles !== scopeFiles.size) problems.push('scopeSummary.migratedFiles=' + summary.migratedFiles + ' ≠ scope ' + scopeFiles.size);
  if (summary.pendingFiles !== pendingFiles) problems.push('scopeSummary.pendingFiles=' + summary.pendingFiles + ' ≠ 实得 ' + pendingFiles);
  if (summary.pendingLiterals !== pendingLiterals) problems.push('scopeSummary.pendingLiterals=' + summary.pendingLiterals + ' ≠ 实得 ' + pendingLiterals);
  if (summary.excludedFiles !== undefined && summary.excludedFiles !== excludedFiles) problems.push('scopeSummary.excludedFiles=' + summary.excludedFiles + ' ≠ 实得 ' + excludedFiles);
  if (summary.excludedLiterals !== undefined && summary.excludedLiterals !== excludedLiterals) problems.push('scopeSummary.excludedLiterals=' + summary.excludedLiterals + ' ≠ 实得 ' + excludedLiterals);
  return { tickets, pendingFiles, pendingLiterals, excludedFiles, excludedLiterals, ledgerFiles: ledgerByPath.size, migratedFiles: scopeFiles.size, problems };
}

/** 票面待迁条数：只统计 files 里 ledger 有的件（逐票打印用；不属于判据）。 */
function pendingLiteralsFor(t) {
  let n = 0;
  for (const f of listOf(t.files)) n += f.literals ?? 0;
  return n;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) return selftest();
  const data = load(ROOT);
  const r = audit(data, ROOT);
  console.log('# #1308 票级范围清单判据（咨询清单；不判迁移进度）');
  for (const t of r.tickets.sort((a, b) => a.n - b.n)) {
    console.log('#' + t.n + ' files=' + t.files + ' literals=' + t.literals + ' migrated=' + t.migrated + ' excluded=' + t.excluded);
  }
  for (const p of r.problems) console.error('RED ' + p);
  console.log('RESULT: tickets=' + r.tickets.length + ' files=' + r.pendingFiles + ' literals=' + r.pendingLiterals
    + ' excluded=' + r.excludedFiles + ' problems=' + r.problems.length);
  if (r.problems.length > 0) { console.error('FAIL: 票级清单与 ledger／scope 对不上（' + r.problems.length + ' 处）'); process.exit(1); }
  console.log('PASS: ' + r.tickets.length + ' 张票待迁 ' + r.pendingFiles + ' 件／' + r.pendingLiterals + ' 条、不迁 ' + r.excludedFiles
    + ' 件，加已迁 ' + r.migratedFiles + ' 件 = ledger ' + r.ledgerFiles + ' 件；票间零重叠、盘上都在');
}

/** 自证：五处变异必红、还原必绿（清单是开工前置，判据本身也要能被判真假）。 */
function selftest() {
  const bad = [];
  const want = (cond, msg) => { if (!cond) bad.push(msg); };
  const data = load(ROOT);
  const clean = audit(data, ROOT);
  want(clean.problems.length === 0, '真清单必须零问题（实得 ' + clean.problems.length + '：' + clean.problems.slice(0, 3).join('；') + '）');

  // 找一个仍有待迁件的票做变异基（#1205／#1232 迁移完就不再是基）。
  const base = Object.entries(data.scopeJson.tickets).find(([, t]) => listOf(t.files).length > 0);
  want(base !== undefined, '自证需要至少一张仍有待迁件的票');
  if (base === undefined) {
    for (const b of bad) console.error('SELFTEST FAIL ' + b);
    process.exit(1);
  }
  const [baseKey] = base;

  // ① 漏件：从一张票的待迁里拿掉一件（totals 同步减）→ 必报「没归到任何票的三处之一」
  const dropped = JSON.parse(JSON.stringify(data));
  const victim = dropped.scopeJson.tickets[baseKey].files.shift();
  dropped.scopeJson.tickets[baseKey].totals.files -= 1;
  dropped.scopeJson.tickets[baseKey].totals.literals -= victim.literals;
  const r1 = audit(dropped, ROOT);
  want(r1.problems.some((p) => p.includes('没归到任何票的三处之一')), '漏件必须报「没归到任何票的三处之一」');
  want(r1.pendingFiles === clean.pendingFiles - 1, '漏件后全局待迁件数必须少 1（实得 ' + r1.pendingFiles + '）');

  // ② 重叠：把另一张票的一件改成基票已有的件 → 必报重复分配
  const otherKey = Object.keys(data.scopeJson.tickets).find((k) => k !== baseKey
    && listOf(data.scopeJson.tickets[k].files).length > 0);
  want(otherKey !== undefined, '自证需要第二张仍有待迁件的票');
  const dup = JSON.parse(JSON.stringify(data));
  const first = dup.scopeJson.tickets[baseKey].files[0];
  dup.scopeJson.tickets[otherKey].files[0] = { ...first };
  const r2 = audit(dup, ROOT);
  want(r2.problems.some((p) => p.includes('重复分配')), '票间重复分配必须报');

  // ③ 条数不符：改高一件的 literals → 必报与 ledger 不符
  const lie = JSON.parse(JSON.stringify(data));
  const firstRow = lie.scopeJson.tickets[baseKey].files[0];
  lie.scopeJson.tickets[baseKey].files.push({ ...firstRow, path: 'packages/base-render/src/blocks.ts', literals: (firstRow.literals ?? 0) + 1 });
  const r3 = audit(lie, ROOT);
  want(r3.problems.some((p) => p.includes('条数与 ledger 不符')), '条数被改必须报与 ledger 不符');

  // ④ 不迁件缺理由：把基票一件挪到 excluded 但不写 reason → 必报「没写理由」
  const mute = JSON.parse(JSON.stringify(data));
  const moved = mute.scopeJson.tickets[baseKey].files.shift();
  mute.scopeJson.tickets[baseKey].excluded = listOf(mute.scopeJson.tickets[baseKey].excluded);
  mute.scopeJson.tickets[baseKey].excluded.push({ ...moved });
  const r4 = audit(mute, ROOT);
  want(r4.problems.some((p) => p.includes('没写理由')), '不迁件缺理由必须报');

  // ⑤ 已迁件不在 scope：把基票一件记成 migrated 但它没登记 scope → 必报「把未迁件记成已迁」
  const fake = JSON.parse(JSON.stringify(data));
  const notMigrated = fake.scopeJson.tickets[baseKey].files.shift();
  fake.scopeJson.tickets[baseKey].migrated = listOf(fake.scopeJson.tickets[baseKey].migrated);
  fake.scopeJson.tickets[baseKey].migrated.push({ ...notMigrated });
  const r5 = audit(fake, ROOT);
  want(r5.problems.some((p) => p.includes('把未迁件记成已迁')), '未迁件记成已迁必须报');

  if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
  console.log('SELFTEST: 真清单零问题／漏件必红／票间重叠必红／条数不符必红／不迁无理由必红／未迁记成已迁必红 六条自证 OK');
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
