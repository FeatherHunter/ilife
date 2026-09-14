/** #281 · 读侧铺开形状验证（对比两张照片＋查身材照＝完整文档＋内嵌照片＋复制区）。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 指向 tmp），
 * 真实 DB 零触碰。真跑 `calorie-cmd-read calorie.photo.compare／calorie.photo.detail`
 *（独立进程，非就地 dispatch）。
 *
 * 断言（票面五条）：
 * ① 两条命令真跑，产物都以 `<!doctype html>` 起、含复制区与 `data:image/`；
 * ② 对比页保留老实物口径（并排双卡＋间隔天数 N 等于日期差＋角度不一样的提醒）；
 * ③ 缺照片／不存在的 id 按既有缺失阻断口径（exit 4，不回半页）；
 * ④ 变异自证（去掉内嵌必红，改回必绿，两行机器读数）；
 * ⑤ 每条成功用例另断言 `data.output` 是绝对路径且该文件在盘上（失败用例断言无半页落盘）。
 *
 * 融合验收（t400 基准）：对比页裁定 4（提醒行＋间隔 N 天，缺值不回半页）＋裁定 6（n/a 对比页）；
 * 详情页裁定 4（同标签翻页链，首尾无空 href，无坏链）＋裁定 6（黑底 75vh contain＋删了就找不回来）；
 * 两页裁定 5（完整文档＋复制区分族，位置照基准骨架）；体积口径复用 t341（超预算横幅 N／M＋替代操作）。
 *
 * **#473（B 组 · 文本精简／人话改写／展示升级）**：旧文案钉住的断言逐条同步成新文案，并加负向断言
 * （旧句 0 命中）——不许放宽成永真：
 * - 两页眉标整行删（`身材照片域` 与 `page-shell-eyebrow` 都不许再出现）；
 * - 详情页：`已是第一张`／`已是最后一张` 取代「翻页禁用」；「这张照片的信息」取代「快照明细」；
 *   「删掉这张照片」「删了就找不回来」取代「硬删除，不可恢复」；两条命令是可复制的命令块（冻结 actionId）；
 *   图注＝`YYYY-MM-DD HH:MM · 相对时间 · 标签 · 文件名小字块`，「文件存在」不再出现；
 * - 对比页：「角度一致吗」「2 张都已显示」两格 KPI（「按日期正序」删）；「间隔」只在横幅出现一次；
 *   「这张的角度不一样」提醒取代「跨标签对比警告／可比性较弱」；表注「两张照片的原始记录」；副标题＝日期对照。
 * - 相对时间用 `CALORIE_TODAY` 钉死（`todayISO()` 的唯一出口），用例因此不靠机器时钟。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-shape-read-281.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
/** 钉死的「今天」（种子 09-04／05／06／07 依次＝3 天前／2 天前／昨天／今天）。 */
const TODAY = '2026-09-07';
/** 冻结的复制按钮 id（`base-paint` 的 `HELP_COPY_ACTIONS.prompt`，卡路里侧不自造 id）。 */
const COPY_ACTION_ID = 'ilife-help-copy-prompt';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_2_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** 4 张种子：09-04 正面／09-05 正面＋备注／09-06 正面／09-07 侧面（id 1..4）。 */
function seedIso() {
  const root = mkdtempSync(join(tmpdir(), 't281-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  const files = ['a.png', 'b.png', 'c.png', 'd.png'].map((n, i) =>
    writeFileSync(join(srcDir, n), Buffer.from(i % 2 === 0 ? TINY_PNG_B64 : TINY_PNG_2_B64, 'base64')) ?? join(srcDir, n));
  const db = openDb(join(dbDir, 'calorie_data.db'));
  addPhotos(db, photosDir, { srcPaths: [files[0]], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [files[1]], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [files[2]], tag: '正面', today: '2026-09-06', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [files[3]], tag: '侧面', today: '2026-09-07', nowTime: '08:00:00' });
  db.close();
  return { root, dbDir, photosDir };
}

function runRaw(iso, key, params) {
  return spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8',
    // #473：「今天」钉死（`todayISO()` 认 `CALORIE_TODAY`），图注里的相对时间因此可断言、不看机器时钟。
    env: { ...process.env, SKILLS_DB_PATH: iso.dbDir, CALORIE_PHOTOS_DIR: iso.photosDir, CALORIE_TODAY: TODAY },
  });
}

function runOk(iso, key, params) {
  const r = runRaw(iso, key, params);
  assert.equal(r.status, 0, 'CLI exit 非 0：' + (r.stderr ?? '').slice(0, 500));
  return JSON.parse(String(r.stdout).trim());
}

function assertOutputOnDisk(env) {
  const out = env?.data?.output;
  assert.equal(typeof out, 'string', 'data.output 缺失');
  assert.ok(isAbsolute(out), 'data.output 非绝对路径：' + out);
  assert.ok(existsSync(out), 'data.output 不在盘上：' + out);
  return out;
}

/** 同形总闸（完整文档＋内嵌＋复制区＋#473 眉标已删）；变异体走此闸必红。 */
function assertShape(html) {
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'), '文档头缺失（须以 <!doctype html> 起）');
  assert.match(html, /<meta charset/i, 'charset 缺失');
  assert.match(html, /复制数据/, '复制区标记缺失');
  assert.match(html, /data:image\//, '内嵌照片缺失（须含 data:image/）');
  // #473：眉标（`calorie.photo.xxx · 身材照片域`）整行删——命令名＋域名的组合对读者零信息。
  assert.doesNotMatch(html, /身材照片域/, '#473：眉标整行须删（不许再出现域名）');
  // 只认**眉标元素**：类名 `.ilife-block-page-shell-eyebrow` 在共享样式段里恒在，不能拿裸类名当判据。
  assert.doesNotMatch(html, /<p class="[^"]*page-shell-eyebrow/, '#473：眉标整行须删（不许再出眉标元素）');
}

function navOf(html) {
  const m = html.match(/<div data-nav>([\s\S]*?)<\/div>/);
  assert.ok(m, '翻页链缺失（须有 data-nav 区）');
  return m[1];
}

test('对比页真跑：同形＋并排双卡＋间隔 N 等于日期差（同标签无提醒）', async () => {
  const iso = seedIso();
  const env = runOk(iso, 'calorie.photo.compare', { id1: 1, id2: 2 });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  assertShape(html);
  assert.match(html, /对比两张照片/, '标题缺失');
  assert.match(html, /data-id="1"/, '照片 #1 卡缺失');
  assert.match(html, /data-id="2"/, '照片 #2 卡缺失');
  // 间隔 N 天大数字中的 N 等于两张照片日期差（09-04 vs 09-05＝1）。
  assert.match(html, /间隔 <b>1<\/b> 天/, '间隔横幅 N≠日期差（09-04 vs 09-05 应为 1）');
  // 同标签对比不出提醒行（#473：旧句「跨标签」全页 0 命中）。
  assert.doesNotMatch(html, /角度不一样/, '同标签对比不应出角度不一样的提醒');
  assert.doesNotMatch(html, /跨标签/, '同标签对比不应出跨标签警告');
  // #473：KPI 收成两格；「按日期正序」与 KPI 里的间隔格都删（间隔只留横幅那一处）。
  assert.match(html, /角度一致吗/, '#473：KPI「角度一致吗」缺失');
  assert.match(html, /2 张都已显示/, '#473：KPI「2 张都已显示」缺失');
  assert.doesNotMatch(html, /按日期正序|按日期倒序/, '#473：「按日期正序」须删');
  assert.doesNotMatch(html, /kpiCard-label">间隔/, '#473：KPI 里的间隔格须删（与横幅重复）');
  // 副标题改日期对照，不再写裸 id。
  assert.match(html, /2026-09-04 vs 2026-09-05/, '#473：副标题须是日期对照');
  // envelope 数据形与改前一致（items/total）。
  assert.equal(env?.data?.total, 2, 'data.total≠2');
});

test('对比页角度不一样的提醒改人话（N=3，旧句 0 命中）', async () => {
  const iso = seedIso();
  const env = runOk(iso, 'calorie.photo.compare', { id1: 1, id2: 4 });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  assertShape(html);
  assert.match(html, /这两张的角度不一样（正面／侧面），放在一起看不出真实变化，建议用同角度对比/, '#473：提醒行新文案缺失');
  assert.doesNotMatch(html, /跨标签对比警告|可比性较弱/, '#473：旧句（跨标签对比警告／可比性较弱）须 0 命中');
  assert.match(html, /间隔 <b>3<\/b> 天/, '间隔横幅 N≠日期差（09-04 vs 09-07 应为 3）');
  assert.match(html, /角度一致吗/, '#473：KPI「角度一致吗」缺失');
  assert.match(html, /不一致/, '#473：跨标签时该格须写「不一致」');
  // 表注改「两张照片的原始记录」；旧表注与裸 id 副标题出页面。
  assert.match(html, /两张照片的原始记录/, '#473：表注缺失');
  assert.doesNotMatch(html, /对照明细/, '#473：旧表注「对照明细」须 0 命中');
  assert.doesNotMatch(html, /照片 #1 vs #4/, '#473：副标题不许再写裸 id');
});

test('详情页真跑：同形＋黑底大图＋中张双链＋图注收成人话', async () => {
  const iso = seedIso();
  const env = runOk(iso, 'calorie.photo.detail', { id: 2 });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  assertShape(html);
  assert.match(html, /身材照查看 #2/, '标题缺失');
  // 大图观看规则：黑底 75vh contain。
  assert.match(html, /background:#000/, '大图黑底缺失');
  assert.match(html, /75vh/, '大图 75vh 缺失');
  assert.match(html, /contain/, '大图 contain 缺失');
  // 同标签翻页链：中张双链可点，无禁用。
  const nav = navOf(html);
  assert.equal((nav.match(/<a /g) ?? []).length, 2, '中张应有双链');
  assert.match(nav, /#photo-1/, '上一张链缺失');
  assert.match(nav, /#photo-3/, '下一张链缺失');
  assert.doesNotMatch(nav, /翻页禁用/, '中张不应有禁用态');
  assert.doesNotMatch(nav, /aria-disabled/, '中张不应有禁用位');
  assert.doesNotMatch(html, /href="#"/, '坏链（href="#"）');
  // #473：信息表在页，表注改「这张照片的信息」（旧「快照明细」0 命中）。
  assert.match(html, /这张照片的信息/, '#473：表注缺失');
  assert.doesNotMatch(html, /快照明细/, '#473：旧表注「快照明细」须 0 命中');
  // #473：图注＝`YYYY-MM-DD HH:MM · 相对时间 · 标签 · 文件名小字块`；「文件存在」不再出现。
  assert.match(html, /#2 2026-09-05 08:00 · 2 天前 · 正面 · <span class="[^"]*block-chip">2026-09-05_001\.png<\/span>/, '#473：图注没收成人话（日期＋相对时间＋标签＋文件名小字块）');
  assert.doesNotMatch(html, /文件存在/, '#473：「文件存在」不该再出现（只在缺失时提示）');
  assert.equal(env?.data?.item?.id, 2, 'data.item.id≠2');
});

test('详情页首尾禁用＋返回筛选上下文＋删了就找不回来', async () => {
  const iso = seedIso();
  const first = readFileSync(assertOutputOnDisk(runOk(iso, 'calorie.photo.detail', { id: 1 })), 'utf8');
  const nav1 = navOf(first);
  assert.equal((nav1.match(/<a /g) ?? []).length, 1, '首张应只剩下一张链');
  assert.match(nav1, /已是第一张/, '#473：首张上一张位须写「已是第一张」');
  assert.doesNotMatch(nav1, /翻页禁用/, '#473：不许再写「翻页禁用」这种系统口吻');
  assert.match(nav1, /#photo-2/, '首张下一张链缺失');
  const last = readFileSync(assertOutputOnDisk(runOk(iso, 'calorie.photo.detail', { id: 3 })), 'utf8');
  const nav3 = navOf(last);
  assert.equal((nav3.match(/<a /g) ?? []).length, 1, '尾张应只剩下上一张链');
  assert.match(nav3, /已是最后一张/, '#473：尾张下一张位须写「已是最后一张」');
  assert.doesNotMatch(nav3, /翻页禁用/, '#473：不许再写「翻页禁用」这种系统口吻');
  assert.match(nav3, /#photo-2/, '尾张上一张链缺失');
  // 单标签孤张双禁用（#4 侧面）。
  const lone = readFileSync(assertOutputOnDisk(runOk(iso, 'calorie.photo.detail', { id: 4 })), 'utf8');
  assert.equal((navOf(lone).match(/<a /g) ?? []).length, 0, '孤张应双禁用');
  // 返回带筛选上下文。
  assert.match(first, /返回画廊/, '返回画廊缺失');
  assert.match(first, /正面/, '返回筛选上下文（标签）缺失');
  assert.match(first, /calorie\.photo\.list/, '返回画廊命令缺失');
  // #473：删入口改人话＋安全感，旧「硬删除，不可恢复」出页面（「不可恢复」全页 0 命中）。
  assert.match(first, /删掉这张照片/, '#473：删入口标题缺失');
  assert.match(first, /删了就找不回来，先确认上面那张是不是它/, '#473：删入口安全感那句缺失');
  assert.doesNotMatch(first, /不可恢复/, '#473：旧句「不可恢复」须 0 命中');
  assert.match(first, /calorie\.photo\.remove/, '删命令缺失');
  // #473：两条命令都是可复制的命令块（`renderPreBlock` ＋ 冻结复制按钮），不是裸 <pre>。
  const cmds = [...first.matchAll(new RegExp('data-action-id="' + COPY_ACTION_ID + '" data-t="([^"]*)"', 'g'))].map((m) => m[1]);
  assert.equal(cmds.length, 2, '#473：删／回画廊两条命令各须一颗复制按钮，实得 ' + cmds.length);
  assert.ok(cmds.some((t) => t.includes('calorie.photo.remove')), '删命令的复制文本缺失');
  assert.ok(cmds.some((t) => t.includes('calorie.photo.list')), '回画廊命令的复制文本缺失');
  assert.doesNotMatch(first, /文件保留/, '老「文件保留」提示须作废');
  // #473：本页不再重复「删前核对凭据／本页即删身材照流程的快照」那两句。
  assert.doesNotMatch(first, /删前核对凭据/, '#473：重复的「删前核对凭据」须 0 命中');
  assert.doesNotMatch(first, /本页即删身材照流程的快照/, '#473：重复的「本页即删身材照流程的快照」须 0 命中');
});

test('缺失阻断：不存在的 id 按既有口径 exit 4，不回半页', async () => {
  const iso = seedIso();
  for (const [key, params] of [
    ['calorie.photo.detail', { id: 999 }],
    ['calorie.photo.compare', { id1: 1, id2: 999 }],
    ['calorie.photo.compare', { id1: 999, id2: 1 }],
  ]) {
    const r = runRaw(iso, key, params);
    assert.equal(r.status, 4, key + ' 缺失行须 exit 4，实得 ' + r.status);
    assert.match(String(r.stderr ?? ''), /取数失败/, key + ' stderr 须含取数失败');
    assert.equal(String(r.stdout ?? '').trim(), '', key + ' 缺失时不回半页（stdout 须空）');
  }
});

test('超预算横幅：已嵌 N／还有 M＋替代操作（缺失不牵连正常照片）', async () => {
  const root = mkdtempSync(join(tmpdir(), 't281-big-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  // 2×400KB：双嵌约 1.1MB 必超 1MiB 上限，弃一张后约 0.6MB 回绿（两边各留余量）。
  const big = Buffer.alloc(400000, 7);
  const s1 = join(srcDir, 's1.png');
  const s2 = join(srcDir, 's2.png');
  writeFileSync(s1, big);
  writeFileSync(s2, big);
  const db = openDb(join(dbDir, 'calorie_data.db'));
  addPhotos(db, photosDir, { srcPaths: [s1], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [s2], tag: '正面', today: '2026-09-05', nowTime: '08:00:00' });
  db.close();
  const iso = { root, dbDir, photosDir };
  const env = runOk(iso, 'calorie.photo.compare', { id1: 1, id2: 2 });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'), '超预算页仍须是完整文档');
  assert.match(html, /超预算横幅/, '超预算横幅缺失');
  assert.match(html, /已嵌入 1 张/, '横幅须报已嵌 N');
  assert.match(html, /还有 1 张未嵌入/, '横幅须报还有 M');
  assert.match(html, /替代操作/, '横幅须给替代操作');
  // #473：被弃那张的占位原因也改人话（横幅的 N／M 口径不动——那是 #438 定下的界面口径）。
  assert.match(html, /照片没显示（太大放不下：/, '#473：被弃那张须明示人话原因');
  assert.doesNotMatch(html, /超预算未内嵌/, '#473：旧句「超预算未内嵌」须 0 命中');
  // 缺失不牵连：另一张仍内嵌。
  assert.match(html, /data:image\//, '正常照片应仍内嵌');
});

test('#473 详情页超限态：一句人话＋信息表里的文件名（旧句 0 命中）', async () => {
  const root = mkdtempSync(join(tmpdir(), 't281-big-one-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  // 单张 1.5MB（≤ 内嵌件单张上限 4MiB，但 base64 后约 2MB 必超 1MiB 单页上限）→ 详情页须退让。
  const s1 = join(srcDir, 's1.png');
  writeFileSync(s1, Buffer.alloc(1500000, 5));
  const db = openDb(join(dbDir, 'calorie_data.db'));
  addPhotos(db, photosDir, { srcPaths: [s1], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  db.close();
  const env = runOk({ root, dbDir, photosDir }, 'calorie.photo.detail', { id: 1 });
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'), '超限页仍须是完整文档');
  assert.match(html, /这张图太大放不下（超过 1 MB）：可以打开下面的文件名自己看/, '#473：退让句缺失');
  assert.match(html, /照片没显示（太大放不下：2026-09-04_001\.png）/, '#473：占位句须明示文件名');
  assert.match(html, /这张照片的信息/, '#473：信息表仍在（文件名在表里可查）');
  assert.match(html, /2026-09-04_001\.png/, '文件名须在页上');
  assert.doesNotMatch(html, /超预算未嵌|换小图后重跑|1 MiB/, '#473：旧句（超预算未嵌／换小图后重跑／1 MiB）须 0 命中');
  assert.doesNotMatch(html, /data:image\//, '退让后不该再内嵌字节');
});

test('变异自证：去掉内嵌必红，改回必绿', async () => {
  const iso = seedIso();
  const env = runOk(iso, 'calorie.photo.compare', { id1: 1, id2: 2 });
  const out = assertOutputOnDisk(env);
  const good = readFileSync(out, 'utf8');
  assertShape(good);
  // 变异：去掉内嵌必红。
  const mutated = good.split('data:image/').join('FILENAME-ONLY:');
  assert.throws(() => assertShape(mutated), /内嵌照片缺失/, '变异（去内嵌）未红');
  console.log('281-MUT-RED 去内嵌必红 OK');
  // 改回必绿。
  assertShape(good);
  console.log('281-MUT-GREEN 改回必绿 OK');
});
