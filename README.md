# AI Chat Web 🤖

Web chat AI multi-model yang bisa kamu deploy sendiri di Vercel. Mendukung banyak model sekaligus dengan sistem hybrid API key.

## Fitur

- **Multi-model** — Claude, GPT-4o, Gemini, DeepSeek, Mistral
- **4 mode** — Chat, Coding (syntax highlight), Reasoning, Image Generation
- **Hybrid API key** — default dari server (Vercel env), bisa override dari UI
- **Streaming** — response muncul real-time kata per kata
- **Dark mode** — toggle light/dark
- **Export chat** — simpan percakapan sebagai .txt
- **Responsive** — bekerja di desktop dan mobile

## Stack

- **Framework**: Next.js 14 (App Router)
- **Hosting**: Vercel (gratis)
- **Styling**: Tailwind CSS
- **Markdown**: react-markdown + remark-gfm
- **Syntax highlight**: react-syntax-highlighter

---

## Cara Deploy ke Vercel

### 1. Fork / clone repo ini

```bash
git clone https://github.com/USERNAME/ai-chat-web.git
cd ai-chat-web
npm install
```

### 2. Setup environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` dan isi API key yang kamu punya:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
```

Tidak perlu isi semua — cukup yang kamu punya.

### 3. Test di lokal

```bash
npm run dev
```

Buka http://localhost:3000

### 4. Push ke GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 5. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → New Project
2. Import repo GitHub kamu
3. Buka **Settings → Environment Variables**
4. Tambahkan key yang sama seperti di `.env.local`
5. Klik **Deploy**

Selesai! Web kamu langsung live di `https://nama-project.vercel.app`

---

## Cara Tambah/Ganti API Key dari UI

1. Klik **API Keys & Settings** di sidebar bawah
2. Masukkan API key di field provider yang diinginkan
3. Klik **Simpan**

Key tersimpan di `localStorage` browser kamu — tidak dikirim ke server, hanya dipakai saat request ke AI provider.

**Urutan prioritas key:**
```
Override dari UI > Vercel environment variable
```

---

## Tambah Model Baru

Edit file `lib/models.js`, tambahkan di bagian `PROVIDERS`:

```js
newprovider: {
  id: 'newprovider',
  name: 'Provider Baru',
  envKey: 'NEWPROVIDER_API_KEY',
  baseUrl: 'https://api.newprovider.com/v1',
  models: [
    { id: 'model-id', name: 'Nama Model', modes: ['chat', 'coding'] },
  ],
  supportsImages: false,
  supportsImageGen: false,
},
```

Lalu di `lib/llm.js`, tambahkan case di fungsi `streamChat` jika format API-nya berbeda dari OpenAI.

---

## Struktur File

```
ai-chat-web/
├── app/
│   ├── api/
│   │   ├── chat/route.js      ← Streaming endpoint utama
│   │   └── models/route.js    ← Cek provider aktif
│   ├── globals.css
│   ├── layout.js
│   └── page.js                ← Halaman chat utama
├── components/
│   ├── CodeBlock.jsx          ← Syntax highlighted code
│   ├── MessageRenderer.jsx    ← Render markdown
│   ├── ModelSelector.jsx      ← Dropdown model & mode
│   ├── SettingsModal.jsx      ← API key management
│   └── Sidebar.jsx            ← Riwayat chat
├── lib/
│   ├── llm.js                 ← Logic panggil semua LLM API
│   └── models.js              ← Daftar model & system prompts
├── .env.example               ← Template env vars
└── .gitignore
```

---

## Provider yang Didukung

| Provider | Model | Chat | Coding | Reasoning | Image Gen |
|---|---|---|---|---|---|
| OpenAI | GPT-4o, GPT-4o Mini, o1 | ✅ | ✅ | ✅ | ✅ DALL-E 3 |
| Anthropic | Claude Sonnet 4, Opus 4, Haiku | ✅ | ✅ | ✅ | ❌ |
| Google | Gemini 2.5 Pro, Flash | ✅ | ✅ | ✅ | ✅ Imagen 3 |
| DeepSeek | V3, R1 | ✅ | ✅ | ✅ | ❌ |
| Mistral | Large, Codestral | ✅ | ✅ | ❌ | ❌ |

---

## Lisensi

MIT — bebas digunakan dan dimodifikasi.
