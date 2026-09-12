/** T2-②a #133 · HELP 落盘的**命名与落点**锁（#237 改判后重写；本文件只锁本技能自己的值与真出口落点）。
 *
 * 为什么重写：时间戳格式 `YYYYMMDD_HHMMSS` 与通式 `〈文件名主体〉_<stamp>[_N].html` 已收进共用件
 * `base-paint/save-html`（`saveHtmlFile`），本票（#237，甲案）随之删掉了本模块的
 * `formatHelpStamp`／`buildHelpFileName`／`resolveStemTarget`。原来那批对它们的金值型单测
 * （①–④、⑧、⑨、⑬–⑮）**不再住这里**：通式本身的唯一定义地与用例归共用件
 * （`packages/base-render/test/output-save-html-237.test.mjs`）。本文件改为锁三件事：
 *  ① 本技能自己的三个值（目录名／扩展名／速查台主体）；
 *  ② 真出口（spawn `dist/cli/cmd_read.js`）的落点：HELP 文件与速查台**两份产物分名**、都落 `<db>/calorie_html/`；
 *  ③ 相对 `SKILLS_DB_PATH` 亦回传**绝对路径**（#83 返修 R-1 口径；#237 起由共用件 `resolve(dir)` 保证）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { HELP_HTML_DIR_NAME, HELP_HTML_EXT, SHEET_FILE_STEM } from '../dist/render/helpPaths.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'calorie.help.center';
const HELP_NAME_RE = /^卡路里_HELP_\d{8}_\d{6}(_\d+)?\.html$/;
const SHEET_NAME_RE = /^卡路里_速查台_\d{8}_\d{6}(_\d+)?\.html$/;

function tmpDbDir(tag) {
  return mkdtempSync(join(tmpdir(), 't133-' + tag + '-'));
}

function run(dbPath, args = [KEY], cwd) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dbPath },
    ...(cwd === undefined ? {} : { cwd }),
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stderr: String(r.stderr), env };
}

test('#133 ⑫ 三个值字面量（防漂移：老 `SKILL_HTML_NAME + "_html"` → calorie_html；速查台与 HELP 分名）', () => {
  assert.equal(HELP_HTML_DIR_NAME, 'calorie_html');
  assert.equal(HELP_HTML_EXT, '.html');
  assert.equal(SHEET_FILE_STEM, '卡路里_速查台');
});

test('#133 ⑬ 真出口缺省：HELP 文件落 <db>/calorie_html/卡路里_HELP_<TS>.html（干净目录无 _N）', () => {
  const dbDir = tmpDbDir('target');
  const r = run(dbDir);
  assert.equal(r.status, 0, r.stderr);
  const out = r.env.data.output;
  assert.ok(isAbsolute(out), 'data.output 须绝对路径：' + out);
  assert.equal(dirname(out), join(dbDir, HELP_HTML_DIR_NAME), '落 <SKILLS_DB_PATH>/calorie_html/');
  assert.match(basename(out), HELP_NAME_RE, '老命名（旧 html_paths.html_name 通式）：' + basename(out));
  assert.ok(existsSync(out), '产物须真实落盘');
  assert.equal(basename(out).endsWith(HELP_HTML_EXT), true);
  assert.equal(readdirSync(join(dbDir, HELP_HTML_DIR_NAME)).length, 1, '干净目录只落一份');
});

test('#133 ⑮ 速查台与 HELP 文件分名：两份产物同时在，互不覆盖', () => {
  const dbDir = tmpDbDir('sheet');
  const help = run(dbDir);
  const sheet = run(dbDir, [KEY, '--params', '{"mode":"file"}']);
  assert.equal(sheet.status, 0, sheet.stderr);
  assert.match(basename(help.env.data.output), HELP_NAME_RE);
  assert.match(basename(sheet.env.data.output), SHEET_NAME_RE, '速查台独立命名：' + basename(sheet.env.data.output));
  assert.notEqual(help.env.data.output, sheet.env.data.output, '两份产物分名');
  const files = readdirSync(join(dbDir, HELP_HTML_DIR_NAME)).sort();
  assert.equal(files.length, 2, '两份产物同时在：' + files.join(','));
  assert.ok(readFileSync(help.env.data.output, 'utf8').includes('<title>卡路里 · 唤醒词速查台</title>'));
});

test('#133 ⑭ 相对 SKILLS_DB_PATH 亦回传绝对路径（#83 R-1；#237 起由共用件 resolve(dir) 保证）', () => {
  const root = tmpDbDir('rel');
  try {
    const relDb = 'rel_db';
    mkdirSync(join(root, relDb), { recursive: true }); // 库目录须先在（否则开库即 ENOENT，测不到落点归一）
    const r = run(relDb, [KEY], root);
    assert.equal(r.status, 0, r.stderr);
    const out = r.env.data.output;
    assert.ok(isAbsolute(out), '相对 SKILLS_DB_PATH 下回执仍须绝对：' + out);
    assert.equal(dirname(out), join(resolve(root), relDb, HELP_HTML_DIR_NAME));
    assert.ok(existsSync(out), '产物按绝对路径真在盘上');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
