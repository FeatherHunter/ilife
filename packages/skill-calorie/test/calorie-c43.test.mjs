/** C2-C6 #43 · 卡路里重审修复批验收（tmp 隔离，真实 DB 零触碰）。
 * C1/C7 走文档断言；C2 别名→diet.add；C3 去legacy首命中；C4 空尾日回零；C5 缺身高仍记；C6 收据HTML结构化分项。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/calorie-c43.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { TRIGGERS, HELP_LOOKUP, lookupWake, searchHelp, WAKE_TABLE, routeWakeword, isExecCli } from '../dist/triggers/index.js';
import { buildDietOverview, buildMealDistribution, zeroMealDistribution } from '../dist/render/index.js';
import { logWeight } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const SKILL_MD = join(HERE, '..', 'SKILL.md');
const FETCH_CLI = join(HERE, '..', 'dist', 'fetch', 'cli.js');

function run(key, params, envExtra, extraArgs) {
  const a = key === undefined ? [] : (params === undefined ? [key] : [key, '--params', typeof params === 'string' ? params : JSON.stringify(params)]);
  if (extraArgs) a.push(...extraArgs);
  return spawnSync(NODE_BIN, [BIN, ...a], { encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

function runOk(dir, key, params, extraArgs) {
  const r = run(key, params, { SKILLS_DB_PATH: dir }, extraArgs);
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-600));
  return JSON.parse(r.stdout);
}

function mkHelpDb() {
  const dir = mkdtempSync(join(tmpdir(), 'c43-help-'));
  openDb(join(dir, 'calorie_data.db')).close();
  return dir;
}

function mkDietDb() {
  const dir = mkdtempSync(join(tmpdir(), 'c43-diet-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2)").run();
  db.close();
  return dir;
}

test('C1 fetch-cli运维定位注明（SKILL唯一出口节+fetch头注）', () => {
  const skill = readFileSync(SKILL_MD, 'utf8');
  assert.match(skill, /运维定位/);
  assert.match(skill, /skill-calorie-fetch/);
  assert.match(skill, /业务读写唯一出口仍为.*calorie-cmd-read/);
  const cli = readFileSync(join(HERE, '..', 'src', 'fetch', 'cli.ts'), 'utf8');
  assert.match(cli, /运维定位/);
  assert.match(cli, /业务唯一出口为 calorie-cmd-read/);
  void FETCH_CLI;
});

test('C7 默认目标值1800/2000来源文档一笔', () => {
  const skill = readFileSync(SKILL_MD, 'utf8');
  assert.match(skill, /默认目标值/);
  assert.match(skill, /1800/);
  assert.match(skill, /2000/);
  assert.match(skill, /schema\.ts daily_goal/);
});

test('C2 记早餐/午餐/晚餐别名→calorie.diet.add（WAKE_TABLE+现找）', () => {
  // #291 c6ff7e2 加三行目标别名（看目标推荐/看目标配置/看目标状态），WAKE_TABLE 3→6；饮食三行形状不变。
  assert.equal(WAKE_TABLE.length, 6);
  for (const phrase of ['记早餐', '记午餐', '记晚餐']) {
    const route = routeWakeword(phrase);
    assert.ok(route, phrase + ' 无路由');
    assert.equal(route.key, 'calorie.diet.add');
    const hits = lookupWake(HELP_LOOKUP, phrase);
    assert.ok(hits.length >= 1, phrase + ' HELP_LOOKUP 无命中');
    assert.ok(hits.every((h) => h.cli.includes('calorie.diet.add')), phrase + ' 非 diet.add：' + JSON.stringify(hits));
    const s = searchHelp(TRIGGERS, phrase);
    assert.ok(s.length >= 1, phrase + ' searchHelp 无命中');
    assert.ok(s[0].cli.includes('calorie.diet.add'), phrase + ' 首条非 diet.add：' + s[0].cli);
  }
  const dir = mkHelpDb();
  for (const phrase of ['记早餐', '记午餐', '记晚餐']) {
    const env = runOk(dir, 'calorie.help.lookup', { q: phrase });
    assert.ok(env.data.total >= 1);
    assert.ok(String(env.data.items[0].cli).includes('calorie.diet.add'), phrase + ' CLI首条非 diet.add：' + env.data.items[0].cli);
  }
});

test('C3 HELP去legacy首命中（看今日主页→view.home，减肥/目标首条可执行）', () => {
  const home = searchHelp(TRIGGERS, '看今日主页');
  assert.ok(home.length >= 1);
  assert.ok(home[0].cli.includes('calorie.view.home'), '看今日主页首条非 view.home：' + home[0].cli);
  assert.ok(isExecCli(home[0].cli));
  for (const q of ['减肥', '目标']) {
    const hits = searchHelp(TRIGGERS, q);
    assert.ok(hits.length >= 1, q + ' 无命中');
    assert.ok(isExecCli(hits[0].cli), q + ' 首条非可执行：' + hits[0].cli);
  }
  const dir = mkHelpDb();
  const homeEnv = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' });
  assert.ok(String(homeEnv.data.items[0].cli).includes('calorie.view.home'));
  assert.ok(String(homeEnv.data.items[0].cli).startsWith('calorie-cmd-read calorie.'));
  const jf = runOk(dir, 'calorie.help.lookup', { q: '减肥' });
  assert.ok(String(jf.data.items[0].cli).startsWith('calorie-cmd-read calorie.'), '减肥首条：' + jf.data.items[0].cli);
  const mb = runOk(dir, 'calorie.help.lookup', { q: '目标' });
  assert.ok(String(mb.data.items[0].cli).startsWith('calorie-cmd-read calorie.'), '目标首条：' + mb.data.items[0].cli);
});

test('C4 view.diet空尾日回零而非整窗missing', () => {
  const dir = mkDietDb();
  const db = openDb(join(dir, 'calorie_data.db'));
  const o = buildDietOverview(db, '2026-09-05', '2026-09-06');
  assert.equal(o.loggedDays, 1);
  assert.throws(() => buildMealDistribution(db, '2026-09-06'), /无饮食记录/);
  const zero = zeroMealDistribution('2026-09-06');
  assert.equal(zero.totalCalories, 0);
  assert.ok(zero.slices.every((s) => s.calories === 0 && s.count === 0 && s.pct === 0));
  db.close();
  const env = runOk(dir, 'calorie.view.diet', { start: '2026-09-05', end: '2026-09-06' });
  assert.equal(env.shape, 'stat');
  assert.equal(env.data.metrics.distTotal, 0);
  const htmlFile = join(dir, 'diet.html');
  const r = run('calorie.view.diet', { start: '2026-09-05', end: '2026-09-06' }, { SKILLS_DB_PATH: dir }, ['--html', htmlFile]);
  assert.equal(r.status, 0);
  assert.match(readFileSync(htmlFile, 'utf8'), /餐别分布/);
});

test('C5 缺身高仍记体重 BMI null（库函数级）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'c43-w-'));
  const db = openDb(join(dir, 'w.db'));
  const r = logWeight(db, 70, '', '2026-09-10', '07:00:00');
  assert.equal(r.bmi, null);
  db.close();
});

test('C6 写收据HTML结构化分项', () => {
  const dir = mkDietDb();
  const htmlFile = join(dir, 'receipt.html');
  const env = runOk(dir, 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-06', time: '08:00:00' }, ['--html', htmlFile]);
  assert.equal(env.shape, 'receipt');
  assert.ok(env.data.receipt.items.length >= 1);
  const html = readFileSync(htmlFile, 'utf8');
  // #269 口径变更（有意改，票面与提交信息写清）：`calorie.diet.add` 的回执从
  // `<ul><li>` 片段切成整页文档（`src/diet/receipt.ts` 的 `dietReceiptDoc`），
  // 分项改落进 `ilife-block-data-table` 的单元格 —— 断言按**新形状的结构**钉，
  // 不再找 `<li>`；产物仍必须是带 charset 的完整文档，且分项仍须落在表格单元格里。
  assert.ok(html.startsWith('<!doctype html>'), 'C6：饮食写命令的回执已是整页文档');
  assert.ok(html.includes('charset="utf-8"'), 'C6：整页文档缺 charset');
  // #496／#270：那张表原来是「改动字段对照（回执未带对照时为空表，只看上方写入字段）」，
  // #496 先把标题改成「本次改动」，#270 按老实物 `crud_receipt.html:156` 把四块标题摆成逐字四串
  // ⇒ 本条改钉**区块标题 ＋ 分项仍落进表格单元格**（比一句表题更强）。
  for (const t of ['✅ 操作回执', '📋 字段变更', '📊 今日累计', '📋 复制明细']) {
    assert.ok(html.includes(t), 'C6：缺老实物那一块的标题：' + t);
  }
  // 分项仍须落进结构化表格的单元格：`calorie.diet.add` 是新增类 ⇒ 这一块摆「本次写入的字段」
  // （#270 专属约束①：导入／新增不硬套「改前 → 改后」），第一行是食物名那一格。
  // #270 收窄：原写法从**整页第一个**「📋 字段变更」起开窗，而那串第一次出现是页内导航那一项
  // （实测该处到表格首格 1499 字符，> 原来的 900 ⇒ 假红）。改为先切出 `section#sec-change` 再断，
  // 窗口不再是筹码，且比原来更严（分项必须落在那一块**内部**）。
  const secChange = /<section id="sec-change">([\s\S]*?)<\/section>/.exec(html);
  assert.ok(secChange !== null, 'C6：产物里没有「📋 字段变更」那一块（section#sec-change）');
  assert.ok(secChange[1].includes('<h2>📋 字段变更</h2>'), 'C6：区块标题不是老实物那一串');
  assert.match(secChange[1], /data-label="字段"[^>]*>食物名<\/td>[\s\S]{0,300}?已写入饮食记录/, 'C6：改动分项没有落进结构化表格的单元格');
  assert.match(html, /鸡胸/);
});

/** #270 · 改类出「改前 → 改后」对照、删类出被删快照（老实物 `diff-card` 的 update `:302-327` 与
 *  delete `:328-350` 两分支口径）——票面专属约束①，也是本票在四块标题之外新摆上去的读数。
 *
 *  **本条收窄过一轮（#270 接手席，归因写在测试件里）**：原断言要求「改前」列读出库里的写前真值
 *  （克数 300／热量 150）。实测该读数**在本票声明路径内拿不到**——`fetch/diet.ts` 的 `updateMeal`
 * 回 `before`／`after`，而饮食写口 `src/diet/edit.ts:35-38` 只把**变更字段名**放进 `items[].detail`，
 * `reason` 是空串；写前值要拿得动必须改 `src/diet/edit.ts`（不在本票声明路径内）。
 *  同时实测到**真缺陷**：当时装配件把「本次参数」（写进去的新值）当「改前」印，两列同为 250／400 ——
 *  「改前」那一列印着改后值，页上还照着它叫用户「照改前的原值再改一次」。现已改为缺值写 `—`＋一句
 *  口径行（裁定 4），本断言守住两条：**改后**是写进去的那个值；**改前**要么是写前真值、要么是 `—`，
 *  **绝不许等于改后**。 */
test('#270 改类出「改前 → 改后」对照：表头与两个值都在产物里', () => {
  const dir = mkDietDb();
  const htmlFile = join(dir, 't270-update.html');
  const env = runOk(dir, 'calorie.diet.update', { id: 1, calories: 400, grams: 250 }, ['--html', htmlFile]);
  assert.equal(env.data.receipt.noChange, false, '改类该是有改动的一次');
  const html = readFileSync(htmlFile, 'utf8');
  assert.ok(html.includes('📋 字段变更'), '改类页缺「📋 字段变更」那块');
  assert.ok(html.includes('改前 → 改后对照'), '改类页缺对照表的表题');
  assert.ok(html.includes('>改前</th>') && html.includes('>改后</th>'), '改类页的对照表缺「改前／改后」两列');
  // 按**行**读，不按整页第一个 `data-label="改前"`：这一族一次改两个字段（克数与热量），
  // 逐行锚定才证明「改前→改后」是**按字段配的对子**，而不是两个各自独立的数。
  const row = (label) => new RegExp('data-label="字段"[^>]*>' + label
    + '<\\/td>[\\s\\S]{0,200}?data-label="改前"[^>]*>([^<]*)<\\/td>[\\s\\S]{0,200}?data-label="改后"[^>]*>([^<]*)<\\/td>').exec(html);
  for (const [label, after] of [['克数', '250'], ['热量', '400']]) {
    const m = row(label);
    assert.ok(m !== null, '改类页读不到「' + label + '」那一行的改前 → 改后');
    assert.equal(m[2], after, '「' + label + '」的改后该是本次写进去的值');
    assert.notEqual(m[1], after, '「' + label + '」的改前被印成了改后值（不许拿新值顶替写前原值）');
    assert.ok(m[1] === '—' || /^\d+$/.test(m[1]), '「' + label + '」的改前该是写前真值或缺值 —，读到：' + m[1]);
  }
  // 缺值那一列必须有话说（裁定 4）：写前值拿不到时，页上要说清为什么是 —、且不许拿新值顶替。
  assert.ok(html.includes('不拿新值顶替'), '「改前」缺值的那一页缺一句口径行');
});

test('#270 删类出被删快照：删前的原值在产物里', () => {
  const dir = mkDietDb();
  const htmlFile = join(dir, 't270-remove.html');
  const env = runOk(dir, 'calorie.diet.remove', { id: 1 }, ['--html', htmlFile]);
  assert.equal(env.data.receipt.affectedRows, 1, '删一条该是影响 1 行');
  const html = readFileSync(htmlFile, 'utf8');
  assert.ok(html.includes('📋 字段变更'), '删类页缺「📋 字段变更」那块');
  assert.ok(html.includes('删除前的原值（逐条）'), '删类页缺快照表的表题');
  assert.ok(html.includes('>粥</td>'), '删类页的快照表里读不到被删那条的食物名');
  assert.match(html, /data-label="状态"[^>]*>已删除/, '删类页的快照表缺「已删除」那一格');
  // 老实物 `:374-387`：删除场景不出「今日累计」那一块（已删除不再展示被删记录的绿区）。
  assert.equal(html.includes('📊 今日累计'), false, '删类页不该出「今日累计」那一块');
});
