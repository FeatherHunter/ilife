#!/usr/bin/env node
// 饼干记账唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。写走 receipt（直通即真相）。
import { writeFileSync, readFileSync, copyFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  BillFetchError, BillPolicyError,
  resolveDbPath, resolveDbDir, resolveGoalsPath, assertWritablePath, openBillDb, closeBillDb,
  fetchAll, listToday, listRange, getById, searchKeyword, listByTag,
  addBill, updateBill, undoBill, restoreBill, loadGoals, saveGoals,
} from '../fetch/index.js';
import {
  validateAddInput, validateUpdateInput, needId, parseRecordOp,
  resolveQueryDate, resolveRange, parseOverviewKind, parseCompareKind, parseTrendKind,
  parseGoalOp, validateSetBudget, validateSetSaving,
  parseAccountOp, needName, validateTransfer, TRANSFER_OUT_CATEGORY, TRANSFER_IN_CATEGORY, TRANSFER_LEDGER,
  validateCategory,
} from '../policy/index.js';
import {
  billShapeFor, buildBillEnvelope, renderEnvelopeHtml, assertHtmlSize,
  templateFor, loadTemplate, fillTemplate,
  toBillItem, calcKpi, calcCategories, buildRecordToday, buildRecordRange, buildRecordSearch,
  buildRecordDetail, buildRecordReceipt, buildOverview, buildCompare, buildTrend,
  buildGoalQuery, buildAccountQuery, buildHelpItems,
  buildHelpIndex, buildHelpFileData, renderHelpFileHtml, resolveStemTarget,
  HELP_FILE_STEM, LOOKUP_FILE_STEM,
  BillRenderError,
} from '../render/index.js';
import { deliverHtml, type HtmlDelivery } from '../output.js';
import { buildHelpLookup } from '../help/index.js';
import type { BillRow } from '../fetch/db.js';

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

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const dd = String(last).padStart(2, '0');
  return { start: month + '-01', end: month + '-' + dd };
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function weekRange(): { start: string; end: string } {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const mon = new Date(now); mon.setDate(now.getDate() - day);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

/* ── #144 · 「饼干记账help」的交付装配（**在开库之前**走） ────────────────────────────────
 *
 * 缺省（不给任何参数）＝ 老实物同款 HELP 文件：`<SKILLS_DB_PATH>/biscuit_accountant_html/
 * 饼干记账_HELP_<YYYYMMDD_HHMMSS>[_N].html`，独占落盘 ＋ 绝对路径回执（`delivery` 顶层追加）。
 * 显式 `mode:"lookup"` ＝ 全量速查表文件（主体 `饼干记账_速查表`，与 HELP 分名——照 #139 判法：
 * 一个键两种产物就分成两个名字，别让用户按一个名字打开到另一个东西）。
 * 显式 `q` ＝ 现找：只回命中（stdout），`--html <路径>` 给了才落盘（检索式问答不刷目录）。
 * 全程**不开库**：初始化状态用「DB 文件是否存在」判定（见 render/helpFile.ts 头注释的取舍），
 * 免得「看帮助」把记账库 `new DatabaseSync` 出来并跑 DDL 自愈。
 */
interface DeliverIntent { readonly html?: string; readonly target: string; }
interface HelpDispatch { readonly data: unknown; readonly deliver?: DeliverIntent; }

/** 初始化状态：DB **文件存在**＝已初始化（照老 `render_help._is_initialized`）；
 *  判定本身异常 ⇒ `false`＝横幅照显（fail-open，理由见 render/helpFile.ts 头注释）。 */
function helpInitialized(): boolean {
  try { return existsSync(resolveDbPath()); } catch { return false; }
}

function dispatchHelp(params: Record<string, unknown>): HelpDispatch {
  const dbDir = resolveDbDir();
  const now = new Date();
  const mode = params.mode === undefined ? undefined : String(params.mode);
  const q = params.q === undefined ? undefined : String(params.q);
  if (mode !== undefined && q !== undefined) fail(2, '参数 q 与 mode 互斥：q＝现找，mode＝速查表产物');
  if (mode !== undefined && mode !== 'lookup') fail(2, 'mode 非法（' + String(mode) + '）：本键只认 lookup');
  if (q !== undefined) {
    const hits = buildHelpItems(buildHelpLookup(), q);
    return { data: { ...hits, mode: 'lookup', query: q } };
  }
  if (mode === 'lookup') {
    const hits = buildHelpItems(buildHelpLookup(), undefined);
    return {
      data: { ...hits, mode: 'lookup' },
      deliver: { target: resolveStemTarget(dbDir, LOOKUP_FILE_STEM, now) },
    };
  }
  const html = renderHelpFileHtml(buildHelpFileData(now, { initialized: helpInitialized() }));
  return {
    data: { ...buildHelpIndex(), mode: 'file', bytes: Buffer.byteLength(html, 'utf8') },
    deliver: { html, target: resolveStemTarget(dbDir, HELP_FILE_STEM, now) },
  };
}

// 十六键分发：读走 fetch 读，写走 fetch 写+policy 校验；未知键上游已拦，此处再拦一道。
function dispatch(key: string, params: Record<string, unknown>): unknown {
  const dbPath = resolveDbPath();
  const goalsPath = resolveGoalsPath();
  // 写键前置守卫（B6）：非 tmp 写库须 BILL_FORCE_PROD=1；读键不受影响。
  if (key === 'bill.record.add' || key === 'bill.record.update') assertWritablePath(dbPath);
  if (key === 'bill.goal.write') assertWritablePath(goalsPath);
  if (key === 'bill.account.write') { assertWritablePath(dbPath); assertWritablePath(goalsPath); }
  const handle = openBillDb(dbPath);
  try {
    if (handle.initialized) note('记账 DB 已初始化：' + dbPath);
    switch (key) {
      case 'bill.record.add': {
        const input = validateAddInput(params);
        const r = addBill(handle, input);
        const kind = typeof params.kind === 'string' ? params.kind : '';
        const extra = kind === 'photo' ? '（拍账单图片识别以外置为准）' : kind === 'batch' ? '（批量逐笔校验其一）' : kind ? `（${kind}）` : '';
        return buildRecordReceipt(`已记录：${r.category} ${r.amount.toFixed(2)}${extra}（id=${r.id}，账单回执可复制 prompt）`);
      }
      case 'bill.record.update': {
        const op = parseRecordOp(params);
        if (op === 'undo') {
          const id = needId(params);
          const r = undoBill(handle, id);
          return buildRecordReceipt(`已撤销：${r.id}（软删，恢复走 restore）`);
        }
        if (op === 'restore') {
          const id = needId(params);
          const r = restoreBill(handle, id);
          return buildRecordReceipt(`已恢复：${r.id}`);
        }
        const { id, patch } = validateUpdateInput(params);
        const r = updateBill(handle, id, patch as Partial<BillRow>);
        return buildRecordReceipt(`已修改：${r.id}（${Object.keys(patch).join('/')}）`);
      }
      case 'bill.record.today': {
        if (params.recent === true) {
          const limit = params.limit === undefined ? 10 : params.limit;
          if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 200) fail(2, 'recent limit 须为 1~200 的整数');
          const rows = fetchAll(handle).sort((a, b) => b.time.localeCompare(a.time) || b.id - a.id).slice(0, limit as number);
          return buildRecordToday('recent', rows);
        }
        const date = params.date === 'yesterday' ? yesterdayStr() : resolveQueryDate(params);
        const rows = listToday(handle, date);
        if (!rows.length) note('当日无记录：' + date + '（真实无，非故障）');
        return buildRecordToday(date, rows);
      }
      case 'bill.record.range': {
        let start: string; let end: string;
        if (typeof params.range === 'string' && params.range === 'week') ({ start, end } = weekRange());
        else if (typeof params.range === 'string' && params.range === 'month') ({ start, end } = monthRange(new Date().toISOString().slice(0, 7)));
        else if (params.start !== undefined || params.end !== undefined) ({ start, end } = resolveRange(params));
        else if (params.category !== undefined || params.account !== undefined || params.ledger !== undefined) {
          const rows = fetchAll(handle, {
            category: params.category as string | undefined,
            account: params.account as string | undefined,
            ledger: params.ledger as string | undefined,
          });
          if (!rows.length) throw new BillFetchError('BILL_EMPTY_RANGE', '条件无记录（缺失阻断，不返空统计）');
          return buildRecordRange('', '', rows);
        }
        else fail(2, '缺槽位 start/end（或 range=week/month，或 category/account/ledger 条件）');
        const rows = fetchAll(handle, {
          fromTime: start! + ' 00:00:00', toTime: end! + ' 23:59:59',
          category: params.category as string | undefined,
          account: params.account as string | undefined,
          ledger: params.ledger as string | undefined,
        });
        if (!rows.length) throw new BillFetchError('BILL_EMPTY_RANGE', `区间无记录：${start}~${end}（缺失阻断，不返空统计）`);
        return buildRecordRange(start!, end!, rows);
      }
      case 'bill.record.search': {
        const kind = params.kind === undefined ? '' : String(params.kind);
        if (kind === 'tag') {
          const tag = params.tag;
          if (typeof tag !== 'string' || !tag.trim()) fail(2, '查标签须给 tag');
          return buildRecordSearch('tag:' + (tag as string), listByTag(handle, tag as string));
        }
        if (kind === 'debt') {
          const rows = fetchAll(handle).filter((r) => r.category.startsWith('借贷/') || r.note.includes('#未还'));
          return buildRecordSearch('debt', rows);
        }
        if (kind === 'reimburse') {
          const rows = fetchAll(handle).filter((r) => r.note.includes('#待报销'));
          return buildRecordSearch('reimburse', rows);
        }
        if (kind === 'installment') {
          const rows = fetchAll(handle).filter((r) => r.category.startsWith('分期/') || r.note.includes('#分期'));
          return buildRecordSearch('installment', rows);
        }
        const q = params.q;
        if (typeof q !== 'string' || !q.trim()) fail(2, '搜备注须给 q');
        return buildRecordSearch('search:' + (q as string), searchKeyword(handle, q as string));
      }
      case 'bill.record.detail': {
        return buildRecordDetail(getById(handle, needId(params)));
      }
      case 'bill.analysis.overview': {
        const kind = parseOverviewKind(params);
        let rows: BillRow[]; let label: string = kind;
        if (params.month !== undefined) {
          const m = String(params.month);
          const { start, end } = monthRange(m);
          rows = listRange(handle, start, end); label = m;
        } else if (params.start !== undefined || params.end !== undefined) {
          const { start, end } = resolveRange(params);
          rows = listRange(handle, start, end); label = start + '~' + end;
        } else if (kind === 'monthly') {
          const { start, end } = monthRange(new Date().toISOString().slice(0, 7));
          rows = listRange(handle, start, end); label = start.slice(0, 7);
        } else {
          rows = fetchAll(handle);
        }
        if (!rows.length) throw new BillFetchError('BILL_EMPTY_RANGE', '总览区间无记录：' + label + '（缺失阻断）');
        return buildOverview(label, rows);
      }
      case 'bill.analysis.compare': {
        const kind = parseCompareKind(params);
        if (kind === 'period' || kind === 'yoy') {
          const a = params.monthA;
          const b = params.monthB;
          if (typeof a !== 'string' || typeof b !== 'string') fail(2, '对比须给 monthA/monthB（YYYY-MM）');
          const ra = monthRange(a as string); const rb = monthRange(b as string);
          const rowsA = listRange(handle, ra.start, ra.end);
          const rowsB = listRange(handle, rb.start, rb.end);
          if (!rowsA.length || !rowsB.length) throw new BillFetchError('BILL_EMPTY_RANGE', '对比区间有空（缺失阻断）');
          return buildCompare({ labelA: a as string, labelB: b as string, a: rowsA, b: rowsB });
        }
        if (kind === 'range') {
          for (const k of ['startA', 'endA', 'startB', 'endB']) if (typeof params[k] !== 'string') fail(2, '双区间对比须给 startA/endA/startB/endB');
          const rowsA = listRange(handle, params.startA as string, params.endA as string);
          const rowsB = listRange(handle, params.startB as string, params.endB as string);
          if (!rowsA.length || !rowsB.length) throw new BillFetchError('BILL_EMPTY_RANGE', '对比区间有空（缺失阻断）');
          return buildCompare({ labelA: `${params.startA}~${params.endA}`, labelB: `${params.startB}~${params.endB}`, a: rowsA, b: rowsB });
        }
        const { start, end } = resolveRange(params);
        const rows = listRange(handle, start, end);
        if (!rows.length) throw new BillFetchError('BILL_EMPTY_RANGE', '分类对比区间无记录（缺失阻断）');
        const mid = start.slice(0, 7);
        const ra = monthRange(mid);
        const rowsA = rows.filter((r) => r.time <= ra.end + ' 23:59:59');
        return buildCompare({ labelA: start + '~' + ra.end, labelB: ra.end + '~' + end, a: rowsA.length ? rowsA : rows, b: rows });
      }
      case 'bill.analysis.trend': {
        const kind = parseTrendKind(params);
        let rows: BillRow[];
        if (params.month !== undefined) {
          const { start, end } = monthRange(String(params.month));
          rows = listRange(handle, start, end);
        } else if (params.start !== undefined || params.end !== undefined) {
          const { start, end } = resolveRange(params);
          rows = listRange(handle, start, end);
        } else {
          rows = fetchAll(handle);
        }
        if (!rows.length) throw new BillFetchError('BILL_EMPTY_RANGE', '趋势区间无记录（缺失阻断）');
        const limit = params.limit === undefined ? 5 : params.limit;
        if (params.limit !== undefined && (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 50)) fail(2, 'limit 须为 1~50 的整数');
        return buildTrend(kind, rows, { limit: limit as number });
      }
      case 'bill.goal.write': {
        const op = parseGoalOp(params);
        const goals = loadGoals(goalsPath);
        if (op === 'set-budget') {
          const { month, category, amount, force } = validateSetBudget(params);
          const hit = goals.budgets.find((b) => (b as Record<string, unknown>).month === month && ((b as Record<string, unknown>).category || '') === category);
          if (hit && !force) {
            throw new BillPolicyError('POLICY_CONFLICT', `同月同分类预算已存在（${month} ${category || '全分类'} ${JSON.stringify((hit as Record<string, unknown>).amount)}），确认后加 --force 重跑`);
          }
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
          if (hit && force) {
            (hit as Record<string, unknown>).amount = amount;
            (hit as Record<string, unknown>).created_at = now;
          } else {
            const id = Math.max(0, ...goals.budgets.map((b) => Number((b as Record<string, unknown>).id) || 0)) + 1;
            goals.budgets.push({ id, month, category, amount, created_at: now });
          }
          saveGoals(goalsPath, goals);
          return buildRecordReceipt(`已设定预算：${month} ${category || '全分类'} ${amount.toFixed(2)}`);
        }
        if (op === 'set-saving') {
          const { name, amount, deadline } = validateSetSaving(params);
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const id = Math.max(0, ...goals.savings.map((b) => Number((b as Record<string, unknown>).id) || 0)) + 1;
          goals.savings.push({ id, name, amount, deadline, created_at: now });
          saveGoals(goalsPath, goals);
          return buildRecordReceipt(`已设定目标：${name} ${amount.toFixed(2)}${deadline ? '（' + deadline + ' 前）' : ''}`);
        }
        fail(2, 'goal.write 只接受 op=set-budget/set-saving');
        return null;
      }
      case 'bill.goal.query': {
        const op = parseGoalOp(params);
        const goals = loadGoals(goalsPath);
        if (op === 'budget' || params.op === undefined) {
          const month = typeof params.month === 'string' ? params.month : new Date().toISOString().slice(0, 7);
          const { start, end } = monthRange(month);
          const rows = listRange(handle, start, end);
          const items = goals.budgets.filter((b) => (b as Record<string, unknown>).month === month).map((b) => {
            const bb = b as Record<string, unknown>;
            const cat = String(bb.category || '');
            const spent = rows.filter((r) => r.amount < 0 && (cat === '' || r.category === cat || r.category.startsWith(cat + '/'))).reduce((a, r) => a + Math.abs(r.amount), 0);
            const amount = Number(bb.amount);
            return { ...bb, spent: Math.round(spent * 100) / 100, remaining: Math.round((amount - spent) * 100) / 100, rate: amount > 0 ? Math.round((spent / amount) * 1000) / 10 : 0 };
          });
          return buildGoalQuery('budget:' + month, items);
        }
        const items = goals.savings.map((s) => {
          const ss = s as Record<string, unknown>;
          const rows = fetchAll(handle);
          const net = rows.filter((r) => r.ledger !== '转账' && !r.category.startsWith('转账/')).reduce((a, r) => a + r.amount, 0);
          const amount = Number(ss.amount);
          return { ...ss, saved: Math.round(net * 100) / 100, pct: amount > 0 ? Math.round((net / amount) * 1000) / 10 : 0 };
        });
        return buildGoalQuery('saving', items);
      }
      case 'bill.account.write': {
        const op = parseAccountOp(params);
        const goals = loadGoals(goalsPath);
        if (op === 'add') {
          const name = needName(params);
          const type = typeof params.type === 'string' ? (params.type as string) : '';
          if (goals.accounts.some((a) => (a as Record<string, unknown>).name === name)) {
            throw new BillPolicyError('POLICY_CONFLICT', '账户已存在：' + name);
          }
          goals.accounts.push({ name, type, disabled: false, created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
          saveGoals(goalsPath, goals);
          return buildRecordReceipt(`已新增账户：${name}`);
        }
        if (op === 'update') {
          const name = needName(params);
          const acc = goals.accounts.find((a) => (a as Record<string, unknown>).name === name) as Record<string, unknown> | undefined;
          if (!acc) throw new BillFetchError('BILL_ACCOUNT_CORRUPT', '无此账户：' + name);
          if (typeof params['new-name'] === 'string' && (params['new-name'] as string).trim()) acc.name = (params['new-name'] as string).trim();
          if (params.disable === true) acc.disabled = true;
          if (params.enable === true) acc.disabled = false;
          saveGoals(goalsPath, goals);
          return buildRecordReceipt(`已修改账户：${String(acc.name)}`);
        }
        if (op === 'transfer') {
          const { amount, from, to, time } = validateTransfer(params);
          const t = time || new Date().toISOString().slice(0, 19).replace('T', ' ');
          addBill(handle, { category: TRANSFER_OUT_CATEGORY, amount: -amount, time: t, account: from, ledger: TRANSFER_LEDGER, currency: '人民币', note: '#转账（转出）' });
          addBill(handle, { category: TRANSFER_IN_CATEGORY, amount, time: t, account: to, ledger: TRANSFER_LEDGER, currency: '人民币', note: '#转账（转入）' });
          return buildRecordReceipt(`已转账：${from}→${to} ${amount.toFixed(2)}（双笔 #转账，不入收支）`);
        }
        fail(2, 'account.write 只接受 op=add/update/transfer');
        return null;
      }
      case 'bill.account.query': {
        const goals = loadGoals(goalsPath);
        const rows = fetchAll(handle);
        const items = goals.accounts.map((a) => {
          const aa = a as Record<string, unknown>;
          const name = String(aa.name);
          const bal = rows.filter((r) => r.account === name).reduce((s, r) => s + r.amount, 0);
          const recent = rows.filter((r) => r.account === name).sort((x, y) => y.time.localeCompare(x.time) || y.id - x.id).slice(0, 3).map(toBillItem);
          return { name, type: aa.type || '', disabled: !!aa.disabled, balance: Math.round(bal * 100) / 100, recent };
        });
        return buildAccountQuery(items);
      }
      case 'bill.link.submit': {
        const scene = params.scene === undefined ? 'purchase' : params.scene;
        if (scene !== 'purchase' && scene !== 'meal') fail(2, 'scene 非法（期望 purchase/meal）');
        const amount = params.amount;
        if (amount !== undefined) {
          const n = typeof amount === 'string' ? Number((amount as string).trim()) : amount;
          if (typeof n !== 'number' || !Number.isFinite(n) || n >= 0) fail(2, '联动金额须为负数支出');
        }
        if (scene === 'purchase') {
          const item = typeof params.item === 'string' ? params.item : '';
          return buildRecordReceipt(`已采单买东西${item ? '：' + item : ''}（主操作请先走 bill.record.add 记支出；同时录入居家管家请复制 prompt：请加载「居家管家」技能，帮我录入刚买的物品${item ? '：' + item : ''}）`);
        }
        const ate = typeof params.ate === 'string' ? params.ate : '';
        return buildRecordReceipt(`已采单吃饭${ate ? '：' + ate : ''}（主操作请先走 bill.record.add 记支出；同时记卡路里请复制 prompt：请加载「卡路里」技能，帮我记一餐${ate ? '：' + ate : ''}）`);
      }
      case 'bill.setup.run': {
        const op = typeof params.op === 'string' ? params.op : 'init-status';
        if (op === 'init') {
          return buildRecordReceipt(`已初始化：${dbPath}（幂等自愈，bills 10 列 + 索引 + deleted_at 补列）`);
        }
        if (op === 'init-status') {
          return buildRecordReceipt(`就绪：bills 表 10 列（v2.0 特征 deleted_at），库 ${dbPath}`);
        }
        if (op === 'backup-create' || op === 'backup-list') {
          const dir = join(dbPath, '..', 'backups');
          mkdirSync(dir, { recursive: true });
          if (op === 'backup-list') {
            const names = readdirSync(dir).filter((f) => f.endsWith('.db')).sort();
            return buildRecordReceipt(`备份${names.length}个${names.length ? '：' + names.slice(-5).join('、') : ''}`);
          }
          assertWritablePath(dbPath);
          closeBillDb(handle);
          const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').replace(/(\d{8})(\d{6})/, '$1_$2');
          const name = `biscuit_${stamp}.db`;
          copyFileSync(dbPath, join(dir, name));
          try { copyFileSync(goalsPath, join(dir, name.replace('.db', '.goals.json'))); } catch { /* goals 可空 */ }
          return buildRecordReceipt(`已备份：${name}`);
        }
        if (op === 'restore') {
          const name = params.name;
          const dir = join(dbPath, '..', 'backups');
          const target = typeof name === 'string' && name ? join(dir, basename(name)) : readdirSync(dir).filter((f) => f.endsWith('.db')).sort().map((f) => join(dir, f)).pop();
          if (!target || !existsSync(target as string)) throw new BillFetchError('BILL_DB_MISSING', '无可用备份（先 backup-create）');
          assertWritablePath(dbPath);
          closeBillDb(handle);
          copyFileSync(target as string, dbPath);
          return buildRecordReceipt(`已恢复：${basename(target as string)}`);
        }
        if (op === 'import') {
          const file = params.file;
          if (typeof file !== 'string' || !file) fail(2, '导入须给 file（CSV 路径）');
          if (!existsSync(file as string)) throw new BillFetchError('BILL_DB_MISSING', '导入文件不存在：' + file);
          const text = readFileSync(file as string, 'utf8');
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length < 2) throw new BillFetchError('BILL_BAD_QUERY', '导入 CSV 无数据行');
          if (params['dry-run'] === true || params.dryRun === true) {
            return buildRecordReceipt(`导入预览：${lines.length - 1} 行（dry-run，未写入）`);
          }
          assertWritablePath(dbPath);
          let n = 0;
          for (const line of lines.slice(1)) {
            const cells = line.split(',').map((c) => c.trim());
            if (cells.length < 3) continue;
            try {
              const rec = { category: validateCategory(cells[2]), amount: Number(cells[1]), time: cells[0], account: cells[3] || '', ledger: cells[4] || '生活', currency: '人民币', note: cells[5] || '' };
              if (!Number.isFinite(rec.amount)) continue;
              addBill(handle, { ...rec, amount: rec.amount });
              n++;
            } catch { /* 单行坏数据跳过，计数不含 */ }
          }
          return buildRecordReceipt(`已导入：${n} 笔（${basename(file as string)}）`);
        }
        fail(2, 'setup op 非法（期望 init/init-status/backup-create/backup-list/restore/import）');
        return null;
      }
      case 'bill.help.lookup':
        // #144：本键由 `dispatchHelp` 在**开库之前**处理（只读页不建库）；走到这里说明 main 的路由被改坏了。
        fail(1, '内部错误：bill.help.lookup 须走 dispatchHelp（开库之前）');
        return null;
      default: fail(3, '未知 bill key：' + key); return null;
    }
  } finally {
    try { closeBillDb(handle); } catch { /* ignore */ }
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
  if (!o.key) fail(2, '用法：bill-cmd-read <bill.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
  const key = o.key;
  const dbPath = preflight();
  void dbPath;
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params) as Record<string, unknown>; } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  let shape = null;
  try { shape = billShapeFor(key); } catch (e) { fail(3, (e as Error).message); }
  void shape;
  const timer = setTimeout(() => { toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数'); process.exit(4); }, o.timeout);
  timer.unref();
  let env = null;
  let delivery: HtmlDelivery | undefined;
  try {
    // #144：HELP 在开库之前分派（只读页不建库）；其余 15 键照旧走 dispatch（内部开库）。
    const help = key === 'bill.help.lookup' ? dispatchHelp(params) : null;
    const built = buildBillEnvelope(key, help ? help.data : dispatch(key, params));
    env = built;
    // B4 既有语义：`--html` 套模板输出完整收据页（section 片段经 CONTENT 注入模板，非片段直写）。
    const sectionHtml = (): string => {
      const full = fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(built));
      assertHtmlSize(full);
      return full;
    };
    if (help?.deliver !== undefined) {
      // 本键的产物：缺省＝HELP 全壳页（自带 html）；`mode:"lookup"`＝速查表分节页（由 envelope 渲染）。
      const html = help.deliver.html ?? sectionHtml();
      if (help.deliver.html !== undefined) assertHtmlSize(html);
      delivery = deliverHtml({ explicit: o.html, target: help.deliver.target, html });
    } else if (o.html) {
      delivery = deliverHtml({ explicit: o.html, html: sectionHtml() });
    }
  } catch (e) {
    if (e instanceof BillFetchError) fail(4, '取数失败：' + e.message);
    if (e instanceof BillPolicyError) fail(2, '口径失败：' + e.message);
    if (e instanceof BillRenderError) fail(5, '渲染失败：' + e.message);
    if ((e as NodeJS.ErrnoException)?.code && /^E[A-Z]+$/.test(String((e as NodeJS.ErrnoException).code))) {
      fail(5, '落盘失败：' + ((e as Error).message || String(e)));
    }
    if ((e as Error).message?.includes('SKILLS_DB_PATH')) fail(1, (e as Error).message);
    if ((e as Error).message?.includes('BILL_FORCE_PROD')) fail(1, (e as Error).message);
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally { clearTimeout(timer); }
  // #83 口径的顶层追加：`delivery{mode,path,bytes}` 只追加，既有五字段一字不改、序不变。
  process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n');
}

await main();
