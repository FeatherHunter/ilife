// #712：备忘录的「附件目录」从字符串前缀校验升级成真目录 ＋ 真包含判定。
//
// 判据（票面「验收」四条）：
//   ① 目录内的路径 → 能存能读；② 目录外的绝对路径 → 被拒；
//   ③ 同开头不同目录（`mediafoo/x.jpg`，`media` 是它的开头）→ 被拒；④ 带 `..` 穿出去的路径 → 被拒；
//   ⑤ 附件目录不存在 → 给人话原因，不静默降级（新加的一条，票面「要做四件」第 4 项）。
//
// 接缝与注入点照 `cli.test.mjs`：**真出口**＝spawn `dist/cli/cmd_read.js`，临时库走配置项 `db.dir`，
// 附件目录走配置项 `media.dir`，测试隔离的唯一口子 `ILIFE_CONFIG_DIR`；**不碰活库** `D:\2Study\StudyNotes\.db`。
// #695：原来那两个环境变量（`SKILLS_DB_PATH`／`MEMO_MEDIA_DIR`）已按用户裁决删除，取值口改配置文件。
//
// 老规则对照（鉴别力读数）：`oldRuleAllowed()` 是仓外老实现 `备忘录/script/memo_cli.py:106-116`
// `_resolve_media_path` 的规则原样转写（`v.startsWith(配置值 + '/')` 即放行，再切掉那段前缀）。同一组
// 输入喂两边，就能看出本票改掉的是哪一类：**目录内的正常值两边落库值逐字相同**；**带 `..` 的相对路径
// 老规则放行（落库 `../../mediafoo/x.jpg`）、新判定拒**——那正是老注释说要拦、实际拦不住的那件事。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { normalizeMediaPath, resolveMediaDir } from '../dist/policy/media.js';
import { mkMemoDb, seedNote } from './helpers/memo-sqlite.mjs';
import { configEnv, mkMemoConfig } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BIN = join(here, '..', 'dist', 'cli', 'cmd_read.js');

let TMP = '';       // 本文件的独占根：<TMP>/media 是真附件目录，<TMP>/mediafoo 是同开头的另一个目录
let MEDIA = '';     // 真附件目录
let DB = '';        // 临时 memo 库（已 seed 一条老数据）
let CFG = '';       // 本文件的配置目录（`ILIFE_CONFIG_DIR`）：写 `db.dir`／`media.dir` 两份值
let CFG_BAK = null;
const IMG = '情绪日记_0527_烤肉.jpg';   // 目录内一个真存在的小文件（与老库那两条附件同名，便于对照）

/** 老实现的判定规则（仓外 `memo_cli.py:106-116` 逐条转写，只用来出对照读数，不参与新判定）。 */
function oldRuleAllowed(v, mediaDir) {
  if (!v) return { ok: true, stored: null };
  const prefix = mediaDir.endsWith('/') ? mediaDir : mediaDir + '/';
  if (v !== mediaDir && !v.startsWith(prefix)) return { ok: false, stored: null };
  return { ok: true, stored: v.startsWith(prefix) ? v.slice(prefix.length) : '' };
}

/** 真出口：库目录与附件目录都经**配置文件**注入（#695：环境变量读取已删，隔离口是 `ILIFE_CONFIG_DIR`）。
 *  `mediaDir` 缺省＝本文件的真附件目录，用例可传别的值（如「不存在的目录」那条）。 */
function run(args, mediaDir = MEDIA, cwd) {
  const cfg = mkMemoConfig({ db: { dir: DB }, media: { dir: mediaDir } }, 'memo712-cfg-');
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd: cwd ?? here,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: configEnv(cfg),
  });
}
const dataOf = (r) => JSON.parse(r.stdout).data;

function noteRow(id) {
  const db = new DatabaseSync(join(DB, 'memo.db'), { readOnly: true });
  try {
    return db.prepare('SELECT id, media_path FROM notes WHERE id = ?').get(id);
  } finally {
    db.close();
  }
}

/** 一条用例真跑：spawn 真出口 → 拿回执里的 id → 回读库里那一列。 */
function createWithMedia(media, cwd) {
  const r = run(['memo.create', '--params', JSON.stringify({ title: '附件用例 ' + media, body: '', media })], MEDIA, cwd);
  let id = null;
  if (r.status === 0) {
    const items = dataOf(run(['memo.search', '--params', JSON.stringify({ q: '附件用例 ' + media })], MEDIA));
    id = items.items[0]?.id ?? null;
  }
  return { status: r.status, stderr: r.stderr.trim(), id, stored: id === null ? null : noteRow(id).media_path };
}

before(() => {
  TMP = mkdtempSync(join(tmpdir(), 'memo712-'));
  MEDIA = join(TMP, 'media');
  mkdirSync(join(TMP, 'mediafoo'), { recursive: true });
  mkdirSync(MEDIA, { recursive: true });
  writeFileSync(join(MEDIA, IMG), 'fixture');
  DB = mkMemoDb('memo712db-');
  // #695：库目录与附件目录的唯一真相都是配置文件——本件另有**进程内**调用（`resolveMediaDir()`／
  // `normalizeMediaPath()`），故隔离口 `ILIFE_CONFIG_DIR` 必须在 before 里就设好（跑在 node 测试运行器里
  // 却没设它时，公共层直接抛 `CONFIG_TEST_ISOLATION_MISSING`，不许落到真实家目录）。
  CFG_BAK = process.env.ILIFE_CONFIG_DIR;
  CFG = mkMemoConfig({ db: { dir: DB }, media: { dir: MEDIA } }, 'memo712-cfg-self-');
  process.env.ILIFE_CONFIG_DIR = CFG;
  // 老数据一条：库里已有的相对路径（形状与活库 `notes` 里那两条逐字同形）。
  seedNote(DB, { content: '老附件那条', category: '情绪日记', media: IMG });
});

after(() => {
  if (CFG_BAK === undefined) delete process.env.ILIFE_CONFIG_DIR;
  else process.env.ILIFE_CONFIG_DIR = CFG_BAK;
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

describe('#712 附件目录：真目录 ＋ 真包含判定', () => {
  it('取值口：附件目录解析成绝对路径且真的在（这里指临时附件目录）', () => {
    assert.equal(resolveMediaDir(), MEDIA);
    assert.ok(resolveMediaDir().startsWith(TMP), '绝对路径：' + resolveMediaDir());
  });

  it('① 目录内的路径 → 能存能读（存的是相对路径）', () => {
    const r = createWithMedia(join(MEDIA, IMG));
    assert.equal(r.status, 0, 'stderr：' + r.stderr);
    assert.equal(r.stored, IMG, '库里那一列＝相对路径');
    assert.equal(join(MEDIA, r.stored), join(MEDIA, IMG), '相对路径拼回附件目录＝真文件');
    assert.ok(existsSync(join(MEDIA, r.stored)), '真文件在');
    // 能读：真出口的详情键读出来与库里那一列逐字相同（读侧一行未动）。
    const detail = dataOf(run(['memo.detail', '--params', JSON.stringify({ id: r.id })], MEDIA));
    assert.equal(detail.item.media_path, IMG, 'memo.detail 读出来的正是那条相对路径');
  });

  it('① 老写法（以目录名开头：media/xxx.jpg）→ 真出口照样认，落库相对路径', () => {
    const r = createWithMedia('media/' + IMG, TMP);
    assert.equal(r.status, 0, 'stderr：' + r.stderr);
    assert.equal(r.stored, IMG, '去掉开头那一段目录名，不是切字符串前缀');
  });

  it('② 目录外的绝对路径 → 被拒（exit 2）', () => {
    const outside = join(TMP, 'outside.jpg');
    writeFileSync(outside, 'x');
    const r = createWithMedia(outside);
    assert.equal(r.status, 2, 'stderr：' + r.stderr);
    assert.match(r.stderr, /不在附件目录内/);
    assert.equal(r.stored, null, '没有被写进库里');
  });

  it('③ 同开头不同目录（mediafoo/x.jpg）→ 被拒', () => {
    const samePrefix = join(TMP, 'mediafoo', 'x.jpg');
    writeFileSync(samePrefix, 'x');
    const r = createWithMedia(samePrefix);
    assert.equal(r.status, 2, 'stderr：' + r.stderr);
    assert.match(r.stderr, /不在附件目录内/);
    assert.equal(r.stored, null);
    const n = dataOf(run(['memo.search', '--params', JSON.stringify({ q: '附件用例 ' + samePrefix })], MEDIA));
    assert.equal(n.total, 0, '被拒的输入一条都没落库');
  });

  it('④ 带 .. 穿出去 → 被拒（老开头比对会放行的那条）', () => {
    const escaped = join(MEDIA, '..', '..', 'mediafoo', 'x.jpg');
    const r = createWithMedia(escaped);
    assert.equal(r.status, 2, 'stderr：' + r.stderr);
    assert.match(r.stderr, /不在附件目录内/);
    assert.equal(r.stored, null);
    assert.equal(
      oldRuleAllowed('media/../../mediafoo/x.jpg', 'media').ok,
      true,
      '老开头比对确实会放行穿出去的相对路径（落库="../../mediafoo/x.jpg"）',
    );
  });

  it('④′ 直接调判定：六类输入逐条给读数（含目录自己）', () => {
    const cases = [
      ['目录内绝对路径', join(MEDIA, IMG), true],
      ['老写法相对值 media/xxx', 'media/' + IMG, true],
      ['同开头不同目录', join(TMP, 'mediafoo', 'x.jpg'), false],
      ['带 .. 穿出去', join(MEDIA, '..', '..', 'mediafoo', 'x.jpg'), false],
      ['附件目录自己', MEDIA, false],
      ['空值＝无附件', '', null],
    ];
    for (const [name, input, want] of cases) {
      if (want === null) {
        assert.equal(normalizeMediaPath(input), null, name);
        continue;
      }
      if (want) assert.equal(normalizeMediaPath(input), IMG, name);
      else assert.throws(() => normalizeMediaPath(input), (e) => e.code === 'POLICY_BAD_INPUT' && /不在附件目录内/.test(e.message), name);
    }
  });

  it('⑤ 附件目录不存在 → 给人话原因（提到配置项 media.dir 与那个路径），不静默降级', () => {
    const gone = join(TMP, 'nope', 'media');
    const r = run(['memo.create', '--params', JSON.stringify({ title: '目录不在', body: '', media: 'x.jpg' })], gone);
    assert.equal(r.status, 2, 'stderr：' + r.stderr);
    assert.match(r.stderr, /附件目录不存在/);
    assert.ok(r.stderr.includes(gone), '报错里点出那个路径：' + r.stderr);
    // #695：报错点名的取值口是**配置项**（原 `MEMO_MEDIA_DIR` 环境变量已按用户裁决删除）。
    assert.match(r.stderr, /media\.dir/, '报错文案要点名配置项 media.dir：' + r.stderr);
    assert.doesNotMatch(r.stderr, /MEMO_MEDIA_DIR/, '不许再点名已删的环境变量');
    const n = run(['memo.search', '--params', JSON.stringify({ q: '目录不在' })], gone);
    assert.equal(dataOf(n).total, 0, '被拒的输入一条都没落库');
  });

  it('老数据不迁：库里已有的相对路径读出来与改动前一致', () => {
    const items = dataOf(run(['memo.search', '--params', JSON.stringify({ q: '老附件那条' })], MEDIA));
    assert.equal(items.total, 1);
    assert.equal(items.items[0].media_path, IMG, '那一列原样读出（不重写、不补目录）');
  });

  it('真出口只多这一步：不带 media 的记一条照旧能落（回 null）', () => {
    const r = run(['memo.create', '--params', JSON.stringify({ title: '没有附件', body: '' })], MEDIA);
    assert.equal(r.status, 0, 'stderr：' + r.stderr);
    const items = dataOf(run(['memo.search', '--params', JSON.stringify({ q: '没有附件' })], MEDIA));
    assert.equal(items.items[0].media_path, null);
  });

  it('对照读数：老规则 vs 新判定（**同一条输入**分别喂两边，逐条）', () => {
    // 老规则只吃「以配置值开头」的路径（老技能里调用面给的是 `media/xxx.jpg` 这种相对值，
    // 活库里存下来的是切掉前缀后的 `情绪日记_0527_烤肉_2.jpg`——本机实测，形状逐字相同）。
    const inputs = [
      ['① 目录内', 'media/img.jpg'],
      ['③ 同开头不同目录', 'mediafoo/x.jpg'],
      ['④ 带 .. 穿出去', 'media/../../mediafoo/x.jpg'],
      ['④′ 就是目录自己', 'media'],
    ];
    const rows = inputs.map(([name, input]) => {
      const oldR = oldRuleAllowed(input, 'media');
      let newR;
      try {
        newR = { ok: true, stored: normalizeMediaPath(input) };
      } catch {
        newR = { ok: false, stored: null };
      }
      console.log(
        'CASE ' + name + ' 输入=' + JSON.stringify(input) +
        ' 老规则=' + (oldR.ok ? '放行' : '拒') + '（落库=' + JSON.stringify(oldR.stored) + '）' +
        ' 新判定=' + (newR.ok ? '放行' : '拒') + '（落库=' + JSON.stringify(newR.stored) + '）',
      );
      return { name, oldOk: oldR.ok, newOk: newR.ok };
    });
    const flipped = rows.filter((r) => r.oldOk !== r.newOk).map((r) => r.name);
    console.log('RESULT: 老放行→新拒 ' + flipped.length + ' 条 —— ' + flipped.join('；'));
    assert.deepEqual(flipped, ['④ 带 .. 穿出去', '④′ 就是目录自己']);
    // ① 两边都放行，且落库值逐字相同（CASE 行里给读数）⇒ 目录内的正常值行为一字未变。
    assert.equal(rows[0].oldOk, rows[0].newOk);
    // ③ 的相对写法两侧都判「不在目录里」，只是理由不同（老规则把它当**不以 `media/` 开头的文件名**，
    //    新判定按路径算）——真出口那条用**绝对路径**喂（上一组用例，拒）。
    // ④′ 是「相对写法恰好就叫 media」这一类：老规则拿它当文件名、落库 `''`；新判定按路径算、
    //    撞上附件目录自己 ⇒ 拒。两侧都会放行的那一类才是危险的那条，见 ④。
    console.log('NOTE ③ 相对写法两侧都拒（理由不同）；④′ 老落库 "" / 新拒（相对写法撞上目录自己）');
  });
});
