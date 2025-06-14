# summary

Run UTAM test by specifying a WDIO configuration. Test specs to run can be explicitly specified by using a flag.

# flags.config.description

Specify a path to WDIO config file with UTAM configuration.

# flags.spec.description

Specify a path to a test spec or a folder with test specs.

# error.unexpected

Unexpected error: %s

# error.configFile.pathInvalid

WDIO config file was not found at the specified path: %s

# error.spec.pathInvalid

A test spec or a folder containing test specs was not found at the specified path: %s

# runningUtamTest

Running UTAM test

# examples

- <%= config.bin %> <%= command.id %> --config '/path/to/wdio.conf.js
- <%= config.bin %> <%= command.id %> --config '/path/to/wdio.conf.js' --spec '/path/to/myTest.spec.js'
- <%= config.bin %> <%= command.id %> --config '/path/to/wdio.conf.js' --spec '/path/to/folderWithSpecs'
