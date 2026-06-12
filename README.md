# IndiaMART B2B Supplier Scraper - Product Leads

IndiaMART B2B Supplier Scraper extracts public supplier and product listing data from IndiaMART category pages. It collects company names, product titles, cities, URLs, images, price text when shown, verification signals, and contact-action availability. Export to JSON, CSV, Excel, or HTML, or pull via the Apify API. No login or API key is required for the public category pages used by this actor.

## What It Extracts

- Source type: organic or sponsored
- Search keyword and IndiaMART category name
- Product name and product URL
- Supplier/company name and company URL
- City, state, and address when present
- Price, currency, and unit when present
- Product image URL
- Contact-action availability (a boolean flag only; no phone numbers or emails are extracted)
- Supplier badge, trust badges, member-since text, rating, and rating count when visible
- GST/mobile/email verification flags (boolean badges only; no underlying numbers or emails) when embedded in page data
- Product specifications from visible category cards
- Scraped timestamp

## Use Cases

- Build India supplier directories for B2B market research
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
  "sourceType": "sponsored",
  "keyword": "cotton fabric",
  "categoryName": "Cotton Fabric",
  "categoryUrl": "https://dir.indiamart.com/impcat/cotton-fabric.html",
  "sourceListingId": "2859307971312",
  "productName": "Cotton Jersey Fabric Material, GSM (Fabric Weight): 180GSM, 60x40",
  "companyName": "Shengtu Enterprises",
  "city": "Valsad",
  "state": "Gujarat",
  "address": "Valsad, Gujarat",
  "companyUrl": "https://www.indiamart.com/shengtuenterprises/",
  "productUrl": "https://www.indiamart.com/proddetail/cotton-jersey-fabric-material-2859307971312.html",
  "imageUrl": "https://5.imimg.com/data5/SELLER/Default/2026/5/612145025/LX/HI/TN/154409241/cotton-jersey-fabric-material-500x500.jpg",
  "price": "INR 58/Meter",
  "currency": "INR",
  "unit": "Meter",
  "contactActionAvailable": true,
  "gstVerified": true,
  "mobileVerified": true,
  "emailVerified": true,
  "scrapedAt": "2026-06-12T20:17:33.721Z"
}
```

## How It Works

The actor builds public IndiaMART category URLs from your keywords, fetches the category HTML, parses embedded sponsored supplier data and visible organic product cards, deduplicates clean supplier/product leads, then saves records to the Apify Dataset.

## Known Limits

- This actor uses public category pages, not private IndiaMART lead APIs.
- This actor outputs only non-personal business listing facts. It does not extract phone numbers, emails, GST numbers, or personal contact details; verification fields are boolean badges only.
- Some keywords may not map to a valid IndiaMART category slug. Try the product category wording used on IndiaMART.
- IndiaMART can change page markup or anti-bot behavior without notice.
- Location pages depend on IndiaMART URL availability for that city/category pair.

## Responsible Use

This Actor is intended for lawful collection of publicly available information only. Users are responsible for ensuring their use complies with the source website's terms, robots.txt, applicable privacy laws, including India's DPDP Act, and all local regulations.

Do not use this Actor to collect, store, sell, or misuse personal data without a lawful basis. The Actor author is not responsible for misuse by end users.

## License

Apache-2.0
