/** #721 · 域声明的**行为断言**：内容目录／路由／派生 fail-closed／命令注册表。
 *
 * 缝＝**包门与它的产物**（#721「Testing Decisions」指定的那条既有缝，不新增缝）：
 *   · 内容目录、投影结果 —— 从**产物**（真渲染出来的 HELP 页）里那段 `help-data` payload 上读；
 *   · 路由与派生 —— 从**包门**（`../dist/index.js`，即 `src/index.ts` 转出的值名）上读；
 *   · 命令注册表 —— 从同一包门转出的形状表与它汇总的注册表上读（照 `cmd-registry-686` 的既有取法）。
 * 只断言「用户拿到的那张 HELP 页里有什么」与「某条词被送到哪条命令」；不断言内部结构、不测行号与函数名。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BILL_KEY_SHAPES, buildHelpFileData, renderHelpFileHtml } from '../dist/index.js';
import { WAKE_TABLE, projectWakeWord, routeWakeword } from '../dist/triggers/wakeTable.js';
import { REGISTRY, REGISTRY_KEYS } from '../dist/cli/registry.js';
/** 落点表（16 行）的**处理方声明**（kind／op）在这一件里；它不是包对外面的一部分，判据按既有取法直取定义地
 *  （同 `frozen-blocks`／`t409-wire` 两件既有测试的取法）。 */
import { SCENES } from '../dist/write/scene.js';

/** 老实物的域顺序（照搬，不许重排）。 */
const GROUP_IDS = ['write', 'query', 'analysis', 'goal', 'account', 'link', 'setup'];
/** 老 70 个唯一唤醒词：老实体 71 条场景里去掉重复的「备份」。 */
const LEGACY_UNIQUE_WORDS = 70;

/** 产物 HELP 页里的 `help-data` payload（模板直转、零改写）。 */
function payload() {
  const html = renderHelpFileHtml(buildHelpFileData(new Date('2026-09-11T14:30:00'), {}));
  const open = html.indexOf('<script id="help-data"');
  assert.ok(open >= 0, 'HELP 产物里没有 help-data 锚点');
  const start = html.indexOf('>', open) + 1;
  return JSON.parse(html.slice(start, html.indexOf('</script>', start)));
}

const scenesOf = (p) => p.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));

/** 产物里那块「HELP 唤醒词」（`meta_blocks[id=help_wake_words]`，`<p>a / b / c / d</p>`）。 */
function helpWakeWords(p) {
  const block = p.meta_blocks.find((b) => b.id === 'help_wake_words');
  assert.ok(block, '产物里没有 help_wake_words 块');
  return block.html.replace(/^<p>|<\/p>$/g, '').split(' / ');
}

/** 一条词路由到哪条命令（判据只看命令名，不看内部结构）。 */

describe('#721 · 内容目录（从产物上读）', () => {
  it('域序照声明自带的 order：7 域／20 二级组／74 场景', () => {
    const p = payload();
    assert.deepEqual(p.groups.map((g) => g.id), GROUP_IDS, '域序与老权威不同');
    assert.equal(p.groups.length, 7);
    assert.equal(p.groups.reduce((n, g) => n + g.subgroups.length, 0), 20);
    assert.equal(scenesOf(p).length, 74);
  });

  it('场景的 wake_word 是词条投影（词条拥有它，声明里不写第二遍）', () => {
    const p = payload();
    for (const g of p.groups) {
      for (const sub of g.subgroups) {
        for (const s of sub.scenes) {
          assert.equal(typeof s.wake_word, 'string', s.id + ' 缺 wake_word 投影');
          assert.ok(s.wake_word.length > 0, s.id + ' 投影为空');
        }
      }
    }
  });

  it('无场景的词不进目录（4 条 HELP 短语只在 HELP 唤醒词那一块里）', () => {
    const p = payload();
    const help = helpWakeWords(p);
    const sceneWords = new Set(scenesOf(p).map((s) => s.wake_word));
    assert.equal(help.length, 4, 'HELP 自身的 4 条短语');
    assert.deepEqual(help.filter((w) => sceneWords.has(w)), [], 'HELP 短语自指：进了场景目录');
  });

  it('74 条场景归 73 个词条（「备份」一词两场景的形状没搬丢）', () => {
    const p = payload();
    const words = scenesOf(p).map((s) => s.wake_word);
    assert.equal(words.length, 74);
    assert.equal(new Set(words).size, 73);
    assert.equal(words.filter((w) => w === '备份').length, 2);
  });
});

describe('#721 · 路由（从包门读）', () => {
  it('老 70 个唯一唤醒词逐条还在表里、逐条有落点', () => {
    const p = payload();
    const legacy = scenesOf(p).filter((s) => !['write_record', 'query_bills', 'query_bill_detail'].includes(s.id));
    assert.equal(legacy.length, 71);
    const uniq = [...new Set(legacy.map((s) => s.wake_word))];
    assert.equal(uniq.length, LEGACY_UNIQUE_WORDS);
    for (const w of uniq) {
      const hit = routeWakeword(w, { id: 1, date: '2026-09-06', start: '2026-09-01', end: '2026-09-30', q: '午饭', tag: '旅行', category: '餐饮', account: '支付宝', ledger: '生活', amount: 1, name: '招行卡', from: '支付宝', to: '招行卡', file: 'bills.csv' });
      assert.ok(typeof hit.key === 'string' && hit.key.length > 0, w + ' 没有落点');
    }
  });

  it('每条词都路由到它词条上写的那条命令（最长匹配优先仍成立）', () => {
    const p = payload();
    for (const s of scenesOf(p)) {
      const own = s.wake_word;
      const hit = routeWakeword(own, { id: 1, date: '2026-09-06', start: '2026-09-01', end: '2026-09-30', q: '午饭', tag: '旅行', category: '餐饮', account: '支付宝', ledger: '生活', amount: 1, name: '招行卡', from: '支付宝', to: '招行卡', file: 'bills.csv' });
      assert.ok(hit.key.startsWith('bill.'), own + ' 路由结果不是命令名：' + String(hit.key));
      // 最长匹配：整句里嵌着这条词时，命中的必须就是它自己（不被更短的词抢走）。
      const longer = routeWakeword('帮我' + own, { id: 1, date: 'x', start: 'a', end: 'b', q: 'q', tag: 't', category: 'c', account: 'a', ledger: 'l', amount: 1, name: 'n', from: 'f', to: 't', file: 'f' });
      assert.equal(longer.key, hit.key, own + ' 在长句里被别的词抢走了');
    }
  });

  it('preset 到 kind／op 的派生仍成立：落点表每件都算得回它那条词、且键对得上', () => {
    for (const s of SCENES) {
      const word = projectWakeWord({ key: s.key, kind: s.kind, op: s.op });
      assert.ok(word.length > 0, s.id + ' 算不出唤醒词');
      const hit = routeWakeword(word, { id: 1 });
      assert.equal(hit.key, s.key, s.id + '：算出的词「' + word + '」路由到 ' + hit.key + '，不是 ' + s.key);
      if (s.kind !== '') assert.equal(String(hit.params.kind), s.kind, s.id + '：kind 派生对不上');
      if (s.op !== '') assert.equal(String(hit.params.op), s.op, s.id + '：op 派生对不上');
    }
  });

  it('同 key 的词里，「只说命令名」那一条就是它词条上的通用词（无 preset）', () => {
    assert.equal(projectWakeWord({ key: 'bill.record.add' }), '记一笔');
    assert.equal(projectWakeWord({ key: 'bill.record.update' }), '改记录');
    assert.equal(projectWakeWord({ key: 'bill.record.today' }), '查今天');
    assert.equal(projectWakeWord({ key: 'bill.record.range' }), '查区间');
    assert.equal(projectWakeWord({ key: 'bill.record.search' }), '搜备注');
    assert.equal(projectWakeWord({ key: 'bill.record.detail' }), '查账单详情');
  });

  it('派生 fail-closed：某条命令一条词都算不出来时当场报错（不是静默给一张空卡）', () => {
    assert.throws(() => projectWakeWord({ key: 'bill.nonexistent' }), /用户到不了它/);
  });
});

describe('#721 · 命令注册表（撤掉代表唤醒词之后仍自洽）', () => {
  it('条数不缩水：注册表 8 键（已迁移的那些），16 键契约由词表整体守', () => {
    assert.equal(REGISTRY_KEYS.length, 8, '注册表＝已迁移的八条（其余 8 条仍住过渡表，合起来仍是 16 键）');
    for (const key of REGISTRY_KEYS) {
      assert.ok(String(BILL_KEY_SHAPES[key] || '').length > 0, key + ' 在形状表里没有形状');
    }
    // 16 键契约不缩水：词表里出现的命令名恰好就是那 16 个。
    assert.equal(new Set(WAKE_TABLE.map((e) => e.key)).size, 16);
  });

  it('每条命令都算得出代表唤醒词，且它路由回同一条命令', () => {
    for (const key of REGISTRY_KEYS) {
      const word = projectWakeWord({ key });
      assert.ok(word.length > 0, key + ' 一条词都算不出来');
      // 有的词带必需槽位（「查区间」要 start／end）：缺槽位即抛属**词的槽位口径**，不是路由错；
      // 这里要的是「它不落空、也不派到别的键上」。
      const routed = (() => {
        try { return routeWakeword(word, { id: 1, start: '2026-09-01', end: '2026-09-30' }); } catch { return null; }
      })();
      if (routed !== null) assert.equal(routed.key, key, key + ' 的代表词「' + word + '」路由到别的命令');
      for (const e of WAKE_TABLE.filter((x) => x.phrase === word)) {
        assert.equal(e.key, key, word + ' 在词表里还挂着别的命令：' + e.key);
      }
    }
  });

  it('声明里不再写代表唤醒词（第二处书写位消失）', () => {
    for (const key of REGISTRY_KEYS) {
      assert.equal('wakeWord' in REGISTRY[key], false, key + ' 的声明里还有 wakeWord 字段');
    }
  });

  it('落点表也不再写唤醒词，但 kind／op 仍在（分派不靠走词表）', () => {
    assert.equal(SCENES.length, 16);
    for (const s of SCENES) {
      assert.equal('wakeWord' in s, false, s.id + ' 的落点行还有 wakeWord');
      assert.equal(typeof s.kind, 'string');
      assert.equal(typeof s.op, 'string');
      assert.ok(s.family.trim() !== '', s.id + ' 要写明待哪一族窗口来填');
    }
  });
});
