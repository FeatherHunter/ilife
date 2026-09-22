/** #790 辅助与管理用例：**两张页的页契约**——初始化回执（本次新建还是沿用已有 ＋
 *  三张表行数 ＋ 库路径 ＋ 下一步）与首次使用向导（老侧 6 步 ＋ 飞书强引导 ＋ 初始化报告 ＋ 完成）。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-schedule --force`（用例读 `dist/**`），
 *  再 `node --test --test-concurrency=1 packages/skill-schedule/test/t790-辅助与管理.test.mjs`。
 *
 *  数据是**临时家目录 ＋ 临时库**（本包用例要在任何机器上都能跑），逐行的种子库产物与四道门由票面
 *  验收命令 `docs/skills/skill-schedule/t790-探针.mjs` 走（那不是用例）。
 *
 *  「改坏必红」：把 `handlers.ts` 两支 `html:` 换回 `''` → V1／V3 全红；把建库那一支的
 *  `created` 写死 `true` → V2 红（第二趟还印「本次新建」）；把向导的飞书位换成三档 verdict 词
 *  （全通／不完全／没装）→ V4 红（那是 #788 的词，不许在本域复述）；把 `routes.ts` 里
 *  `初始化数据库` 指回 `record.today` → V7 红（本域的行必须进本域的键）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderFirstUsePage, renderInitReceiptPage } from '../dist/admin/adminDocs.js';
import { lookupHelp } from '../dist/admin/handlers.js';
import { HELP_ASSETS } from '../dist/help/index.js';
import { routeWakeword, WAKE_TABLE } from '../dist/policy/wakewords.js';

/** 只留**标记**：样式表与脚本里也有类名，整串查等于白查。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ');
/** 页上可见文本（与分隔符门同口径：剥壳 ＋ 去标签 ＋ 解实体）。 */
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** 整页判据（本域两张页共同的那几条）。 */
function assertWholePage(html) {
  assert.ok(html.startsWith('<!doctype html>'), '须是完整文档（doctype 起）');
  assert.ok(html.trimEnd().endsWith('</html>'), '须到 </html> 收尾');
  assert.ok(html.includes('<meta name="viewport"'), '须有 viewport');
  assert.ok(html.includes('ilife-page-ui'), '须挂页面级移动端配方根类');
  assert.ok(!/https?:\/\//.test(html), '不许有外部 URL');
  assert.ok(!html.includes('<link'), '不许有外部样式表');
  assert.ok(!html.includes('@import'), '不许有 @import');
}

/** 反面判据（#516 分隔符门那几种并列符号 ＋ 内部标识 ＋ #895 内部命令名）：两张页一颗都不许有。 */
function assertNoDebt(html) {
  const text = textOf(html);
  for (const ch of ['·', '；', '～', '~', '、', '｜']) {
    assert.ok(!text.includes(ch), '可见文本里出现并列分隔符 ' + ch);
  }
  for (const word of ['schedule.', 'time_start', 'time_end', 'duration_minutes', 'view=', 't790', '#790']) {
    assert.ok(!text.includes(word), '可见文本里出现内部标识 ' + word);
  }
  for (const word of ['lark-cli', 'auth', 'status', 'version', 'openId', 'scope']) {
    assert.ok(!text.toLowerCase().includes(word.toLowerCase()), '可见文本里出现内部命令名 ' + word);
  }
  assert.ok(!/\bt\d{3,}\b/.test(text), '可见文本里出现票号');
  assert.ok(!/#[0-9]{2,}\b/.test(text), '可见文本里出现编号');
}

const PATHS = {
  dbDir: join(tmpdir(), 'unit', 'data'),
  dbFile: join(tmpdir(), 'unit', 'data', 'schedule_data.db'),
  pagesRoot: join(tmpdir(), 'unit', 'data', 'schedule_html'),
  helpDir: join(tmpdir(), 'unit', 'data', 'schedule_html', 'help'),
};
const COUNTS = { records: 0, days: 0, plans: 0, summaries: 0, firstDate: null, lastDate: null };

const STEPS = [
  { name: '环境检测', status: 'todo', statusText: '待办', desc: '运行环境版本 22.14.0，数据目录可写，飞书三道门里过了 1 道' },
  { name: '路径确认', status: 'ok', statusText: '通过', desc: '库目录与产物落点已按配置文件确认，下面四行就是生效值' },
  { name: '建库', status: 'ok', statusText: '通过', desc: '三张表本次新建' },
  { name: '状态确认', status: 'ok', statusText: '通过', desc: '作息记录 0 条，覆盖 0 天' },
  { name: '初始化报告', status: 'todo', statusText: '待办', desc: '有 1 条待办（见下表）' },
  { name: '完成', status: 'ok', statusText: '通过', desc: '向导跑完，下一句说「作息管家 HELP」看全部功能' },
];

/** 临时家目录里跑处理函数（配置与库都落那儿，跑完连目录一起收走）。 */
function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), 't790-home-'));
  const keep = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  try {
    return fn(home);
  } finally {
    process.env.HOME = keep.HOME;
    process.env.USERPROFILE = keep.USERPROFILE;
    rmSync(home, { recursive: true, force: true });
  }
}

describe('#790 辅助与管理', () => {
  it('V1 · 初始化回执（新建档）：整页 ＋ 必现块 ＋ 反面', () => {
    const html = renderInitReceiptPage({ created: true, paths: PATHS, counts: COUNTS });
    assertWholePage(html);
    const text = textOf(html);
    for (const need of ['本次新建了三张表', '三张表', '复制库文件路径', '下一步', '复制初始化结果', '作息记录', '每日摘要', '日程计划']) {
      assert.ok(text.includes(need), '缺必现块：' + need);
    }
    assertNoDebt(html);
  });

  it('V2 · 初始化回执（已就绪档）：结论互斥，不印新建', () => {
    const html = renderInitReceiptPage({ created: false, paths: PATHS, counts: COUNTS });
    const text = textOf(html);
    assert.ok(text.includes('三张表都在'), '缺已就绪结论');
    assert.ok(!text.includes('本次新建'), '已就绪档不许印新建');
    assertNoDebt(html);
  });

  it('V3 · 首次使用向导：整页 ＋ 六步 ＋ 报告三件套 ＋ 反面', () => {
    const html = renderFirstUsePage({
      created: true, paths: PATHS, counts: COUNTS, steps: STEPS,
      todos: [{ title: '飞书联动待装', steps: ['装好飞书命令行', '说「飞书探测」看三档'] }],
      verify: ['作息管家 HELP 能打开一份帮助页', '初始化回执落在产物根目录', '第一条作息已记进库里'],
      prompt: '请帮我初始化作息管家，我是第一次使用',
      feishu: { note: '本机没找到飞书命令行。装好之后说「飞书探测」看三档。', unavailable: true },
    });
    assertWholePage(html);
    const text = textOf(html);
    for (const need of ['六步向导', '环境检测', '路径确认', '复制库目录路径', '复制库文件路径',
      '复制产物根目录路径', '复制帮助页路径', '建库', '状态确认', '初始化报告', '完成',
      '飞书强引导', '配合飞书效果最好', '飞书探测', '复制初始化 prompt', '完成验证清单', '飞书同步不可用']) {
      assert.ok(text.includes(need), '缺必现块：' + need);
    }
    assert.ok(markupOf(html).includes('name="sch-ad-verify"'), '验证清单须是可勾选的复选框');
    assertNoDebt(html);
  });

  it('V4 · 向导飞书位：全通就不挂不可用，且不用 #788 的 verdict 词', () => {
    const html = renderFirstUsePage({
      created: false, paths: PATHS, counts: COUNTS, steps: STEPS, todos: [],
      verify: ['作息管家 HELP 能打开一份帮助页'],
      prompt: '请帮我初始化作息管家，我是第一次使用',
      feishu: { note: '三道门都过了，同步随时可跑。想看档位就说「飞书探测」。', unavailable: false },
    });
    const text = textOf(html);
    assert.ok(!text.includes('飞书同步不可用'), '全通时不许挂不可用');
    for (const word of ['全通', '不完全', '没装']) {
      assert.ok(!text.includes(word), '三档 verdict 是 #788 的词，本域不许复述：' + word);
    }
    assertNoDebt(html);
  });

  it('V5 · 处理函数 init 两档：新建 → 已就绪，幂等可重跑', () => {
    withHome(() => {
      const first = lookupHelp({ view: 'init' });
      assert.equal(first.data.mode, 'init');
      assert.equal(first.data.created, true);
      assert.ok((first.notes ?? []).some((n) => n.startsWith('作息 DB 已初始化：')), '新建那一趟要有 stderr 便签');
      assertWholePage(first.html);
      const second = lookupHelp({ view: 'init' });
      assert.equal(second.data.created, false);
      assert.equal(second.notes, undefined);
      assert.ok(textOf(second.html).includes('三张表都在'));
    });
  });

  it('V6 · 处理函数 firstUse：六步 ＋ prompt 与 HELP 单源', () => {
    withHome(() => {
      const r = lookupHelp({ view: 'firstUse' });
      assert.equal(r.data.mode, 'firstUse');
      assert.equal(r.data.total, 6);
      assertWholePage(r.html);
      const scene = HELP_ASSETS.find((s) => s.id === 'first_use');
      assert.ok(scene && textOf(r.html).includes('六步向导'));
      // 复制文本落在按钮的 `data-t` 属性里（可见文本天然不含）：判标记面。
      assert.ok(markupOf(r.html).includes(String(scene.prompt_template)), '复制 prompt 须与 HELP 单源');
      assert.equal(r.data.pending, r.data.items.filter((it) => it.结论 !== '通过').length);
    });
    const scene = HELP_ASSETS.find((s) => s.id === 'first_use');
    assert.ok(scene, 'HELP 内容资产须有 first_use 场景');
  });

  it('V7 · 路由：本域两词进本域的键 ＋ preset', () => {
    const init = routeWakeword('请帮我初始化数据库');
    assert.equal(init.key, 'schedule.help.lookup');
    assert.equal(init.params.view, 'init');
    const first = routeWakeword('首次使用');
    assert.equal(first.key, 'schedule.help.lookup');
    assert.equal(first.params.view, 'firstUse');
    assert.equal(WAKE_TABLE.length, 51);
  });

  it('V8 · HELP 原两支回归：文件分支落盘意图还在，现找仍不落盘', () => {
    const file = withHome(() => lookupHelp({}));
    assert.equal(file.data.mode, 'file');
    assert.ok(file.landing && file.landing.stem === '作息管家_HELP');
    const q = lookupHelp({ q: '查作息' });
    assert.equal(q.delivery, false);
    assert.equal(q.html, '');
  });
});
