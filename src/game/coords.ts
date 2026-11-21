/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

const TABLE = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'];

const round = (x: number): number => Math.trunc(x + (x < 0 ? -0.49999999999999994 : 0.49999999999999994));

const truncSat = (x: number, hi: number): number => {
    if (!(x >= 0)) return 0;
    if (x > hi) return hi;
    return Math.trunc(x);
};

const bswap = (x: number): number => ((x << 8) | ((x & 0xff00) >>> 8)) | 0;
const digit = (c: number): number => (c > 57 ? (((c - 65) & -33) + 10) : c - 48) >>> 0;

const keyFromUniqueId = (seed: string, flag = 0): number => {
    const b = new TextEncoder().encode(seed);
    if (b.length < 4) return flag;
    let i = b.length - 4;
    if (b[i] > 127) return 0;
    if (b[i] === 43) i += 1;
    const d0 = digit(b[i]), d1 = digit(b[i + 1]), d2 = digit(b[i + 2]);
    if (d0 > 35 || d1 > 35 || d2 > 35) return 0;
    const acc = (d0 * 36 + d1) * 36 + d2;
    if (b[b.length - 4] === 43) return acc;
    const d3 = digit(b[i + 3]);
    if (d3 > 35) return 0;
    const scaled = (acc & 0xffff) * 36;
    if (scaled >>> 16) return 0;
    const sum = scaled + d3;
    return (sum & 0xffff) === sum ? sum : 0;
};

/**
 * Creates the "coords" parameter for the player sync packet
 * @param yaw The current player yaw
 * @param pitch The current player pitch
 * @param uniqueId The player's uniqueId
 * @param invert The "invert" value (default "1")
 * @returns An 8 length string with base64 coordinates
 */
export const coords = (yaw: number, pitch: number, uniqueId: string, invert = 1): string => {
    const key = keyFromUniqueId(uniqueId);

    const yaw16 = truncSat(round((yaw / (Math.PI * 2)) * 65535), 65535);
    const pitch16 = truncSat(round(((pitch * invert + 1.5) / 3) * 32767), 32767);

    const masked = key ^ yaw16;
    const p = pitch16;
    const mixed = masked ^ p;

    const sMasked = bswap(masked);
    const tail = (mixed & 255) ^ sMasked;
    const sMixed = bswap(mixed);
    const plain = yaw16 ^ p;
    const head = sMixed ^ (plain & 255);
    const sPlain = bswap(plain);
    const lead = sPlain ^ (masked & 255);

    return TABLE[(lead & 252) >>> 2]
        + TABLE[(((sPlain >>> 12) & 15) | (lead << 4)) & 63]
        + TABLE[((sPlain >>> 6) & 60) | ((head >>> 6) & 3)]
        + TABLE[head & 63]
        + TABLE[(sMixed >>> 10) & 63]
        + TABLE[((sMixed >>> 4) & 48) | ((tail >>> 4) & 15)]
        + TABLE[(((sMasked >>> 14) & 3) | (tail << 2)) & 63]
        + TABLE[(sMasked >>> 8) & 63];
};