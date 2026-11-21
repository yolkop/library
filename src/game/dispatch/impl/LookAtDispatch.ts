/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { ADispatch } from '../ADispatch.js';
import type { Game } from '../../Game.js';
import type { Player } from '../../Player.js';
import type { Position } from '../../../util.js';

const mod = (n: number, m: number): number => ((n % m) + m) % m;

const PI2 = Math.PI * 2;

const setPrecision = (value: number): number => Math.round(value * 8192) / 8192;
const calculateYaw = (pos: Position): number => setPrecision(mod(Math.atan2(-pos.x, -pos.z), PI2));
const calculatePitch = (pos: Position): number => setPrecision(Math.atan2(pos.y, Math.hypot(pos.x, pos.z)));

/** Looks at a specific player */
export class LookAtDispatch implements ADispatch {
    #idOrName: number | string;

    /**
     * Creates a LookAtDispatch
     * @param idOrName The ID or name of the player to look at
     */
    constructor(idOrName: number | string) {
        this.#idOrName = idOrName;
    }

    #grabPlayer(game: Game): Player | undefined {
        return typeof this.#idOrName === 'number' ? game.players[this.#idOrName] :
            game.players.find(player => player && player.name === this.#idOrName.toString());
    }

    validate(): boolean {
        return typeof this.#idOrName === 'string' || typeof this.#idOrName === 'number';
    }

    check(game: Game): boolean {
        if (!game.me.playing) return false;

        const target = this.#grabPlayer(game);
        return !!(target && target.playing && target.position && Number.isFinite(target.position.x));
    }

    execute(game: Game): void {
        const target = this.#grabPlayer(game);
        if (!target || !target.position) return;

        const directionVector = {
            x: target.position.x - game.me.position.x,
            y: target.position.y - game.me.position.y - 0.05,
            z: target.position.z - game.me.position.z
        };

        const yaw = calculateYaw(directionVector);
        const pitch = calculatePitch(directionVector);

        game.state.yaw = yaw;
        game.state.pitch = pitch;
    }
}