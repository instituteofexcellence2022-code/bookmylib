
import { prisma } from './src/lib/prisma';

async function main() {
    const staffId = '10b17bbe-5dd1-4477-8f94-09a0e03f4145'; // demo@gmail.com
    console.log('Simulating for Staff ID:', staffId);

    const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: { 
            library: true,
            branch: true 
        }
    });

    if (!staff) {
        console.log('Staff not found');
        return;
    }

    console.log('Staff found:', staff.name, 'Library:', staff.libraryId);

    const filters = { search: '', status: '', page: 1, limit: 10 };
    const { search, status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
        AND: [
            {
                OR: [
                    { libraryId: staff.libraryId },
                    {
                        subscriptions: {
                            some: {
                                libraryId: staff.libraryId
                            }
                        }
                    }
                ]
            }
        ]
    };

    console.log('Query where clause:', JSON.stringify(where, null, 2));

    const [students, total] = await Promise.all([
        prisma.student.findMany({
            where,
            include: {
                subscriptions: {
                    where: { status: 'active' },
                    include: { plan: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                branch: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.student.count({ where })
    ]);

    console.log(`Found ${total} students.`);
    console.log('Students:', JSON.stringify(students, null, 2));
}

main();
