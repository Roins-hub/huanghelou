param(
  [Parameter(Mandatory=$true)]
  [string]$SourceDir,

  [Parameter(Mandatory=$true)]
  [string]$ServerUrl,

  [Parameter(Mandatory=$true)]
  [string]$Token,

  [string]$TaskName = "ConversationArchiveSync",
  [string]$ProjectDir = "D:\3Dmoxing"
)

$python = (Get-Command python).Source
$pythonw = Join-Path (Split-Path $python -Parent) "pythonw.exe"
if (Test-Path $pythonw) {
  $python = $pythonw
}
$action = New-ScheduledTaskAction `
  -Execute $python `
  -Argument "-B -m conversation_archive.client --source `"$SourceDir`" --server `"$ServerUrl`" --token `"$Token`"" `
  -WorkingDirectory $ProjectDir

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes 1)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Sync conversation files to the archive server." `
  -Force

Write-Host "Created scheduled task: $TaskName"
