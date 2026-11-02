#!/usr/bin/env node
/** #1197 · 机械迁移器：把迁移票文件清单里的**用户可见中文**搬进词条表，并把源码换成 m(...) 取词。
 *
 *  用法：
 *    node tooling/i18n-migrate.mjs --ticket 1205              # 按 tooling/i18n-ticket-scope.json 的文件清单
 *    node tooling/i18n-migrate.mjs --files a.ts,b.ts --dry --json
 *    node tooling/i18n-migrate.mjs --selftest
 *  末行固定：RESULT: files=<n> migrated=<n> skipped=<n> entries=<n> unsupported=<n>
 *    files＝清单件数；migrated＝已改写并落盘的件；skipped＝按口径整件不迁（生成件／无可迁候选）；
 *    unsupported＝形状拿不准、**一个字节都没写**的件（fail-closed，留人处理）；entries＝本次写入的词条条数。
 *
 *  安全装置：① 写前把原件备份到 .scratch/i18n-migrate-backup/；
 *           ② 清单落 .scratch/i18n-migrate/（哪件改了什么、哪些没迁、为什么）；
 *           ③ --dry 只算不写；
 *           ④ 重跑幂等：已迁移的件没有候选字面量，第二次 0 改动。
 *
 *  规格：docs/agents/多语言-渲染语言上下文.md 第 5.1 节；key 命名见同文第 3 节。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyEdits, packageOfRel, planFile, segmentOf, TOOL_VERSION } from './i18n-migrate/rewrite.mjs';
import { compileAllowlist, parseAllowlist } from './i18n-allowlist.mjs';
import { appendSection, backupFile, parseTableText, readTable, renderTable, tablePath } from './i18n-migrate/table.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const TICKET_SCOPE = join(HERE, 'i18n-ticket-scope.json');

/** 参数：--flag 取值，--bool 开关。 */
function flagOf(argv, name, fallback) {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] !== undefined && !argv[at + 1].startsWith('--') ? argv[at + 1] : fallback;
}

/** 票面文件清单（不手抄路径：唯一事实源是 tooling/i18n-ticket-scope.json）。 */
export function filesOfTicket(root, ticket) {
  const path = join(root, 'tooling', 'i18n-ticket-scope.json');
  let data;
  try { data = JSON.parse(readFileSync(path, 'utf8')); } catch (e) {
    throw new Error('读不出票面清单：' + path + ' → ' + e.message);
  }
  const entry = data.tickets === undefined ? undefined : data.tickets[String(ticket)];
  if (entry === undefined) throw new Error('清单里没有这张票：' + ticket + '（' + path + '）');
  if (!Array.isArray(entry.files)) throw new Error('票 ' + ticket + ' 没有 files 数组（' + path + '）');
  return entry.files.map((file) => String(file.path).replace(/\\/g, '/'));
}

/** 分节注释：与表里既成的 #1205 节逐字同形（仓根相对路径 ＋ 票号）。 */
function sectionComment(rel, ticket) {
  const tag = ticket === null || ticket === undefined ? '--files 迁入' : '#' + ticket + ' 迁入';
  return '/* ── ' + rel + '（' + tag + '） ── */';
}

/** 备份（唯一实现在 table.mjs，回填器共用）。 */
const backup = backupFile;

/**
 * 把同一批文件的词条追加进各包 zh.ts／en.ts（**先算文本再落盘**：有冲突就整件不写）。
 * 返回 { errors, perPlan: Map<rel, {ok, added, why?}>, tables: Map<path, {text, before}> }。
 */
function planTables(root, plans, ticket) {
  const errors = [];
  const perPlan = new Map();
  const tables = new Map();
  const byPkg = new Map();
  for (const plan of plans) {
    const pkg = packageOfRel(plan.rel);
    if (!byPkg.has(pkg)) byPkg.set(pkg, []);
    byPkg.get(pkg).push(plan);
  }
  for (const [pkg, group] of byPkg) {
    const zhPath = tablePath(root, pkg, 'zh');
    const enPath = tablePath(root, pkg, 'en');
    let zhTable = readTable(root, pkg, 'zh');
    let enTable = readTable(root, pkg, 'en');
    if (!zhTable.ok) { errors.push(zhTable.why); for (const plan of group) perPlan.set(plan.rel, { ok: false, why: zhTable.why }); continue; }
    if (!enTable.ok) { errors.push(enTable.why); for (const plan of group) perPlan.set(plan.rel, { ok: false, why: enTable.why }); continue; }
    const zhBefore = readFileSync(zhPath, 'utf8');
    const enBefore = readFileSync(enPath, 'utf8');
    for (const plan of group) {
      const comment = sectionComment(plan.rel, ticket);
      const zhEntries = plan.entries.map((entry) => ({ key: entry.key, value: entry.value }));
      const enEntries = plan.entries.map((entry) => ({ key: entry.key, value: '' }));
      const zhAppend = appendSection(zhTable, comment, zhEntries);
      const enAppend = appendSection(enTable, comment, enEntries);
      if (zhAppend.conflicts.length > 0 || enAppend.conflicts.length > 0) {
        const conflict = (zhAppend.conflicts.length > 0 ? zhAppend.conflicts : enAppend.conflicts)[0];
        const why = '词条表里已有同 key 不同值：' + conflict.key + '（表里 ' + JSON.stringify(conflict.had) + '，本次 ' + JSON.stringify(conflict.want) + '）';
        perPlan.set(plan.rel, { ok: false, why });
        continue;
      }
      const zhNext = parseTableText(zhAppend.text, zhPath);
      const enNext = parseTableText(enAppend.text, enPath);
      if (!zhNext.ok || !enNext.ok) {
        const why = (zhNext.ok ? enNext.why : zhNext.why);
        errors.push(why);
        perPlan.set(plan.rel, { ok: false, why });
        continue;
      }
      zhTable = zhNext;
      enTable = enNext;
      perPlan.set(plan.rel, { ok: true, added: zhAppend.added, duplicates: zhAppend.duplicates.length });
    }
    tables.set(zhPath, { text: renderTable(zhTable), before: zhBefore });
    tables.set(enPath, { text: renderTable(enTable), before: enBefore });
  }
  return { errors, perPlan, tables };
}

/**
 * 半迁移的件：表里已经有本件的 c001…，新 key 从**已有最大序号 ＋ 1** 往后接。
 * 不这么做的话，第二轮迁出的 c001 会撞上第一轮已经用掉的 c001（同 key 不同值＝冲突，整件转 UNSUPPORTED），
 * 而那正是本票最常态的形状：一个件手工迁了一半，剩下几条交给机器。
 */
function startIndexOf(root, files) {
  const tables = new Map();
  const starts = new Map();
  for (const rel of files) {
    const pkg = packageOfRel(rel);
    if (pkg === null) continue;
    if (!tables.has(pkg)) tables.set(pkg, readTable(root, pkg, 'zh'));
    const table = tables.get(pkg);
    if (!table.ok) continue;
    const prefix = pkg + '.' + segmentOf(rel) + '.c';
    let max = 0;
    for (const entry of table.entries) {
      if (!entry.key.startsWith(prefix)) continue;
      const tail = entry.key.slice(prefix.length);
      if (!/^[0-9]{3,}$/.test(tail)) continue;
      const n = Number(tail);
      if (n > max) max = n;
    }
    // 源码里已经写上的 m('<key>') 也要算：先引 key、表后补值是仓里的常态，
    // 只按表里的最大序号接会把这几个号抢走，等于悄悄改掉那几处调用的含义。
    let source = '';
    try { source = readFileSync(join(root, rel), 'utf8'); } catch (e) { source = ''; }
    const quoted = new RegExp(prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([0-9]{3,})', 'g');
    for (const hit of source.matchAll(quoted)) {
      const n = Number(hit[1]);
      if (n > max) max = n;
    }
    if (max > 0) starts.set(rel, max + 1);
  }
  return starts;
}

/** 数据位 allowlist：与 check-i18n-entries／check-i18n-keys 读同一份 tooling/i18n-scope.json。
 *  迁移器的「收口」读数要能到 migrated=0，就必须认同一份豁免，否则机械候选里那些数据值会永远挂在账上。
 *  #1320 起 allowlist 是「文件路径＋字面量」记录（tooling/i18n-allowlist.mjs）：本函数返回**记录数组**，
 *  真正喂给 planFile 的是按件过滤出的 Set（见 migrate() 的 allowedFor）——同一串在别的文件里照旧算候选。
 *  allowlist 缺失不算错（老夹具／临时仓根可能没有这份共享账本）。 */
export function allowlistOf(root) {
  const path = join(root, 'tooling', 'i18n-scope.json');
  if (!existsSync(path)) return [];
  let data;
  try { data = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { throw new Error('读不出 allowlist：' + path + ' → ' + e.message); }
  return parseAllowlist(Array.isArray(data.allowlist) ? data.allowlist : [], 'tooling/i18n-scope.json 的 allowlist');
}
/** 跑一批文件：算计划 → 写盘（--dry 时不写）→ 返回报告。 */
export function migrate(options) {
  const root = options.root === undefined ? ROOT : options.root;
  const ticket = options.ticket === undefined ? null : options.ticket;
  const files = options.files;
  const dry = options.dry === true;
  const starts = startIndexOf(root, files);
  // options.allowlist 可以是「文件＋串」记录数组（缺省＝读共享账本），也可以直接是 Set（夹具逃生门，对所有件生效）。
  const allowRecords = options.allowlist === undefined ? allowlistOf(root) : (Array.isArray(options.allowlist) ? parseAllowlist(options.allowlist, 'migrate 的 allowlist') : null);
  const allow = allowRecords === null ? null : compileAllowlist(allowRecords);
  const plans = files.map((rel) => planFile(root, rel, { ticket, startIndex: starts.get(rel), allowlist: allow === null ? options.allowlist : allow.textsFor(rel) }));
  const report = {
    tool: 'i18n-migrate',
    version: TOOL_VERSION,
    ticket,
    dry,
    root,
    files: [],
    totals: { files: files.length, migrated: 0, skipped: 0, unsupported: 0, entries: 0, skips: 0, warnings: 0 },
    tables: [],
    manifest: null,
  };
  const writable = plans.filter((plan) => plan.status === 'ok');
  let tablePlan = { errors: [], perPlan: new Map(), tables: new Map() };
  if (writable.length > 0) {
    tablePlan = planTables(root, writable, ticket);
    for (const plan of writable) {
      const result = tablePlan.perPlan.get(plan.rel);
      if (result !== undefined && !result.ok) {
        plan.status = 'unsupported';
        plan.why = result.why;
        plan.edits = [];
        plan.entries = [];
        plan.skips.push({ reason: 'UNSUPPORTED', detail: result.why, line: 0, value: '' });
      }
    }
  }
  // 并发写是本仓常态（同一个工作树里可能另有一个会话在改同一批文件）：
  // 表在「读分析」之后被改过就整包不写——表没落盘而源码落了盘，等于把 key 悬空。
  const stalePackages = new Set();
  if (!dry) {
    for (const [path, table] of tablePlan.tables) {
      if (table.text === table.before) continue;
      let now = null;
      try { now = readFileSync(path, 'utf8'); } catch (e) { now = null; }
      if (now !== table.before) {
        stalePackages.add(table.pkg);
        tablePlan.errors.push('词条表在读分析之后被改过（并发写），本次不写：' + path);
        table.skipReason = '表在读分析之后被改过（并发写），本次不写';
      }
    }
    for (const plan of plans) {
      if (plan.status !== 'ok' || !stalePackages.has(packageOfRel(plan.rel))) continue;
      plan.status = 'unsupported';
      plan.why = '同包的词条表在读分析之后被改过（并发写），本件一起不写；等它定下来重跑一次';
      plan.edits = [];
      plan.entries = [];
      plan.units = [];
      plan.skips.push({ reason: 'UNSUPPORTED', detail: plan.why, line: 0, value: '' });
    }
  }
  for (const plan of plans) {
    // 源码同理：读分析到写盘之间被人改过，按旧偏移改写会写坏
    if (plan.status === 'ok' && !dry) {
      let now = null;
      try { now = readFileSync(join(root, plan.rel), 'utf8'); } catch (e) { now = null; }
      if (now !== plan.text) {
        plan.status = 'unsupported';
        plan.why = '文件在读分析之后被改过（并发写），本件不动；等它定下来重跑一次';
        plan.edits = [];
        plan.entries = [];
        plan.units = [];
        plan.skips.push({ reason: 'UNSUPPORTED', detail: plan.why, line: 0, value: '' });
      }
    }
    const record = {
      path: plan.rel,
      status: plan.status,
      why: plan.why,
      entries: plan.entries,
      units: plan.units,
      skips: plan.skips,
      warnings: plan.warnings,
      written: false,
    };
    if (plan.status === 'ok') {
      record.written = !dry;
      report.totals.migrated += 1;
      report.totals.entries += plan.entries.length;
      if (!dry) {
        backup(root, plan.rel);
        writeFileSync(join(root, plan.rel), applyEdits(plan.text, plan.edits), 'utf8');
      }
    } else if (plan.status === 'unsupported') {
      report.totals.unsupported += 1;
    } else {
      report.totals.skipped += 1;
    }
    report.totals.skips += plan.skips.length;
    report.totals.warnings += plan.warnings.length;
    report.files.push(record);
  }
  if (!dry && tablePlan.tables.size > 0) {
    for (const [path, table] of tablePlan.tables) {
      if (table.text === table.before) continue;
      if (table.skipReason !== undefined) {
        report.tables.push({ path: path.slice(root.length + 1).replace(/\\/g, '/'), added: false, skipped: table.skipReason });
        continue;
      }
      backup(root, path.slice(root.length + 1).replace(/\\/g, '/'));
      writeFileSync(path, table.text, 'utf8');
      report.tables.push({ path: path.slice(root.length + 1).replace(/\\/g, '/'), added: true });
    }
  } else {
    for (const path of tablePlan.tables.keys()) {
      report.tables.push({ path: path.slice(root.length + 1).replace(/\\/g, '/'), added: false });
    }
  }
  if (!dry) {
    const dir = join(root, '.scratch', 'i18n-migrate');
    mkdirSync(dir, { recursive: true });
    const name = ticket === null ? 'files' : 'ticket-' + ticket;
    const manifest = join(dir, name + '.json');
    writeFileSync(manifest, JSON.stringify(report, null, 2) + '\n', 'utf8');
    report.manifest = manifest.slice(root.length + 1).replace(/\\/g, '/');
  }
  return report;
}

/** 人读报告。 */
export function formatReport(report) {
  const lines = [];
  lines.push('# ' + report.tool + ' ' + report.version + ' · ticket=' + (report.ticket === null ? '-' : report.ticket) + ' · dry=' + (report.dry ? 'yes' : 'no'));
  for (const file of report.files) {
    const head = file.status.toUpperCase() + ' ' + file.path;
    if (file.status === 'ok') lines.push(head + '  units=' + file.entries.length + '  written=' + (file.written ? 'yes' : 'no'));
    else if (file.status === 'unsupported') lines.push(head + '  ' + file.why);
    else lines.push(head + '  ' + (file.why === '' ? '（无）' : file.why));
    for (const unit of file.units) lines.push('   unit  ' + unit.key + '  「' + unit.template + '」  ' + JSON.stringify(unit.params.map((param) => param.text)));
    for (const skip of file.skips) {
      if (skip.reason === 'UNSUPPORTED') lines.push('   stop  L' + skip.line + ' 「' + skip.value + '」 — ' + skip.detail);
      else lines.push('   skip  L' + skip.line + ' 「' + skip.value + '」 — ' + skip.reason + '：' + skip.detail);
    }
    for (const warn of file.warnings) lines.push('   warn  L' + warn.line + ' ' + warn.kind + '：' + warn.detail);
  }
  const total = report.totals;
  lines.push('RESULT: files=' + total.files + ' migrated=' + total.migrated + ' skipped=' + total.skipped + ' entries=' + total.entries + ' unsupported=' + total.unsupported);
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const dry = argv.includes('--dry');
  const selftest = argv.includes('--selftest');
  const ticket = flagOf(argv, '--ticket', null);
  const filesFlag = flagOf(argv, '--files', null);
  const root = resolve(flagOf(argv, '--root', ROOT));
  if (selftest) {
    return import('./test/i18n-migrate-selftest.mjs').then((mod) => {
      const result = mod.runMigrateSelftest({ root, migrate });
      console.log(result.text);
      process.exitCode = result.failed === 0 ? 0 : 1;
    });
  }
  if (ticket === null && filesFlag === null) {
    console.error('用法：node tooling/i18n-migrate.mjs --ticket <票号> | --files a.ts,b.ts [--dry] [--json] | --selftest');
    process.exitCode = 2;
    return Promise.resolve();
  }
  let files;
  if (filesFlag !== null) files = filesFlag.split(',').map((one) => one.trim().replace(/\\/g, '/')).filter((one) => one !== '');
  else files = filesOfTicket(root, ticket);
  if (files.length === 0) {
    console.error('文件清单为空：缩面＝放宽，不许空转当绿');
    process.exitCode = 2;
    return Promise.resolve();
  }
  const report = migrate({ root, files, ticket, dry });
  if (json) console.log(JSON.stringify(report, null, 2));
  else console.log(formatReport(report));
  return Promise.resolve();
}

if (process.argv[1] !== undefined && process.argv[1].replace(/\\/g, '/').endsWith('tooling/i18n-migrate.mjs')) {
  await main();
}
