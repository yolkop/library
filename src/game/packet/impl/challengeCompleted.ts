/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { ChallengeList, isBrowser } from '#env/DataLoader';

import type { Game } from '../../Game.js';
import type { PacketIn } from '../PacketIn.js';

export const processChallengeCompletedPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();
    const challengeId = packet.unpackInt8U();

    if (game.bot.hasHook('challengeComplete') || game.account.isChallengesWarm()) {
        const player = game.players[id];
        const challenge = ChallengeList.find(c => c.id === challengeId);
        if (player && challenge) game.$emit('challengeComplete', player, challenge);
        if (player && player.id === game.me.id && !isBrowser) game.account.challenges.refresh();
    }
}