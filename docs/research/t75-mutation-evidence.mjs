#!/usr/bin/env node
/** #75 变异自证（mutation evidence）：逐个破坏实现 → 断言**对应测试／证据脚本变红** → 还原。
 *
 * 跑法：`node docs/research/t75-mutation-evidence.mjs`（需先 `pnpm build`）
 * 判定：每条变异必须让**指定判据**变红；任一变异「没红」即 `exit 1`（不得假绿）。
 * 口径：
 *  - 变异打在 **`packages/base-render/dist/`（构建产物，未入 git、可重生成）** 上，跑的是
 *    **仓内真实测试文件** `packages/base-render/test/style.test.mjs`（不是脚本自带副本）；
 *    其中 M10／M11／M12／M14／M15／M16／M18／M19 跑的是**真视觉证据脚本**
 *    （`docs/research/t75-visual-evidence.mjs`），证明「圆角严格集／契约外部 oracle／
 *    errorReceipt 等价／toast 入场动效／copied 态／helpers 结构」等断言对变异敏感；
 *  - `P1` 是**无变异探针**：显式设 `DSH_BROWSER` 为不存在的路径 → 视觉脚本必须 `exit 1`
 *    （返修项⑦：旧实现静默回落硬编码 Chrome）；
 *  - **命中判据只从「失败行」取**（返修 W7）：`node --test` 只看 `✖` 行，视觉脚本只看
 *    `**FAIL**` 表行 —— 旧实现用 `out.includes(name)`，node 报告里的 `✔ <同名>` 也会命中
 *    （判据形同虚设）；
 *  - 每条变异前把整份 `dist` 备份到 `os.tmpdir()`，`finally` 无条件还原；
 *  - 还原失败 → 立即 `exit 1` 并提示 `pnpm build`。
 */
import { readFileSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { basename, join, dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROOT, 'packages', 'base-render', 'dist');
const TEST_REL = 'packages/base-render/test/style.test.mjs';
const VISUAL_REL = 'docs/research/t75-visual-evidence.mjs';

/** 协议 §2.1 第 3 条（全仓事故后新增）：递归删除必须先做路径守卫。
 *  本脚本**只在** `os.tmpdir()` 下的独占备份目录上递归删除；
 *  `packages/base-render/dist` 的还原改为**逐文件覆盖**（不做递归删除）。 */
const TMP_ROOT = resolve(tmpdir());
const FORBIDDEN_DIRS = ['node_modules', 'packages', 'docs', 'test', 'tooling', '.git']
  .map((d) => join(ROOT, d).toLowerCase() + sep);
function safeRm(dir, ownPrefix) {
  const abs = resolve(dir);
  const lower = abs.toLowerCase();
  if (!lower.startsWith(TMP_ROOT.toLowerCase() + sep) || !basename(abs).startsWith(ownPrefix)) {
    throw new Error('路径守卫失败（不在独占临时根下）：拒绝递归删除 ' + abs);
  }
  for (const p of FORBIDDEN_DIRS) {
    if (lower === p.slice(0, -1) || lower.startsWith(p)) throw new Error('路径守卫失败（敏感目录之下）：' + abs);
  }
  rmSync(abs, { recursive: true, force: true });
}

const STYLE_TEST_CMD = [process.execPath, ['--test', TEST_REL]];
const VISUAL_CMD = [process.execPath, [VISUAL_REL]];

/** 只替换一次（命中数必须为 1，否则抛错 → 变异表锚点漂移会显式失败而不是静默跳过）。 */
function replaceOnce(src, from, to) {
  const hits = src.split(from).length - 1;
  if (hits !== 1) throw new Error('锚点命中 ' + hits + ' 次（应为 1）：' + JSON.stringify(from.slice(0, 60)));
  return src.split(from).join(to);
}

/** 定位一条**规则块**（从 `marker` 行到其后第一条 `'}',` 行），在块内替换一条声明。 */
function replaceRuleDecl(src, marker, needle, replacement) {
  const lines = src.split(String.fromCharCode(10));
  const start = lines.findIndex((l) => l.includes(marker));
  if (start < 0) throw new Error('规则块锚点未命中：' + marker);
  if (lines.filter((l) => l.includes(marker)).length !== 1) throw new Error('规则块锚点不唯一：' + marker);
  let end = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "'}',") { end = i; break; }
  }
  if (end < 0) throw new Error('规则块结束锚点未命中：' + marker);
  const block = lines.slice(start, end + 1);
  const hits = block.filter((l) => l.includes(needle)).length;
  if (hits !== 1) throw new Error('声明在块内命中 ' + hits + ' 次（应为 1）：' + needle);
  const mutated = block.map((l) => (l.includes(needle) ? l.replace(needle, replacement) : l));
  return lines.slice(0, start).concat(mutated, lines.slice(end + 1)).join(String.fromCharCode(10));
}

/** 删除一整条规则块（marker 行 → 其后第一条 `'}',` 行）。 */
function deleteRule(src, marker) {
  const lines = src.split(String.fromCharCode(10));
  const start = lines.findIndex((l) => l.includes(marker));
  if (start < 0) throw new Error('规则块锚点未命中：' + marker);
  if (lines.filter((l) => l.includes(marker)).length !== 1) throw new Error('规则块锚点不唯一：' + marker);
  let end = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "'}',") { end = i; break; }
  }
  if (end < 0) throw new Error('规则块结束锚点未命中：' + marker);
  return lines.slice(0, start).concat(lines.slice(end + 1)).join(String.fromCharCode(10));
}

/** 变异表。`mutate(src)` 返回变异后文本；`cmd`／`expect` 指定必须变红的判据。
 *  `expect` 里的名字必须出现在命令输出里（测试名或证据行 id）。 */
const MUTATIONS = [
  {
    id: 'M1',
    label: '改一个 token 值（产出层硬编码错误值）',
    file: 'style.js',
    mutate: (src) => replaceOnce(src, "': ' + CSS_VAR_TOKENS[name] + ';'",
      "': ' + (name === '--fg' ? '#000000' : CSS_VAR_TOKENS[name]) + ';'"),
    cmd: STYLE_TEST_CMD,
    expect: ['T4 :root 块逐 token 逐值', 'T18b :root 块逐字节等于契约'],
  },
  {
    id: 'M2a',
    label: '去掉一个命名空间（emptyState 根类名改坏）',
    file: 'style.js',
    mutate: (src) => replaceOnce(src, "'.' + p + 'empty {'", "'.' + p + 'emptyX {'"),
    cmd: STYLE_TEST_CMD,
    expect: ['T8 每个区都有真实规则'],
  },
  {
    id: 'M2b',
    label: '去掉一个命名空间（删 helpShell 区实现 → 闭集守卫 fail-fast）',
    file: 'style.js',
    mutate: (src) => replaceOnce(src, 'helpShell: (p) => [', 'helpShellDisabled: (p) => ['),
    cmd: STYLE_TEST_CMD,
    expect: ['CONTROL_STYLE_SECTIONS 闭集缺样式区实现'],
    // 该变异让模块**导入即抛错** → 失败信息只出现在诊断／栈里（`✖` 行只有文件名），
    // 故按「错误文案出现在输出中」判定（仍要求 red：fail>0 由外层统一断言）。
    expectMode: 'message',
  },
  {
    id: 'M3',
    label: '让 extraCss 能改基座（追加改前置）',
    file: 'style.js',
    mutate: (src) => replaceOnce(src, 'parts.push(extraCss);', 'parts.unshift(extraCss);'),
    cmd: STYLE_TEST_CMD,
    expect: ['T15 extraCss 原样追加', 'T14 同源'],
  },
  {
    id: 'M4',
    label: 'charts 区重述（不再复用 chartsCss）',
    file: 'style.js',
    mutate: (src) => replaceOnce(src, 'charts: (p) => chartsCss(p),', "charts: (p) => '.ilife-charts{color:red}',"),
    cmd: STYLE_TEST_CMD,
    expect: ['T12 charts 区逐字节复用', 'T13 零装饰渐变'],
  },
  {
    id: 'M5',
    label: '类名撞车处置失效（errorReceipt 退回裸 .ilife-error）',
    file: 'style.js',
    mutate: (src) => replaceOnce(src, "'.' + p + 'error:has(> .' + p + 'error-title) {'", "'.' + p + 'error {'"),
    cmd: STYLE_TEST_CMD,
    expect: ['T21 类名撞车处置'],
  },
  {
    id: 'M6',
    label: '**删除 `.ilife-toast` 整条基座规则**（返修③核心变异：旧断言下全绿）',
    file: 'style.js',
    mutate: (src) => deleteRule(src, "'.' + p + 'toast {',"),
    cmd: STYLE_TEST_CMD,
    expect: ['T8 每个区都有真实规则', 'T23 运行时 toast'],
  },
  {
    id: 'M7',
    label: '**删除 `.ilife-copy-btn` 整条基座规则**（返修③核心变异：旧断言下全绿）',
    file: 'style.js',
    mutate: (src) => deleteRule(src, "'.' + p + 'copy-btn {',"),
    cmd: STYLE_TEST_CMD,
    expect: ['T8 每个区都有真实规则'],
  },
  {
    id: 'M8',
    label: '掏空 `.ilife-toast` 基座规则（只留 1 条声明 → 声明数下限必须拦住）',
    file: 'style.js',
    mutate: (src) => {
      const lines = src.split(String.fromCharCode(10));
      const start = lines.findIndex((l) => l.includes("'.' + p + 'toast {'"));
      let end = -1;
      for (let i = start + 1; i < lines.length; i += 1) if (lines[i].trim() === "'}',") { end = i; break; }
      return lines.slice(0, start + 1)
        .concat(["        '  display: flex;',"], lines.slice(end))
        .join(String.fromCharCode(10));
    },
    cmd: STYLE_TEST_CMD,
    expect: ['T8 每个区都有真实规则', '声明数不足'],
  },
  {
    id: 'M9',
    label: '重新加回 `.ilife-toast{flex-wrap:wrap}` 权宜补丁（W1：T23 的「补丁已删」断言必须变红）',
    file: 'style.js',
    mutate: (src) => replaceRuleDecl(src, "'.' + p + 'toast {',", '  align-items: flex-start;',
      "  align-items: flex-start;'," + String.fromCharCode(10) + "    '  flex-wrap: wrap;"),
    cmd: STYLE_TEST_CMD,
    expect: ['T23 运行时 toast'],
  },
  {
    id: 'M10',
    label: '`.ilife-toast-count` 圆角 8px → 6px（返修②：严格圆角集必须变红）',
    file: 'style.js',
    mutate: (src) => replaceRuleDecl(src, "'.' + p + 'toast-count {',", '  border-radius: 8px;', '  border-radius: 6px;'),
    cmd: VISUAL_CMD,
    expect: ['H-10c', 'H-10a'],
  },
  {
    id: 'M11',
    label: '冻结 token `--blue` 改 `#123456`（返修⑧：契约外部 oracle 必须变红）',
    file: 'spec/style.js',
    mutate: (src) => replaceOnce(src, "'--blue': '#007aff'", "'--blue': '#123456'"),
    cmd: VISUAL_CMD,
    expect: ['H-01c', 'H-01d'],
  },
  {
    id: 'M12',
    label: '`.ilife-error-actions` grid → flex（返修⑤：两行 grid 实测必须变红）',
    file: 'style.js',
    mutate: (src) => replaceRuleDecl(src, "'.' + p + 'error-actions {',", '  display: grid;', '  display: flex;'),
    cmd: VISUAL_CMD,
    expect: ['B-12i', 'B-12j'],
  },
  {
    id: 'M13',
    label: '删掉 `extraCss` 三禁守卫调用（返修⑨：T24 必须变红）',
    file: 'style.js',
    mutate: (src) => replaceOnce(src, 'assertExtraCss(extraCss);', ''),
    cmd: STYLE_TEST_CMD,
    expect: ['T24 extraCss 三禁强制'],
  },
  {
    id: 'M14',
    label: '删掉 `.ilife-toast{animation:…}`（W4：入场动效判据必须变红）',
    file: 'style.js',
    mutate: (src) => replaceRuleDecl(src, "'.' + p + 'toast {',", "  animation: ' + p + 'toast-in .22s", '  /* animation-removed */'),
    cmd: VISUAL_CMD,
    expect: ['H-21a'],
  },
  {
    id: 'M15',
    label: '`.ilife-copy-btn.copied` 背景改非成功色（W3：copied 变绿判据必须变红）',
    file: 'style.js',
    mutate: (src) => replaceRuleDecl(src, "'.' + p + 'copy-btn.copied {',", '  background: var(--ok);', '  background: #123456;'),
    cmd: VISUAL_CMD,
    expect: ['B-12m'],
  },
  {
    id: 'M16',
    label: '删掉 `.ilife-error-actions{max-width:520px}`（W5：旧 `.hm-actions` 等价判据必须变红）',
    file: 'style.js',
    mutate: (src) => replaceRuleDecl(src, "'.' + p + 'error-actions {',", '  max-width: 520px;', ''),
    cmd: VISUAL_CMD,
    expect: ['B-12j'],
  },
  {
    id: 'M17',
    label: 'statusBadge ok 字色 `#1f8c3d` → `#1f8f3d`（W2：旧逐值判据必须变红）',
    file: 'style.js',
    mutate: (src) => replaceRuleDecl(src, "'.' + p + 'status-badge-ok {',", '  color: #1f8c3d;', '  color: #1f8f3d;'),
    cmd: STYLE_TEST_CMD,
    expect: ['T25 statusBadge'],
  },
  {
    id: 'M18',
    label: '破坏 helpers 运行时 toast 结构（body 类名改坏 → W1 结构判据必须变红）',
    file: 'controls.js',
    mutate: (src) => replaceOnce(src, "'    body.className = BODY_CLASS;',", "'    body.className = \"no-body\";',"),
    cmd: VISUAL_CMD,
    expect: ['H-12d'],
  },
  {
    id: 'M19',
    label: '删掉 reduced-motion 下 `.ilife-toast{animation:none}`（W4 归零判据必须变红）',
    file: 'style.js',
    mutate: (src) => {
      const lines = src.split(String.fromCharCode(10));
      const i = lines.findIndex((l, idx) => l.includes("'  .' + p + 'toast {'")
        && (lines[idx + 1] || '').includes('animation: none;'));
      if (i < 0) throw new Error('reduced-motion 锚点未命中');
      return lines.slice(0, i + 1).concat(lines.slice(i + 2)).join(String.fromCharCode(10));
    },
    cmd: VISUAL_CMD,
    expect: ['H-21c'],
  },
  {
    id: 'P1',
    label: '**无变异探针**：`DSH_BROWSER` 指向不存在路径 → 视觉脚本必须显式 exit 1（返修⑦）',
    file: null,
    mutate: (src) => src,
    cmd: VISUAL_CMD,
    env: { DSH_BROWSER: join(tmpdir(), 't75-no-such-browser.exe') },
    expect: ['DSH_BROWSER 显式指向的浏览器不存在'],
    expectMode: 'message',
  },
];

if (!existsSync(DIST)) {
  console.error('证据缺失：dist 不存在，请先 `pnpm build`。**显式失败，不静默跳过**');
  process.exit(1);
}

const BACKUP = join(tmpdir(), 't75-dist-backup-' + process.pid);
cpSync(DIST, BACKUP, { recursive: true });

/** 变异触及的文件（相对 dist）；还原 = 逐文件覆盖回 dist。 */
const TOUCHED = [...new Set(MUTATIONS.map((m) => m.file).filter((f) => f !== null))];

/** 变异前的 sha256（协议：变异实验须**先记录目标文件 sha256**，还原后自证 sha 相同）。 */
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const BEFORE_SHA = new Map(TOUCHED.map((rel) => [rel, sha256(join(DIST, rel))]));

/** 还原：把备份**逐文件覆盖**回 `dist`（协议 §2.1：不对 `packages/**` 做递归删除），
 *  随后逐文件自证 **sha256 与变异前相同**。 */
const restore = () => {
  for (const rel of TOUCHED) {
    const from = join(BACKUP, rel);
    if (!existsSync(from)) continue;
    cpSync(from, join(DIST, rel), { force: true });
  }
  for (const rel of TOUCHED) {
    const now = sha256(join(DIST, rel));
    if (now !== BEFORE_SHA.get(rel)) {
      throw new Error('还原失败（sha256 不等）：' + rel + ' before=' + BEFORE_SHA.get(rel) + ' after=' + now + ' → 请 `pnpm build`');
    }
  }
  safeRm(BACKUP, 't75-dist-backup-');
};

const rows = [];
let bad = 0;

/** 跑一条命令，返回 {status, out}。 */
function run([exe, args], env) {
  const r = spawnSync(exe, args, {
    cwd: ROOT, encoding: 'utf8',
    env: env === undefined ? process.env : { ...process.env, ...env },
  });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const LF = String.fromCharCode(10);

/** **命中判据只从失败行取**（返修 W7）。
 *
 *  旧实现 `result.out.includes(name)`：`node --test` 的 `✔ <同名>`（通过用例）也会命中，
 *  「变异让对应测试变红」这一条就退化成「测试文件里存在这个名字」。
 *  现口径按命令分型：
 *  - `STYLE_TEST_CMD` → 只看 `✖` 行（spec reporter 的失败用例行；TAP 的 `not ok` 也收）；
 *  - 视觉脚本 → 只看表格里 `**FAIL**` 的行，且判据名必须取自该行的第 1 列；
 *  - `expectMode: 'message'`（无变异探针 P1）→ 只看非 PASS 的错误输出行。 */
function matchedExpect(m, out) {
  const lines = out.split(LF);
  // `expectMode:'message'`（导入即抛错的变异 M2b／无变异探针 P1）→ 只看非 PASS 的输出行。
  if (m.expectMode === 'message') {
    return m.expect.filter((name) => lines.some((l) => l.includes(name) && !l.includes('PASS')));
  }
  if (m.cmd === STYLE_TEST_CMD) {
    const failLines = lines.filter((l) => l.trimStart().startsWith('✖') || l.trimStart().startsWith('not ok'));
    return m.expect.filter((name) => failLines.some((l) => l.includes(name)));
  }
  const failedIds = lines
    .filter((l) => l.includes('**FAIL**'))
    .map((l) => (l.match(/^\|\s*([A-Za-z0-9-]+)\s*\|/) ?? [])[1])
    .filter((id) => typeof id === 'string');
  return m.expect.filter((name) => failedIds.includes(name));
}

try {
  for (const m of MUTATIONS) {
    const target = m.file === null ? null : join(DIST, m.file);
    const original = target === null ? '' : readFileSync(target, 'utf8');
    try {
      if (target !== null) writeFileSync(target, m.mutate(original), 'utf8');
    } catch (err) {
      rows.push({ id: m.id, label: m.label, verdict: 'FAIL', detail: '变异施加失败：' + err.message });
      bad += 1;
      continue;
    }
    let result;
    try {
      result = run(m.cmd, m.env);
    } finally {
      if (target !== null) writeFileSync(target, original, 'utf8');
    }
    const isStyleTest = m.cmd === STYLE_TEST_CMD;
    const failLine = (result.out.match(/^ℹ fail (\d+)$/m) ?? [])[1];
    const red = isStyleTest ? Number(failLine ?? 0) > 0 : result.status !== 0;
    // W7：只从失败行取名字（旧 `out.includes(name)` 会被 `✔ <同名>` 命中）。
    const matched = matchedExpect(m, result.out);
    const ok = red && matched.length > 0;
    if (!ok) bad += 1;
    rows.push({
      id: m.id,
      label: m.label,
      verdict: ok ? 'PASS' : 'FAIL',
      detail: (isStyleTest ? 'fail=' + (failLine ?? '?') : 'exit=' + result.status)
        + (m.expectMode === 'message' ? '；错误文案命中预期判据=' : '；失败行命中预期判据=')
        + (matched.join('／') || '无'),
    });
  }
} finally {
  restore();
}

// 还原后必须重新变绿（自证还原有效）。
const after = run(STYLE_TEST_CMD);
const afterFail = Number(((after.out || '').match(/^ℹ fail (\d+)$/m) ?? [])[1] ?? 1);

console.log('# #75 变异自证（mutation evidence）');
console.log('');
console.log('| 变异 | 破坏什么 | 结果 | 证据（对应判据是否变红） |');
console.log('|---|---|---|---|');
for (const r of rows) console.log('| ' + r.id + ' | ' + r.label + ' | ' + r.verdict + ' | ' + r.detail + ' |');
console.log('');
console.log('变异前 sha256（目标文件）：');
for (const rel of TOUCHED) console.log('  ' + rel + '  ' + BEFORE_SHA.get(rel));
console.log('还原后重跑 style.test.mjs：fail=' + afterFail + (afterFail === 0 ? '（绿，还原有效）' : '（红，还原失败 → 请 `pnpm build`）'));
console.log('还原自证：上述 sha256 逐文件与变异前**相同**（脚本内断言，不等即 exit 1）。');
console.log('RESULT: ' + (rows.filter((r) => r.verdict === 'PASS').length) + '/' + rows.length + ' 变异使对应判据变红');
if (bad > 0 || afterFail !== 0) process.exit(1);
