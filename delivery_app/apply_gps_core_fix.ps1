$ErrorActionPreference = "Stop"

$file = ".\lib\main.dart"
$backup = ".\lib\main.dart.backup-gps-20260909"

# Start from known-clean backup
Copy-Item $backup $file -Force

$lines = [System.Collections.Generic.List[string]](Get-Content $file)

# Safety
if (-not $lines[0].Trim().StartsWith("import ")) {
    throw "SAFETY STOP: main.dart is not clean."
}

# ------------------------------------------------------------
# 1. activeOrderId
# ------------------------------------------------------------
$idx = $lines.IndexOf("  static int partnerId = 0;")
if ($idx -lt 0) {
    throw "partnerId line not found."
}

$lines.Insert($idx + 1, "  static int? activeOrderId;")

# ------------------------------------------------------------
# 2. Set active order after accepting
# ------------------------------------------------------------
$idx = $lines.IndexOf("    await DeliveryService.acceptOrder(widget.orderId);")
if ($idx -lt 0) {
    throw "acceptOrder line not found."
}

$lines.Insert($idx + 1, "    DeliveryService.activeOrderId = widget.orderId;")

# ------------------------------------------------------------
# 3. GPS stream condition
# ------------------------------------------------------------
$idx = $lines.IndexOf("      if (_online && _socket != null && _socket!.connected) {")
if ($idx -lt 0) {
    throw "GPS condition not found."
}

$lines[$idx] = "      if (_online && _socket != null && _socket!.connected && DeliveryService.activeOrderId != null) {"

# ------------------------------------------------------------
# 4. GPS location:update
# ------------------------------------------------------------
$idx = $lines.IndexOf("        _socket!.emit('location:update', {")
if ($idx -lt 0) {
    throw "GPS location:update not found."
}

# Join correct order before every GPS update
$lines.Insert($idx, "        _socket!.emit('delivery:join', {")
$lines.Insert($idx + 1, "          'orderId': DeliveryService.activeOrderId,")
$lines.Insert($idx + 2, "          'deliveryPartnerId': DeliveryService.partnerId,")
$lines.Insert($idx + 3, "        });")

# Find location update again
$idx = $lines.IndexOf("        _socket!.emit('location:update', {")
if ($idx -lt 0) {
    throw "GPS location:update not found after insertion."
}

# Add orderId to location payload
$partnerLine = $idx + 1

if ($lines[$partnerLine].Trim() -ne "'deliveryPartnerId': DeliveryService.partnerId,") {
    throw "Unexpected GPS payload."
}

$lines.Insert($partnerLine + 1, "          'orderId': DeliveryService.activeOrderId,")

# ------------------------------------------------------------
# Validation
# ------------------------------------------------------------
$text = $lines -join "`r`n"

if (-not $text.Contains("static int? activeOrderId;")) {
    throw "VALIDATION FAILED: activeOrderId missing."
}

if (-not $text.Contains("DeliveryService.activeOrderId = widget.orderId;")) {
    throw "VALIDATION FAILED: accept assignment missing."
}

if (-not $text.Contains("'orderId': DeliveryService.activeOrderId,")) {
    throw "VALIDATION FAILED: GPS orderId missing."
}

if (-not $text.Contains("_socket!.emit('delivery:join', {")) {
    throw "VALIDATION FAILED: delivery join missing."
}

# Brace check
$open = ($text.ToCharArray() | Where-Object { $_ -eq "{" }).Count
$close = ($text.ToCharArray() | Where-Object { $_ -eq "}" }).Count

if ($open -ne $close) {
    throw "SAFETY STOP: brace mismatch. Open=$open Close=$close"
}

# Write only after validation
Set-Content $file $text -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " GPS PATCH APPLIED SUCCESSFULLY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

flutter analyze
