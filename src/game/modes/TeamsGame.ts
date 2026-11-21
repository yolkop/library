/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { Game, GameMode } from '../Game.js';

/** A teams game */
export class TeamsGame extends Game {
    /** The game mode (teams) */
    mode = GameMode.Team as const;

    /** The team "score" (used to determine who's higher on the leaderboard), with each index representing the {@link Team} enum value */
    teamScore: number[] = [0, 0, 0];
}