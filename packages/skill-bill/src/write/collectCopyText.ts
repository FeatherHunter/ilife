// 采集页人话门：已给还差下一步分行，三份人话。
// base 冻结不动，bill 内采集口径只住这一件。
// SAY 与回落壳共用本门，复用回执门方向词与共用件单行化／CSV／截断口径。
// 用处：saySheet 采集载荷与五模板回落壳复制区三份覆写经公开接口调。
import { DOC_TITLE, sceneKeyOf } from '../shared/pageIdentity.js';
import { MISSING, csvCell, oneLine, truncate } from '../shared/copyText.js';
import { copyDirectionOf } from './copyTextReceipt.js';
export interface CollectCopyFacts {
  readonly category: string;
  readonly amount: number | null;
  readonly time: string;
  readonly account: string;
  readonly ledger: string;
  readonly note: string;
  readonly currency: string;
  readonly missing: readonly string[];
}
const PAGE_TAIL = '采集';
const GIVEN_EMPTY = '无';
const MISSING_EMPTY = '无';
const NOTE_LIMIT = 200;
const NEXT_READY = '已填齐，可以复制去说了。';

function pickText(v: string): string {
  const t = typeof v === 'string' ? v : '';
  return t.trim() === '' ? MISSING : oneLine(t);
}
function noteText(v: string): string {
  const t = typeof v === 'string' ? v : '';
  if (t.trim() === '') return MISSING;
  return truncate(t, NOTE_LIMIT, false);
}
function noteJson(v: string): string | null {
  const t = typeof v === 'string' ? v : '';
  if (t.trim() === '') return null;
  return truncate(t, NOTE_LIMIT, false);
}
function signed2(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount) || amount === 0) return MISSING;
  return amount.toFixed(2);
}
function pageLine(word: string): string {
  const w = typeof word === 'string' ? word.trim() : '';
  return DOC_TITLE + ' ' + w + ' ' + PAGE_TAIL;
}
function cleanMissing(missing: readonly string[]): string[] {
  const out: string[] = [];
  for (const m of missing) {
    const t = typeof m === 'string' ? m.trim() : '';
    if (t === '' || out.includes(t)) continue;
    out.push(oneLine(t));
  }
  return out;
}
export interface CollectExtra { readonly label: string; readonly value: string; }
function givenContent(facts: CollectCopyFacts, extra?: readonly CollectExtra[]): string {
  const parts: string[] = [];
  if (facts.category.trim() !== '') parts.push('分类 ' + oneLine(facts.category));
  if (facts.amount !== null && Number.isFinite(facts.amount) && facts.amount !== 0) parts.push('金额 ' + signed2(facts.amount));
  if (facts.time.trim() !== '') parts.push('时间 ' + oneLine(facts.time));
  if (facts.account.trim() !== '') parts.push('账户 ' + oneLine(facts.account));
  if (facts.ledger.trim() !== '') parts.push('账本 ' + oneLine(facts.ledger));
  if (facts.note.trim() !== '') parts.push('备注 ' + noteText(facts.note));
  if (facts.currency.trim() !== '') parts.push('币种 ' + oneLine(facts.currency));
  const xs = extra ?? [];
  for (const e of xs) {
    const lab = typeof e.label === 'string' ? e.label.trim() : '';
    const val = typeof e.value === 'string' ? e.value : '';
    if (lab === '' || val.trim() === '') continue;
    parts.push(lab + ' ' + oneLine(val));
  }
  return parts.length === 0 ? GIVEN_EMPTY : parts.join(' ');
}
function missingContent(facts: CollectCopyFacts): string {
  const items = cleanMissing(facts.missing);
  return items.length === 0 ? MISSING_EMPTY : items.join(' ');
}
function nextContent(word: string, facts: CollectCopyFacts): string {
  const w = typeof word === 'string' ? word.trim() : '';
  const items = cleanMissing(facts.missing);
  if (items.length === 0) return NEXT_READY;
  return '补齐后跟助手说一遍「' + w + '」';
}
function givenLine(facts: CollectCopyFacts, extra?: readonly CollectExtra[]): string {
  return '已给 ' + givenContent(facts, extra);
}
function missingLine(facts: CollectCopyFacts): string {
  return '还差 ' + missingContent(facts);
}
function nextLine(word: string, facts: CollectCopyFacts): string {
  return '下一步 ' + nextContent(word, facts);
}
export function buildCollectCopyText(word: string, kind: string, facts: CollectCopyFacts, extra?: readonly CollectExtra[]): string {
  void kind;
  const w = typeof word === 'string' ? word : '';
  const nl = String.fromCharCode(10);
  return [pageLine(w), givenLine(facts, extra), missingLine(facts), nextLine(w, facts)].join(nl);
}
export function buildCollectCopyJson(word: string, kind: string, key: string, facts: CollectCopyFacts, extra?: readonly CollectExtra[]): string {
  const w = typeof word === 'string' ? word.trim() : '';
  const k = typeof kind === 'string' ? kind : '';
  void k;
  const fullKey = typeof key === 'string' ? key : '';
  const next = nextContent(w, facts);
  const payload: Record<string, unknown> = {
    version: '1.0',
    skill: 'bill',
    shape: 'collect',
    key: sceneKeyOf(fullKey),
    data: {
      ok: false,
      given: {
        category: typeof facts.category === 'string' ? facts.category : '',
        amount: facts.amount,
        time: typeof facts.time === 'string' ? facts.time : '',
        account: typeof facts.account === 'string' ? facts.account : '',
        ledger: typeof facts.ledger === 'string' ? facts.ledger : '',
        note: noteJson(facts.note),
        currency: typeof facts.currency === 'string' ? facts.currency : '',
      },
      missing: cleanMissing(facts.missing),
      next,
      message_derived: next,
      extra: (extra ?? []).filter(function (e) { return typeof e.label === 'string' && e.label.trim() !== '' && typeof e.value === 'string' && e.value.trim() !== ''; }).map(function (e) { return { label: e.label.trim(), value: e.value.trim() }; }),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function buildCollectCopyCsv(word: string, kind: string, facts: CollectCopyFacts, extra?: readonly CollectExtra[]): string {
  const w = typeof word === 'string' ? word : '';
  const k = typeof kind === 'string' ? kind : '';
  const direction = copyDirectionOf(k, facts.amount);
  const rows: ReadonlyArray<readonly [string, string]> = [
    ['已给', givenContent(facts, extra)],
    ['还差', missingContent(facts)],
    ['下一步', nextContent(w, facts)],
    ['分类', pickText(facts.category)],
    ['金额', signed2(facts.amount)],
    ['方向', direction],
    ['时间', pickText(facts.time)],
    ['账户', pickText(facts.account)],
    ['账本', pickText(facts.ledger)],
    ['备注', noteText(facts.note)],
  ];
  const xs = extra ?? [];
  const all = rows.slice();
  for (const e of xs) {
    const lab = typeof e.label === 'string' ? e.label.trim() : '';
    const val = typeof e.value === 'string' ? e.value.trim() : '';
    if (lab === '' || val === '') continue;
    all.push([lab, val]);
  }
  const lines = ['field,value'];
  for (const pair of all) lines.push(csvCell(pair[0]) + ',' + csvCell(pair[1]));
  const nl = String.fromCharCode(10);
  return lines.join(nl);
}