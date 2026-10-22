package expo.modules.smsreader

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    val app = context.applicationContext
    if (!CaptureConfig.isConfigured(app)) return
    // specialUse is not on Android 15's BOOT_COMPLETED foreground-service ban list: start directly on every API level.
    CaptureService.tryStart(app)
    InboxResyncWorker.schedulePeriodic(app)
    InboxResyncWorker.runNow(app)
    UploadWorker.enqueue(app)
  }
}
