import * as XLSX from "xlsx";
import { sendBankingStatementEmail, sendBankingTransferOtpEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const BANKING_USERS = [
  {
    username: "bankinguser1",
    password: "password",
    displayName: "Banking User 1",
    email: "bankinguser1@example.com",
    accountNumber: "WM-SAV-1001",
    openingBalanceInCents: 21604
  },
  {
    username: "bankinguser2",
    password: "password",
    displayName: "Banking User 2",
    email: "bankinguser2@example.com",
    accountNumber: "WM-SAV-1002",
    openingBalanceInCents: 23000
  },
  {
    username: "bankinguser3",
    password: "password",
    displayName: "Banking User 3",
    email: "bankinguser3@example.com",
    accountNumber: "WM-SAV-1003",
    openingBalanceInCents: 45250
  },
  {
    username: "bankinguser4",
    password: "password",
    displayName: "Banking User 4",
    email: "bankinguser4@example.com",
    accountNumber: "WM-SAV-1004",
    openingBalanceInCents: 38975
  },
  {
    username: "bankinguser5",
    password: "password",
    displayName: "Banking User 5",
    email: "bankinguser5@example.com",
    accountNumber: "WM-SAV-1005",
    openingBalanceInCents: 61240
  },
  {
    username: "bankinguser6",
    password: "password",
    displayName: "Banking User 6",
    email: "bankinguser6@example.com",
    accountNumber: "WM-SAV-1006",
    openingBalanceInCents: 27480
  }
] as const;

const DEMO_TRANSFER_DESTINATIONS = [
  {
    username: "demo-beneficiary-1",
    displayName: "Aarav Industries",
    accountNumber: "WM-EXT-4101"
  },
  {
    username: "demo-beneficiary-2",
    displayName: "Bluefin Supplies",
    accountNumber: "WM-EXT-4102"
  },
  {
    username: "demo-beneficiary-3",
    displayName: "Cityline Retail",
    accountNumber: "WM-EXT-4103"
  },
  {
    username: "demo-beneficiary-4",
    displayName: "Northstar Services",
    accountNumber: "WM-EXT-4104"
  }
] as const;

type StatementOptions = {
  email?: string;
  transactionCount: number;
  username: string;
};

export type BankingAccountSummary = {
  username: string;
  displayName: string;
  email: string;
  accountNumber: string;
  balanceInCents: number;
  balanceDisplay: string;
};

export type BankingTransactionRow = {
  transactionId: string;
  createdAt: string;
  description: string;
  transactionType: string;
  direction: "Credit" | "Debit";
  counterparty: string;
  amountInCents: number;
  amountDisplay: string;
  balanceAfterInCents: number | null;
  balanceAfterDisplay: string;
};

export type BankingTransactionDetails = BankingTransactionRow & {
  sourceAccountNumber: string | null;
  sourceUsername: string | null;
  sourceDisplayName: string | null;
  destinationAccountNumber: string | null;
  destinationUsername: string | null;
  destinationDisplayName: string | null;
  initiatedByUsername: string | null;
  initiatedByDisplayName: string | null;
  metadataJson: string | null;
};

export type BankingDashboardData = {
  user: BankingAccountSummary;
  transferDestinations: Array<{
    username: string;
    displayName: string;
    accountNumber: string;
  }>;
  recentTransactions: BankingTransactionRow[];
};

function isDemoDestination(username: string) {
  return DEMO_TRANSFER_DESTINATIONS.some((destination) => destination.username === username);
}

function formatCurrencyFromCents(amountInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountInCents / 100);
}

function buildTransactionId() {
  return `TXN${Date.now()}${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
}

function buildTransactionIdFromOtp(otp: { id: string; createdAt: Date }) {
  const otpHash = Array.from(otp.id).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) % 100000000,
    0
  );

  return `TXN${otp.createdAt.getTime()}${otpHash.toString().padStart(8, "0")}`;
}

function buildOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function parsePositiveAmountToCents(amount: number | string) {
  const parsedAmount = typeof amount === "number" ? amount : Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Enter a valid amount greater than zero.");
  }

  return Math.round(parsedAmount * 100);
}

function parseTransactionCount(value: number | string) {
  const count = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(count) || count <= 0 || count > 50) {
    throw new Error("Transaction count must be between 1 and 50.");
  }

  return count;
}

async function getUserRecord(username: string) {
  return prisma.bankUser.findUnique({
    where: { username },
    include: {
      account: true
    }
  });
}

function mapAccountSummary(user: {
  username: string;
  displayName: string;
  email: string;
  account: { accountNumber: string; balanceInCents: number };
}) {
  return {
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    accountNumber: user.account.accountNumber,
    balanceInCents: user.account.balanceInCents,
    balanceDisplay: formatCurrencyFromCents(user.account.balanceInCents)
  };
}

function mapTransactionRow(
  accountId: string,
  transaction: {
    transactionId: string;
    createdAt: Date;
    description: string;
    transactionType: string;
    amountInCents: number;
    sourceAccountId: string | null;
    destinationAccountId: string | null;
    sourceBalanceAfterInCents: number | null;
    destinationBalanceAfterInCents: number | null;
    sourceAccount: null | {
      user: { displayName: string; username: string };
    };
    destinationAccount: null | {
      user: { displayName: string; username: string };
    };
  }
): BankingTransactionRow {
  const isDebit = transaction.sourceAccountId === accountId;
  const counterparty =
    transaction.transactionType === "ADMIN_CREDIT"
      ? "Admin funding"
      : isDebit
        ? (transaction.destinationAccount?.user.displayName ??
          transaction.destinationAccount?.user.username ??
          "Unknown")
        : (transaction.sourceAccount?.user.displayName ??
          transaction.sourceAccount?.user.username ??
          "Unknown");

  const balanceAfterInCents = isDebit
    ? transaction.sourceBalanceAfterInCents
    : transaction.destinationBalanceAfterInCents;

  return {
    transactionId: transaction.transactionId,
    createdAt: transaction.createdAt.toISOString(),
    description: transaction.description,
    transactionType: transaction.transactionType,
    direction: isDebit ? "Debit" : "Credit",
    counterparty,
    amountInCents: transaction.amountInCents,
    amountDisplay: formatCurrencyFromCents(transaction.amountInCents),
    balanceAfterInCents,
    balanceAfterDisplay:
      balanceAfterInCents === null ? "-" : formatCurrencyFromCents(balanceAfterInCents)
  };
}

async function getRecentTransactionsForAccount(accountId: string, count = 8) {
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      OR: [{ sourceAccountId: accountId }, { destinationAccountId: accountId }]
    },
    include: {
      sourceAccount: {
        include: {
          user: true
        }
      },
      destinationAccount: {
        include: {
          user: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: count
  });

  return transactions.map((transaction) => mapTransactionRow(accountId, transaction));
}

export async function getBankingTransactionById(transactionId: string) {
  const normalizedTransactionId = transactionId.trim();

  if (!normalizedTransactionId) {
    throw new Error("Transaction number is required.");
  }

  const transaction = await prisma.bankTransaction.findUnique({
    where: {
      transactionId: normalizedTransactionId
    },
    include: {
      sourceAccount: {
        include: {
          user: true
        }
      },
      destinationAccount: {
        include: {
          user: true
        }
      },
      initiatedByUser: true
    }
  });

  if (!transaction) {
    return null;
  }

  const direction = transaction.sourceAccountId ? "Debit" : "Credit";
  const balanceAfterInCents = transaction.sourceAccountId
    ? transaction.sourceBalanceAfterInCents
    : transaction.destinationBalanceAfterInCents;
  const counterparty =
    transaction.transactionType === "ADMIN_CREDIT"
      ? "Admin funding"
      : (transaction.destinationAccount?.user.displayName ??
        transaction.destinationAccount?.user.username ??
        transaction.sourceAccount?.user.displayName ??
        transaction.sourceAccount?.user.username ??
        "Unknown");

  const details: BankingTransactionDetails = {
    transactionId: transaction.transactionId,
    createdAt: transaction.createdAt.toISOString(),
    description: transaction.description,
    transactionType: transaction.transactionType,
    direction,
    counterparty,
    amountInCents: transaction.amountInCents,
    amountDisplay: formatCurrencyFromCents(transaction.amountInCents),
    balanceAfterInCents,
    balanceAfterDisplay:
      balanceAfterInCents === null ? "-" : formatCurrencyFromCents(balanceAfterInCents),
    sourceAccountNumber: transaction.sourceAccount?.accountNumber ?? null,
    sourceUsername: transaction.sourceAccount?.user.username ?? null,
    sourceDisplayName: transaction.sourceAccount?.user.displayName ?? null,
    destinationAccountNumber: transaction.destinationAccount?.accountNumber ?? null,
    destinationUsername: transaction.destinationAccount?.user.username ?? null,
    destinationDisplayName: transaction.destinationAccount?.user.displayName ?? null,
    initiatedByUsername: transaction.initiatedByUser?.username ?? null,
    initiatedByDisplayName: transaction.initiatedByUser?.displayName ?? null,
    metadataJson: transaction.metadataJson
  };

  return details;
}

function buildStatementWorkbook(
  account: BankingAccountSummary,
  rows: BankingTransactionRow[],
  transactionCount: number
) {
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      "Transaction ID": row.transactionId,
      "Date": new Date(row.createdAt).toLocaleString("en-US"),
      "Type": row.transactionType,
      "Direction": row.direction,
      "Counterparty": row.counterparty,
      "Description": row.description,
      "Amount": row.amountDisplay,
      "Balance After": row.balanceAfterDisplay
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Statement");

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Watermelon Banking Statement"],
    ["Customer", account.displayName],
    ["Username", account.username],
    ["Account Number", account.accountNumber],
    ["Closing Balance", account.balanceDisplay],
    ["Transactions Included", transactionCount]
  ]);

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const fileName = `watermelon-banking-statement-${account.username}-${Date.now()}.xlsx`;
  const buffer = Buffer.from(
    XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer"
    })
  );

  return { buffer, fileName };
}

export async function ensureBankingSeedData() {
  for (const seedUser of BANKING_USERS) {
    const user = await prisma.bankUser.upsert({
      where: { username: seedUser.username },
      update: {
        password: seedUser.password,
        displayName: seedUser.displayName,
        email: seedUser.email
      },
      create: {
        username: seedUser.username,
        password: seedUser.password,
        displayName: seedUser.displayName,
        email: seedUser.email
      }
    });

    await prisma.bankAccount.upsert({
      where: { userId: user.id },
      update: {
        accountNumber: seedUser.accountNumber
      },
      create: {
        userId: user.id,
        accountNumber: seedUser.accountNumber,
        balanceInCents: seedUser.openingBalanceInCents
      }
    });
  }
}

export async function validateBankingCredentials(username: string, password: string) {
  const user = await getUserRecord(username);

  if (!user?.account || user.password !== password) {
    return null;
  }

  return mapAccountSummary({
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    account: {
      accountNumber: user.account.accountNumber,
      balanceInCents: user.account.balanceInCents
    }
  });
}

export async function getBankingDashboardData(username: string): Promise<BankingDashboardData> {
  const user = await getUserRecord(username);

  if (!user?.account) {
    throw new Error("Banking user not found.");
  }

  const transferDestinations = (
    await prisma.bankUser.findMany({
      where: {
        username: {
          not: username
        }
      },
      include: {
        account: true
      },
      orderBy: {
        username: "asc"
      }
    })
  )
    .filter((row) => row.account)
    .map((row) => ({
      username: row.username,
      displayName: row.displayName,
      accountNumber: row.account!.accountNumber
    }));

  return {
    user: mapAccountSummary({
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      account: {
        accountNumber: user.account.accountNumber,
        balanceInCents: user.account.balanceInCents
      }
    }),
    transferDestinations: [...DEMO_TRANSFER_DESTINATIONS, ...transferDestinations],
    recentTransactions: await getRecentTransactionsForAccount(user.account.id)
  };
}

export async function getAdminBankingAccounts() {
  const users = await prisma.bankUser.findMany({
    include: {
      account: true
    },
    orderBy: {
      username: "asc"
    }
  });

  return users
    .filter((user) => user.account)
    .map((user) =>
      mapAccountSummary({
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        account: {
          accountNumber: user.account!.accountNumber,
          balanceInCents: user.account!.balanceInCents
        }
      })
    );
}

export async function createTransferOtp(args: {
  username: string;
  recipientEmail: string;
  amount: number | string;
  destinationUsername: string;
}) {
  const user = await getUserRecord(args.username);

  if (!user?.account) {
    throw new Error("Banking user not found.");
  }

  if (isDemoDestination(args.destinationUsername)) {
    throw new Error("This demo beneficiary is not yet enabled.");
  }

  if (args.destinationUsername === args.username) {
    throw new Error("Choose a different destination account.");
  }

  const destination = await getUserRecord(args.destinationUsername);

  if (!destination?.account) {
    throw new Error("Destination account not found.");
  }

  const amountInCents = parsePositiveAmountToCents(args.amount);
  const otp = buildOtpCode();

  await prisma.bankOtp.updateMany({
    where: {
      userId: user.id,
      purpose: "TRANSFER",
      consumedAt: null
    },
    data: {
      consumedAt: new Date()
    }
  });

  const activeOtp = await prisma.bankOtp.create({
    data: {
      code: otp,
      purpose: "TRANSFER",
      recipientEmail: args.recipientEmail,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      userId: user.id
    }
  });
  const transactionId = buildTransactionIdFromOtp(activeOtp);

  const delivery = await sendBankingTransferOtpEmail({
    otp,
    recipientEmail: args.recipientEmail,
    transactionId,
    amountDisplay: formatCurrencyFromCents(amountInCents),
    destinationUsername: destination.username
  });

  return {
    delivered: delivery.delivered,
    mode: delivery.mode,
    transactionId
  };
}

export async function executeTransfer(args: {
  username: string;
  destinationUsername: string;
  amount: number | string;
  otp: string;
  recipientEmail: string;
}) {
  const amountInCents = parsePositiveAmountToCents(args.amount);
  const sourceUser = await getUserRecord(args.username);

  if (isDemoDestination(args.destinationUsername)) {
    throw new Error("This demo beneficiary is not yet enabled.");
  }

  const destinationUser = await getUserRecord(args.destinationUsername);

  if (!sourceUser?.account || !destinationUser?.account) {
    throw new Error("Unable to find the source or destination account.");
  }

  if (sourceUser.username === destinationUser.username) {
    throw new Error("Choose a different destination account.");
  }

  const normalizedOtp = args.otp.trim();

  if (!normalizedOtp) {
    throw new Error("Enter the OTP sent to the email address.");
  }

  let transactionId = "";

  await prisma.$transaction(async (tx) => {
    const activeOtp = await tx.bankOtp.findFirst({
      where: {
        userId: sourceUser.id,
        purpose: "TRANSFER",
        recipientEmail: args.recipientEmail,
        code: normalizedOtp,
        consumedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!activeOtp) {
      throw new Error("OTP is invalid or expired.");
    }

    transactionId = buildTransactionIdFromOtp(activeOtp);

    const sourceAccount = await tx.bankAccount.findUnique({
      where: { id: sourceUser.account!.id }
    });
    const destinationAccount = await tx.bankAccount.findUnique({
      where: { id: destinationUser.account!.id }
    });

    if (!sourceAccount || !destinationAccount) {
      throw new Error("Account not found.");
    }

    if (sourceAccount.balanceInCents < amountInCents) {
      throw new Error("Insufficient balance in the savings account.");
    }

    const updatedSource = await tx.bankAccount.update({
      where: { id: sourceAccount.id },
      data: {
        balanceInCents: {
          decrement: amountInCents
        }
      }
    });

    const updatedDestination = await tx.bankAccount.update({
      where: { id: destinationAccount.id },
      data: {
        balanceInCents: {
          increment: amountInCents
        }
      }
    });

    await tx.bankTransaction.create({
      data: {
        transactionId,
        transactionType: "TRANSFER",
        amountInCents,
        description: `Transfer to ${destinationUser.displayName}`,
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount.id,
        initiatedByUserId: sourceUser.id,
        sourceBalanceAfterInCents: updatedSource.balanceInCents,
        destinationBalanceAfterInCents: updatedDestination.balanceInCents
      }
    });

    await tx.bankOtp.update({
      where: { id: activeOtp.id },
      data: {
        consumedAt: new Date()
      }
    });
  });

  return {
    transactionId,
    dashboard: await getBankingDashboardData(args.username)
  };
}

export async function getTransferOtpByTransactionId(args: {
  username?: string;
  transactionId: string;
}) {
  const normalizedTransactionId = args.transactionId.trim();

  if (!normalizedTransactionId) {
    throw new Error("Enter a transaction ID.");
  }

  const user = args.username ? await getUserRecord(args.username) : null;

  if (args.username && !user) {
    throw new Error("Banking user not found.");
  }

  const activeOtps = await prisma.bankOtp.findMany({
    where: {
      userId: user?.id,
      purpose: "TRANSFER",
      consumedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const matchingOtp = activeOtps.find(
    (otp) => buildTransactionIdFromOtp(otp) === normalizedTransactionId
  );

  if (!matchingOtp) {
    return null;
  }

  return {
    transactionId: normalizedTransactionId,
    otp: matchingOtp.code,
    recipientEmail: matchingOtp.recipientEmail,
    expiresAt: matchingOtp.expiresAt.toISOString()
  };
}

export async function addAdminFunds(args: {
  username: string;
  amount: number | string;
}) {
  const amountInCents = parsePositiveAmountToCents(args.amount);
  const user = await getUserRecord(args.username);

  if (!user?.account) {
    throw new Error("Choose a valid account.");
  }

  const transactionId = buildTransactionId();

  await prisma.$transaction(async (tx) => {
    const updatedAccount = await tx.bankAccount.update({
      where: { id: user.account!.id },
      data: {
        balanceInCents: {
          increment: amountInCents
        }
      }
    });

    await tx.bankTransaction.create({
      data: {
        transactionId,
        transactionType: "ADMIN_CREDIT",
        amountInCents,
        description: `Admin funding for ${user.displayName}`,
        destinationAccountId: updatedAccount.id,
        destinationBalanceAfterInCents: updatedAccount.balanceInCents
      }
    });
  });

  return getAdminBankingAccounts();
}

export async function generateStatement(args: StatementOptions) {
  const transactionCount = parseTransactionCount(args.transactionCount);
  const user = await getUserRecord(args.username);

  if (!user?.account) {
    throw new Error("Banking user not found.");
  }

  const rows = await getRecentTransactionsForAccount(user.account.id, transactionCount);
  const summary = mapAccountSummary({
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    account: {
      accountNumber: user.account.accountNumber,
      balanceInCents: user.account.balanceInCents
    }
  });
  const { buffer, fileName } = buildStatementWorkbook(summary, rows, transactionCount);

  let emailed = false;

  if (args.email) {
    const delivery = await sendBankingStatementEmail({
      recipientEmail: args.email,
      username: args.username,
      fileName,
      workbookBuffer: buffer,
      transactionCount
    });
    emailed = delivery.delivered;
  }

  return {
    rows,
    fileName,
    downloadBase64: buffer.toString("base64"),
    emailed
  };
}
