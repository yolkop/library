/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { Player } from '../../Player.js';

import { KOTCGame } from '../../modes/KOTCGame.js';

import type { Game } from '../../Game.js';
import type { GunIds } from '../../Guns.js';
import type { PacketIn } from '../PacketIn.js';

export const processAddPlayerPacket = (game: Game, packet: PacketIn): void => {
    const id = packet.unpackInt8U();

    const playerData = {
        id,
        uniqueId: packet.unpackString(),
        name: packet.unpackString(),
        safeName: packet.unpackString(),
        charClass: packet.unpackInt8U() as GunIds,
        team: packet.unpackInt8U(),
        primaryWeaponItem: packet.unpackInt16U(),
        secondaryWeaponItem: packet.unpackInt16U(),
        shellColor: packet.unpackInt8U(),
        hatItem: packet.unpackInt16U(),
        stampItem: packet.unpackInt16U(),
        stampPosX: packet.unpackInt8(),
        stampPosY: packet.unpackInt8(),
        grenadeItem: packet.unpackInt16U(),
        meleeItem: packet.unpackInt16U(),
        x: packet.unpackFloat(),
        y: packet.unpackFloat(),
        z: packet.unpackFloat(),
        dx: packet.unpackFloat(), // unused
        dy: packet.unpackFloat(), // unused
        dz: packet.unpackFloat(), // unused
        yaw: packet.unpackRadU(),
        pitch: packet.unpackRad(),
        score: packet.unpackInt32U(),
        // the following are all stats
        kills: packet.unpackInt16U(), // unused
        deaths: packet.unpackInt16U(), // unused
        streak: packet.unpackInt16U(), // unused
        totalKills: packet.unpackInt32U(),
        totalDeaths: packet.unpackInt32U(),
        bestStreak: packet.unpackInt16U(),
        bestOverallStreak: packet.unpackInt16U(), // unused
        // end stats
        shield: packet.unpackInt8U(),
        hp: packet.unpackInt8U(),
        playing: !!packet.unpackInt8U(),
        weaponIdx: packet.unpackInt8U(),
        controlKeys: packet.unpackInt8U(),
        upgradeProductId: packet.unpackInt8U(),
        activeShellStreaks: packet.unpackInt8U(),
        social: packet.unpackLongString(),
        hideBadge: !!packet.unpackInt8U()
    };

    game.map.index = packet.unpackInt8U();
    game.isPrivate = packet.unpackInt8U() === 1;
    game.mode = packet.unpackInt8U();

    const player = new Player(playerData, game instanceof KOTCGame ? game.activeZone : null);
    game.players[playerData.id] ??= player;

    game.$emit('playerJoin', player);

    if (game.myId === playerData.id) game.$emit('botJoin', game.me);
}