/** #871 · 48 卡终审缺陷里的**文案与结构**两面（A／C／D／E 四类的产品侧守门）。
 *
 * 为什么另出一件：`t778-终审扫描.mjs` 判的是**盘上的产物**（53 件，跑一次几分钟且要整批重出）；
 * 本件把同一批判据下沉到**页面装配函数**上——改坏一行源码即可红，不必等整批产物。
 * 判据与产物扫描同源（三类字样逐字同表），产物侧仍是最终验收面（票面「验收命令」）。
 *
 * 判什么：
 *  ① 禁用字样（A 类）：工单黑话／存储实现语／数据侧机器标注，一个都不许上屏；
 *  ② 标注剥离（C 类）：库里的机器标注在渲染侧剥掉，别的内容一字不动；
 *  ③ 一份内容只画一遍（D 类）：完整食谱页的食材只在三列数据表里画一次，锚点 `section-ingredients` 唯一；
 *  ④ 读数不孤（E 类）：数据管理两页不出现读数卡网格（390 档两列排奇数格＝孤卡），读数走事实条。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildViewHtml } from '../dist/view/page.js';
import { dataQualityPage, dataBackupPage, dataBatchPage } from '../dist/data/pages.js';
import { buildAddSuccessHtml, buildAddFailureHtml } from '../dist/add/pages.js';
import { setupInitPage } from '../dist/setup/pages.js';
import { relationAddPage } from '../dist/relation/pages.js';
import { renderRecordPage } from '../dist/history/pages.js';
import { renderCookingPage } from '../dist/cook/run.js';

/** 三类禁用字样（与 `docs/skills/skill-chef/t778-终审扫描.mjs` 的 PATTERNS 逐字同表）。 */
const BANNED = [
  { kind: '工单黑话', re: /本票|另立票|立票|域 票|票 \d+|本期(?=[不先只另暂])/ },
  { kind: '实现语', re: /本地菜谱库|副本库|真库/ },
  { kind: '数据标注', re: /AI 补|\(AI[:：]/ },
];
/** 命中项逐条点名（空数组＝干净）；报错时给出命中片段，改坏了能一眼看出是哪一句。 */
function bannedHits(html) {
  return BANNED.filter((b) => b.re.test(html)).map((b) => b.kind + '：' + (html.match(b.re) ?? [''])[0]);
}
/** 可见面＝去掉样式段与脚本段：样式是共享资产，公共层的类名（如读数卡栅格规则）在 `<style>` 里
 *  出现**不算页面上有这件东西**，判「用了哪些区块」必须只看标记面。 */
const markupOf = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
function assertClean(html, what) {
  assert.deepEqual(bannedHits(html), [], what + ' 的页面上出现禁用字样');
}

/* ── 夹具（各装配函数的最小输入；真值来自真库那一道菜的形状） ── */
const INGREDIENTS = [
  { name: '甲料', quantity: 250, unit: 'g', quantity_text: '切甲块', category: '蔬菜', substitute: '', is_optional: 0 },
  { name: '乙料', quantity: 15, unit: 'ml', quantity_text: '半汤匙', category: '调料', substitute: '', is_optional: 0 },
];
const STEPS = [
  { sequence: 1, action: '先下甲料炒香', duration_minutes: 2, heat_level: '中火', temperature: '160 度', expected_result: '香味出来' },
  { sequence: 2, action: '再下乙料同炒', duration_minutes: 3, heat_level: '大火', temperature: '200 度', expected_result: '上色均匀' },
];
/** 背景三段带一条**机器标注**（真库那一条的原文形状），用来判 C 类剥离。 */
const BACKGROUND = {
  origin_story: '湖南小炒肉的代表,湘菜馆必有菜品(AI 补:用户手写本没写,根据常识补)',
  historical_background: '辣椒原产于美洲热带地区,明末传入中国。',
  cultural_significance: '辣椒炒肉是湖南人家家户户必吃的招牌土菜。',
};
function viewItem(over = {}) {
  return {
    name: '测试菜', difficulty: '快手菜', servings: 2, total_time_minutes: 18, status: '已做',
    description: '一道测试菜', source: '测试来源', source_url: '', created_at: '2026-07-22', updated_at: '2026-07-23',
    ingredients: INGREDIENTS, steps: STEPS,
    history: { count: 1, avgRating: 4 },
    history_timeline: [{ cook_date: '2026-07-21', cook_sequence: 1, rating: 4, feedback: '味道正好' }],
    nutrition: { estimated: false },
    background: BACKGROUND,
    badges: { cuisine: ['湘菜'], flavors: ['辣'], seasons: [], meal_types: [], diet_tags: [], cooking_methods: [] },
    ...over,
  };
}
function addSuccess() {
  return buildAddSuccessHtml({
    cardId: 'add_from_conversation', wakeWord: '录入食谱', sourceLabel: '对话录入',
    channelNote: '对话通道：AI 逐轮问清菜名与用料，集齐后再调用录入。',
    recipeName: '测试菜', recipeId: 'r-1', servings: 2, totalTime: 18,
    ingredients: [{ name: '甲料', quantity: 250, unit: 'g', quantity_text: '切甲块', category: '蔬菜' }],
    steps: [{ sequence: 1, action: '先下甲料炒香', duration_minutes: 2, heat_level: '中火' }],
  });
}
function cookingResume() {
  const step = (sequence) => ({
    sequence, action: '第' + sequence + '步动作', duration_minutes: 2, heat_level: '中火',
    temperature: '160 度', expected_result: '香味出来', ingredients: [],
  });
  return renderCookingPage({
    recipe: { id: 'r-1', name: '测试菜', servings: 2, total_time_minutes: 18, status: '已做', difficulty: '快手菜' },
    baseServings: 2, servings: 2, factor: 1, ingredients: INGREDIENTS,
    steps: [step(1), step(2), step(3)], cookware: [], count: 0, avgRating: null, lastHistory: null,
  }, { kind: 'resume', currentStep: 3 });
}

describe('#871 禁用字样不上屏（A 类）', () => {
  const pages = [
    ['查看·完整食谱', () => buildViewHtml('view_full_recipe', viewItem())],
    ['查看·只看背景', () => buildViewHtml('view_background_only', viewItem())],
    ['录入·成功回执', addSuccess],
    ['录入·失败回执', () => buildAddFailureHtml({
      cardId: 'import_validation_failed', wakeWord: '导入食谱', operation: '导入食谱',
      reason: '食材须给数字用量，已拦下。', keyData: '菜名测试菜', nextStep: '补齐后重试',
      missingSummary: '缺失字段已标红。', payloadText: '{}', logText: '校验拒绝 · 未写库',
    })],
    ['修改·批量改回执', () => dataBatchPage({ name: '测试菜', diffs: [{ field: '甲料用量', before: '200g', after: '250g' }] })],
    ['历史·记录做菜回执', () => renderRecordPage({
      name: '测试菜', cookDate: '2026-07-21', cookSequence: 1, rating: 4, feedback: '味道正好',
      historyId: 'h-1', prevStatus: '未做', newStatus: '已做', prevCount: 0, newCount: 1, avgRating: 4,
    })],
    ['派生·记关系回执', () => relationAddPage({ parent: '母菜', child: '子菜', relationType: '变体', changeSummary: '少辣多甜' })],
    ['开始使用·首次使用', () => setupInitPage({ tables: 17, initialized: true })],
    ['做菜·断点续做', cookingResume],
  ];
  for (const [what, build] of pages) {
    it(what + ' 页面无工单黑话／实现语', () => { assertClean(build(), what); });
  }
});

describe('#871 机器标注在渲染侧剥掉（C 类）', () => {
  it('背景段的机器标注括号不上屏，其余正文一字不动', () => {
    const html = buildViewHtml('view_background_only', viewItem());
    assertClean(html, '只看背景');
    assert.ok(!html.includes('用户手写本没写'), '标注正文不该上屏');
    assert.ok(html.includes('湖南小炒肉的代表,湘菜馆必有菜品'), '标注外的原句必须留着');
    assert.ok(html.includes('辣椒原产于美洲热带地区'), '同段其余字段一字不动');
    // 窄口径：只剥机器标注括号，正文里正常的括号原样保留。
    const keep = buildViewHtml('view_background_only', viewItem({
      background: { ...BACKGROUND, origin_story: '本是家常菜（湖南人叫它土菜）(AI 补:机器标注)' },
    }));
    assert.ok(keep.includes('（湖南人叫它土菜）'), '正文自己的括号不许动');
    assert.ok(!keep.includes('机器标注'), '机器标注括号连内容一起剥掉');
  });
});

describe('#871 同一份内容只画一遍（D 类）', () => {
  it('完整食谱页：食材只在三列数据表里画一次，锚点 section-ingredients 唯一', () => {
    const html = buildViewHtml('view_full_recipe', viewItem());
    assert.equal((html.match(/id="section-ingredients"/g) ?? []).length, 1, '同一锚点只能有一处');
    for (const g of INGREDIENTS) {
      const n = html.split(g.quantity_text).length - 1;
      assert.equal(n, 1, '「' + g.name + '」的用量说明在页上出现 ' + n + ' 次（应恰 1 次）');
    }
  });
});

describe('#871 390 断点不孤卡（E 类）', () => {
  it('数据管理体检页：读数走事实条，不出现读数卡网格', () => {
    const html = dataQualityPage({ items: [
      { name: '甲菜', score: 60, ingredients_count: 3, steps_count: 2, tips_count: 0, techniques_count: 1, has_background: false, missing: ['贴士'] },
      { name: '乙菜', score: 0, ingredients_count: 0, steps_count: 0, tips_count: 0, techniques_count: 0, has_background: false, missing: ['食材', '步骤'] },
    ] });
    assertClean(html, '体检页');
    assert.ok(!markupOf(html).includes('block-kpi-card-grid'), '读数卡网格已下线（390 档两列排奇数格＝孤卡）');
    assert.equal((markupOf(html).match(/block-fact-strip-item/g) ?? []).length, 4, '四条读数：菜数／满分／待补／满分线');
  });
  it('数据管理备份回执：同一批读数只留事实条一份', () => {
    const html = dataBackupPage({ recipeCount: 3, tableCount: 17, bytes: 24916 });
    assertClean(html, '备份回执');
    assert.ok(!markupOf(html).includes('block-kpi-card-grid'), '读数卡网格已下线（同一批读数不画两遍）');
    assert.equal((markupOf(html).match(/block-fact-strip-item/g) ?? []).length, 3, '三条读数：菜数／表数／大小');
  });
});
