# WhatsApp Webhook API

API untuk mengirim pesan WhatsApp menggunakan Baileys. Mendukung koneksi melalui QR code dan auto-reconnect.

## Fitur

- Koneksi WhatsApp via QR Code
- Auto-reconnect menggunakan session yang tersimpan
- Kirim pesan teks
- Status koneksi real-time
- API Key authentication
- Session management
- Support multi-device (1 device per nomor)

## Requirements

- Node.js 18+ 
- npm atau yarn
- WhatsApp account

## Instalasi

1. Clone atau download project
2. Install dependencies:
```bash
npm install
```

3. Buat file `.env` di root directory:
```env
PORT=3000
API_KEY=your-api-key-here
```

## Menjalankan

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Menggunakan PM2
```bash
pm2 start server.js --name wa
pm2 save
pm2 startup
```

## API Endpoints

### Health Check
```
GET /health
```
Tidak memerlukan authentication.

### Status Koneksi
```
GET /api/status
Headers: api-key: your-api-key
```
Mengembalikan status koneksi WhatsApp, session, dan informasi terkait.

### Ambil QR Code
```
GET /api/qr
Headers: api-key: your-api-key
```
Mengembalikan QR code untuk koneksi WhatsApp (base64 image).

### Connect WhatsApp
```
POST /api/connect
Headers: api-key: your-api-key
Content-Type: application/json

Body:
{
  "phoneNumber": "6281234567890" // optional, kosongkan untuk reconnect session yang ada
}
```

### Disconnect WhatsApp
```
POST /api/disconnect
Headers: api-key: your-api-key
```

### Kirim Pesan
```
POST /api/send-message
Headers: api-key: your-api-key
Content-Type: application/json

Body:
{
  "to": "6281234567890",
  "message": "Pesan yang ingin dikirim"
}
```

## Contoh Penggunaan

### Cek Status
```bash
curl -X GET http://localhost:3000/api/status \
  -H "api-key: your-api-key"
```

### Connect WhatsApp
```bash
curl -X POST http://localhost:3000/api/connect \
  -H "api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "6281234567890"}'
```

### Ambil QR Code
```bash
curl -X GET http://localhost:3000/api/qr \
  -H "api-key: your-api-key"
```

### Kirim Pesan
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "6281234567890",
    "message": "Hello from API"
  }'
```

## Format Nomor Telepon

Nomor telepon akan otomatis di-format ke format WhatsApp JID:
- Input: `081234567890` → Output: `6281234567890@s.whatsapp.net`
- Input: `6281234567890` → Output: `6281234567890@s.whatsapp.net`
- Input yang sudah format JID akan digunakan langsung

## Session Management

- Session WhatsApp disimpan di folder `AutoFtBot69/`
- Session akan otomatis digunakan saat restart aplikasi
- Hanya 1 device per nomor yang bisa terhubung
- Untuk ganti nomor, disconnect dulu kemudian connect dengan nomor baru

## Deploy ke VPS

1. Upload file ke VPS menggunakan SCP atau RSYNC:
```bash
scp -r . user@139.59.255.74:/root/WEBHOOK\ WA/
```

2. SSH ke VPS:
```bash
ssh user@139.59.255.74
```

3. Install dependencies:
```bash
cd "/root/WEBHOOK WA"
npm install
```

4. Buat file `.env`:
```bash
nano .env
```

5. Jalankan dengan PM2:
```bash
pm2 start server.js --name wa
pm2 save
pm2 startup
```

## Troubleshooting

### QR Code tidak muncul
- Pastikan aplikasi belum terhubung (cek `/api/status`)
- Tunggu beberapa detik setelah request `/api/qr`
- Cek logs dengan `pm2 logs wa`

### Pesan tidak terkirim
- Pastikan WhatsApp sudah terhubung dan ready (cek `/api/status`)
- Pastikan nomor tujuan valid dan terdaftar di WhatsApp
- Cek logs untuk error detail

### Session tidak tersimpan
- Pastikan folder `AutoFtBot69/` ada dan writable
- Cek permission folder
- Cek logs untuk error

### Koneksi terputus
- WhatsApp akan auto-reconnect jika session masih valid
- Jika tidak bisa reconnect, scan QR code lagi
- Pastikan koneksi internet stabil

## Struktur Project

```
WEBHOOK WA/
├── server.js              # Main server file
├── whatsapp.js            # WhatsApp connection handler
├── middleware/
│   └── auth.js           # API key authentication
├── utils/
│   └── logger.js         # Logging utility
├── AutoFtBot69/          # WhatsApp session storage
├── package.json
└── .env                  # Environment variables
```

## License

MIT

# WhatsApp-Webhook-API
