/** #270 · 写后回执页 15＋1 条：把「票面判据」钉成一处断言（老实物 `crud_receipt.html` 的四块口径）。
 *
 * 本件守三件（每条对应票面一条判据，不是自设美观标准）：
 *   ① **15＋1 条逐条真出口 exit 0**，产物是**完整文档**（`<!doctype html>` 在第 0 字节、含 charset、
 *      含内联样式，双击可开）；四块标题（`✅ 操作回执`／`📋 字段变更`／`📊 今日累计`／`📋 复制明细`）
 *      逐字在场；删类两块按老实物 `:374-387`／`:390` 合法地不出。逐条读数（绝对路径／字节数）见
 *      `docs/skills/skill-calorie/t270-真跑.mjs` 的落盘 JSON。
 *   ② **专属约束①**：改类出「改前 → 改后」三列对照且**改前不许等于改后**（缺值写 `—` ＋ 一句口径行）；
 *      删类出被删快照四列；新增类（含批量导入）**不硬套对照**。
 *   ③ **分派面不动别的格**：`dietReceiptDoc` 对**其余会改数据库的命令一律返回 null**，
 *      调用方（`src/cli/write.ts`）原样放行 ⇒ 别的写命令产物不变（逐字节快照见 `t270-快照比对.mjs`）。
 *
 * 跑法：`node --test packages/skill-calorie/test/t270-回执四块.test.mjs`（先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { dietReceiptDoc } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'diet', 'receipt.js')).href);
const { CALORIE_WRITE_COMBOS } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'keys.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 15＋1 条：14 条命令挂 15 条唤醒词（`calorie.diet.add` 一条命令 5 词），＋批量导入那一条。 */
const CASES = [
  ['记一餐', 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, note: '训练后' }],
  ['记一餐（含备注）', 'calorie.diet.add', { foodName: '牛肉饭', calories: 620, protein: 28, note: '外食' }],
  ['补记饮食', 'calorie.diet.add', { foodName: '燕麦', calories: 180, protein: 6, date: SEED_TODAY, time: '07:30:00' }],
  ['批量补记饮食', 'calorie.diet.batch', { items: [
    { foodName: '豆浆', calories: 90, protein: 6, date: SEED_TODAY, time: '07:40:00' },
    { foodName: '煎蛋', calories: 120, protein: 8, date: SEED_TODAY, time: '07:45:00' },
  ] }],
  ['记喝水', 'calorie.water.log', { ml: 300 }],
  ['复制昨日饮食', 'calorie.diet.copy', {}],
  ['改饮食记录', 'calorie.diet.update', { id: 1, calories: 260, grams: 180 }],
  ['改某日饮食', 'calorie.diet.update-by-date', { date: SEED_TODAY, note: '统一改备注' }],
  ['删饮食记录', 'calorie.diet.remove', { id: 2 }],
  ['删一餐', 'calorie.diet.remove-by-type', { date: SEED_TODAY, mealType: '早餐' }],
  ['删某日饮食', 'calorie.diet.remove-by-date', { date: '2026-08-15' }],
  ['批量删饮食', 'calorie.diet.remove-by-range', { start: '2026-08-01', end: '2026-08-08' }],
  ['存食品', 'calorie.product.add', { productName: '希腊酸奶', calories: 59, protein: 10, fat: 0, carbohydrates: 3, sodium: 36 }],
  ['改食品', 'calorie.product.update', { id: 1, note: '改过备注' }],
  ['下架食品', 'calorie.product.deprecate', { id: 2 }],
  ['批量导入食品', 'calorie.product.import', { items: [
    { productName: '全麦面包', calories: 247, protein: 13, fat: 3, carbohydrates: 41, sodium: 400 },
    { productName: '鸡胸肉', calories: 133, protein: 24, fat: 3, carbohydrates: 1, sodium: 60 },
  ] }],
];

const TITLES = ['✅ 操作回执', '📋 字段变更', '📊 今日累计', '📋 复制明细'];
/** 删类合法地不出的两块：老实物 `:374-387` 的 `op !== 'delete'` 与 `:390` 的 `items.length`。 */
const DELETE_SKIP = new Set(['📊 今日累计', '📋 复制明细']);

/** 一条词真跑一次：每条一份全新播种库（写词会改库，不许一条库从头跑到尾）。 */
function runOne(key, params) {
  const dir = mkdtempSync(join(tmpdir(), 't270-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  const outFile = join(dir, key.replace(/\./g, '_') + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', outFile], {
    encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(SEED_TODAY) },
  });
  return { status: r.status, stderr: String(r.stderr || '').trim(), file: readFileSync(outFile, 'utf8') };
}

/** 复制日志那一段的载荷在 `data-t` 属性里、五字符经转义表 ⇒ 比对命令原文前先还原实体。 */
const decodeAttr = (html) => html.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('#270 · 15＋1 条逐条真出口：完整文档 ＋ 四块标题（老实物逐字）＋ 复制区', () => {
  for (const [word, key, params] of CASES) {
    const r = runOne(key, params);
    assert.equal(r.status, 0, word + ' [' + key + '] exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
    const html = r.file;
    assert.ok(html.startsWith('<!doctype html>\n<html lang="zh-CN">'), word + '：产物第 0 字节不是 doctype');
    assert.ok(html.includes('<meta charset="utf-8">'), word + '：缺 charset');
    assert.ok(html.includes('<style>') && html.includes('<script>'), word + '：缺内联样式或脚本（双击开不了）');
    assert.ok(html.includes('ilife-page'), word + '：不是整页文档');
    assert.equal(html.includes('<!--'), false, word + '：产物里还有未替换的注释位');
    assert.ok(html.length > 10000, word + '：产物只有 ' + html.length + ' 字符，看着仍像片段');
    const deleteOp = html.includes('>删除成功<');
    for (const t of TITLES) {
      if (deleteOp && DELETE_SKIP.has(t)) {
        assert.equal(html.includes(t), false, word + '（删类）不该出「' + t + '」那一块');
        continue;
      }
      assert.ok(html.includes(t), word + '：缺老实物那一块的标题：' + t);
    }
    // 页内导航每个锚点都能解析到区块 id（裁定 3）。
    for (const m of html.matchAll(/<nav class="ilife-block-toc"[^>]*>([\s\S]*?)<\/nav>/g)) {
      for (const a of m[1].matchAll(/href="#([^"]+)"/g)) {
        assert.ok(html.includes('id="' + a[1] + '"'), word + '：页内导航锚点解析不到：' + a[1]);
      }
    }
    // 复制区：三格式 ＋ 日志第 4 段＝本次命令原文（含本次 --params，照抄可重跑；裁定 7）。
    for (const fmt of ['text', 'json', 'csv']) assert.ok(html.includes('data-fmt="' + fmt + '"'), word + '：缺 ' + fmt + ' 格式');
    assert.ok(decodeAttr(html).includes('calorie-cmd-read ' + key + " --params '" + JSON.stringify(params) + "'"),
      word + '：复制日志第 4 段不是本次命令原文');
  }
});

test('#270 · 改类出「改前 → 改后」：改后＝写进去的值，改前不许被印成改后值', () => {
  const r = runOne('calorie.diet.update', { id: 1, calories: 400, grams: 250 });
  assert.equal(r.status, 0, 'calorie.diet.update exit ' + r.status);
  const html = r.file;
  const sec = /<section id="sec-change">([\s\S]*?)<\/section>/.exec(html);
  assert.ok(sec !== null, '改类页没有「📋 字段变更」那一块');
  assert.ok(sec[1].includes('<h2>📋 字段变更</h2>'), '区块标题不是老实物那一串');
  assert.ok(sec[1].includes('改前 → 改后对照'), '改类页缺对照表的表题');
  // 按**行**读：这一族一次改两个字段（克数与热量），逐行锚定才证明「改前→改后」是按字段配的对子。
  const row = (label) => new RegExp('data-label="字段"[^>]*>' + label
    + '<\\/td>[\\s\\S]{0,200}?data-label="改前"[^>]*>([^<]*)<\\/td>[\\s\\S]{0,200}?data-label="改后"[^>]*>([^<]*)<\\/td>').exec(html);
  for (const [label, after] of [['克数', '250'], ['热量', '400']]) {
    const m = row(label);
    assert.ok(m !== null, '改类页读不到「' + label + '」那一行的改前 → 改后');
    assert.equal(m[2], after, '「' + label + '」的改后该是本次写进去的值');
    assert.notEqual(m[1], after, '「' + label + '」的改前被印成了改后值（不许拿新值顶替写前原值）');
    assert.ok(m[1] === '—' || /^\d+$/.test(m[1]), '「' + label + '」的改前该是写前真值或缺值 —，读到：' + m[1]);
  }
  // 缺值那一列必须有话说（裁定 4）：写前值拿不到时，页上要说清为什么是 —、且不许拿新值顶替。
  assert.ok(html.includes('不拿新值顶替'), '「改前」缺值的那一页缺一句口径行');
});

test('#270 · 删类出被删快照；删类不出「今日累计」与「复制明细」', () => {
  const r = runOne('calorie.diet.remove', { id: 1 });
  assert.equal(r.status, 0, 'calorie.diet.remove exit ' + r.status);
  const html = r.file;
  assert.ok(html.includes('删除前的原值（逐条）'), '删类页缺快照表的表题');
  assert.ok(html.includes('>粥</td>'), '删类页的快照表里读不到被删那条的食物名');
  assert.match(html, /data-label="状态"[^>]*>已删除/, '删类页的快照表缺「已删除」那一格');
  assert.equal(html.includes('📊 今日累计'), false, '删类页不该出「今日累计」那一块');
  assert.equal(html.includes('📋 复制明细'), false, '删类页不该出「复制明细」那一块');
});

test('#270 · 新增类（含批量导入）不硬套「改前 → 改后」', () => {
  for (const [key, params] of [
    ['calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35 }],
    ['calorie.product.import', { items: [{ productName: '全麦面包', calories: 247, protein: 13, fat: 3, carbohydrates: 41, sodium: 400 }] }],
  ]) {
    const r = runOne(key, params);
    assert.equal(r.status, 0, key + ' exit ' + r.status);
    assert.equal(r.file.includes('>改前</th>'), false, key + '：新增类不该出「改前 → 改后」那两列');
    assert.ok(r.file.includes('本次结果'), key + '：新增类缺「本次结果」那一列');
  }
});

test('#270 · 批量补记那三格读数（含「已在库跳过」的口径句）在页上', () => {
  const r = runOne('calorie.diet.batch', { items: [{ foodName: '粥', calories: 150, protein: 3, date: SEED_TODAY }] });
  assert.equal(r.status, 0, 'calorie.diet.batch exit ' + r.status);
  for (const s of ['已在库跳过', '同名同餐的记录不会重复添加', '分类失败']) {
    assert.ok(r.file.includes(s), '批量补记页缺：' + s);
  }
});

test('#270 · dietReceiptDoc 只认饮食这 14 条，其余会改数据库的命令一律放行', () => {
  const diet = new Set([
    'calorie.diet.add', 'calorie.diet.batch', 'calorie.diet.copy',
    'calorie.diet.remove', 'calorie.diet.remove-by-date', 'calorie.diet.remove-by-range',
    'calorie.diet.remove-by-type', 'calorie.diet.update', 'calorie.diet.update-by-date',
    'calorie.product.add', 'calorie.product.import', 'calorie.product.update', 'calorie.product.deprecate',
    'calorie.water.log',
  ]);
  const dir = mkdtempSync(join(tmpdir(), 't270-null-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  const receipt = { op: 'create', noChange: false, affectedRows: 1, writtenFields: [], items: [], summary: '', scene: '饮食', recordId: 1, m5Contract: 'v1', m5Line: 'x', meta: { wakeWord: '记一餐', source: '饮食记录', actionAt: '2026-09-07 08:00:00' } };
  const keys = Object.keys(CALORIE_WRITE_COMBOS);
  assert.ok(keys.length >= 40, '登记面读不到会改数据库的命令：' + keys.length);
  let dietCount = 0, otherCount = 0;
  for (const key of keys) {
    const out = dietReceiptDoc(key, {}, receipt, db);
    if (diet.has(key)) { dietCount += 1; assert.ok(typeof out === 'string' && out.startsWith('<!doctype html>'), key + '：饮食这一格该出整页'); } else { otherCount += 1; assert.equal(out, null, key + '：不在饮食这一格，必须返回 null（调用方原样放行，产物才逐字节不变）'); }
  }
  assert.equal(dietCount, 14, '饮食这一格的条数不是 14：' + dietCount);
  assert.ok(otherCount >= 26, '其余会改数据库的命令太少，登记面像失效了：' + otherCount);
  db.close();
});
