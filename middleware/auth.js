import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.API_KEY;

/**
 * Middleware untuk autentikasi API Key
 */
export function apiKeyAuth(req, res, next) {
  if (!API_KEY) {
    return res.status(500).json({
      error: 'Server Configuration Error',
      message: 'API_KEY is not configured. Please set API_KEY in .env file'
    });
  }

  const apiKey = req.headers['x-api-key'] || req.headers['api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required. Provide it in header: X-API-Key or api-key, or as query parameter: api_key'
    });
  }

  if (apiKey !== API_KEY) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }

  next();
}

