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
   * [set_commands description]
   * @param {[type]} commands [description]
   */
  set set_commands(commands) {
    this.remote_commands = commands;
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
      us : o.user || '',
      pw : o.pw || '',
      p : o.protocol || 'ftp',
      ho : o.host || '',
      po : o.port || '',
      d : o.debug ? 'd' : '',
      operations : o.operations.length > 0 ? o.operations : [],
      exit : o.exit ? true : false,
      sync : o.sync ? true : false,
      persistent : o.persistent ? true : false,
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
   * [_syso description]
   * @param  {[type]} operation [description]
   * @param  {[type]} i         [description]
   * @return {[type]}           [description]
   */
  _syso(operation, i) {
    const out = ` ${i} '${operation}':`;
    this._log('%s%sRemoteSync:%s%s Attemping operation(s)'+out, 
      [ this._ansi('cyan'),this._ansi('bold'), 
        this._ansi('rbld'), this._ansi('yllw')]);
    this._log('%s------------------------------------------------',
      [this._ansi('cyan')]);
  }

  /**
   * [_perform_it description]
   * @param  {[type]} obj [description]
   * @param  {[type]} i   [description]
   * @return {[type]}     [description]
   */
  _perform_it(obj, i) {
    this._syso(obj.operation, i+1);
    this._run(obj.command, obj.settings);
  }

  /**
   * [_perform description]
   * @return {[type]} [description]
   */
  _perform() {
    this.options.persistent 
      ? this.execute()
      : this.options.operations
          .forEach(this._perform_it, this);
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
   * [_execute_persistent description]
   * @return {[type]} [description]
   */
  _execute_persistent() {
    const spawn = require('child_process').spawn;
    const o = this.options;
    const eFlag = o.exit ? '-c' : '-e';
    const lftp_settings = `${o.lftp_settings}`;
    const open =
      `open -${o.d}u ${o.us},${o.pw} ${o.p}:\/\/${o.ho}:${o.po};`;
    const stdio_config = o.stdio && o.stdio.stdio_config 
      ? o.stdio.stdio_config : {stdio:[0,1,2]};
    const stdout  = o.stdio && o.stdio.stdout 
      ? o.stdio.stdout : undefined
    const stderr  = o.stdio && o.stdio.stderr 
      ? o.stdio.stderr : undefined;
    const close   = o.stdio && o.stdio.close
      ? o.stdio.close : undefined;
    const error   = o.stdio && o.stdio.error
      ? o.stdio.error : undefined;
    
    let commands  = this.get_commands;
    let ops = [];
    o.operations.forEach(op => {
      ops = ops.concat(op.operation);
    });
    if (!commands && ops.length > 0) {
      this._syso(ops.toString(), ops.length);
    }
    if (!commands) {
      o.operations.forEach(op => {
        commands = commands += op.command + ';';
      });
      this.set_commands = commands;
    }
    const exec = `${lftp_settings} ${open} ${this.remote_commands}`;
    
    if (o.exit) {
      let lftp = spawn('lftp', [eFlag, exec], stdio_config);
      this._bind_socket_events(lftp, stdout, stderr, close, error);
    } else { // keep open, save child to object.
      this.pers_child = 
      spawn('lftp', [eFlag, exec], stdio_config);
      this._bind_socket_events(this.pers_child, stdout, stderr, 
        close, error);
    }
    return this;
  }

  /**
   * [_execute description]
   * @param  {[type]} settings [description]
   * @return {[type]}          [description]
   */
  _execute(settings) {
    const s = settings;
    const o = this.options;
    const us = s && s.us || o.us, pw = s && s.pw || o.pw, 
          p = s && s.p || o.p, ho = s && s.ho || o.ho, 
          po = s && s.po || o.po
    const commands = `${o.lftp_settings}
      open -${o.d}u ${us},${pw} ${p}:\/\/${ho}:${po}; 
      ${this.remote_commands}`;
    const spawn = o.sync
      ? require('child_process').spawnSync
      : require('child_process').spawn
    const lftp = spawn('lftp', ['-c', commands], 
      s && s.stdio && s.stdio.stdio_config 
        ? s.stdio.stdio_config : {stdio:[0,1,2]});
    
    if (o.sync) {
      s && s.sync ? s.sync(lftp) : void 0;
      this._print(lftp.status);
    } else {
      this._bind_socket_events(lftp, 
        s && s.stdio && s.stdio.stdout ? s.stdio.stdout  : undefined,
        s && s.stdio && s.stdio.stderr ? s.stdio.stderr  : undefined,
        s && s.stdio && s.stdio.close  ? s.stdio.close   : undefined,
        s && s.stdio && s.stdio.error  ? s.stdio.error   : undefined);
    }
    return this;
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
    this.options.persistent
      ? this._execute_persistent()
      : this._execute(settings)
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