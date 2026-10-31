/** base 包通用件的适配层（本仓唯一接触 dsh-featherhunter-plugin-base/client 的地方）。
 *
 * 为什么单独一层：base 的 createBaseUI 要「宿主把 React 交进来」（它自己不 import React，
 * 保证与宿主同一个 React 实例）；本面板产物是手写 createElement 的 browser bundle，
 * 这里只做两件事——(1) 按 React 身份缓存一个 baseUI 单例；(2) 首次渲染时把 base 的
 * 全局样式（BASE_STYLE_ID）插进 document（幂等；无 document 的环境跳过）。
 *
 * 作者推荐卡（AuthorPlugins）与页头动作簇（ActionCluster：联系／Star／Issue）都从这里出：
 * 文案、二维码卡、离线兜底（飞书＋QQ 内置）、插件清单与图标全部来自 base 包（唯一真源
 * contact/ → data/manifest.json），本仓不再维护第二份。
 */
import * as React from 'react';
import { createBaseUI, ensureBaseStyles } from 'dsh-featherhunter-plugin-base/client';

const LANG = 'zh';
const SELF_ID = 'ilife';
/** 本仓地址：页头三件套里 Star 的目标、Issue 的派生基准（base 由 repoUrl 拼出 <repo>/issues）。 */
const REPO_URL = 'https://github.com/FeatherHunter/ilife';

type BaseUI = ReturnType<typeof createBaseUI>;

let cachedReact: typeof React | null = null;
let cachedUI: BaseUI | null = null;
let stylesReady = false;

/** baseUI 单例：React 身份或语言变了才重建（同一份 react 只造一次，避免弹窗状态跟着组件走丢）。 */
function baseUI(): BaseUI | null {
  if (cachedUI !== null && cachedReact === React) return cachedUI;
  try {
    cachedUI = createBaseUI(React, { lang: LANG, selfId: SELF_ID, repoUrl: REPO_URL });
    cachedReact = React;
  } catch {
    cachedUI = null;
    cachedReact = null;
  }
  return cachedUI;
}

/** base 的全局样式只插一次；样式注入失败不影响功能（base 组件自带内联兜底，不抛给人看）。 */
function ensureStylesOnce(): void {
  if (stylesReady || typeof document === 'undefined') return;
  try {
    ensureBaseStyles(document);
    stylesReady = true;
  } catch {
    // 样式失败不升级成功能失败。
  }
}

/** 作者推荐卡：插件清单与文案全部由 base 包渲染（本仓只传 selfId，排除爱生活自己）。 */
export function AuthorPlugins(props: { readonly title?: string } = {}): React.ReactElement | null {
  const ui = baseUI();
  if (ui === null) return null;
  ensureStylesOnce();
  return React.createElement(ui.AuthorPlugins, { title: props.title });
}

/** 页头动作簇 v2（票 05）：联系／Star／Issue 三枚彩色静默按钮（无外框、间距 4），图标、
 * 悬停文案、联系弹窗与目标网址全部由 base 渲染；本仓只给 React 身份、尺寸与本仓 repoUrl
 * （base 由它派生 Star 目标与 <repo>/issues 列表页）。
 *
 * 尺寸缺省 16：base 的页头默认档，与面板标题行同一视觉重量（14 紧凑／18 宽松留给别的场景）。 */
export function ActionCluster(props: { readonly size?: 14 | 16 | 18 } = {}): React.ReactElement | null {
  const ui = baseUI();
  if (ui === null) return null;
  ensureStylesOnce();
  return React.createElement(ui.ActionCluster, { size: props.size ?? 16 });
}
