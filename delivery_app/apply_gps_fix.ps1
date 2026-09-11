$ErrorActionPreference = "Stop"

$file = ".\lib\main.dart"
$backup = ".\lib\main.dart.backup-gps-20260909"

# Restore known-clean source first
Copy-Item $backup $file -Force

$lines = [System.Collections.Generic.List[string]](Get-Content $file)

if (-not $lines[0].Trim().StartsWith("import ")) {
    throw "SAFETY STOP: main.dart is not clean."
}

# 1. activeOrderId
$idx = $lines.IndexOf("  static int partnerId = 0;")
if ($idx -lt 0) { throw "partnerId line not found." }
$lines.Insert($idx + 1, "  static int? activeOrderId;")

# 2. Set active order after successful accept
$idx = $lines.IndexOf("    await DeliveryService.acceptOrder(widget.orderId);")
if ($idx -lt 0) { throw "acceptOrder line not found." }
$lines.Insert($idx + 1, "    DeliveryService.activeOrderId = widget.orderId;")

# 3. GPS stream condition
$idx = $lines.IndexOf("      if (_online && _socket != null && _socket!.connected) {")
if ($idx -lt 0) { throw "GPS stream condition not found." }

$lines[$idx] = "      if (_online && _socket != null && _socket!.connected && DeliveryService.activeOrderId != null) {"

# 4. Find GPS location update
$idx = $lines.IndexOf("        _socket!.emit('location:update', {")
if ($idx -lt 0) { throw "GPS location update not found." }

# Join order immediately before location update
$lines.Insert($idx, "        _socket!.emit('delivery:join', {")
$lines.Insert($idx + 1, "          'orderId': DeliveryService.activeOrderId,")
$lines.Insert($idx + 2, "          'deliveryPartnerId': DeliveryService.partnerId,")
$lines.Insert($idx + 3, "        });")

# Add orderId to location payload
$idx = $lines.IndexOf("        _socket!.emit('location:update', {")
if ($idx -lt 0) { throw "GPS location update disappeared." }

$partnerLine = $idx + 1
if ($lines[$partnerLine].Trim() -ne "'deliveryPartnerId': DeliveryService.partnerId,") {
    throw "Unexpected GPS payload structure."
}

$lines.Insert($partnerLine + 1, "          'orderId': DeliveryService.activeOrderId,")

# 5. Online toggle
$idx = $lines.IndexOf("    if (value && _position != null) {")
if ($idx -lt 0) { throw "Online toggle block not found." }

$lines[$idx] = "    if (value && _position != null && DeliveryService.activeOrderId != null) {"

# Add orderId to toggle location payload
$locIdx = -1
for ($i = $idx; $i -lt [Math]::Min($idx + 20, $lines.Count); $i++) {
    if ($lines[$i].Trim() -eq "_socket!.emit('location:update', {") {
        $locIdx = $i
        break
    }
}

if ($locIdx -ge 0) {
    $partnerLine = $locIdx + 1
    if ($lines[$partnerLine].Trim() -eq "'deliveryPartnerId': DeliveryService.partnerId,") {
        $lines.Insert($partnerLine + 1, "          'orderId': DeliveryService.activeOrderId,")
    }
}

# Final validation
$text = $lines -join "`r`n"

$required = @(
    "static int? activeOrderId;",
    "DeliveryService.activeOrderId = widget.orderId;",
    "'orderId': DeliveryService.activeOrderId,",
    "_socket!.emit('delivery:join', {"
)

foreach ($item in $required) {
    if (-not $text.Contains($item)) {
        throw "VALIDATION FAILED: $item"
    }
}

$open = ($text.ToCharArray() | Where-Object { $_ -eq "{" }).Count
$close = ($text.ToCharArray() | Where-Object { $_ -eq "}" }).Count

if ($open -ne $close) {
    throw "SAFETY STOP: brace mismatch. Open=$open Close=$close"
}

Set-Content $file $text -Encoding UTF8

Write-Host ""
Write-Host "GPS PATCH APPLIED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "=== FLUTTER ANALYZE ===" -ForegroundColor Cyan
flutter analyze
