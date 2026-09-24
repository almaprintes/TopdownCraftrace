package com.craftracestudio.topdownrace;

import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i("TDR_BOOT", "native_on_create");
        registerPlugin(TdrRewardedAdsPlugin.class);
        super.onCreate(savedInstanceState);
        // Preserve Capacitor's Chrome client behavior. Only allow fixed diagnostic
        // codes through release logging; never log arbitrary console messages here.
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                String value = message.message();
                if (value != null && value.matches("\\[TDR_BOOT\\] [a-z0-9_=| -]{1,180}")) {
                    Log.i("TDR_BOOT", value);
                    return true;
                }
                return super.onConsoleMessage(message);
            }
        });
        Log.i("TDR_BOOT", "native_webview_created");
    }
}
