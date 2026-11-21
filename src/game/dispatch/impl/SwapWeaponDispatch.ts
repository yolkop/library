/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { PacketOut } from '../../packet/PacketOut.js';

import { CommCode } from '#env/DataLoader';

import type { ADispatch } from '../ADispatch.js';
import type { Game } from '../../Game.js';

/** Swaps the bot's weapon (primary/secondary) */
export class SwapWeaponDispatch implements ADispatch {
    #manualWeapon: number | undefined;

    /**
     * Creates a SwapWeaponDispatch
     * @param manualWeapon Optional; allows you to specify to (defaults to the other one)
     */
    constructor(manualWeapon?: number) {
        this.#manualWeapon = manualWeapon;
    }

    validate(): boolean {
        return typeof this.#manualWeapon === 'number' || typeof this.#manualWeapon === 'undefined';
    }

    check(game: Game): boolean {
        return game.me.playing && !game.state.reloading && !game.state.swappingGun && !game.state.usingMelee;
    }

    execute(game: Game): void {
        let chosenWeapon = +!game.me.activeGun;
        if (typeof this.#manualWeapon === 'number') chosenWeapon = this.#manualWeapon;

        game.me.activeGun = chosenWeapon;

        const out = new PacketOut();
        out.packInt8(CommCode.swapWeapon);
        out.packInt8(game.me.activeGun);
        out.send(game.socket);
    }
}