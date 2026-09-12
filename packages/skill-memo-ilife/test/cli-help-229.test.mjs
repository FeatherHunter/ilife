/** #229（**#240 重写**）· 备忘录 HELP 产物的**命名值与 `--html` 支**的回归锁。
 *
 * #229 当年锁三块：`manifest` 三条值 ＋ `src/help/memoOutput.ts` 那份自持管线 ＋ 出口真 spawn 的缺省分支。
 * #240 把那一小块（命名通式／`wx` 独占／同秒递补／回执）迁进**共用件** `base-paint/save-html` 的
 * `saveHtmlFile`，并**删掉自持件**（裁决 3 挂下的债）。于是本件只剩**属于备忘录**的两块，
 * 外加一条防这笔债再长回来的机械锁：
 *
 *   ① `manifest` 三个值逐字（落点目录名 ＋ 两支产物名，含「两支必须分名」）；
 *   ② `--html` 支的真 spawn 语义：逐字落点、覆盖写、不递补、不写默认目录；
 *   ③ **自持件已删**：`src/**` 不再出现独占写与递补那三个名字，包内**只有一处** import 共用落盘件，
 *      且 `src/help/memoOutput.ts` 已不在；运行期的出口产物确实 import 共用件。
 *
 * ③ 是**结构烟雾锁**，不是行为保证（对抗式复审实测：把落盘改成 `{dir, file: stem+'.html', onExists:'overwrite'}`
 * 既不违反这三条、也不是「自持第二份」，是 `#230` 的 ①③④ 抓住的）；它只管「唯一定义地、唯一落盘点」这一面。
 * 正则也**不是密不透风**：`openSync(p,'wx')`／`fs.constants.O_EXCL`／「先 `existsSync` 再 `write`」都能绕过——
 * 别把这条读成「保证没有第二份」；真正承重的是共用件自己的用例与 `#230` 的端到端五例。
 *
 * **撤掉的**：命名通式与同秒递补的模块级断言。它们现在是**共用件的契约**，已由
 * `packages/base-render/test/output-save-html-237.test.mjs`（真 spawn 锁）与 `#230` 的端到端五例
 * （①名字通式与落点／③并发 6 次独占递补／④三支互不串）逐条锁住；在本件再抄一遍就是同一件事的第二份断言
 * （铁律二），而且会把「共用件内情」钉进备忘录的测试里，共用件一变就假红。
 *
 * 跑法（**只构建本包**；禁仓根 `tsc -b`／`pnpm -r build`——`plugin-bill-ilife` 的 `dist/client.js` 会被改写成
 * 裸 ESM 而让整个 web GUI 起不来，见 #241）：
 *   node node_modules/typescript/bin/tsc --build packages/skill-memo-ilife/tsconfig.json --force
 *   node --test packages/skill-memo-ilife/test/cli-help-229.test.mjs
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELP_HTML_DIR_NAME, HELP_FILE_STEM, LOOKUP_FILE_STEM } from '../dist/help/manifest.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const KEY = 'memo.help.lookup';

let TMP = '';
before(() => { TMP = mkdtempSync(join(tmpdir(), 'memo-229-')); });

/** 真 spawn 出口：`--params` 逐字传，不经任何 shell（Windows 上 PowerShell／cmd 会吃掉内层引号）。 */
function run(dbDir, args) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dbDir }, maxBuffer: 64 * 1024 * 1024,
  });
}

/** 递归列出目录下的 `.ts` 源文件（路径相对包根，正斜杠）。 */
function walkTs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkTs(abs));
    else if (e.name.endsWith('.ts')) out.push(abs);
  }
  return out;
}

describe('#229 · manifest 三条值（本技能自己的值，逐字）', () => {
  it('落点目录名与两支产物名逐字，且两支必须分名', () => {
    assert.equal(HELP_HTML_DIR_NAME, 'memo_html');
    assert.equal(HELP_FILE_STEM, '备忘录_HELP');
    assert.equal(LOOKUP_FILE_STEM, '备忘录_速查表');
    assert.notEqual(HELP_FILE_STEM, LOOKUP_FILE_STEM, '两支产物必须分名（#139 判法：别让用户按一个名字打开到另一个东西）');
  });
});

describe('#240 · 自持件已删（防这笔债再长回来）', () => {
  it('独占写与递补那三个名字不再出现在本包源码里', () => {
    const srcDir = join(pkgDir, 'src');
    const files = walkTs(srcDir);
    assert.ok(files.length > 0, 'src 下应当有源码件（测试自身的现场检查）');
    const banned = /nextExclusiveCandidate|writeFileExclusiveWithRetry|flag:\s*['"]wx['"]/;
    const hits = files.filter((f) => banned.test(readFileSync(f, 'utf8')));
    assert.deepEqual(hits, [], '命名通式／独占创建／递补的逻辑归共用件 `saveHtmlFile`，本包不许自持第二份（铁律二）');
  });

  it('包内只有一个件 import 共用落盘件（唯一落盘点），且自持件的源文件已不在', () => {
    const srcDir = join(pkgDir, 'src');
    const importers = walkTs(srcDir).filter((f) => /from\s+['"]base-paint\/save-html['"]/.test(readFileSync(f, 'utf8')));
    // 这条是**有意的强制决策点**：将来若真出现第二处正当落盘，它会红——那时该做的是把两态适配收进共用件
    // （五家同形，见 #240 决议 §八），不是把断言放宽。
    assert.equal(importers.length, 1, '落盘点只许一个：实得 ' + JSON.stringify(importers.map((f) => f.slice(pkgDir.length + 1))));
    assert.equal(existsSync(join(srcDir, 'help', 'memoOutput.ts')), false, '自持件源文件必须已删（#240）');
  });

  it('构建产物面：出口真的经共用件落盘，且不再引用已删的自持件', () => {
    // 只断言**会被重构建覆写**的出口产物：`tsc -b` 不清理「已删源文件」的旧产物（实测：
    // 删 `src/help/memoOutput.ts` 后 `dist/help/memoOutput.js` 仍在，得手工清），故**不**断言它不在——
    // 那会让任何在本机做过迁移前构建的人长期假红，而构建产物本不在这条纪律的管辖内（structure.md:9）。
    const built = readFileSync(join(pkgDir, 'dist', 'cli', 'cmd_read.js'), 'utf8');
    assert.match(built, /from\s*["']base-paint\/save-html["']/, '运行期的出口件必须 import 共用落盘件');
    assert.doesNotMatch(built, /memoOutput\.js/, '构建产物不许再 import 已删的自持件');
  });
});

describe('#229 · `--html` 支（真 spawn 出口）', () => {
  it('逐字覆盖写：同路径跑两次不递补、不新增件、不写默认目录', () => {
    const db = join(TMP, 'explicit');
    const out = join(db, 'sub', '我的帮助.html');
    const r1 = run(db, [KEY, '--html', out]);
    assert.equal(r1.status, 0, r1.stderr);
    const e1 = JSON.parse(r1.stdout);
    assert.equal(e1.delivery.mode, 'file');
    assert.equal(e1.delivery.path, out, '`--html` 逐字使用用户给的路径（归一为绝对路径，不递补）');
    assert.equal(e1.delivery.bytes, statSync(out).size, '回执字节数＝实际落盘字节数');
    assert.ok(readFileSync(out, 'utf8').includes('<script id="help-data" type="application/json">'), '落盘物是全壳 HELP 页');

    const r2 = run(db, [KEY, '--html', out]);
    assert.equal(r2.status, 0, r2.stderr);
    assert.equal(JSON.parse(r2.stdout).delivery.path, out);
    assert.deepEqual(readdirSync(dirname(out)), [basename(out)], '覆盖写不产生 `_2`，目录里仍只有这一件');
    assert.equal(existsSync(join(db, HELP_HTML_DIR_NAME)), false, '显式落点时不写默认目录');
  });

  it('`q` 支 ＋ `--html`：现找也能显式落盘（出口的第二个调用点，别让它没人守）', () => {
    const db = join(TMP, 'q-html');
    const out = join(db, 'sub', '现找.html');
    const r = run(db, [KEY, '--params', JSON.stringify({ q: '查提醒' }), '--html', out]);
    assert.equal(r.status, 0, r.stderr);
    const e = JSON.parse(r.stdout);
    assert.equal(e.delivery.path, out, '逐字落点');
    assert.equal(e.delivery.bytes, statSync(out).size, '回执字节数＝实际落盘字节数');
    assert.equal(e.data.total, 1, '`q` 支载荷＝命中条目');
    assert.equal(existsSync(join(db, HELP_HTML_DIR_NAME)), false, '显式落点时不写默认目录');
  });
});
