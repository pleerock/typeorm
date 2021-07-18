#!/usr/bin/env bash

set -e

child_pid=0
parent_pid=$$

catch_exits() {
    echo "${0}:stopping ${child_pid}"
    kill ${child_pid} &
    wait
    echo "${0}:stopped ${child_pid}"

    echo "${0}:exit"
    exit 0
}
trap catch_exits TERM KILL INT SIGTERM SIGINT SIGKILL

fork() {
    printf "'%s' " "${@}" | xargs -d "\n" -t sh -c
}

if [[ ! "${ENTRYPOINT_SKIP}" ]]; then
for file in `ls -v /docker-entrypoint.d/*.sh`
    do
        echo "${file}:starting"
        fork ${file} &
        child_pid=$!
        echo "${file}:pid ${child_pid}"
        wait ${child_pid}
        echo "${file}:stopped ${child_pid}"
        if [[ "${?}" != "0" ]]; then
            exit 1;
        fi
    done
fi

echo "${0}:starting"
fork "${@}" &
child_pid=$!
echo "${0}:pid ${child_pid}"
wait ${child_pid}
echo "${0}:stopped ${child_pid}"
