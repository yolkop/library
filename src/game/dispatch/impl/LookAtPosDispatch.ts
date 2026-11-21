/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { ADispatch } from '../ADispatch.js';
import type { Game } from '../../Game.js';
import type { Position } from '../../../util.js';

const mod = (n: number, m: number): number => ((n % m) + m) % m;

const PI2 = Math.PI * 2;

const setPrecision = (value: number): number => Math.round(value * 8192) / 8192;
const calculateYaw = (pos: Position): number => setPrecision(mod(Math.atan2(-pos.x, -pos.z), PI2));
const calculatePitch = (pos: Position): number => setPrecision(Math.atan2(pos.y, Math.hypot(pos.x, pos.z)));

/** Looks at a specific position */
export class LookAtPosDispatch implements ADispatch {
    #pos: Position;

    /**
     * Creates a LookAtPosDispatch
     * @param pos The position to look at
     */
    constructor(pos: Position) {
        this.#pos = pos;
    }

    validate(): boolean {
        return this.#pos && Number.isFinite(this.#pos.x) && Number.isFinite(this.#pos.y) && Number.isFinite(this.#pos.z);
    }

    check(game: Game): boolean {
        return game.me.playing;
    }

    execute(game: Game): void {
        const directionVector = {
            x: this.#pos.x - game.me.position.x,
            y: this.#pos.y - game.me.position.y,
            z: this.#pos.z - game.me.position.z
        };

        const yaw = calculateYaw(directionVector);
        const pitch = calculatePitch(directionVector);

        game.state.yaw = yaw;
        game.state.pitch = pitch;
    }
}