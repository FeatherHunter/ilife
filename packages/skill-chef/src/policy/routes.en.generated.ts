/** 本文件由 tooling/wake-en.mjs 生成，勿手改（pnpm gen 重生成，pnpm gen:check 验真）。
 *
 * 英文唤醒词记录面（票 #1310）：4 条。唯一来源＝src/policy/wake-en.json（中文词 → 英文说法）；
 * 每条记录的键／场景／槽位／预设照抄中文那条（生成期已校验：中文词必须恰好在中文表里命中一条），
 * 故英文面与中文面不会漂移。运行期只在渲染语言为 en 时参与匹配（中文／未设语言＝中文表）。
 */

export interface WakeEnRouteRecord {
  readonly phrase: string;
  readonly key: string;
  readonly scene?: string;
  readonly cli?: string;
  readonly kind?: string;
  readonly needs?: readonly string[];
  readonly preset?: Readonly<Record<string, unknown>>;
  readonly carries?: readonly string[];
}

export const WAKE_EN_ROUTES: readonly WakeEnRouteRecord[] = [
  { phrase: 'chef help', key: 'chef.help.lookup' },
  { phrase: 'search recipe', key: 'chef.recipe.search', needs: ['q'] },
  { phrase: 'view recipe', key: 'chef.recipe.view', needs: ['name'] },
  { phrase: 'add recipe', key: 'chef.recipe.write', needs: ['name'], preset: { op: 'add' } },
];
