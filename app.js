var express = require("express");
var http = require("http");
var path = require("path");
var socketio = require("socket.io");
var spawn = require("child_process").spawn;

var routes = require("./routes");
var sysinfo = require("./routes/sysinfo");
var icon = require("./routes/icon");

var app = express();

app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("json spaces", 0);
app.use(express.favicon());
app.use(express.logger("dev"));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, "public")));

// development only
if ("development" == app.get("env")) {
  app.use(express.errorHandler());
}

app.get("/", function (req, res) { res.redirect("/index.html"); });
app.get("/sysinfo", sysinfo.sysinfo);
app.get("/meminfo", sysinfo.meminfo);
app.get("/cpuinfo", sysinfo.cpuinfo);
app.get("/icon/:app", icon.get);

var server = http.createServer(app);
var ws = socketio.listen(server);

server.listen(app.get('port'), function() {
    console.log("Express server listening on port " + app.get("port"));
});

ws.configure("development", function () {
    ws.set("log level", 1);
});

ws.of("/logcat").on("connection", function (socket) {
    var logcat = spawn("logcat");

    logcat.stdout.on("data", function (data) {
        socket.emit("logcat", data.toString());
    });

    socket.on("disconnect", function () {
        logcat.kill();
    });
});

