/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { createError, UNKNOWN_RESPONSE_EXPLAIN, type ErrorEnum } from '../util.js';
import type { Account } from './Account.js';

/** Errors from {@link Gifts.create} */
export enum GiftCreateError {
    /** The SKU cannot be gifted (either not available or doesn't exist) */
    CannotGiftSKU = 'NOT_GIFTABLE',
    /** The account is not email-verified, meaning it cannot gift */
    AccountNotVerified = 'ACCOUNT_NOT_VERIFIED',
    /** The account session has expired */
    SessionExpired = 'SESSION_EXPIRED',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

export enum GiftListError {
    /** The account session has expired */
    SessionExpired = 'SESSION_EXPIRED',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

export enum GiftDeleteError {
    GiftNotFound = 'NOT_FOUND',
    /** The account session has expired */
    SessionExpired = 'SESSION_EXPIRED',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

export enum GiftLookupError {
    /** The gift code does not exist */
    NotFound = 'NOT_FOUND',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

export enum GiftCheckoutError {
    /** The gift has already been purchased */
    AlreadyPurchased = 'UNAVAILABLE',
    /** The gift code does not exist */
    NotFound = 'NOT_FOUND',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

/** Manages the game's gifting system */
export class Gifts {
    /** The associated Account instance */
    account: Account;

    /**
     * Creates a new Gifts instance. Automatically initialized with an {@link Account}
     * @param account The account it gifts with
     */
    constructor(account: Account) {
        this.account = account;
    }

    /**
     * Check if a string is a gift code
     * @param code The string to check
     */
    isGiftCode(code: string): boolean {
        return /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/i.test(code);
    }

    /** Checks if the associated account is eligible to gift (must be email-verified) */
    canCreate(): boolean {
        return this.account.emailVerified;
    }

    /**
     * Creates a gift code for an item. The associated account must be email-verified to gift.
     * @param itemSKU The SKU of the item to gift
     * @param playerName The name of the player to gift to (bad words are filtered)
     * @returns An object containing the gift code, URL, and expiration date if successful, or an error if the request failed
     */
    async create(itemSKU: string, playerName: string): Promise<{
        ok: true,
        code: string,
        url: string,
        dateExpires: string,
        codeReused: boolean
    } | ErrorEnum<GiftCreateError>> {
        const response = await this.account.queryServices({
            cmd: 'giftCreate',
            sessionId: this.account.sessionId,
            sku: itemSKU,
            playerName
        });

        if (response.error === GiftCreateError.CannotGiftSKU) return createError(GiftCreateError.CannotGiftSKU);
        if (response.error === GiftCreateError.AccountNotVerified) return createError(GiftCreateError.AccountNotVerified);
        if (response.error === GiftCreateError.SessionExpired) return createError(GiftCreateError.SessionExpired);

        if ('code' in response && 'dateExpires' in response) return {
            ok: true,
            url: response.url,
            code: response.code,
            dateExpires: response.dateExpires,
            codeReused: typeof response.reused === 'undefined' ? true : !!response.reused
        };

        console.error('Gifts.create: unexpected response:', response);
        console.error(`Gifts.create: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return createError(GiftCreateError.UnexpectedResponse);
    }

    /**
     * Lists gifts that the associated account has created
     * @returns An object containing the list of gifts if successful, or an error if the request failed
     */
    async list(): Promise<{ ok: true, gifts: { code: string, url: string, name: string, price: string, sku: string, dateExpires: string }[] } | ErrorEnum<GiftListError>> {
        const response = await this.account.queryServices({
            cmd: 'giftList',
            sessionId: this.account.sessionId
        });

        if (response.error === GiftListError.SessionExpired) return createError(GiftListError.SessionExpired);

        if ('gifts' in response) return {
            ok: true,
            gifts: response.gifts
        };

        console.error('Gifts.list: unexpected response:', response);
        console.error(`Gifts.list: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return createError(GiftListError.UnexpectedResponse);
    }

    /**
     * Deletes a gift code that the associated account has created
     * @param code The gift code to delete
     * @returns An object indicating success if the gift was deleted, or an error if the request failed
     */
    async delete(code: string): Promise<{ ok: true } | ErrorEnum<GiftDeleteError>> {
        const response = await this.account.queryServices({
            cmd: 'giftCancel',
            sessionId: this.account.sessionId,
            code
        });

        if (response.error === GiftDeleteError.GiftNotFound) return createError(GiftDeleteError.GiftNotFound);
        if (response.error === GiftDeleteError.SessionExpired) return createError(GiftDeleteError.SessionExpired);

        if ('result' in response && response.result === 'SUCCESS') return { ok: true };

        console.error('Gifts.delete: unexpected response:', response);
        console.error(`Gifts.delete: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return createError(GiftDeleteError.UnexpectedResponse);
    }

    /**
     * Looks up a gift code. You do not need to be logged in to do this.
     * @param code The gift code to look up
     * @returns An object containing the gift's details if successful, or an error if the request failed
     */
    async lookup(code: string): Promise<{ ok: true, gift: { code: string, recipientName: string | null, sku: string, productName: string, productPriceUSD: string } } | ErrorEnum<GiftLookupError>> {
        const response = await this.account.queryServices({
            cmd: 'giftLookup',
            code
        });

        if (response.error === GiftLookupError.NotFound) return createError(GiftLookupError.NotFound);

        if ('gift' in response) return {
            ok: true,
            gift: {
                code: response.gift.display.replaceAll('-', ''),
                recipientName: response.gift.recipientName ?? null,
                sku: response.gift.sku,
                productName: response.gift.productName,
                productPriceUSD: response.gift.price
            }
        };

        console.error('Gifts.lookup: unexpected response:', response);
        console.error(`Gifts.lookup: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return createError(GiftLookupError.UnexpectedResponse);
    }

    /**
     * Starts checkout of a gift code, returning a URL to complete the purchase. You do not need to be logged in to do this.
     * @param code The gift code to start checking out
     * @returns An object containing the checkout URL if successful, or an error if the request failed
     */
    async checkout(code: string): Promise<{ ok: true, checkoutUrl: string } | ErrorEnum<GiftCheckoutError>> {
        const response = await this.account.queryServices({
            cmd: 'giftCheckout',
            code
        });

        if (response.error === GiftCheckoutError.NotFound) return createError(GiftCheckoutError.NotFound);
        if (response.error === GiftCheckoutError.AlreadyPurchased) return createError(GiftCheckoutError.AlreadyPurchased);

        if ('payUrl' in response) return {
            ok: true,
            checkoutUrl: response.payUrl
        };

        console.error('Gifts.checkout: unexpected response:', response);
        console.error(`Gifts.checkout: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return createError(GiftCheckoutError.UnexpectedResponse);
    }
}