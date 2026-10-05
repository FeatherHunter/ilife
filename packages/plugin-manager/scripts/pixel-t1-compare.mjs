#!/usr/bin/env node
// T1+T2+T4 pixel seam (#1160 base, #1161 extended, #1163 health reuses same chain): shared single-route snapshot vs prototype params.
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
const HEALTH_VIEW = join(ROOT, 'src', 'health-view.ts');
const UPDATE_CONTRACT = join(ROOT, 'src', 'update-contract.ts');
function fail(lines, ratio) {
  for (const l of lines) console.log(l);
  console.log('PIXEL_T1_DIFF_RATIO=' + ratio.toFixed(3));
  console.log('PIXEL_T1_RESULT=FAIL threshold=0.01');
  process.exit(1);
}
let proto, contract, view, healthView, updateContract;
try { proto = readFileSync(PROTO, 'utf8'); } catch { fail(['PIXEL_T1_PARAM proto=missing'], 1); }
try { contract = readFileSync(CONTRACT, 'utf8'); } catch { fail(['PIXEL_T1_PARAM contract=missing'], 1); }
try { view = readFileSync(VIEW, 'utf8'); } catch { fail(['PIXEL_T1_PARAM view=missing'], 1); }
try { healthView = readFileSync(HEALTH_VIEW, 'utf8'); } catch { fail(['PIXEL_T1_PARAM health-view=missing'], 1); }
try { updateContract = readFileSync(UPDATE_CONTRACT, 'utf8'); } catch { fail(['PIXEL_T1_PARAM update-contract=missing'], 1); }
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
];
const bad = checks.filter((pair) => !pair[1]);
const ratio = bad.length / checks.length;
for (const pair of checks) console.log('PIXEL_T1_PARAM ' + pair[0] + '=' + (pair[1] ? 'ok' : 'MISS'));
if (bad.length > 0) fail(['PIXEL_T1_MISS ' + bad.map((p) => p[0]).join(','), 'PIXEL_T1_PROTO press=' + protoPress + ' focus=' + (protoFocus ? protoFocus[1] + '+' + protoFocus[2] : '?')], ratio);
console.log('PIXEL_T1_DIFF_RATIO=' + ratio.toFixed(3));
console.log('PIXEL_T1_RESULT=PASS threshold=0.01');