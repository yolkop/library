/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { PacketIn } from './packet/PacketIn.js';
import { PacketOut } from './packet/PacketOut.js';

import { CloseCode, CommCode } from '#env/DataLoader';

import { ColliderSet } from './pathing/ColliderSet.js';
import { Movement } from './pathing/physics.js';
import { Pathfinder } from './pathing/Pathfinder.js';

import { coords } from './coords.js';
import { Simulator } from './Simulator.js';
import { Player, ShellStreak } from './Player.js';

import { getFlag, type Position } from '../util.js';

import type { Account } from '../account/Account.js';
import type { ADispatch } from './dispatch/ADispatch.js';
import type { BotLoggedIn, JoinOptions, RawFindGameResponse } from '../Bot.js';
import type { DamageScale, GravityScale, RegenScale } from './dispatch/impl/GameOptionsDispatch.js';
import type { WSSocket } from '../env/createWebSocket.js';
import type { Map, MapJSON } from '../types/Map.js';

export const FramesBetweenSyncs = 3;
export const StateBufferSize = 256;

/** In-game item collection types */
export enum CollectType {
    /** An ammo box on the game map */
    Ammo = 0,
    /** A grenade on the game map */
    Grenade = 1
}

/** Actions game owners can take */
export enum GameAction {
    /** When the game owner "resets" the game from the options menu */
    Reset = 1,
    /** Occurs throughout the lifecycle of a game */
    Pause = 2
}

/** The game modes! */
export enum GameMode {
    /** Free for All */
    FFA = 0,
    /** Teams */
    Team = 1,
    /** CTS */
    Spatula = 2,
    /** King of the Coop */
    KOTC = 3
}

/** The team "IDs", most often referred to in code as array indexes or as easy identifiers */
export enum Team {
    /** None is used as the team for players in FFA */
    None = 0,
    /** Blue team */
    Blue = 1,
    /** Red team */
    Red = 2
}

/** A {@link Map} with additional information needed for a game */
export interface GameMap extends Map {
    index: number;
    raw?: MapJSON;
}

/** The options object on a {@link Game} */
export interface GameOptions {
    /** The game gravity */
    gravity: typeof GravityScale[number];
    /** The game damage multiplier */
    damage: typeof DamageScale[number];
    /** The game health regeneration speed multiplier */
    healthRegen: typeof RegenScale[number];
    /** Whether the game is locked */
    locked: boolean;
    /** Whether the game will block players from manually changing teams */
    noTeamChange: boolean;
    /** Whether the game will skip the automatic KoTC round-end team shuffle */
    noTeamShuffle: boolean;
    /** false = allowed to use, true = not allowed to use */
    weaponsDisabled: boolean[];
}

/** An individual collectible item on the map (ammo or grenade) */
export interface Collectible extends Position {
    /** The collectible "ID". This may be overwriten by a new collectible after one has been picked up */
    id: number;
}

const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** The base game mode class that all game modes extend; contains all of the shared logic for game modes and is what the bot's `game` property is typed as */
export abstract class Game {
    /** The mode of the game; overridden by all games that extend this */
    mode = GameMode.FFA;

    /** The bot attached to the game */
    bot: BotLoggedIn;

    /** The game code */
    code = '';
    /** The game region */
    region = '';
    /** The game's cluster subdomain */
    subdomain = '';

    /** The websocket instance associated with the game */
    socket: WSSocket;
    /** The game's map information */
    map: GameMap;

    /** Whether the bot is the game owner */
    isGameOwner = false;
    /** Whether the game is private */
    isPrivate = false;
    /** Whether the game is a "noob" game */
    isNoob = false;
    /** Whether the bot is observing the game (as an eggforcer) */
    isObserving = false;

    /** The game's options */
    options: GameOptions = {
        gravity: 1,
        damage: 1,
        healthRegen: 1,
        locked: false,
        noTeamChange: false,
        noTeamShuffle: false,
        // false = allowed to use
        // true = cannot use
        weaponsDisabled: Array(7).fill(false)
    };

    /** The collectibles spawned in on the map */
    collectibles: Record<CollectType, Collectible[]> = {
        [CollectType.Ammo]: [],
        [CollectType.Grenade]: []
    }

    /** All of the players in the game */
    players: (Player | undefined)[] = [];

    /** Every collider on the map. Only missing if the game was joined with {@link JoinOptions.skipMapLoad} */
    colliders?: ColliderSet;
    /** Predicts the bot's movement between server syncs. Only missing if the game was joined with {@link JoinOptions.skipMapLoad} */
    simulator?: Simulator;

    #pathfinder?: Pathfinder;

    /**
     * Plans and walks routes around the map. Touching this the first time builds the walkable
     * graph for the map, which takes a moment - nothing else in the game loop needs it, so it is
     * only ever built if you actually navigate.
     */
    get pathfinder(): Pathfinder {
        if (!this.#pathfinder) {
            if (!this.colliders) throw new Error('Game.pathfinder: the map was never loaded, so there is nothing to navigate; drop skipMapLoad');
            this.#pathfinder = new Pathfinder(this.bot, this, this.colliders);
        }

        return this.#pathfinder;
    }

    /** @hidden */
    get account(): Account {
        return this.bot.account;
    }

    /** Whether the bot is currently walking a path */
    isPathing(): boolean {
        return !!this.#pathfinder?.route;
    }

    /** @hidden */
    lastPingTime = -1;
    /** @hidden */
    lastDeathTime = 0;

    #afkKickInterval: NodeJS.Timeout | number | null = null;
    #updateIntervalId: NodeJS.Timeout | number | null = null;
    /** @hidden */
    pingTimeoutId: NodeJS.Timeout | number | null = null;

    /** The bot's game "ping" */
    ping = 0;

    /** Represents the bot's current player ID; available before the `botJoin` hook. */
    myId = -1;
    #myTeam = Team.None;

    #preciseHealth = false;

    #dispatchQueue: ADispatch[] = [];

    /** Automatically pulls the current {@link Player} that represents the bot. Returns something with invalid properties (aside from `id` and `team`) if the player hasn't initialized yet. You can use {@link Game.isReady} to check if the player is ready or not. */
    get me(): Player {
        const find = this.players[this.myId];
        if (find) return find;
        // @ts-expect-error player is not fully initialized before botJoin
        else return new Player({ id: this.myId, team: this.#myTeam }, null);
    }

    /** Checks whether `bot.me` is ready to use */
    isReady(): boolean {
        return !!this.players[this.myId];
    }

    /**
     * Creates a base gamemode.
     * @param bot The bot
     * @param socket The game's socket
     * @param map The game's basic map information
     * @param mapIdx The map index
     * @param myId The ID of the player
     * @param myTeam The ID of the team the player is on
     * @param inputData The input game data (region, code, subdomain, etc)
     * @param isGameOwner Whether the bot is the game owner or not
     * @param isPrivate Whether the game is private or not
     * @param rawMap The raw map data
     */
    constructor(
        bot: BotLoggedIn,
        socket: WSSocket,
        map: Map,
        mapIdx: number,
        myId: number,
        myTeam: number,
        inputData: RawFindGameResponse,
        isGameOwner: boolean,
        isPrivate: boolean,
        joinOptions: JoinOptions,
        rawMap?: MapJSON
    ) {
        this.bot = bot;

        this.code = inputData.id;
        this.region = inputData.region ?? bot.regionList.find(r => r.sub === inputData.subdomain)?.id ?? '';
        this.subdomain = inputData.subdomain;

        this.myId = myId;
        this.#myTeam = myTeam;

        this.socket = socket;
        this.map = { ...map, index: mapIdx, raw: rawMap };

        if (rawMap) {
            this.colliders = new ColliderSet(rawMap);
            this.simulator = new Simulator(bot, this, this.colliders);
        }

        this.isGameOwner = isGameOwner;
        this.isPrivate = isPrivate;
        this.isNoob = inputData.noobLobby;
        this.isObserving = !!joinOptions.eggforcerObserve;

        if (joinOptions.preciseHealth) this.#preciseHealth = true;

        this.socket.addEventListener('message', (e) => {
            if (typeof e.data === 'string') console.error('received a string message, expected binary data', e);
            else this.processPacket(new Uint8Array(e.data));
        });

        this.lastDeathTime = Date.now() - 10000;

        if (!joinOptions.manualUpdate) {
            const intervalId = setInterval(() => this.update(), 100 / 3);
            this.#updateIntervalId = intervalId;
            if (typeof intervalId.unref === 'function') intervalId.unref();
        }

        this.lastPingTime = Date.now();

        const out2 = new PacketOut();
        out2.packInt8(CommCode.ping);
        out2.send(socket);

        if (joinOptions.noAfkKick) this.#afkKickInterval = setInterval(() => {
            if (bot.game && !this.me.playing && (Date.now() - this.lastDeathTime) >= 15000) {
                const out3 = new PacketOut();
                out3.packInt8(CommCode.keepAlive);
                out3.send(socket);
            }
        }, 15000);
    }

    /** Holds basic information about the player's current state. You should NEVER need to manipulate ANYTHING in here, as it often has adverse side effects */
    state = {
        /** A ticker for the bot's jumping state, from 0 (on ground) to 4 (fully off ground) */
        onGround: 0,
        /** A countdown ticker for a queued jump input, mirroring the server's jump buffer */
        jumpQueued: 0,
        /** A ticker for the bot's current chat cooldown. More `chatLines` information is in {@link ChatDispatch} */
        chatLines: 0,
        /** The bot's current raw packet control keys */
        controlKeys: 0,
        /** The bot's X direction, used for movement. If you need the bot's current position, use the "position" prop on {@link Bot.me} */
        dx: 0,
        /** The bot's Y direction, used for movement. If you need the bot's current position, use the "position" prop on {@link Bot.me} */
        dy: 0,
        /** The bot's Z direction, used for movement. If you need the bot's current position, use the "position" prop on {@link Bot.me} */
        dz: 0,
        /** The bot's current yaw pre-packet send. If you need the bot's current yaw as synced with the server, use the "view" prop on {@link Bot.me} */
        yaw: 0,
        /** The bot's current pitch pre-packet send. If you need the bot's current yaw as synced with the server, use the "view" prop on {@link Bot.me} */
        pitch: 0,
        /** A ticker used for climbing ladders */
        climbX: 0,
        /** A ticker used for climbing ladders */
        climbZ: 0,
        /** A ticker used for climbing ladders */
        climbRY: 0,
        /** The number of shots fired in that frame. If you need to fire shots, please use the {@link FireDispatch} */
        shotsFired: 0,
        /** The bot's current state IDX, according to the client */
        stateIdx: 0,
        /** The bot's current state IDX, according to the server */
        serverStateIdx: 0,
        /** Whether the bot is reloading */
        reloading: false,
        /** Whether the bot is swapping its gun */
        swappingGun: false,
        /** Whether the bot is using its melee */
        usingMelee: false,
        /** The bot's "state" buffer */
        buffer: [] as {
            /** The controlKeys for that state */
            controlKeys?: number;
            /** The yaw for that state */
            yaw?: number;
            /** The pitch for that state */
            pitch?: number;
            /** The shotsFired for that state */
            shotsFired?: number;
        }[]
    };

    /** Manually updates the game state; only call this yourself if {@link JoinOptions.manualUpdate} is enabled. */
    update(): void {
        if (!this.isReady() || this.socket.readyState !== 1) return;

        if (this.#pathfinder?.route) this.#pathfinder.update();

        const completedDispatches = [];

        for (let i = 0; i < this.#dispatchQueue.length; i++) {
            const disp = this.#dispatchQueue[i];
            if (disp.check(this)) {
                disp.execute(this);
                completedDispatches.push(i)
            }
        }

        for (let i = completedDispatches.length - 1; i >= 0; i--)
            this.#dispatchQueue.splice(completedDispatches[i], 1);

        this.state.chatLines = Math.max(0, this.state.chatLines - 1 / (30 * 4));

        if (this.me && this.me.playing) {
            const currentIdx = this.state.stateIdx;
            // MAINTAINER NOTE: if you have issues with the stateBuffer, set this to true
            const bufferDebug = false;

            if (bufferDebug) console.log('setting buffer for idx', currentIdx);

            this.me.jumping = !!(this.state.controlKeys & Movement.Jump);

            this.state.buffer[currentIdx] = {
                controlKeys: this.state.controlKeys,
                yaw: this.state.yaw,
                pitch: this.state.pitch,
                shotsFired: this.state.shotsFired
            }

            this.state.shotsFired = 0;

            if (this.simulator) this.simulator.simulate(currentIdx);

            if ((this.state.stateIdx % FramesBetweenSyncs) === 0) {
                const out = new PacketOut();

                out.packInt8(CommCode.syncMe);
                out.packInt8(this.state.stateIdx);
                out.packInt8(this.state.serverStateIdx);

                const startIdx = mod(this.state.stateIdx - FramesBetweenSyncs + 1, StateBufferSize);

                if (bufferDebug) console.log('--- START FRAME LOG ---');

                for (let i = 0; i < FramesBetweenSyncs; i++) {
                    const idx = mod(startIdx + i, StateBufferSize);
                    const frame = this.state.buffer[idx] || {};
                    const keys = frame.controlKeys ?? 0;
                    const shots = frame.shotsFired ?? 0;
                    const yaw = frame.yaw ?? this.state.yaw;
                    const pitch = frame.pitch ?? this.state.pitch;

                    if (bufferDebug) console.log('adding', this.state.stateIdx, startIdx, idx, frame);

                    out.packInt8(keys);
                    out.packInt8(shots);
                    out.packString(coords(yaw, pitch, this.me.uniqueId));
                    out.packInt8(this.me.scale * 100);
                }

                if (this.socket && this.socket.readyState === 1) out.send(this.socket);

                if (bufferDebug) console.log('--- END FRAME LOG ---');

                this.state.buffer = [];

                this.bot.$emit('serverTick');
            }

            this.state.stateIdx = mod(this.state.stateIdx + 1, StateBufferSize);
        }

        if (this.#preciseHealth) {
            const regen = 0.1 * (this.isPrivate ? this.options.healthRegen : 1);

            for (const player of this.players) {
                if (player && player.playing && player.hp > 0) {
                    const hasOverHeal = player.shellStreaks.includes(ShellStreak.OverHeal);
                    player.hp += hasOverHeal ? -regen : regen;
                    player.hp = hasOverHeal ? Math.max(100, player.hp) : Math.min(100, player.hp);
                }

                if (player && player.spawnShield > 0) player.spawnShield -= 6;
            }
        }

        this.bot.$emit('clientTick');
    }

    /** @hidden */
    sendOptions(): void {
        if (this.socket.readyState !== 1) return;

        const out = new PacketOut();
        out.packInt8(CommCode.gameOptions);
        out.packInt8(this.options.gravity * 4);
        out.packInt8(this.options.damage * 4);
        out.packInt8(this.options.healthRegen * 4);

        const flags =
            (this.options.locked ? 1 : 0) |
            (this.options.noTeamChange ? 2 : 0) |
            (this.options.noTeamShuffle ? 4 : 0);

        out.packInt8(flags);

        this.options.weaponsDisabled.forEach((v) => out.packInt8(v ? 1 : 0));

        if (this.socket) out.send(this.socket);
    }

    /**
     * Processes an incoming packet from the server
     * @param bytes The raw packet bytes in a Uint8Array
     */
    processPacket(bytes: Uint8Array<ArrayBuffer>): void {
        const packet = new PacketIn(bytes);

        if (this.bot.hasHook('packet')) this.bot.$emit('packet', bytes, new PacketIn(bytes));

        let lastPacketName = '';
        let lastCode = 0;

        while (packet.isMoreDataAvailable()) {
            const cmd = packet.unpackInt8U();
            const handler = this.bot.packetHandlers[cmd];

            const packetName = Object.keys(CommCode).find(k => CommCode[k as keyof typeof CommCode] === cmd) ?? 'unknown';

            if (handler) {
                try {
                    handler(packet);
                } catch (err) {
                    console.error(`processPacket: handler for ${packetName} (${cmd}) threw an error:`, err);
                    console.error('processPacket: this indicates a bug in yolkbot, and you likely cannot solve it yourself');

                    this.socket.close(CloseCode.mainMenu);
                    break;
                }
            } else {
                console.error(`processPacket: got but couldn't identify: ${packetName} ${cmd}`);
                if (lastPacketName) console.error(`processPacket: it may be a result of ${lastPacketName} (${lastCode}).`);
                console.error('processPacket: this indicates a bug in yolkbot, and you likely cannot solve it yourself');

                break;
            }

            lastPacketName = packetName;
            lastCode = cmd;

            if (getFlag('LOG_PACKETS')) console.log(`[LOG_PACKETS] in: ${lastPacketName} (${lastCode})`);
        }
    }

    /**
     * Checks whether the bot can see a specific player. Basic and not super accurate, but it should work for most cases.
     * @param target The player to check line of sight to
     * @returns Whether the bot can see the target player or not
     */
    canSee(target: Player): boolean {
        if (!this.colliders) throw new Error('Game.canSee: the map was never loaded, so there is nothing to see through; drop skipMapLoad');
        return this.colliders.canSee(this.me.position, target.position);
    }

    /**
     * Gets the best target for the bot to attack based on distance and if they're in the line of sight (among other factors)
     * @param checkCanSee Whether to check if the bot can see the target using {@link Game.canSee} (defaults to false)
     * @param customPredicate An optional function to filter potential targets; it should return true for valid targets and false for invalid ones
     * @returns The best target for the bot to attack, or null if there are no valid targets
     */
    getBestTarget(checkCanSee?: boolean, customPredicate?: (player: Player) => boolean): Player | null {
        const options = this.players
            .filter((player): player is Player => !!player)
            .filter((player) => player.playing)
            .filter((player) => player.hp > 0)
            .filter((player) => player.id !== this.me.id)
            .filter((player) => this.me.team === 0 || player.team !== this.me.team)
            .filter((player) => !checkCanSee || this.canSee(player))
            .filter((player) => !customPredicate || customPredicate(player));

        const distancePlayers = options.map(player => ({
            player,
            distance:
                ((player.position.x - this.me.position.x) ** 2) + // x coord
                (3 * (player.position.y - this.me.position.y) ** 2) + // y coord (3x pref for same Y)
                ((player.position.z - this.me.position.z) ** 2) // z coord
        })).sort((a, b) => a.distance - b.distance);

        if (distancePlayers.length) return distancePlayers[0].player;
        else return null;
    }

    /**
     * Dispatches {@link ADispatch} - use {@link Bot.emit} for a friendlier experience
     * @param dispatch The dispatch to send out
     * @returns Whether the dispatch's initial parameter validation check succeeded; it does NOT contain anything about the results of the constant check that runs in the background
     */
    dispatch<D extends ADispatch>(dispatch: D): boolean {
        if (dispatch.validate(this)) {
            if (dispatch.check(this)) dispatch.execute(this);
            else this.#dispatchQueue.push(dispatch);
            return true;
        }

        console.warn(`dispatch/emit: validation failed for dispatch ${dispatch.constructor.name}`);
        console.warn('dispatch/emit: make sure all of the arguments you pass to the dispatch are completely valid; this can happen when you attempt to boot when not being the game owner, pass invalid player IDs, do things in the wrong gamemode (such as go to the coop in FFA), etc');

        return false;
    }

    /** Leaves a game */
    leave(code = CloseCode.mainMenu): void {
        this.socket.close(code);
    }

    /** Cleans up a game after the bot leaves */
    cleanup(): void {
        if (this.#pathfinder) this.#pathfinder.stop();

        if (this.#afkKickInterval) clearInterval(this.#afkKickInterval);
        if (this.#updateIntervalId) clearInterval(this.#updateIntervalId);
        if (this.pingTimeoutId) clearTimeout(this.pingTimeoutId);

        this.#dispatchQueue = [];
    }

    /** @hidden */
    get $emit(): BotLoggedIn['$emit'] {
        return this.bot.$emit.bind(this.bot);
    }
}