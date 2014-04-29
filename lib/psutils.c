/*
 * Copyright (c) 2008, The Android Open Source Project
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *  * Neither the name of Google, Inc. nor the names of its contributors
 *    may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
 * OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/* This files is based on the content of system/core/toolbox/top.c of
   the Android Open Source Project with some modifications. */

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

void release_proc(struct proc_info *proc) {
    proc->next = free_procs;
    free_procs = proc;
}

struct proc_info *alloc_proc(void) {
    struct proc_info *proc;

    if (free_procs != NULL) {
        proc = free_procs;
        free_procs = free_procs->next;
    }
    else
        proc = malloc(sizeof(struct proc_info));

    return proc;
}

int add_proc(int proc_num, struct proc_info *proc) {
    int i, n;
    size_t sz;

    if (proc_num >= num_alloc_procs) {        
        // Double the size of the process structure array.
        n = 2 * (num_alloc_procs + 1);
        sz = n * sizeof(struct proc_info *);

        procs = (struct proc_info **)realloc(procs, sz);
        if (!procs) return 0;

        num_alloc_procs = n;

        // Initialize the process structure pointers to null so they
        // can be allocated later.
        for (i = proc_num; i < num_alloc_procs; i++)
            procs[i] = NULL;
    }
    procs[proc_num] = proc;

    return 1;
}

int read_stat(char *filename, struct proc_info *proc) {
    FILE *file;
    char buf[MAX_LINE], *open_paren, *close_paren;

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

int read_mem(char *filename, struct proc_info *proc) {
	FILE *file;

	file = fopen(filename, "r");
	if (!file) return 0;

	fscanf(file, "%*d %*d %lu %*d %*d %*d %*d", &proc->shm);
	fclose(file);

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
        proc->cmdline[PROC_CMDLINE_LEN-1] = 0;
    } else
        proc->cmdline[0] = 0;

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

int mem_info(const char **err) {
    FILE *file;
	char line[MAX_LINE];

    file = fopen("/proc/meminfo", "r");
    if (!file) {
    	*err = "Failed to open memory info file";
    	return 0;
    }

	while (fgets(line, sizeof(line), file)) {
		sscanf(line, "MemTotal: %lu kB", &mem.memTotal);
        sscanf(line, "MemFree: %lu kB", &mem.memFree);
        sscanf(line, "Buffers: %lu kB", &mem.buffers);
        sscanf(line, "Cached: %lu kB", &mem.cached);
        sscanf(line, "SwapTotal: %lu kB", &mem.swapTotal);
        sscanf(line, "SwapFree: %lu kB", &mem.swapFree);
	}

	fclose(file);

	return 1;
}

int cpu_info(const char **err) {
    FILE *file;
    int i;

    file = fopen("/proc/stat", "r");

    if (!file) {
        *err = "Failed to open process stat file";
        return 0;
    }

    fscanf(file, "cpu  %lu %lu %lu %lu %lu %lu %lu %lu %lu %lu\n",
		&global_cpu.utime, &global_cpu.ntime, &global_cpu.stime,
        &global_cpu.itime, &global_cpu.iowtime, &global_cpu.irqtime, &global_cpu.sirqtime,
        &global_cpu.stealtime, &global_cpu.guesttime, &global_cpu.guestnicetime);
    global_cpu.no = -1;

	if (!cpu) {
		nb_cpu = sysconf(_SC_NPROCESSORS_ONLN);
		cpu = calloc(nb_cpu, sizeof(struct cpu_info));
		if (!cpu) {
			*err = "Failed to allocate memory";
			return 0;
		}
	}

	for (i = 0; i < nb_cpu; i++) {
		fscanf(file, "cpu%d %lu %lu %lu %lu %lu %lu %lu %lu %lu %lu\n",
				&cpu[i].no,
				&cpu[i].utime, &cpu[i].ntime, &cpu[i].stime,
				&cpu[i].itime, &cpu[i].iowtime, &cpu[i].irqtime, &cpu[i].sirqtime,
				&cpu[i].stealtime, &cpu[i].guesttime, &cpu[i].guestnicetime);
	}

    fclose(file);

    return 1;
}

/**
 * Returns 1 on success, 0 otherwise. *err is set to an error string when return is 0.
 */
int read_procs(const char **err) {
    DIR *proc_dir;
    struct dirent *pid_dir;
    char filename[64];
    int proc_num;
    struct proc_info *proc;
    pid_t pid;
    int i;

    *err = NULL;

    // Release the process structures.
    for (i = 0; i < num_alloc_procs; i++)
        if (procs[i])
            release_proc(procs[i]);

    // Reinitialize the master variables.
    num_procs = 0;
    proc_num = 0;

    // FIXME: We need to fetch the CPU info for between it's used to
    // calculate the process CPU%.
    if (!cpu_info(err)) return 0;

    proc_dir = opendir("/proc");
    if (!proc_dir) {
        *err = "Failed to open proc directory";
    	return 0;
    }

    while ((pid_dir = readdir(proc_dir))) {
        if (!isdigit(pid_dir->d_name[0]))
            continue;

        pid = atoi(pid_dir->d_name);

        proc = alloc_proc();
        if (!proc) {
            *err = "Failed to allocate process structure memory";
            break;
        }

        proc->pid = proc->tid = pid;
        
        sprintf(filename, "/proc/%d/stat", pid);
        if (!read_stat(filename, proc))
            *err = "Failed to read process stat file";
        else {
            sprintf(filename, "/proc/%d/cmdline", pid);
            if (!read_cmdline(filename, proc)) 
                *err = "Failed to read process command line";
            else {        
                sprintf(filename, "/proc/%d/status", pid);
                if (!read_status(filename, proc))
                    *err = "Failed to read process status file";
                else {
                    sprintf(filename, "/proc/%d/statm", pid);
                    if (!read_mem(filename, proc))
                        *err = "Failed to read process memory file";
                }
            }
        }       

        if (*err) {
            release_proc(proc);
            break;
        }                     

        if (!add_proc(proc_num++, proc)) {
            *err = "Failed to add process data";
            break;
        }
    }

    for (i = proc_num; i < num_alloc_procs; i++)
        procs[i] = NULL;

    closedir(proc_dir);
    num_procs = proc_num;

    return *err == NULL;
}
