' watchdog_launch.vbs — run the twin's watchdog with NO console window (Task Scheduler, every 5 min and at logon).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\01Ferrari Twin Turbo"
sh.Run """C:\Program Files\nodejs\node.exe"" ops\watchdog_twin.mjs", 0, False
