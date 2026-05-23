/**************************************************************
 * TIPOLIS PRESS MONITOR — 08_Triggers.gs
 * Installs the daily search and daily AI filter triggers.
 **************************************************************/

function installAllTriggers() {
  removeTriggersByHandler_('runDailySearch');
  removeTriggersByHandler_('runWeeklyAIFilter');
  removeTriggersByHandler_('runWeeklyAIFilter_continuation');

  // Daily search ~06:00 every day.
  ScriptApp.newTrigger('runDailySearch')
    .timeBased().everyDays(1).atHour(APP.DEFAULTS.daily_search_hour).create();

  // Daily AI filter ~07:00 every day (margin after the 06:00 search).
  // Handler name kept as runWeeklyAIFilter to avoid drift with the live
  // deployment; the cadence change is in the trigger, not in the code.
  ScriptApp.newTrigger('runWeeklyAIFilter')
    .timeBased().everyDays(1).atHour(APP.DEFAULTS.weekly_filter_hour).create();

  log_('installAllTriggers', 'Daily search + daily AI filter triggers installed.');
  SpreadsheetApp.getUi().alert(
    'Triggers installed:\n' +
    `- Daily search ~${APP.DEFAULTS.daily_search_hour}:00\n` +
    `- Daily AI filter ~${APP.DEFAULTS.weekly_filter_hour}:00`
  );
}

function deleteAllProjectTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  log_('deleteAllProjectTriggers', `Deleted ${triggers.length} trigger(s).`);
  SpreadsheetApp.getUi().alert(`Deleted ${triggers.length} trigger(s).`);
}

function removeTriggersByHandler_(name) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === name) ScriptApp.deleteTrigger(t);
  });
}
