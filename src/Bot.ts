/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { Account, type QueryResponseOK, type RawLoginData, type QueryServicesError, type TurnstileHandler } from './account/Account.js';

import { ensureDataLoaded, CloseCode, CommCode, Maps } from '#env/DataLoader';
import { fetchShim } from '#env/fetch';
import { loadMap } from '#env/loadMap';
import { loginWithGoogle } from '#env/loginWithGoogle';
import { validate } from '#env/validate';

import { createWebSocket } from '#env/createWebSocket';
import type { WSMessageEvent, WSSocket } from './env/createWebSocket.js';

import { GameMode, type Game } from './game/Game.js';
import type { GunIds } from './game/Guns.js';
import type { GameEvents } from './game/Hooks.js';
import type { Player } from './game/Player.js';

import { DispatchIndex, type DispatchKeys, type DispatchParams } from './game/dispatch/index.js';

import { PacketIn } from './game/packet/PacketIn.js';
import { PacketOut } from './game/packet/PacketOut.js';

import { processAddPlayerPacket } from './game/packet/impl/addPlayer.js';
import { processBeginShellStreakPacket } from './game/packet/impl/beginShellStreak.js';
import { processChallengeCompletedPacket } from './game/packet/impl/challengeCompleted.js';
import { processChangeCharacterPacket } from './game/packet/impl/changeCharacter.js';
import { processChatPacket } from './game/packet/impl/chat.js';
import { processCollectItemPacket } from './game/packet/impl/collectItem.js';
import { processDiePacket } from './game/packet/impl/die.js';
import { processEndShellStreakPacket } from './game/packet/impl/endShellStreak.js';
import { processEventModifierPacket } from './game/packet/impl/eventModifier.js';
import { processExplodePacket } from './game/packet/impl/explode.js';
import { processFirePacket } from './game/packet/impl/fire.js';
import { processGameActionPacket } from './game/packet/impl/gameAction.js';
import { processGameLockedPacket } from './game/packet/impl/gameLocked.js';
import { processGameOptionsPacket } from './game/packet/impl/gameOptions.js';
import { processHitMeHardBoiledPacket } from './game/packet/impl/hitMeHardBoiled.js';
import { processHitMePacket } from './game/packet/impl/hitMe.js';
import { processHitThemPacket } from './game/packet/impl/hitThem.js';
import { processMeleePacket } from './game/packet/impl/melee.js';
import { processMetaGameStatePacket } from './game/packet/impl/metaGameState.js';
import { processPausePacket } from './game/packet/impl/pause.js';
import { processPingPacket } from './game/packet/impl/ping.js';
import { processPlayerInfoPacket } from './game/packet/impl/playerInfo.js';
import { processPlayerRewardsPacket } from './game/packet/impl/playerRewards.js';
import { processReloadPacket } from './game/packet/impl/reload.js';
import { processRemovePlayerPacket } from './game/packet/impl/removePlayer.js';
import { processRespawnPacket } from './game/packet/impl/respawn.js';
import { processSpawnItemPacket } from './game/packet/impl/spawnItem.js';
import { processSwitchTeamPacket } from './game/packet/impl/switchTeam.js';
import { processSyncMePacket } from './game/packet/impl/syncMe.js';
import { processSyncThemPacket } from './game/packet/impl/syncThem.js';
import { processThrowGrenadePacket } from './game/packet/impl/throwGrenade.js';
import { processUpdateBalancePacket } from './game/packet/impl/updateBalance.js';
import { processSwapWeaponPacket } from './game/packet/impl/swapWeapon.js';

import { FFAGame } from './game/modes/FFAGame.js';
import { TeamsGame } from './game/modes/TeamsGame.js';
import { SpatulaGame } from './game/modes/SpatulaGame.js';
import { KOTCGame } from './game/modes/KOTCGame.js';

import { Firebase, type FirebaseEmailError, type FirebaseAuthResponse, type FirebaseError } from './Firebase.js';
import { createError, getFlag, UNKNOWN_RESPONSE_EXPLAIN, type ErrorEnum } from './util.js';

import type { MapJSON } from './types/Map.js';

/** Custom URLs that can be passed to a {@link Bot} */
export interface CustomURLs {
    /** The matchmaker URL; default: `wss://shellshock.io/matchmaker/` */
    matchmaker?: string;
    /** The services URL; default: `wss://shellshock.io/services/` */
    services?: string;
    /** The game URL; default: `wss://{subdomain}.shellshock.io/game/{code}` */
    game?: (subdomain: string, code: string) => string;
    /** The Firebase "identity toolkit" base URL, used for all operations except refresh token login; default: `https://identitytoolkit.googleapis.com/v1` */
    identityToolkit?: string;
    /** The Firebase "secure token" base URL, used for refresh token login; default: `https://securetoken.googleapis.com/v1` */
    secureToken?: string;
}

/** Custom proxies that can be configured for each endpoint on a {@link Bot} */
export interface CustomProxies {
    /** A proxy for the matchmaker endpoint */
    matchmaker?: string;
    /** A proxy for the services endpoint */
    services?: string;
    /** A proxy for the game endpoints */
    game?: string;
    /** A proxy for the Firebase endpoints */
    firebase?: string;
}

/** Parameters that can be passed to a {@link Bot} */
export interface BotParams {
    /** You can pass a single socks5 or socks5h proxy string, where it will be used for all requests. Alternatively, you can pass proxies for specific endpoints (matchmaker, services, game, firebase) */
    proxy?: string | CustomProxies;
    /** A custom set of URLs to connect to */
    urls?: CustomURLs;
    /** A custom set of headers to pass to game-facing requests */
    headers?: Record<string, string>;
    /** Specifies that the bot should not login with Firebase and join games with a nullish UUID (this breaks on the base game) */
    skipLogin?: boolean;
    /** Specifies that the bot's account should renew its session for repeated use (30+ minutes) */
    renewSession?: boolean;
    /** The platform to spoof; known platforms include "web", "crazygames", and "poki" */
    platform?: string;
}

/** Errors that come from any login functions on a {@link Bot} */
export enum LoginError {
    /** Google (loginWithGoogle) threw some error, which is in your console */
    GoogleError = 'google_error_in_console',
    /** The account is banned */
    AccountBanned = 'account_banned',
    /** The account did not send player information. Check the console for more information */
    NoOutput = 'no_playeroutput'
}

/** Errors that come from {@link Bot.createMatchmaker} */
export enum MatchmakerError {
    /** There was an issue with the proxy making the request */
    ProxyFail = 'proxy_failed',
    /** Connecting to the WebSocket failed (may be a proxy issue) */
    WebSocketConnectFail = 'websocket_connect_fail'
}

/** Errors that come from {@link Bot.createPrivateGame} and {@link Bot.findPublicGame} */
export enum GameFindError {
    /** The function is missing parameters */
    MissingParams = 'missing_params',
    /** That region is not in the known region list */
    InvalidRegion = 'region_not_in_list',
    /** That mode is not in the known mode list */
    InvalidMode = 'mode_not_in_list',
    /** That map is not in the known map list */
    InvalidMap = 'map_not_in_list',
    /** The input game code does not exist; games are automatically deleted when they have 0 players unless they were recently created */
    GameNotFound = 'game_not_found',
    /** The account session has expired */
    SessionExpired = 'session_expired',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response',
    /** The matchmaker disconnected too quickly. This may be an issue with the IP making the request (check your proxy) */
    MatchmakerDisconnected = 'matchmaker_disconnected'
}

/** Errors that come from {@link Bot.join} */
export enum GameJoinError {
    /** The function is missing parameters */
    MissingParams = 'missing_params',
    /** The game object passed does not have all of the required parameters */
    InvalidObject = 'invalid_game_object',
    /** Connecting to the WebSocket failed (may be a proxy issue) */
    WebSocketConnectFail = 'websocket_connect_fail',
    /** The input game code does not exist; games are automatically deleted when they have 0 players unless they were recently created */
    GameNotFound = 'game_not_found',
    /** The account session has expired */
    SessionExpired = 'session_expired',
    /** The game is full and cannot be joined */
    GameFull = 'game_full',
    /** The game is locked and cannot be joined */
    GameLocked = 'game_locked',
    /** Your account is banned, and cannot join the game */
    AccountBanned = 'account_banned',
    /** You have been booted from the game, and need to rejoin with a different IP address */
    GameIPBooted = 'game_ip_booted',
    /** The UUID provided was invalid. This usually occurs when you pass a game object to Bot.join that a different Bot or Account has made */
    UUIDError = 'game_object_made_other_bot',
    /** The region has hit 100% CPU or 100% Memory and is not currently allowing new players to join games, wait and try again later */
    RegionFull = 'region_full',
    /** The matchmaker disconnected too quickly. This may be an issue with the IP making the request (check your proxy) */
    MatchmakerDisconnected = 'matchmaker_disconnected',
    /** There was an issue with the proxy making the request */
    ProxyFail = 'proxy_failed'
}

/** The raw gameFound result from the matchmaker */
export interface RawFindGameResponse {
    command: 'gameFound';
    /** The region that the game is in */
    region: string;
    /** The subdomain to connect to for the game */
    subdomain: string;
    /** The game code */
    id: string;
    /** A UUID required for joining the game */
    uuid: string;
    /** Whether or not the game is private */
    private: boolean;
    /** Whether the game is a "noob lobby". Note that noob lobbies can be turned off and on, so noob lobbies may be entirely off */
    noobLobby: boolean;
}

/** The raw errors that come from a findGame from the matchmaker */
export interface RawFindGameError { error: 'gameNotFound' | 'sessionNotFound' }

/** The regions that can be found from the matchmaker, stored in {@link Bot.regionList} */
export interface Region {
    /** The region ID (colloquially the name, such as "useast") */
    id: string;
    /** The region subdomain */
    sub: string
}

/** {@link RawFindGameResponse}, but with an `ok` field for validation; returned by {@link Bot.findPublicGame} and {@link Bot.createPrivateGame} */
export interface GameFindResult extends RawFindGameResponse {
    /** The request succeeded */
    ok: true
}

/** Returned by {@link Bot.checkGameCode} */
export interface CheckCodeResult {
    /** Whether or not the code was able to be successfully checked. This does NOT indicate whether the game exists. */
    ok: boolean;
    /** Whether the game exists. */
    exists: boolean;
    /** The game information, if it exists. */
    game?: GameFindResult;
}

/** Available responses from logging in to any account on a {@link Bot} */
export type LoginResponse = { ok: true, account: Account } | ErrorEnum<LoginError | QueryServicesError | FirebaseError | FirebaseEmailError>;

/** The successful login response from {@link Account.queryServices} */
export interface QueryServicesLoginOK extends QueryResponseOK {
    /** The player output from the request, if the player is not banned */
    playerOutput?: RawLoginData;
    /** The remaining ban duration in HH:MM:SS, if the player is banned */
    banRemaining?: string;
}

/** Options that can be passed to {@link Bot.join} */
export interface JoinOptions {
    /** The weapon to use on join. This falls back to the account's last used weapon and then an EggK. This can be changed later in with a {@link SaveLoadoutDispatch} */
    weapon?: GunIds;
    /** Only works on accounts signed in as eggforcers with valid permissions. Joins as a spectator and not a normal player */
    eggforcerObserve?: boolean;
    /** Only works on accounts signed in with VIP or who have social media; hides the social media/VIP badge active on your profile */
    hideBadge?: boolean;
    /** Skips loading the game map. Leaves the bot with no collision, no movement prediction, no navigation and no KoTC zone logic. */
    skipMapLoad?: boolean;
    /** Forces the game to manually update. */
    manualUpdate?: boolean;
    /** Prevents the bot from getting kicked for being AFK. */
    noAfkKick?: boolean;
    /** Calculates the precise health of all players, with a performance tradeoff. */
    preciseHealth?: boolean;
}

/** Represents a {@link Bot} that is logged in */
export type BotLoggedIn = Bot & { account: Account, challenges: Account['challenges'], cw: Account['cw'], shop: Account['shop'] };

/** Represents all of the possible game modes in {@link Bot.game} */
export type AnyGame = FFAGame | TeamsGame | SpatulaGame | KOTCGame;
/** Represents a {@link Bot} that is in a game with an attached account */
export type BotWithGame = BotLoggedIn & { game: AnyGame, dispatch: Game['dispatch'], me: Game['me'], players: Game['players'] };

/** The central class of yolkbot; all bots start here */
export class Bot {
    /** The region list the bot has found, requires you to call {@link Bot.createMatchmaker} first */
    regionList: Region[] = [];
    /** Listeners for messages from the matchmaker, requires you to call {@link Bot.createMatchmaker} first */
    matchmakerListeners: ((...args: any[]) => void)[] = [];

    #hooks: Partial<{ [K in keyof GameEvents]: ((...args: GameEvents[K]) => void)[] }> = {};
    #globalHooks: (<K extends keyof GameEvents>(event: K, ...args: GameEvents[K]) => void)[] = [];

    /** The URLs the bot will use */
    urls: Required<CustomURLs> = {
        matchmaker: 'wss://shellshock.io/matchmaker/',
        services: 'wss://shellshock.io/services/',
        game: (subdomain, id) => `wss://${subdomain}.shellshock.io/game/${id}`,
        identityToolkit: 'https://identitytoolkit.googleapis.com/v1',
        secureToken: 'https://securetoken.googleapis.com/v1'
    }

    /** The proxies the bot will use */
    proxies: Required<CustomProxies> = {
        matchmaker: '',
        services: '',
        game: '',
        firebase: ''
    }

    /** The headers passed to ALL bot requests */
    headers: Record<string, string> = {};

    /** The platform the bot uses for login */
    platform = 'web';

    /** Must the bot renew its session? */
    renewSession = false;
    #skipLogin = false;

    /** The bot's account, if it has one */
    account?: Account;
    /** The bot's game, if it's in one */
    game?: AnyGame;

    /** An associated firebase instance */
    firebase: Firebase;
    /** The matchmaker socket, if it's connected to the matchmaker ({@link Bot.createMatchmaker}) */
    matchmaker?: WSSocket;

    #pendingGameOptions = false;

    #turnstileHandler?: TurnstileHandler;

    /**
     * Creates a bot with the parameters. None of them are required, some more recommended than others!
     * @param params The parameters for the bot
     */
    constructor(params: Partial<BotParams> = {}) {
        if (params.proxy && typeof process === 'undefined')
            throw new Error('proxies do not work in this environment');

        if (typeof params.urls === 'object') Object.assign(this.urls, params.urls);

        if (params.proxy) {
            if (typeof params.proxy === 'string') {
                this.proxies.matchmaker = params.proxy;
                this.proxies.services = params.proxy;
                this.proxies.game = params.proxy;
                this.proxies.firebase = params.proxy;
            } else Object.assign(this.proxies, params.proxy);
        }

        if (typeof params.headers === 'object') this.headers = params.headers;
        if (typeof params.renewSession === 'boolean') this.renewSession = params.renewSession;
        if (typeof params.skipLogin === 'boolean') this.#skipLogin = params.skipLogin;
        if (typeof params.platform === 'string') this.platform = params.platform;

        this.firebase = new Firebase({
            proxy: this.proxies.firebase,
            identityToolkitURL: this.urls.identityToolkit,
            secureTokenURL: this.urls.secureToken
        });
    }

    /** Ensures the bot is logged in; best used with Typescript */
    loggedIn(): this is BotLoggedIn {
        return this.account !== undefined;
    }

    /** Ensures the bot is in game; best used with Typescript */
    inGame(): this is BotWithGame {
        return !!this.game && !!this.account;
    }

    /**
     * Identifies the turnstile parameters required for solution. This only works on Desktop due to CORS.
     * @param hostname The hostname to get the sitekey for, default: shellshock.io
     * @returns The sitekey for the passed hostname as a string
     */
    async getTurnstileSitekey(hostname = 'shellshock.io'): Promise<string> {
        const req = await fetchShim(`https://${hostname}/`, {
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'en-US,en;q=0.9',
                'cache-control': 'max-age=0',
                'priority': 'u=0, i'
            }
        });

        const res = await req.text();
        return /0x4[A-Za-z0-9_-]{21}/.exec(res)?.[0] ?? '';
    }

    /**
     * Sets the turnstile handler for the Bot
     * @param handler The handler to use for turnstile solutions. It must return a string that is the solution.
     */
    setTurnstileHandler(handler: TurnstileHandler): void {
        this.#turnstileHandler = handler;
    }

    /**
     * Creates an account with the given email and password and adds it to the current bot
     * @param email The email
     * @param pass The password
     * @returns The result of the login attempt, including the account if it succeeded
     */
    async createAccount(email: string, pass: string): Promise<LoginResponse> {
        const firebaseData = await this.firebase.loginWithEmailPass(Firebase.AuthType.SignUp, email, pass);
        if (firebaseData.ok) return this.loginWithFirebaseData(firebaseData, email, pass);
        else return firebaseData;
    }

    /**
     * Logs into an existing account with the given email and password and adds it to the current bot
     * @param email The email
     * @param pass The password
     * @returns The result of the login attempt, including the account if it succeeded
     */
    async login(email: string, pass: string): Promise<LoginResponse> {
        const firebaseData = await this.firebase.loginWithEmailPass(Firebase.AuthType.SignIn, email, pass);
        if (firebaseData.ok) return this.loginWithFirebaseData(firebaseData, email, pass);
        else return firebaseData;
    }

    /**
     * Logs in with a refresh token from a previous session
     * 
     * To get your refresh token ingame, log in and then run `copy(firebase.auth().currentUser._delegate.stsTokenManager.refreshToken)`
     * The token will then appear in your clipboard within 1-2 seconds
     * 
     * @param refreshToken The refresh token from the session
     * @returns The result of the login attempt, including the account if it succeeded
     */
    async loginWithRefreshToken(refreshToken: string): Promise<LoginResponse> {
        const firebaseData = await this.firebase.loginWithRefreshToken(refreshToken);
        if (firebaseData.ok) return this.loginWithFirebaseData(firebaseData);
        else return firebaseData;
    }

    /**
     * Logs in with a {@link Account.firebase} object.
     * @param firebaseData The firebase object from a previous session, containing at least a valid `idToken` field.
     * @param email The email used to sign in/up for firebase, if there was one - you don't need this, but it populates Account.email
     * @param password The password used to sign in/up for firebase, if there was one - you don't need this, but it populates Account.password
     * @returns The result of the login attempt, including the account if it succeeded
     */
    async loginWithFirebaseData(firebaseData: FirebaseAuthResponse, email?: string, password?: string): Promise<LoginResponse> {
        const query = await Account.queryServices(this, { cmd: 'auth', firebaseToken: firebaseData.idToken, platform: this.platform }, this.#turnstileHandler) as QueryServicesLoginOK | ErrorEnum<FirebaseError | QueryServicesError>;
        if (query.ok) return this.loginWithServicesData(firebaseData, query, email, password);
        else return query;
    }

    /**
     * Logs in anonymously, which is the recommended way to do a quick login without needing to create an account. You can save these if absolutely needed by saving the {@link Account.firebase}'s `refreshToken` and using {@link Bot.loginWithRefreshToken}
     * @returns The result of the login attempt, including the account if it succeeded
     */
    async loginAnonymously(): Promise<LoginResponse> {
        const firebaseData = await this.firebase.loginAnonymously();
        if (firebaseData.ok) return this.loginWithFirebaseData(firebaseData);
        else return firebaseData;
    }

    /**
     * Logs in using Google (works only on Node and non-headless environments)
     * This will create a server (on localhost) for login
     * Please note that it stores credentials in plaintext on your disk, which you can disable with the `YOLKBOT_NO_GOOGLE_CACHE` environment variable
     * 
     * @param requiredEmail The email that the Google account must have, if any. If the user has already logged into this email, it will be loaded from cache
     * @param open Whether to automatically open the Google login in your browser (default: true)
     * @returns The result of the login attempt, including the account if it succeeded
     */
    async loginWithGoogle(requiredEmail?: string, open = true): Promise<LoginResponse> {
        const firebaseData = await loginWithGoogle(requiredEmail, open);
        if (firebaseData.ok) {
            if (firebaseData.refreshToken && !firebaseData.idToken)
                return await this.loginWithRefreshToken(firebaseData.refreshToken);

            return this.loginWithFirebaseData(firebaseData);
        } else return createError(LoginError.GoogleError);
    }

    /**
     * Logs in using a combination of data returned from Firebase and the /services/ endpoint
     * @param firebase The raw Firebase authentication response
     * @param loginData The raw /services/ authentication response
     * @param email The email used to sign in/up for firebase, if there was one
     * @param pass The password used to sign in/up for firebase, if there was one
     * @returns A login response
     */
    loginWithServicesData(firebase: FirebaseAuthResponse, loginData: QueryServicesLoginOK, email?: string, pass?: string): LoginResponse {
        if ('banRemaining' in loginData && loginData.banRemaining) return createError(LoginError.AccountBanned);

        if (!loginData.playerOutput) {
            console.error('login: could not parse login response (no playerOutput):', loginData);
            console.error('login: there are no known solutions to this issue');

            return createError(LoginError.NoOutput);
        }

        this.account = new Account(this, loginData.playerOutput, firebase);

        if (email) this.account.email = email;
        if (pass) this.account.password = pass;

        return { ok: true, account: this.account };
    }

    /**
     * Connects to the matchmaker for the first time and establishes automatic reconnection
     * @returns The result of the connection attempt, including the region list if it succeeded
     */
    async createMatchmaker(): Promise<{ ok: true, regionList: Region[] } | ErrorEnum<MatchmakerError>> {
        const ws = createWebSocket(this.urls.matchmaker, { proxy: this.proxies.matchmaker, headers: this.headers });

        const didConnect = await new Promise<boolean | ErrorEnum<MatchmakerError>>((resolve) => {
            ws.addEventListener('open', () => resolve(true), { once: true });
            ws.addEventListener('close', () => resolve(false), { once: true });
            ws.addEventListener('error', (e) => {
                if ('code' in e.error && e.error.code === 'ECONNRESET') resolve(createError(MatchmakerError.ProxyFail));
                else resolve(false);
            }, { once: true });
        });

        if (didConnect !== true) {
            if (typeof didConnect === 'boolean') return createError(MatchmakerError.WebSocketConnectFail);
            else return didConnect;
        }

        ws.addEventListener('close', () => (this.matchmaker = undefined));

        this.matchmaker = ws;

        let uuidTimeout: NodeJS.Timeout | number | null = null;

        return await new Promise<{ ok: true, regionList: Region[] } | ErrorEnum<MatchmakerError>>((resolve) => {
            let hasResolved = false;

            ws.addEventListener('message', (e) => {
                const data = JSON.parse(typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data));

                if (data.command === 'validateUUID') {
                    if (uuidTimeout) clearTimeout(uuidTimeout);

                    uuidTimeout = setTimeout(() => {
                        console.error('createMatchmaker: the matchmaker did not respond to validateUUID; there are no known solutions to this issue');
                    }, 5000);

                    const hash = validate(data.uuid);
                    ws.send(JSON.stringify({ command: 'validateUUID', hash }));
                }

                if (data.command === 'regionList' && !hasResolved) {
                    hasResolved = true;
                    this.regionList = data.regionList;
                    resolve({ ok: true, regionList: data.regionList });
                }

                if (uuidTimeout) {
                    clearTimeout(uuidTimeout);
                    uuidTimeout = null;
                }

                this.matchmakerListeners.forEach((listener) => listener(data));
            });

            ws.send(JSON.stringify({ command: 'regionList' }));
        });
    }

    /**
     * Initializes the session for the by logging in (if not already) and connecting to the matchmaker (if not already). This is required before finding, creating, or joining a game and is called automatically if you fail to do so
     * @returns Whether the initialization succeeded or the error that caused it to fail
     */
    async initSession(): Promise<{ ok: true } | ErrorEnum<LoginError | QueryServicesError | FirebaseError | FirebaseEmailError | MatchmakerError>> {
        if (!this.account && !this.#skipLogin) {
            const anonLogin = await this.loginAnonymously();
            if (!anonLogin.ok) return anonLogin;
        }

        if (!this.matchmaker) {
            const mmConnection = await this.createMatchmaker();
            if (!mmConnection.ok) return mmConnection;
        }

        return { ok: true };
    }

    /**
     * Finds a public game with the given region and mode. This does NOT join the game.
     * @param region The name of the region to find the game in; must be one from {@link Bot.regionList} (e.g. 'useast')
     * @param mode The mode to find, either as a string (e.g. 'ffa') or as a {@link GameMode} (e.g. `GameMode.FFA`)
     * @returns The result of the find attempt, including the game info if it succeeded
     */
    async findPublicGame(region: string, mode: string | GameMode): Promise<GameFindResult | ErrorEnum<GameFindError | QueryServicesError | FirebaseError | FirebaseEmailError | LoginError | MatchmakerError>> {
        if (typeof region !== 'string') return createError(GameFindError.MissingParams);

        let computedModeId;

        if (typeof mode === 'number') {
            if (mode in GameMode) computedModeId = mode;
            else return createError(GameFindError.InvalidMode);
        } else if (typeof mode === 'string') {
            const modeEntry = Object.keys(GameMode)
                .filter(key => isNaN(Number(key)))
                .find(key => key.toLowerCase() === mode.toLowerCase());
            if (typeof modeEntry === 'string') computedModeId = GameMode[modeEntry as keyof typeof GameMode];
            else return createError(GameFindError.InvalidMode);
        } else return createError(GameFindError.InvalidMode);

        const initInfo = await this.initSession();
        if (!initInfo.ok) return initInfo;

        if (!this.regionList.find(r => r.id === region)) return createError(GameFindError.InvalidRegion);

        const game = await new Promise<GameFindResult | ErrorEnum<GameFindError>>(async (resolve) => {
            if (!this.matchmaker) return resolve(createError(GameFindError.MatchmakerDisconnected));

            const listener = (msg: { command: 'notice' | 'validateUUID' } | RawFindGameResponse | RawFindGameError): void => {
                if ('command' in msg && (msg.command === 'notice' || msg.command === 'validateUUID')) return;

                this.matchmakerListeners.splice(this.matchmakerListeners.indexOf(listener), 1);

                if ('command' in msg && msg.command === 'gameFound') return resolve({ ...msg, ok: true });
                if ('error' in msg && msg.error === 'sessionNotFound') return resolve(createError(GameFindError.SessionExpired));

                console.error('findPublicGame: unknown response:', JSON.stringify(msg));
                console.error(`findPublicGame: ${UNKNOWN_RESPONSE_EXPLAIN}`);

                resolve(createError(GameFindError.UnexpectedResponse));
            };

            this.matchmakerListeners.push(listener);

            this.matchmaker.send(JSON.stringify({
                command: 'findGame',
                region,
                playType: 0, // joinPublic
                gameType: computedModeId,
                sessionId: this.account?.sessionId
            }));
        });

        return game;
    }

    /**
     * Checks if a game code exists and returns basic information about it
     * @param code The game code to check
     */
    async checkGameCode(code: string): Promise<CheckCodeResult | ErrorEnum<GameFindError | QueryServicesError | FirebaseError | FirebaseEmailError | LoginError | MatchmakerError>> {
        if (typeof code !== 'string') return createError(GameFindError.MissingParams);

        const initInfo = await this.initSession();
        if (!initInfo.ok) return initInfo;

        const game = await new Promise<GameFindResult | ErrorEnum<GameFindError>>((resolve) => {
            if (!this.matchmaker) return resolve(createError(GameFindError.MatchmakerDisconnected));

            const listener = (msg: { command: 'notice' | 'validateUUID' } | RawFindGameResponse | RawFindGameError): void => {
                if ('command' in msg && (msg.command === 'notice' || msg.command === 'validateUUID')) return;

                this.matchmakerListeners.splice(this.matchmakerListeners.indexOf(listener), 1);

                if ('command' in msg && msg.command === 'gameFound') return resolve({ ...msg, ok: true });

                if ('error' in msg && msg.error === 'sessionNotFound') return resolve(createError(GameFindError.SessionExpired));
                if ('error' in msg && msg.error === 'gameNotFound') return resolve(createError(GameFindError.GameNotFound));

                console.error('checkGameCode: unknown response:', JSON.stringify(msg));
                console.error(`checkGameCode: ${UNKNOWN_RESPONSE_EXPLAIN}`);

                resolve(createError(GameFindError.UnexpectedResponse));
            };

            this.matchmakerListeners.push(listener);

            this.matchmaker.send(JSON.stringify({
                command: 'joinGame',
                id: code,
                sessionId: this.account?.sessionId
            }));
        });

        if (game.ok) return { ok: true, exists: true, game };
        else if (game.error === GameFindError.GameNotFound) return { ok: true, exists: false };
        else return game;
    }

    /**
     * Creates a private game with the given region, mode, and map. This does NOT join the game.
     * @param region The name of the region to create the game in; must be one from {@link Bot.regionList} (e.g. 'useast')
     * @param mode The mode to create, either as a string (e.g. 'ffa') or as a {@link GameMode} (e.g. `GameMode.FFA`)
     * @param map The name of the map to create on (e.g. 'warehouse'); must be one from {@link Maps}
     * @returns The result of the create attempt, including the game info if it succeeded
     */
    async createPrivateGame(region: string, mode: string | GameMode, map: string): Promise<GameFindResult | ErrorEnum<GameFindError | QueryServicesError | FirebaseError | FirebaseEmailError | LoginError | MatchmakerError>> {
        await ensureDataLoaded;

        if (typeof region !== 'string') return createError(GameFindError.MissingParams);

        let computedModeId;

        if (typeof mode === 'number') {
            if (mode in GameMode) computedModeId = mode;
            else return createError(GameFindError.InvalidMode);
        } else if (typeof mode === 'string') {
            const modeEntry = Object.keys(GameMode)
                .filter(key => isNaN(Number(key)))
                .find(key => key.toLowerCase() === mode.toLowerCase());
            if (typeof modeEntry === 'string') computedModeId = GameMode[modeEntry as keyof typeof GameMode];
            else return createError(GameFindError.InvalidMode);
        } else return createError(GameFindError.InvalidMode);

        const mapIdx = Maps.findIndex(m => m.name.toLowerCase() === map.toLowerCase());
        if (mapIdx === -1) return createError(GameFindError.InvalidMap);

        const initInfo = await this.initSession();
        if (!initInfo.ok) return initInfo;

        if (!this.regionList.find(r => r.id === region)) return createError(GameFindError.InvalidRegion);

        const game = await new Promise<GameFindResult | ErrorEnum<GameFindError>>((resolve) => {
            if (!this.matchmaker) return resolve({ ok: false, error: GameFindError.MatchmakerDisconnected });

            const listener = (msg: { command: 'notice' | 'validateUUID' } | GameFindResult | RawFindGameError): void => {
                if ('command' in msg && (msg.command === 'notice' || msg.command === 'validateUUID')) return;

                this.matchmakerListeners.splice(this.matchmakerListeners.indexOf(listener), 1);

                if ('command' in msg && msg.command === 'gameFound') return resolve({ ...msg, ok: true });
                if ('error' in msg && msg.error === 'sessionNotFound') return resolve(createError(GameFindError.SessionExpired));

                console.error('createPrivateGame: unknown response:', JSON.stringify(msg));
                console.error(`createPrivateGame: ${UNKNOWN_RESPONSE_EXPLAIN}`);

                resolve(createError(GameFindError.UnexpectedResponse));
            };

            this.matchmakerListeners.push(listener);

            this.matchmaker.send(JSON.stringify({
                command: 'findGame',
                region,
                playType: 1, // createPrivate
                gameType: computedModeId,
                sessionId: this.account?.sessionId,
                noobLobby: false,
                map: mapIdx
            }));
        });

        return game;
    }

    /**
     * Joins a game
     * @param name The name to join the game with
     * @param data Either the game ID (the string at the end of the game URL, e.g. 'abc123' from `https://shellshock.io/game/abc123`) or the full game object returned from the matchmaker (either from {@link Bot.findPublicGame} or {@link Bot.createPrivateGame})
     * @param joinOptions Some extra options for joining documented in {@link JoinOptions}
     * @returns The result of the join attempt, including the game info if it succeeded
     */
    async join(name: string, data: string | GameFindResult, joinOptions: JoinOptions = {}): Promise<{ ok: true } | ErrorEnum<GameJoinError | MatchmakerError | QueryServicesError | FirebaseError | FirebaseEmailError | LoginError>> {
        await ensureDataLoaded;

        let joiningGameData: RawFindGameResponse;

        if (typeof data === 'string') {
            if (data.includes('#')) data = data.split('#')[1];

            const initInfo = await this.initSession();
            if (!initInfo.ok) return initInfo;

            const joinResult = await new Promise<ErrorEnum<GameJoinError> | GameFindResult>((resolve) => {
                if (!this.matchmaker) return resolve(createError(GameJoinError.MatchmakerDisconnected));

                const listener = (message: RawFindGameResponse | RawFindGameError): void => {
                    if ('command' in message && message.command === 'gameFound') {
                        this.matchmakerListeners.splice(this.matchmakerListeners.indexOf(listener), 1);

                        if (!message.id) {
                            console.error('join: unknown response:', message);
                            console.error(`join: ${UNKNOWN_RESPONSE_EXPLAIN}`);

                            return resolve(createError(GameJoinError.GameNotFound));
                        }

                        joiningGameData = message;

                        resolve({ ...joiningGameData, ok: true });
                    }

                    if ('error' in message) {
                        this.matchmakerListeners.splice(this.matchmakerListeners.indexOf(listener), 1);

                        if (message.error === 'gameNotFound') resolve(createError(GameJoinError.GameNotFound));
                        else if (message.error === 'sessionNotFound') resolve(createError(GameJoinError.SessionExpired));
                        else if (message.error === 'gameFull') resolve(createError(GameJoinError.GameFull));
                        else {
                            console.error('join: unknown response:', message);
                            console.error(`join: ${UNKNOWN_RESPONSE_EXPLAIN}`);
                        }
                    }
                };

                this.matchmakerListeners.push(listener);

                this.matchmaker.send(JSON.stringify({
                    command: 'joinGame',
                    id: data,
                    observe: false,
                    sessionId: this.account?.sessionId
                }));
            });

            if (!joinResult.ok) return joinResult;
            else joiningGameData = joinResult;
        } else {
            if (!this.account) {
                const anonAttempt = await this.loginAnonymously();
                if (!anonAttempt.ok) return anonAttempt;
            }

            joiningGameData = data;
        }

        if (!joiningGameData || !joiningGameData.id || !joiningGameData.subdomain || !joiningGameData.uuid || !joiningGameData.region) return createError(GameJoinError.InvalidObject);

        const socket = createWebSocket(this.urls.game(joiningGameData.subdomain, joiningGameData.id), { proxy: this.proxies.game, headers: this.headers });
        socket.binaryType = 'arraybuffer';

        return await new Promise<ErrorEnum<GameJoinError> | { ok: true }>((resolve) => {
            let hasClosed = false;

            socket.addEventListener('error', (e) => {
                hasClosed = true;

                if ('code' in e.error && e.error.code === 'ECONNRESET') resolve(createError(GameJoinError.ProxyFail));
                else {
                    console.error('join: failed to connect to websocket:', e);
                    console.error('join: this can be for any number of reasons. you might want to try adding a proxy, or changing it if you have one.');

                    resolve(createError(GameJoinError.WebSocketConnectFail));
                }
            });

            let metaRacePacket: Uint8Array<ArrayBuffer> | null = null;

            const messageHook = async (msg: WSMessageEvent): Promise<void> => {
                if (!this.account) return console.error('received a packet before login was complete, this should never happen');
                if (typeof msg.data === 'string') return console.error('received a string message, expected binary data', msg);

                const bytes = new Uint8Array(msg.data);
                const packet = new PacketIn(bytes);

                if (this.hasHook('packet')) this.$emit('packet', bytes, new PacketIn(bytes));

                const cmd = packet.unpackInt8U();
                const cmdName = Object.keys(CommCode).find(k => CommCode[k as keyof typeof CommCode] === cmd) ?? 'unknown';
                if (getFlag('LOG_PACKETS')) console.log(`[LOG_PACKETS] in: ${cmdName} (${cmd})`);

                switch (cmd) {
                    case CommCode.socketReady: {
                        if (this.packetHandlers[CommCode.socketReady]) this.packetHandlers[CommCode.socketReady]?.(joiningGameData, socket);
                        else {
                            const out = new PacketOut();
                            out.packInt8(joinOptions.eggforcerObserve ? CommCode.observeGame : CommCode.joinGame);

                            out.packString(joiningGameData.uuid);
                            out.packInt8(typeof joinOptions.hideBadge === 'boolean' ? (joinOptions.hideBadge ? 1 : 0) : 0);
                            out.packInt8(joinOptions.weapon ?? this.account.loadout.classIdx ?? 0);
                            out.packString(name || 'yolkbot');

                            out.packInt32(this.account.session);
                            out.packString(this.account.sessionId);
                            out.packString(this.account.firebaseId);

                            out.send(socket);
                        }
                        break;
                    }

                    case CommCode.gameJoined: {
                        if (this.packetHandlers[CommCode.gameJoined]) this.packetHandlers[CommCode.gameJoined]?.(packet, joiningGameData, socket);
                        else {
                            const myId = packet.unpackInt8U();
                            const myTeam = packet.unpackInt8U();

                            const gameMode = packet.unpackInt8U() as GameMode;
                            const mapIdx = packet.unpackInt8U();

                            packet.unpackInt8U(); // playerLimit
                            const isGameOwner = !!packet.unpackInt8U();
                            const isPrivate = !!packet.unpackInt8U();

                            packet.unpackInt8U(); // abTestBucket

                            const gameClasses = {
                                0: FFAGame,
                                1: TeamsGame,
                                2: SpatulaGame,
                                3: KOTCGame
                            }

                            const gameClass = gameClasses[gameMode];

                            const map = Maps[mapIdx];
                            let rawMap: MapJSON | undefined;

                            if (!joinOptions.skipMapLoad) {
                                const theMap = await loadMap(map.filename, map.hash);
                                rawMap = theMap;
                            }

                            socket.removeEventListener('message', messageHook);

                            if (!this.loggedIn()) return resolve(createError(GameJoinError.SessionExpired));

                            this.game = new gameClass(this, socket, map, mapIdx, myId, myTeam, joiningGameData, isGameOwner, isPrivate, joinOptions, rawMap);
                            if (this.game instanceof KOTCGame && rawMap) this.game.initZones(rawMap.data['DYNAMIC.capture-zone.none']);
                            if (metaRacePacket) this.game.processPacket(metaRacePacket);

                            this.$emit('gameInit');

                            if (this.#pendingGameOptions) {
                                this.game.sendOptions();
                                this.#pendingGameOptions = false;
                            }

                            const out = new PacketOut();
                            out.packInt8(CommCode.clientReady);
                            out.send(socket);

                            this.$emit('gameReady');

                            resolve({ ok: true });
                        }
                        break;
                    }

                    case CommCode.requestGameOptions: {
                        if (!this.game) this.#pendingGameOptions = true;
                        else this.game.sendOptions();
                        break;
                    }

                    case CommCode.metaGameState: {
                        metaRacePacket = bytes;
                        break;
                    }

                    default: {
                        console.error('Bot.join: packet in join sequence', packet.buffer);
                        break;
                    }
                }
            }

            socket.addEventListener('message', messageHook);

            let hasOpened = false;

            socket.addEventListener('close', (e) => {
                if (hasClosed) return this.game?.cleanup();
                hasClosed = true;

                if (e.code === CloseCode.gameNotFound) resolve(createError(GameJoinError.GameNotFound));
                else if (e.code === CloseCode.gameFull || e.code === CloseCode.gameMaxPlayersExceeded) resolve(createError(GameJoinError.GameFull));
                else if (e.code === CloseCode.gameDestroyUser) resolve(createError(GameJoinError.AccountBanned));
                else if (e.code === CloseCode.booted) resolve(createError(GameJoinError.GameIPBooted));
                else if (e.code === CloseCode.uuidNotFound) resolve(createError(GameJoinError.UUIDError));
                else if (e.code === CloseCode.sessionNotFound) resolve(createError(GameJoinError.SessionExpired));
                else if (e.code === CloseCode.clusterFullCpu || e.code === CloseCode.clusterFullMem || e.code === CloseCode.noClustersAvailable) resolve(createError(GameJoinError.RegionFull));
                else if (e.code === CloseCode.locked) resolve(createError(GameJoinError.GameLocked));
                else if (hasOpened) this.$emit('close', e.code ?? 4500);
                else resolve(createError(GameJoinError.WebSocketConnectFail));

                if (this.game) this.game.cleanup();
            });

            socket.addEventListener('open', () => (hasOpened = true));

            socket.addEventListener('error', (e) => {
                if (hasClosed) return;

                if ('code' in e.error && e.error.code === 'ECONNRESET') resolve(createError(GameJoinError.ProxyFail));
                else {
                    console.error('join: failed to connect to websocket:', e);
                    console.error('join: this can be for any number of reasons. you might want to try adding a proxy, or changing it if you have one.');

                    resolve(createError(GameJoinError.WebSocketConnectFail));
                }
            });
        });
    }

    /**
     * Registers a global callback for any hooks.
     * This is incredibly resource-intensive and shouldn't be used aside from development (things like finding hook names),
     * as it means that some hooks (such as {@link GameEvents.packet}) run intensive data computations that aren't normally performed unless needed.
     * @param callback The callback to run on any event. The first parameter is the event name and the rest are the parameters for that event
     */
    onAny(callback: <K extends keyof GameEvents>(event: K, ...args: GameEvents[K]) => void): void {
        this.#globalHooks.push(callback);
    }

    /**
     * Registers a callback for a specific event. All events are viewable at {@link GameEvents}
     * @param eventName The name of the event to listen for
     * @param callback The callback to run when the event is emitted, with the parameters for that event as arguments
     */
    on<K extends keyof GameEvents>(eventName: K, callback: (...args: GameEvents[K]) => void): void {
        if (!this.#hooks[eventName]) this.#hooks[eventName] = [];
        (this.#hooks[eventName] as any[]).push(callback);
    }

    /**
     * Registers a one-time callback for a specific event. All events are viewable at {@link GameEvents}
     * @param eventName The name of the event to listen for
     * @param callback The callback to run when the event is emitted, with the parameters for that event as arguments
     */
    once<K extends keyof GameEvents>(eventName: K, callback: (...args: GameEvents[K]) => void): void {
        const wrapper = (...args: GameEvents[K]): void => {
            this.off(eventName, wrapper);
            callback(...args);
        };

        this.on(eventName, wrapper);
    }

    /**
     * Removes a specific callback hook for a specific event
     * @param eventName The name of the event to stop listening for
     * @param callback The specific callback to remove; if not provided, all hooks for the event will be removed
     */
    off<K extends keyof GameEvents>(eventName: K, callback?: (...args: GameEvents[K]) => void): void {
        if (!this.#hooks[eventName]) return;

        if (callback) this.#hooks[eventName] = (this.#hooks[eventName] as ((...args: GameEvents[K]) => void)[]).filter((hook) => hook !== callback) as any;
        else this.#hooks[eventName] = [];
    }

    /**
     * Checks if a hook is attached to the bot
     * @param event The name of the event
     * @returns Whether any hook is attached for that event
     */
    hasHook<K extends keyof GameEvents>(event: K): boolean {
        return !!this.#hooks[event]?.length || this.#globalHooks.length > 0;
    }

    /** @hidden */
    $emit<K extends keyof GameEvents>(event: K, ...args: GameEvents[K]): void {
        const hooks = this.#hooks[event] as ((...args: GameEvents[K]) => void)[] | undefined;
        if (hooks) for (const cb of hooks) cb(...args);
        for (const cb of this.#globalHooks) cb(event, ...args);
    }

    /**
     * The easier way to dispatch something.
     * @param eventName The event name. You can see a list in the "properties" of {@link DispatchIndex}
     * @param args The arguments you can pass. You can find the file link in {@link DispatchIndex} and then look at the constructor of the dispatch class to see what arguments it takes.
     */
    emit<E extends DispatchKeys>(eventName: E, ...args: DispatchParams[E]): void {
        if (!this.game) throw new Error('Bot.emit: you have not joined a Game yet; use bot.join() to do so');

        const dispatch = DispatchIndex[eventName];
        if (dispatch) this.game.dispatch(new (dispatch as any)(...args));
        else throw new Error(`no event found for "${eventName}"`);
    }

    /** Creates a packet handler function. Almost all handler functions (aside from some relating to game join) accept the parameters `(game, packet)` */
    createPacketHandler<A extends any[], R>(
        fn: (game: Game, packet: PacketIn, ...rest: A) => R
    ): (packet: PacketIn, ...rest: A) => R {
        return (packet, ...rest) => fn(this.game as any, packet, ...rest);
    }

    /** Allows you to override the handlers for specific packets. */
    packetHandlers: Partial<Record<number, (...args: any[]) => any>> = {
        [CommCode.syncThem]: this.createPacketHandler(processSyncThemPacket),
        [CommCode.fire]: this.createPacketHandler(processFirePacket),
        [CommCode.hitThem]: this.createPacketHandler(processHitThemPacket),
        [CommCode.syncMe]: this.createPacketHandler(processSyncMePacket),
        [CommCode.hitMe]: this.createPacketHandler(processHitMePacket),
        [CommCode.swapWeapon]: this.createPacketHandler(processSwapWeaponPacket),
        [CommCode.collectItem]: this.createPacketHandler(processCollectItemPacket),
        [CommCode.respawn]: this.createPacketHandler(processRespawnPacket),
        [CommCode.die]: this.createPacketHandler(processDiePacket),
        [CommCode.pause]: this.createPacketHandler(processPausePacket),
        [CommCode.chat]: this.createPacketHandler(processChatPacket),
        [CommCode.addPlayer]: this.createPacketHandler(processAddPlayerPacket),
        [CommCode.removePlayer]: this.createPacketHandler(processRemovePlayerPacket),
        [CommCode.eventModifier]: this.createPacketHandler(processEventModifierPacket),
        [CommCode.metaGameState]: this.createPacketHandler(processMetaGameStatePacket),
        [CommCode.beginShellStreak]: this.createPacketHandler(processBeginShellStreakPacket),
        [CommCode.endShellStreak]: this.createPacketHandler(processEndShellStreakPacket),
        [CommCode.hitMeHardBoiled]: this.createPacketHandler(processHitMeHardBoiledPacket),
        [CommCode.gameOptions]: this.createPacketHandler(processGameOptionsPacket),
        [CommCode.ping]: this.createPacketHandler(processPingPacket),
        [CommCode.switchTeam]: this.createPacketHandler(processSwitchTeamPacket),
        [CommCode.changeCharacter]: this.createPacketHandler(processChangeCharacterPacket),
        [CommCode.reload]: this.createPacketHandler(processReloadPacket),
        [CommCode.explode]: this.createPacketHandler(processExplodePacket),
        [CommCode.throwGrenade]: this.createPacketHandler(processThrowGrenadePacket),
        [CommCode.spawnItem]: this.createPacketHandler(processSpawnItemPacket),
        [CommCode.melee]: this.createPacketHandler(processMeleePacket),
        [CommCode.updateBalance]: this.createPacketHandler(processUpdateBalancePacket),
        [CommCode.playerRewards]: this.createPacketHandler(processPlayerRewardsPacket),
        [CommCode.challengeCompleted]: this.createPacketHandler(processChallengeCompletedPacket),
        [CommCode.gameAction]: this.createPacketHandler(processGameActionPacket),
        [CommCode.playerInfo]: this.createPacketHandler(processPlayerInfoPacket),
        [CommCode.respawnDenied]: () => {
            if (this.game) {
                this.game.me.playing = false;
                this.$emit('respawnDenied');
            }
        },
        [CommCode.requestGameOptions]: () => this.game && this.game.sendOptions(),
        [CommCode.expireUpgrade]: () => { },
        [CommCode.clientReady]: () => { },
        [CommCode.gameLocked]: this.createPacketHandler(processGameLockedPacket),
        [CommCode.musicInfo]: (_bot: BotWithGame, packet: PacketIn) => packet.unpackLongString()
    }

    /** Disposes a bot instance by clearing timeouts, leaving games, and disconnecting from the matchmaker */
    dispose(): void {
        if (this.game) {
            this.game.leave();
            this.game.cleanup();
        }

        if (this.matchmaker && this.matchmaker.readyState === 1) this.matchmaker.close();

        if (this.account && this.account.renewSessionInterval) clearInterval(this.account.renewSessionInterval);

        this.#hooks = {};
        this.#globalHooks = [];

        this.matchmakerListeners = [];
    }

    /** Points to `Bot.account.challenges` */
    get challenges(): Account['challenges'] | undefined {
        if (!this.loggedIn()) throw new Error('Bot.challenges: you have not logged in yet');
        return this.account.challenges;
    }

    /** Points to `Bot.account.cw` */
    get cw(): Account['cw'] | undefined {
        if (!this.loggedIn()) throw new Error('Bot.cw: you have not logged in yet');
        return this.account.cw;
    }

    /** Points to `Bot.account.gifts` */
    get gifts(): Account['gifts'] | undefined {
        if (!this.loggedIn()) throw new Error('Bot.gifts: you have not logged in yet');
        return this.account.gifts;
    }

    /** Points to `Bot.account.shop` */
    get shop(): Account['shop'] | undefined {
        if (!this.loggedIn()) throw new Error('Bot.shop: you have not logged in yet');
        return this.account.shop;
    }

    /** Points to `Bot.game.dispatch` */
    get dispatch(): Game['dispatch'] | undefined {
        if (!this.inGame()) throw new Error('Bot.dispatch: you have not joined a Game yet; use bot.join() to do so');
        return this.game.dispatch.bind(this.game);
    }

    /** Points to `Bot.game.me` */
    get me(): Player | undefined {
        if (!this.inGame()) throw new Error('Bot.me: you have not joined a Game yet; use bot.join() to do so');
        return this.game.me;
    }

    /** Points to `Bot.game.players` */
    get players(): (Player | undefined)[] | undefined {
        if (!this.inGame()) throw new Error('Bot.players: you have not joined a Game yet; use bot.join() to do so');
        return this.game.players;
    }
}