import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        p.slug,
        p.name,
        p.scope,
        p.input_unit
      FROM parameters p
      WHERE p.active = true
      ORDER BY p.scope, p.name
    `);

    return NextResponse.json({
      success: true,
      parameters: result.rows,
    });
  } catch (error) {
    console.error('Database test failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
      },
      { status: 500 }
    );
  }
}
