package com.craftracestudio.topdownrace;

import android.os.Bundle;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.util.Log;
import android.view.View;
import android.webkit.ConsoleMessage;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i("TDR_BOOT", "native_on_create");
        applyPhoneOrientationPolicy();
        registerPlugin(TdrRewardedAdsPlugin.class);
        super.onCreate(savedInstanceState);
        applyImmersiveMode();
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

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersiveMode();
    }

    private void applyPhoneOrientationPolicy() {
        Configuration configuration = getResources().getConfiguration();
        // Phones keep the intended racing experience in landscape. Large-screen
        // devices stay resizable/orientation-flexible as required by Android.
        if (configuration.smallestScreenWidthDp < 600) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    private void applyImmersiveMode() {
        View decorView = getWindow().getDecorView();

        // Keep the game edge-to-edge and hide both status and navigation bars.
        // WindowInsetsControllerCompat is the primary path on current Android.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), decorView);
        controller.hide(
            WindowInsetsCompat.Type.statusBars() |
            WindowInsetsCompat.Type.navigationBars()
        );
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );

        // Some OEM Android builds using classic 3-button navigation do not keep
        // navigationBars() hidden reliably. IMMERSIVE_STICKY is retained as a
        // compatibility fallback so triangle/circle/square stay out of gameplay.
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }
}
