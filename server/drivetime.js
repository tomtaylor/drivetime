var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    _ = require('underscore');

app.listen(8081);

function handler(req, res) {}

var broadcasters = {};

io.sockets.on('connection', function (socket) {

  socket.on('broadcasting', function(data) {
    var username = data.username;
    var track = data.track;
    var timestamp = data.timestamp;

    var broadcaster = broadcasters[username];

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

    }

    // tell everyone listening to this broadcaster that the track has changed
    _.each(broadcaster['listeners'], function(listener) {
      listener.emit('play', {
        'track': broadcaster['track'],
        'timestamp': broadcaster['timestamp']
      });

    });

  });

  socket.on('listen_to', function(data) {
    var username = data.username;
    var broadcaster = broadcasters[username];

    // if this broadcast exists, and they're not already a listener, then add them
    if (broadcaster && !_.include(broadcaster['listeners'], socket)) {
      broadcaster['listeners'].push(socket);
    }

    // if the broadcaster exists, then tell the client to play the track
    if (broadcaster) {
      socket.emit('play', {
        'timestamp': broadcaster.timestamp,
        'track': broadcaster.track,
        'username': broadcaster.username
      });
    }

  });

  socket.on('disconnect', function () {
    // loop through all the broadcasters, removing the socket from the listeners
    _.each(broadcasters, function(broadcaster) {
      _.each(broadcaster['listeners'], function(listeners) {
        if (_.include(listeners, socket)) {
          broadcaster['listeners'] = _.without(broadcaster['listeners'], socket);
        }

      });

    });

  });


});
