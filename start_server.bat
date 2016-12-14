@echo off
echo. > .restart
:loop
if exist ".restart" (
	del ".restart"
	node index.js
	goto loop
)
