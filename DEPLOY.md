# Panduan Deploy

## Workflow Git

### 1. Push Code ke Repository

```bash
# Add semua file
git add .

# Commit dengan pesan
git commit -m "Initial commit: WhatsApp Webhook API"

# Push ke remote
git push origin main
```

### 2. Update Code (jika ada perubahan)

```bash
# Add file yang diubah
git add .

# Commit
git commit -m "Update: deskripsi perubahan"

# Push
git push origin main
```

## Deploy ke VPS

### Opsi 1: Clone dari Git (Recommended)

```bash
# SSH ke VPS
ssh root@139.59.255.74

# Clone repository
cd /root
git clone <repository-url> "WEBHOOK WA"
cd "WEBHOOK WA"

# Install dependencies
npm install

# Buat file .env
nano .env
# Isi dengan:
# PORT=3000
# API_KEY=your-api-key

# Jalankan dengan PM2
pm2 start server.js --name wa
pm2 save
pm2 startup
```

### Opsi 2: Upload dengan SCP

```bash
# Dari local machine, upload file ke VPS
scp -r . root@139.59.255.74:/root/WEBHOOK\ WA/

# SSH ke VPS
ssh root@139.59.255.74

# Masuk ke directory
cd "/root/WEBHOOK WA"

# Install dependencies
npm install

# Buat file .env
nano .env

# Jalankan dengan PM2
pm2 start server.js --name wa
pm2 save
pm2 startup
```

### Opsi 3: Update Code dari Git (jika sudah clone)

```bash
# SSH ke VPS
ssh root@139.59.255.74

# Masuk ke directory
cd "/root/WEBHOOK WA"

# Pull update terbaru
git pull origin main

# Install dependencies baru (jika ada)
npm install

# Restart PM2
pm2 restart wa
```

## Command PM2

```bash
# Lihat status
pm2 status

# Lihat logs
pm2 logs wa

# Lihat logs real-time
pm2 logs wa --lines 50

# Restart
pm2 restart wa

# Stop
pm2 stop wa

# Delete
pm2 delete wa

# Monitor
pm2 monit

# Save process list
pm2 save

# Setup auto-start saat boot
pm2 startup
```

## File yang Perlu Diperhatikan

- `.env` - Jangan commit ke git (sudah ada di .gitignore)
- `AutoFtBot69/` - Folder session, jangan commit ke git
- `node_modules/` - Jangan commit ke git
- `*.log` - File log, jangan commit ke git

## Troubleshooting

### PM2 tidak start
- Pastikan Node.js sudah terinstall: `node -v`
- Pastikan dependencies sudah terinstall: `npm install`
- Cek error: `pm2 logs wa`

### Port sudah digunakan
- Cek port yang digunakan: `netstat -tulpn | grep 3000`
- Kill process yang menggunakan port: `kill -9 <PID>`
- Atau ubah PORT di file `.env`

### Permission denied
- Pastikan user memiliki permission ke folder
- Cek permission: `ls -la`
- Ubah permission jika perlu: `chmod -R 755 .`

### Session tidak tersimpan
- Pastikan folder `AutoFtBot69/` ada
- Cek permission folder: `chmod -R 755 AutoFtBot69/`
- Cek logs untuk error

