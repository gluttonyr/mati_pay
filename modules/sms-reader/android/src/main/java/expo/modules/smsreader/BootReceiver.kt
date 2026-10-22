package expo.modules.smsreader

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    val app = context.applicationContext
    if (!CaptureConfig.isConfigured(app)) return
    // Android 15+ forbids starting a dataSync foreground service from BOOT_COMPLETED;
    // the resync worker started below calls CaptureService.tryStart instead.
    if (Build.VERSION.SDK_INT < 35) CaptureService.tryStart(app)
    InboxResyncWorker.schedulePeriodic(app)
    InboxResyncWorker.runNow(app)
    UploadWorker.enqueue(app)
  }
}
