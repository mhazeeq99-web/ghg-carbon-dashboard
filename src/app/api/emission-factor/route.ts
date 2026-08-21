import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const slug = searchParams.get('slug');
    const year = searchParams.get('year');

    // No filters = return all emission factors
    if (!slug && !year) {
      const result = await db.query(
        `
        SELECT
          ef.id,
          p.slug,
          p.name,
          p.scope,
          ef.year,
          ef.factor,
          ef.factor_unit,
          ef.source,
          ef.created_at
        FROM emission_factors ef
        JOIN parameters p
          ON p.id = ef.parameter_id
        ORDER BY
          p.scope,
          p.name,
          ef.year
        `
      );

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    }

    // Filtered lookup requires both slug and year
    if (!slug || !year) {
      return NextResponse.json(
        { error: 'slug and year are required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      SELECT
        ef.factor,
        ef.factor_unit,
        ef.source,
        ef.year,
        p.conversion_factor,
        p.conversion_unit
      FROM emission_factors ef
      JOIN parameters p
        ON p.id = ef.parameter_id
      WHERE p.slug = $1
        AND ef.year = $2
      LIMIT 1
      `,
      [slug, Number(year)]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Emission factor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result.rows[0],
    });
  } catch (error) {
    console.error('Emission factor lookup failed:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve emission factor' },
      { status: 500 }
    );
  }
}

/**
 * Update an emission factor.
 *
 * Every change is recorded in emission_factor_revisions.
 */
export async function PUT(request: NextRequest) {
  const client = await db.connect();

  try {
    const body = await request.json();

    const {
      slug,
      year,
      factor,
      factor_unit,
      source,
      reason,
      changed_by,
    } = body;

    if (
      !slug ||
      !year ||
      factor === undefined ||
      !factor_unit
    ) {
      return NextResponse.json(
        {
          error:
            'slug, year, factor and factor_unit are required',
        },
        { status: 400 }
      );
    }

    if (!reason?.trim()) {
      return NextResponse.json(
        { error: 'reason is required when changing an emission factor' },
        { status: 400 }
      );
    }

    const numericYear = Number(year);
    const numericFactor = Number(factor);

    if (!Number.isInteger(numericYear)) {
      return NextResponse.json(
        { error: 'year must be an integer' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(numericFactor) || numericFactor < 0) {
      return NextResponse.json(
        { error: 'factor must be a valid non-negative number' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    /*
     * Find the parameter.
     */
    const parameterResult = await client.query(
      `
      SELECT id, name, slug
      FROM parameters
      WHERE slug = $1
      LIMIT 1
      `,
      [slug]
    );

    if (parameterResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        { error: 'Parameter not found' },
        { status: 404 }
      );
    }

    const parameterId = parameterResult.rows[0].id;

    /*
     * Get the existing factor.
     */
    const existingResult = await client.query(
      `
      SELECT
        id,
        factor,
        factor_unit,
        source,
        year
      FROM emission_factors
      WHERE parameter_id = $1
        AND year = $2
      FOR UPDATE
      `,
      [parameterId, numericYear]
    );

    if (existingResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          error:
            `Emission factor not found for ${slug} ${numericYear}`,
        },
        { status: 404 }
      );
    }

    const existing = existingResult.rows[0];

    /*
     * Check for changes before updating.
     */
    const newSource = source ?? existing.source;

    const hasChanged =
      Number(existing.factor) !== numericFactor ||
      existing.factor_unit !== factor_unit ||
      existing.source !== newSource;

    if (!hasChanged) {
      await client.query('ROLLBACK');

      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        data: existing,
        revision: null,
      });
    }

    /*
     * Update the factor.
     */
    const updateResult = await client.query(
      `
      UPDATE emission_factors
      SET
        factor = $1,
        factor_unit = $2,
        source = $3
      WHERE id = $4
      RETURNING
        id,
        parameter_id,
        year,
        factor,
        factor_unit,
        source
      `,
      [
        numericFactor,
        factor_unit,
        newSource,
        existing.id,
      ]
    );

    const updated = updateResult.rows[0];

    /*
     * Record the change.
     */
    await client.query(
      `
      INSERT INTO emission_factor_revisions (
        emission_factor_id,
        old_factor,
        new_factor,
        old_factor_unit,
        new_factor_unit,
        old_source,
        new_source,
        reason,
        changed_by
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9
      )
      `,
      [
        existing.id,
        existing.factor,
        numericFactor,
        existing.factor_unit,
        factor_unit,
        existing.source,
        newSource,
        reason ?? null,
        changed_by ?? 'system',
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Emission factor updated successfully',
      data: updated,
      revision: {
        old_factor: existing.factor,
        new_factor: numericFactor,
        year: numericYear,
        reason: reason ?? null,
        changed_by: changed_by ?? 'system',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Emission factor update failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to update emission factor',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}