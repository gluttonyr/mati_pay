package expo.modules.smsreader

import java.security.MessageDigest

object SmsFilter {
  fun isKnownSender(sender: String, senders: List<String>): Boolean {
    val normalized = sender.trim().lowercase()
    return senders.any { it.trim().lowercase() == normalized }
  }

  /** Same formula as the backend: sha256_hex("$sender|$receivedAtMs|$body"). */
  fun fingerprint(sender: String, receivedAtMs: Long, body: String): String =
    MessageDigest.getInstance("SHA-256")
      .digest("$sender|$receivedAtMs|$body".toByteArray(Charsets.UTF_8))
      .joinToString("") { "%02x".format(it) }
}
