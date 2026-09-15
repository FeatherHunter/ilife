/** #274 · 食品库类页真出口锁（判档① 文件存在＋判档② 内容与字段；判档③ 视觉交用户肉眼看）。
 *
 * 本件是 #274 席的交付件。**它由上一席留下的孤儿件改写而来**：那一版把老实物的**逐字文案**
 * 钉进断言（「查询关键词:鸡胸 · 匹配 1 条」「冗余行」「查询全量 · 匹配 3 条」「无重复组」…），
 * 而那些句子在 #496／#511 已按 P0 文本审查（`.scratch/t155o/text-review-P0.md` 第 6／7／8／45／70
 * 等条）改成读者的话并交付——照着旧句钉，等于要求把审查结论吃回去。
 * 故本次按 `t425-融合基准.md` §四 裁定 11 的教训**改钉形状**：类名、区块齐不齐、读数对不对、
 * 缺值口径、转义、两态，全部保留；**逐字文案只在「它就是老实物形状本身」时钉**
 * （如卡片格的「165 卡」「31.0 g」= 老实物的取整／一位小数口径，`t155-证据/复算-逐页残留探针v3.mjs`
 * 已把它登成数据项）。
 *
 * 四条词走真出口 `dist/cli/cmd_read.js`（读与写同走它）：
 *   `calorie.view.search`（查食品／搜食品）／`calorie.view.library`（查食品（按分类）／查食品库）／
 *   `calorie.view.dedupe`（看食品库（去重）／看去重报告）／`calorie.view.source-stats`（看食品来源统计／
 *   看食品来源分布）。
 * 判档① 逐条：exit 0、`data.output` 绝对路径、落 `<SKILLS_DB_PATH>/calorie_html/`、真落盘、
 *   `delivery.bytes` ＝ 落盘字节、stdout 恒一行 JSON、完整文档（doctype＋charset＋style＋helpers）。
 * 判档② 逐块照老实物（`food_search.html` 7913 B／`dedupe_report.html` 6458 B）＋ `t425` §五 第 ⑤ 类骨架：
 *   查食品＝搜索框＋匹配数＋卡片格（类别标签／食品名／品牌／四宏量／来源·更新于），**零 `<table>`**；
 *   食品库＝同一张卡片格（老技能把「查食品（按分类）」也接 `food_search.html`）＋本页读数；
 *   去重＝条幅＋三读数＋重复组表＋处理建议＋来源脚注；
 *   三页恒出：眉标（唤醒词 · 饮食 ＋ 徽章）／标题／结论句／页内导航／读数／口径行／
 *   复制区**双按钮**（日志第 4 段＝命令原文）／来源脚注（`t425` 裁定 1／2／3／7／10）。
 * 运行：先 `npx tsc -b packages/base-render packages/skill-calorie`（本仓多席并发，别的席在途件报错与本件无关），再
 *   `node --test packages/skill-calorie/test/t274-食品库页.test.mjs`
 *   （件名 2026-09-15 由 `diet-library-t274.test.mjs` 改成 `t274-` 前缀，测试内容不动；
 *   可复跑取证脚本＝`docs/skills/skill-calorie/t274-真跑.mjs`）
 */
import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const DB_FILENAME = 'calorie_data.db';
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 种子：5 条食品（含类别与来源）＋ 1 组重复（同名同品牌两条）——两页各有可断言的行。 */
function seed(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  const rows = [
    ['鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '包装'],
    ['米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '自制'],
    ['米饭', '测试', 131, 2.8, 0.3, 28, 1, '主食', '复核'],
    ['苹果', '果园', 52, 0.3, 0.2, 14, 1, '', '自制'],
    ['牛奶', '牧场', 54, 3, 3.2, 3.4, 40, '乳制品', ''],
  ];
  for (const r of rows) {
    db.prepare('INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...r);
  }
}

function mkDb() {
  const dir = mkdtempSync(join(tmpdir(), 't274-'));
  const db = openDb(join(dir, DB_FILENAME));
  seed(db);
  return { dir, db };
}

/** 真出口：产物落盘版（判档①）。 */
function runCli(dir, key, params) {
  const args = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

function assertDoc(h, what) {
  assert.ok(h.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(h.includes('charset="utf-8"'), what + ' 缺 charset');
  assert.ok(h.includes('<style>'), what + ' 缺样式段');
  assert.ok(h.includes('<script>'), what + ' 缺 helpers');
  assert.ok(h.includes('ilife-page'), what + ' 缺整页容器');
  assert.equal(h.includes('<!--'), false, what + ' 有未替换的残留标记');
}

/** 判档① 三连（每条词都要能跑出可打开的完整文档）。 */
function assertDelivery(dir, key, params, what) {
  const r = runCli(dir, key, params);
  assert.equal(r.status, 0, what + ' exit 0（stderr：' + r.stderr.slice(0, 200) + '）');
  assert.ok(r.env, what + ' stdout 须是一行可解析 JSON');
  assert.equal(r.stdout.trim().split('\n').length, 1, what + ' stdout 恒一行 JSON');
  const d = r.env.data;
  const dl = r.env.delivery;
  const out = d.output;
  assert.ok(isAbsolute(out), what + ' data.output 须绝对路径：' + out);
  assert.equal(basename(dirname(out)), 'calorie_html', what + ' 落 <SKILLS_DB_PATH>/calorie_html/');
  assert.ok(existsSync(out), what + ' 产物须真实落盘');
  // 字节数住在 envelope 的顶层 delivery（实测：data 只回 metrics／output，不回字节数）。
  assert.equal(dl.mode, 'file', what + ' 交付须是文件态');
  assert.equal(dl.path, out, what + ' delivery.path 与 data.output 同源');
  assert.equal(statSync(out).size, dl.bytes, what + ' delivery.bytes ＝ 落盘字节数');
  const html = readFileSync(out, 'utf8');
  assert.equal(Buffer.byteLength(html, 'utf8'), dl.bytes, what + ' 字节如实');
  assertDoc(html, what);
  return { html, out, bytes: dl.bytes };
}

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

/** 抽可见文本（剔 style／script／注释；标签整体丢掉＝属性里的复制载荷不算可见文本）。 */
function visibleText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENT[m] || m)
    .split('\n').map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim()).filter(Boolean).join('\n');
}

/** 解开五个实体：复制区把日志文本写进属性，要按真文本核六段。 */
function decodeEntities(html) {
  return html.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENT[m] || m);
}

/** `t425` §五 第 ⑤ 类骨架：三页恒出的九件（眉标／徽章／标题／结论句／导航／读数／口径行／
 *  复制区双按钮／来源脚注）。`what` 只用在断言消息里。 */
function assertSkeleton(html, what, summaryNeedle) {
  assert.ok(html.includes('class="meta-bar"'), what + ' 缺眉标行（§五 第 1 行）');
  const metaLeft = html.match(/class="left">([^<]*)</);
  assert.ok(metaLeft && metaLeft[1].includes(' · 饮食'), what + ' 眉标须是「命令名 · 人话归属」：' + metaLeft?.[1]);
  assert.ok(/class="type-badge">食品库</.test(html), what + ' 缺类型徽章');
  assert.ok(html.includes('ilife-block-page-shell-title'), what + ' 缺内容标题（§五 第 2 行）');
  const sub = html.match(/<p class="sub">([^<]*)</);
  assert.ok(sub, what + ' 缺结论句（§五 第 3 行）');
  assert.ok(sub[1].includes(summaryNeedle), what + ' 结论句要含本页读数：' + sub[1]);
  // 结论句在标题之后、首个区块之前（裁定 2 的读序）。
  assert.ok(html.indexOf('ilife-block-page-shell-title') < html.indexOf('<p class="sub">'),
    what + ' 结论句须紧跟标题');
  assert.ok(html.indexOf('<p class="sub">') < html.indexOf('<nav class="ilife-block-toc"'),
    what + ' 结论句须在首个区块之前');
  assert.ok(html.includes('ilife-block-toc'), what + ' 缺页内导航（§五 第 4 行）');
  assert.ok(html.includes('ilife-block-kpi-card'), what + ' 缺读数卡（§五 第 5 行）');
  assert.ok(html.includes('ilife-block-caliber'), what + ' 缺口径说明行（§五 第 13 行）');
  assert.ok(html.includes('ilife-block-copy-block'), what + ' 缺复制区（§五 第 14 行）');
  assert.ok(html.includes('📊 数据来源：本机食品库'), what + ' 缺来源脚注一行（§五 第 15 行）');
  // 裁定 7：恒双按钮，日志第 4 段＝命令原文。
  assert.ok(html.includes('复制数据'), what + ' 缺「复制数据」按钮');
  assert.ok(html.includes('复制日志'), what + ' 缺「复制日志」按钮');
  assert.equal(/ilife-block-copy-block[^>]*>[\s\S]{0,200}?<h2[^>]*>复制数据</.test(html), false,
    what + ' 不许出与按钮同名的标题');
}

/** 复制日志：六段齐 ＋ 第 4 段（调用链）逐字等于本次命令原文（`t425` 裁定 7）。
 *  段序正本是 `base-render/src/spec/text.ts` 的 `LOG_SECTIONS`：①场景标识②AI 思考链③数据结构
 *  ④调用链⑤时间戳版本⑥异常。日志文本写在按钮属性里，故先解实体再按段序抓。 */
function assertLogCallChain(html, command, what) {
  const text = decodeEntities(html);
  const m = /场景标识\n[\s\S]*?\nAI 思考链\n[\s\S]*?\n数据结构\n[\s\S]*?\n调用链\n([^\n]*)\n时间戳版本\n[\s\S]*?\n异常\n([^\n]*)/
    .exec(text);
  assert.ok(m, what + ' 日志六段不齐（场景标识／AI 思考链／数据结构／调用链／时间戳版本／异常）');
  assert.equal(m[1], command, what + ' 日志第 4 段须是本次命令原文（含参数）');
  assert.ok(m[2].startsWith('无') || m[2] === '', what + ' 第 6 段（异常）正常产出应写「无」');
}

/** 卡片格一节：老实物 `.food-grid`／`.food-card`／四宏量／来源行。 */
function assertFoodGrid(html, what) {
  assert.ok(html.includes('class="food-grid"'), what + ' 缺卡片格 food-grid');
  assert.ok(html.includes('class="food-card"'), what + ' 缺食品卡 food-card');
  for (const needle of ['热量', '蛋白', '脂肪', '碳水', '来源：']) {
    assert.ok(html.includes(needle), what + ' 卡缺：' + needle);
  }
  assert.ok(/food-macro-value">\d+ 卡</.test(html), what + ' 热量未取整（老实物 toFixed(0)）');
  assert.ok(/food-macro-value">\d+\.\d g</.test(html), what + ' 三大营养素未留一位小数（老实物 toFixed(1)）');
  assert.equal(html.includes('<table'), false, what + ' 卡片格页不该有表（裁定 10）');
}

test('#274 判档① 四条词真出口：exit 0 ＋ 绝对路径 ＋ 真落盘 ＋ 字节如实', () => {
  const { dir, db } = mkDb();
  try {
    const cases = [
      ['查食品', 'calorie.view.search', { keyword: '鸡胸' }],
      ['查食品（按分类）', 'calorie.view.library', { category: '主食' }],
      ['看食品库（去重）', 'calorie.view.dedupe', undefined],
      ['看食品来源统计', 'calorie.view.source-stats', undefined],
    ];
    for (const [what, key, params] of cases) {
      const { html, out, bytes } = assertDelivery(dir, key, params, what);
      assert.ok(bytes > 1000, what + ' 产物量级：' + bytes);
      assert.ok(out.includes('calorie_html'), what + ' 落盘目录');
      assert.ok(html.length > 0, what + ' 文档非空');
    }
  } finally { db.close(); }
});

test('#274 查食品：搜索框＋匹配数＋卡片格（老实物零 table）＋ §五 骨架九件', () => {
  const { db } = mkDb();
  try {
    const out = dispatch('calorie.view.search', { keyword: '鸡胸' }, db);
    assertDoc(out.html, '查食品');
    const h = out.html;
    assert.ok(h.includes('<title>卡路里 · 食物热量查询</title>'), 'head 标题照老实物');
    assert.ok(h.includes('🍱 食物热量查询'), 'h1 照老实物：🍱 食物热量查询');
    assertSkeleton(h, '查食品', '找到 1 条');
    // 搜索框（老实物 `.search-box`：关键词框＋占位提示）与匹配数（老实物 `.count`）
    assert.ok(h.includes('name="keyword"'), '缺关键词框');
    assert.ok(h.includes('value="鸡胸"'), '关键词框未回填');
    assert.ok(h.includes('输入食物关键词，如 牛肉 / 鸡胸 / 可乐'), '缺老实物的占位提示');
    assert.ok(h.includes('匹配') && h.includes('1 条'), '缺匹配数');
    // 卡片格：类别标签＋食品名＋品牌＋四宏量＋来源·更新于
    assertFoodGrid(h, '查食品');
    assert.ok(h.includes('class="food-cat">蛋白类<'), '缺类别标签（老实物 `.cat`）');
    assert.ok(h.includes('class="food-name">鸡胸肉<'), '缺食品名');
    assert.ok(h.includes('class="food-brand">测试<'), '缺品牌');
    assert.ok(h.includes('165 卡') && h.includes('31.0 g') && h.includes('3.6 g') && h.includes('0.0 g'),
      '四宏量取值未照老实物（热量取整／营养素一位小数）');
    assert.ok(/来源：包装 · 更新于 /.test(h), '来源行缺「更新于」（初始渲染带 updated_at）');
    assert.deepEqual(out.data.metrics, { total: 1, limit: 20 }, '读数：命中 1 条');
    // 复制区双按钮 ＋ 日志第 4 段＝命令原文
    assertLogCallChain(h, 'calorie-cmd-read calorie.view.search --params \'{"keyword":"鸡胸"}\'', '查食品');
  } finally { db.close(); }
});

test('#274 食品库：按分类出卡片格＋读数；同走老实物 food_search 的页题', () => {
  const { db } = mkDb();
  try {
    const all = dispatch('calorie.view.library', {}, db);
    assertDoc(all.html, '食品库全量');
    // 老技能把「查食品（按分类）」也接 food_search.html（场景登记 html_template）⇒ 页题与查食品同字。
    assert.ok(all.html.includes('🍱 食物热量查询'), '缺页题（老实物 food_search 的 h1）');
    assert.ok(all.html.includes('<title>卡路里 · 食物热量查询</title>'), 'head 标题照老实物');
    assertSkeleton(all.html, '食品库全量', '共 5 条');
    assertFoodGrid(all.html, '食品库全量');
    assert.ok(all.html.includes('米饭') && all.html.includes('鸡胸肉'), '全量缺种子行');
    assert.deepEqual(all.data.metrics, { total: 5, statsTotal: 5 }, '全量读数');

    const cat = dispatch('calorie.view.library', { category: '主食' }, db);
    assertDoc(cat.html, '食品库按分类');
    assert.ok(cat.html.includes('value="主食"'), '分类框未回填');
    assert.ok(cat.html.includes('分类「主食」下有 2 条'), '结论句报本分类条数');
    assert.ok(cat.html.includes('库内共 5 条'), '读数另报库内总数（老实物「共 N 条，库内 M 条」口径）');
    assert.equal(cat.html.includes('鸡胸肉'), false, '按分类不该出现别的分类的行');
    assertFoodGrid(cat.html, '食品库按分类');
    assert.deepEqual(cat.data.metrics, { total: 2, statsTotal: 5 }, '按分类读数');
    assertLogCallChain(cat.html, 'calorie-cmd-read calorie.view.library --params \'{"category":"主食"}\'', '食品库');
  } finally { db.close(); }
});

test('#274 裁定 1：三页可见文本零源码标识符、缺值不写 0', () => {
  const { db } = mkDb();
  try {
    const pages = [
      ['查食品', dispatch('calorie.view.search', { keyword: '鸡胸' }, db).html],
      ['食品库', dispatch('calorie.view.library', {}, db).html],
      ['去重', dispatch('calorie.view.dedupe', {}, db).html],
    ];
    for (const [what, html] of pages) {
      const text = visibleText(html);
      for (const bad of ['calorie.view', 'calorie_data', 'nutrition_products', 'MEAL_', 'null', 'undefined', 'is_deprecated']) {
        assert.equal(text.includes(bad), false, what + ' 可见文本漏出源码标识符：' + bad);
      }
    }
    // 缺品牌／缺类别的那条（苹果）不印占位破折号（#511 第 74 条）；缺来源归「未知」（老实物 `it.source || '未知'`）
    const all = dispatch('calorie.view.library', {}, db).html;
    assert.ok(all.includes('class="food-name">苹果<'), '全量应含种子行苹果');
    assert.equal(all.includes('class="food-brand">—<'), false, '缺品牌不该印占位破折号');
    assert.equal(all.includes('class="food-cat">—<'), false, '缺类别不该印占位破折号');
    assert.ok(all.includes('来源：未知'), '缺来源的卡片须归「未知」');
  } finally { db.close(); }
});

test('#274 裁定 10：卡片格页零表格；去重页有表（老实物那一页就是表）', () => {
  const { db } = mkDb();
  try {
    assert.equal(dispatch('calorie.view.search', { keyword: '米饭' }, db).html.includes('<table'), false, '查食品出现表');
    assert.equal(dispatch('calorie.view.library', {}, db).html.includes('<table'), false, '食品库出现表');
    const dedupe = dispatch('calorie.view.dedupe', {}, db).html;
    assert.ok(dedupe.includes('<table'), '去重页缺重复组表（老实物这一页有表）');
    assert.equal(dedupe.includes('class="food-grid"'), false, '去重页不该出现卡片格');
  } finally { db.close(); }
});

test('#274 去重：条幅＋三读数＋重复组表＋处理建议＋来源脚注', () => {
  const { db } = mkDb();
  try {
    const out = dispatch('calorie.view.dedupe', {}, db);
    assert.deepEqual(out.data.metrics, { groupCount: 1, rowCount: 2, totalProducts: 5 });
    assertDoc(out.html, '去重报告');
    const h = out.html;
    assert.ok(h.includes('📦 食品库去重'), '缺页题');
    assert.ok(h.includes('<title>卡路里 · 食品库去重</title>'), 'head 标题照老实物');
    assertSkeleton(h, '去重报告', '1 组重复');
    assert.ok(h.includes('⚠ 发现 1 组重复') && h.includes('可合并的重复食品'), '缺条幅读数（老实物 banner.warn）');
    for (const needle of ['重复组', '可合并的重复食品', '库内食品']) {
      assert.ok(h.includes('>' + needle + '<'), '缺读数标签：' + needle);
    }
    assert.ok(h.includes('重复组列表'), '缺「重复组列表」小节');
    for (const needle of ['食品名', '品牌', '条数', '记录编号', '米饭']) {
      assert.ok(h.includes(needle), '重复组表缺：' + needle);
    }
    assert.ok(h.includes('处理建议'), '缺处理建议小节');
    assert.ok(h.includes('保留营养数据最完整的一条'), '缺处理建议正文');
    assert.ok(h.includes('「下架食品」') && h.includes('「改食品」'), '处理建议缺两条可用动作');
    assert.ok(h.includes('判定标准：名称和品牌都一样的算重复'), '缺口径行（老实物 `.footer .src`）');
    assertLogCallChain(h, 'calorie-cmd-read calorie.view.dedupe', '去重报告');
  } finally { db.close(); }
});

test('#274 来源统计：搬成姊妹件后补齐的 ⑤ 类四行骨架 ＋ 日志第 4 段', () => {
  const { db } = mkDb();
  try {
    const out = dispatch('calorie.view.source-stats', {}, db);
    assertDoc(out.html, '来源统计');
    const h = out.html;
    assert.deepEqual(out.data.metrics, { total: 5, sources: 4 }, '来源数与总数读数');
    // 老实物 source_stats.html 的两读数 ＋ 按来源分组（占比条）
    assert.ok(h.includes('来源数') && h.includes('食品总数'), '缺两枚读数标签（老实物 kpi-grid）');
    assert.ok(h.includes('按来源分组'), '缺「按来源分组」块（老实物 section h2）');
    assert.ok(h.includes('占比%'), '缺占比列');
    // 编排者 2026-09-15 裁定 (b) 搬出 #275 件后，本票补齐的四行骨架
    assertSkeleton(h, '来源统计', '来自 4 个来源');
    assert.ok(h.includes('📦 食品来源统计'), '标题照老实物 h1（含 emoji）');
    assertLogCallChain(h, 'calorie-cmd-read calorie.view.source-stats', '来源统计');
  } finally { db.close(); }
});

test('#274 干净库：条幅转「无重复」且不编组（去重页两态）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't274-clean-'));
  const db = openDb(join(dir, DB_FILENAME));
  try {
    db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('苹果', '测试', 52, 0.3, 0.2, 14, 1, '水果', '自制')").run();
    const out = dispatch('calorie.view.dedupe', {}, db);
    assert.equal(out.data.metrics.groupCount, 0);
    assert.ok(out.html.includes('✅ 食品库无重复，数据干净'), '干净态条幅照老实物');
    assert.ok(out.html.includes('无需处理。'), '干净态建议照老实物');
    assert.ok(out.html.includes('没有重复食品（库内 1 条都只出现一次）'), '干净态走空态、不渲染空表');
    assert.ok(out.html.includes('ilife-block-empty'), '干净态须是空态块');
    // 同一页的真出口落盘（判档①：两态都能落盘）
    const { html, bytes } = assertDelivery(dir, 'calorie.view.dedupe', undefined, '去重报告（干净态）');
    assert.ok(bytes > 1000, '去重产物量级：' + bytes);
    assert.ok(html.includes('✅ 食品库无重复'), '落盘产物与直调同形');
  } finally { db.close(); }
});

test('#274 卡片格转义：食品名／品牌／类别／来源里的标签一律转义', () => {
  const dir = mkdtempSync(join(tmpdir(), 't274-esc-'));
  const db = openDb(join(dir, DB_FILENAME));
  try {
    db.prepare('INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('<img src=x onerror=alert(1)>', 'A&B"', 100, 1, 1, 1, 1, '<b>坏类别</b>', '<script>x</script>');
    const search = dispatch('calorie.view.search', { keyword: 'img' }, db);
    const lib = dispatch('calorie.view.library', { category: '<b>坏类别</b>' }, db);
    for (const [html, what] of [[search.html, '查食品'], [lib.html, '食品库']]) {
      assert.equal(html.includes('<img src=x'), false, what + ' 卡片名未转义（注入标签原样落页）');
      assert.equal(html.includes('<b>坏类别</b>'), false, what + ' 类别未转义');
      assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), what + ' 卡片名缺转义后的实体');
      assert.ok(html.includes('A&amp;B&quot;'), what + ' 品牌缺转义后的实体');
      assert.ok(html.includes('&lt;b&gt;坏类别&lt;/b&gt;'), what + ' 类别缺转义后的实体');
    }
  } finally { db.close(); }
});

test('#274 场景 02 四条词接的命令（含来源统计接对专面命令）', async () => {
  const { ALL_ROUTES } = await import('../dist/triggers/routes.generated.js');
  const keyOf = (word) => (ALL_ROUTES.find((r) => r.wakeWord === word) ?? {}).key;
  const cases = [
    ['查食品', 'calorie.view.search'],
    ['搜食品', 'calorie.view.search'],
    ['查食品（按分类）', 'calorie.view.library'],
    ['查食品库', 'calorie.view.library'],
    ['看食品库（去重）', 'calorie.view.dedupe'],
    ['看去重报告', 'calorie.view.dedupe'],
    ['看食品来源统计', 'calorie.view.source-stats'],
    ['看食品来源分布', 'calorie.view.source-stats'],
  ];
  for (const [word, key] of cases) {
    assert.equal(keyOf(word), key, '唤醒词「' + word + '」接错命令');
  }
  // 反向：来源统计两条词都不许落到分类食品列表（02 专属约束①点的那处接错，当刻实测已接对）。
  assert.notEqual(keyOf('看食品来源统计'), 'calorie.view.library', '来源统计仍接分类食品列表');
  assert.notEqual(keyOf('看食品来源分布'), 'calorie.view.library', '来源分布仍接分类食品列表');
});

test('#274 空库：三条词一律 exit 4 ＋ 缺失阻断，不留半页', () => {
  const dir = mkdtempSync(join(tmpdir(), 't274-empty-'));
  openDb(join(dir, DB_FILENAME)).close();
  const cases = [
    ['calorie.view.search', { keyword: '鸡胸' }, /无命中|食品库/],
    ['calorie.view.library', {}, /食品库空/],
    ['calorie.view.library', { category: '主食' }, /该分类空库/],
    ['calorie.view.dedupe', {}, /食品库空|无重复/],
  ];
  for (const [key, params, re] of cases) {
    const r = runCli(dir, key, params);
    assert.equal(r.status, 4, key + ' 空库未阻断（status=' + r.status + ' stderr=' + r.stderr.slice(0, 200) + '）');
    assert.equal(r.stdout, '', key + ' 空库 stdout 非空');
    assert.match(r.stderr, re, key + ' 空库 stderr 文案不合：' + r.stderr.slice(0, 200));
    assert.ok(r.stderr.includes('ERR 4: 取数失败（缺失阻断）'), key + ' 缺缺失阻断前缀');
  }
});
