/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { CollectType, GameOptions, Team } from './Game.js';
import type { GunIds, PlayerGun } from './Guns.js';
import type { Player, PlayerCharacter, PlayerSnapshot, PlayerView, ShellStreak } from './Player.js';

import type { PacketIn } from './packet/PacketIn.js';

import type { DeathCause } from './packet/impl/die.js';
import type { KOTCChanges, SpatulaChanges, TeamsChanges } from './packet/impl/metaGameState.js';
import type { PlayerSyncFrame } from './packet/impl/syncThem.js';

import type { PathError, PathPlan, PathStep } from './pathing/Pathfinder.js';

import type { ObjectDiff, Position } from '../util.js';

import type { Challenge } from '../types/Challenge.js';

/** Different errors in the playerZoneLeave hook (see {@link GameEvents}) */
export enum ZoneLeaveReason {
    /** The player on the zone despawned */
    Despawned = 'despawned',
    /** The player on the zone was killed */
    Killed = 'killed',
    /** The player walked off the zone */
    WalkedOut = 'exited',
    /** The round ended, so the zone disappeared */
    RoundEnded = 'round_ended'
}

/** A bullet that gets fired in the `playerFire` hook (see {@link GameEvents}) */
export interface FiredBullet {
    posX: number;
    posY: number;
    posZ: number;
    dirX: number;
    dirY: number;
    dirZ: number;
}

/** Possible flag values for the chat hook (see {@link GameEvents}) */
export enum ChatFlag {
    /** The message has no flags */
    None = 0,
    /** The message is pinned to chat */
    Pinned = 2,
    /** The message is visible to only the team. Be careful when writing chat broadcasters, as they may share team messages without knowledge! */
    Team = 4,
    /** The message is from an Eggforcer */
    FromMod = 254,
    /** The message is from a game employee */
    FromServer = 255
}

/** The ingame events that can be listened to from {@link Bot.on} */
export interface GameEvents {
    /** Called when the {@link Bot}'s balance changes (getting a kill or KoTC win) */
    'balanceUpdate': [oldBalance: number, newBalance: number];
    /** Called when the {@link Bot} joins the game and {@link Bot.me} can be used */
    'botJoin': [botPlayer: Player];
    /** Called when a challenge the {@link Bot} has is completed while playing */
    'challengeComplete': [player: Player, challenge: Challenge];
    /**
     * Called when a player other than the bot sends a chat message
     * 
     * `player` is sometimes undefined because of MOD and SERVER messages. if player is undefined, `flags` will either be 255 (for server) or 254 (for mod).
    */
    'chat': [player: Player | undefined, message: string, flags: ChatFlag];
    /** Called every 33ms, when the client ticks and things like pathfinding, health, etc are updated */
    'clientTick': [];
    /** Called when the connection to the game server closes */
    'close': [closeCode: number];
    /** Called when the game host forcibly pauses the game (i.e. through reset) */
    'gameForcePause': [];
    /** Called when the game object has initialized, and `emit`/`dispatch` may be used */
    'gameInit': [];
    /** Called when a private game is joined, or when the options of a private game change */
    'gameOptionsChange': [oldOptions: GameOptions, newOptions: GameOptions];
    /** Called when {@link Bot.game} has all of its data and is ready to use */
    'gameReady': [];
    /** Called when the game host resets the game */
    'gameReset': [];
    /** Called when the game's "state" changes. In Teams this is the "team score", in Spatula this is the spatula data (scores, spatula coords, etc), in KoTC this is anything involving the coop */
    'gameStateChange': [changes: ObjectDiff<TeamsChanges> | ObjectDiff<SpatulaChanges> | ObjectDiff<KOTCChanges>];
    /** Called when a grenade explodes */
    'grenadeExplode': [item: number, pos: Position, damage: number, radius: number];
    /** Called when the bot reaches the destination of its current route */
    'pathComplete': [];
    /** Called when the bot gives up on its current route */
    'pathError': [error: PathError];
    /** Called every time the bot plans or re-plans a route. Attaching this is all it costs - nothing is computed unless something is listening */
    'pathPlan': [plan: PathPlan];
    /** Called every tick the bot is walking a route, with exactly what it decided and why. Intended for debugging navigation; it fires 30 times a second */
    'pathStep': [step: PathStep];
    /** Called when any packet is sent */
    'packet': [packet: Uint8Array<ArrayBuffer>, freshPacket: PacketIn];
    /** Called when the bot's ping updates */
    'pingUpdate': [oldPing: number, newPing: number];
    /** Called when a player's "character/loadout" changes (hats, stamps, gun skins, etc) */
    'playerChangeCharacter': [player: Player, oldCharacter: PlayerCharacter, newCharacter: PlayerCharacter];
    /** Called when a player changes their selected gun */
    'playerChangeGun': [player: Player, oldGunId: GunIds, newGunId: GunIds];
    /** Called when a player collects an ammo pack that was dropped on the map */
    'playerCollectAmmo': [player: Player, weapon: PlayerGun, itemId: number];
    /** Called when a player collects a grenade that was dropped on the map */
    'playerCollectGrenade': [player: Player, itemId: number];
    /** Called when a player takes damage */
    'playerDamage': [player: Player, oldHp: number, newHp: number];
    /** Called when a player dies */
    'playerDeath': [killed: Player, killer: Player, killedSnapshot: PlayerSnapshot, deathCause: DeathCause];
    /** Called when a player fires their weapon */
    'playerFire': [player: Player, weapon: PlayerGun, bullet: FiredBullet];
    /** Called when the player joins the game; also called for every player in the game when the game is joined */
    'playerJoin': [player: Player];
    /** Called when an admin requests data from the admin panel about a player */
    'playerInfo': [player: Player, playerIP: string, playerDBId: string];
    /** Called when a player leaves the game */
    'playerLeave': [player: Player];
    /** Called when a player melees */
    'playerMelee': [player: Player];
    /** Called when a player moves (X/Y/Z position only) every 100ms (aligns with {@link GameEvents.playerRotate}) */
    'playerMove': [player: Player, oldPosition: Position, newPosition: Position];
    /** Called when a player pauses the game (like the esc key) */
    'playerPause': [player: Player];
    /** Called when a player's gun finishes reloading */
    'playerReloadEnd': [player: Player, weapon: PlayerGun];
    /** Called when a player starts reloading their gun */
    'playerReloadStart': [player: Player, weapon: PlayerGun];
    /** Called when a player respawns */
    'playerRespawn': [player: Player];
    /** Called when a player's view rotates (yaw/pitch only) every 100ms (aligns with {@link GameEvents.playerMove}) */
    'playerRotate': [player: Player, oldView: PlayerView, newView: PlayerView];
    /** Called when a player ends a {@link ShellStreak} */
    'playerStreakEnd': [player: Player, streakType: ShellStreak];
    /** Called when a player begins a {@link ShellStreak} */
    'playerStreakStart': [player: Player, streakType: ShellStreak];
    /** Called when a player swaps their primary/secondary weapon */
    'playerSwapWeapon': [player: Player, nowActive: number];
    /** Called when a player switches their {@link Team} */
    'playerSwitchTeam': [player: Player, oldTeam: Team, newTeam: Team];
    /** Called when a player has their view (yaw/pitch) synced with the server. */
    'playerSync': [player: Player, state: PlayerSyncFrame[]];
    /** Called when a player throws a grenade */
    'playerThrowGrenade': [player: Player, position: Position, dPosition: Position];
    /** Called when a player enters the KoTC zone */
    'playerZoneEnter': [player: Player];
    /** Called when a player leaves the KoTC zone */
    'playerZoneLeave': [player: Player, leaveReason: ZoneLeaveReason];
    /** Called when the game is removed from the public play button rotation. This is ONLY emitted for public games and happens 1-2 hours after public games are "created" */
    'publicGameHidden': [];
    /** Shouldn't ever be called, but indicates that respawn has been blocked (for some reason) */
    'respawnDenied': [];
    /** Called when a rocket (from an RPEGG) explodes on the map */
    'rocketHit': [pos: Position, damage: number, blastRadius: number];
    /** Called when a the shield {@link ShellStreak} takes damage */
    'selfShieldHit': [newShieldHealth: number, newPlayerHealth: number, dir: { dx: number, dz: number }];
    /** Called when a the shield {@link ShellStreak} disappears (due to too much damage) */
    'selfShieldLost': [newPlayerHealth: number, dir: { dx: number, dz: number }];
    /** Called when the server ticks (every 100ms), updates info about other players like position and syncs your movement */
    'serverTick': [];
    /** Called when an item collectible (ammo/grenade) spawns on the map */
    'spawnItem': [itemType: CollectType, itemPosition: Position, itemId: number];
}
