/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { fetchShim } from '#env/fetch';

import { createError, UNKNOWN_RESPONSE_EXPLAIN, type ErrorEnum } from './util.js';

const baseHeaders = {
    'content-type': 'application/json',
    'origin': 'https://shellshock.io',
    'x-client-version': 'Chrome/JsCore/9.17.2/FirebaseCore-web',
    'x-firebase-locale': 'en'
}

export const FirebaseKey = 'AIzaSyDP4SIjKaw6A4c-zvfYxICpbEjn1rRnN50';

/** A successful {@link Firebase} authentication response */
export interface FirebaseAuthResponse {
    /** Whether or not the authentication succeeded */
    ok: true;
    /** The ID token that expires shortly. This is only needed if you're making direct calls to the Firebase API soon */
    idToken: string;
    /** A refresh token for the account that may be used to login ANYTIME later using {@link Bot.loginWithRefreshToken} */
    refreshToken: string;
    /** The account's "local" firebase ID */
    localId: string;
}

/** A successful {@link Firebase} email-related response */
export interface FirebaseEmailResponse {
    /** Whether or not the action succeeded */
    ok: true;
    /** The email the request related to */
    email: string;
}

/** Parameters for the {@link Firebase} constructor */
export interface FirebaseParams {
    /** A socks proxy to use for each request */
    proxy?: string;
    /** The base URL for identitytoolkit; default "https://identitytoolkit.googleapis.com/v1" */
    identityToolkitURL?: string;
    /** The base URL for securetoken; default "https://securetoken.googleapis.com/v1" */
    secureTokenURL?: string;
    /** The firebase key to use; default the ingame one */
    firebaseKey?: string | null;
}

/** Possible errors originating from {@link Firebase} */
export enum FirebaseError {
    /** Invalid parameters were passed to the function */
    MissingParams = 'missing_params',
    /** The proxy failed */
    ProxyFail = 'proxy_failed',
    /** The OOB code provided was invalid */
    InvalidOOBCode = 'invalid_oob_code',
    /** The DNS lookup failed, which is usually due to a weak internet connection */
    DNSLookupFail = 'dns_lookup_failed',
    /** The network connection had an issue (usually proxy related) */
    NetworkFail = 'firebase_network_failed',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response',
    /** Your IP address is rate limited. Try a proxy, or if you have one, make sure it has rotating IPs */
    FirebaseRateLimited = 'firebase_rate_limited'
}

/** Possible errors originating from {@link Firebase} email/pass logins */
export enum FirebaseEmailError {
    /** The email is not a valid email address */
    InvalidEmail = 'invalid_email',
    /** That email is not registered with an account */
    EmailNotFound = 'email_not_found',
    /** That password is not correct for the given email */
    PasswordIncorrect = 'password_incorrect',
    /** That password is too short, as Firebase has a serverside minimum of 6 characters */
    PasswordUnder6Chars = 'password_under_6_chars',
    /** That email is already registered with an account */
    EmailAlreadySignedUp = 'email_already_signed_up'
}

/** Allows you to connect to (any) Firebase instance and managing accounts on it */
export class Firebase {
    /** Authentication types for Firebase.loginWithEmailPass */
    static readonly AuthType = {
        SignUp: 'signUp',
        SignIn: 'signInWithPassword'
    } as const;

    #proxy = '';
    #identityToolkitURL = 'https://identitytoolkit.googleapis.com/v1';
    #secureTokenURL = 'https://securetoken.googleapis.com/v1';
    #firebaseKey = FirebaseKey;
    #idToken: string | null = null;

    /**
     * Creates a Firebase class
     * @param params Initialization parameters
     */
    constructor(params: Partial<FirebaseParams> = {}) {
        if (typeof params.proxy === 'string') this.#proxy = params.proxy;
        if (typeof params.firebaseKey === 'string') this.#firebaseKey = params.firebaseKey;
        if (typeof params.secureTokenURL === 'string') this.#secureTokenURL = params.secureTokenURL;
        if (typeof params.identityToolkitURL === 'string') this.#identityToolkitURL = params.identityToolkitURL;
    }

    /**
     * Logs in or creates an account with email and password authentication
     * @param authType See AuthType; whether to create an account or log in
     * @param email The email to log in with or create an account with
     * @param password The password to log in with or create an account with
     * @returns A successful authentication response or the error
     */
    async loginWithEmailPass(authType: typeof Firebase.AuthType[keyof typeof Firebase.AuthType], email: string, password: string): Promise<FirebaseAuthResponse | ErrorEnum<FirebaseError | FirebaseEmailError>> {
        if (!email || !password) return createError(FirebaseError.MissingParams);

        let body;

        try {
            const req = await fetchShim(`${this.#identityToolkitURL}/accounts:${authType}?key=${this.#firebaseKey}`, {
                method: 'POST',
                body: JSON.stringify({ email, password, returnSecureToken: true }),
                headers: baseHeaders,
                proxy: this.#proxy
            });

            body = await req.json() as Omit<FirebaseAuthResponse, 'ok'> & { error: any };
            if (body.error) throw body.error;
        } catch (error: any) {
            if ('code' in error) {
                if (error.code === 'ECONNREFUSED') return createError(FirebaseError.NetworkFail);
                else if (error.code === 'ECONNRESET') return createError(FirebaseError.ProxyFail);
            }

            if ('message' in error && typeof error.message === 'string') {
                if (error.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') return createError(FirebaseError.FirebaseRateLimited);
                else if (error.message === 'EMAIL_NOT_FOUND') return createError(FirebaseEmailError.EmailNotFound);
                else if (error.message === 'INVALID_PASSWORD') return createError(FirebaseEmailError.PasswordIncorrect);
                else if (error.message === 'EMAIL_EXISTS') return createError(FirebaseEmailError.EmailAlreadySignedUp);
                else if (error.message === 'INVALID_EMAIL') return createError(FirebaseEmailError.InvalidEmail);
                else if (error.message.startsWith('WEAK_PASSWORD')) return createError(FirebaseEmailError.PasswordUnder6Chars);
            }

            if ('reason' in error) {
                if (error.reason === 'Cert does not contain a DNS name') return createError(FirebaseError.DNSLookupFail);
            }

            console.error('authWithEmailPass: unknown error:', email, error?.error ?? error);
            console.error(`authWithEmailPass: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        if (!body.idToken) {
            console.error('authWithEmailPass: missing idToken', body);
            console.error(`authWithEmailPass: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        this.#idToken = body.idToken;

        return { ...body, ok: true };
    }

    /**
     * Logs in with a refresh token
     * @param refreshToken The refresh token to log in with
     * @returns A successful authentication response or the error
     */
    async loginWithRefreshToken(refreshToken: string): Promise<FirebaseAuthResponse | ErrorEnum<FirebaseError>> {
        if (!refreshToken) return createError(FirebaseError.MissingParams);

        let body;

        try {
            const req = await fetchShim(`${this.#secureTokenURL}/token?key=${this.#firebaseKey}`, {
                method: 'POST',
                // eslint-disable-next-line yolk/camelcase
                body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
                headers: baseHeaders,
                proxy: this.#proxy
            });

            body = await req.json();
            if (body.error) throw body.error;
        } catch (error: any) {
            if ('code' in error) {
                if (error.code === 'ECONNREFUSED') return createError(FirebaseError.NetworkFail);
                else if (error.code === 'ECONNRESET') return createError(FirebaseError.ProxyFail);
            }

            if ('message' in error) {
                if (error.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') return createError(FirebaseError.FirebaseRateLimited);
            }

            if ('reason' in error) {
                if (error.reason === 'Cert does not contain a DNS name') return createError(FirebaseError.DNSLookupFail);
            }

            console.error('loginWithRefreshToken: unknown error:', body, error);
            console.error(`loginWithRefreshToken: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        if (!body.id_token) {
            console.error('loginWithRefreshToken: missing idToken', body);
            console.error(`loginWithRefreshToken: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        this.#idToken = body.id_token;

        return {
            ok: true,
            idToken: body.id_token,
            refreshToken: body.refresh_token,
            localId: body.user_id
        };
    }

    /**
     * Logs in with an anonymous account (not tied to any credentials)
     * @returns A successful authentication response or the error
     */
    async loginAnonymously(): Promise<FirebaseAuthResponse | ErrorEnum<FirebaseError>> {
        let body;

        try {
            const req = await fetchShim(`${this.#identityToolkitURL}/accounts:signUp?key=${this.#firebaseKey}`, {
                method: 'POST',
                body: JSON.stringify({ returnSecureToken: true }),
                headers: baseHeaders,
                proxy: this.#proxy
            });

            body = await req.json() as Omit<FirebaseAuthResponse, 'ok'> & { error: any };
            if (body.error) throw body.error;
        } catch (error: any) {
            if ('code' in error) {
                if (error.code === 'ECONNREFUSED') return createError(FirebaseError.NetworkFail);
                else if (error.code === 'ECONNRESET') return createError(FirebaseError.ProxyFail);
            }

            if ('message' in error) {
                if (error.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') return createError(FirebaseError.FirebaseRateLimited);
            }

            if ('reason' in error) {
                if (error.reason === 'Cert does not contain a DNS name') return createError(FirebaseError.DNSLookupFail);
            }

            console.error('loginAnonymously: unknown error:', error);
            console.error(`loginAnonymously: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        if (!body.idToken) {
            console.error('loginAnonymously: missing idToken', body);
            console.error(`loginAnonymously: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        this.#idToken = body.idToken;

        return { ...body, ok: true };
    }

    /**
     * Sends email verification to the email with an ID token
     * @param idToken The ID token to send; defaults to the last ID token obtained from a successful authentication method on the instance
     * @returns A successful email verification response or the error
     */
    async sendEmailVerification(idToken = this.#idToken): Promise<FirebaseEmailResponse | ErrorEnum<FirebaseError>> {
        if (!idToken) return createError(FirebaseError.MissingParams);

        let body;

        try {
            const req = await fetchShim(`${this.#identityToolkitURL}/accounts:sendOobCode?key=${this.#firebaseKey}`, {
                method: 'POST',
                body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }),
                headers: baseHeaders,
                proxy: this.#proxy
            });

            body = await req.json() as { error?: any, kind?: string, email?: string };
            if (body.error) throw body.error;
        } catch (error: any) {
            if ('code' in error) {
                if (error.code === 'ECONNREFUSED') return createError(FirebaseError.NetworkFail);
                else if (error.code === 'ECONNRESET') return createError(FirebaseError.ProxyFail);
            }

            if ('message' in error) {
                if (error.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') return createError(FirebaseError.FirebaseRateLimited);
            }

            if ('reason' in error) {
                if (error.reason === 'Cert does not contain a DNS name') return createError(FirebaseError.DNSLookupFail);
            }

            console.error('sendEmailVerification: unknown error:', idToken, error);
            console.error(`sendEmailVerification: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        if (body.kind !== 'identitytoolkit#GetOobConfirmationCodeResponse' || !body.email) {
            console.error('sendEmailVerification: the game sent an invalid response', body);
            console.error(`sendEmailVerification: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        return { ok: true, email: body.email };
    }

    /**
     * Verifies an OOB code from an email verification link
     * @param oobCode The OOB code to verify from the email verification link
     * @returns A successful email verification response or the error
     */
    async verifyOobCode(oobCode: string): Promise<FirebaseEmailResponse | ErrorEnum<FirebaseError>> {
        if (!oobCode) return createError(FirebaseError.MissingParams);

        let body;

        try {
            const req = await fetchShim(`${this.#identityToolkitURL}/accounts:update?key=${this.#firebaseKey}`, {
                method: 'POST',
                body: JSON.stringify({ oobCode }),
                headers: baseHeaders,
                proxy: this.#proxy
            });

            body = await req.json() as { error?: any, emailVerified?: false } | { emailVerified: true, email: string };
            if ('error' in body && body.error) throw body.error;
        } catch (error: any) {
            if ('code' in error) {
                if (error.code === 'ECONNREFUSED') return createError(FirebaseError.NetworkFail);
                else if (error.code === 'ECONNRESET') return createError(FirebaseError.ProxyFail);
            }

            if ('message' in error) {
                if (error.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') return createError(FirebaseError.FirebaseRateLimited);
                else if (error.message === 'INVALID_OOB_CODE') return createError(FirebaseError.InvalidOOBCode);
            }

            if ('reason' in error) {
                if (error.reason === 'Cert does not contain a DNS name') return createError(FirebaseError.DNSLookupFail);
            }

            console.error('verifyOobCode: unknown error:', oobCode, error);
            console.error(`verifyOobCode: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        if (!body.emailVerified) {
            console.error('verifyOobCode: the game sent an invalid response', body);
            console.error(`verifyOobCode: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        return { ok: true, email: body.email };
    }

    /** 
     * Deletes the Firebase account and subsequently unbans the email.
     * @returns A successful deletion response or the error
     */
    async deleteAccount(idToken = this.#idToken): Promise<{ ok: true } | ErrorEnum<FirebaseError>> {
        if (!idToken) return createError(FirebaseError.MissingParams);

        let body;

        try {
            const req = await fetchShim(`${this.#identityToolkitURL}/accounts:delete?key=${this.#firebaseKey}`, {
                method: 'POST',
                body: JSON.stringify({ idToken }),
                headers: baseHeaders,
                proxy: this.#proxy
            });

            body = await req.json() as { error?: any };
            if (body.error) throw body.error;
        } catch (error: any) {
            if ('code' in error) {
                if (error.code === 'ECONNREFUSED') return createError(FirebaseError.NetworkFail);
                else if (error.code === 'ECONNRESET') return createError(FirebaseError.ProxyFail);
            }

            if ('message' in error) {
                if (error.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') return createError(FirebaseError.FirebaseRateLimited);
            }

            if ('reason' in error) {
                if (error.reason === 'Cert does not contain a DNS name') return createError(FirebaseError.DNSLookupFail);
            }

            console.error('deleteAccount: unknown error:', idToken, error);
            console.error(`deleteAccount: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(FirebaseError.UnexpectedResponse);
        }

        return { ok: true };
    }
}