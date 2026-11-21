/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { Game } from '../Game.js';

/** A generic dispatch shape. You can use `class CustomDispatch implements ADispatch` to create your own type-safe dispatches. */
export interface ADispatch {
    /** Validates initial data, usually from the constructor or are game-related. For example, if the user passes a number in the constructor that's too big or the user needs game ownership (but isn't), this would return false. */
    validate(bot: Game): boolean;
    /** Checks if the dispatch can run at that specific second. This should eventually result true under some conditions so that the dispatch isn't postponed forever. This function runs with the game update loop every 33ms. If it returns true, `execute` runs immediately. */
    check(bot: Game): boolean;
    /** Executes the main dispatch logic. This happens once and does not output any success/failure, as any checks must run inside of `check`. */
    execute(bot: Game): void;
}