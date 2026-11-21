/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { getEnvVar } from '#env/env';

import type { PlayerGun, Gun } from './game/Guns.js';
import type { Quat } from './game/pathing/math.js';

/** A generic X/Y/Z position */
export interface Position {
    /** The X coordinate */
    x: number;
    /** The Y coordinate */
    y: number;
    /** The Z coordinate */
    z: number;
}

/** @hidden */
export const getFlag = (flag: string): boolean => {
    const v = getEnvVar(flag);
    return !!v && v !== '0' && v.toLowerCase() !== 'false';
}

/** @hidden */
export const initializePlayerGun = (baseGun: Gun): PlayerGun => {
    const createdGun = {
        ...baseGun,
        ammo: {
            ...baseGun.ammo,
            rounds: baseGun.ammo.capacity,
            storeMax: baseGun.ammo.store
        }
    } as PlayerGun;

    return createdGun;
}

/** Represents a unsuccessful request. */
export interface ErrorEnum<T extends string> { ok: false, error: T }
/** @hidden */
export const createError = <T extends string>(errorEnum: T): ErrorEnum<T> => ({ ok: false, error: errorEnum });

/** @hidden */
export const fetchWithRetry = async (url: string, options = {}, retries = 3, backoff = 300): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`failed to make request ${('method' in options && options.method) ?? 'GET'} ${url}; server returned ${response.status}`);
        return response;
    } catch (error) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        } else throw error;
    }
}

/** @hidden */
export const getPositionKey = (x: number, y: number, z: number): number =>
    ((x & 0xFF) << 16) | ((y & 0xFF) << 8) | (z & 0xFF);

/** The difference between two objects; keys that changed will be an object w/ before/after & keys that did not will not be present */
export type ObjectDiff<T extends object> = {
    [K in keyof T]?: { before: T[K]; after: T[K] };
};

/** @hidden */
export const diffObjects = <T extends object>(before: Partial<T>, after: Partial<T>): ObjectDiff<T> => {
    const result = {} as ObjectDiff<T>;

    const keys = new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof T>;

    for (const key of keys) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            (result as any)[key] = { before: before[key], after: after[key] };
        }
    }

    return result;
};

/** @hidden */
export const wasmMagicString = '3496afa51f2a553ea1fc5211400c000b';

/** @hidden */
export type ShapeObject = Record<string, [/* min */[number, number, number], /* max */[number, number, number], /* rot? */ Quat?][]>;

export const UNKNOWN_RESPONSE_EXPLAIN = 'yolkbot does not know how to handle the response returned by the game';