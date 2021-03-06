Drivetime
=========

A Spotify App on the Spotify Platform that lets you broadcast a
playlist, and lets others listen to it in real-time, as you listen to
it.

Made during Music Hackday London 2011 by [Blaine
Cook](http://romeda.org/), [Tom Armitage](http://infovore.org) and
[Tom Taylor](http://scraplab.net).

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

It requires node 0.6.4. Run it with `node server/drivetime.js` and
change the javascript in `spotify_app/index.html` to point to the
correct URL for your server. You'll need to update the
`spotify_app/manifest.json` to allow access to your host.

License
=======

Copyright (C) 2011 by Blaine Cook, Tom Armitage, Tom Taylor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
