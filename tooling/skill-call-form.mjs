#!/usr/bin/env node
/** #742 · 技能侧说明面口径：单一来源 → 六份 SKILL.md 的生成器 ＋ 门。
 *
 * 事实边界（谁住哪）：
 *   - **唯一来源**＝`docs/agents/技能调用契约.md` 的 CALL-FORM 标记区之间的正文（那份文档 §七）。
 *     那段正文是对着 agent 说的，只用占位符描述取值，**不写任何宿主的名字**（维护者 2026-09-20 裁定）。
 *   - **渲染值**一律从各包 `package.json` 现算：`{cmd}`＝`bin` 里键名以 `-cmd-read` 收尾的那条，
 *     `{entry}`＝它的值去掉开头 `./`，`{pkg}`＝包名。谁都不许在正文里手写路径（入口布局可变，见契约 §四）。
 *   - **复制处**＝六个技能包 SKILL.md 里 CALL-FORM-START／CALL-FORM-END 两行标记之间的块；
 *     六份必须逐字同源，手改块会被本门打红。
 *
 * 跑法：
 *   node tooling/skill-call-form.mjs              # 写：把唯一来源渲染进六份（标记块之间）
 *   node tooling/skill-call-form.mjs --check      # 门：同源 ＋ 块外无旧写法（已挂 pnpm gen:check）
 *   node tooling/skill-call-form.mjs --selftest   # 变异自证：临时夹具上验证「写→绿／删块→红／旧写法→红」
 *
 * 门的三条判据：
 *   ① 六份都有且只有一块 CALL-FORM 标记区（缺标记即红，红信息里给放标记的修法）；
 *   ② 块内容 == 唯一来源按该包 `bin` 声明渲染出来的文本（逐字，忽略行尾差异）；
 *   ③ 块外零命中仓内相对路径／npm 全局安装写法／npx -p 取运行时／环境特定技能根（旧写法不许回潮）。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_REL = join('docs', 'agents', '技能调用契约.md');
const SRC_BEGIN = '<!-- CALL-FORM-BEGIN -->';
const SRC_END = '<!-- CALL-FORM-END -->';
const MARK_START = '<!-- CALL-FORM-START -->';
const MARK_END = '<!-- CALL-FORM-END -->';
const CMD_SUFFIX = '-cmd-read';

/** 旧写法：块外出现即红（这些是 #742 要清掉的口径本体）。 */
const STALE = [
  { re: /packages\/skill-[a-z-]+\/dist\//g, why: '仓内相对路径当入口' },
  { re: /npm install -g/g, why: '推 npm 全局安装（会装出第二份同名副本）' },
  { re: /npx -p\s/g, why: '钉版号的 npx 取运行时写法' },
  { re: /\.agents\/skills/g, why: '环境特定的技能根路径' },
];

function readText(file) {
  const raw = readFileSync(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  return { text: raw.replace(/\r\n/g, '\n'), eol };
}

/** 唯一来源正文（`CALL-FORM` 标记之间），首尾空行去掉。 */
function readTemplate(root) {
  const file = join(root, SOURCE_REL);
  const { text } = readText(file);
  const i = text.indexOf(SRC_BEGIN);
  const j = text.indexOf(SRC_END);
  if (i < 0 || j < 0 || j < i) throw new Error('唯一来源缺 CALL-FORM 标记区：' + file);
  return text.slice(i + SRC_BEGIN.length, j).replace(/^\n+|\n+$/g, '');
}

/** 现算一个技能包的渲染值；没有 `-cmd-read` 声明的包返回 null（不参与）。 */
function valuesOf(pkgDir) {
  const pj = join(pkgDir, 'package.json');
  if (!existsSync(pj)) return null;
  const j = JSON.parse(readFileSync(pj, 'utf8'));
  const bin = j.bin || {};
  const cmd = Object.keys(bin).find((k) => k.endsWith(CMD_SUFFIX));
  if (!cmd) return null;
  return { cmd, entry: String(bin[cmd]).replace(/^\.\//, ''), pkg: j.name };
}

function render(template, v) {
  return template.replaceAll('{cmd}', v.cmd).replaceAll('{entry}', v.entry).replaceAll('{pkg}', v.pkg);
}

/** 参与扫描的技能包：[{dir, name, file, values}]（按目录名排序，输出稳定）。 */
function targets(root) {
  const pkgsDir = join(root, 'packages');
  const out = [];
  for (const name of readdirSync(pkgsDir).sort()) {
    if (!name.startsWith('skill-')) continue;
    const dir = join(pkgsDir, name);
    const values = valuesOf(dir);
    if (!values) continue;
    const file = join(dir, 'SKILL.md');
    if (!existsSync(file)) continue;
    out.push({ dir, name, file, values });
  }
  return out;
}

function splitBlock(text, file) {
  const i = text.indexOf(MARK_START);
  const j = text.indexOf(MARK_END, i + 1);
  if (i < 0 || j < 0 || j < i) {
    throw new Error(
      '缺 CALL-FORM 标记块：' + file + '\n' +
      '  修法：在该技能「唯一出口／快速开始」附近放两行标记（内容留空），再跑 node tooling/skill-call-form.mjs：\n' +
      '    ' + MARK_START + '\n    ' + MARK_END);
  }
  return { i, j, body: text.slice(i + MARK_START.length, j).replace(/^\n+|\n+$/g, '') };
}

function staleHits(text, file) {
  const hits = [];
  const lines = text.split('\n');
  for (const { re, why } of STALE) {
    lines.forEach((ln, idx) => {
      const m = ln.match(re);
      if (m) hits.push(`${file}:${idx + 1} 命中「${m[0]}」（${why}）`);
    });
  }
  return hits;
}

function runWrite(root) {
  const tpl = readTemplate(root);
  let n = 0;
  for (const t of targets(root)) {
    const { text, eol } = readText(t.file);
    const { i, j } = splitBlock(text, t.file);
    const next = text.slice(0, i + MARK_START.length) + '\n\n' + render(tpl, t.values) + '\n' + text.slice(j);
    const out = eol === '\n' ? next : next.replace(/\n/g, eol);
    writeFileSync(t.file, out);
    console.log(`WROTE ${t.file.replace(root + '\\', '').replace(root + '/', '')}`);
    n++;
  }
  console.log(`PASS: 已把唯一来源写进 ${n} 份 SKILL.md`);
  return 0;
}

function runCheck(root) {
  const tpl = readTemplate(root);
  const reds = [];
  const list = targets(root);
  for (const t of list) {
    const { text } = readText(t.file);
    let block;
    try {
      block = splitBlock(text, t.file);
    } catch (e) {
      reds.push(String(e.message));
      continue;
    }
    const expected = render(tpl, t.values);
    if (block.body !== expected) reds.push(`RED 块与唯一来源不同：${t.file}（跑 node tooling/skill-call-form.mjs 覆盖）`);
    const outside = splitBlock(text, t.file); // 已解析，下面按「块外」扫
    const outsideText = text.slice(0, outside.i) + '\n' + text.slice(outside.j + MARK_END.length);
    reds.push(...staleHits(outsideText, t.file));
    if (text.split(MARK_START).length - 1 > 1) reds.push(`RED 标记块不止一个：${t.file}`);
  }
  if (list.length !== 6) reds.push(`RED 参与扫描的技能包应恰为 6 个，现为 ${list.length}（少说明少了 bin 声明或缺 SKILL.md）`);
  if (reds.length) {
    for (const r of reds) console.error(r);
    console.error(`RED: skill-call-form ${reds.length} 处不合格`);
    return 1;
  }
  console.log(`RESULT: ${list.length}/${list.length}`);
  console.log('PASS: 六份说明面与唯一来源逐字同源，块外无旧写法');
  return 0;
}

/** 变异自证：临时夹具上走「写→绿／删块→红／旧写法→红」。 */
function runSelftest() {
  const base = join(tmpdir(), 'skill-call-form-selftest');
  rmSync(base, { recursive: true, force: true });
  mkdirSync(join(base, 'docs', 'agents'), { recursive: true });
  mkdirSync(join(base, 'packages', 'skill-toy'), { recursive: true });
  // 夹具的包名与命令名要与真实六家不同，免得掩盖「占位符没渲染」这类缺陷。
  for (let i = 1; i <= 6; i++) mkdirSync(join(base, 'packages', `skill-toy${i}`), { recursive: true });
  const src = readFileSync(join(ROOT, SOURCE_REL), 'utf8');
  writeFileSync(join(base, SOURCE_REL), src);
  const names = Array.from({ length: 6 }, (_, i) => `skill-toy${i + 1}`);
  names.forEach((n, i) => {
    writeFileSync(join(base, 'packages', n, 'package.json'),
      JSON.stringify({ name: n, version: '0.0.0', bin: { [`toy${i + 1}-cmd-read`]: './dist/cli/cmd_read.js' } }, null, 2));
    writeFileSync(join(base, 'packages', n, 'SKILL.md'),
      `---\nname: ${n}\ndescription: 夹具\n---\n\n# 夹具\n\n${MARK_START}\n${MARK_END}\n`);
  });
  const steps = [];
  steps.push(['写 → 应绿', runWrite(base) === 0]);
  steps.push(['写完 --check → 应绿', runCheck(base) === 0]);
  const f = join(base, 'packages', names[0], 'SKILL.md');
  const kept = readFileSync(f, 'utf8');
  writeFileSync(f, kept.replace(MARK_START, '<!-- 拿掉了 -->'));
  steps.push(['拿掉一块 → 应红', runCheck(base) === 1]);
  writeFileSync(f, kept);
  steps.push(['写回 → 应绿', runCheck(base) === 0]);
  writeFileSync(f, kept.replace('# 夹具', '# 夹具\n\n照着 npm install -g skill-toy1 装一下即可'));
  steps.push(['块外注入旧写法 → 应红', runCheck(base) === 1]);
  writeFileSync(f, kept);
  let bad = 0;
  for (const [what, ok] of steps) {
    console.log(`${ok ? 'PASS' : 'RED '} ${what}`);
    if (!ok) bad++;
  }
  console.log(bad ? `RED: 变异自证 ${bad} 条不合格` : `PASS: 变异自证 ${steps.length}/${steps.length}`);
  return bad ? 1 : 0;
}

const arg = process.argv[2] || '';
let code;
try {
  if (arg === '--check') code = runCheck(ROOT);
  else if (arg === '--selftest') code = runSelftest();
  else if (arg === '') code = runWrite(ROOT);
  else {
    console.error('未知参数：' + arg + '（可用：无参＝写，--check，--selftest）');
    code = 2;
  }
} catch (e) {
  console.error('RED: ' + (e && e.message ? e.message : e));
  code = 1;
}
process.exit(code);
