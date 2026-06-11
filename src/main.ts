import { Actor } from 'apify';
import { ProxyAgent } from 'undici';
import { scrapeIndiaMartSuppliers } from './routes.js';
import type { ActorInput, FetchOptions, SupplierLeadRecord } from './types.js';

const DEFAULT_INPUT: ActorInput = {
    keywords: ['cotton fabric'],
    location: '',
    maxResults: 50,
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
    console.log(`Prepared ${records.length} clean supplier lead record(s).`);

    let pushed = 0;
    for (const record of records) {
        if (!isChargeableRecord(record)) continue;
        await Actor.pushData(record);
        await chargeSupplierEvent();
        pushed++;
    }

    console.log(`Finished. Saved ${pushed} supplier lead record(s).`);
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

function isChargeableRecord(record: SupplierLeadRecord): boolean {
    return Boolean(record.productName && record.companyName && record.city && (record.productUrl || record.companyUrl));
}

async function chargeSupplierEvent(): Promise<void> {
    if (!Actor.isAtHome()) return;

    try {
        await Actor.charge({ eventName: 'supplier-scraped' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`PPE charge failed; continuing: ${message}`);
    }
}
