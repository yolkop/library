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

import { fetchWithRetry, type ShapeObject } from '../../util.js';

import type { Challenge } from '../../types/Challenge.js';
import type { Map } from '../../types/Map.js';

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

/** A list of the raw ingame challenges (not available in the browser version) */
export let ChallengeList: Challenge[] = [];
/** The available codes to send when you close the WebSocket */
export let CloseCode: Record<string, number> = {};
/** The available codes sent over the game websocket */
export let CommCode: Record<string, number> = {};
/** A list of ingame maps */
export let Maps: Map[] = [];
/** A list of block shapes */
export let Shapes: ShapeObject = {};

class DataLoader {
    static userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

    static async loadManifestData(): Promise<void> {
        const manifest = await (await fetchWithRetry('https://x.yolkbot.xyz/manifestV2.json?v={VERSION}')).json() as Record<string, string>;

        const yolkbotCache = path.join(os.homedir(), '.yolkbot');
        if (!fs.existsSync(yolkbotCache)) fs.mkdirSync(yolkbotCache, { recursive: true });

        const dataDir = path.join(yolkbotCache, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const neededRepulls: Record<string, string> = {};

        const diskManifest = path.join(dataDir, 'manifest.json');
        if (fs.existsSync(diskManifest)) {
            const savedManifest = JSON.parse(fs.readFileSync(diskManifest, 'utf-8')) as Record<string, string>;

            for (const [filename, hashUrl] of Object.entries(manifest)) {
                if (savedManifest[filename] !== hashUrl) neededRepulls[filename] = hashUrl;
            }
        } else Object.assign(neededRepulls, manifest);

        fs.writeFileSync(diskManifest, JSON.stringify(manifest, null, 4));

        await Promise.all(Object.entries(neededRepulls).map(async ([filename, hashUrl]) => {
            const response = await fetchWithRetry(hashUrl.split('|')[1]);
            if (!response.ok) throw new Error(`failed to fetch ${filename}: ${response.status} ${response.statusText}`);

            const data = await response.json();
            fs.writeFileSync(path.join(dataDir, `${filename}.json`), JSON.stringify(data, null, 4), { flag: 'w+' });
        }));

        CloseCode = JSON.parse(fs.readFileSync(path.join(dataDir, 'CloseCode.json'), 'utf-8'));
        CommCode = JSON.parse(fs.readFileSync(path.join(dataDir, 'CommCode.json'), 'utf-8'));
        Shapes = JSON.parse(fs.readFileSync(path.join(dataDir, 'shapes.json'), 'utf-8'));

        const challengesRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'challenges.json'), 'utf-8'));
        ChallengeList = challengesRaw[2].map((item: any) => deflateData<Challenge>([challengesRaw[0], challengesRaw[1], item]));

        const mapsRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'maps.json'), 'utf-8'));
        Maps = mapsRaw[2].map((item: any) => deflateData<Map>([mapsRaw[0], mapsRaw[1], item]));
    }

    static async updateChromeVersion(): Promise<void> {
        const env = getEnvVar('YOLKBOT_USER_AGENT');
        if (env) {
            DataLoader.userAgent = env;
            return;
        }

        const req = await fetchWithRetry('https://versionhistory.googleapis.com/v1/chrome/platforms/mac_arm64/channels/stable/versions/all/releases');
        const res = await req.json() as {
            releases: {
                version: string;
                pinnable: boolean;
                fraction: number;
                serving: {
                    startTime: string;
                    endTime?: string;
                }
            }[]
        };

        const applicableReleases = res.releases.filter(e => !e.pinnable && new Date(e.serving.startTime) <= new Date() && (!e.serving.endTime || new Date(e.serving.endTime) >= new Date()));
        const highestFraction = Math.max(...applicableReleases.map(e => e.fraction));
        const latestFullVersion = applicableReleases.find(e => e.fraction === highestFraction)?.version ?? '157';
        const latestMajorVersion = latestFullVersion.split('.')[0];

        DataLoader.userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${latestMajorVersion}.0.0.0 Safari/537.36`;
    }
}

setInterval(async () => DataLoader.loadManifestData(), 30 * 60 * 1000).unref?.();

await Promise.all([
    DataLoader.loadManifestData(),
    DataLoader.updateChromeVersion()
])

/** Only useful in the browser; waits until ingame data has fully loaded before continuing. This is already called in dependant Bot methods, so it should only be used if you have standalone data */
export const ensureDataLoaded = Promise.resolve();

/** The user agent yolkbot uses for requests, automatically derived from the latest chrome version. You can override it with the `YOLKBOT_USER_AGENT` environment variable. This is only applicable in Node-like environments, browsers will inherit the browser's user agent for requests */
export const UserAgent = DataLoader.userAgent;

/** @hidden */
export const isBrowser = false;