// 生成器：`seals.yaml`（仓库根 · 唯一可编辑处）→
//   ① 总管的设计语言 `packages/plugin-manager/src/seal-vocabulary.generated.ts`（一次改、六家同）
//   ② 各家的章状态 `packages/plugin-<x>/src/seal-states.generated.ts`（各家独立发版）
// 跑法：node tooling/gen-seals.mjs（幂等；--check 只对账不落盘）。漂移由 `pnpm gen:check` 与
//   test/seals-yaml-1158.test.mjs 守。
// #1325：yaml 每个文本叶子是 { zh, en } 两列；生成件同时出中文扁平表（历史消费面沿用）
//   与按语言的 BY_LANG 表／sealStates(product, language)。
// 语言集合不在这里再写一遍：从 yaml 叶子的键派生（加语言＝每个叶子补一列，见 ADR-0004）。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'seals.yaml');
const TIERS = ['gold', 'silver', 'copper'];
const ROLES = ['help', 'skill', 'plugin'];
const SECTIONS = ['progress', 'status', 'plan'];
/** 叶子语言列的键：小写 BCP47 形状（与词条文件同名口径，如 zh／en／zh-hant）。 */
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/;
const HEAD = '/** 自动生成 · **勿手改**：源 `seals.yaml`（仓库根），生成器 `node tooling/gen-seals.mjs`。 */';

function die(msg) { throw new Error('seals.yaml: ' + msg); }
function onlyKeys(obj, allowed, where) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) die(where + ' 必须是映射');
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) die(where + ' 出现未知键 `' + k + '`（只认 ' + allowed.join('／') + '）');
}
function noPlaceholder(v, where) { if (String(v).includes('{product}')) die(where + ' 不许用 {product}（占位符只允许出现在 vocabulary.label 里）'); return v; }
/** 读一个双语文本叶子：键恰为 langs、值都是非空字符串。 */
function biText(v, langs, where, allowProduct = false) {
  onlyKeys(v, langs, where);
  const out = {};
  for (const lang of langs) {
    const raw = v[lang];
    if (typeof raw !== 'string' || raw === '') die(where + '.' + lang + ' 必须是非空字符串，现为 ' + JSON.stringify(raw));
    if (!allowProduct) noPlaceholder(raw, where + '.' + lang);
    out[lang] = raw;
  }
  return out;
}
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

/** 读 + 校验（任何一处不对就报错，绝不静默）。 */
export function readSeals() {
  const doc = parse(readFileSync(SRC, 'utf8'));
  onlyKeys(doc, ['vocabulary', 'plugins'], '顶层');
  const vocab = doc.vocabulary;
  onlyKeys(vocab, ['tierText', 'sections', 'label', 'close'], 'vocabulary');
  // 语言集合由叶子的键派生（唯一来源）：先看 close 这一叶，再要求所有叶子同列。
  const langs = Object.keys(vocab.close ?? {});
  if (langs.length === 0) die('vocabulary.close 必须是 { 语言: 文本 }');
  for (const lang of langs) if (!LANGUAGE_TAG.test(lang)) die('vocabulary.close 的语言列 `' + lang + '` 不认识（小写 BCP47 形状，如 zh／en／zh-hant）');
  onlyKeys(vocab.tierText, TIERS, 'vocabulary.tierText');
  onlyKeys(vocab.sections, SECTIONS, 'vocabulary.sections');
  onlyKeys(vocab.label, ROLES, 'vocabulary.label');
  const out = { tierText: {}, sections: {}, label: {}, close: null };
  for (const t of TIERS) out.tierText[t] = biText(vocab.tierText[t], langs, 'vocabulary.tierText.' + t);
  for (const s of SECTIONS) out.sections[s] = biText(vocab.sections[s], langs, 'vocabulary.sections.' + s);
  for (const r of ROLES) out.label[r] = biText(vocab.label[r], langs, 'vocabulary.label.' + r, true);
  out.close = biText(vocab.close, langs, 'vocabulary.close');
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
        progress: biText(s.progress, langs, pkg + '.seals.' + role + '.progress'),
        status: biText(s.status, langs, pkg + '.seals.' + role + '.status'),
        plan: biText(s.plan, langs, pkg + '.seals.' + role + '.plan'),
      };
    }
    plugins.set(pkg, { dir, seed, seals });
  }
  if (plugins.size === 0) die('plugins 段是空的');
  return { langs, vocab: out, plugins };
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

/** 语言列 → TS 联合类型（如 `'zh' | 'en'`）。 */
const unionOf = (langs) => langs.map(q).join(' | ');
/** 语言列 → 生成件里的变量名（zh-hant → zh_hant）。 */
const identOf = (lang) => lang.replace(/[^A-Za-z0-9_]/g, '_');

/** 一张「语言 → 表」的生成行（缩进两格）。 */
function langTable(langs, entriesOf, indent = '  ') {
  return langs.map((lang) => indent + lang + ': { ' + entriesOf(lang).join(', ') + ' },').join('\n');
}

export function renderVocabulary(vocab, langs) {
  const tierRows = langTable(langs, (lang) => TIERS.map((t) => q(t) + ': ' + q(vocab.tierText[t][lang])));
  const sectionRows = langTable(langs, (lang) => SECTIONS.map((s) => q(s) + ': ' + q(vocab.sections[s][lang])));
  const labelRows = langTable(langs, (lang) => ROLES.map((r) => q(r) + ': ' + q(vocab.label[r][lang])));
  const closeRows = langs.map((lang) => '  ' + lang + ': ' + q(vocab.close[lang]) + ',').join('\n');
  return [
    HEAD,
    '/** 设计语言支持的语言（#1325；由 seals.yaml 叶子的语言列派生，加语言＝每个叶子补一列）。 */',
    'export type SealLanguage = ' + unionOf(langs) + ';',
    '',
    '/** 档位话（按语言）：卷轴标题下那一行 ＝ 悬停章的气泡（同一句话，两处渲染）。 */',
    "export const TIER_TEXT_BY_LANG: Record<SealLanguage, Record<'gold' | 'silver' | 'copper', string>> = {",
    tierRows,
    '};',
    '',
    '/** 卷轴三段小标题（按语言；行首朱砂小印取首字）。 */',
    "export const SECTION_LABEL_BY_LANG: Record<SealLanguage, Record<'progress' | 'status' | 'plan', string>> = {",
    sectionRows,
    '};',
    '',
    '/** 三枚章的印文约定（按语言；{product} 由各家的生成件代入产品名）。 */',
    "export const SEAL_LABEL_BY_LANG: Record<SealLanguage, Record<'help' | 'skill' | 'plugin', string>> = {",
    labelRows,
    '};',
    '',
    '/** 关闭钮（绦带）上的字（按语言）。 */',
    'export const CLOSE_LABEL_BY_LANG: Record<SealLanguage, string> = {',
    closeRows,
    '};',
    '',
  ].join('\n');
}

/** 一家三行（给定语言）：label 里的 {product} 由 labelExpr 代入。 */
function rowsOf(cfg, vocab, lang, indent) {
  return ROLES.map((role) => {
    const s = cfg.seals[role];
    return indent + '{ role: ' + q(role) + ' as const, tier: ' + q(s.tier) + ' as const, label: ' + labelExpr(vocab.label[role][lang]) + ', progress: ' + q(s.progress[lang]) + ', status: ' + q(s.status[lang]) + ', plan: ' + q(s.plan[lang]) + ' },';
  });
}

export function renderPlugin(pkg, cfg, vocab, langs) {
  const tables = langs.flatMap((lang) => [
    '  const ' + identOf(lang) + ' = [',
    ...rowsOf(cfg, vocab, lang, '    '),
    '  ];',
  ]);
  const first = identOf(langs[0]);
  const chain = langs.slice(1).map((lang) => "language === '" + lang + "' ? " + identOf(lang) + ' : ').join('') + first;
  return [
    HEAD,
    'export const SEAL_SEED = ' + String(cfg.seed) + ';',
    '',
    '/** 三枚章（HELP／技能／插件；面板按角色定序）。label 用 `seals.yaml` 的 vocabulary.label 约定。 */',
    'export function sealStates(product: string, language: ' + unionOf(langs) + " = 'zh') {",
    ...tables,
    '  return ' + chain + ';',
    '}',
    '',
  ].join('\n');
}

/** 全部产物：目标文件 → 内容。 */
export function renderAll() {
  const { langs, vocab, plugins } = readSeals();
  const out = new Map();
  out.set(join(ROOT, 'packages', 'plugin-manager', 'src', 'seal-vocabulary.generated.ts'), renderVocabulary(vocab, langs));
  for (const [pkg, cfg] of plugins) out.set(join(ROOT, 'packages', cfg.dir, 'src', 'seal-states.generated.ts'), renderPlugin(pkg, cfg, vocab, langs));
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const all = renderAll();
  if (process.argv.includes('--check')) {
    let stale = 0;
    for (const [file, want] of all) {
      const rel = file.replace(ROOT + '\\', '');
      const have = existsSync(file) ? readFileSync(file, 'utf8') : null;
      if (have !== want) { stale += 1; console.log('STALE ' + rel + (have === null ? '（缺文件）' : '')); }
    }
    console.log('RESULT: files=' + all.size + ' stale=' + stale);
    if (stale > 0) process.exit(1);
  } else {
    for (const [file, content] of all) { writeFileSync(file, content); console.log('written ' + file.replace(ROOT + '\\', '')); }
    console.log('共 ' + all.size + ' 份（1 份设计语言 + ' + (all.size - 1) + ' 份章状态）');
  }
}
