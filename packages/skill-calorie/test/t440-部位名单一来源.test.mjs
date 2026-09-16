/** #440 · 围度部位中文名单一来源并统一「肩围」。
 *
 * 期望值来源（只认需求原文与手算，不拿新实现输出当期望）：
 *   ① 用词裁定（票面 §目标）：`shoulder_cm` 是**软尺环绕量**（cm，库内现值 110cm），
 *      中文名统一「肩围」；其余 12 名沿既有字面（胸围/腰围/腹围/臀围/左大腿/右大腿/
 *      左小腿/右小腿/左上臂/右上臂/左前臂/右前臂）不动。
 *   ② 手算：13 名逐值冻结在 `PART_ZH`、13 列名逐值冻结在 `PART_FIELDS`
 *      （列序不动＝票面「不许动」条，与 `t361` 的 `SEED_13` 同一冻结序）；
 *      camel 参数名逐值冻结在 `PART_CAMEL`（命令参数名不许动）。
 *   ③ 结构判据（票面验收 ③④）：`packages/skill-calorie/src/**` 与 `test/**` 里
 *      **旧词**（肩部两字旧写法）零命中；13 名只允许在 `src/fetch/body.ts` 一处**定义**
 *      （`MEASUREMENT_ZH` 的定义行），另外 `src/triggers/scene-08-body.ts`／
 *      `src/triggers/wake-assets.ts` 的命中是**唤醒词 prompt 正本资产**（票面禁改），不是定义。
 *      旧词在本文件里一律由 `OLD_WORD` 拼出，故本文件自身不含该两字字面（判据 ③ 才能读作 0）。
 *   ④ 判据 ①②（跑命令看剥标签后的可见文本）：围度看页与对比围度页都「肩围出现、旧词零次」。
 * 负向对照（源码级变异，持锁另做，机器读数见证据）：
 *   M3 把唯一来源里 `shoulder_cm` 的中文名改回旧词 → 判据 ①② 同时变红；还原 → 同时变绿。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 *   `node --test packages/skill-calorie/test/t440-部位名单一来源.test.mjs`。
 * 真库零写入：一切数据走 mkdtemp tmp 库（`SKILLS_DB_PATH` 指过去），真库只读对账见证据。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { MEASUREMENT_FIELDS, MEASUREMENT_ZH, measureCamelName } from '../dist/fetch/body.js';
import { WIZARD_MEASURE_CAMEL, WIZARD_MEASURE_LABELS } from '../dist/body/wizardPlate.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SRC = join(PKG, 'src');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'calorie.view.body-measure';
const KEY_COMPARE = 'calorie.view.body-measure-compare';
const KEY_ADD = 'calorie.body.measure-add';
const DB_FILE = 'calorie_data.db';

/** 肩部旧用词（两字）：由两段拼出，使本文件不含该两字字面（票面判据 ③ 的口径）。 */
const OLD_WORD = '肩' + '宽';

const DAY_MS = 86400000;

/** 相对日：围度缺省窗口近 90 天，绝对日会随墙钟滑出窗口（日期腐坏），故取「近 N 天」。 */
function dayBefore(n) {
  return new Date(Date.now() - n * DAY_MS).toISOString().slice(0, 10);
}

/** 13 列名（冻结列序＝票面「不改列序」条；与 `t361` 的 `SEED_13` 同序）。 */
const PART_FIELDS = [
  'chest_cm', 'waist_cm', 'abdomen_cm', 'hip_cm',
  'left_thigh_cm', 'right_thigh_cm', 'left_calf_cm', 'right_calf_cm',
  'left_arm_cm', 'right_arm_cm', 'left_forearm_cm', 'right_forearm_cm',
  'shoulder_cm',
];

/** 13 部位冻结名表（与 `PART_FIELDS` 逐位对齐；中文名按票面用词裁定，肩部＝「肩围」）。 */
const PART_ZH = [
  '胸围', '腰围', '腹围', '臀围',
  '左大腿', '右大腿', '左小腿', '右小腿',
  '左上臂', '右上臂', '左前臂', '右前臂',
  '肩围',
];

/** 13 项 CLI／wizard camel 参数名（冻结：票面「不改命令名／示例」的同面口径）。 */
const PART_CAMEL = [
  'chestCm', 'waistCm', 'abdomenCm', 'hipCm',
  'leftThighCm', 'rightThighCm', 'leftCalfCm', 'rightCalfCm',
  'leftArmCm', 'rightArmCm', 'leftForearmCm', 'rightForearmCm',
  'shoulderCm',
];

/** prompt 正本资产（票面禁改）：这两件里的部位名是给用户看的唤醒词文本，不是中文名的定义地。 */
const TRIGGER_ASSETS = ['triggers/scene-08-body.ts', 'triggers/wake-assets.ts'];

/** 冻结种子：D-4 全填 13 项（肩围 110，照票面库内现值）；D-1 除左前臂外全填（肩围 110.5）。 */
function seedRows() {
  return [
    {
      n: 4, note: 'm4',
      chest_cm: 95, waist_cm: 80, abdomen_cm: 78, hip_cm: 92,
      left_thigh_cm: 55, right_thigh_cm: 55.5, left_calf_cm: 36, right_calf_cm: 36.2,
      left_arm_cm: 32, right_arm_cm: 32.1, left_forearm_cm: 26, right_forearm_cm: 26.3,
      shoulder_cm: 110,
    },
    {
      n: 1, note: 'm1',
      chest_cm: 96, waist_cm: 81, abdomen_cm: 79, hip_cm: 93,
      left_thigh_cm: 56, right_thigh_cm: 56.5, left_calf_cm: 37, right_calf_cm: 37.2,
      left_arm_cm: 33, right_arm_cm: 33.1, left_forearm_cm: null, right_forearm_cm: 27.3,
      shoulder_cm: 110.5,
    },
  ];
}

function mkTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 't440-'));
  const db = openDb(join(dir, DB_FILE));
  const cols = ['date', ...MEASUREMENT_FIELDS, 'note'];
  const stmt = db.prepare('INSERT INTO body_measurements (' + cols.join(', ') + ') VALUES ('
    + cols.map(() => '?').join(', ') + ')');
  for (const r of seedRows()) stmt.run(dayBefore(r.n), ...MEASUREMENT_FIELDS.map((f) => r[f]), r.note);
  db.close();
  return dir;
}

function runCli(args, dir) {
  return spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
}

/** 可见文本：先剥复制菜单的 `data-t`（载荷 JSON 不得漏进可见读数），再剥 script／style／标签。 */
function visibleText(html) {
  return html
    .replace(/data-t="[^"]*"/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
}

function visibleOfPage(r, label) {
  assert.equal(r.status, 0, label + ' exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(-400));
  const env = JSON.parse(r.stdout);
  return visibleText(readFileSync(env.data.output, 'utf8'));
}

const count = (text, word) => text.split(word).length - 1;

/** 单文件命中行（1 基行号）。 */
function hitsIn(file, word) {
  const lines = readFileSync(file, 'utf8').split('\n');
  return lines.map((l, i) => [i + 1, l]).filter(([, l]) => l.includes(word));
}

/** 递归列 `packages/skill-calorie/src` 下的 .ts（相对路径用 `/`）。 */
function srcFiles(dir = SRC, rel = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const relPath = rel === '' ? name : rel + '/' + name;
    if (statSync(full).isDirectory()) out.push(...srcFiles(full, relPath));
    else if (name.endsWith('.ts')) out.push(relPath);
  }
  return out;
}

test('#440 唯一来源：列序不动，MEASUREMENT_ZH 键序＝列序，13 名逐值（用词裁定 ＋ 手算冻结）', () => {
  assert.deepEqual([...MEASUREMENT_FIELDS], PART_FIELDS, '13 列名与列序都不许动（票面「不许动」条）');
  assert.equal(Object.keys(MEASUREMENT_ZH).length, 13, '唯一来源表应有 13 项');
  assert.deepEqual(Object.keys(MEASUREMENT_ZH), [...MEASUREMENT_FIELDS], '中文名键序应＝列序');
  assert.deepEqual(Object.values(MEASUREMENT_ZH), PART_ZH, '13 名应逐值等于票面裁定与手算冻结值');
  assert.equal(MEASUREMENT_ZH.shoulder_cm, '肩围', '肩部中文名应为「肩围」（用词裁定）');
  console.log('T440-READOUT source fields=' + MEASUREMENT_FIELDS.length
    + ' zh=' + Object.keys(MEASUREMENT_ZH).length + ' shoulder_zh=' + MEASUREMENT_ZH.shoulder_cm);
});

test('#440 判据③④：src 里旧词零命中；13 名的定义只在 fetch/body.ts 一处', () => {
  const files = srcFiles();
  const kuanHits = [];
  const namedFiles = new Map();
  for (const rel of files) {
    const file = join(SRC, ...rel.split('/'));
    for (const [line, text] of hitsIn(file, OLD_WORD)) kuanHits.push(rel + ':' + line + ' ' + text.trim().slice(0, 60));
    let n = 0;
    for (const name of PART_ZH) if (hitsIn(file, name).length > 0) n += 1;
    if (n > 0) namedFiles.set(rel, n);
  }
  assert.deepEqual(kuanHits, [], 'src 全树旧词应零命中（判据 ③）；命中：' + kuanHits.join(' | '));
  // 定义地：13 名齐备的只有一件（另两件是唤醒词 prompt 正本资产，票面禁改）。
  const full = [...namedFiles.entries()].filter(([, n]) => n === 13).map(([f]) => f).sort();
  assert.deepEqual(full, ['fetch/body.ts', ...TRIGGER_ASSETS].sort(),
    '13 名齐备的件应只有唯一来源与 prompt 正本资产（实测 ' + JSON.stringify(full) + '）');
  // 「够不成第二份表」：唯一来源与资产之外的件，任一件至多 1 个部位名（单点标签，不成表）。
  const heavy = [...namedFiles.entries()].filter(([f]) => !TRIGGER_ASSETS.includes(f)).filter(([, n]) => n >= 2);
  assert.deepEqual(heavy, [['fetch/body.ts', 13]], '别处不许再出现第二份 13 名表（实测 ' + JSON.stringify(heavy) + '）');
  const shoulderLines = hitsIn(join(SRC, 'fetch', 'body.ts'), PART_ZH[12]).map(([n]) => n);
  assert.equal(shoulderLines.length, 1, '`fetch/body.ts` 里肩部中文名应恰好 1 处（唯一来源的定义行）');
  console.log('T440-READOUT scan ' + OLD_WORD + '=' + kuanHits.length
    + ' 定义件=' + full.join(',') + ' 定义行=fetch/body.ts:' + shoulderLines[0]
    + ' 定义处数=' + shoulderLines.length + ' 单点标签件='
    + [...namedFiles.entries()].filter(([, n]) => n === 1).map(([f, n]) => f + ':' + n).join(','));
});

test('#440 展示层四件＋写侧映射一件：不再自持第二份中文名表', () => {
  // 冻结读数：五件的部位名命中数。`cross.ts` 的 1 处是 `PAIRS` 里**既有**的单点图例「腰围(cm)」
  // （#440 之前就在，不是 13 名表的一部分，本票不碰它）。
  const expected = {
    'body/bodyDocs.ts': 0,
    'body/compare.ts': 0,
    'body/wizardPlate.ts': 0,
    'analysis/cross.ts': 1,
    'body/log.ts': 0,
  };
  const actual = {};
  for (const [rel, want] of Object.entries(expected)) {
    const text = readFileSync(join(SRC, ...rel.split('/')), 'utf8');
    actual[rel] = PART_ZH.filter((name) => text.includes(name)).length;
    assert.equal(actual[rel], want, rel + ' 部位名命中数应为 ' + want + '（实测 '
      + actual[rel] + '：有余数即成第二份表，余数不足即丢了引用）');
    assert.ok(text.includes('MEASUREMENT_ZH') || text.includes('measureCamelName'),
      rel + ' 应引用唯一来源（MEASUREMENT_ZH／measureCamelName）');
  }
  console.log('T440-READOUT consumers 命中数=' + Object.entries(actual).map(([f, n]) => f + ':' + n).join(',')
    + ' 自持13名表=0 引用唯一来源=' + Object.keys(actual).length);
});

test('#440 键名换算：measureCamelName 13 项 ＋ wizard 两张表都是引用（不是第二份表）', () => {
  assert.deepEqual([...MEASUREMENT_FIELDS].map(measureCamelName), PART_CAMEL,
    'camel 换算应逐个等于冻结参数名（left_forearm_cm → leftForearmCm）');
  assert.deepEqual(Object.keys(WIZARD_MEASURE_CAMEL).sort(), [...PART_CAMEL].sort(), 'wizard camel 键集冻结');
  assert.deepEqual(Object.values(WIZARD_MEASURE_CAMEL).sort(), [...MEASUREMENT_FIELDS].sort(), 'camel 值集＝列名');
  for (const camel of PART_CAMEL) {
    const snake = WIZARD_MEASURE_CAMEL[camel];
    assert.equal(WIZARD_MEASURE_LABELS[camel], MEASUREMENT_ZH[snake], 'wizard 标签应逐项等于唯一来源（' + camel + '）');
  }
  assert.equal(WIZARD_MEASURE_LABELS.shoulderCm, '肩围', 'wizard「肩围」应来自唯一来源');
  console.log('T440-READOUT camel ' + PART_CAMEL.map((c) => c + '→' + WIZARD_MEASURE_CAMEL[c]).join(',')
    + ' labels_shoulder=' + WIZARD_MEASURE_LABELS.shoulderCm);
});

test('#440 判据①：围度看页（不带参数）可见文本「肩围」出现、旧词零次', () => {
  const dir = mkTmpDb();
  const text = visibleOfPage(runCli([KEY], dir), '围度看');
  const zh = count(text, '肩围');
  const kuan = count(text, OLD_WORD);
  assert.ok(zh >= 1, '可见文本应含「肩围」（实测 ' + zh + '）');
  assert.equal(kuan, 0, '可见文本不得含旧词（实测 ' + kuan + '）');
  console.log('T440-READOUT 判据① ' + KEY + ' 肩围=' + zh + ' ' + OLD_WORD + '=' + kuan + ' VERDICT=GREEN');
});

test('#440 判据②：对比围度页可见文本「肩围」出现、旧词零次', () => {
  const dir = mkTmpDb();
  const params = JSON.stringify({ date1: dayBefore(4), date2: dayBefore(1) });
  const text = visibleOfPage(runCli([KEY_COMPARE, '--params', params], dir), '对比围度');
  const zh = count(text, '肩围');
  const kuan = count(text, OLD_WORD);
  assert.ok(zh >= 1, '可见文本应含「肩围」（实测 ' + zh + '）');
  assert.equal(kuan, 0, '可见文本不得含旧词（实测 ' + kuan + '）');
  console.log('T440-READOUT 判据② ' + KEY_COMPARE + ' 肩围=' + zh + ' ' + OLD_WORD + '=' + kuan + ' VERDICT=GREEN');
});

test('#440 写侧参数映射（`body/log.ts` 由唯一来源派生）仍按 camel 键落库', () => {
  const dir = mkTmpDb();
  const d = dayBefore(0);
  const r = runCli([KEY_ADD, '--params', JSON.stringify({ date: d, waistCm: 85, shoulderCm: 110, note: 't440-add' })], dir);
  assert.equal(r.status, 0, '记围度 exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(-400));
  const db = openDb(join(dir, DB_FILE));
  const row = db.prepare('SELECT waist_cm, shoulder_cm FROM body_measurements WHERE date = ? AND note = ?')
    .get(d, 't440-add');
  db.close();
  assert.ok(row, '应落一行围度');
  assert.equal(row.waist_cm, 85, 'waistCm → waist_cm');
  assert.equal(row.shoulder_cm, 110, 'shoulderCm → shoulder_cm');
  console.log('T440-READOUT 写侧 waistCm→' + row.waist_cm + ' shoulderCm→' + row.shoulder_cm + ' VERDICT=GREEN');
});
