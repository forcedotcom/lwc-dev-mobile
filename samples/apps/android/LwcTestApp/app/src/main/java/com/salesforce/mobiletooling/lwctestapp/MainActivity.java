package com.salesforce.mobiletooling.lwctestapp;

import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import java.util.Set;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private ProgressBar progressBar;
    private TextView debugTextView;

    final String NAMESPACE = "com.salesforce.mobile-tooling";
    final String COMPONENT_NAME_ARG_PREFIX = NAMESPACE + ".componentname";
    final String PROJECT_DIR_ARG_PREFIX = NAMESPACE + ".projectdir";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Bundle launchArguments = getIntent().getExtras();
        String componentUrl = getComponentUrl(launchArguments);
        Boolean isDebugEnabled = getIsDebugEnabled(launchArguments);
        String debugInfo = getDebugInfo(launchArguments) + "\n\n" + componentUrl;

        Button toggleDebugInfoButton = findViewById(R.id.toggleDebugInfoButton);
        progressBar = findViewById(R.id.progressBar);
        debugTextView = findViewById(R.id.debugTextView);
        debugTextView.setText(debugInfo);

        if (!isDebugEnabled) {
            toggleDebugInfoButton.setVisibility(View.GONE);
            debugTextView.setVisibility(View.GONE);
        }

        webView = findViewById(R.id.webview);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, final String url) {
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            }
        });

        if (!componentUrl.isEmpty()) {
            progressBar.setVisibility(View.VISIBLE);
            webView.loadUrl(componentUrl);
        }
    }

    public void onToggleDebugInfoButtonClicked(View v) {
        int visibility = debugTextView.getVisibility();
        if (visibility == View.VISIBLE) {
            debugTextView.setVisibility(View.INVISIBLE);
        } else {
            debugTextView.setVisibility(View.VISIBLE);
        }
    }

    @Override public void onBackPressed() {
        if(webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private String getComponentUrl(Bundle launchArguments) {
        if (launchArguments != null) {
            String component = launchArguments.getString(COMPONENT_NAME_ARG_PREFIX);
            if (component != null) {
                return "http://10.0.2.2:3333/lwc/preview/" + component;
            }
        }

        return "";
    }

    private Boolean getIsDebugEnabled(Bundle launchArguments) {
        if (launchArguments != null && launchArguments.containsKey("ShowDebugInfo")) {
            return Boolean.parseBoolean(launchArguments.getString("ShowDebugInfo"));
        }
        return false;
    }

    private String getDebugInfo(Bundle launchArguments) {
        StringBuilder debugInfo = new StringBuilder();

        if (launchArguments != null) {
            Set<String> keys = launchArguments.keySet();
            for (String key : keys) {
                debugInfo.append(key).append("=").append(launchArguments.getString(key)).append("\n\n");
            }
        }

        return debugInfo.toString();
    }
}

