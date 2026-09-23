package com.craftracestudio.topdownrace

import android.webkit.WebView
import android.view.View
import android.view.ViewGroup
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class RewardedBridgeReleaseTest {
    @Test
    fun releaseWebViewExposesBridgeAndCallsNativePlugin() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            var webView = webViewFrom(scenario)

            assertBridge(webView)

            if (!BuildConfig.TDR_REWARDED_CONFIGURED) requests().forEachIndexed { index, request ->
                val nativeResult = callBridge(webView, index, request.first, request.second)
                assertTrue("${request.first} did not reach the native plugin: $nativeResult", nativeResult.contains("native_rewarded_not_configured"))
                assertTrue(nativeResult.contains("\"verified\":false"))
                assertTrue(nativeResult.contains("\"completed\":false"))
            }

            scenario.recreate()
            webView = webViewFrom(scenario)
            assertBridge(webView)
        }
    }

    @Test
    fun physicalDeviceCompletesAndVerifiesEveryPlacement() {
        assumeTrue("Runs only against the isolated physical-device flavor", BuildConfig.FLAVOR == "deviceTest")
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val webView = webViewFrom(scenario)
            assertBridge(webView)
            requests().forEachIndexed { index, request ->
                val result = callBridge(webView, index + 20, request.first, request.second)
                assertTrue("${request.first} was not completed: $result", result.contains("\"completed\":true"))
                assertTrue("${request.first} was not SSV verified: $result", result.contains("\"verified\":true"))
            }
        }
    }

    private fun requests() =
        listOf(
                "post_race_double_loot" to "post-race-x2:release-webview:probe",
                "race_control_publish_record" to "race-control-publish:release-webview:probe",
                "race_control_ghost_download" to "race-control-ghost:release-webview:probe",
                "recycler_exchange_2" to "recycler-exchange:release-webview:probe:2",
                "recycler_exchange_3" to "recycler-exchange:release-webview:probe:3",
                "store_coins_100_4h" to "store-coins-100:release-webview:probe",
            )

    private fun webViewFrom(scenario: ActivityScenario<MainActivity>): WebView {
        lateinit var webView: WebView
        scenario.onActivity { activity ->
            webView = requireNotNull(findWebView(activity.window.decorView)) {
                "Capacitor WebView not found in the release Activity"
            }
        }
        return webView
    }

    private fun assertBridge(webView: WebView) {
        val bridgeTypes = eventually(webView) {
            "typeof window.__tdrRewardedAds+'|'+typeof window.__tdrRewardedAds?.show"
        }
        assertEquals("object|function", bridgeTypes)
    }

    private fun callBridge(webView: WebView, index: Int, placement: String, claimId: String): String =
        eventually(webView) {
            """(()=>{
              const key='tdrRewardedNativeProbe$index';
              if(!document.documentElement.dataset[key]){
                document.documentElement.dataset[key]='pending';
                window.__tdrRewardedAds.show({
                  placement:'$placement',
                  claimId:'$claimId'
                }).then(result=>document.documentElement.dataset[key]=JSON.stringify(result))
                  .catch(error=>document.documentElement.dataset[key]=JSON.stringify({reason:String(error?.message||error)}));
              }
              return document.documentElement.dataset[key];
            })()"""
        }

    private fun findWebView(view: View): WebView? {
        if (view is WebView) return view
        if (view !is ViewGroup) return null
        for (index in 0 until view.childCount) {
            findWebView(view.getChildAt(index))?.let { return it }
        }
        return null
    }

    private fun eventually(webView: WebView, expression: () -> String): String {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(240)
        var last = ""
        while (System.nanoTime() < deadline) {
            val latch = CountDownLatch(1)
            webView.post {
                webView.evaluateJavascript(expression()) { raw ->
                    var decoded = raw
                    if (decoded.length >= 2 && decoded[0] == '"' && decoded[decoded.length - 1] == '"') {
                        decoded = decoded.substring(1, decoded.length - 1)
                    }
                    last = decoded.replace("\\\"", "\"").replace("\\\\", "\\")
                    latch.countDown()
                }
            }
            check(latch.await(20, TimeUnit.SECONDS)) { "WebView evaluation timed out" }
            if (last != "undefined" && last != "null" && last != "pending" && !last.contains("undefined")) return last
            Thread.sleep(150)
        }
        error("WebView condition was not met; last=$last")
    }
}
