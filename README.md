# lwc-dev-mobile
Plugin for sfdx lwc mobile development

# Checkout & Build  Local

In the root folder for the lwc-dev-mobile
```sh-session
$ yarn install && yarn build
$ yarn test 
```

# Install the plugin & Run preview command
```sh-session
$ sfdx plugins:link .
$ sfdx force:lightning:lwc:preview -p Android -t LWCSimulator -d http://localhost:3333
$ sfdx force:lightning:lwc:preview -p iOS -t LWCSimulator -d http://localhost:3333
```
# Uninstall the plugin
```
$ sfdx plugins:uninstall . 
```
# Setup
```
sfdx force:lightning:local:setup -p iOS
sfdx force:lightning:local:setup -p Android
