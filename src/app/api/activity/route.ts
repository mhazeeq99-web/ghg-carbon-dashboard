import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const slug = searchParams.get('slug');
    const year = searchParams.get('year');

    if (!slug) {
      return NextResponse.json(
        { error: 'slug is required' },
        { status: 400 }
      );
    }

    const params = [slug];
    let query = `
      SELECT
        a.id,
        p.slug,
        p.name,
        p.scope,
        p.input_unit,
        l.name AS location,
        a.year,
        a.month,
        a.quantity,
        a.notes
      FROM activity_data a
      JOIN parameters p ON p.id = a.parameter_id
      JOIN locations l ON l.id = a.location_id
      WHERE p.slug = $1
    `;

    if (year) {
      params.push(year);
      query += ` AND a.year = $2`;
    }

    query += ` ORDER BY a.year, a.month`;

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('GET activity failed:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve activity data' },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      slug,
      location,
      year,
      month,
      quantity,
      notes,
    } = body;

    if (
      !slug ||
      !location ||
      !year ||
      !month ||
      quantity === undefined
    ) {
      return NextResponse.json(
        { error: 'slug, location, year, month and quantity are required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      INSERT INTO activity_data (
        parameter_id,
        location_id,
        year,
        month,
        quantity,
        notes,
        updated_at
      )
      SELECT
        p.id,
        l.id,
        $2,
        $3,
        $4,
        $5,
        NOW()
      FROM parameters p
      CROSS JOIN locations l
      WHERE p.slug = $1
        AND l.name = $6
      ON CONFLICT (parameter_id, location_id, year, month)
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *;
      `,
      [
        slug,
        Number(year),
        Number(month),
        Number(quantity),
        notes ?? null,
        location,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Parameter or location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('POST activity failed:', error);

    return NextResponse.json(
      { error: 'Failed to save activity data' },
      { status: 500 }
    );
  }
}
