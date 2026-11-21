/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { createError, UNKNOWN_RESPONSE_EXPLAIN, type ErrorEnum } from '../util.js';

import type { Account, QueryServicesError } from './Account.js';
import type { FirebaseError } from '../Firebase.js';

const chicknWinnerDailyLimit = 3;

/** Possible errors from {@link ChicknWinner.play}, {@link ChicknWinner.check}, and {@link ChicknWinner.reset} */
export enum ChicknWinnerError {
    /** (play) Chickn Winner is on cooldown */
    OnCooldown = 'on_cooldown',
    /** (play) The account has hit the daily limit for chickn winning */
    HitDailyLimit = 'hit_daily_limit',
    /** (reset) The account is not yet at the daily limit for chickn winning */
    NotAtDailyLimit = 'not_at_limit',
    /** (reset) The account does not have enough eggs to reset */
    NotEnoughResetEggs = 'not_enough_eggs',
    /** The account session has expired */
    SessionExpired = 'session_expired',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

/** A chick'n winner instance behind an {@link Account} */
export class ChicknWinner {
    /** The related {@link Account} instance */
    account: Account;

    /** Whether the account has hit its pull limit */
    atLimit = false;
    /** The number of pulls today */
    pulls = 0;
    /** The timestamp at which the account can play again */
    canPlayAgain = 0;

    /**
     * Creates a new ChicknWinner instance. Automatically initialized with an {@link Account}
     * @param account The account it pulls with
     */
    constructor(account: Account) {
        this.account = account;
    }

    /**
     * Checks the account's chickn winner status (if it can pull, if not, cooldown until it can)
     * @returns An object containing the updated ChicknWinner instance, or an error if the request failed
     */
    async check(): Promise<{ ok: true, cw: ChicknWinner } | ErrorEnum<ChicknWinnerError | QueryServicesError | FirebaseError>> {
        const response = await this.account.queryServices({
            cmd: 'chicknWinnerReady',
            id: this.account.id,
            sessionId: this.account.sessionId
        });

        if (!response.ok) return response;

        this.pulls = response.limit;
        this.atLimit = response.limit > chicknWinnerDailyLimit;

        // if there is a "span", that means that it's under the daily limit and you can play again soon
        // if there is a "period", that means that the account is done for the day and must wait a long time
        const secondsUntilPlay = (this.atLimit ? response.period : response.span) ?? 0;
        this.canPlayAgain = Date.now() + (secondsUntilPlay * 1000);

        return { ok: true, cw: this };
    }

    /**
     * Attempts to pull from chickn winner
     * @param doPrematureCooldownCheck Whether to run the premature cooldown check based on the last check's cooldown time. Set this to false to ignore the cooldown time from the last check, and just attempt to play (unstable)
     * @returns An object containing the reward if successful, or an error if there was a failure
     */
    async play(doPrematureCooldownCheck = true): Promise<{ ok: true, eggsGiven: number, itemIds: number[], rewardTier: number } | ErrorEnum<ChicknWinnerError | QueryServicesError | FirebaseError>> {
        if ((this.canPlayAgain > Date.now()) && doPrematureCooldownCheck) return createError(ChicknWinnerError.OnCooldown);

        const response = await this.account.queryServices({
            cmd: 'incentivizedVideoReward',
            firebaseId: this.account.firebaseId,
            id: this.account.id,
            sessionId: this.account.sessionId,
            token: null
        });

        if (!response.ok) return response;

        if (response.error) {
            if (response.error === 'RATELIMITED' || response.error === 'RATELMITED') {
                await this.check();
                return createError(ChicknWinnerError.OnCooldown);
            } else if (response.error === 'SESSION_EXPIRED') {
                return createError(ChicknWinnerError.SessionExpired);
            }

            console.error('ChicknWinner.play: unknown response:', response);
            console.error(`ChicknWinner.play: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(ChicknWinnerError.UnexpectedResponse);
        }

        if (response.reward) {
            this.account.eggBalance += response.reward.eggsGiven;
            response.reward.itemIds.forEach((id: number) => this.account.ownedItemIds.push(id));

            await this.check();

            return { ok: true, ...response.reward };
        }

        console.error('ChicknWinner.play: unknown response:', response);
        console.error(`ChicknWinner.play: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return createError(ChicknWinnerError.UnexpectedResponse);
    }

    /**
     * Resets the account's chickn winner cooldown for 200 eggs
     * @returns An object containing the updated ChicknWinner instance if successful, or an error if the request failed
     */
    async reset(): Promise<{ ok: true, cw: ChicknWinner } | ErrorEnum<ChicknWinnerError | QueryServicesError | FirebaseError>> {
        if (this.account.eggBalance < 200) return createError(ChicknWinnerError.NotEnoughResetEggs);
        if (!this.atLimit) return createError(ChicknWinnerError.NotAtDailyLimit);

        const response = await this.account.queryServices({
            cmd: 'chwReset',
            sessionId: this.account.sessionId
        });

        if (!response.ok) return response;

        if (response.result !== 'SUCCESS') {
            console.error('ChicknWinner.reset: unknown response:', response);
            console.error(`ChicknWinner.reset: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(ChicknWinnerError.UnexpectedResponse);
        }

        this.account.eggBalance -= 200;
        await this.check();

        return { ok: true, cw: this };
    }
}