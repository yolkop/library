/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { PathError } from '../../pathing/Pathfinder.js';

import type { ADispatch } from '../ADispatch.js';
import type { Game } from '../../Game.js';
import type { Player } from '../../Player.js';

/** Dispatch to pathfind to the specified player. */
export class GoToPlayerDispatch implements ADispatch {
    #idOrName: number | string;

    /**
     * Creates a GoToPlayerDispatch
     * @param idOrName The ID or name of the player to pathfind to
     */
    constructor(idOrName: number | string) {
        this.#idOrName = idOrName;
    }

    #grabPlayer(game: Game): Player | undefined {
        return typeof this.#idOrName === 'number' ? game.players[this.#idOrName] :
            game.players.find(player => player && player.name === this.#idOrName.toString());
    }

    validate(game: Game): boolean {
        if (!game.colliders) return false;

        game.pathfinder.warm();

        return typeof this.#idOrName === 'string' || typeof this.#idOrName === 'number';
    }

    check(game: Game): boolean {
        if (!game.me.playing) return false;

        const target = this.#grabPlayer(game);
        return !!target && target.playing && !!target.position && Number.isFinite(target.position.x);
    }

    execute(game: Game): void {
        const target = this.#grabPlayer(game);

        if (target && target.position) game.pathfinder.goTo(target.position);
        else return game.$emit('pathError', PathError.TargetNotFound);
    }
}
