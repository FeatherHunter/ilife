/** #91 可复跑探针：`calorie.help.center` 全量速查台（Q9）＋照片 10 键兼容＋envelope 新契约（Q8 无 status）。
 *
 * 与单测（`packages/skill-calorie/test/help-center-91.test.mjs`）**独立**：本探针只经 CLI 出口
 * （argv+JSON+exit，spawn 子进程），不 import 任何 dist 模块，故可反向校验单测没有自证满足。
 *
 * 运行：先 `pnpm build`，再 `node docs/research/t91-probe.mjs`（打印 `RESULT: n/m`，全绿 exit 0）。
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const BIN = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB = mkdtempSync(join(tmpdir(), 't91-probe-'));

let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass += 1; console.log('PASS ' + name + (detail ? ' | ' + detail : '')); }
  else { fail += 1; console.log('FAIL ' + name + (detail ? ' | ' + detail : '')); }
};

function cli(params) {
  const args = ['calorie.help.center'];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  const r = spawnSync(NODE_BIN, [BIN, ...args], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB } });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

const count = (s, needle) => s.split(needle).length - 1;
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const idsOf = (html) => [...html.matchAll(/data-scene-id="([^"]*)"/g)].map((m) => decode(m[1]));

/* ① 全量速查台：默认 file 态 ＋ 三态显式 ＋ 同源 ＋ 落盘 */
const file = cli({ mode: 'file' });
const bare = cli(undefined);
const inline = cli({ mode: 'inline' });
const text = cli({ mode: 'text' });

check('file 态 exit 0', file.status === 0, 'exit=' + file.status + ' stderr=' + file.stderr.slice(0, 120));
check('默认（无参）＝ file 态（Q9 全量语义）',
  bare.status === 0 && bare.env?.data?.mode === 'file' && bare.env.data.bytes === file.env?.data?.bytes,
  'bare.mode=' + bare.env?.data?.mode + ' bare.bytes=' + bare.env?.data?.bytes);
check('inline 态 exit 0', inline.status === 0 && inline.env?.data?.mode === 'inline');
check('text 态 exit 0', text.status === 0 && text.env?.data?.mode === 'text');

const fileHtml = readFileSync(file.env.data.output, 'utf8');
const inlineHtml = readFileSync(inline.env.data.output, 'utf8');
const textBody = readFileSync(text.env.data.output, 'utf8');
check('file 产物＝完整 HTML 文档', fileHtml.startsWith('<!DOCTYPE html>') && fileHtml.includes('<meta charset="utf-8">'),
  'bytes=' + file.env.data.bytes);
check('inline 产物＝片段（自带 style ＋ 壳 section ＋ helpers，无 DOCTYPE）',
  inlineHtml.startsWith('<style') && inlineHtml.includes('<section class="ilife-help-shell" id="ilife-help-shell">')
  && count(inlineHtml, '<!DOCTYPE') === 0, 'bytes=' + inline.env.data.bytes);
check('text 产物＝纯文本（零标签）', !/<(section|style|script|div|button)\b/.test(textBody),
  'bytes=' + text.env.data.bytes);

const fileIds = idsOf(fileHtml);
check('file 态 436 场景 id（10 分组／54 子功能）',
  fileIds.length === 436 && count(fileHtml, 'data-subgroup-id="') === 54
  && file.env.data.sceneTotal === 436 && file.env.data.subgroupTotal === 54
  && file.env.data.items.length === 10, 'ids=' + fileIds.length);
check('三态同源：file ＝ inline 场景 id 序逐字相同', JSON.stringify(idsOf(inlineHtml)) === JSON.stringify(fileIds));
check('三态同源：text 覆盖 436 场景 id（逐行索引）',
  textBody.split('\n').filter((l) => l.startsWith('    ')).length === 436,
  'lines=' + textBody.split('\n').length);

/* ② envelope 新契约（Q8 无 status）＋ 产物不入 envelope */
for (const [tag, r] of [['file', file], ['inline', inline], ['text', text]]) {
  const env = r.env;
  check(tag + ' 态 envelope 恒五字段且无 status',
    JSON.stringify(Object.keys(env)) === JSON.stringify(['version', 'skill', 'shape', 'key', 'data'])
    && !('status' in env) && !('status' in env.data) && env.shape === 'list'
    && env.key === 'calorie.help.center', Object.keys(env).join(','));
  check(tag + ' 态 data.bytes 如实且产物不塞进 envelope',
    env.data.bytes === Buffer.byteLength(readFileSync(env.data.output, 'utf8'), 'utf8')
    && !('html' in env.data), 'bytes=' + env.data.bytes);
}
check('inline 态 stdout 不含 800KB 片段', inline.stdout.length < 4096, 'stdout=' + inline.stdout.length + ' B');
check('text 态文本随 envelope 回传且逐字等于产物',
  text.env.data.text === textBody && text.stdout.length < 60_000, 'stdout=' + text.stdout.length + ' B');
check('file 态落盘按 #87 命名', /^身材照HELP_\d{8}_\d{6}(_\d+)?\.html$/.test(basename(file.env.data.output)),
  basename(file.env.data.output));

/* ③ 照片 10 键兼容（q 路径逐字不变） */
const q = cli({ q: '记身材照' });
const qEmpty = cli({ q: '' });
check('q 现找：exit 0 且命中 ≥3', q.status === 0 && q.env?.data?.total >= 3, 'total=' + q.env?.data?.total);
check('q 现找：data 键集＝items/total/output（不引入 mode 等新字段）',
  JSON.stringify(Object.keys(q.env.data)) === JSON.stringify(['items', 'total', 'output']),
  Object.keys(q.env.data).join(','));
check('q 现找：item 字段逐字＝wakeWord/key/desc/exec',
  JSON.stringify(Object.keys(q.env.data.items[0])) === JSON.stringify(['wakeWord', 'key', 'desc', 'exec']));
const qHtml = readFileSync(q.env.data.output, 'utf8');
check('q 现找：产物仍是片段且每行复制按钮＋页面运行时',
  count(qHtml, '<!DOCTYPE') === 0 && count(qHtml, 'data-action-id="') === q.env.data.total
  && qHtml.includes('data-ilife-helpers'), 'buttons=' + count(qHtml, 'data-action-id="'));
check('q:"" ＝照片全量 10 键（兼容保留）', qEmpty.status === 0 && qEmpty.env?.data?.total === 10,
  'total=' + qEmpty.env?.data?.total);
check('默认路径已改判全量速查台（items 是分组，不是照片命中）',
  bare.env.data.items[0].wakeWord === undefined && typeof bare.env.data.items[0].label === 'string');

/* ④ 参数纪律（D6：mode 显式且被校验） */
const both = cli({ q: '记身材照', mode: 'file' });
const bogus = cli({ mode: 'bogus' });
const wrongType = cli({ mode: 1 });
check('q 与 mode 互斥 → exit 2', both.status === 2 && /互斥/.test(both.stderr) && both.stdout === '');
check('mode 非法 → exit 2', bogus.status === 2 && /mode 非法/.test(bogus.stderr));
check('mode 非字符串 → exit 2', wrongType.status === 2 && /mode 须为字符串/.test(wrongType.stderr));

console.log('RESULT: ' + pass + '/' + (pass + fail));
process.exit(fail === 0 ? 0 : 1);
