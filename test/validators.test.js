import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAbn, validateAcn, validateTfn, validateBsbFormat, validateAccountNumberFormat } from "../src/index.js";

test("ABN: ABR published example and formatting", () => {
  // ABR's worked example ABN
  assert.deepEqual(validateAbn("51 824 753 556"), { valid: true, normalised: "51 824 753 556" });
  assert.equal(validateAbn("51824753556").valid, true);
  assert.equal(validateAbn("51 824 753 557").valid, false);
  assert.equal(validateAbn("1234").valid, false);
  assert.equal(validateAbn("01824753556").valid, false);
});

test("ACN: ASIC published examples", () => {
  for (const acn of ["000 000 019", "000 250 000", "000 500 005", "000 750 005", "001 000 004", "005 999 977", "010 749 961", "010 499 966"]) {
    assert.equal(validateAcn(acn).valid, true, acn);
  }
  assert.equal(validateAcn("000 000 018").valid, false);
});

test("TFN: check digit", () => {
  // 123 456 782 satisfies the 9-digit weighting (sum 253 = 11 x 23)
  assert.equal(validateTfn("123 456 782").valid, true);
  assert.equal(validateTfn("123 456 789").valid, false);
  assert.equal(validateTfn("12345").valid, false);
});

test("BSB and account number formats", () => {
  assert.deepEqual(validateBsbFormat("062000"), { valid: true, normalised: "062-000" });
  assert.equal(validateBsbFormat("06200").valid, false);
  assert.equal(validateAccountNumberFormat("12345678").valid, true);
  assert.equal(validateAccountNumberFormat("1234").valid, false);
});
