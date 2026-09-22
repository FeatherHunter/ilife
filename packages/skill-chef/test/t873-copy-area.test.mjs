/** #873 · 复制区三格式菜单的守门测试（改坏必红）。
 *
 * 判什么：
 * ① 共用件 `chefCopyArea` 出的是「复制数据 ＋ 纯文本／JSON／CSV 三选一菜单」
 *    （`ilife-copy-menu-wrap` ＋ 三项 `data-fmt`），不是单按钮；
 * ② 上面 10 个文件的 18 处调用全部经新 helper 出菜单（每域至少一页真渲染断言）；
 * ③ 把任意一处改回 `dataText`，本件必红（源码面 grep 断言）；
 * ④ 页面运行时的菜单委派在位（产物里含 `buildSharedHelpersJs` 的菜单委派串）。
 *
 * 不判什么：三格式文本的具体行文（那是 `buildDataText` 的契约，公共层测试守）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSharedHelpersJs } from 'base-paint';
import { chefCopyArea, chefCopyLog } from '../dist/render/copyArea.js';
import { buildAddSuccessHtml } from '../dist/add/pages.js';
import { renderCookingPage } from '../dist/cook/run.js';
import { dataBackupPage, dataBatchPage } from '../dist/data/pages.js';
import { renderGlobalStatsPage, renderRecordPage, renderSingleStatsPage, renderTimelinePage } from '../dist/history/pages.js';
import { relationAddPage, relationDerivePage } from '../dist/relation/pages.js';
import { setupInitPage } from '../dist/setup/pages.js';
import { shoppingListPage } from '../dist/shopping/pages.js';
import { buildViewHtml } from '../dist/view/page.js';

const PKG = resolve(import.meta.dirname, '..');
const ROOT = resolve(PKG, '..', '..');
/** 三格式菜单的机器标记（出处：`base-render/src/controls.ts` 的 `copyMenuHtml`）。 */
const MENU_MARKERS = ['ilife-copy-menu-wrap', 'data-fmt-open="1"', 'data-fmt="text"', 'data-fmt="json"', 'data-fmt="csv"'];
/** 开合器的无障碍名（`▾` 不上屏，语义住 `aria-label`，见 `COPY_MENU_OPENER_ARIA`）。 */
const OPENER_LABEL = 'aria-label="复制数据（点开选格式）"';

function assertMenu(html, where) {
  for (const m of MENU_MARKERS) assert.ok(html.includes(m), where + ' 缺菜单标记：' + m);
  assert.ok(html.includes(OPENER_LABEL), where + ' 缺开合器语义：' + OPENER_LABEL);
}

describe('chefCopyArea 恒出三格式菜单', () => {
  it('detail 形：菜单三项齐，空串 hints 不出提示行', () => {
    const html = chefCopyArea({
      title: '复制这份菜谱',
      data: { key: 'chef.recipe.view', shape: 'detail', item: { 菜名: '辣椒炒肉', 食材数: 11, 步骤数: 6 } },
    });
    assertMenu(html, 'detail');
    assert.ok(!html.includes('ilife-copy-menu-hint'), '三空串 hints 不应渲染提示行');
  });

  it('receipt 形 ＋ 日志位：两颗位齐，日志六段标题在', () => {
    const html = chefCopyArea({
      title: '复制区',
      data: { key: 'chef.recipe.write', shape: 'receipt', ok: true, message: '辣椒炒肉已写进菜谱。' },
      log: { command: 'chef.recipe.write', m5Line: '菜谱 1 行', actionAt: '2026-09-22' },
    });
    assertMenu(html, 'receipt+log');
    for (const t of ['场景标识', 'AI 思考链', '数据结构', '调用链', '时间戳版本', '异常']) {
      assert.ok(html.includes(t), '日志缺段：' + t);
    }
  });

  it('与按钮同名的标题不出（只留动作不留说明文本）', () => {
    const html = chefCopyArea({
      title: '复制数据',
      data: { key: 'chef.recipe.view', shape: 'detail', item: { 菜名: '辣椒炒肉' } },
    });
    assertMenu(html, '同名标题');
    assert.ok(!html.includes('ilife-block-copy-block-title'), '同名标题不应出 <h2>');
  });

  it('两样全不给＝一句空态、不出按钮', () => {
    const html = chefCopyArea({});
    assert.ok(html.includes('本页没有可复制的数据'), '空态缺省句');
    assert.ok(!html.includes('ilife-copy-menu-wrap'), '空态不应出菜单');
  });
});

describe('chefCopyLog 六段入参', () => {
  it('字段映射与缺省口径（来源缺省即只剩库名）', () => {
    assert.deepEqual(
      chefCopyLog({ command: 'chef.recipe.write', source: '图片转结构化', m5Line: '菜谱 1 行', actionAt: '2026-09-22', version: '0.3.2' }),
      {
        thinking: '本页由本地命令渲染，无 AI 链',
        dataStructure: 'chef_data.db ｜ 图片转结构化',
        callChain: 'chef.recipe.write ｜ 菜谱 1 行',
        timestamp: '2026-09-22 · 版本 0.3.2',
        exception: '无',
      },
    );
    assert.equal(chefCopyLog({ command: 'chef.recipe.write' }).dataStructure, 'chef_data.db');
  });
});

describe('八域装配件逐页出菜单（真渲染）', () => {
  it('录入回执', () => {
    assertMenu(buildAddSuccessHtml({
      cardId: 'c1', wakeWord: '录入食谱', sourceLabel: '手工', caliberNote: '',
      recipeName: '辣椒炒肉', recipeId: 'r1', servings: 2, totalTime: 20,
      ingredients: [{ name: '猪里脊', quantity: 400, unit: '克', quantity_text: '', category: '肉' }],
      steps: [{ sequence: 1, action: '爆炒', duration_minutes: 5, heat_level: '大火' }],
    }), '录入回执');
  });

  it('做菜模式', () => {
    assertMenu(renderCookingPage({
      recipe: { id: 'r1', name: '辣椒炒肉', description: '', difficulty: '快手菜', servings: 2, total_time_minutes: 20, status: '已做' },
      baseServings: 2, servings: 2, factor: 1,
      ingredients: [{ name: '猪里脊', quantity: 400, unit: '克', quantity_text: '', optional: false }],
      steps: [{ sequence: 1, action: '爆炒', duration_minutes: 5, heat_level: '大火', temperature: '', expected_result: '', ingredients: [] }],
      cookware: [], count: 1, avgRating: 4, lastHistory: null,
    }, { kind: 'fresh' }), '做菜模式');
  });

  it('批量改 ＋ 备份', () => {
    assertMenu(dataBatchPage({ name: '辣椒炒肉', diffs: [{ field: '份量', before: '2 人份', after: '4 人份' }] }), '批量改');
    assertMenu(dataBackupPage({ recipeCount: 3, tableCount: 9, bytes: 1024 }), '备份');
  });

  it('历史四页', () => {
    assertMenu(renderRecordPage({
      name: '辣椒炒肉', cookDate: '2026-09-22', cookSequence: 2, rating: 4, feedback: '很香',
      historyId: 'h1', prevStatus: '未做', newStatus: '已做', prevCount: 1, newCount: 2, avgRating: 4,
    }), '记录做菜');
    assertMenu(renderTimelinePage({
      name: '辣椒炒肉', status: '已做', count: 1, avgRating: 4,
      rows: [{ cookDate: '2026-09-22', cookSequence: 1, rating: 4, feedback: '很香' }],
    }), '时间线');
    assertMenu(renderSingleStatsPage({
      name: '辣椒炒肉', status: '已做', count: 1, avgRating: 4, maxRating: 4, minRating: 4, lastDate: '2026-09-22',
    }), '单菜统计');
    assertMenu(renderGlobalStatsPage({
      cookedCount: 1, neverCookedCount: 0, totalCooks: 2, recipeTotal: 1,
      favoriteAvg: { name: '辣椒炒肉', avgRating: 4, times: 2 },
      favoriteMost: { name: '辣椒炒肉', times: 2, avgRating: 4 },
      recent: [{ name: '辣椒炒肉', lastDate: '2026-09-22', avgRating: 4 }],
      neverCooked: [],
      perRecipe: [{ id: 'r1', name: '辣椒炒肉', count: 2, avgRating: 4 }],
    }), '全局统计');
  });

  it('派生两页', () => {
    assertMenu(relationAddPage({ parent: '辣椒炒肉', child: '小炒肉', relationType: '同类', changeSummary: '少放盐' }), '记派生关系');
    assertMenu(relationDerivePage({ parent: '辣椒炒肉', child: '小炒肉', differences: '少放盐' }), '派生新菜');
  });

  it('开始使用 ＋ 采购 ＋ 查看', () => {
    assertMenu(setupInitPage({ tables: 9, initialized: true }), '开始使用');
    assertMenu(shoppingListPage({
      recipes: ['辣椒炒肉'],
      items: [{ name: '猪里脊', quantity: 400, unit: '克', recipes: ['辣椒炒肉'], quantity_text: '', from: '辣椒炒肉', optional: false, category: '肉' }],
      servingsText: '2 人份', excludeOptional: false, stockSkipped: true,
    }), '采购');
    assertMenu(buildViewHtml('view_full_recipe', {
      name: '辣椒炒肉', difficulty: '快手菜', servings: 2, total_time_minutes: 20, status: '已做',
      description: '', source: '', source_url: '', created_at: '', updated_at: '',
      ingredients: [{ name: '猪里脊', quantity: 400, unit: '克', quantity_text: '', category: '肉' }],
      steps: [{ sequence: 1, action: '爆炒', duration_minutes: 5, heat_level: '大火', temperature: '', expected_result: '' }],
      history: { count: 1, avgRating: 4 }, history_timeline: [],
      nutrition: { estimated: false }, background: null, badges: {},
    }), '查看');
  });
});

describe('源码面：十处无 dataText（改回即红）', () => {
  /** 白名单 10 路径中仍可出现 `dataText` 的唯一例外：录入失败页走 `renderErrorReceipt`
   * （公共层错误回执无三格式位，动它须改 `base-render`，不在本票范围）。 */
  const FILES = [
    'packages/skill-chef/src/add/pages.ts',
    'packages/skill-chef/src/cook/run.ts',
    'packages/skill-chef/src/data/pages.ts',
    'packages/skill-chef/src/history/pages.ts',
    'packages/skill-chef/src/relation/pages.ts',
    'packages/skill-chef/src/setup/pages.ts',
    'packages/skill-chef/src/shopping/pages.ts',
    'packages/skill-chef/src/view/page.ts',
    'docs/skills/skill-chef/t771-run-search.mjs',
    'docs/skills/skill-chef/t774-run-update.mjs',
  ];
  for (const f of FILES) {
    it(f + ' 无单按钮残留', () => {
      let text = readFileSync(resolve(ROOT, f), 'utf8');
      if (f.endsWith('src/add/pages.ts')) {
        assert.ok(text.includes('renderErrorReceipt({ message: input.reason, dataText: input.payloadText, logText: input.logText })'),
          '录入失败页的错误回执调用须原样保留');
        text = text.split('renderErrorReceipt({ message: input.reason, dataText: input.payloadText, logText: input.logText })').join('');
      }
      assert.ok(!text.includes('dataText'), f + ' 仍有 dataText（单按钮残留，须经新 helper 走 dataFormats）');
      assert.ok(!text.includes('renderCopyBlock('), f + ' 仍在直调 renderCopyBlock（须经新 helper）');
    });
  }
});

describe('菜单委派在位（点击逻辑有载体）', () => {
  it('产物里的委派串与公共层同源', () => {
    const probe = 'copy-menu-open';
    assert.ok(buildSharedHelpersJs().includes(probe), '公共层 helpers 须含菜单委派');
    assert.ok(setupInitPage({ tables: 9, initialized: true }).includes(probe), '私家大厨产物须注入该委派');
  });
});
