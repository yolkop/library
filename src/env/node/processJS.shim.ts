/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

/**
 * "Processes" the game's JS file
 * @param input The encoded JS file
 * @returns The "processed" JS file
 */
export const processJS = (input: string): string => {
    const inputArray = Buffer.from(input, 'binary');
    const decoded = Buffer.allocUnsafe(inputArray.length);

    for (let i = 0; i < inputArray.length; i++) decoded[i] = inputArray[i] ^ ((88 + i) & 0x7F);

    return decoded.toString('binary');
}