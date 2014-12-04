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
 * send signal to a process
 * pid: process id (as int, e.g. 1)
 * signal: signal name (as string, e.g. SIGKILL)
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

