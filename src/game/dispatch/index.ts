/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

// MAINTAINER NOTE: also update the main index.ts for the `export *` statements

import { BanPlayerDispatch } from './impl/BanPlayerDispatch.js';
import { BootPlayerDispatch } from './impl/BootPlayerDispatch.js';
import { ChatDispatch } from './impl/ChatDispatch.js';
import { FireDispatch } from './impl/FireDispatch.js';
import { GameOptionsDispatch } from './impl/GameOptionsDispatch.js';
import { GoToAmmoDispatch } from './impl/GoToAmmoDispatch.js';
import { GoToCoopDispatch } from './impl/GoToCoopDispatch.js';
import { GoToGrenadeDispatch } from './impl/GoToGrenadeDispatch.js';
import { GoToPlayerDispatch } from './impl/GoToPlayerDispatch.js';
import { GoToSpatulaDispatch } from './impl/GoToSpatulaDispatch.js';
import { LookAtDispatch } from './impl/LookAtDispatch.js';
import { LookAtPosDispatch } from './impl/LookAtPosDispatch.js';
import { MeleeDispatch } from './impl/MeleeDispatch.js';
import { MovementDispatch } from './impl/MovementDispatch.js';
import { PauseDispatch } from './impl/PauseDispatch.js';
import { ReloadDispatch } from './impl/ReloadDispatch.js';
import { ReportPlayerDispatch } from './impl/ReportPlayerDispatch.js';
import { ResetGameDispatch } from './impl/ResetGameDispatch.js';
import { SaveLoadoutDispatch } from './impl/SaveLoadoutDispatch.js';
import { SpawnDispatch } from './impl/SpawnDispatch.js';
import { SwapWeaponDispatch } from './impl/SwapWeaponDispatch.js';
import { SwitchTeamDispatch } from './impl/SwitchTeamDispatch.js';
import { ThrowGrenadeDispatch } from './impl/ThrowGrenadeDispatch.js';

/** All of the available dispatches, used as a mapping for {@link Bot.emit}. You may add items to here to add them to {@link Bot.emit} */
export const DispatchIndex = {
    /** The {@link BanPlayerDispatch} */
    'banPlayer': BanPlayerDispatch,
    /** The {@link BootPlayerDispatch} */
    'bootPlayer': BootPlayerDispatch,
    /** The {@link ChatDispatch} */
    'chat': ChatDispatch,
    /** The {@link FireDispatch} */
    'fire': FireDispatch,
    /** The {@link GameOptionsDispatch} */
    'gameOptions': GameOptionsDispatch,
    /** The {@link GoToAmmoDispatch} */
    'goToAmmo': GoToAmmoDispatch,
    /** The {@link GoToCoopDispatch} */
    'goToCoop': GoToCoopDispatch,
    /** The {@link GoToGrenadeDispatch} */
    'goToGrenade': GoToGrenadeDispatch,
    /** The {@link GoToPlayerDispatch} */
    'goToPlayer': GoToPlayerDispatch,
    /** The {@link GoToSpatulaDispatch} */
    'goToSpatula': GoToSpatulaDispatch,
    /** The {@link LookAtDispatch} */
    'lookAt': LookAtDispatch,
    /** The {@link LookAtPosDispatch} */
    'lookAtPos': LookAtPosDispatch,
    /** The {@link MeleeDispatch} */
    'melee': MeleeDispatch,
    /** The {@link MovementDispatch} */
    'move': MovementDispatch,
    /** The {@link PauseDispatch} */
    'pause': PauseDispatch,
    /** The {@link ReloadDispatch} */
    'reload': ReloadDispatch,
    /** The {@link ReportPlayerDispatch} */
    'reportPlayer': ReportPlayerDispatch,
    /** The {@link ResetGameDispatch} */
    'resetGame': ResetGameDispatch,
    /** The {@link SaveLoadoutDispatch} */
    'saveLoadout': SaveLoadoutDispatch,
    /** The {@link SpawnDispatch} */
    'spawn': SpawnDispatch,
    /** The {@link SwapWeaponDispatch} */
    'swapWeapon': SwapWeaponDispatch,
    /** The {@link SwitchTeamDispatch} */
    'switchTeam': SwitchTeamDispatch,
    /** The {@link ThrowGrenadeDispatch} */
    'throwGrenade': ThrowGrenadeDispatch
} as const;

/** @hidden */
export type DispatchKeys = keyof typeof DispatchIndex;

/** @hidden */
export type DispatchParams = {
    [K in keyof typeof DispatchIndex]: ConstructorParameters<typeof DispatchIndex[K]>
}