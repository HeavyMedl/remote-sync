const RemoteSync = require('./index.js');
const client = new RemoteSync({
  operations : [
    {
      operation : 'tv',
      command : [
        'mirror -c -vvv --only-missing ',
        'files/completed/ ',
        '/cygdrive/c/Users/kmedley/Desktop/'
      ].join('')
    }
    // {
    //   operation : 'download',
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
  host : 'pasta.whatbox.ca',
  persistent : false,
  exit : true
});

client.perform();

// using RemoteSync as a basic ftp client
// client.commands('nlist').execute();