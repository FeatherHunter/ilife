/** 饮食能力的子功能「看营养」（HELP 场景 02「饮食」下一级 diet_5）：营养配比／营养素深度／
 * 批量导入预览／营养表识别确认。
 *
 * #315 纯搬迁：三个处理体**逐字搬自** `src/cli/cmd_read.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `diet/nutritionPort.ts`，装配走同名 `*Docs.ts` 的公开接口。
 * 三条声明住 `./commands.ts`；对外只经 `./index.ts`。
 *
 * #275 · **两态分清**（`t425` 裁定 4 的 2026-09-15 澄清）：这两条读命令在窗口零记录时不再笼统地
 * 走缺失阻断——**窗口为空**（别处还有记录）出完整空态页 ＋ 空态句 ＋ 引导句；
 * **库为空**仍原样抛出去走 `exit 4`（既有设计行为）。分辨点就在本件（取数层只负责抛）。
 *
 * #277 · 本件第三、四条处理体换成**预检确认页**（老实物 `batch_import_preview.html`／
 * `nutrition_label_wizard.html`）：取数与逐行校验搬到 `./precheckPort.ts`、装配搬到 `./precheck.ts`。
 * 两条都不写库（老实物 `output_type` 是 `result`／`process`）；真写库由 `calorie.product.import`／
 * `calorie.diet.add` 承担，确认页把它们印在「确认后操作」块与复制日志第 4 段里。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildNutritionDetailView, buildNutritionRatioView, hasAnyDietRow } from './nutritionPort.js';
import { buildEmptyWindowDoc, buildNutritionDetailDoc, buildNutritionRatioDoc } from './nutritionPortDocs.js';
import { buildImportPrecheckView, buildLabelPrecheckView, ENTRY_VALIDATE } from './precheckPort.js';
import { buildImportPrecheckDoc } from './precheck.js';
import { buildLabelPrecheckDoc } from './precheckLabel.js';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { defaultRange, nums, optStr } from '../shared/params.js';
import { commandLine } from '../shared/writeParts.js';

/** 窗口为空那一态的分辨：取数层抛的是缺失阻断，**抛出来的有没有底由这里判**——库里别处还有记录
 *  ⇒ 这是「这段没记」而不是「没得取」，出完整空态页；连底都没有 ⇒ 原样抛出去走 exit 4。 */
function isWindowEmpty(e: unknown, db: DatabaseSync): boolean {
  return e instanceof CalorieRenderError && e.code === 'missing-data' && hasAnyDietRow(db);
}

/** `calorie.view.nutrition-ratio` · 营养配比。 */
export function viewNutritionRatio(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  /* #275 · 复制日志第 4 段「调用链」＝**本次命令原文**（含 `--params`），照抄可重跑（裁定 7）；
     命令原文由命令层的共用件 `shared/writeParts.ts` 的 `commandLine()` 派生，页面件不自己拼。 */
  const command = commandLine('calorie.view.nutrition-ratio', params);
  let v;
  try {
    v = buildNutritionRatioView(db, start, end);
  } catch (e) {
    if (!isWindowEmpty(e, db)) throw e;
    return {
      data: { metrics: {} },
      html: buildEmptyWindowDoc({
        key: 'calorie.view.nutrition-ratio',
        metaLeft: '查营养配比（饮食）',
        title: '🥗 营养配比',
        blockTitle: '配比读数',
        emptyText: '这段日子（' + start + ' ~ ' + end + '）一条饮食记录也没有，配比算不出来（不编数）。',
        guide: '要让它有内容，先用「记一餐」把其中一天吃的东西记上（可带日期与时间），再来看配比。',
        footnote: '📊 数据来源 · 饮食记录 · ' + start + ' → ' + end + '（按营养素折算）',
        command,
      }),
    };
  }
  const metrics = nums({
    totalCalorie: v.totalCalorie, proteinG: v.proteinG, proteinPct: v.proteinPct,
    carbG: v.carbG, carbPct: v.carbPct, fatG: v.fatG, fatPct: v.fatPct,
    targetProteinG: v.targetProteinG, targetCarbG: v.targetCarbG, targetFatG: v.targetFatG,
  });
  return { data: { metrics }, html: buildNutritionRatioDoc(v, command) };
}

/** `calorie.view.nutrition-detail` · 营养素深度。 */
export function viewNutritionDetail(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  /* #511 · 两个唤醒词共用这一条命令（看营养素深度／看营养素明细），参数一字不差 ⇒ 由入口自己带
     `entry` 标记（`src/diet/routes.ts` 那条「看营养素明细」的记录），页头按它出标题。
     不给标记（含未知参数名）＝从前的「营养素深度」那一支，行为一字不差。 */
  const entry = optStr(params, 'entry');
  const command = commandLine('calorie.view.nutrition-detail', params);
  let v;
  try {
    v = buildNutritionDetailView(db, start, end);
  } catch (e) {
    if (!isWindowEmpty(e, db)) throw e;
    const detail = entry === 'detail';
    return {
      data: { metrics: {} },
      html: buildEmptyWindowDoc({
        key: 'calorie.view.nutrition-detail',
        metaLeft: (detail ? '看营养素明细' : '看营养素深度') + '（饮食）',
        title: detail ? '🧪 营养素明细' : '🧪 营养素深度',
        blockTitle: '逐项明细',
        emptyText: '这段日子（' + start + ' ~ ' + end + '）一条饮食记录也没有，营养素合计算不出来（不编数）。',
        guide: '要让它有内容，先用「记一餐」把其中一天吃的东西记上；'
          + '食品库里查不到营养值的食物，用「存食品」补上营养值。',
        footnote: '📊 数据来源 · 饮食记录 × 食品库 · ' + start + ' → ' + end + '（按食物名折算）',
        command,
      }),
    };
  }
  const metrics = nums({
    days: v.days,
    matchedMeals: v.matchedMeals,
    missingFoods: v.missingFoods.length,
    fiberAvg: v.items[0]?.avg,
    sodiumAvg: v.items[1]?.avg,
    sugarAvg: v.items[2]?.avg,
    fiberPct: v.items[0]?.pct,
    sodiumPct: v.items[1]?.pct,
    sugarPct: v.items[2]?.pct,
  });
  return { data: { metrics }, html: buildNutritionDetailDoc(v, entry, command) };
}

/** `calorie.view.batch-import-preview` · 导入预检页（#277 按老实物 `batch_import_preview.html` 重做）。
 *
 *  同一张页两个形态，由**入口标记**选（`src/diet/routes.ts` 那几条记录自己带）：
 *  「校验批量导入」带 `entry:'validate'` ⇒ 校验形态（逐行结果与失败原因）；其余 ⇒ 预览形态。
 *  两形态都不写库（老实物 `output_type` 是 `result`／`process`，写库只发生在用户确认之后）。
 *  `data.metrics` 四个键是 #113 起的冻结形状，不随形态变。 */
export function viewBatchImportPreview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const entry = optStr(params, 'entry');
  const validate = entry === ENTRY_VALIDATE;
  const command = commandLine('calorie.view.batch-import-preview', params);
  const v = buildImportPrecheckView(db, params['items']);
  const metrics = nums({
    total: v.total, matched: v.matched, missing: v.missing, totalCalorie: v.totalCalorie,
  });
  return { data: { metrics }, html: buildImportPrecheckDoc(v, entry, command, validate) };
}

/** `calorie.view.label-precheck` · 营养表识别确认页（#277 新建；老实物 `nutrition_label_wizard.html`）。
 *
 *  「拍营养表记一餐／拍营养表补记一餐」两条词的第一步就是这一页——识别在模型侧，
 *  模型把识别到的字段照 `t276-营养表映射.md` 那张表填成参数递进来，本命令只把它摆成页给人核对，
 *  **不写库**；用户确认之后跑的是 `calorie.diet.add`（页上「确认后操作」块给出字段与取值，
 *  复制日志第 4 段给出那条命令原文）。两条词共用这一条命令：带日期＝补记那一支（页头与措辞按它换）。 */
export function viewLabelPrecheck(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const command = commandLine('calorie.view.label-precheck', params);
  const v = buildLabelPrecheckView(params);
  const backfill = v.date !== '';
  /* 读数投影只收确定数字（`nums` 的冻结口径）：识别成 `—` 的那一格不进投影，不上屏 0。 */
  const numOfField = (key: string): number | undefined => {
    const raw = v.fields.find((f) => f.key === key)?.value;
    if (raw === undefined || raw === '—') return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  };
  const metrics = nums({
    calories: v.totalCalorie,
    protein: numOfField('protein'),
    carbs: numOfField('carbohydrates'),
    fat: numOfField('fat'),
    uncertain: v.uncertainCount,
  });
  return { data: { metrics }, html: buildLabelPrecheckDoc(v, backfill, command) };
}
