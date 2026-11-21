/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { Movement } from '../../pathing/physics.js';

import type { ADispatch } from '../ADispatch.js';
import type { Game } from '../../Game.js';

/** Moves the bot */
export class MovementDispatch implements ADispatch {
    #inputKeys: number;

    /**
     * Creates a MovementDispatch
     * @param inputKeys The input keys to move the bot. Can be a bitfield or an array of Movement enums.
     */
    constructor(inputKeys: number | Movement[]) {
        if (typeof inputKeys === 'number') this.#inputKeys = inputKeys;
        else if (Array.isArray(inputKeys)) this.#inputKeys = inputKeys.reduce((a, b) => a | b, 0);
        else this.#inputKeys = 0;
    }

    validate(): boolean {
        if (typeof this.#inputKeys !== 'number') return false;

        if (this.#inputKeys & Movement.Forward && this.#inputKeys & Movement.Backward) return false;
        if (this.#inputKeys & Movement.Left && this.#inputKeys & Movement.Right) return false;

        return true;
    }

    check(game: Game): boolean {
        return game.me.playing;
    }

    execute(game: Game): void {
        game.state.controlKeys = this.#inputKeys;
    }
}