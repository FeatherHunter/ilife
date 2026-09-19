// #731 · setup 域**真出口探针**（evidence 件之一，可复跑）：5 条唤醒词／6 个场景逐条真跑 ＋ 三件套／四件／同源。
//
// 跑法（持锁，与仓规一致）：
//   node tooling/run-locked.mjs --ticket 731 -- node docs/skills/skill-bill/t731-探针-真出口.mjs
// 它只读 `packages/skill-bill/dist/`，产物、库、备份目录都落临时目录（不改工作区）；末行打 `RESULT: n/m`。
//
// 判据对照（本票 `## 判据` 第 1～6 条）：① 六场景真跑；② 恢复三件套（D1）；③ 导入四件（D2）；
// ④ 选中项与详情同源（D5）；⑤ 步骤条按状态算（D6／D7）；⑥ `#688` §四 裁定 1／2／4／5／7／9／11／12 逐条自证。
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function repoRoot(from) {
  let d = from;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(d, 'package.json')) && existsSync(join(d, 'packages'))) return d;
    d = dirname(d);
  }
  throw new Error('找不到仓根');
}
const ROOT = repoRoot(dirname(fileURLToPath(import.meta.url)));
const BIN = join(ROOT, 'packages', 'skill-bill', 'dist', 'cli', 'cmd_read.js');
const DB = mkdtempSync(join(tmpdir(), 't731-db-'));
const OUT = mkdtempSync(join(tmpdir(), 't731-html-'));
const CSV = join(DB, 'bills.csv');

// 配置基座：库与备份目录都落临时目录（#726 起落点由配置文件唯一决定，环境变量已退役）
const env = { ...process.env, ILIFE_CONFIG_DIR: DB };
const run = (args) => spawnSync(process.execPath, [BIN, ...args], { cwd: ROOT, encoding: 'utf8', env });
const P = (o) => JSON.stringify(o);
const lastJson = (s) => JSON.parse(String(s || '').trim().split(/\r?\n/).filter(Boolean).pop());
const DATA = join(DB, 'data'); // 落点：`ILIFE_CONFIG_DIR` 是配置目录，数据目录是它下面的 `data/`（config/dirs.ts:61）
const backupDir = join(DATA, 'backups');
/** 现有记录条数：走本域「初始化状态」（`receipt.records`）——空库／空窗口上都 exit 0（`bill.record.range` 在空窗口是 exit 4）。 */
const records = () => lastJson(run(['bill.setup.run', '--params', P({ op: 'init-status' })]).stdout).data.receipt.records;
const backups = () => (existsSync(backupDir) ? readdirSync(backupDir).filter((f) => f.endsWith('.db')).sort() : []);

let pass = 0;
let total = 0;
const out = [];
function step(name, fn) {
  total += 1;
  try {
    const detail = fn();
    pass += 1;
    out.push('PASS ' + name + (detail ? ' ｜ ' + detail : ''));
  } catch (e) {
    out.push('FAIL ' + name + ' ｜ ' + (e && e.message ? e.message : String(e)));
  }
}
function check(cond, msg) { if (!cond) throw new Error(msg); }
function page(args, file) {
  const r = run([...args, '--html', file]);
  check(r.status === 0, 'exit=' + r.status + ' stderr=' + String(r.stderr).slice(0, 300));
  const env0 = lastJson(r.stdout);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  check(/<!doctype html>/i.test(text), '产物非整页');
  check(text.includes('<section'), '产物没有 section');
  check(statSync(file).size === env0.delivery.bytes, '文件大小≠delivery.bytes');
  check(isAbsolute(env0.delivery.path), 'delivery.path 不是绝对路径');
  const facts = (env0.data && env0.data.receipt) ? env0.data.receipt : env0.data;
  return { json: env0, facts, text };
}
/** 可见文本那一层（`data-t` 里的动作号与复制载荷区不算「上屏」）。 */
const visible = (text) => text.replace(/data-t="[^"]*"/g, '');

/* ① 初始化（唤醒词「初始化」· 向导页型 · 4 步零决策） */
step('初始化 · 一整页（4 步按状态算 ＋ 完成卡 ＋ 记第一笔）', () => {
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'init' })], join(OUT, 'init.html'));
  check(json.data.ok === true, 'data.ok 应为 true：' + JSON.stringify(json.data).slice(0, 200));
  check(json.shape === 'receipt', '形状应为 receipt，实得 ' + json.shape);
  check(text.includes('共 4 步') && text.includes('第 4 步'), '步骤条没按状态算（缺「共 4 步」／「第 4 步」）');
  check(text.includes('环境检测') && text.includes('数据目录确认') && text.includes('只读验证'), '四步名不全');
  check(text.includes('初始化完成，可以开始记账了'), '缺完成卡');
  check(text.includes('记一笔支出'), '缺「顺势推进到下一步」那句（D3）');
  check(!text.includes('全部通过'), '空检测项那一路出现了假绿「全部通过」');
  check(existsSync(join(DATA, 'biscuit_accountant.db')), '库没落盘：' + join(DATA, 'biscuit_accountant.db'));
  return 'bytes=' + json.delivery.bytes;
});
step('初始化 · 幂等（再跑一次照样 exit 0、ok:true）', () => {
  const r = run(['bill.setup.run', '--params', P({ op: 'init' }), '--html', join(OUT, 'init2.html')]);
  check(r.status === 0, 'exit=' + r.status);
  check(lastJson(r.stdout).data.ok === true, '第二次初始化应照样就绪');
  return 'ok';
});

/* ② 初始化状态（唤醒词「初始化状态」· 记录列表／状态页型） */
step('初始化状态 · 三重判定读数 ＋ 页内导航 ＋ 来源脚注', () => {
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'init-status' })], join(OUT, 'status.html'));
  check(json.data.ok === true, 'data.ok 应为 true');
  check(facts.version === 'v2.0', '结构版本应为 v2.0，实得 ' + facts.version);
  for (const s of ['数据存在', '结构版本', '就绪']) check(text.includes(s), '缺判定项：' + s);
  check(/<nav[^>]*aria-label="页内导航"/.test(text), '结果型页应出页内导航');
  check(text.includes('现有记录 0 条'), '零记录被吞了（裁定 4：0 是真实读数）');
  return 'version=' + facts.version;
});

/* ③ 一键备份（唤醒词「备份」第一支 · 结果回执页型） */
step('备份 · 回执页（文件／时间／大小／内容 ＋ 备份真的落盘）', () => {
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'backup-create' })], join(OUT, 'backup.html'));
  check(json.data.ok === true, 'data.ok 应为 true');
  const file = facts.backup;
  check(backups().includes(file), '备份文件不在备份目录里：' + file);
  check(statSync(join(backupDir, file)).size === facts.bytes, '回执报的字节数≠盘上字节数');
  check(text.includes(file), '回执页没写备份文件名');
  check(text.includes('备份成功'), '缺结论句');
  check(/<nav[^>]*aria-label="页内导航"/.test(text), '结果型页应出页内导航');
  return 'backup=' + file + ' bytes=' + facts.bytes;
});

/* ④ 查看备份（唤醒词「备份」第二支 · 记录列表页型）——「一词两场景各出对页」 */
step('查看备份 · 同一条词的第二个场景出列表页（标题与页型都不同）', () => {
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'backup-list' })], join(OUT, 'backup-list.html'));
  check(json.data.ok === true, 'data.ok 应为 true');
  check(facts.count >= 1, '列表应至少有 1 份备份');
  check(text.includes('查看备份'), '没出列表页标题（一词两场景没各出对页）');
  check(!text.includes('备份成功'), '列表页串了回执页的内容');
  check(text.includes(backups()[0]), '列表没写备份文件名');
  return 'count=' + facts.count;
});

/* ⑤ 恢复（唤醒词「恢复备份」· 向导页型）：三件套 ＋ D5 同源 */
writeFileSync(CSV, '日期,金额,分类,账户,账本,备注\n2026-09-01,-31.50,餐饮/外卖/晚餐,微信,生活,晚饭\n'
  + '2026-09-02,-12.00,出行/公交,支付宝,生活,地铁\n2026-09-03,8000.00,工资,,生活,月薪\n', 'utf8');
step('准备 · 导入三笔（第二次备份：让「选中项」有两个候选）', () => {
  const r = run(['bill.setup.run', '--params', P({ op: 'import', file: CSV, confirm: true }), '--html', join(OUT, 'import-seed.html')]);
  check(r.status === 0, 'exit=' + r.status);
  check(lastJson(r.stdout).data.receipt.imported === 3, '应导入 3 行');
  const b = run(['bill.setup.run', '--params', P({ op: 'backup-create' }), '--html', join(OUT, 'backup2.html')]);
  check(b.status === 0, '第二份备份 exit=' + b.status);
  return 'backups=' + backups().length;
});
step('恢复 · 向导页（覆盖警告 ＋ 怎么回去 ＋ 恢复前自动备份的预告）', () => {
  const n0 = backups().length;
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'restore', name: backups()[1] })], join(OUT, 'restore.html'));
  check(json.data.ok === true, 'data.ok 应为 true');
  check(text.includes('恢复将覆盖当前数据'), '缺显式覆盖警告');
  check(text.includes('恢复前会自动备份现状'), '警告里没写「恢复前会自动备份现状」');
  check(text.includes('回到现在的样子'), '警告里没写「怎么回去」');
  check(text.includes('共 4 步') && text.includes('第 3 步'), '恢复向导的步骤条没按状态算');
  check(backups().length === n0, '没确认之前不该多出备份（' + n0 + ' → ' + backups().length + '）');
  return 'selected=' + facts.selected;
});
step('恢复 · 选中项与详情同源（D5：切换备份后详情与口令点的是同一份）', () => {
  const first = backups()[1];
  const second = backups()[0];
  const a = page(['bill.setup.run', '--params', P({ op: 'restore', name: first })], join(OUT, 'restore-a.html'));
  const b = page(['bill.setup.run', '--params', P({ op: 'restore', name: second })], join(OUT, 'restore-b.html'));
  check(a.facts.selected === first && b.facts.selected === second, '两次选中的不是两份不同的备份');
  // 详情卡里「备份名称」后面第一个出现的备份文件名（不依赖表格单元格的 HTML 形状）。
  const detailLine = (text) => {
    const i = text.indexOf('备份名称');
    if (i < 0) return '';
    const m = /biscuit_\d{8}_\d{6}(?:_\d+)?\.db/.exec(text.slice(i, i + 400));
    return m === null ? '' : m[0];
  };
  check(detailLine(a.text) === first, 'A 的详情卡指的不是选中的那份：' + detailLine(a.text));
  check(detailLine(b.text) === second, 'B 的详情卡指的不是选中的那份：' + detailLine(b.text));
  check(a.text.includes('备  份: ' + first), 'A 的口令没点名选中的那份');
  check(b.text.includes('备  份: ' + second), 'B 的口令没点名选中的那份');
  return 'A=' + first + ' B=' + second;
});
step('恢复 · 确认后：现状自动备份 ＋ 库真的回到那一份 ＋ 恢复后验库', () => {
  const target = backups()[1];
  const beforeCount = records();
  const n0 = backups().length;
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'restore', name: target, confirm: true })], join(OUT, 'restore-done.html'));
  check(json.data.ok === true, '恢复应成功：' + JSON.stringify(json.data).slice(0, 200));
  check(backups().length === n0 + 1, '恢复前应无条件多造一份现状备份：' + n0 + ' → ' + backups().length);
  check(text.includes('现状已备份'), '页上没写现状备份（怎么回去）');
  const after = records();
  check(after === 0, '恢复回来的库应是导入前的样子（0 条），实得 ' + after + '（恢复前 ' + beforeCount + '）');
  return 'safety=' + facts.safety + ' records ' + beforeCount + '→' + after;
});

/* ⑥ 导入（唤醒词「导入」· 向导页型）：D2 的四件 */
const CSV2 = join(DB, 'bills2.csv');
writeFileSync(CSV2, '日期,金额,分类,账户,账本,备注\n2026-09-04,-88.00,餐饮/堂食/午餐,微信,生活,午饭\n'
  + '2026-09-05,-20.00,出行/公交,微信,生活,公交\n', 'utf8');
step('导入 · 向导页（①将新增 N 行 ②自动备份预告 ③重复检测读数 ④预览）', () => {
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'import', file: CSV2 })], join(OUT, 'import.html'));
  check(json.data.ok === true, 'data.ok 应为 true');
  check(text.includes('本次将新增 2 行'), '没明示「本次将新增几行」');
  check(text.includes('不覆盖'), '没明示「不覆盖已有记录」');
  check(text.includes('自动备份一次'), '没预告导入前会自动备份');
  check(text.includes('前 2 行'), '缺前几行预览');
  check(facts.new_rows === 2, 'new_rows 应为 2，实得 ' + facts.new_rows);
  check(facts.duplicates === 0, '第一次导入不该有重复行');
  const n = records();
  check(n === 0, '不确认就不许写库，实得 ' + n);
  return 'new_rows=' + facts.new_rows;
});
step('导入 · 重复导入检测（同一份文件再导一次：新增 0、重复 2）', () => {
  const first = run(['bill.setup.run', '--params', P({ op: 'import', file: CSV2, confirm: true }), '--html', join(OUT, 'import-write.html')]);
  check(first.status === 0 && lastJson(first.stdout).data.receipt.imported === 2, '第一次导入应成功 2 行');
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'import', file: CSV2 })], join(OUT, 'import-dup.html'));
  check(facts.new_rows === 0, '第二次应识别出 0 行新增，实得 ' + facts.new_rows);
  check(facts.duplicates === 2, '第二次应识别出 2 行重复，实得 ' + facts.duplicates);
  check(text.includes('库里已经有了'), '页面没写重复检测的读数');
  return 'duplicates=' + facts.duplicates;
});
step('导入 · 结果卡（成功行数 ＋ 失败行数 ＋ 失败原因）', () => {
  const CSV3 = join(DB, 'bills3.csv');
  writeFileSync(CSV3, '日期,金额,分类\n2026-09-06,-5.00,餐饮/零食\n坏行,-1.00,餐饮/零食\n2026-09-07,-6.00,不存在的一级分类\n', 'utf8');
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'import', file: CSV3, confirm: true })], join(OUT, 'import-bad.html'));
  check(json.data.ok === true, '好行应写进去：' + JSON.stringify(json.data).slice(0, 200));
  check(facts.imported === 1, '应成功 1 行，实得 ' + facts.imported);
  check(facts.bad === 2, '应识别出 2 行读不出来的，实得 ' + facts.bad);
  check(text.includes('导入完成：成功 1 行'), '缺结果卡的结论句');
  check(text.includes('读不出来'), '结果卡没写被跳过的行');
  check(facts.backup !== undefined && backups().includes(facts.backup), '导入前没自动备份（D2 第二件）');
  return 'imported=' + facts.imported + ' bad=' + facts.bad + ' backup=' + facts.backup;
});

/* ⑦ 裁定 1／2／4／5／7／9／11／12 的机器面 */
step('裁定 1／4 · 可见文本零内部标识（`bill.`／`.py`／`scripts/`／`undefined`／`NaN`）', () => {
  const files = ['init.html', 'status.html', 'backup.html', 'backup-list.html', 'restore.html', 'import.html', 'restore-done.html', 'import-bad.html'];
  const hits = [];
  for (const f of files) {
    const vis = visible(readFileSync(join(OUT, f), 'utf8'));
    for (const re of [/bill\./g, /\.py/g, /scripts\//g, /undefined/g, /NaN/g]) {
      const n = [...vis.matchAll(re)].length;
      if (n > 0) hits.push(f + ':' + String(re) + '×' + String(n));
    }
  }
  check(hits.length === 0, '可见文本里出现内部标识／脚本路径：' + JSON.stringify(hits));
  return files.length + ' 张页 0 命中';
});
step('裁定 2 · 结果型页恒出导航与来源脚注；过程型页不出导航', () => {
  const nav = /<nav[^>]*aria-label="页内导航"/;
  for (const f of ['status.html', 'backup.html', 'backup-list.html']) {
    const t = readFileSync(join(OUT, f), 'utf8');
    check(nav.test(t), f + ' 缺页内导航');
    check(t.includes('数据来源'), f + ' 缺来源脚注');
  }
  for (const f of ['init.html', 'restore.html', 'import.html']) {
    const t = readFileSync(join(OUT, f), 'utf8');
    check(!nav.test(t), f + ' 是过程型页，不该出页内导航（#688 §五 5.2 第 4 行）');
    check(t.includes('数据来源'), f + ' 缺来源脚注');
  }
  return '结果型 3／过程型 3';
});
step('裁定 5 · 过程型页复制区双按钮（复制数据 ＋ 复制日志）', () => {
  for (const f of ['init.html', 'restore.html', 'import.html']) {
    const t = readFileSync(join(OUT, f), 'utf8');
    check(t.includes('复制数据') && t.includes('复制日志'), f + ' 缺复制区双按钮');
  }
  return '3 张向导页各两颗';
});
step('裁定 7／12 · 样式单源与禁入 token（`<style` 恰 1 处、禁色 0 命中）', () => {
  for (const f of ['init.html', 'backup.html', 'status.html']) {
    const t = readFileSync(join(OUT, f), 'utf8');
    check([...t.matchAll(/<style/g)].length === 1, f + ' 的 <style 不是恰一处（公共层样式段）');
    for (const re of [/--r-xl/g, /--pink/g, /data-theme/g, /prefers-color-scheme:\s*dark/g]) {
      check([...visible(t).matchAll(re)].length === 0, f + ' 命中禁入 token：' + String(re));
    }
  }
  return '3 张页';
});
step('裁定 9 · 缺项阻断：导入缺文件路径时点名且不给可复制的确认口令', () => {
  const { json, facts, text } = page(['bill.setup.run', '--params', P({ op: 'import' })], join(OUT, 'import-missing.html'));
  check(json.data.ok === false, '缺参数应 ok:false');
  check(text.includes('CSV 文件路径'), '阻断没点名缺哪一项');
  check(text.includes('只给看不给复制'), '缺项时仍给了可复制的确认口令');
  return 'ok';
});

/* ⑧ 空备份目录那一支（只读、不报错） */
step('空备份目录 · 「查看备份」出空态与引导、不报错', () => {
  const EMPTY = mkdtempSync(join(tmpdir(), 't731-empty-'));
  const file = join(OUT, 'backup-empty.html');
  const r = spawnSync(process.execPath, [BIN, 'bill.setup.run', '--params', P({ op: 'backup-list' }), '--html', file],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: EMPTY } });
  check(r.status === 0, 'exit=' + r.status);
  const text = readFileSync(file, 'utf8');
  check(text.includes('还没有备份'), '缺空态句');
  check(text.includes('数据来源'), '空态页不完整（缺来源脚注）');
  const res = spawnSync(process.execPath, [BIN, 'bill.setup.run', '--params', P({ op: 'restore' }), '--html', join(OUT, 'restore-empty.html')],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: EMPTY } });
  check(res.status === 0, '没有备份时恢复向导应照样 exit 0，实得 ' + res.status);
  check(readFileSync(join(OUT, 'restore-empty.html'), 'utf8').includes('还没有备份可恢复'), '缺空态句');
  return 'ok';
});

/* ⑨ 路由层：5 条唤醒词都路由到本域命令，「备份」一词两场景 */
total += 1;
try {
  const m = await import(pathToFileURL(join(ROOT, 'packages', 'skill-bill', 'dist', 'triggers', 'wakeTable.js')).href);
  const want = ['初始化', '初始化状态', '备份', '恢复备份', '导入'];
  for (const w of want) {
    const hit = m.routeWakeword(w, { file: 'x.csv' });
    check(hit !== null && hit.key === 'bill.setup.run', w + ' → ' + JSON.stringify(hit) + '，不是 bill.setup.run');
  }
  const backupHits = m.WAKE_TABLE.filter((e) => e.phrase === '备份');
  check(backupHits.length === 1, '「备份」词条应恰一条（两个场景挂同一个词条）');
  pass += 1;
  out.push('PASS 路由层 · 5 条唤醒词逐条路由到 bill.setup.run ｜ 5/5');
} catch (e) {
  out.push('FAIL 路由层 · 5 条唤醒词逐条路由到 bill.setup.run ｜ ' + (e && e.message ? e.message : String(e)));
}

console.log(out.join('\n'));
console.log('RESULT: ' + pass + '/' + total);
process.exit(pass === total ? 0 : 1);
