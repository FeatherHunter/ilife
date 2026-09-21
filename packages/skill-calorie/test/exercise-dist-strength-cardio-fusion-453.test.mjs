/** #453 · 场景 04 运动类型分布／力量总览／有氧总览（页面族第 4 票）：3 条读词逐条完整文档。
 *
 * 骨架照抄 `exercise-receipt-fusion-423.test.mjs`（`mkDir`／`runCli`／`cardOf`／`hasClass`／
 * `headTexts`／`assertDocPage` 逐字学，不另发明）；参数取冻结表 `src/triggers/scene-04-exercise.ts`
 * 的 `main_prompt.cli`——三条词逐字都是 `calorie-cmd-read <键> --params '{"window":"7d"}'`，
 * 故本票的「3 组冻结参数」＝三条词各一组（窗口 `7d` 逐字，日锚 `CALORIE_TODAY` 钉死，
 * 免得 7 天窗随机器日期漂；#250 起路由层的窗是相对窗）。
 *
 * 本票判据（机器读，逐条对上票面 1–6 条）：
 *   ① 分布页：分类占比迷你条（数字同格）＋分类表（含合计行）＋图走既有共享图表；
 *   ② 力量页：动作表＋重量轨迹，**口径写在标题里**（窗口＋「单侧口径 Σkg×次数」）；
 *   ③ 有氧页：类型表（缺值显「—」不空着）＋口径写页上；
 *   ④ 页头写人话（`<title>` 与眉标里无命令键／票号／工序词）；
 *   ⑤ 融合构件接线：来源脚注／页内导航（href 全有落点）／可打印／三格式复制（`data-fmt` 三项顺序固定）；
 *   ⑥ 空态带下一句话（力量给「记力量训练」、有氧给「记有氧运动」），且不出现空表；
 *   另：类别色单源（四类色只在 `src/exercise/categoryColors.ts` 定义一处）＋三类工程话全文零命中。
 *
 * 为什么没有四态头与变更卡载具（器件归类，不是漏做）：`shared/operationHead.ts` 的三张表是**写操作**
 * 四态（新增／修改／删除），只对写后回执成立；本族三页是只读页，硬套会印出与事实不符的态标签。
 * 同一裁定见姊妹票 #451（`exercise-records-fusion-451.test.mjs` 件头）。
 *
 * 变异自证两行（读数见 `docs/skills/skill-calorie/t453-分布力量有氧族融合.md`）：
 *   - 类别色改成写死字面量（不经 `categoryColor()`）→ 本测试必红；写回原字节必绿；
 *   - 有氧缺值兜底去掉（null 直出空单元格）→ 本测试必红；写回原字节必绿。
 * 两行都**先 `pnpm build` 再跑**（判据读 `dist/`，不编译则读数无效）。
 *
 * 运行：先 `pnpm build`，再 `node packages/skill-calorie/test/exercise-dist-strength-cardio-fusion-453.test.mjs`
 * （3 条产物同时落 `.scratch/t453/out/`，供人双击抽查）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { buildCardioDoc, buildDistributionDoc, buildStrengthDoc } from '../dist/exercise/sportPortDocs.js';
import { assertDocPage } from './doc-page-assert.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const REPO = join(PKG, '..', '..');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const SRC_DIR = join(PKG, 'src');
/** 样例产物落点（票面：落 `.scratch/t453/`，不进版本库，回执给可双击绝对路径）。 */
const SAMPLES = join(REPO, '.scratch', 't453', 'out');
/** 日锚（钉死 7 天窗＝2026-09-01 ~ 2026-09-07，种子全落窗内；真实使用不设它）。 */
const TODAY = '2026-09-07';
const D1 = '2026-09-01';
const D2 = '2026-09-04';
const D3 = '2026-09-05';
const D4 = '2026-09-06';
const D5 = '2026-09-07';
/** 三条词的键与冻结参数（`--params {"window":"7d"}` 逐字）。 */
const KEY = {
  distribution: 'calorie.view.exercise-distribution',
  strength: 'calorie.view.exercise-strength',
  cardio: 'calorie.view.exercise-cardio',
};
const WINDOW = { window: '7d' };
/** 眉标原字（页头人话；三条词各自的题面，判据读这一处）。
 *  #544：眉标去 `·`（`·` 是分隔符债，探针节点级必须为 0；类别与页族字都在）。
 *  #544 视觉第 1 轮曾把力量／有氧两页的眉标改成与 H1 逐字一致（`力量训练总览`），
 *  实测撞 `exercise-accept-267.test.mjs:528` 的「眉标＝它自己那一族」钉子（那件不在本票写集），已回退。 */
const EYEBROW = {
  distribution: '运动类型分布',
  strength: '力量训练总览',
  cardio: '有氧训练总览',
};
/** 四类色（**只在本测试里当期望值**；实现侧一律走 `categoryColor()`，不写第二份色表）。 */
const HEX = { strength: '#5856d6', cardio: '#0071e3', flex: '#34c759', daily: '#ff9500' };

mkdirSync(SAMPLES, { recursive: true });

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't453-exercise-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘（产物直接落样例目录，回执里的路径即用户双击的那一份）。 */
function runCli(dir, key, params, outName) {
  const out = join(SAMPLES, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(TODAY) },
  });
  const stdout = String(r.stdout || '').trim();
  const file = existsSync(out) ? readFileSync(out, 'utf8') : null;
  // 机读留痕：每条真跑的 exit 与产物字节数（证据件与门禁日志的可对账读数；字节数取 stat，不取字符数）。
  console.log('T453-RUN ' + (outName ?? key) + ' exit=' + r.status + ' bytes=' + (file === null ? 0 : statSync(out).size));
  return {
    status: r.status,
    out,
    stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    file,
  };
}

/** 页内某一张卡的区块 HTML（卡片外壳是裸 `<section id="...">`，内层区块不再有 `<section>`）。 */
function cardOf(html, id) {
  const hit = new RegExp('<section id="' + id + '">([\\s\\S]*?)</section>').exec(html);
  return hit === null ? '' : hit[1];
}

/** 类名**落在标记上**（不是落在那条常驻样式规则里）——判「有没有这张卡」只认标记。 */
function hasClass(html, name) {
  return [...html.matchAll(/class="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(name));
}

/** 页头文本（`<title>` 与眉标；人话判据读这两处）。 */
function headTexts(html) {
  return {
    title: (/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? '',
    eyebrow: (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html) ?? [])[1] ?? '',
  };
}

/** 某段子串在产物里出现几次（口径句「恰好一次」的判据）。 */
function countOf(html, text) {
  return html.split(text).length - 1;
}

/** 卡片里表头逐字逐序（`<th scope="col">`）。 */
function columnHeads(card) {
  return [...card.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
}

/** 卡片里可见数据行（`<tbody>` 的 `<tr>` 逐条数；表头在 `<thead>`，不进这个数）。 */
function bodyRows(card) {
  const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(card);
  return body === null ? [] : body[1].split('<tr>').slice(1);
}

/** 一行里的单元格文本（去标签、还原实体；断言逐格用）。 */
function cells(rowHtml) {
  return [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .map((m) => m[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim());
}

/** 3 条读词共用的融合版式断言（票面 ④⑤ ＋ 三类工程话全文零命中）。 */
function assertFusion(r, what, eyebrow) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assertDocPage(r.file, what);
  assert.ok(r.envelope !== null, what + ' stdout 不是信封 JSON');
  assert.equal(r.envelope.data.output, r.out, what + ' 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(r.envelope.data.output), what + ' 交付路径不是绝对路径');

  // ④ 页头写人话：<title> 与眉标不许出现命令键／票号／工序词「移植」。
  const head = headTexts(r.file);
  assert.equal(head.eyebrow, eyebrow, what + ' 眉标不是人话原字：' + head.eyebrow);
  assert.ok(head.title.startsWith('卡路里 '), what + ' <title> 不是人话题名：' + head.title);
  for (const [where, text] of [['<title>', head.title], ['眉标', head.eyebrow]]) {
    assert.ok(!/calorie\.[a-z]/.test(text), what + ' 的' + where + '里有命令键：' + text);
    assert.ok(!/\bt\d{3}\b/i.test(text), what + ' 的' + where + '里有票号：' + text);
    assert.ok(!text.includes('移植'), what + ' 的' + where + '里有工序词「移植」：' + text);
  }
  // 三类工程话**全文**零命中（命中数各 0；#423 审查 D1 的同一口径）。
  assert.equal(countOf(r.file, 'calorie.view.'), 0, what + ' 产物里出现命令键 calorie.view.*');
  assert.equal((r.file.match(/\bt\d{3}\b/gi) ?? []).length, 0, what + ' 产物里出现票号样式的字');
  assert.equal(countOf(r.file, '移植'), 0, what + ' 产物里出现工序词「移植」');

  // ⑤ 页内导航锚点：每个 href 都有对应的页内 id。
  assert.ok(r.file.includes('<nav class="ilife-block-toc" aria-label="页内导航">'), what + ' 缺页内导航');
  const ids = new Set([...r.file.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const hrefs = [...r.file.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 3, what + ' 页内导航只有 ' + hrefs.length + ' 个锚点');
  for (const href of hrefs) assert.ok(ids.has(href), what + ' 锚点 ' + href + ' 没有对应的页内 id');
  // ⑤ 可打印：类落版面根 ＋ 具名页绑定都在（#448 的 `printable` 透传位，端到端取证）。
  assert.ok(/<section class="[^"]*ilife-block-page-shell[^"]*ilife-page-printable[^"]*">/.test(r.file),
    what + ' 的 ilife-page-printable 没有落在版面根上');
  assert.ok(r.file.includes('page: printable'), what + ' 版面根没有绑定具名页 @page printable');
  assert.ok(r.file.includes('@page printable'), what + ' 样式段缺具名页 @page printable');
  // ⑤ 三格式复制菜单（顺序固定）。
  assert.deepEqual([...r.file.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
    what + ' 的复制数据不是三格式菜单');
  assert.ok(r.file.includes('复制数据'), what + ' 缺复制数据按钮');
  /* 复制日志按钮**本族三页没有、也不该有**（#715 更正）：`shared/copyArea.ts` 的契约是
     「给了什么出什么」（`copyArea` 出 0–3 颗按钮，日志位走 `log:` 入参），而本件五页共用同一条
     装配出口 `finishPage`（`sportPortDocs.ts:306-321` 的 `copyArea({ data: … })` 调用）——
     **只给 `data:`，从不给 `log:`** ⇒ 按契约就不该有日志按钮。
     本行原先断的 `'ilife-copy-log'` 是个 **class 字面**，而公共层 #247 起把复制区按钮改成
     `data-action-id="ilife-copy-log"`（`03b31e65` 改的是 `src/shared/copyArea.ts`，没动本件）——
     两个口径对不上 ⇒ 这条断言**从那天起就没成立过**，不是页面缺功能。
     判定依据（可复核）：#715 的搬迁判据把本族三页在**搬迁前后**逐字节比过（30/30 相同），
     而**搬前**的产物里 `ilife-copy-log` 命中就是 0 处（对照页 `calorie.view.diet-review` 命中 1 处）。
     复盘页（回执族）有日志按钮是另一族的事，见 `exercise-receipt-*` 那几件。 */
  // ⑤ 来源脚注 ＋ 口径行（都走 #420 的口径说明行）。
  // #544：来源脚注改键值行「数据来源／窗口／记录数」，不再是 `数据来源 · …` 那种 `·` 串。
  assert.ok(r.file.includes('数据来源'), what + ' 缺来源脚注');
  assert.ok((r.file.match(/class="ilife-block-caliber"/g) ?? []).length >= 2,
    what + ' 口径行／来源脚注不足两条（ilife-block-caliber）');
  // 饮食口径的「克」不许露（运动页不该出现饮食口径）。
  assert.equal(countOf(r.file, '克'), 0, what + ' 露出饮食口径的「克」');
  assert.ok(r.file.length > 10000, what + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
  return r.file;
}

/** 类别色单源：四组「键→色值」绑定全仓 `packages/**` 只许命中一个文件（`categoryColors.ts`）。
 *  跳过 `node_modules`／`dist`（构建产物不是定义地）；命中文件数与定义地逐条断言。 */
function assertColorSingleSource() {
  const targets = [
    ["strength: '#5856d6'", "strength:'#5856d6'"],
    ["cardio: '#0071e3'", "cardio:'#0071e3'"],
    ["flex: '#34c759'", "flex:'#34c759'"],
    ["daily: '#ff9500'", "daily:'#ff9500'"],
  ];
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
        walk(join(dir, e.name));
        continue;
      }
      if (!/\.ts$/.test(e.name)) continue;
      const text = readFileSync(join(dir, e.name), 'utf8');
      for (const forms of targets) {
        if (forms.some((form) => text.includes(form))) { files.push(join(dir, e.name).slice(REPO.length + 1)); break; }
      }
    }
  })(join(REPO, 'packages'));
  assert.deepEqual(files, ['packages\\skill-calorie\\src\\exercise\\categoryColors.ts'],
    '四类色表形状的命中文件数不是 1：' + JSON.stringify(files));
}

/** 种子：6 条运动落 7 天窗内，四类各至少一条；两条有氧**无距离**（缺值口径要用）。 */
function seedSix(dir) {
  const seeds = [
    // 力量两条（同一动作两日，轨迹要有两个点；单侧口径 Σkg×次数）
    { type: '卧推', calories: 150, minutes: 30, category: '力量', loadKg: 60, reps: 10, setIndex: 1, date: D3 },
    { type: '卧推', calories: 160, minutes: 32, category: '力量', loadKg: 65, reps: 10, setIndex: 1, date: D4 },
    // 有氧三条：两条有距离有步速（户外跑／骑行）、一条无距离（室内单车：距离与步速两格都缺值，
    // 时长那格仍有值 —— 原稿漏写 `minutes`，本票按本测试自己的冻结合计（197 分钟＝182＋15）
    // 与第 344 行「本行有 0 以外的分钟数」的注释补齐）。
    { type: '户外跑', calories: 300, minutes: 30, category: '有氧', distance: 5, date: D1 },
    { type: '骑行', calories: 350, minutes: 45, category: '有氧', distance: 12, date: D2 },
    { type: '室内单车', calories: 120, minutes: 15, category: '有氧', date: D5 },
    // 柔韧／日常各一条（四类色全覆盖）
    { type: '瑜伽', calories: 50, minutes: 20, category: '柔韧', date: D5 },
    { type: '步行', calories: 70, minutes: 25, category: '日常', steps: 3000, date: D5 },
  ];
  for (let i = 0; i < seeds.length; i += 1) {
    const r = runCli(dir, 'calorie.exercise.add', seeds[i], 'seed-' + i);
    assert.equal(r.status, 0, 'seed ' + i + ' stderr=' + r.stderr.slice(-200));
  }
}

/* ───────────────────── 3 条读词（冻结表逐字参数，逐条真跑） ───────────────────── */

test('#453 看运动类型分布（3 条之 1，先验形状第一条）', () => {
  const dir = mkDir();
  seedSix(dir);
  const r = runCli(dir, KEY.distribution, WINDOW, '01-distribution');
  const html = assertFusion(r, '看运动类型分布', EYEBROW.distribution);

  // ① 分类占比迷你条（数字同格：一行三栏「名称｜条｜数值」）。
  const ratio = cardOf(html, 'sec-ratio');
  assert.notEqual(ratio, '', '缺分类占比卡（sec-ratio）');
  assert.ok(hasClass(html, 'ilife-block-dist-row'), '缺分布条行（ilife-block-dist-row）');
  assert.ok(hasClass(html, 'ilife-block-dist-row-bar'), '分布条行缺条位');
  assert.ok(hasClass(html, 'ilife-block-dist-row-val'), '分布条行缺数值栏');
  // 四类色逐类落进迷你条（色值走 categoryColor() 的 hex，不是 token 名）。
  for (const [cat, hex] of Object.entries(HEX)) {
    assert.ok(ratio.includes(hex), '占比条缺「' + cat + '」的类别色 ' + hex);
  }
  assert.ok(!ratio.includes('var(--'), '占比条写的是 token 名而不是 hex 色值');

  // ① 分类表（次数／热量／占比／时长）＋合计行。
  const table = cardOf(html, 'sec-table');
  assert.notEqual(table, '', '缺分类表卡（sec-table）');
  assert.deepEqual(columnHeads(table), ['分类', '次数', '热量', '占比', '时长'],
    '分类表表头不是逐字逐序：' + JSON.stringify(columnHeads(table)));
  const rows = bodyRows(table);
  assert.equal(rows.length, 4 + 1, '分类表行数不是「四类＋合计」：' + rows.length);
  const total = cells(rows[rows.length - 1]);
  assert.equal(total[0], '合计', '分类表最后一行不是合计行：' + JSON.stringify(total));
  assert.equal(total[1], '7 次', '合计次数不是 7 次：' + JSON.stringify(total));
  assert.equal(total[2], '1200 卡', '合计热量不是 1200 卡：' + JSON.stringify(total));
  assert.equal(total[3], '100%', '合计占比不是 100%：' + JSON.stringify(total));
  assert.equal(total[4], '197 分钟', '合计时长不是 197 分钟：' + JSON.stringify(total));
  // 占比数字与迷你条同格（占比栏给「N%」，行内还有条）。
  assert.ok(rows.slice(0, 4).every((row) => /%/.test(cells(row).join(' '))), '分类行没给占比数字');

  // ① 图走既有共享图表（不是本页自造图形）。
  const chart = cardOf(html, 'sec-chart');
  assert.notEqual(chart, '', '缺图表卡（sec-chart）');
  assert.ok(chart.includes('ilife-block-chart-block'), '图表卡不是共享图表区块：' + chart.slice(0, 120));

  // 摄入/TDEE 联动（老实物那张折叠卡）仍在，但缺摄入不编数。
  assert.ok(countOf(html, '摄入/TDEE 联动') >= 1, '缺摄入/TDEE 联动卡片');
  assert.ok(html.includes('—'), '缺摄入应显「—」而不是空单元格');
  // 口径句（本页数字怎么来的）与窗口一致。
  assert.ok(html.includes('口径：'), '缺口径行');
  assert.ok(html.includes(D1 + ' → ' + D5), '来源脚注窗口不是 7 天窗：' + D1 + ' → ' + D5);
});

test('#453 看力量训练总览', () => {
  const dir = mkDir();
  seedSix(dir);
  const r = runCli(dir, KEY.strength, WINDOW, '02-strength');
  const html = assertFusion(r, '看力量训练总览', EYEBROW.strength);

  // ② 口径写在标题里：窗口 ＋ 「单侧口径 Σkg×次数」。
  // 表的标题＝B-03 表格自己的标题元素 `<caption class="ilife-block-data-table-caption">`
  // （原稿按 `<p class="…">` 读，而 `renderDataTable` 从不产出 `<p>`；本票改正读取元素，
  // 断言意图不变：读到的仍是这张动作表的标题原字）。
  const title = (/<caption class="ilife-block-data-table-caption">([^<]*)<\/caption>/.exec(html) ?? [])[1] ?? '';
  assert.ok(title.includes('2026-09-01 ~ 2026-09-07'), '动作表标题没写窗口：' + title);
  assert.ok(title.includes('单侧口径'), '动作表标题没写「单侧口径」：' + title);
  assert.ok(title.includes('Σkg×次数'), '动作表标题没写口径算式「Σkg×次数」：' + title);
  assert.equal(countOf(html, '单侧口径'), 1, '口径句在页上出现次数不是 1（会与标题重影）');

  // ② 动作表（按动作聚合）。
  const table = cardOf(html, 'sec-table');
  assert.notEqual(table, '', '缺动作表卡（sec-table）');
  assert.deepEqual(columnHeads(table), ['动作', '组数', '总重量', '总次数'],
    '动作表表头不是逐字逐序：' + JSON.stringify(columnHeads(table)));
  const rows = bodyRows(table);
  assert.equal(rows.length, 1, '动作表行数不是 1 个动作：' + rows.length);
  const bench = cells(rows[0]);
  assert.equal(bench[0], '卧推', '动作表缺动作名：' + JSON.stringify(bench));
  assert.equal(bench[1], '2 组', '组数不是 2 组：' + JSON.stringify(bench));
  assert.equal(bench[2], '1250 kg', '总重量不是 1250 kg（Σkg×次数 单侧口径）：' + JSON.stringify(bench));
  assert.equal(bench[3], '20 次', '总次数不是 20 次：' + JSON.stringify(bench));

  // ② 重量轨迹（共享图表；两个训练日两个点）。
  const chart = cardOf(html, 'sec-chart');
  assert.notEqual(chart, '', '缺重量轨迹卡（sec-chart）');
  assert.ok(chart.includes('ilife-block-chart-block'), '重量轨迹不是共享图表区块');
  assert.ok(chart.includes('重量轨迹'), '重量轨迹卡标题不带「重量轨迹」');

  // 明细列按运动口径，且页头是人话。
  const detail = cardOf(html, 'sec-detail');
  assert.notEqual(detail, '', '缺逐条记录卡（sec-detail）');
  assert.deepEqual(columnHeads(detail), ['日期', '动作', '重量×次数', '备注'],
    '逐条记录表头不是运动口径：' + JSON.stringify(columnHeads(detail)));
});

test('#453 看有氧训练总览', () => {
  const dir = mkDir();
  seedSix(dir);
  const r = runCli(dir, KEY.cardio, WINDOW, '03-cardio');
  const html = assertFusion(r, '看有氧训练总览', EYEBROW.cardio);

  // ③ 类型表（类型／次数／时长／距离／步速）——缺值显「—」不空着。
  const table = cardOf(html, 'sec-table');
  assert.notEqual(table, '', '缺类型表卡（sec-table）');
  assert.deepEqual(columnHeads(table), ['类型', '次数', '时长', '距离', '步速'],
    '类型表表头不是逐字逐序：' + JSON.stringify(columnHeads(table)));
  const rows = bodyRows(table).map(cells);
  assert.equal(rows.length, 3, '类型表行数不是 3 个类型：' + JSON.stringify(rows));
  const indoor = rows.find((cells0) => cells0[0] === '室内单车');
  assert.ok(indoor !== undefined, '类型表缺「室内单车」行：' + JSON.stringify(rows));
  assert.equal(indoor[1], '1 次', '室内单车次数不是 1 次：' + JSON.stringify(indoor));
  assert.equal(indoor[3], '—', '缺距离没有显「—」（不是空单元格）：' + JSON.stringify(indoor));
  assert.equal(indoor[4], '—', '缺步速没有显「—」（不是空单元格）：' + JSON.stringify(indoor));
  assert.ok(indoor[2] !== '', '缺时长的格不该空着（本行有 0 以外的分钟数）：' + JSON.stringify(indoor));
  // 每一次应显数字的格都不许是空串（「—」是允许的兜底，空单元格不是）。
  for (const row of rows) {
    assert.ok(row.length === 5, '类型表某行列数不是 5：' + JSON.stringify(row));
    assert.ok(row.every((cell) => cell !== ''), '类型表有空格子：' + JSON.stringify(row));
  }
  // ③ 口径写页上（距离／步速怎么算的，以及缺值怎么显）。
  assert.ok(html.includes('口径：'), '缺口径行');
  assert.ok(countOf(html, '—') >= 2, '缺值兜底「—」在页上不足两处');

  // 页头人话 ＋ 类型次数图走共享图表。
  const chart = cardOf(html, 'sec-chart');
  assert.notEqual(chart, '', '缺类型聚合图卡（sec-chart）');
  assert.ok(chart.includes('ilife-block-chart-block'), '类型聚合图不是共享图表区块');
  const detail = cardOf(html, 'sec-detail');
  assert.notEqual(detail, '', '缺逐条记录卡（sec-detail）');
});

/* ───────────────────────── 类别色单源（票面「色值单源」） ───────────────────────── */

test('#453 类别色单源：四组「键→色值」绑定全仓只命中 categoryColors.ts 一件', () => {
  assertColorSingleSource();
});

/* ─────────────────── 空态带下一句话（真出口按缺失阻断，装配层构造） ─────────────────── */

test('#453 空态：三页各出带下一句话的空态、不出现空表（装配层构造）', () => {
  // 一条记录都不落：真出口按缺失阻断退出 4（实测），故空态只能装配层构造。
  const dir = mkDir();
  for (const [word, key, name] of [
    ['看运动类型分布', KEY.distribution, '04-empty-distribution'],
    ['看力量训练总览', KEY.strength, '04-empty-strength'],
    ['看有氧训练总览', KEY.cardio, '04-empty-cardio'],
  ]) {
    const blocked = runCli(dir, key, WINDOW, name + '-blocked');
    assert.equal(blocked.status, 4, word + ' 空库应缺失阻断退出 4（实测读数）');
    assert.equal(blocked.file, null, word + ' 缺失阻断不该落产物');
  }
  const win = { start: D1, end: D5 };
  const dist = buildDistributionDoc({
    ...win, days: 7, activeDays: 0, sessions: 0, totalBurned: 0, buckets: [],
    intakeCal: null, tdeeTotal: null, deficit: null,
  });
  const strength = buildStrengthDoc({
    ...win, rows: [], movementCount: 0, totalSets: 0, totalVolumeKg: null, totalReps: null,
    byMovement: [], trail: [],
  });
  const cardio = buildCardioDoc({
    ...win, rows: [], sessions: 0, totalMinutes: null, totalDistanceKm: null, avgPacePerKm: null, byType: [],
  });
  for (const [what, html, next] of [
    ['分布空态', dist, '说「记运动」'],
    ['力量空态', strength, '说「记力量训练」'],
    ['有氧空态', cardio, '说「记有氧运动」'],
  ]) {
    assertDocPage(html, what);
    assert.ok(hasClass(html, 'ilife-empty'), what + ' 没有走公共层空态构件（ilife-empty）');
    assert.ok(html.includes(next), what + ' 缺下一句话「' + next + '」');
    assert.equal(cardOf(html, 'sec-table'), '', what + ' 没有行却留下了表卡外壳');
    assert.equal(cardOf(html, 'sec-ratio'), '', what + ' 没有行却留下了占比卡外壳');
    assert.equal((html.match(/<tbody>/g) ?? []).length, 0, what + ' 没有行却出现了空表');
    assert.ok(html.includes('数据来源') && html.includes('共 0 条'), what + ' 空态缺来源脚注（0 条也要报）');
    for (const [where, text] of [['<title>', headTexts(html).title], ['眉标', headTexts(html).eyebrow]]) {
      assert.ok(!/calorie\./i.test(text), what + ' 的' + where + '里有命令键：' + text);
    }
    assert.equal(countOf(html, '移植'), 0, what + ' 出现工序词「移植」');
  }
});
