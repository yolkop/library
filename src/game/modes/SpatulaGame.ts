/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { Game, GameMode, Team } from '../Game.js';

/** A CTS (capture the spatula) game */
export class SpatulaGame extends Game {
    /** The game mode (spatula) */
    mode = GameMode.Spatula as const;

    /** The team "score" (the blue/red eggs at the top center of the game), with each index representing the {@link Team} enum value */
    teamScore: number[] = [0, 0, 0];

    /** The spatula coordinates */
    spatula = {
        x: 0,
        y: 0,
        z: 0
    }

    /** The ID of the {@link Player} holding the spatula */
    playerHoldingSpatula = 0;
    /** The team of the {@link Player} holding the spatula */
    teamHoldingSpatula: Team = Team.None;
}