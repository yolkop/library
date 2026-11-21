/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { CommCode } from '#env/DataLoader';

import { getFlag } from '../../util.js';

/** Allows you to send data to the game server */
export class PacketOut {
    /** The current index in the buffer (automatically updated by packing methods) */
    idx = 0;
    /** The ArrayBuffer containing the outgoing data */
    arrayBuffer: ArrayBuffer;
    /** A DataView for writing data to the arrayBuffer */
    view: DataView;

    /**
     * Creates a new PacketOut instance
     * @param size The size of the buffer to create, in bytes. Defaults to 16384, which should be large enough for any single packet
     */
    constructor(size = 16384) {
        this.idx = 0;
        this.arrayBuffer = new ArrayBuffer(size);
        this.view = new DataView(this.arrayBuffer);
    }

    /**
     * Sends the packed data to the server through the given WebSocket or WebSocket-like object with a send method
     * @param ws A WebSocket or any object with a send method that accepts a Uint8Array or ArrayBuffer
     */
    send(ws: { readyState: number, send: (data: Uint8Array<ArrayBuffer>) => void } | WebSocket): void {
        if (ws.readyState === 1) {
            const b2 = new Uint8Array(this.arrayBuffer, 0, this.idx);
            ws.send(b2);

            if (getFlag('LOG_PACKETS')) console.log(`[LOG_PACKETS] out: ${Object.keys(CommCode).find(k => CommCode[k as keyof typeof CommCode] === b2[0]) ?? 'unknown'} (${b2[0]})`);
        } else {
            console.trace('PacketOut.send: WebSocket is not open, cannot send data');
            console.log('PacketOut.send: this is due to a race condition within yolkbot. it is not a bug in your code, nor something to be concerned about.');
        }
    }

    /**
     * Packs a signed 8-bit integer into the buffer
     * @param val A number from -128 to 127
     */
    packInt8(val: number): void {
        this.view.setInt8(this.idx, val);
        this.idx++;
    }

    /**
     * Packs a signed 16-bit integer into the buffer, little-endian
     * @param val A number from -32768 to 32767
     */
    packInt16(val: number): void {
        this.view.setInt16(this.idx, val, true);
        this.idx += 2;
    }

    /**
     * Packs a signed 24-bit integer into the buffer, little-endian
     * @param val A number from -8388608 to 8388607
     */
    packInt24(val: number): void {
        this.view.setInt16(this.idx, val & 0xFFFF, true);
        this.view.setInt8(this.idx + 2, (val >> 16) & 0xFF);
        this.idx += 3;
    }

    /**
     * Packs a signed 32-bit integer into the buffer, little-endian
     * @param val A number from -2147483648 to 2147483647
     */
    packInt32(val: number): void {
        this.view.setInt32(this.idx, val, true);
        this.idx += 4;
    }

    /**
     * Packs a radian value into the buffer as a signed 24-bit integer where 2097152 units equal 1 radian
     * @param val A number from -Math.PI to Math.PI
     */
    packRadU(val: number): void {
        this.packInt24(val * 2097152);
    }

    /**
     * Packs a radian value into the buffer as a signed 16-bit integer, offset by Math.PI, where 8192 units equal 1 radian.
     * The offset maps -Math.PI to Math.PI onto 0 to 2 * Math.PI, which exceeds the signed 16-bit range for inputs above about 0.86 radians
     * @param val A number from -Math.PI to Math.PI
     */
    packRad(val: number): void {
        this.packInt16((val + Math.PI) * 8192);
    }

    /**
     * Packs a floating point value into the buffer as a signed 16-bit integer where 256 units equal 1
     * @param val A number with a fractional part, from -128 to 127.996
     */
    packFloat(val: number): void {
        this.packInt16(val * 256);
    }

    /**
     * Packs a double precision floating point value into the buffer as a signed 32-bit integer where 1048576 units equal 1
     * @param val A number with a fractional part, from -2048 to 2047.999999
     */
    packDouble(val: number): void {
        this.packInt32(val * 1048576);
    }

    /**
     * Packs a string into the buffer, prefixed with a signed 8-bit integer holding the length of the string in characters (not bytes). Each character is packed as a signed 16-bit integer
     * @param str The string to pack. Strings longer than 127 characters will not round-trip correctly, since the length prefix is signed
     */
    packString(str: string): void {
        this.packInt8(str.length);
        for (let i = 0; i < str.length; i++) this.packInt16(str.charCodeAt(i));
    }

    /**
     * Packs a string into the buffer, prefixed with a signed 16-bit integer holding the length of the string in characters (not bytes). Each character is packed as a signed 16-bit integer
     * @param str The string to pack. Strings longer than 32767 characters will not round-trip correctly, since the length prefix is signed
     */
    packLongString(str: string): void {
        this.packInt16(str.length);
        for (let i = 0; i < str.length; i++) this.packInt16(str.charCodeAt(i));
    }
}