/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getEnvVar } from '#env/env';

import { fetchWithRetry } from '../../util.js';

import type { MapJSON } from '../../types/Map.js';

/**
 * Loads the full map data in the format of a {@link MapJSON}
 * @param name The map name
 * @param hash The optional map hash, which can be used for decaching
 * @returns The full map JSON data, which includes the map's sun, fog, and full mesh data
 */
export const loadMap = async (name: string, hash = ''): Promise<MapJSON> => {
    const yolkbotCache = path.join(os.homedir(), '.yolkbot');
    if (!fs.existsSync(yolkbotCache)) fs.mkdirSync(yolkbotCache);

    const mapCache = path.join(yolkbotCache, 'maps');
    if (!fs.existsSync(mapCache)) fs.mkdirSync(mapCache);

    const safeName = name.replace(/[^a-z0-9_-]/gi, '_');
    const safeHash = hash.replace(/[^a-z0-9_-]/gi, '_');
    const mapFile = path.join(mapCache, `${safeName}-${safeHash}.json`);

    if (fs.existsSync(mapFile)) return JSON.parse(fs.readFileSync(mapFile, 'utf-8'));

    const data = await (await fetchWithRetry(`${getEnvVar('LOFT_URL') || 'https://x.yolkbot.xyz'}/maps/${name}.json?${hash}`)).json();
    fs.writeFileSync(mapFile, JSON.stringify(data, null, 4), { flag: 'w+' });
    return data as MapJSON;
}