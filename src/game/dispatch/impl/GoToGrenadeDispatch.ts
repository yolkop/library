/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { CollectType, type Game } from '../../Game.js';
import { PathError } from '../../pathing/Pathfinder.js';

import type { ADispatch } from '../ADispatch.js';

/** Dispatch to pathfind to the closest grenade collectible. */
export class GoToGrenadeDispatch implements ADispatch {
    validate(game: Game): boolean {
        if (!game.colliders) return false;

        game.pathfinder.warm();

        return true;
    }

    check(game: Game): boolean {
        return game.me.playing && !!game.collectibles[CollectType.Grenade].length;
    }

    execute(game: Game): void {
        let minDistance = 2000;
        let closestGrenade = null;

        for (const grenade of game.collectibles[CollectType.Grenade]) {
            const dx = grenade.x - game.me.position.x;
            const dy = grenade.y - game.me.position.y;
            const dz = grenade.z - game.me.position.z;

            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < minDistance) {
                minDistance = distance;
                closestGrenade = grenade;
            }
        }

        if (closestGrenade) game.pathfinder.goTo(closestGrenade);
        else return game.$emit('pathError', PathError.TargetNotFound);
    }
}