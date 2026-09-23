/** help · template
 *
 *  自 `src/help.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/help.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { attr, renderAboutPage, renderGroupPage, renderHero, renderInitBanner, renderMetaBlocks, renderTabBar, text } from './render.js';
import { HELP_CLASS_ROOT, LF, cls } from './shared.js';
import { HELP_SHELL_ID, SceneData } from '../../spec/help.js';
import { ASSET_WRAPPERS, CONTAINER_CHECK_RULE, TEMPLATE_MARKERS } from '../../spec/template.js';

/* ── 5. 内置help模板（**非导出**，裁定 R13；可经 `HelpShellInput.template` 覆盖） ── */

/** payload 容器开标签：标签名恒取 `ASSET_WRAPPERS`，`id`／`type` 恒取 `CONTAINER_CHECK_RULE`
 *  （容器校验规则的 `id`／`type` 与 `DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE` 同值，不写第二份字面量）。 */
const DATA_SCRIPT_OPEN = ASSET_WRAPPERS.sharedHelpersJs.openTag.slice(0, -1)
  + ' id="' + CONTAINER_CHECK_RULE.id + '" type="' + CONTAINER_CHECK_RULE.type + '">';
const DATA_SCRIPT_CLOSE = ASSET_WRAPPERS.sharedHelpersJs.closeTag;

/** 文档 `<title>`：`title · skill_name`（两者均经 `escapeHtml`，R31）。
 *  `title` 是必填非空字段（`minLength: 1`），`skill_name` 同；拼串使两个字段都有可观察效果。 */
function documentTitle(data: SceneData): string {
  return data.title + ' · ' + data.skill_name;
}

/** 内置help模板（**完整 HTML 文档**，R31）：数据页分型（`<!--INJECT-DATA-->` 恰 1 次且在自带容器内；
 *  `<!--SHARED-CSS-->` 落在 `<head>`、`<!--SHARED-HELPERS-->` 落在 `<body>`，各恰 1；
 *  `<!--CHARTS-HELPERS-->`／`<!--CONTENT-->` 各 0）。
 *
 *  完整文档而非片段：`<meta charset="utf-8">` 是含中文的 UTF-8 文件经 `file://` 打开不乱码的前提
 *  （Windows 尤甚），速查台是独立页面（仓内各技能包的 `templates` 目录与旧
 *  `help_template.html` 同为完整文档）。两个共享资产标记仍是**裸标记**（不得预包裹，不变量②），
 *  包裹由 `fillTemplate` 按 `ASSET_WRAPPERS` 完成。 */
export function buildShellTemplate(data: SceneData): string {
  const groups = data.groups;
  const sceneCount = groups.reduce(
    (total, group) => total + group.subgroups.reduce((sub, item) => sub + item.scenes.length, 0),
    0,
  );
  const hasGroupPage = groups.length > 0;

  const parts: string[] = [];
  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="zh-CN">');
  parts.push('<head>');
  parts.push('<meta charset="utf-8">');
  parts.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  parts.push('<title>' + text(documentTitle(data)) + '</title>');
  parts.push(TEMPLATE_MARKERS.sharedCss); // 裸标记：填充器包成 <style>（落在 <head> 内）
  parts.push('</head>');
  parts.push('<body>');
  parts.push('<section class="' + HELP_CLASS_ROOT + '"' + attr('id', HELP_SHELL_ID) + '>');
  parts.push(renderHero(data, sceneCount));
  if (data.init_banner !== undefined) parts.push(renderInitBanner(data.init_banner));
  parts.push(renderTabBar(groups));
  parts.push('<div class="' + cls('pages') + '">');
  groups.forEach((group, index) => {
    parts.push(renderGroupPage(data, group, index, index === 0));
  });
  parts.push(renderAboutPage(data, !hasGroupPage));
  parts.push('</div>');
  const metaBlocks = data.meta_blocks ?? [];
  if (metaBlocks.length > 0) {
    parts.push('<div class="' + cls('meta') + '">' + renderMetaBlocks(metaBlocks) + '</div>');
  }
  parts.push('</section>');
  // 载荷容器（自带；填充器只替换标记文本，不补写标签）+ 共享 helpers 标记（**裸标记**，不得预包裹）。
  parts.push(DATA_SCRIPT_OPEN + TEMPLATE_MARKERS.injectData + DATA_SCRIPT_CLOSE);
  parts.push(TEMPLATE_MARKERS.sharedHelpers);
  parts.push('</body>');
  parts.push('</html>');
  return parts.join(LF);
}

