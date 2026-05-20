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
    LOGS: 'logs'
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
    LOGS: ['DateTime', 'Step', 'Message']
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
    max_results: 20,
    gemini_model: 'gemini-2.5-flash',
    daily_search_hour: 6,    // daily search runs ~06:00
    weekly_filter_hour: 7    // weekly AI filter runs ~07:00 (margin after search)
  },

  PROPERTIES: {
    LAST_NEWS_REQUEST_AT: 'LAST_NEWS_REQUEST_AT',
    FILTER_PROGRESS: 'FILTER_PROGRESS'
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
    GEMINI_MAX_RETRIES: 1
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
  ['gnews_api_key', '5813216511ffa0bc6228e89030e4e3b6', 'GNews API key (fallback search)'],
  ['report_drive_folder_id', '', 'Drive folder ID where generated reports are saved — PASTE HERE'],
  ['report_template_doc_id', '', 'Google Doc ID of the report template — PASTE HERE'],
  ['daily_search_auto_run', 'true', 'Toggle the daily search trigger'],
  ['weekly_filter_auto_run', 'true', 'Toggle the weekly AI filter trigger'],
  ['frontend_bearer_token', '', 'Random 32+ char token the frontend must send — PASTE HERE']
];
