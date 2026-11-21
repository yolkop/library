/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { Game, GameMode } from '../Game.js';

/** An FFA game */
export class FFAGame extends Game {
    /** The game mode (FFA) */
    mode = GameMode.FFA as const;
}