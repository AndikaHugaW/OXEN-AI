# API Logo Saham/Stock Logo API

Endpoint API untuk mendapatkan URL logo perusahaan saham yang bisa langsung digunakan di browser.

## Endpoint

```
GET /api/stock/logo?symbol={SYMBOL}
```

## Parameter

- `symbol` (required): Simbol saham (contoh: `BBCA`, `AAPL`, `TSLA`)
  - Untuk saham Indonesia: `BBCA`, `BBRI`, `TLKM`, dll
  - Untuk saham US: `AAPL`, `MSFT`, `TSLA`, dll
  - Sistem otomatis menambahkan suffix `.JK` untuk saham Indonesia

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "symbol": "BBCA",
  "logoUrl": "https://logo.clearbit.com/bca.co.id",
  "companyName": "PT Bank Central Asia Tbk",
  "source": "clearbit"
}
```

**Field:**
- `success`: `true` jika berhasil
- `symbol`: Simbol saham yang dinormalisasi (uppercase)
- `logoUrl`: URL logo yang bisa langsung digunakan di browser (`<img src={logoUrl} />`)
- `companyName`: Nama perusahaan (jika tersedia dari Yahoo Finance)
- `source`: Sumber logo (`"yahoo"`, `"clearbit"`, atau `"iex"`)

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "error": "Symbol parameter is required",
  "message": "Gunakan format: /api/stock/logo?symbol=BBCA"
}
```

### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "Logo not found",
  "message": "Tidak dapat menemukan logo untuk simbol saham BBCA",
  "symbol": "BBCA"
}
```

## Sumber Logo (Priority Order)

API mencoba berbagai sumber untuk mendapatkan logo perusahaan:

1. **Yahoo Finance Quote Summary** (`source: "yahoo"`)
   - Logo resmi dari perusahaan
   - Termasuk nama perusahaan
   - Verifikasi konten image sebelum dikembalikan

2. **Clearbit** (`source: "clearbit"`)
   - Logo dari website perusahaan
   - Tersedia untuk saham yang ada di mapping internal

3. **IEX Cloud** (`source: "iex"`)
   - Logo saham dari IEX Cloud
   - Fallback terakhir, selalu tersedia

## Contoh Penggunaan

### JavaScript/TypeScript (Fetch API)

```javascript
// Fetch logo URL
const response = await fetch('/api/stock/logo?symbol=BBCA');
const data = await response.json();

if (data.success) {
  console.log('Logo URL:', data.logoUrl);
  console.log('Company Name:', data.companyName);
  console.log('Source:', data.source);
  
  // Gunakan langsung di img tag
  document.getElementById('logo').src = data.logoUrl;
}
```

### React/Next.js

```tsx
import { useEffect, useState } from 'react';

function StockLogo({ symbol }: { symbol: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogo() {
      const response = await fetch(`/api/stock/logo?symbol=${symbol}`);
      const data = await response.json();
      
      if (data.success) {
        setLogoUrl(data.logoUrl);
        setCompanyName(data.companyName);
      }
    }
    
    fetchLogo();
  }, [symbol]);

  if (!logoUrl) return <div>Loading...</div>;

  return (
    <div>
      <img src={logoUrl} alt={`${companyName || symbol} logo`} />
      {companyName && <p>{companyName}</p>}
    </div>
  );
}
```

### HTML (Direct URL)

```html
<!-- Langsung gunakan URL di img tag -->
<img src="/api/stock/logo?symbol=BBCA" alt="BBCA Logo" />

<!-- Atau dengan JavaScript untuk mendapatkan JSON -->
<script>
  fetch('/api/stock/logo?symbol=BBCA')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById('logo').src = data.logoUrl;
      }
    });
</script>
```

### cURL

```bash
# Get logo URL for BBCA
curl "http://localhost:3000/api/stock/logo?symbol=BBCA"

# Response:
# {
#   "success": true,
#   "symbol": "BBCA",
#   "logoUrl": "https://logo.clearbit.com/bca.co.id",
#   "companyName": "PT Bank Central Asia Tbk",
#   "source": "clearbit"
# }
```

## Saham yang Didukung

### Saham Indonesia
- **Banks**: BBCA, BBRI, BMRI, BBNI, BNGA, BJBR, BTPN, BNII
- **Telecommunications**: TLKM, EXCL, ISAT
- **Consumer Goods**: ASII, UNVR, ICBP, INDF, MYOR, ROTI, ULTJ
- **Energy**: PGAS, PTBA, ADRO, MEDC, BUMI
- **Infrastructure**: JSMR, WIKA, WEGE, ADHI
- **Property**: BSDE, CTRA, DMAS
- **Mining**: ANTM, INCO
- **Others**: KLBF, GGRM, SMGR, INTP, TKIM, CPIN, SRIL, AKRA, GOTO

### Saham US
- AAPL (Apple), MSFT (Microsoft), TSLA (Tesla), GOOGL/GOOG (Google)
- AMZN (Amazon), META (Meta), NVDA (Nvidia), NFLX (Netflix)
- JPM (JPMorgan), V (Visa), MA (Mastercard), JNJ (Johnson & Johnson)
- WMT (Walmart), PG (Procter & Gamble), DIS (Disney)
- BAC (Bank of America), XOM (ExxonMobil), CVX (Chevron)
- HD (Home Depot), MCD (McDonald's), KO (Coca-Cola)
- PEP (PepsiCo), NKE (Nike)

*Catatan: Saham US lainnya mungkin tersedia melalui IEX Cloud fallback.*

## Rate Limiting

- Tidak ada rate limiting khusus untuk endpoint ini
- Menggunakan cache internal untuk mengurangi load ke external APIs
- Disarankan untuk cache response di client-side jika memungkinkan

## CORS

Endpoint ini mendukung CORS dan bisa digunakan dari client-side JavaScript.

## Catatan

- Logo URL yang dikembalikan adalah URL langsung yang bisa digunakan di browser
- Tidak perlu proxy tambahan, logo dapat di-load langsung dari URL yang dikembalikan
- Jika logo gagal load di browser, browser akan otomatis menampilkan broken image icon
- Untuk menangani error loading, gunakan `onerror` handler di img tag

