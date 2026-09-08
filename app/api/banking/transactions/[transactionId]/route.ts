import { NextResponse } from "next/server";
import { getBankingTransactionById } from "@/lib/banking";

type RouteProps = {
  params: Promise<{
    transactionId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { transactionId } = await params;
    const transaction = await getBankingTransactionById(transactionId);

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch transaction details."
      },
      { status: 400 }
    );
  }
}
