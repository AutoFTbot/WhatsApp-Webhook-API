import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH || './auth_info_baileys';

// Pastikan folder session ada
if (!existsSync(SESSION_PATH)) {
  mkdirSync(SESSION_PATH, { recursive: true });
}

// Cek apakah session sudah ada
export async function checkSessionExists() {
  try {
    if (!existsSync(SESSION_PATH)) {
      return false;
    }
    
    const files = readdirSync(SESSION_PATH);
    return files.includes('creds.json');
  } catch (error) {
    return false;
  }
}

// Ambil nomor telepon dari session
export async function getConnectedNumber() {
  try {
    const credsPath = `${SESSION_PATH}/creds.json`;
    if (!existsSync(credsPath)) {
      return null;
    }
    
    const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));
    if (creds?.me?.id) {
      return creds.me.id.replace('@s.whatsapp.net', '');
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Buat koneksi WhatsApp dengan Baileys
export async function createWhatsAppConnection(onConnectionChange, onQR, onError) {
  const { version } = await fetchLatestBaileysVersion();
  logger.whatsapp(`Menggunakan Baileys version: ${version.join('.')}`);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'error' })),
    },
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    getMessage: async (key) => {
      return {
        conversation: 'Message not found'
      };
    },
  });

  // Handle update koneksi
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.whatsapp('QR Code generated. Tersedia via API: GET /api/qr');
      qrcode.generate(qr, { small: true });
      
      if (onQR) onQR(qr);
      if (onConnectionChange) onConnectionChange(false);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      const errorMsg = lastDisconnect?.error?.message || 'Unknown error';
      logger.connection(`Koneksi ditutup: ${errorMsg} | Reconnect: ${shouldReconnect}`);
      
      if (onError) onError(errorMsg);
      if (onConnectionChange) onConnectionChange(false);
      
      if (shouldReconnect) {
        setTimeout(() => {
          try {
            logger.connection('Mencoba reconnect...');
            createWhatsAppConnection(onConnectionChange, onQR, onError);
          } catch (err) {
            logger.error('Gagal auto-reconnect:', err.message);
          }
        }, 5000);
      }
    } else if (connection === 'open') {
      logger.success('WhatsApp terhubung!');
      if (onConnectionChange) onConnectionChange(true);
    } else if (connection === 'connecting') {
      logger.connection('Menghubungkan ke WhatsApp...');
      if (onConnectionChange) onConnectionChange(false);
    }
  });

  // Simpan credentials saat update
  sock.ev.on('creds.update', saveCreds);

  // Handle pesan masuk
  sock.ev.on('messages.upsert', async (m) => {
    const messages = m.messages;
    
    for (const msg of messages) {
      // Skip status broadcast
      if (msg.key.remoteJid === 'status@broadcast') continue;
      
      // Skip protocol message
      if (!msg.message || msg.message.protocolMessage) continue;
      
      // Cek apakah ada konten
      const hasContent = msg.message.conversation || 
                           msg.message.extendedTextMessage ||
                           msg.message.imageMessage ||
                           msg.message.videoMessage ||
                           msg.message.audioMessage ||
                           msg.message.documentMessage ||
                           msg.message.stickerMessage ||
                           msg.message.contactMessage ||
                           msg.message.locationMessage;
      
      if (!hasContent) continue;

      const from = msg.key.remoteJid;
      const msgId = msg.key.id;
      const isGroup = from?.includes('@g.us');
      
      let messageType = 'Unknown';
      let content = '';
      
      if (msg.message.conversation) {
        messageType = 'Text';
        content = msg.message.conversation;
      } else if (msg.message.extendedTextMessage) {
        messageType = 'Extended Text';
        content = msg.message.extendedTextMessage.text;
      } else if (msg.message.imageMessage) {
        messageType = 'Image';
        content = msg.message.imageMessage.caption || '(no caption)';
      } else if (msg.message.videoMessage) {
        messageType = 'Video';
        content = msg.message.videoMessage.caption || '(no caption)';
      } else if (msg.message.audioMessage) {
        messageType = 'Audio';
        content = 'Audio message';
      } else if (msg.message.documentMessage) {
        messageType = 'Document';
        content = msg.message.documentMessage.fileName || 'document';
      } else if (msg.message.stickerMessage) {
        messageType = 'Sticker';
        content = 'Sticker message';
      } else if (msg.message.contactMessage) {
        messageType = 'Contact';
        content = 'Contact shared';
      } else if (msg.message.locationMessage) {
        messageType = 'Location';
        content = 'Location shared';
      }
      
      logger.message(`${messageType} dari ${isGroup ? 'GROUP' : 'DM'}: ${from}`);
      if (content) {
        logger.info(`  Konten: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
      }
      logger.debug(`  Message ID: ${msgId}`);
    }
  });

  // Handle LID mapping
  sock.ev.on('lid-mapping.update', (update) => {
    logger.debug('LID mapping updated');
  });

  // Handle presence
  sock.ev.on('presence.update', ({ id, presences }) => {
    logger.debug(`${id} sekarang ${presences || 'offline'}`);
  });

  // Handle message receipts
  sock.ev.on('messages.update', (updates) => {
    for (const update of updates) {
      if (update.update) {
        const { key, update: updateData } = update;
        const statusMap = {
          1: 'PENDING',
          2: 'SERVER_ACK',
          3: 'DELIVERY_ACK',
          4: 'READ',
          5: 'PLAYED'
        };
        const status = statusMap[updateData.status] || `UNKNOWN(${updateData.status})`;
        const chatType = key.remoteJid?.includes('@g.us') ? 'GROUP' : 'DM';
        const participantInfo = key.participant ? ` | Participant: ${key.participant}` : '';
        
        logger.debug(`Message update: ${status} | ${chatType} | From: ${key.remoteJid}${participantInfo} | ID: ${key.id}`);
      }
    }
  });

  return sock;
}

