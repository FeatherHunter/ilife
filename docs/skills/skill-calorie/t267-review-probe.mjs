/** #267 独立对抗审查席 · 自设探针（与实施席的判据件不同人、不引它一行、不共用夹具）。
 *
 * 它答的是「鉴别力」那一问：实施席的六组断言之外，我能不能在**自己的仪器**上重现关键读数，
 * 并补它没覆盖的三面：
 *   R1 唤醒词起点独立复现：**自建**「词 → 命令」索引（直读冻结表源码文本），
 *      再拿 `lookupWake(buildHelpLookup(TRIGGERS), 词)` 对账；并反证这张表不是命令表反查
 *      （拿命令键当查询词查不到；同键异端的词命令文本不同）。
 *   R2 39 条词 ↔ **两件**声明双向对账（直读 `src/exercise/routes.ts` 29 条 ＋ `src/home/routes.ts` 10 条源文本）。
 *   R3 读类 7 条的**产物字节域**与**零命令键**在我手里重现。
 *   R4 幂等：同一条词两跑字节相同；同键异窗口产物不塌成一份（窗口参数真进了产物）；
 *      同一条命令文本被两条词命中时（若存在）产物逐字节相同。
 *
 * 跑法（**必须持锁**，否则会读到他席半写的 dist）：
 *   node tooling/run-locked.mjs --ticket 267 -- node docs/skills/skill-calorie/t267-review-probe.mjs
 * 真库零接触：库路径一律指向系统临时根下的夹具副本。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const TODAY = '2026-09-07';
process.env.CALORIE_TODAY = TODAY;
const ROOT = process.cwd();
const PKG = join(ROOT, 'packages/skill-calorie');
const DIST = join(PKG, 'dist');
const BIN = join(DIST, 'cli', 'cmd_read.js');
const DAY = 86400000;

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(DIST, 'index.js')).href);
const { buildHelpLookup, lookupWake, TRIGGERS } = await import(pathToFileURL(join(DIST, 'triggers', 'index.js')).href);
const { routesFor } = await import(pathToFileURL(join(DIST, 'triggers', 'routing.js')).href);
const { EXERCISE_ROUTES } = await import(pathToFileURL(join(DIST, 'exercise', 'routes.js')).href);
const { HOME_ROUTES } = await import(pathToFileURL(join(DIST, 'home', 'routes.js')).href);

/* ── 直读源码文本：冻结表 ＋ 两件声明（不借实施席的解析，也不借 dist 的再导出） ──────────── */

const FROZEN = readFileSync(join(PKG, 'src', 'triggers', 'scene-04-exercise.ts'), 'utf8')
  .split('\n')
  .filter((l) => l.trim().startsWith('{"category"'))
  .map((l) => JSON.parse(l.trim().replace(/,\s*$/, '')));

/** 路由声明行 → 记录（`cli` 里的 `\'` 还原成 `'`）。 */
function parseDecls(file, side) {
  const out = [];
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\{ list: '(\w+)', order: (\d+), wakeWord: '([^']*)', scene: '(\d+)', kind: '(\w+)', key: '([^']*)', cli: '(.*)' \},?$/.exec(raw.replace(/^\uFEFF/, '').trim());
    if (m !== null) out.push({ side, file: file.split(/[\\/]/).pop(), list: m[1], order: Number(m[2]), wakeWord: m[3], scene: m[4], kind: m[5], key: m[6], cli: m[7].replace(/\\'/g, "'") });
  }
  return out;
}
const DECL_EX = parseDecls(join(PKG, 'src', 'exercise', 'routes.ts'), 'exercise');
const DECL_HOME = parseDecls(join(PKG, 'src', 'home', 'routes.ts'), 'home');
const WAKE04 = [...DECL_EX, ...DECL_HOME].filter((r) => r.scene === '04' && r.list === 'wake');
const keyOf = (cli) => (/^calorie-cmd-read\s+(\S+)/.exec(String(cli)) ?? [])[1] ?? null;

/** 我自己的「词 → 命令」索引（冻结表自己的行；实施席的判据件不参与）。 */
const MY_INDEX = new Map(FROZEN.map((t) => [t.wake_word, { cli: t.main_prompt.cli, tpl: t.html_template }]));
/** 两件声明面的「词 → 记录」。 */
const DECL_BY_WORD = new Map(WAKE04.map((r) => [r.wakeWord, r]));
/** 读类三件模板（分布／趋势／复盘）——「产物零命令键」只在这三件上判（汇总／对照目标两页的
 *  载荷头仍印命令键，是票面裁定的已知遗留①，本探针只记读数、不当判据）。 */
const READ_TEMPLATES = new Set(['templates/exercise_distribution.html', 'templates/exercise_trend.html', 'templates/exercise_recap.html']);

/* ── 夹具（真库零接触） ─────────────────────────────────────────────────────── */

const isoAt = (i) => new Date(Date.parse(TODAY + 'T12:00:00Z') - i * DAY).toISOString().slice(0, 10);
const fill = (cli) => String(cli).replaceAll('<开始日期>', isoAt(200)).replaceAll('<结束日期>', TODAY).replaceAll('<日期>', isoAt(3));

function tokenize(cli) {
  const out = []; let cur = ''; let q = null;
  for (const ch of String(cli)) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const paramsOf = (cli) => {
  const toks = tokenize(fill(cli));
  const at = toks.indexOf('--params');
  return at < 0 ? {} : JSON.parse(toks[at + 1]);
};

let SEED = null;
function seedDir() {
  if (SEED !== null) return SEED;
  const dir = mkdtempSync(join(tmpdir(), 't267r-seed-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 300)').run();
  const ins = db.prepare('INSERT INTO exercise_log (id, date, exercise_type, duration_minutes, calories_burned, category, load_kg, reps, distance_km, avg_heart_rate, note) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  let id = 0;
  for (let i = 0; i < 400; i += 1) {
    const d = isoAt(i);
    for (const row of [['慢跑', 30, 320, '有氧', null, null, 5, null, i % 3 === 0 ? '夜跑' : null], ['卧推', 25, 150, '力量', 60, 10, null, null, null], ['步行', 20, 80, '日常', null, null, 3000, null, null]]) {
      id += 1;
      ins.run(id, d, ...row);
    }
  }
  db.close();
  SEED = dir;
  return dir;
}

/** 命令原样跑：库指向本词独立副本。 */
function run(cli, tag) {
  const dir = mkdtempSync(join(tmpdir(), tag + '-'));
  copyFileSync(join(seedDir(), DB_FILENAME), join(dir, DB_FILENAME));
  const toks = tokenize(fill(cli));
  const r = spawnSync(process.execPath, [BIN, ...toks.slice(1)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
  });
  const outDir = join(dir, 'calorie_html');
  const landed = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.html')) : [];
  let env = null;
  try { env = JSON.parse(String(r.stdout).trim()); } catch { /* 非 JSON 输出留 null */ }
  const out = env?.data?.output ?? null;
  const html = typeof out === 'string' && existsSync(out) ? readFileSync(out, 'utf8') : '';
  return {
    cli, status: r.status, env, out, html, landed,
    stderrTail: String(r.stderr || '').trim().split(/\r?\n/).filter(Boolean).slice(-1)[0] ?? '',
    bytes: typeof out === 'string' && existsSync(out) ? statSync(out).size : null,
    sha256: html === '' ? null : createHash('sha256').update(readFileSync(out)).digest('hex'),
  };
}

const say = (tag, text) => console.log('T267R-' + tag + ' ' + text);
let pass = 0; let total = 0;
const check = (name, fn) => {
  total += 1;
  try { fn(); pass += 1; } catch (err) { console.log('T267R-RED ' + name + '：' + (err?.message ?? err)); throw err; }
};

/* ── R0 · 起点面的构造性反证（不跑命令） ───────────────────────────────────── */

check('R0 速查表以唤醒词为键、命令键查不到', () => {
  const map = buildHelpLookup(TRIGGERS);
  assert.ok(FROZEN.length === 39, '冻结表条数不是 39：' + FROZEN.length);
  for (const t of FROZEN) assert.ok(Object.keys(map).includes(t.wake_word), '速查表没有这条词：' + t.wake_word);
  // 反证：拿**命令键**当查询词必须查不到（若这张表是命令表反查，这里会命中）
  assert.deepEqual(lookupWake(map, 'calorie.view.exercise'), [], '用命令键当查询词竟命中 ⇒ 起点不是唤醒词');
  assert.deepEqual(lookupWake(map, keyOf(MY_INDEX.get('看本周运动').cli)), [], '用命令键当查询词竟命中');
  // 反证：同一个键下的两条词命令文本不同（命令是从词那一行取的，不是从键反查）
  const byKey = new Map();
  for (const t of FROZEN) {
    const k = keyOf(t.main_prompt.cli);
    (byKey.get(k) ?? byKey.set(k, new Set()).get(k)).add(t.main_prompt.cli);
  }
  assert.ok(byKey.get('calorie.view.exercise').size > 1, '汇总键下所有词命令文本相同 ⇒ 无法区分「词自己的命令」与「键反查」');
  say('R0', '冻结词=' + FROZEN.length + ' 速查表键数=' + Object.keys(map).length + ' 命令键查询命中=0 汇总键下不同命令文本=' + byKey.get('calorie.view.exercise').size);
});

/* ── R1 · 自选 3 条词：读类／写类／自定义窗口，各自从词出发 ──────────────────── */

const PICK = ['看运动类型分布', '记力量训练', '看某段时间运动'];
const RUNS = new Map();

check('R1 三条词：查到的命令＝冻结表＝声明，命令真跑得出真文件、字节如实', () => {
  const map = buildHelpLookup(TRIGGERS);
  for (const word of PICK) {
    const mine = MY_INDEX.get(word);
    assert.ok(mine !== undefined, '冻结表里没有这条词：' + word);
    const hits = lookupWake(map, word);
    assert.equal(hits.length, 1, word + ' 命中不是恰好 1 条：' + hits.length);
    assert.equal(hits[0].wake_word, word, word + ' 命中的是别人的行：' + hits[0].wake_word);
    assert.equal(hits[0].cli, mine.cli, word + ' 速查表命令 ≠ 冻结表命令');
    assert.equal(hits[0].cli, DECL_BY_WORD.get(word).cli, word + ' 速查表命令 ≠ 路由声明命令');
    assert.equal(routesFor(word).filter((r) => r.kind === 'exec')[0]?.cli, mine.cli, word + ' 路由层给的不是这条命令');
    const rec = run(mine.cli, 't267r');
    RUNS.set(word, rec);
    assert.equal(rec.status, 0, word + ' 非 exit 0：' + rec.status + ' stderr=' + rec.stderrTail);
    assert.ok(typeof rec.out === 'string' && isAbsolute(rec.out), word + ' data.output 不是绝对路径：' + rec.out);
    assert.ok(existsSync(rec.out), word + ' 产物不在盘上');
    assert.equal(rec.landed.length, 1, word + ' 落盘文件不是 1 个');
    assert.equal(rec.env?.delivery?.bytes, rec.bytes, word + ' delivery.bytes ≠ 落盘字节');
    assert.equal(Buffer.byteLength(rec.html, 'utf8'), rec.bytes, word + ' 读回字节 ≠ 落盘字节');
    assert.ok(rec.html.startsWith('<!doctype html>') && rec.html.includes('charset="utf-8"') && rec.html.includes('<style>') && rec.html.includes('ilife-page'), word + ' 产物不是完整文档');
    if (word === '记力量训练') {
      assert.ok(rec.html.includes('复制数据') && ['text', 'json', 'csv'].every((f) => rec.html.includes('data-fmt="' + f + '"')), word + ' 写类产物缺复制区／三格式');
      assert.ok(rec.env?.shape === 'receipt', word + ' 写类包络不是 receipt');
    } else if (READ_TEMPLATES.has(mine.tpl)) {
      assert.ok(!rec.html.includes('calorie.view.'), word + ' 产物里出现命令键');
      if (word === '看运动类型分布') assert.ok(rec.html.includes('运动类型分布'), word + ' 产物不含自己那页的人话页名');
    } else {
      // 汇总族（`calorie.view.exercise`）：载荷头仍印命令键是已知遗留①，这里只复现读数
      const leak = (rec.html.match(/calorie\.view\.[a-z-]+/g) ?? []).length;
      say('R1-leak', word + ' 汇总族产物内命令键出现 ' + leak + ' 次（已知遗留①，#452 地盘）');
    }
    if (paramsOf(mine.cli).window === 'custom') {
      const p = paramsOf(mine.cli);
      assert.ok(rec.html.includes(p.start) && rec.html.includes(p.end), word + ' 自定义窗口起止没进产物');
    }
  }
  const r = [...RUNS.entries()].map(([w, x]) => w + '=' + x.bytes + 'B/' + keyOf(x.cli));
  say('R1', '三词=' + PICK.length + ' exit0=3 字节如实=3 完整文档=3 明细=[' + r.join(' ') + ']');
});

/* ── R2 · 39 条词 ↔ 两件声明双向对账（源码文本口径） ────────────────────────── */

check('R2 两件声明双向对账：39 ＝ exercise/routes.ts(29) ＋ home/routes.ts(10)', () => {
  const ex = WAKE04.filter((r) => r.side === 'exercise');
  const home = WAKE04.filter((r) => r.side === 'home');
  assert.equal(ex.length, 29, 'exercise/routes.ts 的场景 04 wake 记录不是 29 条：' + ex.length);
  assert.equal(home.length, 10, 'home/routes.ts 的场景 04 wake 记录不是 10 条：' + home.length);
  const words = new Set(FROZEN.map((t) => t.wake_word));
  assert.equal(new Set(WAKE04.map((r) => r.wakeWord)).size, WAKE04.length, '声明面有重复词');
  for (const w of words) {
    const d = DECL_BY_WORD.get(w);
    assert.ok(d !== undefined, '声明面缺这条词：' + w);
    assert.equal(d.kind, 'exec', w + ' 声明不是 exec：' + d.kind);
    assert.equal(d.cli, MY_INDEX.get(w).cli, w + ' 声明 cli ≠ 冻结表 cli');
    assert.equal(d.key, keyOf(MY_INDEX.get(w).cli), w + ' 声明 key ≠ 命令键');
  }
  for (const r of WAKE04) assert.ok(words.has(r.wakeWord), '声明面有冻结表外的孤儿词：' + r.wakeWord);
  // dist 侧同源（生成物 ＋ 两件能力声明再导出）
  const distWords = [...EXERCISE_ROUTES, ...HOME_ROUTES].filter((r) => r.scene === '04' && r.list === 'wake');
  assert.equal(distWords.length, WAKE04.length, 'dist 声明条数 ≠ 源文本条数');
  for (const r of distWords) assert.equal(r.cli, MY_INDEX.get(r.wakeWord)?.cli, r.wakeWord + ' dist cli ≠ 冻结表 cli');
  // 场景 04 的任何声明（含 new 别名）都不许 non-exec
  const nonExec = [...DECL_EX, ...DECL_HOME].filter((r) => r.scene === '04' && r.kind !== 'exec');
  assert.deepEqual(nonExec, [], '场景 04 声明里有 non-exec');
  say('R2', '冻结词=' + words.size + ' 声明面=' + WAKE04.length + '（exercise=' + ex.length + ' ＋ home=' + home.length + '）'
    + ' 双向闭合=是 逐字相同=' + words.size + ' non-exec=0 生成物一致=' + distWords.length);
});

/* ── R3 · 读类 7 条：产物字节域 ＋ 零命令键（我自己跑一遍） ─────────────────── */

const READ_WORDS = FROZEN.filter((t) => READ_TEMPLATES.has(t.html_template)).map((t) => t.wake_word);

check('R3 读类 7 条产物：完整文档 ＋ 零命令键 ＋ 字节域', () => {
  assert.equal(READ_WORDS.length, 7, '读类词不是 7 条：' + READ_WORDS.length);
  const pageName = { 'templates/exercise_distribution.html': '运动类型分布', 'templates/exercise_trend.html': '运动趋势', 'templates/exercise_recap.html': '运动复盘' };
  const bytes = [];
  for (const w of READ_WORDS) {
    const rec = RUNS.get(w) ?? run(MY_INDEX.get(w).cli, 't267r');
    RUNS.set(w, rec);
    assert.equal(rec.status, 0, w + ' 非 exit 0：' + rec.status + ' ' + rec.stderrTail);
    assert.ok(rec.html.startsWith('<!doctype html>'), w + ' 不是完整文档');
    assert.ok(!rec.html.includes('calorie.view.'), w + ' 产物里出现命令键');
    assert.ok(rec.html.includes(pageName[MY_INDEX.get(w).tpl]), w + ' 产物不含自己那页的人话页名：' + pageName[MY_INDEX.get(w).tpl]);
    bytes.push(rec.bytes);
  }
  say('R3', '读类=' + READ_WORDS.length + ' 零命令键=' + READ_WORDS.length + ' 完整文档=' + READ_WORDS.length
    + ' 字节域=[' + Math.min(...bytes) + ',' + Math.max(...bytes) + ']');
});

/* ── R4 · 幂等：同词两跑 / 同键异窗口不塌 / 同命令文本两条词 ─────────────────── */

check('R4 幂等与参数穿透', () => {
  const w = '看运动类型分布';
  const a = RUNS.get(w) ?? run(MY_INDEX.get(w).cli, 't267r');
  const b = run(MY_INDEX.get(w).cli, 't267r');
  assert.equal(a.sha256, b.sha256, w + ' 同一条命令两跑字节不同');
  const all = [];
  for (const t of FROZEN) {
    const rec = RUNS.get(t.wake_word) ?? run(t.main_prompt.cli, 't267r');
    RUNS.set(t.wake_word, rec);
    assert.equal(rec.status, 0, t.wake_word + ' 非 exit 0：' + rec.status + ' ' + rec.stderrTail);
    all.push(rec);
  }
  // 同命令文本的词组：产物必须逐字节相同（本票范围内这一组通常为空——如实报数）
  const byCli = new Map();
  for (const rec of all) (byCli.get(rec.cli) ?? byCli.set(rec.cli, []).get(rec.cli)).push(rec);
  const dupGroups = [...byCli.values()].filter((g) => g.length > 1);
  for (const g of dupGroups) assert.equal(new Set(g.map((r) => r.sha256)).size, 1, '同命令文本的两条词产物不同：' + g.map((r) => r.landed[0]).join(' / '));
  // 同键异窗口：产物不许塌成一份（证明窗口参数真进了产物）
  const byKey = new Map();
  for (const rec of all) {
    const k = keyOf(rec.cli);
    (byKey.get(k) ?? byKey.set(k, []).get(k)).push(rec);
  }
  const spread = [];
  for (const [k, g] of byKey) {
    const distinct = new Set(g.map((r) => r.sha256)).size;
    spread.push(k.replace('calorie.view.', '') + ':' + g.length + '→' + distinct);
    if (g.length > 1 && new Set(g.map((r) => r.params)).size > 1) assert.ok(distinct > 1, k + ' 下 ' + g.length + ' 条词产物全同 ⇒ 参数没进产物');
  }
  const bytes = all.map((r) => r.bytes);
  say('R4', '同词两跑同字节=是 命令文本重复组=' + dupGroups.length + ' 键下产物分布=[' + spread.join(' ') + ']'
    + ' 全 39 条字节域=[' + Math.min(...bytes) + ',' + Math.max(...bytes) + ']');
});

say('RESULT', pass + '/' + total + ' 通过（自设探针；与实施席判据件不共用一行）');
