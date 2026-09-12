/** #228 · 备忘录 HELP 渲染接线的回归锁：真资产 → 载荷 → 整页 HTML。
 *
 * 跑法（**只构建本包**，禁仓根 `tsc -b`，见 #241 的 loader 工厂雷）：
 *   node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json
 *   node --test packages/skill-memo-ilife/test/help-file-228.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// ⚠️ B 路校验器在**包根**：`base-paint/help-shell` 那个子路径导出的 `renderHelpShell` 只是
//    `renderHelpShellHtml` 的别名（生成物里逐字 `typeof renderHelpShellHtml`），**不做 schema 校验**。
import { renderHelpShell } from 'base-paint';
import {
  buildMemoHelpFileData, renderMemoHelpHtml, formatHelpMinute,
} from '../dist/help/helpFile.js';

/** B 路校验器的探针用最小资产（`renderHelpShell` 要求 `TemplateAssets` 三件，本探针只走校验那一步）。 */
const ASSETS = { sharedHelpersJs: '/*js*/', sharedCssText: '/*css*/' };

const NOW = new Date(2026, 8, 12, 13, 30);
const DATA = buildMemoHelpFileData(NOW, {});
const HTML = renderMemoHelpHtml(DATA);

/** 从整页 HTML 里解出 `help-data` 载荷（照 `helpShell.ts` 的 `\\u003c` 转义口径反解）。 */
function readPayload(html) {
  const OPEN = '<script id="help-data" type="application/json">';
  const i = html.indexOf(OPEN);
  assert.ok(i >= 0, '整页 HTML 里必须有 help-data 段');
  const j = html.indexOf('</script>', i);
  return JSON.parse(html.slice(i + OPEN.length, j).split('\\u003c').join('<'));
}

const P = readPayload(HTML);
const SCENES = P.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const CLOSED_7 = ['id', 'title', 'wake_word', 'types', 'status', 'prompt_template', 'editable_fields'];

test('#228 文档标题由共享层拼成（title 不含技能名 ⇒ 走前缀支）', () => {
  const t = HTML.slice(HTML.indexOf('<title>') + 7, HTML.indexOf('</title>'));
  assert.equal(t, '备忘录 · 使用手册');
});

test('#228 载荷顶层键＝5 必需 ＋ contact/version/init_banner 三块可选键', () => {
  assert.deepEqual(Object.keys(P).sort(),
    ['contact', 'groups', 'init_banner', 'skill_name', 'subtitle', 'title', 'version'].sort());
  assert.equal(P.skill_name, '备忘录');
  assert.equal(P.title, '使用手册');
  // 世代取自资产（老 yaml 顶层），不是 npm 包版本 0.1.0
  assert.equal(P.version, '1.3.0');
});

test('#228 subtitle 计数派生、版本取资产', () => {
  assert.equal(P.subtitle, '8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0');
  assert.equal(P.groups.length, 8);
  assert.equal(P.groups.reduce((n, g) => n + g.subgroups.length, 0), 13);
  assert.equal(SCENES.length, 30);
});

test('#228 用户 V1／裁决 15：meta_blocks 与 recommendations 一律不传', () => {
  assert.equal('meta_blocks' in P, false, 'HELP 自身唤醒词不上页面 ⇒ 整块不传');
  assert.equal('recommendations' in P, false);
});

test('#228 裁决 5：aliases 留在资产、载荷里必须剥净（闭集 7 键）', () => {
  assert.equal(SCENES.filter((s) => 'aliases' in s).length, 0);
  for (const s of SCENES) {
    for (const k of Object.keys(s)) assert.ok(CLOSED_7.includes(k), '闭集外的键：' + k);
  }
});

test('#228 用户 U6／U1：页面上不出现命令名，也不标缺失', () => {
  const i = HTML.indexOf('<script id="help-data"');
  const j = HTML.indexOf('</script>', i);
  const blob = HTML.slice(i, j);
  assert.equal((blob.match(/memo\./g) || []).length, 0, 'memo.* 命令名不进页面');
  assert.equal((blob.match(/--html|memo-cmd-read/g) || []).length, 0, 'CLI 开关不进页面');
  assert.equal((blob.match(/待开发|无唤醒词|当前无/g) || []).length, 0, 'HELP 是完整体，不标缺失');
  assert.equal((blob.match(/HELP/g) || []).length, 0, 'HELP 自身唤醒词不上页面');
});

test('#228 contact 照老两项、不带 url（共享 schema 的 contact.items[] 是闭集）', () => {
  assert.deepEqual(P.contact, {
    items: [
      { label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS' },
      { label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues' },
    ],
  });
  for (const it of P.contact.items) assert.equal('url' in it, false);
  assert.equal('copy_all' in P.contact, false);
});

test('#228 init_banner：键常在、显隐只走 hidden、prompt 单源取 memo_init_setup', () => {
  const b = DATA.init_banner;
  assert.equal(b.hidden, false);
  assert.equal(buildMemoHelpFileData(NOW, { initialized: true }).init_banner.hidden, true);
  assert.equal(b.title, '🚀 第一次用备忘录?');
  assert.equal(b.button_text, '📋 复制');
  const setup = SCENES.find((s) => s.id === 'memo_init_setup');
  assert.ok(setup, '资产里必须有 memo_init_setup');
  assert.equal(b.prompt, setup.prompt_template, 'prompt 必须从场景取（单源，不抄第二份）');
  // 裁决 20：steps 取 {title,desc}[]（模板读 st.title／st.desc）——校验器那半条归共享层缺陷 #242
  assert.equal(b.steps.length, 6);
  assert.deepEqual(b.steps.map((s) => s.title),
    ['检查并配置 Python', '数据存储', '飞书 CLI', '环境变量', '初始化数据库', '生成报告']);
  assert.deepEqual(b.steps.map((s) => s.desc),
    ['版本与依赖检测', 'SQLite + FTS5 全文搜索', '安装并授权(核心联动)', 'SKILLS_DB_PATH / MEMO_MEDIA_DIR', '建表 + 提醒调度', '初始化报告页']);
});

test('#228 裁决 20 ①：6 条步骤的 title／desc 文案逐条出现在渲染出的 HTML 里', () => {
  const misses = [];
  for (const st of DATA.init_banner.steps) {
    for (const field of ['title', 'desc']) {
      const txt = st[field];
      // 文案不含需转义字符 ⇒ 模板 esc() 后与原文逐字相同，故可直接在 HTML 里找
      if (!HTML.includes(txt)) misses.push(field + ':' + txt);
    }
  }
  assert.deepEqual(misses, [], '以下步骤文案没进 HTML：' + misses.join(' | '));
  assert.equal(DATA.init_banner.steps.length * 2, 12, '共 12 段文案（6 条 × title/desc）');
});

test('#228 裁决 20 ②：本票载荷只对 A 路合法（B 路校验器 schema-invalid，根因归 #242）', () => {
  const runB = (sceneData) => {
    try { renderHelpShell({ sceneData, assets: ASSETS }); return null; }
    catch (e) { return e; }
  };
  const full = runB(DATA);
  assert.ok(full, 'B 路必须拒本票载荷');
  assert.equal(full.name, 'HelpSchemaError');
  assert.equal(full.code, 'schema-invalid');
  assert.equal(full.path, '/init_banner/hidden', '首个命中＝闭集外的 hidden');

  // 逐维隔离：证明这是**两处独立分歧**（各自单跑都判 invalid，且指向各自的 path）
  //   ① 只留闭集键（无 hidden）＋ steps 用本票的对象形 ⇒ 命中 /init_banner/steps/0
  const stepsAsObjects = runB({
    ...DATA,
    init_banner: { title: 'T', subtitle: 'S', button_text: 'B', prompt: 'P', steps: DATA.init_banner.steps },
  });
  assert.equal(stepsAsObjects?.path, '/init_banner/steps/0');
  assert.match(stepsAsObjects.message, /期望 string，实际 object/);
  //   ② 只留闭集键（无 hidden）＋ steps 退回 schema 要的 string[] ⇒ **全过**（证明分歧只有那两处）
  const closedOnly = runB({
    ...DATA,
    init_banner: { title: 'T', subtitle: 'S', button_text: 'B', prompt: 'P', steps: [] },
  });
  assert.equal(closedOnly, null, '闭集内形状必须能过 B 路（否则说明还有别的分歧）');
  //   ③ 把本票的 hidden 单独加回 ⇒ 命中 /init_banner/hidden（与 steps 无关）
  const hiddenOnly = runB({
    ...DATA,
    init_banner: { title: 'T', subtitle: 'S', button_text: 'B', prompt: 'P', steps: [], hidden: false },
  });
  assert.equal(hiddenOnly?.path, '/init_banner/hidden');
  assert.match(hiddenOnly.message, /hidden/);
});

test('#228 用户 V7：editable_fields 进了载荷，且 name/label 全是字符串（裁决 6 的硬门）', () => {
  const withFields = SCENES.filter((s) => s.editable_fields);
  assert.ok(withFields.length > 0, 'editable_fields 必须真的有');
  const total = withFields.reduce((n, s) => n + s.editable_fields.length, 0);
  assert.equal(total, 64, '清洗后 64 条（76 − 12 条 html CLI 开关）');
  for (const s of SCENES) {
    for (const f of s.editable_fields || []) {
      assert.equal(typeof f.name, 'string');
      assert.equal(typeof f.label, 'string');
      assert.equal(typeof f.value, 'string');
    }
    assert.equal(s.status, '', 'status 只许空串（U1／U2／U3 不标缺失）');
  }
});

test('#228 types 原子与老骨架一致（4 个原子，零表外词）', () => {
  const c = {};
  for (const s of SCENES) for (const t of s.types || []) c[t] = (c[t] || 0) + 1;
  assert.deepEqual(c, { 采集: 20, 回执: 30, 向导: 4, 查看: 10 });
  assert.equal('选择' in c, false);
});

test('#228 产物可复现：同参数两次渲染逐字节相同', () => {
  assert.equal(renderMemoHelpHtml(buildMemoHelpFileData(NOW, {})), HTML);
});

test('#228 formatHelpMinute ＝ 老 %Y-%m-%d %H:%M（本地时区、零填充；坏参不返空串）', () => {
  assert.equal(formatHelpMinute(NOW), '2026-09-12 13:30');
  assert.equal(formatHelpMinute(new Date(2026, 0, 2, 3, 4)), '2026-01-02 03:04');
  assert.throws(() => formatHelpMinute(undefined), (e) => e.code === 'MEMO_TEMPLATE_MISSING');
  assert.throws(() => formatHelpMinute(new Date('nope')), (e) => e.code === 'MEMO_TEMPLATE_MISSING');
});

test('#228 空分组走共享层 missing-data（不返空页）', () => {
  // 直接打共享层：空 groups 必须抛（本包的 fail 门另有覆盖）
  const bad = { ...DATA, groups: [] };
  assert.throws(() => renderMemoHelpHtml(bad), (e) => e.name === 'HelpShellError' && e.code === 'missing-data');
});
