/** #274 收口复核 · 自设新探针（专打「脚本自我满足」的盲区）。
 *
 * 与作者席 `t274-真跑.mjs` 的差别：作者只跑「有库正路 ＋ 空库」两态；本件补三块它没盖的：
 *   ① 库非空、但本次查询零命中（关键词零命中／分类零命中）—— `t425` 裁定 4 的 2026-09-15 澄清里
 *      的「窗口为空」那一支（有命令、数据底在、本次零记录），不是「库为空」；
 *   ② 硬写死的权威样例（逐格数值、结论句、条数），用来证明改动的收窄没被放宽；
 *   ③ 缺值口径（`—` 而不是 0）与转义——两处「要么被抓、要么就是放水」的口径。
 *
 * 跑法：`node docs/skills/skill-calorie/t274-收口复核-新探针.mjs`
 * 只读老实物目录 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\`，不执行其中任何脚本。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 检出根：从本件所在目录往上找，第一个含 `packages/skill-calorie` 的目录（入仓位与暂存位都能跑）。 */
function findRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(d, 'packages', 'skill-calorie', 'package.json'))) return d;
    d = dirname(d);
  }
  throw new Error('找不到检出根（本件所在目录：' + from + '）');
}
const ROOT = findRoot(HERE);
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, '.scratch', 't274g2');
const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { ALL_ROUTES } = await import(
  pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routes.generated.js')).href
);

let 红 = 0;
let 项 = 0;
function chk(name, cond, detail) {
  项 += 1;
  if (!cond) 红 += 1;
  console.log(`${cond ? 'OK  ' : '红  '} ${name}${detail === undefined ? '' : ' ｜ ' + detail}`);
}

/** 命令行逐字取自运行期总表（不手抄字面量）：命令名取 `cli` 列，参数按同一形状拼。 */
function cliOf(key, params) {
  const row = ALL_ROUTES.find((r) => r.key === key);
  if (!row) throw new Error('运行期总表里没有 ' + key);
  const name = /^calorie-cmd-read (\S+)/.exec(row.cli)[1];
  return params === undefined
    ? 'calorie-cmd-read ' + name
    : 'calorie-cmd-read ' + name + " --params '" + JSON.stringify(params) + "'";
}
function argvOf(cli) {
  const m = /^calorie-cmd-read (calorie\.[a-z0-9.-]+)(?: --params '(\{.*\})')?$/.exec(cli);
  if (!m) throw new Error('命令行不合形状：' + cli);
  return m[2] === undefined ? [m[1]] : [m[1], '--params', m[2]];
}
function run(dir, cli) {
  const r = spawnSync(process.execPath, [CLI, ...argvOf(cli)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let out = null;
  try { out = JSON.parse(String(r.stdout).trim()); } catch { out = null; }
  const p = out && out.data && typeof out.data.output === 'string' ? out.data.output : null;
  return {
    status: r.status, stderr: String(r.stderr).trim(), bytes: out && out.delivery ? out.delivery.bytes : null,
    metrics: out && out.data ? out.data.metrics : null, path: p,
    landed: p !== null && existsSync(p), html: p !== null && existsSync(p) ? readFileSync(p, 'utf8') : '',
  };
}
/** 幂等：每次把库与产物目录清掉再播种（重复跑不许累加行）。 */
function seed(dir, rows) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'calorie_html'), { recursive: true });
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1,30,'male',175,'moderate')").run();
  const st = db.prepare('INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const r of rows) st.run(...r);
  db.close();
}

/** 种子 6 条：1 条缺分类缺品牌、1 条缺来源、1 条带标签（验转义）、1 组同名同品牌重复。
 *  ⚠️ `calories`／`protein`／`fat`／`carbohydrates`／`sodium` 在 `schema.ts` 里是 NOT NULL
 *  ⇒ `fixed0／fixed1` 的「缺值写 —」那一支**在真库里落不到**（登记项，不是本席判据）。 */
const SEED = [
  ['鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '包装'],
  ['米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '自制'],
  ['米饭', '测试', 131, 2.8, 0.3, 28, 1, '主食', '复核'],
  ['苹果', '果园', 52, 0.3, 0.2, 14, 1, '', '自制'],
  ['牛奶', '牧场', 54, 3, 3.2, 3.4, 40, '乳制品', ''],
  ['营养缺口样本', '', 100, 1, 1, 1, 0, '主食', '自制'],
];

const OKDIR = join(OUT, 'probe-ok');
const NODIR = join(OUT, 'probe-nomatch');
const EMDIR = join(OUT, 'probe-emptydb');
for (const d of [OKDIR, NODIR, EMDIR]) {
  seed(d, d === EMDIR ? [] : SEED);
}

/* ── ① 库非空、本次查询零命中：`t425` 裁定 4 澄清的「窗口为空」那一支 ── */
console.log('== ① 库非空（6 条）＋ 本次查询零命中 ==');
const nomatch = [
  ['关键词零命中', cliOf('calorie.view.search', { keyword: '螺蛳粉' }), '螺蛳粉'],
  ['分类零命中', cliOf('calorie.view.library', { category: '海鲜类' }), '海鲜类'],
];
for (const [what, cli, needle] of nomatch) {
  const r = run(NODIR, cli);
  const 空态块 = r.html.includes('ilife-block-empty') || r.html.includes('class="food-grid"');
  const 空态句 = r.html.includes('没有找到匹配的食品') || r.html.includes('无匹配');
  const 引导句 = r.html.includes('存食品');
  chk(`${what}：出完整页（老实物 food_search.html:98-101 对 items.length===0 就出 emptyState）`,
    r.status === 0 && r.landed && r.html.startsWith('<!doctype html>'),
    `exit=${r.status} 落盘=${r.landed} stderr=${r.stderr.slice(0, 70)}`);
  chk(`${what}：空态句＋引导句`, 空态块 && 空态句 && 引导句,
    `空态块=${空态块} 空态句=${空态句} 引导句=${引导句}`);
  chk(`${what}：老实物正本对照`, true, `正本 :99 emptyState({icon:'🔍',text:'无匹配食物',hint:'尝试其他关键词,或先用「存食品」添加'})`);
}
/* 两态可分：库非空零命中 ≠ 空库 */
{
  const a = run(NODIR, cliOf('calorie.view.search', { keyword: '螺蛳粉' }));
  const b = run(EMDIR, cliOf('calorie.view.search', { keyword: '螺蛳粉' }));
  chk('两态可分（库非空零命中 与 库为空 结果不同）', a.status !== b.status || a.landed !== b.landed,
    `库非空零命中 exit=${a.status} 落盘=${a.landed} ｜ 库为空 exit=${b.status} 落盘=${b.landed}`);
}

/* ── ② 硬写死的权威样例（老实物口径 ＋ t425 骨架） ── */
console.log('== ② 硬写死的权威样例 ==');
{
  const s = run(OKDIR, cliOf('calorie.view.search', { keyword: '鸡胸' }));
  const h = s.html;
  chk('查食品：读数 total=1 limit=20', JSON.stringify(s.metrics) === '{"total":1,"limit":20}', JSON.stringify(s.metrics));
  chk('查食品：head 标题逐字＝卡路里 · 食物热量查询', h.includes('<title>卡路里 · 食物热量查询</title>'));
  chk('查食品：h1 逐字＝🍱 食物热量查询', h.includes('🍱 食物热量查询'));
  chk('查食品：结论句逐字＝在食品库里搜「鸡胸」，找到 1 条。', h.includes('在食品库里搜「鸡胸」，找到 1 条。'));
  chk('查食品：眉标＝查食品 · 饮食 ＋ 徽章 食品库', h.includes('查食品 · 饮食') && h.includes('>食品库</'));
  chk('查食品：四宏量逐格 165 卡／31.0 g／3.6 g／0.0 g',
    h.includes('165 卡') && h.includes('31.0 g') && h.includes('3.6 g') && h.includes('0.0 g'));
  chk('查食品：卡片格零 <table>（裁定 10）', !h.includes('<table'));
  chk('查食品：占位提示逐字（老实物 .search-box）', h.includes('输入食物关键词，如 牛肉 / 鸡胸 / 可乐'));

  const lib = run(OKDIR, cliOf('calorie.view.library', undefined));
  chk('食品库全量：读数 total=6 statsTotal=6', JSON.stringify(lib.metrics) === '{"total":6,"statsTotal":6}', JSON.stringify(lib.metrics));
  chk('食品库全量：结论句逐字＝食品库共 6 条在架食品，下面是全部。', lib.html.includes('食品库共 6 条在架食品，下面是全部。'));

  const cat = run(OKDIR, cliOf('calorie.view.library', { category: '主食' }));
  chk('食品库按分类：读数 total=3 statsTotal=6', JSON.stringify(cat.metrics) === '{"total":3,"statsTotal":6}', JSON.stringify(cat.metrics));
  chk('食品库按分类：结论句逐字＝分类「主食」下有 3 条（库内共 6 条）。', cat.html.includes('分类「主食」下有 3 条（库内共 6 条）。'));

  const ded = run(OKDIR, cliOf('calorie.view.dedupe', undefined));
  chk('去重：读数 groupCount=1 rowCount=2 totalProducts=6',
    JSON.stringify(ded.metrics) === '{"groupCount":1,"rowCount":2,"totalProducts":6}', JSON.stringify(ded.metrics));
  chk('去重：条幅逐字＝⚠ 发现 1 组重复，共 2 条可合并的重复食品', ded.html.includes('⚠ 发现 1 组重复，共 2 条可合并的重复食品'));
  chk('去重：重复组表在（老实物这一页就是表）', ded.html.includes('<table'));

  const sst = run(OKDIR, cliOf('calorie.view.source-stats', undefined));
  chk('来源统计：读数 total=6', sst.metrics && sst.metrics.total === 6, JSON.stringify(sst.metrics));
  chk('来源统计：h1 逐字＝📦 食品来源统计', sst.html.includes('📦 食品来源统计'));
  chk('来源统计：来源数／食品总数两枚读数标签在', sst.html.includes('来源数') && sst.html.includes('食品总数'));
  // 报告 §一 裁定 1／2-补 自称「四页」：该页搬成姊妹件后是否真补齐骨架（证据件 §一 仍写「来源统计页没对上」）
  chk('来源统计：眉标行 ＋ 徽章（裁定 1）', sst.html.includes('class="meta-bar"') && /class="type-badge">食品库</.test(sst.html)
    && sst.html.includes('看食品来源统计 · 饮食'));
  chk('来源统计：结论句在标题后、首个区块前（裁定 2）',
    sst.html.indexOf('ilife-block-page-shell-title') < sst.html.indexOf('<p class="sub">')
    && sst.html.indexOf('<p class="sub">') < sst.html.indexOf('<nav class="ilife-block-toc"'));
  chk('来源统计：口径行走公共层、来源脚注不走深底块（裁定 2-补／3）',
    sst.html.includes('ilife-block-caliber') && !sst.html.includes('ilife-block-notice') && !sst.html.includes('notice'));
}

/* ── ③ 缺值口径与转义（收窄有没有变成放宽） ── */
console.log('== ③ 缺值口径与转义 ==');
{
  const all = run(OKDIR, cliOf('calorie.view.library', undefined));
  chk('缺值：缺品牌不出那一行（#511 第 74 条）', !all.html.includes('class="food-brand">—<'));
  chk('缺值：缺分类不出占位破折号', !all.html.includes('class="food-cat">—<'));
  chk('缺值：缺来源归「未知」（老实物 it.source || \'未知\'）', all.html.includes('来源：未知'));
  const gap = run(OKDIR, cliOf('calorie.view.search', { keyword: '营养缺口' }));
  chk('缺值：缺品牌那条卡片有 is not 空品牌行', !gap.html.includes('class="food-brand"'));

  seed(join(OUT, 'probe-esc'), [['<img src=x onerror=alert(1)>', 'A&B"', 100, 1, 1, 1, 1, '<b>坏类别</b>', '<script>x</script>']]);
  const esc = run(join(OUT, 'probe-esc'), cliOf('calorie.view.library', undefined));
  chk('转义：食品名里的标签不出原样', !esc.html.includes('<img src=x'), '原样标签=' + esc.html.includes('<img src=x'));
  chk('转义：转义后的实体在', esc.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  chk('转义：品牌 A&amp;B&quot; 在', esc.html.includes('A&amp;B&quot;'));
  chk('转义：类别 &lt;b&gt;坏类别&lt;/b&gt; 在', esc.html.includes('&lt;b&gt;坏类别&lt;/b&gt;'));
}

console.log(`RESULT-NEW: ${红 === 0 ? 'PASS' : 'FAIL'} 红=${红} 检查项=${项}`);
process.exit(红 === 0 ? 0 : 1);
