/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { ADispatch } from '../ADispatch.js';
import type { Game } from '../../Game.js';

/** Fires the active weapon */
export class FireDispatch implements ADispatch {
    #amount: number;

    /**
     * Creates a FireDispatch
     * @param amount The amount of shots to fire (defaults to 1)
     */
    constructor(amount: number) {
        this.#amount = amount || 1;
    }

    validate(): boolean {
        return this.#amount >= 1;
    }

    check(game: Game): boolean {
        return game.me.playing &&
            !game.state.reloading &&
            !game.state.swappingGun &&
            !game.state.usingMelee &&
            game.me.weapons[game.me.activeGun].ammo.rounds >= this.#amount;
    }

    execute(game: Game): void {
        game.state.shotsFired += this.#amount || 1;
    }
}