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

var _ = require("underscore");
var sysinfo = null;
var os = require("os");

try {
    sysinfo = require("../build/Debug/pswalk");
} catch (e) {
    try {
        sysinfo = require("../bin/" + os.arch() + "/pswalk");
    } catch (e) {
        sysinfo = require("../pswalk");
    }
}

var util = require("util");

function compress(objlist) {
    var idx, nidx = 0;
    var i, r = [];
    var ctab = [];

    _.each(objlist, function (obj) {
        i = [];
        _.each(_.keys(obj), function (k) {
            if (!_.contains(ctab, k))
                ctab.push(k);
            idx = _.indexOf(ctab, k);
            i[idx] = obj[k];
        });
        r.push(i);
    });
    return {ctab: ctab, list: r};
}

exports.cpuinfo = function (req, res) {
    res.json(sysinfo.cpuinfo());
};

exports.meminfo = function (req, res) {
    res.json(sysinfo.meminfo());
};

exports.sysinfo = function(req, res) {
    var info = { ps: [] };
    var pslist = [];

    info.cpuinfo = sysinfo.cpuinfo();
    info.meminfo = sysinfo.meminfo();

    pslist.push({
        pid: 0,
        ppid: null,
        name: "Kernel",
        utime: null,
        stime: null,
        prio: null,
        nice: null,
        vss: null,
        rss: null,
        shm: null,
        state: null,
        cmdline: null,
        time: null
    });

    sysinfo.pswalk(function (procdata) {
        pslist.push(procdata);
    });
    info.ps = compress(pslist);

    res.json(info);
};

//a = compress([{a: 1, b: 3}, {b: 3, a: 1}]);
//console.log(a);
//b = uncompress(a);
//console.log(b);