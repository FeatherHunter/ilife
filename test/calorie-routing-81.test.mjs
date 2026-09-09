import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORY_SCENE, TRIGGERS } from '../packages/skill-calorie/dist/triggers/index.js';
import { CALORIE_COMBOS } from '../packages/skill-calorie/dist/cli/keys.js';
import { HELP_EXEC_OVERRIDES } from '../packages/skill-calorie/dist/triggers/help-lookup.js';
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

// #81 · 路由层断言（D2 ①–⑤）：436 条逐条恰一个桶／零 py／87 键全可达／与冻结表逐条对齐／新增入口不重复。
// #111 追加：可执行 326→336／命中但不执行 110→100（促进 10 词）＋ 新拟 34→40（运动移植 6 键）。
// #112 追加：可执行 336→337／命中但不执行 100→99（促进 1 词：看营养素深度）＋ 新拟 40→44（营养移植 4 键）。
// 冻结面（scene-*.ts、calorie-sot.snapshot.json、两处 legacyCli 断言）本文件不碰、不弱化。

const ROUTING_SRC = new URL('../packages/skill-calorie/src/triggers/routing.ts', import.meta.url);
const SMOKE_MD = new URL('../docs/research/t81-exec-smoke.md', import.meta.url);
const EXEC_FIELDS = ['wakeWord', 'scene', 'kind', 'key', 'cli'];
const NON_EXEC_FIELDS = ['wakeWord', 'scene', 'kind', 'bucket', 'reason'];
const KEY_LIST = Object.keys(CALORIE_COMBOS);
const frozenKeyOf = (t) => ('key' in t && typeof t.key === 'string' ? t.key : null);
const calorieKeyOf = (cli) => String(cli).split(' ')[1];
// FX-81-5／FX-81-7 唯一例外：语义上必须多步交互（先预览／确认再写库，归 #86）的词保留 non-exec。
// 判据见 docs/research/t81-route-evidence.md §2.2；其余「能做的」词一律已入 exec 桶（FX-81-7）。
const WIZARD_WORDS = new Set(['定营养目标(自动算)', '定饮水目标(自动算)', '一键定全套目标', '批量导入食品', '校验批量导入']);
const allExec = () => [...WAKE_ROUTES, ...NEW_KEY_ROUTES, ...COVERAGE_REPAIR_ROUTES].filter((r) => r.kind === 'exec');
/** FX-81-7 家族翻转（同 key 可参数化）＝非直连／非 override／非孪生 的 exec 记录，
 * 外加两条冻结示例形态特殊、由 FX-81-7 单独改写的词（皮褶钳示例缺参数／override 示例窗口不足）。 */
const SPECIAL_FLIP_WORDS = new Set(['记体脂（皮褶钳）', '看目标预测达成']);
const paramFlipRoutes = () => {
  const out = [];
  for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
    const r = WAKE_ROUTES[i];
    if (r.kind !== 'exec') continue;
    if (TWIN_WAKE_WORDS.includes(r.wakeWord)) continue;
    if (SPECIAL_FLIP_WORDS.has(r.wakeWord)) { out.push(r); continue; }
    const t = TRIGGERS[i];
    const cli = t.main_prompt.cli;
    if (cli.startsWith('calorie-cmd-read calorie.')) continue;
    const internal = frozenKeyOf(t);
    if (internal && HELP_EXEC_OVERRIDES[internal]) continue;
    out.push(r);
  }
  return out;
};
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
  it('D2① 436 条逐条恰一个桶（可执行 337 ／ 命中但不执行 99，#112 促进 1 词）', () => {
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
    assert.deepEqual(buckets, { exec: 337, 'non-exec': 99 });
    assert.deepEqual(routingSummary(), {
      total: 436,
      exec: 337,
      nonExec: 99,
      outOfScope: 10,
      legacyChain: 89,
      newEntries: 44,
      repairEntries: 1,
      coveredKeys: 87,
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

  it('D2③ 87 键全部有可执行入口（436 条 ＋ 44 条新拟入口，#112 +4）', () => {
    const covered = new Set(ALL_ROUTES.filter((r) => r.kind === 'exec').map((r) => r.key));
    assert.deepEqual([...covered].sort(), [...KEY_LIST].sort());
    assert.equal(covered.size, 87);
    assert.equal(Object.keys(EXEC_ROUTE_BY_KEY).length, 87);
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
    // `看目标预测达成` 的 HELP_EXEC_OVERRIDES 示例窗口 <14 天（该能力要求 ≥14 天）→ 冻结示例恒 exit 4；
    // FX-81-7 裁定其能力可由单命令达成 → 路由层改用 ≥14 天窗口（cli 不再取该示例）。
    const predictCli = HELP_EXEC_OVERRIDES.goal_view_predict;
    const win = /"start":"(\d{4}-\d{2}-\d{2})","end":"(\d{4}-\d{2}-\d{2})"/.exec(predictCli);
    assert.ok(win, 'goal_view_predict 示例应带 start/end');
    const winDays = (Date.parse(win[2]) - Date.parse(win[1])) / 86400000 + 1;
    assert.ok(winDays < 14, `goal_view_predict 示例窗口 ${winDays} 天应 <14 天`);
    assert.equal(WIZARD_WORDS.size, 5);
    for (let i = 0; i < TRIGGERS.length; i += 1) {
      const t = TRIGGERS[i];
      const r = WAKE_ROUTES[i];
      assert.equal(r.wakeWord, t.wake_word, `#${i}`);
      assert.equal(r.scene, CATEGORY_SCENE[t.category] ?? '??', `#${i} ${t.wake_word}`);
      const cli = t.main_prompt.cli;
      const internal = frozenKeyOf(t);
      if (WIZARD_WORDS.has(t.wake_word)) {
        // FX-81-7：多步交互（wizard）——冻结 cli 含「→ 确认后 …」，非单条命令 → non-exec。
        assert.ok(cli.includes(' → '), `#${i} ${t.wake_word} 非多步交互串`);
        assert.equal(r.kind, 'non-exec', `#${i} ${t.wake_word}`);
        assert.equal(r.reason, NON_EXEC_REASONS.wizard, `#${i} ${t.wake_word}`);
      } else if (cli.startsWith('calorie-cmd-read calorie.') && !cli.includes(' → ') && !SPECIAL_FLIP_WORDS.has(t.wake_word)) {
        // 受控复制（保留项，未放宽）：冻结 cli 本身已是唯一出口形态的直连词，路由层 cli 仍须逐字一致。
        assert.equal(r.kind, 'exec', `#${i} ${t.wake_word}`);
        assert.equal(r.cli, cli, `#${i} ${t.wake_word} 直连 cli 必须与冻结表逐字一致`);
        assert.equal(r.key, calorieKeyOf(cli), `#${i} ${t.wake_word}`);
      } else if (internal && HELP_EXEC_OVERRIDES[internal] && !TWIN_WAKE_WORDS.includes(t.wake_word) && !SPECIAL_FLIP_WORDS.has(t.wake_word)) {
        assert.equal(r.kind, 'exec', `#${i} ${t.wake_word}`);
        assert.equal(r.cli, HELP_EXEC_OVERRIDES[internal], `#${i} ${t.wake_word} 必须取 HELP_EXEC_OVERRIDES`);
        assert.equal(r.key, calorieKeyOf(HELP_EXEC_OVERRIDES[internal]), `#${i} ${t.wake_word}`);
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
    // FX-81-7（同 key 可参数化）：其余非直连／非 override 的冻结词必须入 exec 且 cli 为**单条命令**、
    // 键 token 与 r.key 一致、需参数的键带 --params（逐条映射与实跑见证据表 §2.3／smoke §1）。
    const paramFlips = paramFlipRoutes();
    assert.equal(paramFlips.length, 233, 'FX-81-7 同 key 可参数化翻转条数（#112 +1 促进）');
    for (const r of paramFlips) {
      assert.equal(/ → /.test(r.cli), false, `${r.wakeWord} cli 含多步链`);
      assert.ok(
        r.cli === 'calorie-cmd-read ' + r.key || r.cli.startsWith('calorie-cmd-read ' + r.key + " --params '"),
        `${r.wakeWord} cli 键 token 与 key 不一致：${r.cli}`,
      );
    }
    assert.equal(ROUTES_BY_WAKE_WORD['记身材照'].length, 3);
    assert.equal(
      Object.values(ROUTES_BY_WAKE_WORD).reduce((n, rs) => n + rs.length, 0),
      481,
    );
    for (const w of new Set(WAKE_ROUTES.map((r) => r.wakeWord))) {
      assert.ok(routesFor(w).length >= 1, w);
    }
  });

  it('D2⑤ 新增入口（44 键，#112 +4）与施工前既有入口零重复', () => {
    assert.equal(NEW_KEY_ROUTES.length, 44);
    // 「既有入口」按施工前口径＝冻结表直连 cli ＋ HELP_EXEC_OVERRIDES 命中的键（43 键）。
    // FX-81-2 后 EXEC_ROUTES 含孪生词转 exec 的记录（它们按设计指向新拟键），故不能再用 EXEC_ROUTES 当基线。
    const frozenExecKeys = new Set(
      TRIGGERS.map((t) => {
        const cli = t.main_prompt.cli;
        if (cli.startsWith('calorie-cmd-read calorie.')) return calorieKeyOf(cli);
        const internal = frozenKeyOf(t);
        return internal && HELP_EXEC_OVERRIDES[internal] ? calorieKeyOf(HELP_EXEC_OVERRIDES[internal]) : null;
      }).filter(Boolean),
    );
    assert.equal(frozenExecKeys.size, 43, '施工前既有入口键数');
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
    assert.equal(newKeys.size, 44);
    assert.equal(newWords.size, 44);
  });

  it('FX-81-5 覆盖修复：wizard 降级词失去的唯一入口由 1 条单命令入口承接（87 键不放宽，#112 +4）', () => {
    assert.equal(COVERAGE_REPAIR_ROUTES.length, 1);
    // 修复入口的键＝「降级后失去唯一可跑入口」的键（从冻结表 ＋ 路由层派生，非手写清单）。
    const downgradedKeys = new Set();
    for (const w of WIZARD_WORDS) {
      const t = TRIGGERS.find((x) => x.wake_word === w);
      assert.ok(t, `冻结表无此词：${w}`);
      const cli = t.main_prompt.cli;
      if (cli.startsWith('calorie-cmd-read calorie.')) downgradedKeys.add(calorieKeyOf(cli));
      else {
        const internal = frozenKeyOf(t);
        if (internal && HELP_EXEC_OVERRIDES[internal]) downgradedKeys.add(calorieKeyOf(HELP_EXEC_OVERRIDES[internal]));
      }
    }
    const repairSet = new Set(COVERAGE_REPAIR_ROUTES);
    const orphaned = [...downgradedKeys].filter(
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

  it('FX-81-5 不变量：exec ⟺ 实跑 exit 0（快照逐条 exit 0 ＋ 需参数键必须带 --params）', () => {
    const md = readFileSync(SMOKE_MD, 'utf8');
    const execAll = allExec();
    assert.equal(execAll.length, 382, 'exec 桶记录数（#112 +5：促进 1＋新拟 4）');
    // ① 快照汇总：非零 0。
    const zero = /^\| \*\*非零（失败）\*\* \| (\d+) \|$/m.exec(md);
    assert.ok(zero, 'smoke 快照缺「非零」汇总行');
    assert.equal(Number(zero[1]), 0, 'smoke 快照存在非零记录（exec 桶应全部 exit 0）');
    // ② 快照逐条：exit 全 0 ＋ envelope key 与路由 key 一致 ＋ 条数与路由层一致（防快照过期）。
    const rows1 = smokeSection(md, '## 1. ');
    assert.equal(rows1.length, execAll.length, 'smoke 快照 exec 条数与路由层不一致（快照未重生成？）');
    for (let i = 0; i < rows1.length; i += 1) {
      const c = rows1[i];
      assert.equal(c.length, 9, `smoke §1 列数异常：${c.join(' | ')}`);
      assert.equal(c[6], '0', `${c[3]} exit 应为 0（实测 ${c[6]}）`);
      assert.equal(c[7], unquote(c[4]), `${c[3]} envelope key 应与路由 key 一致`);
      // ③ 快照 §1 的 cli 列必须与路由层逐条逐字一致（FX-81-6 低危：防「改了 exec cli 忘了重生成快照」）。
      assert.equal(unquote(c[8]), execAll[i].cli, `${c[3]} smoke §1 cli 与路由层不一致（快照未重生成？）`);
    }
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
    // 被 R17 零检掩盖而未察觉）。本票 regen 前后均为 106（HEAD md 实测 106→本票 md 106，
    // 本票 5 条增量键全裸跑可跑），故断言取真值 106；待 R17 修复票解零检后本行即生效。
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
