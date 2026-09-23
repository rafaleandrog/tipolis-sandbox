/**************************************************************
 * TIPOLIS PRESS MONITOR — 00_Config.gs
 * Global configuration. No secrets here: API keys live in the
 * report_settings sheet (read via getSetting_()).
 **************************************************************/

const APP = {
  MENU: 'Tipolis',

  SHEETS: {
  TERMS: 'search_terms',
  COUNTRIES: 'tipolis_countries',
  RESULTS: 'search_results',
  APPROVED: 'approved_news',
  HISTORY: 'approved_history',
  SETTINGS: 'report_settings',
  LOGS: 'logs',
  FEEDBACK: 'feedback',
  TOPIC_KEYWORDS: 'topic_keywords'
},

  HEADERS: {
    TERMS: [
      'term', 'enabled', 'days', 'match_type',
      'case_sensitive', 'language', 'country', 'max_results'
    ],
    COUNTRIES: [
      'country_name', 'region', 'priority_level', 'project_names', 'notes', 'added_at'
    ],
    RESULTS: [
      'Approved', 'Term', 'PublishedAt', 'Source', 'Title', 'Link',
      'Description', 'Content', 'FetchedAt',
      'ai_relevance', 'ai_category', 'ai_country', 'ai_region',
      'ai_reason', 'ai_duplicate_of', 'FilterStatus'
    ],
    APPROVED: [
      'Approved', 'ApprovedAt', 'Term', 'PublishedAt', 'Source', 'Title', 'Link',
      'Description', 'Content', 'Country', 'Region', 'Category',
      'AI_Bullets_Raw', 'Edited_Bullets', 'AI_Status', 'Edit_Status', 'Display_Order'
    ],
    HISTORY: [
      'ReportWeekNumber', 'ReportYear', 'ReportDate', 'ArchivedAt', 'Category',
      'Country', 'Region', 'Source', 'PublishedAt', 'Title', 'Link',
      'Final_Bullets', 'ReportDocId', 'ReportDocUrl'
    ],
    SETTINGS: ['key', 'value', 'description'],
    LOGS: ['DateTime', 'Step', 'Message'],
    FEEDBACK: ['Timestamp', 'Page', 'Type', 'Title', 'Description', 'Status'],
    TOPIC_KEYWORDS: ['keyword', 'mode', 'enabled', 'notes']
  },

  // Column indexes (1-based) for frequently used sheets
  COL: {
    RESULTS: {
      APPROVED: 1, TERM: 2, PUBLISHED_AT: 3, SOURCE: 4, TITLE: 5, LINK: 6,
      DESCRIPTION: 7, CONTENT: 8, FETCHED_AT: 9,
      AI_RELEVANCE: 10, AI_CATEGORY: 11, AI_COUNTRY: 12, AI_REGION: 13,
      AI_REASON: 14, AI_DUPLICATE_OF: 15, FILTER_STATUS: 16
    },
    APPROVED: {
      APPROVED: 1, APPROVED_AT: 2, TERM: 3, PUBLISHED_AT: 4, SOURCE: 5, TITLE: 6,
      LINK: 7, DESCRIPTION: 8, CONTENT: 9, COUNTRY: 10, REGION: 11, CATEGORY: 12,
      AI_BULLETS_RAW: 13, EDITED_BULLETS: 14, AI_STATUS: 15, EDIT_STATUS: 16, DISPLAY_ORDER: 17
    }
  },

  DEFAULTS: {
    term_enabled: false,
    days: 1,                 // daily search window (last 24h)
    match_type: 'broad',
    case_sensitive: false,
    language: 'en',
    country: '',
    max_results: 10,          // GNews free tier returns at most 10 per request; also keeps daily volume inside the Gemini quota
    gemini_model: 'gemini-2.5-flash',
    daily_search_hour: 6,    // daily search runs ~06:00
    weekly_filter_hour: 7,   // AI classification runs ~07:00 (margin after search)
    midday_filter_hour: 13   // catch-up pass if the morning chain was cut short
  },

  PROPERTIES: {
    LAST_NEWS_REQUEST_AT: 'LAST_NEWS_REQUEST_AT',
    FILTER_PROGRESS: 'FILTER_PROGRESS',
    TERM_CURSOR: 'TERM_CURSOR'          // round-robin start for the row cap
  },

  URLS: {
    GOOGLE_NEWS_RSS: 'https://news.google.com/rss/search',
    GNEWS_SEARCH: 'https://gnews.io/api/v4/search',
    GEMINI_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/'
  },

  LIMITS: {
    MAX_CONTENT_CHARS: 12000,
    NEWS_REQUEST_SPACING_MS: 1200,   // 1.2s between news requests
    FILTER_BATCH_SIZE: 60,           // articles per AI Filter execution chunk
    GEMINI_MAX_RETRIES: 4,

    // Articles per Gemini classification call. Raised from 10 to 25: the
    // per-article payload is small (source + title + 250 chars) and the
    // free tier is limited by REQUESTS, not by tokens, so a bigger batch
    // is the cheapest lever there is.
    FILTER_AI_BATCH_SIZE: 25,
    FILTER_AI_SPACING_MS: 6500,      // gap between classification calls
    FILTER_SAFE_MS: 5 * 60 * 1000,   // stop and continue before the 6-min cap

    // Fallbacks for the report_settings keys of the same name.
    // The Gemini free tier for gemini-2.5-flash measured ~20 requests/day
    // (logs 19-23 Sep 2026: 429 after 19-24 calls). The budget must sit at
    // or below that, and part of it is reserved for summaries.
    DEFAULT_GEMINI_DAILY_BUDGET: 20,
    DEFAULT_GEMINI_SUMMARY_RESERVE: 6,
    DEFAULT_MAX_RESULTS_CAP: 10,
    DEFAULT_MAX_ROWS_PER_SEARCH_RUN: 250,
    MAX_LOG_ROWS: 4000
  },

  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36',

  REGIONS: [
    'Africa', 'Caribbean', 'Latin America', 'North America', 'Europe',
    'Middle East', 'South Asia', 'Southeast Asia', 'East Asia', 'Oceania', 'Global'
  ]
};

// Seed data for tipolis_countries (region mapping for the 14 priority countries).
const TIPOLIS_COUNTRY_SEED = [
  ['Saint Kitts and Nevis', 'Caribbean', 'high', 'Destiny', '', ''],
  ['Nevis', 'Caribbean', 'high', 'Destiny', '', ''],
  ['Cabo Verde', 'Africa', 'high', 'TechParkCV', '', ''],
  ['São Tomé and Príncipe', 'Africa', 'medium', '', '', ''],
  ['Brunei', 'Southeast Asia', 'medium', '', '', ''],
  ['Honduras', 'Latin America', 'high', 'Próspera, ZEDE', '', ''],
  ['Paraguay', 'Latin America', 'medium', '', '', ''],
  ['Argentina', 'Latin America', 'medium', '', '', ''],
  ['Ecuador', 'Latin America', 'medium', '', '', ''],
  ['El Salvador', 'Latin America', 'high', '', '', ''],
  ['Guatemala', 'Latin America', 'medium', '', '', ''],
  ['Belize', 'Caribbean', 'medium', '', '', ''],
  ['Uruguay', 'Latin America', 'medium', '', '', ''],
  ['Guyana', 'Latin America', 'medium', '', '', '']
];

// Seed data for report_settings (key, value, description).
// Fill the empty values manually after running setup.
const SETTINGS_SEED = [
  ['author_name', 'Rafael Leandro', 'Name printed on every report'],
  ['last_report_week_number', '20', 'Week number of the most recent report; next = this + 1'],
  ['last_report_date', '2026-05-18', 'Date (yyyy-mm-dd) of the most recent report'],
  ['gemini_api_key', '', 'Google AI Studio API key — PASTE HERE'],
  ['gemini_model', 'gemini-2.5-flash', 'Gemini model id (e.g. gemini-2.5-flash or gemini-3-flash-preview)'],
  ['gnews_api_key', '', 'GNews API key (fallback search) — PASTE HERE'],
  ['report_drive_folder_id', '', 'Drive folder ID where generated reports are saved — PASTE HERE'],
  ['report_template_doc_id', '', 'Google Doc ID of the report template — PASTE HERE'],
  ['daily_search_auto_run', 'true', 'Toggle the daily search trigger'],
  ['weekly_filter_auto_run', 'true', 'Toggle the weekly AI filter trigger'],
  ['daily_filter_auto_run', 'true', 'Toggle the daily AI classification trigger'],
  ['frontend_bearer_token', '', 'Random 32+ char token the frontend must send — PASTE HERE'],
  ['gemini_daily_request_budget', '20',
    'Max Gemini requests per day (free tier is ~20). The filter stops cleanly at this number instead of discovering the quota by taking a 429.'],
  ['gemini_summary_reserve', '6',
    'Gemini requests per day the AI filter leaves untouched so "Generate pending summaries" still works the same day.'],
  ['search_source', 'gnews',
    'gnews = GNews API first (real publisher links + description, as before 16 Sep 2026), Google News RSS only when GNews returns nothing. rss = RSS first.'],
  ['max_results_cap', '10',
    'Hard ceiling applied to every search_terms max_results value. Keeps the daily volume inside the Gemini quota.'],
  ['max_rows_per_search_run', '250',
    'Max rows a single daily search may write. Terms left over start first on the next run.'],
  ['topic_gate_mode', 'skip',
    'skip = off-topic articles are stored with FilterStatus="Skipped" (auditable, no AI cost); drop = not stored at all.'],
  ['gnews_fallback_enabled', 'false',
    'Only used when search_source = rss: call the GNews API when Google News RSS returns nothing.'],
  ['rss_fallback_enabled', 'true',
    'Only used when search_source = gnews: call Google News RSS when GNews returns nothing for a term.']
];

// Seed vocabulary for the topic_keywords sheet — the local gate that decides
// whether a fetched article is worth a Gemini call at all.
//
// Two modes, and the difference between them is not a matter of taste:
//
//   'block'   — an article matching any enabled block keyword is parked.
//               Measured against 721 real fetched articles: parks 31 percent
//               of what the AI went on to reject, and ZERO of the 137
//               articles the AI kept. Safe by default, so these ship enabled.
//
//   'require' — if ANY require keyword is enabled, an article must match at
//               least one of them or it is parked. Much more aggressive, and
//               measured as too aggressive: on the same 721 articles it
//               parked 74 percent of everything, but also 45 percent of the
//               ones the AI kept. A priority country doing something
//               genuinely relevant ("Ecuador central bank raises growth
//               forecast", "Cabo Verde industrial production up 11.7") rarely
//               speaks free-zone vocabulary. These ship DISABLED. Enable them
//               only for a specific ambiguous term, and re-measure.
//
// Columns: keyword, mode, enabled, notes.
const TOPIC_KEYWORDS_SEED = [
  ['air pollution', 'block', true, ''],
  ['air quality index', 'block', true, ''],
  ['album', 'block', true, ''],
  ['analyst rating', 'block', true, ''],
  ['athletics', 'block', true, ''],
  ['backyard ultra', 'block', true, ''],
  ['baseball', 'block', true, ''],
  ['basketball', 'block', true, ''],
  ['birthday', 'block', true, ''],
  ['boxing', 'block', true, ''],
  ['britannica', 'block', true, ''],
  ['burning car', 'block', true, ''],
  ['car crash', 'block', true, ''],
  ['centenarian', 'block', true, ''],
  ['championship', 'block', true, ''],
  ['cheese days', 'block', true, ''],
  ['cholera', 'block', true, ''],
  ['cholera outbreak', 'block', true, ''],
  ['church', 'block', true, ''],
  ['coach said', 'block', true, ''],
  ['cocaine', 'block', true, ''],
  ['concacaf', 'block', true, ''],
  ['concert', 'block', true, ''],
  ['condolence', 'block', true, ''],
  ['copa ', 'block', true, ''],
  ['crash on', 'block', true, ''],
  ['cricket match', 'block', true, ''],
  ['dengue', 'block', true, ''],
  ['dengue outbreak', 'block', true, ''],
  ['diocese', 'block', true, ''],
  ['disease outbreak', 'block', true, ''],
  ['dividend yield', 'block', true, ''],
  ['documentario', 'block', true, ''],
  ['documentary', 'block', true, ''],
  ['drought early action', 'block', true, ''],
  ['drug bust', 'block', true, ''],
  ['earthquake', 'block', true, ''],
  ['ebola', 'block', true, ''],
  ['exhibition', 'block', true, ''],
  ['exposicao', 'block', true, ''],
  ['fiery crash', 'block', true, ''],
  ['film festival', 'block', true, ''],
  ['fire department', 'block', true, ''],
  ['firefighters', 'block', true, ''],
  ['fixtures', 'block', true, ''],
  ['flooding', 'block', true, ''],
  ['food security outlook', 'block', true, ''],
  ['football', 'block', true, ''],
  ['funeral', 'block', true, ''],
  ['galleries night', 'block', true, ''],
  ['goalkeeper', 'block', true, ''],
  ['golf', 'block', true, ''],
  ['gols', 'block', true, ''],
  ['hantavirus', 'block', true, ''],
  ['head coach', 'block', true, ''],
  ['homicide', 'block', true, ''],
  ['hospitalizes', 'block', true, ''],
  ['hourly weather', 'block', true, ''],
  ['hurricane warning', 'block', true, ''],
  ['if you invested', 'block', true, ''],
  ['jv ', 'block', true, ''],
  ['kick-off', 'block', true, ''],
  ['kickoff', 'block', true, ''],
  ['league table', 'block', true, ''],
  ['libertadores', 'block', true, ''],
  ['literary prize', 'block', true, ''],
  ['live stream', 'block', true, ''],
  ['maintained at sector perform', 'block', true, ''],
  ['man arrested', 'block', true, ''],
  ['marathon', 'block', true, ''],
  ['mayan civilization', 'block', true, ''],
  ['measles', 'block', true, ''],
  ['measles outbreak', 'block', true, ''],
  ['memorial service', 'block', true, ''],
  ['midfielder', 'block', true, ''],
  ['missing person', 'block', true, ''],
  ['mission trip', 'block', true, ''],
  ['movie', 'block', true, ''],
  ['music video', 'block', true, ''],
  ['obituary', 'block', true, ''],
  ['olympic', 'block', true, ''],
  ['painting', 'block', true, ''],
  ['parish', 'block', true, ''],
  ['passed away', 'block', true, ''],
  ['pga', 'block', true, ''],
  ['placar', 'block', true, ''],
  ['playoff', 'block', true, ''],
  ['police arrested', 'block', true, ''],
  ['price prediction', 'block', true, ''],
  ['price target', 'block', true, ''],
  ['rainfall', 'block', true, ''],
  ['recipe', 'block', true, ''],
  ['rescued from', 'block', true, ''],
  ['rugby', 'block', true, ''],
  ['season opener', 'block', true, ''],
  ['shares outstanding', 'block', true, ''],
  ['shooting', 'block', true, ''],
  ['soccer', 'block', true, ''],
  ['softball', 'block', true, ''],
  ['spanish colony', 'block', true, ''],
  ['sports network', 'block', true, ''],
  ['stabbing', 'block', true, ''],
  ['stock forecast', 'block', true, ''],
  ['stocks spotlight', 'block', true, ''],
  ['striker', 'block', true, ''],
  ['sudamericana', 'block', true, ''],
  ['swimming', 'block', true, ''],
  ['tennis', 'block', true, ''],
  ['things to do', 'block', true, ''],
  ['tourist guide', 'block', true, ''],
  ['tournament', 'block', true, ''],
  ['trail race', 'block', true, ''],
  ['tropical storm', 'block', true, ''],
  ['tv schedule', 'block', true, ''],
  ['ultramarathon', 'block', true, ''],
  ['varsity', 'block', true, ''],
  ['volleyball', 'block', true, ''],
  ['weather forecast', 'block', true, ''],
  ['weekend events', 'block', true, ''],
  ['where to watch', 'block', true, ''],
  ['woman arrested', 'block', true, ''],
  ['world cup', 'block', true, ''],
  ['wrestling', 'block', true, ''],
  ['sez', 'require', false, ''],
  ['special economic zone', 'require', false, ''],
  ['economic zone', 'require', false, ''],
  ['free zone', 'require', false, ''],
  ['free trade zone', 'require', false, ''],
  ['freeport zone', 'require', false, ''],
  ['free port', 'require', false, ''],
  ['export processing zone', 'require', false, ''],
  ['industrial park', 'require', false, ''],
  ['industrial zone', 'require', false, ''],
  ['industrial corridor', 'require', false, ''],
  ['economic corridor', 'require', false, ''],
  ['special administrative region', 'require', false, ''],
  ['autonomous region', 'require', false, ''],
  ['zona franca', 'require', false, ''],
  ['zona economica especial', 'require', false, ''],
  ['zona especial', 'require', false, ''],
  ['area de livre comercio', 'require', false, ''],
  ['charter city', 'require', false, ''],
  ['private city', 'require', false, ''],
  ['model city', 'require', false, ''],
  ['network state', 'require', false, ''],
  ['startup city', 'require', false, ''],
  ['new city', 'require', false, ''],
  ['city project', 'require', false, ''],
  ['master plan', 'require', false, ''],
  ['innovation district', 'require', false, ''],
  ['regulatory sandbox', 'require', false, ''],
  ['regulatory reform', 'require', false, ''],
  ['governance reform', 'require', false, ''],
  ['legislation', 'require', false, ''],
  ['decree', 'require', false, ''],
  ['jurisdiction', 'require', false, ''],
  ['sovereign', 'require', false, ''],
  ['investment', 'require', false, ''],
  ['foreign direct investment', 'require', false, ''],
  ['tax incentive', 'require', false, ''],
  ['tax regime', 'require', false, ''],
  ['concession', 'require', false, ''],
  ['public-private partnership', 'require', false, ''],
  ['memorandum of understanding', 'require', false, ''],
  ['groundbreaking', 'require', false, ''],
  ['infrastructure', 'require', false, ''],
  ['port expansion', 'require', false, ''],
  ['logistics hub', 'require', false, ''],
  ['technology hub', 'require', false, ''],
  ['citizenship by investment', 'require', false, ''],
  ['residency by investment', 'require', false, ''],
  ['golden visa', 'require', false, ''],
  ['digital nomad', 'require', false, ''],
  ['bitcoin bond', 'require', false, ''],
];
