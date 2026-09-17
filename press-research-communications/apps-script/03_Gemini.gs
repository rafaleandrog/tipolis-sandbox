/**************************************************************
 * TIPOLIS PRESS MONITOR — 03_Gemini.gs
 * Thin wrapper around the Gemini generateContent REST endpoint.
 * Forces JSON output via responseMimeType + responseSchema.
 *
 * Quota handling lives here on purpose: a 429 is not one error but
 * three (per minute, per day, per token-minute) with opposite correct
 * responses, and the caller can only choose between them if this layer
 * reports which one it was — and never burns extra quota retrying.
 **************************************************************/

/**
 * Calls Gemini and returns the parsed JSON object.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {Object} responseSchema  JSON schema object (Gemini dialect)
 * @param {Object=} opts           { thinkingBudget: number }
 * @return {Object} parsed JSON
 */
function callGeminiJson_(systemPrompt, userPrompt, responseSchema, opts) {
  const apiKey = getSetting_('gemini_api_key');
  if (!apiKey) throw new Error('Missing gemini_api_key in report_settings.');
  const model = getSetting_('gemini_model') || APP.DEFAULTS.gemini_model;
  const url = APP.URLS.GEMINI_BASE + encodeURIComponent(model) + ':generateContent';

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      // gemini-2.5-flash runs with dynamic "thinking" on by default. For
      // classification (pure labelling against a fixed schema) that is
      // latency and output tokens spent on nothing, so 04_AIFilter passes
      // thinkingBudget: 0. Summaries keep the default (-1 = dynamic).
      thinkingConfig: {
        thinkingBudget: (opts && opts.thinkingBudget != null) ? opts.thinkingBudget : -1
      }
    }
  };
  if (responseSchema) body.generationConfig.responseSchema = responseSchema;

  let lastErr = null;
  for (let attempt = 0; attempt <= APP.LIMITS.GEMINI_MAX_RETRIES; attempt++) {
    try {
      countGeminiRequest_();
      const resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        headers: { 'x-goog-api-key': apiKey },
        payload: JSON.stringify(body)
      });
      const code = resp.getResponseCode();
      const text = resp.getContentText();

      if (code === 429) {
        // Never retried here. Every retry is another request counted
        // against the very quota that just ran out, and five calls 1.5s
        // apart blow the per-minute limit on their own. The caller
        // decides whether to wait out a per-minute cap or stop for the
        // day — and it can only decide because err.geminiQuota says which.
        const info = parseGeminiQuotaError_(text);
        const err = new Error(
          `Gemini HTTP 429 [${info.kind}] retryDelay=${info.retryDelaySec}s :: ${truncate_(text, 400)}`);
        err.geminiQuota = info;
        throw err;
      }
      if (code === 503 || code >= 500) {
        // Server overloaded/temporary: back off progressively and retry.
        lastErr = new Error(`Gemini HTTP ${code}: ${truncate_(text, 300)}`);
        Utilities.sleep(2000 * (attempt + 1));   // 2s, 4s, 6s, 8s
        continue;
      }
      if (code < 200 || code >= 300) {
        throw new Error(`Gemini HTTP ${code}: ${truncate_(text, 400)}`);
      }
      const raw = extractGeminiText_(JSON.parse(text));
      if (!raw) throw new Error('Gemini returned empty content.');
      return JSON.parse(stripJsonFences_(raw));
    } catch (err) {
      if (err && err.geminiQuota) throw err;   // quota errors go straight up
      lastErr = err;
      if (attempt < APP.LIMITS.GEMINI_MAX_RETRIES) { Utilities.sleep(1500 * (attempt + 1)); continue; }
    }
  }
  throw lastErr || new Error('Gemini call failed.');
}

/**
 * Classifies a 429 body and keeps the raw text for the logs. Before this
 * existed the logs only said "daily quota reached", which was the code's
 * guess and not what the API answered — so there was no way to tell a
 * 30-second rate limit from a wait-until-tomorrow one.
 */
function parseGeminiQuotaError_(text) {
  const raw = String(text || '');
  const rd = raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  const perDay = /PerDay|RequestsPerDay/i.test(raw);
  const perMinute = /PerMinute|RequestsPerMinute|TokensPerMinute/i.test(raw);
  return {
    kind: perDay ? 'PER_DAY' : (perMinute ? 'PER_MINUTE' : 'UNKNOWN'),
    retryDelaySec: rd ? Math.ceil(Number(rd[1])) : 0,
    raw: truncate_(raw, 500)
  };
}

/** Script-property key for today's request counter (quota resets at midnight PT). */
function geminiCounterKey_() {
  return 'GEMINI_REQ_' + Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd');
}

function countGeminiRequest_() {
  const props = PropertiesService.getScriptProperties();
  const key = geminiCounterKey_();
  props.setProperty(key, String(Number(props.getProperty(key) || 0) + 1));
}

/**
 * How much of the self-imposed daily request budget is left. Lets the
 * filter stop cleanly instead of discovering the real ceiling by taking
 * a 429 mid-batch.
 */
function geminiBudget_() {
  const used = Number(PropertiesService.getScriptProperties().getProperty(geminiCounterKey_()) || 0);
  const budget = toPositiveInt_(
    getSetting_('gemini_daily_request_budget'), APP.LIMITS.DEFAULT_GEMINI_DAILY_BUDGET);
  return { used: used, budget: budget, left: Math.max(0, budget - used) };
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
