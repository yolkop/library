/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { GameMode, type Game } from '../../Game.js';
import { SpatulaGame } from '../../modes/SpatulaGame.js';
import { PathError } from '../../pathing/Pathfinder.js';

import type { ADispatch } from '../ADispatch.js';

/** Dispatch to pathfind to the spatula (in CTS games). */
export class GoToSpatulaDispatch implements ADispatch {
    validate(game: Game): boolean {
        if (!game.colliders) return false;

        game.pathfinder.warm();

        return game instanceof SpatulaGame && game.mode === GameMode.Spatula;
    }

    check(game: Game): boolean {
        return game instanceof SpatulaGame && game.me.playing && Number.isFinite(game.spatula.x);
    }

    execute(game: Game): void {
        if (game instanceof SpatulaGame) game.pathfinder.goTo(game.spatula);
        else return game.$emit('pathError', PathError.TargetNotFound);
    }
}
