/** #367 · 呈现面的门（框架级）：「代表唤醒词必须是唤醒词表里真有的词」覆盖**每个能力目录**。
 *
 * 今天这道判据只在 `test/cmd-registry-294.test.mjs` 的「#294 对账」那一段跑**体重那一份**
 * （`for (const spec of WEIGHT_COMMANDS)`）；`docs/skills/skill-calorie/t266-review-报告.md` §D3
 * 当场量化过缺口：全包 109 条带代表唤醒词的声明里 **24 条不在 436 词表**（body 3 条正在其中）。
 * 本件**另立一件**把扫描面铺到全部能力目录（不改 #294 那一件的判据与棘轮数字）。
 *
 * 四条判据（期望值只认两份权威源本身：`src/triggers/wake-assets.ts` 的 436 词表／生成物注册表）：
 *  ① **扫描面覆盖**：`src/<能力>/commands.ts` 逐个目录进门，逐目录报读数（目录／声明条数／数组名）；
 *  ② **双向差集为空**：各能力目录声明的 (命令名 → 代表唤醒词) 配对集合 与 生成物注册表的同一集合，
 *     两个方向都必须是空集（`DIFF-DIR-ONLY 0`／`DIFF-REG-ONLY 0`）；
 *  ③ **真词**：每条写了代表唤醒词的声明，那个词必须在 436 词表里；
 *  ④ **登记表只许变短**：③ 报出来的行，若属别的图（非本票写集），逐行登记在 `REGISTERED_OFF_TABLE`
 *     （漏报即红＝新错行必被抓；陈化即红＝已清掉的行必须从登记表删掉）。
 *
 * 口径说明（写清楚免得被读成放宽）：
 *  - **没写代表唤醒词的声明不算错**——契约明写 `wakeWord` 可缺（缺了速查表退回列命令名，
 *    `shared/commandSpec.ts:45-48`），照片域三个流程内页就是照这条办的（#450）。本门对「缺词」只报读数。
 *  - 本门**只加扫描面**：不动任何棘轮数字、不改其它门（#294／#266／告警线门）的判据与读数。
 *
 * 负向对照（两行机器读数见 `docs/skills/skill-calorie/t367-门证据.md`）：
 *  - 从 `src/triggers/wake-assets.ts` 删掉一条**代表唤醒词**（本票取「看体脂」）→ 本门必红；
 *  - 逐字节还原 → 必绿。
 *
 * 运行：`node --test packages/skill-calorie/test/t367-唤醒词门.test.mjs`（读 `dist/`，须先
 * `tsc -b packages/skill-calorie`）。
 */
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { REGISTRY } from '../dist/cli/registry.js';
import { WAKE_ASSETS } from '../dist/triggers/wake-assets.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'src');
const DIST = join(HERE, '..', 'dist');

/** 唤醒词表（唯一事实源：用户看的 HELP 场景页同源的 436 条资产）。 */
const TABLE = new Set(WAKE_ASSETS.map((s) => s.wake_word));

/** 各能力目录（判据：目录里有 `commands.ts`——命令事实的唯一住处，见 `docs/agents/命令登记纪律.md` 形状一）。 */
const DIRS = readdirSync(SRC, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(SRC, e.name, 'commands.ts')))
  .map((e) => e.name)
  .sort();

/** 登记表：③ 报出来的、属**别的图**的行（本票只清身体域那 3 条，其余「登记后各归自己的图」）。
 *  逐行点名（能力目录／命令名／代表唤醒词），**只许变短**：被自己那一席清掉后必须删掉本表对应行
 *  （陈化即红，断言消息里给修法）。登记依据＝`docs/skills/skill-calorie/t266-review-报告.md` §D3 的
 *  全包量化（当时 24 条）＋ 本票开工前现场量测（`docs/skills/skill-calorie/t367-门证据.md` §一），
 *  逐条现场读数见该证据件。 */
const REGISTERED_BY_DIR = {
  analysis: { owner: '分析域自己的图（场景 10）', rows: [
    ['calorie.view.calorie-trend', '看热量趋势'],
    ['calorie.view.long-trend', '看整体趋势'],
    ['calorie.view.nutrition-analysis', '看营养分析'],
    ['calorie.view.deficit', '看热量缺口'],
    ['calorie.view.health', '看健康盘'],
    ['calorie.view.review-template', '看复盘报告'],
    ['calorie.view.six-factors', '看每日六因素'],
    ['calorie.history', '查热量历史'],
  ] },
  diet: { owner: '饮食域自己的图（场景 02）', rows: [
    ['calorie.view.batch-import-preview', '看批量导入预览'],
    ['calorie.view.library', '查食品库'],
    ['calorie.view.nutrition-ratio', '查营养配比'],
    ['calorie.view.ranking', '查高热量排行'],
  ] },
  goal: { owner: '目标域自己的图（场景 06）', rows: [
    ['calorie.view.goal-status', '看目标状态'],
    ['calorie.view.goal-wizard', '看目标预检'],
  ] },
  // `calorie.help.center` 的「卡路里HELP」是老技能 `SKILL.md` 正文注册的**技能级 HELP 词**
  // （不在 436 场景词表内，出处见 `t450-词表订正.md` §一）——「本门该不该接受它」属 HELP 口径问题，
  // 归照片／HELP 侧裁定；裁定前按登记处理，不悄悄放宽。
  photo: { owner: '身材照片域自己的图（场景 09）／技能级 HELP 词口径待裁', rows: [
    ['calorie.help.center', '卡路里HELP'],
    ['calorie.photo.list', '看身材照'],
  ] },
  profile: { owner: '档案域自己的图（场景 07）', rows: [
    ['calorie.view.profile-wizard', '看档案预检'],
  ] },
  weight: { owner: '体重域自己的图（场景 03）', rows: [
    ['calorie.view.weight-review', '看体重复核'],
  ] },
  workout: { owner: '训练计划域自己的图（场景 05）', rows: [
    ['calorie.view.process-progress', '看落地训练进度'],
  ] },
};
const REGISTERED_OFF_TABLE = Object.entries(REGISTERED_BY_DIR)
  .flatMap(([dir, g]) => g.rows.map(([key, wakeWord]) => [dir, key, wakeWord]));

/** 一条声明行＝`{ dir, key, wakeWord }`；本判据只对「写了词」的行生效（缺词是契约允许的另一类，只读数）。 */
function offTableRows(rows, words, registered = new Set()) {
  return rows.filter((r) => typeof r.wakeWord === 'string' && r.wakeWord !== ''
    && !words.has(r.wakeWord) && !registered.has(r.dir + '|' + r.key));
}

const regKey = (dir, key) => dir + '|' + key;

/** 逐目录取声明数组：`dist/<能力>/index.js` 里**恰好一个**「元素都带 `calorie.` 键」的数组。 */
async function declarationsOf(dir) {
  const mod = await import(pathToFileURL(join(DIST, dir, 'index.js')).href);
  const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v)
    && v.length > 0
    && v.every((x) => x && typeof x === 'object' && typeof x.key === 'string' && x.key.startsWith('calorie.')));
  assert.equal(arrays.length, 1, `能力目录 ${dir} 的声明数组不是恰好一个（形状一：commands.ts 恰好导出一个声明数组）`);
  const [name, rows] = arrays[0];
  return { name, rows };
}

/** 全量扫一遍：`{ dir, array, rows, pairs }`。 */
async function scanAllDirs() {
  const out = [];
  for (const dir of DIRS) {
    const { name, rows } = await declarationsOf(dir);
    out.push({
      dir,
      array: name,
      rows: rows.map((r) => ({ dir, key: r.key, wakeWord: r.wakeWord })),
    });
  }
  return out;
}

const RESULT = { total: 0, passed: 0, failed: [] };

/** 每件判据一个小结：跑完在退出时落一行机器读数（写 fd 1，避免管道异步丢字）。 */
function check(name, fn) {
  RESULT.total += 1;
  test('#367 ' + name, async () => {
    try {
      await fn();
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

/* 全量扫一次，四条判据共用一份读数（每一步只读 dist，不写任何东西）。 */
const SCANNED = await scanAllDirs();
const ALL_ROWS = SCANNED.flatMap((s) => s.rows);
const WITH_WORD = ALL_ROWS.filter((r) => typeof r.wakeWord === 'string' && r.wakeWord !== '');
const BLANK = ALL_ROWS.filter((r) => typeof r.wakeWord !== 'string' || r.wakeWord === '');
const VIOLATIONS = ALL_ROWS.filter((r) => typeof r.wakeWord === 'string' && r.wakeWord !== '' && !TABLE.has(r.wakeWord));
const REGISTERED = new Set(REGISTERED_OFF_TABLE.map((e) => regKey(e[0], e[1])));
const UNREGISTERED = offTableRows(ALL_ROWS, TABLE, REGISTERED);

console.log('SCAN dirs=' + DIRS.length + ' table=' + TABLE.size + ' registry=' + Object.keys(REGISTRY).length);
for (const s of SCANNED) console.log('DIR ' + s.dir + ' array=' + s.array + ' decl=' + s.rows.length);
console.log('SCAN-TOTAL decl=' + ALL_ROWS.length + ' withWord=' + WITH_WORD.length + ' blank=' + BLANK.length);
console.log('OFF-TABLE ' + VIOLATIONS.length + ' registered=' + REGISTERED.size + ' unregistered=' + UNREGISTERED.length);
for (const r of VIOLATIONS) {
  console.log((REGISTERED.has(regKey(r.dir, r.key)) ? 'REGISTERED ' : 'UNREGISTERED ') + r.dir + ' ' + r.key + ' 「' + r.wakeWord + '」');
}

check('① 扫描面覆盖每个能力目录的声明', () => {
  assert.ok(DIRS.length >= 10, '能力目录少于 10 个（扫描面缩了？）：' + DIRS.join('、'));
  assert.ok(SCANNED.every((s) => s.rows.length > 0), '有目录一条声明都没解析出来：'
    + SCANNED.filter((s) => s.rows.length === 0).map((s) => s.dir).join('、'));
  // 扫描面＝注册表的定义地：注册表每个键都必须在某个能力目录的声明里（读数同上，不另立第二份名单）。
  const declared = new Set(ALL_ROWS.map((r) => r.key));
  const withoutSite = Object.keys(REGISTRY).filter((k) => !declared.has(k));
  assert.deepEqual(withoutSite, [], '注册表的键在各能力目录的声明里找不到定义地：' + withoutSite.join('、'));
});

check('② 声明与注册表的配对集合双向差集为空', () => {
  const dirPairs = new Map(ALL_ROWS.map((r) => [r.key, r.wakeWord ?? null]));
  const regPairs = new Map(Object.entries(REGISTRY).map(([k, v]) => [k, v.wakeWord ?? null]));
  const dirOnly = [...dirPairs].filter(([k, w]) => regPairs.get(k) !== w).map(([k, w]) => k + '→「' + w + '」');
  const regOnly = [...regPairs].filter(([k, w]) => dirPairs.get(k) !== w).map(([k, w]) => k + '→「' + w + '」');
  console.log('DIFF-DIR-ONLY ' + dirOnly.length + ' DIFF-REG-ONLY ' + regOnly.length);
  assert.deepEqual(dirOnly, [], '声明里有注册表没有的配对：' + dirOnly.join('；'));
  assert.deepEqual(regOnly, [], '注册表里有声明没有的配对：' + regOnly.join('；'));
});

check('③ 代表唤醒词必须是唤醒词表（436 条）里真有的词', () => {
  assert.ok(TABLE.size > 400, '词表条数异常（表被削了？）：' + TABLE.size);
  const list = UNREGISTERED.map((r) => r.dir + ' ' + r.key + '→「' + r.wakeWord + '」');
  assert.deepEqual(list, [], '这些代表唤醒词不在 ' + TABLE.size + ' 条词表里，且没进登记表：' + list.join('；'));
});

check('④ 登记表只许变短（陈化即红：已清掉的行必须删）', () => {
  const stillBad = new Set(VIOLATIONS.map((r) => regKey(r.dir, r.key)));
  const stale = REGISTERED_OFF_TABLE
    .filter((e) => !stillBad.has(regKey(e[0], e[1])))
    .map((e) => e[0] + ' ' + e[1] + '→「' + e[2] + '」');
  assert.deepEqual(stale, [], '登记表里有已经不算违规的行（别的图已清掉？请删掉本表对应行）：' + stale.join('；'));
});

check('⑤ 判据自证：合成夹具上「不在表里的词必被报出、在表里的词不报」', () => {
  const words = new Set(['真词']);
  const rows = [
    { dir: 'x', key: 'calorie.a', wakeWord: '真词' },
    { dir: 'x', key: 'calorie.b', wakeWord: '自造词' },
    { dir: 'x', key: 'calorie.c', wakeWord: undefined },
  ];
  const hits = offTableRows(rows, words);
  assert.deepEqual(hits.map((r) => r.key), ['calorie.b'], '自造假词的声明没被报出（门失明）');
  assert.deepEqual(offTableRows(rows, words, new Set(['x|calorie.b'])), [], '登记表的豁免位没生效');
  console.log('SELFTEST offTable=1 blank=0 registered=1');
});
