#!/bin/bash

output=$(clang-format -i -style='{Language: JavaScript, BasedOnStyle: Google, ColumnLimit: 80}' -output-replacements-xml src/*.ts test/*.ts)

if [[ ${output} =~ "<replacement offset" ]] ; then
  echo "Format errors found. Run 'npm run format' to fix."
  exit 1
fi
