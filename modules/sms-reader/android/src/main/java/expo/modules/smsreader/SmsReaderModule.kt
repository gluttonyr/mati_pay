package expo.modules.smsreader

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class StartConfig : Record {
  @Field val apiUrl: String = ""
  @Field val deviceId: String = ""
  @Field val deviceToken: String = ""
  @Field val senders: List<String> = emptyList()
}

class SmsReaderModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    AsyncFunction("start") { config: StartConfig ->
      require(config.apiUrl.isNotBlank() && config.deviceToken.isNotBlank()) { "apiUrl and deviceToken are required" }
      val ctx = context
      CaptureConfig.save(ctx, config.apiUrl, config.deviceId, config.deviceToken, config.senders)
      SmsQueueDb.get(ctx).retryFailed()
      CaptureService.tryStart(ctx)
      InboxResyncWorker.schedulePeriodic(ctx)
      InboxResyncWorker.runNow(ctx)
      UploadWorker.enqueue(ctx)
    }

    AsyncFunction("stop") {
      val ctx = context
      CaptureService.stop(ctx)
      InboxResyncWorker.cancelAll(ctx)
      CaptureConfig.clear(ctx) // queue rows are kept and resent after the next start()
    }

    AsyncFunction("updateSenders") { senders: List<String> ->
      CaptureConfig.setSenders(context, senders)
    }

    AsyncFunction("resyncNow") {
      val ctx = context
      SmsQueueDb.get(ctx).retryFailed()
      InboxResyncWorker.runNow(ctx) // the resync ends by enqueuing UploadWorker
    }

    AsyncFunction("getStatus") {
      val ctx = context
      mapOf(
        "running" to CaptureService.running,
        "smsPermission" to (granted(ctx, Manifest.permission.RECEIVE_SMS) && granted(ctx, Manifest.permission.READ_SMS)),
        "notificationPermission" to NotificationManagerCompat.from(ctx).areNotificationsEnabled(),
        "batteryOptimizationIgnored" to ctx.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(ctx.packageName),
        "authRequired" to CaptureConfig.authRequired(ctx),
        "queueSize" to SmsQueueDb.get(ctx).unsentCount(),
        "lastReceivedAt" to CaptureConfig.lastReceivedAt(ctx),
        "lastSentAt" to CaptureConfig.lastSentAt(ctx),
        "lastError" to CaptureConfig.lastError(ctx),
      )
    }

    AsyncFunction("listLocalQueue") {
      SmsQueueDb.get(context).unsent().map {
        mapOf(
          "fingerprint" to it.fingerprint,
          "expediteur" to it.expediteur,
          "corps" to it.corps,
          "receivedAt" to it.receivedAt,
          "tentatives" to it.tentatives,
          "derniereErreur" to it.derniereErreur,
        )
      }
    }

    // Lint "BatteryLife": accepted, this sideloaded admin tool needs the exemption (spec section 5).
    AsyncFunction("requestBatteryOptimizationExemption") {
      val ctx = context
      ctx.startActivity(
        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${ctx.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }
  }

  private fun granted(ctx: Context, permission: String) =
    ctx.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED
}
