# OXEN-AI

**Oxen AI** adalah Asisten Bisnis Cerdas untuk enterprise modern. Menggabungkan **Next.js**, **Tailwind CSS**, dan **Chart-First Architecture** untuk menghadirkan visualisasi data instan, otomatisasi dokumen, dan analisis strategis yang akurat.

Dilengkapi dengan **Smart Data Parser** yang mampu mendeteksi pola data kompleks, typo, dan konteks pasar secara otomatis. Oxen AI bukan sekadar chatbot, melainkan analis data proaktif yang siap membantu Anda mengambil keputusan lebih cepat.

## 🏗️ Arsitektur

```
User (Website)
    ↓
Next.js + Tailwind UI
    ↓
API Route (/api/chat, /api/letter, /api/upload, /api/image-gen)
    ↓
LLM + RAG + Document Analysis
    ↓
Jawaban / Surat / Visualisasi / Gambar
```

## ✨ Fitur

### 💬 Chat & AI
- **Chat Interface**: Berinteraksi dengan AI untuk mendapatkan jawaban tentang bisnis dan administrasi
- **Streaming Response**: Respons cepat dengan streaming untuk pengalaman yang lebih baik
- **Gen-Z Style**: Komunikasi dengan style Gen-Z yang engaging tapi tetap professional
- **Multi-Language**: Support Bahasa Indonesia dan English

### 📊 Data Visualization & Analysis
- **Smart Data Visualization**: *Chart-First Architecture* yang memprioritaskan visualisasi data instan
- **Smart Data Parser**: Mendeteksi typo, inferensi unit otomatis, dan support format angka Indonesia
- **Market Comparison**: Otomatis mendeteksi permintaan komparasi (Pie/Line/Bar Chart)
- **Real-time Market Charts**: Candlestick dan Line chart untuk kripto dan saham

### 📄 Document Intelligence (NEW!)
- **Document Upload**: Upload file CSV, XLSX, TXT, PDF, DOCX untuk dianalisis
- **Anti-Hallucination System**: AI membaca data aktual tanpa mengarang
- **OHLC Analysis**: Analisis data saham dengan deteksi struktur otomatis
- **Financial Analyst Role**: AI berperan sebagai analis keuangan profesional
- **Smart Data Cleaning**: Otomatis menghapus baris kosong/NaN

### 🖼️ Image Generation (NEW!)
- **AI Image Generation**: Generate gambar dengan Pollinations.ai dan Gemini
- **Multiple Styles**: Support berbagai style (realistic, anime, illustration, dll.)
- **Indonesian Prompt Support**: Prompt dalam Bahasa Indonesia otomatis diterjemahkan

### 📝 Document Automation
- **Letter Generator**: Generate surat resmi dengan berbagai jenis format
- **RAG Integration**: Retrieval-Augmented Generation untuk jawaban yang lebih akurat

### 🛡️ Safety & Quality
- **Context Guard**: Mencegah "Context Bleeding" (halusinasi data antar topik)
- **AI Middleware**: Validasi semua respons AI sebelum ditampilkan
- **Symbol Detection**: Deteksi simbol kripto/saham yang cerdas (menghindari false positive)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm atau yarn
- LLM Provider API Key (OpenAI, Groq, Ollama, atau Hugging Face)
- Supabase Account (untuk RAG dan Document Storage)

### Installation

1. Clone repository atau download project

2. Install dependencies:
```bash
npm install
```

3. Buat file `.env.local` di root directory:

   **Untuk menggunakan Gemini (Direkomendasikan):**
   ```env
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   Dapatkan API key di: https://aistudio.google.com/

   **Untuk menggunakan Groq (GRATIS - Cloud, CEPAT):**
   ```env
   LLM_PROVIDER=groq
   GROQ_API_KEY=your_groq_api_key_here
   ```
   Dapatkan API key gratis di: https://console.groq.com/

   **Untuk menggunakan OpenAI:**
   ```env
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   **Supabase Configuration:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. Jalankan development server:
```bash
npm run dev
```

5. Buka browser di [http://localhost:3000](http://localhost:3000)

## 📁 Struktur Project

```
├── app/
│   ├── api/
│   │   ├── chat/          # API endpoint untuk chat
│   │   ├── letter/        # API endpoint untuk generate surat
│   │   ├── upload/        # API endpoint untuk upload dokumen (NEW!)
│   │   └── image-gen/     # API endpoint untuk generate gambar (NEW!)
│   ├── globals.css        # Global styles dengan Tailwind
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Halaman utama
├── components/
│   ├── ChatInterface.tsx  # Komponen chat UI
│   ├── ChartRenderer.tsx  # Komponen render chart
│   └── LetterGenerator.tsx # Komponen generator surat
├── lib/
│   ├── llm/
│   │   ├── providers.ts   # Multi-provider LLM support
│   │   ├── chart-generator.ts # Generator chart dari data
│   │   ├── ai-middleware.ts   # Guard layer untuk validasi AI (NEW!)
│   │   └── menu-prompts.ts    # System prompts per menu
│   ├── rag/
│   │   └── rag-service.ts # RAG service dengan anti-hallucination
│   └── tools/
│       ├── image-gen.ts   # Image generation tools (NEW!)
│       └── web-search.ts  # Web search integration (NEW!)
└── package.json
```

## 🛠️ Teknologi

- **Next.js 16**: Framework React untuk production
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS framework
- **Multi-Provider LLM**: Support OpenAI, Groq, Ollama, Hugging Face, Gemini
- **RAG (Retrieval-Augmented Generation)**: Untuk jawaban yang lebih akurat
- **Supabase**: Backend as a service untuk auth dan database
- **Streaming**: Untuk respons yang lebih cepat
- **Zod**: Schema validation untuk AI responses

## 📝 API Endpoints

### POST `/api/chat`

Mengirim pesan chat dan mendapatkan jawaban dari AI dengan streaming support.

**Request Body:**
```json
{
  "message": "Pertanyaan Anda",
  "conversationHistory": [],
  "stream": true,
  "fileIds": ["doc-uuid-1"],
  "webSearch": false,
  "imageGen": false
}
```

### POST `/api/upload` (NEW!)

Upload dan parse dokumen untuk analisis.

**Request Body:** `multipart/form-data` dengan field `file`

**Supported Formats:** PDF, DOCX, XLSX, XLS, CSV, TXT

**Response:**
```json
{
  "success": true,
  "id": "document-uuid",
  "name": "data.csv",
  "message": "Document uploaded and processed successfully"
}
```

### POST `/api/image-gen` (NEW!)

Generate gambar dengan AI.

**Request Body:**
```json
{
  "prompt": "Deskripsi gambar yang ingin dibuat",
  "style": "realistic"
}
```

### POST `/api/letter`

Generate surat resmi.

**Request Body:**
```json
{
  "letterType": "resmi",
  "recipient": "Kepala Dinas...",
  "subject": "Perihal surat",
  "content": "Isi surat",
  "additionalContext": "Konteks tambahan"
}
```

## 🔧 Konfigurasi

### Document Analysis

Untuk menganalisis dokumen:
1. Upload file menggunakan tombol "Upload Data"
2. Tunggu konfirmasi upload berhasil
3. Ajukan pertanyaan spesifik tentang data, contoh:
   - "Berapa harga tertinggi dan terendah dari data ini?"
   - "Hitung rata-rata harga Close"
   - "Apakah trennya Bullish atau Bearish?"

### Menambahkan Dokumen ke RAG

Untuk meningkatkan kualitas jawaban, Anda dapat menambahkan dokumen ke vector store. Edit file `lib/rag/rag-service.ts` dan tambahkan dokumen di fungsi `addDocument()`.

### Mengubah Model LLM

Edit file `.env.local` dan ubah `LLM_PROVIDER` atau model spesifik untuk provider yang dipilih.

## 🚢 Production Build

```bash
npm run build
npm start
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📅 Recent Updates

### v2.0.0 (December 2024)
- ✨ **Document Intelligence**: Upload dan analisis file CSV, XLSX, PDF, DOCX
- 🛡️ **Anti-Hallucination System**: AI tidak lagi mengarang data
- 🖼️ **Image Generation**: Generate gambar dengan Pollinations.ai dan Gemini
- 🔧 **Smart Symbol Detection**: Menghindari false positive untuk kata Indonesia (ada, sol, dot)
- 📊 **Improved Chart Display**: Chart hanya muncul untuk permintaan eksplisit
- 🎯 **Financial Analyst Role**: AI berperan sebagai analis keuangan untuk data OHLC
