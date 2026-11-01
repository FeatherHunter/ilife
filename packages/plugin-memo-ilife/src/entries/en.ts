/** plugin-memo-ilife · 词条表（英文列：与 `zh.ts` 同 key）。
 *
 *  空串＝未录（#1306：缺词条门判红），迁移票内必须补齐。
 *  key 集合的权威是 `zh.ts`；拼错 key 编译期红（`PluginMemoIlifeMessageId` 从 zh 派生，见 `index.ts`）。
 */
import type { MessageTable } from 'base-entries';

export const en = {
  /* ── packages/plugin-memo-ilife/src/client.ts（#1229 迁入） ── */
  'plugin-memo-ilife.client.c001': "Host connection missing: connection.rpc.call is unavailable",
  'plugin-memo-ilife.client.c002': "Malformed receipt envelope (not an ok envelope)",
  'plugin-memo-ilife.client.c003': "Health check receipt rejected (host gave no payload)",
  'plugin-memo-ilife.client.c004': "Health check timed out ({p0}s): no reply from the host; click Check again",
  'plugin-memo-ilife.client.c005': "Health check failed: {p0}",
  'plugin-memo-ilife.client.c006': "{p0} · skill {p1}",
  'plugin-memo-ilife.client.c007': "Host connection missing: connection.rpc.call is unavailable",
  'plugin-memo-ilife.client.c008': "Malformed receipt envelope (not an ok envelope)",
  'plugin-memo-ilife.client.c009': "Fetch timed out (20s): no reply from the host; check the host logs and DB environment first",
  'plugin-memo-ilife.client.c010': "Fetch failed: {p0}",
  'plugin-memo-ilife.client.c011': "Skill exit missing (missing-cli): {p0}",
  'plugin-memo-ilife.client.c012': "Fetch failed ({p0}): {p1}",
  'plugin-memo-ilife.client.c013': "Fetch returned nothing (do not fake a normal state)",
  'plugin-memo-ilife.client.c014': "Memos loading",
  'plugin-memo-ilife.client.c015': "Feishu CLI",
  'plugin-memo-ilife.client.c016': "Status unknown (the skill receipt has no such cell; please upgrade the skill package)",
  'plugin-memo-ilife.client.c017': "Feishu CLI",
  'plugin-memo-ilife.client.c018': "Signed in; task domain writable",
  'plugin-memo-ilife.client.c019': "Found, but not signed in or no task-domain grant",
  'plugin-memo-ilife.client.c020': "Feishu CLI not found",
  'plugin-memo-ilife.client.c021': "Copy install guide",
  'plugin-memo-ilife.client.c022': "Check again",
  'plugin-memo-ilife.client.c023': "Health check receipt has no Feishu CLI entry",
  'plugin-memo-ilife.client.c024': "Copied; paste it to the AI",
  'plugin-memo-ilife.client.c025': "Copy failed; long-press to select the text below and copy manually",
  'plugin-memo-ilife.client.c026': "Copy install guide",
  'plugin-memo-ilife.client.c027': "Feishu CLI",
  'plugin-memo-ilife.client.c028': 'Not checked yet; click "Check again" to run a health check',
  'plugin-memo-ilife.client.c029': "Check again",
  'plugin-memo-ilife.client.c030': "Feishu CLI",
  'plugin-memo-ilife.client.c031': "Check again",
  'plugin-memo-ilife.client.c032': "Feishu CLI",
  'plugin-memo-ilife.client.c033': "Checking",
  'plugin-memo-ilife.client.c034': "Check again",
  'plugin-memo-ilife.client.c035': "Feishu CLI",
  'plugin-memo-ilife.client.c036': "Check again",
  'plugin-memo-ilife.client.c037': "Memos",
  /* ── packages/plugin-memo-ilife/src/index.ts（#1229 迁入） ── */
  'plugin-memo-ilife.index.c001': "Payload must be {key: string, params: object}",
  'plugin-memo-ilife.index.c002': "Payload must be {values: object}",
  'plugin-memo-ilife.index.c003': "Unknown endpoint: {p0}",
  /* ── packages/plugin-memo-ilife/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-memo-ilife.skill-tool.c001': "Command (a memo.* key), e.g. memo.help.lookup",
  'plugin-memo-ilife.skill-tool.c002': "Optional params object, passed through to the skill exit (--params JSON)",
  'plugin-memo-ilife.skill-tool.c003': "The only exit for running the memo skill (argv+JSON+exit); returns envelope JSON. The only way to write or read memo data; no shell, no PATH. Example keys: memo.help.lookup (Memos HELP), memo.search (search notes). If a file path is included this time, hand the file to the user and quote its path; if not, answer in text only and never invent a file.",
  /* ── packages/plugin-memo-ilife/src/bridge.ts（#1229 迁入） ── */
  'plugin-memo-ilife.bridge.c001': "Manager is missing; install it: dsh plugin add dsh-life-pack dsh-memo-ilife (never uninstall the manager alone)",
  /* ── packages/plugin-memo-ilife/src/settings.ts（#1229 迁入） ── */
  'plugin-memo-ilife.settings.c001': "Data directory",
  'plugin-memo-ilife.settings.c002': "Root directory for the library file and outputs. Empty = use the default directory.",
  'plugin-memo-ilife.settings.c003': "Library file name",
  'plugin-memo-ilife.settings.c004': "The library file under the data directory (Memos keeps no library; this shows where it would land).",
  'plugin-memo-ilife.settings.c005': "HTML output directory name",
  'plugin-memo-ilife.settings.c006': "Name of the subdirectory under the data directory for HELP pages.",
  'plugin-memo-ilife.settings.c007': "Attachment directory",
  'plugin-memo-ilife.settings.c008': "Root directory for attachments. Empty = media under the data directory (the directory must already exist; the skill will not create it).",
  'plugin-memo-ilife.settings.c009': "Advanced",
  /* ── packages/plugin-memo-ilife/src/slot.ts（#1229 迁入） ── */
  'plugin-memo-ilife.slot.c001': "Memos",
  /* ── packages/plugin-memo-ilife/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-memo-ilife.index.c004': "body is not JSON",
  'plugin-memo-ilife.index.c005': "Invalid memo request.",
  /* ── packages/plugin-memo-ilife/src/client.ts（#1229 迁入·超时提示） ── */
  'plugin-memo-ilife.client.c038': "Fetch timed out ({p0}s): no reply from the host; check the host logs and DB environment first",
} as const satisfies MessageTable;
