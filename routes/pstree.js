var sysinfo = require('../build/Debug/pswalk');
var util = require('util');

exports.sysinfo = function(req, res) {
    var sysinfo = { ps: [] };

    sysinfo.cpuinfo = psinfo.cpuinfo();

    s.push({
        pid: 0,
        parent: "#",
        name: "Kernel"
    });

    sysinfo.pswalk(function (procdata) {
        s.push(procdata);
    });

    res.json(psinfo);
};