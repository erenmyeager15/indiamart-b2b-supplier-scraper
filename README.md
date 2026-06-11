# IndiaMART B2B Supplier Scraper - Product Leads

IndiaMART B2B Supplier Scraper extracts public supplier and product lead data from IndiaMART category pages. It collects company names, product titles, cities, URLs, images, price text when shown, verification signals, and contact-action availability. Export to JSON, CSV, Excel, or HTML, or pull via the Apify API. No login or API key is required for the public category pages used by this actor.

## What It Extracts

- Source type: organic or sponsored
- Search keyword and IndiaMART category name
- Product name and product URL
- Supplier/company name and company URL
- City, state, and address when present
- Price, currency, and unit when present
- Product image URL
- Contact-action availability and public contact number when embedded in page data
- Supplier badge, trust badges, member-since text, rating, and rating count when visible
- GST/mobile/email verification flags when embedded in page data
- Product specifications from visible category cards
- Scraped timestamp

## Use Cases

- Build India supplier lead lists for B2B sales teams
- Find manufacturers, exporters, wholesalers, and distributors by category
- Monitor supplier/product coverage across IndiaMART categories
- Enrich sourcing databases with public supplier URLs and product links
- Research pricing signals and market availability for product categories

## Pricing

| Event | Price | Per 1,000 suppliers | Per 10,000 suppliers |
| --- | ---: | ---: | ---: |
| `supplier-scraped` | $0.003 | $3.00 | $30.00 |

The actor charges only after a clean supplier lead record is saved to the dataset.

## Input

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `keywords` | string[] | `["cotton fabric"]` | Product/category keywords. Each keyword is converted to an IndiaMART category URL. |
| `location` | string | empty | Optional city page, such as `Mumbai` or `Jaipur`. Leave empty for all-India category pages. |
| `maxResults` | integer | `50` | Maximum clean supplier lead records to save. |
| `includeOrganic` | boolean | `true` | Extract visible organic supplier/product cards. |
| `includeSponsored` | boolean | `true` | Extract sponsored/all-India embedded page data when available. |
| `proxyConfiguration` | object | India residential | Proxy settings for category-page fetches. |

## How to Scrape IndiaMART Suppliers (Step by Step)

1. Enter one or more category keywords such as `cotton fabric`, `industrial pump`, or `packaging machine`.
2. Optionally enter a city, or leave location empty for all-India results.
3. Set `maxResults` and choose whether to include organic and sponsored records.
4. Run the actor and wait for the dataset to fill.
5. Export results from the Dataset tab or consume them through the Apify API.

## Sample Output

```json
{
  "sourceType": "organic",
  "keyword": "cotton fabric",
  "categoryName": "Cotton Fabric",
  "categoryUrl": "https://dir.indiamart.com/impcat/cotton-fabric.html",
  "sourceListingId": "dispId23205079862",
  "productName": "Plain/Solids Plain Cotton Fabric",
  "companyName": "Pooja Industries Private Limited",
  "city": "Ludhiana",
  "companyUrl": "https://www.poojakriscan.com/",
  "productUrl": "https://www.indiamart.com/proddetail/plain-cotton-fabric-23205079862.html",
  "price": "Rs. 130/Meter",
  "currency": "INR",
  "unit": "Meter",
  "contactActionAvailable": true,
  "supplierBadge": "Leading Supplier",
  "trustBadges": ["Verified Exporter", "9 yrs"],
  "memberSinceYears": "9 yrs",
  "rating": 3.9,
  "ratingCount": 793,
  "scrapedAt": "2026-06-12T00:00:00.000Z"
}
```

## How It Works

The actor builds public IndiaMART category URLs from your keywords, fetches the category HTML, parses embedded sponsored supplier data and visible organic product cards, deduplicates clean supplier/product leads, then saves records to the Apify Dataset.

## Known Limits

- This actor uses public category pages, not private IndiaMART lead APIs.
- Email addresses, GST numbers, and direct mobile numbers are not guaranteed and are only included when publicly embedded in page data.
- Some keywords may not map to a valid IndiaMART category slug. Try the product category wording used on IndiaMART.
- IndiaMART can change page markup or anti-bot behavior without notice.
- Location pages depend on IndiaMART URL availability for that city/category pair.

## License

Apache-2.0
