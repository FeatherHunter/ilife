/** 落盘文件名的**内容标识段**（#330 从根输出件收进共享件）。
 *
 * 谁在用（写得出哪几个在用）：
 *   ① 根输出件 `src/output.ts` 的 `deliverHtml`（唯一调用方，经公开门取用）；
 *   ② 六个能力的写命令（内容标识覆盖面）：饮食／喝水／体重／运动／身材照／食品库
 *      （`diet.*`／`water.log`／`weight.*`／`exercise.*`／`photo.*`／`product.*`）——
 *      第二个用法起即长成共用件（`shared/writeParts.ts` 同例）。
 *
 * 口径：纯 params 派生，不读库（落点解析在写库前后均可调用）；返回值未经清洗，
 * 由调用方统一清洗＋截断。旧版对照见 `docs/research/t119-dynamic-suffix.md`。
 */
/** #119 · 旧版 `html_name(suffix=)`／`html_scene_path(suffix=)` 的内容标识段（issue #49／#266／#284／#286 拍板）。
 *  纯 params 派生（落点解析在写库前后均可调用，不读库）：需要写后回执值的键（删饮食/删食品/
 *  下架食品/删身材照/id 删体重/删体脂/删围度）返回 ''，记残留（见 `docs/research/t119-dynamic-suffix.md`）。
 *  返回值未经 sanitize（由调用方 `resolveDefaultHtmlPath` 统一清洗＋截断 32 码点）。 */
export function writeSuffixFor(key: string, params: Record<string, unknown>): string {
  const str = (...names: string[]): string => {
    for (const n of names) {
      const v = params[n];
      if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return '';
  };
  /** YYYY-MM-DD → YYYYMMDD（旧 `str(date).replace('-', '')`）；非法格式原样返回（sanitize 兜底）。 */
  const compactDate = (v: unknown): string =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.replace(/-/g, '') : (typeof v === 'string' ? v : '');
  /** 旧 `format(float(x), 'g')`：去尾零（68.0→'68'、70.5→'70.5'）；非有限 number → ''。 */
  const numG = (v: unknown): string =>
    typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
  const firstItem = (): Record<string, unknown> => {
    const items = params['items'];
    if (!Array.isArray(items) || items.length === 0) return {};
    const o = items[0];
    return typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : {};
  };
  const batchCount = (): number => (Array.isArray(params['items']) ? (params['items'] as unknown[]).length : 0);
  switch (key) {
    case 'calorie.diet.add':
    case 'calorie.diet.update':
      return str('foodName', 'food_name'); // 旧：记一餐带食物名（#49）／改后名（#266 Q4A）
    case 'calorie.diet.batch': {
      const first = firstItem();
      const food = typeof first['foodName'] === 'string' && (first['foodName'] as string).trim()
        ? String(first['foodName']).trim()
        : (typeof first['food_name'] === 'string' ? String(first['food_name']).trim() : '');
      if (!food) return '';
      const n = batchCount();
      return n > 1 ? food + '等' + n + '项' : food; // 旧 #266 Q1A：首食物＋等N项
    }
    case 'calorie.diet.copy':
      return compactDate(params['from'] ?? params['fromDate']); // 旧 #266 Q2A：源日期
    case 'calorie.diet.update-by-date':
    case 'calorie.diet.remove-by-date':
      return compactDate(params['date']); // 旧：目标日期
    case 'calorie.diet.remove-by-range':
      return compactDate(params['start']) && compactDate(params['end'])
        ? compactDate(params['start']) + '至' + compactDate(params['end']) : ''; // 旧：起止范围
    case 'calorie.diet.remove-by-type':
      return compactDate(params['date']) + str('mealType'); // 旧：日期＋餐别
    case 'calorie.water.log':
      return numG(params['ml']) ? numG(params['ml']) + 'ml' : ''; // 旧 #284 Q1A：毫升
    case 'calorie.weight.log':
      return numG(params['kg']) ? numG(params['kg']) + 'kg' : ''; // 旧 #286：体重值
    case 'calorie.weight.update':
      return compactDate(params['date']) || (numG(params['kg']) ? numG(params['kg']) + 'kg' : ''); // 旧 #284 Q3A：日期
    case 'calorie.weight.remove':
      if (typeof params['date'] === 'string') return compactDate(params['date']);
      if (typeof params['start'] === 'string' && typeof params['end'] === 'string') {
        return compactDate(params['start']) + '至' + compactDate(params['end']);
      }
      return ''; // id 删：旧带记录日期（需读库），记残留
    case 'calorie.weight.batch': {
      const first = firstItem();
      const kg = numG(first['kg']);
      if (!kg) return '';
      const n = batchCount();
      return n > 1 ? kg + 'kg等' + n + '项' : kg + 'kg'; // 旧 #286：首条体重＋等N项
    }
    case 'calorie.exercise.add': {
      if (params['copyFrom'] !== undefined) return ''; // 旧带源日期（需读库），记残留
      if (params['items'] !== undefined) {
        const first = firstItem();
        const t = typeof first['type'] === 'string' && (first['type'] as string).trim()
          ? String(first['type']).trim()
          : (typeof first['exerciseType'] === 'string' ? String(first['exerciseType']).trim() : '');
        if (!t) return '';
        const n = batchCount();
        return n > 1 ? t + '等' + n + '项' : t;
      }
      return str('type', 'exerciseType'); // 旧 render_exercise_receipt：运动类型
    }
    case 'calorie.exercise.update':
      return compactDate(params['date']) || str('type', 'exerciseType');
    case 'calorie.exercise.remove':
      if (typeof params['date'] === 'string') return compactDate(params['date']);
      if (typeof params['from'] === 'string' && typeof params['to'] === 'string') {
        return compactDate(params['from']) + '至' + compactDate(params['to']);
      }
      return '';
    case 'calorie.photo.add':
      return str('tag'); // 旧 body_photo_receipt：标签／首项内容
    case 'calorie.photo.tag': {
      const raw = params['tags'] ?? params['tag'];
      if (Array.isArray(raw)) {
        const tags = (raw as unknown[]).map(String).filter((t) => t.trim().length > 0);
        return tags.length > 0 ? tags.join('、') : ''; // 旧：'、'.join
      }
      return str('tag');
    }
    case 'calorie.product.add':
    case 'calorie.product.update':
      return str('productName', 'product_name'); // 旧 #284 Q2A：食品名
    case 'calorie.photo.gif':
      return str('tag'); // 旧 gif_planner：tag＋数量（数量需读库，记残留）
    default:
      return '';
  }
}
