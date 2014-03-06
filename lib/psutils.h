#ifndef PSUTILS_H
#define PSUTILS_H

#define PROC_NAME_LEN 256
#define PROC_CMDLINE_LEN 256
#define THREAD_NAME_LEN 32
#define POLICY_NAME_LEN 4
#define INIT_PROCS 50
#define THREAD_MULT 8
#define MAX_LINE 256

struct mem_info {
  	long unsigned memTotal;
  	long unsigned memFree;
	long unsigned buffers;
	long unsigned cached;
	long unsigned swapTotal;
	long unsigned swapFree;
};

struct cpu_info {
	// CPU number (-1 for global info)
	int no;

	// CPU system data.
    long unsigned utime;
    long unsigned ntime;
    long unsigned stime;
    long unsigned itime;
    long unsigned iowtime;
    long unsigned irqtime;
    long unsigned sirqtime;
    long unsigned stealtime;
    long unsigned guesttime;
    long unsigned guestnicetime;
};

struct proc_info {
    struct proc_info *next;
    pid_t pid;
    pid_t ppid;
    pid_t tid;
    uid_t uid;
    gid_t gid;
    char name[PROC_NAME_LEN];
    char cmdline[PROC_CMDLINE_LEN];
    char tname[THREAD_NAME_LEN];
    char state;
    long unsigned utime;
    long unsigned stime;
    long unsigned delta_utime;
    long unsigned delta_stime;
    long unsigned delta_time;
    long vss;
    long rss;
    long shm;
    int prs;
    int prio;
    int nice;
    int num_threads;
    char policy[POLICY_NAME_LEN];
};

// Global CPU state.
struct cpu_info global_cpu;

// Array of CPU info from /proc/stat
struct cpu_info* cpu;

// Memory info
struct mem_info mem;

// Number of CPUs on the system
int nb_cpu;

int max_procs, delay, iterations, threads;

// Array of process structures.
struct proc_info **procs;

// Linked list of process structure, already allocated and reusable.
struct proc_info *free_procs;

// Number of process structure currently used.
int num_procs;

// Number of space for process structures.
int num_alloc_procs;

#ifdef __cplusplus
extern "C" {
#endif

    int cpu_info(const char **err);
    
    int mem_info(const char **err);
    
    int read_procs(const char **err);

    void cleanup();

#ifdef __cplusplus
}
#endif // __cplusplus


#endif // PSUTILS_H
