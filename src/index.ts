/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

console.log('');
console.log('   > yolkbot {VERSION} by 1ust');
console.log('   > compiled on {COMPTIME}');
console.log('');

/** Information about the current yolkbot version */
export const yolkbot = {
    /** The current yolkbot version (format "major.minor") */
    version: '{VERSION}',
    /** The current yolkbot version compile time */
    compTime: '{COMPTIME}'
};

export * from './Bot.js';

export * from './account/Account.js';
export * from './account/Challenges.js';
export * from './account/ChicknWinner.js';
export * from './account/Gifts.js';
export * from './account/Shop.js';

export * from './game/packet/PacketIn.js';
export * from './game/packet/PacketOut.js';

export type { DispatchIndex, DispatchParams } from './game/dispatch/index.js';
export type { ADispatch } from './game/dispatch/ADispatch.js';

export * from './game/dispatch/impl/BanPlayerDispatch.js';
export * from './game/dispatch/impl/BootPlayerDispatch.js';
export * from './game/dispatch/impl/ChatDispatch.js';
export * from './game/dispatch/impl/FireDispatch.js';
export * from './game/dispatch/impl/GameOptionsDispatch.js';
export * from './game/dispatch/impl/GoToAmmoDispatch.js';
export * from './game/dispatch/impl/GoToCoopDispatch.js';
export * from './game/dispatch/impl/GoToGrenadeDispatch.js';
export * from './game/dispatch/impl/GoToPlayerDispatch.js';
export * from './game/dispatch/impl/GoToSpatulaDispatch.js';
export * from './game/dispatch/impl/LookAtDispatch.js';
export * from './game/dispatch/impl/LookAtPosDispatch.js';
export * from './game/dispatch/impl/MeleeDispatch.js';
export * from './game/dispatch/impl/MovementDispatch.js';
export * from './game/dispatch/impl/PauseDispatch.js';
export * from './game/dispatch/impl/ReloadDispatch.js';
export * from './game/dispatch/impl/ReportPlayerDispatch.js';
export * from './game/dispatch/impl/ResetGameDispatch.js';
export * from './game/dispatch/impl/SaveLoadoutDispatch.js';
export * from './game/dispatch/impl/SpawnDispatch.js';
export * from './game/dispatch/impl/SwapWeaponDispatch.js';
export * from './game/dispatch/impl/SwitchTeamDispatch.js';
export * from './game/dispatch/impl/ThrowGrenadeDispatch.js';

export * from '#env/createWebSocket';
export * from '#env/DataLoader';
export * from '#env/fetch';
export * from '#env/loadMap';
export * from '#env/processJS';
export * from '#env/validate';

export type * from './env/createWebSocket.js';

export * from './game/Game.js';
export * from './game/Guns.js';
export * from './game/Hooks.js';
export * from './game/Player.js';

export * from './game/modes/FFAGame.js';
export * from './game/modes/TeamsGame.js';
export * from './game/modes/SpatulaGame.js';
export * from './game/modes/KOTCGame.js';

export * from './game/pathing/ColliderSet.js';
export * from './game/pathing/Pathfinder.js';
export * from './game/pathing/PathGraph.js';
export { Movement } from './game/pathing/physics.js';
export type * from './game/pathing/math.js';

export type { DeathCause } from './game/packet/impl/die.js';
export type { TeamsChanges, SpatulaChanges, KOTCChanges } from './game/packet/impl/metaGameState.js';
export type { PlayerSyncFrame } from './game/packet/impl/syncThem.js';

export * from './game/Simulator.js';

export * from './types/Challenge.js';
export * from './types/Item.js';
export type * from './types/Map.js';

export * from './Firebase.js';
export type { ErrorEnum, ObjectDiff, Position, ShapeObject } from './util.js';