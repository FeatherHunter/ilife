/** 独立审查兵复算脚本 B：§2.1 两条无损删减 ＋ §2.2 副行规则 ＋ §2.3 节奏恒定。
 *  独立实现（不 import 被审脚本任何件、不照抄其实施）；只读生产库。
 *  用法：node .scratch/t351-a2/review/probe-prod.mjs
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const PROD = 'D:\\2Study\\StudyNotes\\.db\\calorie_data.db';
if (!existsSync(PROD)) { console.log('PROBE_PROD SKIP 生产库不在'); process.exit(0); }
mkdirSync('.scratch/t351-a2/review/dbs', { recursive: true });
const COPY = '.scratch/t351-a2/review/dbs/prod-copy.db';
rmSync(COPY, { force: true });
const w = new DatabaseSync(PROD, { readOnly: true });
w.exec("VACUUM INTO '" + COPY.replace(/'/g, "''") + "'");
w.close();
const db = new DatabaseSync(COPY, { readOnly: true });
const rows = db.prepare('SELECT week_number, day_of_week, session_label, is_rest_day, movements FROM workout_plans').all();
db.close();

const out = { movements: 0, bracket: 0, noBracket: 0, blank: 0, wnPresent: 0, wnEqWeek: 0, weekDist: {},
  type: {}, unit: {}, actionSessions: 0, restSessions: 0, tempoSessions: 0, tempoConst: 0, tempoVals: {},
  droppedReconstruct: 0, droppedMiss: [], detailRules: { withBracketDetail: 0, noBracketWhole: 0, blankNoDetail: 0 },
  detailBareType: { det: 0 }, subRowExpected: {}, unknownType: {} };
const TYPE_ZH = { main: '主要', iso: '孤立' };

/** 与实现同一形态的拆分（口径独立写出，再独立验证它是否损失信息） */
function split(note) {
  const raw = String(note ?? '').trim();
  if (raw === '' || raw === '—') return { detail: '', dropped: null, tempo: '' };
  const m = /^(.*?)\s*\[(.*)\]\s*$/.exec(raw);
  if (m === null) return { detail: raw, dropped: null, tempo: '' };
  const c = m[2].indexOf(',');
  return { detail: m[1].trim(), dropped: c === -1 ? m[2].trim() : m[2].slice(0, c).trim(),
    tempo: c === -1 ? '' : m[2].slice(c + 1).trim() };
}

/** 「丢掉那截」的可还原性：**不看实现怎么拼**，只问「由同行 sets ＋ 行周次能不能唯一还原出原文」。
 *  逐组次数按出现顺序列出、重量一位小数、单位照 unit —— 这是最朴素的一版，若不命中再看原因。 */
function rebuildNaive(wn, sets) {
  const reps = sets.map((s) => s.reps).join('／');
  const wts = sets.map((s) => (Number.isInteger(Number(s.weight)) ? Number(s.weight).toFixed(1) : String(s.weight))).join('／');
  return 'W' + wn + ' ' + reps + 'reps×' + wts + 'kg';
}
function rebuildDedup(wn, sets) {
  const reps = [...new Set(sets.map((s) => s.reps))].join('／');
  const wts = [...new Set(sets.map((s) => (Number.isInteger(Number(s.weight)) ? Number(s.weight).toFixed(1) : String(s.weight))))].join('／');
  return 'W' + wn + ' ' + reps + 'reps×' + wts + 'kg';
}
/** 单位固定 kg 的一版（自重行的重量写 0kg，库里 unit 是「自重」；0 写 "0"，非零整数写一位小数）。 */
function rebuildDedupKg(wn, sets) {
  const f = (w) => (Number.isInteger(w) && w !== 0 ? w.toFixed(1) : String(w));
  const reps = [...new Set(sets.map((s) => s.reps))].join('／');
  const wts = [...new Set(sets.map((s) => f(Number(s.weight))))].join('／');
  return 'W' + wn + ' ' + reps + 'reps×' + wts + 'kg';
}

for (const r of rows) {
  let mv = [];
  try { mv = JSON.parse(r.movements ?? '[]'); } catch { mv = []; }
  if (!Array.isArray(mv)) mv = [];
  if (r.is_rest_day === 1) { out.restSessions += 1; continue; }
  if (mv.length === 0) continue;
  out.actionSessions += 1;
  const tempos = new Set();
  for (const m of mv) {
    out.movements += 1;
    const sets = Array.isArray(m.sets) ? m.sets : [];
    for (const s of sets) out.unit[s.unit ?? '(缺)'] = (out.unit[s.unit ?? '(缺)'] ?? 0) + 1;
    const t = m.type ?? '(缺)';
    out.type[t] = (out.type[t] ?? 0) + 1;
    if (TYPE_ZH[t] === undefined) out.unknownType[t] = (out.unknownType[t] ?? 0) + 1;
    const n = split(m.note);
    if (n.dropped === null) {
      if (String(m.note ?? '').trim() === '' || m.note === '—') { out.blank += 1; out.detailRules.blankNoDetail += 1; }
      else { out.noBracket += 1; out.detailRules.noBracketWhole += 1; }
    } else {
      out.bracket += 1;
      const wn = Number((/^W(\d+)\b/.exec(n.dropped) ?? [, ''])[1]);
      if (Number.isFinite(wn) && wn > 0) {
        out.wnPresent += 1;
        if (wn === r.week_number) out.wnEqWeek += 1;
        out.weekDist[r.week_number] = (out.weekDist[r.week_number] ?? 0) + 1;
      }
      if (n.detail !== '') out.detailRules.withBracketDetail += 1;
      // 逐字还原验证（两种口径都算，取最好）
      const cand = sets.length > 0 ? [rebuildNaive(r.week_number, sets), rebuildDedup(r.week_number, sets), rebuildDedupKg(r.week_number, sets)] : [];
      if (cand.includes(n.dropped)) out.droppedReconstruct += 1;
      else if (out.droppedMiss.length < 5) out.droppedMiss.push({ wk: r.week_number, dow: r.day_of_week, dropped: n.dropped, sets });
    }
    // 副行期望值：detailWord 规则（类型裸词中文化 ＋ 去掉与第二段同字）
    const zh = TYPE_ZH[t] ?? t;
    const words = n.detail.split(/\s+/).filter(Boolean).map((x) => TYPE_ZH[x] ?? x);
    const di = words.indexOf(zh);
    if (di >= 0) words.splice(di, 1);
    const sub = [words.join(' '), TYPE_ZH[t] ?? ''].filter((x) => x !== '').join(' · ');
    out.subRowExpected[sub] = (out.subRowExpected[sub] ?? 0) + 1;
    if (/(?<![\w-])(main|iso)(?![\w-])/.test(sub)) out.detailBareType.det += 1;
    if (n.tempo !== '') { tempos.add(n.tempo); out.tempoVals[n.tempo] = (out.tempoVals[n.tempo] ?? 0) + 1; }
  }
  if (tempos.size > 0) { out.tempoSessions += 1; if (tempos.size === 1) out.tempoConst += 1; }
}

const C = [
  ['动作总数＝264', out.movements === 264, '动作=' + out.movements],
  ['备注方括号内逗号前那截存在（264）', out.bracket === 264, '有括号=' + out.bracket + ' 无括号=' + out.noBracket + ' 空=' + out.blank],
  ['方括号内 W<n> 恒等于该行周次（264）', out.wnPresent === 264 && out.wnEqWeek === 264, 'W命中=' + out.wnPresent + ' 等周次=' + out.wnEqWeek],
  ['周次分布 66×4', JSON.stringify(Object.values(out.weekDist).sort((a, b) => b - a)) === JSON.stringify([66, 66, 66, 66]), JSON.stringify(out.weekDist)],
  ['丢掉那截可由 sets＋周次逐字还原（264）', out.droppedReconstruct === 264, '还原=' + out.droppedReconstruct + '/264'],
  ['有动作场次＝96，场内节奏恒定（96/96）', out.actionSessions === 96 && out.tempoSessions === out.tempoConst, '场次=' + out.actionSessions + ' 有节奏=' + out.tempoSessions + ' 恒定=' + out.tempoConst],
  ['类型取值域＝iso 204＋main 60', out.type.iso === 204 && out.type.main === 60, JSON.stringify(out.type)],
  ['副行期望值里无 main／iso 裸词', out.detailBareType.det === 0, '裸词副行=' + out.detailBareType.det],
];
console.log('PROBE_PROD ' + JSON.stringify({ movements: out.movements, actionSessions: out.actionSessions, restSessions: out.restSessions }));
console.log('PROBE_TEMPO vals=' + JSON.stringify(out.tempoVals) + ' sessions=' + out.tempoSessions + ' const=' + out.tempoConst);
console.log('PROBE_UNIT ' + JSON.stringify(out.unit));
console.log('PROBE_UNKNOWN_TYPE ' + JSON.stringify(out.unknownType));
console.log('PROBE_DETAIL_RULES ' + JSON.stringify(out.detailRules));
console.log('PROBE_DROPPED_MISS ' + JSON.stringify(out.droppedMiss.slice(0, 3)));
console.log('PROBE_SUB_EXPECTED ' + JSON.stringify(out.subRowExpected));
for (const [n, ok, rd] of C) console.log((ok ? 'PASS ' : 'FAIL ') + n + ' ＝ ' + rd);
console.log('RESULT: ' + C.filter((c) => c[1]).length + '/' + C.length);
