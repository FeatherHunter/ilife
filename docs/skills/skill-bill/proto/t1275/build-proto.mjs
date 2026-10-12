/** #1275 原型构建：读**真** HELP HTML → 打数据补丁 ＋ 内联原型脚本 → 写出原型 HTML。
 *
 * 用法：node docs/skills/skill-bill/proto/t1275/build-proto.mjs <真HELP.html> <原型输出.html>
 *
 * 纪律（协议 §2.3）：先在内存里算出产物 → 跑完全部断言 → 全过才落盘；任一断言红即非 0 退出、不写文件。
 * 这里只改 <script id="help-data"> 里的场景数据与一份页面侧补丁，模板 CSS／函数体一行不动。
 *
 * v2（第 2 轮讨论，用户 2026-10-13 五点）：一个场景就叫「查某天」（删「查账单」词条）、
 * 账本候选用**真**生成期注入（#1270 第二刀 7e3828d7 已落地）、时间一个槽位、看全文改 ⓘ、点框任意处开选择器。
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

const LEDGER_LINE = '账本＝记录的分组（如 生活、旅行）；一笔记录只归一个账本';
const LEDGER_FULL = '账本是对记录的分组（例如 生活、旅行、借贷）。一笔记录只属于一个账本；本场景只查这个账本里的记录。';
const DAY_LINE = '空＝今天；点框任意处就开日历';
const TIME_LINE = '空＝全部时间；点粒度再选，不用手打';

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
assert(find('query_bill_detail'), 'A2 找不到 query_bill_detail（查账单详情）');

const log = [];

/* ── ① 条目 1：一个场景「查某天」；删掉同命令的「查账单」词条（同 bill.record.today，只差默认值） ── */
for (const g of data.groups) {
  for (const sg of g.subgroups) {
    const j = sg.scenes.findIndex((s) => s.id === 'query_bills');
    if (j < 0) continue;
    sg.scenes.splice(j, 1);
    log.push('删卡 query_bills（查账单）← ' + g.label + '/' + sg.label);
    assert(
      sg.scenes.map((s) => s.id).join(',') === 'query_today,query_yesterday,query_date,query_recent,query_week,query_month,query_range,query_bill_detail',
      'A4 按时间组顺序应为 今天/昨天/某天/最近/周/月/区间/详情，实际 ' + sg.scenes.map((s) => s.id).join(',')
    );
  }
}
const day = find('query_date');
day.title = '查某天的账';
day.wake_word = '查某天';
day.prompt_template =
  '请你加载技能 饼干记账,执行唤醒词「查某天」。\n\n我想查某一天的账，不填日期就是今天。\n\n日期(选填):{{query_date}}';
day.editable_fields = [
  { name: 'query_date', label: '日期(选填)', value: '', hint: DAY_LINE, required: false, kind: 'date' },
];
log.push('查某天 query_date：标题「查某天的账」／唤醒词「查某天」／日期改选填（空＝今天）／去掉与查账单互指的那段');

/* ── ①b 「查某天」只剩一个入口后，查账单详情的取号指引不能再指向已删的「查账单」 ── */
const detail = find('query_bill_detail');
const OLD_PICK = '从查账单或查今天或查某天的列表里取';
assert(detail.editable_fields[0].hint === OLD_PICK, 'A3 查账单详情 hint 与预期不一致：' + detail.editable_fields[0].hint);
detail.editable_fields[0].hint = '从查某天或查今天或查最近的列表里取';
log.push('查账单详情.记录 id：取号指引改为「从查某天或查今天或查最近的列表里取」');

/* ── ② 条目 12：查某账本——账本下拉（真候选）＋ 一个「时间」槽位 ── */
const led = find('query_ledger');
assert(led.editable_fields[0].kind === 'select' && led.editable_fields[0].options.length > 0,
  'A3 查账本的账本字段应已是生成期注入的 select（#1270 第二刀），实际 ' + led.editable_fields[0].kind);
const ledOptions = led.editable_fields[0].options.slice();
led.prompt_template =
  '请你加载技能 饼干记账,执行唤醒词「查账本」。\n\n我想查某个账本的记录。' + LEDGER_FULL + '\n\n账本:{{ledger}}\n时间(选填):{{period}}';
led.editable_fields = [
  { name: 'ledger', label: '账本', value: '', hint: LEDGER_LINE, required: true, kind: 'select', options: ledOptions, source: 'ledgers' },
  { name: 'period', label: '时间(选填)', value: '', hint: TIME_LINE, required: false, kind: 'period' },
];
log.push('查账本：6 字段 → 账本(真候选 ' + ledOptions.join('／') + ') ＋ 时间(period 一个槽位)');

/* ── ③ 同一个「时间」槽位也用在其余查询条件上（形状一致） ── */
for (const id of ['query_category', 'query_account']) {
  const s = find(id);
  const p = (s.editable_fields || []).find((f) => f.name === 'period');
  assert(p, 'A3 ' + id + ' 找不到 period 字段');
  p.label = '时间(选填)';
  p.hint = TIME_LINE;
  p.kind = 'period';
  log.push(id + '.period → kind:period');
}

/* ── ④ 账本一句话：查询侧已注入候选的账本槽位用同一句（写入侧保持自由文本，不锁死新账本） ── */
for (const { s } of list) {
  const f = (s.editable_fields || []).find((x) => x.name === 'ledger' && x.kind === 'select');
  if (!f) continue;
  f.hint = LEDGER_LINE;
  f.label = '账本' + (/选填/.test(f.label || '') ? '(选填)' : '');
  log.push('账本一句话 → ' + s.id + '（label ' + JSON.stringify(f.label) + '）');
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
assert(!after.query_bills, 'A4 query_bills 仍在（删卡没生效）');
assert(scenesAfter === scenesBefore - 1, 'A4 场景数应减 1：' + scenesBefore + ' → ' + scenesAfter);
assert(after.query_date.s.title === '查某天的账', 'A4 查某天标题不对');
assert(after.query_date.s.wake_word === '查某天', 'A4 查某天唤醒词不对');
assert(after.query_date.s.prompt_template.indexOf('查账单') < 0, 'A4 查某天正文不应再提查账单');
assert(after.query_date.s.editable_fields[0].kind === 'date', 'A4 查某天日期控件应为 date');
assert(after.query_date.s.editable_fields[0].required === false, 'A4 查某天日期应为选填');
const ledFields = after.query_ledger.s.editable_fields;
assert(ledFields.length === 2 && ledFields[0].name === 'ledger' && ledFields[1].name === 'period', 'A4 查账本字段应为 ledger＋period 两个');
assert(ledFields[0].kind === 'select' && ledFields[0].options.length === ledOptions.length, 'A4 账本应为真候选 select');
assert(ledFields[0].label === '账本', 'A4 账本 label 应为「账本」');
assert(/账本/.test(ledFields[0].hint), 'A4 账本字段 hint 应含一句话');
assert(led.prompt_template.indexOf(LEDGER_FULL) >= 0, 'A4 正文应含账本一句话');
assert(!/\{\{period_week\}\}/.test(led.prompt_template), 'A4 正文不应再有四选一字段');
assert(after.query_category.s.editable_fields.find((f) => f.name === 'period').kind === 'period', 'A4 查分类时间槽位未换成 period');
/* 全量：除「查账单详情」这一族外，任何场景里都不应再出现「查账单」字样 */
const stray = [];
for (const g of data.groups) {
  for (const sg of g.subgroups) {
    for (const s of sg.scenes) {
      if (s.id === 'query_bill_detail') continue; /* 它的词条名就叫查账单详情，保留 */
      (function walk(o, path) {
        if (typeof o === 'string') { if (o.indexOf('查账单') >= 0) stray.push(s.id + path + '=' + o.slice(0, 50)); return; }
        if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], path + '.' + k);
      })(s, '');
    }
  }
}
assert(stray.length === 0, 'A4 还有指向已删「查账单」的字样：' + stray.join(' | '));

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
