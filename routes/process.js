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

var _ = require("underscore");
var fs = require("fs");
var util = require("util");

/*
 * get the environment variables for the specified process
 * pid: process id (as int, e.g. 1)
 */
exports.environ = function (req, res) {
    var pid = req.query.pid;

    var path = "/proc/" + pid + "/environ"

    console.log("process::environ(" + pid + ")");

    try {
        var result = { };

        environ = fs.readFileSync(path, { encoding: "utf8" } );
        variables = environ.split("\0");

        for (var i=0; i < variables.length; i++) {
            variable = variables[i].split("=");
            result[variable[0]] = variable[1];
        }

        res.json({ status: "success", pid: pid, variables: result});
    }
    catch (e) {
        console.warn("Exception while reading " + path + " from PID " + pid + ": " + e);
        res.json({ status: "error", pid: pid, error: e.code});
    }
};

/*
 * get the memory maps for the specified process
 * pid: process id (as int, e.g. 1)
 */
exports.maps = function (req, res) {
    var pid = req.query.pid;

    var path = "/proc/" + pid + "/maps"

    console.log("process::maps(" + pid + ")");

    try {
        var result = [ ];

        memory_maps = fs.readFileSync(path, { encoding: "utf8" } );
        maps = memory_maps.split("\n");

        maps.forEach(function(map) {
            m = map.match(/\S+/g);
            if (m != null) {
                var object = {
                    address: m[0],
                    permissions: m[1],
                    offset: m[2],
                    device: m[3],
                    inode: m[4],
                    pathname: m[5],
                };

                result.push(object);
            }
        });

        res.json({ status: "success", pid: pid, maps: result});
    }
    catch (e) {
        console.warn("Exception while reading " + path + " from PID " + pid + ": " + e);
        res.json({ status: "error", pid: pid, error: e.code});
    }
};

exports.files = function (req, res) {
    var pid = req.query.pid;

    console.log("process::files(" + pid + ")");

    var path = "/proc/" + pid + "/fd/"

    try {
        var result = [ ];

        files = fs.readdirSync(path);

        files.forEach(function(file) {
            var object = {
                fd: file,
                path: "",
            };

            switch (file) {
                case "0":
                    object.path = "stdin";
                    break;
                case "1":
                    object.path = "stdout";
                    break;
                case "2":
                    object.path = "stderr";
                    break;
                default:
                    object.path = fs.readlinkSync(path + file);
                    break;
            }

            result.push(object);
        });

        res.json({ status: "success", pid: pid, files: result});
    }
    catch (e) {
        console.warn("Exception while reading " + path + " from PID " + pid + ": " + e);
        res.json({ status: "error", pid: pid, error: e.code});
    }

};

const HEAP_UNKNOWN = "unknown";
const HEAP_DALVIK = "dalvik";
const HEAP_NATIVE = "native";
const HEAP_DALVIK_OTHER = "dalvik_other";
const HEAP_DALVIK_LINEARALLOC = "dalvik_linearalloc";
const HEAP_DALVIK_CODE_CACHE = "dalvik_code_cache";
const HEAP_DALVIK_LARGE = "dalvik_large";
const HEAP_DALVIK_ACCOUNTING = "dalvik_accounting";
const HEAP_STACK = "stack";
const HEAP_CURSOR = "cursor";
const HEAP_ASHMEM = "ashmem";
const HEAP_UNKNOWN_DEV = "unknown_dev";
const HEAP_SO = "so";
const HEAP_JAR = "jar";
const HEAP_APK = "apk";
const HEAP_TTF = "ttf";
const HEAP_DEX = "dex";
const HEAP_OAT = "oat";
const HEAP_ART = "art";
const HEAP_UNKNOWN_MAP = "unknown_map";
const HEAP_GRAPHICS = "graphics";
const HEAP_GL = "gl";
const HEAP_OTHER_MEMTRACK = "memtrack";

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

/*
 * get some stats about the memory usage for the specified process
 * pid: process id (as int, e.g. 1)
 */
exports.memusage = function (req, res) {
    var pid = req.query.pid;

    console.log("process::memusage(" + pid + ")");

    var path = "/proc/" + pid + "/smaps";

    var heap_type = "";
    var subheap_type = "";

    try {
        var result = { };

        process_smaps = fs.readFileSync(path, { encoding: "utf8" } );

        smaps = process_smaps.split("\n");

        var address_start = 0;
        var address_end = 0;
        var pathname = "";

        smaps.forEach(function(smap) {
            // Match something like
            // b6e79000-b6e7a000 rw-p 00002000 b3:15 1332       /system/lib/libnetd_client.so
            m = smap.match(/([\da-f]+)-([\da-f]+)\s+(\S+)\s+([\da-f]+)\s+[\da-f:]+\s+([\d]+)\s+(\S+)?/i);

            if (m != null) {
                address_start = m[0];
                address_end = m[1];
                pathname = m[6];

                if (pathname == undefined) {
                    pathname = "";
                }

                if (pathname == "[heap]") {
                    heap_type = HEAP_NATIVE;
                }
                else if (pathname.indexOf("/dev/ashmem/") !== -1) {
                    heap_type = HEAP_ASHMEM;
                    if (pathname.indexOf("/dev/ashmem/dalvik-") !== -1) {
                        heap_type = HEAP_DALVIK_OTHER;
                        if (pathname == "/dev/ashmem/dalvik-LinearAlloc") {
                            subheap_type = HEAP_DALVIK_LINEARALLOC;
                        }
                        else if (pathname == "/dev/ashmem/dalvik-large") {
                            heap_type = HEAP_DALVIK;
                            subheap_type = HEAP_DALVIK_LARGE;
                        }
                        else if (pathname == "/dev/ashmem/dalvik-jit-code-cache") {
                            subheap_type = HEAP_DALVIK_CODE_CACHE;
                        }
                        else if (pathname == "/dev/ashmem/dalvik-mark" ||
                                pathname == "/dev/ashmem/dalvik-allocspace alloc space live-bitmap" ||
                                pathname == "/dev/ashmem/dalvik-allocspace alloc space mark-bitmap" ||
                                pathname == "/dev/ashmem/dalvik-card table" ||
                                pathname == "/dev/ashmem/dalvik-allocation stack" ||
                                pathname == "/dev/ashmem/dalvik-live stack" ||
                                pathname == "/dev/ashmem/dalvik-imagespace" ||
                                pathname == "/dev/ashmem/dalvik-bitmap" ||
                                pathname == "/dev/ashmem/dalvik-card-table" ||
                                pathname == "/dev/ashmem/dalvik-mark-stack" ||
                                pathname == "/dev/ashmem/dalvik-aux-structure") {
                            subheap_type = HEAP_DALVIK_ACCOUNTING;
                        }
                    }
                    else if (pathname == "/dev/ashmem/CursorWindow") {
                        heap_type = HEAP_CURSOR;
                    }
                    else if (pathname == "/dev/ashmem/libc malloc") {
                        heap_type = HEAP_NATIVE;
                    }
                }
                else if (pathname == "[anon:libc_malloc]") {
                    heap_type = HEAP_NATIVE;
                }
                else if (pathname.indexOf("[stack") !== -1) {
                    heap_type = HEAP_STACK;
                }
                else if (pathname.indexOf("/dev") !== -1) {
                    heap_type = HEAP_UNKNOWN_DEV;
                }
                else if (pathname.endsWith(".so")) {
                    heap_type = HEAP_SO;
                }
                else if (pathname.endsWith(".jar")) {
                    heap_type = HEAP_JAR;
                }
                else if (pathname.endsWith(".apk")) {
                    heap_type = HEAP_APK;
                }
                else if (pathname.endsWith(".ttf")) {
                    heap_type = HEAP_TTF;
                }
                else if (pathname.endsWith(".dex") ||
                        pathname.endsWith(".odex")) {
                    heap_type = HEAP_DEX;
                }
                else if (pathname.endsWith(".oat")) {
                    heap_type = HEAP_OAT;
                }
                else if (pathname.endsWith(".art")) {
                    heap_type = HEAP_ART;
                }
                else if (pathname.indexOf("[anon") !== -1) {
                    heap_type = HEAP_ART;
                }
                else {
                    heap_type = HEAP_NATIVE;
                }

                if (!(heap_type in result)) {
                    result[heap_type] = {};
                }

                return;
            }

            if (smap.indexOf("Size:") !== -1) {
                m = smap.match(/Size:\s+([\d]+) kB/i);
                if (!("size" in result[heap_type])) {
                    result[heap_type]["size"] = 0;
                }
                result[heap_type]["size"] += parseInt(m[1]);
                return;
            }

            if (smap.indexOf("Rss:") !== -1) {
                m = smap.match(/Rss:\s+([\d]+) kB/i);
                if (!("rss" in result[heap_type])) {
                    result[heap_type]["rss"] = 0;
                }
                result[heap_type]["rss"] += parseInt(m[1]);
                return;
            }

            if (smap.indexOf("Pss:") !== -1) {
                m = smap.match(/Pss:\s+([\d]+) kB/i);
                if (!("pss" in result[heap_type])) {
                    result[heap_type]["pss"] = 0;
                }
                result[heap_type]["pss"] += parseInt(m[1]);
                return;
            }

            if (smap.indexOf("Shared_Clean:") !== -1) {
                m = smap.match(/Shared_Clean:\s+([\d]+) kB/i);
                if (!("shared_clean" in result[heap_type])) {
                    result[heap_type]["shared_clean"] = 0;
                }
                result[heap_type]["shared_clean"] += parseInt(m[1]);
                return;
            }

            if (smap.indexOf("Shared_Dirty:") !== -1) {
                m = smap.match(/Shared_Dirty:\s+([\d]+) kB/i);
                if (!("shared_dirty" in result[heap_type])) {
                    result[heap_type]["shared_dirty"] = 0;
                }
                result[heap_type]["shared_dirty"] += parseInt(m[1]);
                return;
            }

            if (smap.indexOf("Private_Clean:") !== -1) {
                m = smap.match(/Private_Clean:\s+([\d]+) kB/i);
                if (!("private_clean" in result[heap_type])) {
                    result[heap_type]["private_clean"] = 0;
                }
                result[heap_type]["private_clean"] += parseInt(m[1]);
                return;
            }

            if (smap.indexOf("Private_Dirty:") !== -1) {
                m = smap.match(/Private_Dirty:\s+([\d]+) kB/i);
                if (!("private_dirty" in result[heap_type])) {
                    result[heap_type]["private_dirty"] = 0;
                }
                result[heap_type]["private_dirty"] += parseInt(m[1]);
                return;
            }
        });

        res.json({ status: "success", pid: pid, memusage: result});
    }
    catch (e) {
        console.warn("Exception while reading " + path + " from PID " + pid + ": " + e);
        res.json({ status: "error", pid: pid, error: e.code});
    }
}
