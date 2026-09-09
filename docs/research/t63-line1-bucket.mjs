// #63 主线①终局取证 · 桶层对账（**只读、零 CLI spawn**）。
//
// 跑法：node docs/research/t63-line1-bucket.mjs
// 退出码：0 全部不变量成立；1 有不变量不成立。
//
// 口径：436 条旧唤醒词 SoT（冻结源 `docs/research/t71-old-trigger-records.csv` ＋ 冻结快照
// `test/calorie-sot.snapshot.json`）对最终代码（`5fffe1e`）的编译产物逐条对账：
//   · SoT  `packages/skill-calorie/dist/triggers/index.js`
//   · 路由 `packages/skill-calorie/dist/triggers/routing.js`（436 条：exec ／ non-exec）
//   · HELP 数据模型 `dist/render/index.js::buildHelpSceneData`（10 分组／54 子功能／436 场景／id 436/436）
//   · 99 键 registry `dist/cli/keys.js`
// 检查项：入桶、id 唯一、分组／子功能计数、逐字／sha parity、non-exec 理由闭集、命中面（路由 ＋ HELP）。
//
// 冻结表**只读**：脚本自算 git blob sha1（等价 `git hash-object`，不 spawn）证明未被改动。
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, HELP_LOOKUP, TRIGGERS, getSummary } from '../../packages/skill-calorie/dist/triggers/index.js';
import { CALORIE_COMBOS, CALORIE_WRITE_COMBOS } from '../../packages/skill-calorie/dist/cli/keys.js';
import { buildHelpSceneData } from '../../packages/skill-calorie/dist/render/index.js';
import {
  EXEC_ROUTES,
  HIT_NOT_EXEC_ROUTES,
  NON_EXEC_REASONS,
  OUT_OF_SCOPE_ROUTES,
  WAKE_ROUTES,
  routingSummary,
} from '../../packages/skill-calorie/dist/triggers/routing.js';

const ROOT = new URL('../../', import.meta.url);
const rel = (p) => fileURLToPath(new URL(p, ROOT));

/** #81 登记值（`docs/research/t81-route-evidence.md` §0，本票对账基线）。 */
const BASELINE_81 = { total: 436, exec: 326, nonExec: 110, outOfScope: 10, legacyChain: 100, coveredKeys: 77, newEntries: 34 };
/** 冻结源 git blob sha1（HEAD 值，本票不得改动）。 */
const FROZEN_CSV_SHA1 = '61e28727c43d2091d7ee4058a2705031f1b68cb3';

const rows = [];
const fails = [];
let n = 0;
const check = (name, cond, detail = '') => {
  n += 1;
  const pass = Boolean(cond);
  if (!pass) fails.push(`${name}${detail ? ' — ' + detail : ''}`);
  rows.push(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  return pass;
};
const info = (s) => rows.push(`  info ${s}`);
const section = (t) => rows.push(`\n## ${t}`);

/** git blob sha1（等价 `git hash-object <path>`，不 spawn）。 */
const blobSha = (p) => {
  const buf = readFileSync(p);
  return createHash('sha1').update(`blob ${buf.length}\u0000`).update(buf).digest('hex');
};

// ── 冻结快照 parity 用 canon（与 test/calorie-triggers.test.mjs::canon 同构，逐字照抄） ──
const S = (v) => (v === undefined || v === null ? '' : v === true ? '1' : v === false ? '0' : String(v));
const L = (v) => {
  const a = v ?? [];
  return [String(a.length), ...a.map(String)].join('\u0002');
};
function canon(t) {
  const mp = t.main_prompt ?? {};
  const vr = t.variants ?? [];
  const vflat = [String(vr.length), ...vr.flatMap((x) => [x.label ?? '', x.cli ?? '', x.prompt ?? ''])]
    .join('\u0002');
  return createHash('sha256')
    .update(
      [t.wake_word, t.category, S(t.key), S(t.name), S(t.subfunction), S(t.output_type), S(t.html_template),
        S(t.data_source), S(t.prompt_template), S(t.user_intent), S(t.order), S(t.depends_on_external),
        L(t.data_fields), S(t.desc), S(mp.cli), S(mp.text), L(t.aliases), L(t.fill_hints), vflat].join('\u0001'),
      'utf8',
    )
    .digest('hex')
    .slice(0, 16);
}

// ── 0. 冻结源完整性 ────────────────────────────────────────────────────────────
section('0. 冻结源完整性（只读，自算 git blob sha1）');
const CSV_PATH = rel('docs/research/t71-old-trigger-records.csv');
const SNAP_PATH = rel('test/calorie-sot.snapshot.json');
check('冻结表 t71-old-trigger-records.csv 未被改动（blob sha1 = HEAD）',
  blobSha(CSV_PATH) === FROZEN_CSV_SHA1, `实际 ${blobSha(CSV_PATH)}`);
info(`test/calorie-sot.snapshot.json blob sha1=${blobSha(SNAP_PATH)}`);

// ── 1. SoT 结构：436／10 分组／54 子功能／id 唯一 ────────────────────────────────
section('1. SoT 结构（436 / 10 分组 / 54 子功能 / id 唯一）');
check('SoT 条数 = 436', TRIGGERS.length === 436, `实际 ${TRIGGERS.length}`);
const ids = TRIGGERS.map((t) => t.key ?? t.wake_word);
check('SoT id 唯一 = 436/436（id := key ?? wake_word）', new Set(ids).size === 436, `唯一 ${new Set(ids).size}/436`);
info(`SoT 唤醒词字面唯一 ${new Set(TRIGGERS.map((t) => t.wake_word)).size}/436（「记身材照」×3 为 SoT 既有多重集）`);
check('CATEGORIES 13 分类原样保留', CATEGORIES.length === 13, `实际 ${CATEGORIES.length}`);

const sceneData = buildHelpSceneData({ updatedAt: '2026-09-09 12:00' });
const flat = sceneData.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
check('HELP 数据模型：10 分组', sceneData.groups.length === 10, `实际 ${sceneData.groups.length}`);
check('HELP 数据模型：54 子功能', sceneData.groups.reduce((k, g) => k + g.subgroups.length, 0) === 54,
  `实际 ${sceneData.groups.reduce((k, g) => k + g.subgroups.length, 0)}`);
check('HELP 数据模型：436 场景', flat.length === 436, `实际 ${flat.length}`);
check('HELP 数据模型：id 唯一 436/436', new Set(flat.map((s) => s.id)).size === 436,
  `唯一 ${new Set(flat.map((s) => s.id)).size}/436`);
const cliOf = (s) => {
  const f = (s.editable_fields ?? []).find((x) => x.name === 'cli');
  return f ? f.value : null;
};

// ── 2. 桶层：436 条恰一个桶 ───────────────────────────────────────────────────
section('2. 桶层（436 条路由／exec ／ non-exec／理由闭集）');
check('路由条数 = 436', WAKE_ROUTES.length === 436, `实际 ${WAKE_ROUTES.length}`);
check('路由与 SoT 逐位对齐（wakeWord）',
  WAKE_ROUTES.length === TRIGGERS.length && WAKE_ROUTES.every((r, i) => r.wakeWord === TRIGGERS[i].wake_word),
  `漂移 ${WAKE_ROUTES.filter((r, i) => r.wakeWord !== TRIGGERS[i]?.wake_word).length} 处`);
check('每条路由 kind ∈ {exec, non-exec}', WAKE_ROUTES.every((r) => r.kind === 'exec' || r.kind === 'non-exec'));

const sum = routingSummary();
const exec = WAKE_ROUTES.filter((r) => r.kind === 'exec');
const nonExec = WAKE_ROUTES.filter((r) => r.kind !== 'exec');
check('EXEC_ROUTES 与 kind=exec 计数一致', EXEC_ROUTES.length === exec.length, `${EXEC_ROUTES.length} vs ${exec.length}`);
check('HIT_NOT_EXEC_ROUTES 与 kind=non-exec 计数一致', HIT_NOT_EXEC_ROUTES.length === nonExec.length,
  `${HIT_NOT_EXEC_ROUTES.length} vs ${nonExec.length}`);
check('exec + non-exec = 436', exec.length + nonExec.length === 436);
check('routingSummary.total = 436', sum.total === 436, `实际 ${sum.total}`);

// #81 登记值对账（漂移必须显式登记，不得静默）
const driftExec = sum.exec - BASELINE_81.exec;
const driftNon = sum.nonExec - BASELINE_81.nonExec;
info(`#81 登记 exec ${BASELINE_81.exec} / non-exec ${BASELINE_81.nonExec} → 最终代码 exec ${sum.exec} / non-exec ${sum.nonExec}`
  + `（漂移 ${driftExec >= 0 ? '+' : ''}${driftExec} / ${driftNon >= 0 ? '+' : ''}${driftNon}）`);
info('归因（routing.ts 变更史）：ee8a1f0 #111 促进 10 词 ＋ 964c41f #112 促进 1 词 ＋ b23f72d #113 促进 4 词 ＝ 15 词 non-exec → exec');
check('漂移量 = #111／#112／#113 促进词数之和 15', driftExec === 15 && driftNon === -15, `实际 ${driftExec}/${driftNon}`);
check('non-exec 细分桶仅 {out-of-scope, legacy-chain}',
  nonExec.every((r) => r.bucket === 'out-of-scope' || r.bucket === 'legacy-chain'),
  `异常 ${nonExec.filter((r) => !['out-of-scope', 'legacy-chain'].includes(r.bucket)).length} 条`);
check('out-of-scope 计数与 OUT_OF_SCOPE_ROUTES 一致',
  nonExec.filter((r) => r.bucket === 'out-of-scope').length === OUT_OF_SCOPE_ROUTES.length);
check('out-of-scope = 10（#81 登记值）', OUT_OF_SCOPE_ROUTES.length === 10, `实际 ${OUT_OF_SCOPE_ROUTES.length}`);
const reasons = new Set(Object.values(NON_EXEC_REASONS));
const badReason = nonExec.filter((r) => !reasons.has(r.reason));
check('non-exec 的 reason 全部落在 NON_EXEC_REASONS 闭集内', badReason.length === 0,
  `越界 ${badReason.length} 条：${badReason.slice(0, 3).map((r) => r.wakeWord).join('／')}`);
info(`NON_EXEC_REASONS 闭集条数 ${reasons.size}`);
check('non-exec 每条 reason 非空字符串', nonExec.every((r) => typeof r.reason === 'string' && r.reason.length > 0));

// ── 3. exec 面 ────────────────────────────────────────────────────────────────
section('3. exec 面（唯一出口形态／键在 registry 内／单条命令形态）');
const SINGLE = /^calorie-cmd-read calorie\.[a-z0-9.-]+( --params '\{.*\}')?$/;
check('exec 每条 cli 前缀为唯一出口 `calorie-cmd-read calorie.`',
  exec.every((r) => r.cli.startsWith('calorie-cmd-read calorie.')),
  `异常 ${exec.filter((r) => !r.cli.startsWith('calorie-cmd-read calorie.')).length} 条`);
check('exec 每条 cli 为单条命令形态', exec.every((r) => SINGLE.test(r.cli)),
  `异常 ${exec.filter((r) => !SINGLE.test(r.cli)).length} 条`);
check('exec 每条 cli 键 token = r.key', exec.every((r) => r.cli.split(' ')[1] === r.key),
  `异常 ${exec.filter((r) => r.cli.split(' ')[1] !== r.key).length} 条`);
check('registry 键数 = 99（CALORIE_COMBOS 含 35 写键）', Object.keys(CALORIE_COMBOS).length === 99
  && Object.keys(CALORIE_WRITE_COMBOS).length === 35
  && Object.keys(CALORIE_WRITE_COMBOS).every((k) => k in CALORIE_COMBOS),
  `实际 ${Object.keys(CALORIE_COMBOS).length}／写 ${Object.keys(CALORIE_WRITE_COMBOS).length}`);
const KEY_REGISTRY = new Set(Object.keys(CALORIE_COMBOS));
const badKey = exec.filter((r) => !KEY_REGISTRY.has(r.key));
check('exec 每条 key 在 99 键 registry 内', badKey.length === 0,
  `越界 ${badKey.length} 条：${badKey.slice(0, 3).map((r) => `${r.wakeWord}=${r.key}`).join('／')}`);
check('有可执行入口的键 = 99/99（routingSummary.coveredKeys）', sum.coveredKeys === 99, `实际 ${sum.coveredKeys}`);
info(`旧唤醒词自身承接的 exec 键（字面去重）${new Set(exec.map((r) => r.key)).size}；其余键由新拟入口承接`
  + `（newEntries ${sum.newEntries} ＋ 覆盖修复 ${sum.repairEntries}）`);
check('exec cli 零 python 字面', exec.every((r) => !/python/i.test(r.cli)),
  `异常 ${exec.filter((r) => /python/i.test(r.cli)).length} 条`);

// ── 4. 冻结表逐字 parity（t71 CSV；旧文件序 ≠ 新场景序，故按多重集对账） ─────────
section('4. 冻结表逐字 parity（docs/research/t71-old-trigger-records.csv）');
const csvLines = readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
check('CSV 数据行 = 436', csvLines.length - 1 === 436, `实际 ${csvLines.length - 1}`);
const parseCsv = (l) => {
  const m = /^"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/.exec(l);
  if (!m) throw new Error('CSV 行无法解析：' + l);
  return { key: m[1], tpl: m[2], line: m[3], cat: m[4], wake: m[5] };
};
const csv = csvLines.slice(1).map(parseCsv);
const sorted = (a) => [...a].sort();
check('唤醒词多重集逐字一致（CSV ↔ SoT，436/436）',
  JSON.stringify(sorted(csv.map((r) => r.wake))) === JSON.stringify(sorted(TRIGGERS.map((t) => t.wake_word))),
  `差集 ${[...new Set(csv.map((r) => r.wake))].filter((w) => !new Set(TRIGGERS.map((t) => t.wake_word)).has(w)).slice(0, 5).join('／')}`);
check('(分类|唤醒词) 多重集逐字一致（CSV Cat ↔ SoT category）',
  JSON.stringify(sorted(csv.map((r) => `${r.cat}|${r.wake}`)))
  === JSON.stringify(sorted(TRIGGERS.map((t) => `${t.category}|${t.wake_word}`))),
  `不符 ${sorted(csv.map((r) => `${r.cat}|${r.wake}`)).filter((x, i) => x !== sorted(TRIGGERS.map((t) => `${t.category}|${t.wake_word}`))[i]).slice(0, 5).join('／')}`);
const csvWakeSet = new Set(csv.map((r) => r.wake));
check('CSV 唤醒词集 ⊆ 路由唤醒词集', [...csvWakeSet].every((w) => WAKE_ROUTES.some((r) => r.wakeWord === w)));
check('路由唤醒词集 ⊆ CSV 唤醒词集', WAKE_ROUTES.every((r) => csvWakeSet.has(r.wakeWord)));
info('CSV 行序 = 旧 _triggers.py 文件序，SoT 序 = 场景 01→10 分组序：逐位比对必然不等（本票按多重集对账）');

// ── 5. 冻结快照 sha parity（test/calorie-sot.snapshot.json） ──────────────────
section('5. 冻结快照 sha parity（test/calorie-sot.snapshot.json）');
const fix = JSON.parse(readFileSync(SNAP_PATH, 'utf8'));
check('快照 total = 436', fix.total === 436, `实际 ${fix.total}`);
check('快照 entry_sha 条数 = 436', Object.keys(fix.entry_sha).length === 436, `实际 ${Object.keys(fix.entry_sha).length}`);
const shaBad = [];
for (const t of TRIGGERS) {
  const k = t.key ?? t.wake_word;
  if (fix.entry_sha[k] !== canon(t)) shaBad.push(`${t.wake_word}|${k}`);
}
check('逐条 entry_sha 一致（436/436；canon 与 test/calorie-triggers.test.mjs 同构）', shaBad.length === 0,
  `不符 ${shaBad.length} 条：${shaBad.slice(0, 5).join('／')}`);
check('wake_multiset 一致（多重集，含「记身材照」×3）',
  JSON.stringify(sorted(TRIGGERS.map((t) => t.wake_word))) === JSON.stringify(fix.wake_multiset));
check('scene_counts 一致（10 场景 9/70/58/39/32/25/4/13/10/176）',
  JSON.stringify(fix.scene_counts) === JSON.stringify({ '01': 9, '02': 70, '03': 58, '04': 39, '05': 32, '06': 25, '07': 4, '08': 13, '09': 10, '10': 176 }));
check('getSummary 与冻结 summary 一致', JSON.stringify(getSummary()) === JSON.stringify(fix.summary));

// ── 6. 命中面：旧唤醒词在新版是否仍命中 ───────────────────────────────────────
section('6. 命中面（旧唤醒词 → 路由命中 ＋ HELP 速查命中 ＋ AI 面可执行 cli）');
const noRoute = TRIGGERS.filter((t) => !WAKE_ROUTES.some((r) => r.wakeWord === t.wake_word));
check('436 条旧唤醒词全部有路由命中（0 漏）', noRoute.length === 0,
  `漏 ${noRoute.length}：${noRoute.slice(0, 5).map((t) => t.wake_word).join('／')}`);
const noHelp = TRIGGERS.filter((t) => (HELP_LOOKUP[t.wake_word] ?? []).length < 1);
check('436 条旧唤醒词全部有 HELP 速查命中', noHelp.length === 0,
  `漏 ${noHelp.length}：${noHelp.slice(0, 5).map((t) => t.wake_word).join('／')}`);
const aliasMiss = [];
for (const t of TRIGGERS) for (const a of t.aliases ?? []) if ((HELP_LOOKUP[a] ?? []).length < 1) aliasMiss.push(a);
check('SoT aliases 全部有 HELP 命中', aliasMiss.length === 0, `漏 ${aliasMiss.length}：${aliasMiss.slice(0, 5).join('／')}`);
check("HELP_LOOKUP['记身材照'] = 3（一词三命中）", (HELP_LOOKUP['记身材照'] ?? []).length === 3,
  `实际 ${(HELP_LOOKUP['记身材照'] ?? []).length}`);

// AI 面（HELP 数据模型 editable_fields.cli）与路由层 exec cli 逐条同值
const routeByWord = new Map();
for (const r of WAKE_ROUTES) if (!routeByWord.has(r.wakeWord)) routeByWord.set(r.wakeWord, r);
const cliMis = [];
for (const s of flat) {
  const r = routeByWord.get(s.wake_word);
  if (r && r.kind === 'exec' && cliOf(s) !== r.cli) cliMis.push(`${s.wake_word}`);
}
check('AI 面 editable_fields.cli = 路由层 exec cli（341/341 逐字）', cliMis.length === 0,
  `不符 ${cliMis.length} 条：${cliMis.slice(0, 5).join('／')}`);
check('AI 面 exec cli 条数 = 341（= exec 桶）', flat.filter((s) => String(cliOf(s) ?? '').startsWith('calorie-cmd-read calorie.')).length === exec.length,
  `实际 ${flat.filter((s) => String(cliOf(s) ?? '').startsWith('calorie-cmd-read calorie.')).length}`);
check('AI 面 non-exec 场景条数 = 95（保留旧链 cli，理由码见路由层）', flat.length - flat.filter((s) => String(cliOf(s) ?? '').startsWith('calorie-cmd-read calorie.')).length === nonExec.length);

// ── 摘要 ─────────────────────────────────────────────────────────────────────
const pass = n - fails.length;
console.log(rows.join('\n'));
console.log('');
console.log(`DRIFT exec ${sum.exec}（#81 登记 ${BASELINE_81.exec}，${driftExec >= 0 ? '+' : ''}${driftExec}）`
  + ` / non-exec ${sum.nonExec}（#81 登记 ${BASELINE_81.nonExec}，${driftNon >= 0 ? '+' : ''}${driftNon}）`
  + ` / 细分 out-of-scope ${sum.outOfScope} · legacy-chain ${sum.legacyChain}`);
console.log(`PARITY csv 多重集 ${csv.length}/436 · snapshot entry_sha ${436 - shaBad.length}/436 · 冻结表 blob sha1 未改动`);
console.log(`RESULT: ${pass}/${n}`);
if (fails.length) {
  console.error('FAIL 明细：');
  for (const f of fails) console.error('- ' + f);
  process.exit(1);
}
