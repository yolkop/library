/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { fetchWithRetry } from '../../util.js';

import type { MapJSON } from '../../types/Map.js';

export const loadMap = async (name: string, hash: string): Promise<MapJSON> => {
    const data = await (await fetchWithRetry(`https://x.yolkbot.xyz/maps/${name}.json?${hash}`)).json();
    return data as MapJSON;
}