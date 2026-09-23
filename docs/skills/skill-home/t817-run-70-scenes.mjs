#!/usr/bin/env node
/** 收口 #817 · 70 条场景端到端跑批（真命令链 ＋ 真族页产物 ＋ 70 行清单）。
 *
 * 干什么（票面 ⑧①）：把 70 条场景各跑一次**真命令链**——`home-cmd-read <key> --params …`
 * 在隔离家目录里对**仓内种子库**真跑，拿到信封与交付回执；再用同一份信封经契约的
 * 两层解析（`resolvePageFamily`）与页族装配件（`<域>/pages/<族>.js` 的 `renderFamilyPage`）
 * 装配出真页面，按契约命名算法（`resolveSceneStem` ＋ 戳）落进 `.scratch/817/raw/`。
 *
 * 为什么这么落：交付链（`cmd_read` 缺省落 HTML，票 4）今天落的仍是 21 模板分节页，
 * 族页由域票（票 9–19）装配——两条链尚未接合（票面「不许动的东西」明令本票不改实现）。
 * 故本批产物＝真信封 ＋ 族页装配，回执路径另作为「链路落盘」的独立读数逐条记进证据。
 *
 * 数据来源（三处事实源，不手抄）：
 *   · 场景清单＝契约附录 `scene-pages-contract.appendix.json` 的 `scenarios`（70 条：id／key／preset／family／domain／命令中文名）；
 *   · 标题与 prompt＝事实源 `src/help/scenarios.yaml`（经仓内解析器 `yaml-subset.mjs` 读，不另抄一份）；
 *   · 「这一格该确认什么」＝各域票清单 `.scratch/<票号>/manifest.json` 的 `check`（按场景 id 对上）。
 * 跑批参数（每条场景喂给命令的具体入参）住本件 `RUN` 表；有依赖的取值（物品 id、保修单 id、
 * 备份文件名）由前置步骤与前面场景**真跑**出来的回执现取，不写死。
 *
 * 用法（仓根）：
 *   node tooling/run-locked.mjs --ticket 817 --max-wait-ms 600000 -- node docs/skills/skill-home/t817-run-70-scenes.mjs
 *   … --keep-home    复用上一次的隔离家目录（默认每次重建，保证跑批可复现）
 *   … --out <目录>   换产物根（默认 `.scratch/817`）；#859 命名改版重跑用 `.scratch/859/batch70`
 * 退出码：0＝70 条全部 exit 0 且产物齐；1＝有场景失败（逐条点名）；2＝用法／环境错。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseScenarioYaml } from '../../../packages/skill-home/scripts/lib/yaml-subset.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const pkgDir = join(repoRoot, 'packages', 'skill-home');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const seedDir = join(repoRoot, '.scratch', 'home-seed');
const outArg = process.argv.indexOf('--out');
const outRoot = outArg >= 0 && process.argv[outArg + 1]
  ? resolve(repoRoot, process.argv[outArg + 1])
  : join(repoRoot, '.scratch', '817');
const homeDir = join(outRoot, 'home');
const dataDir = join(homeDir, '.ilife', 'data');
const rawDir = join(outRoot, 'raw');
const KEEP_HOME = process.argv.includes('--keep-home');

const pad = (n, l = 2) => String(n).padStart(l, '0');
const d = new Date();
const STAMP = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

const die = (code, msg) => { console.error(msg); process.exit(code); };
if (!existsSync(bin)) die(2, 'dist 未建：先跑 node node_modules/typescript/bin/tsc -b packages/skill-home');
if (!existsSync(join(seedDir, 'home-seed.db'))) die(2, '种子库不在：' + join(seedDir, 'home-seed.db'));

/* ── 场景清单：附录（70 条）＋ yaml 的标题与 prompt ───────────────────────── */
const appendix = JSON.parse(readFileSync(join(here, 'scene-pages-contract.appendix.json'), 'utf8'));
const yamlScenes = parseScenarioYaml(readFileSync(join(pkgDir, 'src', 'help', 'scenarios.yaml'), 'utf8')).scenes;
const yamlById = new Map(yamlScenes.map((s) => [s.id, s]));
const SCENES = appendix.scenarios;
if (SCENES.length !== 70) die(2, '附录场景数不是 70：' + SCENES.length);

/** 「这一格该确认什么」：按场景 id 从各域票清单取（文件名形如 `<命令中文名>_<场景 id>_<戳>.html`）。 */
function checksById() {
  const out = new Map();
  for (const n of ['806', '807', '808', '809', '810', '811', '812', '813', '814', '815', '816']) {
    const p = join(repoRoot, '.scratch', n, 'manifest.json');
    if (!existsSync(p)) continue;
    for (const r of JSON.parse(readFileSync(p, 'utf8')).rows) {
      const m = /_(\d+-\d+|SM\d+-\d+)_/.exec(String(r.file ?? ''));
      if (m && r.check) out.set(m[1], String(r.check));
    }
  }
  return out;
}
const CHECKS = checksById();

/* ── 别名（票 22 口径：变体与无场景词不占新格新行，只作宿主场景那一行的别名附注） ──
 * 两个来源：① 事实源 `scenarios.yaml` 的 `variants:` 子树（42 条，逐条带 `route:` 标记；
 * 解析器不收这棵子树，故在此按 `audit-wakewords.mjs` 同口径逐行扫，串行 fail-soft）；
 * ② 票 22 规格「有路由、无场景」的归宿表（`wakeword-spec.md` §20 条无场景词归宿）：
 * 18 条有宿主场景，进别名；技能级入口 3 条不进任何场景行；3 条 (HTML) 兼容词记进 notShipped。 */
const NO_SCENE_HOST = {
  '3-3': ['补物品', '减物品'],
  '3-4': ['废物品', '借物品', '修物品'],
  '6-1': ['盘物品', '盘全部'],
  'SM4-1': ['查高频'],
  'SM4-2': ['查低频'],
  '4-1': ['看标签', '合标签'],
  'SM2-1': ['推位置', '找位置'],
  'SM5-1': ['改购物清单'],
  'SM7-1': ['借出', '借入', '归还', '催还'],
};

function buildAliases() {
  const raw = readFileSync(join(pkgDir, 'src', 'help', 'scenarios.yaml'), 'utf8');
  const byId = new Map();
  let cur = null;
  let inVariants = false;
  let phrase = null;
  for (const line of raw.split(/\r?\n/)) {
    const idm = /^- id: (\S+)/.exec(line);
    if (idm) { cur = idm[1]; inVariants = false; phrase = null; continue; }
    if (/^  variants:/.test(line)) { inVariants = true; continue; }
    if (/^  \S/.test(line) && !/^    /.test(line) && !/^  variants:/.test(line) && !/^  - /.test(line)) {
      inVariants = false; phrase = null;
    }
    if (!inVariants || cur === null) continue;
    const pm = /^    phrase: (.+)$/.exec(line);
    if (pm) { phrase = pm[1].trim(); continue; }
    if (/^    route: (true|false)$/.test(line) && phrase !== null) {
      const list = byId.get(cur) ?? [];
      list.push(phrase);
      byId.set(cur, list);
      phrase = null;
    }
  }
  for (const [id, words] of Object.entries(NO_SCENE_HOST)) {
    byId.set(id, [...new Set([...(byId.get(id) ?? []), ...words])]);
  }
  return byId;
}
const ALIASES = buildAliases();

/* ── 跑批环境 ─────────────────────────────────────────────────────────── */
if (!KEEP_HOME) rmSync(homeDir, { recursive: true, force: true });
rmSync(rawDir, { recursive: true, force: true });
mkdirSync(homeDir, { recursive: true });
mkdirSync(rawDir, { recursive: true });
const ENV = { ...process.env, USERPROFILE: homeDir, HOME: homeDir };

function cli(key, params) {
  const r = spawnSync(process.execPath, [bin, key, '--params', JSON.stringify(params ?? {})], { encoding: 'utf8', env: ENV });
  const lines = String(r.stdout ?? '').trim().split('\n').filter((l) => l.trim().startsWith('{'));
  let env = null;
  if (lines.length) { try { env = JSON.parse(lines[lines.length - 1]); } catch { env = null; } }
  return { status: r.status, stderr: String(r.stderr ?? '').trim(), env };
}
function cliOk(key, params, label) {
  const r = cli(key, params);
  if (r.status !== 0 || !r.env) die(1, `${label} 前置命令失败：${key} exit=${r.status} ${r.stderr.slice(0, 300)}`);
  return r.env;
}
const itemsOf = (env) => (env?.data?.items ?? []);

/* ── 前置：配置＋种子库＋主密钥 → 现场发现若干 id（不写死） ───────────────── */
cliOk('home.stats.overview', {}, '首跑建库');
copyFileSync(join(seedDir, 'home-seed.db'), join(dataDir, 'home.db'));
copyFileSync(join(seedDir, '.master.key'), join(dataDir, '.master.key'));

const ctx = {};
{
  const cats = itemsOf(cliOk('home.tag.query', { kind: 'categories' }, '取分类'));
  const hit = cats.find((c) => String(c.name).startsWith('分类:'));
  if (!hit) die(1, '种子库没有分类行');
  ctx.catId = hit.count;
  const wall = cliOk('home.item.search', { wall: true }, '取照片物品');
  if (!wall.data.total) die(1, '种子库没有带照片的物品');
  ctx.photoId = itemsOf(wall)[0].id;
  const inv = cliOk('home.inventory.records', {}, '取盘点记录');
  ctx.invRecordId = itemsOf(inv)[0]?.id ?? 1;
  // 借出/借用/归位与出行清单要的两件：取种子库里前两件带照片的物品（照片与历史两用）。
  const two = itemsOf(wall).slice(0, 2).map((c) => c.id);
  ctx.itemA = two[0];
  ctx.itemB = two[1] ?? two[0];
  ctx.keyItemId = (() => {
    const r = itemsOf(cliOk('home.item.search', { name: '钥匙' }, '取钥匙'));
    return r[0]?.id ?? ctx.itemA;
  })();
}

/* ── 70 条跑批表：id → 入参（可用 ctx）＋该条该确认什么 ─────────────────── */
const RUN = [
  { id: '1-1', p: () => ({ name: '探针杯', category_id: ctx.catId, location: '客厅/桌' }) },
  { id: '1-2', p: () => ({ name: '探针碗', category_id: ctx.catId, location: '厨房/柜', photo: '1' }) },
  { id: '1-3', p: () => ({ op: 'batch', items: [{ name: '批量勺', category_id: ctx.catId, location: '厨房/屉' }, { name: '批量叉', category_id: ctx.catId, location: '厨房/屉' }] }) },
  { id: '1-4', p: () => ({ name: '旧物壶', op: 'backfill', backfill_date: '2025-01-01', category_id: ctx.catId, location: '阳台/架' }) },
  { id: '2-1', p: () => ({ name: '探针' }) },
  { id: '2-2', p: () => ({ id: ctx.probeId }) },
  { id: '2-3', p: () => ({ name: '探针', locate: true }) },
  { id: '2-4', p: () => ({ browse: true }) },
  { id: '2-5', p: () => ({ name: '探针', photo: true }) },
  { id: '2-6', p: () => ({ dupes: true }) },
  { id: '3-1', p: () => ({ id: ctx.mainId, remark: '收口跑批备注' }) },
  { id: '3-2', p: () => ({ id: ctx.mainId, op: 'move', new_location: '阳台/收纳柜' }) },
  { id: '3-3', p: () => ({ id: ctx.mainId, op: 'qty', plus: 2 }) },
  { id: '3-4', p: () => ({ id: ctx.mainId, op: 'status', status: '备用' }) },
  { id: '3-5', p: () => ({ id: ctx.mainId, op: 'merge', target: ctx.mainId, sources: String(ctx.spareId) }) },
  { id: '3-6', p: () => ({ id: ctx.mainId, op: 'undo' }) },
  { id: '3-7', p: () => ({ id: ctx.mainId, op: 'relate', related: ctx.itemB }) },
  { id: '3-8', p: () => ({ id: ctx.mainId, op: 'tags', tags: '常用,出差' }) },
  { id: '4-1', p: () => ({ op: 'overview' }) },
  { id: '4-2', p: () => ({ op: 'category' }) },
  { id: '4-3', p: () => ({ op: 'tidy' }) },
  { id: '5-1', p: () => ({ id: ctx.photoId, view: 'photos' }) },
  { id: '5-2', p: () => ({ id: ctx.photoId, op: 'photo', photo: 'seed-jacket-red.png' }) },
  { id: '5-3', p: () => ({ wall: true }) },
  { id: '6-1', p: () => ({ op: 'round', scope: 'all' }) },
  { id: '6-2', p: () => ({ op: 'resolve', record_id: ctx.invRecordId }) },
  { id: '6-3', p: () => ({}) },
  { id: '6-4', p: () => ({ op: 'move' }) },
  { id: '7-1', p: () => ({ id: ctx.histId, view: 'history' }) },
  { id: 'SM2-1', p: () => ({ op: 'manage', action: 'add', path: '书房/书架/顶层' }) },
  { id: 'SM2-2', p: () => ({ op: 'fixed', item_id: ctx.keyItemId, fixed_location: '玄关/抽屉' }) },
  { id: 'SM2-3', p: () => ({ mode: 'suggest', category_id: ctx.catId }) },
  { id: 'SM2-4', p: () => ({ mode: 'space' }) },
  { id: 'SM3-1', p: () => ({}) },
  { id: 'SM3-2', p: () => ({ kind: 'wardrobe' }) },
  { id: 'SM3-3', p: () => ({ kind: 'season', season: '冬季', action: '收纳' }) },
  { id: 'SM3-4', p: () => ({ mode: 'pack', ids: [ctx.itemA, ctx.itemB] }) },
  { id: 'SM3-5', p: () => ({ kind: 'trip-plan', days: 3, destination: '海边' }) },
  { id: 'SM4-1', p: () => ({ kind: 'summary' }) },
  { id: 'SM4-2', p: () => ({ kind: 'idle', days: 90 }) },
  { id: 'SM4-3', p: () => ({ kind: 'expiring', days: 30 }) },
  { id: 'SM4-4', p: () => ({ kind: 'inventory' }) },
  { id: 'SM5-1', p: () => ({ kind: 'list' }) },
  { id: 'SM5-2', p: () => ({ kind: 'missing' }) },
  { id: 'SM5-3', p: () => ({ kind: 'express' }) },
  { id: 'SM5-4', p: () => ({ kind: 'stock' }) },
  { id: 'SM6-1', p: () => ({ kind: 'purchase' }) },
  { id: 'SM6-2', p: () => ({ kind: 'purchase', range: 'last-month' }) },
  { id: 'SM6-3', p: () => ({ kind: 'purchase', range: 'year' }) },
  { id: 'SM6-4', p: () => ({ kind: 'purchase', range: 'return', item_id: ctx.mainId }) },
  { id: 'SM6-5', p: () => ({ kind: 'purchase', op: 'add', item_id: ctx.mainId, date: '2026-09-10', price: 199.5, channel: '京东' }) },
  { id: 'SM6-6', p: () => ({ kind: 'warranty' }) },
  { id: 'SM6-7', p: () => ({ kind: 'warranty', op: 'register', item_id: ctx.mainId, start_date: '2026-01-01', duration_days: 365 }) },
  { id: 'SM6-8', p: () => ({ kind: 'warranty', op: 'repair', warranty_id: ctx.warrantyId, date: '2026-09-15', cost: 50 }) },
  { id: 'SM6-9', p: () => ({ kind: 'warranty', op: 'cycle', item_id: ctx.itemB, start_date: '2026-09-01', duration_days: 90 }) },
  { id: 'SM6-10', p: () => ({ kind: 'warranty', op: 'maintain', warranty_id: ctx.cycleId, date: '2026-09-16' }) },
  { id: 'SM6-11', p: () => ({ kind: 'cert' }) },
  { id: 'SM6-12', p: () => ({ kind: 'cert', op: 'add', type: '通行证', expires_at: '2028-01-01', holder: '收口', number: 'T00008117' }) },
  { id: 'SM6-13', p: () => ({ kind: 'cert', op: 'archive', photo: 'seed-cert-id.png' }) },
  { id: 'SM6-14', p: () => ({ kind: 'cert', op: 'update' }) },
  { id: 'SM6-15', p: () => ({ kind: 'account' }) },
  { id: 'SM6-16', p: () => ({ kind: 'account', op: 'add', platform: '收口平台' + STAMP.slice(-6), user: '收口用户', pass: '收口口令' + STAMP.slice(-6), type: '购物' }) },
  { id: 'SM6-17', p: () => ({ kind: 'account', op: 'update', platform: '淘宝', user: 'home-user' }) },
  { id: 'SM6-18', p: () => ({ kind: 'account', op: 'show', platform: '淘宝' }) },
  { id: 'SM7-1', p: () => ({ kind: 'borrow' }) },
  { id: 'SM7-2', p: () => ({ kind: 'member' }) },
  { id: 'SM8-1', p: () => ({ kind: 'init' }) },
  { id: 'SM8-2', p: () => ({ kind: 'lint' }) },
  { id: 'SM8-3', p: () => ({ kind: 'backup' }) },
  { id: 'SM8-4', p: () => ({ kind: 'import', file: ctx.backupFile, confirm: true }) },
];
if (RUN.length !== 70) die(2, '跑批表条数不是 70：' + RUN.length);
const runById = new Map(RUN.map((r) => [r.id, r]));

/* ── 逐条真跑 ＋ 族页装配 ─────────────────────────────────────────────── */
const { resolvePageFamily } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'pageFamilies.js')).href);
const { resolveSceneStem } = await import(pathToFileURL(join(pkgDir, 'dist', 'render', 'sceneNaming.js')).href);

/** 双字杯：查重复要的同名组（种子有重名组时不必补；真查不到才补两件）。 */
function ensureTwin() {
  const before = itemsOf(cli('home.item.search', { name: '双子杯' }).env);
  if (before.length) return;
  cliOk('home.item.add', { name: '双子杯', category_id: ctx.catId, location: '客厅/桌' }, '补双子杯甲');
  cliOk('home.item.add', { name: '双子杯', category_id: ctx.catId, location: '卧室/柜' }, '补双子杯乙');
}

/** 保修单号：查询回执的行名形如 `… #<id> …`（与票 813 的取法同口径）。 */
function warrantyIds() {
  const list = itemsOf(cliOk('home.ticket.query', { kind: 'warranty' }, '取保修单'));
  return list.map((x) => Number(String(x.name ?? '').match(/#(\d+)/)?.[1] ?? 0)).filter((n) => n > 0);
}

/** 该条场景开跑前的现场发现（用真命令现取，不写死 id）；失败不阻断——该条自己会报红。 */
function beforeScene(id) {
  const tryCli = (key, params) => { const r = cli(key, params); return r.status === 0 ? r.env : null; };
  if (id === '2-2') {
    const items = itemsOf(tryCli('home.item.search', { name: '探针' }));
    ctx.probeId = (items.find((x) => x.name === '探针杯') ?? items[0])?.id;
    ctx.spareId = (items.find((x) => x.name === '探针碗') ?? items[1] ?? items[0])?.id;
    ctx.mainId = ctx.probeId;
  }
  if (id === '2-6') ensureTwin();
  if (id === '7-1') {
    // 历史：取种子照片里事件最多的一件（真查，不写死 id）。
    let best = ctx.photoId; let bestN = -1;
    for (const c of itemsOf(tryCli('home.item.search', { wall: true })).slice(0, 4)) {
      const h = tryCli('home.item.detail', { id: c.id, view: 'history' });
      const n = String(h?.data?.item?.history ?? '').split('；').filter((s) => s.trim() !== '').length;
      if (n > bestN) { bestN = n; best = c.id; }
    }
    ctx.histId = best;
  }
  if (id === 'SM6-8') { const ids = warrantyIds(); ctx.warrantyId = ids.length ? Math.max(...ids) : undefined; }
  if (id === 'SM6-10') { const ids = warrantyIds(); ctx.cycleId = ids.length ? Math.max(...ids) : undefined; }
  if (id === 'SM8-4') {
    const l = tryCli('home.care.query', { kind: 'backup-list' });
    const first = itemsOf(l)[0];
    ctx.backupFile = first ? String(first.name).replace(/（.*$/, '') : undefined;
  }
}

const evidence = [];
/** 能力目录名 → 人读的域标题（HELP 一级分组；9 个域里 link 只留登记位，无产物、不出墙）。 */
const DOMAIN_CN = {
  items: '物品管理', space: '空间与位置', outfit: '穿搭出行', stats: '统计总览',
  express: '快递购物', receipt: '票据凭证', family: '家庭协作', setup: '开始使用',
};
let failed = 0;
for (let i = 0; i < SCENES.length; i += 1) {
  const sc = SCENES[i];
  const run = runById.get(sc.id);
  if (!run) die(2, '跑批表缺场景：' + sc.id);
  beforeScene(sc.id);
  const params = run.p();
  const y = yamlById.get(sc.id);
  const rec = {
    seq: i + 1, id: sc.id, domainEn: sc.domain,
    domain: DOMAIN_CN[sc.domain] ?? sc.domain, kind: y?.type ?? '',
    family: sc.family, wake: sc.wakeWord, key: sc.key, preset: sc.preset, params,
    title: y?.scenario_title ?? sc.wakeWord, prompt: y?.prompt ?? '', check: CHECKS.get(sc.id) ?? '',
  };
  const r = cli(sc.key, params);
  rec.exit = r.status;
  if (r.status !== 0 || !r.env) {
    failed += 1;
    rec.error = (r.stderr || '无信封').slice(0, 300);
    evidence.push(rec);
    console.log(`${String(i + 1).padStart(2)} ${sc.id.padEnd(6)} ${sc.wakeWord.padEnd(6)} exit=${r.status} ${rec.error.split('\n')[0]}`);
    continue;
  }
  const env = r.env;
  rec.shape = env.shape;
  rec.receiptPath = env.delivery?.path ?? '';
  rec.receiptBytes = env.delivery?.bytes ?? null;
  rec.receiptExists = rec.receiptPath ? existsSync(rec.receiptPath) : false;
  rec.receiptBytesOk = rec.receiptExists && statSync(rec.receiptPath).size === Number(rec.receiptBytes);
  const family = resolvePageFamily(sc.key, params);
  rec.familyResolved = family;
  if (!rec.receiptExists) {
    failed += 1;
    rec.error = '回执路径不在盘上：' + rec.receiptPath;
    evidence.push(rec);
    console.log(`${String(i + 1).padStart(2)} ${sc.id.padEnd(6)} ${rec.error}`);
    continue;
  }
  // #872 接上后，落盘的那一份就是族页：产物**从回执路径收**（不再由本脚本自己装配写文件）。
  const landed = readFileSync(rec.receiptPath, 'utf8');
  rec.familyPage = landed.includes('data-block=');
  if (!rec.familyPage) {
    failed += 1;
    rec.error = '回执落的是 21 模板分节页（无 data-block=）：' + rec.receiptPath;
    evidence.push(rec);
    console.log(`${String(i + 1).padStart(2)} ${sc.id.padEnd(6)} ${rec.error}`);
    continue;
  }
  const stem = resolveSceneStem(sc.key, params);
  if (stem !== sc.commandCn) {
    failed += 1;
    rec.error = `命名走散：resolveSceneStem=${stem} 附录=${sc.commandCn}`;
    evidence.push(rec);
    console.log(`${String(i + 1).padStart(2)} ${sc.id.padEnd(6)} ${rec.error}`);
    continue;
  }
  const file = basename(rec.receiptPath);
  copyFileSync(rec.receiptPath, join(rawDir, file));
  rec.file = file;
  rec.bytes = statSync(join(rawDir, file)).size;
  rec.markersLeft = ['<!--CONTENT-->', '<!--SHARED-CSS-->', '<!--SHARED-HELPERS-->'].filter((m) => landed.includes(m));
  rec.aliases = ALIASES.get(sc.id) ?? [];
  evidence.push(rec);
  console.log(`${String(i + 1).padStart(2)} ${sc.id.padEnd(6)} ${sc.wakeWord.padEnd(6)} ${family.padEnd(18)} exit=0 ${String(rec.bytes).padStart(6)}B 别名${String(rec.aliases.length).padStart(2)} 回执＝族页`);
}

/* ── 落清单与证据 ─────────────────────────────────────────────────────── */
const notShipped = [
  { what: '联动域 3 条（联动总览／记到卡路里／记到记账）', why: '#183 票 13 已裁「留登记位、不列、不建域目录」，无产物、不出墙（地图 Out of scope）。' },
  { what: '3 条 (HTML) 兼容词（查物品(HTML)／看物品(HTML)／统物品(HTML)）', why: '#183 票 13 已裁「不进清单、不独立产物」；票 22 口径：默认已全量落 HTML ⇒ 登记废弃、只留别名位（见对应场景行的别名附注）。' },
];
const manifest = {
  batch: '居家管家 70 场景页',
  naming: '发布名＝契约命名算法 `<命令中文名>_<场景 id>_<戳>.html`（由交付链落盘时定名，本清单只从回执读文件名）',
  notShipped,
  readings: {
    '跑批': evidence.filter((e) => e.exit === 0).length + '/70 条真命令链 exit 0',
    '回执落盘': evidence.filter((e) => e.receiptExists).length + '/70 条回执路径在盘上（字节与回执一致 '
      + evidence.filter((e) => e.receiptBytesOk).length + '/70）',
    '落盘即族页': evidence.filter((e) => e.familyPage).length + '/70 份产物含族页标记 data-block=',
    '别名附注': evidence.reduce((a, e) => a + (e.aliases?.length ?? 0), 0) + ' 条（变体＋无场景词，宿主行附注，不占新行）',
    '种子库': '.scratch/home-seed/home-seed.db（票 802）＋隔离家目录 .scratch/817/home',
  },
  rows: evidence.map((e) => ({
    seq: e.seq, wake: e.wake, file: e.file, domain: e.domain, family: e.family,
    title: e.title, prompt: e.prompt, command: e.key, preset: e.preset,
    check: e.check, bytes: e.bytes, aliases: e.aliases ?? [],
  })),
};
writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
writeFileSync(join(outRoot, 'evidence-70.json'), JSON.stringify({ stamp: STAMP, home: homeDir, scenes: evidence }, null, 1), 'utf8');
console.log(`\n清单：${join(outRoot, 'manifest.json')}（${manifest.rows.length} 行）`);
console.log(`证据：${join(outRoot, 'evidence-70.json')}`);
console.log(`产物：${rawDir}（${manifest.rows.filter((r) => r.file).length} 份，戳 ${STAMP}）`);
console.log(`链路落盘：${join(dataDir, 'home_manager_html')}`);
console.log(failed === 0 ? 'RESULT: 70/70 PASS' : `RESULT: ${70 - failed}/70 FAIL（${failed} 条红）`);
process.exit(failed === 0 ? 0 : 1);
