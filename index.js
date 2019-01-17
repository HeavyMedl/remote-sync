'use strict';
/**
 * A LFTP wrapper for automating FTP operations.
 */
class RemoteSync {
  /**
   * Creates an instance of RemoteSync.
   * @param {Object} options
   * @memberof RemoteSync
   */
  constructor(options) {
    this.options = this._setup(options);
    this.remote_commands = '';
    return this;
  }
  /**
   *
   *
   * @readonly
   * @memberof RemoteSync
   */
  get getCommands() {
    return this.remote_commands;
  }
  /**
   *
   * @param {String} commands
   * @memberof RemoteSync
   */
  set setCommands(commands) {
    this.remote_commands = commands;
  }
  /**
   *
   *
   * @param {String} code
   * @return {String}
   * @memberof RemoteSync
   */
  _ansi(code) {
    const codes = {
      rset: '0',
      bold: '1',
      cyan: '36',
      bold: '1',
      rbld: '22',
      yllw: '33',
    };
    return '\x1b[' + codes[code] + 'm';
  }
  /**
   *
   *
   * @param {String} string
   * @param {String} codes
   * @memberof RemoteSync
   */
  _log(string, codes) {
    string += this._ansi('rset'); // reset terminal
    const array = [string].concat(codes);
    console.log.apply(null, array);
  }
  /**
   * Decorator that wraps a {@link fn} with a try-catch block.
   *
   * @param {Function} fn
   * @return {Function}
   * @memberof RemoteSync
   */
  _safe(fn) {
    return () => {
      try {
        return fn.apply(this, arguments);
      } catch (ex) {
        console.trace(ex.stack);
        process.exit(1);
      }
    };
  }
  /**
   *
   *
   * @param {*} options
   * @return {Object}
   * @memberof RemoteSync
   */
  _setup(options) {
    const o = options;
    return {
      lftp_settings: o.lftp_settings ?
        this._commands(o.lftp_settings) : '',
      us: o.user || '',
      pw: o.pw || '',
      p: o.protocol || 'ftp',
      ho: o.host || '',
      po: o.port || '21',
      d: o.debug ? 'd' : '',
      operations: o.operations &&
        o.operations.length > 0 ? o.operations : [],
      exit: typeof o.exit !== 'undefined' ? o.exit : true,
      sync: typeof o.sync !== 'undefined' ? o.sync : true,
      persistent: typeof o.persistent !== 'undefined' ?
        o.persistent : false,
      stdio: o.stdio ? o.stdio : undefined,
    };
  }
  /**
   *
   *
   * @param {*} commands
   * @return {String}
   * @memberof RemoteSync
   */
  _commands(commands) {
    let returnStr = '';
    if (Array.isArray(commands)) {
      commands.forEach(
          (command, i) => returnStr += `${command};`
      );
    } else {
      Object.keys(commands).forEach((command, i) =>
        returnStr += `set ${command} ${commands[command]};`
      );
    }
    return returnStr;
  }
  /**
   *
   *
   * @param {String} str
   * @return {String}
   * @memberof RemoteSync
   */
  _escStr(str) {
    return str.replace(/(["\s'$`\\])/g, '\\$1');
  }
  /**
   *
   *
   * @return {Object}
   * @memberof RemoteSync
   */
  _run() {
    const args = Array.prototype.slice.call(arguments);
    const settings = args[args.length - 1];
    this.commands(this._commands(args.slice(0, args.length - 1)))
        .execute(settings);
    return this;
  }
  /**
   *
   *
   * @param {String} operation
   * @param {Number} i
   * @memberof RemoteSync
   */
  _syso(operation, i) {
    const out = ` ${i} '${operation}':`;
    this._log('%s%sRemoteSync:%s%s Attemping operation(s)' + out,
        [this._ansi('cyan'), this._ansi('bold'),
          this._ansi('rbld'), this._ansi('yllw'),
        ]);
  }
  /**
   *
   *
   * @param {Object} obj
   * @param {Number} i
   * @memberof RemoteSync
   */
  _performIt(obj, i) {
    this._syso(obj.operation, i + 1);
    this._run(obj.command, obj.settings);
  }
  /**
   *
   *
   * @return {Object}
   * @memberof RemoteSync
   */
  _perform() {
    this.options.persistent ?
      this.execute() :
      this.options.operations
          .forEach(this._performIt, this);
    return this;
  }

  /**
   *
   *
   * @param {*} child
   * @param {*} stdout
   * @param {*} stderr
   * @param {*} close
   * @param {*} error
   * @memberof RemoteSync
   */
  _bindSocketEvents(child, stdout, stderr, close, error) {
    if (child.stdout && child.stdout.on) {
      child.stdout.on('data', (data) => {
        stdout
          ?
          stdout(data) :
          this._print(undefined, data, undefined);
      });
    } else if (child.stdout) {
      this._print(undefined, child.stdout, undefined);
    }
    if (child.stderr && child.stderr.on) {
      child.stderr.on('data', (data) => {
        stderr
          ?
          stderr(data) :
          this._print(undefined, undefined, data);
      });
    } else if (child.stderr) {
      this._print(undefined, undefined, child.stderr);
    }
    if (child.on) {
      child.on('close', (code) => {
        close
          ?
          close(code) :
          this._print(code, undefined, undefined);
      });
      child.on('error', (err) => {
        error
          ?
          error(err) :
          console.trace(err);
      });
    }
  }
  /**
   *
   *
   * @param {Buffer} buffer
   * @return {String}
   * @memberof RemoteSync
   */
  _out(buffer) {
    return buffer ?
      buffer.toString('utf-8').split('\n')
          .filter((x) => x && x.length > 0) : [];
  }
  /**
   *
   *
   * @param {*} code
   * @param {*} stdoutArr
   * @param {*} stderrArr
   * @return {String}
   * @memberof RemoteSync
   */
  _pretty(code, stdoutArr, stderrArr) {
    let out = '';
    let err = '';
    if (stdoutArr) {
      for (let i = 0; i < stdoutArr.length; i++) {
        const x = stdoutArr[i];
        out += ' ' + (i + 1) + '. ' + x;
        if (i !== stdoutArr.length - 1) {
          out += '\n';
        }
      }
    }
    if (stderrArr) {
      for (let i = 0; i < stderrArr.length; i++) {
        const x = stderrArr[i];
        err += ' ' + (i + 1) + '. ' + x;
        if (i !== stderrArr.length - 1) {
          err += '\n';
        }
      }
    }
    return [
      typeof code !== 'undefined' ?
      this._log('%scode: %s' + code +
        (out.length > 0 || err.length > 0 ? '\n' : ''),
      [this._ansi('yllw'), this._ansi('rset')]) : null,
      out.length > 0 ?
      this._log('%sstdout:\n%s' + out,
          [this._ansi('yllw'), this._ansi('rset')]) : null,
      err.length > 0 ?
      this._log('%s\nstderr:\n%s' + err,
          [this._ansi('yllw'), this._ansi('rset')]) : null,
    ].join('');
  }
  /**
   *
   *
   * @param {*} code
   * @param {*} stdout
   * @param {*} stderr
   * @memberof RemoteSync
   */
  _print(code, stdout, stderr) {
    console.log(this._pretty(
        code,
        this._out(stdout),
        this._out(stderr)));
  }
  /**
   *
   *
   * @param {*} obj
   * @return {Object}
   * @memberof RemoteSync
   */
  _getStdio(obj) {
    const stdio = {};
    stdio.stdio_config = obj && obj.stdio_config ? obj.stdio_config : undefined;
    stdio.stdout = obj && obj.stdout ? obj.stdout : undefined;
    stdio.stderr = obj && obj.stderr ? obj.stderr : undefined;
    stdio.close = obj && obj.close ? obj.close : undefined;
    stdio.error = obj && obj.error ? obj.error : undefined;
    return stdio;
  }
  /**
   *
   *
   * @return {Object}
   * @memberof RemoteSync
   */
  _executePersistent() {
    const spawn = require('child_process').spawn;
    const o = this.options;
    const eFlag = o.exit ? '-c' : '-e';
    const lftp_settings = `${o.lftp_settings}`;
    const open =
      `open -${o.d}u ${o.us},${o.pw} ${o.p}:\/\/${o.ho}:${o.po};`;
    const stdio = this._getStdio(o.stdio);
    let commands = this.getCommands;
    let ops = [];
    o.operations.forEach((op) => {
      ops = ops.concat(op.operation);
    });
    if (!commands && ops.length > 0) {
      this._syso(ops.toString(), ops.length);
    }
    if (!commands) {
      o.operations.forEach((op) => {
        commands = commands += op.command + ';';
      });
      this.setCommands = commands;
    }
    const exec = `${lftp_settings} ${open} ${this.remote_commands}`;

    if (o.exit) {
      const lftp = spawn('lftp', [eFlag, exec], stdio.stdio_config);
      this._bindSocketEvents(lftp,
          stdio.stdout, stdio.stderr, stdio.close, stdio.error);
    } else { // keep open, save child to object.
      this.pers_child =
        spawn('lftp', [eFlag, exec], stdio.stdio_config);
      this._bindSocketEvents(this.pers_child,
          stdio.stdout, stdio.stderr, stdio.close, stdio.error);
    }
    return this;
  }
  /**
   *
   *
   * @param {Object} settings
   * @return {Object}
   * @memberof RemoteSync
   */
  _execute(settings) {
    const s = settings;
    const o = this.options;
    const us = s && s.user || o.us;
    const pw = s && s.pw || o.pw;
    const p = s && s.protocol || o.p;
    const ho = s && s.host || o.ho;
    const po = s && s.port || o.po;
    const stdio = this._getStdio(s && s.stdio ? s.stdio : o.stdio);
    const commands = `${o.lftp_settings}
      open -${o.d}u ${us},${pw} ${p}:\/\/${ho}:${po}; 
      ${this.remote_commands}`;
    const spawn = o.sync ?
      require('child_process').spawnSync :
      require('child_process').spawn;
    const lftp = spawn('lftp', ['-c', commands], stdio.stdio_config);
    if (o.sync) {
      s && s.sync ? s.sync(lftp) : void 0;
      stdio.stdout ? stdio.stdout(lftp.stdout) : void 0;
      stdio.stderr ? stdio.stderr(lftp.stderr) : void 0;
      stdio.close ? stdio.close(lftp.close) : void 0;
      stdio.exit ? stdio.exit(lftp.exit) : void 0;
      this._print(lftp.status);
    }
    this._bindSocketEvents(
        lftp, stdio.stdout, stdio.stderr, stdio.close, stdio.error);
    return this;
  }
  /**
   *
   *
   * @static
   * @param {String} str
   * @return {String}
   * @memberof RemoteSync
   */
  static escape(str) {
    return this._escStr(str);
  }
  /**
   *
   *
   * @return {Object}
   * @memberof RemoteSync
   */
  commands() {
    this.remote_commands =
      this._commands(Array.prototype.slice.call(arguments));
    return this;
  }
  /**
   *
   *
   * @param {Object} settings
   * @memberof RemoteSync
   */
  execute(settings) {
    this.options.persistent ?
      this._executePersistent() :
      this._execute(settings);
  }
  /**
   *
   *
   * @memberof RemoteSync
   */
  perform() {
    this._safe(this._perform)();
  }
}
module.exports = RemoteSync;
