// 生成器：`seals.yaml`（仓库根，六家 × 三枚章的唯一可编辑处）→ 各插件 `src/seal-states.generated.ts`。
// 跑法：node tooling/gen-seals.mjs（幂等；改完 yaml 重跑即可）。漂移由 test/seals-yaml-1158.test.mjs 守。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'seals.yaml');

/** 极简 YAML 读取：只认「映射 + 标量」两级缩进（yaml 头部写了支持范围）。 */
export function parseSealsYaml(text) {
  const root = {};
  const stack = [{ indent: -1, node: root }];
  for (const raw of text.split(/\r?\n/)) {
    const noComment = raw.replace(/^\s*#.*$/, '').replace(/\s+#.*$/, '');
    if (noComment.trim() === '') continue;
    const indent = noComment.match(/^ */)[0].length;
    const m = /^([^:]+):\s*(.*)$/.exec(noComment.trim());
    if (m === null) throw new Error('seals.yaml 有读不懂的行：' + raw);
    const key = m[1].trim();
    const value = m[2].trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;
    if (value === '') { const child = {}; parent[key] = child; stack.push({ indent, node: child }); }
    else parent[key] = value;
  }
  return root;
}

const ROLES = ['help', 'skill', 'plugin'];
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
/** 印文里写 {product} ⇒ 生成 `product + '…'` 这种表达式（HELP 那枚用得上）。 */
function labelExpr(label) {
  if (!String(label).includes('{product}')) return q(label);
  const parts = String(label).split('{product}');
  const out = [];
  if (parts[0] !== '') out.push(q(parts[0]));
  out.push('product');
  if (parts[1] !== '') out.push(q(parts[1]));
  return out.join(' + ');
}

/** 一家的生成件内容。 */
export function renderPlugin(pkg, cfg) {
  const seals = cfg.seals || {};
  const rows = ROLES.map((role) => {
    const s = seals[role];
    if (!s) throw new Error(pkg + ' 少了 ' + role + ' 那一枚');
    return '    { role: ' + q(role) + ' as const, tier: ' + q(s.tier) + ' as const, label: ' + labelExpr(s.label) + ', progress: ' + q(s.progress) + ', status: ' + q(s.status) + ', plan: ' + q(s.plan) + ' },';
  });
  return [
    '/** 自动生成 · **勿手改**：源 `seals.yaml`（仓库根），生成器 `node tooling/gen-seals.mjs`。 */',
    'export const SEAL_SEED = ' + String(cfg.seed ?? 0) + ';',
    '',
    '/** 三枚章（HELP／技能／插件；面板按角色定序）：label 里的 {product} 由调用方代入本家产品名。 */',
    'export function sealStates(product: string) {',
    '  return [',
    ...rows,
    '  ];',
    '}',
    '',
  ].join('\n');
}

/** 全部：包名 → { 目标文件, 内容 }。 */
export function renderAll() {
  const doc = parseSealsYaml(readFileSync(SRC, 'utf8'));
  const plugins = doc.plugins || {};
  const out = new Map();
  for (const [pkg, cfg] of Object.entries(plugins)) {
    // 目录名与包名不同（`dsh-x` 住 `packages/plugin-x`）：yaml 里显式写 `dir:`，不猜。
    const dir = cfg.dir;
    if (typeof dir !== 'string' || dir === '') throw new Error(pkg + ' 少了 dir（目录名）');
    out.set(join(ROOT, 'packages', dir, 'src', 'seal-states.generated.ts'), renderPlugin(pkg, cfg));
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const all = renderAll();
  for (const [file, content] of all) { writeFileSync(file, content); console.log('written ' + file.replace(ROOT + '\\', '')); }
  console.log('共 ' + all.size + ' 家');
}
