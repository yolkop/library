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

/** Throws a grenade! */
export class ThrowGrenadeDispatch implements ADispatch {
    #power: number;

    /**
     * Creates a ThrowGrenadeDispatch
     * @param power The power of the grenade throw. Higher power means the grenade goes farther
     */
    constructor(power = 1) {
        this.#power = power;
    }

    validate(): boolean {
        return typeof this.#power === 'number' && this.#power >= 0 && this.#power <= 1;
    }

    check(game: Game): boolean {
        return game.me.playing && !game.state.reloading && !game.state.swappingGun && !game.state.usingMelee;
    }

    execute(game: Game): void {
        const out = new PacketOut();
        out.packInt8(CommCode.throwGrenade);
        out.packFloat(this.#power);
        out.send(game.socket);
    }
}