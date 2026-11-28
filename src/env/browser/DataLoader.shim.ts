/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { getEnvVar } from '#env/env';

import { fetchWithRetry, type ShapeObject } from '../../util.js';

import type { Map } from '../../types/Map.js';

const DB_NAME = 'yolkbot';
const DB_VERSION = 2;

const isIDBSupported = typeof indexedDB !== 'undefined';

const openDB = async (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (): IDBObjectStore => req.result.createObjectStore('cache');
    req.onsuccess = (): void => resolve(req.result);
    req.onerror = (): void => reject(req.error);
});

const idbGet = async <T>(db: IDBDatabase, key: string): Promise<T | undefined> => new Promise((resolve, reject) => {
    const req = db.transaction('cache', 'readonly').objectStore('cache').get(key);
    req.onsuccess = (): void => resolve(req.result);
    req.onerror = (): void => reject(req.error);
});

const idbSet = async (db: IDBDatabase, key: string, value: unknown): Promise<void> => new Promise((resolve, reject) => {
    const req = db.transaction('cache', 'readwrite').objectStore('cache').put(value, key);
    req.onsuccess = (): void => resolve();
    req.onerror = (): void => reject(req.error);
});

const deflateData = <T>([dict, shiftMagic, object]: [string[], number, any]): T => {
    for (const key of Object.keys(object)) {
        if (key.length > 1) continue;

        const charCode = key.charCodeAt(0) - shiftMagic;
        if (charCode < 0 || charCode >= dict.length) continue;

        const originalKey = dict[charCode];
        object[originalKey] = object[key];
        delete object[key];

        if (typeof object[originalKey] === 'object' && !Array.isArray(object[originalKey]) && object[originalKey] !== null) deflateData([dict, shiftMagic, object[originalKey]]);
        else if (typeof object[originalKey] === 'string') {
            const valCode = object[originalKey].charCodeAt(0) - shiftMagic;
            if (object[originalKey].length === 1 && valCode >= 0 && valCode < dict.length) object[originalKey] = dict[valCode];
        }
    }

    return object;
}

export let CloseCode: Record<string, number> = {};
export let CommCode: Record<string, number> = {};
export let Maps: Map[] = [];
export let Shapes: ShapeObject = {};

class DataLoader {
    static async loadData(): Promise<void> {
        const manifest = await (await fetchWithRetry(`${getEnvVar('LOFT_URL') || 'https://x.yolkbot.xyz'}/manifestV2.json?v={VERSION}`)).json() as Record<string, string>;

        delete manifest.challenges;

        const neededRepulls: Record<string, string> = {};
        const memoryCache: Record<string, any> = {};
        let db: IDBDatabase | null = null;

        if (isIDBSupported) {
            db = await openDB();
            const savedManifest = await idbGet<Record<string, string>>(db, 'manifest');

            if (savedManifest) {
                await Promise.all(Object.entries(manifest).map(async ([filename, hashUrl]) => {
                    if (savedManifest[filename] !== hashUrl) neededRepulls[filename] = hashUrl;
                    else if (db) memoryCache[filename] = await idbGet<any>(db, filename);
                }));
            } else Object.assign(neededRepulls, manifest);

            await idbSet(db, 'manifest', manifest);
        } else Object.assign(neededRepulls, manifest);

        await Promise.all(Object.entries(neededRepulls).map(async ([filename, hashUrl]) => {
            const response = await fetchWithRetry(hashUrl.split('|')[1]);
            if (!response.ok) throw new Error(`failed to fetch ${filename}: ${response.status} ${response.statusText}`);

            const data = await response.json();
            memoryCache[filename] = data;

            if (db) await idbSet(db, filename, data);
        }));

        if (db) db.close();

        CloseCode = memoryCache.CloseCode;
        CommCode = memoryCache.CommCode;
        Shapes = memoryCache.shapes;

        Maps = memoryCache.maps[2].map((item: any) => deflateData<Map>([memoryCache.maps[0], memoryCache.maps[1], item]));
    }
}

setInterval(async () => DataLoader.loadData(), 30 * 60 * 1000);

const promise = DataLoader.loadData();
export const ensureDataLoaded = promise;

export const ChallengeList = [];

export const isBrowser = true;