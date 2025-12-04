#!/usr/bin/env powershell

# Order API Testing Script
# Tests all order endpoints

$BASE_URL = "http://localhost:3000/api"
$HEADERS = @{
    "Content-Type" = "application/json"
}

# Color output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Header { Write-Host "`n=== $args ===" -ForegroundColor Yellow }

Write-Header "ORDER API TEST SUITE"

# Test 1: Register a user and get auth token
Write-Header "Step 1: Register User"
$registerBody = @{
    email = "testorder@example.com"
    password = "Test@123456"
    name = "Test Order User"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -Headers $HEADERS -Body $registerBody
    Write-Success "✓ User registered successfully"
    $userId = $registerResponse.data.id
    Write-Info "User ID: $userId"
} catch {
    Write-Error "✗ Registration failed: $($_.Exception.Message)"
    exit 1
}

# Test 2: Login to get access token
Write-Header "Step 2: Login User"
$loginBody = @{
    email = "testorder@example.com"
    password = "Test@123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -Headers $HEADERS -Body $loginBody
    Write-Success "✓ Login successful"
    $accessToken = $loginResponse.data.accessToken
    Write-Info "Access Token: $($accessToken.Substring(0, 20))..."
    
    $HEADERS["Authorization"] = "Bearer $accessToken"
} catch {
    Write-Error "✗ Login failed: $($_.Exception.Message)"
    exit 1
}

# Test 3: Create a shipping address
Write-Header "Step 3: Create Shipping Address"
$addressBody = @{
    fullName = "John Doe"
    phoneNumber = "+923001234567"
    line1 = "123 Main Street"
    line2 = "Apt 4B"
    city = "Karachi"
    state = "Sindh"
    postalCode = "75000"
    country = "Pakistan"
    notes = "Leave at door"
} | ConvertTo-Json

try {
    $addressResponse = Invoke-RestMethod -Uri "$BASE_URL/users/addresses" -Method Post -Headers $HEADERS -Body $addressBody
    Write-Success "✓ Shipping address created"
    $shippingAddressId = $addressResponse.data.id
    Write-Info "Address ID: $shippingAddressId"
} catch {
    Write-Error "✗ Address creation failed: $($_.Exception.Message)"
    exit 1
}

# Test 4: Get existing products for order
Write-Header "Step 4: Get Products for Order"
try {
    $productsResponse = Invoke-RestMethod -Uri "$BASE_URL/vendor/shops" -Method Get -Headers $HEADERS
    Write-Success "✓ Retrieved shop info"
    Write-Info "Response: $($productsResponse | ConvertTo-Json -Depth 2)"
} catch {
    Write-Error "✗ Failed to get products: $($_.Exception.Message)"
    # Continue with test data
}

# For now, let's use sample IDs (you would need to create these first)
Write-Info "Note: Using sample product IDs. For complete testing, ensure products exist in database."

# Test 5: Create Order (Main Test)
Write-Header "Step 5: Create Order"
$orderBody = @{
    items = @(
        @{
            productId = "550e8400-e29b-41d4-a716-446655440001"
            quantity = 2
        }
    )
    shippingAddressId = $shippingAddressId
    paymentMethod = "COD"
    notes = "Please handle with care"
} | ConvertTo-Json

try {
    $createOrderResponse = Invoke-RestMethod -Uri "$BASE_URL/orders" -Method Post -Headers $HEADERS -Body $orderBody
    if ($createOrderResponse.success) {
        Write-Success "✓ Order created successfully"
        $orderId = $createOrderResponse.data.id
        $orderNumber = $createOrderResponse.data.orderNumber
        Write-Info "Order ID: $orderId"
        Write-Info "Order Number: $orderNumber"
        Write-Info "Order Status: $($createOrderResponse.data.status)"
        Write-Info "Total Amount: $($createOrderResponse.data.totalAmount)"
    } else {
        Write-Error "✗ Order creation failed: $($createOrderResponse.error)"
    }
} catch {
    $errorMsg = $_.Exception.Response.Content | ConvertFrom-Json
    Write-Error "✗ Create order failed: $($errorMsg.error)"
    Write-Info "Note: This is expected if sample product ID doesn't exist"
    exit 1
}

# Test 6: Get Order Details
Write-Header "Step 6: Get Order Details"
try {
    $getOrderResponse = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId" -Method Get -Headers $HEADERS
    if ($getOrderResponse.success) {
        Write-Success "✓ Order details retrieved"
        Write-Info "Order Number: $($getOrderResponse.data.orderNumber)"
        Write-Info "Status: $($getOrderResponse.data.status)"
        Write-Info "Total: $($getOrderResponse.data.totalAmount)"
        Write-Info "Items Count: $($getOrderResponse.data.items.Count)"
    } else {
        Write-Error "✗ Failed to get order: $($getOrderResponse.error)"
    }
} catch {
    Write-Error "✗ Get order failed: $($_.Exception.Message)"
}

# Test 7: List User Orders
Write-Header "Step 7: List User Orders"
try {
    $listOrdersResponse = Invoke-RestMethod -Uri "$BASE_URL/orders?page=1&limit=10" -Method Get -Headers $HEADERS
    if ($listOrdersResponse.success) {
        Write-Success "✓ Orders list retrieved"
        Write-Info "Total Orders: $($listOrdersResponse.data.total)"
        Write-Info "Page: $($listOrdersResponse.data.page)"
        Write-Info "Limit: $($listOrdersResponse.data.limit)"
        Write-Info "Total Pages: $($listOrdersResponse.data.totalPages)"
        Write-Info "Orders on page: $($listOrdersResponse.data.orders.Count)"
    } else {
        Write-Error "✗ Failed to list orders: $($listOrdersResponse.error)"
    }
} catch {
    Write-Error "✗ List orders failed: $($_.Exception.Message)"
}

# Test 8: Update Order Status
Write-Header "Step 8: Update Order Status"
$updateStatusBody = @{
    status = "CONFIRMED"
} | ConvertTo-Json

try {
    $updateStatusResponse = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId/status" -Method Patch -Headers $HEADERS -Body $updateStatusBody
    if ($updateStatusResponse.success) {
        Write-Success "✓ Order status updated"
        Write-Info "New Status: $($updateStatusResponse.data.status)"
    } else {
        Write-Error "✗ Failed to update status: $($updateStatusResponse.error)"
    }
} catch {
    Write-Error "✗ Update status failed: $($_.Exception.Message)"
}

# Test 9: Update Payment Status
Write-Header "Step 9: Update Payment Status"
$updatePaymentBody = @{
    paymentStatus = "PAID"
    paymentMethod = "CARD"
} | ConvertTo-Json

try {
    $updatePaymentResponse = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId/payment" -Method Patch -Headers $HEADERS -Body $updatePaymentBody
    if ($updatePaymentResponse.success) {
        Write-Success "✓ Payment status updated"
        Write-Info "Payment Status: $($updatePaymentResponse.data.paymentStatus)"
        Write-Info "Payment Method: $($updatePaymentResponse.data.paymentMethod)"
    } else {
        Write-Error "✗ Failed to update payment: $($updatePaymentResponse.error)"
    }
} catch {
    Write-Error "✗ Update payment failed: $($_.Exception.Message)"
}

# Test 10: Filter Orders by Status
Write-Header "Step 10: Filter Orders by Status"
try {
    $filterOrdersResponse = Invoke-RestMethod -Uri "$BASE_URL/orders?status=CONFIRMED&paymentStatus=PAID" -Method Get -Headers $HEADERS
    if ($filterOrdersResponse.success) {
        Write-Success "✓ Filtered orders retrieved"
        Write-Info "Filtered Orders: $($filterOrdersResponse.data.orders.Count)"
    } else {
        Write-Error "✗ Failed to filter orders: $($filterOrdersResponse.error)"
    }
} catch {
    Write-Error "✗ Filter orders failed: $($_.Exception.Message)"
}

# Test 11: Test Cancellation (Create new order first)
Write-Header "Step 11: Cancel Order Test"
$newOrderBody = @{
    items = @(
        @{
            productId = "550e8400-e29b-41d4-a716-446655440002"
            quantity = 1
        }
    )
    shippingAddressId = $shippingAddressId
    paymentMethod = "COD"
} | ConvertTo-Json

try {
    $createOrderResponse2 = Invoke-RestMethod -Uri "$BASE_URL/orders" -Method Post -Headers $HEADERS -Body $newOrderBody
    if ($createOrderResponse2.success) {
        $orderId2 = $createOrderResponse2.data.id
        Write-Info "Test order created: $orderId2"
        
        # Now cancel it
        $cancelResponse = Invoke-RestMethod -Uri "$BASE_URL/orders/$orderId2/cancel" -Method Post -Headers $HEADERS
        if ($cancelResponse.success) {
            Write-Success "✓ Order cancelled successfully"
            Write-Info "New Status: $($cancelResponse.data.status)"
        } else {
            Write-Error "✗ Failed to cancel order: $($cancelResponse.error)"
        }
    }
} catch {
    Write-Error "✗ Cancellation test failed: $($_.Exception.Message)"
}

Write-Header "TEST SUITE COMPLETED"
Write-Success "✓ All available tests completed"
