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

/**
 * Sends a chat message ingame.
 * 
 * Chat sending has quite a few limitations. If the bot is in a private game, messages can ALWAYS be sent.
 * 
 * If the bot is in a public game, the bot's account must be aged (see isAged) or have a verified email.
 * Additionally, the account has at least 1 lifetime kill.
 * 
 * For chatting in public games, there's also a ratelimit named `chatLines`:
 * - `chatLines` starts at 0
 * - Every time you send a message, it increments by 1
 * - If it's >= 2, you can't send messages
 * - Every 33ms, `Math.max(0, chatLines - 1 / (30 * 4))` is run
 * - If you unsuccessfully send a message, it doesn't increment
 * 
 * If you need to send any messages at an interval, 3960ms is the best frequency to do so at.
*/
export class ChatDispatch implements ADispatch {
    #msg: string;

    /**
     * Creates a ChatDispatch
     * @param msg The message to send (1-64 chars)
     */
    constructor(msg: string) {
        this.#msg = msg;
    }

    validate(game: Game): boolean {
        if (typeof this.#msg !== 'string') return false;
        if (this.#msg.length < 1 || this.#msg.length > 64) return false;
        if (!game.isPrivate && !game.account.emailVerified && !game.account.isAged && !game.account.isCG) return false;

        return true;
    }

    check(game: Game): boolean {
        return game.isPrivate || game.account.adminRoles > 0 || game.state.chatLines < 2;
    }

    execute(game: Game): void {
        game.state.chatLines++;

        const out = new PacketOut();
        out.packInt8(CommCode.chat);
        out.packString(this.#msg);
        out.send(game.socket);
    }
}