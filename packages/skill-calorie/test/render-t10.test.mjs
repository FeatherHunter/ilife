/** T10 #29 · 身体照片渲染测试：tmp 隔离，真实 DB 零触碰。
 * 验收：收据（存/删/标签）+ 画廊 + 对比 + 单图 + 动图规划（只出任务描述）
 * + HELP 现找直达可执行命令 + crud/error 收据；二进制原样（只透路径，不嵌 base64）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import {
  addPhotos, getPhotoRow, deletePhoto, updateTag, tagAdd, tagRemove,
  daysSinceTagPhoto,
} from '../dist/fetch/photos.js';
import {
  buildAddReceipt, buildDeleteReceipt, buildTagReceipt,
  buildGalleryData, buildCompareData, buildViewerData, buildGifTask,
  buildPhotoHelp, lookupPhotoHelp,
  buildCrudReceipt, buildErrorReceipt,
  photoShapeFor, PHOTO_VIEW_KEYS, CalorieRenderError,
  renderPhotoReceiptHtml, renderGalleryHtml, renderCompareHtml,
  renderViewerHtml, renderGifHtml, renderPhotoHelpHtml, renderErrorHtml,
} from '../dist/render/index.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't29-')), 't.db'));

function seedPhotos(db) {
  const dir = mkdtempSync(join(tmpdir(), 't29-src-'));
  const photosDir = mkdtempSync(join(tmpdir(), 't29-photos-'));
  const src = (name) => {
    const p = join(dir, name);
    writeFileSync(p, 'fake-bytes-' + name);
    return p;
  };
  // 09-04 正面 / 09-05 正面+备注 / 09-06 侧面
  const a = addPhotos(db, photosDir, { srcPaths: [src('a.jpg')], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  const b = addPhotos(db, photosDir, { srcPaths: [src('b.jpg')], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
  const c = addPhotos(db, photosDir, { srcPaths: [src('c.jpg')], tag: '侧面', today: '2026-09-06', nowTime: '08:00:00' });
  return { photosDir, ids: [a[0].id, b[0].id, c[0].id] };
}

test('收据：存照片（单张/批量）+ 间隔 + HTML', () => {
  const db = tmpDb();
  const { photosDir } = seedPhotos(db);
  const added = addPhotos(db, photosDir, {
    srcPaths: [join(photosDir, '2026-09-04_001.jpg'), join(photosDir, '2026-09-05_001.jpg')],
    tag: '正面', today: '2026-09-06', nowTime: '09:00:00',
  });
  assert.equal(added.length, 2);
  const dist = daysSinceTagPhoto(db, '正面', '2026-09-06');
  const r = buildAddReceipt(added, { tag: '正面', distance: dist === null ? null : { tag: '正面', days: dist } });
  assert.equal(r.scene, '批量存照片');
  assert.equal(r.op, 'create');
  assert.match(r.summary, /已存入 2 张身材照/);
  const html = renderPhotoReceiptHtml(r);
  assert.match(html, /批量存照片回执/);
  assert.match(html, /ilife-page/);
  assert.match(html, /data-slot="ilife:calorie:photo:receipt"/);
  assert.doesNotMatch(html, /base64/);
  db.close();
});

test('收据：删照片快照 + 标签三操作 + 无变化明示', () => {
  const db = tmpDb();
  const { ids } = seedPhotos(db);
  const snap = getPhotoRow(db, ids[0]);
  const del = deletePhoto(db, mkdtempSync(join(tmpdir(), 't29-del-')), ids[0]);
  assert.equal(del.deleted, true);
  const rd = buildDeleteReceipt(snap);
  assert.equal(rd.op, 'delete');
  assert.match(rd.summary, new RegExp('已删除身材照 #' + ids[0]));
  assert.match(renderPhotoReceiptHtml(rd), /已删除/);
  // 改标签整套覆盖
  updateTag(db, ids[1], '正面,背部');
  const rs = buildTagReceipt(ids[1], ['正面'], ['正面', '背部'], '改照片标签');
  assert.deepEqual(rs.tagDiff, { before: ['正面'], after: ['正面', '背部'] });
  assert.equal(rs.noChange, false);
  assert.match(renderPhotoReceiptHtml(rs), /改前.*改后/);
  // 无变化明示
  const rn = buildTagReceipt(ids[1], ['正面', '背部'], ['正面', '背部'], '改照片标签');
  assert.equal(rn.noChange, true);
  assert.match(rn.summary, /未产生实际变化/);
  // 追加判重 + 移除
  assert.equal(tagAdd(db, ids[1], '背部'), 0);
  assert.equal(tagAdd(db, ids[1], '侧面'), 1);
  const ra = buildTagReceipt(ids[1], ['正面', '背部'], ['正面', '背部', '侧面'], '加照片标签');
  assert.match(ra.summary, /追加标签/);
  assert.equal(tagRemove(db, ids[1], '侧面'), true);
  const rr = buildTagReceipt(ids[1], ['正面', '背部', '侧面'], ['正面', '背部'], '删照片标签');
  assert.match(rr.summary, /移除标签/);
  db.close();
});

test('画廊：筛选/计数/距上次 + 二进制不内嵌', () => {
  const db = tmpDb();
  const { photosDir } = seedPhotos(db);
  const g = buildGalleryData(db, { today: '2026-09-06' }, photosDir);
  assert.equal(g.totalCount, 3);
  assert.deepEqual(g.tagCounts, [{ tag: '侧面', count: 1 }, { tag: '正面', count: 2 }]);
  assert.equal(g.daysSinceLast, 0);
  assert.ok(g.photos.every((p) => p.fileExists === true));
  const noDir = buildGalleryData(db, { today: '2026-09-06' });
  assert.ok(noDir.photos.every((p) => p.fileExists === null));
  const f = buildGalleryData(db, { tag: '侧面', today: '2026-09-06' }, photosDir);
  assert.equal(f.totalCount, 1);
  assert.equal(f.photos[0].tagList.join(','), '侧面');
  const html = renderGalleryHtml(g);
  assert.match(html, /看身材照 · 3 张/);
  assert.match(html, /2026-09-04_001\.jpg/);
  assert.doesNotMatch(html, /base64/);
  assert.throws(() => buildGalleryData(db, { dateFrom: '2020-01-01', dateTo: '2020-01-02' }),
    (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  db.close();
});

test('对比：间隔 + 跨标签警告 + 同体拒绝', () => {
  const db = tmpDb();
  const { ids } = seedPhotos(db);
  const same = buildCompareData(db, ids[0], ids[1]);
  assert.equal(same.intervalDays, 1);
  assert.equal(same.crossTagWarning, false);
  assert.equal(same.orderByDate, true);
  const cross = buildCompareData(db, ids[0], ids[2]);
  assert.equal(cross.intervalDays, 2);
  assert.equal(cross.crossTagWarning, true);
  const html = renderCompareHtml(cross);
  assert.match(html, /间隔 2 天/);
  assert.match(html, /跨标签对比警告/);
  assert.throws(() => buildCompareData(db, ids[0], ids[0]), /同一张/);
  assert.throws(() => buildCompareData(db, 9999, ids[0]),
    (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  db.close();
});

test('单图：同标签 prev/next 导航', () => {
  const db = tmpDb();
  const { ids } = seedPhotos(db);
  const mid = buildViewerData(db, ids[1]);
  assert.equal(mid.prevId, ids[0]);
  assert.equal(mid.nextId, null);
  const solo = buildViewerData(db, ids[2]);
  assert.equal(solo.prevId, null);
  assert.equal(solo.nextId, null);
  const html = renderViewerHtml(mid);
  assert.match(html, new RegExp('身材照查看 #' + ids[1]));
  assert.match(html, /上一张/);
  assert.throws(() => buildViewerData(db, 9999),
    (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  db.close();
});

test('动图：只出任务描述，不碰二进制', () => {
  const db = tmpDb();
  seedPhotos(db);
  const t = buildGifTask(db, { tag: '正面', days: 90 });
  assert.equal(t.task, 'generate_gif');
  assert.equal(t.photoCount, 2);
  assert.equal(t.photoIds.length, 2);
  assert.equal(t.firstDate, '2026-09-04');
  assert.equal(t.lastDate, '2026-09-05');
  assert.match(t.note, /不碰二进制/);
  const scoped = buildGifTask(db, { tag: '正面', days: 90, photoIds: [t.photoIds[0]] });
  assert.equal(scoped.photoCount, 1);
  const empty = buildGifTask(db, { tag: '不存在', days: 90 });
  assert.equal(empty.photoCount, 0);
  assert.match(empty.note, /无匹配照片/);
  assert.throws(() => buildGifTask(db, { tag: '' }), /tag 必填/);
  const html = renderGifHtml(t);
  assert.match(html, /生成身材照 GIF · 2 张/);
  assert.doesNotMatch(html, /base64/);
  db.close();
});

test('HELP：现找直达可执行命令（Q71）', async () => {
  const all = buildPhotoHelp();
  assert.equal(all.length, 10);
  const hits = lookupPhotoHelp('记身材照');
  assert.equal(hits.length, 3);
  assert.ok(hits.every((h) => h.exec.startsWith('node ') && h.exec.includes(h.fn)));
  assert.ok(all.every((h) => h.legacyCli.startsWith('python scripts/render_')));
  // 可执行性实证：exec 指向的模块确有该导出（包名前缀映射为相对路径同文件）
  for (const h of all) {
    const rel = h.module.replace('skill-calorie/dist/', '../dist/');
    const mod = await import(rel);
    assert.equal(typeof mod[h.fn], 'function', h.key + ' 缺导出 ' + h.fn);
  }
  const html = renderPhotoHelpHtml(hits, '记身材照');
  assert.match(html, /HELP 速查/);
  assert.match(html, /node --input-type=module/);
  assert.throws(() => lookupPhotoHelp(''), /查询词必填/);
  assert.deepEqual(lookupPhotoHelp('不存在的唤醒词xyz'), []);
});

test('envelope 键表：六视图形状 + 未知拒绝', () => {
  assert.equal(PHOTO_VIEW_KEYS.gallery, 'calorie.photo_list');
  assert.equal(PHOTO_VIEW_KEYS.viewer, 'calorie.photo_detail');
  assert.equal(PHOTO_VIEW_KEYS.compare, 'calorie.photo_compare');
  assert.equal(PHOTO_VIEW_KEYS.receipt, 'calorie.photo_receipt');
  assert.equal(PHOTO_VIEW_KEYS.gif, 'calorie.photo_gif');
  assert.equal(PHOTO_VIEW_KEYS.help, 'calorie.help_center');
  assert.equal(photoShapeFor('calorie.photo_list'), 'list');
  assert.equal(photoShapeFor('calorie.photo_detail'), 'detail');
  assert.equal(photoShapeFor('calorie.photo_receipt'), 'receipt');
  assert.equal(photoShapeFor('calorie.photo_gif'), 'analysis');
  assert.throws(() => photoShapeFor('calorie.unknown'), /未知照片视图/);
});

test('crud/error 收据：守卫 + 缺省 + HTML', () => {
  assert.throws(() => buildCrudReceipt({
    scene: 'x', action: 'x', op: 'create', summary: '', wakeWord: 'w', source: 's',
  }), /summary 必填/);
  assert.throws(() => buildCrudReceipt({
    scene: 'x', action: 'x', op: 'bad', summary: 's', wakeWord: 'w', source: 's',
  }), /op 非法/);
  const e = buildErrorReceipt({ sceneName: '补记体脂', op: '补记体脂 2026-07-20', reason: '该日期已有体脂记录' });
  assert.deepEqual(e.suggestions, ['修正后重试', '更换参数/目标', '联系开发者']);
  assert.equal(e.fixPrompt, '// 修正 prompt 未生成');
  const html = renderErrorHtml(e);
  assert.match(html, /补记体脂失败回执/);
  assert.match(html, /该日期已有体脂记录/);
});
