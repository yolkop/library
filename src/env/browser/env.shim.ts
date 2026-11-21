/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

export const getEnvVar = (envVar: string): string => {
    const theGlobal: any = typeof globalThis !== 'undefined' ? globalThis :
        typeof global !== 'undefined' ? global :
            typeof window !== 'undefined' ? window :
                {};

    return theGlobal[envVar]?.toString();
}