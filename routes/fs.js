/*
 * Copyright (C) 2014 Opersys inc.
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

var fs = require("fs");
var path = require("path");
var _ = require("underscore");

exports.get = function (req, res) {
    var rpath;

    if (!req.query.p)
        rpath = "/";
    else
        rpath = req.query.p;

    fslist = [];

    fs.readdir(rpath, function (err, files) {
        var nbstat = 0, nbfiles = files.length;

        _.each(files, function (file) {
            var filest = fs.stat(path.join(rpath, file), function (err, stat) {
                nbstat++;

                fslist.push({
                    path: path.join(rpath, file),
                    uid: stat.uid,
                    gid: stat.gid,
                    size: stat.size,
                    blksize: stat.blksize,
                    blocks: stat.blocks,
                    nlink: stat.nlink,
                    atime: stat.atime,
                    mtime: stat.mtime,
                    ctime: stat.ctime,
                    isFile: stat.isFile(),
                    isDirectory: stat.isDirectory(),
                    isBlockDevice: stat.isBlockDevice(),
                    isCharacterDevice: stat.isCharacterDevice(),
                    isFIFO: stat.isFIFO(),
                    isSocket: stat.isSocket()
                });

                if (nbstat == nbfiles)
                    res.json(fslist);
            });
        });
    });
};