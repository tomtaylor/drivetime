Drivetime
==

Spotify App
===========

Make sure you're a registered Spotify developer. Then:

To develop the Spotify app, you'll need to symlink it into your Spotify folder.

On a Mac:

ln -s spotify_app ~/Spotify/drivetime

and then you should be able to access it by entering

spotify:app:drivetime

into the Spotify search bar.

Server
======

To co-ordinate playback between broadcasters and listeners we have a
simple node.js server with socket.io.

It requires node 0.6.4.
