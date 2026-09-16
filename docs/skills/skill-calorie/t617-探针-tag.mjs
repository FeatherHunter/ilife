/** #617 探针（随证据入仓的可复跑件）：预检确认页「识别出的字段」表那一列**不许把 HTML 标签字面量
 *  当可见文本印出来**。
 *
 *  判据（票面「验收命令」第 2 条）：`拍营养表记一餐` 与 `拍营养表补记一餐` 两页真出口产物里，
 *  `&lt;span` 与 `precheck-tag` **均不得作为可见文本**出现（样式段里的类名不计）；另跑一例带
 *  `uncertain` 的页，看「要你核对」那几枚标记还在（#617 改后由现成徽章件承担）。
 *
 *  跑法（在仓库根跑）：`node docs/skills/skill-calorie/t617-探针-tag.mjs [--out <目录>]`
 *  （缺省 `--out` 为空＝只出读数不落副本）。只读工作区：产物落系统临时库目录，副本只落给定目录。
 *  机器读数行：`T617 …`／`RESULT: n/n`；全绿 exit 0，任一页命中即 exit 1。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { stripCopyPayload, visibleText } from '../../../packages/skill-calorie/test/visible-text-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const outArg = process.argv.indexOf('--out');
const OUT = outArg >= 0 ? process.argv[outArg + 1] : null;

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 两条「拍营养表」唤醒词的真出口参数（照 `test/t277-预检确认页.test.mjs` 的 CASES 逐字）＋一例点名不确定。 */
const CASES = [
  {
    wake: '拍营养表记一餐', key: 'calorie.diet.add',
    params: { foodName: '鸡胸', calories: 200, protein: 35, carbohydrates: 2, fat: 4, note: '营养表识别', source: 'photo', entry: 'precheck' },
  },
  {
    wake: '拍营养表补记一餐', key: 'calorie.diet.add',
    params: { foodName: '米饭', calories: 500, protein: 10, carbohydrates: 85, fat: 5, date: SEED_TODAY, time: '12:30:00', note: '营养表补记', source: 'photo', entry: 'precheck' },
  },
  {
    wake: '预检确认页（点名两格不确定）', key: 'calorie.view.label-precheck',
    params: { productName: '酸奶', calories: 120, protein: 6, carbohydrates: 10, fat: 3, uncertain: 'protein,fat' },
  },
];

const dir = mkdtempSync(join(tmpdir(), 't617-probe-'));
const db = openDb(join(dir, 'calorie_data.db'));
seedFull(db);
db.close();

let green = 0;
for (const c of CASES) {
  const r = spawnSync(process.execPath, [CLI, c.key, '--params', JSON.stringify(c.params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  const path = env?.data?.output ?? null;
  const html = path !== null && existsSync(path) ? readFileSync(path, 'utf8') : '';
  const text = html === '' ? '' : visibleText(stripCopyPayload(html));
  /* 可见文本里的三类字面量：转义后的 `<span`、类名 `precheck-tag`、以及裸标签。 */
  const escaped = (text.match(/&lt;/g) ?? []).length;
  const naked = (text.match(/<span/g) ?? []).length;
  const cls = (text.match(/precheck-tag/g) ?? []).length;
  /* 标记仍在的读数：新结构（体里的公共层徽章 span）与旧类名各数一遍，供改前/改后对照
     （只数 `<span class="…">` 的体标记——样式段里那几条规则不许计入）。 */
  const badge = (html.match(/<span class="[^"]*ilife-status-badge/g) ?? []).length;
  const warn = (html.match(/<span class="[^"]*ilife-status-badge-warn/g) ?? []).length;
  const oldTag = (html.match(/precheck-tag is-check/g) ?? []).length;
  const ok = r.status === 0 && html !== '' && escaped === 0 && naked === 0 && cls === 0;
  if (ok) green += 1;
  console.log('T617 ' + c.wake + ' exit=' + r.status + ' bytes=' + html.length
    + ' 可见文本：&lt;=' + escaped + ' 裸<span=' + naked + ' precheck-tag=' + cls
    + ' ｜ 结构：徽章=' + badge + ' 橙徽章=' + warn + ' 旧类标记=' + oldTag
    + ' VERDICT=' + (ok ? 'GREEN' : 'RED'));
  if (!ok && r.status !== 0) console.log('T617 ' + c.wake + ' stderr 尾=' + String(r.stderr || '').trim().slice(-240));
  if (OUT !== null && html !== '') {
    mkdirSync(OUT, { recursive: true });
    copyFileSync(path, join(OUT, c.wake.replace(/[（）]/g, '') + '.html'));
  }
}
console.log('RESULT: ' + green + '/' + CASES.length + ' ' + (green === CASES.length ? 'PASS' : 'FAIL'));
process.exit(green === CASES.length ? 0 : 1);
