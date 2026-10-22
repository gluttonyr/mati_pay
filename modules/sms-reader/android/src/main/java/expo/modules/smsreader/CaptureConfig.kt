package expo.modules.smsreader

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray

/** Device token, API URL, senders and capture status, kept in EncryptedSharedPreferences. */
@Suppress("DEPRECATION") // security-crypto 1.1.0 deprecates the API; still the requested storage.
object CaptureConfig {
  private const val FILE = "sms_reader_secure_prefs"
  @Volatile private var cached: SharedPreferences? = null

  fun prefs(context: Context): SharedPreferences = cached ?: synchronized(this) {
    cached ?: open(context.applicationContext).also { cached = it }
  }

  private fun open(context: Context): SharedPreferences {
    fun create() = EncryptedSharedPreferences.create(
      context,
      FILE,
      MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
    return try {
      create()
    } catch (error: Exception) {
      // Keystore key lost (backup restore, OS bug): the file is unreadable; reset it so capture can be restarted.
      context.deleteSharedPreferences(FILE)
      create()
    }
  }

  fun save(context: Context, apiUrl: String, deviceId: String, deviceToken: String, senders: List<String>) {
    prefs(context).edit()
      .putString("apiUrl", apiUrl.trimEnd('/'))
      .putString("deviceId", deviceId)
      .putString("deviceToken", deviceToken)
      .putString("senders", JSONArray(senders).toString())
      .putBoolean("authRequired", false)
      .apply()
  }

  /** Clears credentials and senders; status timestamps are kept for the UI. */
  fun clear(context: Context) {
    prefs(context).edit().remove("apiUrl").remove("deviceId").remove("deviceToken").remove("senders").apply()
  }

  fun isConfigured(context: Context) = !apiUrl(context).isNullOrBlank() && !deviceToken(context).isNullOrBlank()
  fun apiUrl(context: Context) = prefs(context).getString("apiUrl", null)
  fun deviceToken(context: Context) = prefs(context).getString("deviceToken", null)

  fun senders(context: Context): List<String> = runCatching {
    val array = JSONArray(prefs(context).getString("senders", "[]"))
    (0 until array.length()).map { array.getString(it) }
  }.getOrDefault(emptyList())

  fun setSenders(context: Context, senders: List<String>) {
    prefs(context).edit().putString("senders", JSONArray(senders).toString()).apply()
  }

  fun authRequired(context: Context) = prefs(context).getBoolean("authRequired", false)
  fun setAuthRequired(context: Context) = prefs(context).edit().putBoolean("authRequired", true).apply()

  fun lastReceivedAt(context: Context) = optLong(context, "lastReceivedAt")
  fun lastSentAt(context: Context) = optLong(context, "lastSentAt")
  fun lastError(context: Context) = prefs(context).getString("lastError", null)

  fun markReceived(context: Context, at: Long) = prefs(context).edit().putLong("lastReceivedAt", at).apply()
  fun markSent(context: Context, at: Long) = prefs(context).edit().putLong("lastSentAt", at).apply()
  fun setLastError(context: Context, error: String?) = prefs(context).edit().putString("lastError", error).apply()

  private fun optLong(context: Context, key: String): Long? =
    prefs(context).let { if (it.contains(key)) it.getLong(key, 0) else null }
}
