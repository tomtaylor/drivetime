sp = getSpotifyApi(1);

var models = sp.require('sp://import/scripts/api/models');
var views = sp.require('sp://import/scripts/api/views');

var displayName = function (name) {
  if (name) {
    localStorage.setItem('displayName', name);
  }

  return localStorage.getItem('displayName');
}

/* DrivetimeUI controls all things UI. */

var DrivetimeUI = function (drivetime) {
  this.serverTimeOffset = 0;
  this.user = sp.core.getAnonymousUserId();
  this.drivetime = drivetime;

  this._setupUI();

  this._createUpdatePlayInfoListener();
  models.player.observe(models.EVENT.CHANGE, this.updatePlayInfoListener.bind(this));
}

// Public Method DrivetimeUI.play()
//
// takes a track URI and an optional playlist URI and plays the track in the
// context of the playlist.
DrivetimeUI.prototype.play = function (track, playlist) {

  if (typeof track != "string") {

    console.log(this.serverTimeOffset);
    var now = Date.now() - this.serverTimeOffset;
    console.log("now: " + now + "; timestamp: " + track.timestamp);
    var tsOffset = (now - track.timestamp) / 1000;

    var m = Math.floor(tsOffset / 60);
    var s = ((tsOffset % 60) < 10) ? '0' : '';
    s = s + (tsOffset % 60).toFixed(3);

    var trackOffset = m + ":" + s;
    console.log("Track offset: " + trackOffset);

    track = track.track + "#" + trackOffset;
  }

  this.playSpotifyUri(track, playlist);
  $("button.stop").show();
  $("#nowplaying").show();
}

// Public Method DrivetimeUI.stop()
//
// takes no arguments, stops playback.
DrivetimeUI.prototype.stop = function () {
  // sp.trackPlayer.setIsPlaying(false);
  models.player.playing = false;
  $("button.stop").hide();
}

DrivetimeUI.prototype.displayName = displayName;

DrivetimeUI.prototype._setupUI = function () {

  var self = this;

  $(document).ready(function() {
    $("#playlist").hide();
    $("button.stop").hide();

    if (typeof self.displayName() != 'string') {
   
      $(document).on('click', 'button.setDisplayName', function () {
        self.displayName($("#displayName").val());
        $("#nameSetup").hide();
      });

      $("#nameSetup").show();
    } else {
      $("#nameSetup").hide();
      $("#nameDisplay").html("Now Drivetiming as <span class='nameitself'>" + self.displayName() + "</span>");
    }
  });

  $(document).on("click", "button.stop", function () {
    self.drivetime.stop();

    $("#playlist").hide();
    $("#nowplaying").hide();
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
  var context = sp.trackPlayer.getPlayingContext();
  

  if (playingTrack == null) {
    nowPlaying.innerText = "Nothing playing!";
  } else {
    var track = playingTrack.track;
    var text  = "<span class='wht'>" + track.name + "</span> on the album <span class='wht'>" + track.album.name + "</span> by <span class='wht'>" + track.album.artist.name + "</span>";
    var image = new views.Image(track.album.cover);
    
    var nowPlayingPic = document.getElementById("nowplayingpic");
    $("#nowplayingpic").html(image.node);
    
    if(context[0]) {
      var playlist = sp.core.getPlaylist(context[0]);
      if(playlist) {
        text = text + " on the playlist <span class='wht'>" + playlist.name + "</span>";
      }
    }
    $(".sp-image").append("<div class='playing-deets'>" + text + "</div>");
    // nowPlaying.innerHTML = text + ".";
  }
}

DrivetimeUI.prototype.setServerTimeOffset = function (serverTimeOffset) {
  this.serverTimeOffset = serverTimeOffset;
}

DrivetimeUI.prototype.updateBroadcasters = function (broadcasters) {
  var nowtime = Date.now();
  var genHtml = "<li><h3><a class='listenlink' href='spotify:app:drivetime:name:{username}:cachetime:" + nowtime + "'>{name}</a></h3></li>";
  
  $("#djlist").html('');
  for (var i = 0, l = broadcasters.length; i < l; i++) {
    var bc = broadcasters[i];

    if (sp.core.getAnonymousUserId() != bc.username) {
      $("#djlist").append(genHtml.replace(/{username}/g, bc.username).replace(/{name}/g, bc.name));
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
    // sp.trackPlayer.playTrackFromContext(trackUri, 2, playlistUri, eventHandlers);
    models.player.play(trackUri, playlistUri);
  } else {
    console.debug("Playing a track " + trackUri + " with no associated playlist.");
    // sp.trackPlayer.playTrackFromUri(trackUri, eventHandlers);
    models.player.play(trackUri);
  }


}

DrivetimeUI.prototype.playPlaylist = function (playlistUri) {

  var playlist = sp.core.getPlaylist(playlistUri);

  var tracks = [];
  for (var i = 0, l = playlist.length; i < l; i++) {
    tracks.push(playlist.getTrack(i));
  }

  this.showPlaylist(playlistUri);

  var self = this;

  $("a.tracklink").unbind();

  $(document).on('click', 'a.tracklink', function () {
    self.play(this.href, playlistUri);
    return false;
  });
  
  this.play(tracks[0].uri, playlistUri);
  this.drivetime.broadcast();
  this.showPlaylistUi();

  $("#nowplaying").hide();
}

DrivetimeUI.prototype.showPlaylistUi = function () {
  $("#playlist").show();
  $("#djs").hide();
  $("button.stop").show();
}

DrivetimeUI.prototype.showPlaylist = function (playlistURI) {
  var pl = models.Playlist.fromURI(playlistURI);
  
  var list = new views.List(pl);
  $("#playlist .list").html("");
  $("#playlist .list").append(list.node);
}

DrivetimeUI.prototype.msToTime = function (ms) {
  var ts = ms / 1000;
  var m = Math.floor(ts / 60);
  var s = Math.floor(ts % 60);

  return m + ":" + ((s < 10) ? "0" + s : s);
}

DrivetimeUI.prototype.updateBroadcasterLinks = function() {
  $("#djlist li a").each(function(l) {
    var currentUri = $(this).attr("href");
    var components = currentUri.split(":");
    components[components.length-1] = Date.now();
    var newUri = components.join(":")
    $(this).attr("href", newUri);
  });
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

  console.log("[ -> ] Stopped");
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
    var offset = Date.now() - time.time;
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

Drivetime.prototype.displayName = displayName;

Drivetime.prototype._sendBroadcast = function () {
  var playingTrack = sp.trackPlayer.getNowPlayingTrack();

  if (!playingTrack) return;
  var track = playingTrack.track;

  console.debug("[ -> ] Broadcasting: ", track)

  this.socket.emit('broadcast', { username: this.userId(),
                                      name: this.displayName(),
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
      this.ui.updateBroadcasterLinks();
    }
  }
}
