// 生成器：`seals.yaml`（仓库根 · 唯一可编辑处）→
//   ① 总管的设计语言 `packages/plugin-manager/src/seal-vocabulary.generated.ts`（一次改、六家同）
//   ② 各家的章状态 `packages/plugin-<x>/src/seal-states.generated.ts`（各家独立发版）
// 跑法：node tooling/gen-seals.mjs（幂等）。漂移由 test/seals-yaml-1158.test.mjs 守。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'seals.yaml');
const TIERS = ['gold', 'silver', 'copper'];
const ROLES = ['help', 'skill', 'plugin'];
const SECTIONS = ['progress', 'status', 'plan'];
const HEAD = '/** 自动生成 · **勿手改**：源 `seals.yaml`（仓库根），生成器 `node tooling/gen-seals.mjs`。 */';

function die(msg) { throw new Error('seals.yaml: ' + msg); }
function onlyKeys(obj, allowed, where) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) die(where + ' 必须是映射');
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) die(where + ' 出现未知键 `' + k + '`（只认 ' + allowed.join('／') + '）');
}
function str(v, where) { if (typeof v !== 'string' || v === '') die(where + ' 必须是非空字符串，现为 ' + JSON.stringify(v)); return v; }
function noPlaceholder(v, where) { if (String(v).includes('{product}')) die(where + ' 不许用 {product}（占位符只允许出现在 vocabulary.label 里）'); return v; }
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

/** 读 + 校验（任何一处不对就报错，绝不静默）。 */
export function readSeals() {
  const doc = parse(readFileSync(SRC, 'utf8'));
  onlyKeys(doc, ['vocabulary', 'plugins'], '顶层');
  const vocab = doc.vocabulary;
  onlyKeys(vocab, ['tierText', 'sections', 'label', 'close'], 'vocabulary');
  onlyKeys(vocab.tierText, TIERS, 'vocabulary.tierText');
  onlyKeys(vocab.sections, SECTIONS, 'vocabulary.sections');
  onlyKeys(vocab.label, ROLES, 'vocabulary.label');
  for (const t of TIERS) str(vocab.tierText[t], 'vocabulary.tierText.' + t);
  for (const s of SECTIONS) str(vocab.sections[s], 'vocabulary.sections.' + s);
  for (const r of ROLES) str(vocab.label[r], 'vocabulary.label.' + r);
  str(vocab.close, 'vocabulary.close');
  const plugins = new Map();
  for (const [pkg, cfg] of Object.entries(doc.plugins || {})) {
    onlyKeys(cfg, ['layout', 'seals'], pkg);
    const dir = pkg.replace(/^dsh-/, 'plugin-');
    if (!existsSync(join(ROOT, 'packages', dir, 'src'))) die(pkg + ' 推不出源码目录 packages/' + dir + '（包名与目录名对不上）');
    onlyKeys(cfg.layout, ['seed'], pkg + '.layout');
    const seed = cfg.layout.seed;
    if (!Number.isInteger(seed) || seed < 0 || seed > 9) die(pkg + '.layout.seed 必须是 0..9 的整数，现为 ' + JSON.stringify(seed));
    onlyKeys(cfg.seals, ROLES, pkg + '.seals');
    const seals = {};
    for (const role of ROLES) {
      const s = cfg.seals[role];
      onlyKeys(s, ['tier', 'progress', 'status', 'plan'], pkg + '.seals.' + role);
      if (!TIERS.includes(s.tier)) die(pkg + '.seals.' + role + '.tier 只能是 ' + TIERS.join('／') + '，现为 ' + JSON.stringify(s.tier));
      seals[role] = {
        tier: s.tier,
        progress: noPlaceholder(str(s.progress, pkg + '.seals.' + role + '.progress'), pkg + '.seals.' + role + '.progress'),
        status: noPlaceholder(str(s.status, pkg + '.seals.' + role + '.status'), pkg + '.seals.' + role + '.status'),
        plan: noPlaceholder(str(s.plan, pkg + '.seals.' + role + '.plan'), pkg + '.seals.' + role + '.plan'),
      };
    }
    plugins.set(pkg, { dir, seed, seals });
  }
  if (plugins.size === 0) die('plugins 段是空的');
  return { vocab, plugins };
}

/** 印文里写 {product} ⇒ 生成 `product + '…'` 这种表达式。 */
function labelExpr(label) {
  if (!label.includes('{product}')) return q(label);
  const parts = label.split('{product}');
  const out = [];
  if (parts[0] !== '') out.push(q(parts[0]));
  out.push('product');
  if (parts[1] !== '') out.push(q(parts[1]));
  return out.join(' + ');
}

export function renderVocabulary(vocab) {
  return [
    HEAD,
    '/** 档位话：卷轴标题下那一行 ＝ 悬停章的气泡（同一句话，两处渲染）。 */',
    "export const TIER_TEXT: Record<'gold' | 'silver' | 'copper', string> = {" + TIERS.map((t) => q(t) + ': ' + q(vocab.tierText[t])).join(', ') + ' };',
    '/** 卷轴三段小标题（行首朱砂小印取首字）。 */',
    "export const SECTION_LABEL: Record<'progress' | 'status' | 'plan', string> = {" + SECTIONS.map((s) => q(s) + ': ' + q(vocab.sections[s])).join(', ') + ' };',
    '/** 三枚章的印文约定（{product} 由各家的生成件代入产品名）。 */',
    "export const SEAL_LABEL: Record<'help' | 'skill' | 'plugin', string> = {" + ROLES.map((r) => q(r) + ': ' + q(vocab.label[r])).join(', ') + ' };',
    '/** 关闭钮（绦带）上的字。 */',
    'export const CLOSE_LABEL = ' + q(vocab.close) + ';',
    '',
  ].join('\n');
}

export function renderPlugin(pkg, cfg, vocab) {
  const rows = ROLES.map((role) => {
    const s = cfg.seals[role];
    return '    { role: ' + q(role) + ' as const, tier: ' + q(s.tier) + ' as const, label: ' + labelExpr(vocab.label[role]) + ', progress: ' + q(s.progress) + ', status: ' + q(s.status) + ', plan: ' + q(s.plan) + ' },';
  });
  return [
    HEAD,
    'export const SEAL_SEED = ' + String(cfg.seed) + ';',
    '',
    '/** 三枚章（HELP／技能／插件；面板按角色定序）。label 用 `seals.yaml` 的 vocabulary.label 约定。 */',
    'export function sealStates(product: string) {',
    '  return [',
    ...rows,
    '  ];',
    '}',
    '',
  ].join('\n');
}

/** 全部产物：目标文件 → 内容。 */
export function renderAll() {
  const { vocab, plugins } = readSeals();
  const out = new Map();
  out.set(join(ROOT, 'packages', 'plugin-manager', 'src', 'seal-vocabulary.generated.ts'), renderVocabulary(vocab));
  for (const [pkg, cfg] of plugins) out.set(join(ROOT, 'packages', cfg.dir, 'src', 'seal-states.generated.ts'), renderPlugin(pkg, cfg, vocab));
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const all = renderAll();
  for (const [file, content] of all) { writeFileSync(file, content); console.log('written ' + file.replace(ROOT + '\\', '')); }
  console.log('共 ' + all.size + ' 份（1 份设计语言 + ' + (all.size - 1) + ' 份章状态）');
}
