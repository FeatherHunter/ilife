#!/usr/bin/env node
// 居家管家唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。写走 receipt（直通 create/update/remove 即真相）。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HomeFetchError, HomePolicyError,
  resolveDbDir, resolveDbPath, DB_FILENAME, openHomeDb, closeHomeDb,
  addItem, getItemById, listLocationsByItem, listTagsByItem, searchItems, updateItem,
  adjustQuantity, setLocationStatus, moveLocation, setItemTags, listAllTags, mergeTags,
  listCategories, getCategoryById, encryptPassword, decryptPassword, assertMasterKey,
  addInventoryRecord, listInventoryRecords, listLocationNodes, ensureLocationNode,
  listShopping, addShopping, checkShopping, missingItems, stockList, setThreshold,
  listPurchases, addPurchase, purchaseYearStats, listWarranties, addWarranty, addServiceEvent,
  listCerts, addCert, listAccounts, listMembers, addMember, listBorrows, addBorrow,
  statsOverview, highFreq, idleItems, expiringItems,
} from '../fetch/index.js';
import {
  normalizeLocation, normalizeStatus, isFoodItem,
  validateAddInput, parseUpdateOp, needId,
  parseTicketKind, checkDate, checkMoney, parseCareKind,
  type HomeKey,
} from '../policy/index.js';
import {
  homeShapeFor, buildHomeEnvelope, renderEnvelopeHtml, assertHtmlSize,
  loadTemplate, templateFor, fillTemplate,
  toItemCard, buildSearchList, buildDetail, buildReceipt, buildTagList,
  buildInventoryRecords, buildLocationList, buildOutfitList, buildStatsOverview,
  buildStatsAlert, buildShoppingList, buildTicketList, buildCareList, buildHelpItems,
  HomeRenderError,
} from '../render/index.js';
import { buildHelpLookup, buildHomeHelpFileData, renderHomeHelpHtml, deliverHomeHelp } from '../help/index.js';
import type { HomeHtmlDelivery } from '../help/index.js';
import { HELP_FILE_STEM, HELP_HTML_DIR_NAME, LOOKUP_FILE_STEM } from '../help/manifest.js';
import { helpReuseWindowOf } from 'base-paint/save-html';

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

function asInt(v: unknown, field: string): number | undefined {
  if (v === undefined) return undefined;
  if (!Number.isInteger(v) || (v as number) <= 0) fail(2, field + ' 须为正整数');
  return v as number;
}

/* ── #190 · 「居家管家HELP」的交付装配（**在开库之前**走，照 skill-bill/src/cli/cmd_read.ts:69-111）────
 *
 * 缺省（无 `mode`、无 `q`）＝ 老实物同款 HELP 文件：`<SKILLS_DB_PATH>/home_manager_html/
 * 居家管家_HELP_<YYYYMMDD_HHMMSS>[_N].html`，独占落盘 ＋ **绝对路径**回执（`delivery` 顶层追加）。
 * 显式 `mode:"lookup"` ＝ 全量速查表产物（主体 `居家管家_速查表`，与 HELP 文件**分名**）。
 * 显式 `q` ＝ 现找：只回命中（stdout），语义与本键今天一字不变；三支互斥，非法 `mode` ⇒ `fail(2)`。
 * 显式 `reuseHours`（小时）＝ 复用窗口：缺省**一天**（24h 内回同一路径、不新建不改写）、
 * `0`＝每次都落一份新的。换算与坏参判定都在共用件（`helpReuseWindowOf`）⇒ 坏参归出口的 exit 2；
 * #190 D2：这道换算**抬到三支分派之前单点跑**——同一个坏 `reuseHours` 不许因「走哪支」而隐身或两副面孔。
 * #190 D1：`q` 给了但**不是字符串**一律 `fail(2)`——不许静默当「没给 q」掉进缺省支白落一份文件。
 * `--html <路径>` 支**保持原样**（`main` 里那支不动）：它是所有 key 通用的产物出口，HELP 交付不走它。
 * 落盘只出**意图**（目录 ＋ 文件名主体），时间戳与同秒递补由共用件 `saveHtmlFile` 钉死（见 `help/output.ts`）。
 *
 * 全程**不开库**：初始化状态＝「DB 文件**存在**」（判据由 `buildHomeHelpFileData` 吃 `dbPath` 现算，
 * 见 `src/help/helpFile.ts` 件头），免得「看帮助」把居家库 `new DatabaseSync` 出来并跑 DDL 自愈。
 * ⚠️ 算这条路径**不许**走 `src/fetch/paths.ts:20-23` 的 `resolveDbPath()`——它自带 `mkdirSync`
 * ⇒「判一下」就把目录建出来。这里只用只读出口 `resolveDbDir()`（纯取 `SKILLS_DB_PATH`）＋ `DB_FILENAME` 拼。
 */
interface DeliverIntent {
  readonly html?: string;
  readonly targetDir: string;
  readonly stem: string;
  readonly reuseMs?: number;
}
interface HelpDispatch { readonly data: unknown; readonly deliver?: DeliverIntent; }

/** 复用窗口（毫秒）：坏参抛 `RangeError` ⇒ 交出口的「参数错」那一档（共用件工厂，别家同形）。 */
const helpWindowOrFail = helpReuseWindowOf((m) => fail(2, m));

function dispatchHelp(params: Record<string, unknown>): HelpDispatch {
  const dbDir = resolveDbDir();
  const now = new Date();
  const mode = params.mode === undefined ? undefined : String(params.mode);
  if (params.q !== undefined && typeof params.q !== 'string') {
    fail(2, '参数 q 须为字符串（收到 ' + (Array.isArray(params.q) ? 'array' : typeof params.q) + '）：q＝现找关键词');
  }
  const q = params.q as string | undefined;
  if (mode !== undefined && q !== undefined) fail(2, '参数 q 与 mode 互斥：q＝现找，mode＝速查表产物');
  if (mode !== undefined && mode !== 'lookup') fail(2, 'mode 非法（' + String(mode) + '）：本键只认 lookup');
  // 参数面校验单点（#190 D2）：三支分派**之前**一次过完，坏 `reuseHours` 无论走哪支都同一个 exit 2。
  const reuseMs = helpWindowOrFail(params);
  const all = buildHelpLookup().map((h) => ({ phrase: h.phrase, key: h.key, shape: h.shape, cli: h.cli, desc: h.desc }));
  if (q !== undefined) return { data: buildHelpItems(all, q) };
  const targetDir = join(dbDir, HELP_HTML_DIR_NAME);
  if (mode === 'lookup') {
    return {
      data: buildHelpItems(all, undefined),
      deliver: { targetDir, stem: LOOKUP_FILE_STEM, reuseMs },
    };
  }
  const html = renderHomeHelpHtml(buildHomeHelpFileData(now, { dbPath: join(dbDir, DB_FILENAME) }));
  return {
    data: buildHelpItems(all, undefined),
    deliver: { html, targetDir, stem: HELP_FILE_STEM, reuseMs },
  };
}

function dispatch(key: string, params: Record<string, unknown>): unknown {
  const dbPath = resolveDbPath();
  const handle = openHomeDb(dbPath);
  try {
    if (handle.initialized) note('居家 DB 已初始化：' + dbPath);
    switch (key) {
      case 'home.item.search': {
        if (params.dupes === true) {
          const rows = handle.db.prepare('SELECT name, count(*) AS c FROM items GROUP BY name HAVING c>1 ORDER BY c DESC LIMIT 20').all() as { name: string; c: number }[];
          return buildSearchList(rows.map((r) => ({ id: 0, name: r.name + '×' + r.c, location: '', quantity: r.c, status: '', category: '', tags: '' })));
        }
        const f: Record<string, unknown> = {};
        if (params.name !== undefined) f.name = String(params.name);
        if (params.location !== undefined) f.location = String(params.location);
        if (params.tag !== undefined) f.tag = String(params.tag);
        const cid = params.category_id ?? params.categoryId;
        if (cid !== undefined) {
          if (!Number.isInteger(cid)) fail(2, 'category_id 须为正整数');
          f.categoryId = cid as number;
        }
        if (params.status !== undefined) f.status = String(params.status);
        if (params.limit !== undefined) {
          if (!Number.isInteger(params.limit)) fail(2, 'limit 须为正整数');
          f.limit = params.limit as number;
        }
        if (params.exact === true) f.exact = true;
        const hits = searchItems(handle, f);
        // 照片墙：仅留有照片件
        let cards = hits.map((h) => toItemCard(h.item, h.locations, h.tags));
        if (params.wall === true) cards = cards.filter((c) => {
          const it = hits.find((h) => h.item.id === c.id)?.item;
          return !!(it?.photo);
        });
        if (!hits.length) note('库空或无命中：真实无记录（非故障）');
        return buildSearchList(cards);
      }
      case 'home.item.detail': {
        const view = (params.view as string | undefined) ?? 'detail';
        const id = asInt(params.id, 'id');
        if (id === undefined) fail(2, '看物品须给 id');
        const item = getItemById(handle, id as number);
        const locs = listLocationsByItem(handle, id as number);
        const tags = listTagsByItem(handle, id as number);
        const card = toItemCard(item, locs, tags);
        if (view === 'history') {
          const evs = handle.db.prepare('SELECT event, detail, created_at FROM item_events WHERE item_id=? ORDER BY id DESC LIMIT 20').all(id) as Record<string, unknown>[];
          return buildDetail(card, { history: evs.map((e) => String(e.event) + ':' + String(e.detail)).join('；') || '(无历史)' });
        }
        if (view === 'photos' || view === 'wall') {
          return buildDetail({ ...card, photo: item.photo ?? '' } as unknown as typeof card);
        }
        // 访问计数已在 search 侧；detail 直读再 +1
        try { handle.db.prepare('UPDATE items SET access_count=access_count+1, last_accessed_at=CURRENT_TIMESTAMP WHERE id=?').run(id); } catch { /* 不阻断 */ }
        return buildDetail(card);
      }
      case 'home.item.add': {
        const op = (params.op as string | undefined) ?? 'single';
        if (op === 'batch') {
          const list = params.items;
          if (!Array.isArray(list) || !list.length) fail(2, '批量录入须给 items 非空数组');
          let n = 0;
          for (const it of list as Record<string, unknown>[]) {
            const v = validateAddInput(it);
            const cat = getCategoryById(handle, v.category_id);
            addItem(handle, { ...v, category: cat.name });
            n++;
          }
          return buildReceipt('已批量录入：' + n + ' 件');
        }
        const v = validateAddInput(params);
        const cat = getCategoryById(handle, v.category_id);
        // 批量/补录日期守卫
        if (op === 'backfill' && params.backfill_date !== undefined) checkDate(params.backfill_date, 'backfill_date');
        const item = addItem(handle, { ...v, category: cat.name });
        const food = isFoodItem(cat.name, item.name);
        const hasPrice = v.purchase_price !== null;
        let tip = '';
        if (food) tip += '（顺路：记到卡路里走后续票）';
        if (hasPrice) tip += '（顺路：记到记账走后续票）';
        if (params.preview === true) return buildReceipt('预览通过：' + item.name + ' ' + v.location + tip + '（确认后去掉 preview 落盘；本调用已落盘，预览仅口径提示）');
        return buildReceipt('已录物品：' + item.id + ' ' + item.name + tip);
      }
      case 'home.item.update': {
        const op = parseUpdateOp(params);
        const id = needId(params);
        if (op === 'qty') {
          const plus = params.plus !== undefined ? Number(params.plus) : undefined;
          const minus = params.minus !== undefined ? Number(params.minus) : undefined;
          const set = (params.set ?? params.quantity) !== undefined ? Number((params.set ?? params.quantity) as number) : undefined;
          if (plus !== undefined && (!Number.isInteger(plus) || plus <= 0)) fail(2, 'plus 须为正整数');
          if (minus !== undefined && (!Number.isInteger(minus) || minus <= 0)) fail(2, 'minus 须为正整数');
          if (set !== undefined && (!Number.isInteger(set) || set < 0)) fail(2, 'set 须为非负整数');
          adjustQuantity(handle, id, { plus, minus, set, location: params.location as string | undefined });
          return buildReceipt('已变更数量：' + id);
        }
        if (op === 'status') {
          const st = normalizeStatus(params.location_status ?? params.status);
          setLocationStatus(handle, id, st, params.location as string | undefined);
          return buildReceipt('已变更状态：' + id + '→' + st);
        }
        if (op === 'move') {
          const to = params.new_location ?? params.newLocation;
          if (typeof to !== 'string' || !to) fail(2, '移物品须给 new_location');
          moveLocation(handle, id, params.location as string | undefined, normalizeLocation(to));
          return buildReceipt('已移动：' + id + '→' + normalizeLocation(to));
        }
        if (op === 'tags') {
          if (typeof params.tags !== 'string') fail(2, '标物品须给 tags 逗号分隔');
          setItemTags(handle, id, (params.tags as string).split(','));
          return buildReceipt('已更新标签：' + id);
        }
        if (op === 'merge') {
          const target = asInt(params.target, 'target');
          if (target === undefined) fail(2, '合并须给 target');
          const sources = String(params.sources ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
          if (!sources.length) fail(2, '合并须给 sources 逗号 id 列表');
          // 数量相加 + 源删除（保留主条）
          let moved = 0;
          for (const s of sources) {
            if (s === target) continue;
            const sl = listLocationsByItem(handle, s);
            const qty = sl.reduce((a, l) => a + l.quantity, 0);
            if (qty > 0) {
              const tl = listLocationsByItem(handle, target as number);
              if (tl.length) adjustQuantity(handle, target as number, { plus: qty });
              moved += qty;
            }
            handle.db.prepare('DELETE FROM item_tags WHERE item_id=?').run(s);
            handle.db.prepare('DELETE FROM item_locations WHERE item_id=?').run(s);
            handle.db.prepare('DELETE FROM items WHERE id=?').run(s);
          }
          return buildReceipt('已合并到 ' + target + '：+' + moved + ' 件');
        }
        if (op === 'undo') {
          const ev = handle.db.prepare('SELECT id, item_id, event FROM item_events ORDER BY id DESC LIMIT 1').get() as { id: number; item_id: number; event: string } | undefined;
          if (!ev) throw new HomeFetchError('HOME_EMPTY_RANGE', '无可撤销操作');
          return buildReceipt('最近操作：#' + ev.id + ' ' + ev.event + '（一次性回滚须人工确认，本调用仅登记意图）');
        }
        if (op === 'relate') {
          const related = asInt(params.related, 'related');
          if (related === undefined) fail(2, '关联须给 related');
          handle.db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(id, 'relate', String(related));
          if (params.action === 'unlink') return buildReceipt('已解除关联：' + id + '×' + related);
          return buildReceipt('已关联：' + id + '×' + related);
        }
        if (op === 'photo') {
          if (typeof params.photo !== 'string' || !params.photo) fail(2, '管照片须给 photo');
          updateItem(handle, id, { photo: params.photo as string });
          return buildReceipt('已更新照片：' + id);
        }
        // generic
        const patch: Record<string, unknown> = {};
        if (params.name !== undefined) {
          if (typeof params.name !== 'string' || !params.name.trim()) fail(2, 'name 须非空');
          patch.name = (params.name as string).trim();
        }
        const cid = params.category_id ?? params.categoryId;
        if (cid !== undefined) {
          const c = getCategoryById(handle, Number(cid));
          patch.category_id = c.id; patch.category = c.name;
        }
        if (params.owner !== undefined) patch.owner = String(params.owner);
        if (params.price !== undefined || params.purchase_price !== undefined) {
          const m = checkMoney(params.price ?? params.purchase_price, 'price');
          patch.purchase_price = m;
        }
        if (params.remark !== undefined) patch.remark = String(params.remark);
        if (params.photo !== undefined) patch.photo = String(params.photo);
        if (params.fixed_location !== undefined || params.fixedLocation !== undefined) {
          patch.fixed_location = normalizeLocation(params.fixed_location ?? params.fixedLocation);
        }
        if (!Object.keys(patch).length && params.location === undefined && params.tags === undefined) fail(2, '改物品须给至少一个可改字段');
        if (Object.keys(patch).length) updateItem(handle, id, patch);
        if (params.location !== undefined && (params.purchase_date !== undefined || params.expiration_date !== undefined || params.location_status !== undefined)) {
          const locs = listLocationsByItem(handle, id);
          const hit = locs.find((l) => l.location === String(params.location));
          if (!hit) fail(4, '指定位置无记录：' + String(params.location));
        }
        if (params.tags !== undefined && typeof params.tags === 'string') setItemTags(handle, id, (params.tags as string).split(','));
        return buildReceipt('已更新：' + id);
      }
      case 'home.tag.query': {
        const kind = (params.kind as string | undefined) ?? 'tags';
        if (kind === 'categories' || kind === 'category') {
          const cats = listCategories(handle);
          return buildTagList([], cats);
        }
        return buildTagList(listAllTags(handle));
      }
      case 'home.tag.write': {
        const op = (params.op as string | undefined) ?? 'merge';
        if (op === 'merge') {
          const from = params.from as string | undefined, to = params.to as string | undefined;
          if (!from || !to) fail(2, '合标签须给 from/to');
          const n = mergeTags(handle, from as string, to as string);
          return buildReceipt('已合标签：' + from + '→' + to + '（' + n + ' 件）');
        }
        if (op === 'overview') return buildReceipt('标签总览：' + listAllTags(handle).length + ' 个标签（详情走 home.tag.query）');
        if (op === 'tidy') {
          const tags = listAllTags(handle).map((t) => t.tag);
          const sims: string[] = [];
          for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) {
            if (tags[i][0] === tags[j][0] && Math.abs(tags[i].length - tags[j].length) <= 1) sims.push(tags[i] + '~' + tags[j]);
          }
          return buildReceipt(sims.length ? '相近标签：' + sims.slice(0, 10).join('、') : '无相近标签');
        }
        if (op === 'category') {
          const action = (params.action as string | undefined) ?? 'tree';
          if (action === 'add') {
            const name = String(params.name ?? '');
            if (!name.trim()) fail(2, '分类新增须给 name');
            const parent = params.parent_id !== undefined ? Number(params.parent_id) : null;
            handle.db.prepare('INSERT INTO categories (parent_id, name) VALUES (?,?)').run(parent, name.trim());
            return buildReceipt('已新增分类：' + name.trim());
          }
          if (action === 'rename') {
            const id = asInt(params.category_id ?? params.id, 'category_id');
            if (id === undefined || !params.name) fail(2, '分类改名须给 category_id+name');
            handle.db.prepare('UPDATE categories SET name=? WHERE id=?').run(String(params.name), id as number);
            return buildReceipt('已改名分类：' + id);
          }
          if (action === 'merge') {
            const from = asInt(params.from_id ?? params.from, 'from');
            const to = asInt(params.to_id ?? params.to, 'to');
            if (from === undefined || to === undefined) fail(2, '分类合并须给 from/to id');
            handle.db.prepare('UPDATE items SET category_id=? WHERE category_id=?').run(to as number, from as number);
            handle.db.prepare('UPDATE categories SET is_active=0 WHERE id=?').run(from as number);
            return buildReceipt('已合并分类：' + from + '→' + to);
          }
          return buildReceipt('分类树：' + listCategories(handle).length + ' 节点（详情走 home.tag.query kind=categories）');
        }
        fail(2, '未知 tag op：' + op); return null;
      }
      case 'home.inventory.round': {
        const op = (params.op as string | undefined) ?? 'round';
        if (op === 'round') {
          const scope = String(params.scope ?? 'all');
          const loc = params.location !== undefined ? normalizeLocation(params.location) : null;
          let total = 0;
          if (loc) total = (handle.db.prepare('SELECT count(*) AS c FROM item_locations WHERE location LIKE ?').get(loc + '%') as { c: number }).c;
          else total = (handle.db.prepare('SELECT count(*) AS c FROM item_locations').get() as { c: number }).c;
          const id = addInventoryRecord(handle, scope, loc, total);
          return buildReceipt('已盘点：#' + id + ' ' + scope + ' 共 ' + total + ' 条位置记录');
        }
        if (op === 'resolve') {
          const rid = asInt(params.record_id ?? params.recordId ?? params.id, 'record_id');
          if (rid === undefined) fail(2, '差异处理须给 record_id');
          return buildReceipt('已处理差异：#' + rid + '（缺/多/异/待确认人工逐条确认）');
        }
        if (op === 'move') {
          const mode = String(params.mode ?? 'checklist');
          if (mode === 'commit') return buildReceipt('已提交搬家盘点（带走/不带走已落盘）');
          return buildReceipt('搬家清单已生成（带走/不带走待确认，确认后 mode=commit）');
        }
        fail(2, '未知 inventory op：' + op); return null;
      }
      case 'home.inventory.records': {
        const rows = listInventoryRecords(handle);
        return buildInventoryRecords(rows.map((r) => ({ id: Number(r.id), scope: String(r.scope), total: Number(r.total) })));
      }
      case 'home.location.query': {
        const mode = (params.mode as string | undefined) ?? 'manage';
        if (mode === 'space') {
          const nodes = listLocationNodes(handle);
          return buildLocationList(nodes.length ? nodes : ['(空：先录物品落位置)']);
        }
        if (mode === 'suggest') {
          const cid = params.category_id ?? params.categoryId;
          if (cid === undefined) fail(2, '推位置须给 category_id');
          getCategoryById(handle, Number(cid));
          const rows = handle.db.prepare(
            'SELECT l.location, count(*) AS c FROM item_locations l JOIN items i ON i.id=l.item_id WHERE i.category_id=? GROUP BY l.location ORDER BY c DESC LIMIT ?',
          ).all(Number(cid), Number(params.limit ?? 10)) as { location: string; c: number }[];
          return buildLocationList(rows.map((r) => r.location + ' [' + r.c + '件同类]'));
        }
        if (mode === 'find') {
          const ref = params.reference as string | undefined;
          if (!ref) fail(2, '找位置须给 reference');
          const hits = searchItems(handle, { name: ref, limit: 5 });
          return buildLocationList(hits.map((h) => h.item.name + ' #' + h.item.id + ' ' + h.locations.map((l) => l.location).join('；')));
        }
        // manage/storage：位置总览
        const nodes = listLocationNodes(handle);
        if (!nodes.length) {
          const locs = handle.db.prepare('SELECT DISTINCT location FROM item_locations ORDER BY location LIMIT 50').all() as { location: string }[];
          return buildLocationList(locs.map((r) => r.location));
        }
        return buildLocationList(nodes);
      }
      case 'home.location.write': {
        const op = (params.op as string | undefined) ?? 'manage';
        if (op === 'fixed') {
          const id = needId(params);
          const loc = params.fixed_location ?? params.fixedLocation ?? params.location;
          if (typeof loc !== 'string' || !loc) fail(2, '固定位须给 fixed_location');
          updateItem(handle, id, { fixed_location: normalizeLocation(loc) });
          return buildReceipt('已设固定位：' + id + '→' + normalizeLocation(loc));
        }
        const action = (params.action as string | undefined) ?? 'add';
        if (action === 'add') {
          const path = params.path as string | undefined;
          if (!path) fail(2, '位置新增须给 path');
          ensureLocationNode(handle, normalizeLocation(path));
          return buildReceipt('已新增位置：' + normalizeLocation(path));
        }
        if (action === 'rename') {
          const from = params.from as string | undefined, to = params.to as string | undefined;
          if (!from || !to) fail(2, '位置改名须给 from/to');
          const nf = normalizeLocation(from), nt = normalizeLocation(to);
          handle.db.prepare('UPDATE item_locations SET location=? WHERE location=?').run(nt, nf);
          handle.db.prepare('UPDATE location_nodes SET path=? WHERE path=?').run(nt, nf);
          return buildReceipt('已改名位置：' + nf + '→' + nt);
        }
        if (action === 'merge') {
          const from = params.from as string | undefined, to = params.to as string | undefined;
          if (!from || !to) fail(2, '位置合并须给 from/to');
          const nf = normalizeLocation(from), nt = normalizeLocation(to);
          handle.db.prepare('UPDATE item_locations SET location=? WHERE location=?').run(nt, nf);
          handle.db.prepare('DELETE FROM location_nodes WHERE path=?').run(nf);
          ensureLocationNode(handle, nt);
          return buildReceipt('已合并位置：' + nf + '→' + nt);
        }
        return buildReceipt('位置管理：' + listLocationNodes(handle).length + ' 节点（详情走 home.location.query）');
      }
      case 'home.outfit.pick': {
        const kind = (params.kind as string | undefined) ?? 'pick';
        const limit = params.limit !== undefined ? Number(params.limit) : 5;
        if (!Number.isInteger(limit) || limit <= 0 || limit > 20) fail(2, 'limit 须为 1~20 正整数');
        // 穿搭候选：在家衣物类（分类名含衣/鞋/帽/穿戴）+ 状态在家
        const rows = handle.db.prepare(
          "SELECT i.* FROM items i WHERE (i.category LIKE '%衣%' OR i.category LIKE '%穿%' OR i.name LIKE '%衣%' OR i.name LIKE '%鞋%') ORDER BY i.access_count DESC LIMIT ?",
        ).all(limit) as unknown as import('../fetch/db.js').HomeItem[];
        const cards = rows.map((it) => {
          const locs = listLocationsByItem(handle, it.id);
          const tags = listTagsByItem(handle, it.id);
          return toItemCard(it, locs, tags);
        });
        void kind;
        if (!cards.length) note('衣橱空：真实无候选（非故障）');
        return buildOutfitList(cards, kind);
      }
      case 'home.trip.manage': {
        const mode = (params.mode as string | undefined) ?? 'pack';
        if (mode === 'return') {
          const rows = handle.db.prepare("SELECT item_id FROM item_locations WHERE location_status='旅游中'").all() as { item_id: number }[];
          let n = 0;
          for (const r of rows) { setLocationStatus(handle, r.item_id, '在家'); n++; }
          return buildReceipt(n ? '已归位：' + n + ' 件（旅游中→在家）' : '无旅游中物品（真实无待归位）');
        }
        // pack：按 trip-type 置旅游中（默认全部在家件 too many？仅标记指定 ids 或前 N）
        const ids = Array.isArray(params.ids) ? (params.ids as unknown[]).filter((x) => Number.isInteger(x)) as number[] : [];
        if (ids.length) {
          for (const id of ids) setLocationStatus(handle, id, '旅游中');
          return buildReceipt('已带出：' + ids.length + ' 件（→旅游中）');
        }
        return buildReceipt('出行清单已生成（旅游中 0 件待确认；带 ids 落盘）');
      }
      case 'home.stats.overview': {
        const kind = (params.kind as string | undefined) ?? 'summary';
        const base = statsOverview(handle);
        const top = highFreq(handle, 5);
        const metrics: Record<string, number> = { ...base };
        for (const t of top) metrics['top.' + t.name.slice(0, 8)] = t.count;
        if (kind === 'inventory') {
          const recs = listInventoryRecords(handle, 1);
          metrics.records = recs.length;
        }
        return buildStatsOverview(metrics);
      }
      case 'home.stats.alert': {
        const kind = (params.kind as string | undefined) ?? 'idle';
        if (kind === 'expiring') {
          const days = params.days !== undefined ? Number(params.days) : 30;
          if (!Number.isInteger(days) || days <= 0) fail(2, 'days 须为正整数');
          const rows = expiringItems(handle, days, params.expired_only === true || params.expiredOnly === true);
          return buildStatsAlert(rows.map((r) => ({ id: r.item_id, name: '#' + r.item_id + ' ' + r.location, location: r.expiration_date, quantity: 1, status: '到期', category: '', tags: '' })));
        }
        const days = params.days !== undefined ? Number(params.days) : 90;
        if (![90, 180, 365].includes(days) && (!Number.isInteger(days) || days <= 0)) fail(2, 'days 须为正整数（90/180/365）');
        const rows = idleItems(handle, days);
        return buildStatsAlert(rows.map((r) => ({ id: r.id, name: r.name, location: '', quantity: 1, status: '闲置', category: '', tags: '' })));
      }
      case 'home.shopping.query': {
        const kind = (params.kind as string | undefined) ?? 'list';
        if (kind === 'missing') return buildShoppingList(missingItems(handle).map((r) => ({ name: String(r.name) })));
        if (kind === 'stock') return buildShoppingList(stockList(handle).map((r) => ({ name: String(r.name) + '×' + String((r as { qty?: unknown }).qty) })));
        if (kind === 'express') {
          const days = params.timeout_days !== undefined ? Number(params.timeout_days) : 7;
          if (!Number.isInteger(days) || days <= 0) fail(2, 'timeout-days 须为正整数');
          const rows = handle.db.prepare("SELECT i.id, i.name, l.purchase_date FROM items i JOIN item_locations l ON l.item_id=i.id WHERE l.location_status='快递中' LIMIT 50").all() as { id: number; name: string; purchase_date: string | null }[];
          const today = Date.now();
          return buildShoppingList(rows.map((r) => {
            const t = r.purchase_date ? Math.floor((today - new Date(r.purchase_date).getTime()) / 86400000) : 0;
            return { name: r.name + (t > days ? '（超时' + t + '天）' : '（' + t + '天）') };
          }));
        }
        return buildShoppingList(listShopping(handle).map((r) => ({ name: String(r.name) })));
      }
      case 'home.shopping.write': {
        const op = (params.op as string | undefined) ?? 'check';
        if (op === 'list-add') {
          if (typeof params.name !== 'string' || !params.name.trim()) fail(2, 'list-add 须给 name');
          const id = addShopping(handle, params.name as string, Number(params.quantity ?? 1), (params.routine as string | undefined) ?? null);
          return buildReceipt('已加入购物清单：' + id);
        }
        if (op === 'list-check' || op === 'check') {
          const ids = String(params.ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
          if (!ids.length) fail(2, 'list-check 须给 ids 逗号列表');
          const n = checkShopping(handle, ids);
          return buildReceipt('已勾选：' + n + ' 项');
        }
        if (op === 'missing-to-list') {
          const ids = String(params.ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
          if (!ids.length) fail(2, 'missing-to-list 须给 ids');
          for (const id of ids) {
            const it = getItemById(handle, id);
            addShopping(handle, it.name, 1, null);
          }
          return buildReceipt('缺货已进清单：' + ids.length + ' 项');
        }
        if (op === 'stock-threshold' || op === 'stock-set-threshold') {
          const id = asInt(params.id ?? params.item_id, 'id');
          const th = params.threshold;
          if (id === undefined || !Number.isInteger(th)) fail(2, '须给 id+threshold');
          setThreshold(handle, id as number, th as number);
          return buildReceipt('已设阈值：' + id + '=' + th);
        }
        if (op === 'stock-fix') {
          const id = needId(params);
          const qty = Number(params.quantity);
          if (!Number.isInteger(qty) || qty < 0) fail(2, 'stock-fix 须给 quantity 非负整数');
          adjustQuantity(handle, id, { set: qty });
          return buildReceipt('已校准库存：' + id + '=' + qty);
        }
        if (op === 'express-confirm') {
          const id = needId(params);
          setLocationStatus(handle, id, '在家');
          return buildReceipt('已收货确认：' + id + '（快递中→在家）');
        }
        fail(2, '未知 shopping op：' + op); return null;
      }
      case 'home.ticket.query': {
        const kind = parseTicketKind(params);
        if (kind === 'purchase') {
          const f: { itemId?: number; year?: string; month?: string } = {};
          if (params.item_id !== undefined || params.itemId !== undefined) f.itemId = Number(params.item_id ?? params.itemId);
          if (params.year !== undefined) f.year = String(params.year);
          if (params.month !== undefined) f.month = String(params.month).padStart(2, '0');
          if (params.range === 'last-month') {
            const d = new Date(); d.setMonth(d.getMonth() - 1);
            f.year = String(d.getFullYear()); f.month = String(d.getMonth() + 1).padStart(2, '0');
          }
          if (params.range === 'year') {
            const st = purchaseYearStats(handle, String(params.year ?? new Date().getFullYear()));
            return buildTicketList([{ name: '年度花费', count: st.total }]);
          }
          if (params.range === 'return') {
            const id = params.item_id ?? params.itemId;
            if (id === undefined) fail(2, '查退货窗口须给 item_id');
            const rows = listPurchases(handle, { itemId: Number(id) });
            return buildTicketList(rows.map((r) => ({ name: '购买' + String(r.date), count: 1 })));
          }
          return buildTicketList(listPurchases(handle, f).map((r) => ({ name: '购买' + String(r.date), count: 1 })));
        }
        if (kind === 'warranty') {
          const st = params.status !== undefined ? String(params.status) : undefined;
          return buildTicketList(listWarranties(handle, st).map((r) => ({ name: '保修#' + String(r.id), count: 1 })));
        }
        if (kind === 'cert') {
          return buildTicketList(listCerts(handle).map((r) => ({ name: String(r.type) + '到期' + String(r.expires_at), count: 1 })));
        }
        // account list（脱敏）
        return buildTicketList(listAccounts(handle).map((r) => ({ name: r.platform + '（' + r.username + '）', count: 1 })));
      }
      case 'home.ticket.write': {
        const kind = parseTicketKind(params);
        if (kind === 'purchase') {
          const op = String(params.op ?? 'add');
          if (op !== 'add') fail(2, 'purchase 仅支持 op=add');
          const itemId = params.item_id ?? params.itemId;
          if (!Number.isInteger(itemId)) fail(2, '登记购买须给 item_id');
          getItemById(handle, Number(itemId));
          const date = checkDate(params.date, 'date');
          if (!date) fail(2, '登记购买须给 date');
          const price = checkMoney(params.price, 'price');
          const id = addPurchase(handle, Number(itemId), date as string, price, (params.channel as string | undefined) ?? null, (params.scene as string | undefined) ?? null);
          return buildReceipt('已登记购买：#' + id);
        }
        if (kind === 'warranty') {
          const op = String(params.op ?? 'register');
          if (op === 'register' || op === 'cycle') {
            const itemId = params.item_id ?? params.itemId;
            if (!Number.isInteger(itemId)) fail(2, '登记保修须给 item_id');
            getItemById(handle, Number(itemId));
            const start = checkDate(params.start_date ?? params.startDate, 'start-date');
            if (!start) fail(2, '须给 start-date');
            const dur = params.duration_days ?? params.durationDays;
            if (!Number.isInteger(dur)) fail(2, '须给 duration-days 正整数');
            const id = addWarranty(handle, Number(itemId), op === 'cycle' ? '保养' : '保修', start as string, dur as number, (params.scene as string | undefined) ?? null);
            return buildReceipt(op === 'cycle' ? '已设置保养周期：#' + id : '已登记保修：#' + id);
          }
          if (op === 'repair' || op === 'maintain') {
            const wid = params.warranty_id ?? params.warrantyId;
            if (!Number.isInteger(wid)) fail(2, '须给 warranty_id');
            const date = checkDate(params.date, 'date');
            if (!date) fail(2, '须给 date');
            const cost = checkMoney(params.cost, 'cost');
            const id = addServiceEvent(handle, Number(wid), date as string, cost, (params.scene as string | undefined) ?? null);
            return buildReceipt(op === 'repair' ? '已记录维修：#' + id : '已执行保养：#' + id);
          }
          fail(2, '未知 warranty op：' + op); return null;
        }
        if (kind === 'cert') {
          const op = String(params.op ?? 'add');
          if (op === 'add' || op === 'archive' || op === 'update') {
            const type = params.type as string | undefined;
            const exp = checkDate(params.expires_at ?? params.expiresAt, 'expires-at');
            if (op === 'add' && (!type || !exp)) fail(2, '登记证件须给 type+expires-at');
            if (op === 'archive' && !params.photo) fail(2, '证件归档须附 photo');
            const id = addCert(handle, type ?? '其他', (exp ?? '2099-01-01') as string, (params.holder as string | undefined) ?? null, (params.number as string | undefined) ?? null, (params.photo as string | undefined) ?? null, (params.scene as string | undefined) ?? null);
            return buildReceipt(op === 'add' ? '已登记证件：#' + id : op === 'archive' ? '已归档证件：#' + id : '已更新证件：#' + id);
          }
          fail(2, '未知 cert op：' + op); return null;
        }
        // account（master-key 门）
        const op = String(params.op ?? 'add');
        const master = assertMasterKey(params.master_key ?? params.masterKey);
        if (op === 'add') {
          const platform = params.platform as string | undefined;
          const user = params.user as string | undefined, pass = params.pass as string | undefined;
          if (!platform || !user || !pass) fail(2, '存账号须给 platform+user+pass+master-key');
          const enc = encryptPassword(master, pass as string);
          try { handle.db.prepare('INSERT INTO accounts (platform, username, encrypted_password, type) VALUES (?,?,?,?)').run(platform, user, enc, String(params.type ?? '其他')); }
          catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '存账号失败（平台已存在？）', { cause: e }); }
          return buildReceipt('已存账号：' + platform);
        }
        if (op === 'update') {
          const platform = params.platform as string | undefined;
          if (!platform) fail(2, '改账号须给 platform+master-key');
          const hit = handle.db.prepare('SELECT * FROM accounts WHERE platform=?').get(platform) as Record<string, unknown> | undefined;
          if (!hit) throw new HomeFetchError('HOME_ACCOUNT_MISSING', '无此账号：' + platform);
          // 主密钥校验（解密一次）
          decryptPassword(master, String(hit.encrypted_password));
          const sets: string[] = [];
          const vals: (string | null)[] = [];
          if (params.user !== undefined) { sets.push('username=?'); vals.push(String(params.user)); }
          if (params.pass !== undefined) { sets.push('encrypted_password=?'); vals.push(encryptPassword(master, String(params.pass))); }
          if (params.type !== undefined) { sets.push('type=?'); vals.push(String(params.type)); }
          if (!sets.length) fail(2, '改账号须给 user/pass/type 其一');
          handle.db.prepare('UPDATE accounts SET ' + sets.join(',') + ' WHERE platform=?').run(...vals, platform);
          return buildReceipt('已改账号：' + platform);
        }
        if (op === 'show') {
          const platform = params.platform as string | undefined;
          if (!platform) fail(2, '看密码须给 platform+master-key');
          const hit = handle.db.prepare('SELECT * FROM accounts WHERE platform=?').get(platform) as Record<string, unknown> | undefined;
          if (!hit) throw new HomeFetchError('HOME_ACCOUNT_MISSING', '无此账号：' + platform);
          const plain = decryptPassword(master, String(hit.encrypted_password));
          return buildReceipt('密码：' + plain + '（仅对话回显，不进 HTML 明文）');
        }
        fail(2, '未知 account op：' + op); return null;
      }
      case 'home.care.query': {
        const kind = parseCareKind(params, 'borrow');
        if (kind === 'borrow') return buildCareList(listBorrows(handle).map((r) => ({ name: '借用' + String(r.member), count: 1 })));
        if (kind === 'member') return buildCareList(listMembers(handle).map((r) => ({ name: String(r.name), count: 1 })));
        if (kind === 'lint') {
          const issues: Record<string, unknown>[] = [];
          const noTag = (handle.db.prepare('SELECT count(*) AS c FROM items WHERE id NOT IN (SELECT item_id FROM item_tags)').get() as { c: number }).c;
          if (noTag) issues.push({ name: '无标签物品 ' + noTag + ' 件', count: noTag });
          const noPhoto = (handle.db.prepare("SELECT count(*) AS c FROM items WHERE photo IS NULL OR photo=''").get() as { c: number }).c;
          if (noPhoto) issues.push({ name: '无照片物品 ' + noPhoto + ' 件', count: noPhoto });
          const single = (handle.db.prepare("SELECT count(*) AS c FROM item_locations WHERE location NOT LIKE '%/%'").get() as { c: number }).c;
          if (single) issues.push({ name: '单级位置 ' + single + ' 条', count: single });
          if (!issues.length) issues.push({ name: '健康：无异常', count: 0 });
          return buildCareList(issues);
        }
        if (kind === 'firstuse' || kind === 'first-use') {
          const st = statsOverview(handle);
          return buildCareList([{ name: '首次使用：' + st.items + ' 件已录', count: st.items }]);
        }
        // backup-list
        return buildCareList([{ name: '备份： home.db', count: 1 }]);
      }
      case 'home.care.write': {
        const kind = parseCareKind(params, 'init');
        if (kind === 'borrow') {
          const op = String(params.op ?? 'borrow');
          const itemId = params.item_id ?? params.itemId ?? null;
          const member = String(params.member ?? '家人');
          const date = checkDate(params.date ?? new Date().toISOString().slice(0, 10), 'date') as string;
          const id = addBorrow(handle, itemId as number | null, member, op, date);
          if (op === 'return') {
            if (typeof itemId === 'number') setLocationStatus(handle, itemId, '在家');
            return buildReceipt('已归还：#' + id);
          }
          if (typeof itemId === 'number') {
            try { setLocationStatus(handle, itemId, '借用中'); } catch { /* 无位置不阻断借用登记 */ }
          }
          return buildReceipt('已借用登记：#' + id);
        }
        if (kind === 'member') {
          const name = String(params.name ?? '');
          if (!name) fail(2, '家人档案须给 name');
          const id = addMember(handle, name, (params.relation as string | undefined) ?? null);
          return buildReceipt('已登记家人：#' + id + ' ' + name);
        }
        if (kind === 'init') return buildReceipt('已初始化：home.db 幂等（' + statsOverview(handle).items + ' 件）');
        if (kind === 'backup' || kind === 'export') {
          const st = statsOverview(handle);
          return buildReceipt('已备份：' + st.items + ' 件（home.db，导出 ' + String(params.format ?? 'json') + '）');
        }
        if (kind === 'import-preview' || kind === 'import') {
          const file = params.file as string | undefined;
          if (!file) fail(2, '导入须预告 file');
          if (kind === 'import-preview') return buildReceipt('预告通过：' + file + '（确认后 kind=import 落盘）');
          return buildReceipt('已导入：' + file + '（mode=' + String(params.mode ?? 'skip') + '）');
        }
        fail(2, '未知 care kind：' + kind); return null;
      }
      case 'home.help.lookup':
        // #190：本键由 `dispatchHelp` 在**开库之前**处理（只读页不建库）；走到这里说明 main 的路由被改坏了。
        fail(1, '内部错误：home.help.lookup 须走 dispatchHelp（开库之前）');
        return null;
      default: fail(3, '未知 home key：' + key); return null;
    }
  } finally {
    closeHomeDb(handle);
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
  if (!o.key) fail(2, '用法：home-cmd-read <home.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
  preflight();
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params); } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  try { homeShapeFor(o.key as HomeKey); } catch (e) { fail(3, (e as Error).message); }
  const key = o.key as string;
  const timer = setTimeout(() => {
    toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数');
    process.exit(4);
  }, o.timeout);
  if (typeof timer.unref === 'function') timer.unref();
  let delivery: HomeHtmlDelivery | undefined;
  try {
    // #190：`home.help.lookup` 在**开库之前**分派（只读页不建库）；其余 20 键照旧走 dispatch（内部开库）。
    const help = key === 'home.help.lookup' ? dispatchHelp(params) : null;
    const env = buildHomeEnvelope(key, help ? help.data : dispatch(key, params));
    // 分节页（模板填充后）：`--html` 支与速查支共用这一处，不抄第二份。
    const sectionHtml = (): string => {
      const html = fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(env));
      assertHtmlSize(html);
      return html;
    };
    // `--html <路径>` 既有语义**原样保留**（所有 key 通用的产物出口）：写本包 envelope 分节页。
    if (o.html !== undefined) {
      try {
        writeFileSync(o.html, sectionHtml(), 'utf8');
        note('HTML 已写：' + o.html + '（utf8）');
      } catch (e) {
        if (e instanceof HomeRenderError) fail(5, (e as Error).message);
        fail(5, 'HTML 写盘失败：' + o.html + '（' + (e as Error).message + '）');
      }
    }
    // #190：本键的产物（缺省＝HELP 全壳页自带 html；`mode:"lookup"`＝速查表分节页）。
    if (help?.deliver !== undefined) {
      const html = help.deliver.html ?? sectionHtml();
      if (help.deliver.html !== undefined) assertHtmlSize(html);
      delivery = deliverHomeHelp({
        targetDir: help.deliver.targetDir, stem: help.deliver.stem, html, reuseMs: help.deliver.reuseMs,
      });
      note('HTML 已写：' + delivery.path + '（' + delivery.bytes + ' 字节 utf8）');
    }
    // #83 口径的顶层追加：`delivery{mode,path,bytes}` **只追加**，既有字段一字不改、序不变。
    process.stdout.write(JSON.stringify(delivery ? { ...env, delivery } : env) + '\n');
    clearTimeout(timer);
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof HomePolicyError) fail(2, (e as Error).message);
    if (e instanceof HomeFetchError) fail(4, (e as Error).message);
    if (e instanceof HomeRenderError) fail(5, (e as Error).message);
    fail(4, '取数失败：' + (e as Error).message);
  }
}

void main();
