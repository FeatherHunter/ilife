/** T351-a2 · 从生产库独立复算「两条无损删减 ＋ 节奏场内恒定」（只读生产库，不写它）。
 *
 * 口径（规格 `docs/skills/skill-calorie/t351-redesign-184-spec.md` §二 的两条 264/264）：
 *   备注形如 `胸整体 [W1 10reps×35.0kg, 20-30 RPM(2-2.5秒/次)]`；方括号内逗号前那截与同行 `sets`
 *   逐字重复（丢了不丢信息）、方括号内 `W<n>` 恒等于该行周次；方括号内逗号后那截＝节奏，场内恒定。
 *
 * 本脚本**不改工作区**（只读生产库 ＋ 打印），故不持锁；读数落 stdout，由调用方落盘。
 * 用法：node .scratch/t351-a2/derive-prod.mjs
 */
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PROD = 'D:\\2Study\\StudyNotes\\.db\\calorie_data.db';
const SCRATCH = resolve('.scratch/t351-a2/dbs');
if (!existsSync(PROD)) {
  console.log('DERIVE: SKIP 生产库不在 ' + PROD);
  process.exit(0);
}
mkdirSync(SCRATCH, { recursive: true });
const dest = join(SCRATCH, 'prod-copy.db');
if (existsSync(dest)) rmSync(dest, { force: true });
const src = new DatabaseSync(PROD, { readOnly: true });
src.exec("VACUUM INTO '" + dest.replace(/'/g, "''") + "'");
src.close();
const db = new DatabaseSync(dest, { readOnly: true });

/** 备注拆段：方括号前＝部位细化词，括号内逗号前＝丢掉那截，括号内逗号后＝节奏。 */
function splitNote(note) {
  const raw = String(note ?? '').trim();
  if (raw === '' || raw === '—') return { detail: '', dropped: null, tempo: '' };
  const b = /^(.*?)\s*\[(.*)\]\s*$/.exec(raw);
  if (b === null) return { detail: raw, dropped: null, tempo: '' };
  const comma = b[2].indexOf(',');
  return {
    detail: b[1].trim(),
    dropped: comma === -1 ? b[2].trim() : b[2].slice(0, comma).trim(),
    tempo: comma === -1 ? '' : b[2].slice(comma + 1).trim(),
  };
}

const rows = db.prepare('SELECT week_number, day_of_week, session_index, session_label, is_rest_day, total_sets, movements FROM workout_plans ORDER BY week_number, day_of_week, session_index').all();
db.close();

/** 由 `sets` 反推「括号内逗号前那截」的候选写法（逐字比对的几种口径都量一遍，不做预设）。 */
const fmt1 = (w) => (Number.isInteger(w) && Number(w) !== 0 ? Number(w).toFixed(1) : String(w));
const variants = {
  'W<周> <组数>reps×<重量一位小数><单位>': (wn, s) => 'W' + wn + ' ' + s.length + 'reps×' + s.map((x) => fmt1(x.weight)).join('／') + s[0].unit,
  'W<周> <组数>reps×<重量原样><单位>': (wn, s) => 'W' + wn + ' ' + s.length + 'reps×' + s.map((x) => String(x.weight)).join('／') + s[0].unit,
  'W<周> <去重次数／>reps×<去重重量／><单位>': (wn, s) => 'W' + wn + ' ' + [...new Set(s.map((x) => x.reps))].join('／') + 'reps×'
    + [...new Set(s.map((x) => fmt1(x.weight)))].join('／') + s[0].unit,
  // 正解口径：那截里写的是「逐组次数（去重以／连）× 逐组重量（去重以／连）」＋**固定 `kg`**，
  // 且**不含组数**（组数＝sets.length；自重行的重量写 `0kg`，库里 unit 是 `自重`）。
  'W<周> <去重次数／>reps×<去重重量一位小数／>kg（单位固定）': (wn, s) => 'W' + wn + ' '
    + [...new Set(s.map((x) => x.reps))].join('／') + 'reps×'
    + [...new Set(s.map((x) => fmt1(x.weight)))].join('／') + 'kg',
};

const stat = {
  rows: rows.length, movements: 0, bracket: 0, noBracket: 0, blankNote: 0,
  typeCount: {}, unitCount: {},
  droppedPresent: 0, wnPresent: 0, wnMatchesWeek: 0, weekDist: {}, variantHits: {}, variantMiss: {},
  sessions: 0, restSessions: 0, actionSessions: 0, tempoSessions: 0, tempoConstant: 0, tempoValues: {},
  detailNonEmpty: 0,
};
const missSamples = [];

for (const r of rows) {
  let moves = [];
  try { moves = JSON.parse(r.movements ?? '[]'); } catch { moves = []; }
  if (!Array.isArray(moves)) moves = [];
  if (r.is_rest_day === 1) { stat.sessions += 1; stat.restSessions += 1; continue; }
  stat.sessions += 1;
  if (moves.length > 0) stat.actionSessions += 1;

  const tempos = new Set();
  for (const m of moves) {
    stat.movements += 1;
    const sets = Array.isArray(m.sets) ? m.sets : [];
    stat.typeCount[m.type ?? '(缺)'] = (stat.typeCount[m.type ?? '(缺)'] ?? 0) + 1;
    for (const s of sets) stat.unitCount[s.unit ?? '(缺)'] = (stat.unitCount[s.unit ?? '(缺)'] ?? 0) + 1;
    const n = splitNote(m.note);
    if (n.detail !== '') stat.detailNonEmpty += 1;
    if (n.dropped === null) { if (String(m.note ?? '').trim() === '' || m.note === '—') stat.blankNote += 1; else stat.noBracket += 1; } else {
      stat.bracket += 1;
      stat.droppedPresent += 1;
      const wn = Number((/^W(\d+)/.exec(n.dropped) ?? [, ''])[1]);
      if (Number.isFinite(wn) && wn > 0) {
        stat.wnPresent += 1;
        if (wn === r.week_number) stat.wnMatchesWeek += 1;
        stat.weekDist[r.week_number] = (stat.weekDist[r.week_number] ?? 0) + 1;
      }
      for (const [name, fn] of Object.entries(variants)) {
        stat.variantHits[name] = stat.variantHits[name] ?? 0;
        stat.variantMiss[name] = stat.variantMiss[name] ?? [];
        if (sets.length > 0 && fn(r.week_number, sets) === n.dropped) stat.variantHits[name] += 1;
        else if (stat.variantMiss[name].length < 4) stat.variantMiss[name].push(r.week_number + '/' + r.day_of_week + ' 「' + n.dropped + '」 vs sets=' + JSON.stringify(sets));
      }
    }
    if (n.tempo !== '') { tempos.add(n.tempo); stat.tempoValues[n.tempo] = (stat.tempoValues[n.tempo] ?? 0) + 1; }
  }
  if (tempos.size > 0) { stat.tempoSessions += 1; if (tempos.size === 1) stat.tempoConstant += 1; }
}

const uniqTempo = Object.keys(stat.tempoValues);
const checks = [
  ['计划行数 > 0', stat.rows > 0, '行=' + stat.rows],
  ['动作总数＝264', stat.movements === 264, '动作=' + stat.movements],
  ['备注方括号内逗号前那截存在（264/264）', stat.bracket === 264 && stat.droppedPresent === 264, '有括号=' + stat.bracket],
  ['方括号内 `W<n>` 恒等于该行周次（264/264）', stat.wnPresent === 264 && stat.wnMatchesWeek === 264, 'W命中=' + stat.wnPresent + ' 等周次=' + stat.wnMatchesWeek],
  ['周次分布 66/66/66/66', JSON.stringify(Object.values(stat.weekDist).sort((a, b) => b - a)) === JSON.stringify([66, 66, 66, 66]), '分布=' + JSON.stringify(stat.weekDist)],
  ['有动作的场次＝96 且场内节奏恒定（96/96）', stat.actionSessions === 96 && stat.tempoConstant === stat.tempoSessions, '场次=' + stat.actionSessions + ' 有节奏场次=' + stat.tempoSessions + ' 恒定=' + stat.tempoConstant],
  ['节奏取值只有 3 种', uniqTempo.length === 3, '取值=' + JSON.stringify(uniqTempo)],
  ['类型取值域只有两种：iso 204 ＋ main 60', stat.typeCount.iso === 204 && stat.typeCount.main === 60, JSON.stringify(stat.typeCount)],
  ['由 sets 反推「丢掉那截」逐字命中（264/264，至少一种口径全中）',
    Object.values(stat.variantHits).some((n) => n === 264), JSON.stringify(stat.variantHits)],
];

console.log('DERIVE_PROD rows=' + stat.rows + ' movements=' + stat.movements + ' actionSessions=' + stat.actionSessions
  + ' restSessions=' + stat.restSessions + ' tempoSessions=' + stat.tempoSessions + ' tempoConstant=' + stat.tempoConstant);
console.log('DERIVE_DIST week=' + JSON.stringify(stat.weekDist) + ' type=' + JSON.stringify(stat.typeCount)
  + ' unit=' + JSON.stringify(stat.unitCount) + ' tempo=' + JSON.stringify(stat.tempoValues));
console.log('DERIVE_NOTE bracket=' + stat.bracket + ' noBracket=' + stat.noBracket + ' blank=' + stat.blankNote
  + ' detailNonEmpty=' + stat.detailNonEmpty);
for (const [name, n] of Object.entries(stat.variantHits)) {
  console.log('DERIVE_VARIANT 「' + name + '」 命中=' + n + '/264');
  for (const m of stat.variantMiss[name].slice(0, 3)) console.log('DERIVE_VARIANT_MISS   ' + m);
}
for (const [name, ok, reading] of checks) console.log((ok ? 'PASS ' : 'FAIL ') + '复算 ' + name + ' ＝ ' + reading);
console.log('RESULT: ' + checks.filter((c) => c[1]).length + '/' + checks.length);
process.exit(checks.every((c) => c[1]) ? 0 : 1);
