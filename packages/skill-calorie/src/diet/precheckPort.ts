/** #277 · 预检确认页的**取数与校验**（老实物 `batch_import_preview.html` ／ `nutrition_label_wizard.html`）。
 *
 * 与装配件成对：本件出「页上要说的数」，`./precheck.ts` 出「页长什么样」；处理体住 `./nutrition.ts`
 * （批量导入预览读命令）与 `./commands.ts` 那条新增的读命令（营养表识别确认）。
 *
 * **校验口径只有一处**：逐行结果调的是写命令同一条路——`productImport.ts` 的
 * `normalizeImportRecord` ＋ `fetch/validate.ts` 的 `validateRecord` ＋ `fetch/batch.ts` 的
 * `checkDuplicate`。页上说「这行能导入」而真写时失败，就是假预检；故本件不抄第二份规则。
 * **本件只读**：一条 INSERT／UPDATE 都没有（老实物两页的老 `output_type` 分别是 `process` 与
 * `result`，两页都不写库；写库只发生在用户确认之后跑那条写命令）。
 *
 * 老实物对照（逐块见 `docs/skills/skill-calorie/t277-报告.md`）：
 *  · `batch_import_preview.html` 的 `SUMMARY`（total／added／updated／skipped／failed／passed）→
 *    本件 `ImportPrecheckView`；`RUNS`（row／status／product_name／calories／reason）→ `rows`。
 *  · `nutrition_label_wizard.html` 的 `AI_OUTPUT`（13 字段）＋ `image_meta`（照片）→ `LabelPrecheckView`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { checkDuplicate } from '../fetch/batch.js';
import { validateRecord } from '../fetch/validate.js';
import { CalorieRenderError } from '../render/errors.js';
import { optStr } from '../shared/params.js';
import { brandOfImportRecord, normalizeImportRecord } from './productImport.js';

/** 读命令的入口标记：定义住叶子件 `./precheckParts.ts`（免得 `precheck.ts` 与本件互相 import 成环），
 *  本件只转出给处理体（`log.ts`／`productImport.ts`／`receipt.ts`／`nutrition.ts`）用。 */
export { ENTRY_PRECHECK, ENTRY_VALIDATE } from './precheckParts.js';

/** 逐行结果的三个取值（老实物 `STATUS_LABELS` 是五值 `added／updated／skipped／failed／ok`；
 *  预检发生在写之前，`updated` 只有「选了覆盖策略」才可能出现，本票不提供该策略 ⇒ 本件三值）。 */
export type ImportRowStatus = 'added' | 'skipped' | 'failed';

export interface ImportPrecheckRow {
  /** 行号（老实物 `#${r.row}`）。 */
  readonly no: number;
  readonly productName: string;
  readonly calories: number | null;
  /** 食品库里有没有同名——老实物「是否已匹配」那一列。 */
  readonly matched: boolean;
  readonly libCalories: number | null;
  readonly status: ImportRowStatus;
  /** 写的时候会失败／会跳过的原因；能导入的行是空串。 */
  readonly reason: string;
}

export interface ImportPrecheckView {
  readonly total: number;
  readonly added: number;
  readonly skipped: number;
  readonly failed: number;
  /** 老实物校验形态的「通过」＝能导入的行（新增 ＋ 按策略跳过的重复行）。 */
  readonly passed: number;
  readonly matched: number;
  readonly missing: number;
  readonly totalCalorie: number;
  readonly missingNames: readonly string[];
  readonly rows: readonly ImportPrecheckRow[];
  /** 要交给写命令的条目**原样**（用户给什么就写什么：页上说「会失败」的行，写命令也照同一条规则失败）。
   *  只做一处改名——`foodName` 归一到写命令用的 `productName`。 */
  readonly writeItems: readonly Record<string, unknown>[];
}

/** 逐行读数：把用户给的条目按**写命令同一条路**判一遍（不落库）。 */
export function buildImportPrecheckView(db: DatabaseSync, items: unknown): ImportPrecheckView {
  if (!Array.isArray(items) || items.length === 0 || items.length > 200) {
    throw new CalorieRenderError('bad-input', 'items 须为 1~200 条数组');
  }
  const lib = new Map((db.prepare(
    'SELECT product_name AS n, calories AS cal FROM nutrition_products WHERE COALESCE(is_deprecated, 0) = 0',
  ).all() as { n: string; cal: number }[]).map((r) => [r.n, r.cal]));
  const rows: ImportPrecheckRow[] = [];
  const writeItems: Record<string, unknown>[] = [];
  items.forEach((raw, i) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    /* 条目名的两套写法都收：老写法（`foodName`，`#113` 起这条命令的入参）与新写法
       （`productName`，写命令 `calorie.product.import` 的入参）。只在这一处归一——
       预检页要把同一批条目既判给读侧、又在「确认后操作」块里按写命令的样子摆出来。 */
    const merged: Record<string, unknown> = {
      ...o,
      ...(o['productName'] === undefined && o['product_name'] === undefined
        ? { productName: o['foodName'] ?? o['food_name'] } : {}),
    };
    delete merged['foodName'];
    delete merged['entry'];
    writeItems.push(merged);
    const rec = normalizeImportRecord(merged);
    const name = typeof rec['product_name'] === 'string' ? (rec['product_name'] as string).trim() : '';
    const calRaw = rec['calories'];
    const calories = typeof calRaw === 'number' ? calRaw : null;
    const libCal = name !== '' && lib.has(name) ? (lib.get(name) as number) : null;
    const base = { no: i + 1, productName: name, calories, matched: libCal !== null, libCalories: libCal };
    const v = validateRecord(rec);
    if (!v.ok) {
      rows.push({ ...base, status: 'failed', reason: v.error ?? '记录不合法' });
      return;
    }
    if (checkDuplicate(db, name, brandOfImportRecord(rec))) {
      rows.push({ ...base, status: 'skipped', reason: '食品库里已有同名，按现状跳过这一条' });
      return;
    }
    rows.push({ ...base, status: 'added', reason: '' });
  });
  const missingNames = [...new Set(rows.filter((r) => !r.matched).map((r) => r.productName))];
  return {
    total: rows.length,
    added: rows.filter((r) => r.status === 'added').length,
    skipped: rows.filter((r) => r.status === 'skipped').length,
    failed: rows.filter((r) => r.status === 'failed').length,
    passed: rows.filter((r) => r.status !== 'failed').length,
    matched: rows.filter((r) => r.matched).length,
    missing: missingNames.length,
    totalCalorie: rows.reduce((a, r) => a + (r.calories ?? 0), 0),
    missingNames,
    rows,
    writeItems,
  };
}

/* ── 营养表识别确认页（老实物 `nutrition_label_wizard.html`） ── */

/** 页上一行「识别出的字段」（老实物一个 `.field`＋`<label>`＋`<input>`；新侧只读 ⇒ 一行一字段）。 */
export interface LabelField {
  readonly key: string;
  /** 老实物 `displayLabel` 表的中文名（含每 100g 口径的括号），逐字照抄。 */
  readonly label: string;
  /** 缺值写 `—`（`t425` 裁定 4），不写 0、不写空串。 */
  readonly value: string;
  readonly unit: string;
  /** 识别不确定的字段：老实物用 `.diff-tag` 标出「这一格是 AI 抽出来的」。 */
  readonly uncertain: boolean;
}

export interface LabelPrecheckView {
  readonly productName: string;
  readonly brand: string;
  readonly photo: string;
  readonly note: string;
  /** 补录日期；空串＝记今天那一餐（老实物 `date` 缺省取今天）。 */
  readonly date: string;
  readonly time: string;
  readonly meal: string;
  readonly fields: readonly LabelField[];
  readonly uncertainCount: number;
  readonly totalCalorie: number;
  /** 写命令的参数（`calorie.diet.add` 照 `t276-营养表映射.md` 那张表填）——由本件归一后交给装配件印上屏。 */
  readonly writeParams: Readonly<Record<string, unknown>>;
}

/** 老实物 `nutrition_label_wizard.html` 的「营养成分 (每 100g)」八个字段**逐字照抄**
 *  （`:272-293`：热量 (kcal)／蛋白质／脂肪／饱和脂肪／碳水／糖／膳食纤维／钠）。
 *  `param`＝`calorie.diet.add` 那边接得住的参数名（`t276-营养表映射.md` 那张表）；
 *  接不住的三项（糖／膳食纤维／钠）`param` 留空——**页上照旧显示识别读数**（那是标签上印着的事实），
 *  但不进写命令参数（`food_log` 没有承接列，硬塞就是编字段）。 */
const LABEL_FIELDS: readonly { key: string; label: string; unit: string; param: string }[] = [
  { key: 'calories', label: '热量 (kcal)', unit: 'kcal', param: 'calories' },
  { key: 'protein', label: '蛋白质 (g)', unit: 'g', param: 'protein' },
  { key: 'fat', label: '脂肪 (g)', unit: 'g', param: 'fat' },
  { key: 'saturated_fat', label: '饱和脂肪 (g)', unit: 'g', param: '' },
  { key: 'carbohydrates', label: '碳水 (g)', unit: 'g', param: 'carbs' },
  { key: 'sugar', label: '糖 (g)', unit: 'g', param: '' },
  { key: 'fiber', label: '膳食纤维 (g)', unit: 'g', param: '' },
  { key: 'sodium', label: '钠 (mg)', unit: 'mg', param: '' },
];

function numOf(o: Record<string, unknown>, ...names: string[]): number | null {
  for (const n of names) {
    const v = o[n];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

/** 「识别不确定的字段」由入口给（`uncertain`，逗号分隔或数组）：识别在模型侧，
 *  「哪几格没把握」是模型自己才知道的事实，不由本层替他猜。 */
function uncertainKeysOf(o: Record<string, unknown>): Set<string> {
  const raw = o['uncertain'];
  const list = Array.isArray(raw) ? raw.map(String)
    : typeof raw === 'string' ? raw.split(/[,，\s]+/) : [];
  return new Set(list.map((s) => s.trim()).filter((s) => s !== ''));
}

/** `calorie.view.label-precheck` · 营养表识别确认：把这次识别到的字段摆成页，先给用户看。 */
export function buildLabelPrecheckView(params: Record<string, unknown>): LabelPrecheckView {
  const productName = (optStr(params, 'productName') ?? optStr(params, 'foodName') ?? '').trim();
  if (productName === '') throw new CalorieRenderError('bad-input', '缺参数 productName');
  const calories = numOf(params, 'calories');
  if (calories === null) throw new CalorieRenderError('bad-input', '缺参数 calories');
  const uncertain = uncertainKeysOf(params);
  const fields: LabelField[] = LABEL_FIELDS.map((f) => {
    const v = numOf(params, f.param, f.key);
    return {
      key: f.key,
      label: f.label,
      value: v === null ? '—' : String(v),
      unit: f.unit,
      uncertain: uncertain.has(f.param) || uncertain.has(f.key),
    };
  });
  const date = optStr(params, 'date') ?? '';
  const time = optStr(params, 'time') ?? '';
  const meal = optStr(params, 'meal') ?? optStr(params, 'mealOverride') ?? '';
  const grams = numOf(params, 'grams');
  /* 写命令参数只收 `t276-营养表映射.md` 那张表接得住的字段（`param` 为空的三个标签字段不进）：
     接不住的硬塞就是编字段。食物名用 `calorie.diet.add` 的入参名 `foodName`。 */
  const writeParams: Record<string, unknown> = { foodName: productName };
  for (const f of LABEL_FIELDS) {
    if (f.param === '') continue;
    const v = numOf(params, f.param, f.key);
    if (v !== null) writeParams[f.key] = v;
  }
  if (grams !== null) writeParams['grams'] = grams;
  if (date !== '') writeParams['date'] = date;
  if (time !== '') writeParams['time'] = time;
  if (meal !== '') writeParams['meal'] = meal;
  const note = optStr(params, 'note');
  if (note !== undefined) writeParams['note'] = note;
  return {
    productName,
    brand: optStr(params, 'brand') ?? '',
    photo: optStr(params, 'photo') ?? '',
    note: note ?? '',
    date,
    time,
    meal,
    fields,
    uncertainCount: fields.filter((f) => f.uncertain).length,
    totalCalorie: calories,
    writeParams,
  };
}
