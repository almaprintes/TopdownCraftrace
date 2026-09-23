package com.craftracestudio.topdownrace;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TdrRewardedAdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
