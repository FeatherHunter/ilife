/** #204 · 「作息管家help」出口与命名的 **CLI 级锁**（真 spawn 子进程跑出口；不调模块、不进程内调函数）。
 *
 * 与上一票 #203 的分工：`help-delivery-203.test.mjs` 锁「缺省支真的产出、落点对、不建库」；
 * 本文件锁**以后回退会咬人**的五件事（票面 #204）：
 *  ① 名字通式：`作息管家_HELP_<YYYYMMDD>_<HHMMSS>.html`——含时间戳格式与**本地时区秒**
 *     （`TZ=UTC` 与 `TZ=Asia/Shanghai` 两次 spawn 对照：名字里的秒各等于该进程时区的墙上秒，两者相差 8 小时）；
 *  ② help 模板**前后缀逐字**：文档起于 `<!DOCTYPE html>…<title>…</title>` 字面量、止于 `</body>\r\n</html>\r\n`，
 *     中间只有一处 `help-data` 载荷；另锁 `<!-- 公共组件注入管线 -->` 锚点与载荷闭标签后的共享运行时开头；
 *  ③ 同名递补：预置同一秒的首候选（哨兵文件）再 spawn，本次必须落 `_2` 且**哨兵逐字未动**（独占写，不覆盖）；
 *     另跑一次真并发（两进程同时起），两份都在、落点互不相同；
 *  ④ 三条显式分支互不串：`--html <路径>`（写该路径、是完整 HELP 页、不落缺省目录）／
 *     非 help 命令带 `--html`（仍写既有的 envelope 分节页）／`q` 现找（不落盘、无 delivery）；
 *  ⑤ 退出码矩阵：成功 0；落盘失败 5 且 **stdout 一个字节不吐**（不吹牛）。
 *
 * 变异自证（票面硬要求）：出口路径可用 `T204_CLI_BIN` 指向一份**变异副本**的 dist——
 * 副本在 `.scratch/t204-vary/`（已被 `.gitignore` 忽略）复制一份最小工程、就地改源重建，
 * 仓库主树一字不动：
 *  - 改文件名主体（`作息管家_HELP` → `作息管家_HELPX`）⇒ ① 该红；
 *  - 独占写改覆盖写（`flag:'wx'` → `flag:'w'`）⇒ ③ 该红。
 *  缺省（不设该环境变量）＝本包 `dist/cli/cmd_read.js`，即交付出口。
 *
 * 运行：先 `pnpm -C packages/skill-schedule exec tsc -b --force`（用例读 `dist/**`，dist 陈旧＝测的是旧出口），
 * 再 `node --test packages/skill-schedule/test/help-delivery-204.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 交付出口（可被变异自证指向副本；缺省＝本包 dist）。 */
const BIN = process.env.T204_CLI_BIN ?? join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = process.execPath;
const KEY = 'schedule.help.lookup';

/** 老通式（`t198-old-help-truth.md` 第四节）：`作息管家_HELP_<YYYYMMDD>_<HHMMSS>[_N].html`。
 *  分组顺序＝年／月／日／时／分／秒（第 7 组是递补号，无递补时 undefined）。 */
const NAME_RE = /^作息管家_HELP_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?:_(\d+))?\.html$/;

/** ② 模板前缀逐字（前六行＋标题行；标题由 5 键派生：`title` 已含技能名 ⇒ 不重复前缀）。
 *  共享模板 `packages/base-render/assets/help-template.html` 改源后重跑 `gen:help-shell`，此字面量须同步。 */
const HEAD_LITERAL = '<!DOCTYPE html>\r\n<html lang="zh-CN">\r\n<head>\r\n<meta charset="UTF-8">\r\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1.0">\r\n'
  + '<title>作息管家 · 使用手册(HELP)</title>\r\n<style>\r\n';
/** ② 载荷容器锚点（含它前面那行注释，逐字）。 */
const DATA_ANCHOR = '<!-- 公共组件注入管线 -->\r\n<script id="help-data" type="application/json">';
/** ② 载荷闭标签之后的共享运行时开头（模板后缀逐字开头）。 */
const SUFFIX_HEAD_LITERAL = '</script>\r\n<script>\r\n/* Base Skill 控件库 v1.2';
/** ② 文档收尾逐字。 */
const TAIL_LITERAL = '</script>\r\n</body>\r\n</html>\r\n';
/** ③ 哨兵：预置的首候选内容；它的字节不得被本次调用改写。 */
const SENTINEL = '<!-- SENTINEL：本文件是别人先占的首候选，独占写必须让开 -->\n';

function mkDir(tag) {
  return mkdtempSync(join(tmpdir(), 't204-' + tag + '-'));
}

/** 真 spawn（同步）：argv ＋ JSON(stdout) ＋ exit。`tz` 非空时覆写子进程时区。 */
function run(dir, args, tz) {
  const childEnv = { ...process.env, SKILLS_DB_PATH: dir };
  if (tz !== undefined) childEnv.TZ = tz;
  const r = spawnSync(NODE_BIN, [BIN, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: childEnv });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

/** 真 spawn（异步，并发用；`spawnSync` 会把并发串成串行，测不出独占）。 */
function runAsync(dir, args = [KEY]) {
  return new Promise((resolve) => {
    const child = spawn(NODE_BIN, [BIN, ...args], { env: { ...process.env, SKILLS_DB_PATH: dir } });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      let env = null;
      try { env = JSON.parse(out); } catch { env = null; }
      resolve({ status: code, stdout: out, env });
    });
  });
}

function runOk(dir, args = [KEY], tz) {
  const r = run(dir, args, tz);
  assert.equal(r.status, 0, 'exit 0（stderr：' + r.stderr + '）');
  assert.ok(r.env, 'stdout 须是一行可解析 JSON');
  assert.equal(r.stdout.trim().split('\n').length, 1, 'P9：stdout 恒一行 JSON');
  return r;
}

/** 本进程时区的墙上秒（与默认 spawn 的子进程同一时区）。 */
function localStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return String(d.getFullYear()) + p(d.getMonth() + 1) + p(d.getDate())
    + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

/** 指定时区的墙上秒（父进程侧独立算，不借子进程的错误实现）。 */
function wallStamp(tz, d) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d);
  const g = (t) => parts.find((x) => x.type === t).value;
  return g('year') + g('month') + g('day') + '_' + g('hour') + g('minute') + g('second');
}

/** 名字 → 段：`m[1..6]` 年月日时分秒，`m[7]` 递补号。 */
function nameOf(p) {
  return basename(p);
}
function stampOf(p) {
  const m = nameOf(p).match(NAME_RE);
  assert.ok(m, '名字须合通式：' + nameOf(p));
  return m[1] + m[2] + m[3] + '_' + m[4] + m[5] + m[6];
}

/** 取 `help-data` 载荷（首处锚点；共享运行时里另有一处同名字符串，故只认紧随注释的那一处）。 */
function payloadOf(html) {
  const at = html.indexOf(DATA_ANCHOR);
  assert.ok(at > 0, '缺载荷锚点：' + DATA_ANCHOR);
  const open = html.indexOf('<script id="help-data"', at);
  const body = html.slice(open + '<script id="help-data" type="application/json">'.length);
  const end = body.indexOf('</script>');
  assert.ok(end >= 0, '载荷容器未闭合');
  return { json: body.slice(0, end), after: body.slice(end) };
}

test('#204 ① 名字通式：作息管家_HELP_<YYYYMMDD_HHMMSS>.html，时间戳＝**本进程时区**的墙上秒', () => {
  // 默认时区（继承本进程）：名字里的秒必须落在 spawn 前后两个本地墙上秒之间——秒级精确，不是「差不多」。
  const dir = mkDir('name');
  const t0 = new Date();
  const r = runOk(dir);
  const t1 = new Date();

  const out = r.env.delivery.path;
  assert.ok(isAbsolute(out), 'delivery.path 须绝对路径：' + out);
  assert.equal(basename(dirname(out)), 'help', '落 <SKILLS_DB_PATH>/schedule_html/help/');
  assert.equal(basename(dirname(dirname(out))), 'schedule_html');
  const m = nameOf(out).match(NAME_RE);
  assert.ok(m, '通式不符：' + nameOf(out));
  assert.equal(m[7], undefined, '全新目录首次落盘不带递补号');
  assert.ok([localStamp(t0), localStamp(t1)].includes(stampOf(out)),
    '时间戳须是本地墙上秒：' + stampOf(out) + ' ∉ {' + localStamp(t0) + ', ' + localStamp(t1) + '}');
  assert.equal(statSync(out).size, r.env.delivery.bytes, 'delivery.bytes ＝ 落盘字节数');

  // 时区锁：同一件事换时区跑，名字里的秒跟着换（＝本地时区，不是 UTC、也不是写死的某个时区）。
  const dUtc = mkDir('tz-utc');
  const u0 = new Date();
  const rUtc = runOk(dUtc, [KEY], 'UTC');
  const u1 = new Date();
  const dCn = mkDir('tz-cn');
  const c0 = new Date();
  const rCn = runOk(dCn, [KEY], 'Asia/Shanghai');
  const c1 = new Date();
  assert.ok([wallStamp('UTC', u0), wallStamp('UTC', u1)].includes(stampOf(rUtc.env.delivery.path)),
    'TZ=UTC 下名字须是 UTC 墙上秒：' + stampOf(rUtc.env.delivery.path));
  assert.ok([wallStamp('Asia/Shanghai', c0), wallStamp('Asia/Shanghai', c1)].includes(stampOf(rCn.env.delivery.path)),
    'TZ=Asia/Shanghai 下名字须是上海墙上秒：' + stampOf(rCn.env.delivery.path));
  assert.match(nameOf(rUtc.env.delivery.path), NAME_RE, '换时区不改通式（只改数字）');
  assert.match(nameOf(rCn.env.delivery.path), NAME_RE, '换时区不改通式（只改数字）');
  assert.notEqual(stampOf(rUtc.env.delivery.path), stampOf(rCn.env.delivery.path),
    '两个时区的秒不得相同（否则时区根本没生效，这条锁是空的）');

  // 秒级两位、取值范围合法（毫秒段／三位秒都会先被 NAME_RE 挡掉）。
  assert.ok(Number(m[4]) <= 23 && Number(m[5]) <= 59 && Number(m[6]) <= 59,
    '时分秒段须是合法值：' + m[4] + ':' + m[5] + ':' + m[6]);
});

test('#204 ② 模板前后缀逐字：doctype/charset/title 起、</body></html> 止，中间只有一处载荷', () => {
  const dir = mkDir('shell');
  const r = runOk(dir);
  const html = readFileSync(r.env.delivery.path, 'utf8');

  assert.equal(html.indexOf(HEAD_LITERAL), 0, '文档须以模板前缀逐字起（doctype＋charset＋viewport＋title）');
  assert.ok(html.endsWith(TAIL_LITERAL), '文档须以模板后缀逐字止：' + JSON.stringify(html.slice(-20)));
  assert.equal(html.includes(DATA_ANCHOR), true, '须带载荷锚点（注释行＋help-data 开标签逐字）');
  assert.equal(html.includes('<div class="stage">'), true, '须带共享模板的静态骨架件 .stage');

  const { json, after } = payloadOf(html);
  assert.ok(after.startsWith(SUFFIX_HEAD_LITERAL), '载荷闭标签后须紧接共享运行时开头：' + JSON.stringify(after.slice(0, 40)));
  assert.equal(/[\r\n]/.test(json), false, '载荷须单行（换行会破坏 JSON 行的可切分性）');
  assert.equal(json.includes('<'), false, '载荷里的小于号须转义（防脚本早闭）');

  const data = JSON.parse(json);
  assert.deepEqual(Object.keys(data), [
    'skill_name', 'title', 'subtitle', 'contact', 'groups', 'version', 'init_banner',
  ], '载荷键序须固定（前后缀之间只有这一段是变量，键序即契约）');
  assert.equal(data.skill_name, '作息管家');
  assert.equal(data.title, '作息管家 · 使用手册(HELP)');
  assert.equal(data.version, '2.0');
  assert.equal(data.contact.copy_all, true);
  assert.equal(data.init_banner.hidden, false, '新库＝首次使用横幅照显');
  assert.equal(data.groups.length, 5, '5 个一级分组');

  // 产物不是 envelope 分节页（那是 `--html` 那支的另一个东西），也不是别家技能那份页面。
  assert.equal(html.includes('<section data-skill="schedule"'), false, '缺省产物不得是分节页');
  assert.equal(nameOf(r.env.delivery.path).includes('help_center'), false, '不得混进老技能那份独立页面名');
});

test('#204 ③ 同名递补（`reuseHours:0`）：同秒的首候选被占 ⇒ 本次落 _2，且占位文件逐字未动', () => {
  let seen = null;
  for (let attempt = 1; attempt <= 6 && seen === null; attempt++) {
    const dir = mkDir('collide');
    const helpDir = join(dir, 'schedule_html', 'help');
    mkdirSync(helpDir, { recursive: true });
    // 给「本秒」与「下一秒」都放哨兵：子进程无论落在哪一秒，首候选都已被别人占住。
    const t0 = new Date();
    const stamps = [localStamp(t0), localStamp(new Date(t0.getTime() + 1000))];
    for (const s of stamps) writeFileSync(join(helpDir, '作息管家_HELP_' + s + '.html'), SENTINEL, 'utf8');

    // #245：缺省带「一天内复用」窗口 ⇒ 哨兵（几分钟内的名字）会被当复用对象返回，测不到递补；
    // 故独占递补这条语义用 `reuseHours:0`（每次都落新的）来验。
    const r = runOk(dir, [KEY, '--params', '{"reuseHours":0}']);
    const stamp = stampOf(r.env.delivery.path);
    if (!stamps.includes(stamp)) continue; // 恰被秒边界切开（子进程落到第三秒）＝本次不作数，下一轮重来
    seen = { dir, helpDir, stamps, r, stamp };
  }
  assert.ok(seen, '③ 未能落在预设的两秒内（子进程起得太慢？）——本轮不作数，须重跑本用例');
  const { helpDir, stamps, r, stamp } = seen;

  const m = nameOf(r.env.delivery.path).match(NAME_RE);
  assert.equal(m[7], '2', '首候选已被占 ⇒ 本次必须递补 _2，实际：' + nameOf(r.env.delivery.path));
  // 占位的那份逐字未动（独占写，不覆盖）；没被撞上的那份自然也未动。
  for (const s of stamps) {
    assert.equal(readFileSync(join(helpDir, '作息管家_HELP_' + s + '.html'), 'utf8'), SENTINEL,
      '预置的首候选被改写了（' + s + '）——独占写退化成覆盖写');
  }
  assert.deepEqual(readdirSync(helpDir).sort(),
    ['作息管家_HELP_' + stamps[0] + '.html', '作息管家_HELP_' + stamps[1] + '.html',
      '作息管家_HELP_' + stamp + '_2.html'].sort(),
    '目录里恰：两份哨兵 ＋ 本次那一份');
  const own = readFileSync(join(helpDir, '作息管家_HELP_' + stamp + '_2.html'), 'utf8');
  assert.equal(own.indexOf(HEAD_LITERAL), 0, '递补那份是真产物（完整 HELP 页）');
  assert.equal(statSync(join(helpDir, '作息管家_HELP_' + stamp + '_2.html')).size, r.env.delivery.bytes,
    '回执指向的字节数＝本次产物，不是别人的');
});

test('#204 ③ 真并发两次（`reuseHours:0`）：落点互不相同、两份都在；同秒则必有一方 _2', async () => {
  const dir = mkDir('race');
  const [a, b] = await Promise.all([
    runAsync(dir, [KEY, '--params', '{"reuseHours":0}']),
    runAsync(dir, [KEY, '--params', '{"reuseHours":0}']),
  ]);
  assert.equal(a.status, 0, 'A exit ' + a.status);
  assert.equal(b.status, 0, 'B exit ' + b.status);
  assert.ok(a.env && b.env, '两个 stdout 都须可解析');
  assert.notEqual(a.env.delivery.path, b.env.delivery.path, '两次调用落点各自独立（不得互相覆盖）');
  assert.ok(existsSync(a.env.delivery.path) && existsSync(b.env.delivery.path), '两份产物都在');
  for (const env of [a.env, b.env]) {
    assert.equal(statSync(env.delivery.path).size, env.delivery.bytes, '各自回执的字节数＝各自产物');
    assert.equal(readFileSync(env.delivery.path, 'utf8').indexOf(HEAD_LITERAL), 0, '两份都是完整 HELP 页');
  }
  const A = stampOf(a.env.delivery.path);
  const B = stampOf(b.env.delivery.path);
  if (A === B) {
    const nums = [nameOf(a.env.delivery.path), nameOf(b.env.delivery.path)]
      .map((n) => n.match(NAME_RE)[7]);
    assert.deepEqual(nums.slice().sort(), ['2', undefined].sort(), '同秒必有且只有一方 _2：' + nums.join(' / '));
  }
  assert.equal(readdirSync(join(dir, 'schedule_html', 'help')).length, 2, '目录里恰两份产物（无覆盖、无多余）');
});

test('#204 ④ 显式 `--html <路径>`：逐字写该路径（覆盖不递补）、内容是完整 HELP 页、不落缺省目录', () => {
  const dir = mkDir('explicit');
  const mine = join(dir, 'mine', 'named.html');
  const r = runOk(dir, [KEY, '--html', mine]);

  assert.equal(r.env.delivery.path, mine, '`--html` 路径逐字回执（resolve 归一后）');
  assert.equal(existsSync(mine), true, '须写到用户给的那条路径（父目录递归创建）');
  assert.equal(readFileSync(mine, 'utf8').indexOf(HEAD_LITERAL), 0, '显式路径拿到的也是完整 HELP 页');
  assert.equal(statSync(mine).size, r.env.delivery.bytes);
  assert.equal(r.env.data.mode, 'file', '显式路径那支仍是文件交付（不是现找）');

  const r2 = runOk(dir, [KEY, '--html', mine]);
  assert.equal(r2.env.delivery.path, mine, '再写同一路径＝覆盖同一个文件（不带时间戳、不递补）');
  assert.deepEqual(readdirSync(join(dir, 'mine')), ['named.html'], '不产生 _2');
  assert.equal(existsSync(join(dir, 'schedule_html')), false, '给了 `--html` 就不落缺省目录（两支不串）');
});

test('#204 ④ 非 help 命令带 `--html`：仍写既有 envelope 分节页，不落缺省目录、不串成 HELP 页', () => {
  const dir = mkDir('legacy');
  const p = join(dir, 'out.html');
  const r = runOk(dir, ['schedule.record.today', '--params', JSON.stringify({ date: '2026-09-06' }), '--html', p]);

  assert.equal(r.env.delivery.path, p, '分节页也回执用户给定路径');
  const html = readFileSync(p, 'utf8');
  assert.equal(html.includes('<section'), true, '既有口径：分节页带 <section');
  assert.equal(html.includes(DATA_ANCHOR), false, '分节页不是 HELP 全页（不得混进 help-data 载荷）');
  assert.equal(html.indexOf(HEAD_LITERAL), -1, '分节页不得起于 HELP 模板前缀');
  assert.match(nameOf(p), /^out\.html$/, '不按通式改名、不带时间戳');
  assert.equal(existsSync(join(dir, 'schedule_html')), false, '非 help 命令也给 `--html` 时同样不落缺省目录');
});

test('#204 ④ `q` 现找：不落盘、无 delivery；带 `--html` 时写分节页（不是 HELP 全页）', () => {
  const dir = mkDir('lookup');
  const r = runOk(dir, [KEY, '--params', JSON.stringify({ q: '帮助' })]);

  assert.equal(r.env.data.mode, 'lookup', 'q 支＝现找');
  assert.equal(Object.prototype.hasOwnProperty.call(r.env, 'delivery'), false, '现找不落盘 ⇒ 顶层不得有 delivery');
  assert.equal(r.env.data.query, '帮助');
  assert.ok(r.env.data.total >= 1, '须有命中：' + r.env.data.total);
  assert.deepEqual(readdirSync(dir), [], '现找不得在数据目录里留下任何文件');

  const dir2 = mkDir('lookup-html');
  const p = join(dir2, 'q.html');
  const r2 = runOk(dir2, [KEY, '--params', JSON.stringify({ q: '帮助' }), '--html', p]);
  assert.equal(r2.env.data.mode, 'lookup');
  assert.equal(r2.env.delivery.path, p, '显式给了路径才落盘，且落在该路径');
  const html = readFileSync(p, 'utf8');
  assert.equal(html.includes('<section'), true, 'q＋`--html` 写的是分节页');
  assert.equal(html.includes(DATA_ANCHOR), false, 'q 支不得串成 HELP 全页');
  assert.equal(existsSync(join(dir2, 'schedule_html')), false, 'q 支也不落缺省目录');
});

test('#204 ⑤ 退出码矩阵：成功 0；落盘失败 5 且 stdout 一个字节不吐（矩阵全跑，逐行打印）', () => {
  const rows = [];
  /** 跑一行：真 spawn → 断言 → 打印一行真实输出。 */
  const row = (name, expect, run1) => {
    const r = run1();
    const firstErr = String(r.stderr).trim().split('\n')[0] ?? '';
    rows.push('exit=' + r.status + ' stdout=' + (r.stdout === '' ? '空' : '一行JSON') + ' stderr=' + (firstErr || '（空）'));
    console.log('[#204 ⑤] ' + name + ' → exit=' + r.status
      + ' · stdout=' + (r.stdout === '' ? '空' : '一行 JSON')
      + (firstErr ? ' · stderr=' + firstErr : ''));
    assert.equal(r.status, expect.status, name + ' 退出码（stderr：' + r.stderr + '）');
    if (expect.status === 0) {
      assert.ok(r.env, name + ' 成功时 stdout 须是一行 JSON');
      assert.equal(r.stdout.trim().split('\n').length, 1, name + ' P9');
    } else {
      assert.equal(r.stdout, '', name + '：失败时 stdout 不得吐成功回执');
      assert.match(r.stderr, /^ERR 5: /, name + '：stderr 须以结构化错误码起');
      assert.match(r.stderr, /HELP 落盘失败/, name + '：stderr 须说明是落盘失败');
      assert.match(r.stderr, expect.codeRe, name + '：stderr 须保留系统错误码（不吞原始成因）');
    }
    return r;
  };

  // 成功支：四条入口全部 exit 0。
  row('缺省（无参数）', { status: 0 }, () => runOk(mkDir('m1')));
  row('`--html <新路径>`', { status: 0 }, () => {
    const d = mkDir('m2');
    return runOk(d, [KEY, '--html', join(d, 'o.html')]);
  });
  row('非 help 命令带 `--html`', { status: 0 }, () => {
    const d = mkDir('m3');
    return runOk(d, ['schedule.record.today', '--params', JSON.stringify({ date: '2026-09-06' }), '--html', join(d, 'o.html')]);
  });
  row('`q` 现找（不带 --html）', { status: 0 }, () => runOk(mkDir('m4'), [KEY, '--params', JSON.stringify({ q: '帮助' })]));

  // 失败支：三条真实写不进去的条件，全部 exit 5（现状码），且 stdout 一个字节不吐。
  row('缺省 · 落点父级 schedule_html 是文件（mkdir ENOTDIR）', { status: 5, codeRe: /ENOTDIR|EEXIST/ }, () => {
    const d = mkDir('m5');
    writeFileSync(join(d, 'schedule_html'), 'x', 'utf8');
    return run(d, [KEY]);
  });
  row('`--html <已存在的目录>`（EISDIR）', { status: 5, codeRe: /EISDIR|EPERM|EACCES/ }, () => {
    const d = mkDir('m6');
    const asDir = join(d, 'notafile.html');
    mkdirSync(asDir, { recursive: true });
    return run(d, [KEY, '--html', asDir]);
  });
  row('`--html <父级是文件>`（mkdir EEXIST／ENOTDIR）', { status: 5, codeRe: /EEXIST|ENOTDIR/ }, () => {
    const d = mkDir('m7');
    writeFileSync(join(d, 'blocker'), 'x', 'utf8');
    return run(d, [KEY, '--html', join(d, 'blocker', 'x.html')]);
  });

  assert.equal(rows.length, 7, '矩阵须跑全 7 行（4 成功 ＋ 3 失败）');
});
