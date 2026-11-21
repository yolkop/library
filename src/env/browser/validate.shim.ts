/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { wasmMagicString } from '../../util.js';

const hexToUint8Array = (hex: string): Uint8Array<ArrayBuffer> => {
    const match = hex.match(/.{2}/g);
    return match ? new Uint8Array(match.map(b => parseInt(b, 16))) : new Uint8Array();
}

const BLOCK = 64;
const MAX_INNER_MSG = 256;

const enc = new TextEncoder();
const w = new Int32Array(64);

const K = Int32Array.from([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

const sha256Bytes = (bytes: Uint8Array): Uint8Array => {
    const H = new Int32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);

    const bitLen = bytes.length * 8;
    const padLen = (bytes.length + 9 + 63) & ~63;
    const padded = new Uint8Array(padLen);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padLen - 4, bitLen >>> 0, false);
    view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);

    for (let i = 0; i < padLen; i += 64) {
        for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);

        for (let j = 16; j < 64; j++) {
            const wj15 = w[j - 15];
            const wj2 = w[j - 2];
            const s0 = ((wj15 >>> 7) | (wj15 << 25)) ^ ((wj15 >>> 18) | (wj15 << 14)) ^ (wj15 >>> 3);
            const s1 = ((wj2 >>> 17) | (wj2 << 15)) ^ ((wj2 >>> 19) | (wj2 << 13)) ^ (wj2 >>> 10);
            w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
        }

        let a = H[0], b = H[1], c = H[2], d = H[3];
        let e = H[4], f = H[5], g = H[6], h = H[7];

        for (let j = 0; j < 64; j++) {
            const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + K[j] + w[j]) | 0;
            const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) | 0;

            h = g; g = f; f = e; e = (d + t1) | 0;
            d = c; c = b; b = a; a = (t1 + t2) | 0;
        }

        H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0;
        H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }

    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
        out[i * 4] = H[i] >>> 24;
        out[i * 4 + 1] = (H[i] >>> 16) & 0xff;
        out[i * 4 + 2] = (H[i] >>> 8) & 0xff;
        out[i * 4 + 3] = H[i] & 0xff;
    }
    return out;
};

const rawKey = hexToUint8Array(wasmMagicString);
const key = rawKey.length > BLOCK ? sha256Bytes(rawKey) : rawKey;

const ipad = new Uint8Array(BLOCK);
const opad = new Uint8Array(BLOCK);
for (let i = 0; i < BLOCK; i++) {
    ipad[i] = (key[i] ?? 0) ^ 0x36;
    opad[i] = (key[i] ?? 0) ^ 0x5c;
}

const innerBuf = new Uint8Array(BLOCK + MAX_INNER_MSG);
innerBuf.set(ipad);
const outerBuf = new Uint8Array(BLOCK + 32);
outerBuf.set(opad);

const HEX = new Array(256);
for (let i = 0; i < 256; i++) HEX[i] = i.toString(16).padStart(2, '0');

export const validate = (hash: string): string => {
    const msg = enc.encode(hash);
    const msgLen = msg.length;

    let inner: Uint8Array;
    if (msgLen <= MAX_INNER_MSG) {
        innerBuf.set(msg, BLOCK);
        inner = innerBuf.subarray(0, BLOCK + msgLen);
    } else {
        inner = new Uint8Array(BLOCK + msgLen);
        inner.set(ipad);
        inner.set(msg, BLOCK);
    }

    outerBuf.set(sha256Bytes(inner), BLOCK);

    const result = sha256Bytes(outerBuf);
    let hex = '';
    for (let i = 0; i < 32; i++) hex += HEX[result[i]];
    return hex;
}
