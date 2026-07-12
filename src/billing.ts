export interface ChargeResultLike {
    chargedCount: number;
    eventChargeLimitReached?: boolean;
}

export interface ChargeDecision {
    recordWasSaved: boolean;
    limitReached: boolean;
}

export function interpretChargeResult(result: ChargeResultLike): ChargeDecision {
    const limitReached = result.eventChargeLimitReached === true;
    const recordWasSaved = result.chargedCount > 0 || !limitReached;
    return { recordWasSaved, limitReached };
}
