package com.craftracestudio.topdownrace

import android.webkit.WebView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class RewardedBridgeReleaseTest {
    @Test
    fun releaseWebViewExposesBridgeAndCallsNativePlugin() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            lateinit var webView: WebView
            scenario.onActivity { activity -> webView = activity.bridge.webView }

            val bridgeTypes = eventually(webView) {
                "typeof window.__tdrRewardedAds+'|'+typeof window.__tdrRewardedAds?.show"
            }
            assertEquals("object|function", bridgeTypes)

            val nativeResult = eventually(webView) {
                """
                (()=>{
                  const key='tdrRewardedNativeProbe';
                  if(!document.documentElement.dataset[key]){
                    document.documentElement.dataset[key]='pending';
                    window.__tdrRewardedAds.show({
                      placement:'post_race_double_loot',
                      claimId:'post-race-x2:release-webview:probe'
                    }).then(result=>document.documentElement.dataset[key]=JSON.stringify(result))
                      .catch(error=>document.documentElement.dataset[key]=JSON.stringify({reason:String(error?.message||error)}));
                  }
                  return document.documentElement.dataset[key];
                })()
                """.trimIndent()
            }
            assertTrue(nativeResult.contains("native_rewarded_not_configured"))
            assertTrue(nativeResult.contains("\"verified\":false"))
            assertTrue(nativeResult.contains("\"completed\":false"))
        }
    }

    private fun eventually(webView: WebView, expression: () -> String): String {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(30)
        var last = ""
        while (System.nanoTime() < deadline) {
            val latch = CountDownLatch(1)
            webView.post {
                webView.evaluateJavascript(expression()) { raw ->
                    last = raw
                        .removePrefix("\"")
                        .removeSuffix("\"")
                        .replace("\\\"", "\"")
                        .replace("\\\\", "\\")
                    latch.countDown()
                }
            }
            check(latch.await(5, TimeUnit.SECONDS)) { "WebView evaluation timed out" }
            if (last != "undefined" && last != "null" && last != "pending" && !last.contains("undefined")) return last
            Thread.sleep(150)
        }
        error("WebView condition was not met; last=$last")
    }
}
