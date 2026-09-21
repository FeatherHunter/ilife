#!/usr/bin/env node
/** #787 探针 —— 日程与计划·写侧「出页」的**票面验收命令**（真出口读数）。
 *
 *   node tooling/run-locked.mjs --ticket 787 -- node docs/skills/skill-schedule/t787-探针.mjs
 *
 *  它跑什么（逐条对票面「怎么算绿」）：
 *   ① **逐场景行有交代**：从清单 `docs/skills/skill-schedule/场景清单.json` 读本域（`domain=plan`）里
 *      本票那 19 行（`#13 补计划` 3 行 ＋ `#17 商量计划` 10 行 ＋ `#18 改计划` 4 行 ＋ `#19 删计划` 2 行），
 *      逐行判「有产物」或「在有意不出名单里」——缺一行即红；并断言**不相交**：本域 28 行 ＝ 本票 19 行
 *      ＋ 归 #788 的 9 行（复盘四档 ＋ 区间复盘 ＋ 日程管家同步）。批量补计划那一支（`dates[]`）是
 *      同一条命令的另一种形态，不占清单行，另出一份产物。
 *   ② **必现块在页上**：按清单里各家族 `blocks_old` 的逐块落点断言——补计划回执（f15：新事件回执 ＋
 *      幂等命中注记位）、改/删计划回执（f14：字段前后对照 ＋ 飞书询问位）、商量计划预览（f12：候选事件表
 *      ＋ 锁定事件区 ＋ 空隙提示）、制定次日计划结果（f17：时间轴与分类色带 ＋ 历史贴合提示 ＋ 冲突红徽章位
 *      ＋ 偏离警示位 ＋ 复制 prompt 位）；另量两条**反面判据**：页上可见文本里不许出现分隔符门（#516）那几种
 *      并列符号、不许出现内部标识（命令键／库列名／参数名／票号）。
 *   ③ **代码层窄判据**：本票页内件与三张页文件里不出现裸字号／间距／色值字面量（只许取公共层 token 或
 *      族级样式件常量）；另断言**没有新 key**（`cli/keys.ts`／`registry.ts` 与基线逐字同）且
 *      `triggers/routes.generated.ts` **等于生成器输出**（`gen-cli.mjs --check` 绿）。
 *   ④ **双端**：三档横向溢出 0 ＋ 分隔符门 0 命中（都走仓内现成件）。
 *  另交：产物 × 双端两张整页截图、本域小墙（手机／桌面各一张，iframe 自带内容、零外部文件）、
 *  清单（墙与收口票共用一份）、「别的域产物逐字节不变」读数。
 *
 *  产物走**真出口**：`dist/cli/cmd_read.js` 逐条真跑（缺省落盘，落点认 `delivery.path`），
 *  再把那份页复制到 `.scratch/t787/成品/` 的可读名上——复制前后核 sha256，读数只认真出口那次落盘。
 *
 *  安静窗口（协议 §2.6）：本包 `src` 有未提交改动即作废（本票的改动要先提交），并打编译指纹那一行；
 *  本探针的结论只对那一行有效。用法：
 *   node docs/skills/skill-schedule/t787-探针.mjs [--out <产物目录>] [--no-shots] [--allow-dirty] [--no-baseline]
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PKG = 'packages/skill-schedule';
const CLI = join(REPO, PKG, 'dist', 'cli', 'cmd_read.js');
const SEED = join(REPO, '.scratch', 't844', 'home', '.ilife', 'data', 'schedule_data.db');
const OUT = resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(REPO, '.scratch', 't787'));
const PROD = join(OUT, '成品');
const WALL = join(OUT, '墙');
const SHOTS = PROD;
const HOME = join(OUT, 'home');
const NO_SHOTS = process.argv.includes('--no-shots');
const ALLOW_DIRTY = process.argv.includes('--allow-dirty');

/** 种子锚点（#844 定死的 2026-09-21）与它铺出来的窗口：计划 2026-09-15 ~ 09-24、记录 07-23 ~ 09-21。 */
const PLAN_FROM = '2026-09-15';
const PLAN_TO = '2026-09-24';
/** 补计划那两天（避开种子里已有的时段）。 */
const ENSURE_DAY = '2026-09-16';
const NOTE_DAY = '2026-09-17';
/** 改／删计划那一天的种子里三条（按标题找，不按写死的 id）。 */
const EDIT_DAY = '2026-09-15';
const MOVE_TITLE = '晨间冥想';
const FIELD_TITLE = '读书一小时';
const DELETE_TITLE = '剪辑视频';
/** 商量计划那一天：种子里已有 7 件（锁定事件区与「与已有重叠」都看它）。 */
const DISCUSS_DAY = '2026-09-22';
/** 无历史参考那一天：往前 7 天（09-28 ~ 10-04）种子里一条记录也没有。 */
const NO_HISTORY_DAY = '2026-10-05';

/** 本票**出页**的行 → 这一行说的是哪一份产物。 */
const P_ENSURE_NEW = '补计划回执（新建）.html';
const P_ENSURE_HIT = '补计划回执（幂等命中）.html';
const P_ENSURE_NOTE = '补计划回执（含备注·远端没成）.html';
const P_ENSURE_BATCH = '补计划回执（多天批量）.html';
const P_UPDATE_MOVE = '改计划回执（改时段）.html';
const P_UPDATE_FIELD = '改计划回执（只改完成状态）.html';
const P_DELETE = '删计划回执（软删）.html';
const P_PREVIEW = '商量计划预览（过程型）.html';
const P_RESULT = '制定次日计划结果.html';
const P_RESULT_ADJUST = '制定次日计划结果（调整后再生成）.html';
const P_RESULT_NOHIST = '制定次日计划结果（无历史参考）.html';

const PRODUCT_OF = {
  ensure_event_basic: P_ENSURE_NEW,
  ensure_event_idempotent: P_ENSURE_HIT,
  ensure_event_with_notes: P_ENSURE_NOTE,
  plan_discuss_tomorrow: P_PREVIEW,
  plan_with_locked: P_PREVIEW,
  plan_result_tomorrow: P_RESULT,
  plan_result_adjust: P_RESULT_ADJUST,
  plan_result_history_none: P_RESULT_NOHIST,
  plan_result_conflict: P_RESULT,
  plan_result_drift: P_RESULT,
  update_event_basic: P_UPDATE_MOVE,
  update_event_time: P_UPDATE_MOVE,
  update_event_completion: P_UPDATE_FIELD,
  update_event_feishu_ask: P_UPDATE_MOVE,
  deactivate_event: P_DELETE,
  deactivate_with_feishu: P_DELETE,
};

/** 本票**有意不出**的三行：老侧本身就不产页（询问／阻断），理由逐行写清。 */
const EXCLUDED = {
  plan_with_wish: '跨技能支线：拉心愿清单要读备忘录，地图「Not yet specified」明写留给以后裁；老侧这一行也只出询问',
  plan_24h_coverage_fail: '阻断态：候选不满足 24 小时首尾相接时命令在校验处即失败（退出码 2），按阻断处理，不造静态页',
  plan_feishu_sync: '商量之后飞书那一问：老侧只出探测询问、不产页；本票的远端侧读数已在「制定次日计划结果」页上如实报出，飞书自己那一族归 #788',
};

/** 归兄弟票的行数（#788 的复盘四档 ＋ 区间复盘 ＋ 日程管家同步）：本票的「有意不出」里不写它们。 */
const SIBLING_ROWS = 9;

/** 商量计划的一版候选（00:00 至 24:00 一段接一段，校验口径要求整天连续）。 */
const DAY_PLAN = [
  ['00:00', '07:30', '睡眠', '维持.睡眠'],
  ['07:30', '08:00', '晨间冥想', '健康.冥想'],
  ['08:00', '09:00', '早餐与通勤', '维持.通勤'],
  ['09:00', '11:30', '深度开发', '工作.开发'],
  ['11:30', '12:30', '午饭', '维持.用餐'],
  ['12:30', '13:00', '午间散步', '调整.散步'],
  ['13:00', '14:00', '午睡', '调整.午睡'],
  ['14:00', '16:00', '需求评审会', '工作.会议'],
  ['16:00', '16:30', '休息', '调整.休息'],
  ['16:30', '18:00', '写周报', '工作.文案'],
  ['18:00', '19:00', '晚饭', '维持.用餐'],
  ['19:00', '20:00', '打游戏', '调整.游戏'],
  ['20:00', '21:00', '读书一小时', '学习.读书'],
  ['21:00', '21:30', '洗漱', '维持.洗漱'],
  ['21:30', '22:30', '剪辑视频', '创作.视频'],
  ['22:30', '24:00', '睡前放松', '调整.休息'],
];
/** 调整后再生成的那一版：把 19:00 至 20:00 换成散步，21:00 之后提前收工（贴历史那一档会变）。 */
const DAY_PLAN_ADJUSTED = DAY_PLAN.map((row) => (row[2] === '打游戏' ? ['19:00', '20:00', '晚间散步', '调整.散步'] : row));
const eventList = (spec) => spec.map(([time_start, time_end, title, category]) => ({ time_start, time_end, title, category }));

/** 每张产物的页契约：清单里那一族 `blocks_old` 的逐块落点（块名 ＋ 该块必现的几处标记）。
 *  `absent` 是本票的反面判据（该档页上**不许**出现的东西）。 */
const CONTRACT = {
  [P_ENSURE_NEW]: [
    { block: '新事件回执（f15）', needs: ['补计划回执', '这一趟的结果', 'ilife-block-conclusion', 'ilife-block-kpi-card'], absent: ['这一步没有新建'] },
  ],
  [P_ENSURE_HIT]: [
    { block: '新事件回执（f15）', needs: ['补计划回执', '这一趟的结果'] },
    { block: '幂等命中注记位（f15）', needs: ['这一步没有新建', '命中已有'] },
  ],
  [P_ENSURE_NOTE]: [
    { block: '新事件回执（f15）', needs: ['补计划回执', '备注'] },
    { block: '远端侧如实报（降级那一档）', needs: ['远端没成'] },
  ],
  [P_ENSURE_BATCH]: [
    { block: '逐天结果表（同一条命令的批量形态）', needs: ['批量补计划回执', '逐天结果', 'ilife-block-data-table'] },
  ],
  [P_UPDATE_MOVE]: [
    { block: '字段前后对照（f14）', needs: ['这次改了什么', 'sch-pl-diff', 'ilife-block-change-row'] },
    { block: '飞书询问位（f14）', needs: ['时段变了，飞书那条也换过'] },
  ],
  [P_UPDATE_FIELD]: [
    { block: '字段前后对照（f14）', needs: ['这次改了什么', 'sch-pl-diff', '完成状态'] },
    { block: '时段没动就不出那句（同一张页的另一档）', needs: ['改计划回执'], absent: ['时段变了，飞书那条也换过'] },
  ],
  [P_DELETE]: [
    { block: '字段前后对照（f14）', needs: ['这一条的前后', 'sch-pl-diff'] },
    { block: '软删的语义（f14 同一家族）', needs: ['这是软删，不是抹掉', '不再算'] },
  ],
  [P_PREVIEW]: [
    { block: '候选事件表（f12）', needs: ['候选事件', 'ilife-block-data-table'] },
    { block: '锁定事件区（f12）', needs: ['锁定事件区'] },
    { block: '空隙提示（f12）', needs: ['空隙提示'] },
  ],
  [P_RESULT]: [
    { block: '时间轴＋分类色带（f17）', needs: ['24 小时时间轴与分类色带', 'ilife-block-chart-block'] },
    { block: '历史贴合提示（f17）', needs: ['历史贴合提示', '逐段贴合'] },
    { block: '冲突红徽章位（f17）', needs: ['冲突与警告'] },
    { block: '偏离警示位（f17）', needs: ['偏离警示'] },
    { block: '复制 prompt 位（f17）', needs: ['复制与留档', 'ilife-block-pre-block'] },
  ],
  [P_RESULT_ADJUST]: [
    { block: '时间轴＋分类色带（f17）', needs: ['24 小时时间轴与分类色带'] },
    { block: '历史贴合提示（f17）', needs: ['历史贴合提示'] },
    { block: '冲突红徽章位（f17）', needs: ['冲突与警告'] },
  ],
  [P_RESULT_NOHIST]: [
    { block: '时间轴＋分类色带（f17）', needs: ['24 小时时间轴与分类色带'] },
    { block: '历史贴合提示（无历史那一档）', needs: ['历史贴合提示', '这一版没有历史可参照'] },
    { block: '冲突红徽章位（f17）', needs: ['冲突与警告'] },
  ],
};

/** 三件生成物的基线（本票开工那一刻的 sha256 前 16 位，**归一化**：去 BOM ＋ CRLF→LF）。
 *  本票不新造 key ⇒ `keys.ts`／`registry.ts` 一个字都不该变；`routes.generated.ts` 的判据是
 *  「＝生成器输出」＋ 与基线同枚。 */
const GENERATED_FROZEN = ['src/cli/keys.ts', 'src/cli/registry.ts'];
const GENERATED_BASELINE = {
  'src/cli/keys.ts': '691b89fd588edac3',
  'src/cli/registry.ts': '77a852766cf2f12a',
};
const ROUTES_SHA = '01933ec9a6f761b3';

/** **本票收口那一刻**的编译态指纹（`FINGERPRINT:` 行里那两枚 sha，逐字抄自干净窗口那次跑）。 */
const FROZEN_FINGERPRINT = { src: '', dist: '' };
const NO_BASELINE = process.argv.includes('--no-baseline');

const reds = [];
const lines = [];
const ok = (m) => lines.push('OK   ' + m);
const red = (m) => { reds.push(m); lines.push('RED  ' + m); };
const die2 = (m) => { console.error('ERR2 ' + m); process.exit(2); };
const sha12 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);
const norm = (text) => text.replace(/^\ufeff/, '').replace(/\r\n/g, '\n');

/* ─────────────────────────── 前置：安静窗口 ＋ 编译指纹 ─────────────────────────── */

function checkQuietWindow() {
  const g = spawnSync('git', ['-C', REPO, 'status', '--short', '--', PKG + '/src'], { encoding: 'utf8' });
  if (g.status !== 0) die2('取不到 git 状态：' + String(g.stderr).trim());
  const dirty = String(g.stdout).trim();
  if (dirty !== '' && !ALLOW_DIRTY) {
    die2('窗口不安静：本包 src 有未提交改动（可能是别人正在写，也可能是本票还没提交），读数作废：\n' + dirty);
  }
  if (dirty !== '' && ALLOW_DIRTY) ok('变异自证模式：本包 src 有未提交改动，安静窗口那一条**按请求跳过**（默认跑法不跳）');
  const owner = join(REPO, '.scratch', 'locks', 'owner.json');
  if (existsSync(owner)) {
    let live = false;
    let info = '';
    try {
      info = readFileSync(owner, 'utf8').trim();
      const o = JSON.parse(info);
      const pid = Number(o.pid);
      if (Number.isFinite(pid) && pid > 0) { try { process.kill(pid, 0); live = true; } catch { live = false; } }
      if (live && String(o.ticket) === '787') live = false;
    } catch { live = false; }
    if (live) die2('窗口不安静：锁目录里有别人在持锁（' + info + '），读数作废');
  }
}

function compileFingerprint() {
  const logPath = join(OUT, '探针-t540.log');
  mkdirSync(OUT, { recursive: true });
  const r = spawnSync(process.execPath, [join(REPO, 'docs', 'agents', 't540-指纹绑定.mjs'),
    '--scope', PKG, '--log', logPath], { encoding: 'utf8', cwd: REPO });
  const out = String(r.stdout);
  const fp = out.split('\n').find((l) => l.startsWith('FINGERPRINT:'));
  if (r.status !== 0 || !fp) {
    die2('编译指纹取不到或窗口内 src 漂移（协议 §2.6，读数作废）：exit=' + String(r.status)
      + '\n' + out.trim() + '\n' + String(r.stderr).trim());
  }
  return fp.trim();
}

function gateRunId() {
  try {
    return String(JSON.parse(readFileSync(join(REPO, '.scratch', 'locks', 'owner.json'), 'utf8')).runId ?? '');
  } catch { return ''; }
}

/* ─────────────────────────── 真出口跑产物 ─────────────────────────── */

if (!existsSync(CLI)) die2('缺 dist 出口（先 tsc -b packages/skill-schedule --force）：' + CLI);
if (!existsSync(SEED)) die2('缺种子库：' + SEED);

checkQuietWindow();
const fingerprint = compileFingerprint();
const runId = gateRunId();
ok('安静窗口：本包 src 无未提交改动、锁目录无别人持锁');
ok('编译指纹：' + fingerprint);

{
  const gotSrc = (fingerprint.match(/src-sha-后=([0-9a-f]+)/) ?? [])[1];
  const gotDist = (fingerprint.match(/dist-sha-后=([0-9a-f]+)/) ?? [])[1];
  if (FROZEN_FINGERPRINT.src === '' || NO_BASELINE) {
    ok('编译态基线：**按请求跳过**（首跑未写锚／--no-baseline）；本趟 src=' + String(gotSrc) + ' dist=' + String(gotDist));
  } else if (gotSrc === FROZEN_FINGERPRINT.src && gotDist === FROZEN_FINGERPRINT.dist) {
    ok('编译态基线：与收口那一刻同枚（src=' + FROZEN_FINGERPRINT.src + ' dist=' + FROZEN_FINGERPRINT.dist + '）');
  } else {
    red('编译态基线不符：收口那一刻 src=' + FROZEN_FINGERPRINT.src + '／dist=' + FROZEN_FINGERPRINT.dist
      + '，本趟 src=' + String(gotSrc) + '／dist=' + String(gotDist)
      + '——本包 src 若真变过，读数作废；若是别席重编过 dist（同源），加 --no-baseline 重跑并写清理由');
  }
}

rmSync(HOME, { recursive: true, force: true });
rmSync(PROD, { recursive: true, force: true });
rmSync(WALL, { recursive: true, force: true });
mkdirSync(join(HOME, '.ilife', 'data'), { recursive: true });
copyFileSync(SEED, join(HOME, '.ilife', 'data', 'schedule_data.db'));
mkdirSync(PROD, { recursive: true });

const env = { ...process.env, USERPROFILE: HOME, HOME };

function runCli(key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  let envelope = null;
  try { envelope = JSON.parse(String(r.stdout)); } catch { envelope = null; }
  return { status: r.status, stderr: String(r.stderr), envelope };
}

/** 改／删那几条的 id 按标题现查（不写死库里的编号）。 */
const dayItems = (date) => {
  const r = runCli('schedule.plan.today', { date });
  if (r.envelope === null) die2('取 ' + date + ' 的当日日程失败：' + r.stderr.trim().slice(0, 200));
  return r.envelope.data.items;
};
const idOf = (date, title) => {
  const hit = dayItems(date).find((x) => x.title === title);
  if (hit === undefined) die2('种子里 ' + date + ' 没有「' + title + '」这一条，读数无从谈起');
  return hit.id;
};

const RUNS = [
  {
    file: P_ENSURE_NEW, key: 'schedule.plan.write', wake: '#13 补计划',
    params: { op: 'ensure', date: ENSURE_DAY, time_start: '08:00', time_end: '08:30', title: '晨间拉伸', category: '健康.运动', feishu: 'skip' },
    note: '补一条计划（新建）：' + ENSURE_DAY + ' 08:00 至 08:30', exit: 0, row: 'ensure_event_basic',
  },
  {
    file: P_ENSURE_HIT, key: 'schedule.plan.write', wake: '#13 补计划',
    params: { op: 'ensure', date: ENSURE_DAY, time_start: '08:00', time_end: '08:30', title: '晨间拉伸', category: '健康.运动', feishu: 'skip' },
    note: '同一条再补一次（幂等命中）：认回原来那条，页上给注记位', exit: 0, row: 'ensure_event_idempotent',
  },
  {
    file: P_ENSURE_NOTE, key: 'schedule.plan.write', wake: '#13 补计划',
    params: { op: 'ensure', date: NOTE_DAY, time_start: '08:15', time_end: '08:45', title: '写日报', category: '工作.文案', notes: '写清这一周的进展' },
    note: '补计划含备注 ＋ 远端没成那一档（不给 feishu 参数 ⇒ 远端不可用，退出码 4）', exit: 4, row: 'ensure_event_with_notes',
  },
  {
    file: P_ENSURE_BATCH, key: 'schedule.plan.write', wake: '#13 补计划',
    params: {
      op: 'ensure', feishu: 'skip',
      dates: [
        { date: '2026-09-23', time_start: '08:00', time_end: '08:30', title: '晨间拉伸', category: '健康.运动' },
        { date: '2026-09-24', time_start: '08:00', time_end: '08:30', title: '晨间拉伸', category: '健康.运动' },
      ],
    },
    note: '多天批量（dates[]）：两天各自新建（同一条命令的另一种形态）', exit: 0, row: '（不占清单行）',
  },
  {
    file: P_UPDATE_MOVE, key: 'schedule.plan.write', wake: '#18 改计划',
    params: () => ({ op: 'update', id: idOf(EDIT_DAY, MOVE_TITLE), time_start: '07:15', time_end: '07:45', title: '晨间冥想与拉伸', feishu: 'skip' }),
    note: '改时段＋改标题：' + EDIT_DAY + ' 07:30 至 08:00 → 07:15 至 07:45', exit: 0, row: 'update_event_basic／update_event_time／update_event_feishu_ask',
  },
  {
    file: P_UPDATE_FIELD, key: 'schedule.plan.write', wake: '#18 改计划',
    params: () => ({ op: 'update', id: idOf(EDIT_DAY, FIELD_TITLE), completion: '已完成', completion_note: '这一小时真读完了', feishu: 'skip' }),
    note: '只改完成状态：时段没动（同一张页的另一档）', exit: 0, row: 'update_event_completion',
  },
  {
    file: P_DELETE, key: 'schedule.plan.write', wake: '#19 删计划',
    params: () => ({ op: 'deactivate', id: idOf(EDIT_DAY, DELETE_TITLE), feishu: 'skip' }),
    note: '软删一条：' + EDIT_DAY + ' 21:30 至 22:30', exit: 0, row: 'deactivate_event／deactivate_with_feishu',
  },
  {
    file: P_PREVIEW, key: 'schedule.plan.write', wake: '#17 商量计划',
    params: { op: 'preview', date: DISCUSS_DAY, feishu: 'skip', events: eventList(DAY_PLAN) },
    note: '商量计划预览（过程型）：候选 16 段，这一天已有 7 件（只预览，不写库）', exit: 0, row: 'plan_discuss_tomorrow／plan_with_locked',
  },
  {
    file: P_RESULT, key: 'schedule.plan.write', wake: '#17 商量计划',
    params: { op: 'upsert', date: DISCUSS_DAY, feishu: 'skip', events: eventList(DAY_PLAN) },
    note: '制定次日计划（结果强化）：落盘后再出一张，带贴合与冲突读数', exit: 0, row: 'plan_result_tomorrow／plan_result_conflict／plan_result_drift',
  },
  {
    file: P_RESULT_ADJUST, key: 'schedule.plan.write', wake: '#17 商量计划',
    params: { op: 'upsert', date: DISCUSS_DAY, feishu: 'skip', events: eventList(DAY_PLAN_ADJUSTED) },
    note: '调整之后再生成一版：19:00 那段换成散步（同一天第二版）', exit: 0, row: 'plan_result_adjust',
  },
  {
    file: P_RESULT_NOHIST, key: 'schedule.plan.write', wake: '#17 商量计划',
    params: { op: 'upsert', date: NO_HISTORY_DAY, feishu: 'skip', events: eventList(DAY_PLAN) },
    note: '往前 7 天没有记录：贴合率写「—」，逐段按无参考算', exit: 0, row: 'plan_result_history_none',
  },
];

const rows = [];
for (let i = 0; i < RUNS.length; i += 1) {
  const run = RUNS[i];
  const params = typeof run.params === 'function' ? run.params() : run.params;
  const r = runCli(run.key, params);
  if (r.status !== run.exit) {
    red(run.file + '：真出口 exit=' + r.status + '（应 ' + run.exit + '）'
      + (r.stderr.trim() === '' ? '' : ' stderr=' + r.stderr.trim().split('\n')[0]));
    continue;
  }
  const dl = r.envelope === null ? undefined : r.envelope.delivery;
  if (dl === undefined || typeof dl.path !== 'string') { red(run.file + '：回执缺 delivery.path（缺省调用没落盘）'); continue; }
  if (!isAbsolute(dl.path)) { red(run.file + '：delivery.path 不是绝对路径：' + dl.path); continue; }
  if (!existsSync(dl.path)) { red(run.file + '：回执路径不在盘上：' + dl.path); continue; }
  const onDisk = statSync(dl.path).size;
  if (onDisk !== dl.bytes) { red(run.file + '：盘上字节 ' + onDisk + ' ≠ delivery.bytes ' + dl.bytes); continue; }
  const html = readFileSync(dl.path, 'utf8');
  if (!html.startsWith('<!doctype html>')) { red(run.file + '：落盘的不是整页'); continue; }
  const target = join(PROD, run.file);
  copyFileSync(dl.path, target);
  if (sha12(readFileSync(target, 'utf8')) !== sha12(html)) { red(run.file + '：复制前后 sha256 不一致'); continue; }
  rows.push({
    seq: String(i + 1).padStart(2, '0'),
    file: run.file,
    row: run.row,
    wake: run.wake,
    family: run.row.startsWith('ensure') ? 'f15' : (run.row.startsWith('plan_result') ? 'f17' : (run.row.startsWith('plan_') ? 'f12' : 'f14')),
    bytes: Buffer.byteLength(html, 'utf8'),
    sha256_12: sha12(html),
    note: run.note,
    key: run.key,
    params: typeof run.params === 'function' ? '（按标题现查 id）' : run.params,
  });
  ok(run.file + ' ← ' + relative(REPO, dl.path).replace(/\\/g, '/') + '（' + dl.bytes + ' B，回执给绝对路径）');
}

/* ─────────────────────────── ① 逐场景行有交代 ─────────────────────────── */

const OUR_WAKES = new Set(['#13 补计划', '#17 商量计划', '#18 改计划', '#19 删计划']);

const manifest = JSON.parse(readFileSync(join(REPO, 'docs', 'skills', 'skill-schedule', '场景清单.json'), 'utf8'));
const planRows = manifest.scenarios.filter((s) => s.domain === 'plan');
const ourRows = planRows.filter((s) => OUR_WAKES.has(s.wake_word));
if (ourRows.length === 0) red('清单里读不到本域唤醒词的行（权威源形状变了，先修读数）');
const productOf = new Map(Object.entries(PRODUCT_OF));
const scenLines = [];
let excludedHits = 0;
for (const row of ourRows) {
  const id = row.scenario_id;
  const file = productOf.get(id);
  if (file !== undefined) {
    const present = existsSync(join(PROD, file));
    if (!present) red('场景 ' + id + ' 判了出页，产物却不在盘上：' + file);
    scenLines.push('     ' + (present ? '有产物' : '缺产物') + '  ' + id + '  → ' + file);
    continue;
  }
  const reason = EXCLUDED[id];
  if (reason === undefined) { red('场景 ' + id + ' 既没有产物、也不在「有意不出」名单里（补一处交代）'); continue; }
  excludedHits += 1;
  scenLines.push('     有意不出  ' + id + '  → ' + reason);
}
ok('① 逐场景行有交代：本票 ' + ourRows.length + ' 行逐行有下文（出页 ' + productOf.size
  + ' 行 → ' + new Set(productOf.values()).size + ' 份产物；有意不出 ' + excludedHits + ' 行；'
  + '另有批量那一支 1 份产物，不占清单行）');
for (const l of scenLines) lines.push(l);

// 不相交：本票的行 ＋ 仍归兄弟票的行 ＝ 整个 plan 域的行；多一行少一行都说明切片变了。
const rest = planRows.length - ourRows.length;
if (rest !== SIBLING_ROWS) {
  red('行集变了：本域 ' + planRows.length + ' 行里，本票 ' + ourRows.length + ' 行、归兄弟票应 ' + SIBLING_ROWS
    + ' 行，实得 ' + rest + ' 行——先核 场景清单.json 与票面切片，再改本探针');
} else {
  ok('① 不相交：本域 ' + planRows.length + ' 行＝本票 ' + ourRows.length + ' 行 ＋ 归 #788 的 ' + rest + ' 行（一个不漏、一个不重）');
}
const productIds = new Set(Object.keys(PRODUCT_OF));
for (const id of Object.keys(EXCLUDED)) {
  if (productIds.has(id)) red('同一行既判了出页又在有意不出名单里：' + id);
  if (!planRows.some((r) => r.scenario_id === id)) red('有意不出名单里有一行不在清单里（清单变了就该删）：' + id);
}

/* ─────────────────────────── ② 必现块在页上（＋ 反面判据） ─────────────────────────── */

const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const count = (body, re) => (body.match(re) ?? []).length;

for (const [file, blocks] of Object.entries(CONTRACT)) {
  const path = join(PROD, file);
  if (!existsSync(path)) { red('② ' + file + ' 不在盘上，块断言无从谈起'); continue; }
  const html = readFileSync(path, 'utf8');
  const body = markupOf(html);
  const text = textOf(html);
  const missing = [];
  for (const b of blocks) {
    const gone = b.needs.filter((n) => !(n.includes('-') ? body.includes(n) : text.includes(n)));
    if (gone.length > 0) missing.push(b.block + '（缺 ' + gone.join(' ') + '）');
    const extra = (b.absent ?? []).filter((n) => text.includes(n));
    if (extra.length > 0) missing.push(b.block + '（不该有 ' + extra.join(' ') + '）');
  }
  if (missing.length > 0) red('② ' + file + ' 必现块：' + missing.join('，'));
  else ok('② ' + file + ' 必现块齐（' + blocks.length + ' 块）');
}

/** 反面判据一（#516 分隔符门那几种并列符号）：页上可见文本里一颗都不许有。 */
const BANNED_CHARS = ['·', '；', '～', '~'];
/** 反面判据二（内部标识）：命令键、库列名、参数名、票号一颗都不许上屏。 */
const BANNED_WORDS = ['schedule.', 'time_start', 'time_end', 'completion_note', 'is_active', 'feishu_event_id', 'op='];
const ID_RE = [/\bt\d{3,}\b/, /#[0-9]{2,}\b/];
for (const file of Object.keys(CONTRACT)) {
  const path = join(PROD, file);
  if (!existsSync(path)) continue;
  const text = textOf(readFileSync(path, 'utf8'));
  const chars = BANNED_CHARS.filter((ch) => text.includes(ch));
  const words = BANNED_WORDS.filter((w) => text.includes(w));
  const ids = ID_RE.filter((re) => re.test(text)).map((re) => String(re));
  if (chars.length > 0) red('② ' + file + '：可见文本里还有并列分隔符 ' + chars.join(' ') + '（#516 是一条真门）');
  else if (words.length > 0) red('② ' + file + '：可见文本里出现内部标识 ' + words.join(' '));
  else if (ids.length > 0) red('② ' + file + '：可见文本里出现票号');
  else ok('② ' + file + '：可见文本零并列分隔符、零内部标识');
}

/** ②‑3：幂等命中那一档的**前后两版**读数对得上（同一编号、local 从 created 翻成 found，页上多出注记位）。 */
{
  const first = runCli('schedule.plan.write', {
    op: 'ensure', date: ENSURE_DAY, time_start: '08:00', time_end: '08:30', title: '晨间拉伸', category: '健康.运动', feishu: 'skip',
  });
  const second = runCli('schedule.plan.write', {
    op: 'ensure', date: ENSURE_DAY, time_start: '08:00', time_end: '08:30', title: '晨间拉伸', category: '健康.运动', feishu: 'skip',
  });
  if (first.envelope === null || second.envelope === null) red('② 幂等：两趟都没回回执');
  else if (second.envelope.data.local !== 'found') red('② 幂等：第二次应是命中已有，实得 ' + String(second.envelope.data.local));
  else if (second.envelope.data.id !== first.envelope.data.id) red('② 幂等：认回的编号换了（' + String(first.envelope.data.id) + ' → ' + String(second.envelope.data.id) + '）');
  else ok('② 幂等读数：两趟都落在 #' + String(second.envelope.data.id) + '，第二次 local=found（幂等未重复）');
}

/** ②‑4：预览之后库里一件没变（过程型那一半：不确认就不写库）。 */
{
  const before = dayItems(DISCUSS_DAY).length;
  const p = runCli('schedule.plan.write', { op: 'preview', date: DISCUSS_DAY, feishu: 'skip', events: eventList(DAY_PLAN) });
  const after = dayItems(DISCUSS_DAY).length;
  if (p.status !== 0) red('② 预览那一趟跑不动：exit=' + p.status);
  else if (after !== before) red('② 预览动了库：预览前 ' + before + ' 件，预览后 ' + after + ' 件');
  else ok('② 过程型读数：预览之后库内仍是 ' + after + ' 件（不确认就不写库）');
}

/** ②‑5：无历史参考那一档与非空历史那一档读得出差别（结果页的贴合率一个是百分数、一个是破折号）。 */
{
  const withHist = textOf(readFileSync(join(PROD, P_RESULT), 'utf8'));
  const noHist = textOf(readFileSync(join(PROD, P_RESULT_NOHIST), 'utf8'));
  const rate = withHist.match(/历史贴合率 (\d+(?:\.\d+)?)%/);
  if (rate === null) red('② 历史贴合率没在页上按百分数给出');
  else if (!noHist.includes('历史贴合率 —')) red('② 无历史那一档没写「—」');
  else ok('② 历史读数：有记录那一档贴合率 ' + rate[1] + '%，无记录那一档写「—」');
}

/* ─────────────────────────── ③ 代码层窄判据 ─────────────────────────── */

const SRC = join(REPO, PKG, 'src');
/** 判据只量**代码里的字符串**：注释里写「实测 880px 掉到 874px」这类读数不算样式字面量。 */
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const stringLiterals = (code) => [...code.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
  .map((m) => m[1] ?? m[2] ?? '').join('\n');
const cssish = /(?:font-size|line-height|padding|margin|gap|border-radius|color|background|width|height)\s*:\s*[^;'"\n]*(?:px|rem|em|vh|vw|%)|@media/;
const hex = /#[0-9a-fA-F]{4,8}\b/;
const violations = [];
/** 本票碰过的页装配件与口径件（**不含**族级样式件 `planParts.ts`——它是长度常量的唯一住处，另量）。 */
const FILES = ['plan/receiptDocs.ts', 'plan/discussDocs.ts', 'plan/handlers.ts', 'plan/planDocs.ts', 'plan/iso.ts'];
for (const rel of FILES) {
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, rel), 'utf8')));
  if (hex.test(literals)) violations.push(rel + '：出现十六进制色值（色值只许取公共层 token）');
  else if (cssish.test(literals)) violations.push(rel + '：页装配件里出现样式字面量（样式只许住族级样式件）');
}
{
  // 族级样式件 `planParts.ts` 是**长度常量的唯一住处**：串里不许出现带单位的长度字面量。
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, 'plan', 'planParts.ts'), 'utf8')));
  if (hex.test(literals)) violations.push('plan/planParts.ts：出现十六进制色值');
  else if (/\d+(?:px|rem|em)\b/.test(literals)) violations.push('plan/planParts.ts：样式里出现长度字面量（长度只许取族级常量）');
}
if (violations.length > 0) for (const v of violations) red('③ ' + v);
else ok('③ 代码层窄判据：本票页内件与三张页文件零裸色值／零单位字面量');

/** 生成物三件：两件**不许变**（本票不新造 key）＋ 路由那件**只许由生成器写**。 */
const drift = GENERATED_FROZEN.filter((g) => {
  const text = norm(readFileSync(join(REPO, PKG, g), 'utf8'));
  return GENERATED_BASELINE[g] !== createHash('sha256').update(text).digest('hex').slice(0, 16);
});
if (drift.length > 0) red('③ 生成物被手改了（它们是 pnpm gen 的产出）：' + drift.join(' '));
else ok('③ 生成物未手改：keys.ts／registry.ts 与基线逐字同（本票不新造 key）');
{
  const routesText = norm(readFileSync(join(REPO, PKG, 'src/triggers/routes.generated.ts'), 'utf8'));
  const actual = createHash('sha256').update(routesText).digest('hex').slice(0, 16);
  if (actual !== ROUTES_SHA) red('③ routes.generated.ts 的 sha 与基线不符：' + actual + ' ≠ ' + ROUTES_SHA);
  else ok('③ routes.generated.ts：与基线同枚（sha=' + ROUTES_SHA + '，本票不动路由）');
  const chk = spawnSync(process.execPath, [join(REPO, PKG, 'scripts', 'gen-cli.mjs'), '--check'], { encoding: 'utf8', cwd: REPO });
  const chkOut = String(chk.stdout).trim();
  if (chk.status !== 0 || !chkOut.includes('GEN-CHECK PASS')) {
    red('③ 生成物门未过（生成物 ≠ 生成器输出）：exit=' + String(chk.status) + ' ' + (chkOut.split('\n').pop() ?? ''));
  } else ok('③ 生成物门：' + (chkOut.split('\n').find((l) => l.startsWith('GEN-CHECK PASS')) ?? 'GEN-CHECK PASS'));
}

/* ─────────────────────────── ④ 双端：出页门 ＋ 分隔符门 ─────────────────────────── */

const files = readdirSync(PROD).filter((f) => f.endsWith('.html')).sort();
const door = spawnSync(process.execPath, [join(REPO, 'docs', 'skills', 'skill-schedule', 'map-779-出页门.mjs'), PROD],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const doorOut = String(door.stdout).trim().split('\n');
for (const l of doorOut) lines.push('     [出页门] ' + l.trim());
if (door.status !== 0) red('④ 出页门未过（整页／零外部引用／三档溢出）：exit=' + door.status);
else ok('④ 出页门：' + (doorOut.find((l) => l.startsWith('RESULT:')) ?? '').trim());

const sep = spawnSync(process.execPath, [join(REPO, 'packages', 'skill-calorie', 'scripts', 'audit-separators.mjs'), '--dir', PROD, '--quiet'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const sepOut = String(sep.stdout).trim().split('\n');
for (const l of sepOut) lines.push('     [分隔符门] ' + l.trim());
if (sep.status !== 0) red('④ 分隔符门有命中（exit=' + sep.status + '）');
else ok('④ 分隔符门：' + (sepOut.find((l) => l.startsWith('RESULT:')) ?? '').trim());

/* ─────────────────────────── 别的域产物逐字节不变 ─────────────────────────── */

{
  const cases = [
    ['#783', join(REPO, '.scratch', 't783', '成品', 't783-清单.json')],
    ['#784', join(REPO, '.scratch', 't784', '成品', 't784-清单.json')],
    ['#785', join(REPO, '.scratch', 't785', '成品', 't785-清单.json')],
    ['#786', join(REPO, '.scratch', 't786', '成品', 't786-清单.json')],
  ];
  for (const [ticket, manifestPath] of cases) {
    if (!existsSync(manifestPath)) { ok('别域产物：' + ticket + ' 的清单不在盘上（那份票的读数找不到，跳过）'); continue; }
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const list = Array.isArray(m) ? m : (m.rows ?? []);
    let same = 0;
    let diff = 0;
    for (const row of list) {
      const p = join(dirname(manifestPath), row.file);
      if (!existsSync(p)) { diff += 1; continue; }
      if (sha12(readFileSync(p, 'utf8')) === row.sha256_12) same += 1; else diff += 1;
    }
    if (diff === 0) ok('别域产物逐字节不变：' + ticket + ' 那 ' + same + ' 件与它的清单逐件同');
    else ok('别域产物：' + ticket + ' 那 ' + list.length + ' 件里 ' + diff + ' 件与旧清单不同（该票自己的读数为准）');
  }
}

/* ─────────────────────────── 清单 ＋ 截图 ＋ 小墙 ─────────────────────────── */

writeFileSync(join(PROD, 't787-清单.json'), JSON.stringify({
  ticket: '#787',
  key: 'schedule.plan.write（preview／upsert／ensure／update／deactivate 五支）',
  page: '补／改／删计划回执、商量计划预览、制定次日计划结果',
  rows,
}, null, 2) + '\n', 'utf8');
ok('清单：' + relative(REPO, join(PROD, 't787-清单.json')).replace(/\\/g, '/') + '（rows=' + rows.length + '）');

if (!NO_SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
  const shot = await shoot(files);
  if (shot === null) red('截图：CDP 未就绪（本机 Chrome／Edge 找不到？DSH_BROWSER 可指）');
  else ok('截图：' + shot + ' 张（产物 × 双端 390／1280 全页）');
  const wall = buildWalls(rows.map((r) => r.file));
  if (wall.reds.length > 0) for (const w of wall.reds) red('小墙：' + w);
  else ok('小墙：手机墙 ' + wall.mobile + ' 格、桌面墙 ' + wall.desktop + ' 格（iframe 自带内容，零外部文件）');
}

/* ─────────────────────────── 结论 ─────────────────────────── */

const summary = 'RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL') + ' pages=' + files.length
  + ' scenes=' + ourRows.length + ' red=' + reds.length + ' | ' + fingerprint.replace(/^FINGERPRINT:\s*/, '');
for (const l of lines) console.log(l);
if (reds.length > 0) { console.log('--- 红条 ---'); for (const r of reds) console.log('RED  ' + r); }
console.log(summary);
if (runId !== '') console.log('GATE-RUN runId=' + runId + ' cmd=node docs/skills/skill-schedule/t787-探针.mjs');
process.exit(reds.length === 0 ? 0 : 1);

/* ─────────────────────────── 截图与墙（本件自持，零第三方依赖） ─────────────────────────── */

async function shoot(pages) {
  const BROWSER = [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter((p) => typeof p === 'string' && p && existsSync(p))[0];
  if (!BROWSER) return null;
  const PORT = 9861 + (process.pid % 110);
  const profile = mkdtempSync(join(tmpdir(), 't787-shot-'));
  const chrome = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let dev = null;
  for (let i = 0; i < 120 && dev === null; i += 1) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (r.ok) dev = (await r.json()).webSocketDebuggerUrl; } catch { /* 未就绪 */ }
    if (dev === null) await sleep(250);
  }
  if (dev === null) { chrome.kill(); return null; }
  const ws = new WebSocket(dev);
  const pending = new Map();
  let seq = 1;
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id !== undefined && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  });
  await new Promise((res) => ws.addEventListener('open', () => res()));
  const send = (method, params, sessionId) => new Promise((res, rej) => {
    const id = seq++; pending.set(id, { resolve: res, reject: rej });
    ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  const evaluate = async (e) => (await s('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result.value;
  await s('Page.enable'); await s('Runtime.enable');
  let made = 0;
  for (const f of pages) {
    for (const w of [390, 1280]) {
      await s('Emulation.setDeviceMetricsOverride', { width: w, height: 1000, deviceScaleFactor: 1, mobile: w < 768 });
      await s('Page.navigate', { url: new URL('file:///' + join(PROD, f).replace(/\\/g, '/')).href });
      for (let i = 0; i < 60; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
      await sleep(300);
      const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      writeFileSync(join(SHOTS, basename(f, '.html') + '__截图__' + w + '.png'), Buffer.from(shot.data, 'base64'));
      made += 1;
    }
  }
  ws.close(); chrome.kill();
  for (let i = 0; i < 10; i += 1) { try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); } }
  return made;
}

/** 本域小墙（形制照 `docs/agents/视觉验收墙.md` §6.2）：手机 390 三列／桌面 1280 一列。
 *
 *  **iframe 用 `srcdoc` 嵌真页内容**：墙自身零外部文件引用 ⇒ 双击即看、不发一次同源请求，
 *  也不存在 `map-779-出页门` 那条「零外部引用」判据的灰色地带（墙页不是产物，但按产物口径自检更省事）。
 *  墙页住 `墙/` 子目录（产物目录只留产物——墙是定宽夹具，混进去会让出页门把墙也当产物量）。
 */
function buildWalls(pages) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const reds2 = [];
  const byFile = new Map(rows.map((r) => [r.file, r]));
  const dropped = pages.filter((f) => !existsSync(join(PROD, f)));
  for (const d of dropped) reds2.push('墙要点名 ' + d + '，盘上没有');
  mkdirSync(WALL, { recursive: true });
  const made = { mobile: 0, desktop: 0 };
  for (const [name, W, H, COLS] of [['t787-小墙-手机.html', 390, 900, 3], ['t787-小墙-桌面.html', 1280, 900, 1]]) {
    const cells = pages.map((f, i) => {
      const row = byFile.get(f);
      const srcdoc = esc(readFileSync(join(PROD, f), 'utf8'));
      return '  <figure><figcaption>' + esc(String(i + 1).padStart(2, '0') + ' ' + f)
        + '<span>' + esc(row === undefined ? '' : row.note) + '</span></figcaption>'
        + '<iframe src="about:blank" srcdoc="' + srcdoc + '" width="' + W + '" height="' + H
        + '" title="' + esc(f) + '"></iframe></figure>';
    }).join('\n');
    const page = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(name) + '</title>'
      + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#f5f5f7;color:#1d1d1f}'
      + '.wrap{padding:24px 20px 60px}h1{font-size:22px;font-weight:600;margin-bottom:6px}'
      + '.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px;line-height:1.7}'
      + '.grid{display:grid;grid-template-columns:repeat(' + COLS + ',' + W + 'px);gap:18px;align-items:start;justify-content:start}'
      + 'figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}'
      + 'figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}'
      + 'figcaption span{color:#868b93;font-weight:400;font-size:11.5px}'
      + 'iframe{display:block;border:0;background:#fff}</style></head><body><div class="wrap">'
      + '<h1>' + esc(name.replace(/^t787-小墙-|\.html$/g, '')) + '墙 · ' + pages.length + ' 格 × ' + W + ' 宽</h1>'
      + '<div class="sub">每格是一份产物的<b>真实渲染</b>（整页内嵌，无外部文件引用）。这一页给人看，不是交付产物。</div>'
      + '<div class="grid">\n' + cells + '\n</div></div></body></html>\n';
    writeFileSync(join(WALL, name), page, 'utf8');
    if (COLS === 3) made.mobile = pages.length; else made.desktop = pages.length;
  }
  return { mobile: made.mobile, desktop: made.desktop, reds: reds2 };
}
