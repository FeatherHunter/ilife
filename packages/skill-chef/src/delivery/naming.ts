/** 交付面·命名：大厨业务页“叫什么、落哪一域”的一处定义（别处引用，不抄第二份）。
 *
 * 照饼干 `packages/skill-bill/src/delivery/naming.ts` 同形（纯函数、零 IO、不读配置、不碰盘）：
 * 本件只给“主体＋域”，时间戳／递补／扩展名由共用件 `base-paint/save-html` 钉死。
 * 出口 `src/cli/cmd_read.ts` 用它算 `stem`，落点目录＝`resolveSceneDir()`＋域中文名。
 *
 * 主体通式：`私家大厨_<页名>`。页名＝本次这一页的唤醒词（按本次参数算，不取命令代表词）；
 * HELP 保留名 `私家大厨_HELP`／`私家大厨_速查表` 与业务页名集合无交集（业务键不含 HELP 四词，机器判据见票）。
 * 与饼干不同：大厨业务与 HELP 分家靠目录（业务落 `cook_html/<域>/`，HELP 落 `cook_html/help/`），
 * 主体不再另加域前缀（域由目录承载，老件模板目录同形）。
 */

export type ChefBusinessKey =
  | 'chef.recipe.view'
  | 'chef.recipe.search'
  | 'chef.recipe.write'
  | 'chef.cooking.run'
  | 'chef.shopping.query'
  | 'chef.history.record'
  | 'chef.history.query'
  | 'chef.relation.write'
  | 'chef.relation.query'
  | 'chef.setup.init'
  | 'chef.data.batch'
  | 'chef.data.schema'
  | 'chef.data.query';

/** 键→域中文名（HELP 十域 label 逐字，`src/help/sceneData.ts` 同形）。落点目录由它承载。 */
const DOMAIN_OF_KEY: Record<ChefBusinessKey, string> = {
  'chef.recipe.view': '查看',
  'chef.recipe.search': '搜索筛选',
  'chef.recipe.write': '录入',
  'chef.cooking.run': '做菜',
  'chef.shopping.query': '采购',
  'chef.history.record': '历史',
  'chef.history.query': '历史',
  'chef.relation.write': '派生',
  'chef.relation.query': '派生',
  'chef.setup.init': '开始使用',
  'chef.data.batch': '数据管理',
  'chef.data.schema': '数据管理',
  'chef.data.query': '数据管理',
};

/** 键→默认页名（代表唤醒词；`history.query` 见按参数细化）。 */
const DEFAULT_WAKE_OF_KEY: Record<ChefBusinessKey, string> = {
  'chef.recipe.view': '查看食谱',
  'chef.recipe.search': '查看全部',
  'chef.recipe.write': '录入食谱',
  'chef.cooking.run': '做菜模式',
  'chef.shopping.query': '生成清单',
  'chef.history.record': '记录做菜',
  'chef.history.query': '查看统计',
  'chef.relation.write': '添加派生关系',
  'chef.relation.query': '查看派生关系',
  'chef.setup.init': '首次使用',
  'chef.data.batch': '批量改',
  'chef.data.schema': '体检',
  'chef.data.query': '体检',
};

/** 本次这一页是谁（由出口按本次参数算出，交付层不复算）。 */
export interface ChefPage {
  readonly wakeWord: string;
  readonly domain: string;
}

/** 按本次参数算页名（`history.query` 按 kind/name 细化，其余取代表词；未知键抛，不猜）。 */
export function chefPageFor(key: string, params: Record<string, unknown> = {}): ChefPage {
  const k = key as ChefBusinessKey;
  const domain = DOMAIN_OF_KEY[k];
  if (domain === undefined) throw new Error('[delivery] 未知大厨键：' + key);
  if (k === 'chef.history.query') {
    const kind = typeof params.kind === 'string' && params.kind !== '' ? params.kind : undefined;
    if (kind === 'quality') return { wakeWord: '体检', domain };
    if (kind === 'backup') return { wakeWord: '备份', domain };
    if (params.name !== undefined && params.name !== null && String(params.name) !== '') {
      return { wakeWord: '查看历史', domain };
    }
    return { wakeWord: '查看统计', domain };
  }
  const wakeWord = DEFAULT_WAKE_OF_KEY[k];
  return { wakeWord, domain };
}

/** 文件名主体：`私家大厨_<唤醒词>`（HELP 保留名不在业务页名集合内）。 */
export function pageStemFor(page: ChefPage): string {
  const word = page.wakeWord.trim();
  if (word === '') throw new Error('[delivery] 页名为空：唤醒词不能为空');
  if (word === 'HELP' || word === '速查表') {
    throw new Error('[delivery] 保留名不可作业务页名：' + word);
  }
  return '私家大厨_' + word;
}
