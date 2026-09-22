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
import { helpFileStem, buildHelpFileData, renderHelpFileHtml } from '../help/helpFile.js';
import { HELP_GROUPS } from '../help/scenes/help-assets.js';
import { assertHtmlSize, buildHelpItems } from '../render/index.js';
import type { ScheduleDb } from '../fetch/db.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { helpReuseWindowOf } from 'base-paint/save-html';
import {
  renderFirstUsePage, renderInitReceiptPage,
  type AdminCounts, type AdminPaths, type FirstUseStep,
} from './adminDocs.js';

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
        { 表: '作息记录', 行数: counts.records },
        { 表: '每日摘要', 行数: counts.summaries },
        { 表: '日程计划', 行数: counts.plans },
      ],
      total: 3,
    };
    const html = renderInitReceiptPage({ created: handle.initialized, paths: pathsOf(dbPath), counts });
    assertHtmlSize(html);
    return {
      data, html,
      ...(handle.initialized ? { notes: ['作息 DB 已初始化：' + dbPath] } : {}),
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
        name: '环境检测', status: envBlocked ? 'do' : feishuGates ? 'ok' : 'todo',
        statusText: envBlocked ? '动手' : feishuGates ? '通过' : '待办',
        desc: '运行环境版本 ' + runtime.version + '，数据目录可写，飞书三道门里过了 '
          + String([cli !== null, version !== null, openId !== null, calendar].filter(Boolean).length) + ' 道',
      },
      {
        name: '路径确认', status: 'ok', statusText: '通过',
        desc: '库目录与产物落点已按配置文件确认，下面四行就是生效值',
      },
      {
        name: '建库', status: 'ok', statusText: '通过',
        desc: handle.initialized ? '三张表本次新建' : '三张表沿用已有，数据一条未动',
      },
      {
        name: '状态确认', status: 'ok', statusText: '通过',
        desc: '作息记录 ' + String(counts.records ?? '—') + ' 条，覆盖 ' + String(counts.days ?? '—') + ' 天',
      },
      { name: '初始化报告', status: 'ok', statusText: '通过', desc: '' },
      {
        name: '完成', status: 'ok', statusText: '通过',
        desc: '向导跑完，下一句说「作息管家 HELP」看全部功能',
      },
    ];
    const todos: { title: string; steps: readonly string[] }[] = [];
    if (!feishuGates) {
      todos.push({
        title: '飞书联动待装',
        steps: cli === null
          ? ['装好飞书命令行', '说「飞书探测」看三档']
          : openId === null
            ? ['在终端里跑一次授权登录', '说「飞书探测」看三档']
            : ['补一次日历授权', '说「飞书探测」看三档'],
      });
    }
    if ((counts.records ?? 0) === 0) {
      todos.push({ title: '记下第一条作息', steps: ['说一句记作息', '带上时间与内容'] });
    }
    steps[4] = {
      ...steps[4],
      status: todos.length === 0 ? 'ok' : 'todo',
      statusText: todos.length === 0 ? '通过' : '待办',
      desc: todos.length === 0 ? '检测项全过，无待办' : '有 ' + String(todos.length) + ' 条待办（见下表）',
    };
    const feishuNote = feishuGates
      ? '三道门都过了，同步随时可跑。想看档位就说「飞书探测」。'
      : (cli === null
        ? '本机没找到飞书命令行，同步与探测都跑不了。装它需要你自己动手，本技能不代装。'
        : version === null
          ? '飞书命令行在，但版本读不到，重装一次再探。'
          : openId === null
            ? '飞书命令行装了但没登录，先在终端里跑一次授权登录。'
            : '飞书命令行装了也登录了，但日历拉不动，补一次日历授权再探。')
      + '装好之后说「飞书探测」看三档。';
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
      verify: ['作息管家 HELP 能打开一份帮助页', '初始化回执落在产物根目录', '第一条作息已记进库里'],
      prompt: scene.prompt_template,
      feishu: { note: feishuNote, unavailable: !feishuGates },
    });
    assertHtmlSize(html);
    return {
      data, html,
      ...(handle.initialized ? { notes: ['作息 DB 已初始化：' + dbPath] } : {}),
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
  const html = renderHelpFileHtml(buildHelpFileData(now, { initialized: helpInitialized() }));
  assertHtmlSize(html);
  return {
    data: { ...buildHelpIndex(), mode: HELP_MODE_FILE, bytes: Buffer.byteLength(html, 'utf8') },
    html,
    landing: { targetDir: resolveHelpDir(), stem: helpFileStem(), reuseMs },
  };
}
