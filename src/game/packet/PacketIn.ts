/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

const decoder = new TextDecoder('utf-16');

/** A helper class for unpacking incoming binary data from the server */
export class PacketIn {
    /** The buffer containing the incoming data */
    buffer: Uint8Array;
    /** The current index in the buffer (automatically updated by unpacking methods) */
    idx = 0;

    /**
     * Creates a new PacketIn instance
     * @param buf The buffer containing the incoming data
     */
    constructor(buf: Uint8Array<ArrayBuffer>) {
        this.buffer = new Uint8Array(buf);
        this.idx = 0;
    }

    /**
     * Checks if there is more data to be unpacked from the buffer
     * @returns Whether there is more data to be unpacked from the buffer
     */
    isMoreDataAvailable(): boolean {
        return this.idx < this.buffer.length;
    }

    /**
     * Gets the number of bytes left to be unpacked from the buffer
     * @returns The number of bytes left to be unpacked from the buffer
     */
    getBytesLeft(): number {
        return this.buffer.length - this.idx;
    }

    /**
     * Unpacks an unsigned 8-bit integer from the buffer
     * @returns A number from 0 to 255
     */
    unpackInt8U(): number {
        return this.buffer[this.idx++];
    }

    /**
     * Unpacks a signed 8-bit integer from the buffer
     * @returns A number from -128 to 127
     */
    unpackInt8(): number {
        const v = this.unpackInt8U();
        return (v << 24) >> 24;
    }

    /**
     * Unpacks an unsigned 16-bit integer from the buffer
     * @returns A number from 0 to 65535
     */
    unpackInt16U(): number {
        const i2 = this.idx;
        this.idx += 2;
        return this.buffer[i2] | (this.buffer[i2 + 1] << 8);
    }

    /**
     * Unpacks an unsigned 24-bit integer from the buffer
     * @returns A number from 0 to 16777215
     */
    unpackInt24U(): number {
        const i2 = this.idx;
        this.idx += 3;
        return this.buffer[i2] | (this.buffer[i2 + 1] << 8) | (this.buffer[i2 + 2] << 16);
    }

    /**
     * Unpacks an unsigned 32-bit integer from the buffer
     * @returns A number from 0 to 4294967295
     */
    unpackInt32U(): number {
        const i2 = this.idx;
        this.idx += 4;
        return (this.buffer[i2] | (this.buffer[i2 + 1] << 8) | (this.buffer[i2 + 2] << 16) | (this.buffer[i2 + 3] << 24)) >>> 0;
    }

    /**
     * Unpacks a signed 16-bit integer from the buffer
     * @returns A number from -32768 to 32767
     */
    unpackInt16(): number {
        const v = this.unpackInt16U();
        return (v << 16) >> 16;
    }

    /**
     * Unpacks a signed 32-bit integer from the buffer
     * @returns A number from -2147483648 to 2147483647
     */
    unpackInt32(): number {
        const v = this.unpackInt32U();
        return v << 0;
    }

    /**
     * Unpacks an unsigned radian value from the buffer, represented as a 24-bit integer where 2097152 units equal 360 degrees
     * @returns A number from 0 to 2 * Math.PI
     */
    unpackRadU(): number {
        return this.unpackInt24U() / 2097152;
    }

    /**
     * Unpacks a signed radian value from the buffer, represented as a 16-bit integer where 8192 units equal 360 degrees
     * @returns A number from -Math.PI to Math.PI
     */
    unpackRad(): number {
        const v = this.unpackInt16U() / 8192;
        return v - Math.PI;
    }

    /**
     * Unpacks a floating point value from the buffer, represented as a 16-bit integer where 256 units equal 1
     * @returns A number with a fractional part, depending on the value in the buffer
     */
    unpackFloat(): number {
        return this.unpackInt16() / 256;
    }

    /**
     * Unpacks a double precision floating point value from the buffer, represented as a 32-bit integer where 1048576 units equal 1
     * @returns A number with a fractional part, depending on the value in the buffer
     */
    unpackDouble(): number {
        return this.unpackInt32() / 1048576;
    }

    /**
     * Unpacks a string from the buffer, prefixed with an unsigned 8-bit integer representing the length of the string in characters (not bytes)
     * @param maxLen The maximum allowed length of the string in characters (not bytes). Defaults to 255, which is the maximum representable by the length prefix
     * @returns A string of up to maxLen characters, depending on the value in the buffer
     */
    unpackString(maxLen = 255): string {
        const len = Math.min(this.unpackInt8U(), maxLen);
        return this.#unpackStringHelper(len);
    }

    /**
     * Unpacks a long string from the buffer, prefixed with an unsigned 16-bit integer representing the length of the string in characters (not bytes)
     * @param maxLen The maximum allowed length of the string in characters (not bytes). Defaults to 16383, which is the maximum representable by the length prefix
     * @returns A string of up to maxLen characters, depending on the value in the buffer
     */
    unpackLongString(maxLen = 16383): string {
        const len = Math.min(this.unpackInt16U(), maxLen);
        return this.#unpackStringHelper(len);
    }

    #unpackStringHelper(len: number): string {
        if (this.getBytesLeft() < len * 2) return '';

        const startIdx = this.idx;
        this.idx += len * 2;

        return decoder.decode(this.buffer.subarray(startIdx, this.idx));
    }
}