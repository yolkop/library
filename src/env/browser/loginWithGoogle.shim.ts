/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const loginWithGoogle = async (requiredEmail: string): Promise<{
    ok: true,
    idToken: string,
    refreshToken: string,
    localId: string
} | { ok: false }> => {
    throw new Error('Google login is not supported in this environment. You can still log in with a refresh token.');
}