#!/usr/bin/env node
/**
 * #1231 · 跨包重复串的单一来源生成器。
 *
 * 它守什么：六家单品插件各写一份、总管再镜像一份的那几处串，原先是**七份手写副本**——
 * 客户端通道名（七份）、分组标题「高级」（七份）、缺总管提示（六份）、产品名（六家各两份：
 * 本家页签词条 ＋ 总管导航词条）。漂开一次就是屏上一半长名一半短名、或面板取不到某家的
 * 配置体检。本文件把它们的**唯一可编辑处**收到 `tooling/shared-copy.json`：改那张表，再跑
 *
 *     node tooling/gen-shared-copy.mjs           # 写：生成七份词条表的生成段 + 七个 generated.ts
 *     node tooling/gen-shared-copy.mjs --check   # 判：盘上 ≡ 表派生出来的样子（漂移红，exit 1）
 *
 * 形状照 `packages/base-combos/scripts/gen-present.mjs`（唯一可编辑处 → 构建期生成多份）：
 * 纯函数一律导出给测试断言「盘上 == 生成输出」，**只有直接执行才写盘**（import 不覆盖）。
 *
 * 三段产物：
 *   ① 七份 `packages/<包>/src/entries/{zh,en}.ts` 的**生成段**（表内最后一块，两个标记行夹住）；
 *   ② 六家 `packages/<包>/src/shared-copy.generated.ts`：本家 `RPC_CHANNEL`；
 *   ③ 总管 `packages/plugin-manager/src/shared-copy.generated.ts`：六家的 `PLUGIN_CHANNELS`。
 *
 * 生成段之外的既有行**原样透传**（逐字节，连注释与空行都不动）：所以本文件只认它点名的那几条 key，
 * 别的手写词条再多也不归它管。行尾一律 LF——见到 CRLF 直接拒绝，不替谁改行尾。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
export const DEFAULT_TABLE = join(HERE, 'shared-copy.json');

/** 词条表的语言列（与 tooling/i18n-langs.mjs 的 LANGUAGES 同两门；加语言时这里跟着加）。 */
export const LANGS = ['zh', 'en'];

/** 生成段起点（含）。整行匹配，缩进两格＝表内一级。 */
export const MARK_BEGIN = '  /* ══ #1231 共享词条：由 tooling/gen-shared-copy.mjs 自 tooling/shared-copy.json 生成，勿手改 ══ */';
/** 生成段终点（含）。 */
export const MARK_END = '  /* ══ #1231 共享词条生成段结束 ══ */';
/** 词条表尾（生成段永远紧挨在它前面）。 */
export const TABLE_END = '} as const satisfies MessageTable;';

/** 单段通道名的形状（与 test/plugin-p10-boundaries.test.mjs:93 那条断言同一条正则）。 */
const CHANNEL_RE = /^\/[A-Za-z0-9._~-]+$/;

/** 读唯一可编辑处。坏 JSON 直接抛（不静默）。 */
export function loadSharedCopy(path = DEFAULT_TABLE) {
  if (!existsSync(path)) throw new Error('来源表不存在：' + path);
  let data;
  try { data = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { throw new Error('来源表 JSON 坏：' + path + ' → ' + e.message); }
  return data;
}

/** 表的结构判据：缺一格／撞一格就拒绝生成，不许带着坏表往下写。返回错误清单（空＝合格）。 */
export function validateTable(t) {
  const errs = [];
  const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!t || typeof t !== 'object') return ['表不是对象'];
  if (!t.shared || !t.manager || !Array.isArray(t.plugins)) return ['表缺 shared／manager／plugins 三块之一'];
  for (const lang of LANGS) {
    if (!nonEmpty(t.shared.advancedGroupTitle?.[lang])) errs.push('shared.advancedGroupTitle.' + lang + ' 不是非空串');
    const hint = t.shared.missingManagerHint?.[lang];
    if (!nonEmpty(hint)) errs.push('shared.missingManagerHint.' + lang + ' 不是非空串');
    else if (!hint.includes('{plugin}')) errs.push('shared.missingManagerHint.' + lang + ' 缺 {plugin} 占位符（六家要展开成各自的包名）');
  }
  if (!nonEmpty(t.manager?.dir) || !nonEmpty(t.manager?.advancedKey)) errs.push('manager.dir／manager.advancedKey 须为非空串');
  else if (!t.manager.advancedKey.startsWith(t.manager.dir + '.')) errs.push('manager.advancedKey 不在本包命名空间（' + t.manager.dir + '.…）里');
  if (t.plugins.length === 0) errs.push('plugins 为空');
  const seen = { dir: new Set(), plugin: new Set(), skill: new Set(), channel: new Set(), navKey: new Set() };
  for (const p of t.plugins) {
    const at = 'plugins[' + (p && p.dir ? p.dir : '?') + ']';
    if (!nonEmpty(p?.dir)) { errs.push(at + '.dir 不是非空串'); continue; }
    if (p.dir === t.manager.dir) errs.push(at + '.dir 与 manager.dir 撞车');
    for (const f of ['plugin', 'skill', 'channel']) if (!nonEmpty(p[f])) errs.push(at + '.' + f + ' 不是非空串');
    for (const f of ['dir', 'plugin', 'skill', 'channel']) {
      if (!nonEmpty(p[f])) continue;
      if (seen[f].has(p[f])) errs.push(at + '.' + f + ' 重复：' + p[f]);
      seen[f].add(p[f]);
    }
    if (nonEmpty(p.channel) && !CHANNEL_RE.test(p.channel)) errs.push(at + '.channel 不是单段路由名：' + p.channel);
    for (const lang of LANGS) if (!nonEmpty(p.productName?.[lang])) errs.push(at + '.productName.' + lang + ' 不是非空串');
    for (const k of ['slot', 'settings', 'bridge']) {
      const key = p.entriesKeys?.[k];
      if (!nonEmpty(key)) { errs.push(at + '.entriesKeys.' + k + ' 不是非空串'); continue; }
      if (!key.startsWith(p.dir + '.')) errs.push(at + '.entriesKeys.' + k + ' 不在本包命名空间里：' + key);
    }
    if (!nonEmpty(p.managerNavKey)) errs.push(at + '.managerNavKey 不是非空串');
    else {
      if (!p.managerNavKey.startsWith(t.manager.dir + '.')) errs.push(at + '.managerNavKey 不在总管命名空间里：' + p.managerNavKey);
      if (seen.navKey.has(p.managerNavKey)) errs.push(at + '.managerNavKey 重复：' + p.managerNavKey);
      seen.navKey.add(p.managerNavKey);
    }
  }
  return errs;
}

/** 一个包该进生成段的那几条 (key, 值)：六家是 页签名／「高级」／缺总管提示，总管是「高级」＋六家页签名。 */
export function sharedEntries(table, pkg) {
  const adv = table.shared.advancedGroupTitle;
  if (pkg.dir === table.manager.dir) {
    const navs = table.plugins.map((p) => [p.managerNavKey, p.productName]);
    return {
      zh: [[table.manager.advancedKey, adv.zh], ...navs.map(([k, v]) => [k, v.zh])],
      en: [[table.manager.advancedKey, adv.en], ...navs.map(([k, v]) => [k, v.en])],
    };
  }
  const out = { zh: [], en: [] };
  for (const lang of LANGS) {
    out[lang] = [
      [pkg.entriesKeys.slot, pkg.productName[lang]],
      [pkg.entriesKeys.settings, adv[lang]],
      [pkg.entriesKeys.bridge, table.shared.missingManagerHint[lang].replaceAll('{plugin}', pkg.plugin)],
    ];
  }
  return out;
}

/** 一个包在生成段里拥有的全部 key（两种语言同一批）。 */
export function ownedKeys(table, pkg) {
  const byLang = sharedEntries(table, pkg);
  return [...new Set(LANGS.flatMap((lang) => byLang[lang].map(([k]) => k)))];
}

/** 词条行（与既有表逐字同形：两空格缩进、单引号 key、双引号值、末尾逗号）。 */
export function entryLine(key, value) {
  if (!/^[A-Za-z0-9_.-]+$/.test(key)) throw new Error('词条 key 形状不认：' + key);
  return "  '" + key + "': " + JSON.stringify(value) + ',';
}

/** 把一对对的 (key, 值) 折成生成段（含首尾标记行）。 */
export function renderEntryBlock(pairs) {
  return [MARK_BEGIN, ...pairs.map(([k, v]) => entryLine(k, v)), MARK_END];
}

/**
 * 把生成段写进一份词条表：先摘掉旧生成段、摘掉同名的手写行，再把新段贴在表尾。
 *
 * **既有其它行原样透传**（逐字节）；见到 CRLF、缺表尾、标记只剩一半、表尾之后还有内容，一律抛。
 * 返回 { lines, removed }——removed 是这次摘掉的手写行（首轮迁移与撞名都靠它曝光）。
 */
export function spliceTable(text, pairs, label = '词条表') {
  if (text.includes('\r')) throw new Error(label + ' 出现 CRLF：本仓词条表一律 LF，生成器不替你改行尾');
  const lines = text.split('\n');
  const ends = lines.map((l, i) => (l === TABLE_END ? i : -1)).filter((i) => i >= 0);
  if (ends.length !== 1) throw new Error(label + ' 表尾「' + TABLE_END + '」应恰好一处，实得 ' + ends.length + ' 处');
  const beginAt = lines.indexOf(MARK_BEGIN);
  const endAt = lines.indexOf(MARK_END);
  if ((beginAt < 0) !== (endAt < 0)) throw new Error(label + ' 生成段标记只剩一半（起点 ' + beginAt + '／终点 ' + endAt + '）');
  if (beginAt >= 0 && endAt < beginAt) throw new Error(label + ' 生成段标记顺序反了');
  const block = renderEntryBlock(pairs);
  const owned = new Set(pairs.map(([k]) => k));
  const removed = [];
  const body = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (beginAt >= 0 && i >= beginAt && i <= endAt) continue; // 旧生成段整块换掉
    const ln = lines[i];
    const m = /^  '([^']+)':/.exec(ln);
    if (m && owned.has(m[1])) { removed.push({ key: m[1], line: ln }); continue; } // 同名手写行摘掉（首轮迁移）
    body.push(ln);
  }
  const closeAt = body.indexOf(TABLE_END);
  const tail = body.slice(closeAt + 1);
  if (tail.some((l) => l.trim() !== '')) throw new Error(label + ' 表尾之后还有内容：生成段只住表内');
  const next = [...body.slice(0, closeAt), ...block, TABLE_END, ...tail].join('\n');
  for (const key of owned) {
    const hits = next.split("  '" + key + "':").length - 1;
    if (hits !== 1) throw new Error(label + ' 里 key ' + key + ' 应恰好一条，实得 ' + hits + ' 条（手写行没摘净？）');
  }
  return { next, removed };
}

/** TS 字符串字面量：优先单引号（与本仓既有常量同形），值里带单引号才退回双引号。 */
function tsString(v) {
  return v.includes("'") ? JSON.stringify(v) : "'" + v + "'";
}

/** 七个 generated.ts 之一的内容：六家是本家通道名，总管是六家的通道名表。 */
export function renderGeneratedTs(table, pkg) {
  const head = [
    '/** @generated —— 由 tooling/gen-shared-copy.mjs 自 tooling/shared-copy.json 生成，手改无效（#1231 守漂移）。',
    ' *',
    ' *  客户端通道名原先是七份手写副本（六家各自的契约件 ＋ 总管导航表）；漂开一次，面板就取不到那家',
    ' *  的配置体检（#735 实测的恒空回执）。现在唯一可编辑处是 tooling/shared-copy.json：改那张表再跑',
    ' *  `node tooling/gen-shared-copy.mjs`，`--check` 判「盘上 ≡ 表派生」。',
    ' */',
  ];
  if (pkg.dir === table.manager.dir) {
    const rows = table.plugins.map((p) => '  ' + p.skill + ': ' + tsString(p.channel) + ',');
    return [...head, 'export const PLUGIN_CHANNELS = {', ...rows, '} as const;', ''].join('\n');
  }
  return [...head, 'export const RPC_CHANNEL = ' + tsString(pkg.channel) + ' as const;', ''].join('\n');
}

/** 全部产物：{ file: 仓库相对路径, kind, current, next }。只读盘，不写。 */
export function plan(table, root = ROOT) {
  const pkgs = [...table.plugins, { dir: table.manager.dir }];
  const out = [];
  for (const pkg of pkgs) {
    const byLang = sharedEntries(table, pkg);
    for (const lang of LANGS) {
      const file = 'packages/' + pkg.dir + '/src/entries/' + lang + '.ts';
      const full = join(root, file);
      if (!existsSync(full)) throw new Error('词条表不存在：' + file);
      const current = readFileSync(full, 'utf8');
      const { next } = spliceTable(current, byLang[lang], file);
      out.push({ file, kind: 'entries', current, next });
    }
    const file = 'packages/' + pkg.dir + '/src/shared-copy.generated.ts';
    const full = join(root, file);
    out.push({ file, kind: 'generated', current: existsSync(full) ? readFileSync(full, 'utf8') : '', next: renderGeneratedTs(table, pkg) });
  }
  return out;
}

/** 多重集差异（只印前 N 处，够定位就行；不印整份文件）。
 *
 *  为什么不用按行对齐的 diff：生成段整块挪到表尾，对齐口径会把「同一行换了位置」画成一串
 *  无关的 -／+ 对，读的人分不出哪一行是真的动了。这里只回答「少了哪些行、多了哪些行」。 */
export function diffLines(current, next, limit = 40) {
  const a = current.split('\n');
  const b = next.split('\n');
  const tally = (lines) => {
    const m = new Map();
    for (const l of lines) m.set(l, (m.get(l) ?? 0) + 1);
    return m;
  };
  const leftInB = tally(b);
  const leftInA = tally(a);
  const out = [];
  for (const l of a) {
    const n = leftInB.get(l) ?? 0;
    if (n > 0) leftInB.set(l, n - 1);
    else if (out.length < limit) out.push('  - ' + l);
  }
  for (const l of b) {
    const n = leftInA.get(l) ?? 0;
    if (n > 0) leftInA.set(l, n - 1);
    else if (out.length < limit) out.push('  + ' + l);
  }
  return out;
}

function main() {
  const check = process.argv.includes('--check');
  let table;
  try { table = loadSharedCopy(); }
  catch (e) { console.error('FAIL: ' + e.message); process.exit(2); }
  const errs = validateTable(table);
  if (errs.length > 0) {
    for (const e of errs) console.error('RED ' + e);
    console.error('FAIL: 来源表不合格（' + errs.length + ' 处），什么都没写');
    process.exit(2);
  }
  const files = plan(table);
  const same = [];
  const changed = [];
  for (const f of files) {
    if (f.current === f.next) { same.push(f.file); continue; }
    changed.push(f);
    if (check) {
      console.log('DRIFT ' + f.file);
      for (const l of diffLines(f.current, f.next)) console.log(l);
    } else {
      writeFileSync(join(ROOT, f.file), f.next);
      console.log('WRITE ' + f.file);
    }
  }
  console.log('SAME  ' + same.length + '／CHANGED ' + changed.length + '（产物 ' + files.length + ' 份：词条表 ' + LANGS.length * (table.plugins.length + 1) + ' ＋ generated.ts ' + (table.plugins.length + 1) + '）');
  if (check) {
    if (changed.length > 0) {
      console.error('FAIL: ' + changed.length + ' 份产物与来源表对不上——跑 node tooling/gen-shared-copy.mjs 重生成，别手改生成段');
      process.exit(1);
    }
    console.log('PASS: 七份词条表生成段与七个 generated.ts 都与 tooling/shared-copy.json 一致（' + files.length + ' 份产物）');
    return;
  }
  console.log(changed.length === 0 ? 'DONE: 盘上已是最新（幂等，未写一个字节）' : 'DONE: 写入 ' + changed.length + ' 份');
}

const isMain = (() => {
  try { return process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false; }
  catch { return false; }
})();
if (isMain) main();
