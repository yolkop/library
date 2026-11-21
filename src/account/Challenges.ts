/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import { ChallengeList } from '#env/DataLoader';

import { createError, UNKNOWN_RESPONSE_EXPLAIN, type ErrorEnum } from '../util.js';

import type { Account, QueryServicesError, RawChallengeData } from './Account.js';
import type { ChallengeSubType, ChallengeType } from '../types/Challenge.js';
import type { FirebaseError } from '../Firebase.js';

/** Possible errors from {@link Challenges.refresh} */
export enum ChallengeRefreshError {
    /** The account session has expired */
    SessionExpired = 'challengeGetDaily_expired_session',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

/** Possible errors from {@link Challenges.reroll} */
export enum ChallengeRerollError {
    /** The account session has expired */
    SessionExpired = 'challengeRerollSlot_expired_session',
    /** The challenge ID does not exist */
    ChallengeNotFound = 'challenge_not_found',
    /** The challenge ID that you're trying to reroll is not in your challenge IDs */
    ChallengeNotAssigned = 'challenge_reroll_not_found',
    /** You do not have the required eggs to reroll the challenge */
    NotEnoughEggs = 'insufficient_eggs',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

/** Possible errors from {@link Challenges.claim} */
export enum ChallengeClaimError {
    /** The account session has expired */
    SessionExpired = 'challengeClaimReward_expired_session',
    /** The challenge ID that you're trying to claim does not exist or is not in the user's challenges */
    ChallengeNotFound = 'challenge_claim_not_found',
    /** The challenge ID that you're trying to claim has not yet been completed */
    ChallengeNotCompleted = 'challenge_not_completed',
    /** The response returned by the game isn't known by yolkbot */
    UnexpectedResponse = 'unexpected_response'
}

/** The Challenge that is in {@link Challenges.list} */
export interface AccountChallenge {
    /** The raw challenge as sent by the server. Challenges does a bit behind the scenes to "clean up" the challenge and make information on it a bit easier to understand. */
    raw: RawChallengeData;
    /** The challenge's ID */
    id: number;
    /** The challenge's "name" (playful and does not explain challenge) */
    name: string;
    /** The challenges "description" (actually explains the challenge) */
    desc: string;
    /** The challege's "type" (see {@link ChallengeType}) */
    type: ChallengeType;
    /** The challenge's "subtype" (see {@link ChallengeSubType}) */
    subType?: ChallengeSubType;
    /** The number of eggs rewarded when the challenge is completed & claimed */
    rewardEggs: number;
    /** If this challenge slot has been rerolled already and cannot be rerolled again */
    isRerolled: boolean;
    /** If this challenge slot has been claimed */
    isClaimed: boolean;
    /** If this challenge slot has been completed */
    isCompleted: boolean;
    /** A number indicating "progress". In a challenge with kills, this would be the number of kills so far. Varies heavily depending on challenge type. */
    progressNum: number;
    /** A number indicating the "goal" (see {@link AccountChallenge.progressNum}) */
    goalNum: number;
}

/** Represents an account's challenges, including methods to refresh, reroll, and claim them. */
export class Challenges {
    /** The associated Account instance */
    account: Account;

    /** The list of challenges the Account has */
    list: AccountChallenge[] = [];

    /**
     * Creates a Challenges instance
     * @param account The Account instance to use for data and authentication
     */
    constructor(account: Account) {
        this.account = account;
    }

    /**
     * Imports raw challenge data into the challenge list
     * @param challengeData Raw challenge data from the API
     */
    import(challengeData: RawChallengeData[]): void {
        this.list = [];

        for (const challenge of challengeData) {
            const challengeInfo = ChallengeList.find(c => c.id === challenge.challengeId);
            if (!challengeInfo) continue;

            delete challenge.playerId;

            this.list.push({
                raw: challenge,
                id: challenge.challengeId,
                name: challengeInfo.loc.title,
                desc: challengeInfo.loc.desc,
                type: challengeInfo.type,
                subType: challengeInfo.subType,
                rewardEggs: challengeInfo.reward,
                isRerolled: !!challenge.reset,
                isClaimed: !!challenge.claimed,
                isCompleted: !!challenge.completed,
                progressNum: challenge.progress,
                goalNum: challengeInfo.goal
            });
        }
    }

    /**
     * Refreshes challenges with the game's server
     * @returns The refresh result
     */
    async refresh(): Promise<{ ok: true, challenges: AccountChallenge[] } | ErrorEnum<ChallengeRefreshError | QueryServicesError | FirebaseError>> {
        if (!this.list) return createError(ChallengeRefreshError.SessionExpired);

        const result = await this.account.queryServices({
            cmd: 'challengeGetDaily',
            sessionId: this.account.sessionId,
            playerId: this.account.id
        });

        if (!result.ok) return result;

        if (!result.result || !Array.isArray(result.result)) {
            console.error('Challenges.refresh: unexpected response:', result);
            console.error(`Challenges.refresh: ${UNKNOWN_RESPONSE_EXPLAIN}`);

            return createError(ChallengeRefreshError.UnexpectedResponse);
        }

        this.import(result.result);
        return { ok: true, challenges: this.list };
    }

    /**
     * Rerolls a challenge slot with the game's server
     * @param challengeId The ID of the challenge to reroll
     * @returns The reroll result
     */
    async reroll(challengeId: number): Promise<{ ok: true, newChallenges: AccountChallenge[] } | ErrorEnum<ChallengeRerollError | QueryServicesError | FirebaseError>> {
        if (!this.list) return createError(ChallengeRerollError.SessionExpired);

        const result = await this.account.queryServices({
            cmd: 'challengeRerollSlot',
            sessionId: this.account.sessionId,
            slotId: challengeId
        });

        if (!result.ok) return result;

        if (result.result && Array.isArray(result.result)) {
            this.import(result.result);
            return { ok: true, newChallenges: this.list };
        }

        const isInEnum = Object.values(ChallengeRerollError).includes(result.error);
        if (isInEnum) return { ok: false, error: result.error };

        console.error('Challenges.reroll: unknown response:', result);
        console.error(`Challenges.reroll: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return { ok: false, error: ChallengeRerollError.UnexpectedResponse };
    }

    /**
     * Claims the reward for a completed challenge with the game's server
     * @param challengeId The ID of the challenge to claim
     * @returns The claim result
     */
    async claim(challengeId: number): Promise<{ ok: true, eggReward: number, updatedChallenges: AccountChallenge[] } | ErrorEnum<ChallengeClaimError | QueryServicesError | FirebaseError>> {
        if (!this.list) return createError(ChallengeClaimError.SessionExpired);

        const result = await this.account.queryServices({
            cmd: 'challengeClaimReward',
            sessionId: this.account.sessionId,
            slotId: challengeId
        });

        if (!result.ok) return result;

        if (result.reward) {
            this.import(result.challenges);
            if (result.reward > 0) this.account.eggBalance += result.reward;
            return { ok: true, eggReward: result.reward, updatedChallenges: this.list }
        }

        const isInEnum = Object.values(ChallengeClaimError).includes(result.error);
        if (isInEnum) return { ok: false, error: result.error };

        console.error('Challenges.claim: unknown response:', result);
        console.error(`Challenges.claim: ${UNKNOWN_RESPONSE_EXPLAIN}`);

        return { ok: false, error: ChallengeClaimError.UnexpectedResponse };
    }
}