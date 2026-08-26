# IndiaMART Product & Supplier Scraper

Extract structured product and supplier listing facts from public IndiaMART pages. Search by category keyword, fan out across optional city lists for deeper coverage, and optionally enrich each row from its public product or company page.

No login or API key is required. The Actor does not extract phone numbers, email addresses, GST numbers, or personal contact details.

## What It Extracts

- Product and company names
- Product and company URLs
- Category keyword and listing type
- City and state
- Price, currency, unit, and minimum order quantity when available
- Product image URL and specifications
- Supplier badge, trust badges, member-since text, rating, and rating count
- GST, mobile, and email verification status as boolean badges only
- Scrape timestamp
- Optional public business address and clearly labelled official company website/domain
- `detailStatus` showing whether the row is listing-only or successfully enriched

Missing source values are omitted. The Actor never invents prices, ratings, verification status, or contact information.

## Input

| Field | Required | Default | Description |
| --- | --- | --- | --- |
| `keywords` | Yes | `["cotton fabric"]` | IndiaMART category keywords. |
| `location` | No | empty | Legacy single-city input retained for existing integrations. |
| `locations` | No | `[]` | Up to 20 cities to fan out every keyword across for deeper deduplicated coverage. |
| `maxResults` | No | `5` | Maximum records saved across all keywords. |
| `includeOrganic` | No | `true` | Include visible organic category cards. |
| `includeSponsored` | No | `true` | Include embedded sponsored/all-India records. |
| `includeDetails` | No | `false` | Enrich public specifications, ratings, business address, and official website/domain when available. |
| `proxyConfiguration` | No | Residential India | Proxy used for public category-page access. |

## Example Input

```json
{
  "keywords": ["cotton fabric"],
  "locations": ["Surat", "Jaipur"],
  "maxResults": 5,
  "includeOrganic": true,
  "includeSponsored": true,
  "includeDetails": false,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "IN"
  }
}
```

## Example Output

```json
{
  "sourceType": "organic",
  "keyword": "cotton fabric",
  "categoryName": "Cotton Fabric",
  "sourceListingId": "dispId23205079862",
  "productName": "Plain Cotton Fabric",
  "companyName": "Example Textiles Private Limited",
  "city": "Ludhiana",
  "state": "Punjab",
  "productUrl": "https://www.indiamart.com/proddetail/plain-cotton-fabric-23205079862.html",
  "companyUrl": "https://www.indiamart.com/example-textiles/",
  "imageUrl": "https://5.imimg.com/data5/example-500x500.jpg",
  "price": "INR 130/Meter",
  "currency": "INR",
  "unit": "Meter",
  "supplierBadge": "Leading Supplier",
  "trustBadges": ["Verified Exporter", "9 yrs"],
  "rating": 3.9,
  "ratingCount": 793,
  "gstVerified": true,
  "contactActionAvailable": true,
  "publicBusinessAddress": "Textile Market, Ludhiana, Punjab",
  "officialWebsite": "https://www.example-textiles.com/",
  "officialDomain": "example-textiles.com",
  "detailStatus": "enriched",
  "scrapedAt": "2026-07-13T00:00:00.000Z"
}
```

Example values are illustrative. Actual output comes from the live public source.

## Billing and Spending Limits

The Actor uses Pay Per Event pricing: `$0.002` for a clean listing-only `supplier-scraped` row and `$0.004` only when `includeDetails` produces a materially enriched `supplier-enriched` row. If a detail request adds nothing, the row stays listing-only and uses the lower event. Each row is saved and charged atomically. Failed requests, blocked pages, invalid categories, and empty responses do not trigger a result event.

## Use Cases

- Compare public product and price signals by category
- Build auditable supplier shortlists for sourcing research
- Monitor category coverage, MOQ, and verification badges
- Feed structured public business-listing facts into spreadsheets, reports, APIs, and AI workflows

## Known Limits

- IndiaMART may change its category markup or anti-bot behavior without notice.
- Some keywords do not map directly to an IndiaMART category slug.
- Prices, MOQ, ratings, and badges are returned only when present on the source page.
- City/category URL combinations depend on IndiaMART's public URL structure.
- Deeper coverage uses explicit city fan-out because anonymous IndiaMART category pages may expose only limited listings per city/category combination.
- Detail enrichment never returns phone numbers, emails, contact-person names, directors, proprietors, or personal profiles.
- This Actor is not affiliated with IndiaMART.

## Responsible Use

Use this Actor only for lawful collection of public, non-personal business-listing information. Follow IndiaMART's terms, robots.txt, applicable privacy laws, India's DPDP Act, and local regulations. Do not use the output for spam, harassment, or unlawful profiling.

## License

Apache-2.0. See `LICENSE`.
