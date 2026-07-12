# IndiaMART Product & Supplier Scraper

Extract structured product and supplier listing facts from public IndiaMART category pages. Search by category keyword and optional city, then export company names, products, prices, MOQ, ratings, verification badges, images, specifications, and source URLs to JSON, CSV, Excel, HTML, or the Apify API.

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

Missing source values are omitted. The Actor never invents prices, ratings, verification status, or contact information.

## Input

| Field | Required | Default | Description |
| --- | --- | --- | --- |
| `keywords` | Yes | `["cotton fabric"]` | IndiaMART category keywords. |
| `location` | No | empty | Optional city such as Mumbai or Jaipur. |
| `maxResults` | No | `5` | Maximum records saved across all keywords. |
| `includeOrganic` | No | `true` | Include visible organic category cards. |
| `includeSponsored` | No | `true` | Include embedded sponsored/all-India records. |
| `proxyConfiguration` | No | Residential India | Proxy used for public category-page access. |

## Example Input

```json
{
  "keywords": ["cotton fabric"],
  "location": "",
  "maxResults": 5,
  "includeOrganic": true,
  "includeSponsored": true,
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
  "companyUrl": "https://www.example-textiles.com/",
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
  "scrapedAt": "2026-07-13T00:00:00.000Z"
}
```

Example values are illustrative. Actual output comes from the live public source.

## Billing and Spending Limits

The Actor keeps the existing Pay Per Event price of `$0.003` per saved `supplier-scraped` record. Each row is saved and charged atomically. Failed requests, blocked pages, invalid categories, and empty responses do not trigger the primary event. The run stops immediately when the user's spending limit is reached.

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
- This Actor is not affiliated with IndiaMART.

## Responsible Use

Use this Actor only for lawful collection of public, non-personal business-listing information. Follow IndiaMART's terms, robots.txt, applicable privacy laws, India's DPDP Act, and local regulations. Do not use the output for spam, harassment, or unlawful profiling.

## License

Apache-2.0. See `LICENSE`.
