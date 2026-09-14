/** 票 #266 · 独立对抗审查席的自查探针（可复跑）。
 *
 * 运行：`node docs/skills/skill-calorie/t266-review-probe.mjs`（只读：不写任何文件、不改工作区）。
 * 前置：`dist/` 与 `packages/skill-calorie/SKILL.md` 是当刻盘上那一份（探针把哈希与 mtime 打进指纹行）。
 *
 * 四段读数（探针自己算，不采信实施席任何结论）：
 *  P1 以唤醒词为起点：场景 04 的 39 条权威唤醒词逐条走 `lookupWake`（HELP 那张 436 词表）→
 *     查到的命令是否＝冻结表该词自己的命令；再与 `src/exercise/routes.ts`／`src/home/routes.ts` 的
 *     `wake` 声明逐条对账；并统计「落在 `EXERCISE_COMMANDS` 那 10 条之内」的有几条、其余落在哪个键。
 *  P2 A 走法（6 条 `new` 记录留着）的代价量化：6 个新拟词在**用户可见面**（SKILL.md 速查台、
 *     卡路里_HELP 文件场景页、calorie.help.center 三态）还剩几处，以及机器面（路由声明／生成物）几处。
 *  P3 交付自洽范围：本探针不跑门禁（`pnpm gen:check` 属持锁动作，读数由审查席在锁内取、写进报告 §P3），
 *     这里只落「生成物指纹」（三件生成物的 sha256 ＋ mtime），供报告说明本次读数的时点。
 *  P4 票面六行表逐行核（**直接读源码文本**，不经 `dist/`，防「dist 陈旧导致假绿」）。
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const importDist = (rel) => import(pathToFileURL(join(PKG, 'dist', rel)).href);

const { EXERCISE_COMMANDS } = await importDist('exercise/index.js');
const { EXERCISE_ROUTES } = await importDist('exercise/routes.js');
const { HOME_ROUTES } = await importDist('home/routes.js');
const { WAKE_ASSETS, WAKE_GROUPS } = await importDist('triggers/wake-assets.js');
const { SCENE_04_EXERCISE } = await importDist('triggers/scene-04-exercise.js');
const { HELP_LOOKUP, lookupWake } = await importDist('triggers/index.js');
const { ALL_ROUTES, NEW_KEY_ROUTES, WAKE_ROUTES } = await importDist('triggers/routes.generated.js');
const { routesFor } = await importDist('triggers/routing.js');
const { buildHelpFileData, renderHelpFileHtml } = await importDist('photo/helpFile.js');
const { renderHelpCenterHtml } = await importDist('photo/helpCenter.js');

const OUT = [];
const say = (s) => { OUT.push(s); console.log(s); };
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12);
const lines = (text, needle) => text.split('\n').reduce((acc, l, i) => (l.includes(needle) ? (acc.push(i + 1), acc) : acc), []);
const cliKey = (cli) => { const m = String(cli ?? '').match(/^calorie-cmd-read\s+(\S+)/); return m ? m[1] : null; };

const COINED = ['看运动目标', '看力量总览', '看有氧总览', '看运动分类占比', '看运动复盘', '看运动消耗趋势'];

say('=== 指纹（本次读数的时点；任何一件变了即读数作废） ===');
for (const rel of ['packages/skill-calorie/src/exercise/commands.ts', 'packages/skill-calorie/src/exercise/routes.ts',
  'packages/skill-calorie/src/triggers/routes.generated.ts', 'packages/skill-calorie/src/cli/keys.ts',
  'packages/skill-calorie/SKILL.md', 'packages/skill-calorie/dist/exercise/commands.js']) {
  const p = join(ROOT, rel);
  say('FINGERPRINT ' + sha(p) + ' mtime=' + statSync(p).mtime.toISOString());
}

/* ── P1 以唤醒词为起点 ─────────────────────────────────────────────────────── */
const words = SCENE_04_EXERCISE.map((t) => t.wake_word);
const frozenKey = new Map(SCENE_04_EXERCISE.map((t) => [t.wake_word, cliKey(t.main_prompt.cli)]));
const p1 = { noHit: [], wrongKey: [], noDecl: [], keyMismatch: [], in10: 0, otherKeys: new Map(), inExerciseRoutes: 0, inHomeRoutes: 0 };
for (const w of words) {
  const key = frozenKey.get(w);
  const hits = lookupWake(HELP_LOOKUP, w);
  if (hits.length === 0) p1.noHit.push(w);
  else if (!hits.some((h) => cliKey(h.cli) === key)) p1.wrongKey.push(w + ' → ' + hits.map((h) => cliKey(h.cli)).join('／'));
  // 生成物里的 wake 桶条目**不带 `list` 字段**（桶即 list）；源声明（EXERCISE_ROUTES／HOME_ROUTES）才带。
  const decl = WAKE_ROUTES.find((r) => r.scene === '04' && r.wakeWord === w);
  if (decl === undefined) p1.noDecl.push(w + '（冻结表键 ' + key + '）');
  else if (decl.key !== key) p1.keyMismatch.push(w + '：声明 ' + decl.key + '，冻结表 ' + key);
  if (EXERCISE_ROUTES.some((r) => r.list === 'wake' && r.scene === '04' && r.wakeWord === w && r.key === key)) p1.inExerciseRoutes += 1;
  if (HOME_ROUTES.some((r) => r.list === 'wake' && r.scene === '04' && r.wakeWord === w && r.key === key)) p1.inHomeRoutes += 1;
  if (EXERCISE_COMMANDS.some((c) => c.key === key)) p1.in10 += 1;
  else p1.otherKeys.set(key, (p1.otherKeys.get(key) ?? 0) + 1);
}
say('');
say('=== P1 场景 04 权威唤醒词（39 条）→ lookupWake → 命令 ===');
say('P1 words=' + words.length + ' 解析到命令=' + (words.length - p1.noHit.length) + ' 命中命令＝冻结表该词的命令=' +
  (words.length - p1.noHit.length - p1.wrongKey.length) + ' 无 wake 声明=' + p1.noDecl.length + ' 声明键≠冻结表键=' + p1.keyMismatch.length);
say('P1 落在 EXERCISE_COMMANDS 那 10 条之内=' + p1.in10 + '／' + words.length + '；其余键：' +
  [...p1.otherKeys.entries()].map(([k, n]) => k + '×' + n).join('、'));
say('P1 声明落点对账：src/exercise/routes.ts wake=' + p1.inExerciseRoutes + '，src/home/routes.ts wake=' + p1.inHomeRoutes +
  '，合计=' + (p1.inExerciseRoutes + p1.inHomeRoutes) + '（应等于 39）');
for (const [name, arr] of [['无命中', p1.noHit], ['命中键不符', p1.wrongKey], ['无声明', p1.noDecl], ['声明键不符', p1.keyMismatch]]) {
  if (arr.length > 0) say('P1 红 ' + name + '：' + arr.join('；'));
}

/* ── P2 A 走法的代价量化 ──────────────────────────────────────────────────── */
const skillMd = readFileSync(join(PKG, 'SKILL.md'), 'utf8');
const autoStart = skillMd.indexOf('<!-- HELP-AUTO-START -->');
const autoEnd = skillMd.indexOf('<!-- HELP-AUTO-END -->');
const autoBlock = autoStart >= 0 && autoEnd > autoStart ? skillMd.slice(autoStart, autoEnd) : '';
const helpFileHtml = renderHelpFileHtml(buildHelpFileData(new Date()));
const center = { file: renderHelpCenterHtml({ mode: 'file' }).html, inline: renderHelpCenterHtml({ mode: 'inline' }).html, text: renderHelpCenterHtml({ mode: 'text' }).html };
const genSrc = readFileSync(join(PKG, 'src', 'triggers', 'routes.generated.ts'), 'utf8');
const routesSrc = readFileSync(join(PKG, 'src', 'exercise', 'routes.ts'), 'utf8');
const sceneWords = new Set(WAKE_GROUPS.find((g) => g.id === 'exercise').subgroups.flatMap((s) => s.scenes.map((x) => x.wake_word)));

/* P1e：把「场景页」从词表代理换成**真产物**（`卡路里_HELP` 文件 HTML）逐条核 10 条代表词。 */
const declaredWords = EXERCISE_COMMANDS.map((c) => c.wakeWord);
const helpFileText = renderHelpFileHtml(buildHelpFileData(new Date()));
const missHelp = declaredWords.filter((w) => !helpFileText.includes(w));
const missGroup = declaredWords.filter((w) => !sceneWordsOfGroup(w));
function sceneWordsOfGroup(w) {
  return WAKE_GROUPS.find((g) => g.id === 'exercise').subgroups.some((s) => s.scenes.some((x) => x.wake_word === w));
}
say('P1e 10 条代表词在「卡路里_HELP」文件产物里命中=' + (declaredWords.length - missHelp.length) + '／' + declaredWords.length +
  '；在 WAKE_GROUPS 运动组词表里命中=' + (declaredWords.length - missGroup.length) + '／' + declaredWords.length +
  '；缺（产物）=' + (missHelp.join('、') || '无') + '；缺（词表）=' + (missGroup.join('、') || '无'));

say('');
say('=== P2 6 个新拟词的面（A 走法代价） ===');
say('P2 场景页词表（WAKE_GROUPS 运动组）条数=' + sceneWords.size + '；HELP 文件 HTML 字符数=' + helpFileHtml.length +
  '；help.center 三态字符数 file/inline/text=' + center.file.length + '/' + center.inline.length + '/' + center.text.length);
const p2rows = [];
for (const w of COINED) {
  const cell = (text) => { const n = lines(text, w); return n.length + (n.length > 0 ? '@' + n.slice(0, 3).join(',') : ''); };
  const route = routesFor(w);
  p2rows.push([w,
    cell(skillMd), cell(autoBlock), cell(helpFileHtml), cell(center.file), cell(center.text), cell(center.inline),
    cell(genSrc), cell(routesSrc),
    sceneWords.has(w) ? 'IN' : 'not',
    lookupWake(HELP_LOOKUP, w).length,
    route.length > 0 ? route.length + '（' + route.map((r) => r.kind + ':' + r.key).join('／') + '）' : '0',
  ].join(' | '));
}
say('P2 行格式：词 | SKILL.md | SKILL.md·AUTO | HELP文件 | center.file | center.text | center.inline | routes.generated.ts | exercise/routes.ts | HELP场景页词表 | lookupWake命中 | routesFor');
for (const r of p2rows) say('P2 ' + r);
const userFacing = p2rows.map((r) => r.split(' | ')).map((c) => ({ w: c[0], skill: c[1], auto: c[2], help: c[3], cf: c[4], ct: c[5], ci: c[6], gen: c[7], src: c[8] }));
const visibleHits = userFacing.reduce((n, c) => n + [c.skill, c.auto, c.help, c.cf, c.ct, c.ci].reduce((m, x) => m + Number.parseInt(x, 10), 0), 0);
const machineHits = userFacing.reduce((n, c) => n + Number.parseInt(c.gen, 10) + Number.parseInt(c.src, 10), 0);
say('P2 合计：用户可见面（SKILL.md 全文＋AUTO 块＋HELP 文件＋center 三态）命中=' + visibleHits +
  '；机器面（routes.generated.ts ＋ src/exercise/routes.ts）命中=' + machineHits +
  '；其中 new 表声明条数=' + NEW_KEY_ROUTES.filter((r) => COINED.includes(r.wakeWord)).length +
  '／生成物 new 桶=' + NEW_KEY_ROUTES.length + '，wake 桶声明=' + WAKE_ROUTES.length + '、new 桶声明=' + NEW_KEY_ROUTES.length);
say('P2 场景页词表含新拟词？' + COINED.filter((w) => sceneWords.has(w)).join('、') + '（空＝一个都不含）');

/* ── P4 票面六行表（源码文本直读） ────────────────────────────────────────── */
const TICKET_TABLE = [
  ['calorie.view.exercise-distribution', '看运动类型分布'],
  ['calorie.view.exercise-trend', '看运动趋势'],
  ['calorie.view.exercise-recap', '运动复盘（本周）'],
  ['calorie.view.exercise-goal', '看今日运动（vs 目标）'],
  ['calorie.view.exercise-strength', '看力量训练总览'],
  ['calorie.view.exercise-cardio', '看有氧训练总览'],
];
const cmdSrc = readFileSync(join(PKG, 'src', 'exercise', 'commands.ts'), 'utf8');
say('');
say('=== P4 票面六行表逐行核（源码 src/exercise/commands.ts 文本） ===');
let p4bad = 0;
for (const [key, want] of TICKET_TABLE) {
  const line = cmdSrc.split('\n').find((l) => l.includes("key: '" + key + "'")) ?? '';
  const got = (line.match(/wakeWord: '([^']*)'/) ?? [])[1];
  const ok = got === want;
  if (!ok) p4bad += 1;
  say('P4 ' + (ok ? 'OK  ' : 'RED ') + key + ' 期望「' + want + '」实测「' + (got ?? '（无该字段）') + '」');
}
const declaredNow = [...cmdSrc.matchAll(/key: '(calorie\.[^']+)'[\s\S]*?wakeWord: '([^']*)'/g)].map((m) => [m[1], m[2]]);
say('P4 源码声明条数=' + declaredNow.length + '；与票面六行表不符=' + p4bad +
  '；声明里仍是新拟词的=' + declaredNow.filter(([, w]) => COINED.includes(w)).length);
say('P4 测试件是否进 pnpm test 通配：' + (readFileSync(join(ROOT, 'package.json'), 'utf8').includes('packages/skill-calorie/test/*.test.mjs') ? 'YES' : 'NO'));

/* ── 判定行 ──────────────────────────────────────────────────────────────── */
const p1fail = p1.noHit.length + p1.wrongKey.length + p1.noDecl.length + p1.keyMismatch.length + missHelp.length + missGroup.length;
const bad = p1fail + p4bad;
say('');
say('RESULT: P1 不通过项=' + p1fail + '（含 P1e 产物缺 ' + missHelp.length + '／词表缺 ' + missGroup.length +
  '）；P4 不通过项=' + p4bad + '；P2 用户可见面残留=' + visibleHits + '（机器面 ' + machineHits + '）→ ' + (bad === 0 ? 'PASS' : 'FAIL'));
process.exitCode = bad === 0 ? 0 : 1;
