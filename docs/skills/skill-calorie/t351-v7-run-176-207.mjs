/** T351-v7 · 场景 05 fitness 全量重跑：order176–207（结果页／过程页／写后回执）＋机检（承 v6 全口径）。
 * 本件＝ 2026-09-15 T351-v7 版：相对 v6 只两处判据随动——⑩ 零 JS 自证由「只判 176–185」放宽到
 * **全量 37 份**（v7 撤掉 201–206 那张柱图后，全量统一为每份恰 1 块共享 helpers），并新增 ⑰ 全量 37 份
 * 正文零内部词「会话」；195 回执文案判据随「会话」下架改为「配置与训练安排均为空」。其余 ①–⑯ 逐条不放松。
 *
 * 口径：每条唤醒词按 `packages/skill-calorie/src/workout/routes.ts` 的 `list:'wake'` 真命令与真参数
 * 跑真出口（`dist/cli/cmd_read.js`），库隔离在本目录 `dbs/` 下（`SKILLS_DB_PATH`），不碰生产库。
 *
 * 与上一轮 `final-v4/` 的差别（T351-v5：结果页整页穿老模板观感——两级页签／场次卡／部位彩色徽章）：
 *   ① 结果页不再用 `<details>/<summary>`：**两级页签改成零脚本的选钮式**（`input[type=radio]` ＋ `label`
 *      ＋兄弟选择器）；日级标题随之从 `<summary>` 移到**场次卡头行** `<div class="ilw-sess-head">`、
 *      休息日标题在 `<h3 class="ilw-rest-title">`、周标题在 `<h2 class="ilw-week-head">`。本脚本的标题
 *      提取与 ⑥⑧ 两条跟着改读处（判据本身不放松）。
 *   ② 新增 ⑩ **零 JS 自证**：每份 `<script` 恒 1 块、且各份**逐字同长同头**（同一份共享 helpers，
 *      除它之外为零），正文无内联事件处理器、无 `javascript:` 伪协议。
 *   ③ 新增 ⑪ **用词自证**：正文（剔 `data-t` 载荷后）不出现「会话」／`main`／`iso`／`calorie.`。
 *   ④ 新增 ⑫ **页签手法自证**：凡页内确有动作表的产物，必须同时命中 `ilw-tabs`、`ilw-day-tabs`、
 *      `#ilw-wk-all:checked` 三条（标记＋规则两半都在 ⇒ 页签不靠脚本）。
 *
 * 承 v4 的 ①–⑨（四列表头按逐份声明／冻结 id／禁词／副行小字／类型中文单语／节奏真值两面判／
 * 两条无损删减／夹具三条边界／页头字段）逐条保留，一处不放松。
 *
 * 产物落 `--out` 指的目录（**必填**：`final-v4`／`final-v3` 是前两轮交付的对照基准，原地重跑会覆盖它们）；
 * 库在 `<out>/dbs/`；读数在 `<out>/detail.json`。任何一条红 → exit 1。
 * 用法（持锁）：node tooling/run-locked.mjs --ticket 351 --run-id t351-v5-<短名> -- \
 *   node .scratch/t351-fix/v5/run-176-207-v5.mjs --out .scratch/t351-fix/final-v5
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../../../packages/skill-calorie/dist/index.js';
import { DB_FILENAME } from '../../../packages/skill-calorie/dist/paths.js';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const outArg = argv.indexOf('--out');
if (outArg < 0 || argv[outArg + 1] === undefined) {
  console.error('必须显式给 --out <产物目录>：`final-v3` 是上一轮交付的对照基准（六列口径），'
    + '原地重跑会覆盖它。例：--out .scratch/t351-fix/final-v4');
  process.exit(2);
}
const OUT = resolve(argv[outArg + 1]);
const DBS = join(OUT, 'dbs');
const CLI = resolve(here, '../../../packages/skill-calorie/dist/cli/cmd_read.js');
/** 计划说明：与生产库 `workout_plan_config.description` 同列，验页头副标题印它。 */
const CFG_DESC = '科学定制·6天/周·270组';

/** §2.1.3 路径守卫：递归删除前先断言目标在自己声明的草稿根之下，且不落禁区目录。 */
const FORBIDDEN = ['node_modules', 'packages', 'docs', 'test', 'tooling', '.git'];
function assertSafeToRemove(target) {
  const abs = resolve(target);
  const root = resolve(OUT);
  if (abs === root) throw new Error('拒绝删除草稿根自身: ' + abs);
  if (!abs.startsWith(root + '\\') && !abs.startsWith(root + '/')) throw new Error('拒绝删除草稿根之外的路径: ' + abs);
  for (const seg of abs.slice(root.length).split(/[\\/]/)) {
    if (FORBIDDEN.includes(seg)) throw new Error('拒绝删除禁区目录下的路径: ' + abs);
  }
}

/* ── 夹具：含边界三条 ────────────────────────────────────────── */

/** 结果页夹具（读写共用）：休息日 1 条 ＋ 多组不同次数 1 条 ＋ 空 sets 1 条。 */
function seedPlanDb(dir) {
  mkdirSync(dir, { recursive: true });
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare('DELETE FROM workout_plans').run();
  db.prepare('DELETE FROM exercise_log').run();
  db.prepare('INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, ?, ?, ?, ?, ?)')
    .run('t1计划', 'v1', CFG_DESC, 4, '2026-09-07');
  // [周, 日, 是否休息日, 会话名, 起, 止, total_sets, 动作]
  // 备注／类型走生产库真形状：`<部位细化词> [W<n> <组数>reps×<重量>kg, <节奏>]`／`main`／`iso`。
  // 边界三条照旧：休息日（无表无节奏）／多组不同次数（3组×10／8次＋35／40kg）／空 sets（双短横线）。
  const sess = [
    [1, 1, 0, '上肢', '07:00', '08:30', 3, [
      { name: '悍马机卧推', part: '胸', type: 'main', note: '胸整体 [W1 10reps×35.0kg, 20-30 RPM(2-2.5秒/次)]',
        sets: [{ reps: 10, weight: 35, unit: 'kg' }, { reps: 10, weight: 35, unit: 'kg' }, { reps: 8, weight: 40, unit: 'kg' }] },
      { name: '哑铃飞鸟', part: '胸', type: 'iso', note: '—', sets: [] },
    ]],
    [1, 2, 1, '休息日', null, null, 0, []],
    [1, 3, 0, '下肢', null, null, null, [
      { name: '深蹲', part: '腿', type: 'main', note: '股四头 [W1 5reps×60.0kg, 18-25 RPM(2.5-3秒/次)]',
        sets: [{ reps: 5, weight: 60, unit: 'kg' }] },
    ]],
    [2, 1, 0, '背', null, null, null, [
      { name: '硬拉', part: '背', type: 'main', note: '背阔', sets: [{ reps: 5, weight: 60, unit: 'kg' }] },
      // 生产库真形状的边界（a2 加）：细化词里混着类型裸词 `背 iso 主`（与该行 type 同值）
      // ⇒ 副行须读作「背 主 · 孤立」，正文里不许出现 `iso` 裸词。
      { name: '宽距高位下拉', part: '背', type: 'iso', note: '背 iso 主 [W2 5reps×42.5kg, 15-20 RPM(3-4秒/次)]',
        sets: Array.from({ length: 5 }, () => ({ reps: 5, weight: 42.5, unit: 'kg' })) },
    ]],
    [2, 3, 0, '腿', null, null, null, [
      { name: '深蹲', part: '腿', type: 'iso', note: '', sets: [{ reps: 12, weight: 0, unit: '自重' }] },
    ]],
  ];
  const ins = db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, time_start, time_end, is_rest_day, total_sets, movements) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)');
  for (const [wn, dow, rest, label, ts, te, sets, moves] of sess) ins.run(wn, dow, label, ts, te, rest, sets, JSON.stringify(moves));
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-07', '07:00:00', '俯卧撑', 20, 120, '力量')").run();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-14', '07:00:00', '硬拉', 30, 180, '力量')").run();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-15', '07:00:00', '深蹲', 25, 150, '力量')").run();
  db.close();
}

/** 回执夹具（每条写命令一份独占库）：够十条写命令各自成功的最小计划。 */
function seedReceiptDb(dir) {
  mkdirSync(dir, { recursive: true });
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare('DELETE FROM workout_plans').run();
  db.prepare('DELETE FROM exercise_log').run();
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 't1计划', 'v1', 'desc', 4, '2026-09-07')").run();
  const sess = [
    [1, 1, '上肢', [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }]],
    [1, 3, '下肢', [{ name: '深蹲', part: '腿', type: '力量', sets: [] }]],
    [2, 1, '背', [{ name: '硬拉', part: '背', type: '力量', sets: [] }]],
    [2, 3, '腿', [{ name: '深蹲', part: '腿', type: '力量', sets: [] }]],
  ];
  for (const [wn, dow, label, moves] of sess) {
    db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (?, ?, 1, ?, ?)').run(wn, dow, label, JSON.stringify(moves));
  }
  db.close();
}

/* ── 真出口 ──────────────────────────────────────────────────── */

function cli(dir, key, params, htmlPath) {
  const args = [CLI, key, '--params', JSON.stringify(params)];
  if (htmlPath) args.push('--html', htmlPath);
  const r = spawnSync(process.execPath, args, { env: { ...process.env, SKILLS_DB_PATH: dir }, encoding: 'utf8' });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  return { exit: r.status, env, stderr: String(r.stderr || '').slice(0, 400) };
}

/* ── 机检四条 ────────────────────────────────────────────────── */

/** 只对正文判「页内无…」：共享样式表与运行脚本里恒有菜单类名（`.ilife-copy-menu-item` 等），
 *  那是组件资产不是菜单项；菜单项真出现时必在正文，且标签／提示会一起出现。 */
const bodyOf = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
const count = (s, needle) => s.split(needle).length - 1;

/** 冻结 id 计数：`id="ilife-copy-data"` 是 `data-action-id="ilife-copy-data"` 的子串，须排除后者。 */
const exactId = (html, id) => count(html, 'id="' + id + '"') - count(html, 'data-action-id="' + id + '"');

const FOUR = ['动作', '部位', '组数×次数', '重量'];
/** 类型原值的裸词（本仓中文单语：`main`／`iso` 只许以「主要／孤立」出现）。前后不得是词字符或连字符。 */
const BARE_TYPE_RE = /(?<![\w-])(main|iso)(?![\w-])/;
/** 只在「备注方括号内逗号前那截」里才有的记号：逐字复现两条无损删减（`W<n>　<组数>reps×<重量>kg`）。 */
const DROPPED_TOKENS = ['reps×', 'W1 ', 'W2 ', 'W3 ', 'W4 '];
/** 副行小字：T351-v9 起是**两颗块级小标签**（`细化词` ＋ `类型`，见 `./workoutPlanCss.ts` 的 `.ilw-sub`）——
 *  原来那版是一行 `细化词 · 类型`，那个 `·` 是拿符号顶替设计（负责人 2026-09-15 第 5 条）。
 *  共享位 `renderCaliberLine` 是纯文本单参、会转义，装不下标签，故本族自落一行。 */
const SUB_RE = /<p class="ilw-sub">([\s\S]*?)<\/p>/;
/** 副行末尾那颗类型标签（判据用它认「以主要／孤立收尾」）。 */
const SUB_TAIL_RE = /<span class="ilw-sub-type">(主要|孤立)<\/span>$/;
/** 加粗动作名（副行之前那一块）。 */
const STRONG_RE = /^<strong>[^<]*<\/strong>/;
/** v5 的三处标题落点（结果页改零脚本选钮页签后，`<summary>` 只剩过程页在用）。 */
const CARD_HEAD_RE = /<div class="ilw-sess-head">([\s\S]*?)<\/div>/g;
const REST_TITLE_RE = /<h3 class="ilw-rest-title">([\s\S]*?)<\/h3>/g;
const WEEK_HEAD_RE = /<h2 class="ilw-week-head">([\s\S]*?)<\/h2>/g;
/** 去标记后的可见文本：标签换空格、空白合并（各段在源里以换行分隔，故这里读得出分隔）。 */
const visibleText = (frag) => frag.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
/** 标题里的节奏段（`节奏 <原文>` 出现在末尾）。 */
const tempoOfTitle = (t) => {
  const hit = /(?:^|\s)节奏 (.+)$/.exec(t);
  return hit === null ? '' : hit[1].trim();
};
/** 内联事件处理器与伪协议（⑩ 用；冻结五字符表之外的第二类注入面）。 */
const HANDLER_RE = /\son(?:click|change|input|submit|load|error)\s*=/i;
/** 三格式菜单的机器指纹：菜单文本三连、`fmt-menu`、菜单项元素、菜单提示行。 */
const MENU_TOKENS = ['纯文本', 'JSON', 'CSV', 'fmt-menu', 'copy-menu-item', 'data-fmt-open',
  'ilife-copy-menu"', '粘贴给 AI / 自己看', '结构化存档', '表格导入', '复制数据 ▾'];
const BAD_TOKENS = ['op=', '# 成功'];
/** 复制数据标题落到英文命令键的指纹：`buildDataText` 不传 title 时回落到信封 key（如
 *  `calorie.view.plan-write-preview`），页面上就出现英文命令键——中文单语口径不允许。 */
const EN_KEY_RE = /【calorie · calorie\./;

function inspect(name, html) {
  const body = bodyOf(html);
  const thead = /<thead>[\s\S]*?<\/thead>/.exec(html);
  const heads = thead === null ? [] : [...thead[0].matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1].trim());
  const bad = [...BAD_TOKENS, ...MENU_TOKENS].filter((t) => body.includes(t));
  const c3bad = EN_KEY_RE.test(body) ? bad.concat('【calorie · calorie.*（英文命令键标题）】') : bad;
  const tbody = /<tbody>([\s\S]*?)<\/tbody>/.exec(html);
  const moveCells = tbody === null ? [] : [...tbody[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((r) => (/<td[^>]*>([\s\S]*?)<\/td>/.exec(r[1]) ?? [, ''])[1]);
  /** 场次卡头行的可见文本（v5 的日级标题就住这里；各段在源里以换行分隔，`visibleText` 读得出）。 */
  const cardHeads = [...html.matchAll(CARD_HEAD_RE)].map((m) => visibleText(m[1]));
  const restTitles = [...html.matchAll(REST_TITLE_RE)].map((m) => visibleText(m[1]));
  const weekHeads = [...html.matchAll(WEEK_HEAD_RE)].map((m) => visibleText(m[1]));
  /** 过程页仍走 `<details>/<summary>`（本单没动它们），旧口径的提取留着备用。 */
  const summaryTitles = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)]
    .map((m) => visibleText(m[1]));
  const dayTitles = [...cardHeads, ...restTitles].filter((t) => /^周[一二三四五六日]/.test(t));
  /** 正文口径：属性里的载荷（`data-t` ＝复制按钮要复制的那段文本）不算正文，⑦ 与 ⑪ 只判真正文。 */
  const bodyNoPayload = body.replace(/data-t="[^"]*"/g, 'data-t=""');
  const tempoTitles = dayTitles.filter((t) => tempoOfTitle(t) !== '');
  const scriptOpen = count(html, '<script');
  const scriptBody = (/<script>([\s\S]*?)<\/script>/.exec(html) ?? [, ''])[1];
  return {
    name,
    bytes: html.length,
    body,
    bodyNoPayload,
    c1: html.toLowerCase().includes('<!doctype html'),
    c2data: exactId(html, 'ilife-copy-data'),
    c2log: exactId(html, 'ilife-copy-log'),
    c3bad,
    c4heads: heads,
    hasPromptSeg: body.includes('执行唤醒词「'),
    logActionIds: count(html, 'data-action-id="ilife-copy-log"'),
    logDisabled: count(html, 'data-action-id="ilife-copy-log" disabled'),
    copyDataTitle: (/<button[^>]*id="ilife-copy-data"[^>]*data-t="([^"]*)"/.exec(html) ?? [, ''])[1].split('\n')[0],
    // 第一张表（本页若有动作明细表，它必是第一张）的「动作」格：逐行取首格内 HTML，再抠加粗名与副行。
    moveCells,
    subLines: moveCells.map((c) => (SUB_RE.exec(c) ?? [, ''])[1]),
    boldMissing: moveCells.filter((c) => !STRONG_RE.test(c)).length,
    bareType: BARE_TYPE_RE.test(bodyNoPayload) ? (BARE_TYPE_RE.exec(bodyNoPayload) ?? [, ''])[1] : null,
    bareTypeInPayload: BARE_TYPE_RE.test(body) ? (BARE_TYPE_RE.exec(body) ?? [, ''])[1] : null,
    droppedHit: DROPPED_TOKENS.filter((t) => bodyNoPayload.includes(t)),
    cardHeads,
    dayTitles,
    weekHeads,
    summaryTitles,
    tempoTitles,
    tempoTexts: tempoTitles.map((t) => tempoOfTitle(t)),
    weekTitlesWithTempo: [...weekHeads, ...summaryTitles]
      .filter((t) => /^第 \d+ 周/.test(t) && t.includes('节奏')),
    restTitlesWithTempo: restTitles.filter((t) => t.includes('节奏')),
    // ⑩ 零 JS：脚本块数／块体指纹（各份应逐字同长同头）／内联事件与伪协议计数。
    // 内联事件与 `javascript:` 只判正文（`body` 已剔 `<script>`：共享 helpers 自己的字符串里可能带
    // `onclick` 这类字面，那不算页面注入面）。
    scriptOpen,
    scriptSig: scriptBody.length + ':' + scriptBody.slice(0, 24),
    handlerHits: (HANDLER_RE.test(body) ? 1 : 0) + count(body, 'javascript:'),
    // ⑪ 用词：正文（剔载荷）四类记号计数。
    wordHits: ['会话', 'calorie.'].filter((w) => bodyNoPayload.includes(w))
      .concat(BARE_TYPE_RE.test(bodyNoPayload) ? ['main/iso'] : []),
    // ⑫ 页签手法：标记与规则两半都要在。
    //    v6：两级页签里的「全部周次」「全部」两枚已按负责人裁定去掉，规则半边改用「先全收」那条
    //    `.ilw-wkr:checked`（恒在），不再拿已不存在的 `#ilw-wk-all:checked` 当判据。
    tabMarks: ['ilw-tabs', 'ilw-day-tabs', '.ilw-wkr:checked', 'type="radio"']
      .filter((t) => html.includes(t)),
    // v6 四条改动的读数（负责人的四条反馈）。
    v6: {
      // ① 副标题：去掉「版本 …」与「共 N 周」（后者与指标卡「总周数」重复）。
      subtitleNoVersion: !/版本\s/.test(bodyNoPayload),
      subtitleNoTotalWeeks: !/共\s*\d+\s*周/.test(bodyNoPayload),
      // ② ③ 两级页签不含「全部」两枚。
      noAllWeekTab: !html.includes('全部周次') && !html.includes('ilw-wk-all'),
      noAllDayTab: !html.includes('ilw-dy-') || !/ilw-dy-\d+-all/.test(html),
      // ⑯ 每层恰好一枚默认选中（选钮式不选中即整层不可见）。
      radios: count(html, 'type="radio"'),
      checkedCount: count(html, ' checked'),
      // ④ 列对齐的静态代理：右对齐列的表头与表体携带同一个 cell-right 类。
      thRightClass: count(html, 'ilife-block-data-table-cell-right'),
      thAlignLeftOverride: html.includes('.ilw-session th') && /\.ilw-session th\{[^}]*text-align:left/.test(html),
    },
    badgeCount: count(html, 'class="ilw-pb '),
  };
}

/** 机检④：每份产物**预先声明**该出哪种表头（`four`／`own1`／`none`），不靠“数据没出现”自动绿。
 *  - `four`：逐字按序四列 `动作／部位／组数×次数／重量`，且**必须真的量到表头**——页内零表即红
 *    （旧口径 `other` 在页内零表时也判绿，那一格是后门，本次堵掉）；
 *  - `own1`：本页该有**自己那张表**（不是动作明细表：185 的四列对照表／过程页改前改后表／回执页三张表／
 *    复盘页统计表），同样**页内零表即红**，且不得出现 `组数×次数` 列（防动作表长到不该长的页上）；
 *  - `none`：本页不该有任何表（空周无安排／预检确认页无明细表）。
 *  另有兜底 `other`（本页有别的表或本就无表都判绿）——那条正是旧后门，本轮由 ④ 另断「不许有产物落在 other」。 */
function tableVerdict(s) {
  const heads = s.inspect.c4heads;
  const hasSetsCol = heads.includes('组数×次数');
  if (s.expectTable === 'four') {
    if (heads.length === 0) return { ok: false, reading: '声明本页有动作明细表，实测页内零表头（无表）' };
    return JSON.stringify(heads) === JSON.stringify(FOUR)
      ? { ok: true, reading: '四列逐字按序（行 ' + s.inspect.moveCells.length + '）' }
      : { ok: false, reading: '应出四列，实测 ' + heads.join('／') };
  }
  if (s.expectTable === 'own1') {
    if (heads.length === 0) return { ok: false, reading: '声明本页有自己的表，实测页内零表头（无表）' };
    return hasSetsCol ? { ok: false, reading: '本页不该出动作明细表，实测有「组数×次数」列' }
      : { ok: true, reading: '自有表（按序 ' + heads.length + ' 列，无「组数×次数」）' };
  }
  if (s.expectTable === 'none') {
    return heads.length === 0 ? { ok: true, reading: '本页无表（符合声明）' }
      : { ok: false, reading: '声明本页无表，实测 ' + heads.join('／') };
  }
  return hasSetsCol ? { ok: false, reading: '本页不该出动作表，实测有「组数×次数」列' }
    : { ok: true, reading: '非动作表页（按序 ' + heads.length + ' 列，无「组数×次数」）' };
}

/* ── 清单（命令与参数逐条照 routes.ts） ───────────────────────── */

const READ = [
  [176, '看本周计划', { weekOffset: 0, today: '2026-09-07' }],
  [177, '看下周计划', { weekOffset: 1, today: '2026-09-07' }],
  [178, '看上周计划', { weekOffset: -1, today: '2026-09-07' }],
  [179, '看指定周计划', { week: 1 }],
  [180, '看今天练什么', { date: '今日', today: '2026-09-07' }],
  [181, '看某动作安排', { movement: '硬拉' }],
  [182, '看某天练什么', { date: '2026-09-09' }],
  [183, '看计划概览', {}],
  [184, '看完整计划', {}],
  [185, '看计划 vs 实际', { window: 'custom', start: '2026-09-07', end: '2026-09-09' }],
].map(([order, wake, params]) => ({
  order, wake, params,
  key: order === 185 ? 'calorie.view.plan-vs-actual' : 'calorie.view.plan',
  kind: '结果',
  // 声明本页该出哪种表：周内有场次 → 四列动作表；178 落在第 0 周（空周）→ 无表；185 有自己的四列对照表。
  expectTable: order === 178 ? 'none' : order === 185 ? 'own1' : 'four',
}));

const WIZARD_PLAN = {
  config: { title: '减脂4周', start_date: '2026-09-07', user_level: '中手', available_equipment: ['瑜伽垫'] },
  weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: '上肢', movements: [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }] }] }] }],
};

const PROCESS = [
  [186, '定训练计划', 'calorie.view.plan-wizard', { plan: WIZARD_PLAN }],
  [187, '复制训练计划', 'calorie.view.plan-write-preview', { op: 'copy' }],
  [188, '定休息日', 'calorie.view.plan-write-preview', { op: 'set-rest', week: 1, dayOfWeek: 3 }],
  [189, '加训练动作', 'calorie.view.plan-write-preview', { op: 'add-movement', week: 1, dayOfWeek: 1, movement: { name: '硬拉' } }],
  [190, '定一周计划', 'calorie.view.plan-write-preview', { op: 'set-week', week: 1 }],
  [191, '改训练计划', 'calorie.view.plan-write-preview', { op: 'update', title: '示例改名' }],
  [192, '改某天训练', 'calorie.view.plan-write-preview', { op: 'update-day', week: 1, dayOfWeek: 3, newLabel: '下肢＋核心' }],
  [193, '删某天训练', 'calorie.view.plan-write-preview', { op: 'delete-day', week: 1, dayOfWeek: 3 }],
  [194, '改动作', 'calorie.view.plan-write-preview', { op: 'update-movement', oldMovement: '硬拉', newMovement: { name: '杠铃划船' } }],
  [195, '撤销训练计划', 'calorie.view.plan-write-preview', { op: 'delete' }],
].map(([order, wake, key, params]) => ({
  order, wake, key, params, kind: '过程',
  // 预检确认页只有指标卡与并列清单、无明细表；写前预览两段快照是「序号／改前快照」两列表（自有表）。
  expectTable: order === 186 ? 'none' : 'own1',
}));

/** 186–195 十条会改数据库的命令 → 写后回执整页（每条独立库，免互相污染）。 */
const RECEIPT = [
  [186, '定训练计划', 'calorie.workout.plan-set',
    { plan: { config: { title: '示例计划', start_date: '2026-09-07', user_level: '中手', available_equipment: ['瑜伽垫'] }, weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: '上肢', movements: [{ name: '俯卧撑' }] }] }] }] } }],
  [187, '复制训练计划', 'calorie.workout.plan-copy', { newTitle: '示例副本' }],
  [188, '定休息日', 'calorie.workout.plan-set-rest', { week: 1, dayOfWeek: 3 }],
  [189, '加训练动作', 'calorie.workout.plan-add-movement', { week: 1, dayOfWeek: 1, movement: { name: '深蹲' } }],
  [190, '定一周计划', 'calorie.workout.plan-set-week', { week: 2, days: [{ dayOfWeek: 2, sessionLabel: '背', movements: [{ name: '硬拉' }] }] }],
  [191, '改训练计划', 'calorie.workout.plan-update', { title: '示例改名' }],
  [192, '改某天训练', 'calorie.workout.plan-update-day', { week: 1, dayOfWeek: 3, newLabel: '下肢＋核心' }],
  [193, '删某天训练', 'calorie.workout.plan-delete-day', { week: 1, dayOfWeek: 3 }],
  [194, '改动作', 'calorie.workout.plan-update-movement', { oldMovement: '俯卧撑', newMovement: { name: '钻石俯卧撑' } }],
  [195, '撤销训练计划', 'calorie.workout.plan-delete', { confirm: true }],
].map(([order, wake, key, params]) => ({ order, wake, key, params, kind: '回执', expectTable: 'own1' }));

const REVIEW = [
  [201, '计划复盘（本周）', { window: '本周' }],
  [202, '计划复盘（本月）', { window: '本月' }],
  [203, '计划复盘（全部）', { window: 'custom', start: '2026-09-07', end: '2026-09-20' }],
  [204, '看计划完成率', { window: '7d' }],
  [205, '看未完成训练', { window: '7d' }],
  [206, '看动作完成率', { window: '7d' }],
  [207, '扫禁忌', {}],
].map(([order, wake, params]) => ({
  order, wake, params, key: order === 207 ? 'calorie.view.contraindication' : 'calorie.view.exercise-review',
  // 复盘／扫禁忌页各有自己的统计表（不是动作明细表）：有表必须量到，零表即红。
  kind: '结果', expectTable: 'own1',
}));

/** 196–200 外部五条：`routes.ts` 记 `kind:'non-exec'`、`bucket:'out-of-scope'`，本票不承接、不造产物。 */
const NON_EXEC = [
  [196, '落地训练'], [197, '落地到本周末'], [198, '落地到本月底'], [199, '同步到训记'], [200, '拉训记实绩'],
];

/** 过程页该有的逐字 prompt（唤醒词 ＋ 该词 prompt 里独有的一句；原文取自
 *  `triggers/scene-05-workout.ts` 的 `prompt_template`，逐字比对，不改写）。 */
const PROMPT_SIG = new Map([
  [186, ['定训练计划', '我想制定一份新的健身计划,根据我的目标和训练情况来安排']],
  [187, ['复制训练计划', '我想把现有训练计划复制一份作为模板']],
  [188, ['定休息日', '我想把某一天的训练标记为休息日(或取消休息)']],
  [189, ['加训练动作', '我想给计划里的某一天或某个训练时段加训练动作']],
  [190, ['定一周计划', '我想快速设置某一周的训练安排']],
  [191, ['改训练计划', '我想改训练计划的某个字段']],
  [192, ['改某天训练', '我想改某一天的训练安排(时段、动作、组数等)']],
  [193, ['删某天训练', '我想删掉某一天的训练安排']],
  [194, ['改动作', '我想把计划里的某个动作换成另一个动作']],
  [195, ['撤销训练计划', '我想删除整个训练计划(所有周次和配置)']],
]);

/* ── 跑 ──────────────────────────────────────────────────────── */

assertSafeToRemove(DBS);
rmSync(DBS, { recursive: true, force: true });
mkdirSync(DBS, { recursive: true });
const readDir = join(DBS, 'read-shared');
seedPlanDb(readDir);

const steps = [];
const artifacts = [];

function runOne(rec, dir, card) {
  const file = 'order' + String(rec.order).padStart(3, '0') + '-' + card + '.html';
  const path = join(OUT, file);
  const r = cli(dir, rec.key, rec.params, path);
  const s = { order: rec.order, wake: rec.wake, kind: rec.kind, command: rec.key, params: rec.params, card,
    file, exit: r.exit, stderr: r.stderr, note: '', expectTable: rec.expectTable };
  if (r.exit !== 0) { s.note = 'exit=' + r.exit + ' stderr=' + r.stderr; steps.push(s); return; }
  if (!existsSync(path)) { s.note = '未落盘 ' + path; steps.push(s); return; }
  s.output = path;
  s.inspect = inspect(file, readFileSync(path, 'utf8'));
  s.table = tableVerdict(s);
  artifacts.push({ file, inspect: s.inspect, expectTable: s.expectTable, table: s.table, copyDataTitle: s.inspect.copyDataTitle });
  steps.push(s);
}

for (const rec of READ) runOne(rec, readDir, 'result');
for (const rec of PROCESS) runOne(rec, readDir, 'process');
for (const rec of RECEIPT) {
  const dir = join(DBS, 'receipt-' + String(rec.order));
  seedReceiptDb(dir);
  runOne(rec, dir, 'receipt');
  // 195：撤销后读必须恢复缺失阻断（exit 4 ＋ stderr 命中「无训练计划」），不再产空态验证页。
  if (rec.key === 'calorie.workout.plan-delete') {
    const v = cli(dir, 'calorie.view.plan', {});
    const s = { order: 195, wake: '撤销训练计划', kind: '撤销后读验证', command: 'calorie.view.plan', params: {},
      card: 'read-after-delete', exit: v.exit, stderr: v.stderr, note: '', expectExit4: v.exit === 4,
      stderrHit: /无训练计划/.test(v.stderr || '') };
    const stale = join(OUT, 'order195-verify.html');
    if (existsSync(stale)) rmSync(stale, { force: true });
    steps.push(s);
  }
}
for (const rec of REVIEW) runOne(rec, readDir, 'result');

for (const [order, wake] of NON_EXEC) {
  steps.push({ order, wake, kind: '外部', command: null, params: null, card: '-', file: null, exit: null,
    stderr: '', note: 'routes.ts 记 non-exec／out-of-scope，本票不承接，无产物' });
}

/* ── 判据 ────────────────────────────────────────────────────── */

const checks = [];
function check(name, ok, reading) {
  checks.push({ name, ok, reading });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ' ＝ ' + reading);
}

const readSteps = steps.filter((s) => ['结果', '过程', '回执'].includes(s.kind));
for (const s of readSteps) {
  if (s.inspect === undefined) {
    console.log('FAIL 机检 ' + s.file + ' ＝ 无产物（' + s.note + '）');
    continue;
  }
  const i = s.inspect;
  const ok = i.c1 && i.c2data === 1 && i.c2log === 1 && i.c3bad.length === 0 && s.table.ok;
  console.log((ok ? 'PASS ' : 'FAIL ') + '机检 ' + i.name
    + ' ①doctype=' + i.c1
    + ' ②data=' + i.c2data + '/log=' + i.c2log
    + ' ③禁词=' + (i.c3bad.length === 0 ? '无' : i.c3bad.join('｜'))
    + ' ④声明=' + s.expectTable + '→' + s.table.reading
    + ' ⑤日志钮=' + i.logActionIds + (i.logDisabled ? '（含禁用 ' + i.logDisabled + '）' : '')
    + ' 复制数据标题=' + i.copyDataTitle);
}

const missing = readSteps.filter((s) => s.inspect === undefined);
check('37 份产物全部落盘（176–185 结果 10 ＋ 186 预检 1 ＋ 187–195 过程 9 ＋ 186–195 回执 10 ＋ 201–207 结果 7）',
  missing.length === 0 && readSteps.length === 37, '份数=' + readSteps.length + ' 缺=' + missing.length);

const bad1 = artifacts.filter((a) => !a.inspect.c1);
const bad2 = artifacts.filter((a) => a.inspect.c2data !== 1 || a.inspect.c2log !== 1);
const bad3 = artifacts.filter((a) => a.inspect.c3bad.length > 0);
const bad4 = artifacts.filter((a) => !a.table.ok);
check('机检① 每份有 <!doctype html>', bad1.length === 0, '红=' + bad1.map((a) => a.file).join('／') || '0');
check('机检② 真 id="ilife-copy-data"／id="ilife-copy-log" 各恰好一次（排除 `data-action-id=` 里的子串）',
  bad2.length === 0, '红=' + bad2.map((a) => a.file + '(' + a.inspect.c2data + '/' + a.inspect.c2log + ')').join('／') || '0');
check('机检③ 正文无 op=／# 成功／三格式菜单文本／英文命令键标题（`【calorie · calorie.`）',
  bad3.length === 0, '红=' + bad3.map((a) => a.file + '[' + a.inspect.c3bad.join('｜') + ']').join('／') || '0');
/** 兜底 `other` 那条正是旧后门：本轮每份产物都必须落到 four／own1／none，落 other 即红。 */
const otherDecl = artifacts.filter((a) => a.expectTable === 'other');
check('机检④ 表头按逐份声明对照（four 逐字四列且必须量到表头／own1 自有表也须量到且无「组数×次数」列／none 无表），且无一份落在兜底 other',
  bad4.length === 0 && otherDecl.length === 0,
  '红=' + (bad4.map((a) => a.file + '（' + a.table.reading + '）').join('／') || '0')
    + ' 兜底other=' + (otherDecl.map((a) => a.file).join('／') || '0'));

/* 机检⑥／⑦／⑧：本轮四列行内版式新增的三条（副行小字／类型中文单语／节奏上移会话标题行）。
 * 只有**声明出动作明细表**的那几份（`expectTable==='four'`）才判⑥⑧——别的页（185 自有对照表、
 * 过程／回执页、复盘页）首页表的首格不是动作格，拿它们去判「加粗名＋副行」是误判。 */
const withTable = artifacts.filter((a) => a.expectTable === 'four');
const badSub = withTable.filter((a) => a.inspect.boldMissing > 0
  || a.inspect.subLines.some((t) => t === '')
  || !a.inspect.subLines.some((t) => SUB_TAIL_RE.test(t)));
const PROD_SUB = '<span class="ilw-sub-detail">背 主</span><span class="ilw-sub-type">孤立</span>';
check('机检⑥ 动作格＝加粗名＋块级副行小字（两颗标签：细化词＋类型），副行逐格齐且以「主要／孤立」收尾'
  + '（只判有动作表的 ' + withTable.length + ' 份）；细化词里混类型裸词的生产形状须读作「背 主／孤立」',
  withTable.length > 0 && badSub.length === 0 && withTable.some((a) => a.inspect.subLines.includes(PROD_SUB)),
  '红=' + (badSub.map((a) => a.file + '(缺加粗格=' + a.inspect.boldMissing + '／副行=' + JSON.stringify(a.inspect.subLines.slice(0, 3)) + ')').join('／') || '0')
    + ' 生产形状命中=' + withTable.some((a) => a.inspect.subLines.includes(PROD_SUB))
    + ' 副行样例=' + JSON.stringify([...new Set(withTable.flatMap((a) => a.inspect.subLines))].slice(0, 6)));
const badBare = artifacts.filter((a) => a.inspect.bareType !== null);
const bareInPayload = artifacts.filter((a) => a.inspect.bareTypeInPayload !== null).map((a) => a.file);
check('机检⑦ 正文不出现 `main`／`iso` 裸词（类型只以中文出现在副行里；`data-t` 载荷不算正文）',
  badBare.length === 0, '红=' + badBare.map((a) => a.file + '(裸词=' + a.inspect.bareType + ')').join('／') || '0'
  + ' 仅载荷命中=' + (bareInPayload.join('／') || '0'));
/* 夹具真值（逐场）：第 1 周上肢／第 1 周下肢／第 2 周背 三场带节奏，第 2 周腿（备注空）不带；休息日无表无节奏。
 * 逐页期望条数＝该页覆盖的场次里带节奏的那几场——「下移丢了」会少、乱印会多，两面都判。 */
const FIX_TEMPO = ['20-30 RPM(2-2.5秒/次)', '18-25 RPM(2.5-3秒/次)', '15-20 RPM(3-4秒/次)'];
const EXPECT_TEMPO = new Map([
  ['order176-result.html', 2], ['order177-result.html', 1], ['order179-result.html', 2],
  ['order180-result.html', 1], ['order181-result.html', 1], ['order182-result.html', 1],
  ['order183-result.html', 3], ['order184-result.html', 3],
]);
const tempoOfFile = (f) => (artifacts.find((a) => a.file === f)?.inspect.tempoTexts) ?? [];
const t184 = tempoOfFile('order184-result.html');
const countBad = [...EXPECT_TEMPO.entries()].filter(([f, n]) => tempoOfFile(f).length !== n);
const unknownTempo = [...new Set(withTable.flatMap((a) => a.inspect.tempoTexts))].filter((t) => !FIX_TEMPO.includes(t));
const weekTempo = artifacts.filter((a) => a.inspect.weekTitlesWithTempo.length > 0).map((a) => a.file);
const badRestTempo = artifacts.filter((a) => a.inspect.restTitlesWithTempo.length > 0);
check('机检⑧ 节奏上场次卡头行（两面）：逐页日级标题（场次卡头行）带节奏的条数＝夹具真值（177／181 各 1 场带、184 恰三条且逐字等于夹具原文），'
  + '且休息日标题一律不带、周级标题不带、页面上的节奏原文只许是夹具那三种',
  JSON.stringify(t184) === JSON.stringify(FIX_TEMPO) && countBad.length === 0
    && badRestTempo.length === 0 && weekTempo.length === 0 && unknownTempo.length === 0,
  '184节奏=' + JSON.stringify(t184)
    + ' 逐页条数不符=' + (countBad.map(([f, n]) => f + '(期望' + n + '实测' + tempoOfFile(f).length + ')').join('／') || '0')
    + ' 休息日带节奏=' + (badRestTempo.map((a) => a.file).join('／') || '0')
    + ' 周级带节奏=' + (weekTempo.join('／') || '0')
    + ' 未知节奏=' + (unknownTempo.join('／') || '0'));

/* ⑨ 两条无损删减的旁证：方括号内逗号前那截（`W<n> <组数>reps×<重量>kg`）整体丢掉，正文里不该再有它的记号。 */
const dropHit = artifacts.filter((a) => a.inspect.droppedHit.length > 0);
check('机检⑨ 两条删减确实丢掉：正文不出现「reps×」与「W<n> 」这类只在方括号内逗号前那截才有的记号',
  dropHit.length === 0,
  '红=' + (dropHit.map((a) => a.file + '[' + a.inspect.droppedHit.join('｜') + ']').join('／') || '0'));

/* 复制日志按钮：每份恰好一颗、且不出现禁用态（#336 自动补的那颗）。
 * 「一排三颗」表达不出来，故过程页是两行：prompt 行的「复制指令」走日志位不触发 #336 ⇒ 不补灰按钮。 */
const badLog = artifacts.filter((a) => a.inspect.logActionIds !== 1 || a.inspect.logDisabled !== 0);
check('机检⑤ 每份 `data-action-id="ilife-copy-log"` 恰好一颗，且无 `… disabled` 禁用态',
  badLog.length === 0,
  '红=' + badLog.map((a) => a.file + '(颗=' + a.inspect.logActionIds + '/禁用=' + a.inspect.logDisabled + ')').join('／') || '0');
const processTitles = artifacts.filter((a) => /-process\.html$/.test(a.file)).map((a) => a.copyDataTitle);
check('过程页 10 份复制数据标题全中文（写前预览／构建向导），无英文命令键',
  processTitles.length === 10
    && processTitles.every((t) => (t.includes('写前预览') || t.includes('构建向导')) && !EN_KEY_RE.test(t)),
  '标题=' + [...new Set(processTitles)].join('／'));

/* 过程页逐字 prompt（预检确认页「复制 prompt 回给 AI」那一环） */
const processSteps = readSteps.filter((s) => s.card === 'process');
const promptBad = [];
for (const s of processSteps) {
  const sig = PROMPT_SIG.get(s.order);
  if (s.inspect === undefined || sig === undefined) { promptBad.push(s.file + '(无产物)'); continue; }
  const body = s.inspect.body;
  const okWord = body.includes('执行唤醒词「' + sig[0] + '」');
  const okSig = body.includes(sig[1]);
  console.log((okWord && okSig ? 'PASS ' : 'FAIL ') + '过程页 prompt ' + s.file + ' 唤醒词命中=' + okWord
    + ' 独有句命中=' + okSig + ' 词=「' + sig[0] + '」');
  if (!okWord || !okSig) promptBad.push(s.file + '（词=' + okWord + '／独有句=' + okSig + '）');
}
check('过程页 10 份各含本写词的逐字 prompt（`执行唤醒词「<词>」`＋该词独有句）',
  promptBad.length === 0 && processSteps.length === 10, '红=' + (promptBad.join('／') || '0'));

const nonProcess = readSteps.filter((s) => s.card !== 'process' && s.inspect !== undefined);
const promptLeak = nonProcess.filter((s) => s.inspect.hasPromptSeg).map((s) => s.file);
check('结果页 17 份 ＋ 回执页 10 份不含「复制 prompt」那一段（只有预检确认页该有）',
  promptLeak.length === 0, '泄漏=' + (promptLeak.join('／') || '0'));

/* 夹具三条边界＋页头字段：全部对着 order184（看完整计划）与 176–185 十份 */
const h184 = artifacts.find((a) => a.file === 'order184-result.html');
const raw184 = h184 ? readFileSync(join(OUT, 'order184-result.html'), 'utf8') : '';
const rawAll = artifacts.filter((a) => /^order1[7-8]\d-result/.test(a.file))
  .map((a) => readFileSync(join(OUT, a.file), 'utf8'));
/** 休息日标题的 T351-v9 形状：星期 chip ＋「休息日」两件（不再用 `·` 串成一行）。 */
const REST_FORM_RE = new RegExp('<h3 class="ilw-rest-title"><span class="ilw-sess-tag">周二</span>'
  + '<span class="ilw-rest-txt">休息日</span></h3>');
check('夹具① 休息日标题不重复：order184 的休息日标题＝星期 chip ＋「休息日」两件（不再用 `·` 串），'
  + '且十份均无「休息日（休息日）」',
  REST_FORM_RE.test(raw184) && rawAll.every((h) => !h.includes('休息日（休息日）')),
  '命中=' + REST_FORM_RE.test(raw184) + ' 重复份数=' + rawAll.filter((h) => h.includes('休息日（休息日）')).length);
check('夹具② 多组不同次数紧凑写法：3组×10／8次 ＋ 35／40kg',
  raw184.includes('3组×10／8次') && raw184.includes('35／40kg'),
  '3组×10／8次=' + raw184.includes('3组×10／8次') + ' 35／40kg=' + raw184.includes('35／40kg'));
check('夹具③ 空 sets 出「—」占位',
  /哑铃飞鸟[\s\S]{0,260}?<td[^>]*>—<\/td><td[^>]*>—<\/td>/.test(raw184),
  '哑铃飞鸟行双短横线=' + /哑铃飞鸟[\s\S]{0,260}?<td[^>]*>—<\/td><td[^>]*>—<\/td>/.test(raw184));
/** T351-v9：计划说明不再与计划名、起日串成一行 `·`，改住页头下的计划信息条——说明原文里的 `·`
 *  拆成一颗颗胶囊（老技能当年就写成 `科学定制·6天/周·270组`）。判据改成「逐段都在页上」。 */
const CFG_DESC_PARTS = CFG_DESC.split('·');
check('页头信息条含计划说明（config.description 按 `·` 拆成胶囊，逐段上页）',
  CFG_DESC_PARTS.every((t) => raw184.includes('>' + t + '<')),
  CFG_DESC_PARTS.map((t) => t + '=' + raw184.includes('>' + t + '<')).join(' '));
const txt184 = raw184.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
check('指标卡 总周数＝4（配置 totalWeeks）＋副行「其中 2 周有安排」',
  txt184.includes('总周数 4 周 其中 2 周有安排'),
  '读数=' + (/总周数 [\s\S]{0,40}?其中 \d+ 周有安排/.exec(txt184) ?? ['未命中'])[0]);

/* 撤销后读验证：缺失阻断恢复 */
const v195 = steps.find((s) => s.kind === '撤销后读验证');
check('195 撤销后读恢复缺失阻断：exit=4 ＋ stderr 命中「无训练计划」',
  v195 !== undefined && v195.expectExit4 === true && v195.stderrHit === true,
  'exit=' + (v195 ? v195.exit : 'n/a') + ' stderr命中=' + (v195 ? v195.stderrHit : 'n/a'));
const r195 = steps.find((s) => s.kind === '回执' && s.order === 195);
const raw195 = r195?.output ? readFileSync(r195.output, 'utf8') : '';
check('195 撤销状态不丢：回执页「写后现值」写「计划已撤销（配置与训练安排均为空）」',
  raw195.includes('计划已撤销（配置与训练安排均为空）'), '命中=' + raw195.includes('计划已撤销（配置与训练安排均为空）'));

/* 外部五条：如实记录，不硬造产物 */
check('196–200 外部五条如实记 non-exec（无产物）',
  steps.filter((s) => s.kind === '外部').length === 5 && steps.filter((s) => s.kind === '外部').every((s) => s.file === null),
  '条数=' + steps.filter((s) => s.kind === '外部').length);

/* ── v5 新增三条（零 JS／用词／页签手法） ─────────────────────────────── */

/** v5 新增三条（零 JS／用词／页签手法）＋ 本单写集口径。 */
const SCOPE_RE = /^order18[0-5]-result\.html$|^order17[6-9]-result\.html$/;
const inScopeAll = artifacts.filter((a) => SCOPE_RE.test(a.file));

/** ⑩ 零 JS：**全量 37 份（T351-v7 起）**每份恰一块 `<script>`（`fillTemplate` 注入的共享 helpers），
 *  且逐字同长同头；正文无内联事件处理器与 `javascript:`。
 *  v6 时只判写集 176–185，写集外 201–207 自带两块（共享 helpers ＋ 图表 helpers）；v7 撤掉了 201–206
 *  那张「计划 1 场 vs 已完成 1 场」的柱图（它吃的是老技能 `__meta__.volume`，本仓取数层没有对应字段），
 *  图表 helpers 随之不再注入 —— 全量就此统一为「每份恰一块共享 helpers」，判据范围也一并放宽到全量。 */
const badScript = inScopeAll.filter((a) => a.inspect.scriptOpen !== 1 || a.inspect.handlerHits > 0);
const sigs = [...new Set(inScopeAll.map((a) => a.inspect.scriptSig))];
const allSig = artifacts.map((a) => a.inspect.scriptOpen);
const allSigs = [...new Set(artifacts.map((a) => a.inspect.scriptSig))];
const badScriptAll = artifacts.filter((a) => a.inspect.scriptOpen !== 1 || a.inspect.handlerHits > 0);
check('机检⑩ 零 JS 自证（全量 ' + artifacts.length + ' 份）：每份 `<script` 恰 1 块且全量逐字同长同头'
  + '（同一份共享 helpers，除它为零），正文无内联事件处理器、无 `javascript:` 伪协议',
  inScopeAll.length === 10 && badScript.length === 0 && sigs.length === 1
    && badScriptAll.length === 0 && allSigs.length === 1,
  '红=' + (badScriptAll.map((a) => a.file + '(块=' + a.inspect.scriptOpen + '/内联=' + a.inspect.handlerHits + ')').join('／') || '0')
    + ' 全量脚本块指纹数=' + allSigs.length + ' 指纹=' + allSigs[0]
    + ' 全量块数分布=' + JSON.stringify([...new Set(allSig)].sort()) + '（全部 37 份＝helpers 一块）');

/** ⑪ 用词：正文（剔 `data-t` 载荷）四类记号全零。只判本单写集（176–185 十份结果页）——
 *  186–207 属别单（本单没动它们的文案），不对它们下判据。 */
const badWord = inScopeAll.filter((a) => a.inspect.wordHits.length > 0);
check('机检⑪ 用词自证（176–185 十份）：正文不出现「会话」／`main`／`iso`／`calorie.`（`data-t` 载荷不算正文）',
  inScopeAll.length === 10 && badWord.length === 0,
  '判份数=' + inScopeAll.length
    + ' 红=' + (badWord.map((a) => a.file + '[' + a.inspect.wordHits.join('｜') + ']').join('／') || '0'));

/** ⑫ 页签手法：凡页内确有动作表的那 8 份，必须同时命中「标记」（ilw-tabs／ilw-day-tabs）与
 *  「规则」（v6 起为「先全收」那条 `.ilw-wkr:checked`；「全部周次」那枚已按负责人裁定去掉，
 *  不再拿 `#ilw-wk-all:checked` 当判据）以及选钮本身（`type="radio"`）——两半都在，才敢说页签不靠脚本。 */
const FOURFILES = artifacts.filter((a) => a.expectTable === 'four');
const badTabs = FOURFILES.filter((a) => a.inspect.tabMarks.length !== 4);
check('机检⑫ 两级页签是零脚本手法：有动作表的 ' + FOURFILES.length + ' 份同时命中 `ilw-tabs`／`ilw-day-tabs`／'
  + '`.ilw-wkr:checked`／`type="radio"` 四条（标记＋规则两半都在）',
  FOURFILES.length === 8 && badTabs.length === 0,
  '红=' + (badTabs.map((a) => a.file + '[' + a.inspect.tabMarks.join('｜') + ']').join('／') || '0')
    + ' 徽章数=' + FOURFILES.map((a) => a.inspect.badgeCount).join('／'));

/* ── v6 四条（负责人的四条反馈） ─────────────────────────────── */

/** ⑬ 副标题砍冗余：不含「版本 …」与「共 N 周」（后者与指标卡「总周数」重复）。 */
const badSubV6 = inScopeAll.filter((a) => !a.inspect.v6.subtitleNoVersion || !a.inspect.v6.subtitleNoTotalWeeks);
check('机检⑬ 副标题不含「版本 …」与「共 N 周」（负责人裁定砍掉的冗余两项）',
  inScopeAll.length === 10 && badSubV6.length === 0,
  '判份数=' + inScopeAll.length + ' 红=' + (badSubV6.map((a) => a.file).join('／') || '0'));

/** ⑭ 两级页签不含「全部」两枚：周页签只有 `第 N 周`、日页签只有 `周一…周日`。 */
const badAll = inScopeAll.filter((a) => !a.inspect.v6.noAllWeekTab || !a.inspect.v6.noAllDayTab);
check('机检⑭ 两级页签不含「全部周次」「全部」两枚（负责人裁定去掉）',
  badAll.length === 0,
  '红=' + (badAll.map((a) => a.file).join('／') || '0'));

/** ⑮ 每层恰好一枚默认选中：选钮式不选中即整层不可见，故有两层页签的页两层都须钉住。
 *  关系式：总选钮 = 8 × 周数（每周 1 枚周选钮 ＋ 7 枚日选钮）；选中数 = 1（周默认）＋ 周数（每日组一枚）。
 *  只对**确有页签**的份下判据：`order178`（空窗无周区块）与 `order185`（计划vs实际，另一族）
 *  本来就没有页签，钮=0 是正确态；另用一条断言钉住「有动作表的份必须有页签」。 */
const hasTabs = inScopeAll.filter((a) => a.inspect.v6.radios > 0);
const badChecked = hasTabs.filter((a) => {
  const radios = a.inspect.v6.radios;
  const on = a.inspect.v6.checkedCount;
  return radios % 8 !== 0 || on !== radios / 8 + 1;
});
const noTabsButShould = FOURFILES.filter((a) => a.inspect.v6.radios === 0);
check('机检⑮ 两层各钉默认选中：选中数 ≡ 周数＋1、总选钮 ≡ 8×周数（否则那一层内容全不可见）；'
  + '且有动作表的份必须真有页签（无周区块的份钮=0 是正确态）',
  badChecked.length === 0 && noTabsButShould.length === 0,
  '有页签份数=' + hasTabs.length + ' 无页签份数=' + (inScopeAll.length - hasTabs.length)
  + ' 红=' + (badChecked.map((a) => a.file + '[钮=' + a.inspect.v6.radios + ' 选=' + a.inspect.v6.checkedCount + ']').join('／') || '0')
  + (noTabsButShould.length ? ' 该有页签却没有=' + noTabsButShould.map((a) => a.file).join('／') : '')
  + ' 逐份选钮／选中=' + inScopeAll.map((a) => a.file.slice(5, 8) + ':' + a.inspect.v6.radios + '／' + a.inspect.v6.checkedCount).join(' '));

/** ⑯ 列对齐的静态代理：**有动作明细表的 8 份**，右对齐列的表头与表体携带**同一个** `…-cell-right` 类
 *  （对齐同出一处），且页内样式**没有**把 `.ilw-session th` 摁回 `text-align:left`（v5 那句就是错开的根因）。
 *  只对有动作明细表的份下判据：`order185`（计划vs实际）的表是「日期／计划动作／实际完成／缺口」全左对齐、
 *  `order178` 空窗无表，两页本来就不该有右对齐列。 */
const badAlign = FOURFILES.filter((a) => a.inspect.v6.thRightClass < 2 || a.inspect.v6.thAlignLeftOverride);
check('机检⑯ 列对齐（有动作明细表的 ' + FOURFILES.length + ' 份）：右对齐列表头与表体同用 `…-cell-right` 类，'
  + '且页内样式不再把表头摁回左对齐',
  FOURFILES.length === 8 && badAlign.length === 0,
  '红=' + (badAlign.map((a) => a.file).join('／') || '0')
    + ' 逐份 cell-right 命中=' + FOURFILES.map((a) => a.file.slice(5, 8) + ':' + a.inspect.v6.thRightClass).join(' '));

/** ⑰ 用词自证扩到**全量 37 份**（T351-v7 起）：负责人点名「会话」是内部概念、用户看不懂，
 *  这一轮把 186–195（过程／回执）与 201–206（计划复盘）的可见文案一并换成人话，故判据不再只圈
 *  176–185 的写集，而是全量逐份下判——正文（剔 `data-t` 载荷）零「会话」。
 *  与 ⑪ 的分工：⑪ 仍按原口径只判 176–185 四类记号，本条只管「会话」一词，两者的 176–185 读数应一致。 */
const badJargonAll = artifacts.filter((a) => a.inspect.bodyNoPayload.includes('会话'));
check('机检⑰ 用词自证（全量 ' + artifacts.length + ' 份）：正文不出现内部词「会话」（剔 `data-t` 载荷）',
  artifacts.length === 37 && badJargonAll.length === 0,
  '判份数=' + artifacts.length + ' 红=' + (badJargonAll.map((a) => a.file).join('／') || '0'));

writeFileSync(join(OUT, 'detail.json'), JSON.stringify({ steps, checks }, null, 2), 'utf8');

const fails = readSteps.filter((s) => s.exit !== 0 || s.inspect === undefined);
const bad = checks.filter((c) => !c.ok);
const total = readSteps.length + checks.length;
const passed = readSteps.filter((s) => s.exit === 0 && s.inspect !== undefined).length + checks.filter((c) => c.ok).length;
console.log('RESULT: ' + passed + '/' + total + '（产物 ' + readSteps.length + ' ＋ 判据 ' + checks.length + '）');
console.log('PROBE: ' + (bad.length === 0 && fails.length === 0
  ? 'PASS（' + checks.length + '/' + checks.length + ' 判据全绿）'
  : 'RED（FAIL ' + bad.length + '／' + checks.length + '：' + bad.map((c) => c.name).join('、')
    + (fails.length ? '；无产物：' + fails.map((s) => s.file).join('／') : '') + '）'));
if (fails.length > 0 || bad.length > 0) process.exit(1);
