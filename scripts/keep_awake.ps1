# keep_awake.ps1 -ParentPid <pid> -StateFile <path> — KEEP THE PC AWAKE WHILE THE APP RUNS (2026-10-20, Ashraf: "Yes, add a keep-awake request to the app").
# Measured 2026-10-20 (Windows System log, MASTER §7 (dp)): the PC slept 10-19 21:04 -> 21:59 UTC and 10-20 07:13 -> 07:22 UTC (London session);
# the app stopped, a pre-open check was missed, two refreshes were killed. This holds the standard Windows power REQUEST
# SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED) — the call media players use: the idle sleep / idle hibernate timers cannot fire while it
# is held. It changes NO setting; the request ends with this process. It does NOT block a sleep someone asks for (Start > Sleep, lid, power button).
# The display may still turn off (ES_DISPLAY_REQUIRED not set). Exits when the parent (run_twin) is gone. Every 60 s it re-asserts the request and
# writes StateFile {at, pid, parent, ok} — the data health watcher warns (KEEP_AWAKE_OFF) when that file goes stale while the app runs.
param([Parameter(Mandatory = $true)][int]$ParentPid, [Parameter(Mandatory = $true)][string]$StateFile)
$ErrorActionPreference = 'Stop'
Add-Type -Namespace TwinTurbo -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
$ES_CONTINUOUS = [uint32]2147483648; $ES_SYSTEM_REQUIRED = [uint32]1
while ($true) {
  if (-not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) { break }
  $prev = [TwinTurbo.Power]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED)
  $state = @{ at = (Get-Date).ToUniversalTime().ToString('o'); pid = $PID; parent = $ParentPid; ok = ($prev -ne 0); request = 'ES_CONTINUOUS|ES_SYSTEM_REQUIRED' } | ConvertTo-Json -Compress
  $tmp = "$StateFile.tmp"; [System.IO.File]::WriteAllText($tmp, $state); Move-Item -Force -LiteralPath $tmp -Destination $StateFile
  Start-Sleep -Seconds 60
}
[void][TwinTurbo.Power]::SetThreadExecutionState($ES_CONTINUOUS)   # release (also released automatically when the process ends)
