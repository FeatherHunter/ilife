// t1182 · 查询列表复制整路：一笔一行＋截断拖尾＋窗口元数据＋CSV真表头。
// 三份同源数字一致，复制＝已显示行，旧一坨JSON thin零产出。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLUMNS } from '../dist/query/list.js';
import {
  COLUMNS as COPY_COLUMNS,
  NOTE_TRUNC_LIMIT,
  buildListCopyCsv,
  buildListCopyJson,
  buildListCopyText,
  ticketCopyOf,
  truncateNote,
} from '../dist/query/list-copy.js';

const here = dirname(fileURLToPath(import.meta.url));
const QUERY_DIR = join(here, '..', 'src', 'query');

const ROW_A = { id: '7', time: '2026-10-01 12:00:00', category: '餐饮/午餐', amount: '-35.00', account: '支付宝', ledger: '生活', note: '午饭' };
const LONG_NOTE = '备注含,逗号"引号开头' + '很长很长很长很长很长很长很长很长很长很长很长尾';
const ROW_B = { id: '8', time: '2026-10-01 18:30:00', category: '出行/地铁', amount: '-6.00', account: '微信', ledger: '生活', note: LONG_NOTE };

describe('t1182 · 列序与表头同源', () => {
  it('复制列序＝表头COLUMNS（键序＋文案同源）', () => {
    assert.deepEqual(COPY_COLUMNS.map((c) => c.key), ['time', 'category', 'amount', 'account', 'ledger', 'note', 'id']);
    assert.deepEqual(COPY_COLUMNS.map((c) => c.label), ['时间', '分类', '金额', '账户', '账本', '备注', '编号']);
    assert.deepEqual(COLUMNS.map((c) => c.key), COPY_COLUMNS.map((c) => c.key));
    assert.deepEqual(COLUMNS.map((c) => c.label), COPY_COLUMNS.map((c) => c.label));
  });
  it('纯文本一笔一行、列序固定', () => {
    const text = buildListCopyText({ title: '查今天', window: '2026-10-01 这一天', total: 2, shown: [ROW_A, ROW_B] });
    const lines = text.split('\n');
    assert.equal(lines.length, 4);
    const rowLine = lines[2];
    const order = ['时间 ' + ROW_A.time, '分类 ' + ROW_A.category, '金额 ' + ROW_A.amount, '账户 ' + ROW_A.account, '账本 ' + ROW_A.ledger, '备注 午饭', '编号 7'];
    let last = -1;
    for (const seg of order) {
      const at = rowLine.indexOf(seg);
      assert.ok(at > last, '列序固定，缺：' + seg + ' 行：' + rowLine);
      last = at;
    }
  });
});

describe('t1182 · 截断拖尾', () => {
  it('长备注截断＋拖尾省略N字＋恒单行', () => {
    const flat = LONG_NOTE.replace(/\r\n|\r|\n/g, ' ');
    const chars = Array.from(flat);
    const omitted = chars.length - NOTE_TRUNC_LIMIT;
    assert.ok(omitted > 0);
    const got = truncateNote(LONG_NOTE);
    assert.equal(got, chars.slice(0, NOTE_TRUNC_LIMIT).join('') + '…（省略' + omitted + '字）');
    const text = buildListCopyText({ title: '查今天', window: 'w', total: 1, shown: [ROW_B] });
    const rowLine = text.split('\n')[2];
    assert.ok(rowLine.includes('…（省略' + omitted + '字）'));
    assert.ok(!rowLine.includes(LONG_NOTE));
    assert.equal(rowLine.includes('\n'), false);
  });
});

describe('t1182 · 窗口元数据行', () => {
  it('全列：共N笔已全列＋窗口条件', () => {
    const text = buildListCopyText({ title: '查昨天', window: '2026-09-30 这一天', total: 2, shown: [ROW_A, ROW_B] });
    assert.ok(text.split('\n')[1].includes('共 2 笔'));
    assert.ok(text.split('\n')[1].includes('已全列'));
    assert.ok(text.split('\n')[1].includes('2026-09-30 这一天'));
    const json = JSON.parse(buildListCopyJson({ title: '查昨天', window: '2026-09-30 这一天', total: 2, shown: [ROW_A, ROW_B] }));
    assert.equal(json.total, 2);
    assert.equal(json.shown, 2);
    assert.equal(json.window, '2026-09-30 这一天');
  });
  it('截断：共N笔仅列前M笔可复现（5笔列3笔）', () => {
    const five = [ROW_A, ROW_B, ROW_A, ROW_B, ROW_A];
    const shown3 = five.slice(0, 3);
    const text = buildListCopyText({ title: '查区间', window: '2026-10-01 ~ 2026-10-07', total: 5, shown: shown3 });
    const lines = text.split('\n');
    assert.equal(lines.length, 2 + 3);
    assert.ok(lines[1].includes('共 5 笔'));
    assert.ok(lines[1].includes('仅列前 3 笔'));
    assert.ok(lines[1].includes('2026-10-01 ~ 2026-10-07'));
    const json = JSON.parse(buildListCopyJson({ title: '查区间', window: '2026-10-01 ~ 2026-10-07', total: 5, shown: shown3 }));
    assert.equal(json.total, 5);
    assert.equal(json.shown, 3);
    assert.equal(json.rows.length, 3);
    const csv = buildListCopyCsv({ title: '查区间', window: '2026-10-01 ~ 2026-10-07', total: 5, shown: shown3 });
    assert.equal(csv.split('\n').length, 1 + 3);
  });
});

describe('t1182 · CSV真表头＋RFC4180', () => {
  it('首行列名＋逗号引号双写', () => {
    const csv = buildListCopyCsv({ title: 't', window: 'w', total: 1, shown: [ROW_B] });
    const lines = csv.split('\n');
    assert.equal(lines[0], '时间,分类,金额,账户,账本,备注,编号');
    assert.ok(lines[1].includes('""'), '引号须双写：' + lines[1]);
    assert.ok(lines[1].startsWith('"2026-10-01 18:30:00"') === false, '无换行则时间格不包引号');
  });
});

describe('t1182 · 三份同源＋旧门零产出', () => {
  it('金额三份一致', () => {
    const input = { title: '查今天', window: '2026-10-01 这一天', total: 2, shown: [ROW_A, ROW_B] };
    const text = buildListCopyText(input);
    const json = JSON.parse(buildListCopyJson(input));
    const csv = buildListCopyCsv(input);
    for (const amt of ['-35.00', '-6.00']) {
      assert.ok(text.includes(amt), '文本缺金额' + amt);
      assert.ok(JSON.stringify(json).includes(amt), 'JSON缺金额' + amt);
      assert.ok(csv.includes(amt), 'CSV缺金额' + amt);
    }
    assert.equal(json.rows.length, 2);
    assert.equal(csv.split('\n').length, 3);
  });
  it('旧一坨JSON thin零产出', () => {
    const input = { title: '查今天', window: 'w', total: 1, shown: [ROW_A] };
    const text = buildListCopyText(input);
    const csv = buildListCopyCsv(input);
    const json = buildListCopyJson(input);
    assert.ok(!text.includes('{"id"'), '文本不许一坨JSON：' + text.slice(0, 200));
    assert.ok(!csv.split('\n')[0].includes('section'), 'CSV首行须真表头');
    assert.equal(csv.split('\n')[0], '时间,分类,金额,账户,账本,备注,编号');
    assert.ok(!json.includes('"items"'), 'JSON不许旧信封items键');
  });
  it('15纸行式一种：全部票据页复制区走同一门', () => {
    const files = readdirSync(QUERY_DIR).filter((f) => /^ticket.*\.ts$/i.test(f) || f === 'list-tag.ts');
    assert.ok(files.length >= 14, '票据页须齐，实见：' + files.join(','));
    const missing = [];
    for (const f of files) {
      const src = readFileSync(join(QUERY_DIR, f), 'utf8');
      if (!src.includes('list-copy.js') || !src.includes('dataText') || !src.includes('dataJson') || !src.includes('dataCsv')) missing.push(f);
    }
    assert.deepEqual(missing, [], '这些票据页复制区未走同一门：' + missing.join(','));
  });
  it('BillRow投影：金额两位＋编号字符串', () => {
    const copy = ticketCopyOf('查今天', '2026-10-01 这一天', [
      { id: 7, time: '2026-10-01 12:00:00', category: '餐饮', amount: -35, account: '支付宝', ledger: '生活', note: '午饭' },
    ]);
    assert.ok(copy.text.includes('-35.00'));
    assert.ok(copy.text.includes('编号 7'));
    assert.ok(copy.csv.includes('-35.00'));
  });
});
