What is it?
===========

`process-explorer-web` are assets used with `process-explorer-app` Android
application. This is essentially a package of node.js server and `pswalk` node.

Installation
============

Required node packages
----------------------

You'll need grunt:

    npm install --global grunt-cli

Then in order to `grunt pack`, you will need the following packages:

    npm install grunt grunt-chmod grunt-copy-to grunt-css grunt-exec grunt-mkdir
        grunt-contrib-concat grunt-contrib-uglify grunt-contrib-compress
        grunt-jade grunt-pack

Binary files
------------

We have already built them for you, but in case you want to reproduce the
binaries, check the `bin/arm/README.md` for more information.

Generate process-explorer-app assets
------------------------------------

Given a working node and Grunt install, simply run

    grunt pack

In the process-explorer-web directory to generate the assets required by
the process-explorer-app project. The assets will be output in the "out"
and can be copied directly into the "assets" directory of the
`process-explorer-app` project.

Licensing
=========

See the `NOTICE` file.

Contributors
============

* François-Denis Gonthier <francois-denis.gonthier@opersys.com> -- main developer and maintainer
* Karim Yaghmour <karim.yaghmour@opersys.com> -- ideas and other forms of entertainment
* Benjamin Vanheuverzwijn <benjamin.vanheuverzwijn@opersys.com> -- contributor
