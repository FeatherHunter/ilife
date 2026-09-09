/** t79：从 `calorie.help.center` 的 stdout 收据里取 file 态产物路径并算 sha256（收据可能是 UTF-16LE）。 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const file = process.argv[2];
if (!file) { console.error('用法：node t79-help-sha.mjs <stdout-收据文件>'); process.exit(2); }
let raw = readFileSync(file);
// 去 BOM：UTF-16LE BOM = FF FE；UTF-8 BOM = EF BB BF
if (raw[0] === 0xff && raw[1] === 0xfe) raw = Buffer.from(raw.toString('utf16le'), 'utf8');
else if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) raw = raw.subarray(3);
const text = raw.toString('utf8').replace(/^\uFEFF/, '');
const json = JSON.parse(text);
const p = json.delivery?.path ?? json.data?.output;
const bytes = readFileSync(p);
console.log('delivery.mode =', json.delivery?.mode);
console.log('delivery.template =', json.delivery?.template);
console.log('delivery.bytes =', json.delivery?.bytes);
console.log('artifact =', p);
console.log('artifact bytes =', bytes.length);
console.log('sha256 =', createHash('sha256').update(bytes).digest('hex'));
