#include <node.h>
#include <v8.h>
#include "psutils.h"

using namespace v8;

Handle<Value> CpuInfo(const Arguments& args) {
	Handle<Object> obj;
	const char *err;

	if (!cpu_info(&err))
		ThrowException(Exception::TypeError(String::New(err)));

	obj = Object::New();
	obj->Set(String::NewSymbol("utime"), Local<Value>::New(Uint32::New(cpu.utime)));
	obj->Set(String::NewSymbol("ntime"), Local<Value>::New(Uint32::New(cpu.ntime)));
	obj->Set(String::NewSymbol("stime"), Local<Value>::New(Uint32::New(cpu.stime)));
	obj->Set(String::NewSymbol("itime"), Local<Value>::New(Uint32::New(cpu.itime)));
	obj->Set(String::NewSymbol("iowtime"), Local<Value>::New(Uint32::New(cpu.iowtime)));
	obj->Set(String::NewSymbol("irqtime"), Local<Value>::New(Uint32::New(cpu.irqtime)));
	obj->Set(String::NewSymbol("sirqtime"), Local<Value>::New(Uint32::New(cpu.sirqtime)));

	return obj;
}

// Native process walker.
Handle<Value> ProcessWalk(const Arguments& args) {
  	HandleScope scope;
  	Handle<Function> cb;
  	Handle<Value> argv[1];
  	Handle<Object> obj;
    const char *err;

  	cb = Handle<Function>::Cast(args[0]);

    if (read_procs(&err)) {

        for (int i = 0; i < num_procs; i++) {
        	if (procs[i]) {
        	    obj = Object::New();

          		obj->Set(String::NewSymbol("pid"), Local<Value>::New(Integer::New(procs[i]->pid)));
			  	obj->Set(String::NewSymbol("ppid"), Local<Value>::New(Integer::New(procs[i]->ppid)));
  				obj->Set(String::NewSymbol("name"), Local<Value>::New(String::New(procs[i]->tname)));
  				obj->Set(String::NewSymbol("utime"), Local<Value>::New(Uint32::New(procs[i]->utime)));
  				obj->Set(String::NewSymbol("stime"), Local<Value>::New(Uint32::New(procs[i]->stime)));
  				obj->Set(String::NewSymbol("prio"), Local<Value>::New(Integer::New(procs[i]->prio)));
  				obj->Set(String::NewSymbol("nice"), Local<Value>::New(Integer::New(procs[i]->nice)));
  				obj->Set(String::NewSymbol("vss"), Local<Value>::New(Integer::New(procs[i]->vss)));
  				obj->Set(String::NewSymbol("rss"), Local<Value>::New(Integer::New(procs[i]->rss * 4096)));
  				obj->Set(String::NewSymbol("state"), Local<Value>::New(String::New(&procs[i]->state, 1)));
  	        	obj->Set(String::NewSymbol("cmdline"), Local<Value>::New(String::New(procs[i]->cmdline)));

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
}

NODE_MODULE(pswalk, Init)
