#!/usr/bin/env node
/** #726 · 验收脚本：**配置真进执行路径**（票面判据 2）＋ 默认值逐字等于改造前常量。
 *
 * 判据分三段：
 *   ① **老四件常量**（`DB_FILENAME`／`GOALS_FILENAME`／`HELP_HTML_DIR_NAME`／`LOOKUP_FILE_STEM`／`HELP_FILE_STEM`）
 *      当刻读数仍逐字等于改造前那串字面量（默认值表的具名引用没把值改掉）；
 *   ② **一份配置都不给**（配置目录里没有 `bill.yaml`）：落点＝配置数据目录
 *      `<配置目录>/data/`，库名／产物目录名／主体名／备份主体全走默认；
 *   ③ **配置改哪、落点跟到哪**：`db.dir`／`db.name`／`db.goals`／`html.dir`／`html.helpStem`／
 *      `html.quickRefStem`／`backup.dir`／`backup.stem` 八项逐项改写后，真出口的落点逐项跟着改。
 *
 * 跑法（**持锁**，见 `docs/subagent-concurrency-protocol.md` §2.4；前置＝`tsc -b packages/skill-bill --force`）：
 *   node tooling/run-locked.mjs --ticket 726 -- node docs/skills/skill-bill/t726-验收.mjs
 * 末行固定：`RESULT: n/m`；exit 0 绿、1 红。临时目录用完即清（路径守卫见 `cleanup`）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'packages', 'skill-bill');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: ok === true });
  console.log((ok === true ? '  ✔ ' : '  ✖ ') + name + (detail === '' ? '' : '：' + detail));
}

const ROOT = mkdtempSync(join(tmpdir(), 't726-accept-'));

/** 与 `base-link-core` 的写出口同一条规则：字符串只在必要时加双引号（Windows 路径必加）。 */
function scalar(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = String(value);
  const plain = /^[A-Za-z0-9_\u4e00-\u9fff][^#:'"\s]*$/.test(s);
  const numeric = /^-?\d+(?:\.\d+)?$/.test(s);
  if (s === '' || numeric || s === 'true' || s === 'false' || !plain) return JSON.stringify(s);
  return s;
}
/** 造一份配置目录：`groups` 为 `{db:{dir,name…}, html:{…}, backup:{…}}`；文件写不写由调用方决定。 */
function configDir(tag, groups = null) {
  const dir = join(ROOT, tag);
  mkdirSync(join(dir, '.ilife'), { recursive: true });
  if (groups !== null) {
    const lines = [];
    for (const [group, inner] of Object.entries(groups)) {
      lines.push(group + ':');
      for (const [k, v] of Object.entries(inner)) lines.push('  ' + k + ': ' + scalar(v));
    }
    writeFileSync(join(dir, '.ilife', 'bill.yaml'), lines.join('\n') + '\n', 'utf8');
  }
  return dir;
}
function run(cfgDir, args) {
  return spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf8',
    env: { ...process.env, USERPROFILE: cfgDir, HOME: cfgDir},
  });
}
function envelope(r) {
  const lines = String(r.stdout || '').trim().split(/\r?\n/).filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}
function stampOf(path) {
  const m = /_(\d{8}_\d{6})(?:_\d+)?\.html$/.exec(basename(path));
  return m === null ? '' : m[1];
}
function cleanup() {
  const guard = resolve(tmpdir()) + '\\';
  if (!resolve(ROOT).startsWith(guard)) throw new Error('拒绝删除临时根之外的路径：' + ROOT);
  rmSync(ROOT, { recursive: true, force: true });
}

/* ── ① 老四件常量逐字没走样（从 dist 的对外面取，不看源码字面量） ───────────────────────── */
const dist = await import('file://' + join(PKG, 'dist', 'index.js').replace(/\\/g, '/'));
const distRender = await import('file://' + join(PKG, 'dist', 'render', 'index.js').replace(/\\/g, '/'));
check('① 老常量：库名 biscuit_accountant.db', dist.DB_FILENAME === 'biscuit_accountant.db', String(dist.DB_FILENAME));
check('① 老常量：第二份库 goals.json', dist.GOALS_FILENAME === 'goals.json', String(dist.GOALS_FILENAME));
check('① 老常量：产物目录 biscuit_accountant_html',
  distRender.HELP_HTML_DIR_NAME === 'biscuit_accountant_html', String(distRender.HELP_HTML_DIR_NAME));
check('① 老常量：HELP 主体 饼干记账_HELP', distRender.HELP_FILE_STEM === '饼干记账_HELP', String(distRender.HELP_FILE_STEM));
check('① 老常量：速查表主体 饼干记账_速查表',
  distRender.LOOKUP_FILE_STEM === '饼干记账_速查表', String(distRender.LOOKUP_FILE_STEM));

/* ── ② 一份配置都不给：落点＝数据目录 ＋ 全默认 ────────────────────────────────────────── */
const bare = configDir('bare');
check('② 首次读自动落一份默认 bill.yaml', (run(bare, ['bill.help.lookup']).status === 0) && existsSync(join(bare, '.ilife', 'bill.yaml')));

const helpOut = envelope(run(bare, ['bill.help.lookup'])).delivery.path;
check('② HELP 落 <配置目录>/data/biscuit_accountant_html/饼干记账_HELP_<TS>.html',
  dirname(resolve(helpOut)) === join(bare, 'data', 'biscuit_accountant_html')
  && basename(helpOut).startsWith('饼干记账_HELP_') && stampOf(helpOut) !== '', helpOut);

const lookupOut = envelope(run(bare, ['bill.help.lookup', '--params', '{"mode":"lookup"}'])).delivery.path;
check('② 速查表落同目录、主体 饼干记账_速查表',
  dirname(resolve(lookupOut)) === join(bare, 'data', 'biscuit_accountant_html')
  && basename(lookupOut).startsWith('饼干记账_速查表_'), lookupOut);

const now = new Date();
const p2 = (n) => String(n).padStart(2, '0');
const today = now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate());
const stamp = today + ' ' + p2(now.getHours()) + ':' + p2(now.getMinutes()) + ':00';
const bareAdd = run(bare, ['bill.record.add', '--params', JSON.stringify({ category: '餐饮', amount: -12.5, time: stamp })]);
check('② 写命令建库＝<配置目录>/data/biscuit_accountant.db',
  bareAdd.status === 0 && existsSync(join(bare, 'data', 'biscuit_accountant.db')), String(bareAdd.stderr).slice(-120));

const bareToday = envelope(run(bare, ['bill.record.today']));
const bareTotal = typeof bareToday.data.total === 'number' ? bareToday.data.total : (bareToday.data.items ?? []).length;
check('② 读命令读的是同一个库（查今天读到刚写的那笔）', bareTotal >= 1, 'total=' + String(bareTotal));

const bareBackup = envelope(run(bare, ['bill.setup.run', '--params', '{"op":"backup-create"}']));
const bareBackupText = JSON.stringify(bareBackup.data);
const bareBackupFiles = existsSync(join(bare, 'data', 'backups')) ? readdirSync(join(bare, 'data', 'backups')) : [];
check('② 备份落 <库目录>/backups、主体 biscuit_',
  bareBackupFiles.some((f) => f.startsWith('biscuit_') && f.endsWith('.db')), bareBackupFiles.join('、') || bareBackupText);

run(bare, ['bill.goal.write', '--params', JSON.stringify({ op: 'set-budget', month: today.slice(0, 7), amount: 3000 })]);
check('② 第二份库＝<数据目录>/goals.json（缺省名）', existsSync(join(bare, 'data', 'goals.json')));

/* ── ③ 八项配置逐项改写 ⇒ 落点逐项跟着改 ──────────────────────────────────────────────── */
const X = join(ROOT, 'custom-db');
const H = join(ROOT, 'custom-html');
const B = join(ROOT, 'custom-backup');
const cfg = configDir('custom', {
  db: { dir: X, name: 'my.db', goals: 'my-goals.json' },
  html: { dir: 'my_html', helpStem: '我的帮助', quickRefStem: '我的速查' },
  backup: { dir: B, stem: 'bk_' },
});
const cfgAdd = run(cfg, ['bill.record.add', '--params', JSON.stringify({ category: '餐饮', amount: -3, time: stamp })]);
check('③ db.dir＋db.name：库落在 <db.dir>/my.db', cfgAdd.status === 0 && existsSync(join(X, 'my.db')), String(cfgAdd.stderr).slice(-120));

const status = envelope(run(cfg, ['bill.setup.run', '--params', '{"op":"init-status"}']));
// 回执形状：正文落在 `data` 里（`init-status` 那句自报库路径），这里整段序列化后按路径子串认
// （JSON 里的反斜杠是转义过的，比较前先还原）。
const statusText = JSON.stringify(status.data).replace(/\\\\/g, '\\');
check('③ 读命令自报的库路径＝<db.dir>/my.db', statusText.includes(join(X, 'my.db')), statusText.slice(-120));

const cfgHelp = envelope(run(cfg, ['bill.help.lookup'])).delivery.path;
check('③ html.dir＋html.helpStem：HELP 落 <db.dir>/my_html/我的帮助_<TS>.html',
  dirname(resolve(cfgHelp)) === join(X, 'my_html') && basename(cfgHelp).startsWith('我的帮助_'), cfgHelp);

const cfgLookup = envelope(run(cfg, ['bill.help.lookup', '--params', '{"mode":"lookup"}'])).delivery.path;
check('③ html.quickRefStem：速查表主体 我的速查', basename(cfgLookup).startsWith('我的速查_'), cfgLookup);

const cfgToday = envelope(run(cfg, ['bill.record.today']));
const cfgTotal = typeof cfgToday.data.total === 'number' ? cfgToday.data.total : (cfgToday.data.items ?? []).length;
check('③ 读命令读的是配置指定的那个库', cfgTotal >= 1, 'total=' + String(cfgTotal));

run(cfg, ['bill.goal.write', '--params', JSON.stringify({ op: 'set-budget', month: today.slice(0, 7), amount: 500 })]);
check('③ db.goals：第二份库＝<db.dir>/my-goals.json', existsSync(join(X, 'my-goals.json')));

run(cfg, ['bill.setup.run', '--params', '{"op":"backup-create"}']);
const cfgBackupFiles = existsSync(B) ? readdirSync(B) : [];
check('③ backup.dir＋backup.stem：备份落 <backup.dir>、主体 bk_',
  cfgBackupFiles.some((f) => f.startsWith('bk_') && f.endsWith('.db')), cfgBackupFiles.join('、') || '(空)');
check('③ 备份没有漏到默认目录', !existsSync(join(X, 'backups')));

/* ── 收尾 ─────────────────────────────────────────────────────────────────────────────── */
const pass = results.filter((r) => r.ok).length;
const total = results.length;
console.log('RESULT: ' + pass + '/' + total);
if (pass === total) console.log('PASS: 配置真进执行路径 ＋ 默认值逐字等于改造前常量');
else console.log('FAIL: 有判据没对上（见上面 ✖ 行）');
void statSync;
cleanup();
process.exit(pass === total ? 0 : 1);
