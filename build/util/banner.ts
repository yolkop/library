/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import fs from 'node:fs';
import path from 'node:path';

const months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

const month = months[date.getMonth()];
const day = ordinal(date.getDate());
const year = date.getFullYear();

export const COMPILE_DATE = `${month} ${day}, ${year}`;
export const VERSION = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'version.txt'), 'utf8').trim();
export const BANNER = `/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */\n`;