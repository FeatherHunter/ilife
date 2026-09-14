#!/usr/bin/env node
/**
 * t465 独立对抗审查 · 自设探针（**不 import 被审判据件**，读数全部本席自算／自跑）。
 *
 * 用法（全部走 `node tooling/run-locked.mjs --ticket 465 -- …`）：
 *   node docs/skills/skill-calorie/t465-review-probe.mjs fact       # 只读：当刻产物事实面读数（真 dist ＋ 真 CLI 面）
 *   node docs/skills/skill-calorie/t465-review-probe.mjs mirror     # 搭隔离镜像（.scratch/t465-review/mirror）并全量编译
 *   node docs/skills/skill-calorie/t465-review-probe.mjs mut <id>   # 在镜像里改坏→增量编译→跑两张判据件
 *   node docs/skills/skill-calorie/t465-review-probe.mjs restore    # 按另存的原字节写回镜像→编译→跑判据
 *   node docs/skills/skill-calorie/t465-review-probe.mjs batch      # 上面全套顺序跑一遍（一次性读数表）
 *
 * 隔离理由：真件 `packages/skill-calorie/src/render/sportPortDocs.ts` 上有别票在飞的拆件活（T351-v7），
 * 本席**对它零写入**——全部改坏都落在这份自建镜像里；镜像的 `src` 逐字节同源（本探针自证）。
 *
 * 变异编号与它打的是哪一条断言（见 `t465-review-报告.md` §一号探针）：
 *   pay-key     趋势页复制载荷头改回命令 → 载荷面判据 ＋ 全份产物判据必红（可见面判据不许红）
 *   vis-key     趋势页可见面塞命令       → 可见面判据 ＋ 全份产物判据必红（载荷面判据不许红）
 *   dist-concat 分布页题面改回「页名＋窗口连写」并撤掉窗口卡 → 检验拆针是否还抓得住形状回退
 *   src-word    力量页来源写法换成人话来源名 → 检验本票是否落了「来源写法」的统一口径断言
 *   recap-old   复盘页块名改回旧字样「高频 TOP5」 → 检验改名针是否还抓得住块名回退
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const PKG = path.join(ROOT, 'packages', 'skill-calorie');
const WORK = path.join(ROOT, '.scratch', 't465-review');
const MIRROR = path.join(WORK, 'mirror');
const MIRROR_PKG = path.join(MIRROR, 'packages', 'skill-calorie');
const ORIG = path.join(WORK, 'orig-sportPortDocs.ts');
const LOGS = path.join(WORK, 'logs');
const SRC_REL = path.join('src', 'render', 'sportPortDocs.ts');
const TSC = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const WIN = { start: '2026-09-05', end: '2026-09-07' };

const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();

/** 变异表：`from` 必须在该件里恰好命中 1 次（否则中止，不猜）。 */
const MUTS = {
  'pay-key': {
    what: '趋势页载荷页名（finishPage 第三参）改回命令键',
    edits: [["同口径）。', '运动趋势', {", "同口径）。', 'calorie.view.exercise-trend', {"]],
  },
  'vis-key': {
    what: '趋势页可见副题里塞命令键',
    edits: [["subtitle: '每日消耗与时长 ＋ 每周频次 ＋ 逐日明细（空缺日留空，不补 0）',",
      "subtitle: '每日消耗与时长 ＋ 每周频次 ＋ 逐日明细（空缺日留空，不补 0） calorie.view.exercise-trend',"]],
  },
  'dist-concat': {
    what: '分布页题面改回「页名＋窗口连写」（旧版式原样）',
    edits: [["    title: '运动类型分布',", "    title: '运动类型分布 ' + v.start + ' ~ ' + v.end,"]],
  },
  'src-word': {
    what: '力量页来源写法换成 #452 的人话来源名',
    edits: [["const STRENGTH_SOURCE = 'exercise_log（本窗未删除的力量行）';",
      "const STRENGTH_SOURCE = '运动记录（本窗未删除的力量行）';"]],
  },
  'recap-old': {
    what: '复盘页「高频运动」块名改回旧字样',
    edits: [["      id: 'sec-badges',\n      label: '高频运动',", "      id: 'sec-badges',\n      label: '高频 TOP5',"]],
  },
  'dist-win-off': {
    what: '分布页把窗口从全份产物里摘掉（正面对照：拆针仍应抓得住「窗口整块没了」）',
    edits: [["        caption: '分类明细（' + v.start + ' ~ ' + v.end + '，末行为合计）',",
      "        caption: '分类明细（本窗，末行为合计）',"]],
  },
};

function say(msg) { console.log(msg); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }

function runNode(args, opts = {}) {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: opts.cwd || ROOT, env: { ...process.env }, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: String(r.stdout || ''), err: String(r.stderr || '') };
}

/** 数一个针在全文里出现几次（`split` 口径，不用正则，免得被转义坑）。 */
const count = (hay, needle) => hay.split(needle).length - 1;

function unescapeAttr(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
const payload = (html, fmt) => {
  const m = new RegExp('data-fmt="' + fmt + '"[^>]*?data-t="([^"]*)"').exec(html);
  return m === null ? null : unescapeAttr(m[1]);
};
const visible = (html) => html
  .replace(/<style>[\s\S]*?<\/style>/g, '')
  .replace(/<script>[\s\S]*?<\/script>/g, '')
  .replace(/<[^>]*>/g, '');
/** 命中处的上下文（±40 字符，换行写成 ⏎），用来核「命中几处／落在哪一面」。 */
function ctx(hay, needle, limit = 2) {
  const out = [];
  let i = hay.indexOf(needle);
  while (i !== -1 && out.length < limit) {
    out.push(JSON.stringify(hay.slice(Math.max(0, i - 40), i + needle.length + 40).replace(/\n/g, '⏎')));
    i = hay.indexOf(needle, i + needle.length);
  }
  return out.join(' ｜ ');
}

/* ────────────────────────── fact：当刻事实面读数 ────────────────────────── */

/** 夹具与 `exercise-port-111.test.mjs` 同源（种子逐条照抄），只为本席自算读数用。 */
function seedPort(db) {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, \'2026-10-01\', 300)').run();
  db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, \'male\', 175, \'moderate\')').run();
  const ex = [
    ['2026-08-31', '07:00:00', '户外跑', 30, 300, '有氧', null, null, null, null, null],
    ['2026-09-02', '19:00:00', '卧推', 40, 180, '力量', null, null, 60, 10, 1],
    ['2026-09-05', '07:00:00', '跑步', 30, 300, '有氧', 5.0, 140, null, null, null],
    ['2026-09-05', '18:00:00', '卧推', 40, 150, '力量', null, null, 60, 10, 1],
    ['2026-09-05', '18:40:00', '卧推', 40, 150, '力量', null, null, 60, 8, 2],
    ['2026-09-06', '07:10:00', '骑行', 45, 350, '有氧', 12.0, 130, null, null, null],
    ['2026-09-06', '21:00:00', '瑜伽', 20, 50, '柔韧', null, null, null, null, null],
    ['2026-09-07', '07:05:00', '跑步', 35, 320, '有氧', 6.0, 145, null, null, null],
  ];
  for (const [d, t, type, min, cal, cat, dist, hr, load, reps, si] of ex) {
    db.prepare('INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category, distance_km, avg_heart_rate, load_kg, reps, set_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, type, min, cal, cat, dist, hr, load, reps, si);
  }
  const meals = [
    ['2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2], ['2026-09-05', '12:30:00', '米饭', 200, 500, 10, 80, 5],
    ['2026-09-06', '08:00:00', '包子', 150, 300, 8, 50, 5], ['2026-09-06', '12:00:00', '米饭', 200, 550, 12, 85, 6],
    ['2026-09-07', '08:10:00', '燕麦', 100, 389, 13, 66, 7], ['2026-09-07', '12:10:00', '鸡胸', 150, 200, 35, 2, 4],
    ['2026-09-07', '15:00:00', '苹果', 200, 100, 1, 25, 0], ['2026-09-07', '19:10:00', '米饭', 200, 500, 10, 90, 5],
  ];
  for (const [d, t, name, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, name, g, cal, p, cb, f);
  }
  db.prepare('INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, \'port计划\', \'v1\', \'desc\', 2, \'2026-08-31\')').run();
  for (const [w, d, label, moves] of [
    [1, 1, '上肢', [{ name: '户外跑', part: '腿', type: '有氧', sets: [{}, {}] }]],
    [1, 3, '下肢', [{ name: '卧推', part: '胸', type: '力量', sets: [{}, {}, {}] }]],
    [2, 1, '上肢', [{ name: '硬拉', part: '背', type: '力量', sets: [{}] }]],
  ]) {
    db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (?, ?, 1, ?, ?)').run(w, d, label, JSON.stringify(moves));
  }
}

async function fact() {
  process.env.CALORIE_TODAY = '2026-09-07';
  const { openDb } = await import(pathToFileURL(path.join(PKG, 'dist', 'index.js')).href);
  const { dispatch } = await import(pathToFileURL(path.join(PKG, 'dist', 'cli', 'cmd_read.js')).href);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't465r-'));
  const db = openDb(path.join(dir, 'calorie_data.db'));
  seedPort(db);
  ensureDir(LOGS);
  const pages = [
    ['exercise-strength', WIN], ['exercise-cardio', WIN], ['exercise-distribution', WIN],
    ['exercise-recap', WIN], ['exercise-trend', WIN], ['exercise-review', { start: '2026-08-31', end: '2026-09-07' }],
  ];
  const rows = [];
  for (const [k, p] of pages) {
    const out = dispatch('calorie.view.' + k, p, db);
    const html = out.html;
    fs.writeFileSync(path.join(LOGS, 'fact-' + k + '.html'), html, 'utf8');
    const vis = visible(html);
    const text = payload(html, 'text') || '';
    const json = payload(html, 'json');
    const win = (p.start === WIN.start) ? '2026-09-05 ~ 2026-09-07' : '2026-08-31 ~ 2026-09-07';
    rows.push({
      page: k,
      bytes: Buffer.byteLength(html, 'utf8'),
      cmdKeyAll: count(html, 'calorie.view.') + count(html, 'calorie.exercise.'),
      cmdKeyVisible: count(vis, 'calorie.view.') + count(vis, 'calorie.exercise.'),
      ticketVisible: (vis.match(/\bt\d{3}\b/gi) || []).length,
      gongxuVisible: count(vis, '移植'),
      huiHuaVisible: count(vis, '会话'),
      snakeVisible: count(vis, 'exercise_log'),
      payloadHead: JSON.stringify(text.split('\n')[0] || ''),
      payloadKey: json === null ? '(无 json 载荷)' : JSON.stringify(JSON.parse(json).key),
      eyebrow: (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html) || [, '(读不到)'])[1],
      winCount: count(html, win),
      winVisible: count(vis, win),
      winCtx: ctx(html, win, 2),
    });
  }
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
  say('FACT-HEADER page | 字节 | 全文命令键 | 可见面命令键 | 可见面票号 | 「移植」 | 「会话」 | exercise_log | 载荷头首行 | json key | 眉标 | 窗口串次数(全文/可见面)');
  for (const r of rows) {
    say(`FACT ${r.page} | ${r.bytes} | ${r.cmdKeyAll} | ${r.cmdKeyVisible} | ${r.ticketVisible} | ${r.gongxuVisible} | ${r.huiHuaVisible} | ${r.snakeVisible} | ${r.payloadHead} | ${r.payloadKey} | ${r.eyebrow} | ${r.winCount}/${r.winVisible}`);
    say(`  WINCTX ${r.winCtx}`);
    if (r.cmdKeyAll > 0) {
      const html = fs.readFileSync(path.join(LOGS, 'fact-' + r.page + '.html'), 'utf8');
      say(`  CMDKEYCTX ${ctx(html, 'calorie.view.', 4)}`);
    }
  }
  // 旧针（#465 之前的断言原文）在当刻产物里的命中次数：0＝旧针确已失效，非「放宽」。
  const oldNeedles = {
    'exercise-strength': ['力量训练总览 2026-09-05 ~ 2026-09-07'],
    'exercise-cardio': ['有氧训练总览 2026-09-05 ~ 2026-09-07'],
    'exercise-distribution': ['运动类型分布 2026-09-05 ~ 2026-09-07', '按分类次数占比'],
    'exercise-recap': ['高频 TOP5'],
    'exercise-trend': ['【calorie · calorie.view.exercise-trend】', '运动趋势 2026-09-05 ~ 2026-09-07'],
  };
  for (const [k, needles] of Object.entries(oldNeedles)) {
    const html = fs.readFileSync(path.join(LOGS, 'fact-' + k + '.html'), 'utf8');
    for (const n of needles) say(`OLDNEEDLE ${k} ${JSON.stringify(n)} 命中=${count(html, n)}`);
  }
  // 乙类①（唤醒词错键）：三条来源同指才算「判据跟上」，不是「放宽」。
  const { routesFor } = await import(pathToFileURL(path.join(PKG, 'dist', 'triggers', 'routing.js')).href);
  const { SCENE_04_EXERCISE } = await import(pathToFileURL(path.join(PKG, 'dist', 'triggers', 'scene-04-exercise.js')).href);
  const { CALORIE_COMBOS } = await import(pathToFileURL(path.join(PKG, 'dist', 'cli', 'keys.js')).href);
  for (const w of ['看运动记录（按力量筛选）', '看运动记录（按有氧筛选）']) {
    const keys = routesFor(w).filter((r) => r.kind === 'exec').map((r) => r.key);
    const frozen = SCENE_04_EXERCISE.filter((t) => t.wake_word === w).map((t) => t.main_prompt.cli);
    say(`WAKE ${w} | routes=${JSON.stringify(keys)} | 冻结表cli=${JSON.stringify(frozen)} | COMBOS齐=${keys.every((k) => Boolean(CALORIE_COMBOS[k]))}`);
  }
}

/* ────────────────────────── 镜像：搭设／变异／还原 ────────────────────────── */

function copyTree(from, to) {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      if (base === 'node_modules' || base === 'dist' || base.endsWith('.tsbuildinfo')) return false;
      return true;
    },
  });
}

function mirrorSetup() {
  ensureDir(WORK);
  if (fs.existsSync(MIRROR)) fs.rmSync(MIRROR, { recursive: true, force: true });
  ensureDir(path.dirname(MIRROR_PKG));
  copyTree(PKG, MIRROR_PKG);
  fs.copyFileSync(path.join(ROOT, 'tsconfig.base.json'), path.join(MIRROR, 'tsconfig.base.json'));
  fs.symlinkSync(path.join(PKG, 'node_modules'), path.join(MIRROR_PKG, 'node_modules'), 'junction');
  fs.copyFileSync(path.join(PKG, SRC_REL), ORIG);
  // src 面逐字节同源自证
  let n = 0; let diff = 0;
  const walk = (dir, base) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p, base); continue; }
      n += 1;
      const m = path.join(MIRROR_PKG, path.relative(base, p));
      if (!fs.existsSync(m) || sha(p) !== sha(m)) diff += 1;
    }
  };
  walk(path.join(PKG, 'src'), PKG);
  say(`MIRROR-SETUP 镜像=${rel(MIRROR_PKG)} src件=${n} 字节不同源=${diff}（0 即逐字节同源）`);
  say(`MIRROR-ORIG ${rel(ORIG)} sha=${sha(ORIG)}`);
  say(`MIRROR-BUILD exit=${build()}`);
}

function build() {
  const r = runNode([TSC, '-b', MIRROR_PKG]);
  if (r.code !== 0) { say(r.out); say(r.err); }
  return r.code;
}

/** 写字节并**刷 mtime**：Windows 的 `copyFileSync` 会把源文件的旧时间戳一起带过来，
 *  `tsc -b` 于是判「产物比源新」跳过重编——还原写窗必须显式刷时间，否则读的是上一轮变异产物。 */
function writeBytes(p, bytes) {
  fs.writeFileSync(p, bytes);
  const now = new Date();
  fs.utimesSync(p, now, now);
}

function runTests(tag) {
  ensureDir(LOGS);
  const out = {};
  for (const [name, file] of [['port111', 'exercise-port-111.test.mjs'], ['routes265', 'exercise-routes-265.test.mjs']]) {
    const logPath = path.join(LOGS, `${tag}-${name}.txt`);
    const r = runNode(['--test', path.join(MIRROR_PKG, 'test', file)]);
    fs.writeFileSync(logPath, r.out + '\n' + r.err, 'utf8');
    const txt = r.out + '\n' + r.err;
    const pass = (/# pass (\d+)/.exec(txt) || /pass (\d+)/.exec(txt) || [, '?'])[1];
    const fail = (/# fail (\d+)/.exec(txt) || /fail (\d+)/.exec(txt) || [, '?'])[1];
    // 逐条 test 的 ✔／✖（两面分开判的归因就靠它：改坏哪面红哪面）
    const perTest = [...txt.matchAll(/^([✔✖])\s+(.+?)\s+\([\d.]+m?s\)/gm)]
      .map((m) => (m[1] === '✔' ? 'PASS ' : 'FAIL ') + m[2].trim());
    const red = [...txt.matchAll(/^\s*(?:\d+\)\s*)?.*(?:AssertionError.*|(?:缺|不是|出现|读不到|不得出现)[^\n]*)$/gm)]
      .map((m) => m[0].trim()).filter((s) => s.includes('：') || s.includes('AssertionError'));
    out[name] = { pass, fail, perTest, red: [...new Set(red)].slice(0, 8) };
  }
  return out;
}

function report(tag, tests) {
  for (const [name, t] of Object.entries(tests)) {
    say(`RUN[${tag}] ${name} pass=${t.pass} fail=${t.fail}`);
    for (const p of t.perTest) say(`  TEST ${p}`);
    for (const r of t.red) say(`  REDLINE ${r}`);
  }
}

function mutate(id) {
  const mut = MUTS[id];
  if (mut === undefined) { say(`未知变异编号 ${id}；可用：${Object.keys(MUTS).join('／')}`); return 2; }
  const f = path.join(MIRROR_PKG, SRC_REL);
  let txt = fs.readFileSync(f, 'utf8');
  for (const [from, to] of mut.edits) {
    const hits = count(txt, from);
    if (hits !== 1) { say(`ABORT 锚点在镜像里命中 ${hits} 次（应恰 1 次）：${JSON.stringify(from.slice(0, 60))}`); return 3; }
    txt = txt.replace(from, to);
  }
  fs.writeFileSync(f, txt, 'utf8');
  const now = new Date();
  fs.utimesSync(f, now, now);
  say(`MUT ${id} · ${mut.what} · 镜像件 sha=${sha(f)}（原 sha=${sha(ORIG)}）`);
  say(`MUT-BUILD exit=${build()}`);
  const t = runTests('mut-' + id);
  report('mut-' + id, t);
  return 0;
}

function restore() {
  const f = path.join(MIRROR_PKG, SRC_REL);
  writeBytes(f, fs.readFileSync(ORIG));
  say(`RESTORE 写回另存原字节 sha=${sha(f)} 等于原=${sha(f) === sha(ORIG)}（mtime 已刷）`);
  say(`RESTORE-BUILD exit=${build()}`);
  const t = runTests('base');
  report('base', t);
  return 0;
}

async function batch() {
  mirrorSetup();
  say('BASELINE（未改坏，镜像）');
  report('base', runTests('base'));
  for (const id of Object.keys(MUTS)) {
    mutate(id);
    const f = path.join(MIRROR_PKG, SRC_REL);
    writeBytes(f, fs.readFileSync(ORIG)); // 逐个变异之间按另存原字节复位（字节相等即回到基线态）
    const back = build();
    say(`RESET ${id} 写回原字节 sha=${sha(f)} 等于原=${sha(f) === sha(ORIG)} build=${back}`);
  }
  say('BACK（改回必绿：与基线同一字节，再跑一遍判据）');
  report('back', runTests('back'));
  say('BATCH-DONE');
}

const mode = process.argv[2] || 'fact';
const arg = process.argv[3];
let code = 0;
if (mode === 'fact') await fact();
else if (mode === 'mirror') mirrorSetup();
else if (mode === 'mut') code = mutate(arg);
else if (mode === 'restore') code = restore();
else if (mode === 'batch') await batch();
else { say(`未知模式 ${mode}`); code = 2; }
process.exit(code);
