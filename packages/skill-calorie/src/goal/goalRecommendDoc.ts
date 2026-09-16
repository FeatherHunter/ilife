/** #589 · 目标推荐整页装配（`calorie.view.goal-recommend`：按档案与目标方向算的推荐值 ＋ 依据）。
 *
 * 改前这条命令走 `src/render/html.ts::renderGoalRecommendHtml` 的旧片段——产物以
 * `<section class="ilife-page" …>` 起头、**没有文档骨架**（#256 锁票探针第 26 条；本票改前复测
 * 1968 B，读数与前后对照见 `docs/skills/skill-calorie/t589-推荐页-证据.md` §一／§二）。
 *
 * 本件照**目标域同族装配**（`docs/skills/skill-calorie/t290-后半-证据.md` 的 `./resultDocs.ts` 那套：
 * #561 之后的八样＝页框／页头（唤醒词一行 ＋ 类型徽章）／含本页读数的结论句／页内导航／读数卡与表／
 * 口径行／复制区双按钮）。**不另起第二套**：`cardOf`／`section`／`tailOf` 三个小件从 `./resultDocs.ts`
 * 引入（同目录内互相用，按 `docs/agents/structure.md` 铁律五「目录内互相用的不算对外面」，该件的对外
 * 五个名字不变）；本件只写这一页的版式。
 *
 * 取数一行不动：本件只吃 `read.ts` 现算的 `GoalRecommend` 与它现算的 `metrics`（票面「推荐数
 * （cut：TDEE／2064／141／57／246／2471）与当刻一致」）——`metrics` 只进复制载荷，本件不另算一个数。
 *
 * 命令名、路由、`WAKE_TABLE`、HELP 卡片归属一字不动（`src/goal/routes.ts:37` 的 exec 行、
 * `src/triggers/help-lookup.ts:69`、生成物 `src/triggers/routes.generated.ts` 都不碰）。
 * 旧片段 `renderGoalRecommendHtml` 按票面留在 `src/render/html.ts:262`——**只出台账不删**（台账见证据 §六）。
 *
 * 对外一个名字：`buildGoalRecommendDoc`（本件只给这一页；装配面不出目标目录）。
 */
import { renderCaliberLine, renderDataTable, renderDisclosure, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { humanText } from '../render/trendDocs.js';
import type { GoalRecommend } from './goalPlates.js';
import { cardOf, section, tailOf } from './resultDocs.js';

/** head 的 `<title>`：与目标域各页同值（`DOC_TITLE` 口径冻结对齐 `cli/keys.ts` 的域标题）。 */
const DOC_TITLE = '卡路里·目标管理';
/** 本页命令键：与路由层那条 exec 行逐字同键（复制日志第 4 段要能照抄重跑）。 */
const CMD_KEY = 'calorie.view.goal-recommend';
/** 数据来源（复制日志第 3 段后半）：本页只读这三处；#561 起正文不再出页脚来源行，日志里仍留得住。 */
const COPY_SOURCE = '档案＋体重记录＋营养目标表';

/** 自洽差值带符号（`+3`／`-3` 一眼看得出方向；差 0 不写符号）。 */
function signed(v: number): string {
  return (v > 0 ? '+' : '') + v;
}

/** 结论句（§五 第 3 行）：句内只摆本页读得出来的数，不编新日期、不编比率。 */
function recommendSummary(g: GoalRecommend): string {
  const r = g.recommend;
  return '结论：' + r.profileLabel + '档按体重 ' + r.basis.weightKg + ' kg 算出每日热量目标 ' + r.calorieGoal
    + ' 卡（蛋白 ' + r.proteinGoal + ' g／碳水 ' + r.carbsGoal + ' g／脂肪 ' + r.fatGoal + ' g），饮水推荐 '
    + r.waterGoal + ' ml，宏量折算 ' + r.selfCheck.calculatedKcal + ' 卡、与热量目标差 '
    + signed(r.selfCheck.diffKcal) + ' 卡。';
}

/** 目标推荐整页：读数卡 ＋ 算法口径表 ＋ 计算依据（数据层原句归一后逐行）＋ 口径与复制尾。
 *
 *  `command`＝可照抄重跑的命令原文（由 `read.ts` 按本次 `profile` 现拼）；`metrics`＝同一份信封读数。 */
export function buildGoalRecommendDoc(g: GoalRecommend, metrics: Record<string, number>, command: string): string {
  const r = g.recommend;
  const sc = r.selfCheck;
  const consistent = Math.abs(sc.diffKcal) <= 50;
  const body = [
    renderTocBlock({ items: [
      { id: 'sec-readings', text: '读数' },
      { id: 'sec-calc', text: '算法口径' },
      { id: 'sec-basis', text: '计算依据' },
    ] }),
    section('sec-readings', renderKpiGrid([
      { label: '方案', value: r.profileLabel, detail: '按档案与目标方向算' },
      cardOf('热量目标', r.calorieGoal, '卡', '每周 ' + r.weeklyRateKg + ' kg'),
      cardOf('蛋白目标', r.proteinGoal, 'g'),
      cardOf('碳水目标', r.carbsGoal, 'g'),
      cardOf('脂肪目标', r.fatGoal, 'g'),
      cardOf('饮水目标', r.waterGoal, 'ml', g.water.basis),
    ])),
    section('sec-calc', renderDataTable({
      columns: [
        { key: 'item', label: '项目' },
        { key: 'reading', label: '读数', align: 'right' },
        { key: 'note', label: '说明' },
      ],
      rows: [
        { item: '基础代谢', reading: r.bmr + ' 卡', note: '按身高／体重／年龄／性别算' },
        { item: '每日基准消耗', reading: r.tdee + ' 卡', note: '基础代谢 × 活动量系数' },
        { item: '体重', reading: r.basis.weightKg + ' kg', note: '取最新一条体重记录' },
        { item: '宏量折算热量', reading: sc.calculatedKcal + ' 卡', note: '蛋白×4 ＋ 碳水×4 ＋ 脂肪×9' },
        { item: '与热量目标差', reading: signed(sc.diffKcal) + ' 卡', note: consistent ? '50 卡以内算自洽' : '超过 50 卡，建议复核' },
      ],
      caption: '这一版推荐是按什么算出来的',
      emptyText: '暂无口径可印',
    })),
    /* 计算依据＝数据层 `planReasons` 原句，上屏归一（`humanText`：英文缩写换人话，见 #160）后逐行；
       同族先例＝`src/goal/receipt.ts:282`（`r.planReasons.map(renderCaliberLine)`）。 */
    section('sec-basis', renderDisclosure({
      title: '计算依据',
      contentHtml: r.planReasons.map((s) => renderCaliberLine(humanText(s))).join(''),
      open: true,
    })),
    tailOf(CMD_KEY, metrics, command, COPY_SOURCE, [
      '体重取最新一条记录，身高／年龄／性别取自档案；缺一样先补档案与体重记录，再看这一页。',
      '这一页只算不写：采纳要走「定营养目标」「定饮水目标」这类写命令，写前还会出一张预检页。',
      '宏量折算按蛋白 4 卡／碳水 4 卡／脂肪 9 卡，差值在 50 卡以内算自洽。',
    ]),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    /* #566 口径：H1 只留页面名；方案名在下面「方案」那张卡上，不在标题里复读。 */
    title: '🎯 目标推荐',
    eyebrow: '',
    subtitle: null,
    metaLeft: '看目标推荐 · 目标管理',
    badge: '目标推荐',
    summary: recommendSummary(g),
    content: body,
    charts: false,
  });
}
