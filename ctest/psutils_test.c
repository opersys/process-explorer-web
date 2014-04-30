/*
 * Copyright (C) 2014 Opersys inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
