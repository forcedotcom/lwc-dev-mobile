# summary

List the available virtual mobile devices for Lightning Web Component development.

# flags.ostype.description

Filter Android devices by operating system type. Use 'default' to show only default OS type devices, or 'all' to show all devices. This flag applies only to Android devices.

# device.list.action

Device List

# device.list.status

generating list of supported devices

# examples

- <%= config.bin %> <%= command.id %> -p ios
- <%= config.bin %> <%= command.id %> -p android
- <%= config.bin %> <%= command.id %> -p android --os-type default