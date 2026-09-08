/**************************************************************
 * TIPOLIS PRESS MONITOR — 08_Triggers.gs
 * Installs the daily search and weekly AI filter triggers.
 **************************************************************/

function installAllTriggers() {
  removeTriggersByHandler_('runDailySearch');
  removeTriggersByHandler_('runWeeklyAIFilter');              // legacy cleanup
  removeTriggersByHandler_('runWeeklyAIFilter_continuation'); // legacy cleanup
  removeTriggersByHandler_('runDailyAIFilter');
  removeTriggersByHandler_('runDailyAIFilter_continuation');

  ScriptApp.newTrigger('runDailySearch')
    .timeBased().everyDays(1).atHour(APP.DEFAULTS.daily_search_hour).create();

  ScriptApp.newTrigger('runDailyAIFilter')
    .timeBased().everyDays(1).atHour(APP.DEFAULTS.weekly_filter_hour).create();

  log_('installAllTriggers', 'Daily search + daily AI classification triggers installed.');
  SpreadsheetApp.getUi().alert(
    'Triggers installed:\n' +
    `- Daily search ~${APP.DEFAULTS.daily_search_hour}:00\n` +
    `- Daily AI classification ~${APP.DEFAULTS.weekly_filter_hour}:00`
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
