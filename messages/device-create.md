# summary

Create a virtual mobile device.

# flags.deviceName.description

Virtual device name.

# flags.deviceType.description

Virtual device type.

# reqs.deviceName.title

Checking whether a virtual device with the specified name already exists.

# reqs.deviceName:fulfilledMessage

A virtual device with the name '%s' does not exist.

# reqs.deviceName:unfulfilledMessage

A virtual device with the name '%s' already exists.

# reqs.deviceType.title

Validating specified device type.

# reqs.deviceType.fulfilledMessage

Device type '%s' is valid.

# reqs.deviceType:unfulfilledMessage

Device type '%s' is invalid. Must be one of the following valid types: %s

# device.create.action

Device Create

# device.create.status

creating new virtual device '%s' of type '%s'

# device.create.successStatus

virtual device '%s' of type '%s' created successfully

# device.create.failureStatus

error encountered

# examples

- <%= config.bin %> <%= command.id %> -p ios -n MyNewVirtualDevice -d iPhone-16
- <%= config.bin %> <%= command.id %> -p android -n MyNewVirtualDevice -d pixel_xl
