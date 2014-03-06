#include <node.h>
#include <v8.h>
#include <unistd.h>
#include "psutils.h"

using namespace v8;

Handle<Value> MemInfo(const Arguments& args) {
	Handle<Object> jmem;
	const char *err;

	if (!mem_info(&err))
		ThrowException(Exception::TypeError(String::New(err)));

	jmem = Object::New();
	jmem->Set(String::NewSymbol("memTotal"), Local<Value>::New(Number::New(mem.memTotal * 1024L)));
	jmem->Set(String::NewSymbol("memFree"), Local<Value>::New(Number::New(mem.memFree * 1024L)));
	jmem->Set(String::NewSymbol("buffers"), Local<Value>::New(Number::New(mem.buffers * 1024L)));
	jmem->Set(String::NewSymbol("cached"), Local<Value>::New(Number::New(mem.cached * 1024L)));
	jmem->Set(String::NewSymbol("swapTotal"), Local<Value>::New(Number::New(mem.swapTotal * 1024L)));
	jmem->Set(String::NewSymbol("swapFree"), Local<Value>::New(Number::New(mem.swapFree * 1024L)));

	return jmem;
}

Handle<Value> CpuInfo(const Arguments& args) {
	Handle<Object> jcpuinfo, jgcpu, jcpus;
	const char *err;

	if (!cpu_info(&err))
		ThrowException(Exception::TypeError(String::New(err)));

	jgcpu = Object::New();
	jgcpu->Set(String::NewSymbol("utime"), Local<Value>::New(Number::New(global_cpu.utime)));
	jgcpu->Set(String::NewSymbol("ntime"), Local<Value>::New(Number::New(global_cpu.ntime)));
	jgcpu->Set(String::NewSymbol("stime"), Local<Value>::New(Number::New(global_cpu.stime)));
	jgcpu->Set(String::NewSymbol("itime"), Local<Value>::New(Number::New(global_cpu.itime)));
	jgcpu->Set(String::NewSymbol("iowtime"), Local<Value>::New(Number::New(global_cpu.iowtime)));
	jgcpu->Set(String::NewSymbol("irqtime"), Local<Value>::New(Number::New(global_cpu.irqtime)));
	jgcpu->Set(String::NewSymbol("sirqtime"), Local<Value>::New(Number::New(global_cpu.sirqtime)));
	jgcpu->Set(String::NewSymbol("ncpu"), Local<Value>::New(Number::New(nb_cpu)));

    jcpus = Array::New();

    for (int i = 0; i < nb_cpu; i++) {
        Handle<Object> jcpu;

        jcpu = Object::New();
        jcpu->Set(String::NewSymbol("no"), Local<Value>::New(Number::New(cpu[i].no)));
        jcpu->Set(String::NewSymbol("utime"), Local<Value>::New(Number::New(cpu[i].utime)));
        jcpu->Set(String::NewSymbol("ntime"), Local<Value>::New(Number::New(cpu[i].ntime)));
        jcpu->Set(String::NewSymbol("stime"), Local<Value>::New(Number::New(cpu[i].stime)));
        jcpu->Set(String::NewSymbol("itime"), Local<Value>::New(Number::New(cpu[i].itime)));
        jcpu->Set(String::NewSymbol("iowtime"), Local<Value>::New(Number::New(cpu[i].iowtime)));
        jcpu->Set(String::NewSymbol("irqtime"), Local<Value>::New(Number::New(cpu[i].irqtime)));
        jcpu->Set(String::NewSymbol("sirqtime"), Local<Value>::New(Number::New(cpu[i].sirqtime)));

        jcpus->Set(v8::Number::New(i), jcpu);
    }

    jcpuinfo = Object::New();
    jcpuinfo->Set(String::NewSymbol("global"), jgcpu);
    jcpuinfo->Set(String::NewSymbol("cpus"), jcpus);

	return jcpuinfo;
}

// Native process walker.
Handle<Value> ProcessWalk(const Arguments& args) {
  	HandleScope scope;
  	Handle<Function> cb;
  	Handle<Value> argv[1];
  	Handle<Object> obj;
    const char *err;
    long unsigned time;

  	cb = Handle<Function>::Cast(args[0]);

    if (read_procs(&err)) {

        for (int i = 0; i < num_procs; i++) {
        	if (procs[i]) {
        	    obj = Object::New();

        	    /* FIXME: CLOCK_TICKS are system dependent so calculate the time
        	       value in second here as a convenience for the interface. */
				time = (procs[i]->utime + procs[i]->stime) / sysconf(_SC_CLK_TCK);

          		obj->Set(String::NewSymbol("pid"), Local<Value>::New(Number::New(procs[i]->pid)));
			  	obj->Set(String::NewSymbol("ppid"), Local<Value>::New(Number::New(procs[i]->ppid)));
  				obj->Set(String::NewSymbol("name"), Local<Value>::New(String::New(procs[i]->tname)));
  				obj->Set(String::NewSymbol("utime"), Local<Value>::New(Number::New(procs[i]->utime)));
  				obj->Set(String::NewSymbol("stime"), Local<Value>::New(Number::New(procs[i]->stime)));
  				obj->Set(String::NewSymbol("prio"), Local<Value>::New(Number::New(procs[i]->prio)));
  				obj->Set(String::NewSymbol("nice"), Local<Value>::New(Number::New(procs[i]->nice)));
  				obj->Set(String::NewSymbol("vss"), Local<Value>::New(Number::New(procs[i]->vss)));
  				obj->Set(String::NewSymbol("rss"), Local<Value>::New(Number::New(procs[i]->rss * getpagesize())));
  				obj->Set(String::NewSymbol("shm"), Local<Value>::New(Number::New(procs[i]->shm * getpagesize())));
  				obj->Set(String::NewSymbol("state"), Local<Value>::New(String::New(&procs[i]->state, 1)));
  	        	obj->Set(String::NewSymbol("cmdline"), Local<Value>::New(String::New(procs[i]->cmdline)));
                obj->Set(String::NewSymbol("time"), Local<Value>::New(Number::New(time)));

            	argv[0] = obj;
           		cb->Call(Context::GetCurrent()->Global(), 1, argv);
           	}
        }
    } else
        ThrowException(Exception::TypeError(String::New(err)));

  	return scope.Close(Undefined());
}

void Init(Handle<Object> exports, Handle<Object> module) {
  	exports->Set(String::NewSymbol("pswalk"),FunctionTemplate::New(ProcessWalk)->GetFunction());
  	exports->Set(String::NewSymbol("cpuinfo"), FunctionTemplate::New(CpuInfo)->GetFunction());
  	exports->Set(String::NewSymbol("meminfo"), FunctionTemplate::New(MemInfo)->GetFunction());
}

NODE_MODULE(pswalk, Init)
