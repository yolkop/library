/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { Challenges } from './Challenges.js';
import { ChicknWinner } from './ChicknWinner.js';
import { Gifts } from './Gifts.js';
import { Shop } from './Shop.js';

import { createWebSocket } from '#env/createWebSocket';
import { isBrowser } from '#env/DataLoader';

import { createError, UNKNOWN_RESPONSE_EXPLAIN, type ErrorEnum } from '../util.js';

import type { Bot } from '../Bot.js';
import type { FirebaseAuthResponse, FirebaseError } from '../Firebase.js';
import type { WSErrorEvent } from '../env/createWebSocket.js';

export interface RawStatKD {
    total: number;
    mode: {
        public: number;
        private: number;
    };
    dmgType: {
        pistol: number;
        grenade: number;
        rpegg: number;
        eggk: number;
        scrambler: number;
        ranger: number;
        whpper: number;
        crackshot: number;
        trihard: number;
        melee: number;
    };
    gameType: {
        kotc: number;
        spatula: number;
        ffa: number;
        team: number;
    }
}

export interface RawStats {
    streak: number;
    kills: RawStatKD;
    deaths: RawStatKD;
    gameType: {
        kotc: {
            captured: number;
            wins: number;
        }
    };
}

export interface RawChallengeData {
    period: number;
    challengeId: number;
    reset: 0 | 1;
    claimed: 0 | 1;
    completed: 0 | 1;
    data: number;
    progress: number;
    playerId?: number;
}

export interface RawAccountLoadout {
    hatId: number | null;
    meleeId: number;
    stampId: number | null;
    classIdx: number;
    colorIdx: number;
    grenadeId: number;
    primaryId: number[];
    secondaryId: number[];
    stampPositionX: number;
    stampPositionY: number;
}

export interface RawLoginData {
    id: number;
    firebaseId: string;
    sessionId: string;
    session: number;
    emailVerified: boolean;
    maskedEmail: string | null;
    kills: number;
    deaths: number;
    streak: number;
    currentBalance: number;
    ownedItemIds: number[];
    loadout: RawAccountLoadout | null;
    upgradeProductId: number | null;
    upgradeMultiplier: number | null;
    upgradeAdFree: boolean | null;
    upgradeExpiryDate: number | null;
    upgradeIsExpired: boolean | null;
    maybeSchoolEmail: boolean | null;
    upgradeName: string | null;
    upgradeType: 'subscription' | null;
    subscriptionEnded: boolean;
    social: string | null;
    twitchLinked: boolean | null;
    twitchName: string | null;
    dateCreated: string;
    dateModified: string;
    accountAge: number;
    statsLifetime: RawStats;
    statsCurrent: RawStats;
    eggsSpent: number | null;
    eggsSpentMonthly: number | null;
    challenges: RawChallengeData[];
    unclaimedRewards: { status: 'claimed', id: number }[];
    claimedChallenges: unknown[];
    notification: {
        id: number;
        type: {
            vip: {
                ids: number[];
                eggs: number;
            };
            purchases: {
                ids: number[];
                eggs: number;
            };
        };
        read: 0 | 1;
    }
    adminRoles?: number;
    active_sub: 'IsVIP' | 'WasVIP' | null;
    firstSignin: boolean;
    chwReady: {
        period?: number;
        span?: number;
        limit?: number;
        reset?: number;
    }
    cgAccountStatus: {
        hasAccount: boolean;
    }
}

/** Any request to {@link Account.queryServices} */
export interface QueryRequest {
    /** The query command */
    cmd: string;
    /** Additional arguments from the server */
    [key: string]: any;
}

/** A successful response from {@link Account.queryServices} */
export interface QueryResponseOK {
    /** Whether the request succeeded at the NETWORK level (the server may also have returned a separate error) */
    ok: true;
    /** Additional arguments from the server */
    [key: string]: any;
}

/** Errors from {@link Account.queryServices} */
export enum QueryServicesError {
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response',
    /** The WebSocket closed too early, which is normally indicative of a banned IP (check your proxy) */
    ClosedEarly = 'services_closed_early',
    /** Connecting to the WebSocket failed (check your proxy) */
    WebSocketConnectFail = 'websocket_connect_fail',
    /** You need to return a valid turnstile solution within your handler */
    NoTurnstileToken = 'no_turnstile_token',
    /** You need to return a valid sitekey within your handler */
    NoSiteKey = 'no_sitekey',
    /** You need a turnstile handler, as the game requires turnstile to be solved */
    TurnstileRequired = 'turnstile_required'
}

/** The turnstile handler that can be used within a {@link Bot} and {@link Account.queryServices} */
export type TurnstileHandler = () => Promise<{ token: string, sitekey: string }>;

/** Represents an account. Includes the VIP status, owned items, loadout, and more. */
export class Account {
    /** The Bot attached to the Account instance */
    bot: Bot;

    /** The ID in the game's database; used for authentication */
    id = 0;

    /** The Firebase authentication information */
    firebase = {
        /** The Firebase "id token", which expires an hour after creation */
        idToken: '',
        /** The Firebase "refresh token", which virtually never expires */
        refreshToken: '',
        /** The Firebase account's ID */
        localId: ''
    };

    /** The ID in Firebase's database */
    firebaseId = '';
    /** A session UUID */
    sessionId = '';
    /** A session number */
    session = 0;

    /** The account's email, if it was signed in with one */
    email = '';
    /** The account's password, if it was signed in with one */
    password = '';

    /** The account's loadout (cosmetics on the eggs in-game) */
    loadout = {
        hatId: null,
        meleeId: 0,
        stampId: null,
        classIdx: 0,
        colorIdx: 0,
        grenadeId: 0,
        primaryId: [3100, 3600, 3400, 3800, 4000, 4200, 4500],
        secondaryId: new Array(7).fill(3000),
        stampPositionX: 0,
        stampPositionY: 0
    } as RawAccountLoadout;

    /** An array of item IDs that the account owns */
    ownedItemIds: number[] = [];
    /** Is the account a VIP? */
    vip = false;

    /** Is the account email verified? */
    emailVerified = false;
    /** Was the account created before 5/1/24? This acts as one of the qualifiers for public lobby chatting, see {@link ChatDispatch} */
    isAged = false;
    /** Is the account linked to CG? */
    isCG = false;

    /** The account's admin permissions */
    adminRoles = 0;
    /** The account's egg balance */
    eggBalance = 0;

    /** A ChicknWinner instance with the account hooked up */
    cw: ChicknWinner;
    /** A Gifts instance with the account hooked up */
    gifts: Gifts;
    /** A Shop instance with the account hooked up */
    shop: Shop;

    #challenges: Challenges | undefined;

    /** Raw socket output for the login data */
    rawLoginData: RawLoginData;

    /** The renew session interval */
    renewSessionInterval: NodeJS.Timeout | number | null = null;

    /** The account's stats */
    stats: { lifetime: RawStats, monthly: RawStats } = {
        /** All-time statistics for the account */
        lifetime: {} as any,
        /** Monthly statistics for the account */
        monthly: {} as any
    }

    /**
     * Creates a new account
     * @param bot a Bot instance to hook the account up to
     * @param output raw login data from the queryServices packet
     * @param firebase raw firebase data from the firebase login
     */
    constructor(bot: Bot, output: RawLoginData, firebase: FirebaseAuthResponse) {
        this.bot = bot;
        this.firebase = firebase;
        this.rawLoginData = output;

        this.adminRoles = output.adminRoles ?? 0;
        this.eggBalance = output.currentBalance;
        this.emailVerified = output.emailVerified;
        this.firebaseId = output.firebaseId;
        this.id = output.id;
        this.isAged = new Date(output.dateCreated).getTime() < 17145468e5;
        this.isCG = output.cgAccountStatus?.hasAccount;
        if (output.loadout) this.loadout = output.loadout;
        this.ownedItemIds = output.ownedItemIds;
        this.session = output.session;
        this.sessionId = output.sessionId;
        this.vip = output.active_sub === 'IsVIP';

        this.stats = {
            lifetime: output.statsLifetime,
            monthly: output.statsCurrent
        };

        if (bot.renewSession) {
            this.renewSessionInterval = setInterval(async () => {
                if (!this.sessionId && this.renewSessionInterval) return clearInterval(this.renewSessionInterval);

                const res = await this.queryServices({ cmd: 'renewSession', sessionId: this.sessionId });
                if (res.ok && res.data !== 'renewed') {
                    console.error('Account.renewSession: unknown response:', res);
                    console.error(`Account.renewSession: ${UNKNOWN_RESPONSE_EXPLAIN}`);
                }
            }, 10 * 60 * 1000);

            if (typeof this.renewSessionInterval === 'object' && 'unref' in this.renewSessionInterval)
                this.renewSessionInterval.unref();
        }

        this.cw = new ChicknWinner(this);
        this.gifts = new Gifts(this);
        this.shop = new Shop(this);
    }

    /** A Challenges instance with the account hooked up */
    get challenges(): Challenges {
        if (isBrowser) throw new Error('Account.challenges does not work in browser-like environments');

        if (!this.#challenges) {
            this.#challenges = new Challenges(this);
            this.#challenges.import(this.rawLoginData.challenges);
        }

        return this.#challenges;
    }

    /** Checks if the challenges have "warmed up" (been referenced) */
    isChallengesWarm(): boolean {
        return !!this.#challenges;
    }

    /**
     * Queries the services endpoint (does account things)
     * @param bot The Bot instance to use for the query
     * @param request The JSON request ("cmd" prop and then any other props needed for that command)
     * @returns The JSON response from the services endpoint, or an error if the request failed
     */
    static async queryServices(bot: Bot | null, request: QueryRequest, turnstileHandler?: TurnstileHandler): Promise<QueryResponseOK | ErrorEnum<FirebaseError | QueryServicesError>> {
        const ws = createWebSocket(bot?.urls.services ?? 'wss://shellshock.io/services/', { proxy: bot?.proxies.services, headers: bot?.headers });

        const didConnect = await new Promise((resolve) => {
            ws.addEventListener('open', () => resolve(true), { once: true });
            ws.addEventListener('close', () => resolve(false), { once: true });
            ws.addEventListener('error', () => resolve(false), { once: true });
        });

        if (!didConnect || ws.readyState !== 1) return createError(QueryServicesError.WebSocketConnectFail);

        return new Promise((resolve) => {
            let resolved = false;

            ws.addEventListener('message', (msg) => {
                resolved = true;

                try {
                    const res = JSON.parse(typeof msg.data === 'string' ? msg.data : new TextDecoder().decode(msg.data));

                    if (res.turnstileRequired) {
                        if (turnstileHandler) {
                            turnstileHandler().then((r) => {
                                if (!r?.token) {
                                    console.error('Account.queryServices: you did not provide a turnstile token, but the server requires one');
                                    return resolve(createError(QueryServicesError.NoTurnstileToken));
                                }

                                if (!r?.sitekey) {
                                    console.error('Account.queryServices: you did not provide a sitekey, but the server requires one');
                                    return resolve(createError(QueryServicesError.NoSiteKey));
                                }

                                ws.send(JSON.stringify({
                                    cmd: 'turnstile',
                                    turnstileSiteKey: r.sitekey,
                                    platform: bot?.platform ?? 'web',
                                    turnstileToken: r.token
                                }))
                            });
                        } else {
                            ws.close();
                            console.error('Account.queryServices: the server requires a turnstile token, but you did not provide a turnstile handler');
                            return resolve(createError(QueryServicesError.TurnstileRequired));
                        }

                        return;
                    }

                    ws.close();

                    if (!Array.isArray(res) && typeof res === 'object') resolve({ ok: true, ...res });
                    else resolve({ ok: true, result: res });
                } catch (e: any) {
                    ws.close();

                    console.error('Account.queryServices: unknown response - command:', request.cmd, 'and data:', request, e);
                    console.error(`Account.queryServices: ${UNKNOWN_RESPONSE_EXPLAIN}`);
                    resolve(createError(QueryServicesError.UnexpectedResponse));
                }
            });

            ws.addEventListener('error', (error: WSErrorEvent) => {
                if (resolved) return;
                resolved = true;

                console.error('Account.queryServices: websocket error...command:', request.cmd, 'and data:', request, 'error:', error);
                console.error(`Account.queryServices: ${UNKNOWN_RESPONSE_EXPLAIN}`);

                resolve(createError(QueryServicesError.UnexpectedResponse));
            });

            ws.addEventListener('close', () => {
                if (resolved) return;
                resolved = true;

                console.error('queryServices: services closed early - command:', request.cmd, 'and data:', request);
                console.error('queryServices: your IP may be hitting ratelimits; try using a proxy');

                resolve(createError(QueryServicesError.ClosedEarly));
            });

            ws.send(JSON.stringify(request));
        });
    }

    /**
     * Queries the services endpoint (does account things); points to the static version with the bot attached
     * @see {@link Account.queryServices} for more details
     */
    async queryServices(request: QueryRequest): Promise<QueryResponseOK | ErrorEnum<FirebaseError | QueryServicesError>> {
        return await Account.queryServices(this.bot, request);
    }
}