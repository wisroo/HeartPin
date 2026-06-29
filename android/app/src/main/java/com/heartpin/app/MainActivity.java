package com.heartpin.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(HeartPinMediaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
