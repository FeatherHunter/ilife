/** t265-review 自设探针（对抗审查专用，不碰禁区源码，只读 dist＋内存变异）。
 *
 * 用法：node docs/skills/skill-calorie/t265-review-probe.mjs <dist目录>
 * 例：node docs/skills/skill-calorie/t265-review-probe.mjs .scratch/t265-review/wt-8908144/packages/skill-calorie/dist
 *
 * P1 复盘5条中改回1条仍绿？——内存把单条 exec key 改回旧键，断言必须变红。
 * P2 order 打乱仍绿？——内存交换两条 order，词→位次映射必须对不上。
 * P3 冻结少同步1条 D2④是否咬？——内存把单条冻结 cli 改回旧键，逐字一致断言必须变红。
 * P4 收窄边界（放宽样例）——12 条窗口词必须仍指旧键；内存把其中 1 条改指新键，
 *    边界断言必须报警（范围被放宽）；且 7 条词不得残留旧键 exec 记录（搬迁无残留）。
 *
 * 每探针各打一行 GREEN（真态通过）与一行 RED（变异被咬）；exit 0 当且仅当
 * GREEN 全过且 RED 全被咬住。
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = process.argv[2];
if (!dist) {
  console.error('用法：node t265-review-probe.mjs <dist目录>');
  process.exit(2);
}
const { routesFor } = await import(pathToFileURL(join(dist, 'triggers/routing.js')).href);
const { SCENE_04_EXERCISE } = await import(pathToFileURL(join(dist, 'triggers/scene-04-exercise.js')).href);
const { EXERCISE_ROUTES } = await import(pathToFileURL(join(dist, 'exercise/routes.js')).href);
const { HOME_ROUTES } = await import(pathToFileURL(join(dist, 'home/routes.js')).href);
// 声明层词→order（搬迁落点 exercise 侧）；home 侧应已无此 7 词。
const declOrder = new Map(EXERCISE_ROUTES.filter((r) => r.list === 'wake').map((r) => [r.wakeWord, r.order]));
const homeWords = new Set(HOME_ROUTES.map((r) => r.wakeWord));

const OLD = 'calorie.view.exercise';
const CASES = [
  { word: '看运动类型分布', key: 'calorie.view.exercise-distribution', order: 167 },
  { word: '看运动趋势', key: 'calorie.view.exercise-trend', order: 170 },
  { word: '运动复盘（本周）', key: 'calorie.view.exercise-recap', order: 171 },
  { word: '运动复盘（本月）', key: 'calorie.view.exercise-recap', order: 172 },
  { word: '运动复盘（最近 90 天）', key: 'calorie.view.exercise-recap', order: 173 },
  { word: '运动复盘（今年）', key: 'calorie.view.exercise-recap', order: 174 },
  { word: '运动复盘（自定义时间）', key: 'calorie.view.exercise-recap', order: 175 },
];
const WINDOW_WORDS = [
  '看今日运动', '看昨日运动', '看本周运动', '看上周运动', '看本月运动', '看上月运动',
  '看最近 7 天运动', '看最近 30 天运动', '看某段时间运动',
  '看最近 60 天运动', '看最近 180 天运动', '看最近 365 天运动',
];

const execOf = (word) => routesFor(word).filter((x) => x.kind === 'exec');
const frozenOf = (word) => SCENE_04_EXERCISE.filter((t) => t.wake_word === word);
// 父态 cli ＝ 新 cli 逐字把新键换回旧键（与 c7a3518 实测逐字一致）。
const oldCliOf = (cli, key) => String(cli).split(key).join(OLD);

let greenOk = 0;
let greenFail = 0;
let redBit = 0;
let redMiss = 0;
const G = (name, cond, detail) => {
  if (cond) { greenOk += 1; console.log(`GREEN ${name} :: ${detail}`); }
  else { greenFail += 1; console.log(`GREEN-FAIL ${name} :: ${detail}`); }
};
const R = (name, bit, detail) => {
  if (bit) { redBit += 1; console.log(`RED ${name} :: ${detail}`); }
  else { redMiss += 1; console.log(`RED-MISS ${name} :: ${detail}`); }
};

// P0 真态基线
for (const c of CASES) {
  const exec = execOf(c.word);
  G('P0-route', exec.some((x) => x.key === c.key), `${c.word} 指 ${c.key}`);
  G('P0-no-stale', !exec.some((x) => x.key === OLD), `${c.word} 无旧键残留`);
  const rec = exec.find((x) => x.key === c.key);
  G('P0-order', rec !== undefined && declOrder.get(c.word) === c.order && !homeWords.has(c.word), `${c.word} 声明order=${declOrder.get(c.word)} 期望 ${c.order} 且home无残留`);
  const frozen = frozenOf(c.word);
  G('P0-frozen', frozen.length === 1 && frozen[0].main_prompt.cli === (rec === undefined ? null : rec.cli) && frozen[0].data_source === (rec === undefined ? null : rec.cli), `${c.word} 冻结逐字一致`);
}

// P1 复盘 5 条中改回 1 条：逐条内存改回旧键，`some(期望key)` 必须全灭（红）。
{
  const recaps = CASES.filter((c) => c.key === 'calorie.view.exercise-recap');
  let bite = 0;
  for (const c of recaps) {
    const mutated = execOf(c.word).map((x) => (x.key === c.key ? { ...x, key: OLD, cli: oldCliOf(x.cli, c.key) } : x));
    if (!mutated.some((x) => x.key === c.key)) bite += 1;
  }
  R('P1-recap-revert-1', bite === recaps.length, `复盘 ${bite}/${recaps.length} 条改回旧键后断言变红（改回1条即红，非改回5条才红）`);
  G('P1-recap-true', recaps.every((c) => execOf(c.word).some((x) => x.key === c.key)), '复盘 5 条真态全指 recap');
}

// P2 order 打乱：内存交换 170/171，词→位次映射必须对不上（红）。
{
  const byWord = new Map(CASES.map((c) => [c.word, declOrder.get(c.word)]));
  const swapped = new Map(byWord);
  swapped.set('看运动趋势', byWord.get('运动复盘（本周）'));
  swapped.set('运动复盘（本周）', byWord.get('看运动趋势'));
  const expect = new Map(CASES.map((c) => [c.word, c.order]));
  const same = (a, b) => [...a.keys()].every((k) => a.get(k) === b.get(k));
  R('P2-order-swap', !same(swapped, expect), 'order 170/171 打乱后词→位次映射失配被检出');
  G('P2-order-true', same(byWord, expect), '真态 7 条 order＝167/170-175 分毫不差');
}

// P3 冻结少同步 1 条：逐条内存改回旧 cli，逐字一致断言必须变红（红）；真态 7/7 一致（绿）。
{
  let bite = 0;
  for (const c of CASES) {
    const rec = execOf(c.word).find((x) => x.key === c.key);
    const fz = { ...frozenOf(c.word)[0] };
    fz.main_prompt = { ...fz.main_prompt, cli: oldCliOf(fz.main_prompt.cli, c.key) };
    fz.data_source = oldCliOf(fz.data_source, c.key);
    if (fz.main_prompt.cli !== rec.cli || fz.data_source !== rec.cli) bite += 1;
  }
  R('P3-frozen-miss-1', bite === CASES.length, `冻结 ${bite}/${CASES.length} 条少同步时 D2④逐字断言变红（少1条即咬）`);
  G('P3-frozen-true', CASES.every((c) => {
    const rec = execOf(c.word).find((x) => x.key === c.key);
    const fz = frozenOf(c.word)[0];
    return fz.main_prompt.cli === rec.cli && fz.data_source === rec.cli;
  }), '真态冻结 7 条 main_prompt.cli/data_source 逐字一致');
}

// P4 收窄边界：12 条窗口词仍指旧键（绿）；内存放宽 1 条改指新键即报警（红）。
{
  G('P4-narrow-true', WINDOW_WORDS.every((w) => {
    const e = execOf(w);
    return e.some((x) => x.key === OLD) && !e.some((x) => x.key !== OLD && /exercise-(distribution|trend|recap)/.test(x.key));
  }), `窗口 ${WINDOW_WORDS.filter((w) => execOf(w).some((x) => x.key === OLD)).length}/${WINDOW_WORDS.length} 条仍指旧键、0 条越界`);
  const w = '看最近 30 天运动';
  const widened = execOf(w).map((x) => (x.key === OLD ? { ...x, key: 'calorie.view.exercise-trend' } : x));
  R('P4-widen-1', widened.some((x) => /exercise-(distribution|trend|recap)/.test(x.key)), `放宽样例：${w} 改指 trend 后边界断言报警（收窄守住了7条，多1条即叫）`);
}

console.log(`--- 小结 GREEN过 ${greenOk} / GREEN败 ${greenFail} / RED咬住 ${redBit} / RED漏网 ${redMiss}`);
process.exit(greenFail === 0 && redMiss === 0 ? 0 : 1);
