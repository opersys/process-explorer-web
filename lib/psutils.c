/* This files is based on the content of system/core/toolbox of the Android Open
   Source Project with some modifications. */

#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <fcntl.h>
#include <dirent.h>
#include <unistd.h>
#include <string.h>

#include <sys/stat.h>
#include <sys/types.h>

#include "psutils.h"

void free_proc(struct proc_info *proc) {
    proc->next = free_procs;
    free_procs = proc;

    num_used_procs--;
    num_free_procs++;
}

struct proc_info *alloc_proc(void) {
    struct proc_info *proc;

    if (free_procs) {
        proc = free_procs;
        free_procs = free_procs->next;
        num_free_procs--;
    } else {
        proc = (struct proc_info *)malloc(sizeof(*proc));
        if (!proc) return NULL;
    }

    num_used_procs++;

    return proc;
}

int add_proc(int proc_num, struct proc_info *proc) {
    int i;

    if (proc_num >= num_procs) {
        procs = (struct proc_info **)realloc(procs, 2 * num_procs * sizeof(struct proc_info *));
        if (!procs) return 0;

        for (i = num_procs; i < 2 * num_procs; i++)
            procs[i] = NULL;

        num_procs = 2 * num_procs;
    }
    procs[proc_num] = proc;

    return 1;
}

int read_stat(char *filename, struct proc_info *proc) {
    FILE *file;
    char buf[MAX_LINE], *open_paren, *close_paren;
    int res, idx;

    file = fopen(filename, "r");
    if (!file) return 0;

    fgets(buf, MAX_LINE, file);
    fclose(file);

    /* Split at first '(' and last ')' to get process name. */
    open_paren = strchr(buf, '(');
    close_paren = strrchr(buf, ')');
    if (!open_paren || !close_paren) return 0;

    *open_paren = *close_paren = '\0';
    strncpy(proc->tname, open_paren + 1, THREAD_NAME_LEN);
    proc->tname[THREAD_NAME_LEN-1] = 0;

    /* Scan rest of string. */
    sscanf(close_paren + 1,
     			 /* stat,ppid,pgrp,sid,tty_nr,tty_pgrp,flags,min_flt,cmin_flt,maj_flt,cmaj_flt */
    			 " %c %d %*d %*d %*d %*d %*d %*d %*d %*d %*d "
    			 /* utime,stime,cutime,cstime,prio,nice,nth,_,start_time,vsize,rss */
                 "%lu %lu %*d %*d %d %d %*d %*d %*d %lu %ld "
                 "%*d %*d %*d %*d %*d %*d %*d %*d %*d %*d %*d %*d %*d %*d %d",
                 &proc->state, &proc->ppid,
                 &proc->utime, &proc->stime, &proc->prio, &proc->nice, &proc->vss, &proc->rss,
                 &proc->prs);

    return 1;
}

int read_cmdline(char *filename, struct proc_info *proc) {
    FILE *file;
    char line[MAX_LINE];

    line[0] = '\0';
    file = fopen(filename, "r");

    if (!file) return 0;

    fgets(line, MAX_LINE, file);
    fclose(file);

    if (strlen(line) > 0) {
        strncpy(proc->cmdline, line, PROC_CMDLINE_LEN);
        proc->name[PROC_CMDLINE_LEN-1] = 0;
    } else
        proc->name[0] = 0;

    return 1;
}

int read_status(char *filename, struct proc_info *proc) {
    FILE *file;
    char line[MAX_LINE];
    unsigned int uid, gid;

    file = fopen(filename, "r");
    if (!file) return 0;
    while (fgets(line, MAX_LINE, file)) {
        sscanf(line, "Uid: %u", &uid);
        sscanf(line, "Gid: %u", &gid);
    }
    fclose(file);
    proc->uid = uid; proc->gid = gid;

    return 1;
}

/**
 * Returns 1 on success, 0 otherwise. *err is set to an error string when return is 0.
 */
int read_procs(const char **err) {
    DIR *proc_dir, *task_dir;
    struct dirent *pid_dir, *tid_dir;
    char filename[64];
    FILE *file;
    int proc_num;
    struct proc_info *proc;
    pid_t pid, tid;
    int i;

    proc_dir = opendir("/proc");
    if (!proc_dir) {
        *err = "Failed to open proc directory";
    	return 0;
    }

    procs = (struct proc_info **)calloc(INIT_PROCS * (threads ? THREAD_MULT : 1), sizeof(struct proc_info *));
    num_procs = INIT_PROCS * (threads ? THREAD_MULT : 1);

    file = fopen("/proc/stat", "r");

    if (!file) {
        *err = "Failed to open process stat file";
        return 0;
    }

    fscanf(file, "cpu  %lu %lu %lu %lu %lu %lu %lu", &cpu.utime, &cpu.ntime, &cpu.stime,
           &cpu.itime, &cpu.iowtime, &cpu.irqtime, &cpu.sirqtime);
    fclose(file);

    proc_num = 0;
    while ((pid_dir = readdir(proc_dir))) {
        if (!isdigit(pid_dir->d_name[0]))
            continue;

        pid = atoi(pid_dir->d_name);

        struct proc_info cur_proc;

        if (!threads) {
            proc = alloc_proc();
            if (!proc) return 0;

            proc->pid = proc->tid = pid;

            sprintf(filename, "/proc/%d/stat", pid);
            if (!read_stat(filename, proc)) {
				*err = "Failed to read process stat file";
            	return 0;
           	}

            sprintf(filename, "/proc/%d/cmdline", pid);
            if (!read_cmdline(filename, proc)) {
            	*err = "Failed to read process command line";
            	return 0;
           	}

            sprintf(filename, "/proc/%d/status", pid);
            if (!read_status(filename, proc)) {
            	*err = "Failed to read process status file";
            	return 0;
            }

            proc->num_threads = 0;
        } else {
            sprintf(filename, "/proc/%d/cmdline", pid);
            if (!read_cmdline(filename, &cur_proc)) {
            	*err = "Failed to read process command line";
            	return 0;
            }

            sprintf(filename, "/proc/%d/status", pid);
            if (!read_status(filename, &cur_proc)) {
            	*err = "Failed to read process status file";
            	return 0;
            }

            proc = NULL;
        }

        sprintf(filename, "/proc/%d/task", pid);
        task_dir = opendir(filename);
        if (!task_dir) continue;

        while ((tid_dir = readdir(task_dir))) {
            if (!isdigit(tid_dir->d_name[0]))
                continue;

            if (threads) {
                tid = atoi(tid_dir->d_name);

                proc = alloc_proc();

                proc->pid = pid; proc->tid = tid;

                sprintf(filename, "/proc/%d/task/%d/stat", pid, tid);
                if (!read_stat(filename, proc)) {
                	*err = "Failed to read process stat file";
                	return 0;
                }

                strcpy(proc->name, cur_proc.name);
                proc->uid = cur_proc.uid;
                proc->gid = cur_proc.gid;

                add_proc(proc_num++, proc);
            } else {
                proc->num_threads++;
            }
        }

        closedir(task_dir);

        if (!threads) {
            if (!add_proc(proc_num++, proc)) {
                *err = "Failed to add process data";
                return 0;
            }
        }
    }

    for (i = proc_num; i < num_procs; i++)
        procs[i] = NULL;

    closedir(proc_dir);

    return 1;
}