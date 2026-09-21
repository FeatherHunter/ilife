// #830 · checkin 域 3 场景端到端（真出口用例）。
//
// 测什么（只测外部行为，照 `t828-remind-domain.test.mjs` 与 #855 的 L1 缝）：
//   ① 3 个 HELP 场景逐条「唤醒词 → 真路由 → 真跑出口 → 退出码 ＋ 产物落册子那一格」；
//   ② HELP 的字段名（`content`／`sub_category`）真能跑——这正是本票诊断翻出的缺口（照 HELP 填曾 exit 2）；
//   ③ 反例：别家分类不出本域页、无此笔记 exit 4、建时给关联提醒 exit 2（老 `add` 无此参数）——
//      每条都要能真红（还原即绿）。
//
// 唤醒词与场景 id 一律从官方源 `src/help/scenes/checkin.ts` 取，本件不另抄一份（铁律二）。
// 每个用例自带一套夹具（新临时库 ＋ 新家目录）：产物目录不跨用例累积，故「件数」类断言在任何执行顺序下都成立。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkMemoDb, seedNote } from './helpers/memo-sqlite.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const CLI = join(pkg, 'dist', 'cli', 'cmd_read.js');

const { routeWakeword } = await import(pathToFileURL(join(pkg, 'dist', 'triggers', 'routing.js')).href);
const { MEMO_HELP_CHECKIN } = await import(pathToFileURL(join(pkg, 'dist', 'help', 'scenes', 'checkin.js')).href);
const { bookletFileStem } = await import(pathToFileURL(join(pkg, 'dist', 'help', 'booklet.js')).href);
const { RECEIPT_SCENES } = await import(pathToFileURL(join(pkg, 'dist', 'render', 'receipt.js')).href);

/** 官方源里本域 3 个场景（顺序＝HELP 里的顺序）。 */
const SCENES = MEMO_HELP_CHECKIN.subgroups.flatMap((g) => g.scenes);

/** 一套自带夹具：临时库 ＋ 隔离家目录（绝不碰活库）。用完 `drop()`。 */
function fixture(seeds = []) {
  const db = mkMemoDb('memo-830-');
  const home = mkdtempSync(join(tmpdir(), 'memo-830-home-'));
  mkdirSync(join(home, '.ilife'), { recursive: true });
  writeFileSync(join(home, '.ilife', 'memo.yaml'),
    ['db:', '  dir: ' + JSON.stringify(db.replace(/\\/g, '/')), '  name: memo.db'].join('\n') + '\n', 'utf8');
  const ids = seeds.map((s) => seedNote(db, s));
  const landing = () => join(db, 'memo_html');
  return {
    db,
    ids,
    run: (args) => spawnSync(process.execPath, [CLI, ...args], { cwd: pkg, encoding: 'utf8', env: { ...process.env, USERPROFILE: home, HOME: home } }),
    landing,
    listing: () => (existsSync(landing()) ? readdirSync(landing()) : []),
    drop: () => rmSync(home, { recursive: true, force: true }),
  };
}

const env = (r) => JSON.parse(r.stdout);
const delivery = (r) => env(r).delivery ?? null;
const stemOf = (p) => p.split(/[\\/]/).pop().replace(/_\d{8}_\d{6}(_\d+)?\.html$/, '');
const visibleText = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');

describe('#830 · 官方源：本域 3 场景取自 HELP', () => {
  it('3 个场景的唤醒词与册子格一一对上', () => {
    assert.deepEqual(SCENES.map((s) => s.wake_word), ['记打卡', '删打卡', '改打卡']);
    assert.deepEqual(SCENES.map((s) => s.id), ['memo_add_checkin', 'memo_delete_checkin', 'memo_update_checkin']);
    for (const s of SCENES) assert.ok(s.types.includes('回执'), s.id + ' 应有回执页型声明');
    assert.equal(bookletFileStem('memo_add_checkin'), '记打卡');
    assert.equal(bookletFileStem('memo_delete_checkin'), '删打卡');
    assert.equal(bookletFileStem('memo_update_checkin'), '改打卡');
  });

  it('三条唤醒词真路由到三条共用写命令，且带打卡过滤', () => {
    assert.deepEqual(routeWakeword('记打卡', { content: '跑了 5 公里' }), { key: 'memo.create', params: { category: '打卡' } });
    assert.deepEqual(routeWakeword('改打卡', { id: 1, content: '跑了 6 公里' }), { key: 'memo.update', params: { category: '打卡', id: 1 } });
    assert.deepEqual(routeWakeword('删打卡', { id: 1 }), { key: 'memo.remove', params: { category: '打卡', id: 1 } });
  });
});

describe('#830 · 3 场景端到端（真出口）', () => {
  it('① 记打卡：HELP 字段名（content／sub_category）→ exit 0 ＋ 落册子格「记打卡」', () => {
    const f = fixture();
    try {
      const r = f.run(['memo.create', '--params', JSON.stringify({ content: '今天跑步 7 公里', category: '打卡', sub_category: '跑步' })]);
      assert.equal(r.status, 0, String(r.stderr));
      const d = delivery(r);
      assert.ok(d !== null, '本次须真落盘');
      assert.equal(stemOf(d.path), '记打卡', '产物主体＝册子 seq 23 的主体');
      const html = readFileSync(d.path, 'utf8');
      assert.match(html, /今天跑步 7 公里/, '页上要有这次打卡的内容');
      assert.match(html, /跑步/, '子分类也要在页上（HELP 的 `sub_category` 认了）');
      assert.equal(f.listing().length, 1, '只该出一件产物：' + f.listing().join(','));
    } finally { f.drop(); }
  });

  it('② 改打卡：HELP 字段名（content）→ exit 0 ＋ 落册子格「改打卡」', () => {
    const f = fixture([{ content: '今天跑步 5 公里', category: '打卡', sub: '跑步' }]);
    try {
      const r = f.run(['memo.update', '--params', JSON.stringify({ id: f.ids[0], content: '今天跑步 6 公里', category: '打卡' })]);
      assert.equal(r.status, 0, String(r.stderr));
      const d = delivery(r);
      assert.ok(d !== null, '改打卡这一趟须真落盘');
      assert.equal(stemOf(d.path), '改打卡', '产物主体＝册子 seq 25 的主体');
      const html = readFileSync(d.path, 'utf8');
      assert.match(html, /今天跑步 6 公里/, '页上要有改后的内容');
      assert.match(html, new RegExp('#' + f.ids[0]), '页上要认得出改的是哪一条');
    } finally { f.drop(); }
  });

  it('③ 删打卡：exit 0 ＋ 落册子格「删打卡」，被删那条仍写在页上（删前那一行是权威）', () => {
    const f = fixture([{ content: '早起打卡', category: '打卡' }]);
    try {
      const r = f.run(['memo.remove', '--params', JSON.stringify({ id: f.ids[0], confirm: true })]);
      assert.equal(r.status, 0, String(r.stderr));
      const d = delivery(r);
      assert.ok(d !== null, '删打卡这一趟须真落盘');
      assert.equal(stemOf(d.path), '删打卡', '产物主体＝册子 seq 24 的主体');
      assert.match(readFileSync(d.path, 'utf8'), /早起打卡/);
      assert.equal(f.run(['memo.detail', '--params', JSON.stringify({ id: f.ids[0] })]).status, 4, '删完了就该查不到这条');
    } finally { f.drop(); }
  });

  it('④ 旧的命令面名（title／body／sub）仍能跑：映射只补缺、老面不破', () => {
    const f = fixture();
    try {
      const r = f.run(['memo.create', '--params', JSON.stringify({ body: '跑了 8 公里', category: '打卡', sub: '跑步' })]);
      assert.equal(r.status, 0, String(r.stderr));
      assert.equal(stemOf(delivery(r).path), '记打卡');
    } finally { f.drop(); }
  });

  it('三格产物齐全且主体两两不同', () => {
    const f = fixture([{ content: '甲打卡', category: '打卡' }, { content: '乙打卡', category: '打卡' }]);
    try {
      assert.equal(f.run(['memo.create', '--params', JSON.stringify({ content: '丙打卡', category: '打卡' })]).status, 0);
      assert.equal(f.run(['memo.update', '--params', JSON.stringify({ id: f.ids[0], content: '甲打卡改', category: '打卡' })]).status, 0);
      assert.equal(f.run(['memo.remove', '--params', JSON.stringify({ id: f.ids[1], confirm: true })]).status, 0);
      const stems = f.listing().map((x) => x.replace(/_\d{8}_\d{6}(_\d+)?\.html$/, ''));
      // 两侧都老实排序（中文按码位排：删＜改＜记），免得把「排列顺序」当成断言对象。
      assert.deepEqual([...new Set(stems)].sort(), ['记打卡', '改打卡', '删打卡'].sort());
      for (const s of SCENES) assert.ok(stems.includes(bookletFileStem(s.id)), bookletFileStem(s.id) + ' 缺产物：' + f.listing().join(','));
    } finally { f.drop(); }
  });
});

describe('#830 · 反例（每条都要能真红）', () => {
  it('非打卡类不出本域页：改一条备忘出的是备忘域那一格，不是「改打卡」', () => {
    const f = fixture([{ content: '买牛奶', category: '备忘' }]);
    try {
      const r = f.run(['memo.update', '--params', JSON.stringify({ id: f.ids[0], body: '买牛奶两盒' })]);
      assert.equal(r.status, 0, String(r.stderr));
      const stems = f.listing().map((x) => x.replace(/_\d{8}_\d{6}(_\d+)?\.html$/, ''));
      assert.deepEqual(stems, ['改备忘'], '别家分类不该被本域认领：' + f.listing().join(','));
    } finally { f.drop(); }
  });

  it('打卡行改纯子分类走备忘域那一格（唤醒词是备忘域的），本域不抢', () => {
    const f = fixture([{ content: '今天跑步 5 公里', category: '打卡', sub: '跑步' }]);
    try {
      const r = f.run(['memo.update', '--params', JSON.stringify({ id: f.ids[0], sub_category: '骑行' })]);
      assert.equal(r.status, 0, String(r.stderr));
      const stems = f.listing().map((x) => x.replace(/_\d{8}_\d{6}(_\d+)?\.html$/, ''));
      assert.deepEqual(stems, ['备忘改子分类'], '纯子分类补丁归备忘域那两格：' + f.listing().join(','));
    } finally { f.drop(); }
  });

  it('无此笔记：删打卡 exit 4「无此笔记」且不落产物', () => {
    const f = fixture();
    try {
      const r = f.run(['memo.remove', '--params', JSON.stringify({ id: 999999, confirm: true })]);
      assert.equal(r.status, 4);
      assert.match(String(r.stderr), /无此笔记/);
      assert.deepEqual(f.listing(), [], '参数／取数错不该落产物');
    } finally { f.drop(); }
  });

  it('建时给关联提醒：exit 2 且不落产物（老 `add` 无 `--reminder-id`，打卡的关联由追溯链回填）', () => {
    const f = fixture();
    try {
      const r = f.run(['memo.create', '--params', JSON.stringify({ content: '跑了 5 公里', category: '打卡', reminder_id: 3 })]);
      assert.equal(r.status, 2);
      assert.match(String(r.stderr), /建时不可写关联提醒/);
      assert.deepEqual(f.listing(), []);
    } finally { f.drop(); }
  });

  it('删打卡缺 confirm：exit 2 且不落产物', () => {
    const f = fixture([{ content: '早起打卡', category: '打卡' }]);
    try {
      const r = f.run(['memo.remove', '--params', JSON.stringify({ id: f.ids[0] })]);
      assert.equal(r.status, 2);
      assert.match(String(r.stderr), /confirm/);
      assert.deepEqual(f.listing(), []);
    } finally { f.drop(); }
  });
});

describe('#830 · 产物形状（册子格的页型）', () => {
  it('三件都是整页（doctype 起、/html 收尾、载荷已注入、不惰性加载）', () => {
    const f = fixture([{ content: '甲打卡', category: '打卡' }, { content: '乙打卡', category: '打卡' }]);
    try {
      assert.equal(f.run(['memo.create', '--params', JSON.stringify({ content: '丙打卡', category: '打卡' })]).status, 0);
      assert.equal(f.run(['memo.update', '--params', JSON.stringify({ id: f.ids[0], content: '甲打卡改', category: '打卡' })]).status, 0);
      assert.equal(f.run(['memo.remove', '--params', JSON.stringify({ id: f.ids[1], confirm: true })]).status, 0);
      assert.equal(f.listing().length, 3);
      for (const x of f.listing()) {
        const html = readFileSync(join(f.landing(), x), 'utf8');
        assert.match(html, /^<!doctype html>/i, x + ' 应是整页');
        assert.match(html, /<\/html>\s*$/i, x + ' 应到 </html> 收尾');
        assert.ok(!html.includes('<!--INJECT-DATA-->'), x + ' 载荷已注入');
        assert.ok(!/loading\s*=\s*["']lazy["']/i.test(html), x + ' 不许惰性加载（墙下半页会空白）');
      }
    } finally { f.drop(); }
  });

  it('页上可见文本不用分隔符并列串顶替版式', () => {
    const f = fixture([{ content: '甲打卡', category: '打卡' }]);
    try {
      assert.equal(f.run(['memo.update', '--params', JSON.stringify({ id: f.ids[0], content: '甲打卡改', category: '打卡' })]).status, 0);
      for (const x of f.listing()) {
        const text = visibleText(readFileSync(join(f.landing(), x), 'utf8'));
        assert.ok(!text.includes('·'), x + ' 可见文本里不该有「·」并列串');
        assert.ok(!text.includes('；'), x + ' 可见文本里不该有「；」并列串');
      }
    } finally { f.drop(); }
  });

  it('族定义地的场景名单里有本域这 3 格', () => {
    for (const s of SCENES) assert.ok(RECEIPT_SCENES.includes(s.id), '通用回执族名单缺 ' + s.id);
  });
});
