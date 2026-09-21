// #828 · remind 域 4 场景端到端（真出口用例）＋ 两处路由纠错的定义级用例。
//
// 测什么（只测外部行为，照 `receipt-831.test.mjs` 与 #855 的 L1 缝）：
//   ① 4 个 HELP 场景逐条「唤醒词 → 真路由 → 真跑出口 → 退出码 ＋ 产物落盘」；
//   ② 两处路由纠错的**判据**：`设提醒` 的缺槽位是 `content`（老 `add_reminder` 逐字要求）、
//      `查已提醒备忘` 走的是**已完成视图**（不是与「看提醒」同一份）；
//   ③ 反例：两处纠错都要能真红（还原即绿）——缺 `content` exit 2、`scene` 不认即 exit 2。
//
// 唤醒词与场景 id 一律从官方源 `src/help/scenes/remind.ts` 取，本件不另抄一份（铁律二）。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkMemoDb, seedNote, seedReminder } from './helpers/memo-sqlite.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const CLI = join(pkg, 'dist', 'cli', 'cmd_read.js');

const { routeWakeword } = await import(pathToFileURL(join(pkg, 'dist', 'triggers', 'routing.js')).href);
const { MEMO_HELP_REMIND } = await import(pathToFileURL(join(pkg, 'dist', 'help', 'scenes', 'remind.js')).href);
const { bookletFileStem } = await import(pathToFileURL(join(pkg, 'dist', 'help', 'booklet.js')).href);

/** 官方源里本域 4 个场景（顺序＝HELP 里的顺序）。 */
const SCENES = MEMO_HELP_REMIND.subgroups.flatMap((g) => g.scenes);

let DB = '';
let HOME = '';
let NOTE_ID = 0;

/** 真跑唯一出口（临时库 ＋ 隔离配置，绝不碰活库）。 */
function run(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: pkg, encoding: 'utf8',
    env: { ...process.env, USERPROFILE: HOME, HOME },
  });
}
const outData = (r) => JSON.parse(r.stdout).data;
const outDelivery = (r) => JSON.parse(r.stdout).delivery ?? null;
const landingDir = () => join(DB, 'memo_html');
const listing = () => (existsSync(landingDir()) ? readdirSync(landingDir()) : []);
/** 时间戳实例 → 主体（`<主体>_YYYYMMDD_HHMMSS[_N].html`）。 */
const stemOf = (file) => file.replace(/_\d{8}_\d{6}(_\d+)?\.html$/, '');

before(() => {
  DB = mkMemoDb('memo-828-');
  HOME = mkdtempSync(join(tmpdir(), 'memo-828-home-'));
  mkdirSync(join(HOME, '.ilife'), { recursive: true });
  writeFileSync(join(HOME, '.ilife', 'memo.yaml'),
    ['db:', '  dir: ' + JSON.stringify(DB.replace(/\\/g, '/')), '  name: memo.db'].join('\n') + '\n', 'utf8');
  NOTE_ID = seedNote(DB, { content: '给车做保养', category: '备忘', sub: '家务' });
  // 有效期内的提醒（将来）＋ 已废弃的提醒（不参与有效视图）。
  seedReminder(DB, { noteId: NOTE_ID, at: '2099-01-01 09:00', content: '将来的提醒' });
  seedReminder(DB, { noteId: NOTE_ID, at: '2030-01-01 09:00', content: '要废弃的提醒', status: 'dismissed' });
  // 「已触发」＝一次性提醒**仍是 active**、`notified_at` 已写，且有一条打卡笔记经 `reminder_id` 回指它
  // （老 `completed_reminders`：`JOIN reminders r ON n.reminder_id = r.id ... AND r.status = 'active'`）。
  // 状态写 active 才是这个视图的真实口径：一次性提醒触发时只在「准点」那一档才标 dismissed。
  const fired = seedReminder(DB, {
    noteId: NOTE_ID, at: '2020-01-01 09:00', content: '已触发过的提醒', status: 'active', notified: '2020-01-01 09:00:03',
  });
  const checkin = seedNote(DB, { content: '保养做完了', category: '打卡' });
  const conn = new DatabaseSync(join(DB, 'memo.db'));
  try { conn.prepare('UPDATE notes SET reminder_id = ? WHERE id = ?').run(fired, checkin); } finally { conn.close(); }
});

after(() => { rmSync(HOME, { recursive: true, force: true }); });

describe('#828 · 官方源：本域 4 场景取自 HELP', () => {
  it('4 个场景、唤醒词与册子格一一对上', () => {
    assert.deepEqual(
      SCENES.map((s) => s.wake_word),
      ['记提醒', '设提醒', '看提醒', '查已提醒备忘'],
    );
    for (const s of SCENES) {
      assert.equal(typeof s.id, 'string');
      assert.ok(s.types.includes('回执') || s.types.includes('查看'), s.id + ' 应有页型声明');
    }
  });
});

describe('#828 · 4 场景端到端（真出口）', () => {
  it('① 记提醒：memo.create exit 0 ＋ 落入册子格「记提醒」', () => {
    const r = run(['memo.create', '--params', JSON.stringify({
      title: '交物业费', category: '备忘', remindAt: '2026-12-31 09:00',
    })]);
    assert.equal(r.status, 0, String(r.stderr));
    const d = outDelivery(r);
    assert.ok(d !== null, '本次须真落盘');
    const html = readFileSync(d.path, 'utf8');
    assert.match(html, /备忘录回执/);
    assert.match(html, /2026-12-31 09:00/, '页内要有这条提醒的时间');
    assert.equal(stemOf(d.path.split(/[\\/]/).pop()), '记提醒', '产物主体＝册子 seq 14 的主体');
    assert.equal(bookletFileStem('memo_remind_with_note'), '记提醒');
  });

  it('② 设提醒：memo.reminder exit 0 ＋ 落入册子格「设提醒」', () => {
    const r = run(['memo.reminder', '--params', JSON.stringify({
      note_id: NOTE_ID, content: '该做保养了', remind_at: '2026-12-31 10:00',
    })]);
    assert.equal(r.status, 0, String(r.stderr));
    const d = outDelivery(r);
    assert.ok(d !== null);
    const html = readFileSync(d.path, 'utf8');
    assert.match(html, /该做保养了/);
    assert.match(html, /2026-12-31 10:00/);
    assert.match(html, new RegExp('#' + NOTE_ID), '页内要认得出挂在哪条笔记上');
    assert.equal(stemOf(d.path.split(/[\\/]/).pop()), '设提醒');
  });

  it('③ 看提醒：memo.remind exit 0 ＋ 落入册子格「看提醒」，只列 active 那些条', () => {
    const r = run(['memo.remind', '--params', JSON.stringify({ scene: 'memo_reminders_active' })]);
    assert.equal(r.status, 0, String(r.stderr));
    const d = outDelivery(r);
    assert.ok(d !== null);
    assert.equal(stemOf(d.path.split(/[\\/]/).pop()), '看提醒');
    const html = readFileSync(d.path, 'utf8');
    assert.match(html, /将来的提醒/, '有效提醒要在页上');
    assert.match(html, /该做保养了/, '刚设的那条也要在页上');
    assert.ok(!html.includes('要废弃的提醒'), '已废弃的不该出现在有效视图里');
  });

  it('④ 查已提醒备忘：走已完成视图 ＋ 落入册子格「查已提醒备忘」', () => {
    const r = run(['memo.remind', '--params', JSON.stringify({ mode: 'done', scene: 'memo_completed_reminders' })]);
    assert.equal(r.status, 0, String(r.stderr));
    const d = outDelivery(r);
    assert.ok(d !== null);
    assert.equal(stemOf(d.path.split(/[\\/]/).pop()), '查已提醒备忘');
    const html = readFileSync(d.path, 'utf8');
    assert.match(html, /已触发过的提醒/, '已触发的提醒要在页上');
    assert.match(html, /保养做完了/, '带出来的打卡笔记也要在页上（老 completed_reminders 口径）');
  });

  it('四格产物齐全（册子 4 个主体各一件）', () => {
    const stems = listing().map(stemOf);
    for (const s of SCENES) {
      const want = bookletFileStem(s.id);
      assert.ok(stems.includes(want), want + ' 缺产物；盘上：' + listing().join(','));
    }
  });

  it('反例：改名即「墙上缺件」——册子里的主体是唯一权威，改一处就红', () => {
    // 反例用**册子函数**判：主体一旦不再等于册子那一行，本次断言即红（不依赖人眼）。
    const wrong = '看提醒（改坏了）';
    const stems = listing().map(stemOf);
    assert.ok(!stems.includes(wrong));
    assert.notEqual(wrong, bookletFileStem('memo_reminders_active'), '改坏的名字不该与册子主体相等');
  });
});

describe('#828 · 两处路由纠错（定义级 ＋ 反例）', () => {
  it('设提醒：缺槽位报的是 content（不是模糊的「参数不对」）', () => {
    assert.throws(() => routeWakeword('设提醒', { remind_at: '2026-10-01 09:00' }), (e) => {
      assert.equal(e.code, 'POLICY_MISSING_SLOT');
      assert.match(e.message, /content/);
      return true;
    });
  });

  it('设提醒：两个槽位给齐即路由成 memo.reminder 且两个值都带进参数', () => {
    const hit = routeWakeword('设提醒', { content: '取牛奶', remind_at: '2026-10-01 09:00' });
    assert.equal(hit.key, 'memo.reminder');
    assert.deepEqual(hit.params, { content: '取牛奶', remind_at: '2026-10-01 09:00' });
  });

  it('查已提醒备忘：走已完成视图（done:true），与「看提醒」不再是同一份', () => {
    const done = routeWakeword('查已提醒备忘', {});
    const active = routeWakeword('看提醒', {});
    assert.equal(done.key, 'memo.remind');
    assert.equal(done.params.done, true, '已完成视图的判据是 done===true');
    assert.equal(done.params.scene, 'memo_completed_reminders');
    assert.equal(active.params.done, undefined);
    // 「看提醒」不带 `scene`：页落哪一格由缺省支决定（免得速查示例里多出内部参数，也免得两处定义）。
    assert.equal(active.params.scene, undefined, '看提醒 走缺省支，不放 scene');
  });

  it('反例：scene 给个册子外的名字即 exit 2，且不落产物', () => {
    const before = listing().length;
    const r = run(['memo.remind', '--params', JSON.stringify({ scene: 'memo_not_a_scene' })]);
    assert.equal(r.status, 2);
    assert.match(String(r.stderr), /scene 只认/);
    assert.equal(listing().length, before, '参数错不该落产物：' + listing().join(','));
  });

  it('反例：设提醒缺 content 即 exit 2「请填入提醒内容」（老 add_reminder 逐字），且不落产物', () => {
    const before = listing().length;
    const r = run(['memo.reminder', '--params', JSON.stringify({ remind_at: '2026-10-01 09:00' })]);
    assert.equal(r.status, 2);
    assert.match(String(r.stderr), /请填入提醒内容/);
    assert.equal(listing().length, before);
  });

  it('反例：挂不存在的笔记即 exit 4，且不落产物', () => {
    const before = listing().length;
    const r = run(['memo.reminder', '--params', JSON.stringify({ note_id: 999999, content: '孤魂', remind_at: '2026-10-01 09:00' })]);
    assert.equal(r.status, 4);
    assert.match(String(r.stderr), /无此笔记/);
    assert.equal(listing().length, before);
  });
});

describe('#828 · 产物形状（册子格的页型）', () => {
  it('两条读命令出的是**列表查询族**整页（memo_query 模板），不是 envelope 片段', () => {
    for (const f of listing().filter((x) => x.startsWith('看提醒_') || x.startsWith('查已提醒备忘_'))) {
      const html = readFileSync(join(landingDir(), f), 'utf8');
      assert.match(html, /^<!doctype html>/i, f + ' 应是整页');
      assert.match(html, /<\/html>\s*$/i, f + ' 应到 </html> 收尾');
      assert.ok(!html.includes('<!--INJECT-DATA-->'), f + ' 载荷已注入');
      assert.ok(!/loading\s*=\s*["']lazy["']/i.test(html), f + ' 不许惰性加载（墙下半页会空白）');
    }
  });

  it('两条写命令出的是**通用回执族**整页，且带常见问题重试指引', () => {
    for (const f of listing().filter((x) => x.startsWith('设提醒_') || x.startsWith('记提醒_'))) {
      const html = readFileSync(join(landingDir(), f), 'utf8');
      assert.match(html, /^<!doctype html>/i, f + ' 应是整页');
      assert.match(html, /数据与日志/, f + ' 回执页要有复制区');
    }
  });

  // #828 收尾两条：都是**渲染后才看得见**的债，静态分隔符门与六列机审都读不到（`t867-人核档.md` §三 已登记这个缺口），
  // 所以在这里用产物正文把它们钉住——改坏一处即红。
  it('页题不重复：眉头与页题同串的 H3 债已清（回执族模板）', () => {
    for (const f of listing().filter((x) => x.startsWith('记提醒_') || x.startsWith('设提醒_'))) {
      const html = readFileSync(join(landingDir(), f), 'utf8');
      // 眉头与页题同串＝同事实一页两遍（H3）。三处读数：眉头元素没了、页头只剩标题一个、元信息行不进页头标题位。
      assert.ok(!html.includes('class="eyebrow"'), f + ' 回执页不该再有眉头元素（与页题同串＝同事实一页两遍）');
      const hero = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
      assert.equal((hero.match(/<h1/g) || []).length, 1, f + ' 页头只许一个标题');
      assert.ok(!/<p class="eyebrow"/.test(hero), f + ' 页头不该有第二个标题位');
      assert.ok(!/\b回执\b[\s\S]{0,80}<h1/.test(hero), f + ' 页题之前不该再有同义串');
    }
  });

  it('页上可见文本不用分隔符串顶替版式（全页含运行时渲染面）', () => {
    for (const f of listing()) {
      const html = readFileSync(join(landingDir(), f), 'utf8');
      const visible = html
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/<style[\s\S]*?<\/style>/g, '')
        .replace(/<[^>]+>/g, ' ');
      assert.ok(!visible.includes('·'), f + ' 可见文本里不该有「·」并列串');
      assert.ok(!visible.includes('；'), f + ' 可见文本里不该有「；」并列串');
    }
  });

  it('运行时渲染的元信息行：时间与唤醒词都在，且不再用「·」串', () => {
    for (const f of listing().filter((x) => x.startsWith('记提醒_') || x.startsWith('设提醒_'))) {
      const html = readFileSync(join(landingDir(), f), 'utf8');
      const line = (/getElementById\("meta"\)\.textContent=([^;]+);/.exec(html) || [])[1] ?? '';
      assert.ok(line !== '', f + ' 回执页要有元信息行');
      assert.ok(line.includes('generated_at') && line.includes('wake_word'), f + ' 元信息行要有时间与唤醒词两件事实');
      assert.ok(!line.includes('·'), f + ' 元信息行不许用「·」串（分隔符探针读不到运行时文本）');
    }
  });
});
