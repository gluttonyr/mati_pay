package expo.modules.smsreader

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

/** Manifest-declared SMS_RECEIVED receiver: runs even when the app process is dead. */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)?.filterNotNull().orEmpty()
    if (messages.isEmpty()) return
    val pending = goAsync()
    Thread {
      try {
        val app = context.applicationContext
        if (!CaptureConfig.isConfigured(app)) return@Thread
        val senders = CaptureConfig.senders(app)
        val db = SmsQueueDb.get(app)
        var queued = false
        // Parts arrive in PDU order; concatenate per sender, receivedAt = first PDU timestamp.
        messages.groupBy { it.originatingAddress.orEmpty() }.forEach { (sender, parts) ->
          if (sender.isNotEmpty() && SmsFilter.isKnownSender(sender, senders)) {
            val body = parts.joinToString("") { it.displayMessageBody.orEmpty() }
            if (db.insert(sender, body, parts.first().timestampMillis)) queued = true
          }
        }
        if (queued) {
          CaptureConfig.markReceived(app, System.currentTimeMillis())
          UploadWorker.enqueue(app)
        }
      } catch (error: Exception) {
        Log.e(UploadWorker.TAG, "SMS capture failed", error)
      } finally {
        pending.finish()
      }
    }.start()
  }
}
