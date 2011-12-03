sp = getSpotifyApi(1);

exports.init = init;

function init() {
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
      tracksHTML = tracksHTML + "<tr>" + "<td>" + tracks[i].name + "</td>" + "<td>" + tracks[i].album.name + "</td>" + "<td>" + tracks[i].album.artist.name + "</td>" + "<td>" + millisToTimeString(tracks[i].duration) + "</td>" + "</tr>"
    };
    
    playlistElement.innerHTML = "<table><thead><tr><th>Track</th><th>Album</th><th>Artist</th><th>Duration</th></tr></thead><tbody>" + tracksHTML  + "</tbody></table>"
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