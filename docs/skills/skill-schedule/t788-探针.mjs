#!/usr/bin/env node
/** #788 探针 —— 日程与计划·复盘与飞书「出页」的**票面验收命令**（真出口读数）。
 *
 *   node tooling/run-locked.mjs --ticket 788 -- node docs/skills/skill-schedule/t788-探针.mjs
 *
 *  它跑什么（逐条对票面「怎么算绿」）：
 *   ① **逐场景行有交代**：从清单 `docs/skills/skill-schedule/场景清单.json` 读本域（`domain=plan`）里
 *      本票那 9 行（`#14 复盘` 4 行 ＋ `#20 日程管家同步` 1 行 ＋ 复盘今日／本周／本月／区间 4 行），
 *      逐行判「有产物」或「在有意不出名单里」——缺一行即红；并断言**不相交**：本域 28 行 ＝ 本票 9 行
 *      ＋ 归 #787 的 19 行。唤醒词「飞书探测」的**清单行**在 admin 域（`feishu_probe`，归 #790 记账），
 *      但它的**页**由本票出（路由是 `schedule.plan.write` 的 `op=sync` ＋ `dryRun`，处理函数在
 *      `src/plan/`）——故另出三档产物并断言 admin 那三行不归本票。
 *   ② **必现块在页上**：按清单里各家族 `blocks_old` 的逐块落点断言——单日复盘（f13：逐条 completion
 *      ＋ 讨论区）、复盘一体页四档（f18：计划 vs 实际对照／7 维趋势／24h×N 天热力图／环比对比／
 *      目标达成／健康分／复盘到明天的衔接），另量**区间按跨度自动路由**（同一唤醒词三档跨度各出一张，
 *      档与档之间的块**互斥**）；飞书两条按「探测三档」与「同步的账」断言。另量两条**反面判据**：
 *      页上可见文本里不许出现分隔符门（#516）那几种并列符号、不许出现内部标识（命令键／库列名／
 *      参数名／票号）。
 *   ③ **代码层窄判据**：本票页内件与页文件里不出现裸字号／间距／色值字面量（只许取公共层 token 或
 *      族级样式件常量）；另断言**没有新 key**（`cli/keys.ts`／`registry.ts` 与基线逐字同）且
 *      `triggers/routes.generated.ts` **等于生成器输出**（`gen-cli.mjs --check` 绿）。
 *   ④ **双端**：三档横向溢出 0 ＋ 分隔符门 0 命中（都走仓内现成件）。
 *   ⑤ **飞书探测只读**（本票自加，探针的**挡板日志**为证）：拿一只本地挡板当 lark-cli，探测那几趟的
 *      调用记录里**一个写动作都没有**（没有建、没有改、没有删），而同一只挡板上跑「日程管家同步」
 *      会真的建对象——两道口子分得开。
 *  另交：产物 × 双端两张整页截图、本域小墙（手机／桌面各一张，iframe 自带内容、零外部文件）、
 *  清单（墙与收口票共用一份）、「别的域产物逐字节不变」读数。
 *
 *  产物走**真出口**：`dist/cli/cmd_read.js` 逐条真跑（缺省落盘，落点认 `delivery.path`），
 *  再把那份页复制到 `.scratch/t788/成品/` 的可读名上——复制前后核 sha256，读数只认真出口那次落盘。
 *  飞书那几趟**不碰真飞书**：隔离家目录里放一只挡板（`.cmd` ＋ 一个 mjs），挡板只认几个子命令、
 *  把每次调用记进日志、不联网。
 *
 *  安静窗口（协议 §2.6）：本包 `src` 有未提交改动即作废（本票的改动要先提交），并打编译指纹那一行；
 *  本探针的结论只对那一行有效。用法：
 *   node docs/skills/skill-schedule/t788-探针.mjs [--out <产物目录>] [--no-shots] [--allow-dirty] [--no-baseline]
 */
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PKG = 'packages/skill-schedule';
const CLI = join(REPO, PKG, 'dist', 'cli', 'cmd_read.js');
const SEED = join(REPO, '.scratch', 't844', 'home', '.ilife', 'data', 'schedule_data.db');
const OUT = resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(REPO, '.scratch', 't788'));
const PROD = join(OUT, '成品');
const WALL = join(OUT, '墙');
const SHOTS = PROD;
const HOME = join(OUT, 'home');
const SHIM = join(OUT, 'shim');
const SHIM_LOG = join(SHIM, 'calls.log');
const NO_SHOTS = process.argv.includes('--no-shots');
const ALLOW_DIRTY = process.argv.includes('--allow-dirty');

/** 种子锚点（#844 定死的 2026-09-21）：计划 09-15 ~ 09-24、记录 07-23 ~ 09-21。 */
const ANCHOR = '2026-09-21';
/** 无活跃事件那一天（种子里计划面之外）。 */
const EMPTY_DAY = '2026-10-05';
/** 已全部标记那一天（种子里 7 条全未复盘，本探针先全标成已完成）。 */
const DONE_DAY = '2026-09-23';
/** 同步那一天（种子里有 7 条计划、且是未来日期 ⇒ 不落「过去日期跳过」那一档）。 */
const SYNC_DAY = '2026-09-24';

/** 本票**出页**的行 → 这一行说的是哪一份产物。 */
const P_REVIEW = '复盘（逐条标记）.html';
const P_REVIEW_DONE = '复盘（已全部标记）.html';
const P_REVIEW_EMPTY = '复盘（该日无活跃事件）.html';
const P_DAY = '复盘今日.html';
const P_WEEK = '复盘本周.html';
const P_MONTH = '复盘本月.html';
const P_RANGE_WEEK = '复盘区间（7 天·按本周档）.html';
const P_RANGE_DAY = '复盘区间（1 天·按今日档）.html';
const P_RANGE_LONG = '复盘区间（61 天·通用档）.html';
const P_PROBE_FULL = '飞书探测（三档全通）.html';
const P_PROBE_PARTIAL = '飞书探测（装了没登录）.html';
const P_PROBE_MISSING = '飞书探测（没装）.html';
const P_SYNC = '日程管家同步（回执）.html';

const PRODUCT_OF = {
  review_today_normal: P_REVIEW,
  review_today_all_done: P_REVIEW_DONE,
  review_no_events: P_REVIEW_EMPTY,
  replay_day: P_DAY,
  replay_week: P_WEEK,
  replay_month: P_MONTH,
  replay_range: P_RANGE_WEEK,
  feishu_resync_basic: P_SYNC,
};

/** 本票**有意不出**的那一行（老侧本身就不产页：跨技能询问）。 */
const EXCLUDED = {
  review_with_memo_sync: '跨技能支线（复盘前先同步备忘录的打卡数据）：那一步要读别家的库，地图的 Not yet specified 已明写留给以后裁',
};

/** 归兄弟票（#787）的行数：本票的「有意不出」里不写它们。 */
const SIBLING_ROWS = 19;

/** 每张产物的页契约：清单里那一族 `blocks_old` 的逐块落点（块名 ＋ 该块必现的几处标记）。
 *  `absent` 是本票的反面判据（该档页上**不许**出现的东西：档与档之间的块要互斥）。 */
const CONTRACT = {
  [P_REVIEW]: [
    { block: '逐条 completion（f13）', needs: ['逐条复盘', '完成状态', '原因'] },
    { block: '讨论区（f13）', needs: ['讨论区', '把标记交给 AI 落库', '复制这句话'] },
  ],
  [P_REVIEW_DONE]: [
    { block: '逐条 completion（f13）', needs: ['逐条复盘', '这一天的计划全都标过了'] },
    { block: '讨论区（f13）', needs: ['讨论区', '收尾看结论'] },
  ],
  [P_REVIEW_EMPTY]: [
    { block: '逐条 completion（f13）', needs: ['逐条复盘', '这一天没有活跃的计划'] },
    { block: '讨论区（f13）', needs: ['讨论区', '先排这一天的计划就说这一句'] },
  ],
  [P_DAY]: [
    { block: '计划 vs 实际对照（f18）', needs: ['计划 vs 实际对照', '计划时长', '实际时长'] },
    { block: '实际作息（f18）', needs: ['实际作息', '分类聚合'] },
    { block: '计划执行（f18）', needs: ['计划执行', '完成状态分布', '按分类拆解'] },
    { block: '跨域对比（f18）', needs: ['跨域对比', '没做成的计划', '计划之外的记录'] },
    { block: '健康分（f18）', needs: ['健康分', '七个维度各自按目标时长给分再取均'] },
    { block: '复盘→明日衔接（f18）', needs: ['复盘到明天的衔接', '商量一下 ' + '2026-09-22' + ' 的计划'] },
    { block: '档位互斥', absent: ['环比对比', '24h × N 天热力图'] },
  ],
  [P_WEEK]: [
    { block: '7 维趋势（f18 周档）', needs: ['7 维趋势'] },
    { block: '24h×N 天热力图（f18 周档）', needs: ['24h × N 天热力图', 'heat-cell'] },
    { block: '健康分（f18）', needs: ['健康分', '逐日健康分'] },
    { block: '亮点与问题（f18）', needs: ['亮点与问题', '与上一段比'] },
    { block: '复盘→明日衔接（f18）', needs: ['复盘到明天的衔接'] },
    { block: '档位互斥', absent: ['环比对比', '计划 vs 实际对照', '目标达成'] },
  ],
  [P_MONTH]: [
    { block: '月度聚合（f18 月档）', needs: ['实际作息', '分类聚合'] },
    { block: '环比对比（f18 月档）', needs: ['环比对比', '上月同期'] },
    { block: '目标达成（f18 月档）', needs: ['目标达成', '计划完成率', '维持占比'] },
    { block: '健康分（f18）', needs: ['健康分'] },
    { block: '复盘→明日衔接（f18）', needs: ['复盘到明天的衔接'] },
    { block: '档位互斥', absent: ['24h × N 天热力图', '计划 vs 实际对照'] },
  ],
  [P_RANGE_WEEK]: [
    { block: '区间按跨度路由（≤7 天→本周档）', needs: ['这一段的跨度是 7 天，按本周档画', '7 维趋势', '24h × N 天热力图'] },
    { block: '健康分（f18）', needs: ['健康分'] },
    { block: '档位互斥', absent: ['环比对比', '计划 vs 实际对照'] },
  ],
  [P_RANGE_DAY]: [
    { block: '区间按跨度路由（≤1 天→今日档）', needs: ['这一段的跨度是 1 天，按今日档画', '计划 vs 实际对照'] },
    { block: '档位互斥', absent: ['环比对比', '7 维趋势'] },
  ],
  [P_RANGE_LONG]: [
    { block: '区间按跨度路由（>31 天→通用四段）', needs: ['实际作息', '7 维趋势', '计划执行', '跨域对比', '亮点与问题'] },
    { block: '计划 vs 实际对照（f18）', needs: ['计划 vs 实际对照', '计划与记录相交的一共'] },
    { block: '通用档收量（逐日那几块只印最近 7 天）', needs: ['热力图只印最近 7 天'] },
    { block: '档位互斥', absent: ['环比对比', '目标达成'] },
  ],
  [P_PROBE_FULL]: [
    { block: '三档探测·全通', needs: ['三道门逐道看', '全通', '飞书命令行', '拉得动', '这一步只读'] },
    { block: '探测不写', needs: ['这一趟写了几笔', '只读探测，远端一行没动'] },
    { block: '档位互斥', absent: ['这一趟的账', '远端新建'] },
  ],
  [P_PROBE_PARTIAL]: [
    { block: '三档探测·不完全', needs: ['不完全', '把飞书命令行的授权补上', '没过'] },
    { block: '档位互斥', absent: ['这一趟的账'] },
  ],
  [P_PROBE_MISSING]: [
    { block: '三档探测·没装', needs: ['没装', '飞书命令行', '本技能不代装也不代登', '没找到'] },
    { block: '档位互斥', absent: ['这一趟的账'] },
  ],
  [P_SYNC]: [
    { block: '同步的账（f20）', needs: ['这一趟的账', '回填标识', '远端新建', '远端清理', '失败'] },
    { block: '本地这一天的排布', needs: ['本地这一天的排布', '已同步飞书'] },
    { block: '下一步留出口', needs: ['只想先看一眼而不动远端'] },
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
const ROUTES_SHA = '784062f712af8df8';

/** **本票收口那一刻**的编译态指纹（`FINGERPRINT:` 行里那两枚 sha，逐字抄自干净窗口那次跑）。 */
const FROZEN_FINGERPRINT = { src: '5f5ed35549bbe1f0', dist: '42024e47b554d74f' };
const NO_BASELINE = process.argv.includes('--no-baseline');

const reds = [];
const lines = [];
const ok = (m) => lines.push('OK   ' + m);
const red = (m) => { reds.push(m); lines.push('RED  ' + m); };
const die2 = (m) => { console.error('ERR2 ' + m); process.exit(2); };
/** 探针自己抛错也要把已经攒下的读数打出来：否则一次崩掉看不到是哪一件出的问题。 */
process.on('uncaughtException', (e) => {
  const head = e !== null && typeof e === 'object' && 'stack' in e ? String(e.stack).split('\n')[0] : String(e);
  red('探针自身抛错（这一类是探针的毛病，不是产物的）：' + head);
  for (const l of lines) console.log(l);
  console.log('RESULT: FAIL red=' + String(reds.length) + ' | ABORT');
  process.exit(1);
});
const sha12 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);
const norm = (text) => text.replace(/^\ufeff/, '').replace(/\r\n/g, '\n');
/** 页上可见文本：剥掉样式／脚本／注释与全部标签（与分隔符门同口径，属性因此天然不进可见文本）。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

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
      if (live && String(o.ticket) === '788') live = false;
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
rmSync(SHIM, { recursive: true, force: true });
mkdirSync(join(HOME, '.ilife', 'data'), { recursive: true });
copyFileSync(SEED, join(HOME, '.ilife', 'data', 'schedule_data.db'));
mkdirSync(PROD, { recursive: true });

const envBase = { ...process.env, USERPROFILE: HOME, HOME };
/** 没装 lark-cli 那一档：把路径清空，`where` 那一档也探不到（候选表本来就落在家目录里）。 */
const envNoCli = { ...envBase, PATH: '' };
/** 挡板那两档：家目录里放一只假 lark-cli，模式由环境变量给。 */
const envShim = (mode) => ({ ...envBase, T788_SHIM_MODE: mode, T788_SHIM_LOG: SHIM_LOG });

function runCli(key, params, env = envBase) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  let envelope = null;
  try { envelope = JSON.parse(String(r.stdout)); } catch { envelope = null; }
  return { status: r.status, stderr: String(r.stderr), envelope };
}

/** 某一天的计划（按标题找 id，不写死库里的编号）。 */
const dayItems = (date) => {
  const r = runCli('schedule.plan.today', { date });
  if (r.envelope === null) die2('取 ' + date + ' 的当日日程失败：' + r.stderr.trim().slice(0, 200));
  return r.envelope.data.items;
};

/* ── 飞书挡板：一只只会认几个子命令、把每次调用记进日志的假 lark-cli（不联网） ── */

const SHIM_JS = `import { appendFileSync } from 'node:fs';
const mode = process.env.T788_SHIM_MODE || 'full';
const log = process.env.T788_SHIM_LOG || '';
const argv = process.argv.slice(2);
if (log) appendFileSync(log, mode + '\\t' + argv.join(' ') + '\\n');
const say = (o) => process.stdout.write(JSON.stringify(o));
const arg = (name) => { const i = argv.indexOf(name); return i < 0 ? '' : (argv[i + 1] ?? ''); };
if (argv[0] === '--version') { process.stdout.write('lark-cli version 9.9.9\\n'); process.exit(0); }
if (argv[0] === 'auth') {
  if (mode === 'no-auth') process.exit(1);
  say({ identities: { user: { openId: 'ou-t788-shim' } } });
  process.exit(0);
}
if (argv[0] === 'calendar') {
  if (mode === 'no-calendar') process.exit(1);
  const sub = argv[1];
  if (sub === '+agenda') { say({ data: [] }); process.exit(0); }
  if (sub === '+search-event') { say({ data: { items: [] } }); process.exit(0); }
  if (sub === '+create' || sub === '+update') {
    const id = 'shim-' + String(Date.now()) + '-' + String(Math.floor(Math.random() * 1000));
    say({ data: {
      event_id: id, summary: arg('--summary'), description: arg('--description'),
      start_time: { datetime: arg('--start') }, end_time: { datetime: arg('--end') },
    } });
    process.exit(0);
  }
  if (sub === 'events' && argv[2] === 'delete') { say({ data: {} }); process.exit(0); }
  if (sub === 'events' && argv[2] === 'get') { say({ data: { event: { event_id: arg('--event-id') } } }); process.exit(0); }
}
process.exit(1);
`;

function installShim() {
  mkdirSync(join(HOME, 'AppData', 'Roaming', 'npm'), { recursive: true });
  mkdirSync(SHIM, { recursive: true });
  // 文件名一律 ASCII：`.cmd` 由 cmd.exe 按本地代码页读，路径里带中文会被读成乱码、node 找不到脚本。
  writeFileSync(join(SHIM, 'shim.mjs'), SHIM_JS, 'utf8');
  writeFileSync(join(HOME, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd'),
    '@echo off\r\n"' + process.execPath + '" "' + join(SHIM, 'shim.mjs') + '" %*\r\n', 'utf8');
  writeFileSync(SHIM_LOG, '', 'utf8');
}

const shimLog = () => (existsSync(SHIM_LOG) ? readFileSync(SHIM_LOG, 'utf8') : '');
const WRITE_VERBS = ['+create', '+update', 'events delete'];

const RUNS = [
  {
    file: P_REVIEW, env: envBase, wake: '#14 复盘', exit: 0, family: 'f13',
    params: { op: 'review', date: ANCHOR },
    note: '裸词「复盘」：单日逐条标记那一张（' + ANCHOR + ' 有 7 条计划、只有 1 条标过）', row: 'review_today_normal',
  },
  {
    file: P_REVIEW_EMPTY, env: envBase, wake: '#14 复盘', exit: 0, family: 'f13',
    params: { op: 'review', date: EMPTY_DAY },
    note: '该日无活跃事件：空态页（不是故障，是这天没排）', row: 'review_no_events',
  },
  {
    file: P_DAY, env: envBase, wake: '复盘今日', exit: 0, family: 'f18',
    params: { op: 'review', granularity: 'day', date: ANCHOR },
    note: '复盘今日（f18 今日档）：计划 vs 实际对照 ＋ 实际作息 ＋ 计划执行 ＋ 跨域对比 ＋ 健康分', row: 'replay_day',
  },
  {
    file: P_WEEK, env: envBase, wake: '复盘本周', exit: 0, family: 'f18',
    params: { op: 'review', granularity: 'week', date: '2026-09-17' },
    note: '复盘本周（f18 周档）：7 维趋势 ＋ 24h×N 天热力图 ＋ 健康分 ＋ 亮点与问题（锚点取 09-14~09-20 这一周，七天都有记录）', row: 'replay_week',
  },
  {
    file: P_MONTH, env: envBase, wake: '复盘本月', exit: 0, family: 'f18',
    params: { op: 'review', granularity: 'month', date: ANCHOR },
    note: '复盘本月（f18 月档）：月度聚合 ＋ 环比对比（上月同期） ＋ 目标达成 ＋ 健康分', row: 'replay_month',
  },
  {
    file: P_RANGE_WEEK, env: envBase, wake: '复盘区间', exit: 0, family: 'f18',
    params: { op: 'review', granularity: 'range', start: '2026-09-13', end: '2026-09-19' },
    note: '复盘区间 7 天：跨度路由把它画成本周档（区间那一行认的就是这一张）', row: 'replay_range',
  },
  {
    file: P_RANGE_DAY, env: envBase, wake: '复盘区间', exit: 0, family: 'f18',
    params: { op: 'review', granularity: 'range', start: ANCHOR, end: ANCHOR },
    note: '复盘区间 1 天：跨度路由把它画成今日档（同一条唤醒词的另一种跨度，不占清单行）', row: '（不占清单行）',
  },
  {
    file: P_RANGE_LONG, env: envBase, wake: '复盘区间', exit: 0, family: 'f18',
    params: { op: 'review', granularity: 'range', start: '2026-07-23', end: ANCHOR },
    note: '复盘区间 61 天：跨度路由把它画成通用四段档（同上，不占清单行）', row: '（不占清单行）',
  },
  {
    file: P_PROBE_MISSING, env: envNoCli, wake: '飞书探测', exit: 0, family: 'admin·feishu_probe',
    params: { op: 'sync', dryRun: true, date: ANCHOR },
    note: '飞书探测·没装档：路径清空后三档探到「没装」（只读，exit 0）', row: '（清单行在 admin 域，归 #790 记账）',
  },
  {
    file: P_PROBE_FULL, env: envShim('full'), before: installShim, wake: '飞书探测', exit: 0, family: 'admin·feishu_probe',
    params: { op: 'sync', dryRun: true, date: ANCHOR },
    note: '飞书探测·全通档：挡板三门全过（这一趟的调用记录里一个写动作都没有）', row: '（同上）',
  },
  {
    file: P_PROBE_PARTIAL, env: envShim('no-auth'), wake: '飞书探测', exit: 0, family: 'admin·feishu_probe',
    params: { op: 'sync', dryRun: true, date: ANCHOR },
    note: '飞书探测·装了没登录：挡板 auth 那一门不过', row: '（同上）',
  },
  {
    file: P_SYNC, env: envShim('full'), wake: '#20 日程管家同步', exit: 0, family: 'feishu_resync_basic',
    params: { op: 'sync', date: SYNC_DAY },
    note: '日程管家同步：挡板上真建对象，页上报这一趟的账（' + SYNC_DAY + ' 是未来日期，不走「过去日期跳过」）', row: 'feishu_resync_basic',
  },
];

const rows = [];
for (let i = 0; i < RUNS.length; i += 1) {
  const run = RUNS[i];
  // 「没装」那一档必须在装挡板**之前**跑：挡板就落在隔离家目录的候选路径上，装了它就不是「没装」了。
  if (typeof run.before === 'function') run.before();
  const before = run.env.T788_SHIM_LOG === undefined ? null : shimLog().length;
  const r = runCli('schedule.plan.write', run.params, run.env);
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
  const thisRun = before === null ? '' : shimLog().slice(before);
  rows.push({
    seq: String(i + 1).padStart(2, '0'),
    file: run.file,
    row: run.row,
    wake: run.wake,
    family: run.family,
    bytes: Buffer.byteLength(html, 'utf8'),
    sha256_12: sha12(html),
    note: run.note,
    key: 'schedule.plan.write',
    params: run.params,
    shimCalls: thisRun === '' ? 0 : thisRun.trim().split('\n').length,
    shimWrites: WRITE_VERBS.filter((v) => thisRun.includes(v)),
  });
  ok(run.file + ' ← ' + relative(REPO, dl.path).replace(/\\/g, '/') + '（' + dl.bytes + ' B，回执给绝对路径）');
}

/* ─────────────────────────── ②‑3 页与库对得上；②‑4 复盘只读；②‑5 已全部标记那一档 ─────────────────────────── */

/** ②‑3：同步那一趟的账与库对得上（挡板上真建了对象，页上就要把那些行标成已同步）。 */
{
  const r = runCli('schedule.plan.today', { date: SYNC_DAY });
  const items = r.envelope === null ? null : r.envelope.data.items;
  const synced = items === null ? -1 : items.filter((x) => x.synced === true).length;
  const text = textOf(readFileSync(join(PROD, P_SYNC), 'utf8'));
  const shown = (text.match(/已同步飞书/g) ?? []).length;
  if (synced <= 0) red('②‑3 同步之后本地这一天一条带远端标识的都没有（挡板没被真调用？）');
  else if (shown !== synced) red('②‑3 页上标成已同步的行 ' + String(shown) + ' 条 ≠ 库里的 ' + String(synced) + ' 条');
  else ok('②‑3 同步读数：' + SYNC_DAY + ' 本地 ' + String(items.length) + ' 条计划，同步后 ' + String(synced) + ' 条带上远端标识，页上逐行同数');
}

/** ②‑4：复盘那几趟不动库（读操作：跑前跑后件数不变）。 */
{
  const before = dayItems(ANCHOR).length;
  runCli('schedule.plan.write', { op: 'review', granularity: 'month', date: ANCHOR });
  const after = dayItems(ANCHOR).length;
  if (after !== before) red('②‑4 复盘动了库：跑前 ' + String(before) + ' 件，跑后 ' + String(after) + ' 件');
  else ok('②‑4 复盘只读：跑前跑后 ' + ANCHOR + ' 都是 ' + String(after) + ' 件（四档都不写库）');
}

/** ②‑5：已全部标记那一档（同一条唤醒词、另一天的状态）——先全标成已完成，再出页。 */
{
  const items = dayItems(DONE_DAY);
  if (items.length === 0) red('②‑5 ' + DONE_DAY + ' 在种子里没有计划，已全部标记那一档无从谈起');
  for (const it of items) {
    const r = runCli('schedule.plan.write', { op: 'update', id: it.id, completion: '已完成', completion_note: '这一条按时做完了', feishu: 'skip' });
    if (r.status !== 0) { red('②‑5 标记 ' + DONE_DAY + ' 第 ' + String(it.id) + ' 条失败：exit=' + String(r.status)); break; }
  }
  const r = runCli('schedule.plan.write', { op: 'review', date: DONE_DAY });
  const dl = r.envelope === null ? undefined : r.envelope.delivery;
  if (r.status !== 0 || dl === undefined) red('②‑5 已全部标记那一档没落盘：exit=' + String(r.status));
  else {
    copyFileSync(dl.path, join(PROD, P_REVIEW_DONE));
    const html = readFileSync(join(PROD, P_REVIEW_DONE), 'utf8');
    rows.push({
      seq: '99', file: P_REVIEW_DONE, row: 'review_today_all_done', wake: '#14 复盘', family: 'f13',
      bytes: Buffer.byteLength(html, 'utf8'), sha256_12: sha12(html),
      note: DONE_DAY + ' 这一天 ' + String(items.length) + ' 条全标成已完成后的同一张复盘页（状态那一档换了）',
      key: 'schedule.plan.write', params: { op: 'review', date: DONE_DAY }, shimCalls: 0, shimWrites: [],
    });
    const text = textOf(html);
    if (!text.includes('这一天的计划全都标过了')) red('②‑5 已全部标记那一档没写出「全都标过了」那句');
    else ok('②‑5 已全部标记：' + DONE_DAY + ' 的 ' + String(items.length) + ' 条全标成已完成后，页上口径换成「全都标过了」');
  }
}

/** ⑤‑用：同步那一趟的账与库对得上（挡板上真建了对象，页上就要把那几行标成已同步）。 */
if (existsSync(join(PROD, P_SYNC))) {
  const r = runCli('schedule.plan.today', { date: SYNC_DAY });
  const items = r.envelope === null ? null : r.envelope.data.items;
  const synced = items === null ? -1 : items.filter((x) => x.synced === true).length;
  const text = textOf(readFileSync(join(PROD, P_SYNC), 'utf8'));
  const shown = (text.match(/已同步飞书/g) ?? []).length;
  if (synced <= 0) red('②‑3 同步之后本地这一天一条带远端标识的都没有（挡板没被真调用？）');
  else if (shown !== synced) red('②‑3 页上标成已同步的行 ' + String(shown) + ' 条 ≠ 库里的 ' + String(synced) + ' 条');
  else ok('②‑3 同步读数：' + SYNC_DAY + ' 本地 ' + String(items.length) + ' 条计划，同步后 ' + String(synced) + ' 条带上远端标识，页上逐行同数');
}

/* ─────────────────────────── ⑤ 飞书探测只读（挡板日志为证） ─────────────────────────── */

{
  const probes = rows.filter((r) => r.wake === '飞书探测');
  const syncs = rows.filter((r) => r.wake === '#20 日程管家同步');
  const wrote = probes.filter((r) => r.shimWrites.length > 0);
  if (probes.length === 0) red('⑤ 探测那几趟一件产物都没有，只读判据无从谈起');
  else if (wrote.length > 0) {
    red('⑤ 飞书探测动了远端写动作（这几趟应为纯读）：' + wrote.map((r) => r.file + '=' + r.shimWrites.join('+')).join('，'));
  } else {
    const called = probes.filter((r) => r.shimCalls > 0);
    ok('⑤ 飞书探测只读：' + String(called.length) + ' 趟走了挡板（共 '
      + String(called.reduce((s, r) => s + r.shimCalls, 0)) + ' 次调用），调用记录里零建零改零删');
  }
  if (syncs.length === 0) red('⑤ 同步那一趟没产出，探测与同步分不开');
  else if (!syncs.some((r) => r.shimWrites.includes('+create'))) {
    red('⑤ 同一只挡板跑「日程管家同步」没有真建对象（挡板或同步路径有问题，' + SYNC_DAY + ' 是未来日期本该建）');
  } else {
    ok('⑤ 同一只挡板上同步那一趟真建了对象（探测不写、同步要写，两道口子分得开）');
  }
}

/* ─────────────────────────── ① 逐场景行有交代 ─────────────────────────── */

const manifest = JSON.parse(readFileSync(join(REPO, 'docs', 'skills', 'skill-schedule', '场景清单.json'), 'utf8'));
const planRows = manifest.scenarios.filter((s) => s.domain === 'plan');
const OUR_WAKES = new Set(['#14 复盘', '#20 日程管家同步', '复盘今日', '复盘本周', '复盘本月', '复盘区间']);
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
  + '另有区间另外两档跨度与飞书探测三档共 ' + String(rows.length - productOf.size) + ' 份产物，不占清单行）');
for (const l of scenLines) lines.push(l);

const rest = planRows.length - ourRows.length;
if (rest !== SIBLING_ROWS) {
  red('行集变了：本域 ' + planRows.length + ' 行里，本票 ' + ourRows.length + ' 行、归 #787 应 ' + SIBLING_ROWS
    + ' 行，实得 ' + rest + ' 行——先核 场景清单.json 与票面切片，再改本探针');
} else {
  ok('① 不相交：本域 ' + planRows.length + ' 行＝本票 ' + ourRows.length + ' 行 ＋ 归 #787 的 ' + rest + ' 行（一个不漏、一个不重）');
}
const adminRows = manifest.scenarios.filter((s) => s.domain === 'admin').map((s) => s.scenario_id);
if (!adminRows.includes('feishu_probe')) red('admin 域的 feishu_probe 那一行不见了（清单改了就该重核本票的边界说明）');
else ok('① 边界：唤醒词「飞书探测」的页由本票出（路由在 plan），它的清单行 feishu_probe 在 admin 域，归 #790 记账');
const productIds = new Set(Object.keys(PRODUCT_OF));
for (const id of Object.keys(EXCLUDED)) {
  if (productIds.has(id)) red('同一行既判了出页又在有意不出名单里：' + id);
  if (!planRows.some((r) => r.scenario_id === id)) red('有意不出名单里有一行不在清单里（清单变了就该删）：' + id);
}

/* ─────────────────────────── ② 必现块在页上（＋ 反面判据） ─────────────────────────── */

for (const [file, blocks] of Object.entries(CONTRACT)) {
  const path = join(PROD, file);
  if (!existsSync(path)) { red('② ' + file + ' 不在盘上，块断言无从谈起'); continue; }
  const html = readFileSync(path, 'utf8');
  const body = markupOf(html);
  const text = textOf(html);
  const missing = [];
  for (const b of blocks) {
    const gone = (b.needs ?? []).filter((n) => !(n.includes('-') ? body.includes(n) : text.includes(n)));
    if (gone.length > 0) missing.push(b.block + '（缺 ' + gone.join(' ') + '）');
    const extra = (b.absent ?? []).filter((n) => text.includes(n));
    if (extra.length > 0) missing.push(b.block + '（不该有 ' + extra.join(' ') + '）');
  }
  if (missing.length > 0) red('② ' + file + ' 必现块：' + missing.join('，'));
  else ok('② ' + file + ' 必现块齐（' + blocks.length + ' 块）');
}

/** 反面判据一（#516 分隔符门那几种并列符号）：页上可见文本里一颗都不许有。 */
const BANNED_CHARS = ['·', '；', '～', '~', '、', '｜'];
/** 反面判据二（内部标识）：命令键、库列名、参数名、票号一颗都不许上屏。 */
const BANNED_WORDS = ['schedule.', 'time_start', 'time_end', 'completion_note', 'is_active', 'feishu_event_id', 'op=', 'dryRun'];
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
const FILES = [
  'plan/replayDocs.ts', 'plan/replaySections.ts', 'plan/reviewDocs.ts', 'plan/feishuDocs.ts',
  'plan/probe.ts', 'plan/handlers.ts', 'plan/sync.ts', 'plan/index.ts',
];
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
else ok('③ 代码层窄判据：本票页内件与八件页文件零裸色值／零单位字面量');

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
if (door.status !== 0) red('④ 出页门未过（整页／零外部引用／三档溢出）：exit=' + String(door.status));
else ok('④ 出页门：' + (doorOut.find((l) => l.startsWith('RESULT:')) ?? '').trim());

const sep = spawnSync(process.execPath, [join(REPO, 'packages', 'skill-calorie', 'scripts', 'audit-separators.mjs'), '--dir', PROD, '--quiet'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const sepOut = String(sep.stdout).trim().split('\n');
for (const l of sepOut) lines.push('     [分隔符门] ' + l.trim());
if (sep.status !== 0) red('④ 分隔符门有命中（exit=' + String(sep.status) + '）');
else ok('④ 分隔符门：' + (sepOut.find((l) => l.startsWith('RESULT:')) ?? '').trim());

/* ─────────────────────────── 别的域产物逐字节不变 ─────────────────────────── */

{
  const cases = [
    ['#783', join(REPO, '.scratch', 't783', '成品', 't783-清单.json')],
    ['#784', join(REPO, '.scratch', 't784', '成品', 't784-清单.json')],
    ['#785', join(REPO, '.scratch', 't785', '成品', 't785-清单.json')],
    ['#786', join(REPO, '.scratch', 't786', '成品', 't786-清单.json')],
    ['#787', join(REPO, '.scratch', 't787', '成品', 't787-清单.json')],
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
    if (diff === 0) ok('别域产物逐字节不变：' + ticket + ' 那 ' + String(same) + ' 件与它的清单逐件同');
    else ok('别域产物：' + ticket + ' 那 ' + String(list.length) + ' 件里 ' + String(diff) + ' 件与旧清单不同（该票自己的读数为准）');
  }
}

/* ─────────────────────────── 清单 ＋ 截图 ＋ 小墙 ─────────────────────────── */

writeFileSync(join(PROD, 't788-清单.json'), JSON.stringify({
  ticket: '#788',
  key: 'schedule.plan.write（review 五支 ＋ sync 两支）',
  page: '复盘（单日逐条）／复盘四档一体页（今日·本周·本月·区间）／飞书探测（三档）／日程管家同步回执',
  rows,
}, null, 2) + '\n', 'utf8');
ok('清单：' + relative(REPO, join(PROD, 't788-清单.json')).replace(/\\/g, '/') + '（rows=' + String(rows.length) + '）');

if (!NO_SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
  const shot = await shoot(files);
  if (shot === null) red('截图：CDP 未就绪（本机 Chrome／Edge 找不到？DSH_BROWSER 可指）');
  else ok('截图：' + String(shot) + ' 张（产物 × 双端 390／1280 全页）');
  const wall = buildWalls(rows.map((r) => r.file));
  if (wall.reds.length > 0) for (const w of wall.reds) red('小墙：' + w);
  else ok('小墙：手机墙 ' + String(wall.mobile) + ' 格、桌面墙 ' + String(wall.desktop) + ' 格（iframe 自带内容，零外部文件）');
}

/* ─────────────────────────── 结论 ─────────────────────────── */

const summary = 'RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL') + ' pages=' + String(files.length)
  + ' scenes=' + String(ourRows.length) + ' red=' + String(reds.length) + ' | ' + fingerprint.replace(/^FINGERPRINT:\s*/, '');
for (const l of lines) console.log(l);
if (reds.length > 0) { console.log('--- 红条 ---'); for (const r of reds) console.log('RED  ' + r); }
console.log(summary);
if (runId !== '') console.log('GATE-RUN runId=' + runId + ' cmd=node docs/skills/skill-schedule/t788-探针.mjs');
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
  const PORT = 9911 + (process.pid % 110);
  const profile = mkdtempSync(join(tmpdir(), 't788-shot-'));
  const chrome = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=' + String(PORT),
    '--user-data-dir=' + profile, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let dev = null;
  for (let i = 0; i < 120 && dev === null; i += 1) {
    try { const r = await fetch('http://127.0.0.1:' + String(PORT) + '/json/version'); if (r.ok) dev = (await r.json()).webSocketDebuggerUrl; } catch { /* 未就绪 */ }
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
      writeFileSync(join(SHOTS, basename(f, '.html') + '__截图__' + String(w) + '.png'), Buffer.from(shot.data, 'base64'));
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
  for (const [name, W, H, COLS] of [['t788-小墙-手机.html', 390, 900, 3], ['t788-小墙-桌面.html', 1280, 900, 1]]) {
    const cells = pages.map((f, i) => {
      const row = byFile.get(f);
      const srcdoc = esc(readFileSync(join(PROD, f), 'utf8'));
      return '  <figure><figcaption>' + esc(String(i + 1).padStart(2, '0') + ' ' + f)
        + '<span>' + esc(row === undefined ? '' : row.note) + '</span></figcaption>'
        + '<iframe src="about:blank" srcdoc="' + srcdoc + '" width="' + String(W) + '" height="' + String(H)
        + '" title="' + esc(f) + '"></iframe></figure>';
    }).join('\n');
    const page = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(name) + '</title>'
      + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#f5f5f7;color:#1d1d1f}'
      + '.wrap{padding:24px 20px 60px}h1{font-size:22px;font-weight:600;margin-bottom:6px}'
      + '.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px;line-height:1.7}'
      + '.grid{display:grid;grid-template-columns:repeat(' + String(COLS) + ',' + String(W) + 'px);gap:18px;align-items:start;justify-content:start}'
      + 'figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}'
      + 'figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}'
      + 'figcaption span{color:#868b93;font-weight:400;font-size:11.5px}'
      + 'iframe{display:block;border:0;background:#fff}</style></head><body><div class="wrap">'
      + '<h1>' + esc(name.replace(/^t788-小墙-|\.html$/g, '')) + '墙 · ' + String(pages.length) + ' 格 × ' + String(W) + ' 宽</h1>'
      + '<div class="sub">每格是一份产物的<b>真实渲染</b>（整页内嵌，无外部文件引用）。这一页给人看，不是交付产物。</div>'
      + '<div class="grid">\n' + cells + '\n</div></div></body></html>\n';
    writeFileSync(join(WALL, name), page, 'utf8');
    if (COLS === 3) made.mobile = pages.length; else made.desktop = pages.length;
  }
  return { mobile: made.mobile, desktop: made.desktop, reds: reds2 };
}
