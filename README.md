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
  lftp_settings : {             // OPTIONAL: LFTP settings. See LFTP man page.
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
// https://nodejs.org/api/child_process.html#child_process_options_stdio
{
    stdio_config : {stdio:[]},  // See above link for custom configuration.
    stdout : data => fn(data),  // Custom behavior for child's stdout event.
    stderr : data => fn(data),  // Custom behavior for child's stderr event.
    close : code => fn(code),   // Custom behavior for child's close event.
    error : error => fn(error)  // Custom behavior for child's error event.
}
```
## Examples
**Fancy level 0:** The following example will use a minimal configuration to demonstrate basic functionality. Open a non-persistent connection to `ftp.host.com`, execute operation 1 and exit.
```js
// client.js
const RemoteSync = require('remote-sync');
const config = {
    operations : [
        {
            operation : 'List',
            command : 'nlist files'
        }
    ],
    user : 'kurt',
    pw : 'foobar',
    host : 'ftp.host.com'
};
const client = new RemoteSync(config);
client.perform(); // Returns a remote listing of files at ftp.host.com/files/
```
**Fancy level 1:** Add `lftp_settings` to the constructor object to customize the session. Open a non-persistent connection to `ftp.host.com` using FTPES (Explicit FTP over TLS), set parallel transfer count to 5, execute operation 1 and exit. (Read about the flags passed to `mirror` at [LFTP](http://lftp.yar.ru/lftp-man.html).)
```js
// client.js
const RemoteSync = require('remote-sync');
const command = 'mirror -c --only-missing <source> <dest>';
const config = {
    operations : [
        {
            operation : 'mirror directory',
            command : command
        }
    ],
    user : 'kurt',
    pw : 'foobar',
    host : 'ftp.host.com',
    lftp_settings : {
        'ftp:ssl-force':'true',
        'ftp:ssl-protect-data':'true',
        'ssl:verify-certificate':'false',
        'net:max-retries':'2',
        'net:timeout':'10',
        'net:connection-limit':'5',
        'net:reconnect-interval-base':'5',
        'net:reconnect-interval-multiplier':'1',
        'mirror:parallel-transfer-count':'5'
    }
};
const client = new RemoteSync(config);
client.perform(); // Mirror only missing files from remote source to local disk.
```
**Fancy level 2:** Create a conditional chain of operations where you create the condition for further execution. Open a non-persistent connection to `ftp.host.com` and execute operation 1. If operation 1's status is not 0 (success) exit the parent process, halting any further execution. If operation 1 is successful, operations 2 & 3 will be executed.
```js
// client.js
const RemoteSync = require('remote-sync');
const mirror = 'mirror -c --only-missing <source> <dest>';
const remove = 'rm -r <source>';
const list = 'nlist files';
const config = {
    operations : [
        {
            operation : 'mirror directory',
            command : mirror,
            settings : {
                sync : child => {
                    if (child.status != 0) {
                        process.exit(1);
                    }
                }
            }
        },
        {  
            operation : 'delete directory',
            command : remove
        },
        {
            operation : 'list directory',
            command : list,
            user : 'username',
            pw : 'password',
            host : 'other.host.com'
        }
    ],
    user : 'kurt',
    pw : 'foobar',
    host : 'ftp.host.com',
    lftp_settings : settings_obj, // omitted for brevity
    sync : true
};
const client = new RemoteSync(config);
client.perform();   // Mirror only missing files from remote source to local disk.
                    // If successful, delete the remote source and get remote listing
                    // from other.host.com/files/
```