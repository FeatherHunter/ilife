// 1073-proto-same.mjs 的规则级探针（#1073 造，2026-10-03 按 #1085 裁定、#1111 施工入仓）。
//
// 只跑「原型目录自比」是自欺：两份同样的字节谁都比得过，证明不了归一化干了活。
// 这里对每条规则各造两例：
//   · 该吸收的改动 → 必须仍然「结构同构」（exit 0），否则说明规则没生效
//   · 不该吸收的改动 → 必须 exit 1 并点名（否则说明规则吃掉了一切，判据失灵）
// 另加票面写死的那条：真实原型改一个字节 → exit 1 且给出字符位置。
//
// #1085 裁定扩面后新增三条（金额量级、脚本字面量时钟串、日志属性时钟串）：
//   它们今天之前都是红的——真跑产物与冻结原型之间必然出现这些差异，见 #1085 正文。
//
// 用法：node docs/skills/skill-bill/1073-proto-same-selftest.mjs
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');   // docs/skills/skill-bill → 仓根
const SAME = join(REPO, 'docs', 'skills', 'skill-bill', '1073-proto-same.mjs');
// 临时目录按进程与时刻唯一：固定目录名会让两个并发跑互相踩（#1111 顺手修掉的老毛病）。
const TMP = join(REPO, '.scratch', '1073', `selftest-${process.pid}-${Date.now()}`);
const ROOT = resolve(TMP);
const guard = (p) => {
  const a = resolve(p);
  if (a !== ROOT && !a.startsWith(ROOT + sep)) throw new Error(`路径守卫拒绝：${a}`);
  for (const f of ['packages', 'node_modules', 'docs', 'test', 'tooling', '.git']) {
    if (a.includes(`${sep}${f}${sep}`)) throw new Error(`路径守卫拒绝（落在 ${f} 下）：${a}`);
  }
  return a;
};

const page = (n, scene, cat, acct, amount, pct, day) => `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>样例 v1</title><style>.a{color:red;background:blue;padding:2px 4px}.b{margin:0;gap:4px}@media (max-width:390px){.c{top:0;left:0}}</style></head><body data-seq="7"><div class="page" id="r-12" data-row-id="a1b2c3d4"><p class="led">今天共 2 笔，支出 ${amount} 元</p><p class="cat">主要花在「${cat}」，占本页支出 ${pct}%。</p><p class="acc">账户 ${acct}</p><p class="when">${day}</p><p class="scene">${scene}</p><div class="copy" id="copyWrap"><button class="btn btn-secondary" type="button">复制数据</button></div><div class="cut">✂ 裁切线</div></div><button class="copy-item" type="button" data-t="场景标识&#10;${scene}（list）&#10;时间戳版本&#10;${day} 12:00:00 · 版本 0.1.0&#10;异常&#10;无">复制本页日志</button><script>var F={"category":"${cat}","account":"${acct}","amount":-${amount},"time":"${day}"};</script></body></html>`;

const P1 = page('1', '甲场景', '餐饮/外卖/午餐', '微信', '35.00', '100', '2026-10-02');
const P2 = page('2', '乙场景', '出行/地铁', '招行卡', '8000.00', '60', '2026-11-08');

rmSync(TMP, { recursive: true, force: true });
const BASE = join(TMP, 'base');
mkdirSync(BASE, { recursive: true });
writeFileSync(join(BASE, 't01-样例-v1.html'), P1);
writeFileSync(join(BASE, 't02-样例-v1.html'), P2);
const MAN = join(TMP, 'manifest.json');
writeFileSync(MAN, JSON.stringify({
  schema: 'skill-bill/proto-manifest@1', ticket: 1073, expect: { proto: 2 }, expectDomains: { test: 2 },
  items: [
    { seq: 1, domain: 'test', wake: '甲场景', version: 'v1', kind: 'proto', rel: 't01-样例-v1.html' },
    { seq: 2, domain: 'test', wake: '乙场景', version: 'v1', kind: 'proto', rel: 't02-样例-v1.html' },
  ],
}, null, 2));

const runCase = (name, expect, edit, expectFile = 't01-样例-v1.html') => {
  const A = join(TMP, 'actual-' + name);
  cpSync(BASE, A, { recursive: true });
  if (edit) edit(A);
  const r = spawnSync(process.execPath, [SAME, A, BASE, MAN], { cwd: REPO, encoding: 'utf8' });
  const ok = expect === 'green' ? r.status === 0 : (r.status === 1 && r.stdout.includes(expectFile) && r.stdout.includes('RESULT: FAIL'));
  const first = (r.stdout + r.stderr).trim().split('\n')[0];
  console.log(`[${ok ? 'OK  ' : 'BAD '}] ${name.padEnd(28)} 期望 ${expect.padEnd(5)} exit=${r.status} :: ${first}`);
  return ok;
};

const sub = (file, from, to) => (p) => {
  const f = join(p, file);
  const s = readFileSync(f, 'utf8');
  if (!s.includes(from)) throw new Error(`锚点找不到：${from}（${file}）`);
  writeFileSync(f, s.replace(from, to));
};
const subAll = (file, from, to) => (p) => {
  const f = join(p, file);
  const s = readFileSync(f, 'utf8');
  if (!s.includes(from)) throw new Error(`锚点找不到：${from}（${file}）`);
  writeFileSync(f, s.replaceAll(from, to));
};

let all = true;
const T = [];
/* ── 该吸收的（规则 1–6 逐条 ＋ #1085 扩面三条）────────────────────────── */
T.push(['规则1 运行期属性', 'green', sub('t01-样例-v1.html', '<div class="page" id="r-12" data-row-id="a1b2c3d4">', '<div data-generated-at="2026-10-03" data-ticket-no="1073" data-row-id="zz" class="page" id="r-12" data-thing-id="qq">')]);
T.push(['规则2 金额日期百分比', 'green', sub('t01-样例-v1.html', '支出 35.00 元', '支出 88.00 元')]);
T.push(['规则2b 日期换一天', 'green', sub('t01-样例-v1.html', '2026-10-02', '2026-11-30')]);
T.push(['规则2c 百分比换值', 'green', sub('t01-样例-v1.html', '100%', '60%')]);
T.push(['规则2d 单位一并吞掉', 'green', sub('t01-样例-v1.html', '今天共 2 笔，支出 35.00 元', '今天共 7 笔，支出 88.00 元')]);
T.push(['规则2e 金额量级变化', 'green', sub('t01-样例-v1.html', '支出 35.00 元', '支出 8000.00 元')]);
T.push(['规则2f 时钟串（脚本面）', 'green', subAll('t01-样例-v1.html', '2026-10-02', '2026-10-03')]);
T.push(['规则2g 时钟串（属性面）', 'green', sub('t01-样例-v1.html', '&#10;2026-10-02 12:00:00 · 版本 0.1.0', '&#10;2026-10-03 19:30:00 · 版本 0.1.0')]);
T.push(['规则3 枚举换值', 'green', (p) => {
  const f = join(p, 't01-样例-v1.html');
  writeFileSync(f, readFileSync(f, 'utf8').replaceAll('餐饮/外卖/午餐', '出行/地铁').replaceAll('微信', '招行卡').replaceAll('甲场景', '乙场景'));
}]);
T.push(['规则4 class 去 hash', 'green', sub('t01-样例-v1.html', 'class="page"', 'class="page-1a2b3c"')]);
T.push(['规则5 CSS 声明排序', 'green', sub('t01-样例-v1.html', '.a{color:red;background:blue;padding:2px 4px}.b{margin:0;gap:4px}', '.b{gap:4px;margin:0}.a{padding:2px 4px;background:blue;color:red}')]);
T.push(['规则6 标签间空白', 'green', sub('t01-样例-v1.html', '</p><p class="acc">', '</p>\n\n   <p class="acc">')]);

/* ── 不该吸收的（必须红）────────────────────────────────────────────── */
T.push(['可见文字改了', 'red', sub('t01-样例-v1.html', '复制数据', '复制表格')]);
T.push(['CSS 声明值改了', 'red', sub('t01-样例-v1.html', 'color:red', 'color:green')]);
T.push(['整块元素删了', 'red', sub('t01-样例-v1.html', '<div class="cut">✂ 裁切线</div>', '')]);
T.push(['属性值改了', 'red', sub('t01-样例-v1.html', 'type="button"', 'type="submit"')]);
T.push(['标题里的字改了', 'red', sub('t01-样例-v1.html', '<title>样例 v1</title>', '<title>样例 v2</title>')]);
T.push(['载荷里的分类换了', 'red', sub('t02-样例-v1.html', '"category":"出行/地铁"', '"category":"不存在的分类"'), 't02-样例-v1.html']);
T.push(['载荷里的文案改了', 'red', sub('t01-样例-v1.html', '异常&#10;无', '异常&#10;有'), 't01-样例-v1.html']);

/* ── 票面写死的那条：真实原型改一个字节 ───────────────────────────────── */
const REAL = join(REPO, 'docs', 'skills', 'skill-bill', 'proto');
const realCase = () => {
  const A = join(TMP, 'actual-real');
  cpSync(REAL, A, { recursive: true });
  const victim = join(A, 'query', 'w01-查今天-v2.1.html');
  const buf = readFileSync(victim);
  const at = buf.indexOf(Buffer.from('票据纸 v2.1'));
  const pos = at + Buffer.byteLength('票据纸 v2.', 'utf8');
  if (buf[pos] !== 0x31) throw new Error('锚点偏移不对');
  buf[pos] = 0x32;
  writeFileSync(victim, buf);
  const r = spawnSync(process.execPath, [SAME, A, REAL, join(REAL, 'manifest.json'), '--domain', 'query'], { cwd: REPO, encoding: 'utf8' });
  const ok = r.status === 1
    && r.stdout.includes('w01-查今天-v2.1.html')
    && /首个不同字符位置：\d+/.test(r.stdout)
    && r.stdout.includes('所在行')
    && r.stdout.includes('⟪此处不同⟫');
  const m = /首个不同字符位置：(\d+)/.exec(r.stdout);
  console.log(`[${ok ? 'OK  ' : 'BAD '}] ${'真实原型改一字节'.padEnd(28)} 期望 red   exit=${r.status} :: 字符位置 ${m ? m[1] : 'n/a'}`);
  return ok;
};

let passed = 0;
for (const [name, expect, edit, expectFile] of T) { try { const r = runCase(name, expect, edit, expectFile); passed += r ? 1 : 0; all = r && all; } catch (e) { console.log(`[BAD ] ${name} :: ${e.message}`); all = false; } }
try { const r = realCase(); passed += r ? 1 : 0; all = r && all; } catch (e) { console.log(`[BAD ] 真实原型改一字节 :: ${e.message}`); all = false; }

try { guard(TMP); rmSync(TMP, { recursive: true, force: true }); console.log(`CLEANUP: ${TMP} 已删除（路径守卫通过）`); }
catch (e) { console.error(e.message); process.exitCode = 1; }

console.log(`RESULT: ${all ? 'PASS' : 'FAIL'} 探针=${T.length + 1} 绿=${passed} 红=${T.length + 1 - passed}`);
process.exitCode = all ? 0 : 1;
