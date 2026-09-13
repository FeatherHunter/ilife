#!/usr/bin/env node
/** #313 A 段 · 分区归属**第三方可复跑**的逐键复核 ＋ 分区不变式的独立探针。
 *
 * 一句话：**不读实施者的自述**，直接从三处观测事实重算一遍再逐键比对——
 *   ① `packages/skill-calorie/dist/triggers/routing.js`（键 → 场景的权威依据）；
 *   ② `packages/skill-calorie/src/cli/legacy/scene-NN.ts`（分区后的实际归属，读源文）；
 *   ③ `packages/skill-calorie/dist/.gen-inputs.json`（`pnpm build` 打的内容印记）。
 *
 * 复核口径（与实施者所用完全一致，见 t313a 证据 §判定规则）：
 *   一个键的场景号 ＝ `WAKE_ROUTES` ／ `NEW_KEY_ROUTES` ／ `COVERAGE_REPAIR_ROUTES` 三张表里
 *   提到该键的记录中，**按表优先级取首见（WAKE > NEW_KEY > COVERAGE_REPAIR），表内取场景号最小**；
 *   三张表都没提到 ⇒ `NO-EVIDENCE`（本次实测 0 条）。只看 `kind: 'exec'` 记录（只有它们带键）。
 *
 * 断言：
 *   A. **逐键归属一致**：每个基线键的实际所在文件 == 规则算出的场景号（并逐行印出依据）。
 *   B. **规则自洽**：按规则分片后每片条数 == 实际每个场景文件的声明条数。
 *   C. **每片只被一票用**：任何分片里不得出现别的场景的键。
 *   D. **生成器输入面**：内容印记的键集合 == 11 个声明源（`cli/legacy/scene-01..10.ts` ＋ `weight/commands.ts`），
 *      且不含旧单文件 `cli/legacyCommands.ts`；旧单文件本身也已不存在。
 *   E. **鉴别力探针**：跨片重复声明同一个键 → 生成期守卫必须抛，**且报错文案里同时出现两个文件的身份**。
 *      记账：规则只能回答「键属于哪个场景」，答不出「两个文件都写了它」——后者是文件内容的事实，
 *      必须有生成期守卫兜底（铁律二：一个键恰住一处）。
 *
 * 用法（仓库根，先 `pnpm build`）：`node docs/skills/skill-calorie/t313a-分区-重核.mjs`
 * 退出码：任一断言不过 → 1。摘要行以 `RESULT-`／`SUMMARY:` 开头。
 * 本脚本**只读**仓内文件，不写任何仓内文件。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const PKG = join(REPO, 'packages', 'skill-calorie');
const LEGACY_SRC = join(PKG, 'src', 'cli', 'legacy');
const TABLE_RANK = { WAKE_ROUTES: 0, NEW_KEY_ROUTES: 1, COVERAGE_REPAIR_ROUTES: 2 };

const routing = await import(pathToFileURL(join(PKG, 'dist', 'triggers', 'routing.js')).href);
const { mergeLegacyPartition } = await import(pathToFileURL(join(PKG, 'scripts', 'gen-cli.mjs')).href);

/* ── ① 权威依据：键 → 场景（规则重算） ─────────────────────────────────────────────────── */
const candidates = new Map();
for (const table of Object.keys(TABLE_RANK)) {
  for (const r of routing[table] ?? []) {
    if (r.kind !== 'exec') continue;
    const list = candidates.get(r.key) ?? [];
    list.push({ table, rank: TABLE_RANK[table], wakeWord: r.wakeWord, scene: r.scene });
    candidates.set(r.key, list);
  }
}
function sceneByRule(key) {
  const list = candidates.get(key);
  if (!list || list.length === 0) return null;
  const sorted = [...list].sort((a, b) => a.rank - b.rank || (a.scene < b.scene ? -1 : a.scene > b.scene ? 1 : 0));
  return {
    scene: sorted[0].scene,
    basis: 'routing.ts ' + sorted[0].table + ' 唤醒词「' + sorted[0].wakeWord + '」',
    scenes: [...new Set(sorted.map((c) => c.scene))],
  };
}

/* ── ② 实际归属：场景文件 → 声明（直接读源文并求值，不经任何中间产物） ───────────────────── */
const sceneFiles = readdirSync(LEGACY_SRC).filter((f) => /^scene-\d\d\.ts$/.test(f)).sort();
const perFile = new Map(); // file -> [{kind,key,...}]
const actual = new Map(); // key -> {scene, file, count}
for (const f of sceneFiles) {
  const scene = /^scene-(\d\d)\.ts$/.exec(f)[1];
  const decls = readFileSync(join(LEGACY_SRC, f), 'utf8')
    .split('\n')
    .filter((l) => l.trimStart().startsWith('{ kind: '))
    .map((l) => Function('return (' + l.trim().replace(/,$/, '') + ')')());
  perFile.set(f, decls);
  for (const d of decls) {
    const prev = actual.get(d.key);
    actual.set(d.key, { scene, file: f, count: (prev?.count ?? 0) + 1 });
  }
}

const baseline = JSON.parse(readFileSync(join(REPO, '.scratch', 't313', 'legacy-baseline-keys.json'), 'utf8'));
const rows = [];
let mismatch = 0;
let noEvidence = 0;
for (const key of baseline.keys) {
  const rule = sceneByRule(key);
  const act = actual.get(key);
  if (rule === null) {
    noEvidence += 1;
    rows.push({ key, rule: 'NO-EVIDENCE', actual: act?.scene ?? '（不在任何分片里）', ok: false });
    continue;
  }
  const ok = act !== undefined && act.scene === rule.scene && act.count === 1;
  if (!ok) mismatch += 1;
  rows.push({ key, rule: rule.scene, actual: act?.scene ?? '（不在任何分片里）', file: act?.file, basis: rule.basis, scenes: rule.scenes, ok });
}
const extra = [...actual.keys()].filter((k) => !baseline.keys.includes(k));

console.log('RESULT-A: 逐键比对 ' + baseline.keys.length + ' 条；规则==实际 ' + (rows.filter((r) => r.ok).length) +
  '；不一致 ' + mismatch + '；无路由依据 ' + noEvidence + '；分片里的基线外键 ' + extra.length);
for (const r of rows) {
  console.log('  ' + (r.ok ? 'OK  ' : 'DIFF') + '  ' + r.key + '  规则=' + r.rule + '  实际=' + r.actual +
    (r.basis ? '  ← ' + r.basis : '') +
    (r.scenes && r.scenes.length > 1 ? '  （场景 ' + r.scenes.join('／') + ' 都提到该键，按规则取 ' + r.rule + '）' : ''));
}
if (extra.length) console.log('  基线外键：' + extra.join('、'));

/* ── ③ 不变式 B：规则分片条数 == 实际各片条数 ───────────────────────────────────────────── */
const ruleByScene = {};
for (const key of baseline.keys) {
  const rule = sceneByRule(key);
  if (!rule) continue;
  ruleByScene[rule.scene] = (ruleByScene[rule.scene] ?? 0) + 1;
}
let sizeMismatch = 0;
const sizes = [];
for (const f of sceneFiles) {
  const s = /^scene-(\d\d)\.ts$/.exec(f)[1];
  const want = ruleByScene[s] ?? 0;
  const got = perFile.get(f).length;
  if (want !== got) sizeMismatch += 1;
  sizes.push(s + ':' + got + (want === got ? '' : '≠规则' + want));
}
console.log('RESULT-B: 各片条数 ' + sizes.join(' ') + '；与规则不一致的片数 ' + sizeMismatch);

/* ── ④ 不变式 C：每片只被自己那一票用 ─────────────────────────────────────────────────── */
let crossUse = 0;
for (const f of sceneFiles) {
  const s = /^scene-(\d\d)\.ts$/.exec(f)[1];
  const foreign = perFile.get(f).map((d) => d.key).filter((k) => (sceneByRule(k)?.scene ?? s) !== s);
  if (foreign.length) {
    crossUse += 1;
    console.log('  跨片使用：' + f + ' 里出现别的场景的键 ' + foreign.join('、'));
  }
}
console.log('RESULT-C: 跨片使用 ' + crossUse + ' 处（应为 0）');

/* ── ⑤ 不变式 D：生成器输入面（内容印记）───────────────────────────────────────────────── */
const stamp = JSON.parse(readFileSync(join(PKG, 'dist', '.gen-inputs.json'), 'utf8'));
const wantSources = [...sceneFiles.map((f) => 'cli/legacy/' + f), 'weight/commands.ts'].sort();
const stampKeys = Object.keys(stamp.files).sort();
const stampOk = JSON.stringify(wantSources) === JSON.stringify(stampKeys);
console.log('RESULT-D: 印记声明源 ' + stampKeys.length + ' 件（期望 ' + wantSources.length + '）；一致=' + stampOk +
  '；含旧单文件=' + stampKeys.includes('cli/legacyCommands.ts') +
  '；旧单文件在盘上=' + existsSync(join(PKG, 'src', 'cli', 'legacyCommands.ts')));
if (!stampOk) {
  console.log('  印记：' + stampKeys.join(' '));
  console.log('  期望：' + wantSources.join(' '));
}

/* ── ⑥ 鉴别力探针 E：跨片同键必须抛 ─────────────────────────────────────────────────────── */
const parts = sceneFiles.map((f) => ({ name: f, list: perFile.get(f) }));
const real = mergeLegacyPartition(parts);
const realOk = real.length === baseline.keys.length;
let threw = null;
try {
  mergeLegacyPartition([...parts, { name: '能力 09 的合成声明（另一处）', list: [perFile.get('scene-03.ts')[0]] }]);
} catch (err) {
  threw = err.message;
}
const mentionsBoth = threw !== null && /scene-0\d\.ts/.test(threw) && /合成声明/.test(threw);
console.log('RESULT-E: 正常分片合流 ' + real.length + ' 条（应为 ' + baseline.keys.length + '）=' + realOk +
  '；跨片重复声明抛错=' + (threw !== null) + '；文案同时点出两处=' + mentionsBoth);
if (threw) console.log('  抛错文案：' + threw.slice(0, 200));
console.log('RESULT-E-记账: 规则只能答「' + perFile.get('scene-03.ts')[0].key + ' 属于场景 03」，' +
  '答不出「两个文件都写了它」——后者由生成期守卫 mergeLegacyPartition() 兜（铁律二）。');

const fail =
  mismatch + noEvidence + extra.length + sizeMismatch + crossUse +
  (stampOk ? 0 : 1) + (realOk ? 0 : 1) + (threw !== null && mentionsBoth ? 0 : 1) +
  (existsSync(join(PKG, 'src', 'cli', 'legacyCommands.ts')) ? 1 : 0);
console.log('SUMMARY: ' + (fail === 0 ? 'PASS' : 'FAIL') + '（失败项 ' + fail + '）');
process.exitCode = fail === 0 ? 0 : 1;
