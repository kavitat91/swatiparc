import { NextResponse } from 'next/server';
import { getAppData, saveAppData } from '@/lib/storage';
import { Transaction } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 9);

export async function GET() {
    const data = await getAppData();
    return NextResponse.json(data.transactions);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, category, amount, description, date, paymentMode, spender, isRefundable, isSettled, residentId, invoiceImage } = body;

        if (!type || !amount || !category || !paymentMode) {
            return NextResponse.json(
                { error: 'Type, Amount, Category, and Payment Mode are required' },
                { status: 400 }
            );
        }

        const data = await getAppData();
        const newTransaction: Transaction = {
            id: generateId(),
            date: date || new Date().toISOString(),
            type: type as 'REVENUE' | 'EXPENSE',
            category,
            amount: Number(amount),
            description: description || '',
            paymentMode,
            spender,
            isRefundable,
            isSettled,
            residentId,
            invoiceImage,
        };

        data.transactions.push(newTransaction);
        await saveAppData(data);

        return NextResponse.json(newTransaction);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create transaction' },
            { status: 500 }
        );
    }
}

    export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, type, category, amount, description, date, paymentMode, spender, isRefundable, isSettled, residentId, invoiceImage } = body;

        if (!id || !type || !amount || !category || !paymentMode) {
            return NextResponse.json(
                { error: 'ID, Type, Amount, Category, and Payment Mode are required' },
                { status: 400 }
            );
        }

        const data = await getAppData();
        const index = data.transactions.findIndex(t => t.id === id);

        if (index === -1) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        data.transactions[index] = {
            ...data.transactions[index],
            date: date || new Date().toISOString(),
            type: type as 'REVENUE' | 'EXPENSE',
            category,
            amount: Number(amount),
            description: description || '',
            paymentMode,
            spender,
            isRefundable,
            isSettled,
            residentId,
            invoiceImage,
        };

        await saveAppData(data);
        return NextResponse.json(data.transactions[index]);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update transaction' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
        }

        const data = await getAppData();
        const initialLength = data.transactions.length;
        data.transactions = data.transactions.filter(t => t.id !== id);

        if (data.transactions.length === initialLength) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        await saveAppData(data);
        return NextResponse.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to delete transaction' },
            { status: 500 }
        );
    }
}
