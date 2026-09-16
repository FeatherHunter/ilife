/** #256 · 卡路里场景 06 目标管理「整栏契约锁」（28 条真出口 ＋ 12 看类不同形 ＋ 数值三组带出处 ＋ 阻断四态 ＋ 灵敏度）。
 *
 * 本件＝票 #256「目标管理每条词都跑得通、产物完整、数字对得上」的结构化断言，跨条一致性归本票；
 * 单页字段／呈现归各页面票（本件不重复它们的断言；`#289` 锁三族区块**在场**，本件锁三族**数**与推导式）。
 *
 * 28 条清单真源：`docs/skills/skill-calorie/06-目标管理-工作流程.md` §28 条逐条表（25 场景 ＋ 3 自造别名），
 * 命令与参数逐字照抄该表（`<日期>` 占位按票面口径换成可由种子复跑的固定日期，见 `DEADLINE`）。
 *
 * 五组判据（每条失败信息都指到「哪条唤醒词／缺什么」）：
 *   ① 真出口：28 条逐条真跑 `dist/cli/cmd_read.js`——exit 0 ＋ `data.output` 是**绝对路径**且文件在盘上
 *      ＋ 落盘字节如实 ＋ 产物是**完整文档**（doctype／charset／style／ilife-page）。第一轮证据 §二第 26 条
 *      （看目标推荐）当时是片段，`#589` 已整页化，本件把 28 条一起锁成完整文档（26 条由缺口转绿）。
 *   ② 不同形：12 条看类词**两两**比区块集（`sec-*` 锚点 ＋ `ilife-block-*` 件类 ＋ 页题 ＋ 页头左行），
 *      判据是**等价关系**：区块集相等 ⟺ 同槽（同一命令 ＋ 同一段窗口），再压一个「不同形档数 ≥ 8」的棘轮
 *      ——既防同一条词出两张盘，也防 12 条塌成一张通用盘。窗口按当刻口径归一：当刻 2026-09-07 是**周一**，
 *      本周＝本周一至锚点日＝单日（`src/analysis/series.ts:83`），故「看今日目标／看本周目标／看饮水目标进度」
 *      落在同一段窗口、必然同形——这是口径不是缺陷；另有正对照真跑证明「本周」参数**确实被采纳**
 *      （锚点挪到 2026-09-09 即以「近 3 天」出页、与「看今日目标」不同形）。
 *   ③ 数值对账：三组代表数——宏量合计 1850／体重速率 0.16 kg/周（115 天）／饮水推荐 2471 ml——
 *      预期值在件内**按算式重算一遍**再比对页面文本，出处逐条写在断言旁（老 Python 行号 ＋ `t251-*`／`t289` 证据件）。
 *   ④ 阻断四态：空库定类可开不编数／改类空库 exit 4 不落盘／档案缺项不编数／方向非法 exit 2 不落盘。
 *   ⑤ 灵敏度：摘掉模板键名、挖掉任一组数值、把两条不同命令的产物换成同一份——对应断言必须变红，原样必绿。
 *      真身（源码级）变异红／还原绿两行读数记在 `docs/skills/skill-calorie/t256-锁票-证据.md` 第二轮段。
 *
 * 跑法（编译／测试都要持锁，见 `docs/subagent-concurrency-protocol.md` §2–§3）：
 *   node tooling/run-locked.mjs --ticket 256 -- node node_modules/typescript/bin/tsc -b packages/skill-calorie --force
 *   node tooling/run-locked.mjs --ticket 256 -- node --test packages/skill-calorie/test/goal-lock-256.test.mjs
 *
 * 真库零接触：库路径恒走 `mkdtemp` 的临时目录（每个用例一份独立副本），真库只读 sha256 前后比一次；见判定⑥。
 * 时钟：`test/freeze-clock.cjs` ＋ `FAKE_NOW_ISO` 钉住当刻（饮水推荐按**当季**取值，只钉 `CALORIE_TODAY` 不够），
 *      `CALORIE_TODAY=SEED_TODAY` 钉数据日——两条一起才可复跑（先例 `goal-recommend-589.test.mjs` 件头）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { after, test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const PRELOAD = join(HERE, 'freeze-clock.cjs');
const DB_FILENAME = 'calorie_data.db';
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 钉住当刻（饮水推荐读 `new Date().getMonth()`；2026-09 为夏季档 35 ml/kg）。 */
const FAKE_NOW = SEED_TODAY + 'T00:00:00';
/** 票面 `<日期>` 占位换成的固定截止日：`SEED_TODAY=2026-09-07` ⇒ 115 天（`t289-补齐-证据.md:84` 同值）。 */
const DEADLINE = '2026-12-31';
/** 真库（只读 sha256 用；不在位即跳过哈希，只跑临时目录守卫）。 */
const REAL_DB = process.env.CALORIE_LIVE_DB ?? join('D:', '2Study', 'StudyNotes', '.db', DB_FILENAME);
/** 真库跑前 sha（模块加载即拍；全程只读，一个字节都不写）。 */
const BEFORE_SHA = existsSync(REAL_DB) ? createHash('sha256').update(readFileSync(REAL_DB)).digest('hex') : null;

/** 28 条（顺序＝工作流程表 #1…#28；`params === undefined` 即不带 `--params`）。 */
const WAKE_TABLE = [
  { n: 1, wake: '定营养目标', key: 'calorie.goal.set', params: { calorie: 1800, protein: 150, carbs: 200, fat: 50, water: 2000 } },
  { n: 2, wake: '定营养目标(自动算)', key: 'calorie.view.goal-wizard', params: { profile: 'cut', wake: '定营养目标(自动算)' } },
  { n: 3, wake: '定体重目标', key: 'calorie.goal.weight', params: { kg: 68 } },
  { n: 4, wake: '定体重目标(自动算截止)', key: 'calorie.goal.weight', params: { kg: 68, deadline: DEADLINE } },
  { n: 5, wake: '定体重目标(含起始日)', key: 'calorie.goal.weight', params: { kg: 68, startKg: 72, deadline: DEADLINE, startDate: '2026-09-01' } },
  { n: 6, wake: '定饮水目标', key: 'calorie.goal.water', params: { water: 2000 } },
  { n: 7, wake: '定饮水目标(自动算)', key: 'calorie.view.goal-wizard', params: { profile: 'cut', wake: '定饮水目标(自动算)' } },
  { n: 8, wake: '一键定全套目标', key: 'calorie.view.goal-wizard', params: { profile: 'cut', wake: '一键定全套目标' } },
  { n: 9, wake: '看今日目标', key: 'calorie.view.goal-progress', params: { window: '今日' } },
  { n: 10, wake: '看本周目标', key: 'calorie.view.goal-progress', params: { window: '本周' } },
  { n: 11, wake: '看营养目标进度', key: 'calorie.view.goal-progress', params: { window: '7d' } },
  { n: 12, wake: '看体重目标进度', key: 'calorie.view.goal-weight', params: { window: '7d' } },
  { n: 13, wake: '看饮水目标进度', key: 'calorie.view.goal-progress', params: { window: '今日' } },
  { n: 14, wake: '看目标对比实际', key: 'calorie.view.goal-vs-actual', params: { window: '30d' } },
  { n: 15, wake: '看目标完成度', key: 'calorie.view.goal', params: { window: '7d' } },
  { n: 16, wake: '看即将到期的目标', key: 'calorie.view.goal-expiring', params: undefined },
  { n: 17, wake: '看目标完成率(按周)', key: 'calorie.view.goal-progress', params: { window: '7d' } },
  { n: 18, wake: '看目标完成率(按月)', key: 'calorie.view.goal-progress', params: { window: '7d' } },
  { n: 19, wake: '改营养目标', key: 'calorie.goal.set', params: { calorie: 1800, protein: 150, carbs: 200, fat: 50 } },
  { n: 20, wake: '改体重目标', key: 'calorie.goal.weight', params: { kg: 67.5 } },
  { n: 21, wake: '改饮水目标', key: 'calorie.goal.water', params: { water: 2200 } },
  { n: 22, wake: '暂停所有目标', key: 'calorie.goal.pause', params: undefined },
  { n: 23, wake: '重启所有目标', key: 'calorie.goal.resume', params: undefined },
  { n: 24, wake: '看目标历史完成', key: 'calorie.view.goal', params: { window: '30d' } },
  { n: 25, wake: '看目标预测达成', key: 'calorie.view.goal-predict', params: { window: '14d' } },
  { n: 26, wake: '看目标推荐', key: 'calorie.view.goal-recommend', params: { profile: 'cut' } },
  { n: 27, wake: '看目标配置', key: 'calorie.view.goal-config', params: {} },
  { n: 28, wake: '看目标状态', key: 'calorie.view.goal-status', params: {} },
];

/** 12 条看类（25 场景里的 12 条「看」字词；3 条自造别名本票只作加宽，见下）。 */
const LOOK12 = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 24, 25].map((n) => WAKE_TABLE[n - 1]);
/** 3 条自造别名（#291 乙；路由断言另有其票，本件只用它们的产物加宽形状比对）。 */
const ALIASES = [26, 27, 28].map((n) => WAKE_TABLE[n - 1]);
/** 天数派生（票面 `<日期>` 与种子数据日的差，不手抄 115）。 */
const DAYS_LEFT = Math.round((Date.parse(DEADLINE + 'T12:00:00Z') - Date.parse(SEED_TODAY + 'T12:00:00Z')) / 86400000);

/** 日期加减（UTC 正午锚点，避免时区把日界挪走）。 */
const shiftISO = (iso, days) => new Date(Date.parse(iso + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);
/** 当刻那一周的周一（`analysis/series.ts:83` 的「本周」＝本周一至锚点日）。 */
const mondayOf = (iso) => {
  const dow = new Date(Date.parse(iso + 'T12:00:00Z')).getUTCDay();
  return shiftISO(iso, -((dow + 6) % 7));
};

/** 一条词的「命令＋窗口」槽：窗口按当刻口径解析成区间串（`今日`／`本周`／`Nd` 三种写法都归一到同一段），
 *  其余命令的窗口参数按字面（各自的窗口语义另有页面票）。判定②的等价关系就压在这个槽上。 */
function slotOf(c) {
  const w = c.params?.window;
  if (c.key === 'calorie.view.goal-progress') {
    if (w === '今日') return c.key + '|' + SEED_TODAY + '..' + SEED_TODAY;
    if (w === '本周') return c.key + '|' + mondayOf(SEED_TODAY) + '..' + SEED_TODAY;
    if (/^\d+d$/.test(w ?? '')) return c.key + '|' + shiftISO(SEED_TODAY, -(Number(w.slice(0, -1)) - 1)) + '..' + SEED_TODAY;
  }
  return c.key + '|' + JSON.stringify(c.params ?? null);
}

/* ── 真跑装置（先例 goal-wizard-251／goal-recommend-589：临时种子库 ＋ 真 CLI ＋ 钉钟） ── */

const TMP_ROOTS = [];
let RUN_COUNT = 0;
function mkTemplate(tag) {
  const dir = mkdtempSync(join(tmpdir(), 't256-lock-' + tag + '-'));
  const db = openDb(join(dir, DB_FILENAME));
  try { seedFull(db); } finally { db.close(); }
  TMP_ROOTS.push(dir);
  return dir;
}

/** 跑一件：临时库副本 ＋ 真 CLI；`anchor` 可换锚点日（用于「本周真被采纳」的正对照）。 */
function runCli(template, c, anchor) {
  const day = anchor ?? SEED_TODAY;
  RUN_COUNT += 1;
  const runDir = join(template, 'run' + String(c.n));
  mkdirSync(runDir, { recursive: true });
  copyFileSync(join(template, DB_FILENAME), join(runDir, DB_FILENAME));
  const out = join(runDir, 'p' + c.n + '.html');
  const argv = ['--require', PRELOAD, BIN, c.key];
  if (c.params !== undefined) argv.push('--params', JSON.stringify(c.params));
  argv.push('--html', out);
  const r = spawnSync(NODE_BIN, argv, {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: runDir, CALORIE_TODAY: day, FAKE_NOW_ISO: day + 'T00:00:00' },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  const outAbs = env?.data?.output === undefined ? null : String(env.data.output);
  return {
    c, day, dbDir: runDir, outPath: out, exit: r.status,
    stderr: String(r.stderr || '').trim(),
    stdout: String(r.stdout || '').trim(),
    env, output: outAbs,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 28 条只跑一次（各判据组共用；懒加载，便于单组重跑）。 */
let _runs = null;
function runs28() {
  if (_runs === null) {
    const tpl = mkTemplate('28');
    const out = new Map();
    for (const c of WAKE_TABLE) out.set(c.wake, runCli(tpl, c));
    _runs = out;
  }
  return _runs;
}
const run = (wake) => runs28().get(wake);

/** 独立库跑一件（数值组／对照／灵敏度用；与 28 条那批互不串味）。 */
const runFresh = (tag, c, anchor) => runCli(mkTemplate(tag), c, anchor);

/* ── 判据件（都单独抽出来：灵敏度直接拿它们跑，不另抄一份） ── */

/** 完整文档四断言（票面口径：`<!doctype html>` ＋ charset ＋ 样式段 ＋ 版面）。 */
function assertFullDoc(html, what) {
  assert.ok(html !== null, what + ' 未落盘（产物文件不存在）');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype（不是完整文档）');
  assert.ok(html.includes('<meta charset='), what + ' 缺 charset');
  assert.ok(html.includes('<style'), what + ' 缺 style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 ilife-page 版面');
}

/** 真出口四件事：exit0 ＋ 绝对路径 ＋ 在盘 ＋ 字节如实（与 `data.output` 指向的文件同长）。 */
function assertExitAndPath(r, what) {
  assert.equal(r.exit, 0, what + ' 应 exit 0，实测 ' + r.exit + '（stderr：' + r.stderr.slice(-200) + '）');
  assert.ok(typeof r.output === 'string' && isAbsolute(r.output),
    what + ' `data.output` 应是绝对路径，实测 ' + JSON.stringify(r.output));
  assert.ok(existsSync(r.output), what + ' `data.output` 指向的文件不在盘上：' + r.output);
  assert.equal(readFileSync(r.output, 'utf8').length, r.file === null ? -1 : r.file.length,
    what + ' 落盘字节与回执路径读回的字节不一致');
}

const sigOf = (item) => '`' + item.key + '` ' + JSON.stringify(item.params ?? {});

/** 区块集：`sec-*` 锚点 ＋ `ilife-block-*` 件类 ＋ 页题 ＋ 页头左行（一眼能看出「是不是同一张盘」）。 */
function blockSig(html) {
  const ids = [...new Set([...html.matchAll(/id="(sec-[a-z0-9-]+)"/g)].map((m) => m[1]))].sort();
  const kinds = [...new Set([...html.matchAll(/class="([^"]*)"/g)]
    .flatMap((m) => m[1].split(/\s+/)).filter((t) => t.startsWith('ilife-block-')))].sort();
  const title = (/ilife-block-page-shell-title">([^<]*)/.exec(html) ?? [])[1] ?? null;
  const meta = (/<div class="meta-bar"><div class="left">([^<]*)/.exec(html) ?? [])[1] ?? null;
  return JSON.stringify({ ids, kinds, title, meta });
}

/** 两两区块集比对：**相等 ⟺ 同槽**（同一命令 ＋ 同一段窗口）。
 *  「同槽必同形」防同一条词出两张盘；「异槽必不同形」防 12 条塌成一张通用盘。 */
function assertPairwiseDistinct(items, what) {
  const sigs = new Map(items.map(({ c, file }) => [c.wake, blockSig(file)]));
  const equalPairs = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i].c, b = items[j].c;
      const same = sigs.get(a.wake) === sigs.get(b.wake);
      const sameSlot = slotOf(a) === slotOf(b);
      if (same) equalPairs.push(a.wake + '|' + b.wake);
      if (sameSlot) {
        assert.ok(same, what + '「' + a.wake + '」与「' + b.wake + '」同槽（' + slotOf(a) + '），必须同形——实测不同形：'
          + '\n  ' + sigs.get(a.wake) + '\n  ' + sigs.get(b.wake));
      } else {
        assert.ok(!same, what + '「' + a.wake + '」（' + sigOf(a) + '｜槽 ' + slotOf(a) + '）与「' + b.wake + '」（'
          + sigOf(b) + '｜槽 ' + slotOf(b) + '）区块集全等——异槽却塌成了同一张盘：\n  ' + sigs.get(a.wake));
      }
    }
  }
  return { distinct: new Set(sigs.values()).size, equalPairs };
}

/** 同族骨架键名（结果页族：页内导航 ＋ 口径行 ＋ 类型徽章 ＋ 结论句 ＋ 页题）。 */
const FAMILY_KEYS = ['ilife-block-toc', 'ilife-block-caliber', 'type-badge', '结论：', 'ilife-block-page-shell-title'];
function assertFamilyKeys(html, what) {
  for (const k of FAMILY_KEYS) assert.ok(html.includes(k), what + ' 缺同族骨架键名：' + k);
}

/** 数值组 ①：宏量合计与换算式。出处＝老 `nutrition_goal.py:84-85`（`calculated=蛋白*4+碳水*4+脂肪*9`、`diff`）、
 *  `:111-112`（`|diff|≤50` 才印合规句）；`t251-老技能算式.md:15-16`；`t289-补齐-证据.md:63,69`；新仓 `src/goal/receipt.ts:207,213-217`。 */
function assertMacroNumbers(html, what) {
  const sum = 150 * 4 + 200 * 4 + 50 * 9;
  const diff = sum - 1800;
  assert.equal(sum, 1850, '件内算式：150×4＋200×4＋50×9 应为 1850（改了这个常量即改判据）');
  assert.ok(html.includes('合计 ' + sum + ' 卡，宏量换算 ' + sum + ' 卡'),
    what + ' 缺宏量合计「合计 ' + sum + ' 卡，宏量换算 ' + sum + ' 卡」（出处 老 nutrition_goal.py:84-85）');
  assert.ok(html.includes('换算式 蛋白 150×4＋碳水 200×4＋脂肪 50×9＝' + sum + ' 卡'),
    what + ' 缺换算式行（＝' + sum + ' 卡；出处 老 nutrition_goal.py:84-85）');
  assert.ok(html.includes('diff ＋' + diff + ' 卡，一致'),
    what + ' 缺自洽句「diff ＋' + diff + ' 卡，一致」（出处 老 nutrition_goal.py:111-112 的 |diff|≤50）');
}

/** 数值组 ②：体重速率与剩余天数。出处＝老 `weight_goal.py:115-118`（`gap/required_daily/7700`）、
 *  `t251-老技能体重与状态页.md:143-146`（per_week／per_month／健康带 0.25–1.0）；`t289-补齐-证据.md:84`
 *  （70.6→68、截止 2026-12-31、115 天、0.16）；新仓 `src/goal/receipt.ts:241-248`。 */
function assertWeightRateNumbers(html, what) {
  const gap = 70.6 - 68;
  const perWeek = gap / DAYS_LEFT * 7, pw = perWeek.toFixed(2), perMonth = (perWeek * 52 / 12).toFixed(1);
  assert.equal(DAYS_LEFT, 115, '件内算式：' + SEED_TODAY + ' → ' + DEADLINE + ' 应为 115 天（出处 t289-补齐-证据.md:84）');
  assert.equal(pw, '0.16', '件内算式：2.6kg ÷ 115 天 × 7 应为 0.16 kg/周（出处 老 weight_goal.py:115-118）');
  assert.ok(html.includes(gap.toFixed(1) + 'kg ÷ ' + DAYS_LEFT + '天 × 7 = ' + pw + ' kg/周 ≈ ' + perMonth + ' kg/月'),
    what + ' 缺速率公式行（' + pw + ' kg/周；出处 老 weight_goal.py:115-118）');
  assert.ok(html.includes('建议速率 ' + pw + ' kg/周'),
    what + ' 缺「建议速率 ' + pw + ' kg/周」（出处 t251-老技能体重与状态页.md:143-146）');
  assert.ok(html.includes('健康带 0.25 kg/周到 1.0 kg/周'),
    what + ' 缺健康带那一句（出处 t251-老技能体重与状态页.md:143-146）');
}

/** 数值组 ③：饮水推荐。出处＝老 `nutrition_goal.py:252-271`（显式体重→最新记录→70.0；6/7/8/9 月为夏；35／30）；
 *  `t251-老技能算式.md:73-79`；`t289-补齐-证据.md:90`；新仓 `src/goal/nutritionGoal.ts:215`。 */
function assertWaterNumbers(html, what) {
  const ml = Math.trunc(70.6 * 35);
  assert.equal(ml, 2471, '件内算式：70.6 kg × 35 ml/kg（夏季档）应为 2471 ml（出处 老 nutrition_goal.py:270-271）');
  assert.ok(html.includes('推荐 ' + ml + ' ml'), what + ' 缺「推荐 ' + ml + ' ml」（出处 老 nutrition_goal.py:270-271）');
  assert.ok(html.includes('70.6 kg × 35 ml/kg'), what + ' 缺体重×系数那一行（出处 老 nutrition_goal.py:270）');
  assert.ok(html.includes('夏'), what + ' 缺季节档「夏」（出处 老 nutrition_goal.py:266-269：6/7/8/9 月记作夏）');
}

/** 变异用：把整份产物里某个串全挖掉（灵敏度自证：判据必须因此变红）。 */
const cut = (html, needle) => {
  const out = html.split(needle).join('（挖掉）');
  assert.notEqual(out, html, '变异没落上：产物里找不到 ' + JSON.stringify(needle));
  return out;
};

/** 变异用：把某个模板键名换成另一个串（模拟「换掉一个模板键名」）。 */
const renameKey = (html, key) => {
  const out = html.split(key).join('ilife-block-renamed');
  assert.notEqual(out, html, '键名变异没落上：产物里找不到 ' + key);
  return out;
};

after(() => { for (const d of TMP_ROOTS) rmSync(d, { recursive: true, force: true }); });

/* ── ① 28 条真出口 ── */

test('#256 ① 28 条真出口：exit0 ＋ data.output 绝对路径 ＋ 字节如实 ＋ 完整文档四断言', () => {
  const r = runs28();
  assert.equal(r.size, 28, '28 条都要真跑（判据不许空跑），实测 ' + r.size);
  assert.deepEqual([...r.keys()], WAKE_TABLE.map((c) => c.wake), '28 条唤醒词清单与工作流程表走散');
  for (const c of WAKE_TABLE) {
    const one = r.get(c.wake);
    const what = '第 ' + c.n + ' 条「' + c.wake + '」' + sigOf(c) + '：';
    assertExitAndPath(one, what);
    assertFullDoc(one.file, what);
  }
  console.log('T256-① 28/28 真出口：exit0 ＋ 绝对路径 ＋ 字节如实 ＋ 完整文档（含第 26 条 看目标推荐）');
});

/* ── ② 不同形 ── */

test('#256 ② 12 条看类两两不同形：区块集相等 ⟺ 同槽（同命令＋同段窗口）＋ 不同形档数 ≥ 8', () => {
  const items = LOOK12.map((c) => ({ c, file: run(c.wake).file }));
  for (const { c } of items) {
    const one = run(c.wake);
    assert.equal(one.exit, 0, '「' + c.wake + '」应 exit 0，实测 ' + one.exit + '（stderr：' + one.stderr.slice(-160) + '）');
    assertFullDoc(one.file, '「' + c.wake + '」');
  }
  /* 当刻口径先自证：2026-09-07 是周一 ⇒ 本周＝本周一至锚点日＝单日（与「今日」同段，故三词同形是口径不是塌盘）。 */
  assert.equal(mondayOf(SEED_TODAY), SEED_TODAY, '件内算式：' + SEED_TODAY + ' 应为周一（当刻锚点口径，src/analysis/series.ts:83）');
  const { distinct, equalPairs } = assertPairwiseDistinct(items, '');
  assert.ok(distinct >= 8, '12 条看类只剩 ' + distinct + ' 个不同形档（基线 8）：塌盘回归。同形对：' + equalPairs.join('、'));
  assert.equal(equalPairs.length, 6, '同形对从 6 变 ' + equalPairs.length + '（' + equalPairs.join('、') + '）——形状面有增减，核对基线');
  /* 加宽：3 条自造别名各占一个新槽（不重复 #291／#589 的路由与字段断言，只比形状）。 */
  const wide = [...items, ...ALIASES.map((c) => ({ c, file: run(c.wake).file }))];
  const w = assertPairwiseDistinct(wide, '（含 3 条自造别名）');
  assert.equal(w.distinct, distinct + 3, '加宽后的不同形档数应＝12 条档数＋3（别名各占一档），实测 ' + w.distinct + ' vs ' + distinct);
  console.log('T256-② 12 条看类：' + distinct + ' 个不同形档／同形对 ' + equalPairs.join('、') + '；加宽 15 条：' + w.distinct + ' 档');
});

test('#256 ②-正对照 「本周」真被采纳：锚点挪到周三（2026-09-09）即以「近 3 天」出页', () => {
  const c = WAKE_TABLE[9]; // 看本周目标：goal-progress {"window":"本周"}
  const mid = runFresh('midweek', c, '2026-09-09');
  assertExitAndPath(mid, '「看本周目标」锚点 2026-09-09：');
  assertFullDoc(mid.file, '「看本周目标」锚点 2026-09-09：');
  assert.ok(mid.file.includes('近 3 天目标进度'),
    '周三锚点下「看本周目标」应出「近 3 天目标进度」页题（本周＝本周一至锚点日＝3 天，src/analysis/series.ts:83）');
  const today = run(WAKE_TABLE[8].wake); // 看今日目标（当刻 2026-09-07）
  assert.notEqual(blockSig(mid.file), blockSig(today.file),
    '周三锚点下的「看本周目标」与「看今日目标」区块集仍全等——窗口参数被吞掉（不是同窗，是真不看参数）');
  console.log('T256-②对照 看本周目标@2026-09-09 = 近 3 天目标进度；与看今日目标不同形');
});

/* ── ③ 数值对账（预期值人人有出处） ── */

test('#256 ③ 数值三组：宏量 1850／速率 0.16 kg/周（115 天）／饮水 2471 ml——件内重算式 ＋ 出处', () => {
  const macro = runFresh('num-macro', WAKE_TABLE[18]); // 19 改营养目标 {calorie:1800,protein:150,carbs:200,fat:50}
  assertExitAndPath(macro, '数值①「改营养目标」：');
  assertMacroNumbers(macro.file, '数值①「改营养目标」');

  const rate = runFresh('num-rate', WAKE_TABLE[3]); // 4 定体重目标(自动算截止) {kg:68,deadline:2026-12-31}
  assertExitAndPath(rate, '数值②「定体重目标(自动算截止)」：');
  assertWeightRateNumbers(rate.file, '数值②「定体重目标(自动算截止)」');

  const water = runFresh('num-water', WAKE_TABLE[20]); // 21 改饮水目标 {water:2200}
  assertExitAndPath(water, '数值③「改饮水目标」：');
  assertWaterNumbers(water.file, '数值③「改饮水目标」');
  console.log('T256-③ 数值三组：宏量 1850（nutrition_goal.py:84-85）／速率 0.16 kg/周（weight_goal.py:115-118）／饮水 2471 ml（nutrition_goal.py:270-271）');
});

/* ── ④ 阻断四态 ── */

/** 空库跑一件（不种子）。 */
function runEmpty(tag, key, params) {
  const dir = mkdtempSync(join(tmpdir(), 't256-lock-' + tag + '-'));
  TMP_ROOTS.push(dir);
  RUN_COUNT += 1;
  const out = join(dir, 'p.html');
  const argv = ['--require', PRELOAD, BIN, key];
  if (params !== undefined) argv.push('--params', JSON.stringify(params));
  argv.push('--html', out);
  const r = spawnSync(NODE_BIN, argv, {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY, FAKE_NOW_ISO: FAKE_NOW },
  });
  return { exit: r.status, stderr: String(r.stderr || '').trim(), outPath: out, dbDir: dir, file: existsSync(out) ? readFileSync(out, 'utf8') : null };
}

/** 种子库删掉档案表再跑（缺项档）。 */
function runNoProfile(tag, wake) {
  const dir = mkdtempSync(join(tmpdir(), 't256-lock-' + tag + '-'));
  TMP_ROOTS.push(dir);
  RUN_COUNT += 1;
  const db = openDb(join(dir, DB_FILENAME));
  try { seedFull(db); db.prepare('DELETE FROM user_profile').run(); } finally { db.close(); }
  const out = join(dir, 'p.html');
  const r = spawnSync(NODE_BIN, ['--require', PRELOAD, BIN, 'calorie.view.goal-wizard', '--params',
    JSON.stringify({ profile: 'cut', wake }), '--html', out], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY, FAKE_NOW_ISO: FAKE_NOW },
  });
  return { exit: r.status, stderr: String(r.stderr || '').trim(), outPath: out, dbDir: dir, file: existsSync(out) ? readFileSync(out, 'utf8') : null };
}

test('#256 ④ 阻断四态：空库定类可开不编数／改类 exit4 不落盘／档案缺项不编数／方向非法 exit2 不落盘', () => {
  /* D1 空库＋定类（#251 裁定：照常出页、不编默认值）。 */
  const d1 = runEmpty('d1', 'calorie.view.goal-wizard', { wake: '定营养目标' });
  assert.equal(d1.exit, 0, 'D1 空库定类应 exit 0（照常出页），实测 ' + d1.exit + '（stderr：' + d1.stderr.slice(-160) + '）');
  assertFullDoc(d1.file, 'D1 空库定类：');
  assert.ok(d1.file.includes('未设置'), 'D1 页上应写「未设置」（库内无目标行；#251 裁定不编 0）');
  assert.ok(['不算推荐', '不出推荐值', '不推荐'].some((s) => d1.file.includes(s)),
    'D1 页上应写明不编推荐（不算推荐／不出推荐值／不推荐 三者之一）');
  for (const fake of ['2064', '2471']) {
    assert.ok(!d1.file.includes(fake), 'D1 空库页上出现了推荐数 ' + fake + '（编了默认值，#251 红线）');
  }

  /* D2 空库＋改类（#252 守卫：missing-data，exit 4，不落盘）。 */
  const d2 = runEmpty('d2', 'calorie.view.goal-wizard', { wake: '改营养目标' });
  assert.equal(d2.exit, 4, 'D2 空库改类应 exit 4，实测 ' + d2.exit + '（stderr：' + d2.stderr.slice(-160) + '）');
  assert.ok(!existsSync(d2.outPath), 'D2 空库改类不该落盘：' + d2.outPath);
  assert.match(d2.stderr, /ERR 4|尚无目标/, 'D2 stderr 应给缺失阻断（ERR 4／尚无目标），实测 ' + JSON.stringify(d2.stderr.slice(-200)));

  /* D3 档案缺项（删档案表）＋自动算（#251 缺项不编数）。 */
  const d3 = runNoProfile('d3', '定营养目标(自动算)');
  assert.equal(d3.exit, 0, 'D3 档案缺项应 exit 0（出页不落错），实测 ' + d3.exit + '（stderr：' + d3.stderr.slice(-160) + '）');
  assertFullDoc(d3.file, 'D3 档案缺项：');
  assert.ok(d3.file.includes('档案缺') && d3.file.includes('不出推荐数字'),
    'D3 页上应写「档案缺…，不出推荐数字」（缺项不编数）');
  assert.ok(!d3.file.includes('2064'), 'D3 档案缺项页上出现了推荐数 2064（编数了）');

  /* D4 方向非法（#251：bad-input，exit 2，不落盘）。 */
  const d4 = runEmpty('d4', 'calorie.view.goal-wizard', { profile: 'nope', wake: 'x' });
  assert.equal(d4.exit, 2, 'D4 方向非法应 exit 2，实测 ' + d4.exit + '（stderr：' + d4.stderr.slice(-160) + '）');
  assert.ok(!existsSync(d4.outPath), 'D4 方向非法不该落盘：' + d4.outPath);
  assert.match(d4.stderr, /ERR 2/, 'D4 stderr 应给用法阻断（ERR 2），实测 ' + JSON.stringify(d4.stderr.slice(-200)));
  console.log('T256-④ 阻断四态：D1 exit0 不编数／D2 exit4 不落盘／D3 exit0 缺项不编数／D4 exit2 不落盘');
});

/* ── ⑤ 灵敏度 ── */

test('#256 ⑤ 灵敏度：摘模板键名／挖数值／两条命令塌成同一份，对应断言必须变红（原样必绿）', () => {
  const completion = run('看目标完成度');
  assert.equal(completion.exit, 0, '看目标完成度应 exit 0');
  const reds = [];

  /* a) 同族键名：逐个摘掉 ⇒ `assertFamilyKeys` 必红。 */
  assertFamilyKeys(completion.file, '看目标完成度「原样」'); // 原样绿
  for (const k of FAMILY_KEYS) {
    const broken = renameKey(completion.file, k);
    assert.throws(() => assertFamilyKeys(broken, '（变异 ' + k + '）'), /缺同族骨架键名/, '摘掉 ' + k + ' 后键名判据没红');
    reds.push('键名 ' + k);
  }

  /* b) 数值：三组各挖一处 ⇒ 对应数值判据必红。 */
  const macro = runFresh('m-macro', WAKE_TABLE[18]);
  assertMacroNumbers(macro.file, '宏量「原样」');
  for (const needle of ['合计 1850 卡，宏量换算 1850 卡', '换算式 蛋白 150×4＋碳水 200×4＋脂肪 50×9＝1850 卡']) {
    assert.throws(() => assertMacroNumbers(cut(macro.file, needle), '（变异）'), /缺宏量合计|缺换算式行/,
      '挖掉 ' + JSON.stringify(needle) + ' 后宏量判据没红');
    reds.push('宏量 ' + needle.slice(0, 6));
  }
  const rate = runFresh('m-rate', WAKE_TABLE[3]);
  assertWeightRateNumbers(rate.file, '速率「原样」');
  assert.throws(() => assertWeightRateNumbers(cut(rate.file, '0.16 kg/周'), '（变异）'), /缺速率公式行|缺「建议速率/,
    '挖掉 0.16 kg/周 后速率判据没红');
  reds.push('速率 0.16 kg/周');
  const water = runFresh('m-water', WAKE_TABLE[20]);
  assertWaterNumbers(water.file, '饮水「原样」');
  assert.throws(() => assertWaterNumbers(cut(water.file, '推荐 2471 ml'), '（变异）'), /缺「推荐 2471 ml」/,
    '挖掉 推荐 2471 ml 后饮水判据没红');
  reds.push('饮水 推荐 2471 ml');

  /* c) 形状：12 条看类原样必绿；把两条不同命令的产物换成同一份（塌盘）⇒ 两两不同形判据必红。 */
  const pristine = LOOK12.map((c) => ({ c, file: run(c.wake).file }));
  assertPairwiseDistinct(pristine, '12 条看类「原样」');
  const collapsed = pristine.map((it) => (it.c.wake === '看营养目标进度' ? { ...it, file: run('看今日目标').file } : it));
  assert.throws(() => assertPairwiseDistinct(collapsed, '（变异 看营养目标进度←看今日目标）'), /全等/,
    '把两条不同命令的产物换成同一份后，两两不同形判据没红');
  reds.push('形状 看营养目标进度←看今日目标');

  assert.equal(reds.length, 10, '灵敏度覆盖面不对：实测 ' + reds.length + ' 处（应 10 处＝键名 5 ＋ 宏量 2 ＋ 速率 1 ＋ 饮水 1 ＋ 形状 1）');
  console.log('T256-⑤ 灵敏度：红 ' + reds.length + ' 处（' + reds.join('；') + '），原样全绿');
});

/* ── ⑥ 真库零接触 ── */

test('#256 ⑥ 真库零接触：实跑库路径全在系统临时目录 ＋ 真库 sha256 前后相同', () => {
  runs28(); // 确保 28 条都跑过（本判据要检所有实跑过的库目录）
  const outside = TMP_ROOTS.filter((d) => !d.startsWith(tmpdir()));
  assert.deepEqual(outside, [], '有实跑没用系统临时目录：' + outside.join('、'));
  assert.ok(TMP_ROOTS.length >= 12, '独立临时库数异常（应 ≥12），实测 ' + TMP_ROOTS.length);
  assert.ok(RUN_COUNT >= 39, '实跑次数异常（28 条 ＋ 数值 3 ＋ 对照 1 ＋ 阻断 4 ＋ 灵敏度 3 ＝ 39），实测 ' + RUN_COUNT);
  if (BEFORE_SHA !== null) {
    const after = createHash('sha256').update(readFileSync(REAL_DB)).digest('hex');
    assert.equal(after, BEFORE_SHA, '真库在本件跑动期间被改过（sha256 前后不同）：' + REAL_DB);
    console.log('T256-⑥ 真库只读：' + REAL_DB + ' sha256=' + after + '（跑前跑后相同；临时库 ' + TMP_ROOTS.length + ' 个／实跑 ' + RUN_COUNT + ' 次）');
  } else {
    console.log('T256-⑥ 真库不在位（' + REAL_DB + '）：只验临时目录守卫；临时库 ' + TMP_ROOTS.length + ' 个／实跑 ' + RUN_COUNT + ' 次');
  }
});
