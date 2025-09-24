# Nightscout Configuration Modal Tests

This directory contains comprehensive tests for the Nightscout Configuration Modal's Save button functionality.

## Test Files

### 1. `NightscoutConfigModal.test.tsx`
**Unit tests for the modal component itself**
- ✅ Save button rendering and states
- ✅ Form validation (URL format, required fields)
- ✅ Save button click handling
- ✅ Data formatting (URL cleaning, optional fields)
- ✅ Error handling and display
- ✅ Loading states during save operations
- ✅ Integration with existing configuration
- ✅ Accessibility features
- ✅ Keyboard navigation

### 2. `Dashboard-NightscoutConfig.integration.test.tsx`
**Integration tests for the full Dashboard flow**
- ✅ Modal opening from Dashboard
- ✅ End-to-end save flow
- ✅ Error handling in Dashboard context
- ✅ Existing configuration editing
- ✅ Test connection functionality

### 3. `nightscoutConfigApi.test.ts` (in services/__tests__/)
**Unit tests for the API service**
- ✅ POST /api/nightscout/config endpoint calls
- ✅ Authentication header inclusion
- ✅ Error handling (network, HTTP errors)
- ✅ Response data handling
- ✅ All CRUD operations (save, get, delete, etc.)

## Running the Tests

### Run all Nightscout-related tests:
```bash
npm test -- --testPathPattern="nightscout|Nightscout"
```

### Run specific test files:
```bash
# Modal component tests
npm test NightscoutConfigModal.test.tsx

# Integration tests
npm test Dashboard-NightscoutConfig.integration.test.tsx

# API service tests
npm test nightscoutConfigApi.test.ts
```

### Run tests in watch mode:
```bash
npm test -- --watch --testPathPattern="nightscout|Nightscout"
```

## Test Coverage

The tests cover:

### ✅ **Save Button Functionality**
- Button enabled/disabled states
- Click handling and data submission
- Form validation before save
- URL cleaning and formatting
- Optional field handling

### ✅ **API Integration**
- Correct endpoint calls (`POST /api/nightscout/config`)
- Authentication headers
- Request/response handling
- Error scenarios

### ✅ **User Experience**
- Loading states
- Error messages
- Success flows
- Modal closing after save
- Form population with existing data

### ✅ **Accessibility**
- ARIA labels and roles
- Keyboard navigation
- Screen reader compatibility

### ✅ **Edge Cases**
- Empty configurations
- Invalid URLs
- Network errors
- Authentication failures
- Existing vs new configurations

## Key Test Scenarios

1. **Happy Path**: Fill form → Click Save → API call → Success → Modal closes
2. **Validation**: Invalid URL → Error message → No API call
3. **Network Error**: Valid form → API fails → Error message → Modal stays open
4. **Authentication**: Missing token → Request blocked → Error handling
5. **Existing Config**: Edit existing → Save → Update API call → Success

## Mocking Strategy

- **API calls**: Mocked axios instances and fetch
- **Authentication**: Mocked localStorage and auth service
- **Environment**: Mocked environment configuration
- **Services**: Mocked all dependent services
- **DOM APIs**: Mocked localStorage, matchMedia, IntersectionObserver

## Test Data Examples

```typescript
const validConfig = {
  nightscoutUrl: 'https://test.nightscout.com',
  apiSecret: 'test-secret',
  apiToken: 'test-token',
  isActive: true,
};

const invalidUrls = [
  'invalid-url',
  'ftp://test.com',
  'just-a-string',
];
```

These tests ensure the Save button works correctly and calls `POST /api/nightscout/config` as expected.

