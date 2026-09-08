/** #87 · 输出命名规范复刻（M10）验收测试：目录／命名／同秒后缀／--output 覆盖 逐条对照旧基线。
 *
 * 旧版真值：`D:\2Study\StudyNotes\SKILLS\卡路里\scripts\html_paths.py`
 *   `calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html`，跟随 `SKILLS_DB_PATH`，`--output` 显式覆盖。
 * 新架构 `<中文command>` 真值 = `CALORIE_COMBOS[key].title`（`combos.yaml` 同值镜像）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/output-naming-87.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { CALORIE_COMBOS } from '../dist/cli/keys.js';
import { TRIGGERS } from '../dist/triggers/index.js';
import {
  HTML_DIR_NAME,
  chineseCommandFor,
  formatStamp,
  htmlDir,
  htmlFileName,
  resolveDefaultHtmlPath,
  resolveExplicitHtmlPath,
  sanitizeFilenamePart,
} from '../dist/output.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
/** 静态键（不依赖库内数据），title = 唤醒词HELP：默认落盘用例最省种子。 */
const KEY = 'calorie.help.lookup';
const TITLE = '唤醒词HELP';
const PARAMS = { q: '看今日主页' };
const STAMP_RE = '\\d{8}_\\d{6}';

function tmpDbDir(tag) {
  return mkdtempSync(join(tmpdir(), 't87-' + tag + '-'));
}

/** 本地日（与 CLI todayISO() 同口径；种子按「相对今天」铺，跑在任何日期都稳定）。 */
function localIso(msAgo) {
  const d = new Date(Date.now() - msAgo);
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function runCli(dir, args) {
  return spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: dir },
  });
}

function runOk(dir, args) {
  const r = runCli(dir, args);
  assert.equal(r.status, 0, 'exit=' + r.status + ' stderr=' + String(r.stderr).slice(-400));
  return JSON.parse(String(r.stdout));
}

// ---------------------------------------------------------------- ① 字段清洗（旧 _sanitize_filename_part）
test('#87 ① 字段清洗逐字复刻：非法字符 → _、去前后空格、截断 32 字符', () => {
  assert.equal(sanitizeFilenamePart('香蕉'), '香蕉');
  assert.equal(sanitizeFilenamePart('  a b  '), 'a b');
  assert.equal(sanitizeFilenamePart('a\\b/c:d*e?f"g<h>i|j[k]'), 'a_b_c_d_e_f_g_h_i_j_k_');
  assert.equal(sanitizeFilenamePart('x'.repeat(40)).length, 32, '截断按字符数');
  assert.equal(sanitizeFilenamePart('中文'.repeat(20)).length, 32, '中文按字符（非字节）截断');
  assert.equal(sanitizeFilenamePart(undefined), '');
  assert.equal(sanitizeFilenamePart(null), '');
  assert.equal(sanitizeFilenamePart('   '), '');
});

// ---------------------------------------------------------------- ② 时间戳（旧 strftime("%Y%m%d_%H%M%S")）
test('#87 ② 时间戳：YYYYMMDD_HHMMSS 零填充 ＋ 本地时区', () => {
  assert.equal(formatStamp(new Date(2026, 6, 26, 12, 30, 0)), '20260726_123000');
  assert.equal(formatStamp(new Date(2026, 0, 2, 3, 4, 5)), '20260102_030405', '个位月/日/时/分/秒须补零');
  assert.equal(formatStamp(new Date(2026, 11, 31, 23, 59, 59)), '20261231_235959');
  const now = new Date();
  const got = formatStamp(now);
  assert.match(got, new RegExp('^' + STAMP_RE + '$'));
  assert.equal(got.slice(0, 8), String(now.getFullYear()) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0'), '本地时区口径');
});

// ---------------------------------------------------------------- ③ <中文command> 真值来源
test('#87 ③ <中文command> 真值 = CALORIE_COMBOS[key].title（77 键全量，且清洗为恒等）', () => {
  const keys = Object.keys(CALORIE_COMBOS);
  assert.equal(keys.length, 77);
  for (const k of keys) {
    const title = CALORIE_COMBOS[k].title;
    assert.ok(typeof title === 'string' && title.length > 0, k + ' 缺 title');
    assert.equal(chineseCommandFor(k), title, k + ' 命令名必须逐字等于注册表 title');
    assert.equal(sanitizeFilenamePart(title), title, k + ' title 须天然文件名安全（清洗恒等）');
    assert.doesNotMatch(title, /[\\/:*?"<>|[\]]/, k + ' title 不得含路径/glob 元字符');
  }
  assert.equal(chineseCommandFor('calorie.view.home'), '今日总览');
  assert.equal(chineseCommandFor('calorie.diet.add'), '记一餐');
  assert.throws(() => chineseCommandFor('calorie.nope'), /无中文 command 名/, '未注册键须抛（缺失阻断不返空）');
});

test('#87 ③b combos.yaml（唯一真相源镜像）与注册表 title 逐键同值', () => {
  const yaml = readFileSync(join(HERE, '..', '..', 'base-combos', 'combos.yaml'), 'utf8').replace(/\r\n/g, '\n');
  const combos = yaml.split('\n').slice(yaml.split('\n').findIndex((l) => l === 'combos:') + 1,
    yaml.split('\n').findIndex((l) => l === 'channels:'));
  const mirror = {};
  let cur = null;
  for (const ln of combos) {
    const key = ln.match(/^  - key: (\S+)\s*$/);
    if (key) { cur = key[1]; mirror[cur] = {}; continue; }
    const t = ln.match(/^    title: (.*?)\s*$/);
    if (t && cur) mirror[cur].title = t[1];
  }
  for (const [k, v] of Object.entries(CALORIE_COMBOS)) {
    assert.equal(mirror[k]?.title, v.title, 'combos.yaml 与 keys.ts title 不一致：' + k);
  }
});

test('#87 ③c 反例：wake_word 不是命令名真值（含空格/括号，且与 CLI 键非一一对应）', () => {
  const words = TRIGGERS.map((t) => t.wake_word).filter((w) => typeof w === 'string');
  assert.ok(words.length > 400, '唤醒词表非空（实 ' + words.length + '）');
  const unsafe = words.filter((w) => !/^[\p{L}\p{N}_-]+$/u.test(w));
  assert.ok(unsafe.length > 0, '唤醒词里确有带空格/括号的（如「看体重 vs 摄入(最近 7 天)」）');
  assert.ok(unsafe.some((w) => w.includes(' vs ') && w.includes('(')), '反例须含空格与括号');
  for (const k of Object.keys(CALORIE_COMBOS)) {
    assert.equal(chineseCommandFor(k), CALORIE_COMBOS[k].title, '真值只能取 title：' + k);
  }
});

// ---------------------------------------------------------------- ④ 同秒冲突后缀（旧 glob 计数 + 1）
test('#87 ④ 同秒冲突：无冲突 → 无后缀；已有 1 个 → _2；已有 2 个 → _3', () => {
  const dir = tmpDbDir('conflict');
  const now = new Date(2026, 6, 26, 12, 30, 0);
  const base = '今日总览_20260726_123000';
  assert.equal(htmlFileName('今日总览', { dir, now }), base + '.html');
  writeFileSync(join(dir, base + '.html'), 'x');
  assert.equal(htmlFileName('今日总览', { dir, now }), base + '_2.html');
  writeFileSync(join(dir, base + '_2.html'), 'x');
  assert.equal(htmlFileName('今日总览', { dir, now }), base + '_3.html');
  // 不干扰项：别的秒 / 别的命令 / 同秒但不同扩展名
  writeFileSync(join(dir, '今日总览_20260726_123001.html'), 'x');
  writeFileSync(join(dir, '饮食总览_20260726_123000.html'), 'x');
  writeFileSync(join(dir, base + '.txt'), 'x');
  assert.equal(htmlFileName('今日总览', { dir, now }), base + '_3.html', '无关文件不得改变计数');
  assert.equal(htmlFileName('饮食总览', { dir, now }), '饮食总览_20260726_123000_2.html', '不同命令各自独立计数（饮食总览 自己已有 1 个 → _2）');
  assert.equal(htmlFileName('今日总览', { dir: join(dir, '不存在'), now }), base + '.html', '目录不存在视为 0');
});

// ---------------------------------------------------------------- ⑤ 目录解析（旧 html_dir/html_path）
test('#87 ⑤ 默认落点：<SKILLS_DB_PATH>/calorie_html/<中文command>_<stamp>[_N].html，目录递归创建', () => {
  const a = tmpDbDir('dir-a');
  const b = tmpDbDir('dir-b');
  const now = new Date(2026, 6, 26, 12, 30, 0);
  assert.equal(HTML_DIR_NAME, 'calorie_html');
  assert.equal(htmlDir(a), join(a, 'calorie_html'));
  assert.ok(existsSync(join(a, 'calorie_html')), 'htmlDir 须建目录');
  const p = resolveDefaultHtmlPath('calorie.view.home', { now, dbDir: a });
  assert.equal(p, join(a, 'calorie_html', '今日总览_20260726_123000.html'));
  assert.equal(resolveDefaultHtmlPath('calorie.view.home', { now, dbDir: b }), join(b, 'calorie_html', '今日总览_20260726_123000.html'), '跟随传入的 DB 目录（＝SKILLS_DB_PATH）');
  assert.equal(dirname(resolveExplicitHtmlPath(join(a, 'x', 'y', 'z.html'))), join(a, 'x', 'y'), '显式路径建父目录');
  assert.ok(existsSync(join(a, 'x', 'y')));
  const envDir = tmpDbDir('dir-env');
  const old = process.env.SKILLS_DB_PATH;
  try {
    process.env.SKILLS_DB_PATH = envDir;
    assert.ok(resolveDefaultHtmlPath('calorie.view.home').startsWith(join(envDir, 'calorie_html')), '缺省参数须跟随 SKILLS_DB_PATH');
  } finally {
    if (old === undefined) delete process.env.SKILLS_DB_PATH; else process.env.SKILLS_DB_PATH = old;
  }
});

// ---------------------------------------------------------------- ⑥ CLI 默认落盘（无 --output/--html）
test('#87 ⑥ CLI 默认落盘：无 flag 也写 calorie_html，落点经 envelope data.output 回传', () => {
  const dir = tmpDbDir('cli-default');
  const env = runOk(dir, [KEY, '--params', JSON.stringify(PARAMS)]);
  assert.equal(env.key, KEY);
  assert.equal(env.shape, 'list');
  assert.ok(Array.isArray(env.data.items) && env.data.total >= 1, '形状载荷不被 output 字段破坏');
  assert.equal(typeof env.data.output, 'string', 'data.output 须回传落点');
  const out = env.data.output;
  assert.ok(out.startsWith(join(dir, HTML_DIR_NAME) + '\\') || out.startsWith(join(dir, HTML_DIR_NAME) + '/'), '默认目录须在 SKILLS_DB_PATH 下：' + out);
  assert.match(basename(out), new RegExp('^' + TITLE + '_' + STAMP_RE + '\\.html$'));
  assert.ok(existsSync(out), '默认产物必须落盘');
  const page = readFileSync(out, 'utf8');
  assert.ok(page.length > 0 && page.includes('<'), '产物须是 HTML');
  assert.deepEqual(readdirSync(join(dir, HTML_DIR_NAME)), [basename(out)], '同一次调用只出一个产物');
});

test('#87 ⑥b stat 形状逐键生效：calorie.view.home 落「今日总览_<TS>.html」，metrics 不受 output 影响', async () => {
  const dir = tmpDbDir('cli-home');
  const { openDb } = await import('../dist/index.js');
  const d = openDb(join(dir, 'calorie_data.db'));
  const today = localIso(0);
  d.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  d.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0)').run();
  d.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, '08:00:00', '燕麦', 100, 389, 13, 66, 7)").run(today);
  d.close();
  const env = runOk(dir, ['calorie.view.home', '--params', JSON.stringify({ date: today })]);
  assert.equal(env.shape, 'stat');
  assert.ok(Object.keys(env.data.metrics).length > 0);
  for (const v of Object.values(env.data.metrics)) assert.equal(typeof v, 'number', 'metrics 须全 number（output 字段在 metrics 之外）');
  assert.match(basename(env.data.output), new RegExp('^今日总览_' + STAMP_RE + '\\.html$'));
  assert.ok(existsSync(env.data.output));
});

// ---------------------------------------------------------------- ⑦ CLI 同秒冲突
test('#87 ⑦ CLI 同秒冲突：同秒已有同名 → 自动追加 _2（预置未来 10 秒，避免跨秒抖动）', () => {
  const dir = tmpDbDir('cli-conflict');
  const html = join(dir, HTML_DIR_NAME);
  mkdirSync(html, { recursive: true });
  const seeded = [];
  for (let i = 0; i < 10; i++) {
    const s = formatStamp(new Date(Date.now() + i * 1000));
    seeded.push(s);
    writeFileSync(join(html, TITLE + '_' + s + '.html'), 'seed');
  }
  const env = runOk(dir, [KEY, '--params', JSON.stringify(PARAMS)]);
  const name = basename(env.data.output);
  assert.match(name, new RegExp('^' + TITLE + '_' + STAMP_RE + '_2\\.html$'), '实际落点：' + name);
  assert.ok(seeded.includes(name.slice(TITLE.length + 1, TITLE.length + 16)), '落点秒须在预置窗口内：' + name);
  assert.ok(existsSync(env.data.output));
});

// ---------------------------------------------------------------- ⑧ --output 显式覆盖
test('#87 ⑧ --output 覆盖：写显式路径、不改名、不碰 calorie_html；--html 为等价别名', () => {
  const dir = tmpDbDir('cli-output');
  const explicit = join(dir, '自定义', '报告.html');
  const env = runOk(dir, [KEY, '--params', JSON.stringify(PARAMS), '--output', explicit]);
  assert.equal(env.data.output, explicit);
  assert.ok(existsSync(explicit), '--output 须逐字写到给定路径');
  assert.equal(existsSync(join(dir, HTML_DIR_NAME)), false, '显式覆盖时不得再产默认目录产物');
  const alias = join(dir, 'alias.html');
  const env2 = runOk(dir, [KEY, '--params', JSON.stringify(PARAMS), '--html', alias]);
  assert.equal(env2.data.output, alias, '--html 保持旧语义（legacy 别名）');
  assert.ok(existsSync(alias));
  const win = join(dir, 'win.html');
  const env3 = runOk(dir, [KEY, '--params', JSON.stringify(PARAMS), '--html', join(dir, 'lose.html'), '--output', win]);
  assert.equal(env3.data.output, win, '--output 优先于 --html');
  assert.ok(existsSync(win) && !existsSync(join(dir, 'lose.html')));
  const bad = runCli(dir, [KEY, '--params', JSON.stringify(PARAMS), '--output']);
  assert.equal(bad.status, 2, '--output 缺值仍走用法错误');
  assert.match(String(bad.stderr), /--output/);
});
