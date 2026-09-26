/** reminder-setter（提醒设置 · 形态 decisions「一行一个决定」）· 契约测试。
 *
 * 覆盖四类判据（工艺书 §6）＋ 皮肤与分隔符纪律：
 *  ① **渲染契约**：骨架（抬头 ＋ 三行决定 ＋ 唯一那行复述）／三行各自的标签与可点项（单选胶囊／多选方框）／
 *    两枚步进键夹一枚读数（时间与第一次从）／**一条通知都不勾**的合法态（照实读成「没有通知，不会响」）／
 *    **一屏只留一层话**（原型里的旁白句一句都不许进屏面）／转义面／**全部**非法入参分支
 *    （每个都断 `BlocksError`；含**全空白串**（空格类 ＋ **零宽字符类**）、**入参表以外的键**
 *    （含**继承来的**与**不可枚举的**）、稀疏数组、改不到的值）／纯函数／三个纯函数的口径／分隔符门；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下、
 *    零 `:root`／`!important`／零新 token／零视口宽度查询／容器查询自己声明了容器／
 *    零省略手段（`text-overflow`／`line-clamp`／`nowrap`：时间与日期永不截断）／
 *    几何事实取常量（44／8／14／16／158／560／5 分钟）／三处形（卡加 shadow、隔线走发丝线、勾选槽位固定）／
 *    零手写色值、源码级零手写 `var(--ilife-…)`、不拿 `ink` 系当面／零键盘语汇／
 *    `dist/components/reminder-setter/**` 剥字面量后零 DOM／运行时段是产出的文本（IIFE、幂等、无 `innerHTML`）；
 *  ③ **加法式**：不启用它的页面零命中、逐字节不变；渲染本件不改别件产物；前缀透传；
 *    同一份入参渲染四次逐字节相同，且标记不带皮肤类；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP，容器宽 320／390／620／1280）**：
 *    零横向溢出、时间与日期零截断、每枚可点件 ≥44 见方、同一排里相邻两枚的缝 ≥8px、
 *    窄档左标签右控件折成上下两段、宽档并排、复述恰好一行；
 *    **起不来就退确定性几何判据并打印原因**；
 *  ⑤ **行为（真机 · 真指针）**：全走 CDP 的 `Input.dispatchMouseEvent`（`p.mouse()`）——
 *    换重复档／换提前档／勾与取消勾（含**勾到一条不剩**再勾回来）／时间步进（含**跨零点绕回**）／
 *    日期步进，每次都断「选中态 ＋ 复述 ＋ 事件」三样；四套皮肤下标记逐字节相同。
 *    **`element.click()` 替不了这一条**：它不经指针、也不看元素到不到得了（本批已有件栽在这上面）。
 *
 * 期望值一律从组件自己的常量派生（`REMINDER_SETTER_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  REMINDER_SETTER_AT_ATTR,
  REMINDER_SETTER_ATTR,
  REMINDER_SETTER_BOUND_ATTR,
  REMINDER_SETTER_BOX_PX,
  REMINDER_SETTER_CHOSEN_ATTR,
  REMINDER_SETTER_CLASS,
  REMINDER_SETTER_CONTAINER,
  REMINDER_SETTER_DATE_STEP_DAYS,
  REMINDER_SETTER_DAY_MIN,
  REMINDER_SETTER_DELTA_ATTR,
  REMINDER_SETTER_EVENT_CHANGE,
  REMINDER_SETTER_FORM_ATTR,
  REMINDER_SETTER_FORMS,
  REMINDER_SETTER_GAP_PX,
  REMINDER_SETTER_HOURS,
  REMINDER_SETTER_HOVER_QUERY,
  REMINDER_SETTER_LABEL_PX,
  REMINDER_SETTER_LEAD_ATTR,
  REMINDER_SETTER_MAX_CHOICES,
  REMINDER_SETTER_MAX_ITEMS,
  REMINDER_SETTER_MAX_ROUTES,
  REMINDER_SETTER_MIN_CHOICES,
  REMINDER_SETTER_MIN_ITEMS,
  REMINDER_SETTER_NARROW_PX,
  REMINDER_SETTER_PART_ATTR,
  REMINDER_SETTER_PARTS,
  REMINDER_SETTER_PICKED_ATTR,
  REMINDER_SETTER_READ_ATTR,
  REMINDER_SETTER_REPEAT_ATTR,
  REMINDER_SETTER_ROW_ATTR,
  REMINDER_SETTER_RUNTIME_ATTR,
  REMINDER_SETTER_SLOTS,
  REMINDER_SETTER_START_ATTR,
  REMINDER_SETTER_STEP_ATTR,
  REMINDER_SETTER_STEPS,
  REMINDER_SETTER_TEXT,
  REMINDER_SETTER_TICK,
  REMINDER_SETTER_TICK_PX,
  REMINDER_SETTER_TIME_ATTR,
  REMINDER_SETTER_TIME_STEP_MIN,
  REMINDER_SETTER_TOUCH_PX,
  REMINDER_SETTER_VALUE_ATTR,
  buildReminderSetterJs,
  reminderSetterClock,
  reminderSetterCss,
  reminderSetterHead,
  reminderSetterPlace,
  reminderSetterRecap,
  reminderSetterSlot,
  reminderSetterStepAt,
  reminderSetterStepDate,
  reminderSetterStepTime,
  reminderSetterTrackTail,
  renderReminderSetter,
} from '../dist/components/reminder-setter/index.js';
import { renderPageHead } from '../dist/components/page-head/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { auditHtml, exitCodeFor } from './separator-probe.mjs';
import { styleSource, styleSources } from './_style-sources.mjs';
import { startBrowser, stripComments, throwsBlocks } from './overlay-probe.mjs';
import { startShapesPage } from './shapes-probe.mjs';
import * as root from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'reminder-setter');
const SLOT = (s) => reminderSetterSlot(s);
const q = (s) => JSON.stringify(s);
const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;
/** 本件的样式源码：经 `_style-sources.mjs` 取该件全部 `style*.ts`（拆出去的那半也在扫面里）。 */
const STYLE_SRC = styleSource('reminder-setter');
/** 槽位类名（在**标记串**上找它用它：产物里写的是 `class="…-slot"`，**没有那个点**）。 */
const CLS = (slot) => SLOT(slot);
/** 槽位选择器（在**页内查元素**用它；判据侧拼选择器一律经这两个助手，不另抄字面量）。 */
const SEL = (slot) => '.' + SLOT(slot);
/** 属性选择器（按 `data-*` 找元素）。 */
const ATTR = (name) => '[' + name + ']';
/** 一屏的**可见文本**（分隔符门与「旁白句不许上屏」这两条都拿它判）。 */
const visibleText = (html) => html.replace(/<[^>]*>/g, '\u0001').split('\u0001').join(' ');
/** 把一串 CSS 里的每条规则选择器抽出来（配平花括号；`@` 开头的 at-rule 前奏不算）。 */
function ruleSelectors(css) {
  const out = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') {
      const sel = buf.trim();
      buf = '';
      if (sel !== '' && !sel.startsWith('@')) out.push(sel);
    } else if (ch === '}') { buf = ''; } else { buf += ch; }
  }
  return out;
}
/** 一个字面量串进正则前的转义。 */
const re = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ── 三排档名与两份真实形状的入参（记体重的提醒；一份 plain、一份一条通知都没勾） ── */

const REPEATS = [
  { key: 'once', label: '就这一次' },
  { key: 'daily', label: '每天' },
  { key: 'weekly', label: '每周日' },
  { key: 'monthly', label: '每月 25 号' },
];
const LEADS = [
  { key: 'ontime', label: '准时' },
  { key: 'm10', label: '提前 10 分钟' },
];
const ROUTES = [
  { key: 'push', label: '系统通知' },
  { key: 'feishu', label: '飞书发一条消息' },
  { key: 'app', label: '只在应用里标红' },
];
const PLAIN = {
  id: 'rem-weight', title: '记体重',
  repeats: REPEATS, repeat: 'daily', time: '22:30', startDate: '2026-09-26',
  leads: LEADS, lead: 'ontime', routes: ROUTES, chosen: ['push'],
};
/** 一条通知都没勾：合法态（复述照实读成「没有通知，不会响」）。 */
const SILENT = { ...PLAIN, id: 'rem-weight-silent', chosen: [] };
/** 半夜那条：给「跨零点绕回」那一条判据用（不用手改 DOM 造状态）。 */
const MIDNIGHT = { ...PLAIN, id: 'rem-weight-midnight', time: '00:00' };
/** 一份最小的合法入参（非法入参分支都从它改一处）。 */
const OK = {
  id: 'ok-rem',
  title: '吃药',
  repeats: [{ key: 'a', label: '就这一次' }, { key: 'b', label: '每天' }],
  repeat: 'a',
  time: '08:00',
  startDate: '2026-01-01',
  leads: [{ key: 'a', label: '准时' }, { key: 'b', label: '提前 10 分钟' }],
  lead: 'a',
  routes: [{ key: 'a', label: '系统通知' }],
  chosen: ['a'],
};

/* ── 形态 `track` 的两份真实形状（一天里好几条提醒；一份含「一条通知都不勾」的那条） ── */

/** 07:00 吃药 ／ 13:00 记一餐 ／ 20:00 记体重（选中它）。三条摆开：窄容器下命中盒也不相撞。 */
const TRACK = {
  form: 'track',
  id: 'rem-day',
  items: [
    { id: 'med', label: '吃药', at: 7 * 60, repeat: 'daily', lead: 'ontime', chosen: ['push'] },
    { id: 'meal', label: '记一餐', at: 13 * 60, repeat: 'weekly', lead: 'm10', chosen: ['push'] },
    { id: 'weight', label: '记体重', at: 20 * 60, repeat: 'daily', lead: 'ontime', chosen: ['push', 'feishu'] },
  ],
  picked: 'weight',
  repeats: REPEATS, leads: LEADS, routes: ROUTES,
};
/** 同一天，但入参**倒着给**：屏上顺序＝刻度上的先后（件自己排，调用方不用先排）。 */
const TRACK_SHUFFLED = { ...TRACK, id: 'rem-day-shuffled', items: [...TRACK.items].reverse() };
/** 选中那条**一条通知都没勾**：图例那一行的尾一截照实读成那句状态。 */
const TRACK_SILENT = {
  ...TRACK, id: 'rem-day-silent',
  items: TRACK.items.map((o) => (o.id === 'weight' ? { ...o, chosen: [] } : o)),
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('reminder-setter ① 渲染契约 · 骨架与三行', () => {
  const html = renderReminderSetter(PLAIN);

  it('根 ＋ 抬头 ＋ 三行 ＋ 唯一那行复述；形态键是英文骨架名（不是格号 A）', () => {
    assert.deepEqual([...REMINDER_SETTER_FORMS], ['decisions', 'track'],
      '形态闭集两档都是英文骨架名（老档那个键一个字都不许改）');
    assert.equal(REMINDER_SETTER_FORMS[0], 'decisions', '老档的键必须还是第一个（缺省形态）');
    assert.match(html, new RegExp('^<div class="' + REMINDER_SETTER_CLASS + ' ' + SLOT('host') + ' is-decisions"'));
    assert.ok(html.includes(REMINDER_SETTER_ATTR + '="rem-weight"'), '根上要有本件的发现锚');
    assert.ok(html.includes(REMINDER_SETTER_FORM_ATTR + '="decisions"'), '形态照实写进标记');
    assert.ok(html.includes('>' + reminderSetterHead('记体重') + '<'), '抬头写的是「它是哪条提醒」');
    assert.ok(html.includes(REMINDER_SETTER_TIME_ATTR + '="22:30"'), '时间读数住在根上（机器读数）');
    assert.ok(html.includes(REMINDER_SETTER_START_ATTR + '="2026-09-26"'), '起始日读数住在根上');
    assert.ok(html.includes(CLS('read')) && html.includes('role="status"'), '唯一那行复述在，且是活的');
    assert.ok(html.includes(REMINDER_SETTER_READ_ATTR + '="recap"'), '复述带本件的读数锚');
    assert.ok(html.includes(reminderSetterRecap('每天', '2026-09-26', '22:30', 1, REMINDER_SETTER_TEXT)),
      '复述是真读数（渲染期与运行时段同一份源码）');
    assert.equal(/<script|onclick=/i.test(html), false, '标记里不带脚本');
  });

  it('三行：每行一个决定（标签 ＋ 可点项）；顺序＝什么时候响 → 提前多久 → 走哪条通知', () => {
    const rows = [...html.matchAll(new RegExp(REMINDER_SETTER_ROW_ATTR + '="([^"]+)"', 'g'))].map((m) => m[1]);
    assert.deepEqual(rows, [...REMINDER_SETTER_PARTS], '三行的机器键与行序都从闭集来');
    for (const label of [REMINDER_SETTER_TEXT.repeatLabel, REMINDER_SETTER_TEXT.leadLabel, REMINDER_SETTER_TEXT.routeLabel]) {
      assert.ok(html.includes('>' + label + '<'), '这一行问什么要上屏：' + label);
    }
    for (const option of REPEATS.concat(LEADS, ROUTES)) {
      assert.ok(html.includes('>' + option.label + '<'), '每一档都要上屏：' + option.label);
    }
    assert.equal(countOf(html, 'role="group"'), REMINDER_SETTER_PARTS.length + REMINDER_SETTER_STEPS.length,
      '三行各有自己的一组 ＋ 两个步进位各有一组（屏读器念得出这是哪一组）');
  });

  it('单选走胶囊、多选走方框：形状本身就是「这条可以多选」', () => {
    assert.equal(countOf(html, '<button type="button" class="' + SLOT('chip')), REPEATS.length + LEADS.length,
      '什么时候响与提前多久那两排用胶囊（单选）');
    assert.equal(countOf(html, '<button type="button" class="' + SLOT('check')), ROUTES.length,
      '走哪条通知那一排用方框（多选）');
    assert.ok(html.includes(CLS('tray')) && html.includes(CLS('rack')), '两排各有自己的容器槽位');
    assert.equal(countOf(html, 'aria-pressed="true"'), 3, '选中的那一枚重复档 ＋ 一枚提前档 ＋ 勾上的那一枚通知');
    assert.equal(countOf(html, 'aria-pressed="false"'),
      REPEATS.length + LEADS.length + ROUTES.length - 3, '其余各枚都是未选中');
    assert.equal(countOf(html, '<button'), REPEATS.length + LEADS.length + ROUTES.length + REMINDER_SETTER_STEPS.length * 2,
      '按钮总数＝三排可点项 ＋ 两档各两枚步进键，不许再多');
    assert.equal(countOf(html, '<button'), countOf(html, '</button>'), '按钮必须成对');
  });

  it('日期与时间「点得到」：两枚 44 的步进键夹一枚读数（不用打字、不用拖点）', () => {
    for (const step of REMINDER_SETTER_STEPS) {
      assert.ok(html.includes(REMINDER_SETTER_STEP_ATTR + '="' + step + '"'), '这一档要有自己的步进键：' + step);
      assert.ok(html.includes(REMINDER_SETTER_READ_ATTR + '="' + step + '"'), '这一档要有自己的读数格：' + step);
    }
    assert.equal(countOf(html, REMINDER_SETTER_DELTA_ATTR + '="-1"'), REMINDER_SETTER_STEPS.length, '每档一枚减键');
    assert.equal(countOf(html, REMINDER_SETTER_DELTA_ATTR + '="1"'), REMINDER_SETTER_STEPS.length, '每档一枚加键');
    assert.ok(html.includes(REMINDER_SETTER_TEXT.early) && html.includes(REMINDER_SETTER_TEXT.late),
      '减／加键的无障碍名写清是往哪边走（步长从常量算）');
    assert.ok(html.includes(REMINDER_SETTER_TEXT.prevDay) && html.includes(REMINDER_SETTER_TEXT.nextDay),
      '日期那两枚同理');
    assert.equal(html.includes('<input'), false, '本件没有输入框：打字不是通路（键盘不许当通路）');
    assert.equal(html.includes('draggable'), false, '也没有拖拽');
  });

  it('一条通知都不勾＝合法态：复述照实读成「没有通知，不会响」（控件一个都不变灰）', () => {
    const off = renderReminderSetter(SILENT);
    assert.ok(off.includes('>' + REMINDER_SETTER_TEXT.silent + '<'), '复述读的是那句状态');
    assert.equal(countOf(off, 'aria-pressed="true"'), 2, '只剩重复档与提前档那两枚是选中的');
    assert.equal(off.includes(' disabled'), false, '不许把控件变灰：一枚按不动的控件比没有更坏');
    const at = off.indexOf(CLS('read'));
    assert.ok(at > 0, '复述那一行不在标记里');
    const read = off.slice(off.lastIndexOf('<', at));
    assert.ok(read.startsWith('<p') && read.includes('</p>'), '复述就是一行（`<p>`）：不是一段说明');
    assert.equal(countOf(off, CLS('read')), 1, '复述**只有一处**');
  });

  it('**一屏只留一层话**：原型里的旁白与口径句一句都不许进屏面；同一个数只印一次', () => {
    const seen = visibleText(renderReminderSetter(PLAIN)) + visibleText(renderReminderSetter(SILENT));
    for (const narration of ['挑一次或重复', '别混着猜', '给容易忘的事留一道', '可多选', '至少留一条',
      '全关掉这条提醒就不存在', '免打扰', '会顺延', '设完是这样', '个决定']) {
      assert.equal(seen.includes(narration), false, '屏上出现了原型的旁白／口径句：' + narration);
    }
    assert.equal(countOf(html, '22:30'), 3,
      '时间只许在三处：根上的机器读数 ＋ 读数格 ＋ 复述（前两处是同一件事的机器读数与它的摆法）');
    assert.equal(countOf(html, '2026-09-26'), 3, '起始日同理');
    assert.equal(REMINDER_SETTER_SLOTS.includes('hint'), false, '本件没有「脚注那一行」这种槽位（旁白没有容身之处）');
  });

  it('转义面：id／提醒名／三排档名逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const one = renderReminderSetter({
      ...OK, id: 'evil-one', title: evil,
      repeats: [{ key: 'a', label: evil }, { key: 'b', label: 'B' }],
      routes: [{ key: 'a', label: evil }],
    });
    assert.equal(/<script/i.test(one), false, '不得出现可执行脚本标签');
    assert.ok(one.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(one.includes('&quot;'), '引号转义');
  });

  it('分隔符门：样例渲染的可见文本零命中（R1 ·／R2 ；／R3 并列顿号）', () => {
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    const blocks = [...readme.matchAll(/```json 示例入参\n([\s\S]*?)```/g)].map((m) => m[1]);
    assert.equal(blocks.length, 1, 'README 里恰好一块显式示例入参（信息串带「示例入参」四字）');
    for (const sample of [PLAIN, SILENT, JSON.parse(blocks[0])]) {
      const r = auditHtml('<html><body>' + renderReminderSetter(sample) + '</body></html>');
      assert.equal(exitCodeFor(r), 0, '分隔符命中：' + JSON.stringify(r.node.hits.slice(0, 2)));
    }
  });

  it('入参违规一律拒（不静默降级）：逐条断 `BlocksError`', () => {
    const B = (input) => throwsBlocks(() => renderReminderSetter(input));
    assert.equal(B(undefined), true, '非对象');
    assert.equal(B(null), true);
    assert.equal(B([]), true, '数组不是入参');
    assert.equal(B({ ...OK, id: undefined }), true, '缺 id');
    assert.equal(B({ ...OK, id: '' }), true, '空 id');
    assert.equal(B({ ...OK, id: 'a b' }), true, 'id 里有空格');
    assert.equal(B({ ...OK, id: '提醒一' }), true, 'id 里有非标识符字符');
    assert.equal(B({ ...OK, title: '' }), true, '空提醒名');
    assert.equal(B({ ...OK, title: 1 }), true, '提醒名不是字符串');
    assert.equal(B({ ...OK, repeats: undefined }), true, '缺 repeats');
    assert.equal(B({ ...OK, repeats: 'x' }), true, 'repeats 不是数组');
    assert.equal(B({ ...OK, repeats: [] }), true, '0 档');
    assert.equal(B({ ...OK, repeats: [OK.repeats[0]] }), true, '不到 ' + String(REMINDER_SETTER_MIN_CHOICES) + ' 档');
    assert.equal(B({
      ...OK,
      repeats: Array.from({ length: REMINDER_SETTER_MAX_CHOICES + 1 }, (_, i) => ({ key: 'k' + i, label: '档' + i })),
    }), true, '超过 ' + String(REMINDER_SETTER_MAX_CHOICES) + ' 档');
    assert.equal(B({ ...OK, repeats: [null, OK.repeats[1]] }), true, '档不是对象');
    assert.equal(B({ ...OK, repeats: [{ label: '甲' }, OK.repeats[1]] }), true, '缺档的 key');
    assert.equal(B({ ...OK, repeats: [{ key: 'a', label: '甲' }, { key: 'a', label: '乙' }] }), true, '同一排里键重了');
    assert.equal(B({ ...OK, repeats: [{ key: 'a', label: 1 }, OK.repeats[1]] }), true, '档名不是字符串');
    assert.equal(B({ ...OK, repeat: 'nope' }), true, '选中的档不在那一排里');
    assert.equal(B({ ...OK, repeat: undefined }), true, '缺选中档');
    assert.equal(B({ ...OK, leads: [] }), true, '提前档 0 档');
    assert.equal(B({ ...OK, lead: 1 }), true, '选中的提前档不是字符串');
    assert.equal(B({ ...OK, routes: [] }), true, '通知档 0 档（至少给一条可选）');
    assert.equal(B({
      ...OK,
      routes: Array.from({ length: REMINDER_SETTER_MAX_ROUTES + 1 }, (_, i) => ({ key: 'k' + i, label: '通' + i })),
    }), true, '通知档超过 ' + String(REMINDER_SETTER_MAX_ROUTES) + ' 档');
    assert.equal(B({ ...OK, routes: 'x' }), true, 'routes 不是数组');
    assert.equal(B({ ...OK, chosen: undefined }), true, '缺 chosen');
    assert.equal(B({ ...OK, chosen: 'a' }), true, 'chosen 不是数组');
    assert.equal(B({ ...OK, chosen: ['nope'] }), true, '勾上的键不在 routes 里');
    assert.equal(B({ ...OK, chosen: ['a', 'a'] }), true, '同一条通知勾两次');
    assert.equal(B({ ...OK, chosen: [1] }), true, '勾上的键不是字符串');
    assert.equal(B({ ...OK, chosen: [] }), false, '一条都不勾＝合法');
    assert.equal(B({ ...OK, time: '24:00' }), true, '时间越界');
    assert.equal(B({ ...OK, time: '8:00' }), true, '时间要两位小时');
    assert.equal(B({ ...OK, time: '08:60' }), true, '分钟越界');
    assert.equal(B({ ...OK, time: '08:03' }), true, '分钟不在步进键的格子上（给了也点不到）');
    assert.equal(B({ ...OK, time: '八点' }), true, '时间不是合法读数');
    assert.equal(B({ ...OK, startDate: '2026-02-30' }), true, '不是真实存在的一天');
    assert.equal(B({ ...OK, startDate: '2026-13-01' }), true, '月份越界');
    assert.equal(B({ ...OK, startDate: '2026/01/01' }), true, '分隔符不对');
    assert.equal(B({ ...OK, startDate: 20260101 }), true, '起始日不是字符串');
    /* `NaN`／`Infinity` 那一路：它们 `typeof` 是 number，靠「先断是字符串」的守卫拦下。 */
    assert.equal(B({ ...OK, time: NaN }), true, '时间是 NaN');
    assert.equal(B({ ...OK, time: Infinity }), true, '时间是 Infinity');
    assert.equal(B({ ...OK, startDate: NaN }), true, '起始日是 NaN');
    assert.equal(B({ ...OK, id: NaN }), true, 'id 是 NaN');
    assert.equal(B({ ...OK, repeat: NaN }), true, '选中的重复档是 NaN');
    assert.equal(B({ ...OK, chosen: [NaN] }), true, '勾上的键是 NaN');
    assert.equal(B({ ...OK, repeats: [NaN, OK.repeats[1]] }), true, '重复档整个是 NaN');
    assert.equal(B({ ...OK, routes: [{ key: NaN, label: '通' }] }), true, '通知档的机器键是 NaN');
    assert.equal(B({ ...OK, form: 'A' }), true, '形态闭集外（格号不是键）');
    assert.equal(B({ ...OK, form: 'byDay' }), true, '形态闭集外（闭集里只有 decisions／track 两个键）');
    assert.equal(B({ ...OK, extraClass: 'a"b' }), true, '附加类名过不了类名正则');
    assert.equal(B({ ...OK, extraClass: 'ok-class other' }), false, '合法附加类名照收');
    assert.equal(B({ ...OK, form: undefined, extraClass: undefined }), false, '入参表里的键给 undefined 按未给算');
    const sparse = [{ key: 'a', label: '甲' }, { key: 'b', label: '乙' }];
    sparse.length = 3;
    assert.equal(B({ ...OK, repeats: sparse }), true, '稀疏数组（空洞）');
    const sparseChosen = ['a'];
    sparseChosen.length = 2;
    assert.equal(B({ ...OK, chosen: sparseChosen }), true, '勾选数组有空洞');
  });

  it('**全空白串＝拒**（上屏文本三处：空格类 ＋ **零宽字符类**）：收下会在屏上留一块空白', () => {
    const blanks = [
      ['提醒名（收下 ⇒ 无字抬头）', (b) => ({ title: b })],
      ['重复档名（收下 ⇒ 无字胶囊）', (b) => ({ repeats: [{ key: 'a', label: b }, { key: 'b', label: '乙' }] })],
      ['通知档名（收下 ⇒ 无字方框）', (b) => ({ routes: [{ key: 'a', label: b }] })],
    ];
    /** 空格类：`String.prototype.trim()` 剥得掉的（Unicode WhiteSpace）。 */
    const SPACES = ['   ', '\t', '　', ' 　 '];
    /** **零宽／不可见类**：`trim()` 剥不掉它们（格式类 Cf）——不先剥掉，「全空白」这条守卫就漏了这半边。 */
    const INVISIBLE = ['\u200b', '\u200b\u200b', '\ufeff', '\u00ad', '\u200e\u200f', '\u2060', '\u200b\u200d'];
    for (const [what, patch] of blanks) {
      for (const blank of SPACES.concat(INVISIBLE)) {
        assert.equal(throwsBlocks(() => renderReminderSetter({ ...OK, ...patch(blank) })), true,
          what + ' 收到全空白串（' + JSON.stringify(blank) + '）必须拒');
      }
    }
  });

  it('**入参表以外的键＝拒**（顶层与每一档里 ＋ **继承来的与不可枚举的**键）', () => {
    const B = (input) => throwsBlocks(() => renderReminderSetter(input));
    assert.equal(B({ ...OK, bogus: 1 }), true, '顶层多给一个键');
    assert.equal(B({ ...OK, repeatLabel: '打错名' }), true, '顶层写错键名');
    assert.equal(B({ ...OK, repeats: [{ ...OK.repeats[0], bogus: 1 }, OK.repeats[1]] }), true, '档里多给一个键');
    assert.equal(B({ ...OK, routes: [{ ...OK.routes[0], on: true }] }), true, '「勾上了没」是算出来的，入参不许给');
    assert.equal(B(Object.create({ ...OK, bogus: 1 })), true, '顶层：原型链上继承来的未知键');
    assert.equal(B({ ...OK, leads: [Object.create({ ...OK.leads[0], bogus: 1 }), OK.leads[1]] }), true,
      '档里：原型链上继承来的未知键');
    const hidden = { ...OK };
    Object.defineProperty(hidden, 'bogus', { value: 1, enumerable: false });
    assert.equal(B(hidden), true, '顶层：不可枚举的自有键（`Object.keys` 看不见它）');
  });

  it('纯函数：同样的入参恒产同样的字节；README 示例入参直渲成功', () => {
    assert.equal(renderReminderSetter(PLAIN), renderReminderSetter(PLAIN));
    assert.equal(renderReminderSetter(SILENT), renderReminderSetter(SILENT));
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    const blocks = [...readme.matchAll(/```json 示例入参\n([\s\S]*?)```/g)].map((m) => m[1]);
    assert.equal(blocks.length, 1, 'README 里恰好一块显式示例入参');
    const sample = JSON.parse(blocks[0]);
    assert.equal(typeof sample === 'object' && sample !== null && !Array.isArray(sample), true, '示例是合法 JSON 对象');
    const one = renderReminderSetter(sample);
    assert.ok(one.includes(REMINDER_SETTER_ATTR + '="rem-weight"'), '示例的 id 上屏');
    assert.ok(one.includes(reminderSetterHead('记体重')), '示例的提醒名上屏');
    assert.ok(one.includes(reminderSetterRecap('每天', '2026-09-26', '22:30', 1, REMINDER_SETTER_TEXT)),
      '示例渲染出那行复述');
  });

  it('三个纯函数的口径：跨零点绕回、按 UTC 走天、一条通知都没勾时换那一句', () => {
    assert.equal(reminderSetterStepTime('22:30', 1, REMINDER_SETTER_TIME_STEP_MIN), '22:35');
    assert.equal(reminderSetterStepTime('22:30', -1, REMINDER_SETTER_TIME_STEP_MIN), '22:25');
    assert.equal(reminderSetterStepTime('23:55', 1, REMINDER_SETTER_TIME_STEP_MIN), '00:00', '跨零点绕回');
    assert.equal(reminderSetterStepTime('00:00', -1, REMINDER_SETTER_TIME_STEP_MIN), '23:55');
    assert.equal(reminderSetterStepDate('2026-09-26', 1, REMINDER_SETTER_DATE_STEP_DAYS), '2026-09-27');
    assert.equal(reminderSetterStepDate('2026-10-01', -1, REMINDER_SETTER_DATE_STEP_DAYS), '2026-09-30', '跨月');
    assert.equal(reminderSetterStepDate('2026-12-31', 1, REMINDER_SETTER_DATE_STEP_DAYS), '2027-01-01', '跨年');
    assert.equal(reminderSetterRecap('每天', '2026-09-26', '22:30', 1, REMINDER_SETTER_TEXT), '每天 2026-09-26 22:30');
    assert.equal(reminderSetterRecap('每天', '2026-09-26', '22:30', 0, REMINDER_SETTER_TEXT),
      REMINDER_SETTER_TEXT.silent, '一条通知都没勾那一支只有这一处口径');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('reminder-setter ② 样式与零 DOM 纪律', () => {
  const css = reminderSetterCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且只出现一次', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 25, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        /* **带点的类名**：`reminderSetterSlot()` 只产类名本身，少写一个点就变成**标签选择器**
         *  （`.ilife-page-ui ilife-block-reminder-setter-chip` 一条规则都不命中，屏上全裸）——
         *  只查 `includes(REMINDER_SETTER_CLASS)` 会放过它（子串照样在），必须连着点一起查。
         *  变异自证：把 `s()` 里的 `'.'` 去掉 ⇒ 本条红在 `只碰本件类名根（类名要带点）`。 */
        assert.ok(one.includes('.' + REMINDER_SETTER_CLASS), '选择器必须只碰本件类名根（类名要带点）：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零视口宽度查询／容器查询自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(/'@media \((?:max|min)-width/.test(css), false, '本件不判视口宽度（件宽 ≠ 视口宽）');
    assert.ok(clean.includes('@container ' + REMINDER_SETTER_CONTAINER + ' (max-width:'), '窄档必须由容器判');
    /* 容器声明必须挂在本件的**宿主**槽上（`-host`）：挂到别的槽上 ⇒ 那个槽若不落进标记，
       这一条就成了死声明。变异自证：把 host 规则挪到 `-head` 名下 ⇒
       本条红在 `container-type 必须挂在宿主槽上`。 */
    assert.ok(new RegExp(re(SLOT('host')) + '\\s*\\{[^}]*container-type: inline-size').test(clean),
      'container-type 必须挂在宿主槽上（写了 @container 就必须自己声明容器，否则永不生效）');
    assert.ok(clean.includes('container-name: ' + REMINDER_SETTER_CONTAINER));
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    assert.ok(clean.includes('@media ' + REMINDER_SETTER_HOVER_QUERY), '悬停增强读的是常量里的能力查询串');
    assert.ok(clean.includes('@media (prefers-reduced-motion: reduce)'), '减动效那一档要在');
  });

  it('几何事实写在一处：44／8／14／16／158／560／5 分钟都取常量；时间与日期零省略手段', () => {
    assert.equal(REMINDER_SETTER_TOUCH_PX, 44);
    assert.equal(REMINDER_SETTER_GAP_PX, 8);
    assert.equal(REMINDER_SETTER_TIME_STEP_MIN, 5);
    assert.equal(REMINDER_SETTER_TICK_PX, 14, '勾选槽位那一档是 14px（原型近两轮的优化点）');
    assert.ok(clean.includes('min-height: ' + String(REMINDER_SETTER_TOUCH_PX) + 'px'), '三排可点项取常量');
    assert.ok(clean.includes('width: ' + String(REMINDER_SETTER_TOUCH_PX) + 'px'), '两枚步进键取常量');
    assert.ok(clean.includes('gap: ' + String(REMINDER_SETTER_GAP_PX) + 'px'), '相邻那道缝取常量');
    assert.ok(clean.includes('width: ' + String(REMINDER_SETTER_TICK_PX) + 'px'), '勾选槽位取常量');
    assert.ok(clean.includes('width: ' + String(REMINDER_SETTER_BOX_PX) + 'px'), '多选那枚方框取常量');
    assert.ok(clean.includes('minmax(0, ' + String(REMINDER_SETTER_LABEL_PX) + 'px)'), '行首标签列取常量');
    assert.ok(clean.includes('max-width: ' + String(REMINDER_SETTER_NARROW_PX) + 'px'), '窄档断点取常量');
    assert.equal(clean.includes('text-overflow'), false, '不许出现省略截断');
    assert.equal(clean.includes('line-clamp'), false, '不许多行截断');
    assert.equal(clean.includes('nowrap'), false, '时间与日期永不截断：连 `nowrap` 都不许');
    assert.equal(clean.includes('overflow-x'), false, '不许藏横滑');
    assert.ok(clean.includes(':focus-visible'), '`:focus-visible` 必须有（真实键盘用户的地板）');
    assert.equal(clean.includes('cursor: not-allowed'), false,
      '本件没有按不动的控件（一条通知都不勾也不变灰）：`cursor: not-allowed` 一处都不该有');
  });

  it('原型近两轮的三处优化落在样式段上：卡加 shadow、隔线走发丝线、勾选槽位固定', () => {
    assert.ok(new RegExp(re(SLOT('host')) + '\\s*\\{[^}]*box-shadow: ').test(clean), '卡要加一层 shadow');
    assert.ok(clean.includes('box-shadow: ' + skinVar('shadow')), '那一层走皮肤 token（零投影的皮肤取 none）');
    assert.ok(new RegExp(re(SLOT('row')) + '\\s*\\+\\s*\\.' + re(SLOT('row')) + '\\s*\\{[^}]*border-top: 1px solid '
      + re(skinVar('line'))).test(clean), '三个决定之间的隔线要走发丝线（`line` 那一档）');
    assert.ok(new RegExp(re(SLOT('chip')) + '::before\\s*\\{[^}]*width: ' + String(REMINDER_SETTER_TICK_PX) + 'px')
      .test(clean), '单选那枚的勾选槽位固定（未选也留）');
    assert.ok(clean.includes('content: "' + REMINDER_SETTER_TICK + '"'), '选中那枚写上勾（形，不只靠颜色）');
  });

  it('状态不只靠颜色：形（勾／方框／软底）＋ 字（档名 ＋ 字重）＋ 色（软底）三样', () => {
    assert.ok(clean.includes('accent-soft'), '强调那一档走软底（实底上不写正文级小字）');
    assert.ok(clean.includes('accent-text'), '软底上的字走强调色的文本档');
    assert.ok(new RegExp(re(SLOT('check')) + '\\.is-on::before\\s*\\{[^}]*background: ' + re(skinVar('accent')))
      .test(clean), '勾上的方框走主色实底（那一格上只有一枚勾）');
    assert.ok(clean.includes('font-weight: 700'), '选中的那一枚字重加粗（字那一半）');
    assert.ok(new RegExp(re(SLOT('chip')) + '\\.is-on\\s*\\{').test(clean));
    assert.ok(new RegExp(re(SLOT('check')) + '\\.is-on\\s*\\{').test(clean));
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、不拿 ink 系当面', () => {
    const stripVarFns = (text) => {
      let out = '';
      let i = 0;
      while (i < text.length) {
        if (text.startsWith('var(', i)) {
          let depth = 0;
          let j = i + 3;
          for (; j < text.length; j += 1) {
            if (text[j] === '(') depth += 1;
            else if (text[j] === ')') { depth -= 1; if (depth === 0) break; }
          }
          i = j + 1;
          continue;
        }
        out += text[i];
        i += 1;
      }
      return out;
    };
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 200), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    /* 样式源码**逐份**扫：`styleSources()` 是本层样式源码的唯一读法（`style.ts` ＋ 拆出去的
     * `style-*.ts` 全在扫面里；按件只读 `style.ts` 的判据对拆出去的那半一无所知 ⇒ 拆分＝纪律变松）。 */
    const files = styleSources('reminder-setter');
    assert.ok(files.some((f) => f.file === 'style.ts'), '取不到本件的样式源码：' + files.map((f) => f.file).join('、'));
    for (const { file, src } of files) {
      assert.deepEqual([...stripComments(src).matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [],
        file + ' 里请改走 skinVar()（注释里提一句不算手写）');
    }
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了「面」：' + value);
    }
  });

  it('皮肤读法与常量对得上：每一处 `var(--ilife-…)` 都是 `skinVar(名)` 的逐字产物', () => {
    let n = 0;
    for (const m of clean.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
      assert.ok(clean.startsWith(skinVar(m[1]), m.index), '`' + m[1] + '` 处的 var() 串与 skinVar() 走散');
      n += 1;
    }
    assert.ok(n >= 20, '读皮肤的处数不对：' + n);
  });

  it('零键盘语汇（标记与会过屏的字里没有键位提示），也不接任何键盘事件', () => {
    const words = ['⌘', '⌥', '⇧', '⌃', 'Esc', 'Tab', '方向键', '快捷键', '键帽', '键盘', '长按', '双击', '按住'];
    const js = buildReminderSetterJs();
    const seen = [renderReminderSetter(PLAIN), renderReminderSetter(SILENT), stripComments(css),
      js, stripComments(STYLE_SRC)].join('');
    for (const w of words) assert.equal(seen.includes(w), false, '出现键盘语汇：' + w);
    assert.equal(/addEventListener\("key/.test(js), false, '不许把键盘做成通路');
    assert.equal(/\.key\s*[!=]==/.test(js), false, '也不许按 `event.key` 分支');
  });

  it('`dist/components/reminder-setter/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'reminder-setter');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 6, '产物不全：' + files.join('、'));
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const name of files) {
      const code = stripLiterals(readFileSync(join(dir, name), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, name + ' 里出现了 ' + needle);
      }
    }
  });

  it('运行时段是**产出的文本**：它自己跑得起来（IIFE）、幂等、点选是唯一通路', () => {
    const js = buildReminderSetterJs();
    assert.ok(js.startsWith('(function(){'), '是一段可独立注入的 IIFE');
    assert.ok(js.trimEnd().endsWith('}());'));
    assert.ok(js.includes(REMINDER_SETTER_RUNTIME_ATTR), '幂等开关');
    for (const needle of ['document', 'addEventListener', 'textContent', 'CustomEvent', 'closest', 'setAttribute']) {
      assert.ok(js.includes(needle), '运行时该用到 ' + needle + '（它在产出的文本里，不在模块代码里）');
    }
    assert.equal(js.includes('innerHTML'), false, '读数与选中态用节点文字拼，不碰 innerHTML');
    assert.equal(js.includes('outerHTML'), false);
    assert.equal(js.includes('pointerdown'), false, '本件不是拖拽件：通路只有点一下');
    assert.equal(js.includes('draggable'), false);
    assert.ok(js.includes(REMINDER_SETTER_EVENT_CHANGE), '运行时要派发本件那条事件');
    assert.ok(js.includes(REMINDER_SETTER_BOUND_ATTR), '根上要记一枚 bound 读数（幂等的可读痕迹）');
    assert.ok(js.includes('is-on'), '运行时段要自己写选中类：只在渲染期写它 ⇒ 真机上点出来永远没有那一档形');
    assert.ok(js.includes('classList.add(ON)') && js.includes('classList.remove(ON)'), '加／撤选中类走同一处');
    assert.ok(js.includes(reminderSetterStepTime.toString()), '步进时间的口径取自渲染期那个函数');
    assert.ok(js.includes(reminderSetterStepDate.toString()), '步进日期的口径取自渲染期那个函数');
    assert.ok(js.includes(reminderSetterRecap.toString()), '复述那句取自渲染期那个函数');
    assert.ok(js.includes(REMINDER_SETTER_TEXT.silent), '「没有通知，不会响」那一支的字也在');
    assert.ok(js.includes(String(REMINDER_SETTER_TIME_STEP_MIN)) && js.includes(String(REMINDER_SETTER_DATE_STEP_DAYS)),
      '两步长从常量来');
  });

  /* **嵌进去的函数必须自己站得住**：运行时段把渲染期那几个纯函数 `toString()` 后原样嵌进 IIFE，
   *  被嵌的那份源码里只要引用了一个序幕没声明的名字（例如 `pad2` 被写成了 `PAD2`），
   *  真机上每按一次步进键就抛 `ReferenceError` —— 读数一动不动、事件一条不派发，
   *  而「文本里确实含这份源码」的判据全绿（字形对得上，跑起来才露）。
   *  故这里把**序幕那一段**单独取出来、在只有它自己的作用域里跑一遍，再逐条比对读数。 */
  it('运行时段嵌进去的那几个纯函数，在只有序幕自身的作用域里真跑得起来（嵌进去的名字一个都不许悬空）', () => {
    const js = buildReminderSetterJs();
    const start = js.indexOf('var A_ROOT=');
    const end = js.indexOf('var doc=document;');
    assert.ok(start >= 0 && end > start, '运行时段的序幕形状变了：取不到那一段常量与嵌入函数的声明');
    const block = js.slice(start, end);
    const names = [...block.matchAll(/var ([A-Za-z_$][A-Za-z0-9_$]*)=/g)].map((m) => m[1]);
    assert.ok(names.length >= 8, '序幕里读到的声明太少：' + names.join('、'));
    let env;
    try {
      env = new Function(block + '\nreturn {' + names.join(', ') + '};\n')();
    } catch (e) {
      assert.fail('运行时段的序幕自己跑不起来：' + e.constructor.name + ': ' + e.message);
    }
    const fns = names.map((n) => env[n]).filter((v) => typeof v === 'function');
    assert.ok(fns.length >= 3, '序幕里嵌着的那几个纯函数没取到：' + names.join('、'));
    const grab = (src) => {
      const hit = fns.find((f) => String(f) === src);
      assert.ok(hit !== undefined, '运行时段里没嵌到这份源码：' + src.slice(0, 48));
      return hit;
    };
    const stepTime = grab(reminderSetterStepTime.toString());
    const stepDate = grab(reminderSetterStepDate.toString());
    const recap = grab(reminderSetterRecap.toString());
    /* 嵌入的那一份与渲染期那一份**同一份源码**：逐个 case 读数相等（跨零点、跨月、跨年都走一遍）。 */
    for (const [at, delta] of [['22:30', 1], ['22:30', -1], ['00:00', -1], ['23:55', 1]]) {
      assert.equal(stepTime(at, delta, REMINDER_SETTER_TIME_STEP_MIN),
        reminderSetterStepTime(at, delta, REMINDER_SETTER_TIME_STEP_MIN), '嵌进去的步进时间与渲染期走散：' + at);
    }
    for (const [at, delta] of [['2026-09-26', 1], ['2026-10-01', -1], ['2026-12-31', 1]]) {
      assert.equal(stepDate(at, delta, REMINDER_SETTER_DATE_STEP_DAYS),
        reminderSetterStepDate(at, delta, REMINDER_SETTER_DATE_STEP_DAYS), '嵌进去的步进日期与渲染期走散：' + at);
    }
    assert.equal(recap('每天', '2026-09-26', '22:30', 1, { silent: REMINDER_SETTER_TEXT.silent }),
      reminderSetterRecap('每天', '2026-09-26', '22:30', 1, REMINDER_SETTER_TEXT), '嵌进去的复述与渲染期走散');
    assert.equal(recap('每天', '2026-09-26', '22:30', 0, { silent: REMINDER_SETTER_TEXT.silent }),
      REMINDER_SETTER_TEXT.silent, '「没有通知，不会响」那一支也要跑得起来');
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(reminderSetterSlot('chip'), REMINDER_SETTER_CLASS + '-chip');
    assert.equal(reminderSetterSlot('chip', 'x-'), 'x-block-reminder-setter-chip');
    for (const slot of REMINDER_SETTER_SLOTS) assert.ok(reminderSetterSlot(slot).startsWith(REMINDER_SETTER_CLASS + '-'));
    const want = ['host', 'head', 'row', 'label', 'ctl', 'tray', 'chip', 'fields', 'field', 'flabel',
      'stepper', 'dec', 'num', 'inc', 'rack', 'check', 'read'];
    for (const slot of want) assert.ok(REMINDER_SETTER_SLOTS.includes(slot), '槽位闭集里少了 ' + slot);
    const html = renderReminderSetter(PLAIN);
    /* **死声明门**：闭集里**每一枚**槽类都必须在某个形态的标记里真的出现（不另抄一份名单来查）。
       漏一枚（例如根上没挂 `-host`）⇒ 样式段里挂在它名下的规则永不命中：
       卡没有边／没有投影，`container-type` 也不生效 ⇒ `@container` 找不到容器、窄档折行整段失效。
       变异自证：把根上的 `reminderSetterSlot('host')` 摘掉 ⇒ 本条红在 `槽位闭集里的 'host' …（死声明）`。 */
    const htmlTrack = renderReminderSetter(TRACK);
    for (const slot of REMINDER_SETTER_SLOTS) {
      assert.ok(html.includes(reminderSetterSlot(slot)) || htmlTrack.includes(reminderSetterSlot(slot)),
        '槽位闭集里的 `' + slot + '` 在两个形态的标记里都没有这个类（死声明）：' + reminderSetterSlot(slot));
    }
    /* 老档那 17 枚**逐枚都要还在 `decisions` 的标记里**（新形态不许把老档的槽位搬走）。 */
    for (const slot of want) {
      assert.ok(html.includes(reminderSetterSlot(slot)), '老档标记里少了 ' + slot + '（新档不许动它）');
    }
    /* 容器名不许是项名的前缀（判据在标记串上找槽位时才不会把容器当项）。 */
    assert.equal(CLS('chip').startsWith(CLS('chips')), false);
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('reminder-setter ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同；不从根出口出', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(REMINDER_SETTER_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
    assert.equal(root.renderReminderSetter, undefined, '组件层不进根出口');
    assert.equal(root.reminderSetterCss, undefined);
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const barBefore = renderScaleBar({ value: 860, goal: 1850 });
    const headBefore = renderPageHead({ skill: '卡路里', title: '今日', reading: { value: '860', unit: '卡' } });
    renderReminderSetter(PLAIN);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), barBefore, '别件的产物逐字节不变');
    assert.equal(renderPageHead({ skill: '卡路里', title: '今日', reading: { value: '860', unit: '卡' } }), headBefore);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const one = stripComments(reminderSetterCss({ prefix: 'x-' }));
    assert.ok(one.includes('.x-page-ui .x-block-reminder-setter'), '前缀必须作用到 scope 与类名两处');
    assert.equal(one.includes('.ilife-page-ui'), false);
  });

  it('同一份入参渲染四次逐字节相同，且标记不带皮肤类', () => {
    const one = renderReminderSetter(PLAIN);
    assert.equal(renderReminderSetter(PLAIN), one);
    assert.equal(renderReminderSetter(PLAIN), one);
    assert.equal(renderReminderSetter(PLAIN), one);
    assert.equal(/ilife-skin-/.test(one), false, '皮肤由页面挂，换皮要机械地不换结构');
  });
});

/* ── ④ 四档几何（真机） ─────────────────────────────────────────────── */

/** 一页：皮肤取值表 ＋ 本件样式段 ＋ 本件标记（可选运行时段）。 */
function fixture(skin, input, withRuntime) {
  const script = withRuntime ? '<script>' + buildReminderSetterJs() + '</script>' : '';
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>reminder-setter</title>\n<style>\n'
    + 'html,body{margin:0;padding:0}\n' + skinCss() + '\n' + reminderSetterCss() + '\n'
    + '</style></head>\n<body>\n'
    + '<div class="ilife-page-ui ' + skinClass(skin) + '" style="padding:16px">'
    + renderReminderSetter(input)
    + '<p style="height:600px">页面正文</p></div>\n'
    + script + '\n</body></html>';
}

const ROOT_S = q(ATTR(REMINDER_SETTER_ATTR));
const HOST_S = q(SEL('host'));
const HEAD_S = q(SEL('head'));
const ROW_S = q(SEL('row'));
const LABEL_S = q(SEL('label'));
const CTL_S = q(SEL('ctl'));
const TRAY_S = q(SEL('tray'));
const CHIP_S = q(SEL('chip'));
const RACK_S = q(SEL('rack'));
const CHECK_S = q(SEL('check'));
const STEPPER_S = q(SEL('stepper'));
const NUM_S = q(SEL('num'));
const READ_S = q(SEL('read'));
const RECAP_S = q(ATTR(REMINDER_SETTER_READ_ATTR + '="recap"'));
/** 形态 `track` 的两枚槽位（刻度上那枚点／图例那一行）。 */
const DOT_S = q(SEL('dot'));
const LG_S = q(SEL('lg'));

/** 页内：逐 case 量几何（三排可点项／两枚步进位／读数／一排里的缝／窄宽两档的折行）。 */
const BOX_FN = '(function(){'
  + 'function box(el){var r=el.getBoundingClientRect();return {w:r.width,h:r.height,'
  + 'l:r.left,t:r.top};}'
  + 'function shown(el){var cs=getComputedStyle(el),r=el.getBoundingClientRect();'
  + 'return cs.display!=="none"&&cs.visibility!=="hidden"&&r.width>0&&r.height>0;}'
  + 'function all(sel,scope){return [].slice.call((scope||document).querySelectorAll(sel)).filter(shown);}'
  + 'function kids(sel,root){var out=[];var list=all(sel,root);'
  + 'for(var i=0;i<list.length;i+=1){out.push({box:box(list[i]),'
  + 'items:[].slice.call(list[i].children).filter(shown).map(box)});}return out;}'
  + 'var cases=[].slice.call(document.querySelectorAll("[data-case]"));'
  + 'var out=[];'
  + 'for(var i=0;i<cases.length;i+=1){'
  + ' var root=cases[i].querySelector(' + ROOT_S + ');'
  + ' var row=root.querySelector(' + ROW_S + ');'
  + ' var lb=row.querySelector(' + LABEL_S + '), ct=row.querySelector(' + CTL_S + ');'
  + ' out.push({name:cases[i].getAttribute("data-case"),rows:all(' + ROW_S + ',root).length,heads:all(' + HEAD_S + ',root).length,'
  + '  chips:all(' + CHIP_S + ',root).map(box),checks:all(' + CHECK_S + ',root).map(box),'
  + '  steps:all(' + q(SEL('dec') + ',' + SEL('inc')) + ',root).map(box),'
  + '  trays:kids(' + TRAY_S + ',root),racks:kids(' + RACK_S + ',root),steppers:kids(' + STEPPER_S + ',root),'
  + '  nums:all(' + NUM_S + ',root).map(function(n){var b=box(n);b.text=n.textContent;'
  + 'b.scrollW=n.scrollWidth;b.clientW=n.clientWidth;return b;}),'
  + '  reads:all(' + READ_S + ',root).map(function(n){var b=box(n);b.text=n.textContent;'
  + 'b.scrollW=n.scrollWidth;b.clientW=n.clientWidth;return b;}),'
  + '  dots:all(' + DOT_S + ',root).map(box),legends:all(' + LG_S + ',root).map(box),'
  + '  shown:all(' + q(SEL('dot') + ',' + SEL('lg')) + ',root).length,'
  + '  labelBox:box(lb),ctlBox:box(ct),'
  + '  stacked:Math.round(ct.getBoundingClientRect().top)-Math.round(lb.getBoundingClientRect().bottom)>=0});'
  + '}return out;}())';

/** 相邻两枚之间的缝（同一行量左右、折行量上下）：读数的宽也算两枚步进键之间的让位。 */
function gapsOf(boxes) {
  const out = [];
  for (let i = 1; i < boxes.length; i += 1) {
    const a = boxes[i - 1];
    const b = boxes[i];
    out.push(Math.abs(a.t - b.t) < 3 ? b.l - (a.l + a.w) : b.t - (a.t + a.h));
  }
  return out;
}

describe('reminder-setter ④ 四档几何（真机 headless Chrome ＋ CDP · 容器 320／390／620／1280）', async () => {
  const page = await startShapesPage({
    css: skinCss() + '\n' + reminderSetterCss(),
    html: '<div class="ilife-page-ui" data-case="plain">' + renderReminderSetter(PLAIN) + '</div>'
      + '<div class="ilife-page-ui" data-case="silent">' + renderReminderSetter(SILENT) + '</div>'
      + '<div class="ilife-page-ui" data-case="track">' + renderReminderSetter(TRACK) + '</div>',
    portOffset: 47,
  });
  if (page === null) {
    it('真机未跑（本机没有 Chrome）：退确定性几何判据', (t) => {
      console.log('reminder-setter 几何：真机未跑（本机没有 Chrome），原因=startShapesPage 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  it('四档零横向溢出、时间与日期零截断、每枚可点件 ≥44 见方、相邻 ≥8px、窄宽两档折行对', async () => {
    const selectors = [ROOT_S, HOST_S, HEAD_S, LABEL_S, CTL_S, TRAY_S, RACK_S, CHIP_S, CHECK_S, NUM_S, READ_S]
      .map((s) => JSON.parse(s));
    for (const width of [320, 390, 620, 1280]) {
      await page.setWidth(width);
      const rows = await page.read(selectors);
      const frame = await page.frame();
      const cases = await page.ev(BOX_FN);
      /* 形态 `track` 那一档另有一条自己的几何判据（它的可点件数目与骨架都不同）——这里只看老档两份。 */
      const oldCases = cases.filter((c) => c.name !== 'track');
      const narrow = width <= REMINDER_SETTER_NARROW_PX;
      console.log('reminder-setter 几何读数 ' + JSON.stringify({
        width, frame,
        rows: rows.map((r) => ({ sel: r.sel, visible: r.visible, clipped: r.clipped,
          overflow: Math.max(0, r.maxScrollW - r.maxClientW) })),
        cases: cases.map((c) => ({ rows: c.rows, heads: c.heads, chips: c.chips.length, checks: c.checks.length,
          steps: c.steps.length, nums: c.nums.map((n) => n.text), reads: c.reads.map((r) => r.text),
          traps: c.trays.map((t) => gapsOf(t.items)), racks: c.racks.map((t) => gapsOf(t.items)),
          steppers: c.steppers.map((t) => gapsOf(t.items)), stacked: c.stacked })),
      }));
      assert.ok(frame.fxScrollW <= width + 1, width + ' 档夹具容器横溢：' + JSON.stringify(frame));
      assert.ok(frame.docScrollW <= frame.innerW + 1, width + ' 档页面横溢：' + JSON.stringify(frame));
      for (const r of rows) {
        assert.ok(r.maxScrollW <= r.maxClientW + 1, width + ' 档 ' + r.sel + ' 溢出：' + JSON.stringify(r));
        assert.equal(r.clipped, 0, width + ' 档 ' + r.sel + ' 有节点被压字／截断（时间与日期永不 `…`）：'
          + JSON.stringify(r));
        assert.equal(r.scrollsX, 0, width + ' 档 ' + r.sel + ' 藏了横滑：' + JSON.stringify(r));
      }
      for (const c of oldCases) {
        assert.equal(c.rows, REMINDER_SETTER_PARTS.length, width + ' 档三行都要在');
        assert.equal(c.heads, 1, width + ' 档抬头只有一个');
        assert.equal(c.chips.length, REPEATS.length + LEADS.length, width + ' 档胶囊数不对');
        assert.equal(c.checks.length, ROUTES.length, width + ' 档方框数不对');
        assert.equal(c.steps.length, REMINDER_SETTER_STEPS.length * 2, width + ' 档步进键数不对');
        assert.deepEqual(c.nums.map((n) => n.text), ['22:30', '2026-09-26'], width + ' 档两枚读数都要在且原样');
        for (const n of c.nums) {
          assert.ok(n.scrollW <= n.clientW + 1, width + ' 档读数被压：' + JSON.stringify(n));
          assert.ok(n.w > 0 && n.h >= REMINDER_SETTER_TOUCH_PX, width + ' 档读数格太矮：' + JSON.stringify(n));
        }
        assert.equal(c.reads.length, 1, width + ' 档复述**只有一处**');
        assert.ok(c.reads[0].text.length > 0, width + ' 档复述是空的');
        assert.ok(c.reads[0].scrollW <= c.reads[0].clientW + 1, width + ' 档复述被压：' + JSON.stringify(c.reads[0]));
        /* 命中盒：三排可点项与两枚步进键都要 ≥44 见方。 */
        for (const b of c.chips.concat(c.checks, c.steps)) {
          assert.ok(b.w >= REMINDER_SETTER_TOUCH_PX && b.h >= REMINDER_SETTER_TOUCH_PX,
            width + ' 档可点件命中盒不足 44：' + JSON.stringify(b));
        }
        /* 相邻触控目标的缝 ≥8px（一排里逐对量；折行那一道量上下）。
           **量的是未取整的几何**：两枚各自取整之后再相减，会凭空量出 7px（真值是 8）——
           那是量法的错，不是件的错。让位 0.5px 给布局引擎的分数像素；
           `gap` 真掉了的话量到的是 0，仍然红。 */
        for (const list of c.trays.concat(c.racks, c.steppers)) {
          for (const g of gapsOf(list.items)) {
            assert.ok(g >= REMINDER_SETTER_GAP_PX - 0.5, width + ' 档相邻两枚之间那道缝不足 '
              + String(REMINDER_SETTER_GAP_PX) + 'px（量到 ' + g.toFixed(2) + '）：' + JSON.stringify(list.items));
          }
        }
        /* 窄宽两档：窄档左标签右控件折成上下两段；宽档并排。 */
        assert.equal(c.stacked, narrow,
          width + ' 档折行不对（窄于 ' + String(REMINDER_SETTER_NARROW_PX) + 'px 才折成上下两段）：'
          + JSON.stringify({ label: c.labelBox, ctl: c.ctlBox, narrow }));
      }
      assert.equal((await page.errs()).length, 0, '页内零未捕获错误');
    }
  });

  it('形态 track（一天刻度上摆点）四档几何：零横溢、每枚点／图例行 ≥44 见方、刻度上相邻 ≥8px、时刻不截断', async () => {
    for (const width of [320, 390, 620, 1280]) {
      await page.setWidth(width);
      const all = await page.ev(BOX_FN);
      const track = all.filter((c) => c.name === 'track');
      assert.equal(track.length, 1, width + ' 档量不到 track 那一份');
      const c = track[0];
      const frame = await page.frame();
      console.log('reminder-setter track 几何读数 ' + JSON.stringify({
        width, frame, dots: c.dots, legends: c.legends.length, shown: c.shown,
        rows: c.rows, heads: c.heads, reads: c.reads.length,
        nums: c.nums.map((n) => n.text), stacked: c.stacked,
      }));
      assert.ok(frame.fxScrollW <= width + 1, width + ' 档夹具容器横溢：' + JSON.stringify(frame));
      assert.ok(frame.docScrollW <= frame.innerW + 1, width + ' 档页面横溢：' + JSON.stringify(frame));
      /* 这一档的骨架：**没有抬头、没有复述那一行**（图例那一行就是「现在设的是多少」）；
         决定面板＝三行决定 ＋ 「时间」那一行（4 行）。 */
      assert.equal(c.heads, 0, width + ' 档这一档不该有抬头');
      assert.equal(c.reads.length, 0, width + ' 档这一档不该有复述那一行');
      assert.equal(c.rows, REMINDER_SETTER_PARTS.length + 1, width + ' 档＝三行决定 ＋ 时间那一行');
      assert.equal(c.chips.length, REPEATS.length + LEADS.length, width + ' 档胶囊数不对');
      assert.equal(c.checks.length, ROUTES.length, width + ' 档方框数不对');
      assert.equal(c.steps.length, 2, width + ' 档步进键两枚');
      assert.equal(c.dots.length, TRACK.items.length, width + ' 档刻度上的点数不对');
      assert.equal(c.legends.length, TRACK.items.length, width + ' 档图例行数不对');
      /* 命中盒：刻度上的点、图例每一行、三排可点项、两枚步进键，全都 ≥44 见方。 */
      for (const b of c.dots.concat(c.legends, c.chips, c.checks, c.steps)) {
        assert.ok(b.w >= REMINDER_SETTER_TOUCH_PX && b.h >= REMINDER_SETTER_TOUCH_PX,
          width + ' 档可点件命中盒不足 ' + String(REMINDER_SETTER_TOUCH_PX) + '：' + JSON.stringify(b));
      }
      /* 刻度上相邻两枚点的缝 ≥8px（按屏上先后逐对量）。 */
      const dots = c.dots.slice().sort((a, b) => a.l - b.l);
      for (let i = 1; i < dots.length; i += 1) {
        const g = dots[i].l - (dots[i - 1].l + dots[i - 1].w);
        assert.ok(g >= REMINDER_SETTER_GAP_PX - 0.5, width + ' 档刻度上相邻两枚点的缝不足 '
          + String(REMINDER_SETTER_GAP_PX) + 'px（量到 ' + g.toFixed(2) + '）：' + JSON.stringify(dots));
      }
      /* 时刻永不截断（图例那几枚 ＋ 面板里那一枚）。 */
      for (const n of c.nums) {
        assert.ok(n.scrollW <= n.clientW + 1, width + ' 档时刻被压：' + JSON.stringify(n));
      }
      /* 图例每行都完整看得见（宽档 3 列 → 窄档 1 列都不许被裁）。 */
      assert.equal(c.shown, TRACK.items.length * 2, width + ' 档点数 ＋ 图例行数不对：' + String(c.shown));
      assert.equal((await page.errs()).length, 0, width + ' 档页内零未捕获错误');
    }
  });

  it('关页', () => { page.close(); });
});

/* ── ⑤ 行为（真机 · **真指针**）＋ 四套皮肤同构 ───────────────────── */

/** **真指针铁律**：换档／勾选／步进这几条**一律**走 CDP 的 `Input.dispatchMouseEvent`
 *  （`p.mouse()`：`mousePressed` ＋ `mouseReleased`，浏览器自己合成那枚 `click`）——**不许**用
 *  `element.click()`：合成 `click` 不经指针、也不看元素到不到得了（被盖住、零宽零高的元素它照样点得动）
 *  ⇒ 它能在一份「真用户走不通」的通路上全绿。故每条动作之前先量**可达性**：宽高非零 ＋ 那一点上命中的就是它自己。
 */
describe('reminder-setter ⑤ 行为（真机 · 真指针 CDP Input）＋ 四套皮肤同构', async () => {
  const p = await startBrowser({ portOffset: 48 });
  if (p === null) {
    it('真机未跑（本机没有 Chrome）：行为判据跳过', (t) => {
      console.log('reminder-setter 行为：真机未跑（本机没有 Chrome），原因=startBrowser 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  const PART_S = q(ATTR(REMINDER_SETTER_PART_ATTR));
  const READ_TIME_S = q(ATTR(REMINDER_SETTER_READ_ATTR + '="time"'));
  const READ_START_S = q(ATTR(REMINDER_SETTER_READ_ATTR + '="start"'));
  const CHECK_CLS_S = q(SEL('check'));
  const CHIP_CLS_S = q(SEL('chip'));

  /** 一份页内快照：机器读数、选中态、那行复述、方框与胶囊**算出来的样子**、事件落账。 */
  const SNAP = '(function(){'
    + 'var root=document.querySelector(' + ROOT_S + ');'
    + 'function list(sel){return [].slice.call(root.querySelectorAll(sel));}'
    + 'var off=list(' + PART_S + ');'
    + 'return {'
    + 'id:root.getAttribute(' + q(REMINDER_SETTER_ATTR) + '),'
    + 'time:root.getAttribute(' + q(REMINDER_SETTER_TIME_ATTR) + '),'
    + 'start:root.getAttribute(' + q(REMINDER_SETTER_START_ATTR) + '),'
    + 'bound:root.getAttribute(' + q(REMINDER_SETTER_BOUND_ATTR) + '),'
    + 'recap:(root.querySelector(' + RECAP_S + ')||{}).textContent,'
    + 'timeNum:(root.querySelector(' + READ_TIME_S + ')||{}).textContent,'
    + 'startNum:(root.querySelector(' + READ_START_S + ')||{}).textContent,'
    + 'pressed:off.map(function(el){return el.getAttribute(' + q(REMINDER_SETTER_PART_ATTR) + ')+":"'
    + '+el.getAttribute(' + q(REMINDER_SETTER_VALUE_ATTR) + ')+"="+el.getAttribute("aria-pressed")'
    + '+(el.classList.contains("is-on")?"+on":"");}),'
    + 'boxes:list(' + CHECK_CLS_S + ').map(function(el){return {'
    + 'key:el.getAttribute(' + q(REMINDER_SETTER_VALUE_ATTR) + '),cls:el.className,'
    + 'bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor,'
    + 'mark:getComputedStyle(el,"::before").content,markBg:getComputedStyle(el,"::before").backgroundColor};}),'
    + 'chips:list(' + CHIP_CLS_S + ').map(function(el){return {'
    + 'key:el.getAttribute(' + q(REMINDER_SETTER_VALUE_ATTR) + '),cls:el.className,'
    + 'bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor,'
    + 'mark:getComputedStyle(el,"::before").content,markW:getComputedStyle(el,"::before").width};}),'
    + 'evts:window.__rs};}())';
  /** 页里装事件落账 ＋ 三条浏览器原生事件的时序（每次动作各带当刻点中的那一枚）。 */
  const WIRE = '(function(){window.__rs=[];window.__tl=[];'
    + 'document.addEventListener(' + q(REMINDER_SETTER_EVENT_CHANGE)
    + ',function(e){window.__rs.push({type:e.type,detail:e.detail});});'
    + '["pointerdown","pointerup","click"].forEach(function(n){document.addEventListener(n,function(e){'
    + 'var t=e.target;'
    /* 一按落到的可能是按钮里那枚记号（刻度上的一枚点里有 `<b>` 与 `<i>`）：按**最近的机器键**认这一枚，
       认不出才按原始 target 认（老档那些胶囊里只有文字，两种认法读到的是同一枚）。 */
    + 'var box=(t&&t.closest)?t.closest("[' + REMINDER_SETTER_VALUE_ATTR + '],[' + REMINDER_SETTER_STEP_ATTR + ']"):null;'
    + 'if (box) t=box;'
    + 'var v=t&&t.getAttribute?t.getAttribute(' + q(REMINDER_SETTER_VALUE_ATTR) + '):null;'
    + 'var st=t&&t.getAttribute?t.getAttribute(' + q(REMINDER_SETTER_STEP_ATTR) + '):null;'
    + 'window.__tl.push({name:n,target:v||st});},true);});return true;}())';
  const seqOf = () => p.ev('window.__tl.map(function(o){return o.name+"|"+o.target;})');
  const evtsOf = () => p.ev('window.__rs.map(function(o){return o.type+"|"+o.detail.part+"|"+o.detail.value;})');
  const lastDetail = () => p.ev('window.__rs.length?window.__rs[window.__rs.length-1].detail:null');

  /* ── 真指针小件：坐标 ＋ **可达性**（宽高非零、那一点上命中的就是它自己） ────────── */
  const POINT_AT = (sel) => '(function(){'
    + 'var el=document.querySelector(' + q(sel) + ');'
    + 'if (!el) return {miss:true};'
    + 'var b=el.getBoundingClientRect();'
    + 'var x=Math.round(b.left+b.width/2), y=Math.round(b.top+b.height/2);'
    + 'var cs=getComputedStyle(el), hit=document.elementFromPoint(x,y);'
    + 'return {x:x,y:y,w:Math.round(b.width),h:Math.round(b.height),disp:cs.display,'
    + 'ok:!!hit && (hit===el || el.contains(hit))};}())';
  /** 真指针点一下：先量可达性（量不过就是**判据红**，不是静默跳过），再走 CDP 的鼠标通道。 */
  const tapAt = async (sel) => {
    const g = await p.ev(POINT_AT(sel));
    assert.ok(g.miss !== true, '真指针要点的元素不在页上：' + sel);
    assert.ok(g.w > 0 && g.h > 0, '真指针要点的元素量出来是零宽／零高（屏上到不了它）：' + sel + ' ' + JSON.stringify(g));
    assert.ok(g.h >= REMINDER_SETTER_TOUCH_PX && g.w >= REMINDER_SETTER_TOUCH_PX,
      '真指针要点的元素命中盒不足 ' + String(REMINDER_SETTER_TOUCH_PX) + '：' + sel + ' ' + JSON.stringify(g));
    assert.equal(g.ok, true, '真指针那一点上命中的不是它（被盖住／不在当前那一行）：' + sel + ' ' + JSON.stringify(g));
    await p.mouse(g.x, g.y);
    return g;
  };
  const ITEM = (part, key) => ATTR(REMINDER_SETTER_PART_ATTR + '="' + part + '"')
    + ATTR(REMINDER_SETTER_VALUE_ATTR + '="' + key + '"');
  const STEP = (step, delta) => ATTR(REMINDER_SETTER_STEP_ATTR + '="' + step + '"')
    + ATTR(REMINDER_SETTER_DELTA_ATTR + '="' + delta + '"');

  it('换重复档：**真指针点「就这一次」**（完整事件序列 ＋ 选中态序列）→ 选中挪过去 ＋ 复述重写 ＋ 一条事件', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    const before = await p.ev('window.__rs.length');
    assert.equal(before, 0, '开页时一条事件都不派发（绑定时不报数）');
    await tapAt(ITEM('repeat', 'once'));
    const st = await p.ev(SNAP);
    const seq = await seqOf();
    console.log('reminder-setter 真指针换档时序 ' + JSON.stringify({ seq, recap: st.recap, pressed: st.pressed }));
    assert.deepEqual(seq, ['pointerdown|once', 'pointerup|once', 'click|once'],
      '真指针点一下的完整事件序列（三条都落在那一枚上）：' + JSON.stringify(seq));
    assert.equal(st.recap, reminderSetterRecap('就这一次', '2026-09-26', '22:30', 1, REMINDER_SETTER_TEXT),
      '复述跟着重写（读数行是真读数）');
    assert.deepEqual(st.pressed.filter((x) => x.endsWith('+on')),
      ['repeat:once=true+on', 'lead:ontime=true+on', 'route:push=true+on'],
      '**恰好三枚是选中的**：换档把旧的那一枚先撤下来（同一排里只有一枚选中）');
    assert.equal(st.chips.filter((c) => c.cls.includes('is-on')).length, 2, '胶囊里恰好两枚挂 is-on（重复档 ＋ 提前档）');
    const once = st.chips.find((c) => c.key === 'once');
    const daily = st.chips.find((c) => c.key === 'daily');
    assert.ok(once.cls.includes('is-on') && daily.cls.length > 0 && !daily.cls.includes('is-on'),
      '选中的那一枚有那一档形，旧的落回纸面');
    assert.equal(st.chips.filter((c) => c.mark.includes(REMINDER_SETTER_TICK)).length, 2, '选中那两枚有勾');
    assert.equal(once.markW, String(REMINDER_SETTER_TICK_PX) + 'px', '勾选槽位宽＝常量（未选也留同一宽度）');
    assert.equal(await p.ev('getComputedStyle(document.querySelector(' + q(ITEM('repeat', 'daily')) + '),"::before").width'),
      String(REMINDER_SETTER_TICK_PX) + 'px', '**没选中的那一枚也留着同样宽的槽位**（一排胶囊左右沿齐平）');
    assert.equal((await evtsOf()).join(' '), REMINDER_SETTER_EVENT_CHANGE + '|repeat|once', '只派发一条事件');
    const d = await lastDetail();
    assert.equal(d.id, 'rem-weight');
    assert.deepEqual(d.state, { repeat: '就这一次', time: '22:30', startDate: '2026-09-26', lead: 'ontime', routes: ['push'] },
      '事件带的是改完之后的全量读数');
    assert.equal(st.bound, '1', '根上记一枚 bound 读数');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('换提前档 ＋ 勾一条通知：真指针各点一下 → 选中态两处一起翻 ＋ 状态随之改', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(ITEM('lead', 'm10'));
    let st = await p.ev(SNAP);
    assert.deepEqual(st.pressed.filter((x) => x.endsWith('+on')),
      ['repeat:daily=true+on', 'lead:m10=true+on', 'route:push=true+on'],
      '提前档换了，另外两排不动');
    assert.equal(st.recap, reminderSetterRecap('每天', '2026-09-26', '22:30', 1, REMINDER_SETTER_TEXT));
    await tapAt(ITEM('route', 'feishu'));
    st = await p.ev(SNAP);
    assert.deepEqual(st.pressed.filter((x) => x.endsWith('+on')),
      ['repeat:daily=true+on', 'lead:m10=true+on', 'route:push=true+on', 'route:feishu=true+on'],
      '多选：勾上的那一条是**加上去**，不是替换');
    assert.equal((await evtsOf()).join(' '),
      REMINDER_SETTER_EVENT_CHANGE + '|lead|m10 ' + REMINDER_SETTER_EVENT_CHANGE + '|route|feishu',
      '两条事件各带自己的 part／value');
    const d = await lastDetail();
    assert.deepEqual(d.state.routes, ['push', 'feishu'], 'state.routes 顺序＝屏上顺序');
    const feishu = st.boxes.find((b) => b.key === 'feishu');
    const push = st.boxes.find((b) => b.key === 'push');
    assert.ok(feishu.cls.includes('is-on') && feishu.mark.includes(REMINDER_SETTER_TICK),
      '勾上的那枚有勾：' + JSON.stringify(feishu));
    assert.equal(push.bg, feishu.bg, '勾上的两枚同一档底（软底）');
    assert.equal(push.markBg, feishu.markBg, '方框实底同一档色');
    /* 拿**没选中**的那一枚胶囊比面：`daily` 正是这一份入参里选中的那一枚，
       拿它比等于拿「软底」跟「软底」比（`paper` 下必然相等）——那是取样的错。 */
    assert.notEqual(st.chips.find((c) => c.key === 'once').bg, feishu.bg, '没勾的那一枚还是原来的面');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('**勾到一条不剩**：真指针把勾上的逐一取消 → 复述读成「没有通知，不会响」，控件一枚都不变灰', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(ITEM('route', 'push'));
    let st = await p.ev(SNAP);
    assert.equal(st.recap, REMINDER_SETTER_TEXT.silent, '一条不剩 ⇒ 照实读成不会响');
    assert.equal(st.pressed.filter((x) => x.endsWith('+on')).length, 2, '只剩重复档与提前档两枚');
    assert.equal(st.boxes.filter((b) => b.mark.includes(REMINDER_SETTER_TICK)).length, 0, '一枚勾都不剩');
    /* 勾回来：牌还在、还点得动（没有 disabled 那一档）。 */
    await tapAt(ITEM('route', 'app'));
    st = await p.ev(SNAP);
    assert.equal(st.recap, reminderSetterRecap('每天', '2026-09-26', '22:30', 1, REMINDER_SETTER_TEXT), '勾回来复述就回来');
    assert.deepEqual((await lastDetail()).state.routes, ['app']);
    assert.equal(await p.ev('document.querySelectorAll('
      + q(SEL('check') + '[disabled], ' + SEL('chip') + '[disabled]') + ').length'), 0,
      '一枚按不动的控件都没有');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('时间步进：**真指针点 ＋／−** → 机器读数与屏上读数一起走；复述跟着改', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(STEP('time', '1'));
    let st = await p.ev(SNAP);
    assert.equal(st.time, reminderSetterStepTime('22:30', 1, REMINDER_SETTER_TIME_STEP_MIN), '机器读数走了');
    assert.equal(st.timeNum, st.time, '屏上那枚读数＝机器读数（两处一起写）');
    assert.equal(st.recap, reminderSetterRecap('每天', '2026-09-26', st.time, 1, REMINDER_SETTER_TEXT), '复述跟着改');
    const d = await lastDetail();
    assert.equal(d.part, 'time');
    assert.equal(d.value, '22:35');
    await tapAt(STEP('time', '-1'));
    st = await p.ev(SNAP);
    assert.equal(st.time, '22:30', '减回来');
    assert.equal(st.timeNum, '22:30');
    assert.equal((await evtsOf()).filter((e) => e.includes('|time|')).length, 2, '两次步进两条事件');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('时间步进跨零点绕回：**真指针**在 00:00 上点减键 → 23:55（机器读数与复述一起绕）', async () => {
    await p.at(fixture('paper', MIDNIGHT, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    const before = await p.ev(SNAP);
    assert.equal(before.time, '00:00');
    await tapAt(STEP('time', '-1'));
    const st = await p.ev(SNAP);
    console.log('reminder-setter 跨零点读数 ' + JSON.stringify({ time: st.time, recap: st.recap }));
    assert.equal(st.time, '23:55', '00:00 再减一步绕回 23:55');
    assert.equal(st.timeNum, '23:55');
    assert.equal(st.recap, reminderSetterRecap('每天', '2026-09-26', '23:55', 1, REMINDER_SETTER_TEXT));
    assert.equal((await lastDetail()).value, '23:55');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('日期步进：**真指针点 ＋／−** → 机器读数与屏上读数一起走', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(STEP('start', '1'));
    let st = await p.ev(SNAP);
    assert.equal(st.start, reminderSetterStepDate('2026-09-26', 1, REMINDER_SETTER_DATE_STEP_DAYS));
    assert.equal(st.startNum, st.start, '屏上那枚读数＝机器读数');
    assert.equal(st.recap, reminderSetterRecap('每天', '2026-09-27', '22:30', 1, REMINDER_SETTER_TEXT), '复述跟着改');
    const d = await lastDetail();
    assert.equal(d.part, 'start');
    assert.equal(d.value, '2026-09-27');
    await tapAt(STEP('start', '-1'));
    st = await p.ev(SNAP);
    assert.equal(st.start, '2026-09-26', '减回来');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('改动是**真手势**打出来的：每次动作各来一条 `pointerdown`（合成 `click()` 只出一条 `click`）', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(ITEM('repeat', 'weekly'));
    await tapAt(ITEM('route', 'app'));
    await tapAt(STEP('time', '1'));
    const seq = await seqOf();
    console.log('reminder-setter 真指针时序 ' + JSON.stringify(seq));
    assert.equal(seq.filter((s) => s.startsWith('pointerdown')).length, 3, '三次真指针动作各来一条 `pointerdown`：'
      + JSON.stringify(seq));
    assert.deepEqual(seq.slice(-3).map((s) => s.split('|')[0]), ['pointerdown', 'pointerup', 'click']);
    assert.equal((await evtsOf()).length, 3, '三次改动各派发一条事件');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('幂等：同一段运行时段注两次也只绑一次（第二次直接返回）', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    const again = await p.ev('(function(){var s=document.createElement("script");'
      + 's.textContent=' + q(buildReminderSetterJs()) + ';'
      + 'document.body.appendChild(s);return true;}())');
    assert.equal(again, true);
    await tapAt(ITEM('repeat', 'monthly'));
    const st = await p.ev(SNAP);
    console.log('reminder-setter 幂等读数 ' + JSON.stringify({ recap: st.recap, pressed: st.pressed.length }));
    assert.equal(st.recap, reminderSetterRecap('每月 25 号', '2026-09-26', '22:30', 1, REMINDER_SETTER_TEXT),
      '重复注入后照样能换档');
    assert.equal((await evtsOf()).length, 1, '注两次也只派发一条事件');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('四套皮肤下标记逐字节相同（换皮不换结构）；「没有通知」那一支在四套下都读得出', async () => {
    const marks = [];
    for (const skin of SKIN_NAMES) {
      await p.at(fixture(skin, PLAIN, false), { width: 390, height: 900 });
      marks.push(await p.ev('document.querySelector(' + ROOT_S + ').outerHTML'));
      await p.at(fixture(skin, SILENT, false), { width: 390, height: 900 });
      const read = await p.ev('(function(){var n=document.querySelector(' + RECAP_S + ');return n?n.textContent:"";}())');
      assert.equal(read, REMINDER_SETTER_TEXT.silent, skin + ' 皮肤下「没有通知」那一支也照实读出来');
    }
    for (let i = 1; i < marks.length; i += 1) {
      assert.equal(marks[i], marks[0], '皮肤 ' + SKIN_NAMES[i] + ' 的标记与 ' + SKIN_NAMES[0] + ' 逐字节相同');
    }
    console.log('reminder-setter 皮肤同构：' + SKIN_NAMES.join('／') + ' 四套标记逐字节相同');
  });

  /* ── 形态 `track`（一天刻度上摆点）的四条：真指针点刻度上的点／改时间／改档位与取消勾／真手势 ── */

  const PICK_S = q(ATTR(REMINDER_SETTER_PART_ATTR + '="pick"'));
  const AT_S = q(ATTR(REMINDER_SETTER_READ_ATTR + '="at"'));
  const TAIL_S = q(ATTR(REMINDER_SETTER_READ_ATTR + '="tail"'));
  const SEL_READ_S = q(ATTR(REMINDER_SETTER_READ_ATTR + '="sel"'));

  /** 一份页内快照（形态 `track`）：根上两个机器读数 ＋ 每一枚点／图例那一行的状态与屏上文字。 */
  const SNAP_TRACK = '(function(){'
    + 'var root=document.querySelector(' + ROOT_S + ');'
    + 'function list(sel){return [].slice.call(root.querySelectorAll(sel));}'
    + 'var one=function(el){return {key:el.getAttribute(' + q(REMINDER_SETTER_VALUE_ATTR) + '),'
    + 'on:el.getAttribute("aria-pressed"),cls:(el.className||"").toString(),'
    + 'at:el.getAttribute(' + q(REMINDER_SETTER_AT_ATTR) + '),'
    + 'repeat:el.getAttribute(' + q(REMINDER_SETTER_REPEAT_ATTR) + '),'
    + 'lead:el.getAttribute(' + q(REMINDER_SETTER_LEAD_ATTR) + '),'
    + 'chosen:el.getAttribute(' + q(REMINDER_SETTER_CHOSEN_ATTR) + '),'
    + 'left:el.style.left,'
    + 'time:(el.querySelector(' + AT_S + ')||{}).textContent,'
    + 'tail:(el.querySelector(' + TAIL_S + ')||{}).textContent};};'
    + 'return {picked:root.getAttribute(' + q(REMINDER_SETTER_PICKED_ATTR) + '),'
    + 'at:root.getAttribute(' + q(REMINDER_SETTER_AT_ATTR) + '),'
    + 'bound:root.getAttribute(' + q(REMINDER_SETTER_BOUND_ATTR) + '),'
    + 'sel:(root.querySelector(' + SEL_READ_S + ')||{}).textContent,'
    + 'dots:list(' + DOT_S + ').map(one),legends:list(' + LG_S + ').map(one),'
    + 'pressed:list(' + q(ATTR(REMINDER_SETTER_PART_ATTR)) + ').map(function(el){'
    + 'return el.getAttribute(' + q(REMINDER_SETTER_PART_ATTR) + ')+":"'
    + '+el.getAttribute(' + q(REMINDER_SETTER_VALUE_ATTR) + ')+"="+el.getAttribute("aria-pressed")'
    + '+(el.classList.contains("is-on")?"+on":"");}),'
    + 'evts:window.__rs};}())';
  /** 按机器键取一条（点与图例那一行都挂着同一份读数：取第一枚）。 */
  const itemOf = (st, list, key) => list.filter((x) => x.key === key)[0];

  it('形态 track：**真指针点刻度上的一枚提醒点** → 选中挪过去 ＋ 面板换成它的三个决定 ＋ 一条事件', async () => {
    await p.at(fixture('paper', TRACK, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    const before = await p.ev(SNAP_TRACK);
    assert.equal(before.picked, 'weight', '开页时选中的是入参 picked 那一条');
    assert.equal(before.at, String(20 * 60), '根上的机器读数＝选中那条落在一天里的第几分钟');
    assert.equal(before.bound, '1', '根上记一枚 bound 读数');
    assert.equal((await p.ev('window.__rs.length')), 0, '开页一条事件都不派发');
    const g = await tapAt(ITEM('pick', 'meal'));
    const st = await p.ev(SNAP_TRACK);
    console.log('reminder-setter track 点选读数 ' + JSON.stringify({
      seq: await seqOf(), picked: st.picked, at: st.at, sel: st.sel, grade: { w: g.w, h: g.h },
    }));
    assert.deepEqual(await seqOf(), ['pointerdown|meal', 'pointerup|meal', 'click|meal'],
      '真指针三条都落在被点的那一枚上');
    assert.equal(st.picked, 'meal', '选中挪到被点的那一条');
    assert.equal(st.at, String(13 * 60), '根上的机器读数换成它那一分钟');
    assert.equal(st.sel, reminderSetterClock(13 * 60), '面板里那枚读数跟着换（改的就是这一条）');
    assert.deepEqual(st.dots.filter((d) => d.on === 'true').map((d) => d.key), ['meal'],
      '刻度上只有一枚是选中的（旧的那一枚先撤）');
    assert.deepEqual(st.legends.filter((d) => d.on === 'true').map((d) => d.key), ['meal'],
      '图例那一行也挪过去（点与行是一件事的两处摆法）');
    assert.deepEqual(st.pressed.filter((x) => x.endsWith('+on') && !x.startsWith('pick:')),
      ['repeat:weekly=true+on', 'lead:m10=true+on', 'route:push=true+on'],
      '面板换成了新选中那条自己的三个决定');
    assert.deepEqual(await evtsOf(), [REMINDER_SETTER_EVENT_CHANGE + '|pick|meal'], '只派发一条事件');
    const d = await lastDetail();
    assert.equal(d.id, 'rem-day');
    assert.equal(d.value, 'meal');
    assert.equal(d.state.items.length, TRACK.items.length, '事件带的是这一天**全部**几条的读数');
    assert.deepEqual(d.state.items.filter((o) => o.id === 'weight')[0],
      { id: 'weight', at: 1200, time: '20:00', repeat: 'daily', lead: 'ontime', routes: ['push', 'feishu'] },
      '没被碰的那几条照旧念得出来');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('形态 track：**真指针点时间步进键** → 这一条的 at 走一步、刻度上那枚点跟着挪、图例与面板读数一起改', async () => {
    await p.at(fixture('paper', TRACK, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    const before = await p.ev(SNAP_TRACK);
    await tapAt(STEP('time', '1'));
    const st = await p.ev(SNAP_TRACK);
    const want = reminderSetterStepAt(20 * 60, 1, REMINDER_SETTER_TIME_STEP_MIN);
    console.log('reminder-setter track 步进读数 ' + JSON.stringify({
      at: st.at, sel: st.sel, time: itemOf(st, st.legends, 'weight').time,
      left: itemOf(st, st.dots, 'weight').left,
    }));
    assert.equal(st.at, String(want), '机器读数走一步（0–1439 那一圈里）');
    assert.equal(st.sel, reminderSetterClock(want), '面板里那枚读数＝机器读数的另一种摆法');
    assert.equal(itemOf(st, st.legends, 'weight').time, reminderSetterClock(want), '图例那一行的时刻跟着改');
    assert.notEqual(itemOf(st, st.dots, 'weight').left, itemOf(before, before.dots, 'weight').left,
      '刻度上那枚点跟着挪（位置由 at 算出来的）');
    for (const key of ['med', 'meal']) {
      assert.equal(itemOf(st, st.dots, key).left, itemOf(before, before.dots, key).left,
        '没被改的那几条点不动：' + key);
      assert.equal(itemOf(st, st.dots, key).at, itemOf(before, before.dots, key).at);
    }
    const d = await lastDetail();
    assert.equal(d.part, 'time');
    assert.equal(d.value, reminderSetterClock(want));
    assert.equal(d.state.picked, 'weight');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('形态 track：**真指针改档位与取消勾** → 写回这一条自己身上（切走再切回还在）；勾到一条不剩照实读出不会响', async () => {
    await p.at(fixture('paper', TRACK, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(ITEM('repeat', 'weekly'));
    let st = await p.ev(SNAP_TRACK);
    assert.deepEqual(st.pressed.filter((x) => x.endsWith('+on') && !x.startsWith('pick:')).slice(0, 1),
      ['repeat:weekly=true+on'], '同一排里只有被点的那一枚是选中的');
    assert.equal(itemOf(st, st.dots, 'weight').repeat, 'weekly', '改的是**这一条自己**的读数');
    assert.equal(itemOf(st, st.legends, 'weight').tail, '每周日', '图例那一行的尾一截跟着改');
    /* 切走再切回：这一条刚才改的还在（写回它自己身上，不是只改屏面）。 */
    await tapAt(ITEM('pick', 'med'));
    await tapAt(ITEM('pick', 'weight'));
    st = await p.ev(SNAP_TRACK);
    assert.equal(st.picked, 'weight');
    assert.deepEqual(st.pressed.filter((x) => x.endsWith('+on') && !x.startsWith('pick:')).slice(0, 1),
      ['repeat:weekly=true+on'], '切走再切回，刚改的那一档还在');
    /* 取消勾：把选中的这一条勾到一条不剩 ⇒ 图例那一行照实读成「没有通知，不会响」。 */
    await tapAt(ITEM('route', 'push'));
    await tapAt(ITEM('route', 'feishu'));
    st = await p.ev(SNAP_TRACK);
    assert.equal(itemOf(st, st.dots, 'weight').chosen, '', '两条通知都取消了（写回成空串）');
    assert.equal(itemOf(st, st.legends, 'weight').tail, REMINDER_SETTER_TEXT.silent,
      '勾到一条不剩 ⇒ 照实读成不会响（不是旁白，它就是现在设的是多少）');
    assert.equal(await p.ev('document.querySelectorAll('
      + q(SEL('check') + '[disabled], ' + SEL('chip') + '[disabled]') + ').length'), 0,
      '一枚按不动的控件都没有');
    /* 勾回来：尾一截回到那一档的档名。 */
    await tapAt(ITEM('route', 'app'));
    st = await p.ev(SNAP_TRACK);
    assert.equal(itemOf(st, st.legends, 'weight').tail, '每周日', '勾回来尾一截就回来');
    assert.equal(itemOf(st, st.dots, 'weight').chosen, 'app');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('形态 track：**图例那一行也是通路**（真指针点它＝改这一条）＋ 三次动作各来一条 `pointerdown`', async () => {
    await p.at(fixture('paper', TRACK, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(SEL('lg') + ATTR(REMINDER_SETTER_VALUE_ATTR + '="med"'));
    let st = await p.ev(SNAP_TRACK);
    assert.equal(st.picked, 'med', '点图例那一行同样能选中这一条');
    await tapAt(ITEM('lead', 'm10'));
    await tapAt(STEP('time', '-1'));
    st = await p.ev(SNAP_TRACK);
    const seq = await seqOf();
    console.log('reminder-setter track 真指针时序 ' + JSON.stringify(seq));
    assert.equal(seq.filter((s) => s.startsWith('pointerdown')).length, 3, '三次真指针动作各来一条 `pointerdown`');
    assert.equal((await evtsOf()).length, 3, '三次改动各派发一条事件');
    assert.equal(st.at, String(7 * 60 - REMINDER_SETTER_TIME_STEP_MIN), '减键让这一条往回走一步');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('关页', () => { p.close(); });
});

/* ── ⑥ 形态 `track`：骨架／位置由数算出／一层话／拒收／纯函数／样式形 ─────────── */

describe('reminder-setter ⑥ 形态 track（一天刻度上摆点）', () => {
  const html = renderReminderSetter(TRACK);

  it('骨架：一天那条刻度（点 ＋ 小时数 ＋ 图例）＋ 选中那条的三个决定；**没有抬头、没有复述那一行**', () => {
    assert.match(html, new RegExp('^<div class="' + REMINDER_SETTER_CLASS + ' ' + SLOT('host') + ' is-track"'),
      '根上那个形态键是老档键之外新加的那个（一个字都不许改老档的）');
    assert.ok(html.includes(REMINDER_SETTER_FORM_ATTR + '="track"'), '形态照实写进标记');
    assert.ok(html.includes(REMINDER_SETTER_PICKED_ATTR + '="weight"'), '根上写清现在改的是哪一条');
    assert.ok(html.includes(REMINDER_SETTER_AT_ATTR + '="' + String(20 * 60) + '"'),
      '根上那枚机器读数＝选中那条落在一天里的第几分钟');
    assert.equal(html.includes(CLS('head')), false, '这一档没有抬头（用户砍过字那一版）');
    assert.equal(html.includes(CLS('read')), false, '这一档没有复述那一行（图例那一行就是「现在设的是多少」）');
    for (const slot of ['day', 'ruler', 'dot', 'hours', 'legend', 'lg', 'pick']) {
      assert.ok(html.includes(SLOT(slot)), '这一档缺了槽位：' + slot);
    }
    for (const h of REMINDER_SETTER_HOURS) assert.ok(html.includes('<span>' + String(h) + '</span>'),
      '刻度下面缺了小时数：' + String(h));
    /* 三行决定（重复／提前多久／通知）＋ 「时间」那一行＝4 行；可点件＝点×n ＋ 图例×n ＋ 三排 ＋ 两枚步进键。 */
    assert.equal(countOf(html, REMINDER_SETTER_ROW_ATTR), REMINDER_SETTER_PARTS.length + 1);
    assert.equal(countOf(html, '<button'), TRACK.items.length * 2 + REPEATS.length + LEADS.length + ROUTES.length + 2,
      '按钮总数＝刻度上的点 ＋ 图例 ＋ 三排可点项 ＋ 两枚步进键，不许再多');
    assert.equal(countOf(html, '<button'), countOf(html, '</button>'), '按钮必须成对');
    assert.equal(html.includes('<input'), false, '本件没有输入框：打字不是通路');
    assert.equal(/<script|onclick=/i.test(html), false, '标记里不带脚本');
    /* 屏上顺序＝刻度上的先后：入参倒着给也排成 07:00 → 13:00 → 20:00。 */
    const keysOf = (h) => [...h.matchAll(new RegExp(REMINDER_SETTER_PART_ATTR + '="pick"[^>]*'
      + REMINDER_SETTER_VALUE_ATTR + '="([a-z]+)"', 'g'))].map((m) => m[1]);
    assert.deepEqual([...new Set(keysOf(html))], ['med', 'meal', 'weight']);
    assert.deepEqual([...new Set(keysOf(renderReminderSetter(TRACK_SHUFFLED)))], ['med', 'meal', 'weight'],
      '件自己按 at 升序排（调用方不用先排）');
    /* 序号：刻度上那枚徽章与图例那一行印的是同一个号（两处对得起来）。 */
    for (let i = 0; i < TRACK.items.length; i += 1) {
      assert.ok(html.includes('<b>' + String(i + 1) + '</b>'), '第 ' + String(i + 1) + ' 条的序号没上屏');
    }
  });

  it('位置由 `at` 算出来：刻度上那枚点的 `left`／图例那一刻／根上那一分钟，三处同一个数', () => {
    for (const item of TRACK.items) {
      assert.ok(html.includes('* ' + String(reminderSetterPlace(item.at)) + ' + '),
        '这一条的点没按 place 摆：' + String(item.at));
      assert.ok(html.includes('>' + reminderSetterClock(item.at) + '<'),
        '这一条的时刻没上屏：' + reminderSetterClock(item.at));
      assert.ok(html.includes(REMINDER_SETTER_AT_ATTR + '="' + String(item.at) + '"'), '这一条的机器读数不在');
    }
    /* 两端各让出半个命中盒：落点写成 `calc((100% - 44px) * place + 22px)`（窄档最左／最右不顶出刻度条）。 */
    assert.ok(html.includes('left: calc((100% - ' + String(REMINDER_SETTER_TOUCH_PX) + 'px) * '),
      '点没按「两端各让半个命中盒」摆');
    assert.equal(reminderSetterPlace(0), 0, '0 点摆在刻度最左端');
    assert.equal(reminderSetterPlace(REMINDER_SETTER_DAY_MIN), 1, '一天到头摆在刻度最右端');
    /* 位置只印一处：**没被选中的那两条**的时刻在屏上只出现一次（图例那一行）。 */
    assert.equal(countOf(html, '>' + reminderSetterClock(7 * 60) + '<'), 1);
    assert.equal(countOf(html, '>' + reminderSetterClock(13 * 60) + '<'), 1);
  });

  it('**一屏只留一层话**：原型里的旁白与口径句一句都不上屏；同一个数只印一次', () => {
    const seen = visibleText(renderReminderSetter(TRACK)) + visibleText(renderReminderSetter(TRACK_SILENT));
    for (const narration of ['选中：', '先认点', '再改这个点', '落在哪儿', '一天里', '可多选', '至少留一条',
      '全关掉这条提醒就不存在', '免打扰', '会顺延', '设完是这样', '个决定']) {
      assert.equal(seen.includes(narration), false, '屏上出现了原型的旁白／口径句：' + narration);
    }
    /* 选中那条的时刻在屏上两处：图例那一行（读数）＋ 步进键中间那枚（控件自身的读数）。
       根上那枚是机器读数（不上屏）。再写一行复述就是第三处——用户砍掉的正是那一句。 */
    assert.equal(countOf(html, '>' + reminderSetterClock(20 * 60) + '<'), 2,
      '选中那条的时刻印了两处（读数 ＋ 控件读数）');
    assert.equal(renderReminderSetter(TRACK_SILENT).includes('>' + REMINDER_SETTER_TEXT.silent + '<'), true,
      '一条通知都没勾那一条：图例那一行照实读成那句状态');
  });

  it('入参违规一律拒（`track` 那一支：items／picked／at／档位键，逐条断 `BlocksError`）', () => {
    const B = (input) => throwsBlocks(() => renderReminderSetter(input));
    const T = () => ({ ...TRACK, items: TRACK.items.map((o) => ({ ...o })) });
    assert.equal(B({ ...T(), items: undefined }), true, '缺 items');
    assert.equal(B({ ...T(), items: 'x' }), true, 'items 不是数组');
    assert.equal(B({ ...T(), items: TRACK.items.slice(0, 1) }), true, '不到 '
      + String(REMINDER_SETTER_MIN_ITEMS) + ' 条');
    assert.equal(B({
      ...T(),
      items: Array.from({ length: REMINDER_SETTER_MAX_ITEMS + 1 }, (_, i) => ({
        id: 'k' + String(i), label: '提' + String(i), at: i * 300, repeat: 'daily', lead: 'ontime', chosen: ['push'],
      })),
    }), true, '超过 ' + String(REMINDER_SETTER_MAX_ITEMS) + ' 条');
    assert.equal(B({ ...T(), items: [null, TRACK.items[1]] }), true, '条目不是对象');
    assert.equal(B({ ...T(), items: [{ ...TRACK.items[0], bogus: 1 }, TRACK.items[1], TRACK.items[2]] }), true,
      '条目里多给一个键');
    assert.equal(B({ ...T(), items: [{ ...TRACK.items[0], id: 'a b' }, TRACK.items[1], TRACK.items[2]] }), true,
      'id 有非标识符字符');
    assert.equal(B({ ...T(), items: [{ ...TRACK.items[0], id: NaN }, TRACK.items[1], TRACK.items[2]] }), true,
      'id 是 NaN');
    assert.equal(B({ ...T(), items: [{ ...TRACK.items[0], label: '   ' }, TRACK.items[1], TRACK.items[2]] }), true,
      '提醒名全空白');
    assert.equal(B({ ...T(), items: [{ ...TRACK.items[0], label: '\u200b' }, TRACK.items[1], TRACK.items[2]] }), true,
      '提醒名全是零宽字符（那在屏上就是一块空白）');
    /* `at`：两道闸（非有限即拒／可加性上界）＋ 「改得到」那一闸（整数、在一天之内、踩在步进键那一档上）。 */
    for (const bad of [NaN, Infinity, -Infinity, 1e308, -1e308, '420', undefined]) {
      assert.equal(B({
        ...T(), items: [{ ...TRACK.items[0], at: bad }, TRACK.items[1], TRACK.items[2]],
      }), true, 'at 是 ' + String(bad));
    }
    for (const bad of [-1, REMINDER_SETTER_DAY_MIN, 24 * 60 + 5, 421, 7.5]) {
      assert.equal(B({
        ...T(), items: [{ ...TRACK.items[0], at: bad }, TRACK.items[1], TRACK.items[2]],
      }), true, 'at 落到改不到的那一档上：' + String(bad));
    }
    assert.equal(B({
      ...T(), items: [TRACK.items[0], { ...TRACK.items[1], at: TRACK.items[0].at }, TRACK.items[2]],
    }), true, '两条落在同一分钟（两枚点的命中盒会叠）');
    assert.equal(B({
      ...T(), items: [{ ...TRACK.items[0], id: 'meal' }, TRACK.items[1], TRACK.items[2]],
    }), true, 'id 重了');
    assert.equal(B({
      ...T(), items: [{ ...TRACK.items[0], repeat: 'nope' }, TRACK.items[1], TRACK.items[2]],
    }), true, '这一条选的重复档不在 repeats 里');
    assert.equal(B({
      ...T(), items: [{ ...TRACK.items[0], lead: 'nope' }, TRACK.items[1], TRACK.items[2]],
    }), true, '这一条选的提前档不在 leads 里');
    assert.equal(B({
      ...T(), items: [{ ...TRACK.items[0], chosen: 'push' }, TRACK.items[1], TRACK.items[2]],
    }), true, 'chosen 不是数组');
    assert.equal(B({
      ...T(), items: [{ ...TRACK.items[0], chosen: ['nope'] }, TRACK.items[1], TRACK.items[2]],
    }), true, '勾上的键不在 routes 里');
    assert.equal(B({
      ...T(), items: [{ ...TRACK.items[0], chosen: ['push', 'push'] }, TRACK.items[1], TRACK.items[2]],
    }), true, '同一条通知勾两次');
    assert.equal(B({ ...T(), picked: undefined }), true, '缺 picked');
    assert.equal(B({ ...T(), picked: 'nope' }), true, 'picked 不在 items 里');
    assert.equal(B({ ...T(), picked: 1 }), true, 'picked 不是字符串');
    assert.equal(B({ ...T(), item: [] }), true, '顶层写错键名（items 写成了 item）');
    assert.equal(B({ ...T(), pick: 'med' }), true, '顶层写错键名（picked 写成了 pick）');
    const sparse = TRACK.items.map((o) => ({ ...o }));
    sparse.length = REMINDER_SETTER_MAX_ITEMS;
    assert.equal(B({ ...T(), items: sparse }), true, 'items 有空洞');
    /* 入参表是**两档的并集**：老档那几个键给在 `track` 形态下不拒（只是这一档不读它们）。 */
    assert.equal(B({ ...T(), time: '22:30' }), false, '老档的 time 给在这儿不拒');
    assert.equal(B({ ...T(), title: '记体重' }), false, '老档的 title 给在这儿不拒');
  });

  it('四个纯函数的口径：分钟 ↔ 时刻、位置比例、跨零点绕回、一条通知都没勾时换那一句', () => {
    assert.equal(reminderSetterClock(0), '00:00');
    assert.equal(reminderSetterClock(7 * 60), '07:00');
    assert.equal(reminderSetterClock(23 * 60 + 55), '23:55');
    assert.equal(reminderSetterClock(REMINDER_SETTER_DAY_MIN), '00:00', '一天到头绕回 0 点');
    assert.equal(reminderSetterPlace(0), 0);
    assert.equal(reminderSetterPlace(12 * 60), 0.5);
    assert.equal(reminderSetterPlace(REMINDER_SETTER_DAY_MIN), 1);
    assert.equal(reminderSetterStepAt(23 * 60 + 55, 1, REMINDER_SETTER_TIME_STEP_MIN), 0, '跨零点绕回');
    assert.equal(reminderSetterStepAt(0, -1, REMINDER_SETTER_TIME_STEP_MIN), 23 * 60 + 55);
    assert.equal(reminderSetterTrackTail('每天', 1, REMINDER_SETTER_TEXT), '每天');
    assert.equal(reminderSetterTrackTail('每天', 0, REMINDER_SETTER_TEXT), REMINDER_SETTER_TEXT.silent,
      '一条通知都没勾那一支只有这一处口径');
  });

  it('样式：选中那一条三样一起变（形／字／色）；零省略手段；容器判宽；运行时段认得同一套词', () => {
    const clean = stripComments(reminderSetterCss());
    assert.ok(new RegExp(re(SLOT('dot')) + '\\.is-on\\s*>\\s*i\\s*\\{[^}]*outline: 2px solid ' + re(skinVar('accent')))
      .test(clean), '选中那枚点没有那一圈描边（形那一半）');
    assert.ok(new RegExp(re(SLOT('dot')) + '\\.is-on\\s*>\\s*i\\s*\\{[^}]*background: ' + re(skinVar('accent')))
      .test(clean), '选中那枚点不是主色实底');
    assert.ok(new RegExp(re(SLOT('lg')) + '\\.is-on\\s*\\{[^}]*font-weight: 700').test(clean),
      '选中那一条的图例没有加粗（字那一半）');
    assert.ok(new RegExp(re(SLOT('lg')) + '\\.is-on\\s*\\{[^}]*border-bottom-color: ' + re(skinVar('accent')))
      .test(clean), '选中那一条的图例那道线没换主色');
    assert.ok(clean.includes('background-size: calc(100% / ' + String(REMINDER_SETTER_DAY_MIN / 60) + ')'),
      '刻度线不是按格宽铺的（摆 24 个元素是另一条路，本件不摆）');
    for (const bad of ['text-overflow', 'line-clamp', 'nowrap', 'overflow-x']) {
      assert.equal(clean.includes(bad), false, '这一档出现了 ' + bad);
    }
    const js = buildReminderSetterJs();
    assert.ok(js.includes('is-on'), '运行时段不认识渲染期用的状态词');
    assert.ok(js.includes(reminderSetterClock.toString()), '时刻那条口径取自渲染期那个函数');
    assert.ok(js.includes(reminderSetterPlace.toString()), '位置那条口径取自渲染期那个函数');
    assert.ok(js.includes(reminderSetterStepAt.toString()), 'at 步进那条口径取自渲染期那个函数');
    assert.ok(js.includes(reminderSetterTrackTail.toString()), '图例尾一截那条口径取自渲染期那个函数');
    assert.equal(/addEventListener\("key/.test(js), false, '这一档也不许把键盘做成通路');
    assert.ok(clean.includes('@container ' + REMINDER_SETTER_CONTAINER + ' (max-width:'), '这一档也走容器判宽');
    assert.equal(/'@media \((?:max|min)-width/.test(reminderSetterCss()), false, '一条视口宽度查询都不许有');
  });
});
