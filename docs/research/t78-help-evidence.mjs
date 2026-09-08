// #78 施工 A2 · HELP 壳可复跑证据（`node .scratch/t78/a2-evidence.mjs`，输出逐字节稳定）。
//
// 快照内容：① 占位符逐标记计数 ② 载荷容器 ③ 结构锚点 ④ 复制按钮表 ⑤ 错误码可达表
//          ⑥ 逐字段转义表 ⑦ 模块纯度 ⑧ 产物 SHA256／字节数。
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { HelpSchemaError, renderHelpShell } from '../../packages/base-render/dist/help.js';
import {
  ACTION_ID_ATTR,
  ASSET_WRAPPERS,
  CONTAINER_CHECK_RULE,
  CONTROL_STYLE_SECTIONS,
  DEFAULT_DATA_ATTR,
  HELP_COPY_ACTIONS,
  HELP_COPY_TARGETS,
  HELP_SCHEMA_ERROR_CODES,
  HELP_SHELL_ID,
  SCENE_STATUS,
  STYLE_PREFIX,
  TEMPLATE_MARKERS,
  escapeHtml,
} from '../../packages/base-render/dist/index.js';

const LF = String.fromCharCode(10);
const CLS = STYLE_PREFIX + 'helpShell'.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
const ASSETS = { sharedHelpersJs: '(function(){var a=1;return a;})();', sharedCssText: '.ilife-fake{color:red}' };
const PAYLOAD_OPEN = ASSET_WRAPPERS.sharedHelpersJs.openTag.slice(0, -1)
  + ' id="' + CONTAINER_CHECK_RULE.id + '" type="' + CONTAINER_CHECK_RULE.type + '">';

function fixture() {
  return {
    skill_name: '卡路里',
    title: '能力速查台',
    subtitle: '饮食 · 运动 · 目标',
    version: '1.2.3',
    init_banner: {
      title: '第一次用卡路里', subtitle: '初始化一次即可', button_text: '开始初始化',
      prompt: '请你加载技能 卡路里,执行初始化。', steps: ['检测环境', '初始化数据库', '校验'],
    },
    meta_blocks: [{ id: 'usage_rules', title: '使用须知', html: '<p><b>原文</b>透传</p>' }],
    contact: { items: [{ label: '作者', value: '@feather' }], copy_all: '一键复制全部联系信息' },
    recommendations: [{ name: '作息管家', reason: '作息记录', wake_word: '记作息' }],
    groups: [
      {
        id: 'home', icon: '🏠', label: '主页',
        subgroups: [
          {
            id: 'home_today', label: '今日',
            scenes: [
              {
                id: 'home_today_overview', title: '看今日主页', wake_word: '看今日主页',
                types: ['结果', { text: '过程', bg: '#fff3e0', fg: '#b25b00' }], status: '',
                prompt_template: '请你加载技能 卡路里,执行唤醒词「看今日主页」。' + LF + LF + '我想看今天的主页 dashboard。',
                editable_fields: [
                  { name: 'date', label: '日期', value: '2026-09-09', hint: 'YYYY-MM-DD', required: true },
                  { name: 'note', label: '备注', value: '', hint: '可留空' },
                ],
              },
              { id: 'home_today_trend', title: '看趋势', wake_word: '看趋势', status: '【待开发】', prompt_template: '看趋势。' },
            ],
          },
        ],
      },
      {
        id: 'diet', label: '饮食',
        subgroups: [
          { id: 'diet_log', label: '记录', scenes: [{ id: 'diet_add', title: '记饮食', wake_word: '记饮食', types: ['采集'], status: '', prompt_template: '记饮食。' }] },
        ],
      },
    ],
  };
}

function occurrences(haystack, needle) {
  let count = 0;
  let at = haystack.indexOf(needle);
  while (at >= 0) { count += 1; at = haystack.indexOf(needle, at + needle.length); }
  return count;
}

function attempt(mutate) {
  const data = fixture();
  if (mutate) mutate(data);
  try { return { error: null, output: renderHelpShell({ sceneData: data, assets: ASSETS }) }; }
  catch (error) { return { error, output: null }; }
}

const out = renderHelpShell({ sceneData: fixture(), assets: ASSETS });
const html = out.html;
const bytes = new TextEncoder().encode(html).length;
const sha = createHash('sha256').update(html, 'utf8').digest('hex').toUpperCase();

/* ① 占位符逐标记计数 */
const markers = out.report.markers.map((marker) => ({
  key: marker.key, literal: marker.literal, rule: marker.rule, count: marker.count, filled: marker.filled,
}));

/* ② 载荷容器 */
const payloadStart = html.indexOf(PAYLOAD_OPEN) + PAYLOAD_OPEN.length;
const payloadEnd = html.indexOf(ASSET_WRAPPERS.sharedHelpersJs.closeTag, payloadStart);
const payloadText = html.slice(payloadStart, payloadEnd);
const payload = {
  openTag: PAYLOAD_OPEN,
  containerCount: occurrences(html, PAYLOAD_OPEN),
  parses: JSON.parse(payloadText) !== null,
  roundTripEqual: JSON.stringify(JSON.parse(payloadText)) === JSON.stringify(fixture()),
  bareLtInJson: payloadText.includes('<'),
  chars: payloadText.length,
};

/* ③ 结构锚点（含 R31 的完整文档锚点） */
const ids = [...html.matchAll(/ id="([^"]*)"/g)].map((match) => match[1]);
const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap((match) => match[1].split(' ')).filter((token) => token !== '');
const headEnd = html.indexOf('</head>');
const structure = {
  rootId: HELP_SHELL_ID,
  rootClass: CLS,
  rootElementPresent: html.includes('<section class="' + CLS + '" id="' + HELP_SHELL_ID + '">'),
  document: {
    startsWithDoctype: html.slice(0, '<!DOCTYPE html>'.length) === '<!DOCTYPE html>',
    htmlLang: html.includes('<html lang="zh-CN">'),
    charset: html.includes('<meta charset="utf-8">'),
    viewport: html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'),
    title: /<title>([\s\S]*?)<\/title>/.exec(html)[1],
    endsWithHtml: html.slice(-'</html>'.length) === '</html>',
    cssInHead: html.slice(0, headEnd).includes(ASSET_WRAPPERS.sharedCssText.openTag + ASSETS.sharedCssText + ASSET_WRAPPERS.sharedCssText.closeTag),
    payloadInBody: html.slice(headEnd).includes(PAYLOAD_OPEN),
    scriptInHead: html.slice(0, headEnd).includes('<script'),
  },
  idCount: ids.length,
  idUnique: new Set(ids).size === ids.length,
  classNamespaceOk: classes.every((token) => token === CLS || token.indexOf(CLS + '-') === 0),
  classCount: classes.length,
  radioCount: occurrences(html, 'type="radio"'),
  checkedCount: occurrences(html, ' checked>'),
  detailsCount: occurrences(html, '<details'),
  summaryCount: occurrences(html, '<summary'),
  articleCount: occurrences(html, '<article'),
  scriptCount: occurrences(html, '<script'),
  canvasCount: occurrences(html, '<canvas'),
  inlineHandlerCount: ['onclick=', 'onload=', 'onerror=', 'onchange=', 'oninput='].filter((h) => html.includes(h)).length,
  metaHtmlRaw: html.includes('<p><b>原文</b>透传</p>'),
  // R32：CLI 形态文本 = Scene.id 原文（逐字）；畸形拼接串必须 0 次
  cliTexts: ['home_today_overview', 'home_today_trend', 'diet_add']
    .filter((cli) => html.includes('<code class="' + CLS + '-cli">' + cli + '</code>')),
  cliCodeCount: occurrences(html, '<code class="' + CLS + '-cli">'),
  cliMalformed: ['卡路里.home.home_today_overview', '卡路里.home.home_today_trend', '卡路里.diet.diet_add']
    .filter((cli) => html.includes(cli)),
  devBadgeCount: occurrences(html, '>' + SCENE_STATUS[1] + '</span>'),
  oldWording: html.includes('复制 prompt'),
};

/* ④ 复制按钮表 */
const buttons = HELP_COPY_TARGETS.map((target) => {
  const action = HELP_COPY_ACTIONS[target];
  const re = new RegExp('<button[^>]*' + ACTION_ID_ATTR + '="' + action.actionId + '"[^>]*>([^<]*)</button>', 'g');
  const found = [...html.matchAll(re)];
  return {
    target,
    actionId: action.actionId,
    label: action.label,
    buttons: found.length,
    labels: [...new Set(found.map((match) => match[1]))],
    attrName: ACTION_ID_ATTR,
    textAttr: DEFAULT_DATA_ATTR,
    promptDataT: target === 'prompt'
      ? html.includes(DEFAULT_DATA_ATTR + '="' + escapeHtml('请你加载技能 卡路里,执行唤醒词「看今日主页」。' + LF + LF + '我想看今天的主页 dashboard。') + '"')
      : null,
    paramsDataT: target === 'params' ? html.includes(DEFAULT_DATA_ATTR + '="日期: 2026-09-09"') : null,
  };
});

/* ⑤ 错误码可达表 */
const firstScene = (data) => data.groups[0].subgroups[0].scenes[0];
const codeCases = [
  ['duplicate-id', (data) => { data.groups[1].subgroups[0].scenes[0].id = 'home_today_overview'; }],
  ['status-invalid', (data) => { firstScene(data).status = '开发中'; }],
  ['types-invalid', (data) => { firstScene(data).types = ['结果', 42]; }],
  ['schema-invalid/必填', (data) => { delete data.skill_name; }],
  ['schema-invalid/minLength', (data) => { data.skill_name = ''; }],
  ['schema-invalid/多余字段', (data) => { data.extra = 1; }],
  ['schema-invalid/空 scenes', (data) => { data.groups[0].subgroups[0].scenes = []; }],
  ['schema-invalid/oneOf', (data) => { firstScene(data).types = [{ text: 'x', foo: 1 }]; }],
  ['schema-invalid/非对象', () => {}],
];
const codeTable = codeCases.map(([name, mutate], index) => {
  if (name === 'schema-invalid/非对象') {
    try { renderHelpShell({ sceneData: null, assets: ASSETS }); return { case: name, code: '(未抛错)', path: '' }; }
    catch (error) { return { case: name, code: error.code, path: error.path, isHelpSchemaError: error instanceof HelpSchemaError }; }
  }
  const { error } = attempt(mutate);
  return { case: name, code: error === null ? '(未抛错)' : error.code, path: error === null ? '' : error.path, isHelpSchemaError: error instanceof HelpSchemaError };
});
const orderCase = attempt((data) => {
  data.groups[1].subgroups[0].scenes[0].id = 'home_today_overview';
  firstScene(data).status = '开发中';
  firstScene(data).types = [42];
  delete data.skill_name;
});

/* ⑥ 逐字段转义表 */
const RAW = '<script>"\'&';
const ESCAPED = '&lt;script&gt;&quot;&#39;&amp;';
const escapeCases = [
  ['skill_name', (d) => { d.skill_name = RAW; }], ['title', (d) => { d.title = RAW; }],
  ['subtitle', (d) => { d.subtitle = RAW; }], ['init_banner.title', (d) => { d.init_banner.title = RAW; }],
  ['init_banner.button_text', (d) => { d.init_banner.button_text = RAW; }],
  ['init_banner.steps[0]', (d) => { d.init_banner.steps[0] = RAW; }],
  ['contact.items[0].value', (d) => { d.contact.items[0].value = RAW; }],
  ['contact.copy_all', (d) => { d.contact.copy_all = RAW; }], ['version', (d) => { d.version = RAW; }],
  ['recommendations[0].wake_word', (d) => { d.recommendations[0].wake_word = RAW; }],
  ['groups[0].id', (d) => { d.groups[0].id = RAW; }], ['groups[0].icon', (d) => { d.groups[0].icon = RAW; }],
  ['groups[0].subgroups[0].id', (d) => { d.groups[0].subgroups[0].id = RAW; }],
  ['scenes[0].id', (d) => { firstScene(d).id = RAW; }], ['scenes[0].title', (d) => { firstScene(d).title = RAW; }],
  ['scenes[0].types[0]', (d) => { firstScene(d).types[0] = RAW; }],
  ['scenes[0].types[1].bg', (d) => { firstScene(d).types[1].bg = RAW; }],
  ['editable_fields[0].label', (d) => { firstScene(d).editable_fields[0].label = RAW; }],
  ['editable_fields[0].value', (d) => { firstScene(d).editable_fields[0].value = RAW; }],
  ['editable_fields[0].hint', (d) => { firstScene(d).editable_fields[0].hint = RAW; }],
  ['meta_blocks[0].title', (d) => { d.meta_blocks[0].title = RAW; }],
  ['meta_blocks[0].html（豁免）', (d) => { d.meta_blocks[0].html = RAW; }],
];
const escapeTable = escapeCases.map(([name, mutate]) => {
  const { output } = attempt(mutate);
  const shell = output.html.slice(0, output.html.indexOf(PAYLOAD_OPEN));
  const exempt = name.indexOf('豁免') >= 0;
  return { field: name, escaped: shell.includes(ESCAPED), raw: shell.includes(RAW), ok: exempt ? (shell.includes(RAW) && !shell.includes(ESCAPED)) : (shell.includes(ESCAPED) && !shell.includes(RAW)) };
});

/* ⑥b `<title>` 注入探针（R31） */
const titleProbe = attempt((d) => { d.title = RAW; }).output.html;
const titleTag = /<title>([\s\S]*?)<\/title>/.exec(titleProbe)[1];
const documentTitleProbe = {
  titleText: titleTag,
  escaped: titleTag === ESCAPED + ' · 卡路里',
  noScriptInHead: titleProbe.slice(0, titleProbe.indexOf('</head>')).includes('<script') === false,
  scriptCount: occurrences(titleProbe, '<script'),
};

/* ⑥c 多字段 `params` 的 LF 连接探针（FX-78-V2b-1） */
const multiFieldHtml = attempt((d) => {
  firstScene(d).editable_fields = [
    { name: 'from', label: 'A', value: '1' },
    { name: 'to', label: 'B', value: '2' },
  ];
}).output.html;
const LF_JOINED = 'A: 1' + LF + 'B: 2';
const paramsMultiField = {
  expected: LF_JOINED,
  lfJoinedPresent: multiFieldHtml.includes(DEFAULT_DATA_ATTR + '="' + LF_JOINED + '"'),
  commaFormPresent: multiFieldHtml.includes(DEFAULT_DATA_ATTR + '="A: 1,B: 2"'),
  spaceFormPresent: multiFieldHtml.includes(DEFAULT_DATA_ATTR + '="A: 1 B: 2"'),
  firstFieldOnlyPresent: multiFieldHtml.includes(DEFAULT_DATA_ATTR + '="A: 1"'),
};

/* ⑥d chip 恒取 `wake_word`（FX-78-V2b-4：`title` 与 `wake_word` 逐字不同） */
const chipProbeHtml = attempt((d) => {
  firstScene(d).title = 'TITLE-ONLY';
  firstScene(d).wake_word = 'WAKE-ONLY';
}).output.html;
const chipProbe = {
  chipText: new RegExp('<span class="' + CLS + '-chip">([^<]*)</span>').exec(chipProbeHtml)[1],
  equalsWakeWord: chipProbeHtml.includes('<span class="' + CLS + '-chip">WAKE-ONLY</span>'),
  equalsTitle: chipProbeHtml.includes('<span class="' + CLS + '-chip">TITLE-ONLY</span>'),
};

/* ⑦ 模块纯度 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
const distCode = stripComments(readFileSync(fileURLToPath(new URL('../../packages/base-render/dist/help.js', import.meta.url)), 'utf8'));
const srcCode = stripComments(readFileSync(fileURLToPath(new URL('../../packages/base-render/src/help.ts', import.meta.url)), 'utf8'));
const purity = {
  distForbidden: ['document.', 'window.', 'globalThis.', 'node:', 'require('].filter((needle) => distCode.includes(needle)),
  distSpecifiers: [...distCode.matchAll(/from\s*'([^']+)'/g)].map((match) => match[1]),
  srcMarkerLiterals: Object.values(TEMPLATE_MARKERS).filter((literal) => srcCode.includes(literal)),
  srcWrapperLiterals: Object.values(ASSET_WRAPPERS).flatMap((wrapper) => [wrapper.openTag, wrapper.closeTag]).filter((tag) => srcCode.includes(tag)),
  // FX-78-V2b-2／3 负控：属性名／命名空间字面量必须 0 次（剥注释后的源码）
  srcAttributeLiterals: ["'data-action-id'", '"data-action-id"', "'data-t'", '"data-t"'].filter((lit) => srcCode.includes(lit)),
  srcClassRootLiterals: ["'ilife-help-shell'", '"ilife-help-shell"'].filter((lit) => srcCode.includes(lit)),
};

const snapshot = {
  contract: {
    helpShellId: HELP_SHELL_ID,
    copyTargets: [...HELP_COPY_TARGETS],
    copyActions: HELP_COPY_ACTIONS,
    schemaErrorCodes: [...HELP_SCHEMA_ERROR_CODES],
    styleSection: CONTROL_STYLE_SECTIONS.includes('helpShell'),
  },
  markers,
  payload,
  structure,
  buttons,
  codeTable,
  orderCase: orderCase.error === null ? '(未抛错)' : { code: orderCase.error.code, path: orderCase.error.path },
  escapeTable,
  documentTitleProbe,
  paramsMultiField,
  chipProbe,
  purity,
  output: { bytes, sha256: sha, textEncoderBytes: bytes },
};
console.log(JSON.stringify(snapshot, null, 2));
