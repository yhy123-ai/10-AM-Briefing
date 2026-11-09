$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
python -X utf8 scripts/credentials.py mail
if ($LASTEXITCODE -ne 0) { throw '邮箱配置没有完成。' }
Write-Host '授权码已在本机加密保存。请回到 Codex 告知已填写，再发送测试邮件。'
Read-Host '按回车关闭窗口'
