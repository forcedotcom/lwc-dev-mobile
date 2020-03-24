# lwc-dev-mobile
Plugin for sfdx lwc mobile development

# Checkout & Build  Local

In the root folder for the sfdx-mobile
```sh-session
$ npm install
$ cd .. 
```

# Install the plugin & Run preview command
```sh-session
$ sfdx plugins:link ./sfdx-mobile
$ sfdx force:lightning:lwc:preview -p Android -t LWCSimulator -f http://localhost:3333
$ sfdx force:lightning:lwc:preview -p iOS -t LWCSimulator -f http://localhost:3333
```
# Setup
```
sfdx force:lightning:lwc:setup -p iOS
sfdx force:lightning:lwc:setup -p Android
