<<<<<<< HEAD
# AI Administrative Assistant

Aplikasi asisten administrasi berbasis AI yang menggunakan Next.js, Tailwind CSS, dan LLM dengan RAG (Retrieval-Augmented Generation) untuk menghasilkan jawaban dan surat.

## 🏗️ Arsitektur

```
User (Website)
    ↓
Next.js + Tailwind UI
    ↓
API Route (/api/chat, /api/letter)
    ↓
LLM + RAG
    ↓
Jawaban / Surat
```

## ✨ Fitur

- 💬 **Chat Interface**: Berinteraksi dengan AI untuk mendapatkan jawaban tentang administrasi
- 📄 **Letter Generator**: Generate surat resmi dengan berbagai jenis format
- 🔍 **RAG Integration**: Menggunakan Retrieval-Augmented Generation untuk memberikan jawaban yang lebih akurat
- 🎨 **Modern UI**: Interface yang modern dan responsif menggunakan Tailwind CSS

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm atau yarn
- OpenAI API Key ([Lihat panduan lengkap cara mendapatkannya](./CARA_MENDAPATKAN_API_KEY.md))

### Installation

1. Clone repository atau download project

2. Install dependencies:
```bash
npm install
```
**Catatan**: Beberapa error TypeScript mungkin muncul sebelum menjalankan `npm install`. Setelah instalasi selesai, error tersebut akan hilang karena semua type definitions sudah terinstall.

3. Buat file `.env.local` di root directory:

   **Untuk menggunakan Ollama dengan Llama (GRATIS, Lokal, Direkomendasikan):**
   ```env
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3
   ```
   Lihat [Quick Setup Llama](./QUICK_SETUP_LLAMA.md) untuk panduan lengkap.

   **Untuk menggunakan Groq (GRATIS - Cloud):**
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

   **📖 Panduan lengkap:**
   - [Quick Setup Llama](./QUICK_SETUP_LLAMA.md) - Setup Llama dengan Ollama
   - [Setup Llama Lengkap](./SETUP_LLAMA.md) - Semua opsi untuk Llama (Ollama + Hugging Face)

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
│   │   └── letter/        # API endpoint untuk generate surat
│   ├── globals.css        # Global styles dengan Tailwind
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Halaman utama
├── components/
│   ├── ChatInterface.tsx  # Komponen chat UI
│   └── LetterGenerator.tsx # Komponen generator surat
├── lib/
│   └── llm/
│       └── rag-service.ts # Service untuk LLM dan RAG
└── package.json
```

## 🛠️ Teknologi

- **Next.js 14**: Framework React untuk production
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS framework
- **OpenAI API**: Large Language Model
- **LangChain**: Framework untuk aplikasi LLM (optional)

## 📝 API Endpoints

### POST `/api/chat`

Mengirim pesan chat dan mendapatkan jawaban dari AI.

**Request Body:**
```json
{
  "message": "Pertanyaan Anda",
  "conversationHistory": [] // Optional
}
```

**Response:**
```json
{
  "success": true,
  "response": "Jawaban dari AI"
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
  "additionalContext": "Konteks tambahan" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "letter": "Surat lengkap yang dihasilkan"
}
```

## 🔧 Konfigurasi

### Menambahkan Dokumen ke RAG

Untuk meningkatkan kualitas jawaban, Anda dapat menambahkan dokumen ke vector store. Edit file `lib/llm/rag-service.ts` dan tambahkan dokumen di fungsi `initializeVectorStore()`.

### Mengubah Model LLM

Edit file `lib/llm/rag-service.ts` dan ubah `modelName` pada inisialisasi `ChatOpenAI` atau pada pemanggilan OpenAI API.

## 🚢 Production Build

```bash
npm run build
npm start
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

=======
# OXEN-AI
Oxen AI adalah solusi cerdas untuk bisnis modern—membantu mengotomatisasi proses, menganalisis data dengan cepat, dan mengambil keputusan lebih tepat. Lebih efisien, lebih akurat, dan jelas lebih pintar (tanpa minta lembur).
>>>>>>> 7e9dfd56e5ff9a31c4730f52551954f024865589
