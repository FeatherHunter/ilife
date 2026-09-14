import { DECLARED_KEYS, DECLARED_READ_KEYS, DECLARED_WRITE_KEYS } from '../packages/skill-calorie/test/declared.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORY_SCENE, TRIGGERS } from '../packages/skill-calorie/dist/triggers/index.js';
import { CALORIE_COMBOS } from '../packages/skill-calorie/dist/cli/keys.js';
import {
  ALL_ROUTES,
  COVERAGE_REPAIR_ROUTES,
  EXEC_ROUTES,
  EXEC_ROUTE_BY_KEY,
  HIT_NOT_EXEC_ROUTES,
  NEW_KEY_ROUTES,
  NON_EXEC_REASONS,
  OUT_OF_SCOPE_ROUTES,
  ROUTES_BY_WAKE_WORD,
  T71_DIFFS,
  TWIN_WAKE_WORDS,
  WAKE_ROUTES,
  execCliForKey,
  routesFor,
  routingSummary,
} from '../packages/skill-calorie/dist/triggers/routing.js';

// #81 · 路由层断言（D2 ①–⑤）：436 条逐条恰一个桶／零 py／99 键全可达／与冻结表逐条对齐／新增入口不重复。
// #111 追加：可执行 326→336／命中但不执行 110→100（促进 10 词）＋ 新拟 34→40（运动移植 6 键）。
// #112 追加：可执行 336→337／命中但不执行 100→99（促进 1 词：看营养素深度）＋ 新拟 40→44（营养移植 4 键）。
// #113 追加：可执行 337→341／命中但不执行 99→95（促进 4 词）＋ 新拟 44→52（趋势2+其他6移植 8 键）。
// #86 追加：可执行 341→345（+4 新拟入口，不动 SoT 436）＋ 新拟 52→56（wizard 4 键）＋ 全可达 95→99。
// #179 追加：可执行 345→346（+1 新拟入口「看档案预检」）＋ 新拟 56→57 ＋ 全可达 99→100（档案预检页）。
// #180 重导（本波）：375 条冻结命令字段逐字改写成路由层命令后，三处「按命令原文反推」的判据失去派生口，
//   按议题《影响清单第一步补记》与用户 2026-09-11 裁定重导——① D2④ 的 FX-81-7 家族判据由「非直连」派生
//   改成**结构式**（覆盖全 341 条 exec：单条命令＋键 token 一致＋需参数带 --params），并把 legacy（无 key）
//   在 exec 桶里的 18 条**具名登记**（卡面 id 约束，见 help-center-106）；② D2⑤ 的「施工前既有入口 43 键」
//   由反推改成**冻结字面**（#152 的具名例外随基线重建并入，不再作为例外）；③ FX-81-5 的 smoke 汇总按甲案
//   放宽（数据依赖失败与命令缺陷分开统计，登记册只许登记不许扩）。
// 未放宽项：D2④ 的「冻结 cli 是命令形态 → 路由 cli 必须逐字相同」、D2①～③ 的条数与 100 键覆盖、
// 防回退断言（packages/skill-calorie/test/no-script-commands-180.test.mjs）。

const ROUTING_SRC = new URL('../packages/skill-calorie/src/triggers/routing.ts', import.meta.url);
const SMOKE_MD = new URL('../docs/research/t81-exec-smoke.md', import.meta.url);
const EXEC_FIELDS = ['wakeWord', 'scene', 'kind', 'key', 'cli'];
const NON_EXEC_FIELDS = ['wakeWord', 'scene', 'kind', 'bucket', 'reason'];
const KEY_LIST = Object.keys(CALORIE_COMBOS);
const frozenKeyOf = (t) => ('key' in t && typeof t.key === 'string' ? t.key : null);
const calorieKeyOf = (cli) => String(cli).split(' ')[1];
// FX-81-5／FX-81-7 唯一例外：语义上必须多步交互（先预览／确认再写库，归 #86）的词保留 non-exec。
// 判据见 docs/research/t81-route-evidence.md §2.2；其余「能做的」词一律已入 exec 桶（FX-81-7）。
const WIZARD_WORDS = new Set(['批量导入食品', '校验批量导入']);
const allExec = () => [...WAKE_ROUTES, ...NEW_KEY_ROUTES, ...COVERAGE_REPAIR_ROUTES].filter((r) => r.kind === 'exec');
/** FX-81-7 家族里形态特殊、单独改写的两条词：`记体脂（皮褶钳）` 的冻结示例缺 7 个皮褶参数、
 * `看目标预测达成` 的冻结示例窗口 <14 天（该能力要求 ≥14 天）——路由层各用完整参数／足窗（见下方逐条断言）。
 * #180 重导说明：原 `paramFlipRoutes()` 按「冻结 cli 不是本仓命令形态」派生（实测 237 条），本波把冻结 cli
 * 逐字改写成路由层命令后该派生口消失（实测只剩 18 条，且那 18 条是下面 `legacyCardIdExecZone` 登记的
 * legacy 词）→ 判据改为结构式，覆盖面 341 条 ＞ 原 237 条（不弱化）。原 237 条的逐条映射与实跑证据仍在
 * `docs/research/t81-route-evidence.md` §2.3／`docs/research/t81-exec-smoke.md` §1。 */
const SPECIAL_FLIP_WORDS = new Set(['记体脂（皮褶钳）', '看目标预测达成']);
/** legacy（冻结表无 `key`；其命令字段被 `render/helpCenter.ts:242` 当**卡面 id** 用）∩ exec 路由的记录。
 * 这 18 条的命令字段按设计写自然语言（不许命令形态，否则撞卡面 duplicate-id／text 态口径），
 * 故**不落在** D2④ 的「逐字相同」分支里——本函数把这一区的规模钉死，防它静默扩张或静默收缩。 */
const legacyCardIdExecZone = () =>
  WAKE_ROUTES.filter((r, i) => r.kind === 'exec' && frozenKeyOf(TRIGGERS[i]) === null);
/** 取快照里某一级标题到下一级标题之间的表格行（跳过表头与分隔行）。 */
const smokeSection = (md, heading) => {
  const i = md.indexOf(heading);
  assert.ok(i >= 0, `smoke 快照缺 ${heading}`);
  const rest = md.slice(i);
  const j = rest.indexOf('\n## ', 1);
  return (j >= 0 ? rest.slice(0, j) : rest)
    .split('\n')
    .filter((l) => l.startsWith('|'))
    .slice(2)
    .map((l) => l.split('|').slice(1, -1).map((s) => s.trim()));
};
const unquote = (s) => String(s).replace(/`/g, '');

describe('#81 唤醒词路由层（路由与 parity 分家）', () => {
  it('D2① 436 条逐条恰一个桶（可执行 345 ／ 命中但不执行 91，#113 促进 4 词 ＋ #252 目标管理 3 条自动算词转入可执行 ＋ #346 看今天练什么转入可执行）', () => {
    assert.equal(WAKE_ROUTES.length, 436);
    assert.equal(EXEC_ROUTES.length + HIT_NOT_EXEC_ROUTES.length, 436);
    const buckets = { exec: 0, 'non-exec': 0 };
    for (const r of WAKE_ROUTES) {
      assert.ok(r.kind === 'exec' || r.kind === 'non-exec', r.wakeWord);
      buckets[r.kind] += 1;
      if (r.kind === 'exec') {
        assert.deepEqual(Object.keys(r).sort(), [...EXEC_FIELDS].sort(), r.wakeWord);
        assert.ok(KEY_LIST.includes(r.key), `${r.wakeWord} → ${r.key}`);
        assert.match(r.cli, /^calorie-cmd-read calorie\./, r.wakeWord);
      } else {
        assert.deepEqual(Object.keys(r).sort(), [...NON_EXEC_FIELDS].sort(), r.wakeWord);
        assert.ok(r.bucket === 'out-of-scope' || r.bucket === 'legacy-chain', r.wakeWord);
        assert.ok(r.reason.length > 0, r.wakeWord);
        assert.ok(Object.values(NON_EXEC_REASONS).includes(r.reason), r.wakeWord);
      }
    }
    assert.deepEqual(buckets, { exec: 345, 'non-exec': 91 });
    assert.deepEqual(routingSummary(), {
      total: 436,
      exec: 345,
      nonExec: 91,
      outOfScope: 10,
      legacyChain: 81,
      newEntries: 58,
      repairEntries: 1,
      coveredKeys: DECLARED_KEYS.length,
    });
  });

  it('D2② 路由层零 py 命令引用（源码 ＋ 全部 exec cli）', () => {
    const src = readFileSync(ROUTING_SRC, 'utf8');
    assert.equal(/python/i.test(src), false, 'routing.ts 源码出现 py 命令字面');
    for (const r of ALL_ROUTES) {
      if (r.kind !== 'exec') continue;
      assert.equal(/python/i.test(r.cli), false, r.wakeWord);
      assert.match(r.cli, /^calorie-cmd-read calorie\./, r.wakeWord);
    }
  });

  it('D2③ 全量键（条数 == 权威声明）全部有可执行入口（436 条 ＋ 58 条新拟入口）', () => {
    const covered = new Set(ALL_ROUTES.filter((r) => r.kind === 'exec').map((r) => r.key));
    assert.deepEqual([...covered].sort(), [...KEY_LIST].sort());
    assert.equal(covered.size, DECLARED_KEYS.length, '键覆盖数 == 权威声明');
    assert.equal(Object.keys(EXEC_ROUTE_BY_KEY).length, DECLARED_KEYS.length, '可执行入口索引键数 == 权威声明');
    for (const key of KEY_LIST) {
      assert.ok(execCliForKey(key), key);
      assert.match(execCliForKey(key), new RegExp('^calorie-cmd-read ' + key.replace(/\./g, '\\.')));
    }
    assert.equal(execCliForKey('calorie.not.a.key'), null);
  });

  it('D2④ 与冻结表逐条对齐（唤醒词集合相等 ＋ 场景对齐；FX-81-2 授权放宽 cli 逐字）', () => {
    assert.deepEqual(
      WAKE_ROUTES.map((r) => r.wakeWord),
      TRIGGERS.map((t) => t.wake_word),
    );
    assert.deepEqual(
      [...WAKE_ROUTES.map((r) => r.wakeWord)].sort(),
      [...TRIGGERS.map((t) => t.wake_word)].sort(),
    );
    assert.equal(TRIGGERS.length, 436);
    assert.equal(new Set(WAKE_ROUTES.map((r) => r.wakeWord)).size, 434);
    assert.equal(routesFor('记身材照').length, 3);
    assert.deepEqual(routesFor('这个唤醒词不存在'), []);
    // 降级词集必须与冻结表**实测**一致（不是手写豁免）：多步交互词＝冻结 cli 含「→」且不属明确不做桶。
    assert.deepEqual(
      TRIGGERS
        .filter((t) => t.main_prompt.cli.includes(' → ') && !OUT_OF_SCOPE_ROUTES.some((r) => r.wakeWord === t.wake_word))
        .map((t) => t.wake_word)
        .sort(),
      [...WIZARD_WORDS].sort(),
    );
    // 皮褶钳来源的冻结示例只有 1 条（缺 7 个皮褶参数）——FX-81-7 已用完整皮褶参数实跑 exit 0 并改 exec。
    assert.deepEqual(
      TRIGGERS.filter((t) => t.main_prompt.cli.includes('"source":"home_caliper"')).map((t) => t.wake_word),
      ['记体脂（皮褶钳）'],
    );
    // `看目标预测达成` 的窗口判据（#250 重导）：该能力要求 ≥14 天**外推基线**，路由 cli 必须给足。
    // 旧判据从 cli 里抠 `"start"/"end"` 两个日期（种子日期写死的时代）；本票把窗口改成相对形态后，
    // 判据改读窗口词本身——解析口径仍由 `analysis/series.ts:resolveWindow` 一处给（命令层 `defaultRange`
    // 的缺省窗也是 14 天，两处同值）。判据强度不变：窗口不足照样变红。
    const predict = routesFor('看目标预测达成').find((r) => r.kind === 'exec');
    assert.ok(predict, '看目标预测达成 应有 exec 路由');
    const win = /"window":"([0-9]+)d"/.exec(predict.cli);
    assert.ok(win, '看目标预测达成 的 cli 应带相对窗口（window:"<N>d"）');
    const winDays = Number(win[1]);
    assert.ok(winDays >= 14, `看目标预测达成 窗口应 ≥14 天（实测 ${winDays} 天）`);
    // #252：目标管理 3 条「自动算」词改成 exec（命令文本＝工作流程第一步＝预检确认页），
    // 故多步交互词从 5 条降到 2 条（余下两条属场景 02，归饮食那张图）。
    assert.equal(WIZARD_WORDS.size, 2);
    for (let i = 0; i < TRIGGERS.length; i += 1) {
      const t = TRIGGERS[i];
      const r = WAKE_ROUTES[i];
      assert.equal(r.wakeWord, t.wake_word, `#${i}`);
      assert.equal(r.scene, CATEGORY_SCENE[t.category] ?? '??', `#${i} ${t.wake_word}`);
      const cli = t.main_prompt.cli;
      if (WIZARD_WORDS.has(t.wake_word)) {
        // FX-81-7：多步交互（wizard）——冻结 cli 含「→ 确认后 …」，非单条命令 → non-exec。
        assert.ok(cli.includes(' → '), `#${i} ${t.wake_word} 非多步交互串`);
        assert.equal(r.kind, 'non-exec', `#${i} ${t.wake_word}`);
        assert.equal(r.reason, NON_EXEC_REASONS.wizard, `#${i} ${t.wake_word}`);
      } else if (SPECIAL_FLIP_WORDS.has(t.wake_word)) {
        // 两条特殊词只在下面单独钉（本分支不放松任何逐字要求：它们本就不该与冻结示例逐字相同）。
        assert.equal(r.kind, 'exec', `#${i} ${t.wake_word}`);
      } else if (cli.startsWith('calorie-cmd-read calorie.') && !cli.includes(' → ')) {
        // 受控复制（保留项，未放宽）：冻结 cli 本身已是唯一出口形态的直连词，路由层 cli 仍须逐字一致。
        assert.equal(r.kind, 'exec', `#${i} ${t.wake_word}`);
        assert.equal(r.cli, cli, `#${i} ${t.wake_word} 直连 cli 必须与冻结表逐字一致`);
        assert.equal(r.key, calorieKeyOf(cli), `#${i} ${t.wake_word}`);
      } else if (frozenKeyOf(t) === null) {
        // legacy（无 key）：命令字段是卡面 id（`render/helpCenter.ts:242`）→ 不许命令形态；
        // 它们里 18 条在路由层是 exec，规模由下方 legacyCardIdExecZone 钉死。
        assert.equal(cli.startsWith('calorie-cmd-read calorie.'), false,
          `#${i} ${t.wake_word} legacy 卡面 id 不得是命令形态`);
        assert.ok(cli.length > 0, `#${i} ${t.wake_word} legacy 命令字段不得为空`);
      } else {
        // #180 重导（原先这条由「非命令形态 ＋ 命中补偿表」两分支拼成，补偿表已清空）：
        // 有 key 的词，命令字段不是本仓命令形态 → 路由层按设计判 non-exec（「优化／开发」一族，
        // 数据与路由在这 91 条上必须方向一致，否则用户看到的命令与路由层判断会打架）。
        assert.equal(r.kind, 'non-exec', `#${i} ${t.wake_word} 命令字段非命令形态时路由层应判 non-exec`);
      }
    }
    // FX-81-2（方案 a）：能力已可执行的冻结词入 exec 桶，且必须指向「同 key 的新拟入口」（孪生词）。
    // 逐条孪生关系（词 → 新拟词 → key）见 docs/research/t81-route-evidence.md §2.1。
    const newByKey = new Map(NEW_KEY_ROUTES.map((r) => [r.key, r]));
    let twinFlips = 0;
    for (let i = 0; i < TRIGGERS.length; i += 1) {
      const t = TRIGGERS[i];
      const r = WAKE_ROUTES[i];
      if (r.kind !== 'exec') continue;
      if (!TWIN_WAKE_WORDS.includes(t.wake_word)) continue;
      const twin = newByKey.get(r.key);
      assert.ok(twin, `#${i} ${t.wake_word} → ${r.key} 无同 key 的新拟入口（孪生关系不成立）`);
      // 注（FX-81-6 · E-6）：对直连／override 词，键 token 已由 D2④ 的 `r.key === calorieKeyOf(cli)` 钉死；
      // 对孪生词记录（本循环正是这一批），本行仍是**唯一**把 r.cli 的键 token 与同 key 入口对齐的断言
      // （D2①／D2⑤ 只钉 `^calorie-cmd-read calorie\.` 前缀）→ 故保留（不删、不恒真化）。
      assert.equal(r.cli.split(' ')[1], twin.cli.split(' ')[1], `#${i} ${t.wake_word} cli 键 token 与新拟词不一致`);
      twinFlips += 1;
    }
    assert.equal(twinFlips, 26, 'FX-81-2 孪生词转 exec 条数');
    // legacy ∩ exec 登记（#180 新增）：命令字段写自然语言是**卡面 id 约束**的产物（见 help-center-106），
    // 因此「逐字相同」按设计不覆盖这 18 条；把规模与成员身份钉死，防静默扩张。
    assert.equal(legacyCardIdExecZone().length, 18, 'legacy 卡面 id 在 exec 桶里的条数');
    // FX-81-7（同 key 可参数化）结构式判据（#180 重导，覆盖全 341 条 exec）：一律**单条命令**、
    // 键 token 与 r.key 一致、需参数的键带 --params（逐条映射与实跑见证据表 §2.3／smoke §1）。
    for (const r of EXEC_ROUTES) {
      assert.equal(/ → /.test(r.cli), false, `${r.wakeWord} cli 含多步链`);
      assert.ok(
        r.cli === 'calorie-cmd-read ' + r.key || r.cli.startsWith('calorie-cmd-read ' + r.key + " --params '"),
        `${r.wakeWord} cli 键 token 与 key 不一致：${r.cli}`,
      );
    }
    assert.equal(EXEC_ROUTES.length, 345, 'FX-81-7 结构式判据覆盖面（全 exec 记录，#252 目标管理 3 条自动算词转入 ＋ #346 看今天练什么转入）');
    assert.equal(ROUTES_BY_WAKE_WORD['记身材照'].length, 3);
    assert.equal(
      Object.values(ROUTES_BY_WAKE_WORD).reduce((n, rs) => n + rs.length, 0),
      495, // #251 +1（看目标预检，新拟入口 → 多一条路由记录）
    );
    for (const w of new Set(WAKE_ROUTES.map((r) => r.wakeWord))) {
      assert.ok(routesFor(w).length >= 1, w);
    }
  });

  it('D2⑤ 新增入口（58 键，#113 +8／#86 +4／#179 +1／#251 +1）与施工前既有入口零重复', () => {
    assert.equal(NEW_KEY_ROUTES.length, 58);
    // 「施工前既有入口」＝#81 施工点上冻结表可达的 **43 键**（冻结直连 cli 33 键 ＋ 当时补偿表 22 条映射出的
    // 10 个新键）。#180 把 375 条命令字段逐字改写成路由层命令后，这层基线**已无法从冻结表反推**——反推得
    // 75 键，其中 32 键正是 #81 新拟入口本尊（自己与自己比，判据失去鉴别力）→ 按议题《影响清单第一步补记》
    // 第 4 条的授权改成**冻结字面**。重建口径与逐键出处见 `docs/skills/skill-calorie/t180-collection.md`：
    // 施工前数据取 `e953509` 的 10 个场景文件（直连 33 键，可复跑），补偿表侧取当时 22 条（不含 `profile_view`）。
    // `calorie.view.profile` **不入基线**：施工前冻结表不可达该键（真命令由 #152／#177 引入），该键今天仍由
    // 新拟词「看档案视图」承载（孪生）——#152 的具名例外随本波并入基线重建，本文件不再有具名例外。
    const FROZEN_BASELINE_KEYS = [
      'calorie.body.composition-add', 'calorie.body.composition-remove', 'calorie.body.measure-add',
      'calorie.body.measure-remove', 'calorie.diet.add', 'calorie.diet.batch', 'calorie.diet.copy',
      'calorie.diet.remove', 'calorie.diet.remove-by-date', 'calorie.diet.remove-by-range',
      'calorie.diet.remove-by-type', 'calorie.diet.update', 'calorie.diet.update-by-date',
      'calorie.exercise.add', 'calorie.exercise.remove', 'calorie.exercise.update', 'calorie.goal.pause',
      'calorie.goal.resume', 'calorie.goal.set', 'calorie.goal.water', 'calorie.goal.weight',
      'calorie.product.add', 'calorie.product.deprecate', 'calorie.product.update', 'calorie.profile.activity',
      'calorie.profile.set', 'calorie.profile.update', 'calorie.view.diet', 'calorie.view.exercise',
      'calorie.view.goal', 'calorie.view.goal-expiring', 'calorie.view.goal-predict',
      'calorie.view.goal-progress', 'calorie.view.goal-recommend', 'calorie.view.goal-vs-actual',
      'calorie.view.goal-weight', 'calorie.view.home', 'calorie.view.weight', 'calorie.water.log',
      'calorie.weight.batch', 'calorie.weight.log', 'calorie.weight.remove', 'calorie.weight.update',
    ];
    assert.equal(FROZEN_BASELINE_KEYS.length, 43, '施工前既有入口键数');
    assert.equal(new Set(FROZEN_BASELINE_KEYS).size, 43, '施工前基线不得有重复键');
    const frozenExecKeys = new Set(FROZEN_BASELINE_KEYS);
    const existingWords = new Set(TRIGGERS.map((t) => t.wake_word));
    const newKeys = new Set();
    const newWords = new Set();
    for (const r of NEW_KEY_ROUTES) {
      assert.deepEqual(Object.keys(r).sort(), [...EXEC_FIELDS].sort(), r.wakeWord);
      assert.equal(r.kind, 'exec');
      assert.ok(KEY_LIST.includes(r.key), r.key);
      assert.equal(frozenExecKeys.has(r.key), false, `键与既有入口重复：${r.key}`);
      assert.equal(existingWords.has(r.wakeWord), false, `唤醒词撞冻结表：${r.wakeWord}`);
      assert.equal(newKeys.has(r.key), false, `新拟键重复：${r.key}`);
      assert.equal(newWords.has(r.wakeWord), false, `新拟唤醒词重复：${r.wakeWord}`);
      newKeys.add(r.key);
      newWords.add(r.wakeWord);
      assert.match(r.cli, /^calorie-cmd-read calorie\./);
      assert.equal(/python/i.test(r.cli), false);
    }
    assert.equal(newKeys.size, 58);
    assert.equal(newWords.size, 58);
  });

  it('FX-81-5 覆盖修复：wizard 降级词失去的唯一入口由 1 条单命令入口承接（101 键不放宽，#113 +8／#86 +4／#179 +1／#251 +1）', () => {
    assert.equal(COVERAGE_REPAIR_ROUTES.length, 1);
    // 修复入口的键＝「降级后失去唯一可跑入口」的键（从冻结表 ＋ 路由层派生，非手写清单）。
    // #180 重导：补偿表清空后取值只由冻结命令字段派生（原第二条来源 `HELP_EXEC_OVERRIDES` 已删）。
    // #252 重导：原先这份清单由 `WIZARD_WORDS` 的冻结命令派生——目标管理 3 条「自动算」词转 exec 后
    // 该派生结果变空，而 `calorie.view.goal-recommend` 仍需要一条可执行入口。判据改为**本义**：
    // 「除修复入口外没有任何可执行路由的键」。仍具鉴别力——漏一条修复入口则本集合变大；
    // 给已有可执行路由的键多插一条修复入口则两边不等。
    const repairSet = new Set(COVERAGE_REPAIR_ROUTES);
    const orphaned = KEY_LIST.filter(
      (key) => !ALL_ROUTES.some((r) => r.kind === 'exec' && r.key === key && !repairSet.has(r)),
    ).sort();
    assert.deepEqual(COVERAGE_REPAIR_ROUTES.map((r) => r.key).sort(), orphaned);
    assert.deepEqual(orphaned, ['calorie.view.goal-recommend']);
    const existingWords = new Set(TRIGGERS.map((t) => t.wake_word));
    const newWords = new Set(NEW_KEY_ROUTES.map((r) => r.wakeWord));
    for (const r of COVERAGE_REPAIR_ROUTES) {
      assert.deepEqual(Object.keys(r).sort(), [...EXEC_FIELDS].sort(), r.wakeWord);
      assert.equal(r.kind, 'exec');
      assert.ok(KEY_LIST.includes(r.key), r.key);
      assert.equal(existingWords.has(r.wakeWord), false, `覆盖修复唤醒词撞冻结表：${r.wakeWord}`);
      assert.equal(newWords.has(r.wakeWord), false, `覆盖修复唤醒词撞新拟词：${r.wakeWord}`);
      assert.match(r.cli, /^calorie-cmd-read calorie\./);
      assert.equal(/python/i.test(r.cli), false);
      assert.equal(EXEC_ROUTE_BY_KEY[r.key], r, `${r.key} 的唯一可跑入口应为修复入口`);
    }
  });

  it('FX-81-5 不变量：exec ⟺ 实跑 exit 0（快照逐条 0 ＋ 已登记的数据依赖失败单列 ＋ 需参数键必须带 --params）', () => {
    const md = readFileSync(SMOKE_MD, 'utf8');
    const execAll = allExec();
    assert.equal(execAll.length, 404, 'exec 桶记录数（#113 +12：促进 4＋新拟 8；#86 +4：wizard 4 键新拟；#179 +1：档案预检页；#251 +1：目标预检页；#252 +3：目标管理 3 条自动算词由 non-exec 转入 exec；#346 +1：看今天练什么转入 exec）');
    // ① 快照汇总：非零只许是**已登记的数据依赖失败**（用户 2026-09-11 裁定取甲：把「命令坏了」与
    // 「数据依赖的失败」分开统计；判据是快照自己 :7-9 写的「数据依赖失败（空库 exit 4）不算 cli 缺陷」，
    // 改断言＝把断言对齐判据）。
    const zero = /^\| \*\*非零（失败）\*\* \| (\d+) \|$/m.exec(md);
    assert.ok(zero, 'smoke 快照缺「非零」汇总行');
    // 登记册（只许登记、不许扩；每条都要求 exit 码 ＋ key ＋ envelope 空 ＋ cli 逐字四项同时成立）：
    //   `复制昨日运动`（key `calorie.exercise.add`）：标准种子库「昨日无运动记录可复制」→ exit 4、
    //   envelope `—`。出处 `docs/research/t81-exec-smoke.md:147`／`:541`。
    //   `计划复盘（本周）`（key `calorie.view.exercise-review`）：#250 起「本周」＝本周一..今日（自然周），
    //   种子库的数据日是周一 ⇒ 窗只 1 天；那天没有计划会话 ⇒ exit 4、envelope `—`。
    //   这是**数据依赖**失败（词与窗口都对：真用户的计划周一有会话就跑得通），故登记而不改判。
    const DATA_DEPENDENT_FAILURES = new Map([
      ['复制昨日运动', { exit: '4', key: 'calorie.exercise.add' }],
      ['计划复盘（本周）', { exit: '4', key: 'calorie.view.exercise-review' }],
    ]);
    // ② 快照逐条：exit 全 0（登记项除外）＋ envelope key 与路由 key 一致（登记项除外）＋ 条数与路由层一致。
    const rows1 = smokeSection(md, '## 1. ');
    assert.equal(rows1.length, execAll.length, 'smoke 快照 exec 条数与路由层不一致（快照未重生成？）');
    let nonzero = 0;
    for (let i = 0; i < rows1.length; i += 1) {
      const c = rows1[i];
      assert.equal(c.length, 9, `smoke §1 列数异常：${c.join(' | ')}`);
      const reg = DATA_DEPENDENT_FAILURES.get(c[3]);
      if (c[6] !== '0') {
        nonzero += 1;
        assert.ok(reg, `${c[3]} exit 应为 0，或落在已登记的数据依赖失败里（实测 ${c[6]}）`);
        assert.equal(c[6], reg.exit, `${c[3]} 登记的 exit 码不符`);
        assert.equal(unquote(c[4]), reg.key, `${c[3]} 登记的 key 不符`);
        assert.equal(unquote(c[7]), '—', `${c[3]} 数据依赖失败不得带 envelope key（实测 ${unquote(c[7])}）`);
      } else if (!reg) {
        assert.equal(unquote(c[7]), unquote(c[4]), `${c[3]} envelope key 应与路由 key 一致`);
      }
      // ③ 快照 §1 的 cli 列必须与路由层逐条逐字一致（FX-81-6 低危：防「改了 exec cli 忘了重生成快照」）。
      //    本条对登记项同样成立——放宽的只有 exit／envelope 两列，cli 逐字一格都没松。
      assert.equal(unquote(c[8]), execAll[i].cli, `${c[3]} smoke §1 cli 与路由层不一致（快照未重生成？）`);
    }
    // 汇总行与逐条实测必须自洽（防「改了汇总忘了明细」这类单侧放宽）。
    assert.equal(nonzero, Number(zero[1]), `快照汇总「非零」${zero[1]} 与逐条实测 ${nonzero} 不一致`);
    // ④ 结构性断言：无参不可跑的键 ⇒ exec cli 必须给 --params（防「抄无参示例」整类缺陷）。
    const rows3 = smokeSection(md, '## 3. ');
    assert.equal(rows3.length, new Set(execAll.map((r) => r.key)).size, '裸跑键数与 exec 键数不一致');
    const bareFailKeys = new Set(rows3.filter((c) => c[1] !== '0').map((c) => unquote(c[0])));
    assert.ok(bareFailKeys.size > 0, '裸跑探针应存在需参数的键');
    let checked = 0;
    for (const r of execAll) {
      if (!bareFailKeys.has(r.key)) continue;
      assert.match(r.cli, / --params '\{/, `${r.wakeWord}（${r.key}）无参不可跑，cli 必须带 --params`);
      const json = r.cli.slice(r.cli.indexOf("--params '") + 10);
      const params = JSON.parse(json.slice(0, json.lastIndexOf("'")));
      assert.ok(params && typeof params === 'object' && !Array.isArray(params), `${r.wakeWord} --params 须为 JSON 对象`);
      assert.ok(Object.keys(params).length > 0, `${r.wakeWord} --params 不得为空对象`);
      checked += 1;
    }
    // #112 校准：112 为 #81 旧值；#111 regen 后实为 106（6 条记录的键转为裸跑可跑，
    // 被 R17 零检掩盖而未察觉）。#250 把「今天」钉到种子数据日（`CALORIE_TODAY`）后重跑裸探针，
    // 实测仍是 **106**——本行原写 107 是 R17 零检掩盖下的旧值，本票按实测真值收正。
    // 翻面 1 条已核：`calorie.diet.copy` 裸跑由「失败」转为「可跑」（裸跑取「昨日」＝种子写的 09-06 有数据；
    // 钉钟前按机器当天取窗，落在种子数据外）。明细见 `docs/skills/skill-calorie/t250-*`。
    assert.equal(checked, 106, '需参数键的 exec 记录数（结构性断言覆盖面）');
  });

  it('A7 明确不做桶按架构规格 :60 建立，t71 差异逐条登记（两处出处）', () => {
    assert.equal(OUT_OF_SCOPE_ROUTES.length, 10);
    const oos = new Set(OUT_OF_SCOPE_ROUTES.map((r) => r.wakeWord));
    for (const r of OUT_OF_SCOPE_ROUTES) {
      assert.equal(r.kind, 'non-exec');
      assert.equal(r.bucket, 'out-of-scope');
      assert.match(r.reason, /docs\/calorie-architecture\.md:60/);
    }
    assert.deepEqual([...oos].sort(), [
      '关闭定时复盘',
      '开启定时复盘',
      '同步到训记',
      '拍营养表记一餐',
      '拍营养表补记一餐',
      '拉训记实绩',
      '查定时复盘',
      '落地到本月底',
      '落地到本周末',
      '落地训练',
    ].sort());
    assert.deepEqual(
      T71_DIFFS.map((d) => d.id),
      ['O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'M8'],
    );
    const registered = new Set(T71_DIFFS.flatMap((d) => d.wakeWords));
    assert.deepEqual([...registered].sort(), [...oos].sort());
    for (const d of T71_DIFFS) {
      assert.match(d.spec, /calorie-architecture\.md/);
      assert.match(d.t71, /t71-old-baseline-inventory\.md:\d+/);
    }
    const m8 = T71_DIFFS.find((d) => d.id === 'M8');
    assert.deepEqual(m8.wakeWords, ['落地训练', '落地到本周末', '落地到本月底']);
    assert.match(m8.note, /需移植/);
    const o2 = T71_DIFFS.find((d) => d.id === 'O2');
    assert.deepEqual(o2.wakeWords, []);
  });
});
