export interface ActorInput {
    keywords: string[];
    location: string;
    maxResults: number;
    includeOrganic: boolean;
    includeSponsored: boolean;
    proxyConfiguration?: {
        useApifyProxy?: boolean;
        apifyProxyGroups?: string[];
        apifyProxyCountry?: string;
        proxyUrls?: string[];
    };
}

export interface SupplierLeadRecord {
    sourceType: 'organic' | 'sponsored';
    keyword: string;
    categoryName: string;
    categoryUrl: string;
    sourceListingId: string;
    productName: string;
    companyName: string;
    city: string;
    scrapedAt: string;
    companyUrl?: string;
    productUrl?: string;
    imageUrl?: string;
    price?: string;
    currency?: string;
    unit?: string;
    state?: string;
    address?: string;
    contactNumber?: string;
    contactActionAvailable?: boolean;
    supplierBadge?: string;
    trustBadges?: string[];
    memberSinceYears?: string;
    rating?: number;
    ratingCount?: number;
    gstVerified?: boolean;
    mobileVerified?: boolean;
    emailVerified?: boolean;
    minOrderQuantity?: string;
    specifications?: Record<string, string>;
}

export interface FetchOptions {
    dispatcher?: unknown;
    timeoutMs: number;
}

export interface IndiaMartPlaItem {
    CITY_NAME?: string;
    COMPANYNAME?: string;
    COMPANY_URL?: string;
    CONTACT_NUMBER?: string;
    CURRENCY?: string;
    DISPLAY_ID?: string | number;
    EMAIL_VERIFIED?: string | number;
    GLCAT_MCAT_NAME?: string;
    GST_VERIFIED_FLAG?: string | number;
    IMAGE_250X250?: string;
    IMAGE_500X500?: string;
    IMAGE_ORIGINAL?: string;
    ISQ_RESPONSE?: unknown;
    ITEM_ID?: string | number;
    ITEM_NAME?: string;
    LONG_ADDRESS?: string;
    MOBILE_VERIFIED?: string | number;
    PC_ITEM_DISPLAY_NAME?: string;
    PC_ITEM_URL?: string;
    PDP_URL?: string;
    PRD_SEARCH_MIN_ORDER_QUANTITY?: string;
    PRICE?: string | number;
    PRICE_F?: string;
    PRICE_SEO?: string;
    SHORT_ADDRESS?: string;
    STATE_NAME?: string;
    UNIT?: string;
}
