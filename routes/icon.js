/*
 * Copyright (C) 2014-2015, Opersys inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var http = require("http");
var fs = require("fs");
var cache = require("js-cache");

var defaultIcon = "public/images/default-icon.png";
var imgCache = new cache();

// Precache the default icon.
fs.stat(defaultIcon, function (err, defStat) {
    var defIn = fs.createReadStream(defaultIcon);

    defIn.on("readable", function () {
        var defBuf = defIn.read(defStat.size);

        if (defBuf != null)
            imgCache.set("default", defBuf);
        else
            throw "Failed to read default icon";
    });
});

exports.get = function(req, res) {
    var imgBuf;

    res.set("Content-type", "image/png");
    res.set("Cache-Control", "public, max-age=86400000");

    // Check in the disk cache.
    if (!(imgBuf = imgCache.get(req.params.app))) {
        // Stream a request.

        http.get("http://localhost:3001/icon/" + req.params.app, function (r) {
            var newImgBuf, sz, idx = 0;

            if (r.statusCode == 200) {
                sz = parseInt(r.headers["content-length"]);
                res.set("Content-length", sz);
                newImgBuf = new Buffer(sz);

                r.on("data", function (imgChunk) {
                    imgChunk.copy(newImgBuf, idx);
                    idx += imgChunk.length;
                });

                r.on("end", function () {
                    imgCache.set(req.params.app, newImgBuf, 86400000);
                    res.write(newImgBuf, function () {
                        res.end();
                    });
                });
            }
            else {
                imgBuf = imgCache.get("default");
                res.set("Content-length", imgBuf.length);
                res.write(imgBuf, function () {
                    res.end();
                });
            }
        }).on("error",
            function () {
                imgBuf = imgCache.get("default");
                res.set("Content-length", imgBuf.length);
                res.write(imgBuf, function () {
                    res.end();
                });
            });
    }
    else {
        res.set("Content-length", imgBuf.length);
        res.write(imgBuf, function () {
            res.end();
        });
    }
};