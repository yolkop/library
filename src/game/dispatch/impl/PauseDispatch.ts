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

/** Pauses the game (like if you hit esc ingame) */
export class PauseDispatch implements ADispatch {
    validate(): boolean {
        return true;
    }

    check(game: Game): boolean {
        return game.me.playing;
    }

    execute(game: Game): void {
        const out = new PacketOut();
        out.packInt8(CommCode.pause);
        out.send(game.socket);

        setTimeout(() => game.me.playing = false, 3000);
    }
}