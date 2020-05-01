# lwc-dev-mobile
Welcome to the plug-in repo for Salesforce CLI Mobile Extensions. This plug-in currently defines two commands:
* __Setup__
Helps you set up virtual mobile devices—iOS simulators and Android emulators—in their local environments. The setup command is found in the force:lightning:local namespace.
* __Preview__
Extends the local preview capabilities of the Local Development Server plug-in. With Mobile Extensions, you can use thisplug-in to preview your Lightning Web Components on virtual mobile devices. The preview command is found in the force:lightning:lwc namespace.
This team also provides a Visual Studio Code extension that exposes the Preview functionality through the Command Palette. That plug-in is currently developed at https://github.com/forcedotcom/salesforcedx-vscode.
# Checkout and Build Locally
After you clone or fork this repo, run the following commands in the root folder of your local repo:
```sh-session
$ yarn install && yarn build
$ yarn test 
```
# Install the plugin
```sh-session
$ sfdx plugins:link .
```
# Run the Setup command
```sh-session
$ sfdx force:lightning:local:setup -p iOS
$ sfdx force:lightning:local:setup -p Android
```
# Run the Preview command
```sh-session
$ sfdx force:lightning:lwc:preview -p Android -t LWCEmulator -n HelloWorldLwcComponent
$ sfdx force:lightning:lwc:preview -p iOS -t LWCSimulator -n HelloWorldLwcComponent
```
# Uninstall the plugin
```sh-session
$ sfdx plugins:uninstall . 
```