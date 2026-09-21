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
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

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
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(iso.dbDir, { photos: { dir: iso.photosDir } })), ...freezeClock(TODAY) },
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
  // #526：间隔改**独立间隔条**（两张日期块 ＋ 大数字 N ＋ 单位「天」），N 等于两张照片日期差
  //（09-04 vs 09-05＝1）。旧形态是挂在页标题后的 `· 间隔 <b>N</b> 天` 半句。
  assert.match(html, /class="phu-iv-n">1<\/span><span class="phu-iv-u">天<\/span>/, '间隔条 N≠日期差（09-04 vs 09-05 应为 1）');
  assert.doesNotMatch(html, /间隔 <b>\d+<\/b> 天/, '#526：旧形态（页标题后的间隔半句）须 0 命中');
  // 同标签对比：判语出「可以直接对照」那一句，且旧句全页 0 命中。
  assert.match(html, /两张标签一样，放在一起可以直接对照看变化。/, '#526：同标签判语（结论条）缺失');
  assert.doesNotMatch(html, /角度不一样/, '同标签对比不应出角度不一样的提醒');
  assert.doesNotMatch(html, /跨标签/, '同标签对比不应出跨标签警告');
  // #526：KPI 那两格（`角度一致吗`／`2 张都已显示`）删——判语与建议收成一条结论条一处说。
  assert.doesNotMatch(html, /角度一致吗|张都已显示/, '#526：KPI 里与结论条重复的两格须删');
  // 副标题 `日期 vs 日期` 也删（两张日期就在间隔条的两端）。
  assert.doesNotMatch(html, /2026-09-04 vs 2026-09-05/, '#526：副标题的日期对照须删（间隔条两端已说）');
  assert.match(html, /class="phu-date">2026-09-04<\/span>[\s\S]*class="phu-date">2026-09-05<\/span>/, '间隔条两端须是两张的日期');
  // envelope 数据形与改前一致（items/total）。
  assert.equal(env?.data?.total, 2, 'data.total≠2');
});

test('对比页角度不一样的提醒改人话（N=3，旧句 0 命中）', async () => {
  const iso = seedIso();
  const env = runOk(iso, 'calorie.photo.compare', { id1: 1, id2: 4 });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  assertShape(html);
  // #526：判语收成一条结论条（原 #473 的提醒行 ＋ KPI `角度一致吗` 两处说同一件事）。
  assert.match(html, /这两张的标签不一样，放在一起看不出真实变化。建议挑同角度的两张再对比。/, '#526：结论条新文案缺失');
  assert.doesNotMatch(html, /跨标签对比警告|可比性较弱/, '#473：旧句（跨标签对比警告／可比性较弱）须 0 命中');
  assert.match(html, /class="phu-iv-n">3<\/span><span class="phu-iv-u">天<\/span>/, '间隔条 N≠日期差（09-04 vs 09-07 应为 3）');
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
  // #526：标题改人话（原 `身材照查看 #2` 里的 `#2` 是给机器看的编号，且撞内部标识符判据）；
  // 编号与标签改由页头身份徽章承载。
  assert.match(html, /2026-09-05 的身材照/, '#526：人话标题缺失');
  assert.doesNotMatch(html, /身材照查看 #/, '#526：旧机器标题（`身材照查看 #N`）须 0 命中');
  assert.match(html, /<span class="ilife-block-chip">编号 2<\/span>/, '#526：身份徽章「编号 2」缺失');
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
  // #473／#526：页头身份徽章列＝编号／标签／拍摄时刻／相对时间（四件事各占一枚徽章，
  // 不再靠 `#2 2026-09-05 08:00 · 2 天前 · 正面 · 文件名` 那种串）；文件名住信息段的「文件」键值行。
  assert.match(html, /<div class="phu-chips"><span class="ilife-block-chip">编号 2<\/span><span class="ilife-block-chip">正面<\/span><span class="ilife-block-chip">2026-09-05 08:00<\/span><span class="ilife-block-chip">2 天前<\/span><\/div>/, '#526：页头身份徽章列形状不符（编号／标签／时刻／相对时间）');
  assert.match(html, /<div class="phu-fact"><span class="phu-fk">文件<\/span><span class="phu-fv"><code>2026-09-05_001\.png<\/code>/, '#526：文件键值行（含文件名小字块）缺失');
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
  // 返回带筛选上下文（#526：动作标签改「复制回画廊指令」——命令原文住 `data-t`，可见面只说做什么）。
  assert.match(first, /复制回画廊指令/, '回画廊那颗复制按钮缺失');
  assert.match(first, /正面/, '返回筛选上下文（标签）缺失');
  assert.match(first, /calorie\.photo\.list/, '返回画廊命令缺失');
  // #473：删入口改人话＋安全感，旧「硬删除，不可恢复」出页面（「不可恢复」全页 0 命中）。
  assert.match(first, /删掉这张照片/, '#473：删入口标题缺失');
  assert.match(first, /删了就找不回来，先确认上面那张是不是它/, '#473：删入口安全感那句缺失');
  assert.doesNotMatch(first, /不可恢复/, '#473：旧句「不可恢复」须 0 命中');
  assert.match(first, /calorie\.photo\.remove/, '删命令缺失');
  // #526：两条命令原文都住进**复制按钮的 `data-t`**（页上不再有命令块 `<pre>`——命令键上屏即
  // 内部标识符债，见 `photo-responsive-484` 的同名判据）；两条各一颗按钮，同一次渲染内 id 必须不同。
  const cmds = [...first.matchAll(/data-action-id="([^"]*)" data-t="([^"]*)"/g)].map((m) => ({ id: m[1], text: m[2] }));
  const cmdTexts = cmds.map((c) => c.text);
  assert.ok(cmdTexts.some((t) => t.includes('calorie.photo.remove')), '删命令的复制文本缺失');
  assert.ok(cmdTexts.some((t) => t.includes('calorie.photo.list')), '回画廊命令的复制文本缺失');
  assert.equal(new Set(cmds.map((c) => c.id)).size, cmds.length, '#526：同一次渲染内复制按钮 id 须互不相同');
  // 删那颗走本域冻结的复制 id（`base-paint` 的 `HELP_COPY_ACTIONS.prompt`，卡路里侧不自造 id）。
  assert.ok(cmds.some((c) => c.id === COPY_ACTION_ID && c.text.includes('calorie.photo.remove')),
    '#473：删命令那颗复制按钮的冻结 id 缺失');
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

test('超预算提示块：哪张没显示／为什么＋替代操作（缺失不牵连正常照片）', async () => {
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
  // #499：改同域人话口径（与 #472 的 `galleryDoc.budgetNoticeHtml` 同族）——句面钉死；
  // 负向钉住「旧句／内部单位必须 0 命中」；旧句改回去即红（下方变异自证另跑一遍）。
  assert.match(html, /这两张里有一张太大，本页没显示：2026-09-04_001\.png/, '#499：须点名哪张没显示（逐张列文件名）');
  assert.match(html, /可以打开文件名自己看，或改查单张详情分开看/, '#499：须给替代操作');
  assert.doesNotMatch(html, /超预算横幅|未嵌入|单页上限|1 MiB|换小图后重跑|已嵌入/,
    '#499：旧句与内部单位（超预算横幅／未嵌入／单页上限／1 MiB／换小图后重跑／已嵌入）须 0 命中');
  // #473／#526：被弃那张的占位**明示哪一份文件**（#526 起形状化：状态徽标 ＋ 文件名 ＋ 下一步，
  // 不再用 `照片没显示（太大放不下：…）` 这种括号串——同一件事已由上面那句提示块一处说清）。
  assert.match(html, /<div class="phu-shot"><figure class="ilife-block ilife-block-media">[\s\S]*?<div class="ilife-block-media-reason">没显示：2026-09-04_001\.png<\/div>/,
    '#526：被弃那张的占位须点名哪一份文件（为什么由页顶提示块一处说）');
  assert.doesNotMatch(html, /超预算未内嵌/, '#473：旧句「超预算未内嵌」须 0 命中');
  // 缺失不牵连：另一张仍内嵌。
  assert.match(html, /data:image\//, '正常照片应仍内嵌');
});

test('#526 详情页超限态：页顶结论条说清多大与为什么＋占位点名文件（旧句 0 命中）', async () => {
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
  // #526：退让句从「这张图太大放不下（超过 1 MB）：可以打开下面的文件名自己看」改成**页顶一条结论条**
  // （说这张原图多大 ＋ 一页装不下），占位那格只说下一步——同一件事从两处合成一处（`seat-brief` §8
  // 点名的重复债），并且不再暴露页内上限（#438 的「不暴露页内上限与字节数」口径）。
  assert.match(html, /这张原图 [\d.]+ (MB|KB)，一页放不下，图没放进本页/, '#526：退让句缺失（结论条须说清多大与为什么）');
  assert.doesNotMatch(html, /超过 1 MB/, '#526：页内上限不许上屏（退让句改说这张原图的实际大小）');
  assert.match(html, /想看原图：自己打开这份文件/, '#526：占位那格须给下一步');
  // #526 收口第二轮：状态徽标并入占位件的**原因行**（同一事实一页一处，占位不再挂第二枚徽标）。
  assert.match(html, /<div class="ilife-block-media-reason">这张原图没显示：2026-09-04_001\.png<\/div>/, '#526：占位须点名哪一份文件');
  assert.match(html, /<code>2026-09-04_001\.png<\/code>/, '#526：占位须明示哪一份文件');
  assert.match(html, /这张照片的信息/, '#473：信息段仍在（文件名在页上可查）');
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
