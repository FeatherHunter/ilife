/** #843 · 交付面：**唤醒词命令缺省落盘** ＋ **产物落点分家** ＋ **命名一处定义**（真出口；spawn 子进程）。
 *
 * 票面三条交付物在这件里逐条上锁：
 *  ① 缺省落盘：`schedule-cmd-read <key>` **原样调用**即落一份 HTML，顶层 `delivery.path` 是**绝对路径**、
 *     文件真在、盘上字节＝`delivery.bytes`（不是期望值）、内容是本包模板页（`<!DOCTYPE html>` 起、含 `<section`）；
 *  ② 落点分家：7 个唤醒词命令落**产物根** `<数据目录>/schedule_html/`，`schedule.help.lookup` 仍落
 *     `<数据目录>/schedule_html/help/`（老落点逐字不变，`help-delivery-203/204` 也锁着）；
 *  ③ 命名一处定义：落盘名的主体＝**命令声明上的标题**（`src/delivery/naming.ts` 的 `pageStemFor`
 *     一处算法，读生成的 `registry.ts`），本件把它与真落盘名对账；且每个标题都**能路由回本键的唤醒词**
 *     （`WAKE_TABLE` 逐条查）——页面上的词都从 HELP 里取，自造不出名字。
 *
 * 不锁的（各票自有）：外观与内容（快照门 `tooling/skill-html.snapshot.json`）、库行为、HELP 复用窗口。
 *
 * 自带**反向对照**（自造的红，防「用例只会在真产物上印绿」）：§1 的每一条既验「该落的落了」，
 * 也验「落点确实在这个根下」；§3 逐键点名「不得落在 help 支」；§4 验「同秒两份 ⇒ 递补而不覆盖」。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`（用例读 `dist/**`），
 * 再 `node --test packages/skill-schedule/test/tA0-交付面.test.mjs`。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDirOf, homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
import { REGISTRY } from '../dist/cli/registry.js';
import { WAKE_TABLE } from '../dist/policy/wakewords.js';
import { pageStemFor, SCHEDULE_SKILL_NAME } from '../dist/delivery/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = process.execPath;
const P = (o) => JSON.stringify(o);

/** 数据目录：`db.dir` 空串 ⇒ 配置给出的 `<家目录>/.ilife/data`（#763 家目录隔离）。 */
const dataDirOf = (home) => join(configDirOf(home), 'data');
/** 产物**根**目录（#843 起页面落这里）与 HELP 那一支。 */
const pagesRootOf = (home) => join(dataDirOf(home), 'schedule_html');
const helpRootOf = (home) => join(pagesRootOf(home), 'help');

/** 7 个唤醒词命令 ＋ HELP：逐键给一份「照抄即跑」的入参（HELP 空参＝交付文件那一支）。 */
const SEEDS = [
  { op: 'add', date: '2026-09-06', time_start: '09:00', time_end: '10:00', activity: '调优', category: '工作.AI调优' },
  { op: 'add', date: '2026-09-07', time_start: '07:00', time_end: '08:00', activity: '跑步', category: '健康.运动' },
  { op: 'add', date: '2026-08-06', time_start: '09:00', time_end: '10:00', activity: '调优', category: '工作.AI调优' },
];
const KEY_ARGS = [
  { key: 'schedule.record.today', args: [] },
  { key: 'schedule.record.range', args: ['--params', '{"start":"2026-09-01","end":"2026-09-30"}'] },
  { key: 'schedule.record.detail', args: ['--params', '{"id":1}'] },
  // kind=months 还要 monthA／monthB（路由表只给 kind 预设，见 §发现），这里取 kind=category 的照抄即跑样例。
  { key: 'schedule.record.compare', args: ['--params', '{"kind":"category","start":"2026-09-01","end":"2026-09-30","category":"工作"}'] },
  { key: 'schedule.plan.today', args: [] },
  // 商量计划（预览）＝写侧的过程型页：须真给一天 24h 覆盖的 events（与 `--params` 的既有口径一致）。
  { key: 'schedule.plan.write', args: ['--params', '{"op":"preview","date":"2026-09-21","events":[{"date":"2026-09-21","time_start":"00:00","time_end":"09:00","title":"睡觉","category":"维持.睡眠"},{"date":"2026-09-21","time_start":"09:00","time_end":"24:00","title":"工作","category":"工作.会议"}]}'] },
  { key: 'schedule.record.write', args: ['--params', '{"op":"add","date":"2026-09-08","time_start":"09:00","time_end":"10:00","activity":"调优","category":"工作.AI调优"}'] },
  { key: 'schedule.help.lookup', args: [] },
];

function mkHome(tag) {
  return mkdtempSync(join(tmpdir(), 'tA0-' + tag + '-'));
}

/** 跑真出口：家目录指到本用例的临时家目录（配置与库都落那儿）。 */
function run(home, args) {
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(home) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

describe('#843 交付面', () => {
  /** 数据在跑之前先种好：本票锁的是「产品落哪、叫什么」，库空会先被「缺失阻断」挡在取数那一档。 */
  let home = '';
  before(() => {
    home = mkHome('deliver');
    for (const seed of SEEDS) {
      const r = run(home, ['schedule.record.write', '--params', P(seed)]);
      assert.equal(r.status, 0, '种子写须 exit 0（' + seed.date + '，stderr：' + r.stderr.trim().split('\n')[0] + '）');
    }
  });

  it('①＋② 缺省即落盘：8 键逐个真跑，绝对路径／字节相符／整页／落点分家', () => {
    const seen = [];
    for (const entry of KEY_ARGS) {
      const r = run(home, [entry.key, ...entry.args]);
      const label = entry.key + '（stderr：' + r.stderr.trim().split('\n')[0] + '）';
      assert.equal(r.status, 0, label + ' 须 exit 0');
      assert.ok(r.env, label + ' stdout 须是一行可解析 JSON');

      const dl = r.env.delivery;
      assert.ok(dl, label + ' 缺省调用必须给顶层 delivery（#843）');
      assert.equal(dl.mode, 'file', label + ' delivery.mode 须 file');

      const out = dl.path;
      assert.ok(isAbsolute(out), label + ' delivery.path 须绝对路径，实际：' + out);
      assert.equal(existsSync(out), true, label + ' 回执路径须真在盘上：' + out);
      assert.equal(statSync(out).size, dl.bytes, label + ' delivery.bytes 须等于盘上字节数');

      // 落点分家：HELP 在根下的 help 支，其余 7 键**就在根里**（不得也塞进 help）。
      const wantDir = entry.key === 'schedule.help.lookup' ? helpRootOf(home) : pagesRootOf(home);
      assert.equal(dirname(out), wantDir, label + ' 落点须是：' + wantDir);

      // 命名：主体＝命令声明上的标题（一处定义）；通式：`〈主体〉_<YYYYMMDD_HHMMSS>[_N].html`。
      // HELP 是唯一例外：它的主体住 `helpFileStem()`（老交付物名 `作息管家_HELP`，逐字不变，#203 锁着），
      // 与页面的取名规则是同一段代码（`pageStemFor`／`helpFileStem` 都在交付面里），但名字不同族。
      const spec = REGISTRY[entry.key];
      const stem = entry.key === 'schedule.help.lookup' ? '作息管家_HELP' : pageStemFor(spec);
      assert.equal(stem, SCHEDULE_SKILL_NAME + '_' + (entry.key === 'schedule.help.lookup' ? 'HELP' : spec.title),
        label + ' 主体＝技能名_（命令标题／HELP）');
      assert.match(basename(out), new RegExp('^' + stem + '_\\d{8}_\\d{6}(_\\d+)?\\.html$'),
        label + ' 落盘名须是「' + stem + '_<时间戳>.html」：' + basename(out));

      // 整页：模板起头 ＋ 真产物（envelope 分节或 HELP 载荷容器）。
      // #783 起 doctype 两种写法都算整页：薄模板是大写，写键交的**整页**走文档壳（默认小写）。
      const html = readFileSync(out, 'utf8');
      assert.equal(/^<!doctype html>/i.test(html), true, label + ' 须是完整页面（doctype 起）');
      assert.equal(html.includes('</html>'), true, label + ' 须收尾 </html>');
      // 真内容：HELP 看载荷容器；**交整页的键**（#783 写域 ＋ #784 单日查）看页壳与页面级配方根类；
      // 其余键仍走薄模板分节。这张名单是「哪些键的处理函数自己给整页」的**唯一清单**，加一条＝那一票自己加。
      const FULL_PAGE_KEYS = new Set(['schedule.record.write', 'schedule.record.today']);
      const substantive = entry.key === 'schedule.help.lookup'
        ? html.includes('<script id="help-data" type="application/json">')
        : (FULL_PAGE_KEYS.has(entry.key)
          ? html.includes('ilife-block-page-shell-body') && html.includes('ilife-page-ui')
          : html.includes('<section data-skill="schedule"'));
      assert.equal(substantive, true, label + ' 产物须含本键真内容（不是空壳）');

      seen.push(entry.key + ' → ' + basename(out) + '（' + dl.bytes + ' B）');
    }
    // 根里：7 个唤醒词命令的点名产物都在（HELP 那份在子目录里，不混进根）。**不数总数**：
    // 同一主体重复跑会长出 `_2`／`_3`（§4 锁的就是这条），种子写也会落页面，总数不是本票的不变量。
    const rootNames = readdirSync(pagesRootOf(home)).filter((n) => n.endsWith('.html'));
    for (const entry of KEY_ARGS) {
      if (entry.key === 'schedule.help.lookup') continue;
      const stem = pageStemFor(REGISTRY[entry.key]);
      const hit = rootNames.filter((n) => new RegExp('^' + stem + '_\\d{8}_\\d{6}(_\\d+)?\\.html$').test(n));
      assert.ok(hit.length >= 1, '产物根里须有「' + stem + '_<时间戳>.html」：' + rootNames.join(' / '));
    }
    assert.equal(readdirSync(helpRootOf(home)).length, 1, 'help 支里恰 HELP 一份');
    console.log('#843 ①＋② 读数：\n  ' + seen.join('\n  '));
  });

  it('③ 命名一处定义：标题＝本键一条唤醒词（或它在 HELP 正文里的词拼成，不自造）', () => {
    /** HELP 正文里的词（不是唤醒词，但用户能在 HELP 里找到出处）：技能名与它五个一级分组名。
     *  页面名允许用它们拼（例：`写计划`＝`写` 出自 HELP 一级分组「写入与同步」＋`计划` ⊂ 本键唤醒词
     *  `补计划`）；本清单一处定义、**只许按需增删**，增删要同时在 HELP 找得出处。 */
    const HELP_WORDS = [SCHEDULE_SKILL_NAME, '写入', '查询', '日程', '分析', '辅助'];
    const rows = [];
    for (const key of Object.keys(REGISTRY)) {
      const spec = REGISTRY[key];
      if (key === 'schedule.help.lookup') continue;   // HELP 不在页面命名族里（见 ①）
      const wakes = WAKE_TABLE.filter((e) => e.key === key).map((e) => e.phrase);
      // ① 标题里的每个字都要有出处：本键唤醒词的并集 ∪ HELP 正文里的词。（`作息对比` 用「作息」＋
      //    本键唤醒词里的「对比」拼成，两段都在 HELP 里有出处；本键恰没有一条唤醒词能当这一家族的名字。）
      const pool = wakes.join('') + HELP_WORDS.join('');
      const missing = [...new Set([...spec.title].filter((ch) => !pool.includes(ch)))];
      assert.equal(missing.length, 0, key + ' 的标题「' + spec.title + '」里有 HELP 里找不到出处的字：'
        + missing.join('') + '——不自造新词');
      // ② 标题里至少含一条**本键唤醒词**，或本键一条唤醒词里含标题（页面名指得出本键的哪个场景）。
      const hit = wakes.find((phrase) => spec.title.includes(phrase))
        ?? wakes.find((phrase) => phrase.includes(spec.title))
        ?? wakes.find((phrase) => [...spec.title].every((ch) => (phrase + HELP_WORDS.join('')).includes(ch)));
      assert.ok(hit, key + ' 的标题「' + spec.title + '」与任何一条本键唤醒词都没关系（本键唤醒词：'
        + wakes.join('、') + '）——页面名要指得出本键的哪个场景');
      rows.push(key + ' → ' + pageStemFor(spec) + '（出处：「' + hit + '」）');
    }
    assert.equal(rows.length, 7, '本包恰 7 个唤醒词命令进页面命名族（HELP 另一族）');
    console.log('#843 ③ 读数：\n  ' + rows.join('\n  '));
  });

  it('④ 同名不覆盖：同秒两次调用递补 _2，两份都在、各自回执各自字节', () => {
    const succ = mkHome('succ');
    const a = run(succ, ['schedule.record.today']);
    const b = run(succ, ['schedule.record.today']);
    assert.equal(a.status, 0, '首跑 exit 0');
    assert.equal(b.status, 0, '二跑 exit 0');
    assert.notEqual(b.env.delivery.path, a.env.delivery.path, '两次调用落点各自独立');
    assert.equal(existsSync(a.env.delivery.path), true, '首份仍在（不得被覆盖）');
    assert.equal(existsSync(b.env.delivery.path), true, '次份也真在');
    assert.equal(statSync(a.env.delivery.path).size, a.env.delivery.bytes, '首份字节＝首份回执');
    assert.equal(statSync(b.env.delivery.path).size, b.env.delivery.bytes, '次份字节＝次份回执');
    const names = readdirSync(pagesRootOf(succ)).sort();
    assert.equal(names.length, 2, '同秒两次 ⇒ 恰两份（递补，不覆盖）：' + names.join(' / '));
    console.log('#843 ④ 读数：' + names.join(' / '));
  });
});
