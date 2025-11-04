# summary

Launch the designated application on the target virtual device.

# flags.target.description

Target virtual device id or name.

# flags.appBundlePath.description

App Bundle Path (for reinstallation).

# flags.bundleId.description

The application identifier. For iOS, use the Bundle ID (e.g., com.company.myapp). For Android, specify the package name along with the target activity name (e.g., com.company.myapp/.MainActivity).

# flags.launchArguments.description

A JSON array of objects, each containing a name and value string, to be passed as arguments to the application upon launch. Sample format: [{"name":"param1", "value":"value1"}].

# error.target.doesNotExist

Target device does not exist: %s

# app.launch.action

App Launch

# app.launch.status

Launching '%s' on '%s'

# app.launch.successStatus

'%s' is launched on '%s' successfully

# app.launch.failureStatus

error encountered

# examples

- <%= config.bin %> <%= command.id %> -p ios -t MyNewVirtualDevice -i com.company.app -a \users\bob\myapp\myApp.app
- <%= config.bin %> <%= command.id %> -p android -t MyNewVirtualDevice -i com.company.app/.mainActivity -a \users\bob\myapp\myApp.apk
