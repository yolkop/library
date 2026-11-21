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

/** Reloads the active weapon */
export class ReloadDispatch implements ADispatch {
    validate(): boolean {
        return true;
    }

    check(game: Game): boolean {
        return game.me.playing &&
            !game.state.reloading &&
            !game.state.swappingGun &&
            !game.state.usingMelee &&
            game.me.weapons[game.me.activeGun].ammo?.rounds < game.me.weapons[game.me.activeGun].ammo?.capacity &&
            game.me.weapons[game.me.activeGun].ammo?.store > 0;
    }

    execute(game: Game): void {
        const out = new PacketOut();
        out.packInt8(CommCode.reload);
        out.send(game.socket);

        const playerActiveWeapon = game.me.weapons[game.me.activeGun];
        const isEmpty = playerActiveWeapon.ammo.rounds < 1;

        game.$emit('playerReloadStart', game.me, playerActiveWeapon);
        game.state.reloading = true;

        setTimeout(() => {
            if (!game.me) return;

            game.state.reloading = false;

            const latestWeapon = game.me.weapons[game.me.activeGun];

            if (latestWeapon.ammo) {
                const maxLoad = Math.min(latestWeapon.ammo.capacity, latestWeapon.ammo.reload);
                const needed = Math.max(0, maxLoad - latestWeapon.ammo.rounds);
                const newRounds = Math.min(needed, latestWeapon.ammo.store);

                latestWeapon.ammo.rounds += newRounds;
                latestWeapon.ammo.store -= newRounds;
            }

            game.bot.$emit('playerReloadEnd', game.me, latestWeapon);
        }, isEmpty ? playerActiveWeapon.longReloadTime : playerActiveWeapon.shortReloadTime);
    }
}