/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import type { GunIds } from '../game/Guns.js';
import type { Position } from '../util.js';

/** Different item type IDs for an {@link Item} */
export enum ItemType {
    /** Hats */
    Hat = 1,
    /** Stamps */
    Stamp = 2,
    /** Primary Guns */
    Primary = 3,
    /** Secondary Guns */
    Secondary = 4,
    /** Grenades */
    Grenade = 6,
    /** Melees */
    Melee = 7
}

interface BaseItem {
    /** A unique item ID */
    id: number;
    /** The item name */
    name: string;
    /** The item price, in eggs. Default items are 0 and unavailable items are the 2147483647 (signed 32-bit integer limit) */
    price: number;
    /** Whether the item is available */
    is_available: boolean;
    /** How the item is unlocked */
    unlock: 'default' | 'purchase' | 'physical' | 'manual' | 'premium' | 'vip';
    /** Indicates that the product is an active product (only present on "premium" unlock items) */
    activeProduct?: boolean;
}

interface BaseMeshItem extends BaseItem {
    /** Additional item data */
    item_data: {
        /** The mesh name of the item */
        meshName: string;
        /** The tags the item has (used for search). Almost always present, but may not be in rare cases */
        tags?: string[];
    }
    /** The SKU where the item can be directly bought, if possible. Always has only one SKU */
    sku?: string[];
}

/** Represents a Stamp {@link Item} */
export interface StampItem extends BaseItem {
    /** The item type "ID" */
    item_type_id: ItemType.Stamp;
    /** The item type "name" */
    item_type_name: 'Stamp';
    /** A more specific item "category" name */
    category_name: 'Stamps';
    /** Additional item data */
    item_data: {
        /** The X alignment of the stamp on the egg */
        x: number;
        /** The Y alignment of the stamp on the egg */
        y: number;
        /** The tags the item has (used for search). Almost always present, but may not be in rare cases */
        tags?: string[];
    }
}

/** Represents a Hat {@link Item} */
export interface HatItem extends BaseMeshItem {
    /** The item type "ID" */
    item_type_id: ItemType.Hat;
    /** The item type "name" */
    item_type_name: 'Hat';
    /** A more specific item "category" name */
    category_name: 'Hats';
    /** The alignment of the hat on the egg */
    align: Position;
}

/** Represents a Primary Gun {@link Item} */
export interface PrimaryGunItem extends BaseMeshItem {
    /** The item type "ID" */
    item_type_id: ItemType.Primary;
    /** The item type "name" */
    item_type_name: 'Primary';
    /** A more specific item "category" name */
    category_name: 'Soldier Primary Weapons' | 'Ranger Primary Weapons' | 'Scrambler Primary Weapons' | 'Eggsploder Primary Weapons' | 'Whipper Primary Weapons' | 'Crackshot Primary Weapons' | 'TriHard Primary Weapons';
    /** The {@link GunIds} the gun is for */
    exclusive_for_class: GunIds;
}

/** Represents a Secondary Gun {@link Item} */
export interface SecondaryGunItem extends BaseMeshItem {
    /** The item type "ID" */
    item_type_id: ItemType.Secondary;
    /** The item type "name" */
    item_type_name: 'Secondary';
    /** A more specific item "category" name */
    category_name: 'Shared Secondary Weapons';
}

/** Represents a Grenade {@link Item} */
export interface GrenadeItem extends BaseMeshItem {
    /** The item type "ID" */
    item_type_id: ItemType.Grenade;
    /** The item type "name" */
    item_type_name: 'Grenade';
    /** A more specific item "category" name */
    category_name: 'Grenades';
}

/** Represents a Melee {@link Item} */
export interface MeleeItem extends BaseMeshItem {
    /** The item type "ID" */
    item_type_id: ItemType.Melee;
    /** The item type "name" */
    item_type_name: 'Melee';
    /** A more specific item "category" name */
    category_name: 'Melee';
}

/** Any item */
export type Item = HatItem | StampItem | PrimaryGunItem | SecondaryGunItem | GrenadeItem | MeleeItem;
