package com.craftracestudio.topdownrace

import android.app.Application
import android.util.Log
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

class TdrApplication : Application() {
    @Synchronized
    fun ensureRewardedSdk(): Boolean {
        if (sdkReady) return true
        if (!BuildConfig.TDR_REWARDED_CONFIGURED) return false
        return try {
            Purchases.configure(
                PurchasesConfiguration.Builder(this, BuildConfig.TDR_REVENUECAT_PUBLIC_SDK_KEY).build(),
            )
            sdkReady = true
            Log.i(TAG, "revenuecat_configured=true")
            true
        } catch (error: Exception) {
            Log.w(TAG, "revenuecat_unavailable type=${error.javaClass.simpleName}")
            false
        }
    }

    private var sdkReady = false

    private companion object {
        const val TAG = "TDR_REWARDED"
    }
}
