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
    final String PREVIEW_URL_PREFIX = "http://10.0.2.2:3333/lwc/preview/";
    final String DEBUG_ARG = "ShowDebugInfoToggleButton";
    final String USERNAME_ARG = "username";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Bundle launchArguments = getIntent().getExtras();
        String componentUrl = getComponentUrl(launchArguments);
        Boolean isDebugEnabled = getIsDebugEnabled(launchArguments);
        String username = getUsername(launchArguments);
        String requestUrl = componentUrl + "?username=" + username;
        String debugInfo = "RAW LAUNCH PARAMETERS:\n\n" +
                getDebugInfo(launchArguments) +
                "\n\n\n\nRESOLVED URL:\n\n" + requestUrl;

        Button toggleDebugInfoButton = findViewById(R.id.toggleDebugInfoButton);
        progressBar = findViewById(R.id.progressBar);
        debugTextView = findViewById(R.id.debugTextView);
        debugTextView.setText(debugInfo);

        if (!isDebugEnabled) {
            // If ShowDebugInfoToggleButton is not enabled then remove the button and text view
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

        if (!requestUrl.isEmpty()) {
            progressBar.setVisibility(View.VISIBLE);
            webView.loadUrl(requestUrl);
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

    /**
     * Attempts at fetching the component URL from the provided custom launch arguments.
     *
     * @param launchArguments an array of provided launch arguments
     * @return a string corresponding to the value provided for the component URL in the
     * launch arguments. If the component URL is not provided in the launch arguments this
     * method returns an empty string.
     */
    private String getComponentUrl(Bundle launchArguments) {
        if (launchArguments != null) {
            String component = launchArguments.getString(COMPONENT_NAME_ARG_PREFIX);
            if (component != null) {
                return PREVIEW_URL_PREFIX + component;
            }
        }

        return "";
    }

    /**
     * Attempts at fetching the username from the provided custom launch arguments.
     *
     * @param launchArguments an array of provided launch arguments
     * @return a string corresponding to the value provided for the username in the
     * launch arguments. If the username is not provided in the launch arguments this
     * method returns an empty string.
     */
    private String getUsername(Bundle launchArguments) {
        if (launchArguments != null && launchArguments.containsKey(USERNAME_ARG)) {
            return launchArguments.getString(USERNAME_ARG);
        }

        return "";
    }

    /**
     * Attempts at fetching ShowDebugInfoToggleButton from the provided custom launch arguments.
     *
     * @param launchArguments an array of provided launch arguments
     * @return a string corresponding to the value provided for ShowDebugInfoToggleButton in the
     * launch arguments. If ShowDebugInfoToggleButton is not provided in the launch arguments this
     * method returns TRUE.
     */
    private Boolean getIsDebugEnabled(Bundle launchArguments) {
        if (launchArguments != null && launchArguments.containsKey(DEBUG_ARG)) {
            return Boolean.parseBoolean(launchArguments.getString(DEBUG_ARG));
        }
        return true;
    }

    /**
     * Goes through all of the provided custom launch arguments and generates a string containing
     * all of them. The result of this method will be used in showing debug info to the user.
     *
     * @param launchArguments an array of provided launch arguments
     * @return a string containing all of the provided launch arguments
     */
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

