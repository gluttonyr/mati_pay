package expo.modules.smsreader

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class QueuedSms(
  val id: Long,
  val fingerprint: String,
  val expediteur: String,
  val corps: String,
  val receivedAt: Long,
  val etatEnvoi: String,
  val tentatives: Int,
  val derniereErreur: String?,
)

/** Persistent SMS queue (spec section 5.2). Rows are never dropped before the backend has them, except ECHEC after repeated HTTP 400. */
class SmsQueueDb private constructor(context: Context) : SQLiteOpenHelper(context, "sms_reader_queue.db", null, 1) {
  companion object {
    const val PENDING = "EN_ATTENTE"
    const val SENT = "SENT"
    const val FAILED = "ECHEC"
    @Volatile private var instance: SmsQueueDb? = null
    fun get(context: Context): SmsQueueDb = instance ?: synchronized(this) {
      instance ?: SmsQueueDb(context.applicationContext).also { instance = it }
    }
  }

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
      """
      CREATE TABLE queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fingerprint TEXT NOT NULL UNIQUE,
        expediteur TEXT NOT NULL,
        corps TEXT NOT NULL,
        receivedAt INTEGER NOT NULL,
        etatEnvoi TEXT NOT NULL DEFAULT '$PENDING',
        tentatives INTEGER NOT NULL DEFAULT 0,
        derniereErreur TEXT,
        sentAt INTEGER
      )
      """.trimIndent(),
    )
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

  /** Returns false when the fingerprint is already queued. */
  fun insert(sender: String, body: String, receivedAt: Long): Boolean {
    val values = ContentValues().apply {
      put("fingerprint", SmsFilter.fingerprint(sender, receivedAt, body))
      put("expediteur", sender)
      put("corps", body)
      put("receivedAt", receivedAt)
    }
    return writableDatabase.insertWithOnConflict("queue", null, values, SQLiteDatabase.CONFLICT_IGNORE) != -1L
  }

  /** Pending rows after [afterId], in id order, so one upload run walks the queue once. */
  fun pending(afterId: Long, limit: Int): List<QueuedSms> =
    select("etatEnvoi = ? AND id > ?", arrayOf(PENDING, afterId.toString()), limit)

  /** What the app shows in the local "En file" tab: everything not yet accepted by the backend. */
  fun unsent(): List<QueuedSms> = select("etatEnvoi != ?", arrayOf(SENT), null)

  fun pendingCount(): Long =
    android.database.DatabaseUtils.queryNumEntries(readableDatabase, "queue", "etatEnvoi = ?", arrayOf(PENDING))

  fun markSent(id: Long, now: Long) {
    writableDatabase.update("queue", ContentValues().apply {
      put("etatEnvoi", SENT)
      put("sentAt", now)
      putNull("derniereErreur")
    }, "id = ?", arrayOf(id.toString()))
  }

  /** Increments tentatives; with [failAfter] the row becomes ECHEC once it reaches that count. */
  fun markError(row: QueuedSms, error: String, failAfter: Int? = null) {
    val attempts = row.tentatives + 1
    writableDatabase.update("queue", ContentValues().apply {
      put("tentatives", attempts)
      put("derniereErreur", error.take(500))
      if (failAfter != null && attempts >= failAfter) put("etatEnvoi", FAILED)
    }, "id = ?", arrayOf(row.id.toString()))
  }

  fun purgeSent(olderThan: Long) {
    writableDatabase.delete("queue", "etatEnvoi = ? AND sentAt < ?", arrayOf(SENT, olderThan.toString()))
  }

  private fun select(where: String, args: Array<String>, limit: Int?): List<QueuedSms> =
    readableDatabase.query("queue", null, where, args, null, null, "id ASC", limit?.toString()).use { c ->
      val result = ArrayList<QueuedSms>(c.count)
      while (c.moveToNext()) {
        result += QueuedSms(
          id = c.getLong(c.getColumnIndexOrThrow("id")),
          fingerprint = c.getString(c.getColumnIndexOrThrow("fingerprint")),
          expediteur = c.getString(c.getColumnIndexOrThrow("expediteur")),
          corps = c.getString(c.getColumnIndexOrThrow("corps")),
          receivedAt = c.getLong(c.getColumnIndexOrThrow("receivedAt")),
          etatEnvoi = c.getString(c.getColumnIndexOrThrow("etatEnvoi")),
          tentatives = c.getInt(c.getColumnIndexOrThrow("tentatives")),
          derniereErreur = c.getString(c.getColumnIndexOrThrow("derniereErreur")),
        )
      }
      result
    }
}
