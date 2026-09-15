/** #276 · 「接对」第 1 处的门：`查高热量排行` 必须真的落在**高热量榜**上。
 *
 * 事实与成因：本条路由声明（`src/diet/routes.ts` 的 `list:'new', order:10`）`cli` 里丢了 `category`，
 * 而处理函数 `viewRanking` 的判据是「给了 `category` 才出单榜，否则出五类全榜」
 * （`src/diet/ranking.ts:24`）。于是词说「高热量排行」、实跑落成「全部排行」——#272 实测发现，裁定归本票。
 *
 * 三条判据（**派生式**，不是钉死字面量——榜单加一类、唤醒词加一条都不失锚）：
 *   ① 声明面：`查高热量排行` 那一行的 `category` 必须与「高热量」那一类榜的取值一致，
 *      且该取值必须住 `RANK_CATEGORIES`（榜单类别的唯一定义地），不在其中即红；
 *   ② 记录面：生成物 `routes.generated` 里同一条记录与声明件逐字一致（声明派生成记录，两处走散即红）；
 *   ③ 出口面：照**该行自己的 `cli`** 实跑，exit 0 且产物是完整文档，页题落在单榜上、不是全榜页。
 *
 * 另有两条守卫，钉的是同一族的坑：
 *   ④ 饮食域里**每一条**跑 `calorie.view.ranking` 的 exec 记录都必须带 `category`
 *      （这条是可派生的全量断言，不只钉被抽到的那一条）；
 *   ⑤ `看有备注的饮食记录` 的 `hasNote` 筛选参数不许在后续改动里被抹掉。
 *
 * 运行：先 `pnpm build`（本件从 `dist/` 导入），再
 *   node --test packages/skill-calorie/test/diet-ranking-route-t276.test.mjs
 * 隔离库跑（`SKILLS_DB_PATH` 指临时目录），真实 DB 零触碰。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { DIET_ROUTES } from '../dist/diet/routes.js';
import { RANK_CATEGORIES } from '../dist/diet/rankingPlate.js';
import { ALL_ROUTES } from '../dist/triggers/routes.generated.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 被钉的那条词与它该落的那一类榜（榜名与 `RANK_ZH` 同源，这里只用它做断言，不参与渲染）。 */
const TARGET_WORD = '查高热量排行';
const TARGET_CATEGORY = 'high_calorie';

/** 声明件里那一条记录（不在即红——词被删掉也是回归）。 */
const targetDecl = () => DIET_ROUTES.find((r) => r.wakeWord === TARGET_WORD);

/** 从 `calorie-cmd-read calorie.view.ranking --params '<json>'` 里取参数对象（取不到即红）。 */
function paramsOf(cli) {
  const m = /--params\s+'(\{.*\})'\s*$/.exec(String(cli ?? ''));
  assert.ok(m, '路由 cli 里没有可解析的 --params：' + String(cli));
  return JSON.parse(m[1]);
}

/** 隔离库：种子＝本窗 3 条饮食记录（高热量榜要的是有数据，内容不重要）。 */
function seedDir() {
  const dir = mkdtempSync(join(tmpdir(), 't276-rank-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  const rows = [
    ['2026-09-07', '08:10:00', '燕麦', 100, 389, 13, 66, 7],
    ['2026-09-07', '12:10:00', '鸡胸', 150, 200, 35, 2, 4],
    ['2026-09-07', '19:10:00', '米饭', 200, 500, 10, 90, 5],
  ];
  for (const [dt, t, name, g, cal, p, cb, f] of rows) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(dt, t, name, g, cal, p, cb, f);
  }
  db.close();
  // 钉钟：窗口词固定在 2026-09-07（`--require` 预载，与 seed 同轴），断言与真实当刻日期无关。
  return { dir, env: { SKILLS_DB_PATH: dir, FAKE_NOW_ISO: '2026-09-07T00:00:00' } };
}

/** 照路由行自己的 `cli` 实跑：`cli` 是 `--params '<json>'` 形状，参数原样传给它。 */
function runRouteCli(cli, env) {
  const p = paramsOf(cli);
  const argv = ['--require', join(HERE, 'freeze-clock.cjs'), BIN, 'calorie.view.ranking', '--params', JSON.stringify(p)];
  return spawnSync(NODE_BIN, argv, { encoding: 'utf8', env: { ...process.env, ...env } });
}

test('#276 ① 声明面：查高热量排行 的 category 落在权威榜单类别里', () => {
  const d = targetDecl();
  assert.ok(d, `声明件里找不到 ${TARGET_WORD}（词被删即回归）`);
  assert.equal(d.kind, 'exec', `${TARGET_WORD} 必须是可执行记录`);
  assert.equal(d.key, 'calorie.view.ranking', `${TARGET_WORD} 落在排行命令上`);
  const p = paramsOf(d.cli);
  assert.equal(p.category, TARGET_CATEGORY, `${TARGET_WORD} 的 category 丢了或指向别的榜`);
  assert.ok(
    RANK_CATEGORIES.includes(p.category),
    `category 取值 ${p.category} 不在 RANK_CATEGORIES（榜单类别的唯一定义地）里`,
  );
});

test('#276 ② 记录面：生成物与声明件逐字一致', () => {
  const d = targetDecl();
  const rec = ALL_ROUTES.find((r) => r.wakeWord === TARGET_WORD);
  assert.ok(rec, `记录面里找不到 ${TARGET_WORD}（漏了路由声明即本条红）`);
  assert.equal(rec.kind, 'exec');
  assert.equal(rec.key, d.key);
  assert.equal(rec.cli, d.cli, '记录面与声明件走散（声明改了没重跑 pnpm gen）');
});

test('#276 ③ 出口面：照该行 cli 实跑 exit 0，页题落在单榜上', () => {
  const { dir, env } = seedDir();
  try {
    const d = targetDecl();
    const r = runRouteCli(d.cli, env);
    assert.equal(r.status, 0, `实跑 exit ${r.status}；stderr 尾部=${String(r.stderr || '').slice(-400)}`);
    const envl = JSON.parse(r.stdout);
    assert.equal(envl.key, 'calorie.view.ranking');
    // 落点随 envelope 的 `data.output` 回传（默认写 <SKILLS_DB_PATH>/calorie_html/…）
    const out = envl.data?.output;
    assert.ok(typeof out === 'string' && out.length > 0, 'envelope 没回传落点');
    const html = readFileSync(out, 'utf8');
    // 完整文档（判据三档的第 ① 档：产物是能双击打开的 HTML）
    assert.match(html, /^<!doctype html>/i, '产物不是完整文档');
    assert.match(html, /charset/i, '产物缺 charset');
    assert.match(html, /<style>/, '产物缺样式');
    /* 页题在正文的页头（`页题` 就是读者看到的那一行），**不在 `<title>`**——整页模板的 `<title>`
       固定是 `DOC_TITLE`（「卡路里·饮食」），页族各页共用。单榜页头＝「排行 高热量榜 …」；
       全榜页头＝「全部排行 …」——正是本次接对的那一处差别。 */
    assert.match(html, /ilife-block-page-shell-title">排行\s*高热量榜/, '页头不是单榜（落成全榜或别的榜了）');
    assert.doesNotMatch(html, /全部排行/, '仍落成「全部排行」');
    // 单榜的读数按本类榜出数（全榜出的是 okCount/topN，两者不同源）
    assert.equal(envl.data?.metrics?.topCal, 500, '单榜读数没按高热量榜出数');
    assert.equal(envl.data?.metrics?.okCount, undefined, '读数是全榜那一套（okCount）');
    /* 裁定 1：命令键不上屏。**注意两处合法携带**（实测 ctx 已定位）：复制区双按钮的 `data-t` 载荷
       （数据三格式菜单要带 `【calorie · calorie.view.ranking】`、日志按钮要带第 4 段命令原文）——
       它们住属性值，不是读者看到的字。故判据＝**只剩可见文字**（剥掉注释、script／style、全部标签）
       之后不许再出现标识符。 */
    const visible = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '');
    assert.doesNotMatch(visible, /calorie\.view\.ranking/, '标识符上了屏（复制区之外还有一处）');
    // 判据三档的第 ① 档：产物落盘、字节如实
    assert.ok(html.length > 2000, '产物字节数不合理：' + html.length);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('#276 ④ 守卫：饮食域排行记录带的 category 一律取权威榜单类别（派生式，不只钉抽到的那条）', () => {
  const rankRows = DIET_ROUTES.filter(
    (r) => r.kind === 'exec' && r.key === 'calorie.view.ranking' && typeof r.cli === 'string',
  );
  assert.ok(rankRows.length >= 20, `跑排行命令的记录只有 ${rankRows.length} 条，样本面太窄`);
  /* **不断言「每条都必须带 category」**——那是错的：`看全部排行榜`／`查食物排行` 两条词说的就是
     五类榜的全景，带 category 反而错。本守卫钉的是另外两件可机械判定的事：
       ① 带了的，取值必须落在权威类别表里（防再次出现「随便写一个串」这类静默换页）；
       ② 每条词说的榜名与它带的类别必须**对得上**（词里出现某一类榜名 ⇒ 类别必须是那一类）。 */
  const boardOf = {
    high_calorie: '高热量榜', low_calorie: '低热量榜', frequent: '常吃榜',
    high_carb: '高碳水榜', high_protein: '高蛋白榜',
  };
  const badValue = [];
  const mismatched = [];
  for (const r of rankRows) {
    const c = paramsOf(r.cli).category;
    if (c === undefined) continue;
    if (!RANK_CATEGORIES.includes(c)) { badValue.push(`${r.wakeWord}=${c}`); continue; }
    const named = Object.keys(boardOf).filter((k) => String(r.wakeWord).includes(boardOf[k]));
    if (named.length === 1 && named[0] !== c) mismatched.push(`${r.wakeWord}: 类别=${c}，榜名=${boardOf[named[0]]}`);
  }
  assert.deepEqual(badValue, [], 'category 取值不在 RANK_CATEGORIES（榜单类别的唯一定义地）里：' + badValue.join('／'));
  assert.deepEqual(mismatched, [], '词说的榜与带的类别对不上：' + mismatched.join('／'));
  // 那两条「全都看」的词：**必须不带** category（带了就静默换页）
  const allBoards = rankRows.filter((r) => /全部|^查食物排行$/.test(String(r.wakeWord)));
  assert.ok(allBoards.length >= 2, '「全都看」那一族只剩 ' + allBoards.length + ' 条');
  const wrong = allBoards.filter((r) => paramsOf(r.cli).category !== undefined).map((r) => r.wakeWord);
  assert.deepEqual(wrong, [], '「全都看」的词带了 category ⇒ 会落成单榜：' + wrong.join('／'));
});

test('#276 ⑤ 守卫：看有备注的饮食记录 的 hasNote 筛选参数不许被抹掉', () => {
  const rows = DIET_ROUTES.filter((r) => r.key === 'calorie.today' && /备注/.test(String(r.wakeWord)));
  assert.ok(rows.length >= 1, '带备注的饮食记录词不见了');
  for (const r of rows) {
    assert.equal(paramsOf(r.cli).hasNote, true, `${r.wakeWord} 的 hasNote 筛选参数丢了`);
  }
});

/** 「看食品来源统计」那一族的词（编排者 2026-09-15 曾据旧读数派过「接错到分类食品列表」的活，本用例是那一处的门）。 */
const SOURCE_STATS_WORDS = ['看食品来源统计', '看食品来源分布'];

test('#276 ⑥ 看食品来源统计 落在来源统计页上（不是分类食品列表）', () => {
  // ① 声明面：两条词都落在 `calorie.view.source-stats` 上，一条也不许落 `calorie.view.library`
  const rows = SOURCE_STATS_WORDS.map((w) => DIET_ROUTES.find((r) => r.wakeWord === w));
  for (const [i, r] of rows.entries()) {
    assert.ok(r, `声明件里找不到 ${SOURCE_STATS_WORDS[i]}`);
    assert.equal(r.kind, 'exec', `${r.wakeWord} 必须是可执行记录`);
    assert.equal(r.key, 'calorie.view.source-stats', `${r.wakeWord} 接错命令了（应落来源统计，不是分类食品列表）`);
    assert.match(String(r.cli), /calorie-cmd-read calorie\.view\.source-stats\b/, `${r.wakeWord} 的 cli 与 key 不同源`);
  }
  // ② 记录面：生成物与声明件逐字一致（声明改了没重跑 pnpm gen 即红）
  for (const r of rows) {
    const rec = ALL_ROUTES.find((x) => x.wakeWord === r.wakeWord);
    assert.ok(rec, `记录面里找不到 ${r.wakeWord}`);
    assert.equal(rec.key, r.key);
    assert.equal(rec.cli, r.cli, `${r.wakeWord} 的记录面与声明件走散`);
  }
  // ③ 出口面：照该行 cli 实跑，出的是**来源统计页**，不是分类食品列表
  //    先量一条**空库负向读数**（两条命令的缺失阻断各有各的话，这也是它们不同源的证据）
  const empty = mkdtempSync(join(tmpdir(), 't276-src-empty-'));
  try {
    const er = spawnSync(NODE_BIN, ['--require', join(HERE, 'freeze-clock.cjs'), BIN, 'calorie.view.source-stats', '--params', '{}'], {
      encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: empty },
    });
    assert.notEqual(er.status, 0, '空库跑来源统计应当是缺失阻断');
    assert.match(String(er.stderr), /来源统计/, '空库的阻断语不是来源统计那条（接错命令即说不出这句）');
    assert.doesNotMatch(String(er.stderr), /先导入食品/, '空库的阻断语是分类食品列表那条（＝接错命令）');
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
  const { dir, env } = seedDir();
  try {
    const db = openDb(join(dir, 'calorie_data.db'));
    // 食品库要有行，来源统计才有「来源」可数（两张页取的都是 `nutrition_products`，判据看页头不是看有没有数据）
    db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '测试')").run();
    db.close();
    for (const r of rows) {
      const run = spawnSync(NODE_BIN, ['--require', join(HERE, 'freeze-clock.cjs'), BIN, r.key, '--params', '{}'], {
        encoding: 'utf8', env: { ...process.env, ...env },
      });
      assert.equal(run.status, 0, `${r.wakeWord} 实跑 exit ${run.status}；stderr=${String(run.stderr || '').slice(-300)}`);
      const envl = JSON.parse(run.stdout);
      assert.equal(envl.key, 'calorie.view.source-stats');
      const html = readFileSync(envl.data.output, 'utf8');
      assert.match(html, /^<!doctype html>/i, `${r.wakeWord} 的产物不是完整文档`);
      /* 判「出的是哪张页」只用**已实测的**区分物（见 `.scratch/t276/probe-t276.out.txt` 的对照读数）：
         来源统计页的页头带「来源统计」；
         分类食品列表（`calorie.view.library`）那一条路的页头是「食品库」。
         另有两条读数级区分：来源统计的 `metrics` 是 `total`＋`sources`，食品库的是 `total`＋`statsTotal`。 */
      const h1 = /ilife-block-page-shell-title">([^<]{0,120})</.exec(html);
      assert.ok(h1, `${r.wakeWord} 的页里没有页头`);
      assert.match(h1[1], /来源统计/, `${r.wakeWord} 的页头不是来源统计页（实测页头＝${h1[1]}）`);
      assert.doesNotMatch(h1[1], /食品库/, `${r.wakeWord} 出的是分类食品列表（页头＝${h1[1]}）`);
      assert.ok(typeof envl.data.metrics.sources === 'number', `${r.wakeWord} 的读数不是来源统计那一套（缺 sources）`);
      assert.equal(envl.data.metrics.statsTotal, undefined, `${r.wakeWord} 的读数是分类食品列表那一套（statsTotal）`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
