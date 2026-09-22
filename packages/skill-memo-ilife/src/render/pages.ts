// 渲染层·数据页组装（#665）：老 `memo_render.py` 的 TS 换皮——信封（meta＋scene.snapshot＋copy_log）
// ＋各页 snapshot。模板行为一字不改（老权威），填充走共享 `fillTemplate`，资产走公共层产出
// （`memoPageAssets.ts`，#870 起替掉 #665 那份自持窄镜像）。
import { fillTemplate as fillSharedTemplate } from 'base-paint';
import { MemoRenderError } from './errors.js';
import { memoPageAssets } from './memoPageAssets.js';
import { assertHtmlSize, MEMO_HTML_MAX_BYTES } from './html.js';
import { loadTemplate } from './templates.js';

/** 区块里的一行：**要么整行文字，要么带结构的行**（#820 收尾：编号与状态不再拼进同一串 ——
 *  屏上落成「编号徽章 ＋ 正文 ＋ 状态徽章」，`#5 xxx：未排期` 那种两个冒号串三件事的写法退场）。 */
export interface PageRow {
  readonly text: string;
  readonly id?: string | number;
  readonly status?: string;
}

export interface PageSnapshot {
  readonly title: string;
  readonly summary: string[];
  readonly sections: { readonly heading: string; readonly rows: (string | PageRow)[] }[];
}

export interface PageCopyLog {
  readonly thinking: string;
  readonly data_structure: string;
  readonly call_chain: string;
  readonly timestamp?: string;
  readonly exception: string;
}

function occurred(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

// 老 `_envelope`：meta＋scene.snapshot＋copy_log＋技能自有字段混装。`skill_version` 位留空
// （老值 `1.3.0` 是老技能的版本号，新实现不再冒充，页面显示“未知”）。
export function pageEnvelope(input: {
  readonly commandCn: string;
  readonly wakeWord: string;
  readonly sceneId: string;
  readonly title: string;
  readonly summary: string[];
  readonly sections: PageSnapshot['sections'];
  readonly copyLog: PageCopyLog;
  readonly extra?: Record<string, unknown>;
  readonly message: string;
}): Record<string, unknown> {
  const at = occurred();
  const copyLog = { ...input.copyLog, timestamp: input.copyLog.timestamp ?? at };
  return {
    status: 'ok',
    data: {
      meta: { command_cn: input.commandCn, occurred_at: at, skill_name: '备忘录', wake_word: input.wakeWord },
      scene: { scene_id: input.sceneId, snapshot: { title: input.title, summary: input.summary, sections: input.sections } },
      copy_log: copyLog,
      generated_at: at,
      ...(input.extra ?? {}),
    },
    message: input.message,
  };
}

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));

/** 查询页 snapshot（老 `_query_snapshot`）：结果数／有排期／有附件／有提醒＋明细行。 */
export function querySnapshot(items: Row[]): PageSnapshot {
  const due = items.filter((x) => x.due).length;
  const media = items.filter((x) => x.media_path).length;
  const remind = items.filter((x) => x.remind_at || x.reminder_id).length;
  return {
    title: '备忘录查询结果',
    summary: ['结果 ' + items.length + ' 条', '有排期 ' + due + ' 条', '有附件 ' + media + ' 条', '有提醒 ' + remind + ' 条'],
    sections: [
      {
        heading: '明细',
        rows: items.map((x) => {
          const id = str(x.id || x.checkin_note_id || x.reminder_id);
          const content = str(x.content || x.checkin_content || x.reminder_content || x.note_content);
          const cat = str(x.category || x.repeat_type || '未分类');
          const sub = x.sub_category ? '/' + str(x.sub_category) : '';
          const created = str(x.created_at || x.checkin_at || x.remind_at);
          return '#' + id + ' · [' + cat + sub + '] · ' + content.slice(0, 80) + ' · ' + created;
        }),
      },
    ],
  };
}

/** 同步报告 snapshot（老 `_sync_snapshot`）：完成／补建／排期变更／跳过／错误五段。
 *  D-29：明细行降级为计数（对账回执只带 11 项统计，不带逐条；页面信息需求不变）。 */
export function syncSnapshot(c: {
  readonly backfilled: number;
  readonly synced: number;
  readonly dueAdded: number;
  readonly dueOverridden: number;
  readonly dueRemoved: number;
  readonly skippedNoMark: number;
  readonly skippedAlreadyDone: number;
  readonly skippedNoLocalNote: number;
  readonly errors: readonly string[];
}): PageSnapshot {
  const dueChanged = c.dueAdded + c.dueOverridden + c.dueRemoved;
  const skipped = c.skippedNoMark + c.skippedAlreadyDone + c.skippedNoLocalNote;
  const sections: PageSnapshot['sections'] = [];
  if (c.synced) sections.push({ heading: '完成同步明细', rows: ['飞书勾选转本机打卡 ' + c.synced + ' 条'] });
  if (dueChanged) {
    const parts: string[] = [];
    if (c.dueAdded) parts.push('新增排期 ' + c.dueAdded + ' 条');
    if (c.dueOverridden) parts.push('覆盖排期 ' + c.dueOverridden + ' 条');
    if (c.dueRemoved) parts.push('清除排期 ' + c.dueRemoved + ' 条');
    sections.push({ heading: '排期变更', rows: parts });
  }
  if (c.backfilled) sections.push({ heading: '补建到飞书', rows: ['本机心愿补建飞书 task ' + c.backfilled + ' 条'] });
  if (skipped) {
    const parts: string[] = [];
    if (c.skippedNoLocalNote) parts.push('飞书已完成但本机无对应心愿 ' + c.skippedNoLocalNote + ' 条');
    if (c.skippedNoMark) parts.push('飞书 task 缺 memo_id ' + c.skippedNoMark + ' 条');
    if (c.skippedAlreadyDone) parts.push('已处理过 ' + c.skippedAlreadyDone + ' 条');
    sections.push({ heading: '跳过', rows: parts });
  }
  if (c.errors.length) sections.push({ heading: '错误', rows: c.errors.map(String) });
  return {
    title: '备忘录同步报告',
    summary: [
      '完成同步 ' + c.synced + ' 条',
      '补建到飞书 ' + c.backfilled + ' 条',
      '排期变更 ' + dueChanged + ' 条',
      '跳过 ' + skipped + ' 条',
      '错误 ' + c.errors.length + ' 个',
    ],
    sections,
  };
}

function wishRow(w: Row, withDue: boolean): string {
  const due = str(w.current_due ?? w.due);
  const fb = w.feishu_task_guid ? '已同步飞书' : '未同步飞书';
  return '#' + str(w.id) + ' · ' + str(w.content) + (withDue && due ? ' · 排期 ' + due : ' · 未排期') + ' · ' + fb;
}

/** 排期向导 snapshot（老 `render_wish_plan`）：心愿数／未排期／已排期／建议排期＋清单。 */
export function wishPlanSnapshot(items: Row[], suggestDue: string | null, includeAll: boolean): PageSnapshot {
  const unset = items.filter((w) => !w.current_due).length;
  return {
    title: '心愿排期向导',
    summary: [
      '心愿 ' + items.length + ' 个',
      '未排期 ' + unset + ' 个',
      '已排期 ' + (items.length - unset) + ' 个',
      '建议排期 ' + (suggestDue ?? '（未填）'),
    ],
    sections: [{ heading: '心愿清单', rows: items.map((w) => wishRow(w, true)) }],
  };
}

/** 完成向导 snapshot（老 `render_wish_complete`）：待完成／已同步／未同步＋清单。 */
export function wishCompleteSnapshot(items: Row[]): PageSnapshot {
  const withFb = items.filter((w) => w.feishu_task_guid).length;
  return {
    title: '心愿完成向导',
    summary: ['待完成 ' + items.length + ' 个', '已同步飞书 ' + withFb + ' 个', '未同步飞书 ' + (items.length - withFb) + ' 个'],
    sections: [{ heading: '心愿清单', rows: items.map((w) => wishRow(w, true)) }],
  };
}

/** 批量改分类 snapshot（老 `render_change_category`）：候选数／带子分类／原→目标＋清单。 */
export function changeCategorySnapshot(items: Row[], from: string | null, to: string | null): PageSnapshot {
  const withSub = items.filter((w) => w.sub_category).length;
  return {
    title: '批量改分类向导',
    summary: [
      '候选笔记 ' + items.length + ' 条',
      '带子分类 ' + withSub + ' 条',
      '原分类 ' + (from ?? '（全部）') + ' 改成 ' + (to ?? '（待选）'),
    ],
    sections: [
      {
        heading: '笔记清单',
        rows: items.map(
          (w) => '#' + str(w.id) + ' · ' + str(w.content) + (w.sub_category ? ' · sub: ' + str(w.sub_category) : ''),
        ),
      },
    ],
  };
}

/** 初始化报告 snapshot（老 `memo_render.py:413-443` 的 `_init_snapshot`）：检查数／就绪／可选缺失／
 *  必装缺失四段 ＋ 环境检查／待办指引／验证清单三节。模板 `init_report.html` 另在客户端按
 *  `data.items／todos／verify` 逐项渲染，此处 snapshot 只供 envelope 侧的文本摘要与页内节。 */
export function initSnapshot(input: {
  readonly items: readonly { readonly name?: unknown; readonly status?: unknown; readonly desc?: unknown; readonly action?: unknown }[];
  readonly todos: readonly { readonly title?: unknown; readonly steps?: unknown }[];
  readonly verify: readonly unknown[];
}): PageSnapshot {
  const items = input.items;
  const ready = items.filter((i) => i.status === 'ok').length;
  const warn = items.filter((i) => i.status === 'warn').length;
  const err = items.filter((i) => i.status === 'err').length;
  const sections: PageSnapshot['sections'] = [];
  if (items.length) {
    sections.push({
      heading: '环境检查',
      rows: items.map((i) => {
        const mark = i.status === 'ok' ? '✓' : i.status === 'warn' ? '⚠' : '✗';
        const base = '[' + mark + '] ' + str(i.name) + ' · ' + str(i.desc);
        return i.action ? base + ' · 处理: ' + str(i.action) : base;
      }),
    });
  }
  if (input.todos.length) {
    sections.push({
      heading: '待办指引',
      rows: input.todos.map((t) => {
        const steps = Array.isArray(t.steps) ? (t.steps as unknown[]).map(str).join(' → ') : '';
        return str(t.title) + (steps ? ': ' + steps : '');
      }),
    });
  }
  if (input.verify.length) {
    sections.push({
      heading: '验证清单',
      rows: input.verify.map((v) => (v !== null && typeof v === 'object' ? str((v as { text?: unknown }).text ?? '') : str(v))),
    });
  }
  return {
    title: '备忘录 · 初始化报告',
    summary: [
      '检查 ' + items.length + ' 项',
      '就绪 ' + ready + ' 项',
      '可选缺失 ' + warn + ' 项',
      '必装缺失 ' + err + ' 项',
    ],
    sections,
  };
}

/** 整页填充：模板 ＋ 共享 filler ＋ 公共层资产 ＋ 数据。失败一律转渲染错（出口 exit 5）。 */
export function fillMemoPage(template: string, payload: Record<string, unknown>): string {
  const raw = loadTemplate(template);
  try {
    const out = fillSharedTemplate({ template: raw, assets: memoPageAssets(), data: payload });
    assertHtmlSize(out.html, MEMO_HTML_MAX_BYTES);
    return out.html;
  } catch (e) {
    throw new MemoRenderError('MEMO_PAGE_FILL', '整页填充失败（' + template + '）：' + (e as Error).message);
  }
}

/** 快照探针形状 `(templateText, data)`：与别家技能侧 `fillTemplate` 同形（`tooling/skill-html-snapshot.mjs` 直调）。 */
export function fillTemplate(templateText: string, data: unknown): string {
  try {
    const out = fillSharedTemplate({ template: templateText, assets: memoPageAssets(), data });
    return out.html;
  } catch (e) {
    throw new MemoRenderError('MEMO_PAGE_FILL', '整页填充失败：' + (e as Error).message);
  }
}
