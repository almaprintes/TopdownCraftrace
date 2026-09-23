package com.craftracestudio.topdownrace

import android.app.Activity
import android.app.Application
import android.util.Log
import com.google.android.gms.ads.MobileAds
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

/**
 * Owns the UMP -> Mobile Ads startup boundary. The rewarded bridge is installed
 * independently, but no ad request is allowed until UMP says that ads may be
 * requested for this device.
 */
class TdrAdsConsentManager private constructor(application: Application) {
    data class Snapshot(
        val updateCompleted: Boolean,
        val canRequestAds: Boolean,
        val privacyOptionsRequired: Boolean,
        val adsInitialized: Boolean,
        val reason: String? = null,
    )

    private val app = application
    private val consentInformation = UserMessagingPlatform.getConsentInformation(application)
    private val pending = mutableListOf<(Snapshot) -> Unit>()
    private var updateStarted = false
    private var updateCompleted = false
    private var adsInitializationStarted = false
    private var adsInitialized = false
    private var lastReason: String? = null

    @Synchronized
    fun snapshot(): Snapshot = currentSnapshot()

    fun prepare(activity: Activity, callback: (Snapshot) -> Unit) {
        activity.runOnUiThread {
            var immediate: Snapshot? = null
            val startUpdate = synchronized(this) {
                if (updateCompleted && (!consentInformation.canRequestAds() || adsInitialized)) {
                    immediate = currentSnapshot()
                    false
                } else {
                    pending += callback
                    if (updateStarted) false else {
                        updateStarted = true
                        true
                    }
                }
            }
            immediate?.let {
                callback(it)
                return@runOnUiThread
            }
            if (!startUpdate) return@runOnUiThread

            val parameters = ConsentRequestParameters.Builder().build()
            consentInformation.requestConsentInfoUpdate(
                activity,
                parameters,
                {
                    UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { formError ->
                        complete(formError?.let { "ump_form_${it.errorCode}" })
                    }
                },
                { requestError -> complete("ump_update_${requestError.errorCode}") },
            )
        }
    }

    fun showPrivacyOptions(activity: Activity, callback: (Snapshot) -> Unit) {
        activity.runOnUiThread {
            UserMessagingPlatform.showPrivacyOptionsForm(activity) { formError ->
                synchronized(this) {
                    lastReason = formError?.let { "ump_privacy_${it.errorCode}" }
                }
                if (consentInformation.canRequestAds()) {
                    initializeAdsOnce { callback(snapshot()) }
                } else {
                    callback(snapshot())
                }
            }
        }
    }

    private fun complete(reason: String?) {
        synchronized(this) {
            updateCompleted = true
            lastReason = reason
        }
        if (consentInformation.canRequestAds()) {
            initializeAdsOnce { flushPending() }
        } else {
            flushPending()
        }
    }

    private fun flushPending() {
        val callbacks: List<(Snapshot) -> Unit>
        val result: Snapshot
        synchronized(this) {
            result = currentSnapshot()
            callbacks = pending.toList()
            pending.clear()
        }
        Log.i(
            TAG,
            "consent_complete can_request_ads=${result.canRequestAds} " +
                "privacy_options_required=${result.privacyOptionsRequired} " +
                "ads_initialized=${result.adsInitialized} reason=${result.reason ?: "none"}",
        )
        callbacks.forEach { it(result) }
    }

    private fun initializeAdsOnce(onReady: () -> Unit) {
        var alreadyInitialized = false
        val shouldInitialize = synchronized(this) {
            if (adsInitialized) {
                alreadyInitialized = true
                false
            } else if (adsInitializationStarted) {
                pending += { onReady() }
                false
            } else {
                adsInitializationStarted = true
                true
            }
        }
        if (alreadyInitialized) {
            onReady()
            return
        }
        if (!shouldInitialize) return
        MobileAds.initialize(app) { status ->
            synchronized(this) { adsInitialized = true }
            Log.i(TAG, "admob_initialized adapters=${status.adapterStatusMap.size}")
            onReady()
        }
    }

    @Synchronized
    private fun currentSnapshot(): Snapshot = Snapshot(
        updateCompleted = updateCompleted,
        canRequestAds = consentInformation.canRequestAds(),
        privacyOptionsRequired =
            consentInformation.privacyOptionsRequirementStatus ==
                ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED,
        adsInitialized = adsInitialized,
        reason = lastReason,
    )

    companion object {
        private const val TAG = "TDR_REWARDED"

        @Volatile
        private var instance: TdrAdsConsentManager? = null

        @JvmStatic
        fun get(application: Application): TdrAdsConsentManager =
            instance ?: synchronized(this) {
                instance ?: TdrAdsConsentManager(application).also { instance = it }
            }
    }
}
