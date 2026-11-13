# au-compliance-kit API

Australian pay and tax calculations from the ATO's published formulas. Every example below shows the real output of the code.

```
npm install au-compliance-kit
```

The package is ESM only and has no dependencies. Inputs are in dollars. `estimateAnnualTax` and the `*Cents` helpers return cents so results stay exact.

- [PAYG withholding for one pay](#payg-withholding-for-one-pay): `calculateWithholding`
- [Tax withheld from a bonus](#tax-withheld-from-a-bonus): `calculateBonusWithholding`
- [Tax for the year and the refund](#tax-for-the-year-and-the-refund): `estimateAnnualTax`
- [Single-figure helpers](#single-figure-helpers): income tax, offsets, Medicare levy, surcharge, HELP
- [Super guarantee and packages](#super-guarantee-and-packages)
- [Overtime](#overtime)
- [ABN, ACN, TFN, BSB and account numbers](#abn-acn-tfn-bsb-and-account-numbers)
- [MCP server and tools for AI agents](#mcp-server-and-tools-for-ai-agents)
- [Errors](#errors)

## PAYG withholding for one pay

`calculateWithholding(input)` returns the amount an employer must withhold from one pay, using ATO Schedule 1 (NAT 1004) and, where they apply, Schedule 8 (study loans) and Schedule 9 (seniors and pensioners). Results are whole dollars, rounded the ATO's way, and match every row of the ATO's published sample data for 2025–26 and 2026–27.

```js
import { calculateWithholding } from "au-compliance-kit";

calculateWithholding({ earnings: 2026.77, period: "fortnightly", payDate: "2026-11-13" });
// {
//   withholding: 284,
//   scale: 2,
//   taxYear: "2026-27",
//   breakdown: { scaleAmount: 284, taxOffset: 0, medicareAdjustment: 0, studyLoanComponent: 0 },
//   source: "ATO LI 2026/18, Schedule 1 (NAT 1004), payments made on or after 1 July 2026"
// }
```

Input fields:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `earnings` | number | required | Gross earnings for the pay period in dollars, including taxable allowances and overtime |
| `period` | `"weekly"` \| `"fortnightly"` \| `"monthly"` \| `"quarterly"` | required | Pay period |
| `payDate` | `"YYYY-MM-DD"` | | Picks the financial year's tables. Throws outside 1 July 2025 – 30 June 2027 |
| `taxYear` | `"2025-26"` \| `"2026-27"` | `"2026-27"` | Tables to use when there's no `payDate` |
| `taxFreeThreshold` | boolean | `true` | Tax-free threshold claimed with this employer. `false` for a second job |
| `tfnProvided` | boolean | `true` | `false` applies the no-TFN rate (scale 4) |
| `foreignResident` | boolean | `false` | Foreign resident for tax |
| `studyLoan` | boolean | `false` | HELP, VSL, SSL or other study and training support loan (adds the Schedule 8 component) |
| `medicareExemption` | `"none"` \| `"half"` \| `"full"` | `"none"` | Medicare levy exemption claimed |
| `medicareFamily` | `{ spouse?: boolean, children?: number }` | | Medicare levy variation declaration |
| `annualTaxOffset` | number | `0` | Total annual tax offsets claimed on the withholding declaration |
| `seniors` | `"single"` \| `"couple"` \| `"illness-separated"` | | Claims the seniors and pensioners tax offset (Schedule 9) |
| `workingHolidayMaker` | boolean | `false` | Throws: Schedule 15 isn't supported yet |

More examples (2026–27):

```js
// Second job (no tax-free threshold) with a HELP debt
calculateWithholding({ earnings: 1500, period: "weekly", taxFreeThreshold: false, studyLoan: true });
// { withholding: 486, scale: 1, breakdown: { scaleAmount: 409, taxOffset: 0, medicareAdjustment: 0, studyLoanComponent: 77 }, ... }

// Foreign resident, paid monthly
calculateWithholding({ earnings: 4000, period: "monthly", foreignResident: true });
// { withholding: 1200, scale: 3, ... }

// Medicare levy variation for a spouse and two children
calculateWithholding({ earnings: 1200, period: "weekly", medicareFamily: { spouse: true, children: 2 } });
// { withholding: 191, scale: 2, breakdown: { scaleAmount: 202, taxOffset: 0, medicareAdjustment: 11, studyLoanComponent: 0 }, ... }

// Single senior claiming SAPTO (Schedule 9)
calculateWithholding({ earnings: 662, period: "weekly", seniors: "single" });
// { withholding: 2, scale: "seniors-single", source: "ATO Schedule 9 – Tax table for seniors and pensioners (2026-27)", ... }
```

Take-home pay for the period is `earnings - withholding`. The employer pays the 12% super guarantee on top.

## Tax withheld from a bonus

`calculateBonusWithholding(input)` applies ATO Schedule 5, Method A, to a bonus, commission or similar payment made with a regular pay. It takes the same fields as `calculateWithholding` plus `bonus` and, optionally, `periodsCovered`. The withholding is never more than 47% of the bonus.

```js
import { calculateBonusWithholding } from "au-compliance-kit";

calculateBonusWithholding({ earnings: 3000, bonus: 5000, period: "fortnightly" });
// { withholding: 1560, breakdown: { tax: 1560, studyLoanComponent: 0, cap: 2350 }, taxYear: "2026-27" }
```

`withholding` is the tax on the bonus only. Withhold on the regular earnings separately with `calculateWithholding`.

## Tax for the year and the refund

`estimateAnnualTax(input)` works out the tax owed for a financial year (income tax, the low income tax offset, the seniors and pensioners tax offset, the Medicare levy with low-income and family reductions, the Medicare levy surcharge and compulsory study loan repayments) and compares it with the tax withheld over the year.

```js
import { estimateAnnualTax } from "au-compliance-kit";

estimateAnnualTax({ salary: 90000, deductions: 2500, studyLoan: true });
// {
//   incomeYear: "2026-27",
//   taxableIncome: 87500,
//   cents: {
//     grossTax: 1677000, lito: 0, sapto: 0, medicare: 175000, mls: 0, studyLoan: 269580,
//     totalLiability: 2121580, withheld: 2241200, bonusWithheld: 0, refund: 119620
//   },
//   perPayWithholding: 862,
//   ...
// }
```

`cents.refund` is positive for a refund and negative for a bill. Input fields:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `salary` | number | required | Salary or wages from one employer for the year, excluding super, overtime and bonuses |
| `taxYear` | `"2025-26"` \| `"2026-27"` \| `"2027-28"` | `"2026-27"` | `"2027-28"` is an estimate: `withheld` and `refund` are `null` |
| `payFrequency` | `"weekly"` \| `"fortnightly"` \| `"monthly"` | `"fortnightly"` | Used for tax withheld |
| `overtime` | number | `0` | Overtime for the year |
| `bonus` | number | `0` | Bonuses paid in the year (withheld under Method A) |
| `otherIncome` | number | `0` | Other taxable income with no tax withheld |
| `deductions` | number | `0` | Tax deductions |
| `salaryIncludesSuper` | boolean | `false` | `salary` is a package including the 12% super guarantee |
| `studyLoan` | boolean | `false` | Compulsory HELP or other study loan repayment |
| `privateHospitalCover` | boolean | `true` | `false` adds the Medicare levy surcharge above the thresholds |
| `taxFreeThreshold` | boolean | `true` | Affects tax withheld only |
| `foreignResident` | boolean | `false` | Foreign resident rates, no tax-free threshold or Medicare levy |
| `family` | `{ spouse?: boolean, spouseIncome?: number, dependants?: number }` | | Medicare levy family reduction and family surcharge thresholds |
| `sapto` | `true` \| `"single"` \| `"couple"` \| `"illness-separated"` | | Eligible for the seniors and pensioners tax offset |

More examples:

```js
// Couple with one child, no private hospital cover (family income under the surcharge threshold)
estimateAnnualTax({ salary: 60000, family: { spouse: true, spouseIncome: 20000, dependants: 1 }, privateHospitalCover: false });
// cents.medicare: 120000, cents.mls: 0, cents.refund: 10400

// Single senior on $40,000
estimateAnnualTax({ salary: 40000, sapto: "single" });
// cents.sapto: 173500, cents.totalLiability: 96000, cents.refund: 49600

// 2027-28 (legislated 14% rate, thresholds not yet published)
estimateAnnualTax({ salary: 100000, taxYear: "2027-28" });
// estimate: true, cents.totalLiability: 2225200, cents.withheld: null, cents.refund: null
```

## Single-figure helpers

All return cents and take the income year as an option (`{ taxYear: "2025-26" | "2026-27" | "2027-28" }`, default 2026–27).

```js
import {
  incomeTaxCents, litoCents, medicareLevyCents, medicareLevySurchargeCents,
  studyLoanRepaymentCents, saptoCents,
} from "au-compliance-kit";

incomeTaxCents(80000);                                          // 1452000  (before offsets)
litoCents(40000);                                               // 57500    (low income tax offset)
medicareLevyCents(80000);                                       // 160000
medicareLevySurchargeCents(120000, { privateHospitalCover: false }); // 120000 (1% tier)
studyLoanRepaymentCents(100000);                                // 457080   (marginal HELP system)
saptoCents(40000);                                              // 173500   (single)
```

The full rate tables are exported as `ANNUAL_YEARS` (brackets, offsets, Medicare levy and surcharge thresholds, HELP thresholds, SAPTO) and the withholding years as `WITHHOLDING_YEARS`.

## Super guarantee and packages

```js
import { superGuaranteeCents, splitPackage, SUPER_GUARANTEE_PERCENT } from "au-compliance-kit";

SUPER_GUARANTEE_PERCENT;   // 12
superGuaranteeCents(1000); // 12000

// A $100,000 package that includes super
splitPackage(100000);
// { salary: 89285.71, superGuarantee: 10714.29, salaryCents: 8928571, superCents: 1071429 }
```

The maximum super contribution base isn't applied.

## Overtime

```js
import { overtimeEarnings } from "au-compliance-kit";

overtimeEarnings({ hourlyRate: 40, hours: 6 });                // 360 (time and a half by default)
overtimeEarnings({ hourlyRate: 40, hours: 4, multiplier: 2 }); // 320 (double time)
```

## ABN, ACN, TFN, BSB and account numbers

Check-digit validation with the official algorithms (ABR for ABNs, ASIC for ACNs, ATO for TFNs) and format checks for BSBs and account numbers. Spaces and dashes are ignored.

```js
import { validateAbn, validateAcn, validateTfn, validateBsbFormat, validateAccountNumberFormat } from "au-compliance-kit";

validateAbn("51 824 753 556"); // { valid: true, normalised: "51 824 753 556" }
validateAbn("51 824 753 557"); // { valid: false, normalised: null, reason: "ABN check digits do not match" }
validateAcn("004 085 616");    // { valid: true, normalised: "004 085 616" }
validateTfn("123 456 782");    // { valid: true, normalised: "123 456 782" }
validateBsbFormat("062-000");  // { valid: true, normalised: "062-000" }
```

A valid ABN check digit doesn't mean the ABN is registered: use the ABR's ABN Lookup for that.

## MCP server and tools for AI agents

The package includes a Model Context Protocol server with seven read-only tools: `take_home_pay`, `payg_withholding`, `bonus_withholding`, `annual_tax_estimate`, `super_guarantee`, `validate_au_identifier` and `tax_rates`.

Run it locally (stdio):

```
npx -y au-compliance-kit mcp
```

```json
{ "mcpServers": { "au-tax": { "command": "npx", "args": ["-y", "au-compliance-kit", "mcp"] } } }
```

Or connect to the hosted server (Streamable HTTP, no key): `https://aftertaxau.com/mcp`. The same tools are a plain JSON API at `https://aftertaxau.com/api/<tool>`, for example `https://aftertaxau.com/api/take_home_pay?salary=80000`.

Call the tools from your own code:

```js
import { runTool, TOOLS } from "au-compliance-kit/tools";

runTool("take_home_pay", { salary: 80000 });
// perPay.fortnightly: { grossPay: 3076.92, taxWithheld: 622, takeHomePay: 2454.92, superGuarantee: 369.23 }
// year: { grossPay: 80000, taxWithheld: 16172, takeHomePay: 63828, superGuarantee: 9600, basis: "26 fortnightly pays" }
```

Serve the MCP server from your own app with any Fetch API runtime (Cloudflare Workers, Next.js route handlers, Deno, Bun, Node 18+):

```js
// Next.js: app/mcp/route.js
import { handleMcpRequest } from "au-compliance-kit/mcp/http";

export const POST = (request) => handleMcpRequest(request);
export const OPTIONS = (request) => handleMcpRequest(request);
```

```js
// Cloudflare Worker
import { handleMcpRequest } from "au-compliance-kit/mcp/http";

export default { fetch: (request) => handleMcpRequest(request) };
```

`au-compliance-kit/mcp` exports `handleMessage` (the transport-free JSON-RPC handler) and `au-compliance-kit/api/http` exports `handleApiRequest` for the plain JSON API.

## Errors

Inputs outside what the ATO tables cover throw instead of returning a wrong figure:

```js
calculateWithholding({ earnings: 1000, period: "weekly", payDate: "2027-07-01" });
// RangeError: payDate 2027-07-01 is outside the supported withholding tables (2025-26 and 2026-27); this version cannot calculate it
```

`runTool` throws `ToolInputError` with a message an agent can act on (for example `salary must be a number`).

General information, not tax advice. Not affiliated with the Australian Taxation Office.
