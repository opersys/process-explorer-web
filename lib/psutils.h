#ifndef PSUTILS_H
#define PSUTILS_H

#define PROC_NAME_LEN 256
#define PROC_CMDLINE_LEN 256
#define THREAD_NAME_LEN 32
#define POLICY_NAME_LEN 4
#define INIT_PROCS 50
#define THREAD_MULT 8
#define MAX_LINE 256

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

// Number of CPUs on the system
int nb_cpu;

int max_procs, delay, iterations, threads;
struct proc_info **procs;
int num_procs;
struct proc_info *free_procs;
int num_used_procs, num_free_procs;

#ifdef __cplusplus
extern "C" {
#endif

int cpu_info(const char **err);

int read_procs(const char **err);

#ifdef __cplusplus
}
#endif // __cplusplus


#endif // PSUTILS_H