/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

/** A constant representing the "time" it takes to equip a gun. */
export const GunEquipTime = 13;

/** The different gun IDs (0 = eggk all the way to 6 = trihard) */
export type GunIds = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Represents a {@link Gun} ammo */
export interface GunAmmo {
    /** The capacity of bullets the gun has in a single usable clip */
    capacity: number;
    /** The number of bullets added when the gun reloads */
    reload: number;
    /** The total number of bullets the gun stores in total when full across all clips */
    store: number;
    /** The number of bullets added when an ammo box is picked up */
    pickup: number;
}

/** Represents a generic gun */
export interface Gun {
    /** Ammo details */
    ammo: GunAmmo;

    /** The time it takes to reload when the gun has 0 bullets left */
    longReloadTime: number;
    /** The time it takes to reload when the gun has 1 or more bullets left */
    shortReloadTime: number;

    /** The stylized weapon name */
    weaponName: string;
    /** An internal name for the weapon */
    internalName: string;
    /** The name of the gun's base mesh, prefixed by `gun_` in the GLBs */
    standardMeshName: string;

    /** The damage the gun does "per bullet" */
    damage: number;
    /** The maximum range of the gun, in blocks */
    range: number;
    /** The fire speed of the gun */
    rof: number;
    /** The damage the gun does across all bullets */
    totalDamage: number;
    /** The velocity of the gun */
    velocity: number;
}

/** Represents a game-ready {@link Player} gun */
export type PlayerGun = Gun & {
    ammo: GunAmmo & {
        rounds: number;
        storeMax: number;
    }
};

/** Information about the EggK-47 */
export const GunEggK47 = {
    ammo: {
        capacity: 30,
        reload: 30,
        store: 240,
        pickup: 30
    },
    longReloadTime: 205,
    shortReloadTime: 160,
    weaponName: 'EggK-47',
    internalName: 'Eggk47',
    standardMeshName: 'eggk47',
    damage: 30,
    range: 20,
    rof: 3,
    totalDamage: 30,
    velocity: 1.5
} as Gun;

/** Information about the Scrambler */
export const GunScrambler = {
    ammo: {
        capacity: 2,
        reload: 2,
        store: 24,
        pickup: 8
    },
    longReloadTime: 155,
    shortReloadTime: 155,
    weaponName: 'Scrambler',
    internalName: 'Dozen Gauge',
    standardMeshName: 'dozenGauge',
    damage: 8.5,
    range: 8,
    rof: 8,
    totalDamage: 170,
    velocity: 1
} as Gun;

/** Information about the Free Ranger */
export const GunFreeRanger = {
    ammo: {
        capacity: 15,
        reload: 15,
        store: 60,
        pickup: 15
    },
    longReloadTime: 225,
    shortReloadTime: 165,
    weaponName: 'Free Ranger',
    internalName: 'CSG-1',
    standardMeshName: 'csg1',
    damage: 105,
    range: 50,
    rof: 13,
    totalDamage: 105,
    velocity: 1.75
} as Gun;

/** Information about the Cluck 9mm (secondary) */
export const GunCluck9mm = {
    ammo: {
        capacity: 15,
        reload: 15,
        store: 60,
        pickup: 15
    },
    longReloadTime: 195,
    shortReloadTime: 160,
    weaponName: 'Cluck 9mm',
    internalName: 'Cluck 9mm',
    standardMeshName: 'cluck9mm',
    damage: 26,
    range: 15,
    rof: 4,
    totalDamage: 26,
    velocity: 1
} as Gun;

/** Information about the RPEGG */
export const GunRPEGG = {
    ammo: {
        capacity: 1,
        reload: 1,
        store: 3,
        pickup: 1
    },
    longReloadTime: 170,
    shortReloadTime: 170,
    weaponName: 'RPEGG',
    internalName: 'Eggsploder',
    standardMeshName: 'rpegg',
    damage: 140,
    range: 45,
    rof: 40,
    totalDamage: 192.5,
    velocity: 0.4
} as Gun;

/** Information about the Whipper */
export const GunWhipper = {
    ammo: {
        capacity: 40,
        reload: 40,
        store: 200,
        pickup: 40
    },
    longReloadTime: 225,
    shortReloadTime: 190,
    weaponName: 'Whipper',
    internalName: 'SMEGG',
    standardMeshName: 'smg',
    damage: 23,
    range: 20,
    rof: 2,
    totalDamage: 23,
    velocity: 1.25
} as Gun;

/** Information about the Crackshot */
export const GunCrackshot = {
    ammo: {
        capacity: 1,
        reload: 1,
        store: 12,
        pickup: 4
    },
    longReloadTime: 144,
    shortReloadTime: 144,
    weaponName: 'Crackshot',
    internalName: 'M2DZ',
    standardMeshName: 'm24',
    damage: 170,
    range: 60,
    rof: 15,
    totalDamage: 170,
    velocity: 2
} as Gun;

/** Information about the Tri-Hard */
export const GunTriHard = {
    ammo: {
        capacity: 24,
        reload: 24,
        store: 150,
        pickup: 24
    },
    longReloadTime: 205,
    shortReloadTime: 160,
    weaponName: 'Tri-Hard',
    internalName: 'AUG',
    standardMeshName: 'aug',
    damage: 32,
    range: 20,
    rof: 15,
    totalDamage: 34,
    velocity: 1.5
} as Gun;

/** The guns in index order */
export const GunList = [GunEggK47, GunScrambler, GunFreeRanger, GunRPEGG, GunWhipper, GunCrackshot, GunTriHard] as const;