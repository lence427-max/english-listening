Option Explicit

Dim shell, fso, root, nodeExe, command, logFile

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = "D:\node.js\node.exe"
logFile = root & "\silentium-server.log"

If Not fso.FileExists(nodeExe) Then
  MsgBox "Node.js not found: " & nodeExe, vbCritical, "Silentium"
  WScript.Quit 1
End If

command = "cmd.exe /d /c cd /d """ & root & """ && """ & nodeExe & _
  """ scripts\serve-local.mjs > """ & logFile & """ 2>&1"

shell.Run command, 0, False
WScript.Sleep 1200
shell.Run "http://127.0.0.1:3456/", 1, False

MsgBox "Silentium server started." & vbCrLf & _
  "Address: http://127.0.0.1:3456/" & vbCrLf & _
  "Log: " & logFile, vbInformation, "Silentium"
