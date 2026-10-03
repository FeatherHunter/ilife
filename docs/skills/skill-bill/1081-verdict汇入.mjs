#!/usr/bin/env node
/** #1081 verdict 汇入器：把负责人墙上的勾选（墙「导出清单JSON」的产物）＋ #1078 的 24 格机读结论，
 *  一条命令汇进 ① 各域 *-逐格结论.md 的判定列 ② 1081-95页-ok总账.md 的 verdict 列，并给覆盖面读数。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-bill/1081-verdict汇入.mjs            # 真跑：写盘 + 打印读数
 *   node docs/skills/skill-bill/1081-verdict汇入.mjs --dry      # 只算不写（读数一样）
 *   node docs/skills/skill-bill/1081-verdict汇入.mjs --root <目录>   # 夹具入口（默认 docs/skills/skill-bill）
 *
 * 输入（都在 --root 下）：
 *   · 1078-24页-verdict.json        —— #1078 已判的 24 格（say 16 + w09 + 设置速查 7），机读
 *   · verdicts/<wall>.json          —— 各面墙「导出清单JSON」的产物（形状 {wall,total,ok,no,unjudged,items}）
 *   · verdicts/if-not-ok.json       —— 可选：{ "<seq>": "#票号" }，给 不ok 的格点去处（缺就该格报红）
 *
 * 铁律（#1081 票面红线，本器不许违反）：**判定列不许代填**。
 *   本器只**转抄**：负责人在墙上的勾选（ok／no＋原因原文）与 #1078 的机读结论。
 *   任何没有来源的格一律 未判——不推断、不默认 ok、不把墙没覆盖到的 seq 填成 ok。
 *   不ok 必须同时有原因原文与 if-not-ok 票号；缺任一条 → 报红并点名（不静默）。
 *
 * 退出码：0＝转抄完成（允许仍有 未判，那是负责人没勾的格）；1＝有红（结构解析失败／不ok 缺原因或票号）。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const rootOf = () => { const i = argv.indexOf('--root'); return i >= 0 ? resolve(argv[i + 1]) : HERE; };
const ROOT = rootOf();
const MANIFEST = resolve(HERE, 'proto', 'manifest.json');
const REPO = resolve(HERE, '..', '..', '..');

const DOMAIN_OF = (rel) => {
  const d = String(rel).split('/')[0];
  if (d === 'w09' || d === 'setup-help') return 'setup';
  if (d === 'say-collect') return 'say';
  if (d === 'acct-goal') return 'acct';
  return d; // query／analysis／write-receipt
};

/** 人原话来源登记表：机读件（#1078）只对**登记过的域**开转抄口——没登记就报红，
 *  因为「谁、什么时候、在哪份件里、对哪一版产物说的」这条链断在哪一环，都不能上屏。 */
const HUMAN = {
  'say-collect': { file: 'docs/skills/skill-bill/1079-say-逐格结论.md', line: 25, quote: '认可，都没什么问题', date: '2026-10-03', how: '整批认可，未逐格分判' },
  'setup-help': { file: 'docs/skills/skill-bill/1080-setup-w09-逐格结论.md', line: 19, quote: '全部通过', date: '2026-10-03', how: '看过对照墙后' },
  w09: { file: 'docs/skills/skill-bill/1080-setup-w09-逐格结论.md', line: 19, quote: '全部通过', date: '2026-10-03', how: '看过对照墙后' },
};
const humanCite = (dom) => { const h = HUMAN[dom]; return h ? ('来源＝' + h.file + ':' + h.line + ' 用户原话「' + h.quote + '」（' + h.date + '，' + h.how + '；判于当刻产物）') : ''; };

const RED = [];
const red = (s) => RED.push(s);

/* ── 页清单（唯一来源＝proto/manifest.json，去重口径与 95check 同一处） ── */
const DEDUPED = 'query/w09-查分类-v2.1.html';
const man = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const protoSeqOf = (rel) => basename(rel).match(/^([a-z][0-9][0-9])-/)[1];
const PAGES = man.items.filter((i) => i.kind === 'proto' && i.rel !== DEDUPED)
  .map((i) => ({ seq: protoSeqOf(i.rel), rel: i.rel, wake: i.wake }));
const SEQ_SET = new Set(PAGES.map((x) => x.seq));
const seqOfPath = (pth) => { if (!pth) return null; const m = basename(String(pth)).match(/^([a-z][0-9][0-9])-/); return m ? m[1] : null; };

/* ── 来源①：#1078 的 24 格机读结论（satisfied→ok；unsatisfied→不ok＋reason） ── */
const src = new Map();
const note = (seq, verdict, reason, from, cite) => {
  if (!SEQ_SET.has(seq)) { red('来源里的 seq 不在 94 行页清单内：' + from + ' → ' + seq); return; }
  const cur = src.get(seq);
  if (cur && cur.from !== from) { /* 后写的来源覆盖先写的（墙 > #1078），但要留痕 */ }
  src.set(seq, { verdict, reason: reason ?? '', from, cite: cite ?? '' });
};
const V1078 = join(ROOT, '1078-24页-verdict.json');
if (!existsSync(V1078)) red('输入缺件：' + V1078);
else {
  const j = JSON.parse(readFileSync(V1078, 'utf8'));
  for (const it of j.items ?? []) {
    const seq = seqOfPath(it.file);
    if (!seq) { red('#1078 的条目认不出页：' + JSON.stringify(it.file)); continue; }
    const v = it.verdict === 'satisfied' ? 'ok' : it.verdict === 'unsatisfied' ? '不ok' : '未判';
    const dom = String(it.file).split('/').slice(-2)[0];
    const cite = humanCite(dom);
    if (v !== '未判' && !cite) red('#1078 转抄缺人原话来源登记：' + seq + '（域 ' + dom + '）——不许只凭机读件把判定上屏');
    note(seq, v, v === '不ok' ? String(it.reason ?? '') : '', '#1078 机读件', cite);
  }
}

/* ── 来源②：各面墙「导出清单JSON」的产物 ── */
const VDIR = join(ROOT, 'verdicts');
const wallFiles = existsSync(VDIR) ? readdirSync(VDIR).filter((f) => f.endsWith('.json') && f !== 'if-not-ok.json').sort() : [];
const wallReport = [];
for (const f of wallFiles) {
  let j;
  try { j = JSON.parse(readFileSync(join(VDIR, f), 'utf8')); }
  catch (e) { red('墙导出解析失败：' + f + '（' + String(e.message) + '）'); continue; }
  if (!Array.isArray(j.items)) { red('墙导出形状不对（缺 items）：' + f); continue; }
  let okN = 0; let noN = 0; let unN = 0;
  for (const it of j.items) {
    const seq = seqOfPath(it.proto) ?? (it.seq !== undefined ? (man.items.find((m) => m.seq === it.seq && m.kind === 'proto') ? protoSeqOf(man.items.find((m) => m.seq === it.seq && m.kind === 'proto').rel) : null) : null);
    if (!seq) { red('墙导出的条目认不出页：' + f + ' seq=' + String(it.seq) + ' proto=' + String(it.proto)); continue; }
    if (it.proto && String(it.proto).includes('w09-查分类-v2.1.html')) { unN++; continue; } // 被 v2.2 取代的那一版：不计行（票面去重口径）
    const v = it.verdict === 'ok' ? 'ok' : it.verdict === 'no' ? '不ok' : '未判';
    if (v === 'ok') okN++; else if (v === '不ok') noN++; else unN++;
    const mt = new Date(statSync(join(VDIR, f)).mtime.getTime() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
    note(seq, v, v === '不ok' ? String(it.reason ?? '') : '', f.replace(/\.json$/, ''),
      '来源＝' + relative(REPO, join(VDIR, f)).split(String.fromCharCode(92)).join('/') + '（负责人墙上勾选；导出件时刻 ' + mt + '；判于当刻产物）');
  }
  wallReport.push(f + '（wall=' + String(j.wall ?? '?') + '；勾 ok ' + String(okN) + '／不ok ' + String(noN) + '／未勾 ' + String(unN) + '）');
}

/* ── 可选：if-not-ok 去处表 ── */
const IFNO = new Map();
const ifnoPath = join(VDIR, 'if-not-ok.json');
if (existsSync(ifnoPath)) {
  const j = JSON.parse(readFileSync(ifnoPath, 'utf8'));
  for (const [k, v] of Object.entries(j)) IFNO.set(k, String(v));
}

/* ── 合成每页的最终判定（没来源＝未判；不ok 的两条硬要求在这里查） ── */
const final = new Map();
for (const pg of PAGES) {
  const st = src.get(pg.seq);
  if (!st) { final.set(pg.seq, { verdict: '未判', reason: '', from: '（无来源）', ifNotOk: '—' }); continue; }
  const ifn = IFNO.get(pg.seq) ?? '—';
  if (st.verdict === '不ok') {
    if (!st.reason.trim()) red('不ok 缺原因原文：' + pg.seq + '（来源 ' + st.from + '）');
    if (ifn === '—' || !/#[0-9]+/.test(ifn)) red('不ok 缺 if-not-ok 票号：' + pg.seq + '（在 verdicts/if-not-ok.json 里给它点去处）');
  }
  final.set(pg.seq, { verdict: st.verdict, reason: st.reason, from: st.from, cite: st.cite ?? '', ifNotOk: st.verdict === '不ok' ? ifn : '—' });
}
const tally = { ok: 0, '不ok': 0, '未判': 0 };
for (const v of final.values()) tally[v.verdict]++;
const uncovered = PAGES.filter((x) => final.get(x.seq).from === '（无来源）').map((x) => x.seq);

/* ── 写盘：① 94 行总账的 verdict／if-not-ok 列 ── */
const LEDGER = join(ROOT, '1081-95页-ok总账.md');
let ledgerChanged = 0;
if (!existsSync(LEDGER)) red('总账不在盘上：' + LEDGER);
else {
  const lines = readFileSync(LEDGER, 'utf8').split('\n');
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!/^\|\s*[a-z][0-9][0-9]\s*\|/.test(lines[i])) continue;
    const parts = lines[i].split('|');
    const seq = parts[1].trim();
    const st = final.get(seq);
    if (!st) { red('总账里有一行不在页清单内：' + seq); continue; }
    seen++;
    if (parts[5] !== ' ' + st.verdict + ' ') { parts[5] = ' ' + st.verdict + ' '; ledgerChanged++; }
    if (parts[7] !== ' ' + st.ifNotOk + ' ') { parts[7] = ' ' + st.ifNotOk + ' '; ledgerChanged++; }
    const pathHit = parts[6].match(/docs\/[^\s（(；]+/);
    const concl = st.verdict === '未判'
      ? '未判（无来源）；待填：' + (pathHit ? pathHit[0] : '（结论件）')
      : (st.cite || '来源未登记') + (st.verdict === '不ok' && String(st.reason).trim() ? '；不ok 原因原文「' + String(st.reason).trim() + '」' : '');
    if (parts[6] !== ' ' + concl + ' ') { parts[6] = ' ' + concl + ' '; ledgerChanged++; }
    lines[i] = parts.join('|');
  }
  if (seen !== PAGES.length) red('总账行数与页清单不符：总账 ' + String(seen) + ' 行／页清单 ' + String(PAGES.length) + ' 行');
  if (!DRY && ledgerChanged) writeFileSync(LEDGER, lines.join('\n'), 'utf8');
}

/* ── 写盘：② 六份逐格结论的判定列 ── */
const TABLES = [
  { tag: 'query', file: '1074-query-逐格结论.md', header: /^\|\s*#\s*\|\s*页\s*\|\s*唤醒词\s*\|\s*该确认什么/, keyCol: 2, verdictCol: 5, reasonCol: 6 },
  { tag: 'write', file: '1075-write-逐格结论.md', header: /^\|\s*#\s*\|\s*id\s*\|\s*唤醒词\s*\|\s*机器面骨架读数/, keyCol: 2, verdictCol: 5, reasonCol: 6 },
  { tag: 'analysis', file: '1076-analysis-逐格结论.md', header: /^\|\s*#\s*\|\s*页\s*\|\s*唤醒词\s*\|\s*该确认什么/, keyCol: 2, verdictCol: 6, reasonCol: 7 },
  { tag: 'acct', file: '1077-acct-逐格结论.md', header: /^\|\s*#\s*\|\s*页\s*\|\s*唤醒词\s*\|\s*页型/, keyCol: 2, verdictCol: 6, reasonCol: 7 },
  { tag: 'say', file: '1079-say-逐格结论.md', header: /^\|\s*#\s*\|\s*唤醒词\s*\|\s*机检/, keyCol: 1, verdictCol: 4, reasonCol: 5 },
  { tag: 'setup', file: '1080-setup-w09-逐格结论.md', header: /^\|\s*#\s*\|\s*页\s*\|\s*390\s*宽/, keyCol: 2, verdictCol: 3, extraCol: 4, reasonCol: null },
];
const edited = [];
for (const spec of TABLES) {
  const fp = join(ROOT, spec.file);
  if (!existsSync(fp)) { red('逐格结论不在盘上：' + spec.file); continue; }
  const text = readFileSync(fp, 'utf8');
  const lines = text.split('\n');
  let inTable = false; let sawHeader = false; let touched = 0; let rows = 0; let unknown = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (spec.header.test(line)) { inTable = true; sawHeader = true; continue; }
    if (!inTable) continue;
    if (!/^\|/.test(line)) { inTable = false; continue; }
    if (/^\|[\s\-:|]+\|$/.test(line)) continue;
    const parts = line.split('|');
    if (parts.length < spec.verdictCol + 2) continue;
    const km = parts[spec.keyCol].trim().match(/([a-z][0-9][0-9])/i);
    const seq = km ? km[1].toLowerCase() : null;
    const st = seq ? final.get(seq) : null;
    if (!st) { unknown++; continue; }
    rows++;
    const want = ' ' + st.verdict + ' ';
    if (parts[spec.verdictCol] !== want) { parts[spec.verdictCol] = want; touched++; }
    const cols = spec.extraCol ? [spec.verdictCol, spec.extraCol] : [spec.verdictCol];
    for (const c of cols) if (parts[c] !== want) { parts[c] = want; touched++; }
    if (st.verdict === '不ok' && spec.reasonCol && st.reason.trim()) {
      const rv = ' ' + st.reason.trim() + ' ';
      if (parts[spec.reasonCol] !== rv) { parts[spec.reasonCol] = rv; touched++; }
    }
    lines[i] = parts.join('|');
  }
  if (!sawHeader) red('逐格结论里找不到判定表（形状变了）：' + spec.file);
  if (rows === 0) red('逐格结论的判定表一行都没认出来：' + spec.file);
  if (unknown > 0) red('逐格结论里有认不出页的行：' + spec.file + '（' + String(unknown) + ' 行）');
  if (!DRY && touched) writeFileSync(fp, lines.join('\n'), 'utf8');
  edited.push(spec.file + '（判据列改动 ' + String(touched) + ' 处）');
}

/* ── --source：逐行溯源表（谁判的 · 什么时候 · 在哪份件里 · 对哪一版产物） ── */
let srcTablePath = '';
const srcLine = (pg) => {
  const f = final.get(pg.seq);
  const cite = f.verdict === '未判' ? '未判（无来源）' : (f.cite || '来源未登记');
  const q = f.verdict === '不ok' ? String(f.reason).trim()
    : f.verdict === 'ok' ? ((cite.match(/用户原话「([^」]*)」/) ?? [null, '满意（墙上勾选）'])[1])
    : '';
  return '| ' + pg.seq + ' | ' + f.verdict + ' | ' + cite.replace(/\|/g, '/') + ' | ' + String(q).replace(/\|/g, '/') + ' |';
};
if (argv.includes('--source')) {
  const rowsT = PAGES.map(srcLine);
  const head = ['# #1081 判定溯源表（' + String(PAGES.length) + ' 行 · 这 94 行到底是谁判的）', '',
    '> 生成：`node docs/skills/skill-bill/1081-verdict汇入.mjs --source`（本表无来源的格一律 `未判（无来源）`）。',
    '> 判定列不许代填：只有**人原话**（逐格结论件里逐字记着）或**墙导出件**（负责人自己勾的）才算来源。', '',
    '| seq | verdict | 来源件:行 | 用户原话片段 |', '|---|---|---|---|'].join('\n');
  const tail = ['', '**计数**：ok ' + String(tally.ok) + '／不ok ' + String(tally['不ok']) + '／未判（无来源）' + String(tally['未判']) + '（共 ' + String(PAGES.length) + ' 行）。'].join('\n');
  const body = head + String.fromCharCode(10) + rowsT.join(String.fromCharCode(10)) + String.fromCharCode(10) + tail + String.fromCharCode(10);
  srcTablePath = join(ROOT, '1081-verdict溯源.md');
  if (!DRY) writeFileSync(srcTablePath, body, 'utf8');
  console.log('SOURCE 表：' + String(PAGES.length) + ' 行 → ' + (DRY ? '（--dry 未写）' : srcTablePath));
  console.log('SOURCE 计数：有来源 ' + String(tally.ok + tally['不ok']) + ' 行／未判（无来源）' + String(tally['未判']) + ' 行');
}

/* ── 读数 ── */
const list = (a) => a.length ? a.join('、') : '（无）';
console.log('ROOT: ' + ROOT);
console.log('SOURCES: #1078 → ' + String((src.size ? src.size : 0)) + ' 格有来源；墙导出 ' + String(wallFiles.length) + ' 份' + (wallReport.length ? '（' + wallReport.join('；') + '）' : ''));
console.log('VERDICTS: ok ' + String(tally.ok) + '／不ok ' + String(tally['不ok']) + '／未判 ' + String(tally['未判']) + '（共 ' + String(PAGES.length) + ' 行）');
console.log('COVERAGE: 墙未覆盖（保持 未判）' + String(uncovered.length) + ' 个：' + list(uncovered));
console.log('FILES: 总账 verdict/if-not-ok 列改动 ' + String(ledgerChanged) + ' 处；' + edited.join('；'));
for (const r of RED) console.log('RED ' + r);
if (RED.length) { console.log('RESULT: 有红 ' + String(RED.length) + ' 条 → 先处置再重跑（判定列不许代填，缺来源的格一律 未判）'); process.exit(1); }
console.log('RESULT: 转抄完成——ok ' + String(tally.ok) + '／不ok ' + String(tally['不ok']) + '／未判 ' + String(tally['未判']) + (DRY ? '（--dry 未写盘）' : '（已写盘）'));
process.exit(0);
