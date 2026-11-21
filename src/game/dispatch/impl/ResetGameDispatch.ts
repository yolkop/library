/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { PacketOut } from '../../packet/PacketOut.js';

import { CommCode } from '#env/DataLoader';

import { GameAction, type Game } from '../../Game.js';

import type { ADispatch } from '../ADispatch.js';

/** (game owner only) Resets the game (like if you hit the reset button in the menu) */
export class ResetGameDispatch implements ADispatch {
    validate(): boolean {
        return true;
    }

    check(game: Game): boolean {
        return game.isGameOwner;
    }

    execute(game: Game): void {
        const out = new PacketOut();
        out.packInt8(CommCode.gameAction);
        out.packInt8(GameAction.Reset);
        out.send(game.socket);
    }
}