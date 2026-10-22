package expo.modules.smsreader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SmsFilterTest {
  @Test
  fun `isKnownSender ignores case and spaces`() {
    assertTrue(SmsFilter.isKnownSender(" MIXX Togo ", listOf("Mixx Togo")))
  }

  @Test
  fun `unknown sender is rejected`() {
    assertFalse(SmsFilter.isKnownSender("Flooz", listOf("Mixx Togo")))
  }

  @Test
  fun `fingerprint matches the backend format`() {
    assertEquals(
      "0b0fc71491cef9031a6823a3346fd5ebd605467b3838823021684b0fdac2d724",
      SmsFilter.fingerprint("Mixx Togo", 1761055320000L, "Ref: 1"),
    )
  }
}
