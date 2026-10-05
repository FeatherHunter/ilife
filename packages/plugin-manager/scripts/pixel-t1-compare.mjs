#!/usr/bin/env node
// T1+T2+T4+T5+T6 pixel seam (#1160 base, #1161 extended, #1163 health reuses same chain, #1164 dialog appends, #1165 tabs appends): shared single-route snapshot vs prototype params.
// T2 reuses this same chain (no second chain per ticket): T1 14 checks stay byte-identical, T2 appends its own.
// No browser in node --test, so this locks key params; image part is manual same-viewport check.
// Truth: .scratch/1155-real-panel-prototype.html (same as branch proto/1155-interaction-v1).
// Prod: src/config-panel-contract.ts (4 consts) + src/config-panel-view.ts (interactionCss).
// Gate: target 0%, baseline <=1% (mismatch/total <= 0.01). Break-one-style must RED, fix must GREEN.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PROTO = join(ROOT, '..', '..', '.scratch', '1155-real-panel-prototype.html');
const CONTRACT = join(ROOT, 'src', 'config-panel-contract.ts');
const VIEW = join(ROOT, 'src', 'config-panel-view.ts');
const CLIENT = join(ROOT, 'src', 'client.ts');
const HEALTH_VIEW = join(ROOT, 'src', 'health-view.ts');
const UPDATE_CONTRACT = join(ROOT, 'src', 'update-contract.ts');
const DIALOG_UI = join(ROOT, 'src', 'directory-browser-ui.ts');
const DIALOG_PARTS = join(ROOT, 'src', 'directory-browser-parts.ts');
function fail(lines, ratio) {
  for (const l of lines) console.log(l);
  console.log('PIXEL_T1_DIFF_RATIO=' + ratio.toFixed(3));
  console.log('PIXEL_T1_RESULT=FAIL threshold=0.01');
  process.exit(1);
}
let proto, contract, view, client, healthView, updateContract, dialogUi, dialogParts;
try { proto = readFileSync(PROTO, 'utf8'); } catch { fail(['PIXEL_T1_PARAM proto=missing'], 1); }
try { contract = readFileSync(CONTRACT, 'utf8'); } catch { fail(['PIXEL_T1_PARAM contract=missing'], 1); }
try { view = readFileSync(VIEW, 'utf8'); } catch { fail(['PIXEL_T1_PARAM view=missing'], 1); }
try { client = readFileSync(CLIENT, 'utf8'); } catch { fail(['PIXEL_T1_PARAM client=missing'], 1); }
try { healthView = readFileSync(HEALTH_VIEW, 'utf8'); } catch { fail(['PIXEL_T1_PARAM health-view=missing'], 1); }
try { updateContract = readFileSync(UPDATE_CONTRACT, 'utf8'); } catch { fail(['PIXEL_T1_PARAM update-contract=missing'], 1); }
try { dialogUi = readFileSync(DIALOG_UI, 'utf8'); } catch { fail(['PIXEL_T1_PARAM dialog-ui=missing'], 1); }
try { dialogParts = readFileSync(DIALOG_PARTS, 'utf8'); } catch { fail(['PIXEL_T1_PARAM dialog-parts=missing'], 1); }
const protoPress = /body\[data-v="V1"\] \.btn:active\{transform:scale\(([\d.]+)\)\}/.exec(proto)?.[1];
const protoFocus = /\.btn:focus-visible[^}]*box-shadow:0 0 0 (\d+)px [^,]+,0 0 0 (\d+)px var\(--focus\)/.exec(proto);
const protoThemes = ['#f6ad55', '#0a84ff', '#30d158'].map((c) => proto.includes(c) ? c : null);
const protoTransition = /body\[data-v="V1"\] \.btn\{transition:([^}]+)\}/.exec(proto)?.[1] ?? '';
const prodPress = /export const PRESS_SCALE = ([\d.]+) as const/.exec(contract)?.[1];
const prodGap = /export const FOCUS_RING_GAP_PX = (\d+) as const/.exec(contract)?.[1];
const prodWidth = /export const FOCUS_RING_WIDTH_PX = (\d+) as const/.exec(contract)?.[1];
const prodTransition = /export const INTERACTION_TRANSITION = '([^']+)' as const/.exec(contract)?.[1] ?? '';
const viewCss = view.includes('export function interactionCss()');
const viewPressAttr = (view.match(/data-ilife-press/g) ?? []).length;
const viewStyleTag = (view.match(/data-ilife-interaction/g) ?? []).length;
const cssStart = view.indexOf('export function interactionCss()');
const cssBlock = view.slice(cssStart, cssStart + 1200);
const noHardBlue = !/#0a84ff/.test(cssBlock) && cssBlock.includes('--ilife-focus') && cssBlock.includes('--dsw-alias-brand-primary');
const protoHoverRule = /body\[data-v="V1"\] \.btn:hover[^\{]*\{([^}]+)\}/.exec(proto)?.[1] ?? '';
const protoSpotRule = /body\[data-v="V1"\] \.btn::before\{([^}]+)\}/.exec(proto)?.[1] ?? '';
const protoShakeRule = /@keyframes shakeV1\{[^}]+\}[^}]+\}[^}]+\}/.exec(proto)?.[0] ?? '';
const t2contract = (name, want) => new RegExp('export const ' + name + ' = ' + want + ' as const').test(contract);
const cssAll = view.slice(cssStart, cssStart + 6000);
const tabCssStart = view.indexOf('export function tabInteractionCss()');
const tabCssAll = tabCssStart < 0 ? '' : view.slice(tabCssStart, tabCssStart + 5000);
const t6clientStart = client.indexOf('T6（#1165）');
const t6clientWindow = t6clientStart < 0 ? '' : client.slice(t6clientStart);
const checks = [
  ['proto-press=.97', protoPress === '0.97' || protoPress === '.97'],
  ['prod-press=.97', prodPress === '0.97'],
  ['proto-focus=2+5', (protoFocus && protoFocus[1] === '2' && protoFocus[2] === '5') || false],
  ['prod-focus=2+5', prodGap === '2' && prodWidth === '5'],
  ['press-match', (protoPress ?? '').replace(/^0/, '') === (prodPress ?? '').replace(/^0/, '')],
  ['focus-match', protoFocus ? (protoFocus[1] === prodGap && protoFocus[2] === prodWidth) : false],
  ['themes-3', protoThemes.every(Boolean)],
  ['transition-has-4', ['background', 'transform', 'box-shadow', 'border-color'].every((k) => prodTransition.includes(k) && prodTransition.includes('.15s'))],
  ['proto-transition-has-transform', protoTransition.includes('transform')],
  ['view-has-interactionCss', viewCss],
  ['view-press-attrs>=5', viewPressAttr >= 5],
  ['view-styletag>=2', viewStyleTag >= 2],
  ['no-hard-blue', noHardBlue],
  ['copy-ms-untouched-1500', /export const COPY_FEEDBACK_MS = 1500 as const/.test(contract)],
  ['t2-proto-hover-wash-13', protoHoverRule.includes('13%')],
  ['t2-prod-hover-wash-13', t2contract('HOVER_WASH_PERCENT', '13')],
  ['t2-proto-glow-55-25', protoHoverRule.includes('55%') && protoHoverRule.includes('25%')],
  ['t2-prod-glow-55-25', t2contract('HOVER_GLOW_EDGE_PERCENT', '55') && t2contract('HOVER_GLOW_SOFT_PERCENT', '25')],
  ['t2-proto-lift-1px', protoHoverRule.includes('translateY(-1px)')],
  ['t2-prod-lift-1px', t2contract('HOVER_LIFT_PX', '1') && cssAll.includes("translateY(-' + String(HOVER_LIFT_PX)")],
  ['t2-proto-spot-120-22-65', protoSpotRule.includes('120px') && protoSpotRule.includes('22%') && protoSpotRule.includes('65%')],
  ['t2-prod-spot-120-22', t2contract('HOVER_SPOTLIGHT_RADIUS_PX', '120') && t2contract('SPOTLIGHT_PEAK_PERCENT', '22') && cssAll.includes('var(--mx,50%)')],
  ['t2-proto-disabled-shake', proto.includes('.btn:disabled{cursor:not-allowed;opacity:.4}') && proto.includes('.btn:disabled:hover{animation:shakeV1 .3s ease') && protoShakeRule.includes('-2px')],
  ['t2-prod-disabled-shake', t2contract('DISABLED_OPACITY', '0.4') && t2contract('DISABLED_SHAKE_MS', '300') && cssAll.includes('ilifeShake')],
  ['t2-proto-longpress-500', proto.includes('(Date.now()-t0)/500') && proto.includes('.lp{') && proto.includes('height:3px')],
  ['t2-prod-longpress-500', t2contract('LONGPRESS_MS', '500') && t2contract('LONGPRESS_RING_HEIGHT_PX', '3') && cssAll.includes('ilifeLongRing')],
  ['t2-view-seam', cssAll.includes('data-ilife-longpress') && cssAll.includes('@media (hover:none)') && cssAll.includes('@media (prefers-reduced-motion:reduce)') && !/#0a84ff/.test(cssAll)],
  ['t4-health-reuses-shared-seam', healthView.includes("import { interactionCss } from './config-panel-view.js'") && healthView.includes("React.createElement('style', { 'data-ilife-interaction': 't1' }, interactionCss())")],
  ['t4-health-button-press-longpress', healthView.includes("'data-ilife-press': 'health-run'") && healthView.includes("'data-ilife-longpress': 'health-run'")],
  ['t4-health-no-second-tokens', !/export const (PRESS_SCALE|HOVER_WASH_PERCENT|LONGPRESS_MS)/.test(healthView)],
  ['t4-health-no-hard-blue', !/#0a84ff/.test(healthView)],
  ['t4-update-face-absent', updateContract.includes('更新代码已全部移除')],
  ['t6-proto-tab-wash-12', proto.includes('body[data-v="V1"] .tab:hover{background:color-mix(in srgb,var(--focus) 12%,transparent)')],
  ['t6-proto-tab-transition', proto.includes('body[data-v="V1"] .tab{transition:background .15s ease,border-color .15s ease}')],
  ['t6-proto-dot-pulse', proto.includes('body[data-v="V1"] .tab:hover .dot{animation:dotPulseV1 .8s ease infinite}') && proto.includes('@keyframes dotPulseV1{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.6}}')],
  ['t6-proto-liquid-stretch', proto.includes('scaleX(1.28) scaleY(.86)') && proto.includes('offset:.45')],
  ['t6-proto-liquid-ghost-180', proto.includes('ghost.style.transition="opacity .18s ease"')],
  ['t6-proto-liquid-dur-formula', proto.includes('Math.min(380,Math.max(220,200+dist*0.35))') && proto.includes('cubic-bezier(.3,1.1,.4,1)')],
  ['t6-proto-glider-goo', proto.includes('class="glider-layer"') && proto.includes('filter id="goo"') && proto.includes('stdDeviation="6"')],
  ['t6-prod-tab-cells', contract.includes('export const TAB_HOVER_WASH_PERCENT = 12 as const') && contract.includes('export const TAB_DOT_PULSE_MS = 800 as const') && contract.includes("export const TAB_TRANSITION = 'background .15s ease,border-color .15s ease' as const")],
  ['t6-prod-liquid-cells', contract.includes('export const LIQUID_STRETCH_X = 1.28 as const') && contract.includes('export const LIQUID_STRETCH_Y = 0.86 as const') && contract.includes('export const LIQUID_GHOST_MS = 180 as const') && contract.includes('export const LIQUID_MIN_MS = 220 as const') && contract.includes('export const LIQUID_MAX_MS = 380 as const') && contract.includes('export const LIQUID_BASE_MS = 200 as const') && contract.includes('export const LIQUID_DIST_FACTOR = 0.35 as const') && contract.includes("export const LIQUID_EASE = 'cubic-bezier(.3,1.1,.4,1)' as const")],
  ['t6-view-seam', tabCssStart >= 0 && tabCssAll.includes('[data-ilife-tab]') && tabCssAll.includes('[data-ilife-tablist]') && tabCssAll.includes('[data-ilife-glider-layer]') && tabCssAll.includes('url(#ilife-goo)') && tabCssAll.includes('ilifeDotPulse') && tabCssAll.includes('String(TAB_HOVER_WASH_PERCENT)') && tabCssAll.includes('String(TAB_DOT_PULSE_MS') && tabCssAll.includes('String(LIQUID_GHOST_MS') && tabCssAll.includes('TAB_TRANSITION') && tabCssAll.includes('--ilife-focus') && tabCssAll.includes('@media (hover:none)') && tabCssAll.includes('@media (prefers-reduced-motion:reduce)') && tabCssAll.includes('!important') && !/#0a84ff/.test(tabCssAll)],
  ['t6-view-no-second-tokens', !/export const (TAB_|LIQUID_)/.test(view)],
  ['t6-client-wiring', client.includes("import { tabInteractionCss } from './config-panel-view.js'") && client.includes("'data-ilife-tablist': 't6'") && client.includes("React.createElement('style', { 'data-ilife-tabs': 't6' }, tabInteractionCss())") && client.includes("'data-ilife-tab': 'tab'") && client.includes("'data-ilife-glider-layer': 't6'") && client.includes("'data-ilife-glider': 't6'") && client.includes("'data-ilife-ghost': 't6'") && client.includes("id: 'ilife-goo'") && client.includes('renderSlot(CONFIG_TAB_SLOT') && client.includes('MANAGER_TABS.map') && client.includes('props.useTabs')],
  ['t6-client-liquid-formula', client.includes('LIQUID_MAX_MS, Math.max(LIQUID_MIN_MS, LIQUID_BASE_MS + dist * LIQUID_DIST_FACTOR)') && client.includes('String(LIQUID_STRETCH_X)') && client.includes('String(LIQUID_STRETCH_Y)') && client.includes('offset: 0.45') && client.includes('String(LIQUID_GHOST_MS / 1000)') && client.includes('LIQUID_EASE') && client.includes("background: 'transparent', borderColor: 'transparent'")],
  ['t6-client-no-second-tokens', !/export const (TAB_|LIQUID_)/.test(client)],
  ['t6-client-no-new-blue', t6clientStart >= 0 && !/#0a84ff/.test(t6clientWindow)],
  ['t5-ui-buttons-press', ['dialog-up', 'dialog-go', 'dialog-pick', 'dialog-cancel', 'dialog-close', 'dialog-newfolder'].every((k) => dialogUi.includes("'data-ilife-press': '" + k + "'")) && ['dialog-crumb', 'dialog-root', 'dialog-entry', 'dialog-select', 'dialog-create', 'dialog-create-cancel'].every((k) => dialogParts.includes("'data-ilife-press': '" + k + "'"))],
  ['t5-ui-buttons-longpress', ['dialog-up', 'dialog-go', 'dialog-pick', 'dialog-cancel', 'dialog-close', 'dialog-newfolder'].every((k) => dialogUi.includes("'data-ilife-longpress': '" + k + "'")) && ['dialog-crumb', 'dialog-root', 'dialog-entry', 'dialog-select', 'dialog-create', 'dialog-create-cancel'].every((k) => dialogParts.includes("'data-ilife-longpress': '" + k + "'"))],
  ['t5-ui-inputs-focus-only', dialogUi.includes("'data-ilife-focus': 'dialog-input'") && dialogUi.includes("'data-ilife-focus': 'dialog-check'") && dialogParts.includes("'data-ilife-focus': 'dialog-input'") && !(dialogUi + dialogParts).includes("'data-ilife-press': 'dialog-input'") && !(dialogUi + dialogParts).includes("'data-ilife-longpress': 'dialog-input'") && !(dialogUi + dialogParts).includes("'data-ilife-press': 'dialog-check'") && !(dialogUi + dialogParts).includes("'data-ilife-longpress': 'dialog-check'")],
  ['t5-ui-disabled-3', dialogUi.includes('canGoUp(state)') && dialogUi.includes("state.draft.trim() === ''") && dialogUi.includes('target === null') && dialogParts.includes("creatingName.trim() === ''") && dialogUi.includes('disabled: upOff') && dialogUi.includes('disabled: goOff') && dialogUi.includes('disabled: pickOff') && dialogParts.includes('disabled: createEmpty')],
  ['t5-ui-no-second-tokens', !/export const (DIALOG_|PRESS_SCALE|HOVER_WASH_PERCENT|LONGPRESS_MS|FOCUS_RING)/.test(dialogUi) && !/export const (DIALOG_|PRESS_SCALE|HOVER_WASH_PERCENT|LONGPRESS_MS|FOCUS_RING)/.test(dialogParts)],
  ['t5-ui-no-hard-blue', !/#0a84ff/.test(dialogUi) && !/#0a84ff/.test(dialogParts)],
  ['t5-ui-no-longpress-logic', !/onLongpress/.test(dialogUi) && !/onLongpress/.test(dialogParts) && !/longpressTimer/.test(dialogUi) && !/longpressTimer/.test(dialogParts) && !/setLongpress/.test(dialogUi) && !/setLongpress/.test(dialogParts) && !/addEventListener/.test(dialogUi) && !/addEventListener/.test(dialogParts)],
  ['t5-readonly-keep', view.includes('只读行的目录按钮不画')],
  ['t5-reuses-shared-seam', !/function interactionCss/.test(dialogUi) && !/function interactionCss/.test(dialogParts) && !/data-ilife-interaction/.test(dialogUi) && !/data-ilife-interaction/.test(dialogParts)],
];
const bad = checks.filter((pair) => !pair[1]);
const ratio = bad.length / checks.length;
for (const pair of checks) console.log('PIXEL_T1_PARAM ' + pair[0] + '=' + (pair[1] ? 'ok' : 'MISS'));
if (bad.length > 0) fail(['PIXEL_T1_MISS ' + bad.map((p) => p[0]).join(','), 'PIXEL_T1_PROTO press=' + protoPress + ' focus=' + (protoFocus ? protoFocus[1] + '+' + protoFocus[2] : '?')], ratio);
console.log('PIXEL_T1_DIFF_RATIO=' + ratio.toFixed(3));
console.log('PIXEL_T1_RESULT=PASS threshold=0.01');