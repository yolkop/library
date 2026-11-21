/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { ADispatch } from '../ADispatch.js';
import type { Game, GameOptions } from '../../Game.js';

/** The available gravity multipliers in the game options */
export const GravityScale = [0.25, 0.5, 0.75, 1] as const;
/** The available damage multipliers in the game options */
export const DamageScale = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
/** The available health regen speed multipliers in the game options */
export const RegenScale = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4] as const;

type AtLeastOneDefined<T1, T2> =
    (T1 extends undefined ? never : T1) |
    (T2 extends undefined ? never : T2);

const whichever = <T1, T2>(arg1: T1, arg2: T2): AtLeastOneDefined<T1, T2> =>
    (typeof arg1 === 'undefined' ? arg2 : arg1) as AtLeastOneDefined<T1, T2>;

/** The options passable to a {@link GameOptionsDispatch}; leave any blank to not change it */
export interface GameOptionChanges {
    /** The game's gravity */
    gravity?: typeof GravityScale[number];
    /** The damage multiplier */
    damage?: typeof DamageScale[number];
    /** The health regen speed multiplier */
    healthRegen?: typeof RegenScale[number];
    /** Whether the game is locked */
    locked?: boolean;
    /** Whether manual player team changing is disabled */
    noTeamChange?: boolean;
    /** Whether automatic player team shuffle is disabled */
    noTeamShuffle?: boolean;
    /** Whether the Eggk is disabled */
    disableEggk?: boolean;
    /** Whether the Scrambler is disabled */
    disableScrambler?: boolean;
    /** Whether the Free Ranger is disabled */
    disableFreeRanger?: boolean;
    /** Whether the RPEGG is disabled */
    disableRPG?: boolean;
    /** Whether the Whipper is disabled */
    disableWhipper?: boolean;
    /** Whether the Crackshot is disabled */
    disableCrackshot?: boolean;
    /** Whether the Tri-Hard is disabled */
    disableTriHard?: boolean;
    /** An array of weapon IDs to disable */
    toDisable?: number[];
    /** An array of weapon IDs to enable */
    toEnable?: number[];
    /** A raw input of disabled weapons, with each index serving as the corresponding {@link GunIds}; true = disabled */
    rawWeaponsDisabled?: (boolean | number)[];
}

/** (game owner only) Changes the game's settings (including lock state, allowed guns, and team switching) */
export class GameOptionsDispatch implements ADispatch {
    #changes: GameOptionChanges;

    /**
     * Creates a GameOptionsDispatch
     * @param changes An object containing the options to change. Only the options included in the object will be changed; all others will remain the same. For weapon disabling, you can either specify the individual weapons to disable using the disable[WeaponName] properties, or you can specify arrays of weapon indices to disable/enable using the toDisable and toEnable properties, or you can specify the entire weaponsDisabled array directly using the rawWeaponsDisabled property (note that the rawWeaponsDisabled array must be in the format of the game options, meaning it should contain 7 boolean or number values corresponding to each weapon). The individual disable[WeaponName] properties will override the array properties if both are provided.
     */
    constructor(changes: GameOptionChanges) {
        this.#changes = changes;
    }

    #constructFinalOutput(game: Game): GameOptions {
        const output = {
            gravity: whichever(this.#changes.gravity, game.options.gravity),
            damage: whichever(this.#changes.damage, game.options.damage),
            healthRegen: whichever(this.#changes.healthRegen, game.options.healthRegen),
            locked: whichever(this.#changes.locked, game.options.locked),
            noTeamChange: whichever(this.#changes.noTeamChange, game.options.noTeamChange),
            noTeamShuffle: whichever(this.#changes.noTeamShuffle, game.options.noTeamShuffle),
            weaponsDisabled: [
                whichever(this.#changes.disableEggk, game.options.weaponsDisabled[0]),
                whichever(this.#changes.disableScrambler, game.options.weaponsDisabled[1]),
                whichever(this.#changes.disableFreeRanger, game.options.weaponsDisabled[2]),
                whichever(this.#changes.disableRPG, game.options.weaponsDisabled[3]),
                whichever(this.#changes.disableWhipper, game.options.weaponsDisabled[4]),
                whichever(this.#changes.disableCrackshot, game.options.weaponsDisabled[5]),
                whichever(this.#changes.disableTriHard, game.options.weaponsDisabled[6])
            ] as boolean[]
        };

        if (this.#changes.toDisable && Array.isArray(this.#changes.toDisable)) this.#changes.toDisable.forEach((idx) => output.weaponsDisabled[idx] = true);
        if (this.#changes.toEnable && Array.isArray(this.#changes.toEnable)) this.#changes.toEnable.forEach((idx) => output.weaponsDisabled[idx] = false);

        if (this.#changes.rawWeaponsDisabled && Array.isArray(this.#changes.rawWeaponsDisabled) && this.#changes.rawWeaponsDisabled.length === 7)
            output.weaponsDisabled = this.#changes.rawWeaponsDisabled.map((v) => !!v);

        return output;
    }

    validate(game: Game): boolean {
        const wouldBe = this.#constructFinalOutput(game);

        if (!GravityScale.includes(wouldBe.gravity)) return false;
        if (!DamageScale.includes(wouldBe.damage)) return false;
        if (!RegenScale.includes(wouldBe.healthRegen)) return false;

        if (typeof wouldBe.locked !== 'number' && typeof wouldBe.locked !== 'boolean') return false;
        if (typeof wouldBe.noTeamChange !== 'number' && typeof wouldBe.noTeamChange !== 'boolean') return false;
        if (typeof wouldBe.noTeamShuffle !== 'number' && typeof wouldBe.noTeamShuffle !== 'boolean') return false;

        if (!Array.isArray(wouldBe.weaponsDisabled)) return false;
        if (wouldBe.weaponsDisabled.length !== 7) return false;
        if (wouldBe.weaponsDisabled.some((weapon) => typeof weapon !== 'number' && typeof weapon !== 'boolean')) return false;

        return true;
    }

    check(game: Game): boolean {
        return game.isGameOwner;
    }

    execute(game: Game): void {
        game.options = this.#constructFinalOutput(game);
        game.sendOptions();
    }
}