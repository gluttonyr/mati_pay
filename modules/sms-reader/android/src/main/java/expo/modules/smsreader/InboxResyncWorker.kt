package expo.modules.smsreader

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/** Re-reads the last 48 h of the SMS inbox and queues known-sender messages the receiver may have missed. */
class InboxResyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  companion object {
    private const val PERIODIC_NAME = "sms-reader-resync"
    private const val NOW_NAME = "sms-reader-resync-now"
    private const val WINDOW_MS = 48L * 60 * 60 * 1000

    fun schedulePeriodic(context: Context) {
      val request = PeriodicWorkRequestBuilder<InboxResyncWorker>(15, TimeUnit.MINUTES).build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    fun runNow(context: Context) {
      WorkManager.getInstance(context)
        .enqueueUniqueWork(NOW_NAME, ExistingWorkPolicy.REPLACE, OneTimeWorkRequestBuilder<InboxResyncWorker>().build())
    }

    fun cancelAll(context: Context) {
      WorkManager.getInstance(context).run {
        cancelUniqueWork(PERIODIC_NAME)
        cancelUniqueWork(NOW_NAME)
      }
    }
  }

  override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    val context = applicationContext
    if (!CaptureConfig.isConfigured(context)) return@withContext Result.success()
    // Restarts the heartbeat service after a reboot or an Android 15 dataSync timeout, when Android allows it.
    CaptureService.tryStart(context)
    if (context.checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
      return@withContext Result.success()
    }
    val senders = CaptureConfig.senders(context)
    val db = SmsQueueDb.get(context)
    val since = System.currentTimeMillis() - WINDOW_MS
    context.contentResolver.query(
      Telephony.Sms.Inbox.CONTENT_URI,
      arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.DATE_SENT),
      "${Telephony.Sms.DATE} >= ?",
      arrayOf(since.toString()),
      "${Telephony.Sms.DATE} ASC",
    )?.use { c ->
      while (c.moveToNext()) {
        val sender: String? = c.getString(0)
        if (sender != null && SmsFilter.isKnownSender(sender, senders)) {
          // DATE_SENT is the SMSC timestamp, i.e. the PDU timestampMillis the receiver uses: same fingerprint, no duplicate.
          val receivedAt = c.getLong(3).takeIf { it > 0 } ?: c.getLong(2)
          db.insert(sender, c.getString(1).orEmpty(), receivedAt)
        }
      }
    }
    UploadWorker.enqueue(context)
    Result.success()
  }
}
