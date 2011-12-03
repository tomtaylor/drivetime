sp = getSpotifyApi(1);

exports.init = init;

var drivetimeSocket;
var currentBroadcaster;

var Drivetime = {

  init: function () {
    drivetimeSocket = io.connect("ws://172.16.104.242:8081");
    drivetimeSocket.on('broadcasters', function (broadcasters) {
      console.log('Got broadcaster list: ', broadcasters);
      updateBroadcasters(broadcasters);
    });

    drivetimeSocket.on('play', function (playInfo) {
      console.log("Got request to play: ", playInfo);
      playATrack(playInfo.track, playInfo.playlist);
    });

    drivetimeSocket.on('stop_listening', function () {
      console.log("Got request to stop playing.");
      // stop playing
    });

  },

  broadcast: function (track) {
    Drivetime.stopListening();
    var now = new Date();
    drivetimeSocket.emit('broadcasting', { username: sp.core.getAnonymousUserId(),
                                              track: track.uri,
                                          timestamp: now.getTime() });
  },

  stopListening: function () {
    if (currentBroadcaster) { 
      drivetimeSocket.emit('stop_listening', { username: currentBroadcaster });
      currentBroadcaster = null;
    }
  },

  stopBroadcast: function () {
    drivetimeSocket.emit('stop_broadcasting', { username: sp.core.getAnonymousUserId() });
  },

  listen: function (user) {
    Drivetime.stopBroadcast();
    drivetimeSocket.emit('listen_to', { username: user });
    currentBroadcaster = user;
  },

};

function init() {

  Drivetime.init();
  updateNowPlayingUser();
  
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
    var uri = evt.dataTransfer.getData("url");
    playPlaylistFromUri(uri);
  	evt.preventDefault();
  	evt.stopPropagation();
  }, false);

  sp.core.addEventListener("argumentsChanged", function(event) {
    updateNowPlayingUser();
  });

  function updateNowPlayingUser() {
    var args = sp.core.getArguments();

    for (var i = 0, l = args.length; i < l; i++) {
      if(args[i] == 'name') {
        Drivetime.listen(args[i+1]);
        var userId = args[i+1];
      }
    }
  }


  updatePageWithTrackDetails();
  sp.trackPlayer.addEventListener("playerStateChanged", function (event) {
    // Only update the page if the track changed
    if (event.data.curtrack == true) {
      updatePageWithTrackDetails();
    }
  });
  
  $('document').on('drop', function() {
    console.log('drop!');
  });
  
  sp.core.addEventListener("linksChanged", function(event) {
    var playlistURI = sp.core.getLinks()[0];
    playPlaylistFromUri(playlistURI);
  });
  
}

function playPlaylistFromUri(uri) {
  var playlist = sp.core.getPlaylist(uri);
  var tracks = new Array();
  for (var i=0; i < playlist.length; i++) {
    var track = playlist.getTrack(i);
    tracks.push(track);
  };
  // now we display those
  var playlistElement = document.getElementById("playlist");
  playlistElement.innerHTML = "";
  var tracksHTML = "";
  for (var i=0; i < tracks.length; i++) {
    var even = false;
    if(i % 2 == 0) {
      even = true
    }
    
    var rowtag = "<tr>";
    if(even) {
      rowtag = "<tr class='even'>";
    }
    
    tracksHTML = tracksHTML + rowtag + "<td><a class='tracklink' href='" + tracks[i].uri + "'>" + tracks[i].name + "</a></td>" + "<td>" + tracks[i].album.name + "</td>" + "<td>" + tracks[i].album.artist.name + "</td>" + "<td>" + millisToTimeString(tracks[i].duration) + "</td>" + "</tr>"
  };
  
  playlistElement.innerHTML = "<h2>Your Playlist</h2><table cellspacing='0'><thead><tr><th>Track</th><th>Album</th><th>Artist</th><th>Duration</th></tr></thead><tbody>" + tracksHTML  + "</tbody></table>"
  
  jQuery("a.tracklink").unbind();
  jQuery(document).on("click", "a.tracklink", function() {
    playATrack(this.href, uri);
    return false;
  });
  playATrack(tracks[0].uri, uri)
}

function playATrack (trackUri, playlistUri) {
  if(playlistUri) {
    sp.trackPlayer.playTrackFromContext(trackUri, 2, playlistUri,  {
                onSuccess: function() { console.log("success"); },
                onFailure: function () { console.log("failure"); },
                onComplete: function () { console.log("complete"); }
    });
  } else {
    sp.trackPlayer.playTrackFromUri(trackUri,  {
                onSuccess: function() { console.log("success"); },
                onFailure: function () { console.log("failure"); },
                onComplete: function () { console.log("complete"); }
    });
  }
}

function updatePageWithTrackDetails() {

  var nowPlaying = document.getElementById("nowplaying");

  // This will be null if nothing is playing.
  var playerTrackInfo = sp.trackPlayer.getNowPlayingTrack();

  if (playerTrackInfo == null) {
    nowPlaying.innerText = "Nothing playing!";
  } else {
    var track = playerTrackInfo.track;
    nowPlaying.innerText = track.name + " on the album " + track.album.name + " by " + track.album.artist.name + ".";

    Drivetime.broadcast(track);
  }
}

function updateBroadcasters(broadcasters) {
    // this gets a list of broadcasters, each one a hash with some info about what the broadcaster is broadcasting.
    var broadcastersArray = broadcasters['broadcasters'];
    var broadcastersHtmlString = "";
    for (var i=0; i < broadcastersArray.length; i++) {
      var bc = broadcastersArray[i];
      
      var currentUser = sp.core.getAnonymousUserId();
      var userId = bc.username;
      
      if(userId != currentUser) {
        broadcastersHtmlString += "<li><h3><a class='listenlink' href='spotify:app:drivetime:name:" + userId + "'>" + userId + "</a></h3><p><b>Now playing:</b> " + " </p></li>"
      }
      
    };
    $("#djlist").html(broadcastersHtmlString);
}

function millisToTimeString(millis) {
  var seconds = millis / 1000;
  var fullMinutes = Math.floor(seconds / 60);
  var remainingSeconds = seconds - (60 * fullMinutes);
  if(remainingSeconds.toString().length < 2) {
    remainingSeconds = "0" + remainingSeconds;
  }
  return fullMinutes + ":" + remainingSeconds;
}

function handleDrop(e) {
  // this / e.target is current target element.

  if (e.stopPropagation) {
    e.stopPropagation(); // stops the browser from redirecting.
  }

  // See the section on the DataTransfer object.
  console.log("I had something dropped on me");
  return false;
}
