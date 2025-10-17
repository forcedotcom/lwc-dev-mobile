# summary

Install the designated application onto the target virtual device

# flags.target.description

Target virtual device id or name.

# flags.appBundlePath.description

The file path of the app bundle to install.

# error.target.doesNotExist

Target device does not exist: %s

# app.install.action

App Install

# app.install.status

Installing '%s' onto '%s'

# app.install.successStatus

'%s' is installed onto '%s' successfully

# app.install.failureStatus

error encountered

# examples

-   <%= config.bin %> <%= command.id %> -p ios -t MyNewVirtualDevice -a \users\bob\myapp\myApp.app
-   <%= config.bin %> <%= command.id %> -p android -t MyNewVirtualDevice -a \users\bob\myapp\myApp.apk
