/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { PacketOut } from '../../packet/PacketOut.js';

import { CommCode } from '#env/DataLoader';

import { GunEquipTime } from '../../Guns.js';

import type { ADispatch } from '../ADispatch.js';
import type { Game } from '../../Game.js';

/** Swings the bot's melee! */
export class MeleeDispatch implements ADispatch {
    validate(): boolean {
        return true;
    }

    check(game: Game): boolean {
        return game.me.playing && !game.state.reloading && !game.state.swappingGun && !game.state.usingMelee;
    }

    execute(game: Game): void {
        const out = new PacketOut();
        out.packInt8(CommCode.melee);
        out.send(game.socket);

        game.state.usingMelee = true;

        // gameloop every 33.33 (repeating) ms, 17 ticks
        setTimeout(() => {
            game.state.usingMelee = false
            game.state.swappingGun = true

            setTimeout(() => {
                game.state.swappingGun = false
            }, 0.5 * GunEquipTime)
        }, (100 / 3) * 17);
    }
}