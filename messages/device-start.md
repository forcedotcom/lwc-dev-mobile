# summary

Start a virtual mobile device.

# flags.target.description

Specify target virtual device name.

# flags.writablesystem.description

Specify whether a virtual device should be launched with writable system access. Applicable to Android devices only. Defaults to false.

# error.target.doesNotExist

Target device does not exist: %s

# device.start.action

Device Start

# device.start.status

starting device %s

# device.start.successStatus.android

device '%s' started on port %s, writable system = %s

# device.start.successStatus.ios

device '%s' started

# examples

-   <%= config.bin %> <%= command.id %> -p ios -t 'iPhone 16'
-   <%= config.bin %> <%= command.id %> -p ios -t '3627EBD5-E9EC-4EC4-8E89-C6A0232C920D'
-   <%= config.bin %> <%= command.id %> -p android -t 'Pixel 9 API 35' -w
