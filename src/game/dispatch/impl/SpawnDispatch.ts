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

/** Spawns the bot into the game */
export class SpawnDispatch implements ADispatch {
    #doFaster: boolean;

    /**
     * Creates a SpawnDispatch
     * @param doFaster Whether to respawn a second faster (5 instead of the ingame 6)
     */
    constructor(doFaster = true) {
        this.#doFaster = doFaster;
    }

    validate(): boolean {
        return true;
    }

    check(game: Game): boolean {
        const respawnTime = this.#doFaster ? 5000 : 6000;

        if (game.me.playing) return false;
        if (game.isObserving) return false;
        if (game.lastDeathTime > 0 && (game.lastDeathTime + respawnTime) > Date.now()) return false;

        return true;
    }

    execute(game: Game): void {
        const out = new PacketOut();
        out.packInt8(CommCode.requestRespawn);
        out.send(game.socket);

        game.state.buffer = [];
    }
}