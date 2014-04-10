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
        console.log("Icon for " + req.params.app + " not found in cache.");

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
        console.log("Icon for " + req.params.app + " found in cache.");

        res.set("Content-length", imgBuf.length);
        res.write(imgBuf, function () {
            res.end();
        });
    }
};