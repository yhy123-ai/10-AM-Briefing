Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Security
$newsLocal = Join-Path (Split-Path -Parent $PSScriptRoot) '.local'
$form = New-Object System.Windows.Forms.Form
$form.Text = '十点晨报 · 本机邮箱设置'
$form.Size = New-Object System.Drawing.Size(530,300)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.Font = New-Object System.Drawing.Font('Microsoft YaHei',10)
$label = New-Object System.Windows.Forms.Label
$label.Text = "收件与发件邮箱：your-mailbox@qq.com`r`n请填写 QQ 邮箱 SMTP 授权码（不是 QQ 登录密码）。`r`n授权码只在这台电脑加密保存，不会发送到聊天或网站。"
$label.Location = New-Object System.Drawing.Point(24,20)
$label.Size = New-Object System.Drawing.Size(475,85)
$inputBox = New-Object System.Windows.Forms.TextBox
$inputBox.UseSystemPasswordChar = $true
$inputBox.Location = New-Object System.Drawing.Point(24,120)
$inputBox.Size = New-Object System.Drawing.Size(465,30)
$save = New-Object System.Windows.Forms.Button
$save.Text = '加密保存'
$save.Location = New-Object System.Drawing.Point(365,180)
$save.Size = New-Object System.Drawing.Size(124,38)
$save.Add_Click({
  if ([string]::IsNullOrWhiteSpace($inputBox.Text)) { return }
  try {
    New-Item -ItemType Directory -Path $newsLocal -Force | Out-Null
    $newsBytes = [Text.Encoding]::UTF8.GetBytes($inputBox.Text.Trim())
    $newsProtected = [Security.Cryptography.ProtectedData]::Protect($newsBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    [IO.File]::WriteAllText((Join-Path $newsLocal 'qq.dpapi'),[Convert]::ToBase64String($newsProtected))
    [Array]::Clear($newsBytes,0,$newsBytes.Length)
    $inputBox.Clear()
    [Windows.Forms.MessageBox]::Show('已在本机加密保存。请回到 Codex 告知已填写，以便发送并核对测试晨报。','十点晨报') | Out-Null
    $form.Close()
  } catch { [Windows.Forms.MessageBox]::Show('保存失败，请检查本机目录权限。授权码未输出。','十点晨报') | Out-Null }
})
$form.Controls.AddRange(@($label,$inputBox,$save))
$form.AcceptButton = $save
[void]$form.ShowDialog()
