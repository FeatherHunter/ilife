// #63 主线①终局取证 · 对抗式审查席（第 1 席）独立探针。
//
// 目的：**不看被审报告结论**，用独立实现复算被审主张，并做归因／口径／墙钟攻击。
// 只读：进程内 import dist 编译产物 ＋ `git show` 读历史源（不跑任何 calorie CLI）。
// 退出码：0 = 全部探针自洽（不表示被审主张成立；成立与否由本脚本打印的实测值决定）。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, HELP_LOOKUP, TRIGGERS, getSummary } from '../../packages/skill-calorie/dist/triggers/index.js';
import { CALORIE_COMBOS, CALORIE_WRITE_COMBOS } from '../../packages/skill-calorie/dist/cli/keys.js';
import { buildHelpSceneData } from '../../packages/skill-calorie/dist/render/index.js';
import {
  COVERAGE_REPAIR_ROUTES, EXEC_ROUTES, HIT_NOT_EXEC_ROUTES, NEW_KEY_ROUTES,
  NON_EXEC_REASONS, OUT_OF_SCOPE_ROUTES, TWIN_WAKE_WORDS, WAKE_ROUTES, routingSummary,
} from '../../packages/skill-calorie/dist/triggers/routing.js';
import { HELP_EXEC_OVERRIDES } from '../../packages/skill-calorie/dist/triggers/help-lookup.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const rel = (p) => fileURLToPath(new URL(p, new URL('../../', import.meta.url)));
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const P = (s) => console.log(s);
const out = [];

// ───────────────────────────── A. 独立复算桶层 ─────────────────────────────
P('## A. 独立复算（进程内 import dist，本席自写）');
const wakeExec = WAKE_ROUTES.filter((r) => r.kind === 'exec');
const wakeNon = WAKE_ROUTES.filter((r) => r.kind !== 'exec');
const sum = routingSummary();
P(`A1 WAKE_ROUTES=${WAKE_ROUTES.length} exec=${wakeExec.length} non-exec=${wakeNon.length} 合计=${wakeExec.length + wakeNon.length}`);
P(`A2 routingSummary=${JSON.stringify(sum)}`);
P(`A3 EXEC_ROUTES=${EXEC_ROUTES.length} HIT_NOT_EXEC_ROUTES=${HIT_NOT_EXEC_ROUTES.length} OUT_OF_SCOPE=${OUT_OF_SCOPE_ROUTES.length}`);
const ids = TRIGGERS.map((t) => t.key ?? t.wake_word);
P(`A4 SoT TRIGGERS=${TRIGGERS.length} id 唯一=${new Set(ids).size} wake 字面唯一=${new Set(TRIGGERS.map((t) => t.wake_word)).size} CATEGORIES=${CATEGORIES.length}`);
const scene = buildHelpSceneData({ updatedAt: '2026-09-09 12:00' });
const flat = scene.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
P(`A5 HELP groups=${scene.groups.length} subgroups=${scene.groups.reduce((k, g) => k + g.subgroups.length, 0)} scenes=${flat.length} sceneId唯一=${new Set(flat.map((s) => s.id)).size}`);
const reasonSet = new Set(Object.values(NON_EXEC_REASONS));
const badReason = wakeNon.filter((r) => !reasonSet.has(r.reason));
P(`A6 NON_EXEC_REASONS 闭集=${reasonSet.size} 越界=${badReason.length}`);
const buckets = {};
for (const r of wakeNon) buckets[r.bucket] = (buckets[r.bucket] ?? 0) + 1;
P(`A7 non-exec 细分=${JSON.stringify(buckets)} bucket 越界=${wakeNon.filter((r) => !['out-of-scope', 'legacy-chain'].includes(r.bucket)).length}`);
P(`A8 键 registry CALORIE_COMBOS=${Object.keys(CALORIE_COMBOS).length} WRITE=${Object.keys(CALORIE_WRITE_COMBOS).length} exec key 越界=${wakeExec.filter((r) => !(r.key in CALORIE_COMBOS)).length}`);
P(`A9 路由↔SoT 逐位漂移=${WAKE_ROUTES.filter((r, i) => r.wakeWord !== TRIGGERS[i]?.wake_word).length}`);
const noRoute = TRIGGERS.filter((t) => !WAKE_ROUTES.some((r) => r.wakeWord === t.wake_word));
const noHelp = TRIGGERS.filter((t) => (HELP_LOOKUP[t.wake_word] ?? []).length < 1);
P(`A10 旧词无路由=${noRoute.length} 无 HELP=${noHelp.length} HELP['记身材照']=${(HELP_LOOKUP['记身材照'] ?? []).length}`);
const cliOf = (s) => { const f = (s.editable_fields ?? []).find((x) => x.name === 'cli'); return f ? f.value : null; };
const aiCli = flat.filter((s) => String(cliOf(s) ?? '').startsWith('calorie-cmd-read calorie.')).length;
P(`A11 HELP 数据模型 exec cli=${aiCli} non-exec 场景=${flat.length - aiCli}`);

// ───────────────── B. 独立验证 +15/−15 归因（git 历史逐 commit 解析） ─────────────────
P('\n## B. +15/−15 归因（本席自行解析各 commit 的 WAKE_ROUTES 源码）');
const COMMITS = ['52e6fc8', 'ee8a1f0', '964c41f', 'b23f72d', '18354fe', 'afdf8e5e'];
const parseRoutes = (sha) => {
  const src = git(['show', `${sha}:packages/skill-calorie/src/triggers/routing.ts`]);
  const start = src.indexOf('export const WAKE_ROUTES');
  const end = src.indexOf('export const COVERAGE_REPAIR_ROUTES');
  const block = src.slice(start, end < 0 ? undefined : end);
  const rows = [];
  for (const line of block.split(/\r?\n/)) {
    const w = /wakeWord:\s*'([^']+)'/.exec(line);
    if (!w) continue;
    const k = /kind:\s*'(exec|non-exec)'/.exec(line);
    rows.push({ wakeWord: w[1], kind: k ? k[1] : '??' });
  }
  return rows;
};
const sets = new Map();
for (const sha of COMMITS) {
  const rows = parseRoutes(sha);
  const ex = new Set(rows.filter((r) => r.kind === 'exec').map((r) => r.wakeWord));
  sets.set(sha, { rows, ex });
  P(`B  ${sha}  记录=${rows.length}  exec 记录=${rows.filter((r) => r.kind === 'exec').length}  non-exec 记录=${rows.filter((r) => r.kind !== 'exec').length}  exec 词唯一=${ex.size}`);
}
for (let i = 1; i < COMMITS.length; i += 1) {
  const a = sets.get(COMMITS[i - 1]);
  const b = sets.get(COMMITS[i]);
  const bSet = new Set(b.rows.map((r) => r.wakeWord));
  const aSet = new Set(a.rows.map((r) => r.wakeWord));
  const bExec = new Map(b.rows.map((r) => [r.wakeWord, r.kind]));
  const aExec = new Map(a.rows.map((r) => [r.wakeWord, r.kind]));
  const flippedIn = [...bSet].filter((w) => bExec.get(w) === 'exec' && aExec.get(w) === 'non-exec');
  const flippedOut = [...bSet].filter((w) => bExec.get(w) === 'non-exec' && aExec.get(w) === 'exec');
  const added = [...bSet].filter((w) => !aSet.has(w));
  const removed = [...aSet].filter((w) => !bSet.has(w));
  P(`B  ${COMMITS[i - 1]}→${COMMITS[i]}  non-exec→exec ${flippedIn.length}  exec→non-exec ${flippedOut.length}  新增词 ${added.length}  删除词 ${removed.length}`);
  if (flippedIn.length) P(`     翻转词：${flippedIn.join('／')}`);
  if (flippedOut.length) P(`     逆向：${flippedOut.join('／')}`);
}
const base = sets.get('52e6fc8').ex;
const head = sets.get('afdf8e5e').ex;
P(`B  #81(52e6fc8) exec=${base.size} → HEAD exec=${head.size}（差 ${head.size - base.size}）`);
P(`B  非三者引入的翻转（其余 commit 造成的）：${[...head].filter((w) => !base.has(w) && !sets.get('b23f72d').ex.has(w)).join('／') || '无'}`);

// ───────────────── C. 冻结源 parity（自算 blob sha ＋ 自写 canon） ─────────────────
P('\n## C. 冻结源 parity（本席自算）');
const blobSha = (p) => { const b = readFileSync(p); return createHash('sha1').update(`blob ${b.length}\u0000`).update(b).digest('hex'); };
const CSV = rel('docs/research/t71-old-trigger-records.csv');
const SNAP = rel('test/calorie-sot.snapshot.json');
const csvSha = blobSha(CSV); const snapSha = blobSha(SNAP);
const headCsv = git(['rev-parse', 'HEAD:docs/research/t71-old-trigger-records.csv']).trim();
const headSnap = git(['rev-parse', 'HEAD:test/calorie-sot.snapshot.json']).trim();
const dirty = git(['status', '--porcelain', '--', 'docs/research/t71-old-trigger-records.csv', 'test/calorie-sot.snapshot.json']).trim();
P(`C1 CSV blob sha1=${csvSha} HEAD=${headCsv} 相等=${csvSha === headCsv} 工作区脏=${dirty !== ''}`);
P(`C2 SNAP blob sha1=${snapSha} HEAD=${headSnap} 相等=${snapSha === headSnap}`);
P(`C3 与 #81 冻结值 61e28727c43d2091d7ee4058a2705031f1b68cb3 相等=${csvSha === '61e28727c43d2091d7ee4058a2705031f1b68cb3'}`);
// 自写 canon（独立实现：按快照语义从 test/calorie-triggers.test.mjs 复述，字段序自核）
const S = (v) => (v === undefined || v === null ? '' : v === true ? '1' : v === false ? '0' : String(v));
const L = (v) => { const a = v ?? []; return [String(a.length), ...a.map(String)].join('\u0002'); };
const canon = (t) => {
  const mp = t.main_prompt ?? {}; const vr = t.variants ?? [];
  const vflat = [String(vr.length), ...vr.flatMap((x) => [x.label ?? '', x.cli ?? '', x.prompt ?? ''])]
    .join('\u0002');
  return createHash('sha256').update([t.wake_word, t.category, S(t.key), S(t.name), S(t.subfunction),
    S(t.output_type), S(t.html_template), S(t.data_source), S(t.prompt_template), S(t.user_intent),
    S(t.order), S(t.depends_on_external), L(t.data_fields), S(t.desc), S(mp.cli), S(mp.text),
    L(t.aliases), L(t.fill_hints), vflat].join('\u0001'), 'utf8').digest('hex').slice(0, 16);
};
const fix = JSON.parse(readFileSync(SNAP, 'utf8'));
const shaBad = TRIGGERS.filter((t) => fix.entry_sha[t.key ?? t.wake_word] !== canon(t));
P(`C4 快照 total=${fix.total} entry_sha 条数=${Object.keys(fix.entry_sha).length} 本席 canon 不符=${shaBad.length}`);
const lines = readFileSync(CSV, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
const csv = lines.slice(1).map((l) => /^"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/.exec(l)).map((m) => ({ key: m[1], tpl: m[2], line: m[3], cat: m[4], wake: m[5] }));
const sorted = (a) => [...a].sort();
const wakeEq = JSON.stringify(sorted(csv.map((r) => r.wake))) === JSON.stringify(sorted(TRIGGERS.map((t) => t.wake_word)));
const catEq = JSON.stringify(sorted(csv.map((r) => `${r.cat}|${r.wake}`))) === JSON.stringify(sorted(TRIGGERS.map((t) => `${t.category}|${t.wake_word}`)));
P(`C5 CSV 数据行=${csv.length} wake 多重集等=${wakeEq} (cat|wake) 多重集等=${catEq}`);
P(`C6 快照 wake_multiset 等=${JSON.stringify(sorted(TRIGGERS.map((t) => t.wake_word))) === JSON.stringify(fix.wake_multiset)} scene_counts 等=${JSON.stringify(fix.scene_counts) === JSON.stringify({ '01': 9, '02': 70, '03': 58, '04': 39, '05': 32, '06': 25, '07': 4, '08': 13, '09': 10, '10': 176 })} getSummary 等=${JSON.stringify(getSummary()) === JSON.stringify(fix.summary)}`);
// CSV 更强 parity：冻结 cli 列是否仍与 SoT main_prompt.cli 一致（被审脚本**未**做此检查）
const csvCli = new Map(csv.map((r) => [r.wake, r.tpl]));
const cliDrift = TRIGGERS.filter((t) => csvCli.get(t.wake_word) !== t.main_prompt.cli);
P(`C7 追加探针 · CSV tpl 列 vs SoT main_prompt.cli 不符=${cliDrift.length}（前 3：${cliDrift.slice(0, 3).map((t) => t.wake_word).join('／')}）`);

// ───────────────── D. t81-route-evidence 必红断言与当前真值 ─────────────────
P('\n## D. t81-route-evidence.mjs 断言真值（本席自算，不跑脚本）');
const execAll = [...EXEC_ROUTES, ...NEW_KEY_ROUTES, ...COVERAGE_REPAIR_ROUTES];
const covered = new Set(execAll.map((r) => r.key));
const KEY_LIST = Object.keys(CALORIE_COMBOS);
P(`D1 covered.size=${covered.size}（脚本断言 77）KEY_LIST=${KEY_LIST.length} 无入口键=${KEY_LIST.filter((k) => !covered.has(k)).length}`);
P(`D2 NEW_KEY_ROUTES.length=${NEW_KEY_ROUTES.length}（脚本断言 34）COVERAGE_REPAIR_ROUTES=${COVERAGE_REPAIR_ROUTES.length}（断言 1）`);
const twinWords = new Set(TWIN_WAKE_WORDS);
const twinFlips = WAKE_ROUTES.filter((r) => twinWords.has(r.wakeWord)).length;
P(`D3 twinFlips=${twinFlips}（脚本断言 26）TWIN_WAKE_WORDS=${TWIN_WAKE_WORDS.length}（断言 24）`);
const frozenInternal = (t) => (typeof t.key === 'string' ? t.key : null);
let direct = 0; let override = 0;
const unaccounted = [];
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i]; if (r.kind !== 'exec') continue;
  const t = TRIGGERS[i];
  const internal = frozenInternal(t);
  if (r.cli === t.main_prompt.cli) direct += 1;
  else if (internal && HELP_EXEC_OVERRIDES[internal] === r.cli) override += 1;
  else if (twinWords.has(r.wakeWord)) { /* twin，已计 */ }
  else unaccounted.push(r.wakeWord);
}
P(`D4 exec 来源分解（本席自算）：direct=${direct} override=${override} twin=${twinFlips} 未归类=${unaccounted.length}`);
P(`D5 脚本口径分解：${direct}+${override}+${twinFlips}+222 = ${direct + override + twinFlips + 222} vs EXEC_ROUTES.length=${EXEC_ROUTES.length}（差 ${EXEC_ROUTES.length - (direct + override + twinFlips + 222)}）`);
P(`D6 未归类词（＝脚本「家族未派生但路由层为 exec」候选）：${unaccounted.join('／')}`);
const wiz = new Set(['定营养目标(自动算)', '定饮水目标(自动算)', '一键定全套目标', '批量导入食品', '校验批量导入']);
P(`D7 未归类词中属 wizard 的=${unaccounted.filter((w) => wiz.has(w)).length}（应为 0，否则「家族未派生」计数≠15）`);
const driftWords = [];
{
  const src = git(['show', 'HEAD:packages/skill-calorie/src/triggers/routing.ts']);
  P(`D8 routing.ts 源码 py 字面命中=${/python/i.test(src) ? 'YES' : 'no'}（断言应为 no）`);
}

// ───────────────── E. 墙钟／日期炸弹扫描（静态＋键级） ─────────────────
P('\n## E. 墙钟依赖扫描（exec cli 参数面 × CLI 源码 todayISO 面）');
const writeSrc = readFileSync(rel('packages/skill-calorie/src/cli/write.ts'), 'utf8').split(/\r?\n/);
const readSrc = readFileSync(rel('packages/skill-calorie/src/cli/cmd_read.ts'), 'utf8').split(/\r?\n/);
const keyOfLine = (lines, n) => {
  for (let i = n - 1; i >= 0; i -= 1) {
    const m = /case\s+'(calorie\.[a-z0-9.-]+)'\s*:/.exec(lines[i]);
    if (m) return m[1];
  }
  return '(no-case)';
};
const todaySites = [];
for (const [file, lines] of [['write.ts', writeSrc], ['cmd_read.ts', readSrc]]) {
  lines.forEach((ln, i) => {
    if (!/todayISO\(\)/.test(ln)) return;
    const key = keyOfLine(lines, i + 1);
    const guarded = /optStr\(params,\s*'date'\)|optStr\(params,\s*'today'\)|latestFoodDate\(db\)|needStr\(params,\s*'date'\)/.test(ln);
    todaySites.push({ file, line: i + 1, key, guarded, text: ln.trim().slice(0, 110) });
  });
}
for (const s of todaySites) P(`E1 ${s.file}:${s.line} key=${s.key} 显式日期兜底=${s.guarded ? 'yes' : 'NO'} :: ${s.text}`);
const todayKeys = new Set(todaySites.filter((s) => !s.guarded).map((s) => s.key));
P(`E2 无显式日期兜底的键（潜在墙钟面）=${[...todayKeys].join('／')}`);
const paramsOf = (cli) => {
  const i = String(cli).indexOf("--params '"); if (i < 0) return null;
  const s = String(cli).slice(i + 10); return JSON.parse(s.slice(0, s.lastIndexOf("'")));
};
const DATE_KEYS = ['date', 'start', 'end', 'targetDate', 'today', 'from', 'compareStart', 'compareEnd'];
const pinned = []; const unpinned = [];
for (const r of wakeExec) {
  const p = paramsOf(r.cli);
  const has = p && DATE_KEYS.some((k) => p[k] !== undefined);
  (has ? pinned : unpinned).push({ wakeWord: r.wakeWord, key: r.key, params: p });
}
P(`E3 exec 341 条：日期锚定（params 含日期键）=${pinned.length}，无日期锚=${unpinned.length}`);
const risky = unpinned.filter((x) => todayKeys.has(x.key));
P(`E4 无日期锚 ∩ 键源码有裸 todayISO() =${risky.length} 条：`);
for (const x of risky) P(`     ${x.wakeWord} → ${x.key} params=${JSON.stringify(x.params)}`);
P(`E5 其余无日期锚词（读侧 latestFoodDate 兜底，理论不随墙钟红）：${unpinned.filter((x) => !todayKeys.has(x.key)).length} 条`);
// 显式含"昨日/今天"语义的关键字
const yesterdayWords = wakeExec.filter((r) => /昨日|今天|今日|最近|本周|本月/.test(r.wakeWord));
P(`E6 唤醒词含相对时间语义=${yesterdayWords.length} 条；其中 copyFrom:yesterday 的=${wakeExec.filter((r) => /copyFrom"\s*:\s*"yesterday/.test(r.cli)).map((r) => r.wakeWord).join('／')}`);
const copyRoute = wakeExec.find((r) => /copyFrom/.test(r.cli));
P(`E7 复制昨日运动 cli=${copyRoute ? copyRoute.cli : '(缺)'}`);

// ───────────────── F. 门禁／基线面 ─────────────────
P('\n## F. 方法论攻击面');
const failset = readFileSync(rel('docs/research/t88-baseline/test-failset.txt'), 'utf8').split(/\r?\n/);
P(`F1 failset 条目=${failset.filter((l) => l.trim() !== '' && !l.startsWith(';')).length} 含 FX-81-5 白名单=${failset.some((l) => l.includes('FX-81-5'))}`);
P(`F2 failset 含 routing-81 文件级条目=${failset.some((l) => l.includes('calorie-routing-81'))}（文件级白名单=整文件豁免）`);
P(`F3 SKILL.md 首 3 字节=${readFileSync(rel('packages/skill-calorie/SKILL.md')).subarray(0, 3).toString('hex')}`);
P(`F4 HEAD=${git(['rev-parse', 'HEAD']).trim()} 工作区脏文件=${git(['status', '--porcelain']).trim().split(/\r?\n/).filter((l) => l.trim()).length}`);
P(`F5 系统日期（脚本所在机器）=${new Date().toISOString().slice(0, 10)}`);

P('\nRESULT: probe-complete（本脚本只打印实测值，判定见报告）');
