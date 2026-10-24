package app.waymark.exactalarms

import android.app.AlarmManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * What expo-notifications doesn't expose: whether AlarmManager will take exact
 * alarms (it schedules exact ones only when it can), and the system page where
 * a person allows them for this app (SCHEDULE_EXACT_ALARM, Android 12+).
 */
class ExactAlarmsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExactAlarms")

    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      // Unknown is not "denied": JS maps the exception to "not applicable".
      val context = appContext.reactContext ?: throw IllegalStateException("No React context")
      val alarmManager = context.getSystemService(AlarmManager::class.java)
        ?: throw IllegalStateException("No AlarmManager")
      alarmManager.canScheduleExactAlarms()
    }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function false
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
      val activity = appContext.currentActivity
      try {
        if (activity != null) {
          activity.startActivity(intent)
        } else {
          context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
        true
      } catch (e: Exception) {
        false
      }
    }
  }
}
