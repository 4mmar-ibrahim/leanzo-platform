# Cleanzo Booking Form & Modal Invariants

Whenever implementing or modifying booking wizards, bottom sheets, or modals in the Cleanzo platform:

1. **Strict Egyptian Phone Handling**:
   - Always sanitize and normalize input on typing and blur using `normalizePhoneInput(val)` from `@/lib/validation/phoneValidation`.
   - Validate strictly using `validateEgyptianPhone(val)` with visual inline error messages and touched states (`phoneError`, `phoneTouched`).

2. **Modal Reset & State Stability Guard**:
   - Never reset component form state indiscriminately when background store dependencies (such as `categories`, `services`, or `user`) re-fetch or re-render.
   - Guard form initialization and pre-filling to occur strictly on false-to-true transitions of `isOpen` using `prevIsOpenRef.current`.

3. **Comprehensive Pricing Display**:
   - Always display `quickPricing.finalPrice` (including packages, add-ons, and discounts) across all steps, bottom footer summary bars, and final order confirmation receipts, rather than static `service.price`.

4. **Step Progression Guard**:
   - Disable next/continue buttons when mandatory choices (e.g., date, available time slot, valid phone, customer name) are missing.
