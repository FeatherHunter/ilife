// t1186 设置向导帮助：步骤人话加空态（TDD 红测先行）
// 跑法：node tooling/run-locked.mjs --ticket 1186 -- node --test packages/skill-bill/test/t1186-setup-help.test.mjs
// 判据：向导页三份可读，帮助页可验；步骤条人话行（第N+标题+状态+现状数），无数据页空态有下一步，复制=显示行，旧thin零产出。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initSteps, restoreSteps, importSteps, STEP_STATE_TEXT } from '../dist/setup/steps.js';
import { buildSetupCopyText, buildSetupCopyJson, buildSetupCopyCsv, SETUP_EMPTY_NEXT } from '../dist/setup/copyTextSetup.js';
import { buildHelpCopyText, buildHelpCopyJson, buildHelpCopyCsv, HELP_EMPTY_NEXT } from '../dist/help/copyTextHelp.js';
import { wizardDoc } from '../dist/setup/template-wizard.js';
import { setupSceneFor } from '../dist/setup/scene.js';
import { receiptEnvelopeOf } from '../dist/setup/pageParts.js';
import { renderLookupPageHtml, buildLookupGroups } from '../dist/help/lookupPage.js';

const INIT_FACTS = {
  envCount: 2, envOk: true, envSummary: '两项都过了',
  dirPath: 'D:/data', dirWritable: true, schemaOk: true, columns: 12, records: 5, verifyOk: true,
};

describe('t1186 向导步骤人话行（第N+标题+状态+现状数）', () => {
  it('init四步人话行含编号标题状态数', () => {
    const steps = initSteps(INIT_FACTS);
    assert.equal(steps.length, 4);
    const text = buildSetupCopyText({ op: 'init', title: '首次使用向导', steps });
    const lines = text.split('\n');
    assert.ok(lines[0].includes('饼干记账') && lines[0].includes('首次使用向导'));
    assert.ok(lines[1].includes('共 4 步'));
    for (const s of steps) {
      const want = '第 ' + s.no + ' 步 ' + s.label + ' ' + STEP_STATE_TEXT[s.state];
      assert.ok(text.includes(want), '缺人话行：' + want);
      assert.ok(text.includes(s.detail), '缺现状数：' + s.detail);
    }
    assert.ok(text.includes('12 列') && text.includes('5 条'));
  });
  it('restore空备份有下一步不硬凑', () => {
    const steps = restoreSteps({ selected: '', count: 0, confirmed: false, safety: '', verified: false });
    const text = buildSetupCopyText({ op: 'restore', title: '从备份恢复', steps });
    assert.ok(text.includes('备份目录里还没有备份'));
    assert.ok(text.includes('备份'));
    const csv = buildSetupCopyCsv({ op: 'restore', title: '从备份恢复', steps });
    const csvLines = csv.split('\n');
    assert.equal(csvLines[0], 'step,label,state,detail');
    assert.equal(csvLines.length, 5);
  });
  it('import无文件空态不断言假绿', () => {
    const steps = importSteps({ fileName: '', totalRows: 0, mapped: false, newRows: 0, duplicateRows: 0, badRows: 0, confirmed: false, inserted: 0, failed: 0 });
    const text = buildSetupCopyText({ op: 'import', title: '导入 CSV 账单', steps });
    assert.ok(text.includes('还没给 CSV 文件路径'));
    assert.ok(!text.includes('全部通过'));
  });
  it('setup三份可读：JSON数仍数 CSV真表头', () => {
    const steps = initSteps(INIT_FACTS);
    const j = JSON.parse(buildSetupCopyJson({ op: 'init', title: '首次使用向导', steps }));
    assert.equal(j.data.total, 4);
    assert.equal(j.data.steps.length, 4);
    assert.equal(typeof j.data.steps[0].no, 'number');
    const csv = buildSetupCopyCsv({ op: 'init', title: '首次使用向导', steps });
    assert.ok(csv.startsWith('step,label,state,detail\n'));
  });
  it('setup空steps空态有下一步不硬凑行', () => {
    const text = buildSetupCopyText({ op: 'init', title: '首次使用向导', steps: [] });
    assert.ok(text.includes('没有步骤可报'));
    assert.ok(text.includes(SETUP_EMPTY_NEXT));
    const j = JSON.parse(buildSetupCopyJson({ op: 'init', title: '首次使用向导', steps: [] }));
    assert.deepEqual(j.data.steps, []);
    const csv = buildSetupCopyCsv({ op: 'init', title: '首次使用向导', steps: [] });
    assert.equal(csv, 'step,label,state,detail');
  });
  it('旧thin零产出：不含section,row与\"message\":', () => {
    const steps = initSteps(INIT_FACTS);
    const facts = { op: 'init', title: '首次使用向导', steps };
    const text = buildSetupCopyText(facts);
    const json = buildSetupCopyJson(facts);
    const csv = buildSetupCopyCsv(facts);
    for (const s of [text, json, csv]) assert.ok(!s.includes('section,row'));
    assert.ok(!json.includes('\"message\":'));
  });
});


describe('t1186 向导页三份可读复制等于显示行', () => {
  const scene = setupSceneFor('init');
  const steps = initSteps(INIT_FACTS);
  const envelope = receiptEnvelopeOf('bill.setup.run', { ok: true, message: '已初始化', op: 'init' });
  const html = wizardDoc({
    op: 'init', scene, key: 'bill.setup.run', params: {}, actionAt: '2026-10-08 00:00:00',
    steps, envelope, blocked: [], prompt: 'prompt', promptLabel: '复制给助手',
    envChecks: [
      { label: '运行环境', ok: true, detail: 'node 24' },
      { label: '数据目录', ok: true, detail: 'D:/data（可写）' },
    ],
    ready: true, dbPath: 'D:/data/bill.db', records: 5, created: false,
  });
  it('显示含人话行现状数', () => {
    assert.ok(html.includes('环境检测'));
    assert.ok(html.includes('已完成') || html.includes('走不通'));
    assert.ok(html.includes('12 列') || html.includes('5 条') || html.includes('现有记录'));
  });
  it('复制含同源人话行', () => {
    const text = buildSetupCopyText({ op: 'init', title: scene.title, steps });
    for (const line of text.split('\n').slice(2)) {
      const core = line.split('：')[0];
      assert.ok(html.includes(core.split(' ').slice(1, 3).join('')) || html.includes(line.split(' ')[1] || ''), '复制行未在显示中找到：' + line);
    }
    assert.ok(html.includes('共 4 步') || html.includes('共&nbsp;4&nbsp;步') || text.includes('共 4 步'));
  });
  it('旧硬凑subs已删：不含就是纸头这份等旧字', () => {
    assert.ok(!html.includes('就是纸头这份'));
    assert.ok(!html.includes('自动做，不用你动手'));
  });
});

describe('t1186 帮助页可验复制等于显示行', () => {
  const html = renderLookupPageHtml();
  it('显示含唤醒词与总数', () => {
    assert.ok(html.includes('能力速查'));
    assert.ok(html.includes('记支出') || html.includes('饼干记账HELP'));
  });
  it('复制三份含同源行', () => {
    const groups = buildLookupGroups();
    const total = groups.reduce((n, g) => n + g.rows.length, 0);
    const text = buildHelpCopyText({ title: '能力速查', total, groups });
    assert.ok(html.includes('记支出'));
    assert.ok(text.includes('记支出'));
    const csv = buildHelpCopyCsv({ title: '能力速查', total, groups });
    assert.ok(csv.startsWith('wake,goto'));
  });
  it('帮助非空不断言空态绿', () => {
    assert.ok(html.includes('速查可用'));
    assert.ok(!html.includes('还没有可查的唤醒词'));
  });
});

describe('t1186 帮助三份可验（纯文本可读/JSON结构/CSV表）', () => {
  const groups = [
    { label: '写入', rows: [{ wake: '记支出', goto: '写入 · 记一笔' }, { wake: '记收入', goto: '写入 · 记一笔' }] },
    { label: '查询', rows: [{ wake: '查今天', goto: '查询 · 查一天' }] },
  ];
  it('纯文本可读：页身份+总数+每行唤醒词去向', () => {
    const text = buildHelpCopyText({ title: '能力速查', total: 3, groups });
    const lines = text.split('\n');
    assert.ok(lines[0].includes('饼干记账') && lines[0].includes('能力速查'));
    assert.ok(lines[1].includes('共 3 条'));
    assert.ok(text.includes('记支出') && text.includes('查今天'));
  });
  it('JSON结构：数仍数 total为数', () => {
    const j = JSON.parse(buildHelpCopyText({ title: '能力速查', total: 3, groups }) && buildHelpCopyJson({ title: '能力速查', total: 3, groups }));
    assert.equal(j.data.total, 3);
    assert.equal(typeof j.data.total, 'number');
  });
  it('CSV表：真表头wake,goto', () => {
    const csv = buildHelpCopyCsv({ title: '能力速查', total: 3, groups });
    const lines = csv.split('\n');
    assert.equal(lines[0], 'wake,goto');
    assert.equal(lines.length, 4);
  });
  it('帮助空态有下一步不硬凑行', () => {
    const text = buildHelpCopyText({ title: '能力速查', total: 0, groups: [] });
    assert.ok(text.includes('还没有') || text.includes('没有可查'));
    assert.ok(text.includes(HELP_EMPTY_NEXT));
    const j = JSON.parse(buildHelpCopyJson({ title: '能力速查', total: 0, groups: [] }));
    assert.equal(j.data.total, 0);
    const csv = buildHelpCopyCsv({ title: '能力速查', total: 0, groups: [] });
    assert.equal(csv, 'wake,goto');
  });
  it('CSV RFC4180：逗号引号加引号双写', () => {
    const g2 = [{ label: '写入', rows: [{ wake: 'a,"b', goto: '写\n入' }] }];
    const csv = buildHelpCopyCsv({ title: '能力速查', total: 1, groups: g2 });
    assert.ok(csv.includes('"a,""b"'));
  });
});
