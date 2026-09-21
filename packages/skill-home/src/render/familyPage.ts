// 渲染层·页族装配入口（#872 新立）：把「命令 ＋ 场景预设」解析出的页族装配成整页 HTML。
//
// 交付链里缺的那一段：`home-cmd-read` 的缺省落盘与 `--html` 显式出口都先来本件取页；
// 解析不到族（`UNKNOWN_FAMILY`）或模块装入／装配抛错 → 返回 `null`，由出口降级到
// 21 张平铺模板的分节页（`renderEnvelopeHtml`），并在 stderr 记一条 note，不静默。
//
// 为什么键要配「候选域目录」：页族模块按 `dist/<域>/pages/<族>.js` 落位（契约附录的
// `families[].domain`），而 `home.care.*` 两个键同时挂着 family 域的族（借用／家人）与
// setup 域的族（首次使用／查异常／备份导出／导入恢复）——故一个命令可能对应多个候选域。
// 族名跨域唯一（46 个族名在 8 个域目录里不重名，`test/family-delivery.test.mjs` 扫盘对账），
// 所以「按候选域顺序试装，第一个装得上的就是它」是确定性的，不猜。
//
// 本件不读契约附录（附录住 `docs/`，不随包发布；运行时事实源只能是代码）——照
// `src/render/pageFamilies.ts`（#800）与 `src/render/sceneNaming.ts`（#801）的同一先例：
// 代码里的表由测试与附录对账，对不上即红。
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Envelope } from 'base-link-core';
import { UNKNOWN_FAMILY, resolvePageFamily } from './pageFamilies.js';
import { resolveSceneStem } from './sceneNaming.js';

/** 命令键前缀 → 候选域目录（按序试装）。表外命令一律无候选（走降级）。 */
const KEY_DOMAINS: ReadonlyArray<readonly [prefix: string, domains: readonly string[]]> = [
  ['home.item.', ['items']],
  ['home.tag.', ['items']],
  ['home.inventory.', ['items']],
  ['home.location.', ['space']],
  ['home.outfit.', ['outfit']],
  ['home.trip.', ['outfit']],
  ['home.stats.', ['stats']],
  ['home.shopping.', ['express']],
  ['home.ticket.', ['receipt']],
  ['home.care.', ['family', 'setup']],
];

/** 命令键的候选域目录（表外返回空数组＝无候选，调用方走降级）。 */
export function domainsFor(key: string): readonly string[] {
  for (const [prefix, domains] of KEY_DOMAINS) if (key.startsWith(prefix)) return domains;
  return [];
}

/** `dist/` 根：本件编译落在 `dist/render/`，上一级即页族模块所在的 8 个域目录。 */
const distRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 页族模块的绝对路径（候选域找不到即 `null`，不抛）。 */
export function familyModulePath(domain: string, family: string): string | null {
  const file = join(distRoot, domain, 'pages', family + '.js');
  return existsSync(file) ? file : null;
}

/** 场景的命令中文名（＝文件名主体 `<命令中文名>_<场景 id>` 的前半；`resolveSceneStem` 是那段唯一算法）。 */
export function sceneNameOf(key: string, params: Record<string, unknown>): string | null {
  try {
    const stem = resolveSceneStem(key, params);
    const cut = stem.lastIndexOf('_');
    return cut > 0 ? stem.slice(0, cut) : stem;
  } catch {
    return null;
  }
}

/** 标题与页内大标题的回填：页族模板的 `<title>`／`<h1>` 写的是**族**的默认名，而一族服务多条场景
 *  （`add_form` 服务 录物品／拍物品／批量录入／补录，`receipt` 服务 移物品／数量变更／状态变更／标物品，
 *  `certificates` 服务 查证件到期／登记证件／证件归档／更新证件……）。真名只有交付链知道（要 params 才
 *  解析得出场景），故在这一层回填 —— 免得「拍物品」那一页的大标题写着「录物品」。 */
export function withSceneIdentity(html: string, commandCn: string): string {
  const safe = commandCn.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  return html
    .replace(/<title>[\s\S]*?<\/title>/, '<title>' + safe + '</title>')
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '<h1>' + safe + '</h1>');
}

/**
 * 装配页族整页 HTML：
 *  - 命中并装得上 → 返回整页 HTML（含模板壳，标记已填充）；
 *  - 族名未知／模块不在／装入抛错／装配抛错 → 返回 `null`（调用方降级＋记 note）。
 * 体积门不在这里：超限与解析失败不是同一档（超限是内容缺陷，须响亮失败，见 `assertHtmlSize` 的调用方）。
 */
export async function renderFamilyHtml(
  key: string, params: Record<string, unknown>, env: Envelope,
): Promise<string | null> {
  const family = resolvePageFamily(key, params);
  if (family === UNKNOWN_FAMILY) return null;
  for (const domain of domainsFor(key)) {
    const file = familyModulePath(domain, family);
    if (file === null) continue;
    try {
      const mod = (await import(pathToFileURL(file).href)) as {
        renderFamilyPage?: (e: Envelope) => string;
      };
      if (typeof mod.renderFamilyPage !== 'function') continue;
      const html = mod.renderFamilyPage(env);
      if (typeof html === 'string' && html.length > 0) {
        const sceneName = sceneNameOf(key, params);
        return sceneName === null ? html : withSceneIdentity(html, sceneName);
      }
    } catch {
      // 装入失败或装配抛错：试下一个候选域；都不行由调用方降级（本件不吞错，只记录「这条路不通」）。
    }
  }
  return null;
}
