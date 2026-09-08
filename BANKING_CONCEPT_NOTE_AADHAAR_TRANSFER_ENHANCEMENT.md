# Concept Note

## Title
Enhancement Proposal: Aadhaar-Based Additional Authentication for High-Value Transfers Above USD 500

## Background
The current Watermelon Banking application supports customer login, balance review, OTP-authorized transfers, and statement generation across web and Android channels. At present, transfer authorization relies on email-based OTP validation before funds are moved. While this is suitable for routine transactions, higher-value transfers require stronger identity assurance to reduce fraud risk, improve auditability, and align with more stringent control expectations for sensitive customer transactions.

## Objective
Introduce an additional authentication step for any customer transfer exceeding USD 500, requiring the customer to complete Aadhaar-based identity verification before the transfer can be approved and executed.

## Business Need
High-value transfers carry higher operational and fraud risk than low-value transactions. The proposed enhancement will strengthen the control framework by adding a second, identity-linked validation layer for transfers above a defined threshold. This will help:

- reduce the risk of unauthorized high-value transfers;
- improve customer identity confidence during sensitive transactions;
- support stronger compliance and audit controls for exceptional payment activity; and
- establish a scalable pattern for future step-up authentication policies.

## Proposed Enhancement
For any transfer request where the transfer amount is greater than USD 500:

1. The customer will continue to initiate the transfer in the existing customer banking application.
2. The application will detect that the entered amount exceeds the threshold.
3. Before the transfer OTP is accepted as final authorization, the application will require Aadhaar authentication.
4. Aadhaar verification must succeed before the transfer can move to final completion.
5. If Aadhaar verification fails, is cancelled, or is incomplete, the transfer must not be processed.

For transfer amounts of USD 500 or below:

- the existing OTP-based flow will continue without Aadhaar authentication.

## In Scope

- threshold-based trigger for transfers above USD 500;
- web banking customer flow updates;
- Android banking customer app flow updates;
- backend decision logic to enforce step-up authentication;
- storage of Aadhaar verification outcome and timestamp for audit/reference;
- user messaging for success, failure, cancellation, and incomplete authentication.

## Out of Scope

- changes to login authentication;
- changes to low-value transfer behavior at or below USD 500;
- integration with banking admin functionality unless specifically required for reporting;
- broader KYC redesign beyond this high-value transfer control.

## Expected User Journey

1. Customer signs in and navigates to the transfer section.
2. Customer selects beneficiary and enters transfer amount.
3. If amount is more than USD 500, the application displays an Aadhaar authentication step.
4. Customer completes Aadhaar verification.
5. On successful Aadhaar verification, the customer proceeds with OTP verification and final transfer submission.
6. The transfer is completed only if all required validations succeed.

## Expected Benefits

- stronger protection for high-value transfers;
- better fraud deterrence;
- clearer audit trail for sensitive transactions;
- improved control maturity across digital banking journeys.

## Key Risks / Considerations

- Aadhaar authentication dependency may introduce user drop-off if the journey is not streamlined;
- external identity verification availability and response time may affect completion rates;
- privacy, consent, and storage controls must be handled carefully if Aadhaar-related data or status is retained;
- threshold rules must be consistently enforced across web, Android, and API layers.

## Success Criteria

The enhancement will be considered successful if:

- all transfers above USD 500 are blocked from completion unless Aadhaar authentication succeeds;
- all transfers at or below USD 500 continue to work without regression;
- both web and Android customer banking channels behave consistently;
- failed or abandoned Aadhaar checks do not result in completed transfers; and
- audit records clearly indicate whether Aadhaar authentication was required and whether it succeeded.

## Recommendation
Proceed with functional design and implementation planning for Aadhaar-based step-up authentication for transfers above USD 500, with design emphasis on minimal customer friction, strong enforcement consistency, and clear auditability.
