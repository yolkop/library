/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { UNKNOWN_RESPONSE_EXPLAIN, type ErrorEnum } from '../util.js';

import type { Account, QueryServicesError } from './Account.js';
import type { FirebaseError } from '../Firebase.js';

/** Possible errors from {@link Shop.claimSocialReward} */
export enum ClaimSocialError {
    /** That specific social is invalid */
    InvalidReward = 'REWARD_NOT_FOUND',
    /** That specific social has already been redeemed by the account */
    AlreadyRedeemed = 'REWARD_PREV_GIVEN',
    /** The account session has expired */
    SessionExpired = 'reward_expired_session',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

/** Possible errors from {@link Shop.claimURLReward} */
export enum ClaimURLError {
    /** That specific social is invalid */
    InvalidReward = 'REWARD_NOT_FOUND',
    /** That specific social has already been redeemed by the account */
    AlreadyRedeemed = 'REWARD_PREV_GIVEN',
    /** The account session has expired */
    SessionExpired = 'urlRewardParams_expired_session',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

/** Possible errors from {@link Shop.buyItem} */
export enum ItemBuyError {
    /** The item does not exist */
    ItemNotFound = 'ITEM_NOT_FOUND',
    /** The account already owns that item */
    ItemAlreadyOwned = 'ALREADY_OWNED',
    /** The account does not have enough eggs to purchase that item */
    CannotAfford = 'INSUFFICIENT_FUNDS',
    /** The item cannot be bought */
    CannotBuy = 'ERROR',
    /** The account session has expired */
    SessionExpired = 'PLAYER_NOT_FOUND',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

/** Possible errors from {@link Shop.redeemCode} */
export enum RedeemCodeError {
    /** Someone else is redeeming the code at the exact same time, so the code is locked */
    CurrentlyRedeemingElsewhere = 'CODE_DOUBLE_DOUBLE',
    /** The code has already been redeemed by someone else */
    AlreadyRedeemed = 'CODE_PREV_REDEEMED',
    /** The code is invalid */
    InvalidCode = 'CODE_NOT_FOUND',
    /** You are ratelimited from code redeem attempts */
    Ratelimited = 'RATE_LIMIT_REACHED',
    /** The account session has expired */
    SessionExpired = 'PLAYER_NOT_FOUND',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

/** The claimable social media "follow rewards", passable to {@link Shop.claimSocialReward} */
export enum SocialReward {
    /** The Discord hat */
    Discord = 'rew_1200',
    /** The TikTok hat */
    Tiktok = 'rew_1208',
    /** The Instagram hat */
    Instagram = 'rew_1219',
    /** The Steam hat */
    Steam = 'rew_1223',
    /** The Facebook hat */
    Facebook = 'rew_1227',
    /** The Twitter hat */
    Twitter = 'rew_1234',
    /** The Twitch Bits hat */
    Twitch = 'rew_twitch_social'
}

/** The in-game shop behind an {@link Account} */
export class Shop {
    /** The related {@link Account} instance */
    account: Account;

    /**
     * Creates a new Shop instance. Automatically initialized with an {@link Account}
     * @param account The account it operates with
     */
    constructor(account: Account) {
        this.account = account;
    }

    /**
     * Refreshes the account's egg balance from the server
     * @returns An object containing the current balance if successful, or an error if the request failed
     */
    async refreshBalance(): Promise<{ ok: true, currentBalance: number } | ErrorEnum<QueryServicesError | FirebaseError>> {
        const result = await this.account.queryServices({
            cmd: 'checkBalance',
            firebaseId: this.account.firebaseId,
            sessionId: this.account.sessionId
        });

        if (!result.ok) return result;

        this.account.eggBalance = result.currentBalance;

        return { ok: true, currentBalance: result.currentBalance };
    }

    /**
     * Attempts to redeem an item code for the account
     * @param code The item code to redeem
     * @returns An object containing the result if successful, or an error if the request failed
     */
    async redeemCode(code: string): Promise<{ ok: true, eggsGiven: number, itemIds: number[] } | ErrorEnum<RedeemCodeError | QueryServicesError | FirebaseError>> {
        const result = await this.account.queryServices({
            cmd: 'redeem',
            firebaseId: this.account.firebaseId,
            sessionId: this.account.sessionId,
            id: this.account.id,
            code
        });

        if (!result.ok) return result;

        if (result.result === 'SUCCESS') {
            this.account.eggBalance += result.eggs_given;
            result.item_ids.forEach((id: number) => this.account.ownedItemIds.push(id));

            return { ok: true, eggsGiven: result.eggs_given, itemIds: result.item_ids };
        }

        const isInEnum = Object.values(RedeemCodeError).includes(result.result);
        if (isInEnum) return { ok: false, error: result.result };

        console.error('Shop.redeemCode: unknown response:', result);
        console.error(`Shop.redeemCode: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return { ok: false, error: RedeemCodeError.UnexpectedResponse };
    }

    /**
     * Attempts to claim a URL reward (such as midMonthGiveMeEggs)
     * @param reward The reward to claim
     * @returns An object containing the result if successful, or an error if the request failed
     */
    async claimURLReward(reward: string): Promise<{ ok: true, eggsGiven: number, itemIds: number[] } | ErrorEnum<ClaimURLError | QueryServicesError | FirebaseError>> {
        const result = await this.account.queryServices({
            cmd: 'urlRewardParams',
            firebaseId: this.account.firebaseId,
            sessionId: this.account.sessionId,
            reward
        });

        if (!result.ok) return result;

        if (result.result === 'SUCCESS') {
            this.account.eggBalance += result.eggsGiven;
            result.itemIds.forEach((id: number) => this.account.ownedItemIds.push(id));
            return { ok: true, eggsGiven: result.eggsGiven, itemIds: result.itemIds };
        }

        const isInEnum = Object.values(ClaimURLError).includes(result.result);
        if (isInEnum) return { ok: false, error: result.result };

        console.error('Shop.claimURLReward: unknown response:', result);
        console.error(`Shop.claimURLReward: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return { ok: false, error: ClaimURLError.UnexpectedResponse };
    }

    /**
     * Claims the reward for following a social media account (or more accurately, clicking it on the homepage)
     * @param rewardTag The reward to claim
     * @returns An object containing the result if successful, or an error if the request failed
     */
    async claimSocialReward(rewardTag: SocialReward): Promise<{ ok: true, eggsGiven: number, itemIds: number[] } | ErrorEnum<ClaimSocialError | QueryServicesError | FirebaseError>> {
        const result = await this.account.queryServices({
            cmd: 'reward',
            firebaseId: this.account.firebaseId,
            sessionId: this.account.sessionId,
            rewardTag
        });

        if (!result.ok) return result;

        if (result.result === 'SUCCESS') {
            this.account.eggBalance += result.eggsGiven;
            result.itemIds.forEach((id: number) => this.account.ownedItemIds.push(id));
            return { ok: true, eggsGiven: result.eggsGiven, itemIds: result.itemIds };
        }

        const isInEnum = Object.values(ClaimSocialError).includes(result.result);
        if (isInEnum) return { ok: false, error: result.result };

        console.error('Shop.claimSocialReward: unknown response:', result);
        console.error(`Shop.claimSocialReward: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return { ok: false, error: ClaimSocialError.UnexpectedResponse };
    }

    /**
     * Buys an item from the shop with eggs
     * @param itemId The ID of the item to buy
     * @returns An object containing the result if successful, or an error if the request failed
     */
    async buyItem(itemId: number): Promise<{ ok: true, itemId: number, currentBalance: number } | ErrorEnum<ItemBuyError | QueryServicesError | FirebaseError>> {
        const result = await this.account.queryServices({
            cmd: 'buy',
            firebaseId: this.account.firebaseId,
            sessionId: this.account.sessionId,
            itemId,
            save: true
        });

        if (!result.ok) return result;

        if (result.result === 'SUCCESS') {
            this.account.eggBalance = result.currentBalance;
            this.account.ownedItemIds.push(result.itemId);
            return { ok: true, itemId: result.itemId, currentBalance: result.currentBalance };
        }

        const isInEnum = Object.values(ItemBuyError).includes(result.result);
        if (isInEnum) return { ok: false, error: result.result };

        console.error('Shop.buyItem: unknown response:', result);
        console.error(`Shop.buyItem: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return { ok: false, error: ItemBuyError.UnexpectedResponse };
    }

    /**
     * Checks if it's currently in the 2x egg weekend period
     * @returns Whether it's currently the 2x egg weekend period
     */
    isDoubleEggWeekend(): boolean {
        const day = new Date().getUTCDay();
        return (day >= 5 && new Date().getUTCHours() >= 20) || day === 6 || day === 0;
    }
}