// #731 · setup 域靶向测试：场景落点表／三片页型／步骤条（D6·D7）／CSV 计划与重复检测（D2）／
// 备份文件面（造·列·选·同秒不覆盖）／三重判定与迁移块（C11）／缺项阻断（裁定 9）／源码面禁入项（裁定 7）。
// 跑法（先 `pnpm build`）：node --test packages/skill-bill/test/t731-setup-域.test.mjs
// 真出口那一面（六场景真跑、产物落盘、字节对账）住 `docs/skills/skill-bill/t731-探针-真出口.mjs`。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { configTestBase } from './helpers/config-base.mjs';

process.env.ILIFE_CONFIG_DIR = configTestBase('t731-cfg-');

const scene = await import('../dist/setup/scene.js');
const params = await import('../dist/setup/params.js');
const decl = await import('../dist/setup/declaration.js');
const steps = await import('../dist/setup/steps.js');
const importer = await import('../dist/setup/importer.js');
const backups = await import('../dist/setup/backups.js');
const status = await import('../dist/setup/status.js');
const pageParts = await import('../dist/setup/pageParts.js');
const fetch = await import('../dist/fetch/index.js');
const paths = await import('../dist/fetch/paths.js');

const tmp = () => mkdtempSync(join(tmpdir(), 't731-'));
const TMP = tmp();

/** 造一个**老结构（v1.0）**的库：只有九列，缺 `deleted_at`。 */
function legacyDb(dir) {
  const p = join(dir, 'biscuit_accountant.db');
  const db = new DatabaseSync(p);
  db.exec('CREATE TABLE bills (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, time TEXT NOT NULL,'
    + ' amount REAL NOT NULL, account TEXT DEFAULT \'\', ledger TEXT DEFAULT \'生活\', currency TEXT DEFAULT \'人民币\','
    + ' note TEXT DEFAULT \'\', created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
  db.close();
  return p;
}

describe('t731 · 场景件与域声明逐条对上（6 场景／3 片页型）', () => {
  it('六件场景件、六个 sceneId、op 唯一，且与域声明的场景逐条同集', () => {
    assert.equal(scene.SETUP_SCENES.length, 6, '六条场景各一件');
    assert.equal(new Set(scene.SETUP_SCENES.map((s) => s.op)).size, 6, 'op 不许重复');
    assert.equal(new Set(scene.SETUP_SCENES.map((s) => s.id)).size, 6, '件名不许重复');
    const declared = decl.SETUP_DECLARATION.entries.flatMap((e) => e.scenes.map((s) => s.id)).sort();
    const mounted = scene.SETUP_SCENES.map((s) => s.sceneId).sort();
    assert.deepEqual(mounted, declared, '场景件的 sceneId 与域声明里的场景不是同一集');
  });
  it('三片页型的分片＝3／1／2（向导／结果回执／记录列表）', () => {
    const byPage = { wizard: 0, receipt: 0, list: 0 };
    for (const s of scene.SETUP_SCENES) byPage[s.page] += 1;
    assert.deepEqual(byPage, { wizard: 3, receipt: 1, list: 2 });
    for (const s of scene.SETUP_SCENES) {
      assert.equal(params.PAGE_OF_OP[s.op], s.page, s.op + ' 的页型两处不一致');
      assert.equal(s.key, 'bill.setup.run', '六件同一条命令');
    }
  });
  it('「备份」一词两支各出一件（一词两场景）', () => {
    const two = scene.SETUP_SCENES.filter((s) => s.op === 'backup-create' || s.op === 'backup-list');
    assert.equal(two.length, 2);
    assert.notEqual(two[0].page, two[1].page, '两支各出一片页型');
  });
  it('取件：认得的 op 给件、认不得的即抛（不猜）', () => {
    assert.equal(scene.setupSceneFor('restore').id, 'restore');
    assert.throws(() => scene.setupSceneFor('nope'), /没有这一支操作/);
  });
  it('op 的读法：缺省＝初始化状态；非法即抛', () => {
    assert.equal(params.parseSetupOp({}), 'init-status');
    assert.equal(params.parseSetupOp({ op: 'import' }), 'import');
    assert.throws(() => params.parseSetupOp({ op: 'drop-table' }), /op 非法/);
  });
});

describe('t731 · 三条向导的步骤条（D6 按状态算／D7 空数据只有一个说法）', () => {
  it('初始化四步：编号与总数都由数组算，事实一变状态就变', () => {
    const ok = steps.initSteps({
      envCount: 2, envOk: true, envSummary: '两项都过了', dirPath: 'D:/x', dirWritable: true,
      schemaOk: true, columns: 10, records: 3, verifyOk: true,
    });
    assert.deepEqual(ok.map((s) => s.no), [1, 2, 3, 4]);
    assert.equal(ok[0].label, '环境检测');
    assert.equal(ok[3].label, '只读验证');
    assert.ok(ok.every((s) => s.state === 'done'), '四项都过时应全 done');
    assert.match(ok[2].detail, /10 列/, '步骤说明要带当刻读数');
    const bad = steps.initSteps({
      envCount: 0, envOk: false, envSummary: '', dirPath: 'D:/x', dirWritable: false,
      schemaOk: false, columns: 0, records: 0, verifyOk: false,
    });
    assert.equal(bad[0].state, 'blocked', '一项都没检测到不许报绿（D7）');
    assert.match(bad[0].detail, /一项也没检测到/);
    assert.ok(!JSON.stringify(bad).includes('全部通过'), '空数据下不许出现「全部通过」');
  });
  it('恢复四步：确认前停在第 2 步；确认＋现状备份＋验库逐格推进', () => {
    const p = steps.restoreSteps({ selected: 'b.db', count: 2, confirmed: false, safety: '', verified: false });
    assert.equal(p[0].state, 'done');
    assert.equal(p[1].state, 'current');
    assert.equal(p[2].state, 'todo');
    const done = steps.restoreSteps({ selected: 'b.db', count: 2, confirmed: true, safety: 'safety.db', verified: true });
    assert.ok(done.every((s) => s.state === 'done'));
    assert.match(done[2].detail, /safety\.db/, '第 3 步要点名现状备份');
    const nogit = steps.restoreSteps({ selected: '', count: 0, confirmed: false, safety: '', verified: false });
    assert.equal(nogit[0].state, 'blocked', '一份备份都没有时第 1 步走不通');
  });
  it('导入四步：新增／重复／坏行三档读数都进步骤说明', () => {
    const s = steps.importSteps({
      fileName: 'x.csv', totalRows: 5, mapped: true, newRows: 3, duplicateRows: 1, badRows: 1,
      confirmed: false, inserted: 0, failed: 0,
    });
    assert.equal(s[2].state, 'current');
    assert.match(s[2].detail, /新增 3 行/);
    assert.match(s[2].detail, /1 行库里已经有了/);
    assert.match(s[2].detail, /1 行读不出来/);
    const done = steps.importSteps({
      fileName: 'x.csv', totalRows: 3, mapped: true, newRows: 3, duplicateRows: 0, badRows: 0,
      confirmed: true, inserted: 3, failed: 0,
    });
    assert.equal(done[3].state, 'done');
    assert.match(done[3].detail, /成功 3 行/);
  });
  it('状态四档的中文名只有一处定义', () => {
    assert.deepEqual(Object.keys(steps.STEP_STATE_TEXT).sort(), ['blocked', 'current', 'done', 'todo']);
  });
});

describe('t731 · CSV 计划与重复检测（D2 的四件里第三件）', () => {
  const csvPath = join(TMP, 'a.csv');
  writeFileSync(csvPath, '日期,金额,分类,账户,账本,备注\n'
    + '2026-09-01,-31.50,餐饮/外卖/晚餐,微信,生活,晚饭\n'
    + '2026-09-02,-12.00,出行/公交,支付宝,生活,地铁\n'
    + '没日期,-1.00,餐饮/零食,,,\n'
    + '2026-09-03,-2.00,不存在的一级分类,,,\n', 'utf8');

  it('读文件：认出表头、报编码、行数不含表头', () => {
    const csv = importer.readCsv(csvPath);
    assert.equal(csv.hasHeader, true);
    assert.equal(csv.rows.length, 4);
    assert.equal(csv.encoding, 'UTF-8');
    assert.equal(csv.name, 'a.csv');
  });
  it('猜映射：按表头认到六列；缺必填时有兜底列序', () => {
    const map = importer.guessMap(importer.readCsv(csvPath));
    assert.deepEqual(map, { time: 0, amount: 1, category: 2, account: 3, ledger: 4, note: 5 });
    const noHeader = join(TMP, 'b.csv');
    writeFileSync(noHeader, '2026-09-01,-1,餐饮\n2026-09-02,-2,出行\n', 'utf8');
    const m2 = importer.guessMap(importer.readCsv(noHeader));
    assert.equal(m2.time, 0);
    assert.equal(m2.amount, 1);
    assert.equal(m2.category, 2);
  });
  it('解析用户写的映射：认「日期=第1列」也认「time=1」；认不得即抛（不猜）', () => {
    assert.deepEqual(importer.parseMapping('日期=第1列,金额=第3列'), { time: 0, amount: 2 });
    assert.deepEqual(importer.parseMapping('time=1, amount=2'), { time: 0, amount: 1 });
    assert.throws(() => importer.parseMapping('随便写=第1列'), /认不得这一列是哪个字段/);
    assert.throws(() => importer.parseMapping('日期第1列'), /列映射写不明白/);
  });
  it('缺必填三列时报出来（缺哪些要说中文名）', () => {
    assert.deepEqual(importer.missingRequired({ time: 0, amount: 1, category: 2 }), []);
    assert.deepEqual(importer.missingRequired({ time: 0 }), ['amount', 'category']);
  });
  it('排计划：好行进 rows，重号的进 duplicates，坏行进 bad（三档不混）', () => {
    const csv = importer.readCsv(csvPath);
    const map = importer.guessMap(csv);
    const existing = [{ time: '2026-09-01 12:00:00', amount: -31.5, category: '餐饮/外卖/晚餐', note: '晚饭' }];
    const plan = importer.planImport(csv, map, existing);
    assert.equal(plan.newRows, 1, '只有 09-02 那行可新增');
    assert.equal(plan.duplicates.length, 1, '09-01 与库里重号');
    assert.equal(plan.bad.length, 2, '没日期 与 未知分类 各一行');
    assert.match(plan.bad[0].why, /./, '坏行要带原因');
    assert.equal(plan.rows.length, plan.newRows);
  });
  it('同一份文件两次导入：第二次全部落进 duplicates（重复检测）', () => {
    const csv = importer.readCsv(csvPath);
    const map = importer.guessMap(csv);
    const existing = [{ time: '2026-09-01 12:00:00', amount: -31.5, category: '餐饮/外卖/晚餐', note: '晚饭' }];
    const p1 = importer.planImport(csv, map, existing);
    const after = existing.concat(p1.rows.map((r) => ({ time: r.time, amount: r.amount, category: r.category, note: r.note })));
    const p2 = importer.planImport(csv, map, after);
    assert.equal(p2.newRows, 0, '第二次不该再新增');
    assert.equal(p2.duplicates.length, 2);
  });
  it('写库：整批一个事务，写进去的行数＝计划里的行数', () => {
    const dir = tmp();
    const h = fetch.openBillDb(join(dir, 'biscuit_accountant.db'));
    try {
      const csv = importer.readCsv(csvPath);
      const plan = importer.planImport(csv, importer.guessMap(csv), []);
      const w = importer.applyImport(h, plan);
      assert.equal(w.inserted, 2, '可写两行（另两行读不出来）');
      assert.equal(w.failed.length, 0);
      assert.equal(importer.existingRows(h).length, 2);
    } finally { fetch.closeBillDb(h); }
  });
  it('签名四件：时刻／金额／分类／备注（备注不同即不算重号）', () => {
    const a = importer.signatureOf({ time: '2026-09-01 12:00:00', amount: -31.5, category: '餐饮', note: 'x' });
    const b = importer.signatureOf({ time: '2026-09-01 12:00:00', amount: -31.5, category: '餐饮', note: 'y' });
    assert.equal(a, '2026-09-01 12:00:00|-31.50|餐饮|x');
    assert.notEqual(a, b);
  });
});

describe('t731 · 备份文件面（造·列·选·同秒不覆盖）', () => {
  it('时间戳与人话时刻互转；字节写成人话', () => {
    const at = new Date(2026, 8, 18, 9, 5, 3);
    const stamp = backups.backupStampOf(at);
    assert.equal(stamp, '20260918_090503');
    assert.equal(backups.stampToTime('biscuit_' + stamp + '.db'), '2026-09-18 09:05:03');
    assert.equal(backups.stampToTime('没时间戳.db'), '');
    assert.equal(backups.humanBytes(512), '512 B');
    assert.equal(backups.humanBytes(2048), '2.0 KB');
  });
  it('造一份：同一秒第二份换 _2 后缀，不覆盖第一份', () => {
    const dir = tmp();
    const h = fetch.openBillDb(join(dir, 'biscuit_accountant.db'));
    try {
      const stamp = backups.backupStampOf(new Date());
      const g = join(dir, 'goals.json');
      writeFileSync(g, '{"accounts":[]}', 'utf8');
      const one = backups.createBackup({ db: h, dir: join(dir, 'backups'), stamp, goalsPath: g });
      const two = backups.createBackup({ db: h, dir: join(dir, 'backups'), stamp, goalsPath: g });
      assert.notEqual(one.file, two.file, '同一秒不许覆盖');
      assert.match(two.file, /_2\.db$/);
      assert.equal(one.hasGoals, true, '影子件跟着一起备份');
      assert.equal(one.bytes > 0, true);
    } finally { fetch.closeBillDb(h); }
  });
  it('列目录新→旧；选中项＝给了名字就按名字、没给用最新的一份', () => {
    const dir = tmp();
    const h = fetch.openBillDb(join(dir, 'biscuit_accountant.db'));
    try {
      const bdir = join(dir, 'backups');
      const g = join(dir, 'goals.json');
      backups.createBackup({ db: h, dir: bdir, stamp: '20260101_000000', goalsPath: g });
      backups.createBackup({ db: h, dir: bdir, stamp: '20260102_000000', goalsPath: g });
      const list = backups.listBackups(bdir);
      assert.equal(list.length, 2);
      assert.match(list[0].file, /20260102/, '新的在前');
      assert.equal(backups.selectedBackup(bdir, '').file, list[0].file, '没给名字用最新一份');
      assert.equal(backups.selectedBackup(bdir, list[1].file).file, list[1].file);
      assert.equal(backups.findBackup(bdir, '不存在.db'), null, '找不到就是 null，不猜');
      assert.equal(backups.selectedBackup(join(dir, '没这个目录'), ''), null, '目录不存在＝没有备份');
      assert.deepEqual(backups.listBackups(join(dir, '没这个目录')), []);
    } finally { fetch.closeBillDb(h); }
  });
});

describe('t731 · 初始化状态三重判定与迁移块（C11）', () => {
  it('当前版本的库：三重全过、没有迁移块', () => {
    const dir = tmp();
    const h = fetch.openBillDb(join(dir, 'biscuit_accountant.db'));
    try {
      const s = status.readSetupStatus(h);
      assert.equal(s.version, 'v2.0');
      assert.equal(s.ready, true);
      assert.deepEqual(s.repaired, ['建表'], '新建库那一次会把「建表」报出来（补的动作不静默）');
      assert.equal(s.emptyLibrary, true, '表在、0 行＝空库（与「窗口为空」不是一件事）');
      assert.equal(s.checks.length, 3);
    } finally { fetch.closeBillDb(h); }
  });
  it('老结构（缺 deleted_at）的库：打开时自动补列，迁移块报「补了什么」', () => {
    const dir = tmp();
    const p = legacyDb(dir);
    const h = fetch.openBillDb(p);
    try {
      const s = status.readSetupStatus(h);
      assert.deepEqual(s.repaired, ['补列 deleted_at'], '补的动作要报出来（老侧那句提示指的是「去跑脚本」）');
      assert.equal(s.version, 'v2.0');
      assert.equal(s.ready, true, '补过之后就是就绪');
      assert.equal(s.needsMigration, false, '已经补过就不再说「需要迁移」');
    } finally { fetch.closeBillDb(h); }
  });
  it('十列清单是判据的唯一一处（缺哪一列就点名）', () => {
    assert.equal(status.BILLS_COLUMNS.length, 10);
    assert.equal(status.BILLS_COLUMNS.includes(status.V2_MARKER_COLUMN), true);
  });
});

describe('t731 · 缺项阻断与两枚域内件（裁定 9／步骤条两件）', () => {
  it('导入缺文件路径＝一条阻断；恢复的「哪一份」是选填，不阻断', () => {
    assert.deepEqual(params.setupBlocked('import', {}).map((b) => b.name), ['file']);
    assert.deepEqual(params.setupBlocked('import', { file: 'x.csv' }), []);
    assert.deepEqual(params.setupBlocked('restore', {}), []);
    assert.deepEqual(params.setupBlocked('backup-list', {}), []);
  });
  it('六个 op 的槽位表：只有导入有一个必填格', () => {
    for (const op of params.SETUP_OPS) {
      const required = params.SETUP_SLOTS[op].filter((s) => s.required).map((s) => s.name);
      assert.deepEqual(required, op === 'import' ? ['file'] : [], op + ' 的必填格不对');
    }
  });
  it('环境检测那一格：空表只出「没测到就是没测到」，不出假绿', () => {
    const empty = pageParts.envChecksOf([]);
    assert.match(empty, /没测到就是没测到/);
    assert.ok(!empty.includes('全部通过'), '空表不许出「全部通过」');
    const some = pageParts.envChecksOf([{ label: '运行环境', ok: true, detail: 'node ok' }]);
    assert.match(some, /运行环境/);
    assert.ok(!some.includes('没测到就是没测到'));
  });
  it('步骤条两件：徽章承载进度、小表承载说明；空表不出空块', () => {
    const s = steps.initSteps({
      envCount: 2, envOk: true, envSummary: '两项都过了', dirPath: 'D:/x', dirWritable: true,
      schemaOk: true, columns: 10, records: 0, verifyOk: true,
    });
    const chips = pageParts.stepChipsOf(s);
    assert.match(chips, /共 4 步/);
    assert.match(chips, /第 1 步 · 环境检测/);
    const table = pageParts.stepTableOf(s);
    assert.match(table, /第 4 步（共 4 步）/);
    assert.equal(pageParts.stepChipsOf([]), '', '没步骤就不出这一块');
    assert.match(pageParts.stepTableOf([]), /没有步骤可报/);
  });
});

describe('t731 · 源码面的三条禁入（裁定 7／裁定 12）', () => {
  const srcDir = join(import.meta.dirname, '..', 'src', 'setup');
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.ts'));
  /** 去注释再扫：注释里写 issue 编号（`` `#688` ``）不算色值——判据盯的是**代码里的**色值与断点。 */
  const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const codeOf = (f) => stripComments(readFileSync(join(srcDir, f), 'utf8'));

  before(() => { assert.ok(files.length >= 16, '场景件＋页型件＋数据件都在扫描面里，实得 ' + files.length); });

  it('页面装配件里不写色值／断点／自绘样式段（一个形状只许一处定义）', () => {
    const bad = [];
    for (const f of files) {
      const text = codeOf(f);
      for (const re of [/#[0-9a-fA-F]{3,8}\b/g, /\brgb\(/g, /\bhsl\(/g, /@media/g, /<style/g]) {
        const n = [...text.matchAll(re)].length;
        if (n > 0) bad.push(f + ':' + String(re) + '×' + String(n));
      }
    }
    assert.deepEqual(bad, [], '源码里出现自造色值／断点／样式段：' + bad.join('、'));
  });
  it('禁入 token 与深色区不出现在本域源码里', () => {
    const bad = [];
    for (const f of files) {
      const text = codeOf(f);
      for (const re of [/--r-xl/g, /--pink/g, /data-theme/g, /prefers-color-scheme/g]) {
        if (re.test(text)) bad.push(f + ':' + String(re));
      }
    }
    assert.deepEqual(bad, []);
  });
  it('场景件里不出现块位渲染函数名与整段 HTML（判据乙的现场断言）', () => {
    const bad = [];
    for (const f of scene.SETUP_SCENES.map((s) => 'scene-' + s.id + '.ts')) {
      const text = codeOf(f);
      if (/render[A-Z][A-Za-z]*\(/.test(text)) bad.push(f + ':块位渲染调用');
      if (/['"`]\s*<(section|div|p|table)\b/i.test(text)) bad.push(f + ':HTML 字面量');
      if (/from 'base-paint/.test(text)) bad.push(f + ':import 公共层块位件');
    }
    assert.deepEqual(bad, []);
  });
  it('本域各件行数都在包内告警线（350 LF）以内', () => {
    const over = [];
    for (const f of files) {
      const lf = readFileSync(join(srcDir, f), 'utf8').split('\n').length - 1;
      if (lf > 350) over.push(f + '=' + String(lf));
    }
    assert.deepEqual(over, [], '超线件：' + over.join('、'));
  });
});

describe('t731 · 备份目录与页脚两处取值口径', () => {
  it('备份目录默认落在库目录下的 backups；文件名主体可配（默认 biscuit_）', () => {
    assert.equal(paths.resolveBackupDir(TMP), join(TMP, 'backups'));
    assert.match(paths.backupFileName('20260918_090503'), /^biscuit_20260918_090503\.db$/);
  });
  it('列表页那一份的字节数＝盘上实际大小（回执与列表同源）', () => {
    const dir = tmp();
    const h = fetch.openBillDb(join(dir, 'biscuit_accountant.db'));
    try {
      const e = backups.createBackup({ db: h, dir: join(dir, 'backups'), stamp: '20260103_000000', goalsPath: join(dir, 'goals.json') });
      assert.equal(statSync(e.path).size, e.bytes);
      assert.equal(backups.listBackups(join(dir, 'backups'))[0].bytes, e.bytes);
    } finally { fetch.closeBillDb(h); }
  });
});
