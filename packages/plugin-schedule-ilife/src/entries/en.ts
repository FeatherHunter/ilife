/** plugin-schedule-ilife · 词条表（英文列：与 `zh.ts` 同 key）。
 *
 *  空串＝未录（#1306：缺词条门判红），迁移票内必须补齐。
 *  key 集合的权威是 `zh.ts`；拼错 key 编译期红（`PluginScheduleIlifeMessageId` 从 zh 派生，见 `index.ts`）。
 */
import type { MessageTable } from 'base-entries';

export const en = {
  /* ── packages/plugin-schedule-ilife/src/client.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.client.c001': "Host connection missing: connection.rpc.call is unavailable",
  'plugin-schedule-ilife.client.c002': "Malformed receipt envelope (not an ok envelope)",
  'plugin-schedule-ilife.client.c003': "Health check receipt rejected (host gave no payload)",
  'plugin-schedule-ilife.client.c004': "Config request timed out ({p0}s): no reply from the host",
  'plugin-schedule-ilife.client.c005': "Health check failed: {p0}",
  'plugin-schedule-ilife.client.c006': "Health check receipt has no Feishu CLI entry",
  'plugin-schedule-ilife.client.c007': "Feishu CLI",
  'plugin-schedule-ilife.client.c008': 'Not checked yet; click "Check again" to run a health check',
  'plugin-schedule-ilife.client.c009': "Copy install guide",
  'plugin-schedule-ilife.client.c010': "Check again",
  'plugin-schedule-ilife.client.c011': "Feishu CLI",
  'plugin-schedule-ilife.client.c012': "Checking",
  'plugin-schedule-ilife.client.c013': "Copy install guide",
  'plugin-schedule-ilife.client.c014': "Check again",
  'plugin-schedule-ilife.client.c015': "Feishu CLI",
  'plugin-schedule-ilife.client.c016': "Check again",
  'plugin-schedule-ilife.client.c017': "Feishu CLI",
  'plugin-schedule-ilife.client.c018': "Signed in; calendar readable",
  'plugin-schedule-ilife.client.c019': "Feishu CLI not found",
  'plugin-schedule-ilife.client.c020': "Found, but not signed in / calendar unreadable",
  'plugin-schedule-ilife.client.c021': "Copy install guide",
  'plugin-schedule-ilife.client.c022': "Check again",
  'plugin-schedule-ilife.client.c023': "Install guide copied",
  'plugin-schedule-ilife.client.c024': "Copy failed: clipboard unavailable; please copy the install guide from the dialog manually",
  /* ── packages/plugin-schedule-ilife/src/index.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.index.c001': "Payload must be {values: object}",
  'plugin-schedule-ilife.index.c002': "Unknown endpoint: {p0}",
  'plugin-schedule-ilife.index.c003': "[dsh-schedule-ilife] connection.fetch is missing: the settings page config endpoint is not registered",
  /* ── packages/plugin-schedule-ilife/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.skill-tool.c001': "Command (a schedule.* key), e.g. schedule.help.lookup",
  'plugin-schedule-ilife.skill-tool.c002': "Optional params object, passed through to the skill exit (--params JSON)",
  'plugin-schedule-ilife.skill-tool.c003': "The only exit for running the schedule skill (argv+JSON+exit); returns envelope JSON. The only way to write or read schedule data; no shell, no PATH. Example keys: schedule.help.lookup (Schedule Keeper HELP), schedule.today.summary (today's summary). If a file path is included this time, hand the file to the user and quote its path; if not, answer in text only and never invent a file.",
  /* ── packages/plugin-schedule-ilife/src/settings.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.settings.c001': "Data directory",
  'plugin-schedule-ilife.settings.c002': "Root directory for the library file and outputs. Empty = use the default directory.",
  'plugin-schedule-ilife.settings.c003': "Library file name",
  'plugin-schedule-ilife.settings.c004': "The library file under the data directory.",
  'plugin-schedule-ilife.settings.c005': "HELP output directory",
  'plugin-schedule-ilife.settings.c006': "Directory for HELP pages.",
  /* ── packages/plugin-schedule-ilife/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-schedule-ilife.index.c004': "body is not JSON",
  'plugin-schedule-ilife.index.c005': "Invalid schedule request.",
  /* ── packages/plugin-schedule-ilife/src/client.ts（#1229 迁入·飞书官网行） ── */
  'plugin-schedule-ilife.client.c025': "Feishu CLI official site: {p0}",
  /* ══ #1231 共享词条：由 tooling/gen-shared-copy.mjs 自 tooling/shared-copy.json 生成，勿手改 ══ */
  'plugin-schedule-ilife.slot.c001': "Schedule Keeper",
  'plugin-schedule-ilife.settings.c007': "Advanced",
  'plugin-schedule-ilife.bridge.c001': "Manager is missing; install it: dsh plugin add dsh-life-pack dsh-schedule-ilife (never uninstall the manager alone)",
  /* ══ #1231 共享词条生成段结束 ══ */
} as const satisfies MessageTable;
