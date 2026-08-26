import { describe, expect, it } from 'vitest';
import { interpretChargeResult } from './billing.js';
import { buildCategoryUrl, isBlockedPage, parseIndiaMartPage } from './routes.js';

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
});
