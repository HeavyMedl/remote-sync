"use strict";
class RemoteSync {
  /**
   * [constructor description]
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  constructor(options) {
    this.options = this._setup(options);
    this.remote_commands = '';
    this.operations = ['download','upload','delete','list'];
    return this;
  }

  /**
   * [get_options description]
   * @return {[type]} [description]
   */
  get get_options() {
    return this.options;
  }

  /**
   * [commands description]
   * @return {[type]} [description]
   */
  get get_commands() {
    return this.remote_commands;
  }

  /**
   * [get_operations description]
   * @return {[type]} [description]
   */
  get get_operations() {
    return this.operations;
  }

  /**
   * [set_operations description]
   * @param {[type]} operations [description]
   */
  set set_operations(operations) {
    this.operations = operations;
  }

  /**
   * [set_options description]
   * @param {[type]} options [description]
   */
  set set_options(options) {
    this.options = this._setup(options);
  }

  /**
   * [set_option description]
   * @param {[type]} optionObj [description]
   */
  set set_option(optionObj) {
    Object.keys(optionObj).forEach(
      (key, i) => this.options[key] = optionObj[key]
    );
  }

  /**
   * [_ansi description]
   * @param  {[type]} code [description]
   * @return {[type]}      [description]
   */
  _ansi(code) {
    const codes = {
      rset      : '0',
      bold      : '1',
      cyan      : '36',
      bold      : '1',
      rbld      : '22',
      yllw      : '33'
    }
    return '\x1b['+codes[code]+'m';
  }

  /**
   * [_log description]
   * @param  {[type]} string [description]
   * @param  {[type]} codes  [description]
   * @return {[type]}        [description]
   */
  _log(string, codes) {
    string += this._ansi('rset'); // reset terminal
    const array = [string].concat(codes);
    console.log.apply(null, array);
  }

  /**
   * [_safe description]
   * @return {[type]} [description]
   */
  _safe(fn) {
    return () => {
      try {
        return fn.apply(this, arguments);
      } catch(ex) {
        console.trace(ex.stack);
        process.exit(1);
      }
    }
  }

  /**
   * [_setup description]
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  _setup(options) {
    const o = options;
    return {
      lftp_settings : this._commands(o.lftp_settings) || '',
      user : o.user || '',
      pw : o.pw || '',
      p : o.protocol || 'ftp',
      host : o.host || '',
      port : o.port || '',
      debug : o.debug ? 'd' : '',
      operations : o.operations.length > 0 ? o.operations : [],
      mode : o.mode ? o.mode : 'sync'
    }
  }
  
  /**
   * [_commands description]
   * @param  {[type]} commands [description]
   * @return {[type]}          [description]
   */
  _commands(commands) {
    let returnStr = '';
    if (Array.isArray(commands)) {
      commands.forEach(
        (command, i) => returnStr += `${command};`
      )
    } else {
      Object.keys(commands).forEach((command, i) => 
        returnStr += `set ${command} ${commands[command]};`
      )
    }
    return returnStr;
  }
 
  /**
   * [_esc_str description]
   * @param  {[type]} str [description]
   * @return {[type]}     [description]
   */
  _esc_str(str) {
    return str.replace(/(["\s'$`\\])/g,'\\$1');
  }

  /**
   * [_mirror description]
   * @param  {[type]} obj   [description]
   * @param  {[type]} flags [description]
   * @return {[type]}       [description]
   */
  _mirror(obj, flags) {
    let e = this._esc_str;
    return `mirror ${flags} ${e(obj.source)} ${e(obj.target)}`;
  }

  /**
   * [_run description]
   * @return {[type]} [description]
   */
  _run() {
    const args      = Array.prototype.slice.call(arguments);
    const settings  = args[args.length-1];
    this.commands(this._commands(args.slice(0, args.length-1)))
        .execute(settings);
    return this;
  }

  /**
   * [_is_custom_registered description]
   * @param  {[type]}  operation [description]
   * @return {Boolean}           [description]
   */
  _is_custom_registered(operation) {
    const opArr = this.operations.filter(x => 
      x != 'download' && x != 'upload' 
      && x != 'delete' && x != 'list'
    )
    return opArr.indexOf(operation) != -1 
  }

  /**
   * [_perform_iteration description]
   * @param  {[type]} obj   [description]
   * @param  {[type]} index [description]
   * @return {[type]}       [description]
   */
  _perform_iteration(obj, index) {
    const flags = obj.flags   || '',
          settings = obj.settings|| {},
          out = `Attemping operation ${index+1} '${obj.operation}':`;
    
    this._log('%s%sRemoteSync:%s%s '+out, [this._ansi('cyan'),
      this._ansi('bold'), this._ansi('rbld'), this._ansi('yllw')]);
    this._log('%s------------------------------------------------',
      [this._ansi('cyan')]);
    switch (obj.operation) {
      case "download":
        this._run(this._mirror(obj, flags), settings);
        break;
      case "upload":
        this._run(this._mirror(obj, '-R '+flags), settings);
        break;
      case "delete":
        this._run(`rm ${flags} ${obj.target}`, settings);
        break;
      case "list":
        this._run(`cd ${this._esc_str(obj.source)}`, 'nlist', 
          settings);
        break;
      default:
        if (this._is_custom_registered(obj.operation)) {
          this[obj.operation](); return;
        }
        let s = JSON.stringify;
        this._log(
          [ '%s%sRemoteSync:%s%s'+' Operation \'',
            obj.operation+'\' not ','valid in ',
            s(obj)+'.'+' Registered operations are ',
            this.operations+'. Please register this ',
            'operation.\n'
          ].join(''), 
            [ this._ansi('cyan'), this._ansi('bold'), 
              this._ansi('rbld'), this._ansi('yllw')]
        );
    }
  }

  /**
   * [_perform description]
   * @return {[type]} [description]
   */
  _perform() {
    this.options.operations.forEach(this._perform_iteration, this);
    return this;
  }

  /**
   * [_bind_socket_events description]
   * @param  {[type]} child  [description]
   * @param  {[type]} stdout [description]
   * @param  {[type]} stderr [description]
   * @param  {[type]} close  [description]
   * @param  {[type]} error  [description]
   * @return {[type]}        [description]
   */
  _bind_socket_events(child, stdout, stderr, close, error) {
    if (child.stdout && child.stdout.on) {
      child.stdout.on('data', data => {
          stdout 
            ? stdout(data)
            : this._print_out(data);
      });
    }
    if (child.stderr && child.stderr.on) {
      child.stderr.on('data', data => {
        stderr
          ? stderr(data)
          : this._print_out(data);
      });
    }
    if (child.on) {
      child.on('close', code => { 
        close
          ? close(code)
          : this._print(code, undefined, undefined);
      });
      child.on('error', err => {
        error
          ? error(err)
          : console.trace(err)
      });
    }
  }

  /**
   * [_out description]
   * @param  {[type]} buffer [description]
   * @return {[type]}        [description]
   */
  _out(buffer) {
    return buffer 
      ? buffer.toString('utf-8')
        .split('\n').filter(x => x && x.length>0)
      : []
  }

  /**
   * [_pretty description]
   * @param  {[type]} code      [description]
   * @param  {[type]} stdoutArr [description]
   * @param  {[type]} stderrArr [description]
   * @return {[type]}           [description]
   */
  _pretty(code, stdoutArr, stderrArr) { 
    let out = '', err = '';
    if (stdoutArr)
      stdoutArr.forEach((x,i) => out += ' '+(i+1)+'. '+x+'\n');
    if (stderrArr)
      stderrArr.forEach((x,i) => err += ' '+(i+1)+'. '+x+'\n');
    return [
      typeof code !== 'undefined' ? 
        this._log('%scode: %s'+code+'\n',
          [this._ansi('yllw'),this._ansi('rset')]) : null,
      out.length > 0 ? 
        this._log('%sstdout:\n%s'+out, 
          [this._ansi('yllw'),this._ansi('rset')]) : null,
      err.length > 0 ? 
        this._log('%s\nstderr:\n%s'+err,
          [this._ansi('yllw'),this._ansi('rset')]) : null
    ].join('');
  }

  /**
   * [_print description]
   * @param  {[type]} code   [description]
   * @param  {[type]} stdout [description]
   * @param  {[type]} stderr [description]
   * @return {[type]}        [description]
   */
  _print(code, stdout, stderr) {
    console.log(this._pretty(
      code, 
      this._out(stdout), 
      this._out(stderr)));
  }

  /**
   * [print_out description]
   * @param  {[type]} stdout [description]
   * @return {[type]}        [description]
   */
  _print_out(stdout) {
    return this._print(undefined, stdout, undefined);
  }

  /**
   * [print_err description]
   * @param  {[type]} stderr [description]
   * @return {[type]}        [description]
   */
  _print_err(stderr) {
    return this._print(undefined, stdout, stderr)
  }

  /**
   * [escape description]
   * @param  {[type]} str [description]
   * @return {[type]}     [description]
   */
  static escape(str) {
    return this._esc_str(str);
  }

  /**
   * [register description]
   * @param  {[type]} operation [description]
   * @param  {[type]} settings  [description]
   * @return {[type]}           [description]
   */
  register(settings) {
    this.set_operations = 
      this.get_operations.concat(settings.operation);
    this[settings.operation] = this._safe(() => {
        this._run(settings.command, settings);
      }
    );
    return this;
  }

  /**
   * [commands description]
   * @param  {[type]} arguments [description]
   * @return {[type]}           [description]
   */
  commands() {
    this.remote_commands = 
      this._commands(Array.prototype.slice.call(arguments));
    return this;
  }
  
  /**
   * [execute description]
   * @param  {[type]} settings [description]
   * @return {[type]}          [description]
   */
  execute(settings) {
    const o = this.options;
    const mode = o.mode;
    const commands = `${o.lftp_settings}
      open -${o.debug}u ${o.user},${o.pw} ${o.p}:\/\/${o.host}:${o.port}; 
      ${this.remote_commands}`;
    const spawn = mode == 'sync'
      ? require('child_process').spawnSync
      : require('child_process').spawn
    const lftp = spawn('lftp', ['-c', commands], {
      stdio:[ 
        settings && settings.stdio && settings.stdio.stdin 
          ? settings.stdio.stdin   : 0, 
        settings && settings.stdio && settings.stdio.stdout  
          ? settings.stdio.stdout  : 1,  
        settings && settings.stdio && settings.stdio.stderr  
          ? settings.stdio.stderr  : 2
      ]
    });
    switch (mode) {
      case "sync":
        this._print(lftp.status);
        settings && settings.sync ? settings.sync(lftp) : void 0;
        break;
      case "async":
        this._bind_socket_events(lftp, settings.stdout,
          settings.stderr, settings.close, settings.error);
        break;
      default:
        let s = JSON.stringify;
        this._log(
          [ '%s%sRemoteSync:%s%s Mode \''+mode+'\' not ',
            'valid.'+' Registered modes are async,sync.\n'
          ].join(''),
          [ this._ansi('cyan'), this._ansi('bold'), 
              this._ansi('rbld'), this._ansi('yllw')]
        );
        process.exit(1);
    }
    return this;
  }

  /**
   * [perform description]
   * @return {[type]} [description]
   */
  perform() {
    this._safe(this._perform)();
  }
}

module.exports = RemoteSync;

const client = new RemoteSync({
  mode : 'async',
  persistent : true,
  operations : [
    // {
    //   operation : 'download',
    //   source : 'rtorrent/downloads/completed/fights/',
    //   target : '/cygdrive/c/Users/kmedley/Desktop/seedbox',
    //   flags : '-c -vvv --only-missing',
    //   settings : {
    //     sync : child => {
    //       if (child.status != 0) {
    //         process.exit(1);
    //       }
    //     }
    //   }
    // }
    // {
    //   operation : 'upload',
    //   source : '/cygdrive/c/Users/kmedley/Desktop/remote-sync',
    //   target : 'rtorrent/downloads/',
    //   flags : '-c -vvv --only-newer --overwrite --exclude .git/',
    // }
    // {
    //   operation : 'delete',
    //   target : 'rtorrent/downloads/seedbox',
    //   flags : '-r',
    // }
    {
      operation : 'list',
      source : '/rtorrent/downloads/completed/tv',
      settings : {
        stdio : {
          stdout : 'pipe'
        }
      }
    }
  ],
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
  },
  user : '',
  pw : '',
  host : 'nad102.seedstuff.ca',
  port : '32001'
});

client
  .register({
    operation : 'mine',
    command : 'cd /rtorrent/downloads/completed/; nlist;'
  })
  .perform();

// var child = require('child_process').spawn('lftp');

// child.stdout.on('data', data => {
//   console.log(`stdout: ${data}`);
// });

// child.stderr.on('data', data => {
//   console.log(`stderr: ${data}`);
// });

// child.on('close', code => {
//   console.log(`code: ${code}`);
// });

// child.on('error', err => {
//   console.log(`error: ${err}`);
// });

// child.stdin.write('ls\n');