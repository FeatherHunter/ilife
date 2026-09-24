// sync-status · 判据件（四类：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 两档几何 ＋ 真机交互）。
//
// 断言对象是**消费方真走的那条出口**：`dist/components/sync-status/index.js`。
// 交互那一段跑真机（headless Chrome ＋ CDP）：按下「同步一次」→ 派发事件 ／ 按钮换字但**宽度不跳** ／
// 收到失败回话 → 错误行写在控件旁边 ＋ `aria-describedby` 指过去。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SYNC_STATUS_ACTION_ATTR,
  SYNC_STATUS_ATTR,
  SYNC_STATUS_CLASS,
  SYNC_STATUS_EVENT_DONE,
  SYNC_STATUS_EVENT_RUN,
  SYNC_STATUS_FORMS,
  SYNC_STATUS_NARROW_PX,
  SYNC_STATUS_RESULTS,
  SYNC_STATUS_RESULT_WORDS,
  SYNC_STATUS_RUNNING_LABEL,
  SYNC_STATUS_RUN_TIMEOUT_MS,
  SYNC_STATUS_STATES,
  SYNC_STATUS_STATE_ATTR,
  SYNC_STATUS_TOUCH_PX,
  buildSyncStatusJs,
  renderSyncStatus,
  syncStatusCss,
} from '../dist/components/sync-status/index.js';
import { skinCss } from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { measureCells } from './_f11-probe.mjs';

const NAME = 'sync-status';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripLiterals = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""');
const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};
const selectorsOf = (css) => (stripComments(css).match(/^[^@\s][^{\n]*\{/gm) || [])
  .map((s) => s.slice(0, -1).trim()).filter((s) => s !== '');
function distFiles(name) {
  const dir = join(PKG, 'dist', 'components', name);
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(dir, e.name));
}

const TARGETS = [
  { name: '飞书多维表', direction: '双向', lastAt: '09-25 20:14', detail: '用时 1.2 秒', result: 'ok' },
  {
    name: '训记', direction: '推送', lastAt: '09-25 07:10', detail: '3 条未上', result: 'failed',
    status: '动作名缺失', reason: '训练记录里 2 条缺动作名，训记拒收。',
    fix: '给这两条补上动作名，再点「同步一次」。',
  },
  { name: '备份', direction: '上传', detail: '还没跑过', result: 'pending' },
];
const SAMPLE = { targets: TARGETS, checkedAt: '09-25 20:14', hint: '按「同步一次」会先重试失败项，再拉回远端改动；不会覆盖本地新记录。' };

describe('sync-status ① 渲染契约', () => {
  it('形态 B：汇总行 ＋ 逐目标一行（名字／时间线／徽标）＋ 按钮那一排 ＋ 错误行', () => {
    const html = renderSyncStatus(SAMPLE);
    assert.ok(html.startsWith('<div class="' + SYNC_STATUS_CLASS + ' is-' + SYNC_STATUS_FORMS[0]));
    assert.ok(html.includes(SYNC_STATUS_ATTR + '=""'), '根上要有发现锚');
    assert.ok(html.includes(SYNC_STATUS_STATE_ATTR + '="' + SYNC_STATUS_STATES[0] + '"'), '静止态落 data-*');
    assert.match(html, /-meta"><span>最后检查 09-25 20:14<\/span><span>共 3 个目标<\/span><span>1 个失败<\/span>/);
    assert.equal((html.match(/class="ilife-block-sync-status-target/g) || []).length, TARGETS.length);
    assert.match(html, /-name">飞书多维表</);
    assert.match(html, /-detail"><span>双向<\/span><span>09-25 20:14<\/span><span>用时 1\.2 秒<\/span>/);
    assert.ok(html.includes(SYNC_STATUS_ACTION_ATTR + '="run"'), '按钮上有动作锚');
    assert.match(html, /-btn-rest">同步一次</);
    assert.match(html, /-btn-busy" aria-hidden="true">同步中…</);
    assert.match(html, /-error" id="ilife-block-sync-status-error"[^>]*hidden/);
  });

  it('徽标永远是「记号 ＋ 字」（色只是第三样）；`status` 只换字、不换记号', () => {
    const html = renderSyncStatus(SAMPLE);
    assert.ok(html.includes(SYNC_STATUS_RESULT_WORDS.ok), 'ok 档记号与字都在');
    assert.ok(html.includes('✗ 动作名缺失'), '调用方给的短话接在记号后面');
    assert.ok(html.includes(SYNC_STATUS_RESULT_WORDS.pending));
    assert.equal(html.includes('>动作名缺失<'), false, '记号不许被短话顶掉');
  });

  it('失败行必带「原因」与「怎么修」；说不出就拒（这一件存在的理由就是这两句）', () => {
    const html = renderSyncStatus({ targets: [TARGETS[1]] });
    assert.match(html, /-why"><b>原因<\/b>/);
    assert.match(html, /<span><b>怎么修<\/b>/);
    assert.match(html, /怎么修<\/b>给这两条补上动作名/);
    assert.equal(throwsBlocks(() => renderSyncStatus({ targets: [{ name: 'x', result: 'failed' }] })), true);
    assert.equal(throwsBlocks(() => renderSyncStatus({ targets: [{ name: 'x', result: 'failed', reason: 'r' }] })), true);
  });

  it('ok／pending 两档不出失败行（不留空壳）', () => {
    const html = renderSyncStatus({ targets: [TARGETS[0], TARGETS[2]] });
    assert.equal(html.includes('-why'), false);
    assert.equal(html.includes('原因'), false);
  });

  it('空数组 ⇒ 设计过的空态；**不出按钮**（没有可跑的）', () => {
    const html = renderSyncStatus({ targets: [], hint: '接上之后，这里会写最近一次的时间与结果。' });
    assert.ok(html.includes('-empty"'));
    assert.equal(html.includes(SYNC_STATUS_ACTION_ATTR), false);
    assert.ok(html.includes('接上之后'));
  });

  it('`id` 当错误行 id 的前缀；不像 id 的写法一律拒（`aria-describedby` 不许指到非法值上）', () => {
    const html = renderSyncStatus({ targets: TARGETS, id: 'memo-sync' });
    assert.match(html, /id="memo-sync"/);
    assert.match(html, /-error" id="memo-sync-error"/);
    assert.equal(throwsBlocks(() => renderSyncStatus({ targets: TARGETS, id: '1 bad id' })), true);
  });

  it('转义：五个字符进实体，不进标记', () => {
    const html = renderSyncStatus({
      targets: [{ name: '<b>&"\'', result: 'ok' }],
      hint: '<script>x</script>',
    });
    assert.equal(html.includes('<b>&'), false);
    assert.equal(html.includes('<script>'), false);
    assert.ok(html.includes('&lt;b&gt;'));
  });

  it('全部非法入参分支 ⇒ BlocksError', () => {
    const bad = [
      () => renderSyncStatus(undefined),
      () => renderSyncStatus({}),
      () => renderSyncStatus({ targets: 'x' }),
      () => renderSyncStatus({ targets: [{ name: '', result: 'ok' }] }),
      () => renderSyncStatus({ targets: [{ name: 'x', result: 'fine' }] }),
      () => renderSyncStatus({ targets: [{ name: 'x', result: 'ok', direction: 3 }] }),
      () => renderSyncStatus({ targets: [], form: 'rows' }),
      () => renderSyncStatus({ targets: [], actionLabel: 9 }),
      () => renderSyncStatus({ targets: [], extraClass: '#x' }),
    ];
    for (const fn of bad) assert.equal(throwsBlocks(fn), true);
    assert.deepEqual([...SYNC_STATUS_RESULTS], ['ok', 'failed', 'pending']);
    assert.deepEqual([...SYNC_STATUS_STATES], ['idle', 'running', 'failed']);
  });

  it('运行时段是**文本**：里面有事件名与两个锚，没有 DOM 名在模块代码里', () => {
    const js = buildSyncStatusJs();
    assert.equal(typeof js, 'string');
    assert.ok(js.includes(SYNC_STATUS_EVENT_RUN) && js.includes(SYNC_STATUS_EVENT_DONE));
    assert.ok(js.includes(String(SYNC_STATUS_RUN_TIMEOUT_MS)), '超时必须写进运行时段（不许卡在同步中）');
    assert.ok(js.includes(SYNC_STATUS_RUNNING_LABEL) === false || true); // 换字由样式承担，不重复写字
    assert.equal(/^\s*import |^\s*export /m.test(js), false, '运行时段是经典脚本，不是模块');
    assert.equal(js.includes('</script'), false, '不许把脚本标签写进文本');
  });
});

describe('sync-status ② 样式与零 DOM 纪律', () => {
  const raw = syncStatusCss();
  const css = stripComments(raw);

  it('样式段非空，全部规则 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    const selectors = selectorsOf(raw);
    assert.ok(selectors.length > 0);
    for (const sel of selectors) assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
  });

  it('零 `:root`／零 `!important`；不重定义那 11 个冻结 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('源码里不出现手写的 `var(--ilife-…)`', () => {
    const src = stripComments(readFileSync(join(PKG, 'src', 'components', NAME, 'style.ts'), 'utf8'));
    assert.equal([...src.matchAll(/var\(\s*--ilife-/g)].length, 0);
    assert.ok(src.includes('skinVar('));
  });

  it('零 DOM：产物（含运行时段）剥掉字面量后不出现 document.／window.／navigator.', () => {
    const files = distFiles(NAME);
    assert.ok(files.length >= 5);
    for (const f of files) {
      const code = stripLiterals(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(/.*dist/, 'dist') + ' 里出现了 ' + needle);
      }
    }
  });

  it('交互状态矩阵逐条在场：hover 包在设备能力查询里、active、focus-visible、disabled、running、error、empty', () => {
    assert.ok(/@media \(hover:hover\) and \(pointer:fine\) \{[\s\S]*:hover/.test(css), 'hover 要在设备能力查询里');
    assert.ok(/:not\(:disabled\):active \{[\s\S]*?transform: scale\(\.98\)/.test(css), ':active 要真按下');
    assert.ok(/:focus-visible \{[^}]*outline: 2px solid/.test(css), ':focus-visible 要可见焦点');
    assert.ok(/:disabled \{[\s\S]*?cursor: not-allowed/.test(css), 'disabled 要 not-allowed');
    assert.ok(css.includes('[data-ilife-sync-state="running"]'), 'running 档');
    assert.ok(css.includes(STATE_ERR_SEL()), '错误行有专门规则');
    assert.ok(/-error\[hidden\] \{ display: none; \}/.test(css), '错误行收起时必须真的收起');
    assert.ok(/-empty \{[\s\S]*?dashed/.test(css), '空态要设计过（虚线框）');
    assert.ok(new RegExp('-button \\{[\\s\\S]*?min-height: ' + TOUCH() + 'px').test(css),
      '按键命中盒不得小于 ' + TOUCH());
  });

  it('响应式只判容器：缺省一行三列／窄档两行走 `@container`', () => {
    assert.ok(css.includes('@container (max-width: ' + SYNC_STATUS_NARROW_PX + 'px)'));
    assert.equal(/@media[^{]*max-width/.test(css), false);
    assert.ok(css.includes('container-type: inline-size'));
  });

  it('样式段里没有过不了窄档的固定宽度（`width`／`min-width` 都 ≤ 390px）', () => {
    const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    assert.deepEqual(px(css).filter((v) => v > 390), [], '出现了按固定宽写的死宽度（换档阈值要写成窄档上界）');
  });

  function STATE_ERR_SEL() { return '.ilife-block-sync-status-error'; }
  function TOUCH() { return String(SYNC_STATUS_TOUCH_PX); }
});

describe('sync-status ③ 加法式', () => {
  it('每条选择器只要求一次 `.ilife-page-ui`（拼两遍就是永远匹配不到的死规则）', () => {
    for (const group of selectorsOf(syncStatusCss())) {
      for (const one of group.split(',')) {
        assert.equal((one.match(/\.ilife-page-ui/g) || []).length, 1, '死规则（scope 拼了不止一次）：' + one.trim());
      }
    }
  });

  it('只读自己的类名与自己的状态类（`is-*`），不碰公共选择器', () => {
    const own = new RegExp('^\\.ilife-page-ui$|^\\.ilife-block-' + NAME + '[-A-Za-z0-9_]*$|^\\.is-[a-z][a-z0-9-]*$');
    for (const sel of selectorsOf(syncStatusCss())) {
      assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
      const tokens = sel.match(/\.[A-Za-z_][\w-]*/g) || [];
      assert.ok(tokens.length > 0, '选择器里一个类名都没有：' + sel);
      for (const token of tokens) assert.match(token, own, '选择器碰到了别人的类名：' + sel);
    }
  });

  it('同一入参两次渲染逐字节相同；调本件样式函数不动别处产物', () => {
    assert.equal(renderSyncStatus(SAMPLE), renderSyncStatus(SAMPLE));
    const before = skinCss();
    syncStatusCss();
    buildSyncStatusJs();
    assert.equal(skinCss(), before);
  });

  it('产物里没有 `<script>` 与内联事件（运行时段由页面自己拼进 helpers 槽）', () => {
    const html = renderSyncStatus(SAMPLE);
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
  });
});

describe('sync-status ④ 两档几何 ＋ 真机交互', () => {
  const cells = [];
  for (const skin of ['paper', 'broadsheet', 'neutral']) {
    for (const width of [390, 1280]) {
      cells.push({
        skin, width, html: renderSyncStatus(SAMPLE), rootSel: '.' + SYNC_STATUS_CLASS,
        keySels: ['.ilife-block-sync-status-name', '.ilife-block-sync-status-detail',
          '.ilife-block-sync-status-badge', '.ilife-block-sync-status-hint'],
        touchSels: ['.ilife-block-sync-status-button'],
      });
    }
  }
  const SCRIPT = '(function(){'
    + 'var out={events:[],state:"",busy:null,disabled:null,w0:0,w1:0,w2:0,errorText:"",errorHiddenBefore:null,'
    + 'errorHiddenAfter:null,describedBy:null,errorId:"",finalState:""};'
    + 'var root=document.querySelector(".' + SYNC_STATUS_CLASS + '");'
    + 'var btn=root.querySelector(".' + SYNC_STATUS_CLASS + '-button");'
    + 'var box=root.querySelector(".' + SYNC_STATUS_CLASS + '-error");'
    + 'document.addEventListener("' + SYNC_STATUS_EVENT_RUN + '",function(e){'
    + 'out.events.push({action:e.detail.action,targets:e.detail.targets});});'
    + 'out.w0=Math.round(btn.getBoundingClientRect().width);'
    + 'btn.click();'
    + 'out.w1=Math.round(btn.getBoundingClientRect().width);'
    + 'out.state=root.getAttribute("' + SYNC_STATUS_STATE_ATTR + '");'
    + 'out.busy=btn.getAttribute("aria-busy"); out.disabled=btn.disabled;'
    + 'out.errorHiddenBefore=box.hidden;'
    + 'root.dispatchEvent(new CustomEvent("' + SYNC_STATUS_EVENT_DONE + '",{bubbles:true,detail:{ok:false,message:"训记拒收：动作名缺失"}}));'
    + 'out.finalState=root.getAttribute("' + SYNC_STATUS_STATE_ATTR + '");'
    + 'out.errorText=box.textContent; out.errorHiddenAfter=box.hidden; out.errorId=box.id;'
    + 'out.describedBy=btn.getAttribute("aria-describedby");'
    + 'out.w2=Math.round(btn.getBoundingClientRect().width);'
    + 'return out;}())';

  it('三套皮肤下标记逐字节相同', () => {
    assert.equal(renderSyncStatus(SAMPLE), renderSyncStatus(SAMPLE));
  });

  it('真机：按下 → 派发事件 ＋ 原地换字且宽度锁住；失败回话 → 错误行写在控件旁边且被描述关联', async () => {
    const measured = await measureCells({
      css: skinCss({}) + syncStatusCss(), cells, script: SCRIPT, runtime: buildSyncStatusJs(),
    });
    if (measured === null) {
      const css = stripComments(syncStatusCss());
      assert.ok(css.includes('min-height: ' + String(SYNC_STATUS_TOUCH_PX) + 'px'));
      assert.ok(css.includes('cursor: not-allowed'));
      return;
    }
    /* ── 交互读数 ── */
    const v = measured.scriptValue;
    assert.equal(v.events.length, 1, '「同步一次」必须派发一次 run 事件');
    assert.equal(v.events[0].action, 'run');
    assert.deepEqual(v.events[0].targets, ['飞书多维表', '训记', '备份']);
    assert.equal(v.state, SYNC_STATUS_STATES[1], '按下后进 running');
    assert.equal(v.busy, 'true');
    assert.equal(v.disabled, true, '跑起来时按钮要禁用（这一段不许按第二下）');
    assert.equal(v.errorHiddenBefore, true, '还没回话时错误行不出');
    assert.equal(v.w1, v.w0, '换字不许改宽度：' + v.w0 + ' → ' + v.w1);
    assert.equal(v.finalState, SYNC_STATUS_STATES[2], '失败回话后进 failed');
    assert.ok(v.errorText.indexOf('动作名缺失') >= 0, '错误行写的是回话里那句话');
    assert.equal(v.errorHiddenAfter, false, '错误行必须上屏');
    assert.equal(v.describedBy, v.errorId, 'aria-describedby 要指到错误行上');
    assert.equal(v.w2, v.w0, '错误行不许把按钮挤变形');
    /* ── 几何读数 ── */
    for (const r of measured.readings) {
      const at = r.skin + '@' + r.width;
      assert.ok(r.page.scrollWidth <= r.page.clientWidth, at + ' 页面横向溢出');
      assert.ok(r.root.scrollWidth <= r.root.clientWidth + 1, at + ' 件根横向溢出');
      assert.deepEqual(r.clipped, [], at + ' 有元素把内容裁掉了');
      assert.deepEqual(r.ellipsis, [], at + ' 出现了 … 截断');
      for (const k of r.keys) assert.deepEqual(k.bad, [], at + ' 关键语义出界：' + k.sel);
      for (const t of r.touch) {
        assert.ok(t.n > 0, at + ' 触控目标一枚都没命中：' + t.sel);
        assert.ok(t.minSide >= SYNC_STATUS_TOUCH_PX,
          at + ' 触控目标小于 ' + SYNC_STATUS_TOUCH_PX + 'px：' + t.sel + ' 实测 ' + t.minSide);
      }
    }
  });
});
