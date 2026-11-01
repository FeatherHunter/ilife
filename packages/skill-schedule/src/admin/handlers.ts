/** 辅助与管理的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 *  三支（同一枚 `schedule.help.lookup`，路由预设分流，不新造 key）：
 *    · 缺省（无 `view`）：HELP 文件那一支（全程不开库，#203）；
 *    · `view=init`：初始化回执（`init_default` 那一行）：自开库建三表（幂等，
 *      已有数据一条不动），报本次新建还是沿用已有 ＋ 三张表行数 ＋ 库路径 ＋ 下一步；
 *    · `view=firstUse`：首次使用向导（`first_use` 那一行）：老侧 6 步
 *      （环境检测 → 路径确认 → 建库 → 状态确认 → 初始化报告 → 完成）＋ 飞书强引导。
 *  `q` 现找那一支照旧（按定义不落盘）。
 *
 *  自开库只发生在 init／firstUse 两支（建库就是它们的工作）；HELP 文件那一支仍然不开库。
 */
import { accessSync, constants, existsSync } from 'node:fs';
import {
  authOpenId, checkCalendar, closeScheduleDb, findLarkCli, getStatus, larkVersion,
  openScheduleDb, resolveDbDir, resolveDbPath, resolveHtmlDir,
  SchedulePolicyError,
} from '../fetch/index.js';
import { buildHelpLookup, HELP_ASSETS } from '../help/index.js';
import { resolveHelpDir } from '../help/helpPaths.js';
import { helpFileStem, buildHelpFileData, formatHelpMinute, renderHelpFileHtml } from '../help/helpFile.js';
import { helpDataKeyOf } from 'base-paint/help-key';
import { HELP_GROUPS } from '../help/scenes/help-assets.js';
import { assertHtmlSize, buildHelpItems } from '../render/index.js';
import type { ScheduleDb } from '../fetch/db.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { helpReuseWindowOf, dataKeyLine } from 'base-paint/save-html';
import {
  renderFirstUsePage, renderInitReceiptPage,
  type AdminCounts, type AdminPaths, type FirstUseStep,
} from './adminDocs.js';
import { m } from '../entries/index.js';

const HELP_MODE_FILE = 'file' as const;

/** HELP 产物吃的复用窗口（毫秒）：缺省**一天**、`reuseHours` 可改（`0`＝每次都落新的）。
 *  坏参在这里抛类型错误，出口归「参数错」那一档（exit 2），与其余四家同档。 */
const helpWindowOrFail = helpReuseWindowOf((m) => {
  throw new SchedulePolicyError('POLICY_BAD_INPUT', m);
});

/** 初始化状态：DB **文件存在**＝已初始化（照老 `render_help._is_initialized`）。
 *  判定本身异常 ⇒ `false`＝横幅照显（fail-open）。 */
function helpInitialized(): boolean {
  try { return existsSync(resolveDbPath()); } catch { return false; }
}

/** 交付索引（`list` 形）：一级分组一行，计数全**派生**自内容资产（改资产即跟变）。 */
function buildHelpIndex() {
  const items = HELP_GROUPS.map((g) => ({
    id: g.id,
    icon: g.icon,
    label: g.label,
    subgroupCount: g.subgroups.length,
    sceneCount: g.subgroups.reduce((n, s) => n + s.scenes.length, 0),
  }));
  return {
    items,
    total: items.length,
    sceneTotal: items.reduce((n, it) => n + it.sceneCount, 0),
    subgroupTotal: items.reduce((n, it) => n + it.subgroupCount, 0),
  };
}

/** 单表行数（只读；读不到给 null，页上印横线，不断整页）。 */
function tableCount(db: ScheduleDb['db'], table: string): number | null {
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM ' + table).get() as { n: unknown };
    return typeof row.n === 'number' ? row.n : null;
  } catch { return null; }
}

/** 库内读数（三张表；`getStatus` 管作息记录那一支，其余两支只数行数）。 */
function countsOf(handle: ScheduleDb): AdminCounts {
  const st = getStatus(handle);
  return {
    records: st.records,
    days: st.days,
    plans: tableCount(handle.db, 'schedule_plans'),
    summaries: tableCount(handle.db, 'daily_summary'),
    firstDate: st.firstDate,
    lastDate: st.lastDate,
  };
}

function pathsOf(dbPath: string): AdminPaths {
  return { dbDir: resolveDbDir(), dbFile: dbPath, pagesRoot: resolveHtmlDir(), helpDir: resolveHelpDir() };
}

/** 初始化回执（`view=init`）：开库建表是它自己的工作，幂等可重跑。 */
function viewInit(): ViewOut {
  const dbPath = resolveDbPath();
  const handle = openScheduleDb(dbPath);
  try {
    const counts = countsOf(handle);
    const data = {
      mode: 'init',
      created: handle.initialized,
      items: [
        { 表: m('skill-schedule.admin-handlers.c001'), 行数: counts.records },
        { 表: m('skill-schedule.admin-handlers.c002'), 行数: counts.summaries },
        { 表: m('skill-schedule.admin-handlers.c003'), 行数: counts.plans },
      ],
      total: 3,
    };
    const html = renderInitReceiptPage({ created: handle.initialized, paths: pathsOf(dbPath), counts });
    assertHtmlSize(html);
    return {
      data, html,
      ...(handle.initialized ? { notes: [m('skill-schedule.admin-handlers.c004', { p0: String(dbPath) })] } : {}),
    };
  } finally {
    closeScheduleDb(handle);
  }
}

/** 运行环境是否达标（出口预检同一条线：Node 不低于 22.13）。 */
function runtimeOk(): { ok: boolean; version: string } {
  const version = process.versions.node;
  const parts = version.split('.').map(Number);
  return { ok: parts[0] > 22 || (parts[0] === 22 && parts[1] >= 13), version };
}

/** 数据目录可写（只探，不建不写）。 */
function dataDirWritable(dir: string): boolean {
  try { accessSync(dir, constants.W_OK); return true; } catch { return false; }
}

/** 首次使用向导（`view=firstUse`）：老侧 6 步 ＋ 飞书强引导；建库幂等，已有库不重置。 */
function viewFirstUse(): ViewOut {
  const dbPath = resolveDbPath();
  const handle = openScheduleDb(dbPath);
  try {
    const paths = pathsOf(dbPath);
    const counts = countsOf(handle);
    const runtime = runtimeOk();
    const writable = dataDirWritable(paths.dbDir);
    const cli = findLarkCli();
    const version = cli === null ? null : larkVersion(cli);
    let openId: string | null = null;
    if (cli !== null) {
      try { openId = authOpenId(cli); } catch { openId = null; }
    }
    const calendar = cli === null ? false : checkCalendar(cli);
    const feishuGates = cli !== null && version !== null && openId !== null && calendar;
    const envBlocked = !runtime.ok || !writable;
    const steps: FirstUseStep[] = [
      {
        name: m('skill-schedule.admin-handlers.c005'), status: envBlocked ? 'do' : feishuGates ? 'ok' : 'todo',
        statusText: envBlocked ? m('skill-schedule.admin-handlers.c006') : feishuGates ? m('skill-schedule.admin-handlers.c007') : m('skill-schedule.admin-handlers.c008'),
        desc: m('skill-schedule.admin-handlers.c009', {
          p0: String(runtime.version),
          p1: String(String([cli !== null, version !== null, openId !== null, calendar].filter(Boolean).length)),
        }),
      },
      {
        name: m('skill-schedule.admin-handlers.c010'), status: 'ok', statusText: m('skill-schedule.admin-handlers.c011'),
        desc: m('skill-schedule.admin-handlers.c012'),
      },
      {
        name: m('skill-schedule.admin-handlers.c013'), status: 'ok', statusText: m('skill-schedule.admin-handlers.c014'),
        desc: handle.initialized ? m('skill-schedule.admin-handlers.c015') : m('skill-schedule.admin-handlers.c016'),
      },
      {
        name: m('skill-schedule.admin-handlers.c017'), status: 'ok', statusText: m('skill-schedule.admin-handlers.c018'),
        desc: m('skill-schedule.admin-handlers.c019', {
          p0: String(String(counts.records ?? '—')),
          p1: String(String(counts.days ?? '—')),
        }),
      },
      { name: m('skill-schedule.admin-handlers.c020'), status: 'ok', statusText: m('skill-schedule.admin-handlers.c021'), desc: '' },
      {
        name: m('skill-schedule.admin-handlers.c022'), status: 'ok', statusText: m('skill-schedule.admin-handlers.c023'),
        desc: m('skill-schedule.admin-handlers.c024'),
      },
    ];
    const todos: { title: string; steps: readonly string[] }[] = [];
    if (!feishuGates) {
      todos.push({
        title: m('skill-schedule.admin-handlers.c025'),
        steps: cli === null
          ? [m('skill-schedule.admin-handlers.c026'), m('skill-schedule.admin-handlers.c027')]
          : openId === null
            ? [m('skill-schedule.admin-handlers.c028'), m('skill-schedule.admin-handlers.c029')]
            : [m('skill-schedule.admin-handlers.c030'), m('skill-schedule.admin-handlers.c031')],
      });
    }
    if ((counts.records ?? 0) === 0) {
      todos.push({ title: m('skill-schedule.admin-handlers.c032'), steps: [m('skill-schedule.admin-handlers.c033'), m('skill-schedule.admin-handlers.c034')] });
    }
    steps[4] = {
      ...steps[4],
      status: todos.length === 0 ? 'ok' : 'todo',
      statusText: todos.length === 0 ? m('skill-schedule.admin-handlers.c035') : m('skill-schedule.admin-handlers.c036'),
      desc: todos.length === 0 ? m('skill-schedule.admin-handlers.c037') : m('skill-schedule.admin-handlers.c038', { p0: String(String(todos.length)) }),
    };
    // #1223：条件链抽成中转变量——整句化只认「一段文案 ＋ 若干变量」的形状，
    // 分支各自成句（CONDITIONAL 逐支建条），尾句再与分支拼成一条模板。
    const feishuBase = feishuGates
      ? m('skill-schedule.admin-handlers.c039')
      : (cli === null
        ? m('skill-schedule.admin-handlers.c040')
        : version === null
          ? m('skill-schedule.admin-handlers.c041')
          : openId === null
            ? m('skill-schedule.admin-handlers.c042')
            : m('skill-schedule.admin-handlers.c043'));
    const feishuNote = m('skill-schedule.admin-handlers.c044', { p0: String(feishuBase) });
    const scene = HELP_ASSETS.find((s) => s.id === 'first_use');
    if (scene === undefined || typeof scene.prompt_template !== 'string' || scene.prompt_template === '') {
      throw new Error('HELP 首次使用缺 prompt：内容资产无场景 first_use');
    }
    const data = {
      mode: 'firstUse',
      created: handle.initialized,
      items: steps.map((s) => ({ 步骤: s.name, 结论: s.statusText })),
      total: steps.length,
      pending: steps.filter((s) => s.status !== 'ok').length,
    };
    const html = renderFirstUsePage({
      created: handle.initialized,
      paths,
      counts,
      steps,
      todos,
      verify: [m('skill-schedule.admin-handlers.c045'), m('skill-schedule.admin-handlers.c046'), m('skill-schedule.admin-handlers.c047')],
      prompt: scene.prompt_template,
      feishu: { note: feishuNote, unavailable: !feishuGates },
    });
    assertHtmlSize(html);
    return {
      data, html,
      ...(handle.initialized ? { notes: [m('skill-schedule.admin-handlers.c048', { p0: String(dbPath) })] } : {}),
    };
  } finally {
    closeScheduleDb(handle);
  }
}

export function lookupHelp(params: Record<string, unknown>): ViewOut {
  // preset 分流（路由预设 `view`）：初始化回执与首次使用向导各走各的页，
  // HELP 文件与现找两支在下面，行为与此前逐字相同。
  if (params.view === 'init') return viewInit();
  if (params.view === 'firstUse') return viewFirstUse();
  const now = new Date();
  const q = params.q === undefined ? undefined : String(params.q);
  if (q !== undefined) {
    // 现找：只回命中，**按定义不落盘**（#843：`delivery:false` 显式表态，别与「忘了给 landing」混同）；
    // 要落盘只有用户显式给 `--html <路径>`（出口那支吃 `explicit`）。
    const all = buildHelpLookup().map((h) => ({ phrase: h.phrase, key: h.key, shape: h.shape, cli: h.cli, desc: h.desc }));
    return { data: { ...buildHelpItems(all, q), mode: 'lookup', query: q }, html: '', delivery: false };
  }
  // #245：HELP 产物吃复用窗口（缺省一天内只留一份，`reuseHours` 可改）。
  const reuseMs = helpWindowOrFail(params);
  const helpData = buildHelpFileData(now, { initialized: helpInitialized() });
  const html = renderHelpFileHtml(helpData);
  assertHtmlSize(html);
  // #1281 · 复用窗口的第四支判据（#1277 甲式）：本家 HELP 数据 ＋ 共享壳的指纹。
  // 本家数据没有 `generated_at`，分钟串嵌在 `subtitle` 里，故拿 `formatHelpMinute(now)` 当 stamp。
  const dataKey = helpDataKeyOf(helpData, formatHelpMinute(now));
  return {
    data: {
      ...buildHelpIndex(),
      mode: HELP_MODE_FILE,
      // #1277 字节口径：给了指纹就多一行不可见注释 ⇒ `data.bytes` 照**真正落盘的那一串**算，
      // 否则与 `delivery.bytes` 差这一行（`data.bytes＝delivery.bytes＝产物字节` 是交付契约）。
      bytes: Buffer.byteLength(html + dataKeyLine(dataKey), 'utf8'),
    },
    html,
    landing: { targetDir: resolveHelpDir(), stem: helpFileStem(), reuseMs, dataKey },
  };
}
