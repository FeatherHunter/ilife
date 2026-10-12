/** 开始使用域模板之四 · **当前配置两页**——票据纸版（1276 落地）。
 *
 * **本件是这两页的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里。
 * 盖住的场景：查看当前配置（`./scene-config-read.js`）与设置当前配置（`./scene-config-write.js`）。
 *
 * 两页同形（照 `./template-list.js` 的票据纸）：店头 → 主数字 → 段 01（配置行）→ 段 02（落点）
 * → 复制区 → 裁切线。写那一页多一段确认态（未给 `confirm` 即预览＋确认口令，给了即回执）。
 * 上屏路径就是真路径（用户 2026-10-13 裁定：脱敏后用户找不到文件），本件不拼路径、不读配置，只摆样子。
 *
 * 载荷与口径一字不动：出口 `data = { ok, message, receipt }` 由 `./run.js` 装配，本件只出 HTML。
 */
import { renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketFurnitureStyleTag, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { writeSection } from '../shared/writeParts.js';
import { copyZoneOf, setupCheck, setupEntryCard } from './pageParts.js';
import type { SetupRowInput } from './pageParts.js';
import type { SetupScene } from './scene.js';
import type { ConfigView } from './configOps.js';

/** 配置来源脚注（复制日志第 3 段与上屏来源分两处：机器看文件名，上屏的不印绝对路径）。 */
const SOURCE_CONFIG_READ = '配置文件 bill.yaml（只读，不改文件）';
const SOURCE_CONFIG_WRITE = '配置文件 bill.yaml（写回执）';

/** 查看当前配置那一页的入参。 */
export interface ConfigReadDocInput {
  readonly op: 'config-read';
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  readonly view: ConfigView;
  readonly envelope: SerializableEnvelope;
}

/** 设置当前配置那一页的入参（`confirmed`＝已落盘回执，否则预览＋确认口令）。 */
export interface ConfigWriteDocInput {
  readonly op: 'config-write';
  readonly scene: SetupScene;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly actionAt: string;
  readonly view: ConfigView;
  readonly preview: readonly { readonly key: string; readonly label: string; readonly value: string }[];
  readonly confirmed: boolean;
  readonly prompt: string;
  readonly envelope: SerializableEnvelope;
}

export type ConfigDocInput = ConfigReadDocInput | ConfigWriteDocInput;

/** 配置行→明细卡行（序号按行序，副行写键名，值就是 `view` 里的真值）。 */
function rowsOf(rows: readonly { readonly key: string; readonly label: string; readonly value: string }[]): readonly SetupRowInput[] {
  return rows.map((r, i) => ({
    no: String(i + 1),
    text: r.label + ' · ' + r.value,
    sub: r.key,
    tone: 'done' as const,
  }));
}

function readBody(input: ConfigReadDocInput): string {
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, '当前配置就长这样', input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: '当前配置 · 6 项', value: String(input.view.rows.length), unit: '项',
      note: '配置文件里的当刻值（真路径，已不脱敏）', layout: 'ticket',
    }), '')
    + ticketRule()
    + ticketSection({ title: '配置行', tag: '01', content: setupEntryCard(rowsOf(input.view.rows)) })
    + ticketRule()
    + ticketSection({
      title: '落点',
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: '配置文件', value: input.view.configPath },
          { label: '库文件', value: input.view.resolved.find((r) => r.label === '库文件')?.value ?? '—' },
          { label: '产物目录', value: input.view.resolved.find((r) => r.label === '产物目录')?.value ?? '—' },
        ],
        layout: 'ticket',
      }) + setupCheck('路径就是这台机器上的真路径，照着它去找文件即可。要改哪格，跟助手说一遍「设置当前配置」。'),
    })
    + ticketActions(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: SOURCE_CONFIG_READ, detail: '读了当前配置 6 项', actionAt: input.actionAt,
    }));
}

function writeBody(input: ConfigWriteDocInput): string {
  const head = input.confirmed
    ? { title: '已经写进配置文件了', eyebrow: '已写入 · OK', value: String(input.preview.length), unit: '项', note: '改过的那几格，余下沿用现值' }
    : { title: '这样写进去，对就确认', eyebrow: '待确认 · 预览', value: String(input.preview.length), unit: '项', note: '确认后才落盘，不确认不改文件' };
  return ticketFurnitureStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.scene.title, head.title, input.scene.subtitle)
    + ticketSummary(renderSummaryHead({
      eyebrow: head.eyebrow, value: head.value, unit: head.unit, note: head.note, layout: 'ticket',
    }), '')
    + ticketRule()
    + ticketSection({ title: input.confirmed ? '写进去的项' : '要写的项', tag: '01', content: setupEntryCard(rowsOf(input.preview)) })
    + ticketRule()
    + ticketSection({
      title: '落点',
      tag: '02',
      content: renderLedgerRows({
        rows: [
          { label: '配置文件', value: input.view.configPath },
          { label: '状态', value: input.confirmed ? '已落盘' : '还没写（等确认）' },
        ],
        layout: 'ticket',
      }) + setupCheck(input.confirmed
        ? '写完即生效：下一次读配置即新值。'
        : '跟助手说一遍确认口令（复制区那句）即落盘；不说就不改文件。'),
    })
    + ticketActions(copyZoneOf({
      envelope: input.envelope, title: input.scene.title, key: input.key, params: input.params,
      source: SOURCE_CONFIG_WRITE, detail: input.confirmed ? '写了配置 ' + String(input.preview.length) + ' 项' : '预览了配置改动 ' + String(input.preview.length) + ' 项', actionAt: input.actionAt,
    }));
}

/** 当前配置两页：一整页（票据纸）。 */
export function configDoc(input: ConfigDocInput): string {
  const paper = input.op === 'config-read' ? readBody(input) : writeBody(input);
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'list', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper }),
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·' + input.scene.title, bodyHtml: content, paper: 'detail' });
}
