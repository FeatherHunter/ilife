/** #128 · 并发原子落盘验收：独占创建 + 重试（S2 数据完整性）。
 *
 * 票面验收：
 *  - 并发 N≥5 同一命令：每个 envelope 的 `data.output` 内容 === 本次产物（零交叉）；
 *  - 串行同秒仍 `_2`／`_3`（#87 不回归，由 output-naming-87.test.mjs 覆盖，本文件另做显式覆盖语义守卫）。
 *
 * 方法：`worker_threads` + `SharedArrayBuffer` barrier，5 线程同时落同一 key 的产物
 * （各写含独立 marker 的 64KB 产物，写窗口足以让修前稳定撞名、修后稳定全绿）。
 * 选用线程而非子进程：全量 `pnpm test` 多文件并行时进程 spawn 可被饿死 60s（0/5 ready，
 * 见 canonical-after2.log），线程启动轻量、同一进程内调度，负载下仍可靠；
 * 判别力不变（修前 `w`：uniq=1/cross>0；修后 `wx`：uniq=N/cross=0，均已实测）。
 * 另有确定性用例（无并发即验独占语义）兜底：同一落点意图连写两次 → 两份产物、先写那份不被覆盖。
 * 落点经 `SKILLS_DB_PATH`（`deliverHtml` 默认路径唯一真相源），与 CLI 同管线。
 *
 * #237 改判：时间戳与同秒递补由共用件 `base-paint/save-html` 的 `saveHtmlFile` 执行，**取的是真实时钟**
 * （不再收 `now` 注入口），故本文件的断言一律写「落点互异／内容各即本次产物／无覆盖丢失」这类
 * 跨秒与同秒都成立的语义；槽位连续性（本体／`_2`／`_3`）由共用件自己的用例锁。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/output-concurrency-128.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Worker } from 'node:worker_threads';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST_OUTPUT = resolve(HERE, '..', 'dist', 'output.js').replace(/\\/g, '/');
const KEY = 'calorie.help.lookup';
const N = 5;

function tmpDbDir(tag) {
  return mkdtempSync(join(tmpdir(), 't128-' + tag + '-'));
}

function threadWorkerSource() {
  return `
import { workerData } from 'node:worker_threads';
import { deliverHtml } from 'file://${DIST_OUTPUT}';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const { dbDir, marker, sab } = workerData;
const flag = new Int32Array(sab);
process.env.SKILLS_DB_PATH = dbDir;
Atomics.add(flag, 1, 1);
while (Atomics.load(flag, 0) === 0) { Atomics.wait(flag, 0, 0, 20); }
const pad = 'x'.repeat(1024 * 64);
const html = '<html>MARKER128_' + marker + '_' + pad + '</html>';
try {
  const d = deliverHtml({ key: '${KEY}', params: { q: 'x' }, html });
  writeFileSync(join(dbDir, 'result_' + marker + '.json'), JSON.stringify({ marker, mode: d.mode, path: d.path ?? '' }));
} catch (e) {
  writeFileSync(join(dbDir, 'result_' + marker + '.json'), JSON.stringify({ marker, error: String((e && e.stack) || e), code: (e && e.code) || '' }));
}
`;
}

test('#128 并发 5 路同键：落点互异且内容各即本次产物（零交叉）', async () => {
  const dbDir = tmpDbDir('conc');
  const sab = new SharedArrayBuffer(8);
  const flag = new Int32Array(sab);
  flag[0] = 0; flag[1] = 0;
  const workerFile = join(dbDir, 'wt-worker.mjs');
  writeFileSync(workerFile, threadWorkerSource(), 'utf8');
  const workers = [];
  for (let i = 0; i < N; i++) {
    workers.push(new Worker(workerFile, { workerData: { dbDir, marker: String(i), sab }, type: 'module' }));
  }
  const t0 = Date.now();
  while (flag[1] < N) {
    assert.ok(Date.now() - t0 < 60000, '线程 ready 超时：' + flag[1] + '/' + N);
    await new Promise((r) => setTimeout(r, 10));
  }
  flag[0] = 1;
  await Promise.all(workers.map((w) => new Promise((res, rej) => {
    w.on('exit', (c) => { c === 0 ? res() : rej(new Error('worker exit ' + c)); });
    w.on('error', rej);
  })));
  const infos = [];
  for (let i = 0; i < N; i++) {
    const raw = readFileSync(join(dbDir, 'result_' + i + '.json'), 'utf8');
    infos.push(JSON.parse(raw));
  }
  for (const info of infos) {
    assert.equal(info.mode, 'file', '并发落盘须为 file 态：' + JSON.stringify(info).slice(0, 300));
    assert.ok(typeof info.path === 'string' && info.path.length > 0, '须回传落点：' + JSON.stringify(info).slice(0, 300));
  }
  const paths = infos.map((x) => x.path);
  assert.equal(new Set(paths).size, N, 'N 路落点必须互异（dup=0）：' + paths.map((p) => basename(p)).join(','));
  for (const info of infos) {
    const content = readFileSync(info.path, 'utf8');
    assert.ok(content.includes('MARKER128_' + info.marker + '_'), '落点内容必须即本次产物（marker=' + info.marker + ' file=' + basename(info.path) + '）');
  }
  const files = readdirSync(join(dbDir, 'calorie_html')).filter((f) => /\.html?$/i.test(f));
  assert.equal(files.length, N, '目录产物数必须 == N（无覆盖丢失）：' + files.join(','));
});

test('#128 独占语义不变：同一落点意图连写两次 → 两份产物，先写那份不被覆盖', async () => {
  const { deliverHtml } = await import('../dist/output.js');
  const dbDir = tmpDbDir('retry');
  const old = process.env.SKILLS_DB_PATH;
  process.env.SKILLS_DB_PATH = dbDir;
  try {
    const landing = { dir: join(dbDir, 'calorie_html'), stem: '唤醒词HELP' };
    const a = deliverHtml({ key: KEY, params: { q: 'x' }, target: landing, html: '<html>ORIGINAL</html>' });
    const b = deliverHtml({ key: KEY, params: { q: 'x' }, target: landing, html: '<html>NEW</html>' });
    assert.equal(a.mode, 'file');
    assert.equal(b.mode, 'file');
    assert.notEqual(b.path, a.path, '第二次落点不得等于第一次：' + basename(a.path));
    assert.equal(readFileSync(a.path, 'utf8'), '<html>ORIGINAL</html>', '原文件不得被覆盖');
    assert.equal(readFileSync(b.path, 'utf8'), '<html>NEW</html>');
    assert.equal(basename(a.path).startsWith('唤醒词HELP_'), true, '名字用调用者给的主体：' + basename(a.path));
    assert.equal(a.bytes, Buffer.byteLength('<html>ORIGINAL</html>', 'utf8'), 'bytes 为真实落盘字节数');
  } finally {
    if (old === undefined) delete process.env.SKILLS_DB_PATH; else process.env.SKILLS_DB_PATH = old;
  }
});

test('#128 显式 --output 语义不变：逐字覆盖，不参与 _N 重试', async () => {
  const { deliverHtml } = await import('../dist/output.js');
  const dbDir = tmpDbDir('explicit');
  const old = process.env.SKILLS_DB_PATH;
  process.env.SKILLS_DB_PATH = dbDir;
  try {
    const explicit = join(dbDir, '自定义', '报告.html');
    const a = deliverHtml({ key: KEY, params: { q: 'x' }, explicit, html: '<html>A</html>' });
    assert.equal(a.mode, 'file');
    assert.equal(a.path, resolve(explicit), '显式落点须逐字回传（绝对化后）');
    const b = deliverHtml({ key: KEY, params: { q: 'x' }, explicit, html: '<html>B</html>' });
    assert.equal(b.path, a.path, '显式覆盖须写同一路径（不派生 _2）');
    assert.equal(readFileSync(explicit, 'utf8'), '<html>B</html>', '后写覆盖前写');
  } finally {
    if (old === undefined) delete process.env.SKILLS_DB_PATH; else process.env.SKILLS_DB_PATH = old;
  }
});
