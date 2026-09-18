/** #266 · 场景 04 运动：代表唤醒词接线（HELP 场景页 与 速查台 不打架）。
 *
 * 判据先行（开工前实测，必须红）：这 10 条运动命令里有 4 条的代表唤醒词是 #111 那批新拟入口
 * （`看运动分类占比`／`看运动消耗趋势`／`看运动复盘` 三条用了新拟词，`-goal` 一条**没有**这个字段、
 * 速查表退回列命令键 `calorie.view.exercise-goal`），**不在**冻结的 437 条唤醒词表里；于是同一个场景
 * HELP 两边列出的词不一样：场景页列 39 条真词，速查台列 3 个用户不会说的新拟词 ＋ 1 个命令键
 * → 第 1、2、3 件断言当刻必红（先红读数见证据件 §判据先行）。
 *
 * 四件断言：
 *  1. `src/exercise/commands.ts` 每条声明都有代表唤醒词，且都在 437 条词表里
 *     （`src/triggers/wake-assets.ts` 的 `WAKE_ASSETS`，用户看的 HELP 场景页同源）；
 *  2. 重生成的 `SKILL.md` 速查表里，每条运动命令那一行列的正是它声明的代表唤醒词；
 *  3. **HELP 两边不打架**（判据重心）：对每条运动命令，速查台列的词
 *     ① 在 HELP 场景页（`WAKE_GROUPS` 的「运动」分组）也列着；
 *     ② 在冻结表 `scene-04-exercise.ts` 里指向**同一条命令**；
 *     ③ 走查找（`lookupWake`）也能查到**同一条命令**；
 *  4. 票面那张六行表的词逐条钉死，且六个新拟词不再是任一条声明里的代表唤醒词
 *     （本票自己加的一层：只断言「是真词」挡不住换错词）。
 *
 * 口径说明：票面正文写「9 条命令」，那是 #342 之前的数；#342 新增 `calorie.view.exercise-records`
 * 后本目录有 10 条声明，本测试按声明的全部 10 条断言（比票面口径更严，不放过任何一条）。
 *
 * 变异证据（自证两行，机器读数见 `docs/skills/skill-calorie/t266-接线证据.md`）：
 * - 变异红：把任一条的代表唤醒词改回新拟词（如 `看运动趋势` → `看运动消耗趋势`）→ 本测试变红；
 * - 还原一致：改回 → 全绿。
 *
 * 运行（本测试读 `dist/` 与磁盘上的 `SKILL.md`，两样都是派生物，得先派生出新鲜的一份）：
 * `pnpm build && pnpm gen && pnpm build && pnpm help:build`
 * 再 `node packages/skill-calorie/test/exercise-wakewords-266.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { readFileSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { EXERCISE_COMMANDS } from '../dist/exercise/index.js';
import { WAKE_ASSETS, WAKE_GROUPS } from '../dist/triggers/wake-assets.js';
import { SCENE_04_EXERCISE } from '../dist/triggers/scene-04-exercise.js';
import { HELP_LOOKUP, lookupWake } from '../dist/triggers/index.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = join(HERE, '..', 'SKILL.md');
const EVIDENCE = 'docs/skills/skill-calorie/t266-接线证据.md';

/** 票面「现在的代表唤醒词 → 应换成的真词」六行表（逐字照抄票面，命令 → 真词）。 */
const TICKET_TABLE = [
  ['calorie.view.exercise-distribution', '看运动类型分布'],
  ['calorie.view.exercise-trend', '看运动趋势'],
  ['calorie.view.exercise-recap', '运动复盘（本周）'],
  ['calorie.view.exercise-goal', '看今日运动（vs 目标）'],
  ['calorie.view.exercise-strength', '看力量训练总览'],
  ['calorie.view.exercise-cardio', '看有氧训练总览'],
];

/** 票面点名的六个新拟词（#111 那批）；换词后任一命令都不该再拿它们当代表唤醒词。 */
const COINED_WORDS = ['看运动分类占比', '看运动消耗趋势', '看运动复盘', '看运动目标', '看力量总览', '看有氧总览'];

/** 命令文本里抠命令名（唯一出口形态 `calorie-cmd-read <命令> …`）；不是这个形态即 null。 */
function cliKey(cli) {
  const m = String(cli ?? '').match(/^calorie-cmd-read\s+(\S+)/);
  return m ? m[1] : null;
}

/** HELP 场景页对场景 04 列出的词：`WAKE_GROUPS` 的「运动」分组逐场景（用户看的 HELP 内容源）。 */
function scenePageWords() {
  const group = WAKE_GROUPS.find((g) => g.id === 'exercise');
  assert.ok(group, 'WAKE_GROUPS 缺「运动」分组（id=exercise）');
  return group.subgroups.flatMap((s) => s.scenes.map((x) => x.wake_word));
}

/** 速查台：`SKILL.md` 生成块（`pnpm gen`＋`pnpm help:build` 派生）里命令 → 代表唤醒词。 */
function quickTable() {
  const text = readFileSync(SKILL_MD, 'utf8');
  const start = text.indexOf('<!-- HELP-AUTO-START -->');
  const end = text.indexOf('<!-- HELP-AUTO-END -->');
  assert.ok(start >= 0 && end > start, 'SKILL.md 缺 HELP-AUTO 生成块标记（速查表住那里）');
  const map = new Map();
  for (const line of text.slice(start, end).split('\n')) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(calorie\.[^|\s]+)\s*\|\s*[a-z-]+\s*\|/);
    if (m) map.set(m[2], m[1]);
  }
  assert.ok(map.size > 0, 'SKILL.md 速查表一行都没解析出来（表形状变了？）');
  return map;
}

/** 冻结表里每条命令各自的词（HELP 场景页那 39 条的权威记录面）。 */
function frozenWordsByKey() {
  const byKey = new Map();
  for (const t of SCENE_04_EXERCISE) {
    const key = cliKey(t.main_prompt.cli);
    if (key === null) continue;
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key).add(t.wake_word);
  }
  return byKey;
}

const RESULT = { total: 0, passed: 0, failed: [] };

/** 每件判据一个小结：跑完在退出时落一行机器读数（写 fd 1，避免管道异步丢字）。 */
function check(name, fn) {
  RESULT.total += 1;
  test('#266 ' + name, () => {
    try {
      fn();
      RESULT.passed += 1;
    } catch (err) {
      RESULT.failed.push(name);
      throw err;
    }
  });
}

process.on('exit', (code) => {
  const tail = RESULT.failed.length > 0 ? '（红：' + RESULT.failed.join('；') + '）' : '';
  writeSync(1, 'RESULT: ' + RESULT.passed + '/' + RESULT.total + ' 通过' + tail + ' exit=' + code + '\n');
});

check('运动每条命令的代表唤醒词都在 437 条词表里', () => {
  const words = new Set(WAKE_ASSETS.map((s) => s.wake_word));
  assert.equal(WAKE_ASSETS.length, 437, '冻结词表条数应为 437');
  assert.ok(EXERCISE_COMMANDS.length >= 9, '运动命令声明少于票面口径 9 条：' + EXERCISE_COMMANDS.length);
  const blank = EXERCISE_COMMANDS.filter((c) => typeof c.wakeWord !== 'string' || c.wakeWord === '');
  assert.deepEqual(blank.map((c) => c.key), [], '这些命令没有代表唤醒词（速查表会退回列命令名）');
  const off = EXERCISE_COMMANDS.filter((c) => !words.has(c.wakeWord))
    .map((c) => c.key + ' → 「' + c.wakeWord + '」');
  assert.deepEqual(off, [], '这些代表唤醒词不在 ' + WAKE_ASSETS.length + ' 条词表里：' + off.join('；'));
});

check('重生成的 SKILL.md 速查表按代表唤醒词列出运动命令', () => {
  const table = quickTable();
  const bad = [];
  for (const c of EXERCISE_COMMANDS) {
    const listed = table.get(c.key);
    if (listed !== c.wakeWord) bad.push(c.key + '：速查表列「' + listed + '」，声明是「' + c.wakeWord + '」');
  }
  assert.deepEqual(bad, [], '速查表与声明对不上：' + bad.join('；'));
});

check('HELP 两边不打架：速查台列的词在 HELP 场景页也列着且指向同一命令', () => {
  const pageWords = new Set(scenePageWords());
  const frozen = frozenWordsByKey();
  const bad = [];
  for (const c of EXERCISE_COMMANDS) {
    const word = c.wakeWord;
    if (!pageWords.has(word)) {
      bad.push('HELP 场景页没列「' + word + '」（命令 ' + c.key + '）');
    }
    const own = frozen.get(c.key);
    if (own === undefined || !own.has(word)) {
      bad.push('冻结表里没有「' + word + '」指向 ' + c.key +
        '（该命令在冻结表的词：' + [...(own ?? [])].join('／') + '）');
    }
    const hits = lookupWake(HELP_LOOKUP, word);
    if (!hits.some((h) => cliKey(h.cli) === c.key)) {
      bad.push('查找「' + word + '」查不到 ' + c.key +
        '（查到：' + hits.map((h) => cliKey(h.cli)).join('／') + '）');
    }
  }
  assert.deepEqual(bad, [], 'HELP 两边打架：' + bad.join('；'));
});

check('票面六行表的词逐条钉死，六个新拟词不再是任何一条的代表唤醒词', () => {
  const byKey = new Map(EXERCISE_COMMANDS.map((c) => [c.key, c.wakeWord]));
  const bad = [];
  for (const [key, word] of TICKET_TABLE) {
    const now = byKey.get(key);
    if (now !== word) bad.push(key + '：票面要求「' + word + '」，声明是「' + now + '」');
  }
  for (const c of EXERCISE_COMMANDS) {
    if (COINED_WORDS.includes(c.wakeWord)) bad.push(c.key + ' still 新拟词「' + c.wakeWord + '」');
  }
  assert.deepEqual(bad, [], '与票面六行表对不上（见 ' + EVIDENCE + '）：' + bad.join('；'));
});
