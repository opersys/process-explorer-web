#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <fcntl.h>
#include <dirent.h>
#include <unistd.h>
#include <string.h>

#include <sys/stat.h>
#include <sys/types.h>

#include <node.h>
#include <v8.h>

using namespace v8;

static const char *nexttoksep(char **strp, const char *sep)
{
  const char *p = (const char*)strsep(strp, sep);
  return (p == 0) ? "" : p;
}

static const char *nexttok(char **strp)
{
  return nexttoksep(strp, " ");
}

void ProcessInfoStat(Local<Object> obj, char *statline) {
  char *ptr;
  const char *state, *name;
  int ppid, tty, prio, nice;
  unsigned int utime, stime, vss, rss;

  // Skip the PID
  ptr = statline;
  nexttok(&ptr); 
  ptr++;
  
  // Skip to *last* occurence of ')',
  // and null-terminate name.
  name = ptr;
  ptr = strrchr(ptr, ')'); 
  *ptr++ = 0;  
  
  // Skip " "
  ptr++;
  state = nexttok(&ptr);
  ppid = atoi(nexttok(&ptr));
  nexttok(&ptr); // pgrp
  nexttok(&ptr); // sid
  tty = atoi(nexttok(&ptr));

  nexttok(&ptr); // tpgid
  nexttok(&ptr); // flags
  nexttok(&ptr); // minflt
  nexttok(&ptr); // cminflt
  nexttok(&ptr); // majflt
  nexttok(&ptr); // cmajflt

  utime = atoi(nexttok(&ptr)); 
  stime = atoi(nexttok(&ptr));

  nexttok(&ptr); // cutime
  nexttok(&ptr); // cstime

  prio = atoi(nexttok(&ptr));
  nice = atoi(nexttok(&ptr));
  nexttok(&ptr); // threads
  nexttok(&ptr); // itrealvalue
  nexttok(&ptr); // starttime
  vss = strtoul(nexttok(&ptr), 0, 10); // vsize
  rss = strtoul(nexttok(&ptr), 0, 10); // rss
  nexttok(&ptr); // rlim
  nexttok(&ptr); // startcode
  nexttok(&ptr); // endcode
  nexttok(&ptr); // startstack
  nexttok(&ptr); // kstkesp
#if 0
  eip = strtoul(nexttok(&ptr), 0, 10); // kstkeip
  nexttok(&ptr); // signal
  nexttok(&ptr); // blocked
  nexttok(&ptr); // sigignore
  nexttok(&ptr); // sigcatch
  wchan = strtoul(nexttok(&ptr), 0, 10); // wchan
  nexttok(&ptr); // nswap
  nexttok(&ptr); // cnswap
  nexttok(&ptr); // exit signal
  psr = atoi(nexttok(&ptr)); // processor
  rtprio = atoi(nexttok(&ptr)); // rt_priority
  sched = atoi(nexttok(&ptr)); // scheduling policy
  
  tty = atoi(nexttok(&ptr));
  
  if(tid != 0) {
    ppid = pid;
    pid = tid;
  }
  
  pw = getpwuid(stats.st_uid);
  if(pw == 0) {
    sprintf(user,"%d",(int)stats.st_uid);
  } else {
    strcpy(user,pw->pw_name);
  }
#endif

  obj->Set(String::NewSymbol("ppid"), Local<Value>::New(Integer::New(ppid)));
  obj->Set(String::NewSymbol("tty"), Local<Value>::New(Integer::New(tty)));  
  obj->Set(String::NewSymbol("name"), Local<Value>::New(String::New(name)));
  obj->Set(String::NewSymbol("utime"), Local<Value>::New(Uint32::New(utime)));
  obj->Set(String::NewSymbol("stime"), Local<Value>::New(Uint32::New(stime)));
  obj->Set(String::NewSymbol("prio"), Local<Value>::New(Integer::New(prio)));
  obj->Set(String::NewSymbol("nice"), Local<Value>::New(Integer::New(nice)));
  obj->Set(String::NewSymbol("vss"), Local<Value>::New(Integer::New(vss)));
  obj->Set(String::NewSymbol("rss"), Local<Value>::New(Integer::New(rss)));
  obj->Set(String::NewSymbol("state"), Local<Value>::New(String::New(state)));
}

// Extract information for a single process.
Local<Object> ProcessInfo(int pid, int tid) {
  Local<Object> obj = Object::New();
  char statline[1024], cmdline[1024], macline[1024];
  struct stat stats;
  int fd, r;

  sprintf(statline, "/proc/%d", pid);
  stat(statline, &stats);

  sprintf(statline, "/proc/%d/stat", pid);
  sprintf(cmdline, "/proc/%d/cmdline", pid);
  snprintf(macline, sizeof(macline), "/proc/%d/attr/current", pid);
  fd = open(cmdline, O_RDONLY);

  if(fd == 0) {
    r = 0;
  } else {
    r = read(fd, cmdline, 1023);
    close(fd);
    if(r < 0) r = 0;
  }
  cmdline[r] = 0;

  fd = open(statline, O_RDONLY);
  //if(fd == 0) return -1;
  r = read(fd, statline, 1023);
  close(fd);
  //if(r < 0) return -1;
  statline[r] = 0;

  ProcessInfoStat(obj, statline);
  obj->Set(String::NewSymbol("pid"), Local<Value>::New(Integer::New(pid)));
  obj->Set(String::NewSymbol("cmdline"), Local<Value>::New(String::New(cmdline)));

  return obj;
}

// Native process walker.
Handle<Value> RunCallback(const Arguments& args) {
  DIR *proc;
  struct dirent *procentry;
  HandleScope scope;
  Local<Function> cb;
  Local<Value> argv[1];

  proc = opendir("/proc");
  if (proc == 0) 
    return scope.Close(Undefined());

  cb = Local<Function>::Cast(args[0]);

  while ((procentry = readdir(proc)) != 0) {
    if(isdigit(procentry->d_name[0])){
      int pid = atoi(procentry->d_name);

      argv[0] = ProcessInfo(pid, 0);
      cb->Call(Context::GetCurrent()->Global(), 1, argv);
    }
  }
  
  closedir(proc);

  return scope.Close(Undefined());
}

void Init(Handle<Object> exports, Handle<Object> module) {
  module->Set(String::NewSymbol("exports"),
              FunctionTemplate::New(RunCallback)->GetFunction());
}

NODE_MODULE(pswalk, Init)
