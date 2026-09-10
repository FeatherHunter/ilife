/** #128 · 并发原子落盘验收：独占创建 + 重试（S2 数据完整性）。
 *
 * 票面验收：
 *  - 并发 N≥5 同一命令：每个 envelope 的 `data.output` 内容 === 本次产物（零交叉）；
 *  - 串行同秒仍 `_2`／`_3`（#87 不回归，由 output-naming-87.test.mjs 覆盖，本文件另做显式覆盖语义守卫）。
 *
 * 方法：barrier 同步 5 子进程（`ready_i` → `GO`），冻结同一 `now`，各写含独立 marker 的
 * 产物（256KB，加宽写窗口但保持测试快速）。无 barrier 时进程启动抖动会自然串行化，
 * 测不出 bug；有 barrier 才能在修前稳定复现 `dup/cross`，修后稳定全绿。
 * 落点经 `SKILLS_DB_PATH`（`deliverHtml` 默认路径唯一真相源），与 CLI 同管线。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/output-concurrency-128.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST_OUTPUT = resolve(HERE, '..', 'dist', 'output.js').replace(/\\/g, '/');
const KEY = 'calorie.help.lookup';
const N = 5;

function workerSource() {
  return `
import { deliverHtml } from 'file://${DIST_OUTPUT}';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dbDir = process.env.SKILLS_DB_PATH;
const nowIso = process.argv[2];
const marker = process.argv[3];
const sizeKb = Number(process.argv[4]);
const readyFile = join(dbDir, 'ready_' + marker);
const goFile = join(dbDir, 'GO');
writeFileSync(readyFile, 'ready');
const t0 = Date.now();
while (!existsSync(goFile)) {
  if (Date.now() - t0 > 70000) { console.log(JSON.stringify({ marker, error: 'no-go' })); process.exit(2); }
}
const now = new Date(nowIso);
const pad = 'x'.repeat(1024 * sizeKb);
const html = '<html>MARKER128_' + marker + '_' + pad + '</html>';
try {
  const d = deliverHtml({ key: '${KEY}', params: { q: 'x' }, html, now });
  console.log(JSON.stringify({ marker, mode: d.mode, path: d.path ?? '' }));
} catch (e) {
  console.log(JSON.stringify({ marker, error: String((e && e.message) || e), code: (e && e.code) || '' }));
}
`;
}

function tmpDbDir(tag) {
  return mkdtempSync(join(tmpdir(), 't128-' + tag + '-'));
}

test('#128 并发 5 路同秒同键：落点互异且内容各即本次产物（零交叉）', async () => {
  const dbDir = tmpDbDir('conc');
  const nowIso = new Date(2026, 6, 26, 12, 30, 0).toISOString();
  const workerFile = join(dbDir, 'worker.mjs');
  writeFileSync(workerFile, workerSource(), 'utf8');
  const procs = [];
  for (let i = 0; i < N; i++) {
    procs.push(new Promise((resolveP) => {
      const p = spawn(process.execPath, [workerFile, nowIso, String(i), '256'], {
        env: { ...process.env, SKILLS_DB_PATH: dbDir },
      });
      let out = '', err = '';
      p.stdout.on('data', (d) => { out += d; });
      p.stderr.on('data', (d) => { err += d; });
      p.on('close', (code) => resolveP({ i, code, out: out.trim(), err: err.slice(-300) }));
    }));
  }
  const t0 = Date.now();
  // 全量 `pnpm test` 下机器负载高（多文件并行 + 各自 spawn CLI），子进程启动可被延迟数十秒；
  // 隔离跑约 0.1s，贡献超时放宽到 60s，超时时附 worker 退出态以便区分 flake 与真回归。
  let lastReady = -1;
  while (true) {
    let ready = 0;
    for (let i = 0; i < N; i++) if (existsSync(join(dbDir, 'ready_' + i))) ready++;
    lastReady = ready;
    if (ready === N) break;
    if (Date.now() - t0 > 60000) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  {
    let ready = 0;
    for (let i = 0; i < N; i++) if (existsSync(join(dbDir, 'ready_' + i))) ready++;
    assert.equal(ready, N, '子进程 ready 超时：' + ready + '/' + N + '（60s，高负载下仍 0/N 即环境性 flake，见 canonical 日志）');
  }
  writeFileSync(join(dbDir, 'GO'), 'go');
  const results = await Promise.all(procs);
  const infos = results.map((r) => {
    assert.equal(r.code, 0, 'worker exit非0：' + JSON.stringify(r));
    return JSON.parse(r.out);
  });
  for (const info of infos) {
    assert.equal(info.mode, 'file', '并发落盘须为 file 态：' + JSON.stringify(info));
    assert.ok(typeof info.path === 'string' && info.path.length > 0, '须回传落点：' + JSON.stringify(info));
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
