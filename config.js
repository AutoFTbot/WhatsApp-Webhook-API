import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT,
  apiKey: process.env.API_KEY,
  sessionPath: process.env.WHATSAPP_SESSION_PATH,
  webhookUrl: process.env.WEBHOOK_URL,
  webhookSecret: process.env.WEBHOOK_SECRET,
  nodeEnv: process.env.NODE_ENV
};

