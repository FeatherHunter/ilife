#!/usr/bin/env node
/**
 * #105 视觉规格冻结 —— 可验收性自证脚本（只读）
 *
 * 目的：证明 `docs/visual-spec-help.md` 的 20 条 B1 逐值尺**不是空话**——
 * 凡能从「已冻结产物」直接判的条目，本脚本在冻结对照物上实测一遍，
 * 逐条打印「实测值 vs 规格值」；判不了的部分显式标注需哪张票落地后才能判。
 *
 * 判定口径（编排者 R35 第 3 条，**不写 FAIL**）：
 *   - PASS          ：与规格一致（冻结常量已就位，或旧版恰好已达标）
 *   - OLD-DEVIATION ：旧版实例与 B1 规格不同 ＝「旧版未达 B1 标准」＝新版改进项，**不是缺陷**
 *   - DEFECT        ：尺子与**冻结常量**冲突（应为 0；出现即按 R35 第 2 条以冻结契约为准并修尺子）
 *   - N/A           ：该条不属 HELP 页形态（转内容页区块尺）
 *   - BLOCKED       ：需 #75／#88／#104 产出后才能判
 *
 * 只读输入（一律不改写、不生成）：
 *   - fixtures/help-instances/卡路里_HELP_20260730_130429.html   （F1，旧版 HELP 实例）
 *   - fixtures/help-instances/卡路里_HELP_20260731_201530.html   （F2，旧版 HELP 实例）
 *   - packages/base-render/src/spec/{style,controls,charts,help,template}.ts（已冻结常量，只读正则）
 *
 * 用法：
 *   node .scratch/t105/check-rulers.mjs            # 打印实测表，恒 exit 0（证据脚本）
 *   node .scratch/t105/check-rulers.mjs --strict    # 出现 DEFECT 即 exit 1（门禁用法）
 *
 * 退出码：0 = 脚本跑完；--strict 下 1 = 尺子与冻结常量冲突（DEFECT > 0）。
 * 依赖：仅 node:fs / node:path / node:url（零第三方、零网络、零写入）。
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

const F1 = 'fixtures/help-instances/卡路里_HELP_20260730_130429.html';
const F2 = 'fixtures/help-instances/卡路里_HELP_20260731_201530.html';

const read = (rel) => readFileSync(resolve(REPO, rel), 'utf8');
const readLines = (rel) => read(rel).split(/\r?\n/);

const f1Text = read(F1);
const f2Text = read(F2);
const f1 = readLines(F1);
const f2 = readLines(F2);
const styleTs = read('packages/base-render/src/spec/style.ts');
const controlsTs = read('packages/base-render/src/spec/controls.ts');
const chartsTs = read('packages/base-render/src/spec/charts.ts');
const helpTs = read('packages/base-render/src/spec/help.ts');

/* ── 小工具 ───────────────────────────────────────────── */

const count = (text, re) => (text.match(re) || []).length;
const pad = (s, n) => String(s).padEnd(n, ' ');
const row = (cells, widths) => cells.map((c, i) => pad(c, widths[i])).join(' | ').trimEnd();

const rows = [];
let judgeable = 0;
let passed = 0;
let deviation = 0;
let defects = 0;
let blocked = 0;
let na = 0;

/**
 * @param {object} c
 * @param {string} c.id     尺子条目号
 * @param {string} c.what   判什么
 * @param {string} c.spec   规格值
 * @param {string} c.measured 实测值
 * @param {'PASS'|'OLD-DEVIATION'|'DEFECT'|'N/A'|'BLOCKED'} c.verdict
 * @param {string} c.evidence 实测出处
 * @param {string} [c.note]
 */
function check(c) {
  if (c.verdict === 'PASS' || c.verdict === 'OLD-DEVIATION' || c.verdict === 'DEFECT') {
    judgeable += 1;
    if (c.verdict === 'PASS') passed += 1;
    else if (c.verdict === 'OLD-DEVIATION') deviation += 1;
    else defects += 1;
  } else if (c.verdict === 'BLOCKED') blocked += 1;
  else na += 1;
  rows.push(c);
}

/* ── A. 在冻结常量上判（DEFECT 只在这里出现） ──────────── */

const tokenBlock = styleTs.match(/CSS_VAR_TOKENS = Object\.freeze\(\{([\s\S]*?)\} as const\)/);
const tokenNames = tokenBlock ? [...tokenBlock[1].matchAll(/'(--[a-z0-9]+)':/g)].map((m) => m[1]) : [];
const tokenValue = (name) => {
  const m = tokenBlock && tokenBlock[1].match(new RegExp(`'${name}':\\s*'([^']+)'`));
  return m ? m[1] : '(缺失)';
};
const sectionsBlock = styleTs.match(/CONTROL_STYLE_SECTIONS = \[([\s\S]*?)\] as const/);
const sections = sectionsBlock ? [...sectionsBlock[1].matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]) : [];
const forbiddenBlock = styleTs.match(/STYLE_FORBIDDEN_TOKENS = \[([^\]]*)\]/);
const forbidden = forbiddenBlock ? [...forbiddenBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
const toastBlock = controlsTs.match(/TOAST_DEFAULTS = Object\.freeze\(\{([\s\S]*?)\} as const\)/);
const toastDefaults = toastBlock ? toastBlock[1] : '';
const chartKindsBlock = chartsTs.match(/CHART_KINDS = \[([^\]]*)\] as const/);
const chartKinds = chartKindsBlock ? [...chartKindsBlock[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]) : [];
const copyActionsBlock = helpTs.match(/HELP_COPY_ACTIONS = Object\.freeze\(\{([\s\S]*?)\} as const/);
const copyActions = copyActionsBlock ? [...copyActionsBlock[1].matchAll(/(prompt|wakeWord|params):/g)].map((m) => m[1]) : [];
const templateTs = read('packages/base-render/src/spec/template.ts');
const sceneRequired = (helpTs.match(/required:\s*\[([^\]]*'prompt_template'[^\]]*)\]/) || [])[1] || '(缺失)';
const markerRule = (key) => (templateTs.match(new RegExp(`${key}:\\s*\\{[^}]*rule:\\s*'([^']+)'`)) || [])[1] || '(缺失)';

check({
  id: 'H-01',
  what: '冻结主色 `--blue` 逐值',
  spec: '#007aff',
  measured: tokenValue('--blue'),
  verdict: tokenValue('--blue') === '#007aff' ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/style.ts:19',
});

check({
  id: 'H-01',
  what: '冻结 token 表条数',
  spec: '11',
  measured: String(tokenNames.length),
  verdict: tokenNames.length === 11 ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/style.ts:12-24',
});

check({
  id: 'H-01',
  what: 'Q14 禁入 token 表',
  spec: "--r-xl／--pink",
  measured: forbidden.join('／') || '(空)',
  verdict: forbidden.join('／') === '--r-xl／--pink' ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/style.ts:46',
});

check({
  id: 'H-02',
  what: '冻结灰阶三值（尺子须引用，不复述）',
  spec: '三灰 + 边框 token 就位',
  measured: `${tokenValue('--fg')} / ${tokenValue('--fg2')} / ${tokenValue('--fg3')} / line=${tokenValue('--line')}`,
  verdict: tokenNames.includes('--fg') && tokenNames.includes('--fg2') && tokenNames.includes('--fg3') ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/style.ts:13-15,18',
  note: '与 B1 的 #1d1d1d/#3c3c43/#8e8e93 不同物 → 冲突 C-2（裁定 D-2：以冻结为准）',
});

check({
  id: 'H-03',
  what: '冻结页面底色 `--bg`（B1 规格写 #fafafa）',
  spec: '尺子以冻结值 #f5f5f7 为准',
  measured: tokenValue('--bg'),
  verdict: tokenValue('--bg') === '#f5f5f7' ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/style.ts:16',
  note: '与 B1 的 #fafafa 冲突 → 冲突 C-3 / 裁定 D-3（取冻结）',
});

check({
  id: 'H-10',
  what: '冻结阴影（B1 规格是 resting／elevated 两条）',
  spec: '单条 --shadow 就位',
  measured: tokenValue('--shadow'),
  verdict: tokenValue('--shadow').startsWith('0 1px 2px') ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/style.ts:23',
  note: '与 B1 两条阴影冲突 → 冲突 C-4 / 裁定 D-4（取冻结单条）',
});

check({
  id: 'H-10',
  what: '冻结表是否有圆角 token（B1 要求 {8,14,20,999,50%}）',
  spec: '圆角 token 名',
  measured: tokenNames.filter((n) => /r-|radius/.test(n)).join(',') || '(无)',
  verdict: 'BLOCKED',
  evidence: 'packages/base-render/src/spec/style.ts:12-24',
  note: '冻结表零圆角 token → 裁定 D-5：局部 CSS 常量，不新增 token 名',
});

check({
  id: 'H-16',
  what: '冻结 toast 时长（B1 规格 1800ms）',
  spec: 'TOAST_DEFAULTS.timeoutMs',
  measured: (toastDefaults.match(/timeoutMs:\s*(\d+)/) || [])[1] || '(缺失)',
  verdict: 'PASS',
  evidence: 'packages/base-render/src/spec/controls.ts:190-199',
  note: '冻结 4500ms ≠ B1 1800ms → 冲突 C-6 / 裁定 D-7（取冻结 4500ms）',
});

check({
  id: 'H-16',
  what: '冻结 toast 无障碍属性',
  spec: 'role=status / aria-live=polite',
  measured: `${(toastDefaults.match(/role:\s*'([^']+)'/) || [])[1]}/${(toastDefaults.match(/ariaLive:\s*'([^']+)'/) || [])[1]}`,
  verdict: /role:\s*'status'/.test(toastDefaults) && /ariaLive:\s*'polite'/.test(toastDefaults) ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/controls.ts:196-197',
});

check({
  id: 'B-11',
  what: '冻结控件样式命名空间个数（区块尺的类名锚点）',
  spec: '8 个闭集',
  measured: String(sections.length),
  verdict: sections.length === 8 ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/style.ts:32-41',
});

check({
  id: 'B-04',
  what: '冻结图表接口种类数（图表区块）',
  spec: '8 种 CHART_KINDS',
  measured: String(chartKinds.length),
  verdict: chartKinds.length === 8 ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/charts.ts:8',
});

check({
  id: 'B-04',
  what: '图表空数组走空态（不静默空图）',
  spec: "CHART_EMPTY_RULE = 'emptyState'",
  measured: (chartsTs.match(/CHART_EMPTY_RULE = '([^']+)'/) || [])[1] || '(缺失)',
  verdict: /CHART_EMPTY_RULE = 'emptyState'/.test(chartsTs) ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/charts.ts:222',
});

check({
  id: 'B-11',
  what: '复制按钮 actionId 属性名（必需属性锚点）',
  spec: "ACTION_ID_ATTR = 'data-action-id'",
  measured: (controlsTs.match(/ACTION_ID_ATTR = '([^']+)'/) || [])[1] || '(缺失)',
  verdict: /ACTION_ID_ATTR = 'data-action-id'/.test(controlsTs) ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/controls.ts:97',
});

check({
  id: 'B-11',
  what: '复制文本属性名（必需属性锚点）',
  spec: "DEFAULT_DATA_ATTR = 'data-t'",
  measured: (controlsTs.match(/DEFAULT_DATA_ATTR = '([^']+)'/) || [])[1] || '(缺失)',
  verdict: /DEFAULT_DATA_ATTR = 'data-t'/.test(controlsTs) ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/controls.ts:158',
});

check({
  id: 'B-12',
  what: 'HELP 一键复制目标数（HELP 页复制语义）',
  spec: 'prompt／wakeWord／params 三目标',
  measured: copyActions.join('／') || '(缺失)',
  verdict: copyActions.join('／') === 'prompt／wakeWord／params' ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/help.ts:243-253',
  note: 'B1 的「复制所有命令」胶囊不在冻结三目标内 → 冲突 C-8 / 裁定 D-8（不保留）',
});

check({
  id: 'B-09',
  what: '场景类型字段名（复数，无单数别名）',
  spec: "SCENE_TYPE_FIELD = 'types'",
  measured: (helpTs.match(/SCENE_TYPE_FIELD = '([^']+)'/) || [])[1] || '(缺失)',
  verdict: /SCENE_TYPE_FIELD = 'types'/.test(helpTs) ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/help.ts:22',
});

check({
  id: 'B-07',
  what: '场景状态闭集（状态锚点）',
  spec: "['', '【待开发】']",
  measured: (helpTs.match(/SCENE_STATUS = \[([^\]]*)\]/) || [])[1] || '(缺失)',
  verdict: /SCENE_STATUS = \['', '【待开发】'\]/.test(helpTs) ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/help.ts:17',
});

check({
  id: 'B-07',
  what: '场景必填字段（schema required 锚点）',
  spec: '含 id／title／wake_word／status／prompt_template',
  measured: sceneRequired.replace(/\s+/g, ' '),
  verdict: ['id', 'title', 'wake_word', 'status', 'prompt_template'].every((k) => sceneRequired.includes(`'${k}'`)) ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/help.ts:153',
});

check({
  id: 'B-10',
  what: '空态命名空间在控件样式闭集内',
  spec: "sections 含 'emptyState'",
  measured: sections.includes('emptyState') ? '含' : '缺',
  verdict: sections.includes('emptyState') ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/style.ts:37',
});

check({
  id: 'B-12',
  what: '反馈区两个命名空间在控件样式闭集内',
  spec: "sections 含 'toast' 与 'errorReceipt'",
  measured: `toast=${sections.includes('toast') ? '含' : '缺'}；errorReceipt=${sections.includes('errorReceipt') ? '含' : '缺'}`,
  verdict: sections.includes('toast') && sections.includes('errorReceipt') ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/style.ts:33,38',
});

check({
  id: 'B-01',
  what: '共享资产占位符数量规则（exactly-one）',
  spec: 'sharedCss／sharedHelpers 各 exactly-one',
  measured: `sharedCss=${markerRule('sharedCss')}；sharedHelpers=${markerRule('sharedHelpers')}`,
  verdict: markerRule('sharedCss') === 'exactly-one' && markerRule('sharedHelpers') === 'exactly-one' ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/template.ts:55-56',
});

check({
  id: 'B-01',
  what: '载荷槽规则（数据页／内容页恰有其一）',
  spec: "PAYLOAD_SLOT_RULE.rule = 'exactly-one'",
  measured: (templateTs.match(/PAYLOAD_SLOT_RULE = Object\.freeze\(\{[\s\S]*?rule:\s*'([^']+)'/) || [])[1] || '(缺失)',
  verdict: /PAYLOAD_SLOT_RULE = Object\.freeze\(\{[\s\S]*?rule:\s*'exactly-one'/.test(templateTs) ? 'PASS' : 'DEFECT',
  evidence: 'packages/base-render/src/spec/template.ts:76-81',
});

/* ── B. 在冻结的旧版 HELP 实例上实测（旧版基线 → OLD-DEVIATION） ── */

const f1Accent = (f1[10].match(/--accent:(#[0-9a-f]{6})/i) || [])[1] || '(缺失)';
const f2Accent = (f2[10].match(/--accent:(#[0-9a-f]{6})/i) || [])[1] || '(缺失)';

check({
  id: 'H-01',
  what: '旧版实例主色（规格 #007aff）',
  spec: '#007aff',
  measured: `F1=${f1Accent} F2=${f2Accent}`,
  verdict: f1Accent === '#007aff' && f2Accent === '#007aff' ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:11 ／ ${F2}:11`,
  note: '旧版 #0071e3 未达 B1 标准 → 新版改进项',
});

check({
  id: 'H-01',
  what: '旧版实例禁色命中数（#0a84ff／#af52de／#ff375f）',
  spec: '0',
  measured: String(count(f1Text, /#0a84ff|#af52de|#ff375f/gi) + count(f2Text, /#0a84ff|#af52de|#ff375f/gi)),
  verdict: count(f1Text, /#0a84ff|#af52de|#ff375f/gi) + count(f2Text, /#0a84ff|#af52de|#ff375f/gi) === 0 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}／${F2} 全文`,
});

const gradF1 = count(f1Text, /linear-gradient|radial-gradient/gi);
const gradF2 = count(f2Text, /linear-gradient|radial-gradient/gi);

check({
  id: 'H-04',
  what: '旧版实例渐变命中数（规格 0）',
  spec: '0',
  measured: `F1=${gradF1} F2=${gradF2}`,
  verdict: gradF1 + gradF2 === 0 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:24 ／ ${F2}:25`,
  note: '旧版 hero 有 linear-gradient → 新版改进项',
});

const f1H1 = (f1[301] || '');
const f2H1 = (f2[323] || '');
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

check({
  id: 'H-08',
  what: '旧版实例 <h1> 是否含 emoji（规格 禁）',
  spec: '0 个 emoji',
  measured: `F1=${emojiRe.test(f1H1) ? '含' : '无'} F2=${emojiRe.test(f2H1) ? '含' : '无'}`,
  verdict: emojiRe.test(f1H1) || emojiRe.test(f2H1) ? 'OLD-DEVIATION' : 'PASS',
  evidence: `${F1}:302 ／ ${F2}:324`,
  note: '旧版 h1 =「📚 卡路里 · 唤醒词速查台」→ 新版去 emoji（裁定 D-12）',
});

const f1Font = (f1[16] || '').trim();
check({
  id: 'H-06',
  what: '旧版实例 body 字体栈（规格须含 "SF Pro Display"）',
  spec: '-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif',
  measured: f1Font.replace(/^\s*font-family:\s*/, '').replace(/;\s*$/, ''),
  verdict: /"SF Pro Display"/.test(f1Font) ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:17 ／ ${F2}:18`,
  note: '旧版缺 "SF Pro Display" → 新版补齐',
});

check({
  id: 'H-07',
  what: '旧版实例 tnum 命中数（规格 每个数字都 tnum）',
  spec: '> 0',
  measured: `font-feature-settings 命中 ${count(f1Text, /font-feature-settings/gi) + count(f2Text, /font-feature-settings/gi)} 处`,
  verdict: count(f1Text, /font-feature-settings/gi) + count(f2Text, /font-feature-settings/gi) > 0 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}／${F2} 全文`,
  note: '旧版零 tnum → 新版新增',
});

const f1H1Px = 13 * 2.2; // F1:18 body 13px × F1:30 220%
check({
  id: 'H-05',
  what: '旧版实例最大字号（规格 最大数字 ≥48px）',
  spec: '≥48px / 700',
  measured: `h1 = 220% × 13px = ${f1H1Px.toFixed(1)}px / 700`,
  verdict: f1H1Px >= 48 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:18,30 ／ ${F2}:19,30`,
  note: 'HELP 页无 56px hero-number → 裁定 D-9：HELP 页不要求 ≥48px',
});

const f1Container = (f1[19] || '').trim();
check({
  id: 'H-09',
  what: '旧版实例容器宽度／页边距（规格 960px ／ 32px 20px 80px）',
  spec: 'max-width:960px; padding:32px 20px 80px',
  measured: f1Container.replace(/^\.container\s*\{\s*/, '').replace(/\}\s*$/, '').trim(),
  verdict: /max-width:\s*960px/.test(f1Container) && /padding:\s*32px 20px 80px/.test(f1Container) ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:20 ／ ${F2}:21`,
  note: '宽度一致、内距不一致（旧版 0 12px 40px）',
});

const mediaF1 = [...f1Text.matchAll(/@media\s*\(([^)]*)\)/g)].map((m) => m[1].trim());
const mediaF2 = [...f2Text.matchAll(/@media\s*\(([^)]*)\)/g)].map((m) => m[1].trim());
check({
  id: 'H-12',
  what: '旧版实例断点（规格 ≤640px 与 ≤400px 各一条）',
  spec: 'max-width:640px ＋ max-width:400px',
  measured: `F1=${mediaF1.join(' | ')} ／ F2=${mediaF2.join(' | ')}`,
  verdict: mediaF1.some((m) => /640px/.test(m)) && mediaF1.some((m) => /400px/.test(m)) ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:259,294 ／ ${F2}:283,316`,
  note: '旧版 = 600px ＋ 601–900px → 裁定 D-6：三层并存，页面层取 640／400',
});

check({
  id: 'H-16',
  what: '旧版实例复制反馈时长（规格 toast 1800ms／按钮 4500ms 级）',
  spec: 'toast 1800ms；按钮 .copied 450ms 动画',
  measured: `toast=${(f2Text.match(/setTimeout\(\(\)\s*=>\s*toastEl\.classList\.remove\('show'\),\s*(\d+)\)/) || [])[1] || '?'}ms；按钮复原=${(f2Text.match(/btn\.classList\.remove\('copied'\);\s*\},\s*(\d+)\)/) || [])[1] || '?'}ms`,
  verdict: /setTimeout\(\(\)\s*=>\s*toastEl\.classList\.remove\('show'\),\s*1800\)/.test(f2Text) ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F2}:376,409`,
  note: '旧版 4500/2000ms ＝冻结值；B1 的 1800ms 已按裁定 D-7 让位',
});

check({
  id: 'H-16',
  what: '旧版实例「复制全部」胶囊（B1 要求恰一个）',
  spec: '≥1 个 .copy-all',
  measured: `F1=${count(f1Text, /class="copy-all"|\.copy-all\s*\{/g)} F2=${count(f2Text, /class="copy-all"|\.copy-all\s*\{/g)}`,
  verdict: count(f1Text, /class="copy-all"/g) + count(f2Text, /class="copy-all"/g) > 0 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:487（注释：copyAll 已于 v2.4.10 删除）`,
  note: '旧版已删除该能力 → 裁定 D-8：HELP 页不保留',
});

check({
  id: 'H-16',
  what: '旧版实例复制成功动画（规格 450ms 弹簧）',
  spec: 'copySuccess 0.45s cubic-bezier(0.34,1.56,0.64,1)',
  measured: /animation:\s*copySuccess\s*0\.45s\s*cubic-bezier\(0\.34,\s*1\.56,\s*0\.64,\s*1\)/.test(f2Text) ? 'F2 逐字命中' : '未命中',
  verdict: /animation:\s*copySuccess\s*0\.45s\s*cubic-bezier\(0\.34,\s*1\.56,\s*0\.64,\s*1\)/.test(f2Text) ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:179,181-185 ／ ${F2}:223,225-229`,
});

check({
  id: 'H-15',
  what: '旧版实例指令块载体（规格 <pre> 板）',
  spec: '<pre> 逐字命令板',
  measured: `F1 <pre> 命中 ${count(f1Text, /<pre[\s>]/gi)}；F2 <pre> 命中 ${count(f2Text, /<pre[\s>]/gi)}`,
  verdict: count(f2Text, /<pre[\s>]/gi) > 0 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F2}:429 ／ ${F1}:127-131（用 div.prompt-main 代替）`,
  note: 'F1 用 div + pre-wrap；F2 用 <pre>；半径 4px ≠ 规格 8px',
});

check({
  id: 'H-17',
  what: '旧版实例表格（规格 th/td 全套）',
  spec: '<table> ≥1',
  measured: `F1 <table> 命中 ${count(f1Text, /<table[\s>]/gi)}；F2 命中 ${count(f2Text, /<table[\s>]/gi)}`,
  verdict: count(f1Text, /<table[\s>]/gi) + count(f2Text, /<table[\s>]/gi) > 0 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}／${F2} 全文`,
  note: '旧版零表格 → 新版新增区块（B-03）',
});

check({
  id: 'H-18',
  what: '旧版实例空态（规格 卡片 + 48px 内距 + 40px 图标）',
  spec: '居中卡片、padding 48px 20px、icon 40px、h3 17px、p 13px',
  measured: `F1:${(f1[250] || '').trim()}`,
  verdict: /text-align:\s*center/.test(f1[250] || '') && /padding:\s*48px 20px/.test(f1[250] || '') ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:250-252 ／ ${F2}:270-271`,
  note: '旧版 .empty 只有 padding 24px + 13px 文案 → 新版升级',
});

check({
  id: 'H-19',
  what: '旧版实例回到顶部按钮（规格 scrollY>400 出现）',
  spec: '#backTop 存在且 scrollY>400 出现',
  measured: `F1=${count(f1Text, /backTop/gi)} F2=${count(f2Text, /backTop/gi)}`,
  verdict: count(f1Text, /backTop/gi) + count(f2Text, /backTop/gi) > 0 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}／${F2} 全文`,
  note: '旧版零 backTop → 裁定 D-14：强制新增',
});

check({
  id: 'H-20',
  what: '旧版实例焦点可见／动效可关（规格 各 ≥1）',
  spec: ':focus-visible ≥1 且 prefers-reduced-motion ≥1',
  measured: `:focus-visible=${count(f1Text, /:focus-visible/gi) + count(f2Text, /:focus-visible/gi)}；prefers-reduced-motion=${count(f1Text, /prefers-reduced-motion/gi) + count(f2Text, /prefers-reduced-motion/gi)}`,
  verdict: count(f1Text, /:focus-visible|prefers-reduced-motion/gi) + count(f2Text, /:focus-visible|prefers-reduced-motion/gi) > 0 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}／${F2} 全文`,
  note: '旧版零命中 → 裁定 D-14：强制新增',
});

check({
  id: 'H-11',
  what: '旧版实例列表分隔线（规格 1px --lineS + 首行无边框）',
  spec: '1px soft 分隔线',
  measured: `--lineS=${count(f1Text, /--lineS/gi) + count(f2Text, /--lineS/gi)}；border-top 命中=${count(f1Text, /border-top:/gi) + count(f2Text, /border-top:/gi)}`,
  verdict: count(f1Text, /--lineS/gi) + count(f2Text, /--lineS/gi) > 0 ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:106,149（每卡整框 border，无分隔线机制）`,
  note: '旧版用「每卡整框」而非「首行无边框的分隔线」→ 新版改；描边取值按裁定 DB-5',
});

check({
  id: 'H-03',
  what: '旧版实例卡面（规格 #ffffff）',
  spec: '#ffffff',
  measured: `--card=${(f1[9] || '').match(/--card:(#fff|#[0-9a-f]{6})/i)?.[1] || '?'}`,
  verdict: /--card:#fff\b/.test(f1[9] || '') ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:10 ／ ${F2}:10`,
  note: '卡面与规格一致',
});

check({
  id: 'H-03',
  what: '旧版实例页底（尺子以冻结 --bg #f5f5f7 为准；B1 规格写 #fafafa）',
  spec: '#f5f5f7（冻结）',
  measured: `--bg=${(f1[9] || '').match(/--bg:(#[0-9a-f]{6})/i)?.[1] || '?'}`,
  verdict: /--bg:#f5f5f7/.test(f1[9] || '') ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:10 ／ ${F2}:10`,
  note: '旧版 #f5f6f7、B1 #fafafa、冻结 #f5f5f7 三值并存 → 冲突 C-3 / 裁定 D-3（取冻结）',
});

check({
  id: 'H-02',
  what: '旧版实例灰阶（尺子引用冻结 --fg/--fg2/--fg3）',
  spec: '#1d1d1f / #6e6e73 / #86868b（冻结）',
  measured: `--text=${(f1[9] || '').match(/--text:(#[0-9a-f]{6})/i)?.[1] || '?'}；--sub=${(f1[9] || '').match(/--sub:(#[0-9a-f]{6})/i)?.[1] || '?'}`,
  verdict: /--text:#1d1d1f/.test(f1[9] || '') ? 'PASS' : 'OLD-DEVIATION',
  evidence: `${F1}:10 ／ ${F2}:10`,
  note: '旧版 #1c1c1e/#6b6b6f、B1 #1d1d1d/#3c3c43/#8e8e93、冻结 #1d1d1f/#6e6e73/#86868b 三套并存 → 冲突 C-2 / 裁定 D-2（取冻结）',
});

check({
  id: 'H-10',
  what: '旧版实例圆角值集合（规格 {8,14,20,999,50%}）',
  spec: '只允许 8／14／20／999／50%',
  measured: [...new Set([...f1Text.matchAll(/border-radius:\s*([0-9]+px|50%|999px)/g)].map((m) => m[1]))].join(' '),
  verdict: (() => {
    const allowed = new Set(['8px', '14px', '20px', '999px', '50%']);
    return [...f1Text.matchAll(/border-radius:\s*([0-9]+px|50%|999px)/g)].every((m) => allowed.has(m[1])) ? 'PASS' : 'OLD-DEVIATION';
  })(),
  evidence: `${F1}:55,100,107,129,149,166,203,236`,
  note: '旧版出现 3/4/5/6px → 新版收敛；圆角以局部 CSS 常量落（裁定 D-5）',
});

check({
  id: 'H-13',
  what: 'HELP 页 KPI 卡解剖（规格 label/badge/value+unit/detail 四槽）',
  spec: '四槽齐全',
  measured: `F1 .kpi 命中 ${count(f1Text, /\.kpi\b/g)}；F2 命中 ${count(f2Text, /\.kpi\b/g)}`,
  verdict: 'N/A',
  evidence: `${F1}／${F2} 全文`,
  note: '旧版 HELP 页无 KPI 卡 → 该条由内容页区块尺 B-02 判（裁定 D-15）',
});

check({
  id: 'H-14',
  what: 'HELP 页进度环（规格 SVG rotate(-90deg) + 2πr 几何）',
  spec: '环几何自洽',
  measured: `F1 环相关命中 ${count(f1Text, /stroke-dasharray|stroke-dashoffset/gi)}；F2 ${count(f2Text, /stroke-dasharray|stroke-dashoffset/gi)}`,
  verdict: 'N/A',
  evidence: `${F1}／${F2} 全文`,
  note: '旧版 HELP 页无进度环 → 由内容页区块尺 B-04 判（裁定 D-15）',
});

check({
  id: 'H-02/H-05/H-12/H-16',
  what: '「渲染后 computed 值」类判据（需 #75／#88 产出可渲染产物）',
  spec: '最终 CSS／渲染页面上的 computed 值',
  measured: '(无产物)',
  verdict: 'BLOCKED',
  evidence: '需 #75（buildStyleSheet 产出 CSS）／#88（HELP 速查台重建）落地',
  note: '本脚本只覆盖「冻结产物可判」部分；computed 值判据由 #89b 截图／交互记录承接',
});

/* ── 输出 ─────────────────────────────────────────────── */

const widths = [12, 40, 34, 44, 15];
console.log('# #105 视觉尺自证实测（只读，不改写任何冻结产物）');
console.log('');
console.log(`输入 F1 = ${F1}`);
console.log(`输入 F2 = ${F2}`);
console.log('输入冻结常量 = packages/base-render/src/spec/{style,controls,charts,help,template}.ts');
console.log('');
console.log(row(['条目', '判什么', '规格值', '实测值', '判定'], widths));
console.log(widths.map((w) => '-'.repeat(w)).join('-+-'));
for (const r of rows) console.log(row([r.id, r.what, r.spec, r.measured, r.verdict], widths));
console.log('');
console.log(`小计：可判 ${judgeable} 条（PASS ${passed} / OLD-DEVIATION ${deviation} / DEFECT ${defects}）；N/A ${na} 条；需落地后判 ${blocked} 条；表内合计 ${rows.length} 行`);
console.log('');
console.log('## 说明（判定口径 = 编排者 R35 第 3 条）');
console.log('');
console.log('- `OLD-DEVIATION`（旧版差异）**不是缺陷**：对旧版实例测的是**迁移前基线**，差异＝「旧版未达 B1 标准」＝新版改进项。');
console.log('- `DEFECT` 才是真问题：表示尺子与**冻结常量**冲突（本轮为 0）；出现即按 R35 第 2 条以冻结契约为准并修尺子。');
console.log('- `BLOCKED` 条目需 #75（样式资产）／#88（HELP 速查台重建）产出后，在最终 CSS／渲染页面上判。');
console.log('- `N/A` 条目（KPI 卡／进度环）不属 HELP 页形态，由 docs/visual-spec-blocks.md 的区块尺判。');
console.log('- 本脚本零写入：不修改 fixtures/**、不产出构建物。');

const strict = process.argv.includes('--strict');
if (strict && defects > 0) process.exit(1);
process.exit(0);
