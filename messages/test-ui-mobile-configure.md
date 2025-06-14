# summary

Create a configuration file for running UTAM tests on mobile.

# flags.deviceName.description

Specify target virtual device name.

# flags.testFramework.description

Specify test framework (jasmine, mocha, cucumber).

# flags.output.description

Specify the output config file name and path.

# flags.bundlePath.description

Specify path to app bundle.

# flags.appActivity.description

Specify Android app activity.

# flags.appPackage.description

Specify Android app package.

# flags.port.description

Specify WebdriverIO test runner port.

# flags.baseUrl.description

Specify WebdriverIO base url.

# flags.injectionConfigs.description

Specify path to injection config file for UTAM WebdriverIO service.

# error.notFound.bundle

Unable to find app bundle: %s

# error.notFound.device

Device not found: %s

# error.invalid.appActivity

Invalid or missing value for app activity.

# error.invalid.appPackage

Invalid or missing value for app package.

# appActivityIgnored

App Activity will be ignored on iOS.

# appPackageIgnored

App Package will be ignored on iOS.


# examples

- <%= config.bin %> <%= command.id %> -p ios -d 'iPhone 12' --output './wdio.conf.js' --testframework jasmine --port 4723 --baseurl 'http://localhost' --injectionconfigs '/path/to/myPageObjects.config.json' --bundlepath '/path/to/my.app'
- <%= config.bin %> <%= command.id %> -p android -d Pixel_5_API_33 --output './wdio.conf.js' --testframework jasmine --port 4723 --baseurl 'http://localhost' --injectionconfigs '/path/to/myPageObjects.config.json' --bundlepath '/path/to/my.apk' --appactivity .MainActivity --apppackage com.example.android.myApp
