/**************************************************************
 * TIPOLIS PRESS MONITOR — 03_Gemini.gs
 * Thin wrapper around the Gemini generateContent REST endpoint.
 * Forces JSON output via responseMimeType + responseSchema.
 **************************************************************/

/**
 * Calls Gemini and returns the parsed JSON object.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {Object} responseSchema  JSON schema object (Gemini dialect)
 * @return {Object} parsed JSON
 */
function callGeminiJson_(systemPrompt, userPrompt, responseSchema) {
  const apiKey = getSetting_('gemini_api_key');
  if (!apiKey) throw new Error('Missing gemini_api_key in report_settings.');
  const model = getSetting_('gemini_model') || APP.DEFAULTS.gemini_model;
  const url = APP.URLS.GEMINI_BASE + encodeURIComponent(model) + ':generateContent';

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };
  if (responseSchema) body.generationConfig.responseSchema = responseSchema;

  let lastErr = null;
  for (let attempt = 0; attempt <= APP.LIMITS.GEMINI_MAX_RETRIES; attempt++) {
    try {
      const resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        headers: { 'x-goog-api-key': apiKey },
        payload: JSON.stringify(body)
      });
      const code = resp.getResponseCode();
      const text = resp.getContentText();
      if (code === 429 || code >= 500) {
        lastErr = new Error(`Gemini HTTP ${code}: ${truncate_(text, 300)}`);
        Utilities.sleep(2000);
        continue;
      }
      if (code < 200 || code >= 300) {
        throw new Error(`Gemini HTTP ${code}: ${truncate_(text, 400)}`);
      }
      const raw = extractGeminiText_(JSON.parse(text));
      if (!raw) throw new Error('Gemini returned empty content.');
      return JSON.parse(stripJsonFences_(raw));
    } catch (err) {
      lastErr = err;
      if (attempt < APP.LIMITS.GEMINI_MAX_RETRIES) { Utilities.sleep(1500); continue; }
    }
  }
  throw lastErr || new Error('Gemini call failed.');
}

function extractGeminiText_(json) {
  if (!json || !json.candidates || !json.candidates.length) return '';
  const cand = json.candidates[0];
  if (!cand.content || !cand.content.parts) return '';
  return cand.content.parts.map(p => p.text || '').join('').trim();
}

function stripJsonFences_(s) {
  return String(s || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}
