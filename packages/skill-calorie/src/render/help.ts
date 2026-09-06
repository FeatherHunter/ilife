/** T10 #29 · 身材照片 HELP 速查台（对照老家 render_help_center.py + SKILL 速查表）。
 *
 * 数据源：triggers SCENE_09_PHOTO 唯一上游（SoT，不复制唤醒词文本）。
 * Q71 验收：HELP 从 SKILL 现找直达可执行命令——每条命中自带 exec（node 一行
 * 式，可直接复制运行，读 SKILLS_DB_PATH 库），legacyCli 保留老家 python 原命令
 * 备查。lookupPhotoHelp 按唤醒词/键/描述子串现找。
 */
import { SCENE_09_PHOTO } from '../triggers/scene-09-photo.js';
import { CalorieRenderError } from './errors.js';

export const PHOTO_HELP_MODULE = '@feather_wch/skill-calorie/dist/render/photo.js' as const;

export interface PhotoHelpHit {
  wakeWord: string;
  key: string;
  desc: string;
  legacyCli: string;
  /** 可执行 TS 入口模块（dist 相对包名，动态 import 可达）。 */
  module: string;
  /** 可执行 TS 入口函数名（模块须导出）。 */
  fn: string;
  /** 复制即运行的 node 一行式（读 SKILLS_DB_PATH）。 */
  exec: string;
}

function execFor(module: string, fn: string, argsExpr: string): string {
  return 'node --input-type=module -e "import { openDb } from \'@feather_wch/skill-calorie/dist/index.js\'; ' +
    'import { ' + fn + ' } from \'' + module + '\'; ' +
    'const db = openDb(process.env.SKILLS_DB_PATH); ' +
    'try { console.log(JSON.stringify(' + fn + '(db, ' + argsExpr + '))); } finally { db.close(); }"';
}

/** key → 可执行函数映射（T4 取数 + 本包渲染，无二进制操作）。 */
const KEY_EXEC: Record<string, { module: string; fn: string; args: string }> = {
  body_photo_add_single: { module: '@feather_wch/skill-calorie/dist/fetch/photos.js', fn: 'addPhotos', args: 'process.env.CALORIE_PHOTOS_DIR, { srcPaths: ["<照片路径>"], tag: "<标签>" }' },
  body_photo_add_note: { module: '@feather_wch/skill-calorie/dist/fetch/photos.js', fn: 'addPhotos', args: 'process.env.CALORIE_PHOTOS_DIR, { srcPaths: ["<照片路径>"], tag: "<标签>", note: "<备注>" }' },
  body_photo_add_batch: { module: '@feather_wch/skill-calorie/dist/fetch/photos.js', fn: 'addPhotos', args: 'process.env.CALORIE_PHOTOS_DIR, { srcPaths: ["<照片1>", "<照片2>"], tag: "<标签>" }' },
  body_photo_list: { module: PHOTO_HELP_MODULE, fn: 'buildGalleryData', args: '{ tag: "<标签>", days: 90 }' },
  body_photo_compare: { module: PHOTO_HELP_MODULE, fn: 'buildCompareData', args: '<ID1>, <ID2>' },
  body_photo_gif: { module: PHOTO_HELP_MODULE, fn: 'buildGifTask', args: '{ tag: "<标签>", days: 90 }' },
  body_photo_delete: { module: '@feather_wch/skill-calorie/dist/fetch/photos.js', fn: 'deletePhoto', args: 'process.env.CALORIE_PHOTOS_DIR, <ID>' },
  body_photo_tag_set: { module: PHOTO_HELP_MODULE, fn: 'buildTagReceipt', args: '<ID>, <改前标签数组>, <改后标签数组>, "改照片标签"' },
  body_photo_tag_add: { module: PHOTO_HELP_MODULE, fn: 'buildTagReceipt', args: '<ID>, <改前标签数组>, <改后标签数组>, "加照片标签"' },
  body_photo_tag_remove: { module: PHOTO_HELP_MODULE, fn: 'buildTagReceipt', args: '<ID>, <改前标签数组>, <改后标签数组>, "删照片标签"' },
};

function keyOf(t: { key?: unknown }): string {
  return typeof t.key === 'string' ? t.key : '';
}

/** 全量照片 HELP（10 键，顺序跟 SCENE_09_PHOTO SoT 序）。 */
export function buildPhotoHelp(): PhotoHelpHit[] {
  return SCENE_09_PHOTO.map((t) => {
    const key = keyOf(t as { key?: unknown });
    const e = KEY_EXEC[key];
    if (!e) throw new CalorieRenderError('bad-input', '照片 HELP 缺可执行映射：' + key);
    return {
      wakeWord: t.wake_word,
      key,
      desc: t.desc,
      legacyCli: t.main_prompt.cli,
      module: e.module,
      fn: e.fn,
      exec: execFor(e.module, e.fn, e.args),
    };
  });
}

/** 现找：唤醒词/key/描述子串命中（空串抛，不返全表冒充命中）。 */
export function lookupPhotoHelp(word: string): PhotoHelpHit[] {
  const q = String(word ?? '').trim();
  if (!q) throw new CalorieRenderError('bad-input', 'HELP 查询词必填');
  return buildPhotoHelp().filter((h) => h.wakeWord.includes(q) || h.key.includes(q) || h.desc.includes(q));
}
