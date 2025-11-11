import express from 'express';
import cors from 'cors';
import { createWhatsAppConnection, checkSessionExists, getConnectedNumber } from './whatsapp.js';
import { apiKeyAuth } from './middleware/auth.js';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const API_KEY = process.env.API_KEY;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'api-key'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const state = {
  sock: null,
  isConnected: false,
  isReady: false,
  currentQR: null,
  status: 'disconnected',
  error: null,
  hasReconnected: false,
  phoneNumber: null
};

const formatPhoneNumber = (number) => {
  if (!number || number.includes('@')) return number;
  let cleaned = number.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
  else if (!cleaned.startsWith('62') && cleaned.length <= 10) cleaned = '62' + cleaned;
  return `${cleaned}@s.whatsapp.net`;
};

const getBaseNumber = (number) => number?.split(':')[0] || number;
const extractNumber = (jid) => jid?.replace('@s.whatsapp.net', '') || null;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isSocketReady = () => state.sock?.user?.id;

const loadExistingSession = async () => {
  try {
    if (!(await checkSessionExists())) return null;
    const savedNumber = await getConnectedNumber();
    if (savedNumber) {
      state.phoneNumber = savedNumber;
      logger.whatsapp(`Session ditemukan untuk nomor: ${savedNumber}`);
    }
    return savedNumber;
  } catch (error) {
    logger.error('Gagal load session:', error.message);
    return null;
  }
};

const autoConnectIfSessionExists = async () => {
  try {
    const savedNumber = await loadExistingSession();
    if (!savedNumber) return;
    logger.connection(`Auto-connect ke session: ${savedNumber}`);
    await initWhatsApp();
    await sleep(5000);
    if (state.isConnected && state.isReady) {
      logger.success('Auto-connected berhasil! Siap kirim pesan.');
    } else if (state.isConnected) {
      logger.info('Auto-connected, menunggu koneksi stabil...');
    }
  } catch (error) {
    logger.error('Gagal auto-connect:', error.message);
  }
};

const markReady = () => {
  state.isReady = true;
  const message = state.hasReconnected ? 'WhatsApp reconnect dan siap!' : 'WhatsApp terhubung dan siap kirim pesan!';
  logger.success(message);
  state.hasReconnected = true;
};

const initWhatsApp = async () => {
  try {
    state.status = 'connecting';
    state.currentQR = null;
    state.error = null;
    
    state.sock = await createWhatsAppConnection(
      async (connected) => {
        state.isConnected = connected;
        state.status = connected ? 'connected' : 'disconnected';
        state.isReady = false;
        
        if (connected && state.sock?.user?.id) {
          state.currentQR = null;
          state.phoneNumber = extractNumber(state.sock.user.id);
          logger.whatsapp(`Terhubung ke WhatsApp: ${state.phoneNumber}`);
          
          const checkReady = setInterval(() => {
            if (isSocketReady() && state.isConnected) {
              clearInterval(checkReady);
              markReady();
            }
          }, 500);
          
          setTimeout(() => {
            clearInterval(checkReady);
            if (state.isConnected && isSocketReady() && !state.isReady) {
              state.isReady = true;
              logger.success('Koneksi WhatsApp siap (timeout check)');
            }
          }, 10000);
        }
      },
      (qr) => {
        state.currentQR = qr;
        state.status = 'connecting';
      },
      (error) => {
        state.error = error;
        state.status = 'disconnected';
      }
    );
  } catch (error) {
    logger.error('Gagal connect WhatsApp:', error.message);
    state.isConnected = false;
    state.status = 'disconnected';
    state.error = error.message;
  }
};

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp_connected: state.isConnected,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', apiKeyAuth, async (req, res) => {
  try {
    const [sessionExists, savedNumber] = await Promise.all([
      checkSessionExists(),
      getConnectedNumber()
    ]);
    const socketReady = isSocketReady();
    
    res.json({
      connected: state.isConnected,
      ready: state.isReady && socketReady,
      status: state.status,
      hasQR: state.currentQR !== null,
      error: state.error,
      sessionExists,
      connectedNumber: state.phoneNumber || savedNumber,
      socketReady,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Gagal get status:', error.message);
    res.status(500).json({ error: 'Gagal get status', message: error.message });
  }
});

app.get('/api/qr', apiKeyAuth, async (req, res) => {
  try {
    if (state.isConnected) {
      return res.json({ success: true, connected: true, message: 'Sudah terhubung, tidak perlu QR code', qr: null });
    }

    if (!state.currentQR) {
      if (!state.sock || state.status === 'disconnected') initWhatsApp();
      return res.json({ success: false, connected: false, message: 'QR code belum tersedia, tunggu sebentar...', qr: null, status: state.status });
    }

    const QRCode = await import('qrcode');
    const qrDataUrl = await QRCode.default.toDataURL(state.currentQR);
    res.json({ success: true, connected: false, qr: qrDataUrl, qrRaw: state.currentQR, status: state.status, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Gagal generate QR code:', error.message);
    res.status(500).json({ success: false, error: 'Gagal generate QR code', message: error.message });
  }
});

app.post('/api/connect', apiKeyAuth, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (state.isConnected) {
      return res.json({ success: true, message: 'Sudah terhubung', connected: true, connectedNumber: state.phoneNumber });
    }

    if (!phoneNumber) {
      const savedNumber = await getConnectedNumber();
      if (!savedNumber) {
        return res.status(400).json({ success: false, error: 'Nomor telepon diperlukan', message: 'Mohon berikan phoneNumber di request body' });
      }
      state.phoneNumber = savedNumber;
      logger.connection(`Reconnect ke session: ${savedNumber}`);
      await initWhatsApp();
      await sleep(2000);
      return res.json({ success: true, message: state.isConnected ? 'Reconnect berhasil' : 'Reconnect sedang proses', connected: state.isConnected, connectedNumber: savedNumber });
    }

    const cleanNumber = extractNumber(formatPhoneNumber(phoneNumber));

    if (await checkSessionExists()) {
      const savedNumber = await getConnectedNumber();
      if (savedNumber && getBaseNumber(savedNumber) !== getBaseNumber(cleanNumber)) {
        return res.status(403).json({
          success: false,
          error: 'Session sudah ada untuk nomor berbeda',
          message: `Session sudah ada untuk nomor ${getBaseNumber(savedNumber)}. Hanya boleh 1 device.`,
          existingNumber: getBaseNumber(savedNumber)
        });
      }
      if (savedNumber) state.phoneNumber = savedNumber;
    }

    if (state.status === 'connecting') {
      return res.json({ success: true, message: 'Koneksi sedang proses', status: state.status, hasQR: state.currentQR !== null });
    }

    state.phoneNumber = cleanNumber;
    initWhatsApp();
    res.json({ success: true, message: 'Koneksi dimulai. Cek /api/qr untuk QR code.', status: 'connecting', phoneNumber: cleanNumber });
  } catch (error) {
    logger.error('Gagal init koneksi:', error.message);
    res.status(500).json({ success: false, error: 'Gagal init koneksi', message: error.message });
  }
});

app.post('/api/disconnect', apiKeyAuth, async (req, res) => {
  try {
    if (state.sock) {
      await state.sock.end();
      state.sock = null;
    }
    Object.assign(state, {
      isConnected: false,
      isReady: false,
      status: 'disconnected',
      currentQR: null,
      error: null,
      hasReconnected: false,
      phoneNumber: null
    });
    res.json({ success: true, message: 'Disconnect berhasil', connected: false });
  } catch (error) {
    logger.error('Gagal disconnect:', error.message);
    res.status(500).json({ success: false, error: 'Gagal disconnect', message: error.message });
  }
});

app.post('/api/send-message', apiKeyAuth, async (req, res) => {
  try {
    if (!state.isConnected || !state.sock) {
      return res.status(503).json({ error: 'WhatsApp tidak terhubung', message: 'WhatsApp belum terhubung. Silakan connect dulu.', connected: state.isConnected, ready: state.isReady });
    }
    if (!isSocketReady()) {
      await sleep(1000);
      if (!isSocketReady()) {
        return res.status(503).json({ error: 'Koneksi belum established', message: 'Koneksi WhatsApp belum fully established. Silakan reconnect.', connected: state.isConnected, ready: state.isReady });
      }
    }
    if (!state.isReady && isSocketReady()) {
      state.isReady = true;
      logger.success('Koneksi ditandai ready saat send attempt');
    }
    if (!state.isReady) {
      return res.status(503).json({ error: 'WhatsApp belum ready', message: 'Koneksi WhatsApp belum ready. Tunggu beberapa detik dan coba lagi.', connected: state.isConnected, ready: state.isReady, socketReady: isSocketReady() });
    }

    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'Field wajib kosong', message: 'Field "to" dan "message" wajib diisi' });
    }

    const jid = formatPhoneNumber(to);
    const messageWithWatermark = `${message}\n\n> _Sent via https://vpnmurah.com_`;

    logger.api(`Kirim pesan ke ${jid}`);
    const result = await state.sock.sendMessage(jid, { text: messageWithWatermark });
    logger.success(`Pesan terkirim. ID: ${result.key.id}`);

    res.json({ success: true, messageId: result.key.id, to: jid, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Gagal kirim pesan:', error.message);
    if (error.message?.includes('Connection') || error.output?.statusCode === 428) {
      state.isConnected = false;
      state.isReady = false;
      return res.status(503).json({ error: 'Koneksi terputus', message: 'Koneksi WhatsApp terputus. Tunggu reconnect dan coba lagi.' });
    }
    res.status(500).json({ error: 'Gagal kirim pesan', message: error.message });
  }
});

app.listen(PORT, () => {
  logger.header('WhatsApp Webhook Server');
  logger.success(`Server berjalan di port ${PORT}`);
  if (API_KEY) logger.info(`API Key: ${API_KEY.substring(0, 10)}...`);
  logger.separator();
  logger.api('Endpoint yang tersedia:');
  logger.info('  GET  /health - Health check');
  logger.info('  GET  /api/status - Cek status koneksi');
  logger.info('  GET  /api/qr - Ambil QR code');
  logger.info('  POST /api/connect - Connect WhatsApp');
  logger.info('  POST /api/disconnect - Disconnect WhatsApp');
  logger.info('  POST /api/send-message - Kirim pesan');
  logger.separator();
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.separator();
  autoConnectIfSessionExists().then(() => {
    if (!state.phoneNumber) return;
    if (state.isConnected && state.isReady) {
      logger.success(`Auto-connected ke session (${state.phoneNumber}). Siap kirim pesan!`);
    } else if (state.isConnected) {
      logger.warning(`Session ditemukan (${state.phoneNumber}) tapi koneksi belum ready.`);
    } else {
      logger.warning(`Session ditemukan (${state.phoneNumber}) tapi koneksi gagal.`);
      logger.info(`Gunakan POST /api/connect dengan phoneNumber: ${state.phoneNumber} untuk reconnect.`);
    }
  });
});

process.on('SIGINT', async () => {
  logger.separator();
  logger.warning('Shutting down...');
  if (state.sock) {
    logger.connection('Menutup koneksi WhatsApp...');
    await state.sock.end();
  }
  logger.success('Server stopped');
  process.exit(0);
});