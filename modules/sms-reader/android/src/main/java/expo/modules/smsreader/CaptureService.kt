package expo.modules.smsreader

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException

/** Foreground service: "Mati-Pay actif" notification, heartbeat and upload kick every 60 s. */
class CaptureService : Service() {
  companion object {
    private const val CHANNEL_ID = "capture"
    private const val NOTIFICATION_ID = 4201
    private const val INTERVAL_MS = 60_000L
    @Volatile var running = false
      private set

    /** Starts the service; returns false when Android refuses a background start (Android 12+ / 15 boot rules). */
    fun tryStart(context: Context): Boolean = try {
      val intent = Intent(context, CaptureService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
      true
    } catch (error: Exception) {
      Log.w(UploadWorker.TAG, "Capture service not started: ${error.message}")
      false
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, CaptureService::class.java))
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private val tick = object : Runnable {
    override fun run() {
      sendHeartbeat()
      UploadWorker.enqueue(applicationContext)
      handler.postDelayed(this, INTERVAL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // startForeground must come first: startForegroundService() without it crashes the app even if we stop right away.
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
      } else {
        startForeground(NOTIFICATION_ID, buildNotification())
      }
    } catch (error: Exception) {
      // ForegroundServiceStartNotAllowedException (e.g. dataSync quota exhausted): workers keep the queue moving.
      Log.w(UploadWorker.TAG, "startForeground refused: ${error.message}")
      stopSelf()
      return START_NOT_STICKY
    }
    if (!CaptureConfig.isConfigured(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    if (!running) {
      running = true
      handler.post(tick)
    }
    return START_STICKY
  }

  // Android 15+: dataSync services get at most 6 h per 24 h; we must stop or the app is killed with an ANR-like crash.
  override fun onTimeout(startId: Int, fgsType: Int) {
    Log.w(UploadWorker.TAG, "dataSync time limit reached; service stops, WorkManager keeps uploading")
    stopSelf()
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    running = false
    super.onDestroy()
  }

  private fun sendHeartbeat() {
    val apiUrl = CaptureConfig.apiUrl(this)
    val token = CaptureConfig.deviceToken(this)
    if (apiUrl.isNullOrBlank() || token.isNullOrBlank() || CaptureConfig.authRequired(this)) return
    val request = UploadWorker.post(apiUrl, token, "/sms-capture/heartbeat", JSONObject().put("ready", true))
    UploadWorker.http.newCall(request).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        Log.w(UploadWorker.TAG, "Heartbeat failed: ${e.message}")
      }

      override fun onResponse(call: Call, response: Response) {
        if (response.code == 401) {
          CaptureConfig.setAuthRequired(applicationContext)
          CaptureConfig.setLastError(applicationContext, "Reconnexion requise")
        }
        response.close()
      }
    })
  }

  private fun buildNotification(): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Capture des SMS", NotificationManager.IMPORTANCE_LOW))
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION") Notification.Builder(this)
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
    }
    return builder
      .setContentTitle("Mati-Pay actif")
      .setContentText("Capture des SMS de paiement")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .setContentIntent(launch)
      .build()
  }
}
