/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { PacketOut } from '../../packet/PacketOut.js';

import { CommCode } from '#env/DataLoader';

import { type GunIds, GunList } from '../../Guns.js';

import { ItemType } from '../../../types/Item.js';

import { initializePlayerGun } from '../../../util.js';

import type { ADispatch } from '../ADispatch.js';
import type { Game } from '../../Game.js';
import type { ShellColor } from '../../Player.js';

const defaultItems = [1001, 1002, 1003, 1004, 1005, 1006, 1497, 1498, 1499, 2001, 2002, 2003, 2004, 2005, 2006, 2264, 2512, 2513, 2514, 3000, 3100, 3400, 3600, 3800, 4000, 4200, 4500, 15000, 15002, 16000];

const typeRanges = {
    [ItemType.Hat]: [1001, 1999],
    [ItemType.Stamp]: [2000, 2999],
    [ItemType.Secondary]: [3000, 3099],
    [ItemType.Primary]: [3100, 14999],
    [ItemType.Melee]: [15000, 15999],
    [ItemType.Grenade]: [16000, 16383]
}

const isType = (id: number, type: ItemType): boolean => {
    const range = typeRanges[type];
    return id >= range[0] && id <= range[1];
}

/** The options for {@link SaveLoadoutDispatch} */
export interface SaveLoadoutOptions {
    /** The gun ID the player should equip */
    gunId?: GunIds;
    /** The hat ID the player should equip */
    hatId?: number;
    /** The stamp ID the player should equip */
    stampId?: number;
    /** The grenade ID the player should equip */
    grenadeId?: number;
    /** The melee ID the player should equip */
    meleeId?: number;
    /** The egg color the player should equip */
    eggColor?: ShellColor;
    /** The primary IDs the player should equip, indexed by gun ID */
    primaryIds?: number[];
    /** The secondary IDs the player should equip, indexed by associated gun ID */
    secondaryIds?: number[];
}

interface SaveLoadoutChanges {
    classIdx?: GunIds;
    hatId?: number;
    stampId?: number;
    grenadeId?: number;
    meleeId?: number;
    colorIdx?: ShellColor;
    primaryId?: number[];
    secondaryId?: number[];
}

/** Saves the skin/hat/gun set of the bot's account */
export class SaveLoadoutDispatch implements ADispatch {
    #changes: SaveLoadoutChanges;
    #skipItemValidation: boolean;

    /**
     * Creates a SaveLoadoutDispatch
     * @param opts The options for the loadout changes you want to make. You can omit any parameters you don't want to change.
     * @param skipItemValidation If true, the dispatch will skip all item existence/ownership validation.
     */
    constructor(opts: SaveLoadoutOptions, skipItemValidation = false) {
        this.#changes = {
            classIdx: opts.gunId,
            hatId: opts.hatId,
            stampId: opts.stampId,
            grenadeId: opts.grenadeId,
            meleeId: opts.meleeId,
            colorIdx: opts.eggColor,
            primaryId: opts.primaryIds,
            secondaryId: opts.secondaryIds
        };

        // filter out undefined
        this.#changes = Object.fromEntries(
            Object.entries(this.#changes).filter(([, v]) => typeof v !== 'undefined')
        );

        this.#skipItemValidation = skipItemValidation;
    }

    validate(game: Game): boolean {
        const load = this.#changes;

        if (!this.#skipItemValidation) {
            if (load.colorIdx && load.colorIdx >= 7 && !game.account.vip) return false; // trying to use VIP color
            if (load.colorIdx && load.colorIdx >= 14) return false; // trying to use color that doesn't exist

            // validate that you own all of the items you're trying to use
            if (load.hatId && isType(load.hatId, ItemType.Hat) && !defaultItems.includes(load.hatId) && !game.account.ownedItemIds.includes(load.hatId)) return false;
            if (load.stampId && isType(load.stampId, ItemType.Stamp) && !defaultItems.includes(load.stampId) && !game.account.ownedItemIds.includes(load.stampId)) return false;
            if (load.grenadeId && isType(load.grenadeId, ItemType.Grenade) && !defaultItems.includes(load.grenadeId) && !game.account.ownedItemIds.includes(load.grenadeId)) return false;
            if (load.meleeId && isType(load.meleeId, ItemType.Melee) && !defaultItems.includes(load.meleeId) && !game.account.ownedItemIds.includes(load.meleeId)) return false;

            // invalid classidx param
            if (typeof load.classIdx === 'number' && (load.classIdx > 6 || load.classIdx < 0)) return false;

            // validate that you own the primary guns you're trying to use
            if (this.#changes.primaryId) {
                for (let i = 0; i < 7; i++) {
                    const testingId = this.#changes.primaryId[i];

                    if (!isType(testingId, ItemType.Primary) || (!defaultItems.includes(testingId) && !game.account.ownedItemIds.includes(testingId)))
                        return false;
                }
            }

            // validate that you own the secondary guns you're trying to use
            if (this.#changes.secondaryId) {
                for (let i = 0; i < 7; i++) {
                    const testingId = this.#changes.secondaryId[i];

                    if (!isType(testingId, ItemType.Secondary) || (!defaultItems.includes(testingId) && !game.account.ownedItemIds.includes(testingId)))
                        return false;
                }
            }
        }

        return true;
    }

    check(game: Game): boolean {
        return !game.me.playing;
    }

    async execute(game: Game): Promise<void> {
        if (game.me && typeof this.#changes.classIdx !== 'undefined' && this.#changes.classIdx !== game.me.selectedGun)
            game.me.weapons[0] = initializePlayerGun(GunList[this.#changes.classIdx]);

        const loadout = {
            ...game.account.loadout,
            ...this.#changes
        }

        const saveLoadout = game.account.queryServices({
            cmd: 'saveLoadout',
            save: true,
            firebaseId: game.account.firebaseId,
            sessionId: game.account.sessionId,
            loadout
        });

        game.account.loadout = loadout;

        if (game.me) {
            await saveLoadout;

            const out = new PacketOut();
            out.packInt8(CommCode.changeCharacter);
            out.packInt8(this.#changes?.classIdx ?? game.me.selectedGun);
            out.send(game.socket);

            if (this.#changes.classIdx) game.me.selectedGun = this.#changes.classIdx;
            if (this.#changes.hatId) game.me.character.hat = this.#changes.hatId;
            if (this.#changes.stampId) game.me.character.stamp = this.#changes.stampId;
            if (this.#changes.grenadeId) game.me.character.grenade = this.#changes.grenadeId;
            if (this.#changes.meleeId) game.me.character.melee = this.#changes.meleeId;
            if (this.#changes.colorIdx) game.me.character.eggColor = this.#changes.colorIdx;
            if (this.#changes.primaryId) game.me.character.primaryGun = this.#changes.primaryId[0];
            if (this.#changes.secondaryId) game.me.character.secondaryGun = this.#changes.secondaryId[0];
        }
    }
}