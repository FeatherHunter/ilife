/** #216 · 票 7（`#215`）那条出口的**真 spawn 锁**（CLI 级用例：`node dist/cli/cmd_read.js …` 子进程，
 * 不是模块内直调——退出码、stdout 纯净性、产物真的落盘只有真进程能看见）。
 *
 * 锁五件事（照票 8 票面逐条）：
 *  ① **文件名通式逐字**：HELP ＝ `私家大厨_HELP_<本地 YYYYMMDD_HHMMSS>.html`、速查 ＝
 *     `私家大厨_速查表_<本地 …>.html`，且落在 `<SKILLS_DB_PATH>/cook_html/help/`；时间戳由本件**独立算**
 *     （±5 秒窗口，只断言「本地时区零填充」这一件事，不把跨秒竞态当契约）；
 *  ② **产物是通用 help 模板出来的**：与 `base-paint/help-shell` 的 `HELP_SHELL_PREFIX`／
 *     `HELP_SHELL_SUFFIX` 逐字比前后缀、`HELP_SHELL_TITLE_SLOT` 已被换成 `<title>…</title>`、
 *     载荷段 `JSON.parse` 后可读；
 *  ③ **同秒独占递补**：`reuseHours:0`（每次都落新的）连跑 6 次 ⇒ 6 个互不相同的名字、一个都没被盖掉
 *     （每份都还在、字节数一致）；**③b `#245` 缺省复用**：缺省连跑 6 次 ⇒ 只落 1 份、6 个回执同落点、
 *     旧产物一字未动，`reuseHours:72` 同效、`reuseHours:0` 落新的、坏参 exit 2）；
 *  ④ **两支互不串**：缺省 HELP 支与显式速查支同目录不同名，载荷一个 10 域索引、一个 37 条短语；
 *  ⑤ **退出码矩阵** ＋ 本票病灶：**说一句 help 不建库**（新鲜目录里跑完不许出现 `chef_data.db`）。
 *
 * 运行（**只逐包构建，禁仓级 `tsc -b`**）：
 *   node node_modules/typescript/bin/tsc --build packages/skill-chef/tsconfig.json
 *   node --test packages/skill-chef/test/help-delivery-216.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELP_SHELL_PREFIX, HELP_SHELL_SUFFIX, HELP_SHELL_TITLE_SLOT } from 'base-paint/help-shell';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 真消费者＝本包自己（与插件侧 `cliPath()` 解析到的那条路同形：`<包>/dist/cli/cmd_read.js`）。 */
const CONSUMER = resolve(HERE, '..');
const CLI = join(CONSUMER, 'dist', 'cli', 'cmd_read.js');
const KEY = 'chef.help.lookup';
const PREFIX_BEFORE_TITLE = HELP_SHELL_PREFIX.split(HELP_SHELL_TITLE_SLOT)[0];

const HELP_RE = /^私家大厨_HELP_(\d{8}_\d{6})(?:_(\d+))?\.html$/;
const LOOKUP_RE = /^私家大厨_速查表_(\d{8}_\d{6})(?:_(\d+))?\.html$/;

const mkTmp = (tag) => mkdtempSync(join(tmpdir(), 't216-' + tag + '-'));
const P = (o) => JSON.stringify(o);

/** 本地时区零填充时间戳（与共用件同口径；测试侧**独立算一份**，不做同义反复）。 */
function localStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return String(d.getFullYear()) + p(d.getMonth() + 1) + p(d.getDate())
    + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

/** 允许 ±5 秒：断言「时间戳＝本地时区、形如 YYYYMMDD_HHMMSS」，不把跨秒竞态当契约。 */
function stampWindow() {
  const t = Date.now();
  return [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((d) => localStamp(new Date(t + d * 1000)));
}

/** 真 spawn 出口：CLI 子进程，cwd ＝真消费者包，DB 目录＝调用者给的隔离目录。 */
function run(dbDir, args, envExtra) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: CONSUMER, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dbDir, ...(envExtra || {}) },
  });
}
function runOk(dbDir, args, envExtra) {
  const r = run(dbDir, args, envExtra);
  assert.equal(r.status, 0, 'exit 非 0：' + String(r.status) + ' / stderr=' + String(r.stderr));
  return JSON.parse(String(r.stdout));
}
const helpDirOf = (dbDir) => join(dbDir, 'cook_html', 'help');
const namesOf = (dbDir) => { try { return readdirSync(helpDirOf(dbDir)).sort(); } catch { return []; } };

test('#216 ① 缺省：落 `<库目录>/cook_html/help/私家大厨_HELP_<本地时间戳>.html` ＋ 绝对路径回执；不建库', () => {
  const db = mkTmp('default');
  const env = runOk(db, [KEY]);
  assert.equal(env.key, KEY);
  assert.equal(env.shape, 'list', 'shape 仍是 list（面板路 readViaCli 靠它）');
  assert.equal(env.data.mode, 'file');
  assert.equal(env.data.total, 10, '缺省载荷＝10 个功能域的索引');
  assert.equal(env.data.subgroupTotal, 33);
  assert.equal(env.data.sceneTotal, 48);
  assert.equal(env.delivery.mode, 'file');
  const abs = env.delivery.path;
  assert.equal(isAbsolute(abs), true, '回执必须是绝对路径：' + abs);
  assert.equal(dirname(abs), helpDirOf(db), '落点＝<SKILLS_DB_PATH>/cook_html/help');
  const m = HELP_RE.exec(basename(abs));
  assert.ok(m, '文件名通式不符：' + basename(abs));
  assert.equal(stampWindow().includes(m[1]), true, '时间戳须是本地时区零填充 YYYYMMDD_HHMMSS：' + m[1]);
  assert.equal(existsSync(abs), true, '回执指的产物必须真存在');
  assert.equal(env.delivery.bytes, readFileSync(abs).length, 'bytes ＝实际落盘字节数');
  assert.equal(readdirSync(helpDirOf(db)).length, 1, '一次调用恰一份产物');
  // 本票病灶：说一句 help 不许把库建出来（DB 由 openChefDb 的 DDL 自愈建，282,624 B 那种）
  assert.equal(existsSync(join(db, 'chef_data.db')), false, '看帮助不许建库');
  assert.deepEqual(readdirSync(db).sort(), ['cook_html'], '库目录里只许多出落点目录本身');
});

test('#216 ② 产物＝通用 help 模板：前后缀逐字、标题槽已填、载荷段可 parse', () => {
  const db = mkTmp('template');
  const env = runOk(db, [KEY]);
  const html = readFileSync(env.delivery.path, 'utf8');
  assert.equal(html.startsWith(PREFIX_BEFORE_TITLE), true, '前缀须与 base-paint/help-shell 逐字一致');
  assert.equal(html.endsWith(HELP_SHELL_SUFFIX), true, '后缀须与 base-paint/help-shell 逐字一致');
  assert.equal(html.includes(HELP_SHELL_TITLE_SLOT), false, '标题槽不许留占位');
  assert.equal(html.includes('<title>私家大厨 HELP · 能力速查</title>'), true, '标题＝老家产物原文');
  assert.equal(env.delivery.bytes, Buffer.byteLength(html, 'utf8'));
  const i = html.indexOf('"skill_name"');
  assert.ok(i > 0, '载荷段里应有 skill_name');
  console.log('#216 读数：HELP ' + env.delivery.bytes + ' B／' + (html.match(/\n/g) || []).length + ' LF');
});

test('#216 ③ 同秒独占递补：`reuseHours:0`（每次都落新的）连跑 6 次 ⇒ 6 个名字互不相同、一份都没被盖掉', () => {
  const db = mkTmp('succession');
  // #245：缺省已带「一天内复用」窗口，故独占递补这条语义要用 `reuseHours:0` 来验；
  // 缺省那条（连跑 6 次只留 1 份）由本文件 ③b 锁。
  const runs = [];
  for (let i = 0; i < 6; i++) runs.push(runOk(db, [KEY, '--params', P({ reuseHours: 0 })]));
  const paths = runs.map((e) => e.delivery.path);
  assert.equal(new Set(paths).size, 6, '6 次调用必须是 6 个不同的名字');
  const names = namesOf(db);
  assert.equal(names.length, 6, '目录里恰 6 份产物：' + JSON.stringify(names));
  assert.deepEqual([...names].sort(), [...paths.map((p) => basename(p))].sort());
  // 同秒 _N 递补的槽位连续性：同一时间戳这一组必须是本体、_2、_3… 不留空
  const byStamp = new Map();
  for (const n of names) {
    const m = HELP_RE.exec(n);
    assert.ok(m, '名字不认：' + n);
    const slot = m[2] === undefined ? 1 : Number(m[2]);
    byStamp.set(m[1], (byStamp.get(m[1]) || []).concat(slot));
  }
  for (const [stamp, slots] of byStamp) {
    assert.deepEqual(slots.slice().sort((a, b) => a - b),
      Array.from({ length: slots.length }, (_, i) => i + 1), '同一秒的槽位必须连续：' + stamp);
  }
  // 绝不静默覆盖：每份的字节数各自与自己的回执一致（被盖掉的话后写的会改前一份）
  for (let i = 0; i < runs.length; i++) {
    assert.equal(readFileSync(paths[i]).length, runs[i].delivery.bytes, '第 ' + String(i + 1) + ' 份被改动了');
  }
  // 同一时间戳（同一秒⇒同一分钟）的那一组必须**逐字节一致**。跨分钟时页头「更新于 …」会差一个字，
  // 那是设计（`subtitle` 到分钟）；故只按时间戳分组比，不跨组比。
  const byStampText = new Map();
  for (const n of names) {
    const stamp = HELP_RE.exec(n)[1];
    const text = readFileSync(join(helpDirOf(db), n), 'utf8');
    if (byStampText.has(stamp)) assert.equal(text, byStampText.get(stamp), '同一时间戳的产物应逐字节一致：' + n);
    else byStampText.set(stamp, text);
  }
  console.log('#216 读数：6 次缺省调用 → ' + JSON.stringify(names));
});

test('#216 ③b #245 缺省复用：连跑 6 次 ⇒ 只落 1 份、6 回执同落点、旧产物一字未动；`reuseHours:3` 同效', () => {
  const db = mkTmp('reuse');
  const first = runOk(db, [KEY]);
  const names0 = namesOf(db);
  assert.equal(names0.length, 1, '首跑恰一份');

  for (let i = 0; i < 5; i++) {
    const again = runOk(db, [KEY]);
    assert.equal(again.delivery.path, first.delivery.path, '窗口内每次必须复用同一份（第 ' + String(i + 2) + ' 次）');
    assert.equal(again.delivery.bytes, first.delivery.bytes, '复用那份的字节数与首跑一致');
  }
  assert.deepEqual(namesOf(db), names0, '连跑 6 次目录仍只有那一份（不再涨目录）');
  assert.equal(readFileSync(first.delivery.path).length, first.delivery.bytes, '已有那份未被改写');

  // 显式给窗口（三天）同效：窗口内有那一份 ⇒ 还是复用同一份。
  const threeDays = runOk(db, [KEY, '--params', P({ reuseHours: 72 })]);
  assert.equal(threeDays.delivery.path, first.delivery.path, '`reuseHours:72` 窗口内同样复用');
  assert.equal(namesOf(db).length, 1, '目录仍一份');

  // `reuseHours:0` ⇒ 每次都落新的（要一份最新的走这条）。
  const fresh = runOk(db, [KEY, '--params', P({ reuseHours: 0 })]);
  assert.notEqual(fresh.delivery.path, first.delivery.path, '`reuseHours:0` ⇒ 落新的一份');
  assert.equal(namesOf(db).length, 2, '目录里 2 份（旧的留着当留档）');
  // 坏参阻断：负数／非数一律 exit 2（不静默当 0）。
  assert.equal(run(db, [KEY, '--params', P({ reuseHours: -1 })]).status, 2);
  assert.equal(run(db, [KEY, '--params', P({ reuseHours: '一天' })]).status, 2);
});

test('#216 ④ 两支互不串：缺省 HELP 支与显式速查支同目录、不同名、载荷各是各的', () => {
  const db = mkTmp('two-branches');
  const help = runOk(db, [KEY]);
  const lookup = runOk(db, [KEY, '--params', P({ mode: 'lookup' })]);
  assert.equal(lookup.data.mode, 'lookup');
  assert.equal(lookup.data.total, 37, '速查支＝今天那 37 条短语');
  assert.equal(lookup.data.items.length, 37);
  assert.ok(LOOKUP_RE.test(basename(lookup.delivery.path)), '速查产物名不符：' + basename(lookup.delivery.path));
  assert.equal(stampWindow().includes(LOOKUP_RE.exec(basename(lookup.delivery.path))[1]), true);
  assert.equal(HELP_RE.test(basename(lookup.delivery.path)), false, '速查支不许落成 HELP 名');
  assert.notEqual(lookup.delivery.path, help.delivery.path);
  assert.deepEqual(namesOf(db), [basename(help.delivery.path), basename(lookup.delivery.path)].sort());
  // 速查支的页面走本技能自己的模板（落盘的那份也是完整 HTML 页，不是裸片段）
  const lookupHtml = readFileSync(lookup.delivery.path, 'utf8');
  assert.equal(lookupHtml.startsWith('<!DOCTYPE html>'), true);
  assert.equal(lookupHtml.includes('chef-cmd-read ' + KEY), true);
  assert.equal(existsSync(join(db, 'chef_data.db')), false, '速查支同样不许建库');
});

test('#216 ⑤ 退出码矩阵：0 三态／2 参数／1 预检／5 落盘；现找不刷目录', () => {
  const db = mkTmp('exits');
  assert.equal(run(db, [KEY]).status, 0);
  assert.equal(run(db, [KEY, '--params', P({ mode: 'lookup' })]).status, 0);
  const before = namesOf(db).length;
  const q = run(db, [KEY, '--params', P({ q: '帮我搜个虾球菜' })]);
  assert.equal(q.status, 0);
  const qEnv = JSON.parse(String(q.stdout));
  assert.equal(qEnv.delivery, undefined, '现找（q）只回命中，不落盘');
  assert.equal(qEnv.data.items.some((x) => x.key === 'chef.recipe.search'), true);
  assert.equal(namesOf(db).length, before, '现找不许往目录里加东西');
  assert.equal(run(db, [KEY, '--params', P({ q: '能做啥', mode: 'lookup' })]).status, 2, 'q 与 mode 互斥');
  assert.equal(run(db, [KEY, '--params', P({ mode: '速查' })]).status, 2, 'mode 只认 lookup');
  assert.equal(run(db, [KEY, '--params', '[]']).status, 2);
  assert.equal(run(db, [KEY], { SKILLS_DB_PATH: '' }).status, 1, '缺 SKILLS_DB_PATH 走预检 exit 1');
  assert.equal(run(db, ['chef.nope']).status, 3);
  assert.equal(run(db, ['chef.nope']).stdout, '', '失败路径 stdout 必须干净');
  // 落盘失败：`--html` 指到一个「父路径是文件」的位置 ⇒ mkdirSync ENOTDIR ⇒ exit 5
  const blocker = join(db, 'blocker');
  writeFileSync(blocker, 'x');
  const bad = run(db, [KEY, '--html', join(blocker, 'x.html')]);
  assert.equal(bad.status, 5, '落盘失败须 exit 5：' + String(bad.stderr));
  assert.equal(bad.stdout, '', '落盘失败 stdout 必须干净');
});
