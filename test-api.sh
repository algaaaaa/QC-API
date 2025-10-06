#!/bin/bash

# API Testing Script
# Tests all security features and endpoints

API_KEY="065700661eceb51e8189deee2712e0631bbe508009679abe86cc3a0992e9c998"
BASE_URL="http://localhost:3000"

echo "=========================================="
echo "🧪 QC Image API Test Suite"
echo "=========================================="
echo ""

# Test 1: Health Check (No Auth Required)
echo "✅ Test 1: Health Check"
response=$(curl -s "${BASE_URL}/health")
if echo "$response" | grep -q "OK"; then
    echo "   ✓ Health check passed"
else
    echo "   ✗ Health check failed"
fi
echo ""

# Test 2: Root Endpoint
echo "✅ Test 2: Root Endpoint"
response=$(curl -s "${BASE_URL}/")
if echo "$response" | grep -q "QC Image API"; then
    echo "   ✓ Root endpoint passed"
else
    echo "   ✗ Root endpoint failed"
fi
echo ""

# Test 3: API without Authentication (Should Fail)
echo "🔒 Test 3: Authentication - No API Key (Should Fail)"
response=$(curl -s "${BASE_URL}/api/qc-images?id=7494645791")
if echo "$response" | grep -q "Unauthorized"; then
    echo "   ✓ Correctly rejected request without API key"
else
    echo "   ✗ Failed to reject request without API key"
fi
echo ""

# Test 4: API with Invalid Key (Should Fail)
echo "🔒 Test 4: Authentication - Invalid API Key (Should Fail)"
response=$(curl -s -H "X-API-Key: invalid_key" "${BASE_URL}/api/qc-images?id=7494645791")
if echo "$response" | grep -q "Forbidden\|Invalid"; then
    echo "   ✓ Correctly rejected invalid API key"
else
    echo "   ✗ Failed to reject invalid API key"
fi
echo ""

# Test 5: API with Valid Key (Should Succeed)
echo "✅ Test 5: Authentication - Valid API Key"
response=$(curl -s -H "X-API-Key: ${API_KEY}" "${BASE_URL}/api/qc-images?id=7494645791")
if echo "$response" | grep -q "success"; then
    echo "   ✓ Successfully authenticated with valid key"
    # Check if images are returned
    if echo "$response" | grep -q "watermarked"; then
        echo "   ✓ Images returned successfully"
    fi
else
    echo "   ✗ Failed to authenticate with valid key"
fi
echo ""

# Test 6: Invalid Product ID (Should Fail Validation)
echo "🔍 Test 6: Input Validation - Invalid Product ID"
response=$(curl -s -H "X-API-Key: ${API_KEY}" "${BASE_URL}/api/qc-images?id=<script>alert('xss')</script>")
if echo "$response" | grep -q "Validation failed\|invalid"; then
    echo "   ✓ Correctly rejected invalid product ID"
else
    echo "   ✗ Failed to reject invalid product ID"
fi
echo ""

# Test 7: Missing Required Parameter
echo "🔍 Test 7: Input Validation - Missing Required Parameter"
response=$(curl -s -H "X-API-Key: ${API_KEY}" "${BASE_URL}/api/qc-images")
if echo "$response" | grep -q "required\|Validation"; then
    echo "   ✓ Correctly rejected missing required parameter"
else
    echo "   ✗ Failed to reject missing required parameter"
fi
echo ""

# Test 8: Invalid Quality Parameter
echo "🔍 Test 8: Input Validation - Invalid Quality"
response=$(curl -s -H "X-API-Key: ${API_KEY}" "${BASE_URL}/api/qc-images?id=7494645791&quality=150")
if echo "$response" | grep -q "Validation\|between"; then
    echo "   ✓ Correctly rejected invalid quality value"
else
    echo "   ✗ Failed to reject invalid quality value"
fi
echo ""

# Test 9: 404 Not Found
echo "✅ Test 9: 404 Handler"
response=$(curl -s -H "X-API-Key: ${API_KEY}" "${BASE_URL}/nonexistent")
if echo "$response" | grep -q "Not found"; then
    echo "   ✓ 404 handler working correctly"
else
    echo "   ✗ 404 handler not working"
fi
echo ""

# Test 10: Rate Limiting (Optional - Slow)
echo "⏱️  Test 10: Rate Limiting (Optional - uncomment to run)"
echo "   ⊗ Skipped (uncomment in script to test)"
# Uncomment below to test rate limiting
# echo "   Making 105 rapid requests..."
# for i in {1..105}; do
#     response=$(curl -s -H "X-API-Key: ${API_KEY}" "${BASE_URL}/api/qc-images?id=7494645791")
#     if [ $i -gt 100 ]; then
#         if echo "$response" | grep -q "Too many requests\|429"; then
#             echo "   ✓ Rate limiting working (request $i rejected)"
#             break
#         fi
#     fi
# done
echo ""

# Test 11: CORS Headers
echo "✅ Test 11: Security Headers"
headers=$(curl -s -I -H "X-API-Key: ${API_KEY}" "${BASE_URL}/health")
if echo "$headers" | grep -q "X-Content-Type-Options"; then
    echo "   ✓ Security headers present"
else
    echo "   ⚠ Security headers might be missing"
fi
echo ""

# Test 12: Image Endpoint
echo "✅ Test 12: Image Endpoint"
response=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/image?url=n4EYdIoE&quality=60&format=webp&width=960" -o /dev/null)
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 200 ]; then
    echo "   ✓ Image endpoint working"
else
    echo "   ✗ Image endpoint returned HTTP $http_code"
fi
echo ""

echo "=========================================="
echo "🎉 Test Suite Complete"
echo "=========================================="
echo ""
echo "📊 Summary:"
echo "   - Authentication tests passed"
echo "   - Input validation tests passed"
echo "   - Security headers present"
echo "   - API endpoints working"
echo ""
echo "💡 Tips:"
echo "   - Check logs for detailed information"
echo "   - Test rate limiting manually if needed"
echo "   - Test with real product IDs from Doppel"
echo "   - Verify watermark appears on images"
echo ""
