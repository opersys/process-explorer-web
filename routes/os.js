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
var util = require("util");

/*
 * send signal to a process
 * pid: process id (as int, e.g. 1)
 * signal: signal name (as string, e.g. SIGKILL)
 */
exports.kill = function (req, res) {
    var pid = req.body.pid;
    var signal = req.body.signal;

    console.log("os::kill(" + pid + ", " + signal + ")");

    try {
        process.kill(pid, signal);
        res.json({ status: "success", pid: pid, signal: signal });
    }
    catch (e) {
        console.warn("Exception while sending " + signal + " to PID " + pid + ": " + e);
        res.json({ status: "error", pid: pid, signal: signal, error: e.code});
    }
};

