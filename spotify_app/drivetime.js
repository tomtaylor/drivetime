sp = getSpotifyApi(1);

exports.init = init;

var drivetimeSocket;

var Drivetime = {

  broadcast: function (stuff) {
    console.log('trying to play stuff');
    drivetimeSocket.emit('broadcasting', { username: sp.core.getAnonymousUserId(), track: stuff, timestamp: 'x' });
  },

  listen: function (user) {
    drivetimeSocket.emit('listen_to', { username: user });

    drivetimeSocket.on('play', function (x) {
      console.log('got a notification to play ' + x);
      sp.trackPlayer(x.track);
    });
  }

};

function init() {

  drivetimeSocket = io.connect("ws://172.16.104.242:8081");

  if (sp.core.getAnonymousUserId() != '738130fdbe04d97213c95852701412040836a3b2') {
    Drivetime.listen({username: '738130fdbe04d97213c95852701412040836a3b2'});
  }

  updatePageWithTrackDetails();
  sp.trackPlayer.addEventListener("playerStateChanged", function (event) {
    // Only update the page if the track changed
    if (event.data.curtrack == true) {
      updatePageWithTrackDetails();
    }
  });
  
  sp.core.addEventListener("linksChanged", function(event) {
    var playlistURI = sp.core.getLinks()[0];
    var playlist = sp.core.getPlaylist(playlistURI);
    console.log(playlist);
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
      tracksHTML = tracksHTML + "<tr>" + "<td><a class='tracklink' href='" + tracks[i].uri + "'>" + tracks[i].name + "</a></td>" + "<td>" + tracks[i].album.name + "</td>" + "<td>" + tracks[i].album.artist.name + "</td>" + "<td>" + millisToTimeString(tracks[i].duration) + "</td>" + "</tr>"
    };
    console.log(tracks[0]);
    
    playlistElement.innerHTML = "<table><thead><tr><th>Track</th><th>Album</th><th>Artist</th><th>Duration</th></tr></thead><tbody>" + tracksHTML  + "</tbody></table>"
    
    jQuery("a.tracklink").unbind();
    jQuery(document).on("click", "a.tracklink", function() {
      sp.trackPlayer.playTrackFromContext(this.href, 2, playlistURI,  {
              onSuccess: function() { console.log("success");} ,
              onFailure: function () { console.log("failure");},
              onComplete: function () { console.log("complete"); }
              });
      return false;
    });
  });
  
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

    Drivetime.broadcast(track.uri);
  }
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
