#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include "psutils.h"

int main() {
    int i = 0;
    const char *err;

    while (1) {
        if (!mem_info(&err))
            fprintf(stderr, "Mem info failed: %s\n", err);

        if (!cpu_info(&err))
            fprintf(stderr, "CPU info failed: %s\n", err);

        if (!read_procs(&err))
            fprintf(stderr, "Process info failed: %s\n", err);

        printf("%d\n", i++);

        usleep(50000);
    }
}
