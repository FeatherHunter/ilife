#!/usr/bin/env node
/** #95 返修 · 变异自证驱动（每个修复项：**红 → 还原 sha256 相同 → 绿**）。
 *
 * 纪律（协议「变异实验」口径）：
 *   - 只碰本票独占路径；每个变异前记录 sha256，还原后复核 sha256 相同；
 *   - 任何异常都在 finally 里还原（不允许留下变异态）；
 *   - 必须**持 gate.lock** 运行（涉及 build／test／npm）：`node docs/research/t95-rework-mutate.mjs`
 *
 * 用法：node docs/research/t95-rework-mutate.mjs [F1 F2 ...]（省略 = 全部）
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const node = (args, opts = {}) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', ...opts });
const pnpm = (args) => spawnSync('pnpm', args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
const out = (r) => ((r.stdout || '') + '\n' + (r.stderr || ''));
const leftovers = () => {
  const hit = [];
  for (const base of [tmpdir(), root, join(root, '.scratch')]) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base, { withFileTypes: true })) if (d.isDirectory() && /^ilife-(fresh|pack|g3)-/.test(d.name)) hit.push(join(base, d.name));
  }
  return hit;
};

// 每个 case：mutate（唯一替换）＋ check(mutated) → { red, detail }
const CASES = [
  {
    id: 'F1',
    title: '临时根退回仓库内 → --tmp-hygiene 必红',
    target: 'tooling/check-publish.mjs',
    from: "const TMP_ROOT = tmpdir();",
    to: "const TMP_ROOT = join(root, '.scratch');",
    check: (mutated) => {
      const r = node(['tooling/check-publish.mjs', '--tmp-hygiene']);
      const t = out(r);
      return { red: r.status !== 0 && t.includes('临时根落在仓库内'), detail: 'exit ' + r.status + (t.includes('临时根落在仓库内') ? ' + 「临时根落在仓库内」' : '') };
    },
  },
  {
    id: 'F2',
    title: 'guardEv 去守卫（return resolve(p)）→ --guard-selftest 必红',
    target: 'docs/research/t95-publish-evidence.mjs',
    from: 'function guardEv(p) {',
    to: 'function guardEv(p) { return resolve(p);',
    check: (mutated) => {
      const r = node(['docs/research/t95-publish-evidence.mjs', '--guard-selftest']);
      const t = out(r);
      return { red: r.status !== 0 && t.includes('FAIL(guard)'), detail: 'exit ' + r.status };
    },
  },
  {
    id: 'F3',
    title: '删掉「公开出口断言未跑」记账 → G3 诚实性回归必红',
    target: 'tooling/check-publish.mjs',
    from: "  console.log('NOTE: 公开出口断言（安装态 import(<skill>/render)）**未跑**——受 registry base-paint 版本偏斜阻塞，待 base-paint 发版后补（#95 F3 记账，见 docs/research/t95-packaging-and-template-loading.md）。');",
    to: '',
    check: (mutated) => {
      const r = node(['docs/research/t95-g3-honesty.mjs']);
      const t = out(r);
      return { red: r.status !== 0 && t.includes('公开出口断言未如实记账'), detail: 'exit ' + r.status };
    },
  },
  {
    id: 'F4',
    title: 'G3 结论改回无条件「契约键打通」→ 诚实性回归必红',
    target: 'tooling/check-publish.mjs',
    from: "  ok('G3 安装态：' + tplMsg + '；' + contractMsg);",
    to: "  ok('G3 安装态 cliPath 解析 + 契约键打通');",
    check: (mutated) => {
      const r = node(['docs/research/t95-g3-honesty.mjs']);
      const t = out(r);
      return { red: r.status !== 0 && (t.includes('契约断言未标注「未跑」') || t.includes('没跑却宣称成功')), detail: 'exit ' + r.status };
    },
  },
  {
    id: 'F7',
    title: 'loadTemplate 的 catch 改成 return \'\' → skill-t11 必红',
    target: 'packages/skill-calorie/src/render/templates.ts',
    from: "  catch { throw new CalorieRenderError('missing-data', '模板缺失：' + name); }",
    to: "  catch { return ''; }",
    pre: () => pnpm(['build']),
    check: (mutated) => {
      const r = node(['--test', 'packages/skill-calorie/test/skill-t11.test.mjs']);
      const t = out(r);
      const red = r.status !== 0 && t.includes('缺件必须抛 missing-data');
      return { red, detail: 'exit ' + r.status + (r.status !== 0 ? ' + 缺件断言红' : '（7/7 绿）') };
    },
  },
  {
    id: 'F8',
    title: 'files 只发 1 件模板 → G3 逐件断言必红（旧实现失明）',
    target: 'packages/skill-calorie/package.json',
    from: '"templates/*.html"',
    to: '"templates/help.html"',
    check: (mutated) => {
      const r = node(['tooling/check-publish.mjs', '--fresh-tmp', '--only', 'skill-calorie']);
      const t = out(r);
      return { red: r.status !== 0 && t.includes('安装态少发模板'), detail: 'exit ' + r.status + (t.includes('安装态少发模板') ? ' + 「安装态少发模板 5 件」' : '') };
    },
  },
  {
    id: 'F9',
    title: '删掉 G3 的 finally 清理 → 临时目录残留（用完即清有牙）',
    target: 'tooling/check-publish.mjs',
    from: "    for (const [d, label] of [[inst, '安装目录'], [packDir, '打包目录']]) {\n      try { rmTmp(d, TMP_ROOT); } catch (e) { fail('临时根清理失败（' + label + '）：' + e.message); }\n    }",
    to: "    for (const [d, label] of [[inst, '安装目录'], [packDir, '打包目录']]) { void d; void label; }",
    check: (mutated) => {
      const before = leftovers();
      const r = node(['tooling/check-publish.mjs', '--fresh-tmp', '--only', 'skill-calorie']);
      const after = leftovers().filter((p) => !before.includes(p));
      if (mutated) {
        for (const p of after) { try { spawnSync(process.platform === 'win32' ? 'cmd' : 'rm', process.platform === 'win32' ? ['/c', 'rmdir', '/s', '/q', p] : ['-rf', p], { encoding: 'utf8' }); } catch { /* 清不掉就留着，报告里点名 */ } }
        return { red: after.length > 0, detail: 'exit ' + r.status + '；新增残留 ' + after.length + ' 个' + (after.length ? '：' + after.map((p) => p.replace(tmpdir(), '%TMP%')).join(', ') : '') };
      }
      return { red: false, detail: 'exit ' + r.status + '；新增残留 ' + after.length + ' 个' };
    },
  },
  {
    id: 'F5',
    title: '证据文档锚点：符号锚必须存在、旧行号锚必须已消失',
    target: 'docs/research/t95-packaging-and-template-loading.md',
    static: () => {
      const doc = readFileSync(join(root, 'docs/research/t95-packaging-and-template-loading.md'), 'utf8');
      const src = readFileSync(join(root, 'tooling/check-publish.mjs'), 'utf8');
      const missing = ['WITH_TEMPLATES', 'TEMPLATE_NAMES', 'gateTarball()', 'gateFreshTmp()'].filter((s) => !doc.includes(s) || !src.includes(s.replace('()', '')));
      // 判据：文档里不得再出现「文件名:行号」形式的引用（F5 缺陷描述里引用旧锚点不算——它不带文件名）。
      const cited = [...doc.matchAll(/check-publish\.mjs:\d+/g)].map((m) => m[0]);
      return {
        red: false,
        detail: '缺符号 ' + missing.length + ' 个；带行号的引用 ' + cited.length + ' 处' + (cited.length ? '：' + cited.join(',') : ''),
        ok: missing.length === 0 && cited.length === 0,
      };
    },
  },
  {
    id: 'F6',
    title: '双路验收文档：旧假陈述必须已删、新陈述须含 loader 与 #107',
    target: 'docs/calorie-dual-path-acceptance.md',
    static: () => {
      const doc = readFileSync(join(root, 'docs/calorie-dual-path-acceptance.md'), 'utf8');
      const stale = doc.includes('只被测试读取的死资产') || doc.includes('HTML 一律以代码形式提供');
      const fresh = doc.includes('运行时读盘 loader') && doc.includes('#107');
      return { red: false, detail: '旧假陈述残留 ' + (stale ? '是' : '否') + '；新陈述含 loader＋#107 ' + (fresh ? '是' : '否'), ok: !stale && fresh };
    },
  },
];

const want = process.argv.slice(2).filter((s) => !s.startsWith('-'));
const cases = want.length ? CASES.filter((c) => want.includes(c.id)) : CASES;
let bad = 0;
const saved = new Map();

try {
  console.log('| 项 | 变异 | 变异态（期望红） | 还原后（期望绿） | sha256 前后一致 |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const c of cases) {
    const p = join(root, c.target);
    const before = readFileSync(p, 'utf8');
    const shaBefore = sha(p);
    saved.set(p, before);

    if (c.static) {
      const r = c.static();
      const okc = !!r.ok;
      if (!okc) bad++;
      console.log(`| ${c.id} | 静态锚点检查 | ${r.detail} | — | — |`);
      continue;
    }

    // 变异（唯一替换）
    const idx = before.indexOf(c.from);
    if (idx < 0 || before.indexOf(c.from, idx + 1) >= 0) { console.error(`FAIL(${c.id}): 变异锚点不唯一/不存在：${JSON.stringify(c.from.slice(0, 60))}`); bad++; continue; }
    writeFileSync(p, before.replace(c.from, c.to), 'utf8');
    if (c.pre) c.pre();
    const red = c.check(true);

    // 还原
    writeFileSync(p, before, 'utf8');
    if (c.pre) c.pre();
    const shaAfter = sha(p);
    const same = shaBefore === shaAfter;
    const green = c.check(false);

    const okRed = red.red;
    const okGreen = !green.red;
    if (!okRed || !okGreen || !same) bad++;
    console.log(`| ${c.id} | ${c.title} | ${okRed ? '红 ✅' : '未红 ❌'}（${red.detail}） | ${okGreen ? '绿 ✅' : '未绿 ❌'}（${green.detail}） | ${same ? '一致 ✅' : '不一致 ❌'} |`);
  }
} finally {
  for (const [p, content] of saved) {
    try { if (readFileSync(p, 'utf8') !== content) { writeFileSync(p, content, 'utf8'); console.error('已强制还原：' + p); } } catch (e) { console.error('还原失败：' + p + ' ' + e.message); }
  }
}
if (bad) { console.error('t95 返修变异自证：' + bad + ' 项未达标'); process.exit(1); }
console.log('t95 返修变异自证：PASS（红 → 还原 sha256 相同 → 绿）');
