[![codecov](https://codecov.io/gh/forcedotcom/lwc-dev-mobile/branch/main/graph/badge.svg?token=K8NM7ABTL1)](https://codecov.io/gh/forcedotcom/lwc-dev-mobile)
[![MIT license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)
[![npm (scoped)](https://img.shields.io/npm/v/@salesforce/lwc-dev-mobile?color=blue)](https://www.npmjs.com/package/@salesforce/lwc-dev-mobile?activeTab=versions)
[![npm (scoped)](https://img.shields.io/npm/v/@salesforce/lwc-dev-mobile/beta?color=orange)](https://www.npmjs.com/package/@salesforce/lwc-dev-mobile?activeTab=versions)
[![Downloads](https://img.shields.io/npm/dt/@salesforce/lwc-dev-mobile)](https://www.npmjs.com/package/@salesforce/lwc-dev-mobile?activeTab=versions)

# Salesforce CLI Mobile Extensions

The Salesforce CLI Mobile Extensions allow you to extend the local preview capabilities of the [Local Development Server plug-in](https://developer.salesforce.com/tools/vscode/en/lwc/localdev/). You can see live previews of your Lightning Web Components on virtual mobile devices for iOS and Android.


**Note:** This feature is in beta, and may contain significant problems, undergo major changes, or be discontinued. If you encounter any problems, or want to request an enhancement, please open a [GitHub Issue](https://github.com/forcedotcom/lwc-dev-mobile/issues).

# Setup

## System Requirements

- Developer Hub-enabled org
- Most recent stable version of Chrome, Firefox, Safari, or Edge web browser
- Supported Windows versions: Windows 10 or later
- Supported Mac versions: macOS 10.14.4 or later
- Salesforce CLI

To develop Lightning web components, use your favorite code editor. We recommend using Visual Studio Code because its [Salesforce Extensions for VS Code](https://developer.salesforce.com/tools/extension_vscode) provide powerful features for development on Lightning Platform.

## Installation

1. Open a new terminal window and run the following command to install the Mobile Extensions:

        sfdx plugins:install @salesforce/lwc-dev-mobile
        
2. Check for updates to the plug-in:

        sfdx plugins:update

## Running

### Prerequisites

The Mobile Extensions plug-in can run only in the context of an SFDX project.  See the [installation instructions](https://www.npmjs.com/package/@salesforce/lwc-dev-server#installation) of the Local Development plug-in for all SFDX project setup requirements.

### Usage

The Mobile Extensions plug-in supports two commands.

#### Setup

Setup helps you set up virtual mobile devices—iOS simulators and Android emulators—in your local environment.


```
sfdx force:lightning:local:setup -p <mobile platform>
```

- `-p, --platform=platform` Specify platform ('iOS' or 'Android')

For example:

```sh-session
$ sfdx force:lightning:local:setup -p iOS
```

#### Preview

Preview extends the local preview capabilities of the [Local Development Server plug-in](https://developer.salesforce.com/tools/vscode/en/lwc/localdev/). With Mobile Extensions, you can use this plug-in to preview your Lightning Web Components on virtual mobile devices.

```
sfdx force:lightning:lwc:preview -n <component name> -p <mobile platform>] [-t <target>]
```

- `-n, --componentname=componentname` The LWC component name
- `-p, --platform=platform` Specify platform ('iOS' or 'Android')
- `-t, --target=target` Specify name of target simulator or emulator

For example:

```sh-session
$ sfdx force:lightning:lwc:preview -p Android -t LWCEmulator -n HelloWorldLwcComponent
```

## Visual Studio Code

We also provide a Visual Studio Code extension that exposes the Preview functionality through the IDE. That functionality is currently developed as part of the [Salesforce Extensions for VS Code](https://github.com/forcedotcom/salesforcedx-vscode).

## Plugin Development

If you intend to develop or test drive the plug-in locally, this section will help you set up your development environment.

### Checkout and Build Locally

After you clone or fork this repo, run the following commands in the root folder of your local repo:

```sh-session
$ yarn install && yarn build
$ yarn test 
```

### Install the Plug-in

From the top-level folder of the plug-in:

```sh-session
$ sfdx plugins:link .
```

### Uninstall the Plug-in

From the top-level folder of the plug-in:

```sh-session
$ sfdx plugins:uninstall . 
```
