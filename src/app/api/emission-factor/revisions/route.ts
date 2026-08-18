import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      SELECT
        id,
        old_factor,
        new_factor,
        old_factor_unit,
        new_factor_unit,
        old_source,
        new_source,
        reason,
        changed_by,
        changed_at
      FROM emission_factor_revisions
      WHERE emission_factor_id = $1
      ORDER BY changed_at DESC
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      'Emission factor revisions failed:',
      error
    );

    return NextResponse.json(
      { error: 'Failed to retrieve revisions' },
      { status: 500 }
    );
  }
}
