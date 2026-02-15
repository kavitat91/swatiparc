import { NextResponse } from 'next/server';
import { getAppData, saveAppData } from '@/lib/storage';
import { Transaction } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 9);

export async function GET() {
    const data = getAppData();
    return NextResponse.json(data.transactions);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, category, amount, description, date, paymentMode, spender, isRefundable, residentId, invoiceImage } = body;

        if (!type || !amount || !category || !paymentMode) {
            return NextResponse.json(
                { error: 'Type, Amount, Category, and Payment Mode are required' },
                { status: 400 }
            );
        }

        const data = getAppData();
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
            residentId,
            invoiceImage,
        };

        data.transactions.push(newTransaction);
        saveAppData(data);

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
        const { id, type, category, amount, description, date, paymentMode, spender, isRefundable, residentId, invoiceImage } = body;

        if (!id || !type || !amount || !category || !paymentMode) {
            return NextResponse.json(
                { error: 'ID, Type, Amount, Category, and Payment Mode are required' },
                { status: 400 }
            );
        }

        const data = getAppData();
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
            residentId,
            invoiceImage,
        };

        saveAppData(data);
        return NextResponse.json(data.transactions[index]);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update transaction' },
            { status: 500 }
        );
    }
}
