package com.craftracestudio.topdownrace

import android.webkit.WebView
import android.view.View
import android.view.ViewGroup
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.atomic.AtomicReference
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class RewardedBridgeReleaseTest {
    @Test
    fun qaLoadsGoogleDemoWithoutShowing() {
        assumeTrue("Runs only against isolated QA flavors", BuildConfig.FLAVOR != "production")
        assertEquals("ca-app-pub-3940256099942544/5224354917", BuildConfig.TDR_REWARDED_AD_UNIT_ID)
        assertTrue("QA must not have production reward verification", !BuildConfig.TDR_REWARDED_CONFIGURED)
        val outcome = AtomicReference("no_callback")
        val callback = CountDownLatch(1)
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                TdrAdsConsentManager.get(activity.application).prepare(activity) { consent ->
                    if (!consent.canRequestAds || !consent.adsInitialized) {
                        outcome.set("consent_or_initialization_unavailable")
                        callback.countDown()
                        return@prepare
                    }
                    RewardedAd.load(
                        activity,
                        BuildConfig.TDR_REWARDED_AD_UNIT_ID,
                        AdRequest.Builder().build(),
                        object : RewardedAdLoadCallback() {
                            override fun onAdLoaded(ad: RewardedAd) {
                                outcome.set("loaded")
                                callback.countDown()
                            }

                            override fun onAdFailedToLoad(error: LoadAdError) {
                                outcome.set("load_failed_${error.code}_${error.domain}")
                                callback.countDown()
                            }
                        },
                    )
                }
            }
            assertTrue("Google demo load timed out", callback.await(120, TimeUnit.SECONDS))
            assertEquals("Google demo must really load (not just return a callback)", "loaded", outcome.get())
        }
    }

    @Test
    fun releaseWebViewExposesBridgeAndCallsNativePlugin() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            var webView = webViewFrom(scenario)

            assertGameReady(webView)
            assertBridge(webView)

            // Exercise the native boundary without showing or clicking an ad.
            val nativeResult = callBridge(webView, 0, "unsupported_qa_probe", "invalid")
            val expected = if (BuildConfig.TDR_ADS_SUSPENDED) "ads_suspended" else "unsupported_placement"
            assertTrue("Native plugin did not reject the request: $nativeResult", nativeResult.contains(expected))
            assertTrue(nativeResult.contains("\"verified\":false"))
            assertTrue(nativeResult.contains("\"completed\":false"))

            scenario.recreate()
            webView = webViewFrom(scenario)
            assertGameReady(webView)
            assertBridge(webView)
        }
    }

    @Test
    fun qaBridgeReportsDemoModeWithoutProductionVerification() {
        assumeTrue("Runs only against isolated QA flavors", BuildConfig.FLAVOR != "production")
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val webView = webViewFrom(scenario)
            assertGameReady(webView)
            assertBridge(webView)
            val result = eventually(webView) {
                """(()=>{
                    const key='tdrQaModeProbe';
                    if(!document.documentElement.dataset[key]){
                        document.documentElement.dataset[key]='pending';
                        window.__tdrRewardedAds.diagnostics()
                            .then(status=>document.documentElement.dataset[key]=JSON.stringify(status))
                            .catch(error=>document.documentElement.dataset[key]=JSON.stringify({error:String(error)}));
                    }
                    return document.documentElement.dataset[key];
                })()"""
            }
            assertTrue(result.contains("\"googleSampleAdMode\":true"))
            assertTrue(result.contains("\"configured\":false"))
        }
    }

    private fun webViewFrom(scenario: ActivityScenario<MainActivity>): WebView {
        lateinit var webView: WebView
        scenario.onActivity { activity ->
            webView = requireNotNull(findWebView(activity.window.decorView)) {
                "Capacitor WebView not found in the release Activity"
            }
        }
        return webView
    }

    private fun assertGameReady(webView: WebView) {
        val result = eventually(webView) {
            """(()=>{
              // The DEV entry notice intentionally requires a user click.
              // Accept it explicitly in the instrumentation test, then wait
              // for the real lobby rather than bypassing the production gate.
              const notice=document.getElementById('tdr-dev-entry-notice');
              notice?.querySelector('button')?.click();
              return window.__tdrStartupState?.ready === true &&
                document.querySelector('#app canvas') &&
                !document.getElementById('tdrStartup') ? 'lobby-ready' : 'pending';
            })()"""
        }
        assertEquals("lobby-ready", result)
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
            // A freshly recreated WebView can briefly drop an evaluation callback
            // while Chromium reconnects. Treat that as a transient condition and
            // keep polling within the existing overall deadline.
            if (!latch.await(20, TimeUnit.SECONDS)) {
                Thread.sleep(250)
                continue
            }
            if (last != "undefined" && last != "null" && last != "pending" && !last.contains("undefined")) return last
            Thread.sleep(150)
        }
        var diagnostic = "evaluation-unavailable"
        val diagnosticLatch = CountDownLatch(1)
        webView.post {
            webView.evaluateJavascript(
                """JSON.stringify({ready:window.__tdrStartupState?.ready||false,phase:window.__tdrStartupState?.phase||'missing',failure:window.__tdrStartupState?.failure||'',width:innerWidth,height:innerHeight,canvas:!!document.querySelector('#app canvas'),overlay:!!document.getElementById('tdrStartup'),bridge:typeof window.__tdrRewardedAds,boot:window.__tdrBootLast?.phase||'missing'})"""
            ) { value ->
                diagnostic = value
                diagnosticLatch.countDown()
            }
        }
        diagnosticLatch.await(5, TimeUnit.SECONDS)
        error("WebView condition was not met; last=$last diagnostic=$diagnostic")
    }
}
