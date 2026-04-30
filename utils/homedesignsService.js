const axios = require('axios');
const FormData = require('form-data');

// ─── Clé API selon l'environnement ───────────────────────────────────────────
const getApiKey = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.HOMEDESIGNS_API_KEY_PROD;
  }
  return process.env.HOMEDESIGNS_API_KEY_TEST;
};

const BASE_URL = 'https://homedesigns.ai/api/v2';

// ─── Appel principal vers HomeDesigns AI ─────────────────────────────────────
const callHomeDesigns = async (endpoint, formData) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('HomeDesigns API key not configured');
  }

  const response = await axios.post(`${BASE_URL}/${endpoint}`, formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${apiKey}`,
    },
    timeout: 30000,
  });

  return response.data;
};

// ─── Vérification du statut (polling) ────────────────────────────────────────
const checkStatus = async (endpoint, queueId) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('HomeDesigns API key not configured');
  }

  const response = await axios.get(
    `${BASE_URL}/${endpoint}/status_check/${queueId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    }
  );

  return response.data;
};

// ─── Appel GET simple (furniture_finder, design_advisor, etc.) ───────────────
const callHomeDesignsGet = async (endpoint, formData) => {
  // Certains endpoints retournent directement le résultat (pas de queue)
  return callHomeDesigns(endpoint, formData);
};

module.exports = {
  callHomeDesigns,
  checkStatus,
  callHomeDesignsGet,
  BASE_URL,
  getApiKey,
};
