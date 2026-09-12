/** #239 · 复制与提示共用件（`src/shared/copyArea.ts`）：三条硬性质 ＋ 日志六段内容。
 *
 * 三条硬性质（设计 §3.1，验收口径）：
 *  ① `copyArea({title, data})` 与今天的 `dataCopyArea(title, data)` **产物逐字相同**
 *     ——其余 46 张页可以机械替换、字节不动；
 *  ② 给了 `log` 就出第二颗按钮，id 与文案取冻结表（`ilife-copy-log`／「复制日志」），
 *     卡路里侧不自造按钮、不自造 id；
 *  ③ 三样全不给＝出 `emptyText` 一句、**不出按钮**——今天那种点了零反馈的死按钮不许再产。
 *
 * 红点（改坏了这里必红）：把「没数据也出按钮」改回来 → ③；把按钮改成手写 `<button>` 字面量
 * 或自造 id → ②；把 `dataCopyArea` 改成第二套装配 → ①。
 *
 * 运行：先 `pnpm --filter skill-calorie build`，再
 *       `node --test packages/skill-calorie/test/copy-component-179.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { buildDataText, buildLogText } from 'base-paint';
import { copyArea, copyLog, dataCopyArea, notice, promptCopyArea } from '../dist/shared/copyArea.js';

const ENVELOPE = {
  version: '0.1.0', skill: 'calorie', shape: 'stat', key: 'calorie.view.profile',
  data: { metrics: { age: 30, heightCm: 175 } },
};
const DATA = { envelope: ENVELOPE };
const COMMAND = "calorie-cmd-read calorie.profile.set --params '{\"heightCm\":174}'";
const M5_LINE = 'id=1 | 日期 2026-09-12 10:00:00 | 影响 1 行 | 字段 heightCm';
const LOG = {
  envelope: ENVELOPE,
  copyLog: copyLog({
    command: COMMAND, source: 'user_profile (写库回执)', m5Line: M5_LINE,
    actionAt: '2026-09-12 10:00:00', version: '0.1.0',
  }),
};

test('#239 ① copyArea({title,data}) 与 dataCopyArea(title,data) 产物逐字相同', () => {
  const viaCopyArea = copyArea({ title: '复制数据', data: DATA });
  const viaDataCopyArea = dataCopyArea('复制数据', DATA);
  assert.equal(viaCopyArea, viaDataCopyArea, '两处装配走散了，46 处调用点就不能共用同一条形态');
  assert.equal(viaCopyArea, dataCopyArea('复制数据', DATA), '同一个入参两次调用也必须同产物');
  // 数据位恒是**三格式菜单**（#247 定案）：开合器 ＋ 三项，各自的 data-t 是三种格式的投影。
  assert.ok(viaCopyArea.includes('data-fmt-open="1"'), '缺菜单开合器（数据位应恒出菜单）');
  assert.deepEqual([...viaCopyArea.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv']);
  for (const f of ['text', 'json', 'csv']) {
    assert.ok(viaCopyArea.includes(buildDataText({ ...DATA, format: f }).slice(0, 40).replace(/&/g, '&amp;').replace(/"/g, '&quot;')),
      '缺 ' + f + ' 格式的文本投影');
  }
  assert.equal(viaCopyArea.includes('ilife-copy-log'), false, '没给日志却凭空出第二颗按钮');
});

test('#239 ② 给了 log 出复制日志那颗：id 与文案取冻结表，文本渲染期写进 data-t', () => {
  const html = copyArea({ title: '复制数据', data: DATA, log: LOG });
  const ids = [...html.matchAll(/data-action-id="([^"]+)"/g)].map((m) => m[1]);
  // 数据那颗已并入菜单（不占 data-action-id），故页内只剩复制日志一颗 id。
  assert.deepEqual(ids, ['ilife-copy-log'], '复制日志的 id 不是冻结表那一颗');
  assert.equal((html.match(/<button/g) ?? []).length, 5, '开合器 1 ＋ 菜单项 3 ＋ 复制日志 1');
  assert.ok(html.includes('>复制日志</button>'), '复制日志文案不是冻结缺省');
  assert.ok(html.includes('>复制数据 ▾</button>'), '开合器文案丢了（应是「复制数据 ＋ ▾」）');
  assert.ok(html.includes('data-t="'), '复制文本必须渲染期写死（点开才读＝点了没反应）');
  assert.equal(/<button[^>]*\son[a-z]+\s*=/i.test(html), false, '零内联事件处理器');

  // 预检确认页那种「prompt ＋ 数据 ＋ 日志」三样：prompt 那颗走它自己的冻结 id。
  const three = copyArea({ title: '复制数据', prompt: 'P', data: DATA, log: LOG });
  const threeIds = [...three.matchAll(/data-action-id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(threeIds.length, 2, 'prompt ＋ 日志各一颗（数据那颗在菜单里）');
  assert.equal(new Set(threeIds).size, 2, '页内 actionId 必须两两不同');
  assert.ok(three.startsWith(promptCopyArea('P')), 'prompt 区不是既有那两件');
});

test('#239 ③ 三样全不给＝出空态一句话、不出按钮', () => {
  const html = copyArea({});
  assert.ok(html.includes('本页没有可复制的数据'), '缺缺省空态句');
  assert.equal(html.includes('<button'), false, '没有可复制的数据就不许出按钮');
  assert.ok(html.includes('ilife-empty'), '空态走 B-10 空态区块（不是自造段落）');

  const custom = copyArea({ emptyText: '这张页没有可复制的内容' });
  assert.ok(custom.includes('这张页没有可复制的内容'), '调用方给的句子没生效');
  assert.equal(custom.includes('本页没有可复制的数据'), false);
  assert.equal(custom.includes('<button'), false);

  // 只给 prompt：prompt 区自己就有可复制的内容，不补空态、更不出死按钮。
  assert.equal(copyArea({ prompt: 'P' }), promptCopyArea('P'));
});

test('#247 ④ 数据位恒出三格式菜单；三样全不给时仍不出按钮；hints 可换', () => {
  // ① **数据位恒出菜单**（新默认，不许被暗改回去）：不给任何开关也是「开合器 ＋ 三项」。
  const bare = copyArea({ title: '复制数据', data: DATA });
  assert.equal(bare.includes('data-fmt-open="1"'), true, '数据位不得退回单格式按钮');
  assert.deepEqual([...bare.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
    '菜单不是纯文本／JSON／CSV 三项');
  assert.equal(bare.includes('data-action-id="ilife-copy-data"'), false, '数据那颗不该再单独占一个 id');
  // 反向：`dataCopyArea` 这条 46 处调用点走的路，产物与 `copyArea` 逐字相同。
  assert.equal(bare, dataCopyArea('复制数据', DATA), '46 处调用点与 copyArea 的产物走散了');

  // ② 三种格式各一份文本，各自的 data-t 互不相同；开合器不带 data-t。
  const html = copyArea({ title: '复制数据', data: DATA, log: LOG });
  const texts = [...html.matchAll(/data-fmt="([^"]+)"[^>]*\sdata-t="([^"]*)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(texts, [
    ['text', buildDataText({ ...DATA, format: 'text' }).replace(/&/g, '&amp;').replace(/"/g, '&quot;')],
    ['json', buildDataText({ ...DATA, format: 'json' }).replace(/&/g, '&amp;').replace(/"/g, '&quot;')],
    ['csv', buildDataText({ ...DATA, format: 'csv' }).replace(/&/g, '&amp;').replace(/"/g, '&quot;')],
  ], '三项各自的 data-t 不是该格式 buildDataText 的投影');
  assert.equal(new Set(texts.map((t) => t[1])).size, 3, '三份文本居然有重复');
  assert.equal(/data-fmt-open="1"[^>]*\sdata-t=/.test(html), false, '开合器不得带 data-t');

  // ③ 用途提示：缺省取老仓原样三项（`hints` 可覆盖；不给自己另立一份中文表）。
  for (const hint of ['粘贴给 AI / 自己看', '结构化存档', '表格导入']) {
    assert.ok(html.includes(hint), '缺老仓原样的用途提示：' + hint);
  }
  const custom = copyArea({ title: '复制数据', data: DATA, dataFormats: { hints: ['甲', '乙', '丙'] } });
  assert.ok(custom.includes('>甲</span>') && custom.includes('>丙</span>'), '调用方给的 hints 没生效');
  assert.equal(custom.includes('结构化存档'), false, '给了 hints 就该只用自己的那三条');

  // ④ 没给 data 就与「什么都没给」同口径——一句空态、不出死按钮（不会凭空出一颗没有文本的按钮）。
  const noData = copyArea({ title: '复制数据' });
  assert.ok(noData.includes('本页没有可复制的数据'), '没给数据就该说一句');
  assert.equal(noData.includes('<button'), false, '没给数据不得出按钮');

  // ⑤ prompt 位不受影响：只给 prompt 时不出菜单（prompt 是**指令**，只有一种正确表示）。
  const promptOnly = copyArea({ prompt: 'P' });
  assert.equal(promptOnly, promptCopyArea('P'), 'prompt 位不该被菜单能力碰到');
  assert.equal(promptOnly.includes('data-fmt'), false, 'prompt 位不得出菜单');
});

test('#239 日志六段：场景标识／思考链／数据结构／调用链（命令＋M5 行）／时间戳版本／异常', () => {
  const text = buildLogText({ envelope: ENVELOPE, copyLog: LOG.copyLog });
  assert.ok(text.includes('calorie.calorie.view.profile（stat）'), '第 1 段不是 envelope 派生的场景标识');
  assert.ok(text.includes('本页由本地 CLI 渲染，无 AI 链'), '第 2 段缺固定说明');
  assert.ok(text.includes('calorie_data.db ｜ user_profile (写库回执)'), '第 3 段缺库文件名或数据来源');
  assert.ok(text.includes(COMMAND), '第 4 段缺命令原文（照抄重跑的那条）');
  assert.ok(text.includes(M5_LINE), '第 4 段缺 M5 整行');
  assert.ok(text.includes('2026-09-12 10:00:00 · 版本 0.1.0'), '第 5 段缺时间戳或版本');
  assert.ok(text.endsWith('异常\n无'), '第 6 段不是「无」');
  assert.equal(text.includes('(未知)'), false, '六段不得落 (未知) 占位');

  // 时间戳由调用方给（本件不自己取时钟——共用位不反向依赖渲染层的取时件），原样落进第 5 段。
  const explicit = copyLog({ command: 'calorie-cmd-read calorie.view.profile', actionAt: '2026-09-01 08:00:00' });
  assert.equal(explicit.timestamp, '2026-09-01 08:00:00', '时间戳没照给的值写');
  assert.equal(buildLogText({ envelope: ENVELOPE, copyLog: explicit }).includes('(未知)'), false);
});

test('#239 弹提示：notice 走 base-render 的反馈区块（不自造提示通道）', () => {
  const html = notice({ msg: '已写入', detail: '粘贴给 AI' });
  assert.ok(html.includes('ilife-block-feedback-block'), '不是 B-12 反馈区块');
  assert.ok(html.includes('ilife-toast'), '不是 toast 形态');
  assert.ok(html.includes('已写入') && html.includes('粘贴给 AI'), '一句话或详情丢了');
  assert.ok(!html.includes('📋'), '缺省图标不该是复制图标（提示块不是复制按钮）');
  const titled = notice({ title: '写入结果', msg: '已写入', icon: 'ok' });
  assert.ok(titled.includes('写入结果'), '标题丢了');
  assert.ok(titled.includes('✅'), '调用方给的图标没生效');
  assert.throws(() => notice({}), /msg/, '缺 msg 应由 base-render 拦（不自造兜底）');
});
