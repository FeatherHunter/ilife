/** #422 · 卡路里场景 04 运动「老新融合共用件」判据（技能层六件）。
 *
 * 判据分四组（每组的机器读数以 `RESULT ` 行落到 stdout，供证据件逐行对账）：
 *   ① 六件各自可单独调起：直接 import 产物并断言类名与关键文本；
 *   ② 单源可判：四类色的**色表绑定**与四态**标签表**，各只在一个文件里定义（命中文件数＝1）；
 *   ③ 概念读数（防第二份定义）：「结论条」「徽章」「空态」三概念各一条命中面读数；
 *   ④ 文案边界：共用件本身不含跨域默认文案（缺文案即报错，不回退到默认句）。
 *
 * 变异自证两行（本票跑的机器读数写进 `docs/skills/skill-calorie/t422-融合共用件.md`）：
 *   - 把四态标签表里 `delete` 的中文改坏 → 本测试变红；改回 → 全绿；
 *   - 把类别色表删一类 → 本测试变红；改回 → 全绿。
 *
 * 运行：先 `pnpm build`（产物在 `packages/skill-calorie/dist/`），再
 * `node --test packages/skill-calorie/test/fusion-shared-422.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { OPERATION_ICONS, OPERATION_LABELS, OPERATION_TONES, operationHead } from '../dist/shared/operationHead.js';
import { fieldLabel, registerFieldLabels } from '../dist/shared/fieldLabel.js';
import { sourceLine } from '../dist/shared/sourceLine.js';
import { emptyGuide } from '../dist/shared/emptyGuide.js';
import { EXERCISE_CATEGORY_COLORS, categoryColor } from '../dist/exercise/categoryColors.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const PACKAGES = join(PKG, '..');
const SKILL_SRC = join(PKG, 'src');
const BASE_SRC = join(PACKAGES, 'base-render', 'src');

/** 本票自己交付的五件（相对 `packages/`）：断言只钉在这几件上，
 *  免得别席在途件（同一棵树里同时改别的目录）把本票判据带红——那是归因问题，不是本票缺陷。
 *  （第六件 `shared/conclusionLine.ts` 已在 #708 撤件——产出与公共层 `renderConclusionBar` 逐字节相同。） */
const MY_PATHS = [
  'skill-calorie/src/shared/operationHead.ts',
  'skill-calorie/src/shared/fieldLabel.ts',
  'skill-calorie/src/shared/sourceLine.ts',
  'skill-calorie/src/shared/emptyGuide.ts',
  'skill-calorie/src/exercise/categoryColors.ts',
];

/** 公共层空态构件的**闭集**：定义地只许落在 `packages/base-render/src/**` 内，且逐个具名登记。
 *  登记项＝当刻真实存在的定义地（实测两处，见证据件 §十）；此后多冒出第四处、
 *  或任何一处落在公共层之外（技能层／别家包）——判据即红。
 *  新增定义地必须在这里补一行并写明理由与来源票号，不许悄悄放过。 */
const EMPTY_DEF_ALLOWLIST = [
  { path: 'base-render/src/blocks.ts', why: '区块包装 renderEmptyBlock 的唯一定义地', from: '#104（B1 区块落盘：12 区块 blocks 子路径）' },
  { path: 'base-render/src/controls.ts', why: '控件产出器 renderEmptyState 的唯一定义地', from: '#76（公共层控件层：状态三控件）' },
];

/** 递归列源码树（排除 node_modules／dist／隐藏目录），只收文本类文件。 */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(ts|mjs|js|html|json)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** 全仓**源码树**（`packages/<件>/src/**`）：单源判据的检索面。
 *  不含 test（判据自己按构造就带这些字面量）、dist（产物）、node_modules；
 *  `docs/` 侧的老盘点与两张样张是记录件、不是定义地（票面「不许动」），另在证据件里单列读数。 */
function walkSources() {
  const out = [];
  for (const entry of readdirSync(PACKAGES, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    walk(join(PACKAGES, entry.name, 'src'), out);
  }
  return out;
}

/** 按正则筛文件，返回包内相对路径（排序稳定，便于逐行对账）。 */
function filesMatching(files, pattern) {
  return files
    .filter((f) => pattern.test(readFileSync(f, 'utf8')))
    .map((f) => relative(PACKAGES, f).split('\\').join('/'))
    .sort();
}

function result(name, value, files) {
  console.log('RESULT ' + name + '=' + value + (files === undefined ? '' : ' files=' + files.join(',')));
}

/* ── ① 六件各自可单独调起 ─────────────────────────────────────────────── */

test('四态头：三张表只在一处定义 ＋ 操作卡头部（图标＋状标签＋标题＋记录号＋时刻行）', () => {
  assert.deepEqual(Object.keys(OPERATION_LABELS).sort(), ['add', 'create', 'delete', 'update']);
  assert.equal(OPERATION_LABELS.update, '修改');
  assert.equal(OPERATION_LABELS.delete, '删除');
  assert.deepEqual(OPERATION_TONES, { create: 'ok', add: 'ok', update: 'warn', delete: 'danger' });
  assert.deepEqual(OPERATION_ICONS, { create: '✓', add: '✓', update: '✎', delete: '✕' });

  const update = operationHead({
    op: 'update', title: '改运动记录', recordId: 12,
    actionAt: '2026-09-14 18:57:46', source: 'exercise_log (写库回执)',
  });
  assert.ok(update.includes('ilife-block-op-head'), '缺操作卡头部类名：' + update);
  assert.ok(update.includes('ilife-block-op-head-warn'), '缺色档类名（update＝warn）：' + update);
  assert.ok(update.includes('ilife-status-badge-warn'), '缺公共层色档徽章（语义色只引用公共层）：' + update);
  assert.ok(update.includes('✎'), '缺图标 ✎');
  assert.ok(update.includes('修改'), '缺状标签 修改');
  assert.ok(update.includes('改运动记录'), '缺调用方给的标题');
  assert.ok(update.includes('记录号 #12'), '缺记录号行：' + update);
  assert.ok(update.includes('2026-09-14 18:57:46'), '缺时刻行');
  assert.ok(update.includes('exercise_log (写库回执)'), '缺时刻行里的来源句（调用方给）');

  const del = operationHead({ op: 'delete', title: '删运动记录', recordId: null, actionAt: '2026-09-14 19:00:00' });
  assert.ok(del.includes('ilife-block-op-head-danger') && del.includes('✕') && del.includes('删除'));
  assert.ok(del.includes('记录号 未设置'), '记录号缺省写「未设置」：' + del);
  assert.ok(!del.includes('undefined'), '不给来源时不许漏出 undefined');

  const create = operationHead({ op: 'create', title: '记运动', recordId: 3, actionAt: '2026-09-14 20:00:00' });
  assert.ok(create.includes('ilife-block-op-head-ok') && create.includes('✓') && create.includes('新增'));

  // 文案边界：标题与时刻行缺一即报错，本件不给跨域默认标题／默认来源。
  assert.throws(() => operationHead({ op: 'update', title: '', recordId: 1, actionAt: 'x' }), '空标题须报错');
  assert.throws(() => operationHead({ op: 'update', title: '改', recordId: 1, actionAt: '' }), '空时刻须报错');

  // 表外 op 回退：标签回原 op 字串、色档 empty、图标占位（老实物 `|| op` 那一手）。
  const weird = operationHead({ op: 'restore', title: '恢复', recordId: 1, actionAt: '2026-09-14 20:00:00' });
  assert.ok(weird.includes('ilife-block-op-head-empty') && weird.includes('restore'), '表外 op 回退不对：' + weird);
});

test('字段标签查表：按域查表、缺项回退原键名（不是英文标签）', () => {
  registerFieldLabels('t422-fixture', { duration_minutes: '时长' });
  assert.equal(fieldLabel('t422-fixture', 'duration_minutes'), '时长');
  assert.equal(fieldLabel('t422-fixture', 'no_such_key'), 'no_such_key', '缺项回退原键名');
  assert.equal(fieldLabel('unregistered-domain', 'duration_minutes'), 'duration_minutes', '未登记域回退原键名');
  assert.equal(fieldLabel('t422-fixture', ''), '', '空键回退空字串（不编字）');
  assert.throws(() => registerFieldLabels('t422-fixture', { a: '甲' }), '同域二次登记须报错（域表一个定义地）');
  assert.throws(() => registerFieldLabels('t422-fixture-2', {}), '空表须报错');
});

test('来源脚注：读页与回执页共用的一句「数据来源 · 起 → 止 · 共 N 条」', () => {
  const withSource = sourceLine({ source: 'exercise_log', start: '2026-09-08', end: '2026-09-14', count: 6 });
  assert.ok(withSource.includes('ilife-block-caliber'), '走公共层口径行类名：' + withSource);
  assert.ok(
    withSource.includes('数据来源 · exercise_log · 2026-09-08 → 2026-09-14 · 共 6 条'),
    '来源脚注文本不对：' + withSource,
  );
  const noSource = sourceLine({ source: '', start: '2026-09-08', end: '2026-09-14', count: 0 });
  assert.ok(noSource.includes('数据来源 · 2026-09-08 → 2026-09-14 · 共 0 条'), '缺来源时不出空段：' + noSource);
  assert.throws(() => sourceLine({ source: 'x', start: '', end: 'y', count: 1 }), '缺起止即报错，不编默认值');
});

test('空态指引：图标＋原因＋下一句能说的话，文案由调用方给', () => {
  const html = emptyGuide({
    icon: '🏋️', text: '暂无力量训练记录', hint: '说「记力量训练」记下第一条',
  });
  assert.ok(html.includes('ilife-block-empty-block'), '走公共层空态区块：' + html);
  assert.ok(html.includes('ilife-empty-icon') && html.includes('ilife-empty-text') && html.includes('ilife-empty-hint'));
  assert.ok(html.includes('🏋️') && html.includes('暂无力量训练记录'));
  assert.ok(html.includes('说「记力量训练」记下第一条'));
  assert.throws(() => emptyGuide({ icon: '🏋️', text: '', hint: 'x' }), '缺原因句须报错');
  assert.throws(() => emptyGuide({ icon: '🏋️', text: 'x', hint: '' }), '缺下一句须报错');
  assert.throws(() => emptyGuide({ icon: '', text: 'x', hint: 'y' }), '缺图标须报错');
});

test('运动类别色：strength／cardio／flex／daily 四类只有这一处表，取色走访问器', () => {
  assert.deepEqual(EXERCISE_CATEGORY_COLORS, {
    strength: '#5856d6', cardio: '#0071e3', flex: '#34c759', daily: '#ff9500',
  });
  assert.equal(categoryColor('strength'), '#5856d6');
  assert.equal(categoryColor('cardio'), '#0071e3');
  assert.equal(categoryColor('flex'), '#34c759');
  assert.equal(categoryColor('daily'), '#ff9500');
  assert.equal(categoryColor('no_such_category'), undefined, '表外类别不出色（不编缺省色）');
});

/* ── ② 单源可判（命中文件数＝1） ───────────────────────────────────────── */

test('单源：四类色的色表绑定全仓只在一处', () => {
  const all = walkSources();
  const bindings = [
    /\bstrength\s*:\s*'#5856d6'/,
    /\bcardio\s*:\s*'#0071e3'/,
    /\bflex\s*:\s*'#34c759'/,
    /\bdaily\s*:\s*'#ff9500'/,
  ];
  const hits = filesMatching(all, new RegExp(bindings.map((r) => r.source).join('|')));
  result('单源-类别色-表形绑定命中文件数', hits.length, hits);
  assert.deepEqual(
    hits,
    ['skill-calorie/src/exercise/categoryColors.ts'],
    '类别色表须只在一处（命中 ' + hits.join('、') + '）',
  );

  // 补充读数：四值同现于一个文件的件数（整份色表的另一种量法）与裸值命中面（含公共层 token／图表缺省色）。
  const four = all.filter((f) => {
    const text = readFileSync(f, 'utf8');
    return ['#5856d6', '#0071e3', '#34c759', '#ff9500'].every((hex) => text.includes(hex));
  }).map((f) => relative(PACKAGES, f).split('\\').join('/')).sort();
  result('单源-类别色-四值同现文件数', four.length, four);
  assert.deepEqual(four, ['skill-calorie/src/exercise/categoryColors.ts'], '整份四值色表须只在一处');

  const loose = filesMatching(all, /#5856d6|#0071e3|#34c759|#ff9500/);
  result('读数-四类色-裸值命中文件数（含公共层 token／图表缺省色／禁色表）', loose.length, loose);
  for (const must of ['skill-calorie/src/exercise/categoryColors.ts']) {
    assert.ok(loose.includes(must), '裸值命中面须含色表本件');
  }
});

test('单源：四态标签表的中文标签同键只在一处', () => {
  const skill = walk(SKILL_SRC);
  const hits = filesMatching(skill, /(?:create|add|update|delete)\s*:\s*'(?:新增|修改|删除)'/);
  result('单源-四态标签表-键值绑定命中文件数', hits.length, hits);
  assert.deepEqual(hits, ['skill-calorie/src/shared/operationHead.ts'], '四态标签表须只在一处');

  const iconHits = filesMatching(skill, /(?:create|add|update|delete)\s*:\s*'(?:✓|✎|✕)'/);
  result('单源-四态图标表-键值绑定命中文件数', iconHits.length, iconHits);
  assert.deepEqual(iconHits, ['skill-calorie/src/shared/operationHead.ts'], '四态图标表须只在一处');

  const labelHits = filesMatching(skill, /duration_minutes\s*:\s*'时长'/);
  result('单源-运动域字段标签表-命中文件数', labelHits.length, labelHits);
  assert.equal(labelHits.length, 1, '运动域字段标签表当刻只有一处：' + labelHits.join('、'));
});

/* ── ③ 概念读数：结论条／徽章／空态（防第二份定义） ─────────────────────── */

test('概念读数：结论条／徽章／空态各有几条定义地', () => {
  const skill = walk(SKILL_SRC);

  const conclusionHelpers = filesMatching(skill, /(?:function|const)\s+\w*[Cc]onclusion\w*\s*[(=]/);
  result('概念-结论条-结论helper定义文件数', conclusionHelpers.length, conclusionHelpers);
  const conclusionLineDefs = filesMatching(skill, /(?:function|const)\s+conclusionLine\s*[(=]/);
  result('概念-结论条-技能层conclusionLine定义地数', conclusionLineDefs.length, conclusionLineDefs);
  // #708 · 方向调转（门留着，牙口换一面）：技能层那件 `shared/conclusionLine.ts` 已撤件——它的产出与公共层
  // `base-render/src/blocks.ts` 的 `renderConclusionBar` 逐字节相同，留着就是第二份定义。
  // 于是这条门不再钉「技能层那一件」，改钉**技能层零命中 ＋ 正本恰在公共层一处**。
  assert.deepEqual(conclusionLineDefs, [],
    '技能层不许再出现 conclusionLine 的实现（正本是公共层 renderConclusionBar）：' + conclusionLineDefs.join('、'));
  const conclusionBarDefs = filesMatching(walkSources(), /(?:function|const)\s+renderConclusionBar\s*[(=]/);
  result('概念-结论条-结论条正本（renderConclusionBar）定义地', conclusionBarDefs.length, conclusionBarDefs);
  assert.deepEqual(conclusionBarDefs, ['base-render/src/blocks.ts'],
    '结论条的正本必须恰在公共层一处：' + conclusionBarDefs.join('、'));

  const badgeDefs = filesMatching(skill, /(?:function|const)\s+\w*[Bb]adge\w*\s*[(=]/);
  result('概念-徽章-技能层本地badge定义文件数', badgeDefs.length, badgeDefs);
  const badgeTables = filesMatching(skill, /badge\s*:\s*'[^']*回执'/);
  result('概念-徽章-技能层回执徽章文案绑定文件数（photo 域自带的三态徽章 if-链）', badgeTables.length, badgeTables);
  assert.equal(conclusionHelpers.length >= 1, true);

  const emptySelfMade = filesMatching(skill, /class="[^"]*\bempty\b/);
  result('读数-空态-技能层自造空态HTML结构文件数（含他席在途件，只读数不断言）', emptySelfMade.length, emptySelfMade);
  for (const mine of MY_PATHS) {
    const text = readFileSync(join(PACKAGES, mine), 'utf8');
    assert.ok(!/class="[^"]*\bempty\b/.test(text), mine + ' 不许自造空态结构（只许调公共层）');
  }
  const emptyDefsSkill = filesMatching(skill, /(?:function|const)\s+\w*[Ee]mpty\w*\s*[(=]/);
  result('读数-空态-技能层空态同名符号文件数（局部文案／整页空页装配，不是构件）', emptyDefsSkill.length, emptyDefsSkill);
  const emptyCallers = filesMatching(skill, /renderEmptyBlock\s*\(/);
  result('概念-空态-技能层调公共层空态的件数', emptyCallers.length, emptyCallers);
  assert.ok(emptyCallers.includes('skill-calorie/src/shared/emptyGuide.ts'), '空态指引须在调用面里');

  const base = walk(BASE_SRC);
  const emptyDefs = filesMatching(base, /(?:function|const)\s+renderEmpty(?:State|Block)\b/);
  result('概念-空态-公共层构件定义文件数', emptyDefs.length, emptyDefs);

  // 闭集：检索面＝**全源码树**（不只公共层）。多一处红、少一处也红，
  // 跑到公共层之外（技能层／别家包）同样红——都在同一条深比较里判。
  const emptyDefsAll = filesMatching(walkSources(), /(?:function|const)\s+renderEmpty(?:State|Block)\b/);
  result('概念-空态-全源码树构件定义地（闭集比对面）', emptyDefsAll.length, emptyDefsAll);
  assert.deepEqual(
    emptyDefsAll,
    EMPTY_DEF_ALLOWLIST.map((e) => e.path),
    '空态构件的定义地是闭集，只许是已登记的那几处（'
      + EMPTY_DEF_ALLOWLIST.map((e) => e.path + '＝' + e.why + '，来源 ' + e.from).join('；')
      + '）；新增一处先登记，落在公共层之外的直接红',
  );
});
