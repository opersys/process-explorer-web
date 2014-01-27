var sysinfo = require('../build/Debug/pswalk');
var util = require('util');

exports.sysinfo = function(req, res) {
    var info = { ps: [] };

    info.cpuinfo = sysinfo.cpuinfo();
    info.meminfo = sysinfo.meminfo();

    info.ps.push({
        pid: 0,
        parent: "#",
        name: "Kernel"
    });

    sysinfo.pswalk(function (procdata) {
        info.ps.push(procdata);
    });

    res.json(info);
};