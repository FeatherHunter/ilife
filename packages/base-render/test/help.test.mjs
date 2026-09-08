// #78 施工 A2 · HELP 壳守卫测试（node:test；随 root `pnpm test` 跑）。
//
// 覆盖（对齐契约 §3.5.2／§3.5.3／§6.5 与施工单 §2）：
//   ① 数据页分型与占位符契约（三必需标记各恰 1 次／载荷槽恰有其一／禁入标记 0 次／逐标记 0 残留）
//   ② 载荷容器（`<script id="payload" type="application/json">` 恰 1 个；容器内 JSON 逐值等于 sceneData）
//   ③ 壳结构（标题区／init_banner／Tab／二级折叠／场景卡／Sheet／关于 Tab／meta_blocks 原样透传）
//   ④ CSS-only 交互结构（radio ＋ `for` 标签 ＋ `<details>`；零内联脚本／零事件处理器）
//   ⑤ 复制按钮（`HELP_COPY_ACTIONS` 逐字 actionId ＋ 文案；文本写 `DEFAULT_DATA_ATTR`）
//   ⑥ scene-data 校验器 4 个错误码逐条可达 ＋ 判定次序（首个命中即抛）＋ 空 `scenes[]` → `schema-invalid`
//   ⑦ 逐字段转义（`meta_blocks[].html` 唯一豁免）＋ 模块纯度／模板字面量唯一真相（R13 不导出）
//
// 纪律：断言只读冻结常量（不硬编码第二份值）；不删、不放宽、不恒真化任何断言。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { HelpSchemaError, renderHelpShell } from '../dist/help.js';
import * as indexExports from '../dist/index.js';
import {
  ACTION_ID_ATTR,
  ASSET_WRAPPERS,
  CONTAINER_CHECK_RULE,
  CONTROL_STYLE_SECTIONS,
  DATA_SCRIPT_TYPE,
  DEFAULT_DATA_ATTR,
  DEFAULT_DATA_SCRIPT_ID,
  HELP_COPY_ACTIONS,
  HELP_COPY_TARGETS,
  HELP_SCHEMA_ERROR_CODES,
  HELP_SHELL_ID,
  SCENE_DATA_SCHEMA,
  SCENE_STATUS,
  SCENE_TYPE_FIELD,
  STYLE_PREFIX,
  TEMPLATE_MARKERS,
  escapeHtml,
} from '../dist/index.js';

const LF = String.fromCharCode(10);
/** 样式区名：**从 `CONTROL_STYLE_SECTIONS` 闭集派生**（kebab 后与 `HELP_SHELL_ID` 同值者），不写字面量。
 *  闭集漂移时取 `''`（→ `CLS === STYLE_PREFIX`），由用例断言红而非模块加载期崩。 */
const HELP_SECTION = CONTROL_STYLE_SECTIONS.find(
  (section) => STYLE_PREFIX + section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase()) === HELP_SHELL_ID,
) ?? '';
/** 类名命名空间（恒由 `STYLE_PREFIX` ＋ 样式区闭集成员派生，不硬编码）。 */
const CLS = STYLE_PREFIX + HELP_SECTION.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
const FAKE_JS = '(function(){var a=1;return a;})();';
const FAKE_CSS = '.ilife-fake{color:red}';
const ASSETS = { sharedHelpersJs: FAKE_JS, sharedCssText: FAKE_CSS };

/* ── 小件 ─────────────────────────────────────────────────── */

function occurrences(haystack, needle) {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index >= 0) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 自带载荷容器开标签（由冻结常量拼装，测试侧不写第二份 id／type）。 */
function payloadOpenTag() {
  return ASSET_WRAPPERS.sharedHelpersJs.openTag.slice(0, -1)
    + ' id="' + CONTAINER_CHECK_RULE.id + '" type="' + CONTAINER_CHECK_RULE.type + '">';
}

/** 壳片段（载荷容器之前的部分：注入的 helpers／CSS 与 JSON 载荷都在其后）。 */
function shellPart(html) {
  const at = html.indexOf(payloadOpenTag());
  return at < 0 ? html : html.slice(0, at);
}

/** 场景卡片段（`<article>` 不嵌套）。 */
function cardFragment(html, sceneId) {
  const start = html.indexOf(CLS + '-card" ' + 'data-scene-id="' + sceneId + '"');
  assert.notEqual(start, -1, '未找到场景卡：' + sceneId);
  const open = html.lastIndexOf('<article', start);
  const end = html.indexOf('</article>', open);
  return html.slice(open, end + '</article>'.length);
}

/** 带某 `actionId` 的按钮文本列表。 */
function buttonLabels(html, actionId) {
  const re = new RegExp('<button[^>]*' + ACTION_ID_ATTR + '="' + escapeRegExp(actionId) + '"[^>]*>([^<]*)</button>', 'g');
  return [...html.matchAll(re)].map((match) => match[1]);
}

/* ── 夹具（覆盖 sceneData 全部字段） ──────────────────────── */

function fixtureData() {
  return {
    skill_name: '卡路里',
    title: '能力速查台',
    subtitle: '饮食 · 运动 · 目标',
    version: '1.2.3',
    init_banner: {
      title: '第一次用卡路里',
      subtitle: '初始化一次即可',
      button_text: '开始初始化',
      prompt: '请你加载技能 卡路里,执行初始化。',
      steps: ['检测环境', '初始化数据库', '校验'],
    },
    meta_blocks: [
      { id: 'usage_rules', title: '使用须知', html: '<p><b>原文</b>透传</p>' },
      { id: 'ai_verify', title: 'AI 验证协议', html: '<ul><li>原文 &amp; 保留</li></ul>' },
    ],
    contact: {
      items: [
        { label: '作者', value: '@feather' },
        { label: '仓库', value: 'https://example.com/ilife' },
      ],
      copy_all: '一键复制全部联系信息',
    },
    recommendations: [
      { name: '作息管家', reason: '作息记录', wake_word: '记作息' },
    ],
    groups: [
      {
        id: 'home',
        icon: '🏠',
        label: '主页',
        subgroups: [
          {
            id: 'home_today',
            label: '今日',
            scenes: [
              {
                id: 'home_today_overview',
                title: '看今日主页',
                wake_word: '看今日主页',
                types: ['结果', { text: '过程', bg: '#fff3e0', fg: '#b25b00' }],
                status: '',
                prompt_template: '请你加载技能 卡路里,执行唤醒词「看今日主页」。' + LF + LF + '我想看今天的主页 dashboard。',
                editable_fields: [
                  { name: 'date', label: '日期', value: '2026-09-09', hint: 'YYYY-MM-DD', required: true },
                  { name: 'note', label: '备注', value: '', hint: '可留空' },
                ],
              },
              {
                id: 'home_today_trend',
                title: '看趋势',
                wake_word: '看趋势',
                status: '【待开发】',
                prompt_template: '请你加载技能 卡路里,执行唤醒词「看趋势」。',
              },
            ],
          },
          {
            id: 'home_range',
            label: '区间',
            scenes: [
              {
                id: 'home_week',
                title: '看本周',
                wake_word: '看本周',
                types: ['查看'],
                status: '',
                prompt_template: '请你加载技能 卡路里,执行唤醒词「看本周」。',
              },
              {
                // FX-78-V2b-1：**两个非空 value 字段**——使多字段 `params` 的 LF 连接可观察
                // （`join(LF)` 改成 `join(',')` 必须红）。
                id: 'home_month',
                title: '看本月',
                // FX-78-V2b-4：`wake_word ≠ title`——使 chip 取哪个字段可观测
                // （chip 改成 `text(scene.title)` 必须红）。
                wake_word: '看本月饮食',
                types: ['查看'],
                status: '',
                prompt_template: '请你加载技能 卡路里,执行唤醒词「看本月」。',
                editable_fields: [
                  { name: 'from', label: 'A', value: '1' },
                  { name: 'to', label: 'B', value: '2' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'diet',
        label: '饮食',
        subgroups: [
          {
            id: 'diet_log',
            label: '记录',
            scenes: [
              {
                id: 'diet_add',
                title: '记饮食',
                wake_word: '记饮食',
                types: [{ text: '采集', bg: '#e7f8ee', fg: '#1a7a3a' }],
                status: '',
                prompt_template: '请你加载技能 卡路里,执行唤醒词「记饮食」。',
              },
            ],
          },
        ],
      },
    ],
  };
}

/** 夹具的扁平场景清单（`[groupId, sceneId, wakeWord]`）。 */
const FIXTURE_SCENES = [
  ['home', 'home_today_overview', '看今日主页'],
  ['home', 'home_today_trend', '看趋势'],
  ['home', 'home_week', '看本周'],
  ['home', 'home_month', '看本月饮食'],
  ['diet', 'diet_add', '记饮食'],
];

/* ── ① 数据页分型与占位符契约 ─────────────────────────────── */

describe('renderHelpShell：数据页分型与占位符契约（R7／§3.5.3）', () => {
  const out = renderHelpShell({ sceneData: fixtureData(), assets: ASSETS });
  const counts = new Map(out.report.markers.map((marker) => [marker.key, marker]));

  it('三个必需占位符各恰好 1 次；载荷槽恰有其一；禁入标记 0 次', () => {
    for (const key of ['injectData', 'sharedCss', 'sharedHelpers']) {
      assert.equal(counts.get(key).count, 1, key + ' 必须恰 1 次');
      assert.equal(counts.get(key).filled, true, key + ' 必须被填充');
    }
    for (const key of ['chartsHelpers', 'content', 'noShared']) {
      assert.equal(counts.get(key).count, 0, key + ' 必须 0 次');
      assert.equal(counts.get(key).filled, false, key + ' 不得被填充');
    }
    assert.equal(out.report.exempt, false, '不得声明 NO-SHARED');
    assert.equal(out.report.strict, false);
  });

  it('占位符 0 残留：逐标记断言字面量不在产物中', () => {
    for (const [key, literal] of Object.entries(TEMPLATE_MARKERS)) {
      assert.equal(out.html.includes(literal), false, '标记残留 ' + key + '：' + literal);
    }
  });

  it('载荷槽分型 = data-page：容器 id／type 取冻结常量，容器内 JSON 逐值等于 sceneData', () => {
    assert.equal(CONTAINER_CHECK_RULE.id, DEFAULT_DATA_SCRIPT_ID);
    assert.equal(CONTAINER_CHECK_RULE.type, DATA_SCRIPT_TYPE);
    assert.equal(CONTAINER_CHECK_RULE.openTag, ASSET_WRAPPERS.sharedHelpersJs.openTag);
    const open = payloadOpenTag();
    assert.equal(occurrences(out.html, open), 1, '自带容器必须恰 1 个：' + open);
    const start = out.html.indexOf(open) + open.length;
    const end = out.html.indexOf(ASSET_WRAPPERS.sharedHelpersJs.closeTag, start);
    assert.notEqual(end, -1, '容器必须闭合');
    assert.deepEqual(JSON.parse(out.html.slice(start, end)), fixtureData());
  });

  it('唯一可执行脚本 = 填充器包裹的 sharedHelpersJs；壳不自产脚本／画布／事件处理器', () => {
    assert.equal(occurrences(out.html, '<script'), 2, '只允许 payload 容器 ＋ 填充器包裹的 helpers');
    assert.equal(occurrences(out.html, ASSET_WRAPPERS.sharedHelpersJs.openTag + FAKE_JS + ASSET_WRAPPERS.sharedHelpersJs.closeTag), 1);
    assert.equal(occurrences(out.html, ASSET_WRAPPERS.sharedCssText.openTag + FAKE_CSS + ASSET_WRAPPERS.sharedCssText.closeTag), 1);
    assert.equal(occurrences(out.html, '<canvas'), 0);
    for (const handler of ['onclick=', 'onload=', 'onerror=', 'onchange=', 'oninput=', 'onsubmit=', 'onmouseover=']) {
      assert.equal(out.html.includes(handler), false, '禁内联事件处理器：' + handler);
    }
    assert.equal(out.html.includes('javascript:'), false, '禁 javascript: URL');
    assert.equal(out.html.includes('复制 prompt'), false, 'FX-7：禁旧词「复制 prompt」');
  });

  it('产物是完整 HTML 文档：DOCTYPE／lang／charset／viewport／转义 title／闭合（R31）', () => {
    assert.equal(out.html.slice(0, '<!DOCTYPE html>'.length), '<!DOCTYPE html>', '必须以 DOCTYPE 开头');
    assert.equal(out.html.includes('<html lang="zh-CN">'), true);
    assert.equal(out.html.includes('<meta charset="utf-8">'), true, '缺 charset 会让 file:// 打开的中文乱码');
    assert.equal(out.html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'), true);
    const title = '<title>' + escapeHtml('能力速查台 · 卡路里') + '</title>';
    assert.equal(out.html.includes(title), true, '<title> 必须取 title · skill_name 并转义');
    assert.equal(out.html.slice(-'</html>'.length), '</html>', '必须以 </html> 结尾');
    // head／body 槽位：SHARED-CSS 在 <head>，payload 容器与 SHARED-HELPERS 在 <body>
    const headEnd = out.html.indexOf('</head>');
    assert.equal(out.html.slice(0, headEnd).includes(ASSET_WRAPPERS.sharedCssText.openTag + FAKE_CSS + ASSET_WRAPPERS.sharedCssText.closeTag), true);
    assert.equal(out.html.slice(headEnd).includes(payloadOpenTag()), true);
  });

  it('<title> 注入不逃逸：危险字符经 escapeHtml（不产生第二个 <script>）', () => {
    const { output } = attempt((data) => { data.title = '<script>alert(1)</script>'; });
    const titleTag = /<title>([\s\S]*?)<\/title>/.exec(output.html)[1];
    assert.equal(titleTag, escapeHtml('<script>alert(1)</script>' + ' · 卡路里'));
    assert.equal(output.html.slice(0, output.html.indexOf('</head>')).includes('<script'), false, 'head 内不得出现可执行脚本');
    assert.equal(occurrences(output.html, '<script'), 2, 'title 注入不得新增脚本标签');
  });

  it('根元素恒为 HELP_SHELL_ID；类名全部落在 helpShell 命名空间；HTML id 全页唯一', () => {
    assert.equal(CONTROL_STYLE_SECTIONS.includes(HELP_SECTION), true, '样式区闭集必须含 helpShell 区（由 HELP_SHELL_ID 派生）');
    assert.equal(CLS, HELP_SHELL_ID, '类名命名空间根必须与根元素 id 同值');
    const root = new RegExp('<section class="' + escapeRegExp(CLS) + '" id="' + escapeRegExp(HELP_SHELL_ID) + '">');
    assert.match(out.html, root);
    assert.equal(occurrences(out.html, 'id="' + HELP_SHELL_ID + '"'), 1);
    const classes = [...out.html.matchAll(/class="([^"]*)"/g)]
      .flatMap((match) => match[1].split(' '))
      .filter((token) => token !== '');
    assert.equal(classes.length, 179, '夹具的类名总数（结构快照：增删类名即红）');
    for (const token of classes) {
      assert.equal(token === CLS || token.indexOf(CLS + '-') === 0, true, '类名越界：' + token);
    }
    const ids = [...out.html.matchAll(/ id="([^"]*)"/g)].map((match) => match[1]);
    assert.deepEqual([...new Set(ids)], ids, 'HTML id 必须全页唯一');
  });

  it('CSS-only 交互结构：分组 Tab = radio ＋ for 标签；折叠／Sheet = details', () => {
    const radios = [...out.html.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((match) => match[0]);
    assert.equal(radios.length, 3, '2 个分组页 ＋ 1 个关于页');
    const radioIds = radios.map((tag) => / id="([^"]*)"/.exec(tag)[1]);
    const radioNames = radios.map((tag) => / name="([^"]*)"/.exec(tag)[1]);
    assert.equal(new Set(radioNames).size, 1, '分组 radio 必须共用同一 name');
    const labels = [...out.html.matchAll(/<label[^>]*class="[^"]*tab"[^>]*for="([^"]*)"/g)].map((match) => match[1]);
    assert.deepEqual([...labels].sort(), [...radioIds].sort(), '每个 tab 标签必须指向唯一 radio id');
    // W13：逐字断言 radio 标签的**完整属性组合**（不用 ` checked>` 这种短 needle）
    const radioTag = (index, checked) => '<input class="' + CLS + '-tab-input" type="radio" name="'
      + CLS + '-tab-group" id="' + CLS + '-tab-' + index + '"' + (checked ? ' checked' : '') + '>';
    assert.deepEqual(radios, [radioTag(0, true), radioTag(1, false), radioTag('about', false)],
      'radio 标签必须逐字等于「页索引 id ＋ 仅首个 checked」的完整形态');
    assert.equal(occurrences(out.html, ' checked>'), 1, '默认只勾选第一个页面');
    assert.equal(occurrences(out.html, '<details'), 8, '3 个二级折叠 ＋ 5 张场景卡的 Sheet');
    assert.equal(occurrences(out.html, '<summary'), 8);
  });
});

/* ── ② 壳结构逐区块 ──────────────────────────────────────── */

describe('renderHelpShell：壳结构（标题区／Tab／折叠／场景卡／Sheet／关于／meta_blocks）', () => {
  const out = renderHelpShell({ sceneData: fixtureData(), assets: ASSETS });
  const html = out.html;

  it('标题区：skill_name／title／subtitle／场景数逐字段落位', () => {
    assert.match(html, new RegExp('<p class="' + CLS + '-eyebrow">卡路里</p>'));
    assert.match(html, new RegExp('<h1 class="' + CLS + '-title">能力速查台</h1>'));
    assert.match(html, new RegExp('<p class="' + CLS + '-subtitle">饮食 · 运动 · 目标</p>'));
    // W14：lead 文案**完整逐字**（含后半段，截断即红）
    const lead = '<p class="' + CLS + '-lead">' + FIXTURE_SCENES.length + ' 场景 · 点场景卡看指令全文,一键复制指令</p>';
    assert.equal(html.includes(lead), true, 'lead 文案必须完整逐字：' + lead);
    assert.equal(occurrences(html, '<p class="' + CLS + '-lead">'), 1, 'lead 恰 1 处');
    assert.equal(html.includes('<p class="' + CLS + '-lead">' + FIXTURE_SCENES.length + ' 场景 · </p>'), false,
      '不得只有前缀');
  });

  it('init_banner：title／subtitle／prompt／steps（新类型 string[]）＋ 复制指令按钮', () => {
    assert.match(html, new RegExp('<p class="' + CLS + '-init-title">第一次用卡路里</p>'));
    assert.match(html, new RegExp('<p class="' + CLS + '-init-subtitle">初始化一次即可</p>'));
    assert.match(html, new RegExp('<p class="' + CLS + '-init-prompt">请你加载技能 卡路里,执行初始化。</p>'));
    assert.deepEqual([...html.matchAll(new RegExp('<li class="' + CLS + '-init-step">([^<]*)</li>', 'g'))].map((m) => m[1]),
      ['检测环境', '初始化数据库', '校验']);
    assert.equal(buttonLabels(html, HELP_COPY_ACTIONS.prompt.actionId).includes('开始初始化'), true, 'button_text 用作按钮文案');
    assert.equal(html.includes(DEFAULT_DATA_ATTR + '="请你加载技能 卡路里,执行初始化。"'), true);
  });

  it('分组 Tab：icon／label 逐字段落位', () => {
    assert.match(html, new RegExp('<label class="' + CLS + '-tab" for="' + CLS + '-tab-0">'
      + '<span class="' + CLS + '-tab-icon">🏠</span>主页</label>'));
    assert.match(html, new RegExp('<label class="' + CLS + '-tab" for="' + CLS + '-tab-1">饮食</label>'));
    assert.match(html, new RegExp('<label class="' + CLS + '-tab" for="' + CLS + '-tab-about">关于</label>'));
  });

  it('二级折叠：subgroup label ＋ 场景数；data-subgroup-id 可追溯', () => {
    assert.match(html, new RegExp('<details class="' + CLS + '-subgroup" data-subgroup-id="home_today" open>'));
    assert.match(html, new RegExp('<summary class="' + CLS + '-subgroup-summary">今日<span class="' + CLS + '-count">2</span></summary>'));
    assert.match(html, new RegExp('<summary class="' + CLS + '-subgroup-summary">区间<span class="' + CLS + '-count">2</span></summary>'));
  });

  it('场景卡：逐场景 CLI 形态文本 = Scene.id 原文（Q11／R17／R32）＋ 反向断言无拼接串', () => {
    assert.equal(occurrences(html, '<article'), FIXTURE_SCENES.length);
    for (const [groupId, sceneId] of FIXTURE_SCENES) {
      assert.equal(html.includes('<code class="' + CLS + '-cli">' + escapeHtml(sceneId) + '</code>'), true,
        'CLI 形态文本必须逐字等于 Scene.id：' + sceneId);
      assert.equal(cardFragment(html, sceneId).includes('data-group-id="' + groupId + '"'), true);
      // 反向断言（R32）：不得出现 skill_name.group.id.scene.id 形态的畸形串
      const concatenated = '卡路里.' + groupId + '.' + sceneId;
      assert.equal(html.includes(concatenated), false, '不得拼出畸形 CLI 串：' + concatenated);
      assert.equal(html.includes(concatenated + '</code>'), false);
    }
    assert.equal(occurrences(html, '<code class="' + CLS + '-cli">'), FIXTURE_SCENES.length);
  });

  it('场景卡：title／wake_word chip 逐字段落位', () => {
    const card = cardFragment(html, 'home_today_overview');
    assert.equal(card.includes('<h3 class="' + CLS + '-card-title">看今日主页</h3>'), true);
    assert.equal(card.includes('<span class="' + CLS + '-chip">看今日主页</span>'), true);
  });

  it('chip 文本恒取 wake_word（wake_word ≠ title 的场景；FX-78-V2b-4）', () => {
    const card = cardFragment(html, 'home_month');
    const chipText = new RegExp('<span class="' + CLS + '-chip">([^<]*)</span>').exec(card)[1];
    assert.equal(chipText, '看本月饮食', 'chip 必须逐字等于 wake_word');
    assert.notEqual(chipText, '看本月', 'chip 不得取 title');
    assert.equal(card.includes('<span class="' + CLS + '-chip">看本月</span>'), false, 'chip 内不得出现 title');
    // 同一张卡内 title 与 wake_word 同时可见，证明两者是不同字段
    assert.equal(card.includes('<h3 class="' + CLS + '-card-title">看本月</h3>'), true);
    assert.equal(card.includes('看本月饮食'), true);
    // 全页 chip 文本集合 = 各场景 wake_word 集合（逐值，防串字段）
    const chipTexts = [...html.matchAll(new RegExp('<span class="' + CLS + '-chip">([^<]*)</span>', 'g'))]
      .map((match) => match[1]);
    assert.deepEqual(chipTexts, FIXTURE_SCENES.map((entry) => entry[2]));
  });

  it('types 徽章：字符串元素用默认配色；{text,bg,fg} 元素写内联 style（两种变体）', () => {
    const card = cardFragment(html, 'home_today_overview');
    assert.equal(card.includes('<span class="' + CLS + '-badge">结果</span>'), true);
    assert.equal(card.includes('<span class="' + CLS + '-badge" style="background:#fff3e0;color:#b25b00">过程</span>'), true);
    assert.equal(card.includes(SCENE_TYPE_FIELD + '='), false, '不得渲染单数字段 type');
  });

  it('status：徽章文本逐字 === SCENE_STATUS[1]；空串 → 无徽章（恒读冻结常量）', () => {
    assert.equal(SCENE_STATUS[1], '【待开发】', '白名单第二值即徽章文本来源');
    const badge = '<span class="' + CLS + '-badge ' + CLS + '-badge-dev">' + SCENE_STATUS[1] + '</span>';
    assert.equal(cardFragment(html, 'home_today_trend').includes(badge), true,
      '徽章文本必须逐字等于 SCENE_STATUS[1]（改 spec 值即随动）');
    assert.equal(cardFragment(html, 'home_week').includes(CLS + '-badge-dev'), false);
    // 鉴别力：裸「待开发」（不带【】）不是白名单值，故不得作为徽章文本出现
    assert.equal(html.includes('>' + SCENE_STATUS[1].slice(1, -1) + '</span>'), false,
      '徽章文本不得是去掉【】的字面量');
  });

  it('Sheet：prompt_template 全文 ＋ editable_fields（label／value／hint／必填标记）', () => {
    const card = cardFragment(html, 'home_today_overview');
    const prompt = '请你加载技能 卡路里,执行唤醒词「看今日主页」。' + LF + LF + '我想看今天的主页 dashboard。';
    assert.equal(card.includes('<pre class="' + CLS + '-prompt">' + escapeHtml(prompt) + '</pre>'), true);
    const dateField = card.slice(card.indexOf('data-field="date"'), card.indexOf('</li>', card.indexOf('data-field="date"')));
    assert.equal(dateField.includes('>日期<'), true);
    assert.equal(dateField.includes('>2026-09-09<'), true);
    assert.equal(dateField.includes('>YYYY-MM-DD<'), true);
    assert.equal(dateField.includes('>必填<'), true);
    const noteField = card.slice(card.indexOf('data-field="note"'), card.indexOf('</li>', card.indexOf('data-field="note"')));
    assert.equal(noteField.includes('>备注<'), true);
    assert.equal(noteField.includes('>可留空<'), true);
    assert.equal(noteField.includes('>必填<'), false, '非必填字段不得带必填标记');
  });

  it('关于 Tab：contact items／copy_all／version／recommendations 逐字段落位', () => {
    assert.equal(html.includes('data-page="about"'), true);
    assert.match(html, new RegExp('<span class="' + CLS + '-about-label">作者</span>'
      + '<span class="' + CLS + '-about-value">@feather</span>'));
    assert.equal(html.includes('>https://example.com/ilife<'), true);
    assert.equal(html.includes('>一键复制全部联系信息<'), true);
    assert.equal(html.includes('>v1.2.3<'), true);
    assert.equal(html.includes('>作息管家<'), true);
    assert.equal(html.includes('>作息记录<'), true);
    assert.equal(html.includes('>记作息<'), true);
  });

  it('meta_blocks：id／title 转义，html 原样透传（doc:821）', () => {
    assert.equal(html.includes('data-meta-id="usage_rules"'), true);
    assert.equal(html.includes('>使用须知<'), true);
    assert.equal(html.includes('<p><b>原文</b>透传</p>'), true, 'meta html 必须原样透传');
    assert.equal(html.includes('<ul><li>原文 &amp; 保留</li></ul>'), true, 'meta html 内的实体同样原样透传');
  });

  it('meta_blocks[].html 透传不设消毒：脚本同样原样落地（技能方自理，doc:821）', () => {
    const { output } = attempt((data) => { data.meta_blocks[1].html = '<script>window.__x=1</script>'; });
    assert.equal(output.html.includes('<script>window.__x=1</script>'), true);
    assert.equal(occurrences(output.html, '<script'), 3, 'payload 容器 ＋ 填充器 helpers 包裹 ＋ 透传脚本');
  });
});

/* ── ③ 复制按钮（FX-7／FX-17） ───────────────────────────── */

describe('renderHelpShell：复制按钮（FX-7／FX-17／Q13）', () => {
  const out = renderHelpShell({ sceneData: fixtureData(), assets: ASSETS });
  const html = out.html;

  it('三个目标的 actionId／文案逐字取 HELP_COPY_ACTIONS 并写入 ACTION_ID_ATTR', () => {
    assert.deepEqual([...HELP_COPY_TARGETS], ['prompt', 'wakeWord', 'params']);
    for (const target of HELP_COPY_TARGETS) {
      const action = HELP_COPY_ACTIONS[target];
      assert.equal(html.includes(ACTION_ID_ATTR + '="' + action.actionId + '"'), true, '缺 actionId：' + action.actionId);
      const labels = buttonLabels(html, action.actionId);
      assert.equal(labels.length, FIXTURE_SCENES.length + (target === 'prompt' ? 1 : 0),
        '按钮数：每场景 1 个 ＋ init_banner 的指令按钮');
      assert.equal(labels.includes(action.label), true, '缺文案：' + action.label);
    }
    assert.equal(HELP_COPY_ACTIONS.prompt.label, '复制指令');
  });

  it('每场景三目标各 1 个按钮 ＋ init_banner 1 个指令按钮（计数逐 actionId）', () => {
    const sceneCount = FIXTURE_SCENES.length;
    assert.equal(buttonLabels(html, HELP_COPY_ACTIONS.prompt.actionId).length, sceneCount + 1);
    assert.equal(buttonLabels(html, HELP_COPY_ACTIONS.wakeWord.actionId).length, sceneCount);
    assert.equal(buttonLabels(html, HELP_COPY_ACTIONS.params.actionId).length, sceneCount);
    assert.equal(occurrences(html, '<button'), sceneCount * 3 + 1);
  });

  it('复制文本写入 DEFAULT_DATA_ATTR：prompt／wake_word 逐字相等，params = label: value 行', () => {
    assert.equal(DEFAULT_DATA_ATTR, 'data-t');
    const card = cardFragment(html, 'home_today_overview');
    const prompt = '请你加载技能 卡路里,执行唤醒词「看今日主页」。' + LF + LF + '我想看今天的主页 dashboard。';
    assert.equal(card.includes(DEFAULT_DATA_ATTR + '="' + escapeHtml(prompt) + '"'), true);
    assert.equal(card.includes(DEFAULT_DATA_ATTR + '="看今日主页"'), true);
    assert.equal(card.includes(DEFAULT_DATA_ATTR + '="日期: 2026-09-09"'), true, '空 value 字段必须省略');
  });

  it('多字段 params：逐字以 LF 连接（FX-78-V2b-1）', () => {
    const card = cardFragment(html, 'home_month');
    const lfJoined = 'A: 1' + LF + 'B: 2';
    assert.equal(card.includes(DEFAULT_DATA_ATTR + '="' + lfJoined + '"'), true,
      '两个非空字段必须以 LF 连接：' + JSON.stringify(lfJoined));
    assert.equal(card.includes(DEFAULT_DATA_ATTR + '="A: 1,B: 2"'), false, '不得以逗号连接');
    assert.equal(card.includes(DEFAULT_DATA_ATTR + '="A: 1"'), false, '不得只取首字段');
    assert.equal(card.includes(DEFAULT_DATA_ATTR + '="A: 1 B: 2"'), false, '不得以空格连接');
    assert.equal(LF.charCodeAt(0), 10, 'LF 必须是 U+000A');
  });

  it('无 editable_fields 的场景：params 复制文本回落为该场景 Scene.id（R32）', () => {
    const card = cardFragment(html, 'home_week');
    assert.equal(card.includes(DEFAULT_DATA_ATTR + '="home_week"'), true);
    assert.equal(card.includes(DEFAULT_DATA_ATTR + '="卡路里.home.home_week"'), false, '不得回落为拼接串');
    assert.equal(card.includes('<ul class="' + CLS + '-fields">'), false, '无字段时不渲染字段表');
  });

  it('复制按钮零内联 onclick：只带 actionId ＋ data-t', () => {
    const buttons = [...html.matchAll(/<button[^>]*>/g)].map((match) => match[0]);
    assert.equal(buttons.length, FIXTURE_SCENES.length * 3 + 1);
    for (const tag of buttons) {
      assert.equal(tag.includes(ACTION_ID_ATTR + '="'), true, '按钮必须带 actionId：' + tag);
      assert.equal(tag.includes(DEFAULT_DATA_ATTR + '="'), true, '按钮必须带复制文本：' + tag);
      assert.equal(/on[a-z]+\s*=/i.test(tag), false, '按钮禁内联事件处理器：' + tag);
    }
  });
});

/* ── ④ scene-data 校验器 ─────────────────────────────────── */

const seenCodes = new Set();

function firstScene(data) {
  return data.groups[0].subgroups[0].scenes[0];
}

function attempt(mutate) {
  const data = fixtureData();
  if (mutate) mutate(data);
  try {
    return { output: renderHelpShell({ sceneData: data, assets: ASSETS }), error: null };
  } catch (error) {
    return { output: null, error };
  }
}

/** 各 code 的 `message` 必须含的辨因片段（一码多义由 message 辨因，§3.1.2⑤ 同口径）。 */
const MESSAGE_HINTS = {
  'duplicate-id': 'scene.id 重复',
  'status-invalid': 'SCENE_STATUS',
  'types-invalid': 'types 元素',
  'schema-invalid': /缺必填字段|类型不符|不在 enum|长度不足|元素不足|多余字段|oneOf/,
};

function expectCode(mutate, code, pathPattern) {
  const { error } = attempt(mutate);
  assert.notEqual(error, null, '必须抛 HelpSchemaError code=' + code);
  assert.equal(error instanceof HelpSchemaError, true, '必须是 HelpSchemaError 实例');
  assert.equal(error.name, 'HelpSchemaError');
  assert.equal(error.code, code);
  const hint = MESSAGE_HINTS[code];
  assert.equal(hint instanceof RegExp ? hint.test(error.message) : error.message.includes(hint), true,
    code + ' 的 message 必须辨因，实为：' + error.message);
  if (pathPattern !== undefined) {
    assert.match(error.path, pathPattern);
  }
  seenCodes.add(error.code);
  return error;
}

describe('renderHelpShell：scene-data 校验器（R6／§3.5.2）', () => {
  it('duplicate-id：scenes[].id 跨分组重复即抛（含 path 定位）', () => {
    const error = expectCode((data) => {
      data.groups[1].subgroups[0].scenes[0].id = 'home_today_overview';
    }, 'duplicate-id', /^\/groups\/1\/subgroups\/0\/scenes\/0\/id$/);
    assert.equal(error.message.includes('home_today_overview'), true);
  });

  it('status-invalid：出现值不在 SCENE_STATUS 白名单即抛', () => {
    for (const bad of ['开发中', '待开发', SCENE_STATUS[1] + ' ', '']) {
      if (SCENE_STATUS.includes(bad)) continue;
      expectCode((data) => { firstScene(data).status = bad; }, 'status-invalid',
        /^\/groups\/0\/subgroups\/0\/scenes\/0\/status$/);
    }
    for (const ok of SCENE_STATUS) {
      const { error } = attempt((data) => { firstScene(data).status = ok; });
      assert.equal(error, null, 'SCENE_STATUS 白名单值必须通过：' + JSON.stringify(ok));
    }
  });

  it('types-invalid：元素既非字符串也非 {text} 即抛（逐形态）', () => {
    const cases = [
      ['数字', 42, 'number'],
      ['null', null, 'null'],
      ['缺 text', { bg: '#fff' }, 'object'],
      ['text 非字符串', { text: 123 }, 'object'],
    ];
    assert.equal(cases.length, 4, '四种非法元素形态');
    for (const [name, element, described] of cases) {
      const error = expectCode((data) => { firstScene(data).types = ['结果', element]; }, 'types-invalid',
        /^\/groups\/0\/subgroups\/0\/scenes\/0\/types\/1$/);
      assert.match(error.message, new RegExp(escapeRegExp(described) + '$'),
        name + ' 的 message 必须以形态描述结尾（辨因）');
    }
    expectCode((data) => { firstScene(data).types = [{}]; }, 'types-invalid',
      /^\/groups\/0\/subgroups\/0\/scenes\/0\/types\/0$/);
  });

  it('schema-invalid：顶层与逐层结构（必填／类型／多余字段／minLength／minItems／oneOf）', () => {
    expectCode((data) => { delete data.skill_name; }, 'schema-invalid', /^\/skill_name$/);
    expectCode((data) => { data.skill_name = ''; }, 'schema-invalid', /^\/skill_name$/);
    expectCode((data) => { data.title = 1; }, 'schema-invalid', /^\/title$/);
    expectCode((data) => { data.subtitle = 1; }, 'schema-invalid', /^\/subtitle$/);
    expectCode((data) => { data.extra = 1; }, 'schema-invalid', /^\/extra$/);
    expectCode((data) => { data.groups = {}; }, 'schema-invalid', /^\/groups$/);
    expectCode((data) => { data.groups[0].icon = 1; }, 'schema-invalid', /^\/groups\/0\/icon$/);
    expectCode((data) => { data.groups[0].subgroups = 'x'; }, 'schema-invalid', /^\/groups\/0\/subgroups$/);
    expectCode((data) => { delete firstScene(data).wake_word; }, 'schema-invalid', /^\/groups\/0\/subgroups\/0\/scenes\/0\/wake_word$/);
    expectCode((data) => { firstScene(data).extra = 1; }, 'schema-invalid', /^\/groups\/0\/subgroups\/0\/scenes\/0\/extra$/);
    expectCode((data) => { firstScene(data).prompt_template = ''; }, 'schema-invalid', /^\/groups\/0\/subgroups\/0\/scenes\/0\/prompt_template$/);
    expectCode((data) => { firstScene(data).types = [{ text: 'x', foo: 1 }]; }, 'schema-invalid', /^\/groups\/0\/subgroups\/0\/scenes\/0\/types\/0$/);
    expectCode((data) => { firstScene(data).editable_fields[0].required = 'yes'; }, 'schema-invalid', /^\/groups\/0\/subgroups\/0\/scenes\/0\/editable_fields\/0\/required$/);
    expectCode((data) => { firstScene(data).editable_fields = [{ name: 'a', label: 'b' }]; }, 'schema-invalid', /^\/groups\/0\/subgroups\/0\/scenes\/0\/editable_fields\/0\/value$/);
    expectCode((data) => { data.init_banner.title = 1; }, 'schema-invalid', /^\/init_banner\/title$/);
    expectCode((data) => { data.init_banner.steps = [1]; }, 'schema-invalid', /^\/init_banner\/steps\/0$/);
    expectCode((data) => { data.contact.items[0].value = 1; }, 'schema-invalid', /^\/contact\/items\/0\/value$/);
    expectCode((data) => { data.contact.copy_all = 1; }, 'schema-invalid', /^\/contact\/copy_all$/);
    expectCode((data) => { data.version = 1; }, 'schema-invalid', /^\/version$/);
    expectCode((data) => { data.recommendations[0].name = 1; }, 'schema-invalid', /^\/recommendations\/0\/name$/);
    expectCode((data) => { data.meta_blocks[0].html = 1; }, 'schema-invalid', /^\/meta_blocks\/0\/html$/);
    expectCode((data) => { data.meta_blocks = [{}]; }, 'schema-invalid', /^\/meta_blocks\/0\/id$/);
  });

  it('空 scenes[] → schema-invalid（裁定 R11：SCENE_DATA_SCHEMA.minItems=1）', () => {
    const scenes = (data) => data.groups[0].subgroups[0].scenes;
    assert.equal(SCENE_DATA_SCHEMA.properties.groups.items.properties.subgroups.items.properties.scenes.minItems, 1,
      '机读权威必须带 minItems（R11）');
    expectCode((data) => { scenes(data).length = 0; }, 'schema-invalid', /^\/groups\/0\/subgroups\/0\/scenes$/);
    expectCode((data) => { data.groups[0].subgroups[0].scenes = []; }, 'schema-invalid', /^\/groups\/0\/subgroups\/0\/scenes$/);
  });

  it('sceneData 非对象／缺席 → schema-invalid（不逃逸 TypeError）', () => {
    for (const bad of [null, undefined, 42, 'x', []]) {
      const error = (() => {
        try {
          renderHelpShell({ sceneData: bad, assets: ASSETS });
          return null;
        } catch (caught) {
          return caught;
        }
      })();
      assert.equal(error instanceof HelpSchemaError, true, '必须抛 HelpSchemaError：' + JSON.stringify(bad));
      assert.equal(error.code, 'schema-invalid');
      assert.equal(error.path, '/');
      seenCodes.add(error.code);
    }
    const error = (() => {
      try {
        renderHelpShell(undefined);
        return null;
      } catch (caught) {
        return caught;
      }
    })();
    assert.equal(error instanceof HelpSchemaError, true);
    assert.equal(error.code, 'schema-invalid');
    seenCodes.add(error.code);
  });

  it('判定次序：duplicate-id → status-invalid → types-invalid → schema-invalid（首个命中即抛）', () => {
    expectCode((data) => {
      data.groups[1].subgroups[0].scenes[0].id = 'home_today_overview';
      firstScene(data).status = '开发中';
      firstScene(data).types = [42];
      delete data.skill_name;
    }, 'duplicate-id', /\/id$/);
    expectCode((data) => {
      firstScene(data).status = '开发中';
      firstScene(data).types = [42];
      delete data.skill_name;
    }, 'status-invalid', /\/status$/);
    expectCode((data) => {
      firstScene(data).types = [42];
      delete data.skill_name;
    }, 'types-invalid', /\/types\/0$/);
    expectCode((data) => { delete data.skill_name; }, 'schema-invalid', /^\/skill_name$/);
  });

  it('四个错误码逐条可达（本 describe 覆盖全 HELP_SCHEMA_ERROR_CODES）', () => {
    assert.deepEqual([...seenCodes].sort(), [...HELP_SCHEMA_ERROR_CODES].sort());
  });

  it('HelpSchemaError 不从 src/index.ts 导出（与 TemplateError／ControlsError 同口径）', () => {
    assert.equal('HelpSchemaError' in indexExports, false);
    assert.equal(typeof HelpSchemaError, 'function');
    assert.equal(typeof indexExports.escapeHtml, 'function', '对照组：既有出口仍在');
  });

  it('校验先于填充：非法数据 ＋ 缺资产 → HelpSchemaError（不是 asset-missing）', () => {
    const error = (() => {
      try {
        renderHelpShell({ sceneData: { skill_name: 'x' }, assets: { sharedHelpersJs: '', sharedCssText: '' } });
        return null;
      } catch (caught) {
        return caught;
      }
    })();
    assert.equal(error instanceof HelpSchemaError, true);
    assert.equal(error.code, 'schema-invalid');
    seenCodes.add(error.code);
  });

  it('合法数据 ＋ 空资产 → 校验通过后由 fillTemplate 抛 asset-missing（壳不自填）', () => {
    // W15：断**具体错误形态**（name ＋ code），不用 `notEqual(error, null)`
    assert.throws(
      () => renderHelpShell({ sceneData: fixtureData(), assets: { sharedHelpersJs: '', sharedCssText: '' } }),
      { name: 'TemplateError', code: 'asset-missing' },
      '空资产必须抛 TemplateError code=asset-missing（壳不得自填）',
    );
  });

  it('strict 原样透传给 fillTemplate：SceneData 非信封 → strict-invalid', () => {
    assert.throws(
      () => renderHelpShell({ sceneData: fixtureData(), assets: ASSETS, strict: true }),
      { name: 'TemplateError', code: 'strict-invalid' },
      'strict:true 必须原样透传并由 fillTemplate 抛 strict-invalid',
    );
  });

  it('template 覆盖生效：走调用方模板，不再产内置壳', () => {
    const template = '<div id="custom-shell">' + TEMPLATE_MARKERS.sharedCss
      + TEMPLATE_MARKERS.sharedHelpers
      + ASSET_WRAPPERS.sharedHelpersJs.openTag.slice(0, -1) + ' id="' + CONTAINER_CHECK_RULE.id
      + '" type="' + CONTAINER_CHECK_RULE.type + '">' + TEMPLATE_MARKERS.injectData
      + ASSET_WRAPPERS.sharedHelpersJs.closeTag + '</div>';
    const out = renderHelpShell({ sceneData: fixtureData(), assets: ASSETS, template });
    assert.equal(out.html.includes('id="custom-shell"'), true);
    assert.equal(out.html.includes('id="' + HELP_SHELL_ID + '"'), false);
    assert.equal(out.report.markers.find((marker) => marker.key === 'injectData').count, 1);
  });
});

/* ── ⑤ 逐字段转义 ────────────────────────────────────────── */

describe('renderHelpShell：逐字段转义（AC-14；meta_blocks[].html 唯一豁免）', () => {
  /** 五个危险字符一次到位：`<` `>` `"` `'` `&`。 */
  const RAW = '<script>"\'&';
  const ESCAPED = '&lt;script&gt;&quot;&#39;&amp;';

  /** 逐字段用例：`mutate` 把载荷写进该字段；`prefix` 用于渲染时会加前缀的字段。 */
  const CASES = [
    ['skill_name', (data) => { data.skill_name = RAW; }, ''],
    ['title', (data) => { data.title = RAW; }, ''],
    ['subtitle', (data) => { data.subtitle = RAW; }, ''],
    ['init_banner.title', (data) => { data.init_banner.title = RAW; }, ''],
    ['init_banner.subtitle', (data) => { data.init_banner.subtitle = RAW; }, ''],
    ['init_banner.button_text', (data) => { data.init_banner.button_text = RAW; }, ''],
    ['init_banner.prompt', (data) => { data.init_banner.prompt = RAW; }, ''],
    ['init_banner.steps[0]', (data) => { data.init_banner.steps[0] = RAW; }, ''],
    ['contact.items[0].label', (data) => { data.contact.items[0].label = RAW; }, ''],
    ['contact.items[0].value', (data) => { data.contact.items[0].value = RAW; }, ''],
    ['contact.copy_all', (data) => { data.contact.copy_all = RAW; }, ''],
    ['version', (data) => { data.version = RAW; }, 'v'],
    ['recommendations[0].name', (data) => { data.recommendations[0].name = RAW; }, ''],
    ['recommendations[0].reason', (data) => { data.recommendations[0].reason = RAW; }, ''],
    ['recommendations[0].wake_word', (data) => { data.recommendations[0].wake_word = RAW; }, ''],
    ['groups[0].id', (data) => { data.groups[0].id = RAW; }, ''],
    ['groups[0].icon', (data) => { data.groups[0].icon = RAW; }, ''],
    ['groups[0].label', (data) => { data.groups[0].label = RAW; }, ''],
    ['groups[0].subgroups[0].id', (data) => { data.groups[0].subgroups[0].id = RAW; }, ''],
    ['groups[0].subgroups[0].label', (data) => { data.groups[0].subgroups[0].label = RAW; }, ''],
    ['scenes[0].id', (data) => { firstScene(data).id = RAW; }, ''],
    ['scenes[0].title', (data) => { firstScene(data).title = RAW; }, ''],
    ['scenes[0].wake_word', (data) => { firstScene(data).wake_word = RAW; }, ''],
    ['scenes[0].prompt_template', (data) => { firstScene(data).prompt_template = RAW; }, ''],
    ['scenes[0].types[0]（字符串形态）', (data) => { firstScene(data).types[0] = RAW; }, ''],
    ['scenes[0].types[1].text', (data) => { firstScene(data).types[1].text = RAW; }, ''],
    ['scenes[0].types[1].bg', (data) => { firstScene(data).types[1].bg = RAW; }, ''],
    ['scenes[0].types[1].fg', (data) => { firstScene(data).types[1].fg = RAW; }, ''],
    ['editable_fields[0].name', (data) => { firstScene(data).editable_fields[0].name = RAW; }, ''],
    ['editable_fields[0].label', (data) => { firstScene(data).editable_fields[0].label = RAW; }, ''],
    ['editable_fields[0].value', (data) => { firstScene(data).editable_fields[0].value = RAW; }, ''],
    ['editable_fields[0].hint', (data) => { firstScene(data).editable_fields[0].hint = RAW; }, ''],
    ['meta_blocks[0].id', (data) => { data.meta_blocks[0].id = RAW; }, ''],
    ['meta_blocks[0].title', (data) => { data.meta_blocks[0].title = RAW; }, ''],
  ];

  it('每个 sceneData 文本字段都渲染且经 escapeHtml（逐字段）', () => {
    for (const [name, mutate, prefix] of CASES) {
      const { output, error } = attempt(mutate);
      // W16：断「不抛错」＋ 产出**结构**（数据页三标记各 1），不用 `notEqual(output, null)`
      assert.equal(error, null, '合法数据不得抛错：' + name);
      assert.deepEqual(
        output.report.markers.filter((marker) => marker.count === 1).map((marker) => marker.key),
        ['injectData', 'sharedHelpers', 'sharedCss'],
        '每例产出都必须是数据页（三必需标记各 1）：' + name,
      );
      const shell = shellPart(output.html);
      assert.equal(shell.includes(prefix + ESCAPED), true, '字段未渲染或未转义：' + name);
      assert.equal(shell.includes(RAW), false, '字段未转义：' + name);
    }
  });

  it('meta_blocks[].html 原样透传（唯一豁免，不转义）', () => {
    const { output } = attempt((data) => { data.meta_blocks[0].html = RAW; });
    const shell = shellPart(output.html);
    assert.equal(shell.includes(RAW), true, 'meta html 必须原样透传');
    assert.equal(shell.includes(ESCAPED), false, 'meta html 不得被转义');
  });

  it('数据载荷里的 `<` 由填充器转义（JSON 不断标签，数据保真）', () => {
    const { output } = attempt((data) => { firstScene(data).title = RAW; });
    const open = payloadOpenTag();
    const start = output.html.indexOf(open) + open.length;
    const end = output.html.indexOf(ASSET_WRAPPERS.sharedHelpersJs.closeTag, start);
    const payload = output.html.slice(start, end);
    assert.equal(payload.includes('<'), false, 'JSON 载荷内不得出现裸 <');
    assert.equal(JSON.parse(payload).groups[0].subgroups[0].scenes[0].title, RAW, '载荷必须保真');
  });
});

/* ── ⑥ 模块纯度与模板字面量唯一真相 ───────────────────────── */

/** 剥注释（与 `test/contract-signatures.test.mjs` 的 `stripJsComments()` 同口径：注释不参与纯度判定）。 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('renderHelpShell：模块纯度与单一真相（R8／R13）', () => {
  const distPath = fileURLToPath(new URL('../dist/help.js', import.meta.url));
  const srcPath = fileURLToPath(new URL('../src/help.ts', import.meta.url));
  const distCode = stripComments(readFileSync(distPath, 'utf8'));
  const srcCode = stripComments(readFileSync(srcPath, 'utf8'));

  it('dist/help.js（剥注释）：零 DOM／零 node:／零第三方 import', () => {
    for (const needle of ['document.', 'window.', 'globalThis.', 'node:', 'require(']) {
      assert.equal(distCode.includes(needle), false, '模块纯度违规：' + needle);
    }
    const specifiers = [...distCode.matchAll(/from\s*'([^']+)'/g)].map((match) => match[1]).sort();
    assert.deepEqual(specifiers, [
      './contract.js', './spec/controls.js', './spec/help.js', './spec/style.js', './spec/template.js',
      './style.js', './template.js',
    ], '依赖面必须恰为包内相对路径（零第三方；含被消费的 CONTROL_STYLE_SECTIONS 所在模块）');
    for (const specifier of specifiers) {
      assert.equal(specifier.indexOf('./') === 0 || specifier.indexOf('../') === 0, true, '第三方依赖：' + specifier);
    }
  });

  it('src/help.ts（剥注释）不写标记／包裹标签字面量（恒读 TEMPLATE_MARKERS／ASSET_WRAPPERS）', () => {
    for (const literal of Object.values(TEMPLATE_MARKERS)) {
      assert.equal(srcCode.includes(literal), false, '不得写标记字面量：' + literal);
    }
    for (const wrapper of Object.values(ASSET_WRAPPERS)) {
      assert.equal(srcCode.includes(wrapper.openTag), false, '不得写包裹开标签：' + wrapper.openTag);
      assert.equal(srcCode.includes(wrapper.closeTag), false, '不得写包裹闭标签：' + wrapper.closeTag);
    }
    assert.equal(srcCode.includes('TEMPLATE_MARKERS.injectData'), true, '正控：必须引用冻结标记常量');
    assert.equal(srcCode.includes('ASSET_WRAPPERS'), true, '正控：必须引用冻结包裹常量');
    assert.equal(srcCode.includes('HELP_COPY_ACTIONS'), true, '正控：必须引用冻结复制表');
    assert.equal(srcCode.includes('ACTION_ID_ATTR'), true);
    assert.equal(srcCode.includes('DEFAULT_DATA_ATTR'), true);
  });

  it('src/help.ts（剥注释）不写字面量属性名／命名空间（FX-78-V2b-2／3 负控）', () => {
    // 负控①：属性名恒读冻结常量，不得写死 `'data-action-id'`／`'data-t'` 字面量
    assert.equal(srcCode.includes("'data-action-id'"), false, '不得写死 actionId 属性名字面量');
    assert.equal(srcCode.includes('"data-action-id"'), false, '不得写死 actionId 属性名字面量（双引号）');
    assert.equal(srcCode.includes("'data-t'"), false, '不得写死复制文本属性名字面量');
    assert.equal(srcCode.includes('"data-t"'), false, '不得写死复制文本属性名字面量（双引号）');
    // 正控：属性名确实经冻结常量写入
    assert.equal(srcCode.includes('attr(ACTION_ID_ATTR'), true, '正控：actionId 必须经 ACTION_ID_ATTR 写入');
    assert.equal(srcCode.includes('attr(DEFAULT_DATA_ATTR'), true, '正控：复制文本必须经 DEFAULT_DATA_ATTR 写入');
    // 负控②：类名命名空间根恒由 `CONTROL_STYLE_SECTIONS` 闭集派生，不得写死 `'ilife-help-shell'`
    assert.equal(srcCode.includes("'ilife-help-shell'"), false, '不得写死类名命名空间字面量');
    assert.equal(srcCode.includes('"ilife-help-shell"'), false, '不得写死类名命名空间字面量（双引号）');
    assert.equal(srcCode.includes('CONTROL_STYLE_SECTIONS'), true, '正控：区名必须经闭集派生');
    assert.equal(srcCode.includes('HELP_SHELL_ID'), true, '正控：根元素 id 必须读冻结常量');
  });

  it('H.纯度（src 侧）：src/help.ts 模块代码零 DOM 全局／node:（W17）', () => {
    /* W17：产出侧纯度已有「dist/help.js」用例，但 `src/help.ts` **模块自身**从无仓内断言
     * （R8：模块代码零 `document.`／`window.`／`globalThis.`，DOM 只允许出现在**产出文本**里）。
     * 口径与 A1c 的 `charts.test.mjs`「H.纯度（src 侧）」一致：剥注释 → 剥字面量 → 逐项零命中。 */
    const raw = readFileSync(srcPath, 'utf8');
    const code = stripComments(raw)
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    // 防剥空后恒真：剥完必须还是模块代码
    assert.equal(code.includes('function buildShellTemplate'), true, '剥注释／字面量后仍含模块代码');
    assert.equal(code.includes('export function renderHelpShell'), true, '导出语句仍在');
    assert.equal(code.length > 2000, true, '剥完的源码不得被清空（实读 ' + code.length + ' 字符）');
    for (const needle of ['document.', 'window.', 'globalThis.', 'node:', 'require(']) {
      assert.equal(occurrences(code, needle), 0, '模块代码不得含 ' + needle);
    }
    // 反向对照：剥字面量确实生效（原源码里存在 `<meta charset="utf-8">` 这类串）
    assert.equal(raw.includes('<meta charset="utf-8">'), true, '正控：原源码含产出串');
    assert.equal(code.includes('<meta charset="utf-8">'), false, '正控：剥字面量后产出串不再参与判定');
  });

  it('内置壳模板不导出（R13）：dist/help.js 导出面恰为 renderHelpShell ＋ HelpSchemaError', async () => {
    const module = await import('../dist/help.js');
    assert.deepEqual(Object.keys(module).sort(), ['HelpSchemaError', 'renderHelpShell']);
  });
});
