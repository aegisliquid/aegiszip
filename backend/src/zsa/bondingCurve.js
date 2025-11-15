'use strict';

const UINT64_MAX = (1n << 64n) - 1n;

const DEFAULT_DECIMALS = 6;

function normalizeDecimals(decimals) {
  if (decimals === undefined || decimals === null) {
    return DEFAULT_DECIMALS;
  }

  const value =
    typeof decimals === "number" ? Math.trunc(decimals) : Number(decimals);

  if (!Number.isFinite(value) || value < 0 || value > 18) {
    throw new Error("decimals must be an integer between 0 and 18");
  }

  return value;
}

function ensureNonNegativeBigInt(value, label) {
  if (
    typeof value === "bigint" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    try {
      const bigintValue = BigInt(value);
      if (bigintValue < 0n) {
        throw new Error(`${label} must be non-negative`);
      }
      return bigintValue;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`${label} must be an integer-like value`);
      }
      throw error;
    }
  }

  throw new Error(`${label} must be an integer-like value`);
}

function parseDecimalToScaled(value, scale, label) {
  if (value === undefined || value === null) {
    throw new Error(`${label} is required`);
  }

  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new Error(`${label} must be non-negative`);
    }
    return value * scale;
  }

  let stringValue;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be a finite number`);
    }
    if (value < 0) {
      throw new Error(`${label} must be non-negative`);
    }
    stringValue = value.toString();
  } else if (typeof value === "string") {
    stringValue = value.trim();
    if (stringValue.length === 0) {
      throw new Error(`${label} must not be empty`);
    }
  } else {
    throw new Error(`${label} must be a number, string, or bigint`);
  }

  if (!/^\d+(\.\d+)?$/.test(stringValue)) {
    throw new Error(`${label} must be a non-negative decimal string`);
  }

  const [intPart, rawFracPart = ""] = stringValue.split(".");
  const fracPart = rawFracPart.padEnd(scale.toString().length - 1, "0");

  const normalizedFrac =
    fracPart.length > 0
      ? fracPart.slice(0, scale.toString().length - 1)
      : "0".repeat(scale.toString().length - 1);

  const integer = BigInt(intPart);
  const fractional =
    normalizedFrac.length > 0 ? BigInt(normalizedFrac) : 0n;

  return integer * scale + fractional;
}

function formatScaledDecimal(value, scale, decimals) {
  const negative = value < 0n;
  let scaledValue = negative ? -value : value;

  const integerPart = scaledValue / scale;
  let fractionalPart = scaledValue % scale;

  const fractionalString = fractionalPart
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  const prefix = negative ? "-" : "";

  if (fractionalString.length === 0) {
    return `${prefix}${integerPart.toString()}`;
  }

  return `${prefix}${integerPart.toString()}.${fractionalString}`;
}

export class BondingCurveMock {
  constructor({
    initialPrice = "0.10",
    slope = "0.00001",
    maxSupply = UINT64_MAX,
    decimals = DEFAULT_DECIMALS,
  } = {}) {
    this.decimals = normalizeDecimals(decimals);
    this.scale = 10n ** BigInt(this.decimals);

    this.initialPriceScaled = parseDecimalToScaled(
      initialPrice,
      this.scale,
      "initialPrice",
    );
    this.slopeScaled = parseDecimalToScaled(
      slope,
      this.scale,
      "slope",
    );
    this.maxSupply = ensureNonNegativeBigInt(maxSupply, "maxSupply");

    if (this.maxSupply === 0n) {
      throw new Error("maxSupply must be greater than zero");
    }
  }

  static get UINT64_MAX() {
    return UINT64_MAX;
  }

  getConfig() {
    return {
      initialPrice: formatScaledDecimal(
        this.initialPriceScaled,
        this.scale,
        this.decimals,
      ),
      slope: formatScaledDecimal(
        this.slopeScaled,
        this.scale,
        this.decimals,
      ),
      decimals: this.decimals,
      maxSupply: this.maxSupply.toString(),
    };
  }

  #normalizeQuantity(value, label) {
    return ensureNonNegativeBigInt(value ?? 0n, label);
  }

  #priceAtSupply(supply) {
    return (
      this.initialPriceScaled + this.slopeScaled * this.#normalizeQuantity(supply, "supply")
    );
  }

  getSpotPrice(currentSupply = 0n) {
    const supply = this.#normalizeQuantity(currentSupply, "currentSupply");
    return formatScaledDecimal(
      this.#priceAtSupply(supply),
      this.scale,
      this.decimals,
    );
  }

  getReserveBalance(currentSupply = 0n) {
    const supply = this.#normalizeQuantity(currentSupply, "currentSupply");

    const triangular = supply * (supply - 1n) / 2n;
    const reserveScaled =
      this.initialPriceScaled * supply + this.slopeScaled * triangular;

    return formatScaledDecimal(reserveScaled, this.scale, this.decimals);
  }

  quoteMint({ amount, currentSupply = 0n } = {}) {
    const mintAmount = this.#normalizeQuantity(amount, "amount");
    if (mintAmount === 0n) {
      throw new Error("amount must be greater than zero");
    }

    const supplyBefore = this.#normalizeQuantity(
      currentSupply,
      "currentSupply",
    );

    const newSupply = supplyBefore + mintAmount;
    if (newSupply > this.maxSupply) {
      throw new Error("mint would exceed maxSupply");
    }

    const triangular = (mintAmount * (mintAmount - 1n)) / 2n;

    const totalCostScaled =
      this.initialPriceScaled * mintAmount +
      this.slopeScaled * (supplyBefore * mintAmount + triangular);

    const averagePriceScaled = totalCostScaled / mintAmount;

    return {
      amount: mintAmount.toString(),
      currentSupply: supplyBefore.toString(),
      newSupply: newSupply.toString(),
      totalCost: formatScaledDecimal(
        totalCostScaled,
        this.scale,
        this.decimals,
      ),
      averagePrice: formatScaledDecimal(
        averagePriceScaled,
        this.scale,
        this.decimals,
      ),
      spotPriceBefore: formatScaledDecimal(
        this.#priceAtSupply(supplyBefore),
        this.scale,
        this.decimals,
      ),
      spotPriceAfter: formatScaledDecimal(
        this.#priceAtSupply(newSupply),
        this.scale,
        this.decimals,
      ),
    };
  }

  quoteBurn({ amount, currentSupply = 0n } = {}) {
    const burnAmount = this.#normalizeQuantity(amount, "amount");
    if (burnAmount === 0n) {
      throw new Error("amount must be greater than zero");
    }

    const supplyBefore = this.#normalizeQuantity(
      currentSupply,
      "currentSupply",
    );

    if (burnAmount > supplyBefore) {
      throw new Error("amount exceeds current supply");
    }

    const newSupply = supplyBefore - burnAmount;
    const triangular = (burnAmount * (burnAmount - 1n)) / 2n;

    const refundScaled =
      this.initialPriceScaled * burnAmount +
      this.slopeScaled * (burnAmount * (supplyBefore - 1n) - triangular);

    const averagePriceScaled = refundScaled / burnAmount;

    return {
      amount: burnAmount.toString(),
      currentSupply: supplyBefore.toString(),
      newSupply: newSupply.toString(),
      totalRefund: formatScaledDecimal(
        refundScaled,
        this.scale,
        this.decimals,
      ),
      averagePrice: formatScaledDecimal(
        averagePriceScaled,
        this.scale,
        this.decimals,
      ),
      spotPriceBefore: formatScaledDecimal(
        this.#priceAtSupply(supplyBefore - 1n),
        this.scale,
        this.decimals,
      ),
      spotPriceAfter: formatScaledDecimal(
        this.#priceAtSupply(newSupply),
        this.scale,
        this.decimals,
      ),
    };
  }

  projectMintForBudget({ budget, currentSupply = 0n } = {}) {
    const budgetScaled = parseDecimalToScaled(
      budget,
      this.scale,
      "budget",
    );
    const supplyBefore = this.#normalizeQuantity(
      currentSupply,
      "currentSupply",
    );

    if (budgetScaled === 0n) {
      return {
        amount: "0",
        newSupply: supplyBefore.toString(),
        budget: formatScaledDecimal(0n, this.scale, this.decimals),
      };
    }

    const a = this.slopeScaled / 2n;
    const b =
      this.initialPriceScaled + this.slopeScaled * supplyBefore - a;

    if (this.slopeScaled === 0n) {
      const amount = budgetScaled / this.initialPriceScaled;
      const truncatedAmount = amount > 0n ? amount : 0n;
      const newSupply = supplyBefore + truncatedAmount;
      if (newSupply > this.maxSupply) {
        return {
          amount: (this.maxSupply - supplyBefore).toString(),
          newSupply: this.maxSupply.toString(),
          budget: formatScaledDecimal(
            budgetScaled,
            this.scale,
            this.decimals,
          ),
          exhausted: true,
        };
      }
      return {
        amount: truncatedAmount.toString(),
        newSupply: newSupply.toString(),
        budget: formatScaledDecimal(
          budgetScaled,
          this.scale,
          this.decimals,
        ),
      };
    }

    const discriminant =
      b * b + 2n * this.slopeScaled * budgetScaled;
    const sqrtDiscriminant = this.#sqrt(discriminant);

    let amount = (sqrtDiscriminant - b) / this.slopeScaled;
    if (amount < 0n) {
      amount = 0n;
    }

    const newSupply = supplyBefore + amount;
    const exceedsMax = newSupply > this.maxSupply;

    return {
      amount: exceedsMax
        ? (this.maxSupply - supplyBefore).toString()
        : amount.toString(),
      newSupply: exceedsMax
        ? this.maxSupply.toString()
        : newSupply.toString(),
      budget: formatScaledDecimal(
        budgetScaled,
        this.scale,
        this.decimals,
      ),
      exhausted: exceedsMax,
    };
  }

  #sqrt(value) {
    if (value < 0n) {
      throw new Error("Cannot take sqrt of negative value");
    }
    if (value < 2n) {
      return value;
    }

    function newtonIteration(n, x0) {
      const x1 = (n / x0 + x0) >> 1n;
      if (x0 === x1 || x0 === x1 - 1n) {
        return x0;
      }
      return newtonIteration(n, x1);
    }

    return newtonIteration(value, 1n);
  }
}


