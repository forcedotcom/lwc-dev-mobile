# summary

Preview Lightning Web Components in a virtual mobile environment.

# flags.target.description

Specify target virtual device name.

# flags.targetApp.description

Identifies the target app. Defaults to the browser app.

# flags.configHelp.description

Displays the format of the preview config file.

# flags.configFile.description

Extended configuration options for preview. Note: this is required for previewing against a mobile app, as apps require extended configuration.

# flags.componentName.description

Component name.

# flags.projectDir.description

Path to the root of the component project. Defaults to the current working directory.

# flags.ignoringConfigFile.description

Configuration file will be ignored when target app is browser.

# error.invalidComponentName

Invalid or missing component name.

# error.invalidConfigFile.missing

Invalid or missing configuration file %s

# error.invalidConfigFile.generic

Configuration file has an invalid format: %s\n%s

# error.invalidConfigFile.missingAppConfig

No configuration found for %s for platform %s

# reqs.serverInstalled.title

Checking @salesforce/lwc-dev-server plugin is installed

# reqs.serverInstalled.fulfilledMessage

@salesforce/lwc-dev-server plugin is installed.

# reqs.serverInstalled.unfulfilledMessage

Install the @salesforce/lwc-dev-server plugin.

# reqs.serverStarted.title

Checking whether local development server is running

# reqs.serverStarted.fulfilledMessage

Local development server is running on port %s.

# reqs.serverStarted.unfulfilledMessage

Local development server is not running.

# preview.action

Start Preview

# preview.fetch.appBundle.status

fetching app bundle path

# preview.fetch.appBundle.failureStatus

error encountered while fetching app bundle path

# examples

- <%= config.bin %> <%= command.id %> -p ios -t MySimulator -n HelloWordComponent
- <%= config.bin %> <%= command.id %> -p android -t MyEmulator -n HelloWordComponent

# configFile.help.description
Below is a sample configuration:

{
  "apps": {
    "ios": [
      {
        "id": "com.domain.sampleapp",
        "name": "My Sample App",
        "get_app_bundle": "configure_test_app.js",
        "launch_arguments": [
          { "name": "arg1", "value": "val1" },
          { "name": "arg2", "value": "val2" }
        ]
      }
    ],
    "android": [
      {
        "id": "com.domain.sampleapp",
        "name": "My Sample App",
        "activity": ".MainActivity",
        "get_app_bundle": "configure_test_app.js",
        "launch_arguments": [
          { "name": "arg1", "value": "val1" },
          { "name": "arg2", "value": "val2" }
        ]
      }
    ]
  }
}

Notes:
  ● Any app desired to be targeted for preview must be in this list.
  ● id: (Required) - The id of the app to be launched.
  ● name: (Required) - The name of the app to be launched.
  ● activity: (Required for Android) - The activity to be used for launching the app.
  ● get_app_bundle: (Optional) - Command to provide the app bundle to be launched.
    ○ If not present, the app must already be installed.
    ○ Presence of this option infers that the configured command will be run to configure the app to be installed, prior to preview.
    ○ If not absolute, the path to the module should be relative to the configuration file.
    ○ Interface:
      ■ The implementation must be a JS/Node module.
      ■ The module must expose a run() method, returning a string denoting the absolute path to the bundle to install. All other implementation details for surfacing the app bundle are the responsibility of the module.
  ● launch_arguments: (Optional) - Additional name/value arguments to pass when launching the app.
