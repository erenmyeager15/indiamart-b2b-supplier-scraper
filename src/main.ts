import { Actor } from 'apify';
import { ProxyAgent } from 'undici';
import { interpretChargeResult } from './billing.js';
import { isChargeableRecord, scrapeIndiaMartSuppliers } from './routes.js';
import type { ActorInput, FetchOptions } from './types.js';

const SUPPLIER_SCRAPED_EVENT = 'supplier-scraped';

const DEFAULT_INPUT: ActorInput = {
    keywords: ['cotton fabric'],
    location: '',
    maxResults: 5,
    includeOrganic: true,
    includeSponsored: true,
    proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        apifyProxyCountry: 'IN',
    },
};

await Actor.init();

try {
    const rawInput = (await Actor.getInput<Partial<ActorInput>>()) ?? {};
    const input = normalizeInput(rawInput);
    const fetchOptions = await createFetchOptions(input);

    console.log('IndiaMART B2B Supplier Scraper started', {
        keywords: input.keywords,
        location: input.location,
        maxResults: input.maxResults,
        includeOrganic: input.includeOrganic,
        includeSponsored: input.includeSponsored,
    });

    const records = await scrapeIndiaMartSuppliers(input, fetchOptions);
    console.log(`Prepared ${records.length} clean supplier/product record(s).`);

    if (records.length === 0) {
        const message = 'IndiaMART returned no usable supplier/product records. Check the keyword, location, and Residential India proxy settings.';
        await Actor.setStatusMessage(message);
        throw new Error(message);
    }

    let pushed = 0;
    let spendingLimitReached = false;
    for (const record of records) {
        if (!isChargeableRecord(record)) continue;

        const chargeResult = await Actor.pushData(record, SUPPLIER_SCRAPED_EVENT);
        const decision = interpretChargeResult(chargeResult);
        if (decision.recordWasSaved) pushed++;

        if (decision.limitReached) {
            spendingLimitReached = true;
            await Actor.setStatusMessage(`Stopped at the user's spending limit after ${pushed} saved record(s).`);
            console.log('User spending limit reached; stopping before more records are saved.');
            break;
        }
    }

    if (pushed === 0 && !spendingLimitReached) {
        const message = 'No IndiaMART records were saved. Nothing was charged for supplier-scraped events.';
        await Actor.setStatusMessage(message);
        throw new Error(message);
    }

    if (!spendingLimitReached) {
        await Actor.setStatusMessage(`Saved ${pushed} IndiaMART supplier/product record(s).`);
    }
    console.log(`Finished. Saved ${pushed} supplier/product record(s).`);
} finally {
    await Actor.exit();
}

function normalizeInput(rawInput: Partial<ActorInput>): ActorInput {
    const keywords = normalizeStringList(rawInput.keywords, DEFAULT_INPUT.keywords);
    if (keywords.length === 0) throw new Error('Input "keywords" must contain at least one keyword.');

    return {
        keywords,
        location: String(rawInput.location ?? DEFAULT_INPUT.location).trim(),
        maxResults: normalizeInteger(rawInput.maxResults, DEFAULT_INPUT.maxResults, 1, 1000),
        includeOrganic: typeof rawInput.includeOrganic === 'boolean' ? rawInput.includeOrganic : DEFAULT_INPUT.includeOrganic,
        includeSponsored: typeof rawInput.includeSponsored === 'boolean'
            ? rawInput.includeSponsored
            : DEFAULT_INPUT.includeSponsored,
        proxyConfiguration: rawInput.proxyConfiguration ?? DEFAULT_INPUT.proxyConfiguration,
    };
}

async function createFetchOptions(input: ActorInput): Promise<FetchOptions> {
    const proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);
    const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
    return {
        dispatcher: proxyUrl ? new ProxyAgent(proxyUrl) : undefined,
        timeoutMs: 60_000,
    };
}

function normalizeStringList(value: string[] | undefined, fallback: string[]): string[] {
    const source = Array.isArray(value) ? value : fallback;
    return source
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .filter((item, index, all) => all.indexOf(item) === index);
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}
