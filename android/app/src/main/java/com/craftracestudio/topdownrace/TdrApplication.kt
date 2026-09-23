package com.craftracestudio.topdownrace

import android.app.Application
import android.util.Log
import com.google.android.gms.ads.MobileAds
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

class TdrApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        MobileAds.initialize(this) { status ->
            Log.i(TAG, "admob_initialized adapters=${status.adapterStatusMap.size}")
        }

        if (BuildConfig.TDR_REWARDED_CONFIGURED) {
            Purchases.configure(
                PurchasesConfiguration.Builder(
                    this,
                    BuildConfig.TDR_REVENUECAT_PUBLIC_SDK_KEY,
                ).build(),
            )
            Log.i(TAG, "revenuecat_configured=true")
        } else {
            Log.w(TAG, "revenuecat_configured=false variant=${BuildConfig.BUILD_TYPE}")
        }
    }

    private companion object {
        const val TAG = "TDR_REWARDED"
    }
}
