#!/usr/bin/env node
// T1 pixel seam minimal (#1160): shared single-route snapshot vs prototype params.
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
function fail(lines, ratio) {
  for (const l of lines) console.log(l);
  console.log('PIXEL_T1_DIFF_RATIO=' + ratio.toFixed(3));
  console.log('PIXEL_T1_RESULT=FAIL threshold=0.01');
  process.exit(1);
}
let proto, contract, view;
try { proto = readFileSync(PROTO, 'utf8'); } catch { fail(['PIXEL_T1_PARAM proto=missing'], 1); }
try { contract = readFileSync(CONTRACT, 'utf8'); } catch { fail(['PIXEL_T1_PARAM contract=missing'], 1); }
try { view = readFileSync(VIEW, 'utf8'); } catch { fail(['PIXEL_T1_PARAM view=missing'], 1); }
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
];
const bad = checks.filter((pair) => !pair[1]);
const ratio = bad.length / checks.length;
for (const pair of checks) console.log('PIXEL_T1_PARAM ' + pair[0] + '=' + (pair[1] ? 'ok' : 'MISS'));
if (bad.length > 0) fail(['PIXEL_T1_MISS ' + bad.map((p) => p[0]).join(','), 'PIXEL_T1_PROTO press=' + protoPress + ' focus=' + (protoFocus ? protoFocus[1] + '+' + protoFocus[2] : '?')], ratio);
console.log('PIXEL_T1_DIFF_RATIO=' + ratio.toFixed(3));
console.log('PIXEL_T1_RESULT=PASS threshold=0.01');