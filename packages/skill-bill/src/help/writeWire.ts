/** 409 · 写入 16 词接线派生（说词→路由 key→SKILL 行→HELP 卡→可执行 CLI）。
 *
 * 本件只做一件事：把已在仓里的四处事实读出来拼成 16 行，不写第二份词表、不跑命令、不落盘。
 *  - 说词与 key：口径层 `WAKE_TABLE`（`src/policy/wakewords.ts`，唯一上游）；
 *  - SKILL 行与可执行 CLI：`buildHelpLookup()`（`src/help/lookup.ts`，构建期注入 SKILL.md 的同一函数）；
 *  - HELP 卡：内容资产 `WAKE_ASSETS`／`WAKE_GROUPS`（`src/triggers/wake-assets.ts`，写域 16 卡）；
 *  - 形状：`BILL_KEY_SHAPES`（`src/render/envelope.ts` 经 `src/render/index.ts` 门出）。
 *
 * 口径说明（调查结论直写，不藏）：
 *  - HELP 卡片 CLI 格仍显示 `scene.id` 原文（`base-render/src/help.ts` 的 `cliText` 冻结口径，
 *    base 不得臆造前缀，回补归 #106 系）。本件不断言卡片渲染改字，只断言“每张写卡都能在映射里
 *    找到它的 key 与可执行 CLI”（程序可验），卡片改字留给后票（见证据件遗留 432）。
 *  - 本域预期无命令可执行词为 0 条：有即逐字进 `reason`，调用方（测试／对账脚本）判红。
 *  - 不做真出口断言：可执行只验“示例带齐必需槽位”（add 要 category＋amount，update 要 id），不 spawn。
 */
import { BILL_KEY_SHAPES } from '../render/index.js';
import { WAKE_TABLE, routeWakeword, type BillKey } from '../policy/index.js';
import { WAKE_ASSETS, WAKE_GROUPS } from '../triggers/wake-assets.js';
import { buildHelpLookup } from './lookup.js';

/** 写入 16 词（派生：`WAKE_TABLE` 里两条写命令的短语，顺序照表序＝施工图序）。 */
export const WRITE_WORDS: readonly string[] = WAKE_TABLE
  .filter((e) => e.key === 'bill.record.add' || e.key === 'bill.record.update')
  .map((e) => e.phrase);

/** 接线一行（七格，`reason` 空串＝五段对得上，非空＝逐字原因）。 */
export interface WriteWireRow {
  readonly phrase: string;
  readonly key: BillKey;
  readonly params: Record<string, unknown>;
  readonly shape: string;
  readonly cli: string;
  readonly helpSceneId: string;
  readonly reason: string;
}

/** 写域卡：唤醒词恰好一张写卡（`write` 域内按唤醒词找）。 */
function findWriteScene(phrase: string): { readonly id: string } | null {
  const hits: { readonly id: string }[] = [];
  for (const g of WAKE_GROUPS) {
    if (g.id !== 'write') continue;
    for (const sub of g.subgroups) {
      for (const s of sub.scenes) {
        if (s.wake_word === phrase) hits.push({ id: s.id });
      }
    }
  }
  return hits.length === 1 ? hits[0] : null;
}

/** 示例可执行性（静态，不 spawn）：add 要 category＋amount，update 要 id。 */
function executableReason(key: BillKey, cli: string): string {
  const at = cli.indexOf('--params ');
  if (at < 0) return '示例缺 --params：' + cli;
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(cli.slice(at + '--params '.length).replace(/^'|'$/g, '')) as Record<string, unknown>;
  } catch {
    return '示例 params 非 JSON：' + cli;
  }
  if (key === 'bill.record.add') {
    if (typeof p.category !== 'string' || p.category.length === 0) return '示例缺 category：' + cli;
    if (typeof p.amount !== 'number') return '示例缺 amount：' + cli;
    return '';
  }
  if (p.id === undefined || p.id === null || p.id === '') return '示例缺 id：' + cli;
  return '';
}

/** 16 行接线（纯函数；任一来源漂移即该行 `reason` 非空，调用方判红）。 */
export function buildWriteWire(): readonly WriteWireRow[] {
  const hits = buildHelpLookup();
  return WRITE_WORDS.map((phrase) => {
    const entry = WAKE_TABLE.find((e) => e.phrase === phrase);
    if (entry === undefined) {
      return { phrase, key: 'bill.record.add', params: {}, shape: '', cli: '', helpSceneId: '', reason: '口径层无此词：' + phrase };
    }
    let key: BillKey;
    let params: Record<string, unknown>;
    try {
      const r = routeWakeword(phrase, { id: 1 });
      key = r.key;
      params = r.params;
    } catch (e) {
      return { phrase, key: entry.key, params: {}, shape: '', cli: '', helpSceneId: '', reason: '路由失败：' + (e as Error).message };
    }
    if (key !== entry.key) {
      return { phrase, key, params, shape: '', cli: '', helpSceneId: '', reason: '路由 key 与口径层不一致：' + key + '≠' + entry.key };
    }
    const hit = hits.find((h) => h.phrase === phrase);
    if (hit === undefined) {
      return { phrase, key, params, shape: '', cli: '', helpSceneId: '', reason: 'SKILL 速查缺行：' + phrase };
    }
    if (hit.key !== key) {
      return { phrase, key, params, shape: hit.shape, cli: hit.cli, helpSceneId: '', reason: 'SKILL 行 key 与路由不一致：' + hit.key + '≠' + key };
    }
    const shapeOf = (BILL_KEY_SHAPES as Record<string, string | undefined>)[key];
    if (shapeOf === undefined || shapeOf.length === 0 || shapeOf === '??' || shapeOf !== hit.shape) {
      return { phrase, key, params, shape: hit.shape, cli: hit.cli, helpSceneId: '', reason: '形状对不上：' + String(shapeOf) + '≠' + hit.shape };
    }
    if (!hit.cli.startsWith('bill-cmd-read ' + key)) {
      return { phrase, key, params, shape: shapeOf, cli: hit.cli, helpSceneId: '', reason: 'CLI 不含命令名：' + hit.cli };
    }
    const scene = findWriteScene(phrase);
    if (scene === null) {
      const count = WAKE_ASSETS.filter((s) => s.wake_word === phrase).length;
      return { phrase, key, params, shape: shapeOf, cli: hit.cli, helpSceneId: '', reason: 'HELP 写卡缺位或不唯一（全资产同词 ' + count + ' 张）：' + phrase };
    }
    const exec = executableReason(key, hit.cli);
    if (exec !== '') {
      return { phrase, key, params, shape: shapeOf, cli: hit.cli, helpSceneId: scene.id, reason: exec };
    }
    return { phrase, key, params, shape: shapeOf, cli: hit.cli, helpSceneId: scene.id, reason: '' };
  });
}
