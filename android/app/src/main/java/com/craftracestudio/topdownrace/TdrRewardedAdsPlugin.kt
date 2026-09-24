package com.craftracestudio.topdownrace

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.admob.enableRewardVerification
import com.revenuecat.purchases.admob.loadAndTrackRewardedAd
import com.revenuecat.purchases.admob.show
import java.security.MessageDigest
import java.util.UUID

@CapacitorPlugin(name = "TdrRewardedAds")
class TdrRewardedAdsPlugin : Plugin() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var activeAttempt: Attempt? = null

    private data class Attempt(
        val id: String,
        val placement: String,
        val claimHash: String,
        val call: PluginCall,
        var verificationStarted: Boolean = false,
    )

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val consent = consentManager().snapshot()
        val result = JSObject()
        result.put("bridgeReady", true)
        result.put("configured", BuildConfig.TDR_REWARDED_CONFIGURED)
        result.put("releaseBuild", BuildConfig.BUILD_TYPE == "release")
        result.put("placementCount", RewardedRequestPolicy.placements().size)
        result.put("versionName", BuildConfig.VERSION_NAME)
        result.put("consentUpdateCompleted", consent.updateCompleted)
        result.put("consentCanRequestAds", consent.canRequestAds)
        result.put("privacyOptionsRequired", consent.privacyOptionsRequired)
        result.put("adsInitialized", consent.adsInitialized)
        if (consent.reason != null) result.put("consentReason", consent.reason)
        Log.i(
            TAG,
            "bridge_status ready=true configured=${BuildConfig.TDR_REWARDED_CONFIGURED} " +
                "release=${BuildConfig.BUILD_TYPE == "release"} placements=${RewardedRequestPolicy.placements().size} " +
                "consent_complete=${consent.updateCompleted} can_request_ads=${consent.canRequestAds} " +
                "ads_initialized=${consent.adsInitialized}",
        )
        call.resolve(result)
    }

    @PluginMethod
    fun showPrivacyOptions(call: PluginCall) {
        consentManager().showPrivacyOptions(activity) { consent ->
            val result = JSObject()
            result.put("shown", consent.reason == null)
            result.put("canRequestAds", consent.canRequestAds)
            result.put("privacyOptionsRequired", consent.privacyOptionsRequired)
            if (consent.reason != null) result.put("reason", consent.reason)
            call.resolve(result)
        }
    }

    @PluginMethod
    fun show(call: PluginCall) {
        val placement = call.getString("placement")?.trim()
        val claimId = call.getString("claimId")?.trim()
        val validation = RewardedRequestPolicy.validate(placement, claimId)
        if (!validation.accepted) {
            resolveFailure(call, validation.reason ?: "invalid_request")
            return
        }
        if (!BuildConfig.TDR_REWARDED_CONFIGURED) {
            resolveFailure(call, "native_rewarded_not_configured")
            return
        }

        synchronized(this) {
            if (activeAttempt != null) {
                resolveFailure(call, "rewarded_already_active")
                return
            }
            call.setKeepAlive(true)
            activeAttempt = Attempt(
                id = UUID.randomUUID().toString(),
                placement = placement!!,
                claimHash = shortHash(claimId!!),
                call = call,
            )
        }

        val attempt = activeAttempt ?: return
        Log.i(TAG, "attempt=${attempt.id.take(8)} placement=${attempt.placement} claim=${attempt.claimHash} load")
        mainHandler.postDelayed({ finish(attempt, false, false, "native_watchdog_timeout") }, WATCHDOG_MS)
        consentManager().prepare(activity) { consent ->
            if (!isActive(attempt)) return@prepare
            if (!consent.canRequestAds || !consent.adsInitialized) {
                finish(attempt, false, false, consent.reason ?: "ads_consent_unavailable")
                return@prepare
            }
            activity.runOnUiThread { loadAndShow(attempt) }
        }
    }

    private fun consentManager(): TdrAdsConsentManager =
        TdrAdsConsentManager.get(activity.application)

    private fun loadAndShow(attempt: Attempt) {
        try {
            if (!(activity.application as TdrApplication).ensureRewardedSdk()) {
                finish(attempt, false, false, "revenuecat_unavailable")
                return
            }
            val lifecycleCallback = object : FullScreenContentCallback() {
                override fun onAdShowedFullScreenContent() {
                    Log.i(TAG, "attempt=${attempt.id.take(8)} shown")
                }

                override fun onAdFailedToShowFullScreenContent(error: AdError) {
                    Log.w(TAG, "attempt=${attempt.id.take(8)} show_failed code=${error.code} domain=${error.domain}")
                    finish(attempt, false, false, "show_failed_${error.code}")
                }

                override fun onAdDismissedFullScreenContent() {
                    Log.i(TAG, "attempt=${attempt.id.take(8)} dismissed verification_started=${attempt.verificationStarted}")
                    if (!attempt.verificationStarted) {
                        finish(attempt, false, false, "ad_incomplete")
                    }
                }
            }
            Purchases.sharedInstance.adTracker.loadAndTrackRewardedAd(
                context = activity,
                adUnitId = BuildConfig.TDR_REWARDED_AD_UNIT_ID,
                adRequest = AdRequest.Builder().build(),
                placement = attempt.placement,
                fullScreenContentCallback = lifecycleCallback,
                loadCallback = object : RewardedAdLoadCallback() {
                    override fun onAdLoaded(ad: RewardedAd) {
                        if (!isActive(attempt)) return
                        Log.i(TAG, "attempt=${attempt.id.take(8)} loaded")
                        ad.enableRewardVerification()
                        ad.show(
                            activity = activity,
                            rewardVerificationStarted = {
                                attempt.verificationStarted = true
                                Log.i(TAG, "attempt=${attempt.id.take(8)} ssv_started")
                            },
                            rewardVerificationCompleted = { verification ->
                                val verified = verification.verifiedReward != null
                                Log.i(TAG, "attempt=${attempt.id.take(8)} ssv_completed verified=$verified additional=${verification.moreRewards.size}")
                                finish(
                                    attempt,
                                    completed = verified,
                                    verified = verified,
                                    reason = if (verified) null else "ssv_not_verified",
                                )
                            },
                        )
                    }

                    override fun onAdFailedToLoad(error: LoadAdError) {
                        Log.w(TAG, "attempt=${attempt.id.take(8)} load_failed code=${error.code} domain=${error.domain}")
                        finish(attempt, false, false, "load_failed_${error.code}")
                    }
                },
            )
        } catch (error: Throwable) {
            Log.e(TAG, "attempt=${attempt.id.take(8)} native_error=${error.javaClass.simpleName}")
            finish(attempt, false, false, "native_error")
        }
    }

    @Synchronized
    private fun isActive(attempt: Attempt): Boolean = activeAttempt === attempt

    @Synchronized
    private fun finish(
        attempt: Attempt,
        completed: Boolean,
        verified: Boolean,
        reason: String?,
    ) {
        if (activeAttempt !== attempt) return
        activeAttempt = null
        mainHandler.removeCallbacksAndMessages(null)
        val result = JSObject()
        result.put("completed", completed && verified)
        result.put("verified", verified)
        result.put("source", "native")
        result.put("rewardId", "native-${attempt.id}")
        if (reason != null) result.put("reason", reason)
        Log.i(TAG, "attempt=${attempt.id.take(8)} final completed=${completed && verified} verified=$verified reason=${reason ?: "none"}")
        attempt.call.setKeepAlive(false)
        attempt.call.resolve(result)
    }

    private fun resolveFailure(call: PluginCall, reason: String) {
        val result = JSObject()
        result.put("completed", false)
        result.put("verified", false)
        result.put("source", "native")
        result.put("reason", reason)
        call.resolve(result)
    }

    override fun handleOnDestroy() {
        activeAttempt?.let { finish(it, false, false, "activity_destroyed") }
        super.handleOnDestroy()
    }

    private fun shortHash(value: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
        return digest.take(6).joinToString("") { "%02x".format(it) }
    }

    private companion object {
        const val TAG = "TDR_REWARDED"
        const val WATCHDOG_MS = 170_000L
    }
}
