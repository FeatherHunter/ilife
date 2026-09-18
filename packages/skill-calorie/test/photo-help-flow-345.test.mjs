/** #345 · 身材照片入口与流程：HELP 产物逐字唤醒词＋可执行命令＋写入先过过程型页。
 *
 * 事实源判定（只改一处）：场景 prompt 的定义地是
 * `packages/skill-calorie/src/triggers/scene-09-photo.ts`；另一处双生
 * `src/triggers/wake-assets.ts` 一眼不碰（机器生成头注禁手改，且
 * `wake-assets-133.test.mjs` 把全量 prompt 指纹钉死，手改即红）。
 * 用户 HELP 活路（唤醒词速查 `calorie.help.lookup`）同源于 SCENE_09_PHOTO，本测试真跑该交付命令
 * （照片速查 q 支已随 #652 删单下线）。
 *
 * 隔离：每用例新鲜临时库＋新鲜照片目录（`SKILLS_DB_PATH`／`CALORIE_PHOTOS_DIR`
 * 指向 tmp），真实库零触碰。二进制真跑（独立进程，非就地分派）。
 *
 * 用例五条（全部机械可判）：
 * ① 真跑 HELP 交付命令，产物里 10 个场景逐条匹配到逐字唤醒词；
 * ② 每条场景引用的命令 ∈ `src/photo/commands.ts` 的命令集；
 * ③ 写入类场景（记×3／删／改·加·删标签）必须点名第②环过程型页命令
 *    （形如 `calorie.view.photo-*`），且该命令存在、示例照抄即能跑；
 * ④ 三处同源：HELP 里那条／页面上可复制的 prompt／`commands.ts` 的示例
 *    指向同一个命令与同一份参数形状（任一处漂移即红；读场景无页面 prompt，
 *    只判 HELP 与示例两处）；
 * ⑤ 变异自证：抹掉一条流程指示或改错一个命令名，用例必红（改回必绿见各用例正向断言）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/photo-help-flow-345.test.mjs`
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SCENE_09_PHOTO } from '../dist/triggers/scene-09-photo.js';
import { TRIGGERS, searchHelp } from '../dist/triggers/index.js';
import { PHOTO_COMMANDS } from '../dist/photo/commands.js';
import { buildPhotoLogWizardPrompt } from '../dist/render/wizardPort.js';
import { buildPhotoPickerPrompt } from '../dist/photo/picker.js';
import { openDb } from '../dist/index.js';
import { addPhotos } from '../dist/photo/photos.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const BIN = join(import.meta.dirname, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

/** 10 场景键（跟 SCENE_09_PHOTO 定义序）。 */
const SCENE_KEYS = [
  'body_photo_add_single', 'body_photo_add_note', 'body_photo_add_batch',
  'body_photo_list', 'body_photo_compare', 'body_photo_gif',
  'body_photo_delete', 'body_photo_tag_set', 'body_photo_tag_add', 'body_photo_tag_remove',
];
/** 写入类 7 场景 → 必须点名的第②环过程型页命令（票面语）。 */
const WRITE_FLOW = {
  body_photo_add_single: 'calorie.view.photo-log-wizard',
  body_photo_add_note: 'calorie.view.photo-log-wizard',
  body_photo_add_batch: 'calorie.view.photo-log-wizard',
  body_photo_delete: 'calorie.view.photo-picker',
  body_photo_tag_set: 'calorie.view.photo-picker',
  body_photo_tag_add: 'calorie.view.photo-picker',
  body_photo_tag_remove: 'calorie.view.photo-picker',
};
/** 读场景 3 条：统一读侧写法（无过程型页，直接出结果）。 */
const READ_KEYS = ['body_photo_list', 'body_photo_compare', 'body_photo_gif'];
const READ_TAIL = '直接给我看结果，不用先出确认页；缺项再问我要。';

const CLI_RE = /^calorie-cmd-read\s+(\S+)(?:\s+--params\s+'([\s\S]+)')?$/;

function sceneOf(key) {
  const s = SCENE_09_PHOTO.find((t) => t.key === key);
  assert.ok(s, '场景缺失：' + key);
  return s;
}

function promptOf(key) {
  const s = sceneOf(key);
  assert.equal(s.main_prompt.text, s.prompt_template, 'text 与 prompt_template 分叉：' + key);
  return s.prompt_template;
}

/** 解析一条 HELP 命令行 → { 命令, 参数对象 }（JSON 坏即红）。 */
function parseCli(cli) {
  const m = CLI_RE.exec(String(cli ?? '').trim());
  assert.ok(m, '不是可执行命令行形状：' + cli);
  const params = m[2] === undefined ? {} : JSON.parse(m[2]);
  assert.equal(typeof params, 'object', '参数须为对象：' + cli);
  return { key: m[1], params };
}

function paramKeys(params) {
  return Object.keys(params).sort();
}

/** ③ 写入谓词：点名过程型页命令＋确认＋写入／删（任一不满足即抛＝红）。 */
function checkWriteFlow(key, prompt) {
  const view = WRITE_FLOW[key];
  assert.ok(view, '非写入场景误入写入谓词：' + key);
  assert.ok(prompt.includes(view), '未点名第②环过程型页命令 ' + view + '：' + key);
  assert.ok(prompt.includes('确认'), '缺确认字样：' + key);
  assert.ok(prompt.includes('写入') || prompt.includes('删'), '缺确认后再写入／删：' + key);
  return view;
}

/** ③ 读谓词：统一读侧写法，且不许点名过程型页（任一不满足即抛＝红）。 */
function checkReadFlow(key, prompt) {
  assert.ok(prompt.includes(READ_TAIL), '读侧写法不统一（缺统一尾句）：' + key);
  assert.ok(!prompt.includes('calorie.view.'), '读场景不得点名过程型页：' + key);
}

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAWjR9awAAAABJRU5ErkJggg==';

function seedIso() {
  const root = mkdtempSync(join(tmpdir(), 't345-'));
  const dbDir = join(root, 'db');
  const photosDir = join(root, 'photos');
  const srcDir = join(root, 'src');
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(photosDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  const a = join(srcDir, 'a.png');
  writeFileSync(a, Buffer.from(TINY_PNG_B64, 'base64'));
  const db = openDb(join(dbDir, 'calorie_data.db'));
  addPhotos(db, photosDir, { srcPaths: [a], tag: '正面', today: '2026-09-04', nowTime: '08:00:00' });
  addPhotos(db, photosDir, { srcPaths: [a], tag: '侧面', today: '2026-09-05', nowTime: '08:00:00' });
  db.close();
  return { root, dbDir, photosDir };
}

function runBin(iso, argv) {
  const r = spawnSync(NODE_BIN, [BIN, ...argv], {
    encoding: 'utf8',
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(iso.dbDir, { photos: { dir: iso.photosDir } }) },
  });
  assert.equal(r.status, 0, '二进制 exit 非 0：' + argv.join(' ') + ' stderr=' + (r.stderr ?? '').slice(0, 300));
  return JSON.parse(String(r.stdout).trim());
}

/** 示例照抄即跑：argv 从示例字符串本身导出，不手写第二遍。 */
function runExample(iso, example) {
  const m = CLI_RE.exec(String(example).trim());
  assert.ok(m, '示例不是照抄即跑形状：' + example);
  const argv = m[2] === undefined ? [m[1]] : [m[1], '--params', m[2]];
  return runBin(iso, argv);
}

function unescapeHtml(s) {
  return String(s)
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 交付产物 HTML：落盘读文件，无落盘读 envelope 内联（为空即红）。 */
function deliveredHtml(env) {
  const out = env?.data?.output;
  if (typeof out === 'string' && out) return readFileSync(out, 'utf8');
  assert.ok(typeof env?.html === 'string' && env.html, '交付产物无 HTML（既无落盘也无内联）');
  return env.html;
}

const CMD_KEYS = new Set(PHOTO_COMMANDS.map((c) => c.key));
const CMD_BY_KEY = new Map(PHOTO_COMMANDS.map((c) => [c.key, c]));

describe('#345 身材照片入口与流程', () => {
  it('① 唤醒词速查含 10 场景且产物逐字命中（照片速查 q 支已随 #652 删单下线）', () => {
    const iso = seedIso();
    // 唤醒词速查：calorie.help.lookup q=身材照 → 含 10 场景。
    const lookup = runBin(iso, ['calorie.help.lookup', '--params', '{"q":"身材照"}']);
    const byKey = new Map((lookup?.data?.items ?? []).map((h) => [h.key, h]));
    const lookupHtml = unescapeHtml(deliveredHtml(lookup));
    for (const key of SCENE_KEYS) {
      const s = sceneOf(key);
      const hit = byKey.get(key);
      assert.ok(hit, '唤醒词速查无命中：' + key);
      assert.ok(lookupHtml.includes(s.wake_word), '速查产物缺逐字唤醒词：' + key);
      assert.ok(lookupHtml.includes(hit.cli), '速查产物缺该场景命令行：' + key);
    }
  });

  it('② 每条场景引用的命令 ∈ commands.ts 命令集', () => {
    for (const key of SCENE_KEYS) {
      const s = sceneOf(key);
      assert.equal(s.main_prompt.cli, s.data_source, 'cli 与 data_source 分叉：' + key);
      const { key: cmd, params } = parseCli(s.main_prompt.cli);
      assert.ok(CMD_KEYS.has(cmd), '引用了不存在的命令：' + cmd + '（场景 ' + key + '）');
      void params;
    }
  });

  it('③ 写入 7 场景点名第②环过程型页命令，且示例照抄即能跑；读 3 场景写法统一', () => {
    const iso = seedIso();
    for (const key of Object.keys(WRITE_FLOW)) {
      const view = checkWriteFlow(key, promptOf(key));
      assert.ok(CMD_KEYS.has(view), '点名的过程型页命令不存在：' + view);
      const example = CMD_BY_KEY.get(view).example;
      runExample(iso, example);
    }
    for (const key of READ_KEYS) checkReadFlow(key, promptOf(key));
  });

  it('④ 三处同源：HELP 命令行／页面 prompt／命令示例同一命令同一参数形状', () => {
    const lookupHits = new Map();
    for (const h of searchHelp(TRIGGERS, '身材照')) lookupHits.set(h.key, h);
    for (const key of SCENE_KEYS) {
      const s = sceneOf(key);
      const helpParsed = parseCli(s.main_prompt.cli);
      // HELP 第二处：唤醒词速查行与场景命令行同一字符串。
      const hit = lookupHits.get(key);
      assert.ok(hit, '唤醒词速查缺场景：' + key);
      assert.equal(hit.cli, s.main_prompt.cli, '速查行与场景命令行不同源：' + key);
      // 命令示例：同一命令，参数键集逐字相等（值可因 op 而异，只比形状）。
      const spec = CMD_BY_KEY.get(helpParsed.key);
      assert.ok(spec, '场景命令不在命令集：' + key);
      const exParsed = parseCli(spec.example);
      assert.equal(exParsed.key, helpParsed.key, '示例与 HELP 命令不同：' + key);
      assert.deepEqual(paramKeys(exParsed.params), paramKeys(helpParsed.params), '示例与 HELP 参数形状漂移：' + key);
      // 页面上可复制的 prompt（只写入场景有过程型页 prompt；读场景是结果页，无 prompt 区）。
      const view = WRITE_FLOW[key];
      if (!view) continue;
      let pageCli;
      if (view === 'calorie.view.photo-log-wizard') {
        const note = key === 'body_photo_add_note' ? '早上空腹' : null;
        pageCli = /```bash\n([\s\S]*?)\n```/.exec(buildPhotoLogWizardPrompt(['/照片/示例.jpg'], '正面', note))[1].trim();
      } else {
        const arg = key === 'body_photo_delete'
          ? { selectedId: 1, action: 'remove', op: null, newTag: null }
          : { selectedId: 1, action: 'tag', op: key === 'body_photo_tag_set' ? 'set' : key === 'body_photo_tag_add' ? 'add' : 'remove', newTag: '晨起' };
        pageCli = /```bash\n([\s\S]*?)\n```/.exec(buildPhotoPickerPrompt(arg))[1].trim();
      }
      const pageParsed = parseCli(pageCli);
      assert.equal(pageParsed.key, helpParsed.key, '页面 prompt 与 HELP 命令不同：' + key);
      for (const k of paramKeys(helpParsed.params)) {
        assert.ok(k in pageParsed.params, '页面 prompt 缺参数 ' + k + '：' + key);
      }
    }
  });

  it('⑤ 变异自证：抹流程指示或改错命令名必红', () => {
    // 变异 A：抹掉写入流程指示 → 写入谓词必红。
    const stripped = promptOf('body_photo_add_single')
      .replace(/动笔前请先出.*我确认后再写入。/, '');
    assert.throws(() => checkWriteFlow('body_photo_add_single', stripped), /未点名第②环过程型页命令/);
    // 变异 B：改错过程型页命令名 → 存在性断言必红。
    const typo = promptOf('body_photo_delete').replace(/calorie\.view\.photo-picker/g, 'calorie.view.photo-piker');
    assert.ok(!typo.includes('calorie.view.photo-picker'), '变异未生效');
    assert.ok(!CMD_KEYS.has('calorie.view.photo-piker'), '变异命令名不应存在');
    assert.throws(() => checkWriteFlow('body_photo_delete', typo), /未点名第②环过程型页命令/);
    // 变异 C：抹掉读侧统一尾句 → 读谓词必红。
    const readStripped = promptOf('body_photo_list').replace(READ_TAIL, '');
    assert.throws(() => checkReadFlow('body_photo_list', readStripped), /读侧写法不统一/);
    // 改回必绿：原 prompt 正向谓词全过（各用例已断言，此处再钉一行）。
    checkWriteFlow('body_photo_add_single', promptOf('body_photo_add_single'));
    checkReadFlow('body_photo_list', promptOf('body_photo_list'));
  });
});
