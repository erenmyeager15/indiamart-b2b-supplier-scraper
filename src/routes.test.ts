import { describe, expect, it } from 'vitest';
import { interpretChargeResult } from './billing.js';
import { buildCategoryUrl, isBlockedPage, parseIndiaMartDetailPage, parseIndiaMartPage } from './routes.js';

describe('atomic billing decisions', () => {
    it('counts a charged saved row', () => {
        expect(interpretChargeResult({ chargedCount: 1, eventChargeLimitReached: false }))
            .toEqual({ recordWasSaved: true, limitReached: false });
    });

    it('stops without counting when the spending limit rejects the row', () => {
        expect(interpretChargeResult({ chargedCount: 0, eventChargeLimitReached: true }))
            .toEqual({ recordWasSaved: false, limitReached: true });
    });

    it('counts pre-pricing dataset writes when no limit was reached', () => {
        expect(interpretChargeResult({ chargedCount: 0, eventChargeLimitReached: false }))
            .toEqual({ recordWasSaved: true, limitReached: false });
    });
});

describe('IndiaMART URL and response guards', () => {
    it('builds all-India and city category URLs', () => {
        expect(buildCategoryUrl('Cotton Fabric', '')).toBe('https://dir.indiamart.com/impcat/cotton-fabric.html');
        expect(buildCategoryUrl('Industrial Pump', 'Mumbai')).toBe('https://dir.indiamart.com/mumbai/industrial-pump.html');
    });

    it('detects common challenge responses', () => {
        expect(isBlockedPage('<title>Access Denied</title>')).toBe(true);
        expect(isBlockedPage('<html><title>Cotton Fabric</title></html>')).toBe(false);
    });
});

describe('IndiaMART page parser', () => {
    const html = `
        <html>
          <head><title>Cotton Fabric - IndiaMART</title></head>
          <body>
            <script>
              window.__DATA__ = {"plaAllIndiaData":[{
                "DISPLAY_ID":"sponsored-1",
                "PC_ITEM_DISPLAY_NAME":"Cotton Jersey Fabric",
                "COMPANYNAME":"Example Textiles",
                "CITY_NAME":"Surat",
                "STATE_NAME":"Gujarat",
                "PC_ITEM_URL":"https://www.indiamart.com/proddetail/cotton-jersey-fabric-123.html",
                "COMPANY_URL":"https://www.indiamart.com/example-textiles/",
                "PRICE_SEO":"Rs. 90 / Meter",
                "GST_VERIFIED_FLAG":"1",
                "CONTACT_NUMBER":"redacted"
              }]};
            </script>
            <article class="template7-product-card">
              <a class="template7-product-name" href="/proddetail/plain-cotton-fabric-456.html">Plain Cotton Fabric</a>
              <a class="template7-seller-name" href="https://www.indiamart.com/sample-fabrics/">Sample Fabrics</a>
              <address><span>Jaipur</span></address>
              <div class="template7-card-meta">Rs. 120 / Meter</div>
              <button class="contact-supplier-btn" id="organic-1">Contact supplier</button>
              <span class="dag5">4.3 (28)</span>
            </article>
          </body>
        </html>`;

    it('maps sponsored and organic business listing rows', () => {
        const records = parseIndiaMartPage(
            html,
            'cotton fabric',
            'https://dir.indiamart.com/impcat/cotton-fabric.html',
            true,
            true,
            '2026-07-13T00:00:00.000Z',
        );

        expect(records).toHaveLength(2);
        expect(records[0]).toMatchObject({
            sourceType: 'sponsored',
            productName: 'Cotton Jersey Fabric',
            companyName: 'Example Textiles',
            city: 'Surat',
            price: 'INR 90/Meter',
            gstVerified: true,
        });
        expect(records[1]).toMatchObject({
            sourceType: 'organic',
            productName: 'Plain Cotton Fabric',
            companyName: 'Sample Fabrics',
            city: 'Jaipur',
            rating: 4.3,
            ratingCount: 28,
        });
        expect(JSON.stringify(records)).not.toContain('redacted');
        expect(records.every((record) => !('address' in record) && !('phone' in record) && !('email' in record))).toBe(true);
    });

    it('respects source toggles', () => {
        const records = parseIndiaMartPage(
            html,
            'cotton fabric',
            'https://dir.indiamart.com/impcat/cotton-fabric.html',
            false,
            true,
        );
        expect(records).toHaveLength(1);
        expect(records[0].sourceType).toBe('sponsored');
    });

    it('recovers business records from renamed embedded listing data', () => {
        const embeddedHtml = `
            <html><head><title>Cotton Fabric - IndiaMART</title></head><body><script>
            window.listingState = {"items":[{"productId":"789","productName":"Printed Cotton Fabric",
            "companyName":"Modern Textiles","cityName":"Surat","stateName":"Gujarat",
            "productUrl":"https://www.indiamart.com/proddetail/printed-cotton-fabric-789.html",
            "companyUrl":"https://www.indiamart.com/modern-textiles/","priceText":"Rs. 80 / Meter"}]};
            </script></body></html>`;

        const records = parseIndiaMartPage(
            embeddedHtml,
            'cotton fabric',
            'https://dir.indiamart.com/impcat/cotton-fabric.html',
            true,
            true,
            '2026-08-26T00:00:00.000Z',
        );

        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
            productName: 'Printed Cotton Fabric',
            companyName: 'Modern Textiles',
            city: 'Surat',
            state: 'Gujarat',
            price: 'INR 80/Meter',
        });
    });

    it('enriches public business facts without copying personal contact fields', () => {
        const detailHtml = `
          <html><body>
            <script type="application/ld+json">{
              "@type":"Product","name":"Premium Cotton Fabric",
              "url":"https://www.indiamart.com/proddetail/premium-cotton-fabric-789.html",
              "aggregateRating":{"ratingValue":"4.6","ratingCount":"245"},
              "additionalProperty":[
                {"@type":"PropertyValue","name":"GSM","value":"180"},
                {"@type":"PropertyValue","name":"Contact Person","value":"Private Name"}
              ]
            }</script>
            <script type="application/ld+json">{
              "@type":"Organization","name":"Modern Textiles",
              "telephone":"+91 9999999999","email":"private@example.com",
              "address":{"streetAddress":"Textile Market","addressLocality":"Surat","addressRegion":"Gujarat","postalCode":"395002"}
            }</script>
            <a href="https://moderntextiles.example/about">Visit company website</a>
          </body></html>`;
        const record = parseIndiaMartDetailPage(detailHtml, {
            sourceType: 'organic', keyword: 'cotton fabric', categoryName: 'Cotton Fabric',
            categoryUrl: 'https://dir.indiamart.com/impcat/cotton-fabric.html', sourceListingId: '789',
            productName: 'Cotton Fabric', companyName: 'Modern Textiles', city: 'Surat',
            productUrl: 'https://www.indiamart.com/proddetail/cotton-fabric-789.html',
            scrapedAt: '2026-08-26T00:00:00.000Z', detailStatus: 'listing-only',
        });

        expect(record).toMatchObject({
            productName: 'Premium Cotton Fabric', rating: 4.6, ratingCount: 245,
            publicBusinessAddress: 'Textile Market, Surat, Gujarat, 395002',
            officialWebsite: 'https://moderntextiles.example/about',
            officialDomain: 'moderntextiles.example', detailStatus: 'enriched',
            specifications: { GSM: '180' },
        });
        expect(JSON.stringify(record)).not.toContain('9999999999');
        expect(JSON.stringify(record)).not.toContain('private@example.com');
        expect(JSON.stringify(record)).not.toContain('Private Name');
    });
});
