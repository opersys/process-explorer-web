var http = require("http");
var fs = require("fs");

exports.get = function(req, res) {
    var cacheFile = "iconcache/" + req.params.app;
    var defaultIcon = "public/images/default-icon.png";

    if (!fs.existsSync("iconcache"))
        fs.mkdirSync("iconcache");

    res.set("Content-type", "image/png");
    res.set("Cache-Control", "public, max-age=86400000");

    // Check in the disk cache.
    fs.exists(cacheFile, function (exists) {
        // Stream a request.
        if (!exists) {
            console.log("Icon for " + req.params.app + " not found in cache.");

            http.get("http://localhost:3001/icon/" + req.params.app, function (r) {
                var cacheOut, cacheIn;

                if (r.statusCode == 200) {
                    cacheOut = fs.createWriteStream(cacheFile);
                    r.on("end", function () {
                        cacheIn = fs.createReadStream(cacheFile);
                        cacheIn.on("end", function () {
                            res.end();
                        });
                        cacheIn.pipe(res);
                    });
                    r.pipe(cacheOut);
                }
                else {
                    cacheIn = fs.createReadStream(defaultIcon);
                    cacheIn.on("end", function () {
                        res.end();
                    });
                    cacheIn.pipe(res);
                }
            });
        }
        else {
            console.log("Icon for " + req.params.app + " found in cache.");
            fs.createReadStream(cacheFile).pipe(res);
        }
    });
};