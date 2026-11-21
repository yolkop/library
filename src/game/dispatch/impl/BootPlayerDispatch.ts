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

/** (eggforcer/game owner only) Boots a player from the game */
export class BootPlayerDispatch implements ADispatch {
    #uniqueId: string;

    /**
     * Creates a BootPlayerDispatch
     * @param uniqueId The unique ID of the player to boot
     */
    constructor(uniqueId: string) {
        this.#uniqueId = uniqueId;
    }

    validate(game: Game): boolean {
        return typeof this.#uniqueId === 'string' &&
            game.isGameOwner &&
            !!game.players.find((p) => p && p.uniqueId === this.#uniqueId);
    }

    check(): boolean {
        return true;
    }

    execute(game: Game): void {
        const out = new PacketOut();
        out.packInt8(CommCode.bootPlayer);
        out.packString(this.#uniqueId);
        out.send(game.socket);
    }
}