/**************************************************************
 * TIPOLIS PRESS MONITOR — 08_Triggers.gs
 * Installs the daily search and weekly AI filter triggers.
 **************************************************************/

function installAllTriggers() {
  removeTriggersByHandler_('runDailySearch');
  removeTriggersByHandler_('runWeeklyAIFilter');
  removeTriggersByHandler_('runWeeklyAIFilter_continuation');

  // Daily search ~06:00 every day.
  ScriptApp.newTrigger('runDailySearch')
    .timeBased().everyDays(1).atHour(APP.DEFAULTS.daily_search_hour).create();

  // Weekly AI filter ~07:00 on Mondays (margin after the 06:00 search).
  ScriptApp.newTrigger('runWeeklyAIFilter')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(APP.DEFAULTS.weekly_filter_hour).create();

  log_('installAllTriggers', 'Daily search + weekly AI filter triggers installed.');
  SpreadsheetApp.getUi().alert(
    'Triggers installed:\n' +
    `- Daily search ~${APP.DEFAULTS.daily_search_hour}:00\n` +
    `- Weekly AI filter Mondays ~${APP.DEFAULTS.weekly_filter_hour}:00`
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
