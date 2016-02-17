# Remote Sync

A cross-platform LFTP wrapper for automating file synchronization.

[![NPM](https://nodei.co/npm/remote-sync.png)](https://nodei.co/npm/remote-sync/)

[Documentation](http://kurtlocker.github.io/remote-sync) | [Repository](https://github.com/kurtlocker/remote-sync)

## Features
- Logically organize LFTP operations into a workflow that is easily revisable.
- Leverage the power of [LFTP](http://lftp.yar.ru/lftp-man.html) to transfer files to/from remote host(s).
- For speed, open a persistent connection to a designated host and execute your commands in series.
- Define separate settings (host|user|password) for independent operations that can be executed (a)synchronously.
- Create a conditional chain of operations where you create the condition for further execution.
- Use RemoteSync as a general purpose LFTP client.

## Dependency
You'll need to have LFTP installed on your machine as its the child process RemoteSync wraps. I chose LFTP as my FTP(S) client because its easy to work with, comes preinstalled on most Unix-based OS distributions and has a nice port to Windows. If you don't already have LFTP installed (Windows) use a package management tool to get the latest version:

**Windows** ([Chocolatey](https://chocolatey.org/))
```cmd
C:\> choco install lftp
```
**OSX** ([Homebrew](http://brew.sh/))
```bash
sudo brew install lftp
```
**Linux**
```bash
sudo apt-get install lftp
sudo yum install lftp
```
## Configuration
**Constructor Object**
```js
{
  operations : [{},{},..,{}],   // Array of operation objects. See below. 
  lftp_settings : {             // LFTP settings. See LFTP man page.
    'setting':'value'
  },
  user : 'user',                // User name for host. Default: ''
  pw : 'password',              // Password for host. Default: ''
  protocol : 'ftp',             // Protocol (Everything LFTP supports) Default: ftp
  host : 'some.host.com',       // Host name. Default: ''
  port : '21',                  // Port number. Default: ''
  persistent : false,           // Persistent connection. Default: false
  sync : true,                  // Synchronously execute operations. Default: false
  exit : false,                 // If persistent, close connection after operations finish. Default: false
  debug : true,                 // Pass debug flag to LFTP for verbose logging. Default: false
  stdio : stdio                 // OPTIONAL: If persistent, override stdio configuration of child process 
                                // https://nodejs.org/api/child_process.html#child_process_options_stdio
                                // See below. Default: {stdio:[0,1,2]}
}
```
**Operation Object**
```js
{
    operation : 'download',     // Operation name. Something that relates to the command.
    command : 'lftp command',   // The LFTP command to run. Refer to man page.
    user : 'user',              // OPTIONAL: User name. If !persistent, overrides constructor value.
    pw : 'password',            // OPTIONAL: Password. If !persistent, overrides constructor value.
    protocol : 'ftp',           // OPTIONAL: Protocol. If !persistent, overrides constructor value.
    host : 'some.host.com',     // OPTIONAL: Host name. If !persistent, overrides constructor value.
    port : '21',                // OPTIONAL: Port number. If !persistent, overrides constructor value.
    settings : {                // OPTIONAL: Do stuff based on configuration.
        sync : fn(child),       // OPTIONAL: If !persistent and sync = true, call fn(child) on finish.
        stdio : stdio           // OPTIONAL: Override stdio configuration of child process
                                // See below. Default: {stdio:[0,1,2]}
    }
}
```
**stdio Object**
```js
```
## Basic Usage
```js
// client.js
const RemoteSync = require('remote-sync');
```