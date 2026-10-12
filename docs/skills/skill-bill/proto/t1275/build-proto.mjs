/** #1275 原型构建：读**真** HELP HTML → 打数据补丁 ＋ 内联原型脚本 → 写出原型 HTML。
 *
 * 用法：node docs/skills/skill-bill/proto/t1275/build-proto.mjs <真HELP.html> <原型输出.html>
 *
 * 纪律（协议 §2.3）：先在内存里算出产物 → 跑完全部断言 → 全过才落盘；任一断言红即非 0 退出、不写文件。
 * 这里只改 <script id="help-data"> 里的场景数据与一份页面侧补丁，模板 CSS／函数体一行不动。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [, , BASE, OUT] = process.argv;
if (!BASE || !OUT) {
  console.error('用法: node build-proto.mjs <真HELP.html> <原型输出.html>');
  process.exit(2);
}

const LEDGER_LINE = '账本＝给记录分组，一笔记录只属于一个账本；候选是库里已有账本（如 生活／旅行／借贷）';
const LEDGER_FULL = '账本是对记录的分组（例如 生活、旅行、借贷）；一笔记录只属于一个账本，本场景只查这个账本里的记录。';
const LEDGER_OPTIONS = ['生活', '旅行', '借贷'];

const html = readFileSync(BASE, 'utf8');
const m = html.match(/(<script id="help-data" type="application\/json">)([\s\S]*?)(<\/script>)/);
assert(m, 'A1 基底里找不到 <script id="help-data">（基线不是本仓 HELP 产物？）');
const data = JSON.parse(m[2]);

/* ── 场景索引 ── */
const list = [];
for (const g of data.groups) for (const sg of g.subgroups) for (const s of sg.scenes) list.push({ g, sg, s });
const scenesBefore = list.length;
const find = (id) => (list.find((x) => x.s.id === id) || {}).s;

assert(find('query_date'), 'A2 找不到 query_date（查某天）');
assert(find('query_bills'), 'A2 找不到 query_bills（查账单）');
assert(find('query_ledger'), 'A2 找不到 query_ledger（查账本）');
assert(find('query_category'), 'A2 找不到 query_category（查分类）');
assert(find('query_account'), 'A2 找不到 query_account（查账户）');

const log = [];

/* ── ① 条目 1：查某天 并入 查账单（同一个命令 bill.record.today，只差默认值） ── */
for (const g of data.groups) {
  for (const sg of g.subgroups) {
    const i = sg.scenes.findIndex((s) => s.id === 'query_date');
    if (i < 0) continue;
    const j = sg.scenes.findIndex((s) => s.id === 'query_bills');
    assert(j >= 0, 'A2 query_date 与 query_bills 应在同一二级组（按时间）');
    const moved = sg.scenes.splice(j, 1)[0];
    sg.scenes.splice(i, 1);
    sg.scenes.splice(i, 0, moved); /* 合并卡继承查某天原来的位置 */
    log.push('删卡 query_date ← ' + g.label + '/' + sg.label + '；合并卡顶回它的位置（第 ' + (i + 1) + ' 张）');
    assert(
      sg.scenes.map((s) => s.id).join(',') === 'query_today,query_yesterday,query_bills,query_recent,query_week,query_month,query_range,query_bill_detail',
      'A4 按时间组顺序应为 今天/昨天/合并卡/最近/周/月/区间/详情，实际 ' + sg.scenes.map((s) => s.id).join(',')
    );
  }
}
const bills = find('query_bills');
bills.title = '查某天的账';
bills.wake_word = '查账单';
bills.prompt_template =
  '请你加载技能 饼干记账,执行唤醒词「查账单」。\n\n我想看某一天的账，不填日期就是今天。\n\n日期(选填):{{query_date}}';
bills.editable_fields = [
  { name: 'query_date', label: '日期(选填)', value: '', hint: '空＝今天；点框选日历上的某一天', required: false, kind: 'date' },
];
log.push('合并卡 query_bills：标题「查某天的账」／唤醒词「查账单」＋别名「查某天」／日期改选填');

/* ── ② 条目 12：查某账本——账本一句话 ＋ 一个「时间」槽位 ── */
const led = find('query_ledger');
led.title = '查某账本的记录';
led.prompt_template =
  '请你加载技能 饼干记账,执行唤醒词「查账本」。\n\n我想查某个账本的记录。' + LEDGER_FULL + '\n\n账本:{{ledger}}\n时间(选填):{{period}}';
led.editable_fields = [
  { name: 'ledger', label: '账本', value: '', hint: LEDGER_LINE, required: true, kind: 'select', options: LEDGER_OPTIONS },
  { name: 'period', label: '时间(选填)', value: '', hint: '空＝全部时间；不用手打，点粒度再选', required: false, kind: 'period' },
];
log.push('查某账本：6 字段 → 账本(select 候选) ＋ 时间(period 一个槽位)');

/* ── ③ 同一个「时间」槽位也用在其余查询条件上（形状一致） ── */
for (const id of ['query_category', 'query_account']) {
  const s = find(id);
  const p = (s.editable_fields || []).find((f) => f.name === 'period');
  assert(p, 'A3 ' + id + ' 找不到 period 字段');
  p.label = '时间(选填)';
  p.hint = '空＝全部时间；不用手打，点粒度再选';
  p.kind = 'period';
  log.push(id + '.period → kind:period');
}

/* ── ④ 账本一句话：所有带账本字段的弹窗用同一句（写入侧保持 text 不锁死新账本） ── */
for (const { s } of list) {
  const f = (s.editable_fields || []).find((x) => x.name === 'ledger');
  if (!f) continue;
  f.hint = LEDGER_LINE;
  if (s.id === 'query_category') {
    f.label = '账本(选填)';
    f.kind = 'select';
    f.options = LEDGER_OPTIONS;
  }
  log.push('账本一句话 → ' + s.id);
}

/* ── ⑤ 副标题场景计数随补丁走 ── */
const scenesAfter = data.groups.reduce((n, g) => n + g.subgroups.reduce((k, sg) => k + sg.scenes.length, 0), 0);
const sub = String(data.subtitle || '');
const counted = sub.replace(/(\d+)\s*场景/, scenesAfter + ' 场景');
data.subtitle = counted;
log.push('副标题：' + JSON.stringify(sub) + ' → ' + JSON.stringify(counted));

/* ── 断言（全过才落盘） ── */
const after = {};
for (const g of data.groups) for (const sg of g.subgroups) for (const s of sg.scenes) after[s.id] = { g, sg, s };
assert(!after.query_date, 'A4 query_date 仍在（删卡没生效）');
assert(scenesAfter === scenesBefore - 1, 'A4 场景数应减 1：' + scenesBefore + ' → ' + scenesAfter);
assert(after.query_bills.s.title === '查某天的账', 'A4 合并卡标题不对');
assert(after.query_bills.s.editable_fields[0].kind === 'date', 'A4 合并卡日期控件应为 date');
assert(after.query_bills.s.editable_fields[0].required === false, 'A4 合并卡日期应为选填');
const ledFields = after.query_ledger.s.editable_fields;
assert(ledFields.length === 2 && ledFields[0].name === 'ledger' && ledFields[1].name === 'period', 'A4 查账本字段应为 ledger＋period 两个');
assert(ledFields[0].kind === 'select' && ledFields[0].options.length === 3, 'A4 账本应为 3 候选的 select');
assert(/账本/.test(ledFields[0].hint), 'A4 账本字段 hint 应含一句话');
assert(led.prompt_template.indexOf(LEDGER_FULL) >= 0, 'A4 正文应含账本一句话');
assert(!/\{\{period_week\}\}/.test(led.prompt_template), 'A4 正文不应再有四选一字段');

const json = JSON.stringify(data).replace(/<\//g, '<\\/');
const protoJs = readFileSync(join(HERE, 'proto-1275.js'), 'utf8');
const outHtml = html.slice(0, m.index) + m[1] + json + m[3] + html.slice(m.index + m[0].length);
const finalHtml = outHtml.replace(/<\/body>/, '<script>\n' + protoJs + '\n</script>\n</body>');

assert(finalHtml.indexOf('proto1275') > 0, 'A5 产物里没有原型补丁标记');
assert(finalHtml.indexOf('查某天的账') > 0, 'A5 产物里没有合并卡标题');
const re = finalHtml.match(/<script id="help-data" type="application\/json">([\s\S]*?)<\/script>/);
assert(re, 'A6 产物里 help-data 脚本不完整');
const back = JSON.parse(re[1]);
assert(back.subtitle === data.subtitle, 'A6 产物回的 JSON 与内存里不一致');

writeFileSync(OUT, finalHtml, 'utf8');

console.log('BASE=' + BASE);
console.log('OUT=' + OUT);
console.log('场景数: ' + scenesBefore + ' → ' + scenesAfter);
for (const l of log) console.log('  · ' + l);
console.log('RESULT: ' + log.length + ' 处补丁全部落盘，断言全绿');

function assert(cond, msg) {
  if (!cond) {
    console.error('✖ ' + msg);
    console.error('（不落盘：本次运行没有写出任何文件）');
    process.exit(1);
  }
}
