#!/bin/sh

# get path of script
pushd `dirname $0` > /dev/null
SCRIPTPATH=`pwd -P`
popd > /dev/null

# open terminal windows and run scripts
osascript &>/dev/null <<EOF
  tell application "iTerm"
    make new terminal
    tell the current terminal
      activate current session
      launch session "Default Session"
      tell the last session
        write text "${SCRIPTPATH}/mongo.sh"
      end tell
    end tell

    make new terminal
    tell the current terminal
      activate current session
      launch session "Default Session"
      tell the last session
        write text "${SCRIPTPATH}/redis.sh"
      end tell
    end tell
  end tell
EOF
