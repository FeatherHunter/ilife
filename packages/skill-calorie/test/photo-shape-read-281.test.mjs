/** #281 · 读侧铺开形状验证（对比两张照片＋查身材照＝完整文档＋内嵌照片＋复制区）。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 指向 tmp），
 * 真实 DB 零触碰。真跑 `calorie-cmd-read calorie.photo.compare／calorie.photo.detail`
 *（独立进程，非就地 dispatch）。
 *
 * 断言（票面五条）：
 * ① 两条命令真跑，产物都以 `<!doctype html>` 起、含复制区与 `data:image/`；
 * ② 对比页保留老实物口径（并排双卡＋间隔天数 N 等于日期差＋跨标签警告文案）；
 * ③ 缺照片／不存在的 id 按既有缺失阻断口径（exit 4，不回半页）；
 * ④ 变异自证（去掉内嵌必红，改回必绿，两行机器读数）；
 * ⑤ 每条成功用例另断言 `data.output` 是绝对路径且该文件在盘上（失败用例断言无半页落盘）。
 *
 * 融合验收（t400 基准）：对比页裁定 4（警告行＋间隔 N 天，缺值不回半页）＋裁定 6（n/a 对比页）；
 * 详情页裁定 4（同标签翻页链，首尾禁用，无坏链）＋裁定 6（黑底 75vh contain＋硬删除口径）；
 * 两页裁定 5（完整文档＋复制区分族，位置照基准骨架）；体积口径复用 t341（超预算横幅 N／M＋替代操作）。
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
    env: { ...process.env, SKILLS_DB_PATH: iso.dbDir, CALORIE_PHOTOS_DIR: iso.photosDir },
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

/** 同形总闸（完整文档＋内嵌＋复制区）；变异体走此闸必红。 */
function assertShape(html) {
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'), '文档头缺失（须以 <!doctype html> 起）');
  assert.match(html, /<meta charset/i, 'charset 缺失');
  assert.match(html, /复制数据/, '复制区标记缺失');
  assert.match(html, /data:image\//, '内嵌照片缺失（须含 data:image/）');
}

function navOf(html) {
  const m = html.match(/<div data-nav>([\s\S]*?)<\/div>/);
  assert.ok(m, '翻页链缺失（须有 data-nav 区）');
  return m[1];
}

test('对比页真跑：同形＋并排双卡＋间隔 N 等于日期差（同标签无警告）', async () => {
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
  // 同标签对比不出警告行。
  assert.doesNotMatch(html, /跨标签/, '同标签对比不应出跨标签警告');
  // envelope 数据形与改前一致（items/total）。
  assert.equal(env?.data?.total, 2, 'data.total≠2');
});

test('对比页跨标签警告行文案保留（N=3）', async () => {
  const iso = seedIso();
  const env = runOk(iso, 'calorie.photo.compare', { id1: 1, id2: 4 });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  assertShape(html);
  assert.match(html, /跨标签对比警告/, '跨标签警告行缺失');
  assert.match(html, /可比性较弱/, '警告行须保留「可比性较弱」');
  assert.match(html, /间隔 <b>3<\/b> 天/, '间隔横幅 N≠日期差（09-04 vs 09-07 应为 3）');
});

test('详情页真跑：同形＋黑底大图＋中张双链', async () => {
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
  assert.doesNotMatch(html, /href="#"/, '坏链（href="#"）');
  // 快照明细在页（删流程快照角色）。
  assert.match(html, /快照明细/, '快照明细缺失');
  assert.equal(env?.data?.item?.id, 2, 'data.item.id≠2');
});

test('详情页首尾禁用＋返回筛选上下文＋硬删除口径', async () => {
  const iso = seedIso();
  const first = readFileSync(assertOutputOnDisk(runOk(iso, 'calorie.photo.detail', { id: 1 })), 'utf8');
  const nav1 = navOf(first);
  assert.equal((nav1.match(/<a /g) ?? []).length, 1, '首张应只剩下一张链');
  assert.match(nav1, /上一张：无/, '首张上一张须禁用');
  assert.match(nav1, /翻页禁用/, '首张须有禁用态');
  assert.match(nav1, /#photo-2/, '首张下一张链缺失');
  const last = readFileSync(assertOutputOnDisk(runOk(iso, 'calorie.photo.detail', { id: 3 })), 'utf8');
  const nav3 = navOf(last);
  assert.equal((nav3.match(/<a /g) ?? []).length, 1, '尾张应只剩下上一张链');
  assert.match(nav3, /下一张：无/, '尾张下一张须禁用');
  assert.match(nav3, /翻页禁用/, '尾张须有禁用态');
  assert.match(nav3, /#photo-2/, '尾张上一张链缺失');
  // 单标签孤张双禁用（#4 侧面）。
  const lone = readFileSync(assertOutputOnDisk(runOk(iso, 'calorie.photo.detail', { id: 4 })), 'utf8');
  assert.equal((navOf(lone).match(/<a /g) ?? []).length, 0, '孤张应双禁用');
  // 返回带筛选上下文。
  assert.match(first, /返回画廊/, '返回画廊缺失');
  assert.match(first, /正面/, '返回筛选上下文（标签）缺失');
  assert.match(first, /calorie\.photo\.list/, '返回画廊命令缺失');
  // 删记录说明按硬删除口径，老「文件保留」提示作废。
  assert.match(first, /硬删除，不可恢复/, '硬删除口径缺失');
  assert.doesNotMatch(first, /文件保留/, '老「文件保留」提示须作废');
  // 删命令在页（confirm＋删词，照抄可跑）。
  assert.match(first, /calorie\.photo\.remove/, '删命令缺失');
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
  assert.match(html, /超预算未内嵌/, '被弃那张须明示原因');
  // 缺失不牵连：另一张仍内嵌。
  assert.match(html, /data:image\//, '正常照片应仍内嵌');
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
