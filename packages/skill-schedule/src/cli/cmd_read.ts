#!/usr/bin/env node
// 作息管家唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。
import { existsSync } from 'node:fs';
import type { Envelope } from 'base-link-core';
import {
  ScheduleFetchError, SchedulePolicyError,
  resolveDbPath, resolveDbDir, openScheduleDb, closeScheduleDb,
  listRecordsByDate, listRecordsRange, getRecordById, getStatus, getLastRecord,
  addRecord, amendRecord, addSummary,
  listPlanEvents, getPlanEventsRange, searchPlanEvent, getPlanEvent,
  ensurePlanEvent, upsertPlanEvents, updatePlanEvent, deactivatePlanEvent, setFeishuEventId,
  larkReady, searchFeishuEvents, createFeishuEvent, updateFeishuEvent,
} from '../fetch/index.js';
import {
  resolveDateParam, resolveRangeParam, validateAddInput, validateAmendInput,
  validateSummaryInput, validateCompareInput, normalizeDate,
  validateUpsertInput, validateEnsureInput, validateUpdateInput,
  parsePlanOp, parseRecordOp, VALID_COMPLETIONS, l1Of, toMinutes,
  type ScheduleKey,
} from '../policy/index.js';
import {
  scheduleShapeFor, buildScheduleEnvelope, renderEnvelopeHtml, assertHtmlSize,
  loadTemplate, templateFor, fillTemplate,
  buildRecordToday, buildRecordRange, buildRecordDetail, buildRecordReceipt,
  buildRecordCompare, buildCategoryDeep, buildAnomaly,
  buildPlanToday, buildPlanReceipt, buildHelpItems,
  ScheduleRenderError,
} from '../render/index.js';
import { buildHelpLookup } from '../help/index.js';
import { resolveStemTarget } from '../help/helpPaths.js';
import { HELP_FILE_STEM, buildHelpFileData, renderHelpFileHtml } from '../help/helpFile.js';
import { HELP_GROUPS } from '../help/scenes/help-assets.js';
import { deliverHtml, type HtmlDelivery } from '../help/output.js';
import type { ScheduleRecord } from '../fetch/db.js';

const DEFAULT_TIMEOUT_MS = 30000;

function fail(code: number, msg: string): never { console.error('ERR ' + code + ': ' + msg); process.exit(code); }
function toast(msg: string): void { console.error('TOAST: ' + msg); }
function note(msg: string): void { console.error('NOTE: ' + msg); }

function preflight(): string {
  const v = process.versions.node.split('.').map(Number);
  if (!(v[0] > 22 || (v[0] === 22 && v[1] >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
  const p = process.env.SKILLS_DB_PATH;
  if (!p) fail(1, 'SKILLS_DB_PATH 未设置（无默认值，必设）');
  return p;
}

function needInt(params: Record<string, unknown>, name: string): number {
  const v = params[name];
  if (!Number.isInteger(v) || (v as number) <= 0) fail(2, '缺参数 ' + name + '（须为正整数）');
  return v as number;
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const dd = String(last).padStart(2, '0');
  return { start: month + '-01', end: month + '-' + dd };
}

function toISODateTime(date: string, time: string): string {
  return date + 'T' + time + ':00';
}

// ── #203 · 「作息管家help」的交付装配（**在开库之前**走，照 skill-bill/src/cli/cmd_read.ts:493-495）────
//
// 缺省（不给任何参数）＝ 全量 HELP 文件：`<SKILLS_DB_PATH>/schedule_html/help/作息管家_HELP_<YYYYMMDD_HHMMSS>[_N].html`
// （目录与通式照老实物，`t198-old-help-truth.md` 第四节），独占落盘 ＋ **绝对路径**回执
// （`delivery{mode,path,bytes}` 顶层追加，序在既有五字段之后）。
// 显式 `q` ＝ 现找：只回命中（stdout），不落盘（检索式问答不刷目录）；`--html <路径>` 给了才写那个路径。
// 全程**不开库**：初始化判据＝「DB 文件存在」（照老 `render_help._is_initialized`）；
// 否则「看帮助」会 `new DatabaseSync` 出来并跑 DDL 自愈，把库建在用户还没开始用的目录里。
const HELP_MODE_FILE = 'file' as const;

/** 交付意图：`html` 有值＝本键自带整页 HTML（缺省那支）；无值＝由 envelope 渲染（照 bill）。 */
interface DeliverIntent { readonly html?: string; readonly target: string; }
interface HelpDispatch { readonly data: unknown; readonly deliver?: DeliverIntent; }

/** 初始化状态：DB **文件存在**＝已初始化（照老 `render_help._is_initialized` 与 bill `helpInitialized`）。
 *  判定本身异常 ⇒ `false`＝横幅照显（fail-open：误显只多一条提示，误藏会让新用户找不到入口）。 */
function helpInitialized(): boolean {
  try { return existsSync(resolveDbPath()); } catch { return false; }
}

/** 交付索引（`list` 形，`schedule.help.lookup` 的缺省载荷）：一级分组一行，计数全**派生**自内容资产
 *  （改资产即跟变，不写第二份 5／34／85）。行形状照 bill `HelpIndexItem`，不下重口。 */
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

function dispatchHelp(params: Record<string, unknown>): HelpDispatch {
  const dbDir = resolveDbDir();
  const now = new Date();
  const q = params.q === undefined ? undefined : String(params.q);
  if (q !== undefined) {
    // 现找：只回命中；落盘只有用户显式给 `--html <路径>` 才发生（main 里那支）。
    const all = buildHelpLookup().map((h) => ({ phrase: h.phrase, key: h.key, shape: h.shape, cli: h.cli, desc: h.desc }));
    return { data: { ...buildHelpItems(all, q), mode: 'lookup', query: q } };
  }
  const html = renderHelpFileHtml(buildHelpFileData(now, { initialized: helpInitialized() }));
  assertHtmlSize(html);
  return {
    data: { ...buildHelpIndex(), mode: HELP_MODE_FILE, bytes: Buffer.byteLength(html, 'utf8') },
    deliver: { html, target: resolveStemTarget(dbDir, HELP_FILE_STEM, now) },
  };
}

function dispatch(key: string, params: Record<string, unknown>): unknown {
  const dbPath = resolveDbPath();
  const handle = openScheduleDb(dbPath);
  try {
    if (handle.initialized) note('作息 DB 已初始化：' + dbPath);
    switch (key) {
      case 'schedule.record.today': {
        const date = resolveDateParam(params);
        const records = listRecordsByDate(handle, date);
        const st = getStatus(handle);
        if (st.records === 0) note('库空：真实无记录（非故障）');
        return buildRecordToday(date, records);
      }
      case 'schedule.record.range': {
        const { start, end } = resolveRangeParam(params);
        const records = listRecordsRange(handle, start, end);
        if (!records.length) {
          throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '区间无记录：' + start + '~' + end + '（缺失阻断，不返空统计）');
        }
        return buildRecordRange(start, end, records);
      }
      case 'schedule.record.detail': {
        if (params.id !== undefined) return buildRecordDetail(getRecordById(handle, needInt(params, 'id')));
        const date = resolveDateParam(params);
        const records = listRecordsByDate(handle, date);
        if (!records.length) throw new ScheduleFetchError('SCHEDULE_RECORD_NOT_FOUND', '当日无记录：' + date);
        return buildRecordDetail(records[0]);
      }
      case 'schedule.record.write': {
        const op = parseRecordOp(params);
        if (op === 'add') {
          const input = validateAddInput(params);
          const r = addRecord(handle, input);
          return buildRecordReceipt('已记一条：' + r.id + '（' + r.date + ' ' + r.time_start + '~' + r.time_end + ' ' + r.category + '）');
        }
        if (op === 'amend') {
          const { id, patch } = validateAmendInput(params);
          const r = amendRecord(handle, id, patch as Partial<ScheduleRecord>);
          return buildRecordReceipt('已修正：' + r.id + '（edit_count=' + r.edit_count + '）');
        }
        const s = validateSummaryInput(params);
        addSummary(handle, s.date, s.category, s.totalMinutes);
        return buildRecordReceipt('已写摘要：' + s.date + ' ' + s.category + '=' + s.totalMinutes + '分钟');
      }
      case 'schedule.record.compare': {
        const c = validateCompareInput(params) as Record<string, unknown>;
        if (c.kind === 'months') {
          const ra = monthRange(c.monthA as string);
          const rb = monthRange(c.monthB as string);
          const a = listRecordsRange(handle, ra.start, ra.end);
          const b = listRecordsRange(handle, rb.start, rb.end);
          if (!a.length || !b.length) {
            throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '对比缺数据：' + c.monthA + '(' + a.length + '块)/' + c.monthB + '(' + b.length + '块)');
          }
          return buildRecordCompare({ labelA: c.monthA as string, labelB: c.monthB as string, a, b });
        }
        if (c.kind === 'ranges') {
          const a = listRecordsRange(handle, c.startA as string, c.endA as string);
          const b = listRecordsRange(handle, c.startB as string, c.endB as string);
          if (!a.length || !b.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '对比缺数据（两侧均须有记录）');
          return buildRecordCompare({ labelA: c.labelA as string, labelB: c.labelB as string, a, b });
        }
        if (c.kind === 'category') {
          const records = listRecordsRange(handle, c.start as string, c.end as string);
          if (!records.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '区间无记录：' + c.start + '~' + c.end);
          return buildCategoryDeep(c.start as string, c.end as string, c.category as string, records);
        }
        const w = c.windowDays as number;
        const end = c.end as string;
        const d = new Date(end + 'T00:00:00');
        d.setDate(d.getDate() - (w - 1));
        const start = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const records = listRecordsRange(handle, start, end);
        if (!records.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '窗口无记录：' + start + '~' + end);
        const byDay = new Map<string, Record<string, number>>();
        for (const r of records) {
          const m = byDay.get(r.date) || {};
          const k = l1Of(r.category);
          m[k] = (m[k] || 0) + (r.duration_minutes || 0);
          byDay.set(r.date, m);
        }
        const daily = [...byDay.entries()].sort().map(([date, byL1]) => ({ date, byL1 }));
        return buildAnomaly(end, w, daily);
      }
      case 'schedule.plan.today': {
        if (typeof params.title === 'string' && params.title.trim()) {
          const date = resolveDateParam(params);
          const hits = searchPlanEvent(
            handle, date, params.title.trim(),
            params.time_start as string | undefined, params.time_end as string | undefined,
          );
          return buildPlanToday(date, hits);
        }
        if (Array.isArray(params.dates) && params.dates.length) {
          const dates = (params.dates as unknown[]).map((x) => normalizeDate(x, 'dates[]'));
          const lo = [...dates].sort()[0];
          const hi = [...dates].sort()[dates.length - 1];
          const all = getPlanEventsRange(handle, lo, hi).filter((e) => dates.includes(e.date));
          return { items: all.map((e) => buildPlanToday(e.date, [e]).items[0]), total: all.length, date: lo + '~' + hi };
        }
        const date = resolveDateParam(params);
        return buildPlanToday(date, listPlanEvents(handle, date));
      }
      case 'schedule.plan.write': {
        const op = parsePlanOp(params);
        if (op === 'preview') {
          const { date, events } = validateUpsertInput(params);
          return buildPlanReceipt('预览通过：' + date + ' ' + events.length + ' 个事件 00:00~24:00 连续（确认后 op=upsert 落盘）');
        }
        if (op === 'upsert') {
          const { date, events } = validateUpsertInput(params);
          const out = upsertPlanEvents(handle, date, events);
          return buildPlanReceipt('已落盘：' + date + ' ' + out.length + ' 个事件');
        }
        if (op === 'ensure') {
          const input = validateEnsureInput(params);
          const { event, created } = ensurePlanEvent(handle, input);
          return buildPlanReceipt(created ? '已补计划：' + event.id : '已存在（幂等未重复）：' + event.id);
        }
        if (op === 'update') {
          const { id, patch } = validateUpdateInput(params);
          if (patch.time_start !== undefined && patch.time_end !== undefined) {
            if (toMinutes(patch.time_end as string) <= toMinutes(patch.time_start as string)) {
              throw new SchedulePolicyError('POLICY_BAD_TIME', 'time_end 必须晚于 time_start');
            }
          }
          updatePlanEvent(handle, id, patch as Partial<import('../fetch/db.js').PlanEvent>);
          return buildPlanReceipt('已改计划：' + id);
        }
        if (op === 'deactivate') {
          const id = needInt(params, 'id');
          deactivatePlanEvent(handle, id);
          return buildPlanReceipt('已删计划（软删）：' + id);
        }
        if (op === 'review') {
          const { start, end } = params.granularity === 'range' || params.start !== undefined
            ? resolveRangeParam(params)
            : { start: resolveDateParam(params), end: resolveDateParam(params) };
          const events = getPlanEventsRange(handle, start, end);
          if (!events.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '复盘无日程：' + start + '~' + end);
          const counts: Record<string, number> = {};
          for (const e of events) counts[e.completion || '未复盘'] = (counts[e.completion || '未复盘'] || 0) + 1;
          const parts = VALID_COMPLETIONS.filter((k) => counts[k]).map((k) => k + counts[k]);
          return buildPlanReceipt('已复盘 ' + start + '~' + end + '：' + events.length + ' 个事件（' + parts.join('、') + '）');
        }
        // op === 'sync'：飞书四门 + diff（local 无飞书 id→create，有→update；dryRun 只报数）。
        const gate = larkReady();
        const date = resolveDateParam(params);
        const events = listPlanEvents(handle, date, true).filter((e) => e.is_active === 1);
        if (params.dryRun === true) {
          return buildPlanReceipt('飞书就绪：' + gate.openId + '（dryRun 未同步；' + date + ' 待比 ' + events.length + ' 个事件）');
        }
        let created = 0;
        let updated = 0;
        try {
          searchFeishuEvents(gate.cliPath, date, date);
        } catch (e) {
          throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '飞书查询失败：' + (e as Error).message);
        }
        for (const e of events) {
          const s = toISODateTime(e.date, e.time_start);
          const t = toISODateTime(e.date, e.time_end);
          if (!e.feishu_event_id) {
            const r = createFeishuEvent(gate.cliPath, s, t, e.title, e.notes || '') as { eventId?: string; id?: string };
            const fid = typeof r.eventId === 'string' ? r.eventId : typeof r.id === 'string' ? r.id : null;
            setFeishuEventId(handle, e.id, fid);
            created++;
          } else {
            updateFeishuEvent(gate.cliPath, e.feishu_event_id, s, t, e.title);
            setFeishuEventId(handle, e.id, e.feishu_event_id);
            updated++;
          }
        }
        return buildPlanReceipt('已同步 ' + date + '：新建' + created + ' 更新' + updated + '（' + gate.openId + '）');
      }
      // #203：本键由 `dispatchHelp` 在**开库之前**处理（只读页不建库）；走到这里说明 main 的路由被改坏了。
      // 照 skill-bill/src/cli/cmd_read.ts:449-451 的同一道内部断言——防的是「改回无条件开库」这个静默回退。
      case 'schedule.help.lookup':
        fail(1, '内部错误：schedule.help.lookup 须走 dispatchHelp（开库之前）');
        return null;
      default: fail(3, '未知 schedule key：' + key); return null;
    }
  } finally {
    closeScheduleDb(handle);
  }
}

function parseArgs(a: string[]): { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } {
  const o: { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } = { key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i];
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i];
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || o.timeout <= 0) fail(2, '--timeout 须为正数毫秒');
    }
    else fail(2, '未知参数：' + a[i]);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.key) fail(2, '用法：schedule-cmd-read <schedule.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
  preflight();
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params); } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  try { scheduleShapeFor(o.key as ScheduleKey); } catch (e) { fail(3, (e as Error).message); }
  const key = o.key as string;
  const timer = setTimeout(() => {
    toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数');
    process.exit(4);
  }, o.timeout);
  if (typeof timer.unref === 'function') timer.unref();
  let env: Envelope | null = null;
  let delivery: HtmlDelivery | undefined;
  try {
    // #203：`schedule.help.lookup` 在**开库之前**分派（只读页不建库）；其余 7 键照旧走 dispatch（内部开库）。
    const help = key === 'schedule.help.lookup' ? dispatchHelp(params) : null;
    env = buildScheduleEnvelope(key, help ? help.data : dispatch(key, params));
    const built = env;
    // 既有语义（不破）：`--html <路径>` 直写该路径，内容＝本包 envelope 片段（模板填充后）。
    const sectionHtml = (): string => {
      const html = fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(built));
      assertHtmlSize(html);
      return html;
    };
    if (help?.deliver !== undefined) {
      // 本键的产物：缺省＝HELP 全壳页（自带 html），落盘走本包统一管线（独占 ＋ 同名递补）。
      const html = help.deliver.html ?? sectionHtml();
      if (help.deliver.html !== undefined) assertHtmlSize(html);
      delivery = deliverHtml({ explicit: o.html, target: help.deliver.target, html });
      note('HTML 已写：' + delivery.path + '（' + delivery.bytes + ' 字节 utf8）');
    } else if (o.html !== undefined) {
      delivery = deliverHtml({ explicit: o.html, html: sectionHtml() });
      note('HTML 已写：' + delivery.path + '（' + delivery.bytes + ' 字节 utf8）');
    }
    clearTimeout(timer);
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof SchedulePolicyError) fail(2, (e as Error).message);
    if (e instanceof ScheduleFetchError) fail(4, (e as Error).message);
    if (e instanceof ScheduleRenderError) fail(5, (e as Error).message);
    fail(4, '取数失败：' + (e as Error).message);
  }
  // #83／#144 口径的顶层追加：`delivery{mode,path,bytes}` 只追加，既有五字段一字不改、序不变。
  process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n');
}

void main();
