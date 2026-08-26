import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Dispatcher } from 'undici';
import type { ActorInput, FetchOptions, IndiaMartPlaItem, SupplierLeadRecord } from './types.js';

const BASE_URL = 'https://dir.indiamart.com';

export async function scrapeIndiaMartSuppliers(
    input: ActorInput,
    options: FetchOptions,
): Promise<SupplierLeadRecord[]> {
    const seen = new Set<string>();
    const records: SupplierLeadRecord[] = [];
    let failedRequests = 0;

    for (const keyword of input.keywords) {
        if (records.length >= input.maxResults) break;

        const categoryUrl = buildCategoryUrl(keyword, input.location);
        let candidates: SupplierLeadRecord[] = [];
        try {
            const html = await fetchPage(categoryUrl, options);
            if (isBlockedPage(html)) throw new Error('blocked or challenge page returned');
            candidates = parseIndiaMartPage(
                html,
                keyword,
                categoryUrl,
                input.includeOrganic,
                input.includeSponsored,
            );
        } catch (error) {
            failedRequests += 1;
            console.warn(`Skipping IndiaMART category ${categoryUrl}: ${(error as Error).message}`);
            continue;
        }

        for (const record of candidates) {
            if (!isChargeableRecord(record)) continue;

            const dedupeKey = [
                normalizeKey(record.companyUrl ?? record.companyName),
                normalizeKey(record.productName),
                normalizeKey(record.city),
            ].join('|');

            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            records.push(compactRecord(record));
            if (records.length >= input.maxResults) break;
        }

        await delay(700);
    }

    if (records.length === 0 && failedRequests === input.keywords.length) {
        throw new Error(`All ${failedRequests} IndiaMART request(s) failed or were blocked after retries.`);
    }

    return records;
}

export function parseIndiaMartPage(
    html: string,
    keyword: string,
    categoryUrl: string,
    includeOrganic = true,
    includeSponsored = true,
    scrapedAt = new Date().toISOString(),
): SupplierLeadRecord[] {
    const $ = cheerio.load(html);
    const categoryName = extractCategoryName($, keyword);
    return [
        ...(includeSponsored ? parseSponsoredData(html, keyword, categoryName, categoryUrl, scrapedAt) : []),
        ...(includeOrganic ? parseOrganicCards($, keyword, categoryName, categoryUrl, scrapedAt) : []),
    ].filter(isChargeableRecord).map(compactRecord);
}

export function buildCategoryUrl(keyword: string, location: string): string {
    const categorySlug = slugify(keyword);
    const locationSlug = slugify(location);
    if (locationSlug) return `${BASE_URL}/${locationSlug}/${categorySlug}.html`;
    return `${BASE_URL}/impcat/${categorySlug}.html`;
}

async function fetchPage(url: string, options: FetchOptions): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            dispatcher: options.dispatcher as Dispatcher | undefined,
            redirect: 'follow',
            headers: {
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'accept-language': 'en-US,en;q=0.9',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            },
        } as RequestInit & { dispatcher?: Dispatcher });

        if (!response.ok) {
            throw new Error(`Request failed ${response.status} ${response.statusText}: ${url}`);
        }

        return await response.text();
    } finally {
        clearTimeout(timeout);
    }
}

function parseSponsoredData(
    html: string,
    keyword: string,
    categoryName: string,
    categoryUrl: string,
    scrapedAt: string,
): SupplierLeadRecord[] {
    const items = extractJsonArray<IndiaMartPlaItem>(html, 'plaAllIndiaData');

    return items.map((item) => {
        const productName = cleanText(item.PC_ITEM_DISPLAY_NAME ?? item.ITEM_NAME);
        const companyName = cleanText(item.COMPANYNAME);
        const city = cleanText(item.CITY_NAME);
        const productUrl = normalizeUrl(item.PC_ITEM_URL ?? item.PDP_URL);
        const price = normalizePrice(item.PRICE_SEO ?? item.PRICE_F ?? item.PRICE?.toString());
        const unit = cleanText(item.UNIT);

        const record: SupplierLeadRecord = {
            sourceType: 'sponsored',
            keyword,
            categoryName: cleanText(item.GLCAT_MCAT_NAME) ?? categoryName,
            categoryUrl,
            sourceListingId: String(item.DISPLAY_ID ?? item.ITEM_ID ?? productUrl ?? `${companyName}-${productName}`),
            productName: productName ?? '',
            companyName: companyName ?? '',
            city: city ?? '',
            state: cleanText(item.STATE_NAME) ?? undefined,
            companyUrl: normalizeUrl(item.COMPANY_URL) ?? undefined,
            productUrl: productUrl ?? undefined,
            imageUrl: normalizeUrl(item.IMAGE_500X500 ?? item.IMAGE_250X250 ?? item.IMAGE_ORIGINAL) ?? undefined,
            price: price ?? undefined,
            currency: cleanText(item.CURRENCY) ?? (price?.includes('₹') ? 'INR' : undefined),
            unit: unit ?? undefined,
            contactActionAvailable: Boolean(item.CONTACT_NUMBER),
            gstVerified: toBoolean(item.GST_VERIFIED_FLAG),
            mobileVerified: toBoolean(item.MOBILE_VERIFIED),
            emailVerified: toBoolean(item.EMAIL_VERIFIED),
            minOrderQuantity: cleanText(item.PRD_SEARCH_MIN_ORDER_QUANTITY) ?? undefined,
            specifications: normalizeSpecifications(item.ISQ_RESPONSE),
            scrapedAt,
        };
        return compactRecord(record);
    });
}

function parseOrganicCards(
    $: CheerioAPI,
    keyword: string,
    categoryName: string,
    categoryUrl: string,
    scrapedAt: string,
): SupplierLeadRecord[] {
    const records: SupplierLeadRecord[] = [];

    $('article.template7-product-card').each((index, element) => {
        const card = $(element);
        const productLink = card.find('.template7-product-name').first();
        const supplierLink = card.find('.template7-seller-name').first();
        const productName = cleanText(productLink.text());
        const companyName = cleanText(supplierLink.text());
        const city = cleanText(card.find('address span').first().text());
        const sourceListingId =
            cleanText(card.find('.contact-supplier-btn').first().attr('id')) ??
            extractProductId(productLink.attr('href')) ??
            `${index}-${companyName ?? ''}-${productName ?? ''}`;

        const trustBadges = collectTrustBadges($, card);
        const ratingInfo = parseRating(card.find('.dag5').first().text());

        const record: SupplierLeadRecord = compactRecord({
            sourceType: 'organic',
            keyword,
            categoryName,
            categoryUrl,
            sourceListingId,
            productName: productName ?? '',
            companyName: companyName ?? '',
            city: city ?? '',
            companyUrl: normalizeUrl(supplierLink.attr('href')) ?? undefined,
            productUrl: normalizeUrl(productLink.attr('href')) ?? undefined,
            imageUrl: normalizeUrl(card.find('img.product-image').first().attr('src')) ?? undefined,
            price: parsePrice(card.find('.template7-card-meta').first().text()) ?? undefined,
            currency: card.find('.template7-card-meta').text().includes('₹') ? 'INR' : undefined,
            unit: parseUnit(card.find('.template7-card-meta').first().text()) ?? undefined,
            contactActionAvailable: card.find('.contact-supplier-btn, .view-mobile-btn').length > 0,
            supplierBadge: cleanText(card.find('.product-badge').first().text()) ?? undefined,
            trustBadges: trustBadges.length > 0 ? trustBadges : undefined,
            memberSinceYears: trustBadges.find((badge) => /\b\d+\s*yrs?\b/i.test(badge)),
            rating: ratingInfo.rating,
            ratingCount: ratingInfo.ratingCount,
            specifications: collectSpecifications($, card),
            scrapedAt,
        });

        records.push(record);
    });

    return records;
}

function collectSpecifications($: CheerioAPI, card: any): Record<string, string> | undefined {
    const specs: Record<string, string> = {};

    card.find('.template7-isq-item').each((_index: number, element: unknown) => {
        const item = $(element as any);
        const label = cleanText(item.find('.template7-isq-label').first().text());
        const value = cleanText(item.find('.template7-isq-value').first().text());
        if (label && value) specs[label] = value;
    });

    return Object.keys(specs).length > 0 ? specs : undefined;
}

function collectTrustBadges($: CheerioAPI, card: any): string[] {
    const badges: string[] = [];
    card.find('.trstelems span').each((_index: number, element: unknown) => {
        const text = cleanText($(element as any).text());
        if (text && !badges.includes(text) && !/^[★\d().\s]+$/.test(text)) badges.push(text);
    });
    return badges;
}

function normalizeSpecifications(value: unknown): Record<string, string> | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const specs: Record<string, string> = {};

    for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
        const label = cleanText(key);
        const text = cleanText(String(rawValue ?? ''));
        if (label && text) specs[label] = text;
    }

    return Object.keys(specs).length > 0 ? specs : undefined;
}

function extractJsonArray<T>(source: string, marker: string): T[] {
    const markerIndex = source.indexOf(`"${marker}":[`);
    if (markerIndex < 0) return [];

    const start = source.indexOf('[', markerIndex);
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') inString = !inString;
        if (inString) continue;
        if (ch === '[') depth++;
        if (ch === ']') depth--;
        if (depth === 0) {
            try {
                return JSON.parse(source.slice(start, i + 1)) as T[];
            } catch {
                return [];
            }
        }
    }

    return [];
}

function extractCategoryName($: CheerioAPI, fallback: string): string {
    const title = cleanText($('title').first().text());
    if (!title) return toTitleCase(fallback);
    return title.split('-')[0]?.trim() || toTitleCase(fallback);
}

export function isBlockedPage(html: string): boolean {
    return /captcha|access denied|forbidden|verify you are|unusual traffic|cloudflare|akamai/i.test(html);
}

export function isChargeableRecord(record: SupplierLeadRecord): boolean {
    return Boolean(record.productName && record.companyName && record.city && (record.productUrl || record.companyUrl));
}

function compactRecord<T extends object>(record: T): T {
    const compact: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (typeof value === 'string' && value.trim() === '') continue;
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue;
        compact[key] = value;
    }
    return compact as unknown as T;
}

function normalizeUrl(value: string | undefined | null): string | undefined {
    if (!value) return undefined;
    try {
        const url = new URL(value, 'https://www.indiamart.com');
        url.hash = '';
        return url.toString();
    } catch {
        return undefined;
    }
}

function extractProductId(value: string | undefined): string | undefined {
    return value?.match(/-(\d+)\.html/i)?.[1];
}

function parsePrice(value: string): string | undefined {
    return normalizePrice(value);
}

function normalizePrice(value: string | undefined | null): string | undefined {
    const cleaned = cleanText(value);
    if (!cleaned) return undefined;
    return cleaned.replace(/(?:₹|â‚¹|Rs\.?)/gi, 'INR ').replace(/\s*\/\s*/, '/').replace(/\s+/g, ' ').trim();
}

function parseUnit(value: string): string | undefined {
    return cleanText(value.match(/\/\s*([A-Za-z][A-Za-z ]+)/)?.[1]);
}

function parseRating(value: string): { rating?: number; ratingCount?: number } {
    const cleaned = cleanText(value) ?? '';
    const rating = Number.parseFloat(cleaned.match(/\b([0-5](?:\.[0-9])?)\b/)?.[1] ?? '');
    const ratingCount = Number.parseInt(cleaned.match(/\(([\d,]+)\)/)?.[1]?.replace(/,/g, '') ?? '', 10);
    return {
        rating: Number.isFinite(rating) ? rating : undefined,
        ratingCount: Number.isFinite(ratingCount) ? ratingCount : undefined,
    };
}

function toBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value) === '1' || String(value).toLowerCase() === 'true';
}

function cleanText(value: string | undefined | null): string | undefined {
    if (!value) return undefined;
    const cleaned = decodeEntities(repairMojibake(value)).replace(/\s+/g, ' ').trim();
    return cleaned || undefined;
}

function decodeEntities(value: string): string {
    return value
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, '/');
}

function repairMojibake(value: string): string {
    if (!/[\u00c2\u00c3\u00e2]/.test(value)) return value;
    try {
        const repaired = Buffer.from(value, 'latin1').toString('utf8');
        return mojibakeScore(repaired) < mojibakeScore(value) ? repaired : value;
    } catch {
        return value;
    }
}

function mojibakeScore(value: string): number {
    return (value.match(/[\u00c2\u00c3\u00e2]/g) ?? []).length;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toTitleCase(value: string): string {
    return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
