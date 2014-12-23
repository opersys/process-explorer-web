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

var express = require("express");
var http = require("http");
var path = require("path");
var spawn = require("child_process").spawn;
var socketio = require("socket.io");

var routes = require("./routes");
var sysinfo = require("./routes/sysinfo");
var icon = require("./routes/icon");
var fs = require("./routes/fs");
var libos = require("./routes/os");
var proc = require("./routes/process");

var app = express();

app.set("env", process.env.ENV || "development");
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("json spaces", 0);
app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, "public")));

// development only
if ("development" == app.get("env")) {
    app.use(express.logger("dev"));
    app.use(express.errorHandler());
}

app.get("/", function (req, res) { res.redirect("/index.html"); });
app.get("/apropos", function (req, res) { res.redirect("/apropos.html"); });
app.get("/sysinfo", sysinfo.sysinfo);
app.get("/meminfo", sysinfo.meminfo);
app.get("/cpuinfo", sysinfo.cpuinfo);
app.get("/icon/:app", icon.get);
app.get("/fs", fs.get);
app.post("/os/kill", libos.kill);
app.get("/process/environ", proc.environ);
app.get("/process/maps", proc.maps);
app.get("/process/files", proc.files);
app.get("/process/memusage", proc.memusage);

var server = http.createServer(app);
var ws = socketio.listen(server);

server.listen(app.get('port'), function() {});

ws.of("/logcat").on("connection", function (socket) {
    var logcat;

    // If we can't execute logcat, the socket will forever remain silent.

    logcat = spawn("logcat", ["-v", "time"]).on("error", function() {
        console.log("Could not execute logcat");
    });

    if (logcat) {
        logcat.stdout.on("data", function (data) {
            socket.emit("logcat", data.toString());
        });

        socket.on("disconnect", function () {
            logcat.kill();
        });
    }
});

// Handle receiving the "quit" command from the UI.
process.stdin.on("data", function (chunk) {
    if (chunk.toString().split("\n")[0].trim().toLowerCase() == "quit")
        process.exit();
});

