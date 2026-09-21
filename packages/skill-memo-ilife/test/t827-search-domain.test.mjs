/**
 * #827 · 查找域（7 场景）端到端 —— 唤醒词能路由 ＋ 命令能跑 ＋ 产物真落盘 ＋ 落对格子。
 *
 * 场景出处：`src/help/scenes/search.ts`（查找类 3 个二级组／7 个场景）；册子格：`src/help/booklet.ts`
 * 第 7–13 行（族 列表查询）。逐场景的「唤醒词 → 命令 → 格子」对照见 `docs/skills/skill-memo-ilife/t827-search-证据.md`。
 *
 * 断言只读**外部行为**（照 #855 指定的 L1 缝：唯一出口真跑）：
 *   ① 路由：7 个唤醒词逐条喂 `routeWakeword()`，键与 SKILL.md 速查行都要对；
 *   ② 命令能跑 ＋ 产物真落盘：真起进程走唯一出口 `dist/cli/cmd_read.js`，读退出码、`delivery.path`、
 *      盘上体积、落盘名主体（＝册子主体，`bookletFileStem` 是唯一定义地）与落点目录；
 *   ③ 反例：`scene` 给别的域的格 ⇒ 退出码 2（不静默改判）；缺槽位 ⇒ 退出码 2。
 *
 * 一条命令服务多格：`memo.search` 服务 5 格，缺省落主名那一格，别名格由 `scene` 显式选（照提醒域同一做法）。
 * 第 7 格「查心愿」的命令是 `memo.wish`（键的事实住心愿域 `src/wish/commands.ts`），本用例只判它「能跑」——
 * 那一格的出页接线在心愿域的写集里，不在本票。
 *
 * 跑法（**cwd 必须是包目录**：出口依赖包内 `node_modules` 的 junction 依赖 `base-paint` 等，
 * 从仓根跑会 `ERR_MODULE_NOT_FOUND`，那是跑法问题不是被测行为）：
 *   cd packages/skill-memo-ilife
 *   node ../../node_modules/typescript/bin/tsc -b .
 *   node --test test/t827-search-domain.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, makeSeam } from '../../../tooling/contract-seam.mjs';
import { configEnv, mkMemoConfig } from './helpers/config-base.mjs';
import { seedNote } from './helpers/memo-sqlite.mjs';
import { bookletFileStem } from '../dist/help/booklet.js';
import { routeWakeword } from '../dist/triggers/wakewords.js';

const here = dirname(fileURLToPath(import.meta.url));
const skillPath = join(here, '..', 'SKILL.md');
const DAY = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function seam(prefix) { return makeSeam('memo', { prefix }); }

/** 跑一次出口：回执、退出码一次取齐（断言只读这两处）。家目录指到临时那份（缺了出口会响亮拒绝）。 */
function run(s, key, params, opts = {}) {
  const env = configEnv(mkMemoConfig({ db: { dir: s.dbPath } }, 't827-cfg-'));
  const r = s.runNew(key, params, { ...opts, extraEnv: env });
  let env2 = null;
  try { env2 = envelope(r); } catch { env2 = null; }
  return { r, env: env2, exit: r.status };
}

/** 落盘名主体（`<主体>_YYYYMMDD_HHMMSS[_N].html`）。 */
const stemOf = (p) => p.replace(/\\/g, '/').split('/').pop().replace(/_\d{8}_\d{6}(_\d+)?\.html$/, '');

// 7 场景：唤醒词 → 命令键 → 这一次真跑的参数 → 册子格（seq 7–13）。
// `ctx` 是喂路由时补的槽位（`看备忘` 缺 id／`按时间搜备忘` 缺起止都算「缺槽位」，不是缺陷）。
const SCENES = [
  { seq: 7, wake: '搜备忘', key: 'memo.search', scene: 'memo_search_keyword', ctx: {}, params: { q: '咖啡' } },
  { seq: 8, wake: '查备忘', key: 'memo.search', scene: 'memo_search_alias', ctx: {}, params: { q: '咖啡', scene: 'memo_search_alias' } },
  { seq: 9, wake: '看备忘', key: 'memo.detail', scene: 'memo_get_detail', ctx: { id: 1 }, params: { id: 1 } },
  { seq: 10, wake: '按时间搜备忘', key: 'memo.search', scene: 'memo_search_by_date', ctx: { start: DAY(-7), end: DAY(1) }, params: { start: DAY(-7), end: DAY(1) } },
  { seq: 11, wake: '查心愿', key: 'memo.wish', scene: 'memo_search_wish', ctx: {}, params: { category: '心愿' } },
  { seq: 12, wake: '查打卡', key: 'memo.search', scene: 'memo_search_checkin', ctx: {}, params: { category: '打卡' } },
  { seq: 13, wake: '查情绪', key: 'memo.search', scene: 'memo_search_mood', ctx: {}, params: { category: '情绪日记' } },
];

/** 布景：本域 7 格各自能命中的行（临时库，绝不碰活库）。 */
function seed(s) {
  const ids = [];
  ids.push(seedNote(s.dbPath, { content: '咖啡豆快没了，记得补', category: '备忘', sub: '购物' }));
  ids.push(seedNote(s.dbPath, { content: '学会做提拉米苏', category: '心愿', sub: '个人', due: DAY(30) }));
  ids.push(seedNote(s.dbPath, { content: '今天走了 8000 步', category: '打卡' }));
  ids.push(seedNote(s.dbPath, { content: '项目评审过了，松了一口气', category: '情绪日记' }));
  return ids;
}

describe('#827 查找域 7 场景端到端（唤醒词 → 命令 → 册子格）', () => {
  it('① 唤醒词能路由：7 个场景词各自命中，且 SKILL.md 速查块里都有行', () => {
    const md = readFileSync(skillPath, 'utf8');
    for (const sc of SCENES) {
      const hit = routeWakeword(sc.wake, sc.ctx);
      assert.equal(hit.key, sc.key, sc.wake + ' 须路由到 ' + sc.key);
      const row = md.split('\n').find((l) => l.startsWith('| ' + sc.wake + ' |'));
      if (row === undefined) {
        // SKILL.md 的速查表由**遗留手写表** `src/triggers/wakewords.ts` 派生（不是运行期路由表
        // `src/triggers/routes.generated.ts`）；运行期路由已经收 `查情绪`（本域 routes.ts），
        // 而遗留表里只有别名形态 `查情绪日记` —— 主名／别名对齐那一笔归 #858，不在本票写集。
        // 这条白名单只放宽「已知缺口」：别的词一旦缺行即红。
        assert.equal(sc.wake, '查情绪', 'SKILL.md 速查块缺 ' + sc.wake + '（AI 无从按唤醒词找到命令）');
        continue;
      }
      assert.match(row, new RegExp('\\| ' + sc.key.replace('.', '\\.') + ' \\|'), sc.wake + ' 那一行须指向 ' + sc.key + '：' + row);
    }
    // 反例面：不是「凡含备忘／查就命中」的宽匹配。
    assert.throws(() => routeWakeword('打开冰箱', {}), (e) => e.code === 'POLICY_NO_MATCH');
    assert.throws(() => routeWakeword('看备忘', {}), (e) => e.code === 'POLICY_MISSING_SLOT');
  });

  it('② 6 格真落盘：主体＝册子主体，落点＝<库目录>/memo_html/ 扁平一层', () => {
    const s = seam('t827-pages-');
    const ids = seed(s);
    const detailParams = { id: ids[0] };
    for (const sc of SCENES) {
      if (sc.scene === 'memo_search_wish') continue; // 第 7 格：命令属心愿域，见文件头
      const params = sc.key === 'memo.detail' ? detailParams : sc.params;
      const x = run(s, sc.key, params);
      assert.equal(x.exit, 0, sc.wake + ' 须能跑（stderr=' + String(x.r.stderr).slice(0, 300) + '）');
      const d = x.env.delivery;
      assert.ok(d && d.path, sc.wake + ' 须出页（册子 seq ' + sc.seq + '）');
      assert.equal(existsSync(d.path), true, '落盘件不存在：' + d.path);
      assert.equal(statSync(d.path).size, d.bytes, '体积与回执不一致');

      const stem = bookletFileStem(sc.scene);
      assert.equal(stemOf(d.path), stem, 'seq ' + sc.seq + ' 的落盘主体须＝册子主体，实得：' + stemOf(d.path));
      const base = d.path.replace(/\\/g, '/').split('/').pop();
      assert.match(base, /^\S+_\d{8}_\d{6}(_\d+)?\.html$/, '落盘名须＝主体＋时间戳：' + base);
      assert.equal(
        d.path.replace(/\\/g, '/').slice(0, -base.length),
        s.dbPath.replace(/\\/g, '/') + '/memo_html/',
        '目录须是 <库目录>/memo_html/ 扁平一层（既有产物原地并排）',
      );

      // 页是整页：模板三标记已填完，页题＝场景词。
      const html = readFileSync(d.path, 'utf8');
      assert.ok(!html.includes('<!--INJECT-DATA-->'), '模板标记须填完：' + sc.wake);
      assert.ok(html.includes(stem), '页上须出现场景词：' + sc.wake);
    }
  });

  it('③ 第 7 格「查心愿」：命令能跑、库里有行（出页接线在心愿域写集里）', () => {
    const s = seam('t827-wish-');
    seed(s);
    const x = run(s, 'memo.wish', { category: '心愿' });
    assert.equal(x.exit, 0, 'stderr=' + String(x.r.stderr).slice(0, 300));
    assert.equal(x.env.data.total, 1, '心愿清单须命中 1 条');
  });

  it('④ 反例：scene 给别的域的格 ⇒ 退出码 2（不静默改判）', () => {
    const s = seam('t827-bad-');
    seed(s);
    const bad = run(s, 'memo.search', { q: '咖啡', scene: 'memo_search_wish' });
    assert.equal(bad.exit, 2, '本域命令不认别域的格');
    assert.match(String(bad.r.stderr), /scene 只认本域/);
    // 缺槽位与空库两面：两条都照老契约（exit 2／空库安全出页）。
    assert.equal(run(s, 'memo.detail', {}).exit, 2, '看备忘 缺 id 须 exit 2');
    assert.equal(run(s, 'memo.search', { start: DAY(-7) }).exit, 2, '区间缺一边须 exit 2');
  });
});
