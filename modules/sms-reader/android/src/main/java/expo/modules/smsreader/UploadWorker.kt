package expo.modules.smsreader

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Sends the queue to POST {apiUrl}/sms-capture/batch, 100 rows (and at most ~90 kB) at a time.
 * Always returns success, never a WorkManager retry: its backoff (up to 5 h) plus KEEP would make new SMS wait
 * behind it. Leftovers are resent by the next enqueue: service tick (60 s), SmsReceiver, inbox resync (15 min).
 */
class UploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  companion object {
    const val TAG = "SmsReader"
    private const val UNIQUE_NAME = "sms-reader-upload"
    private const val BATCH_SIZE = 100
    // Nest's default JSON body limit is 100 kB; keep margin for the {"sms":[...]} wrapper.
    private const val MAX_BODY_BYTES = 90_000
    // A row the backend rejects as a malformed batch (400) on its own is parked as ECHEC after this many tries.
    private const val MAX_INVALID_ATTEMPTS = 5
    private const val SENT_RETENTION_MS = 7L * 24 * 60 * 60 * 1000
    private val JSON = "application/json; charset=utf-8".toMediaType()

    val http: OkHttpClient by lazy {
      OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).build()
    }

    fun post(apiUrl: String, token: String, path: String, body: JSONObject): Request =
      Request.Builder()
        .url("$apiUrl$path")
        .header("Authorization", "Device $token")
        .post(body.toString().toRequestBody(JSON))
        .build()

    fun enqueue(context: Context) {
      val request = OneTimeWorkRequestBuilder<UploadWorker>()
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .build()
      WorkManager.getInstance(context).enqueueUniqueWork(UNIQUE_NAME, ExistingWorkPolicy.KEEP, request)
    }
  }

  override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    val context = applicationContext
    val db = SmsQueueDb.get(context)
    db.purgeSent(System.currentTimeMillis() - SENT_RETENTION_MS)
    val apiUrl = CaptureConfig.apiUrl(context)
    val token = CaptureConfig.deviceToken(context)
    if (apiUrl.isNullOrBlank() || token.isNullOrBlank() || CaptureConfig.authRequired(context)) {
      return@withContext Result.success()
    }

    var cursor = 0L
    var batchSize = BATCH_SIZE
    var itemErrors = false
    while (!isStopped) {
      val candidates = db.pending(cursor, batchSize)
      if (candidates.isEmpty()) break
      val rows = ArrayList<QueuedSms>()
      val sms = JSONArray()
      var bytes = 0
      for (row in candidates) {
        // Backend limits (expediteur <= 150, corps <= 2000): trim here so a long SMS cannot block the batch with a 400.
        val item = JSONObject()
          .put("expediteur", row.expediteur.take(150))
          .put("corps", row.corps.take(2000))
          .put("receivedAt", row.receivedAt)
        val size = item.toString().toByteArray(Charsets.UTF_8).size + 1
        if (rows.isNotEmpty() && bytes + size > MAX_BODY_BYTES) break // a single oversized row still goes alone
        sms.put(item)
        rows += row
        bytes += size
      }
      val response = try {
        http.newCall(post(apiUrl, token, "/sms-capture/batch", JSONObject().put("sms", sms))).execute()
      } catch (error: Exception) {
        CaptureConfig.setLastError(context, "Réseau : ${error.message ?: error.javaClass.simpleName}")
        return@withContext Result.success()
      }
      val text = response.use { it.body?.string().orEmpty() }
      when {
        response.code == 401 -> {
          Log.w(TAG, "Device token rejected (401); queue kept until reconnection")
          CaptureConfig.setAuthRequired(context)
          CaptureConfig.setLastError(context, "Reconnexion requise")
          return@withContext Result.success()
        }
        response.code == 400 -> {
          Log.w(TAG, "Batch of ${rows.size} rejected (HTTP 400)") // not the body: it may echo SMS text
          if (batchSize > 1) {
            // Resend this slice one row at a time to isolate the malformed row.
            batchSize = 1
            continue
          }
          db.markError(rows[0], "HTTP 400 : ${text.take(300)}", failAfter = MAX_INVALID_ATTEMPTS)
          itemErrors = true
          batchSize = BATCH_SIZE
        }
        !response.isSuccessful -> {
          CaptureConfig.setLastError(context, "HTTP ${response.code}")
          return@withContext Result.success()
        }
        else -> {
          val results = runCatching { JSONObject(text).optJSONArray("data") }.getOrNull()
          val now = System.currentTimeMillis()
          // Results come back in the order sent; a failed item may have fingerprint '' so match by index.
          rows.forEachIndexed { index, row ->
            val result = results?.optJSONObject(index)
            val error = result?.takeIf { it.has("error") && !it.isNull("error") }?.optString("error")
            when {
              result == null -> { db.markError(row, "Réponse sans résultat"); itemErrors = true }
              result.has("statut") || error.isNullOrBlank() -> db.markSent(row.id, now)
              else -> { db.markError(row, error); itemErrors = true }
            }
          }
          CaptureConfig.markSent(context, now)
        }
      }
      cursor = rows.last().id
    }
    if (itemErrors) {
      CaptureConfig.setLastError(context, "Certains SMS n'ont pas été traités par le serveur")
    } else {
      CaptureConfig.setLastError(context, null)
    }
    Result.success()
  }
}
