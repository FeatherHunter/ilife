/** #647 靶向测试：分布行窄槽自适应＝**短名化**（一页验证）。
 *
 * **票面问题**：公共层分布行首栏写死 `minmax(0, 6em)`（13px 下＝78px）＋ `nowrap ＋ ellipsis`，
 * 「蛋白（推荐 10–20%）」实需 131px ⇒ 四档全被**静默裁**（D1，`t605-视觉复评.md:21`）。
 * **本票裁定（#646 拍板）**：短名化——名称栏只留短名（蛋白／碳水／脂肪），推荐范围归下方那张
 * 「推荐范围对比」表承担（该表本页恒出）。公共层那口窄槽一个字不碰（形状不动，动的是喂进去的标签）。
 *
 * **本探针守两条边界**（一页先行的意思就是这两条同时成立）：
 *   ① 本页（`calorie.view.nutrition-ratio`）三条分布行名称栏**只出短名**，且范围仍在本页可读
 *      （对比表里 `10%（…）／65%（…）` 这类下限上限逐档在位）；
 *   ② 同区块的另一族调用点（`calorie.view.diet-review` 那 8 词，经 `diet/review.ts`）**不传**短名开关 ⇒
 *      仍是老写法「蛋白（推荐 10–20%）」，一个字不变（10 页铺开归 #648，不在本票写集）。
 *
 * 跑法：`node --test packages/skill-calorie/test/t647-短名化-一页.test.mjs`
 * （先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）。
 * 本探针只在自己的临时库里出页，不落仓内文件。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 一条命令真跑一次：库与产物都落系统 tmp（收尾自证不落仓内件）。 */
function render(key, params) {
  const dir = mkdtempSync(join(tmpdir(), 't647-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  const out = join(dir, 't647-out.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  assert.equal(r.status, 0, key + ' 真跑失败：exit=' + r.status + ' :: ' + String(r.stderr).slice(0, 300));
  const html = readFileSync(out, 'utf8');
  return { html, bytes: statSync(out).size };
}

/** 分布行名称栏逐格文本（顺序即产物顺序）。 */
function rowNames(html) {
  return [...html.matchAll(/<span class="ilife-block-dist-row-name">([^<]*)<\/span>/g)].map((m) => m[1]);
}

/** 分布行值栏逐格文本（短名化只该动名称栏，值栏必须一位不差地留着）。 */
function rowValues(html) {
  return [...html.matchAll(/<span class="ilife-block-dist-row-val">([^<]*)<\/span>/g)].map((m) => m[1]);
}

const RATIO = render('calorie.view.nutrition-ratio', { window: '7d' });
const REVIEW = render('calorie.view.diet-review', { window: '7d' });

test('#647 ① 查营养配比：三条分布行名称栏只出短名（长标签不喂进 78px 槽）', () => {
  const names = rowNames(RATIO.html);
  assert.deepEqual(names, ['蛋白', '碳水', '脂肪'], '名称栏不是三行短名（顺序／条数／内容对不上）');
  assert.equal(names.some((n) => n.includes('（')), false, '名称栏里还留着括号长标签');
  /* 老写法在这个页面上一次都不该出现（它是「未开开关」的样子）。 */
  assert.equal(RATIO.html.includes('（推荐 '), false, '本页还残留老写法「（推荐 …）」');
});

test('#647 ② 查营养配比：推荐范围仍在本页可读（由对比表承担，一个字不少）', () => {
  assert.ok(RATIO.html.includes('推荐范围对比'), '对比表不在位（范围就没地方承担了）');
  for (const endpoint of ['10%（', '20%（', '45%（', '65%（', '35%（']) {
    assert.ok(RATIO.html.includes(endpoint), '对比表里读不到范围端点：' + endpoint);
  }
  /* 值栏（实际占比）照旧由分布行自己出——短名化只动名称栏，一位不差。
     交叉核对：行里的每个占比都要在对比表的「实际」列（`N 克（M%）`）里读得到。 */
  const values = rowValues(RATIO.html);
  assert.equal(values.length, 3, '分布行值栏条数变了');
  for (const v of values) {
    assert.match(v, /^\d+(\.\d+)?%$/, '值栏不再是百分比读数：' + v);
    assert.ok(RATIO.html.includes('（' + v + '）'), '对比表「实际」列与分布行值栏对不上：' + v);
  }
});

test('#647 ③ 一页边界：同区块的复盘页（看营养结构）仍走老写法，一个字不变', () => {
  const names = rowNames(REVIEW.html);
  assert.deepEqual(names, ['蛋白（推荐 10–20%）', '碳水（推荐 45–65%）', '脂肪（推荐 20–35%）'],
    '复盘页的名称栏被顺带改了（本票只开一页，#648 才铺开）');
});

test('#647 ④ 一页边界：看今日营养（同族另一条唤醒词）同样不动', () => {
  const today = render('calorie.view.diet-review', { window: '今日', entry: 'today-nutrition' });
  assert.ok(today.bytes > 0, '看今日营养没出页');
  const names = rowNames(today.html);
  /* 窄窗没记录时该页可能不进配比段——那样就没有分布行，边界由③兜；有行就必须是老写法。 */
  for (const n of names) {
    assert.ok(n.includes('（推荐 '), '看今日营养的名称栏被顺带改了：' + n);
  }
});
