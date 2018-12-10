#!/bin/bash

output=$(prettier --list-different src/*.ts test/*.ts)
len=${#output}
if [[ ${len} != 0 ]] ; then
  echo "Format errors found. Run 'npm run format' to fix."
  exit 1
fi
