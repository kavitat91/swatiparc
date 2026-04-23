import { NextResponse } from 'next/server';
import { getAppData, saveAppData } from '@/lib/storage';
import { Resident } from '@/types';

// Simple UUID generator if uuid package is not installed, or use crypto.
// Since I didn't install uuid, I will use a simple random string or crypto.
const generateId = () => Math.random().toString(36).substring(2, 9);

export async function GET() {
    const data = await getAppData();
    return NextResponse.json(data.residents);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, flatNumber, contact, role } = body;

        if (!name || !flatNumber) {
            return NextResponse.json(
                { error: 'Name and Flat Number are required' },
                { status: 400 }
            );
        }

        const data = await getAppData();
        const newResident: Resident = {
            id: generateId(),
            name,
            flatNumber,
            contact: contact || '',
            role: role || 'Owner',
        };

        data.residents.push(newResident);
        await saveAppData(data);

        return NextResponse.json(newResident);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create resident' },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, name, flatNumber, contact, role } = body;

        if (!id || !name || !flatNumber) {
            return NextResponse.json(
                { error: 'ID, Name and Flat Number are required' },
                { status: 400 }
            );
        }

        const data = await getAppData();
        const residentIndex = data.residents.findIndex((r) => r.id === id);

        if (residentIndex === -1) {
            return NextResponse.json(
                { error: 'Resident not found' },
                { status: 404 }
            );
        }

        data.residents[residentIndex] = {
            ...data.residents[residentIndex],
            name,
            flatNumber,
            contact: contact || '',
            role: role || data.residents[residentIndex].role || 'Owner'
        };

        await saveAppData(data);

        return NextResponse.json(data.residents[residentIndex]);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update resident' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Resident ID is required' }, { status: 400 });
        }

        const data = await getAppData();
        const initialLength = data.residents.length;
        
        data.residents = data.residents.filter(r => r.id !== id);

        if (data.residents.length === initialLength) {
            return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
        }

        // Also delete associated transactions
        data.transactions = data.transactions.filter(t => t.residentId !== id);

        await saveAppData(data);
        return NextResponse.json({ message: 'Resident deleted successfully' });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to delete resident' },
            { status: 500 }
        );
    }
}
