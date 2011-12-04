sp = getSpotifyApi(1);

/* DrivetimeUI controls all things UI. */

var DrivetimeUI = function (drivetime) {
  this.serverTimeOffset = 0;
  this.user = sp.core.getAnonymousUserId();
  this.drivetime = drivetime;

  this._setupUI();

  this._createUpdatePlayInfoListener();
  sp.trackPlayer.addEventListener('playerStateChanged', this.updatePlayInfoListener);
}

// Public Method DrivetimeUI.play()
//
// takes a track URI and an optional playlist URI and plays the track in the
// context of the playlist.
DrivetimeUI.prototype.play = function (track, playlist) {

  if (typeof track != "string") {

    var tsOffset = (Date.now() + this.serverTimeOffset - track.timestamp) / 1000;

    var m = Math.floor(tsOffset / 60);
    var s = ((tsOffset % 60) < 10) ? '0' : '';
    s = s + (tsOffset % 60).toFixed(3);

    var trackOffset = m + ":" + s;

    track = track.track; //+ "#" + trackOffset;
  }

  this.playSpotifyUri(track, playlist);
}

// Public Method DrivetimeUI.stop()
//
// takes no arguments, stops playback.
DrivetimeUI.prototype.stop = function () {
  sp.trackPlayer.setIsPlaying(false);
}


DrivetimeUI.prototype._setupUI = function () {
  $("#playlist").hide();

  var self = this;

  $(document).on("click", "button.stop", function () {
    self.drivetime.stop();

    $("#playlist").hide();
    $("#djs").show();

    return false;
  });

  this._setupDropHandler();
}

DrivetimeUI.prototype._setupDropHandler = function () {

  var self = this;

  var dropTarget = document;

  dropTarget.addEventListener("dragleave", function (evt) {
  	evt.preventDefault();
  	evt.stopPropagation();
  }, false);

  dropTarget.addEventListener("dragenter", function (evt) {
  	evt.preventDefault();
  	evt.stopPropagation();
  }, false);

  dropTarget.addEventListener("dragover", function (evt) {
  	evt.preventDefault();
  	evt.stopPropagation();
  }, false);

  dropTarget.addEventListener("drop", function (evt) {

    console.log("Drop!");
    var playlistUri = evt.dataTransfer.getData("url");

    $("#playlist").show();
    $("#djs").hide();

    self.playPlaylist(playlistUri);

  	evt.preventDefault();
  	evt.stopPropagation();

  }, false);

  sp.core.addEventListener('linksChanged', function (event) {

    var playlistUri = sp.core.getLinks()[0];
    self.playPlaylist(playlistUri);
  });

}

DrivetimeUI.prototype._createUpdatePlayInfoListener = function () {

  var self = this;

  this.updatePlayInfoListener = function (event) {
    if (event.data.curtrack == true) {
      this.updatePlayInfo();
    }
  }
}

DrivetimeUI.prototype.updatePlayInfo = function () {

  var nowPlaying = document.getElementById("nowplaying");

  var playingTrack = sp.trackPlayer.getNowPlayingTrack();

  if (playingTrack == null) {
    nowPlaying.innerText = "Nothing playing!";
  } else {
    var track = playingTrack.track;
    nowPlaying.innerText = track.name + " on the album " + track.album.name + " by " + track.album.artist.name + ".";
  }
}

DrivetimeUI.prototype.setServerTimeOffset = function (serverTimeOffset) {
  this.serverTimeOffset = serverTimeOffset;
}

DrivetimeUI.prototype.updateBroadcasters = function (broadcasters) {

  var genHtml = "<li><h3><a class='listenlink' href='spotify:app:drivetime:name:{name}'>{name}</a></h3></li>";
  
  $("#djlist").html('');
  for (var i = 0, l = broadcasters.length; i < l; i++) {
    var bc = broadcasters[i];

    if (sp.core.getAnonymousUserId() != bc.username) {
      $("#djlist").append(genHtml.replace(/{name}/g, bc.username));
    }
  }
}

DrivetimeUI.prototype.playSpotifyUri = function (trackUri, playlistUri) {
  
  var self = this;

  var eventHandlers = { onSuccess: function () { console.log("success");  },
                        onFailure: function () { console.log("failure");  },
                       onComplete: function () { console.log("complete");
                                                 self.updatePlayInfo(); } }

  if (playlistUri) {
    console.debug("Playing a track " + trackUri + " in context " + playlistUri);
    sp.trackPlayer.playTrackFromContext(trackUri, 2, playlistUri, eventHandlers);
  } else {
    console.debug("Playing a track " + trackUri + " with no associated playlist.");
    sp.trackPlayer.playTrackFromUri(trackUri, eventHandlers);
  }


}

DrivetimeUI.prototype.playPlaylist = function (playlistUri) {

  var playlist = sp.core.getPlaylist(playlistUri);

  var tracks = [];
  for (var i = 0, l = playlist.length; i < l; i++) {
    tracks.push(playlist.getTrack(i));
  }

  this.showPlaylist(tracks);

  var self = this

  $("a.tracklink").unbind();

  $(document).on('click', 'a.tracklink', function () {
    self.play(this.href, playlistUri);
    return false;
  });

  this.play(tracks[0].uri, playlistUri);
  this.drivetime.broadcast();
}

DrivetimeUI.prototype.showPlaylist = function (tracks) {

  var playlist = $("#playlistBody");
  playlist.html('');

  for (var i = 0, l = tracks.length; i < l; i++) {
    var row = $("<tr>");
    row.append($("<td><a class='tracklink' href='" + tracks[i].uri + "'>" + tracks[i].name + "</a></td>"));
    row.append($("<td>" + tracks[i].album.name + "</td>"));
    row.append($("<td>" + tracks[i].album.artist.name + "</td>"));
    row.append($("<td>" + this.msToTime(tracks[i].duration) + "</td>"));

    playlist.append(row);
  }
}

DrivetimeUI.prototype.msToTime = function (ms) {
  var ts = ms / 1000;
  var m = Math.floor(ts / 60);
  var s = Math.floor(ts % 60);

  return m + ":" + ((s < 10) ? "0" + s : s);
}


var Drivetime = function (server) {

  this.socket = io.connect(server);

  this.ui = new DrivetimeUI(this);

  this._setupCallbacks();
  this._setupSpotifyListeners();

}

Drivetime.prototype.broadcast = function () {

  console.debug("[ <> ] Starting to Broadcast.");

  this.stop();
  sp.trackPlayer.addEventListener("playerStateChanged", this.broadcastEmitter);
  this._sendBroadcast();
}

Drivetime.prototype.listen = function (user) {

  console.debug("[ -> ] Listening: ", user);

  this.stop();
  this.socket.emit('listen', { username: user });
}

Drivetime.prototype.stop = function () {

  if (this.broadcastEmitter) {
    sp.trackPlayer.removeEventListener('playerStateChanged', this.broadcastEmitter);
  }

  this.socket.emit('stop');
  this.ui.stop();
}


Drivetime.prototype._setupCallbacks = function () {

  var self = this;

  this.socket.on('broadcasters', function (broadcasters) {
    console.debug("[ <- ] Received list of broadcasters: ", broadcasters);
    self.ui.updateBroadcasters(broadcasters.broadcasters);
  });

  this.socket.on('play', function (playInfo) { 
    console.debug("[ <- ] Received instruction to play a new track: ", playInfo);
    self.ui.play(playInfo, false);
  });

  this.socket.on('time', function (time) { 
    console.debug("[ <- ] Received server time: ", time);
    var offset = Date.now() - time;
    self.ui.setServerTimeOffset(offset);
  });

  this.socket.on('stop', function () {
    console.debug("[ <- ] Received request to stop playing.");
    self.stop();
  });
}

Drivetime.prototype._userId = function () {
  return sp.core.getAnonymousUserId();
}

Drivetime.prototype._sendBroadcast = function () {
  var playingTrack = sp.trackPlayer.getNowPlayingTrack();

  if (!playingTrack) return;
  var track = playingTrack.track;

  console.debug("[ -> ] Broadcasting: ", track)

  this.socket.emit('broadcast', { username: this.userId(),
                                     track: track.uri,
                                 timestamp: Date.now() - playingTrack.position });
}

Drivetime.prototype.userId = function () {
  return sp.core.getAnonymousUserId();
}

Drivetime.prototype._setupSpotifyListeners = function () {

  console.debug("Setting up Spotify Listeners.");

  var self = this;

  this.broadcastEmitter = function (event) {

    // Only update the page if the track has changed.
    if (event.data.curtrack == true) {
      self._sendBroadcast();
    }
  }

  this._handleArgumentsChange = function (event) {
    console.debug("[ <> ] Arguments have changed: ", sp.core.getArguments());
    self._updateListener();
  }

  sp.core.addEventListener("argumentsChanged", this._handleArgumentsChange);
}

Drivetime.prototype._updateListener = function () {
  var args = sp.core.getArguments();

  for (var i = 0, l = args.length; i < l; i++) {
    if(args[i] == 'name') {
      this.listen(args[i+1]);
      var userId = args[i+1];
    }
  }
}

var drivetime = new Drivetime("ws://192.168.1.67:8081");

