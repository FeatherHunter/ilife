/** 主密钥改从文件读（#793 定稿，#794 落地）。
 *
 * 第一性原理（定稿出处 #793）：口令经调用参数传会**进对话记录与日志**（仓内已有"密码脱敏"补丁，
 * 说明这是已知风险）；文件是唯一来源，口令只落磁盘一处。故调用参数 `master_key`／`masterKey` 退场，
 * 账号类命令一律读 `key.file` 指的那个文件（内容 trim 后当主密钥）。
 *
 * 同一个口令 ⇒ 同一个 `scryptSync(口令,'home-salt',32)`（`fetch/db.ts` 的 `deriveKey`）⇒
 * 老库那几条 accounts 照样解得开，无迁移。
 *
 * **不自动生成密钥文件**：密钥是人的口令，技能随机生成了用户就不知道，换机即不可恢复 ⇒
 * 文件不在时报错 ＋ 人话指引（与"库不存在自动建"不同：库是数据，密钥是凭据）。
 */
import { existsSync, readFileSync } from 'node:fs';
import { HomeFetchError } from './errors.js';
import { resolveKeyFile } from './paths.js';

/** 读主密钥文件，返回 trim 后的口令（BOM 一并去掉）。
 *
 * 文件不在 ⇒ 响亮失败，报文里给出该文件绝对路径 ＋ 建法指引；
 * 内容过短（<8 位，与 `assertMasterKey` 同门）⇒ 同样响亮失败。 */
export function loadMasterKey(keyFile = resolveKeyFile()): string {
  if (!existsSync(keyFile)) {
    throw new HomeFetchError('HOME_MASTER_KEY_MISSING',
      '主密钥文件不在：' + keyFile + '。把口令写进这个文件（纯文本一行即可），再跑这条命令；换机恢复后要用账号密码，把它一起带过去。');
  }
  let text: string;
  try {
    text = readFileSync(keyFile, 'utf8');
  } catch (e) {
    throw new HomeFetchError('HOME_MASTER_KEY_UNREADABLE',
      '主密钥文件读不出来：' + keyFile + '（' + (e instanceof Error ? e.message : String(e)) + '）', { cause: e });
  }
  const key = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).trim();
  if (key.length < 8) {
    throw new HomeFetchError('HOME_ACCOUNT_BAD_KEY',
      '主密钥文件里的口令须 ≥8 位：' + keyFile + '（缺失阻断，不返空）');
  }
  return key;
}

/** 退场报文：调用参数里给了 `master_key`／`masterKey` 时用它响亮失败（exit 2：用法错），
 *  报文直接说"把它写进 <路径>"。口令不许再经调用参数传（会进对话记录与日志）。 */
export function retiredParamMessage(keyFile = resolveKeyFile()): string {
  return '主密钥改从文件读：调用参数不再收口令。把它写进 ' + keyFile + '（纯文本一行即可），再跑这条命令。';
}

/** 调用参数里有没有已退场的口令键（分派层判用法错用）。 */
export function hasParamMasterKey(params: Record<string, unknown>): boolean {
  return params['master_key'] !== undefined || params['masterKey'] !== undefined;
}
