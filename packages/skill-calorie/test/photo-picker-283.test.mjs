/** #283 · 删照候选与快照验收（只读过程型页：候选 → 快照 → 可复制 prompt）。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR` 指向 tmp），
 * 真实 DB 零触碰。真跑 `calorie-cmd-read calorie.view.photo-picker`（独立进程，非就地 dispatch）。
 *
 * 断言（票面五条）：
 * ① 新命令真跑，产物含候选列表与 `data:image/`（快照）；② 页上有可复制的 prompt，
 *    且复制的就是写命令的照抄即跑形状（含 `--params` 与选中的 id）——把 prompt 里
 *    ```bash 块抽出来真跑一遍（删走 `calorie.photo.remove`、标签走 `calorie.photo.tag`），
 *    exit 0 才算数；③ 空库时 exit 4 不落盘；④ 变异自证（候选摘掉必红，改回必绿）；
 * ⑤ `data.output` 是绝对路径且该文件在盘上；单页体积沿用 t341 体积节同一上限。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-picker-283.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from '../dist/photo/galleryDoc.js';

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const TINY_PNG_2_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function seedIso() {
  const root = mkdtempSync(join(tmpdir(), 't283-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  const a = join(srcDir, 'a.png');
  const b = join(srcDir, 'b.png');
  writeFileSync(a, Buffer.from(TINY_PNG_B64, 'base64'));
  writeFileSync(b, Buffer.from(TINY_PNG_2_B64, 'base64'));
  const db = openDb(join(dbDir, 'calorie_data.db'));
  addPhotos(db, photosDir, { srcPaths: [a], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [b], tag: '正面', note: '早起', today: '2026-09-05', nowTime: '08:00:00' });
  db.close();
  return { root, dbDir, photosDir };
}

function runCli(iso, key, params, extraArgs = []) {
  return spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params), ...extraArgs], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: iso.dbDir, CALORIE_PHOTOS_DIR: iso.photosDir },
  });
}

function runPickerOk(iso, params) {
  const r = runCli(iso, 'calorie.view.photo-picker', params);
  assert.equal(r.status, 0, 'picker exit 非 0：' + (r.stderr ?? '').slice(0, 500));
  return JSON.parse(String(r.stdout).trim());
}

function assertOutputOnDisk(env) {
  const out = env?.data?.output;
  assert.equal(typeof out, 'string', 'data.output 缺失');
  assert.ok(isAbsolute(out), 'data.output 非绝对路径：' + out);
  assert.ok(existsSync(out), 'data.output 不在盘上：' + out);
  return out;
}

/** 形状总闸（完整文档＋候选＋快照内嵌＋prompt 复制区＋体积）；变异体走此闸必红。 */
function assertShape(html) {
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'), '文档头缺失（须以 <!doctype html> 起）');
  assert.match(html, /<meta charset/i, 'charset 缺失');
  assert.match(html, /复制数据/, '复制区标记缺失');
  assert.match(html, /data:image\//, '内嵌照片缺失（须含 data:image/）');
  assert.match(html, /候选/, '候选列表标记缺失');
  assert.match(html, /快照/, '快照标记缺失');
  assert.match(html, /复制/, '复制标记缺失');
  assert.doesNotMatch(html, /发送/, '复制按钮文案不得称发送（t400 口径：只称复制）');
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes <= PHOTO_LIST_PAGE_MAX_BYTES, '单页体积超限：' + bytes + ' > ' + PHOTO_LIST_PAGE_MAX_BYTES);
  return bytes;
}

function unescapeHtml(s) {
  return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** #474 · 只留**可见文本**：剔掉 `<style>`／`<script>` 两段，再剔掉 `data-t="…"`／`data-command="…"`
 *  两处机器面（复制载荷与命令原文）。「可见文本 0 命中」这一类判据必须走这道门——机器面里的
 *  命令键是**该在**的东西，拿整份 HTML 判它等于把正确的机器内容判成违规。 */
function visibleText(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/\sdata-(?:t|command)="[^"]*"/g, ' ')
    .replace(/<[^>]*>/g, ' ');
}

/** #474 · **对读者说的那句文案**：在 `visibleText` 之上再剔掉指令预览块（`<pre>` 里是给 AI 的
 *  机器内容：`calorie-cmd-read … --params '{…}'`）。信封键名与命令名在那一块里是该在的，
 *  只有别处（页头、眉标、表注、空态）出现才算泄漏。 */
function readerText(html) {
  return visibleText(String(html).replace(/<pre[\s\S]*?<\/pre>/gi, ' '));
}

/** 从 prompt 预览块抽出 ```bash 可执行 CLI（照抄即跑形状）。 */
function extractBashCli(html) {
  const m = /```bash\n([\s\S]*?)\n```/.exec(unescapeHtml(html));
  assert.ok(m, 'prompt 预览区缺 ```bash 可执行块（t400 裁定 2）');
  const cli = m[1].trim();
  assert.match(cli, /^calorie-cmd-read calorie\.photo\.(remove|tag) --params '\{.*\}'$/, '抽出的不是写命令照抄即跑形状：' + cli);
  return cli;
}

function runExtractedCli(iso, cli) {
  const parts = cli.split(' ');
  const key = parts[1];
  const pi = parts.indexOf('--params');
  const params = JSON.parse(parts.slice(pi + 1).join(' ').replace(/^'/, '').replace(/'$/, ''));
  const r = runCli(iso, key, params);
  assert.equal(r.status, 0, '抽出的 prompt 真跑 exit 非 0：' + cli + ' stderr=' + (r.stderr ?? '').slice(0, 300));
  const env = JSON.parse(String(r.stdout).trim());
  assert.equal(env?.data?.ok, true, '写命令回执非 ok：' + cli);
  return env;
}

test('① 候选与快照真跑（缩略图＋日期＋标签＋快照＋prompt）', async () => {
  const iso = seedIso();
  const env = runPickerOk(iso, { id: 1 });
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  const bytes = assertShape(html);
  assert.ok(bytes > 500, '页面过小，不像含内嵌照片：' + bytes);
  assert.match(html, /#1/, '候选缺 #1');
  // #474：候选行只留「#编号 标签 · 短日期 · 相对时间」——文件名只在**候选列表之外**
  // （快照明细表的「文件」列）出现，故这里只对候选列表那一段判。
  const candList = /<ol>([\s\S]*?)<\/ol>/.exec(html);
  assert.ok(candList, '候选列表（<ol>）缺失');
  assert.match(candList[1], /#1 正面 · 09-04/, '候选行缺「#编号 标签 · 短日期」');
  assert.match(candList[1], /09-04 · \d+ 天前/, '候选行缺相对时间');
  assert.doesNotMatch(candList[1], /文件存在/, '#474：正常照片不许逐行喊「文件存在」');
  assert.doesNotMatch(candList[1], /2026-09-04_00\d\.png/, '#474：候选行不再抄文件名');
  assert.match(html, /<figcaption>快照 #1 2026-09-04/, '快照位应留完整日期（删前核对凭据）');
  assert.match(html, /<title>/, '文档标题缺失');
  assert.match(html, /删照候选/, '页名缺失');
  assert.match(html, /calorie\.photo\.remove/, 'prompt 缺删除写命令');
  assert.match(html, /&quot;id&quot;:1|&#34;id&#34;:1|"id":1/, 'prompt 缺选中的 id');
  // #474：内部命令名、内部词「内嵌」、H1 张数重复、表注旧句一律下屏（判**对读者说的那句文案**：
  //  指令预览块与 `data-t` 里的命令键是该在的，不参与这一判）。
  const read = readerText(html);
  assert.doesNotMatch(read, /calorie\.view\.photo-picker/, '#474：眉标里的内部命令名须 0 命中');
  assert.doesNotMatch(read, /内嵌/, '#474：「内嵌」这种技术词须 0 命中');
  assert.doesNotMatch(read, /身材照片域/, '#474：内部词「域」须 0 命中');
  assert.doesNotMatch(read, /删照候选 · \d+ 张/, '#474：H1 里的张数重复须删（页名不许再带张数）');
  assert.doesNotMatch(read, /快照明细（只读，删除走写命令）/, '#474：旧表注须 0 命中');
  assert.match(read, /本页不删任何东西；要删得你复制下面那段指令/, '#474：表注安全感那句缺失');
});

test('② prompt 照抄即跑（抽出即跑：删与标签各一遍）', async () => {
  const iso = seedIso();
  const env = runPickerOk(iso, { id: 1 });
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  const cli = extractBashCli(html);
  assert.ok(cli.includes('"id":1'), '删 prompt 未含选中的 id：' + cli);
  // #474：对着用户说的那句改人话（命令段一字未动）。
  assert.match(html, /删了就找不回来，先看上面那张是不是它/, '#474：删除提示须改人话');
  assert.doesNotMatch(html, /硬删除，不可恢复，跑之前请先核对本页快照/, '#474：旧系统口吻须 0 命中');
  // #474：op 缺项占位句不再印 `op/set/add/remove/newTag` 五个英文词。
  //  （顺序：本用例末尾那条 `remove` 真把 #1 删掉，所以对 #1 的读都排在它前面。）
  const noOp = runPickerOk(iso, { id: 1, action: 'tag' });
  const noOpHtml = readFileSync(assertOutputOnDisk(noOp), 'utf8');
  assert.match(noOpHtml, /要把标签换成、加上，还是去掉哪个/, '#474：缺 op 占位句须改人话');
  assert.doesNotMatch(noOpHtml, /op（set 全量替换／add 追加／remove 移除）/, '#474：五个英文参数词须 0 命中');
  const tagEnv = runPickerOk(iso, { id: 2, action: 'tag', op: 'add', newTag: '晨起' });
  const tagHtml = readFileSync(assertOutputOnDisk(tagEnv), 'utf8');
  const tagCli = extractBashCli(tagHtml);
  assert.ok(tagCli.includes('calorie.photo.tag') && tagCli.includes('"id":2'), '标签 prompt 未含写命令与选中的 id：' + tagCli);
  runExtractedCli(iso, tagCli);
  runExtractedCli(iso, cli);
});

test('③ 空库 exit 4 不落盘', async () => {
  const root = mkdtempSync(join(tmpdir(), 't283-empty-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  openDb(join(dbDir, 'calorie_data.db')).close();
  const iso = { root, dbDir, photosDir };
  const noFile = join(root, 'must-not-exist.html');
  const r = runCli(iso, 'calorie.view.photo-picker', {}, ['--html', noFile]);
  assert.equal(r.status, 4, '空库应 exit 4，实测 ' + r.status + ' stderr=' + (r.stderr ?? '').slice(0, 300));
  assert.equal(existsSync(noFile), false, '空库不得落盘（显式落点也不许建文件）');
});

test('④ 变异自证：候选摘掉必红，改回必绿', async () => {
  const iso = seedIso();
  const env = runPickerOk(iso, { id: 1 });
  const good = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertShape(good);
  const mutated = good.split('data:image/').join('FILENAME-ONLY:');
  assert.throws(() => assertShape(mutated), /内嵌照片缺失/, '变异（摘候选内嵌）未红');
  console.log('MUTATION-RED ok（摘候选内嵌必红）');
  assertShape(good);
  console.log('MUTATION-GREEN ok（改回必绿）');
});

test('#474 文件找不到才出声：正常行留空、异常行挂徽标、KPI 说「能看」几张', async () => {
  const iso = seedIso();
  rmSync(join(iso.photosDir, '2026-09-04_001.png'), { force: true });
  const env = runPickerOk(iso, { id: 1 });
  const html = readFileSync(assertOutputOnDisk(env), 'utf8');
  assertShape(html);
  const candList = /<ol>([\s\S]*?)<\/ol>/.exec(html);
  assert.ok(candList, '候选列表（<ol>）缺失');
  assert.equal((candList[1].match(/找不到文件/g) ?? []).length, 1, '异常那张须逐行出声，且只出一次');
  assert.match(candList[1], /status-badge/, '#474：异常行须挂状态徽标（不是一行纯文字）');
  assert.equal((candList[1].match(/文件存在/g) ?? []).length, 0, '正常那张不许喊「文件存在」');
  assert.match(html, /找不到（删不掉）/, '#474：快照明细的异常状态须写人话');
  assert.doesNotMatch(html, /<td[^>]*>存在<\/td>/, '#474：「存在」这种零信息值须删');
  assert.match(html, />能看<\/div>/, '#474：KPI 须说「能看」几张');
  assert.doesNotMatch(readerText(html), /内嵌/, '#474：「内嵌」这种技术词须 0 命中（指令预览块里的机器内容不算可见面）');
});

test('⑤ data.output 绝对路径在盘上＋体积 ≤ 上限', async () => {
  const iso = seedIso();
  const env = runPickerOk(iso, {});
  const out = assertOutputOnDisk(env);
  const html = readFileSync(out, 'utf8');
  // #474：没给 id 时两处都说人话——空态指到操作（说个 #号），prompt 占位句同指。
  assert.match(html, /还没说要删哪张/, '无 id 时应明示还没选');
  assert.match(html, /还没选照片：把候选列表里那个 #号说给我/, '缺项时 prompt 应指到步骤（t400 裁定 2）');
  assert.match(html, /把上面某个 #号说给我（例如 #19）/, '#474：空态须改人话（说个 #号就放大给你看）');
  assert.match(html, /<h1[^>]*>删照候选<\/h1>/, '#474：H1 只留页名');
  assert.match(visibleText(html), /本页显示/, '#474：KPI 须说「本页显示」几张');
  assert.match(visibleText(html), /能看/, '#474：KPI 须说「能看」几张');
  assert.doesNotMatch(visibleText(html), /calorie\.view\.photo-picker/, '#474：可见文本里内部命令名须 0 命中');
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes <= PHOTO_LIST_PAGE_MAX_BYTES, '超限：' + bytes + ' > ' + PHOTO_LIST_PAGE_MAX_BYTES);
});
