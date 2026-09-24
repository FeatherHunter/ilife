/** #370 · 主页整页装配的归位件（HELP 一级分组「主页」下一级「看今日主页」）。
 * 沿革（每票一行；逐条证据与读数见 `docs/skills/skill-calorie/t401-样板-文本结构-证据.md`）：
 * #370 自 `src/render/html.ts` **逐字迁入** `renderHomeHtml`（纯搬迁）——旧片段只给 `render-t8` 锁形状。
 * #371 新增 `buildHomeDoc`（结果型完整文档，经 `assembleDocPage` 包裹、复用 `copyArea`、不自造模板）；
 *   live 出口（`src/home/today.ts` 的 `calorie.view.home`）走它。
 * #375 横幅返修：提示 toast 原样；复制区去掉与按钮同字的标题并补 `log`，双按钮同行、日志命令补全窗口参数。
 * #401 ① 深底提示条退场（`notice()` 是瞬时浮层，当常驻块用就是错位）⇒ 那句结论保留成贴副题行的一行小字，
 *   读序＝标题 → 一句结论 → 数字卡；② 折线跨空白日连线（`connectNulls: true`，同 #160 另外 4 处口径；
 *   无记录日仍是 `null`、不补 0）。裁决见 `t401-融合设计.md` 第三节冲突 4。
 * #401c 整页融合返修（**本页先做样板，其余 8 页认可后再铺**）：① **文本纪律**（`t425-融合基准.md:129`
 *   「参数名、常量名、英文内部标识符一律不上屏」）——眉标不印命令键、表头不印 `TDEE`、卡说明不印算式，
 *   换成读者看得懂的中文，判据见 `test/t401c-页面机器话探针.test.mjs`；② **版面单源**（版面源只在
 *   `packages/base-render/`）：生产出口一律走公共层产出器，本页不写 `font-size`／`color`。
 * #401m · **按视图分**：本件由「一页四块」改成按 `section` 逐档拼页——正文区块、页名、结论句全随档变。
 *   分档内容件住同目录姊妹件 `homeViewParts.ts`；本件留「页框接线 ＋ 复制区」。
 * #401 缺陷 6（用户 2026-09-15「『💰 数据与日志』直接删」）：复制区不出标题、导航不再收 `sec-copy`。
 * #560 屏上来源脚注整行撤（用户 2026-09-15：「所有 HTML 页面底部的『数据来源：xxx』都删掉」）。
 *
 * **#950 · 主页照已认可原型重做（用户裁定：完全按照 `proto-final-A+C.html` 把效果做出来）**：
 * 页框那一段的读序改成原型的读序，五档共用——
 *   ① **态声明条**（「目标暂停中」，只在暂停时出）→ ② **结论条**（判语，仍是 #507 那件）
 *   → ③ **分段导航**（动作形，取代原先的胶囊排）→ ④ **记录带**（哪几天有记录，取代原先那三枚页头胶囊）
 *   → ⑤ 各档正文 → ⑥ 复制区。
 * 原先那条「主页／有记录 N/M 天／连续记录 N 天」的裸胶囊行随之退场：窗口那几件事实落进记录带，
 * 一处说一次。卡件与算式条搬去姊妹件 `homeCards.ts`，页框三件搬去 `homeFrame.ts`（本件此前贴着 350 行
 * 告警线，搬完留整页装配与复制区接线）。原型是**手写草图**，只定信息架构与形状；产物仍由本件的产出器出。
 */
import { cx, escapeHtml, token } from 'base-paint';
import { renderConclusionBar, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import type { HomeData } from './home.js';
import { fmt, streakCards, todayGridHtml, weekCards } from './homeCards.js';
import { dayStripBlock, navBlock, stateBannerBlock } from './homeFrame.js';
import { HOME_VIEW_BODIES, viewConclusion, viewTitle } from './homeViewParts.js';
import type { HomeSection } from './homeViewParts.js';

/* ── #370 老片段页（`renderHomeHtml`）：只给 `render-t8` 锁形状，live 出口不走它 ──────────────
 * 本段是 #370 的纯搬迁物，与主页那套按档拼页的装配**分住两路**（`render-t8.test.mjs` 逐字锁着它），
 * 主页改造不动这里一个字。 */

function pageShell(skill: string, slot: string, title: string, body: string): string {
  return (
    '<section class="' + cx('page') + '" data-skill="' + escapeHtml(skill) + '" data-slot="' + escapeHtml(slot) + '"' +
    ' style="background:' + token('bg') + ';color:' + token('fg') + ';border:1px solid ' + token('border') +
    ';border-radius:' + token('radius') + 'px;padding:' + token('gap') + 'px;font-size:' + token('fontSize') + 'px">' +
    '<h1 class="' + cx('title') + '" style="color:' + token('fg') + '">' + escapeHtml(title) + '</h1>' + body + '</section>'
  );
}

function kpi(label: string, value: string, sub?: string): string {
  return (
    '<div class="' + cx('kpi') + '" style="border:1px solid ' + token('border') + ';border-radius:' + token('radius') + 'px">' +
    '<span class="' + cx('kpi-label') + '" style="color:' + token('muted') + '">' + escapeHtml(label) + '</span>' +
    '<b class="' + cx('kpi-value') + '">' + escapeHtml(value) + '</b>' +
    (sub ? '<span class="' + cx('kpi-sub') + '" style="color:' + token('muted') + '">' + escapeHtml(sub) + '</span>' : '') + '</div>'
  );
}

function bar(label: string, pct: number | null): string {
  const p = pct === null || pct === undefined ? '未设目标' : pct + '%';
  const w = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
  return (
    '<div class="' + cx('bar') + '"><span style="color:' + token('muted') + '">' + escapeHtml(label) + ' ' + escapeHtml(p) + '</span>' +
    '<div style="background:' + token('border') + ';border-radius:' + token('radius') + 'px">' +
    '<div style="width:' + w + '%;background:' + token('accent') + ';border-radius:' + token('radius') + 'px">&nbsp;</div></div></div>'
  );
}

function legacyFmt(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return '—';
  return String(n) + suffix;
}

export function renderHomeHtml(d: HomeData): string {
  const t = d.daily.totals;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('今日摄入', legacyFmt(t.cal, ' 卡'), '目标 ' + legacyFmt(d.calorieGoal, ' 卡')) +
    kpi('蛋白', legacyFmt(t.pro, ' g')) +
    kpi('饮水', legacyFmt(d.daily.waterMl, ' ml'), '目标 ' + legacyFmt(d.waterGoal, ' ml')) +
    kpi('今日缺口', legacyFmt(d.deficitToday, ' 卡'), '正=缺口') +
    kpi('连续记录', d.streakDays + ' 天', '近' + d.week.loggedDays + '天有记录') +
    kpi('周均摄入', legacyFmt(d.week.avgIntake, ' 卡'), d.week.start + ' ~ ' + d.week.end) +
    '</div>' +
    bar('热量完成度', d.caloriePct) + bar('蛋白完成度', d.proteinPct) + bar('饮水完成度', d.waterPct) +
    (d.daily.overCal
      ? '<div class="' + cx('warn') + '" style="color:' + token('danger') + '">今日已超热量目标</div>'
      : '<div class="' + cx('ok') + '" style="color:' + token('accent') + '">热量在目标内</div>');
  return pageShell('calorie', 'ilife:calorie', '今日总览 ' + d.date, body);
}

/* ── #371 · 主页完整文档（按唤醒词的 `section` 分档）── */

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #401 债 #1：原为 `卡路里·主页`（与眉标两种写法）→ 统一成「产品名＋空格＋页名」，不带 `·`：
 *  `·` 是「用符号挡 UI」，且分隔符探针把 `<title>` 文本也算可见文本。 */
const DOC_TITLE = '卡路里 主页';

/** envelope 头（值冻结对齐 `cli/keys.ts` ENVELOPE_VERSION 与 CALORIE_SKILL）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 页头眉标（人话）：**只留产品名**（`t425` 裁定 1 禁上屏英文内部标识符，故不印命令键）。
 *  #401 债 #2：原 `卡路里 · 主页` 用 `·` 并排了「谁的产品」与「哪一页」；页面身份改由页内内容承担。 */
const HOME_EYEBROW = '卡路里';

/** 复制区落点锚（`sec-copy`）：用户缺陷 6（2026-09-15）「有『💰 数据与日志』文字的直接删，
 *  用户直接看得见按钮」⇒ 本页复制区**不出标题**（`copyArea` 不传 `title`，公共层即不出 `<h2>`），
 *  页内导航也不再收这一项（无标题的区不进导航）。`id` 保留：外链深跳稳定，且各档 `body.toc` 不含它，
 *  导航与标题「同源」口径仍成立（导航项 ⟺ 有标题的区）。目标进度页的同名标题归 #467 定。 */
const SEC_COPY = { id: 'sec-copy' } as const;

/** 来源脚注上给**读者看**的来源名：可见文本零 snake_case（库表名只留在复制日志的「来源」段里，那是给复核
 *  的人照抄用的技术原件，不上页面——同 `render/sportDocs.ts:54-57` 口径）。#401 分隔符债 #8：三件来源
 *  **不再用 `＋` 串**，改用行文逗号，三件来源仍在一句话里读得完。 */
const SOURCE_LOGGED = '饮食记录，运动记录，每日目标';

/** 单日日期上屏只有一种长法：`09-07`（窗口跨年才补两位年份，同 `analysis/multiTrendPage.ts:145-152`）。
 *  表内日期、图轴刻度、记录带的格子**同走本函数**（同一语义一处实现 ⇒ 页上日期写法从三种降到两种）。
 *  窗口区间不在此列：它是**窗口标识**（跨年要读得出年份、要与复制载荷对得上），页头一处写 ISO。 */
function dayLabel(start: string, end: string): (date: string) => string {
  const crossYear = start.slice(0, 4) !== end.slice(0, 4);
  return (date: string): string => (crossYear ? date.slice(2) : date.slice(5));
}

/** 页头副题：**只写窗口**——窗口区间全页只在这里出现一次（#401 冗余 R2）；#401e 区间连接用「至」不用 `~`。
 *  #401g：区间保持 ISO 长法（它是**窗口标识**：跨年读得出年份、与复制载荷里的命令对得上），
 *  单日那几处（表内／图轴／记录带）另走 `dayLabel` 的 `MM-DD`——页上日期写法因此只剩这两种，各有其位。 */
function subtitleText(d: HomeData): string {
  return d.week.start + ' 至 ' + d.week.end;
}

/** 复制载荷里的**命令原文**：窗口非缺省 7 天时把窗口写全，`section` 逐档照写——照抄重跑得到同一张页
 *  （逐字照 `home/routes.ts` 的声明形状；缺省档位也要写全，读者才看得出这页是哪一档出的）。 */
function homeCommand(windowDays: number, section: HomeSection): string {
  return 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"'
    + (windowDays === 7 ? '' : ',"windowDays":' + windowDays) + ',"section":"' + section + '"}\'';
}

/** `calorie.view.home` · 结果型完整文档（`<!doctype html>` 起）：按 `section` 逐档拼页。
 *  页框读序＝态声明条 → 结论条 → 分段导航 → 记录带 → 本档正文 → 复制区（#950，见件头）。
 *  结论条形状全在公共层（#507），本页只传文本；`#401g` 去掉句首 💡——emoji 全页只留段标题一处。 */
export function buildHomeDoc(d: HomeData, section: HomeSection = 'overview'): string {
  const windowDays = d.week.windowDays;
  const t = d.daily.totals;
  const day = dayLabel(d.week.start, d.week.end);
  const body = HOME_VIEW_BODIES[section]({
    d,
    todayCards: todayGridHtml(d),
    weekCards: renderKpiGrid(weekCards(d)),
    streakCards: renderKpiGrid(streakCards(d)),
    budgetCards: todayGridHtml(d, {
      label: '剩余预算', value: fmt(d.calorieGoal === null || d.calorieGoal === undefined
        ? null
        : d.calorieGoal - t.cal),
      detail: '目标减已摄入',
    }),
    day,
  });
  // #401 · 这里原有一条 `notice({…})` 深底提示条，已撤（裁决见件头与 `t401-融合设计.md` 第三节冲突 4）。
  // #375 · 复制区：不给与按钮同字的 `title`；`data`（业务数据文本）＋ `log`（运行日志文本）双双在场＝双按钮同行。
  // 日志第 4 段写「本页命令原文」：窗口与 `section` 都写全，照抄重跑得到同一张页（逐字照 `home/routes.ts`）。
  const homeMetrics = metricsOf({
    calorieGoal: d.calorieGoal, waterGoal: d.waterGoal,
    caloriePct: d.caloriePct, proteinPct: d.proteinPct, waterPct: d.waterPct,
    deficitToday: d.deficitToday, streakDays: d.streakDays,
    intakeCal: t.cal, proteinG: t.pro, carbsG: t.carbs, fatG: t.fat,
    waterMl: d.daily.waterMl, entryCount: d.daily.entryCount,
    avgIntake: d.week.avgIntake, avgDeficit: d.week.avgDeficit, loggedDays: d.week.loggedDays,
  });
  const copy = copyArea({
    // 用户缺陷 6：复制区不出标题（按钮自己会说话）；`title` 位空着，公共层即不出 `<h2>`。
    // #950：原型在按钮排上方有一行说明（「复制后粘回对话…」）——公共层 `renderCopyBlock` 早有这一位
    // （#870 的说明行），本包的门外壳此前没透出，这一票补上（`copyArea` 的 `hint` 位），文本照原型逐字。
    hint: '复制后粘回对话，可继续追问或换窗口重算。',
    data: {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.home',
        data: { metrics: homeMetrics },
      },
    },
    log: {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.home',
        data: { metrics: homeMetrics },
      },
      copyLog: copyLog({
        command: homeCommand(windowDays, section),
        source: SOURCE_LOGGED + '（只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    },
  });
  // 页内导航走公共层 `renderSegmentedNav`（#950：动作形 vs 状态形，见 `pageNav` 件头）：等宽分格 ＋ 选中实底
  // ＋ 每格一枚图标；锚点清单与正文各 `id` 逐字同源（本档那一份由姊妹件给），不手抄第二份。当前项＝本档
  // 导航的第一块（那一块就是这一页的主角区）。
  // 记录带 `renderDayStrip`（#950）：窗口里哪几天有记录画成一格一天，带下四条窗口事实——原先那三枚页头
  // 胶囊（「有记录 N/M 天」「连续记录 N 天」）随之退场，同一件事实一页只说一次。
  // #507：结论条走公共层 `renderConclusionBar`；态声明条走 `renderStateBanner`（态与结论分住两件）。
  const content = [
    stateBannerBlock(d),
    renderConclusionBar(viewConclusion(section, d)),
    navBlock(body.toc, body.toc[0]?.id),
    dayStripBlock(d, day),
    body.sections.join(''),
    '<section id="' + SEC_COPY.id + '">' + copy + '</section>',
    // #560 · 屏上来源脚注整行撤（用户裁决原文：「用户 2026-09-15 点名：所有 HTML 页面底部的「数据来源：xxx」都删掉」
    // （用户直接看得见按钮与内容，不需要脚注复读来路）。」）。复制载荷 `copyLog.source` 一律保留，只删屏上脚注。
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: viewTitle(section, d),
    eyebrow: HOME_EYEBROW,
    subtitle: subtitleText(d),
    content,
    charts: body.charts, pageUi: true,
  });
}
