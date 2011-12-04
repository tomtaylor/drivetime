var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    _ = require('underscore'),
    util = require('util');

app.listen(8081);

function handler(req, res) {}

var broadcasters = {};
var clients = [];

io.sockets.on('connection', function (socket) {
  var client = new Client(socket);
});

function Client(socket) {
  this.socket = socket;
  this.status = "stopped";
  this.statusMetadata = {};

  clients.push(this);
  this.sendServerTime();
  this.refreshBroadcasters();

  var that = this;
  this.socket.on('broadcast', function(data) { that.onBroadcast(data); } );
  this.socket.on('listen', function(data) { that.onListen(data); } );
  this.socket.on('stop', function(data) { that.onStop(data); });
  this.socket.on('disconnect', function() { that.onDisconnect(); } );
}

Client.prototype.onBroadcast = function(data) {
  this.stopListening();

  var username = data.username;
  var track = data.track;
  var timestamp = data.timestamp;

  this.status = "broadcasting";
  this.statusMetadata = {
    'broadcastUsername': username
  };

  var broadcaster = broadcasters[username];
  util.debug('socket ('+ this.socket.id + ') is broadcasting: ' + track);

  if (broadcaster) {
    // set the new track and timestamp
    broadcaster['track'] = track;
    broadcaster['timestamp'] = timestamp;

  } else {
    // if we've not seen this broadcaster before, then we setup up a blank array of listeners
    broadcaster = {
      'listeners': [],
      'track': track,
      'timestamp': timestamp
    };

    broadcasters[username] = broadcaster;
  }

  var that = this;
  // tell everyone listening to this broadcaster that the track has changed
  _.each(broadcaster['listeners'], function(listener) {
    listener.emit('play', {
      'track': broadcaster['track'],
      'timestamp': broadcaster['timestamp']
    });
    util.debug('told socket ('+ that.socket.id + ') to play: ' + util.inspect(broadcaster['track']));

  });

};

Client.prototype.onListen = function(data) {
  this.stopBroadcasting();
  this.stopListening();

  var username = data.username;
  var broadcaster = broadcasters[username];

  this.status = "listening";
  this.statusMetadata = {
    'listeningTo': username
  }

  // if this broadcast exists, and they're not already a listener, then add them
  if (broadcaster && !_.include(broadcaster['listeners'], this.socket)) {
    util.debug('socket ('+this.socket.id+') added itself to the listeners for: '+ util.inspect(broadcasters[username]));
    broadcaster['listeners'].push(this.socket);
  }

  // if the broadcaster exists, then tell the client to play the track
  if (broadcaster) {
    this.socket.emit('play', {
      'timestamp': broadcaster.timestamp,
      'track': broadcaster.track,
    });
  }

};

Client.prototype.onDisconnect = function() {
  this.stopBroadcasting();
  this.stopListening();
  clients = _.without(clients, this);
};

Client.prototype.onStop = function(data) {
  this.stopBroadcasting();
  this.stopListening();
  this.status = "stopped";
  this.statusMetadata = {};
};

Client.prototype.stopBroadcasting = function() {
  if (this.status == 'broadcasting') {
    util.debug("Broadcast metadata: " + util.inspect(this.statusMetadata));
    var broadcastUsername = this.statusMetadata.broadcastUsername;
    var broadcaster = broadcasters[broadcastUsername];

    util.debug('stopped ' + broadcastUsername + ' broadcasting');

    // if the broadcast exists, tell all the clients to stop listening, and remove the broadcaster
    if (broadcaster) {
      _.each(broadcaster['listeners'], function(listener) {
        listener.emit('stop', { 'username': username });

      });

      delete broadcasters[broadcastUsername];
    }

    refreshAllBroadcasters();
  }
};

Client.prototype.stopListening = function() {
  if (this.status == 'listening') {

    var username = this.statusMetadata.listeningTo;
    var broadcaster = broadcasters[username];

    if (broadcaster && _.include(broadcaster.listeners, this.socket)) {
      util.debug('stopped listening to ' + username);
      broadcaster['listeners'] = _.without(broadcaster['listeners'], this.socket);
      util.debug('removed socket ('+ this.socket.id + ') from broadcaster: ' + broadcaster.username);
    }
  }
};

Client.prototype.refreshBroadcasters = function() {
  var cleanBroadcasters = [];

  _.each(broadcasters, function(broadcaster, username) {
    var cleanBroadcaster = {
      'username': username,
      'track': broadcaster.track,
      'timestamp': broadcaster.timestamp
    };

    cleanBroadcasters.push(cleanBroadcaster);
  });

  this.socket.emit('broadcasters', {'broadcasters': cleanBroadcasters});
};

Client.prototype.sendServerTime = function() {
  var now = new Date();
  this.socket.emit('time', { 'time': now.getTime() });
};

function refreshAllBroadcasters() {
  _.each(clients, function(client) {
    client.refreshBroadcasters();
  });
}
