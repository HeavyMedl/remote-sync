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
```js
// client.js
const RemoteSync = require('remote-sync');
```