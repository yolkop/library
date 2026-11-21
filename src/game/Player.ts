/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { GunCluck9mm, type GunIds, GunList } from './Guns.js';

import { Movement } from './pathing/physics.js';
import { initializePlayerGun, type Position } from '../util.js';

import type { Team } from './Game.js';
import type { KOTCZoneTile } from './modes/KOTCGame.js';

/** The available in-game streak rewards */
export enum ShellStreak {
    /** The "shield" effect where you get that shield. The health of the shield can be seen using {@link Player.hpShield} */
    HardBoiled = 1,
    /** The 2X damage effect */
    EggBreaker = 2,
    /** The ammo/grenade restock effect */
    Restock = 4,
    /** The green overheal effect */
    OverHeal = 8,
    /** The 2X eggs effect */
    DoubleEggs = 16,
    /** The mini egg effect */
    MiniEgg = 32
}

/** The view property on a {@link Player} */
export interface PlayerView {
    /** The player's yaw (horizontal rotation, 0 to Math.PI*2) */
    yaw: number;
    /** The player's pitch (vertical rotation, -1.5 to 1.5) */
    pitch: number;
}

/** The different colors an egg can be; 7 and above are VIP */
export type ShellColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** The character property (gun skin IDs, hat IDs, etc) on {@link Player} */
export interface PlayerCharacter {
    /** The shell color */
    eggColor: ShellColor;
    /** The primary gun item ID */
    primaryGun: number;
    /** The secondary gun item ID */
    secondaryGun: number;
    /** The stamp item ID */
    stamp: number;
    /** The hat item ID */
    hat: number;
    /** The grenade item ID */
    grenade: number;
    /** The melee item ID */
    melee: number;
    /** The custom X/Y position of the stamp (available only to VIPs) */
    stampPos: { x: number, y: number };
}

/** The raw data passed into a {@link Player} */
export interface RawPlayerData {
    id: number;
    uniqueId: string;
    name: string;
    safeName: string;
    charClass: GunIds;
    team: number;
    primaryWeaponItem: number;
    secondaryWeaponItem: number;
    shellColor: number;
    hatItem: number;
    stampItem: number;
    stampPosX: number;
    stampPosY: number;
    grenadeItem: number;
    meleeItem: number;
    x: number;
    y: number;
    z: number;
    dx: number;
    dy: number;
    dz: number;
    yaw: number;
    pitch: number;
    score: number;
    kills: number;
    deaths: number;
    streak: number;
    totalKills: number;
    totalDeaths: number;
    bestStreak: number;
    bestOverallStreak: number;
    shield: number;
    hp: number;
    playing: boolean;
    weaponIdx: number;
    controlKeys: number;
    upgradeProductId: number;
    activeShellStreaks: number;
    social: string;
    hideBadge: boolean;
}

/** A list of social sites a player could have */
export enum SocialMedia {
    Facebook = 0,
    Instagram = 1,
    Tiktok = 2,
    Discord = 3,
    Youtube = 4,
    Twitter = 5,
    Twitch = 6
}

type ReverseEnum<T extends Record<string, string | number>> = {
    [K in keyof T as T[K] & (string | number)]: K & string;
};

const RSocialMedia = Object.fromEntries(
    Object.entries(SocialMedia)
        .filter(([key]) => isNaN(Number(key)))
        .map(([key, value]) => [value, key])
) as ReverseEnum<typeof SocialMedia>;

/** A player snapshot for various packets */
export type PlayerSnapshot = Omit<Player, 'updateKotcZone'>;

/** A Player in a {@link Game} */
export class Player {
    /** The player's ingame ID, does not persist between games */
    id: number;
    /** A unique ID, which is random */
    uniqueId: string;
    /** The player's ingame name */
    name: string;
    /** The "safe" name sent by the server, if the user has hid player names or if the name is filtered */
    safeName: string;
    /** The team the player is on */
    team: Team;
    /** Whether the player is actively spawned in and playing */
    playing: boolean;
    /** The player's social media platforms as displayed ingame */
    socials: {
        /** The social media "ID" */
        id: SocialMedia;
        /** The social media "type" */
        type: keyof typeof SocialMedia;
        /** The social media URL */
        url: string;
        /** Whether the social media is "active" (shown ingame) */
        active?: boolean;
    }[];
    /** Whether the player is a VIP */
    isVip: boolean;
    /** Whether the player has opted to show their badge (either VIP or social) */
    showBadge: boolean;
    /** The player's killstreak */
    streak: number;
    /** the player's shellstreaks/powerups */
    shellStreaks: ShellStreak[];
    /** The player's scale (involves the Mini Egg powerup) */
    scale: number;
    /** The player's physical position ingame */
    position: Position;
    /** Whether the player is jumping */
    jumping: boolean;
    /** Whether the player is scoping */
    scoping: boolean;
    /** Whether the player is climbing */
    climbing: boolean;
    /** The direction the player is looking ingame (yaw/pitch) */
    view: PlayerView;
    /** Whether the player is in a KoTC zone */
    inKotcZone = false;
    /** The player's currently equipped skin data */
    character: PlayerCharacter;
    /** The player's stats for the specific game */
    stats: {
        /** The total number of kills the player has gotten in that specific game */
        totalKills: number;
        /** The total number of times the player has died in that specific game */
        totalDeaths: number;
        /** The best streak the player has gotten in that specific game */
        bestStreak: number;
    };
    /** The active gun (0 = primary, 1 = secondary) the player is using ingame */
    activeGun: number;
    /** The selected gun (eggk, scrambler, etc) the player is using as their primary */
    selectedGun: GunIds;
    /** The primary and secondary weapons in an array the player is using */
    weapons: ReturnType<typeof initializePlayerGun>[];
    /** The number of grenades the player has */
    grenades: number;
    /** The health of the player */
    hp: number;
    /** The shield health of the player (involves the shield effect) */
    hpShield: number;
    /** The "spawn shield" ticks (0 = no spawn shield) */
    spawnShield: number;
    /** The random seed the player's aim will use on the next shot */
    randomSeed: number;
    /** The admin information, viewable if the Bot is an admin */
    admin?: {
        /** The player's IP */
        ip: string;
        /** The player's "DB ID" */
        dbId: string;
    };

    /**
     * Creates a Player
     * @param playerData The raw player data from the addPlayer packet 
     * @param activeZone The active KoTC zone, if it's a KoTC game
     */
    constructor(playerData: RawPlayerData, activeZone: KOTCZoneTile[] | null) {
        this.id = playerData.id;
        this.uniqueId = playerData.uniqueId;

        this.name = playerData.name;
        this.safeName = playerData.safeName;

        this.team = playerData.team;

        this.playing = playerData.playing;

        this.socials = [];
        if (typeof playerData.social === 'string' && playerData.social.length) {
            try {
                const parsed = JSON.parse(playerData.social);
                if (Array.isArray(parsed)) this.socials = parsed;
            } catch (e) {
                console.error('Player: error parsing socials:', e);
                console.error('Player: this is likely a bug in the game server and not something you can fix');
            }
        }
        this.socials.forEach((social) => social.type = RSocialMedia[social.id]);

        this.isVip = playerData.upgradeProductId > 0;
        this.showBadge = !playerData.hideBadge || false;

        this.streak = playerData.score;

        this.shellStreaks = Object.values(ShellStreak)
            .filter((streak): streak is number => typeof streak === 'number')
            .filter(streak => playerData.activeShellStreaks & streak);

        this.scale = this.shellStreaks.includes(ShellStreak.MiniEgg) ? 0.5 : 1;

        this.position = {
            x: playerData.x,
            y: playerData.y,
            z: playerData.z
        };

        this.jumping = !!(playerData.controlKeys & Movement.Jump);
        this.scoping = !!(playerData.controlKeys & Movement.Scope);
        this.climbing = false;

        this.view = {
            yaw: playerData.yaw,
            pitch: playerData.pitch
        };

        if (activeZone) this.updateKotcZone(activeZone);

        this.character = {
            eggColor: playerData.shellColor as ShellColor,
            primaryGun: playerData.primaryWeaponItem,
            secondaryGun: playerData.secondaryWeaponItem,
            stamp: playerData.stampItem,
            hat: playerData.hatItem,
            grenade: playerData.grenadeItem,
            melee: playerData.meleeItem,
            stampPos: {
                x: playerData.stampPosX,
                y: playerData.stampPosY
            }
        }

        this.stats = {
            totalKills: playerData.totalKills,
            totalDeaths: playerData.totalDeaths,
            bestStreak: playerData.bestStreak
        }

        this.activeGun = playerData.weaponIdx;
        this.selectedGun = playerData.charClass;
        this.weapons = [];

        if (this.character.primaryGun) {
            this.weapons[0] = initializePlayerGun(GunList[this.selectedGun]);
            this.weapons[1] = initializePlayerGun(GunCluck9mm);
        }

        this.grenades = 1;

        this.hp = playerData.hp;
        this.hpShield = 0;

        this.spawnShield = playerData.shield;

        this.randomSeed = 0;
    }

    /**
     * Updates the `inKotcZone` property on the player when the zone changes
     * @param activeZone The active KoTC zone
     */
    updateKotcZone(activeZone: KOTCZoneTile[]): void {
        if (activeZone) {
            const fx = Math.floor(this.position.x);
            const fy = Math.floor(this.position.y);
            const fz = Math.floor(this.position.z);

            this.inKotcZone = activeZone.some((coordSets) => coordSets.x === fx && coordSets.y === fy && coordSets.z === fz) && this.playing;
        } else this.inKotcZone = false;
    }

    /** An alias to a {@link Player}'s `position.x` */
    get x(): number { return this.position.x }
    /** An alias to a {@link Player}'s `position.y` */
    get y(): number { return this.position.y }
    /** An alias to a {@link Player}'s `position.z` */
    get z(): number { return this.position.z }
    /** An alias to a {@link Player}'s `view.yaw` */
    get yaw(): number { return this.view.yaw }
    /** An alias to a {@link Player}'s `view.pitch` */
    get pitch(): number { return this.view.pitch }
}