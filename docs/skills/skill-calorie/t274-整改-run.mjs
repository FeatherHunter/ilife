/** #274 整改席 · 可复跑脚本（四段：两态读数／复核席三件探针／别族未受影响／变异自证）。
 *
 * 跑法：`node docs/skills/skill-calorie/t274-整改-run.mjs`（先 `npx tsc -b packages/base-render packages/skill-calorie --force`）
 * 单项：`--only=两态|复核|别族|变异自证`
 *
 * 口径（2026-09-15 编排者裁定，`t425-融合基准.md` 裁定 4 的澄清）：
 *   · 整个数据面为空 ⇒ `exit 4` ＋ `ERR 4: 取数失败（缺失阻断）`、不落盘（逐字保持）；
 *   · 库非空、本次查询零命中 ⇒ 出完整页 ＋ 空态句 ＋ 引导句、`exit 0`、落盘。
 *
 * 隔离：库与产物一律在 `.scratch/t274g3/<段>/` 下重建；日志落 `.scratch/t274g3/`。
 * **本件会临时改写 `src/diet/` 两件源码（只此两件，逐文件点名备份／还原）**，段③④各自
 * 备份→编译→取证→点名还原→重编，并在还原后核对 sha256；任何一步对不上即中止。
 * 只读老实物目录，不执行其中任何脚本。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
function findRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(d, 'packages', 'skill-calorie', 'package.json'))) return d;
    d = dirname(d);
  }
  throw new Error('找不到检出根：' + from);
}
const ROOT = findRoot(HERE);
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const LOG = join(ROOT, '.scratch', 't274g3');
const BAK = join(LOG, 'backup');
const AUTHOR_TEST = join(ROOT, 'packages', 'skill-calorie', 'test', 't274-食品库页.test.mjs');
/** 本席改到的两件（点名清单：备份与还原只碰这两件）。 */
const OWNED = ['packages/skill-calorie/src/diet/libraryPlate.ts', 'packages/skill-calorie/src/diet/libraryDocs.ts'];
/** 段⑤ 另加的三件：两件测试件 ＋ 告警线台账（台账记着 `libraryDocs.ts` 的行数，
 *  不一起对调就会出现「台账 396 ／ 实况 396」与「台账 401 ／ 实况 401」之外的第 4 种组合，
 *  让 `t445-告警线门.test.mjs` 凭空红，双向差集非空且与本席改动无关）。 */
const OWNED_TESTS = [
  'packages/skill-calorie/test/t274-食品库页.test.mjs',
  'packages/skill-calorie/test/render-t9.test.mjs',
  'packages/skill-calorie/AGENTS.md',
];
const SWAP = [...OWNED, ...OWNED_TESTS];
const PLATE = OWNED[0];
const REVIEW_PROBES = ['复跑', '新探针', '变异'].map((n) => join(HERE, `t274-收口复核-${n}.mjs`));

mkdirSync(LOG, { recursive: true });
mkdirSync(BAK, { recursive: true });

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { ALL_ROUTES } = await import(
  pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routes.generated.js')).href
);

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7);
const want = (n) => only === '' || only === n;
let 红 = 0;
function chk(name, cond, detail) {
  if (!cond) 红 += 1;
  console.log(`${cond ? 'OK  ' : '红  '} ${name}${detail === undefined ? '' : ' ｜ ' + detail}`);
}
const sha16 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);
const sha16buf = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);

/* ── 通用：命令行／跑真出口／产物 ── */

/** 命令行逐字取自运行期总表（不手抄字面量）：命令名取 `cli` 列。 */
function cliOf(key, params) {
  const row = ALL_ROUTES.find((r) => r.key === key);
  if (!row) throw new Error('运行期总表里没有 ' + key);
  return params === undefined
    ? row.cli
    : 'calorie-cmd-read ' + key + " --params '" + JSON.stringify(params) + "'";
}
/** 按唤醒词取该条路由自己的命令行（别族对照用：参数也照总表，不自己拼）。 */
function cliByWord(word) {
  const row = ALL_ROUTES.find((r) => r.wakeWord === word);
  if (!row) throw new Error('运行期总表里没有唤醒词 ' + word);
  return row.cli;
}
function argvOf(cli) {
  const m = /^calorie-cmd-read (calorie\.[a-z0-9.-]+)(?: --params '(\{.*\})')?$/.exec(cli);
  if (!m) throw new Error('命令行不合形状：' + cli);
  return m[2] === undefined ? [m[1]] : [m[1], '--params', m[2]];
}
function runRaw(dir, cli) {
  const r = spawnSync(process.execPath, [CLI, ...argvOf(cli)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
  });
  let out = null;
  try { out = JSON.parse(String(r.stdout).trim()); } catch { out = null; }
  const p = out && out.data && typeof out.data.output === 'string' ? out.data.output : null;
  const landed = p !== null && existsSync(p);
  return {
    status: r.status, stderr: String(r.stderr).trim(), stdout: String(r.stdout),
    landed, path: p, bytes: landed ? statSync(p).size : 0,
    html: landed ? readFileSync(p, 'utf8') : '', out,
  };
}
const run = (dir, key, params) => runRaw(dir, cliOf(key, params));
const SEED = [
  ['鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '包装'],
  ['米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '自制'],
  ['米饭', '测试', 131, 2.8, 0.3, 28, 1, '主食', '复核'],
  ['苹果', '果园', 52, 0.3, 0.2, 14, 1, '', '自制'],
  ['牛奶', '牧场', 54, 3, 3.2, 3.4, 40, '乳制品', ''],
];
function fresh(name, rows) {
  const d = join(LOG, name);
  rmSync(d, { recursive: true, force: true });
  mkdirSync(join(d, 'calorie_html'), { recursive: true });
  const db = openDb(join(d, 'calorie_data.db'));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1,30,'male',175,'moderate')").run();
  const st = db.prepare('INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const r of rows) st.run(...r);
  db.close();
  return d;
}
const FULL = (h) => h.startsWith('<!doctype html>') && h.includes('charset="utf-8"') && h.includes('<style>')
  && h.includes('ilife-page') && !h.includes('<!--');
const files = (d) => (existsSync(join(d, 'calorie_html')) ? readdirSync(join(d, 'calorie_html')) : []);

/** 「今天」钉死（`src/analysis/utils.ts` 的 `CALORIE_TODAY`）：相对窗口由它派生，跑法可复现。 */
const TODAY = '2026-09-15';
const dayBefore = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};
/** 段③ 用：给别族那两条词（窗口都是「最近 7 天」）播种近 7 天的饮食记录。 */
function seedFoodLog(dir, days = 7) {
  const db = openDb(join(dir, 'calorie_data.db'));
  const st = db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?,?,?,?,?,?,?,?)');
  for (let i = 0; i < days; i += 1) st.run(dayBefore(TODAY, i), '12:00:00', '米饭', 200, 260, 5.4, 56, 0.6);
  db.close();
}

/* ── 源码点名备份／还原 ── */
function backupList(list, tag) {
  for (const rel of list) {
    const dst = join(BAK, tag + '__' + rel.replace(/[/\\]/g, '__'));
    writeFileSync(dst, readFileSync(join(ROOT, rel)));
  }
}
function restoreListFromBackup(list, tag) {
  for (const rel of list) {
    const dst = join(BAK, tag + '__' + rel.replace(/[/\\]/g, '__'));
    if (!existsSync(dst)) throw new Error('备份不在：' + dst);
    writeFileSync(join(ROOT, rel), readFileSync(dst));
  }
}
/** 从基线提交取原文（逐文件点名，不用 checkout／stash）。 */
function restoreListFromHead(list) {
  for (const rel of list) {
    const r = spawnSync('git', ['-C', ROOT, 'show', `HEAD:${rel}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error('git show 取基线失败：' + rel + ' ' + r.stderr);
    writeFileSync(join(ROOT, rel), r.stdout);
  }
}
const backupOwned = () => backupList(OWNED, 'own');
const restoreOwnedFromBackup = () => restoreListFromBackup(OWNED, 'own');
const restoreOwnedFromHead = () => restoreListFromHead(OWNED);
/** 编译器走**绝对路径的 tsc**，不走 `npx`：本席实测 `spawnSync('npx', ['tsc', …], {shell:true})`
 *  会落到 npm 上的同名「tsc」占位包（打印一行「This is not the tsc command you are looking for」
 *  后 **exit 0**），于是「编译」静默变成空转、`dist` 不换、变异与基线对照全线作废。
 *  根因是共享 `node_modules/.bin` 会被并发席位改动，`npx` 找不到本地编译器就退到 PATH 上的占位包。 */
const TSC_JS = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
if (!existsSync(TSC_JS)) throw new Error('找不到 TypeScript 编译器：' + TSC_JS);
/** `dist/diet/libraryPlate.js` 的指纹：用来证明「这一轮编译真的换了 dist」。 */
const PLATE_JS = join(ROOT, 'packages', 'skill-calorie', 'dist', 'diet', 'libraryPlate.js');
const distPlateSha = () => (existsSync(PLATE_JS) ? sha16(PLATE_JS) : null);
function tscForce() {
  const r = spawnSync(process.execPath, [TSC_JS, '-b', 'packages/skill-calorie', '--force'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  return r.status;
}
function authorTests() {
  const r = spawnSync(process.execPath, ['--test', AUTHOR_TEST], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = String(r.stdout);
  const m = /ℹ tests (\d+)[\s\S]*?ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/.exec(out);
  return { status: r.status, tests: m ? +m[1] : null, pass: m ? +m[2] : null, fail: m ? +m[3] : null };
}
function probe(name) {
  const r = spawnSync(process.execPath, [join(HERE, `t274-收口复核-${name}.mjs`)], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status, out: String(r.stdout) };
}

/* ══ ① 两态读数 ══ */
if (want('两态')) {
  console.log('=== ① 两态读数（整改席自证：整体为空 / 本次零命中）===');
  const emptyDir = fresh('two-empty', []);
  const emptyCases = [
    ['search', 'calorie.view.search', { keyword: '鸡胸' }],
    ['library', 'calorie.view.library', {}],
    ['library+分类', 'calorie.view.library', { category: '主食' }],
    ['dedupe', 'calorie.view.dedupe', undefined],
  ];
  for (const [what, key, params] of emptyCases) {
    const r = run(emptyDir, key, params);
    chk(`整体为空 · ${what} ⇒ exit 4 ＋ 缺失阻断 ＋ 不落盘`,
      r.status === 4 && r.stdout === '' && !r.landed
      && r.stderr.includes('ERR 4: 取数失败（缺失阻断）') && r.stderr.includes('食品库空'),
      `exit=${r.status} 落盘=${r.landed} stderr=${r.stderr.slice(0, 80)}`);
  }
  chk('整体为空 · 产物目录 0 个文件', files(emptyDir).length === 0, `files=${files(emptyDir).length}`);

  const noDir = fresh('two-nomatch', SEED);
  const noCases = [
    ['search 关键词零命中', 'calorie.view.search', { keyword: '螺蛳粉' }, '在食品库里搜「螺蛳粉」，找到 0 条。'],
    ['library 分类零命中', 'calorie.view.library', { category: '海鲜类' }, '分类「海鲜类」下有 0 条（库内共 5 条）。'],
  ];
  for (const [what, key, params, summary] of noCases) {
    const r = run(noDir, key, params);
    chk(`本次零命中 · ${what} ⇒ exit 0 ＋ 落盘 ＋ 完整文档`,
      r.status === 0 && r.landed && FULL(r.html),
      `exit=${r.status} 落盘=${r.landed} bytes=${r.bytes}`);
    chk(`本次零命中 · ${what} ⇒ 空态块 ＋ 空态句 ＋ 引导句`,
      r.html.includes('ilife-block-empty') && r.html.includes('没有找到匹配的食品')
      && r.html.includes('换个关键词或分类试试；库里还没有的话，说「存食品」就能加进第一条。'));
    chk(`本次零命中 · ${what} ⇒ 结论句报 0 条、页脚报库内 5 条`,
      r.html.includes(summary) && r.html.includes('📊 数据来源：本机食品库 · 在架食品共 5 条')
      && !r.html.includes('在架食品共 0 条'));
  }
  const dedClean = fresh('two-clean', [['苹果', '测试', 52, 0.3, 0.2, 14, 1, '水果', '自制']]);
  const dc = run(dedClean, 'calorie.view.dedupe', undefined);
  chk('去重无重复（别弄坏的那一格）⇒ exit 0 ＋ 落盘 ＋ 空态块 ＋ 空态句',
    dc.status === 0 && dc.landed && dc.html.includes('ilife-block-empty')
    && dc.html.includes('没有重复食品') && dc.html.includes('✅ 食品库无重复，数据干净'),
    `exit=${dc.status} bytes=${dc.bytes}`);
  console.log(`RESULT-两态: ${红 === 0 ? 'PASS' : 'FAIL'} 红=${红}`);
}

/* ══ ② 复核席三件探针（红 → 绿）══ */
if (want('复核')) {
  console.log('=== ② 复核席三件探针 ===');
  let r2 = 0;
  const nPass = probe('新探针');
  const lineN = /RESULT-NEW: (\S+) 红=(\d+) 检查项=(\d+)/.exec(nPass.out) ?? [];
  chk('新探针 RESULT-NEW 红=0', lineN[1] === 'PASS' && lineN[2] === '0', lineN[0] ?? nPass.out.slice(-120));
  if (!(lineN[1] === 'PASS')) r2 += 1;

  const rp = probe('复跑');
  const zero = [...rp.out.matchAll(/^ZERO (\S+?) .*exit=(\d+) 落盘=(\S+) bytes=(\d+) 完整文档=(\S+) 空态块=(\S+) 空态句=(\S+) 引导句=(\S+)/gm)]
    .map((m) => ({ name: m[1], exit: +m[2], landed: m[3], bytes: +m[4], full: m[5], blk: m[6], txt: m[7], hint: m[8] }));
  chk('复跑 §② 三条 ZERO 全部出页', zero.length === 3 && zero.every((z) => z.exit === 0 && z.landed === 'yes'
    && z.full === 'yes' && z.blk === 'yes' && z.txt === 'yes' && z.hint === 'yes'),
    zero.map((z) => `${z.name}:exit=${z.exit}/落盘=${z.landed}/块=${z.blk}`).join(' '));
  chk('复跑 §① 8/8 exit 0 ＋ 完整文档（未因整改掉格）', /RESULT-RUN: 8\/8/.test(rp.out));
  chk('复跑 §①b 空库 8/8 exit 4 ＋ 缺失阻断 ＋ 不落盘', /RESULT-EMPTYDB: 8\/8/.test(rp.out));
  chk('复跑 §③ 四张产物两两互不相同 4/4', /RESULT-DISTINCT: .*4\/4/.test(rp.out));
  if (!(zero.length === 3 && zero.every((z) => z.exit === 0 && z.landed === 'yes' && z.full === 'yes'
    && z.blk === 'yes' && z.txt === 'yes' && z.hint === 'yes'))) r2 += 1;

  const mv = probe('变异');
  const 甲 = /MUTATION-甲: .*必红=(\S+)/.exec(mv.out);
  const 丙 = /MUTATION-丙: .*必红=(\S+)/.exec(mv.out);
  chk('变异-甲（取消转义）仍必红', 甲?.[1] === 'true', 甲?.[0] ?? '未取到');
  chk('变异-丙（口径行文案）由盲区转为必红', 丙?.[1] === 'true', 丙?.[0] ?? '未取到');
  chk('变异 还原回基线', /RESULT-MUT: 源码回基线=true/.test(mv.out));
  const b = authorTests();
  chk('作者件全绿', b.fail === 0, `tests=${b.tests} pass=${b.pass} fail=${b.fail}`);
  console.log(`RESULT-复核: ${r2 === 0 ? 'PASS' : 'FAIL'} 红=${r2}`);
}

/* ══ ③ 别族未受影响（两条别的族的词，产物 sha256 与改前一致）══ */
if (want('别族')) {
  console.log('=== ③ 别族未受影响（基线源码 vs 本席源码，产物逐字节比）===');
  const OTHER = ['看高热量榜', '看饮食总览'];
  const dir = fresh('other-family', SEED);
  seedFoodLog(dir);
  backupOwned();
  /* 页面按设计带**跑那一刻的挂钟时间戳**（复制日志第 5 段「时间戳版本」）⇒ 两次跑的原始字节必然差
     这一处；故比对分两栏：原始 sha256（照实印）＋ 去时间戳规范化后的 sha256（作判据）。
     段③里同一条词在两种源码下各跑一次，两次之间隔着一次整包重编，时间戳天然不同。 */
  const norm = (s) => s
    .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '@T@')
    .replace(/\d{14}/g, '@TS@').replace(/_\d{6}(_\d+)?\.html/g, '@F@');
  const settle = () => {
    const m = {};
    for (const word of OTHER) {
      rmSync(join(dir, 'calorie_html'), { recursive: true, force: true });
      mkdirSync(join(dir, 'calorie_html'), { recursive: true });
      const r = runRaw(dir, cliByWord(word));
      const raw = r.landed ? readFileSync(r.path) : null;
      m[word] = {
        status: r.status, bytes: r.bytes,
        raw: raw ? sha16buf(raw) : null,
        norm: raw ? sha16buf(Buffer.from(norm(raw.toString('utf8')), 'utf8')) : null,
      };
    }
    return m;
  };
  let 基线 = null; let 本席 = null; let c1 = 1; let c2 = 1; let d1 = null; let d2 = null;
  try {
    restoreOwnedFromHead();
    c1 = tscForce();
    d1 = distPlateSha();
    基线 = settle();
    console.log('基线源码 sha：' + OWNED.map((p) => sha16(join(ROOT, p))).join(' ／ '));
    restoreOwnedFromBackup();
    c2 = tscForce();
    d2 = distPlateSha();
    本席 = settle();
    console.log('本席源码 sha：' + OWNED.map((p) => sha16(join(ROOT, p))).join(' ／ '));
  } finally {
    restoreOwnedFromBackup();
    if (tscForce() !== 0) throw new Error('段③还原后重编失败');
  }
  chk('段③ 两次编译都 exit 0', c1 === 0 && c2 === 0, `基线=${c1} 本席=${c2}`);
  chk('段③ 编译真的换了 dist（两次 dist 指纹不同）', Boolean(d1) && Boolean(d2) && d1 !== d2,
    `基线 dist=${d1} ｜ 本席 dist=${d2}`);
  for (const word of OTHER) {
    const b = 基线[word]; const n = 本席[word];
    chk(`别族的词「${word}」出页且字节数改前＝改后`,
      b.status === 0 && n.status === 0 && b.bytes > 0 && b.bytes === n.bytes,
      `基线 exit=${b.status}/${b.bytes}B ｜ 本席 exit=${n.status}/${n.bytes}B`);
    chk(`别族的词「${word}」去时间戳后产物 sha256 改前＝改后`,
      Boolean(b.norm) && b.norm === n.norm,
      `规范化 基线 ${b.norm} ｜ 本席 ${n.norm}（原始 sha 基线 ${b.raw} ｜ 本席 ${n.raw}）`);
  }
  console.log(`RESULT-别族: ${红 === 0 ? 'PASS' : 'FAIL'} 红=${红}`);
}

/* ══ ④ 变异自证（两态判别改坏一处）══ */
if (want('变异自证')) {
  console.log('=== ④ 变异自证：把「本次零命中」重新当成阻断 ══');
  backupOwned();
  const BEFORE = { plate: sha16(join(ROOT, PLATE)) };
  const FROM = "  if (libraryTotal === 0) throw new CalorieRenderError('missing-data', '食品库空（先导入食品）');\n"
    + "  return { keyword: kw, total: items.length, libraryTotal, items };";
  const TO = "  if (items.length === 0) throw new CalorieRenderError('missing-data', '食品库空（先导入食品）');\n"
    + "  return { keyword: kw, total: items.length, libraryTotal, items };";
  let mut = null; let rest = null; let dMut = null; let dRest = null;
  try {
    const src = readFileSync(join(ROOT, PLATE), 'utf8');
    const n = src.split(FROM).length - 1;
    if (n !== 1) throw new Error('变异目标出现 ' + n + ' 次，须恰 1 次');
    writeFileSync(join(ROOT, PLATE), src.replace(FROM, TO));
    if (tscForce() !== 0) throw new Error('变异后编译失败');
    dMut = distPlateSha();
    mut = { t: authorTests(), p: probe('新探针') };
    restoreOwnedFromBackup();
    if (tscForce() !== 0) throw new Error('还原后编译失败');
    dRest = distPlateSha();
    rest = { t: authorTests(), p: probe('新探针') };
  } finally {
    restoreOwnedFromBackup();
    if (tscForce() !== 0) throw new Error('段④收尾重编失败');
  }
  const mut红 = /RESULT-NEW: (\S+) 红=(\d+)/.exec(mut.p.out) ?? [];
  const res红 = /RESULT-NEW: (\S+) 红=(\d+)/.exec(rest.p.out) ?? [];
  chk('变异：改坏两态判别后，本席新补的断言必红', mut.t.fail > 0 && mut红[1] === 'FAIL',
    `作者件 tests=${mut.t.tests} pass=${mut.t.pass} fail=${mut.t.fail} ｜ 新探针 红=${mut红[2]}`);
  chk('变异与还原真的换了 dist（两次 dist 指纹不同）', Boolean(dMut) && Boolean(dRest) && dMut !== dRest,
    `变异 dist=${dMut} ｜ 还原 dist=${dRest}`);
  chk('还原：源码回基线且断言必绿',
    rest.t.fail === 0 && res红[1] === 'PASS' && sha16(join(ROOT, PLATE)) === BEFORE.plate,
    `作者件 fail=${rest.t.fail} ｜ 新探针 红=${res红[2]} ｜ 源码回基线=${sha16(join(ROOT, PLATE)) === BEFORE.plate}`);
  console.log(`RESULT-变异: 改坏必红=${mut.t.fail > 0} 还原必绿=${rest.t.fail === 0} 源码回基线=${sha16(join(ROOT, PLATE)) === BEFORE.plate}`);
}

/* ══ ⑤ 不新增红（全包跑两遍：基线四件 vs 本席四件，比红件集合双向差集）══ */
if (want('回归')) {
  console.log('=== ⑤ 不新增红：基线四件 vs 本席四件，全包各跑一遍 ===');
  const RED_LINE = /^test at (packages[\\/]skill-calorie[\\/]test[\\/][^\s:]+\.test\.mjs):/gm;
  const runPkg = (tag) => {
    const r = spawnSync(process.execPath, ['--test', 'packages/skill-calorie/test/*.test.mjs'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
    });
    const out = String(r.stdout) + String(r.stderr);
    writeFileSync(join(LOG, `包级全量.${tag}.log`), out);
    const reds = new Set([...out.matchAll(RED_LINE)].map((m) => m[1].replace(/\\/g, '/')));
    const c = /ℹ tests (\d+)[\s\S]*?ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)/.exec(out);
    return { reds, tests: c ? +c[1] : null, pass: c ? +c[2] : null, fail: c ? +c[3] : null };
  };
  backupList(SWAP, 'swap');
  const d0 = distPlateSha();
  let 改前 = null; let 改后 = null; let c1 = 1; let c2 = 1; let d1 = null; let d2 = null;
  try {
    restoreListFromHead(SWAP);
    c1 = tscForce();
    d1 = distPlateSha();
    改前 = runPkg('改前');
    restoreListFromBackup(SWAP, 'swap');
    c2 = tscForce();
    d2 = distPlateSha();
    改后 = runPkg('改后');
  } finally {
    restoreListFromBackup(SWAP, 'swap');
    if (tscForce() !== 0) throw new Error('段⑤收尾重编失败');
  }
  const onlyBase = [...改前.reds].filter((f) => !改后.reds.has(f));
  const onlyMine = [...改后.reds].filter((f) => !改前.reds.has(f));
  console.log(`改前：tests=${改前.tests} pass=${改前.pass} fail=${改前.fail} 红件=${改前.reds.size}`);
  console.log(`改后：tests=${改后.tests} pass=${改后.pass} fail=${改后.fail} 红件=${改后.reds.size}`);
  console.log(`双向差集：只在改前红=${JSON.stringify(onlyBase)} 只在改后红=${JSON.stringify(onlyMine)}`);
  /* 「只在改前红」的件单跑一遍：全绿即调度抖动（与本席改动无关），未全绿才是真回归。 */
  const 抖动 = onlyBase.map((f) => {
    const r = spawnSync(process.execPath, ['--test', f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    const c = /ℹ fail (\d+)/.exec(String(r.stdout));
    return { f, fail: c ? +c[1] : -1 };
  });
  for (const x of 抖动) console.log(`单跑复核 ${x.f} ⇒ fail=${x.fail}`);
  chk('段⑤ 两次编译都 exit 0', c1 === 0 && c2 === 0, `改前=${c1} 改后=${c2}`);
  chk('段⑤ 两次编译真的换了 dist，且换回来的指纹与进场一致',
    Boolean(d1) && Boolean(d2) && d1 !== d0 && d2 === d0,
    `进场=${d0} ｜ 改前=${d1} ｜ 改后=${d2}`);
  chk('段⑤ 只在改后红为空（本席未新增红件）', onlyMine.length === 0, JSON.stringify(onlyMine));
  chk('段⑤ 只在改前红的件单跑全绿（别席抖动，不归本席）',
    抖动.every((x) => x.fail === 0), JSON.stringify(抖动));
  chk('段⑤ 本席两件测试件都不在红名单',
    !改后.reds.has('packages/skill-calorie/test/t274-食品库页.test.mjs')
    && !改后.reds.has('packages/skill-calorie/test/render-t9.test.mjs'));
  console.log(`RESULT-回归: 只在改后红=${onlyMine.length} 只在改前红且单跑绿=${抖动.filter((x) => x.fail === 0).length}/${抖动.length}`);
}

console.log(`RESULT-ALL: 红=${红}`);
process.exit(红 === 0 ? 0 : 1);