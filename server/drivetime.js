var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    _ = require('underscore'),
    util = require('util');

app.listen(8081);

function handler(req, res) {}

var broadcasters = {};

io.sockets.on('connection', function (socket) {

  util.debug('socket connected: ' + socket.id);

  socket.on('broadcasting', function(data) {
    console.log('socket ('+ socket.id + ') asked to broadcast: ' + util.inspect(data));

    if (data && data.username && data.track && data.timestamp) {
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

        broadcasters[username] = broadcaster;

      }


      // tell everyone listening to this broadcaster that the track has changed
      _.each(broadcaster['listeners'], function(listener) {
        listener.emit('play', {
          'track': broadcaster['track'],
          'timestamp': broadcaster['timestamp']
        });
        util.debug('told socket ('+ socket.id + ') to play: ' + util.inspect(broadcaster['track']));

      });
    }

  });

  socket.on('listen_to', function(data) {
    util.debug('socket ('+ socket.id + ') asked to listen to ' + util.inspect(data));
    var username = data.username;
    var broadcaster = broadcasters[username];

    if (broadcaster) {
      util.debug("found broadcaster: "+ util.debug(broadcaster));
    } else {
      util.debug("broadcaster "+ util.debug(username) + " wasn't found");
    }

    // if this broadcast exists, and they're not already a listener, then add them
    if (broadcaster && !_.include(broadcaster['listeners'], socket)) {
      util.debug('socket ('+socket.id+') added itself to the listeners for: '+ util.inspect(broadcasters[username]));
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
    util.debug('socket ('+ socket.id + ') disconnected');
    // loop through all the broadcasters, removing the socket from the listeners
    _.each(broadcasters, function(broadcaster) {
      _.each(broadcaster['listeners'], function(listeners) {
        if (_.include(listeners, socket)) {
          broadcaster['listeners'] = _.without(broadcaster['listeners'], socket);
          util.debug('removed socket ('+ socket.id + ') from broadcaster: ' + broadcaster.username);
        }

      });

    });

  });


});
