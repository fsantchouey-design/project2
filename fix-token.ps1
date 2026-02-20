$envContent = Get-Content .env -Raw
$completeToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiZnNhbnRjaG91ZXkiLCJlbWFpbCI6ImZzYW50Y2hvdWV5QGdtYWlsLmNvbSJ9.zdtTelcJVURpBJJWfe0Ce7GYd-1d5a2FoInkcZH91nI"
$envContent = $envContent -replace "HOMEDESIGNS_API_TOKEN=.*", "HOMEDESIGNS_API_TOKEN=$completeToken"
$envContent | Set-Content .env -NoNewline
Write-Host "Complete API token updated successfully!"
Write-Host "Token: $($completeToken.Substring(0, 30))..."


