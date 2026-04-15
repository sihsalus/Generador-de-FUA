import { isStrictIntegerString } from '../utils/utils';
import { parseAs } from '../utils/utils';
import { Op } from 'sequelize';
import { Request } from 'express';
require('dotenv').config();

// Import constans
import { DEFAULT_PAGE_SIZE, DEFAULT_MAX_PAGE_SIZE } from './constants';

const DEFAULT_PAGE = 1;

// ---------------------------------------------------------------------------
// Raw query-param types (string | null, as extracted from req.query)
// ---------------------------------------------------------------------------

export type BaseEntityRawParams = {
  id:                 string | null;
  uuid:               string | null;
  createdBy:          string | null;
  updatedBy:          string | null;
  active:             string | null;
  includeInactive:    string | null;
  inactiveBy:         string | null;
  inactiveAt:         string | null;
  beforeInactiveAt:   string | null;
  afterInactiveAt:    string | null;
  inactiveReason:     string | null;
  beforeCreatedAt:    string | null;
  afterCreatedAt:     string | null;
  beforeUpdatedAt:    string | null;
  afterUpdatedAt:     string | null;
};

// Keep legacy alias so existing imports don't break
export type baseEntityPaginationParamObjectType = BaseEntityRawParams;

/** Extracts base-entity filter params from an Express request. */
export function baseEntityPaginationParamObject(req: Request): BaseEntityRawParams {
  return {
    id:               (req.query.id               as string) ?? null,
    uuid:             (req.query.uuid             as string) ?? null,
    createdBy:        (req.query.createdBy        as string) ?? null,
    updatedBy:        (req.query.updatedBy        as string) ?? null,
    active:           (req.query.active           as string) ?? null,
    includeInactive:  (req.query.includeInactive  as string) ?? null,
    inactiveBy:       (req.query.inactiveBy       as string) ?? null,
    inactiveAt:       (req.query.inactiveAt       as string) ?? null,
    beforeInactiveAt: (req.query.beforeInactiveAt as string) ?? null,
    afterInactiveAt:  (req.query.afterInactiveAt  as string) ?? null,
    inactiveReason:   (req.query.inactiveReason   as string) ?? null,
    beforeCreatedAt:  (req.query.beforeCreatedAt  as string) ?? null,
    afterCreatedAt:   (req.query.afterCreatedAt   as string) ?? null,
    beforeUpdatedAt:  (req.query.beforeUpdatedAt  as string) ?? null,
    afterUpdatedAt:   (req.query.afterUpdatedAt   as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Pagination result / param types
// ---------------------------------------------------------------------------

export type SimplePaginationResult = {
  results: any[];
  totalResults: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type paginationParamsInput = {
  page?: any;
  pageSize?: any;  
  maxPageSize?: any;
};

export type paginationParams = {
  page?: any;
  pageSize?: any;
  maxPageSize?: any;
  order?: any;
};

/** Sequelize findAll-compatible callback, so paginationWrapper is not tied to one service. */
export type FindAllFn = (options: any) => Promise<{ count: number | any; rows: any[] }>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------




function parsePageParam(
  raw: string | number | null | undefined,
  defaultValue: number,
  paramName: 'page' | 'pageSize',
): number {
  if (raw === undefined || raw === null) return defaultValue;

  if (typeof raw === 'number') {
    const n = Math.floor(raw);
    if (n <= 0) throw new Error(`Bad '${paramName}' value.`);
    return n;
  }

  if (typeof raw === 'string') {
    if (!isStrictIntegerString(raw)) throw new Error(`Bad '${paramName}' argument.`);
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`Bad '${paramName}' value.`);
    return n;
  }

  throw new Error(`Bad '${paramName}' argument type.`);
}

function buildDateRange(after: string | null, before: string | null): any | null {
  if (after != null && before != null) return { [Op.between]: [new Date(after), new Date(before)] };
  if (after  != null)                  return { [Op.gte]: new Date(after) };
  if (before != null)                  return { [Op.lte]: new Date(before) };
  return null;
}

/**
 * Parses and validates raw query params, then builds a Sequelize-ready
 * `where` object.  Date-range and active/includeInactive logic lives here
 * so that paginationWrapper works on typed, already-resolved values.
 */
export function buildWhereClause(raw: Request): Record<string, any> {
  const parsed: Record<string, any> = {
    id:                   parseAs(raw.query.id                  as string, 'integer'),
    uuid:                 parseAs(raw.query.uuid                as string, 'string'),
    createdBy:            parseAs(raw.query.createdBy           as string, 'string'),
    updatedBy:            parseAs(raw.query.updatedBy           as string, 'string'),
    active:               parseAs(raw.query.active              as string, 'boolean'),
    includeInactive:      parseAs(raw.query.includeInactive     as string, 'boolean'),
    inactiveBy:           parseAs(raw.query.inactiveBy          as string, 'string'),
    inactiveReason:       parseAs(raw.query.inactiveReason      as string, 'string'),
    beforeInactiveAt:     parseAs(raw.query.beforeInactiveAt    as string, 'string'),
    afterInactiveAt:      parseAs(raw.query.afterInactiveAt     as string, 'string'),
    beforeCreatedAt:      parseAs(raw.query.beforeCreatedAt     as string, 'string'),
    afterCreatedAt:       parseAs(raw.query.afterCreatedAt      as string, 'string'),
    beforeUpdatedAt:      parseAs(raw.query.beforeUpdatedAt     as string, 'string'),
    afterUpdatedAt:       parseAs(raw.query.afterUpdatedAt      as string, 'string'),
  };

  // Date ranges
  const inactiveAtRange = buildDateRange(parsed.afterInactiveAt, parsed.beforeInactiveAt);
  if (inactiveAtRange != null) parsed.inactiveAt = inactiveAtRange;

  const createdAtRange = buildDateRange(parsed.afterCreatedAt, parsed.beforeCreatedAt);
  if (createdAtRange != null) parsed.createdAt = createdAtRange;

  const updatedAtRange = buildDateRange(parsed.afterUpdatedAt, parsed.beforeUpdatedAt);
  if (updatedAtRange != null) parsed.updatedAt = updatedAtRange;

  // active default: filter by active=true unless includeInactive is set
  if (parsed.includeInactive === true) {
    parsed.active = null;
  } else if (parsed.active === null) {
    parsed.active = true;
  }

  // includeInactive is not a DB column — remove it before querying
  delete parsed.includeInactive;

  // Strip nulls so Sequelize doesn't add unnecessary WHERE conditions
  return Object.fromEntries(Object.entries(parsed).filter(([, v]) => v != null));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generic pagination wrapper.
 *
 * @param paginationParams  Page / pageSize / order / maxPageSize
 * @param baseEntityParams  Raw query params (from baseEntityPaginationParamObject)
 * @param findAll           Sequelize-style findAndCountAll callback for the target model
 */
export async function paginationWrapper(
  req: Request,
  findAll: FindAllFn,
): Promise<SimplePaginationResult> {

  // Create pagination params
  const paginationParams : paginationParamsInput = {    
    page:         (parseAs(req.query.page            as string, 'integer') as number | null) ?? DEFAULT_PAGE,
    pageSize:     (parseAs(req.query.pageSize        as string, 'integer') as number | null) ?? DEFAULT_PAGE_SIZE
  };

  // Resolve max page size from env, then from caller, then from default
  let maxPageSize = DEFAULT_MAX_PAGE_SIZE;

  const pageParsed      = parsePageParam(paginationParams.page,         DEFAULT_PAGE,      'page');
  let   pageSizeParsed  = parsePageParam(paginationParams.pageSize,     DEFAULT_PAGE_SIZE, 'pageSize');
  
  // Check Page size
  if (pageSizeParsed > maxPageSize) pageSizeParsed = maxPageSize;

  const offset = (pageParsed - 1) * pageSizeParsed;
  //TODO: think on how to do this
  //const order  = paginationParams.order ?? [['createdAt', 'ASC']];
  const where  = buildWhereClause(req);

  // Sequelize params
  const findOptions = { 
    where, 
    limit: pageSizeParsed, 
    offset 
  };

  let result: { count: number | any; rows: any[] };
  try {
    result = await findAll(findOptions);
  } catch (err: any) {
    (err as Error).message = 'Error in paginationWrapper: ' + (err as Error).message;
    throw err;
  }

  
  let total = 0;
  if (typeof result.count === 'number') {
    total = result.count;
  } else if (result.count && typeof result.count === 'object' && 'count' in result.count) {
    total = Number((result.count as any).count) || 0;
  }
  

  const rows  = result.rows ?? [];
  const pages = total === 0 ? 1 : Math.ceil(total / pageSizeParsed);

  if (pageParsed > pages) {
    throw new Error(`Pagination error: requested page ${pageParsed} exceeds total pages ${pages}`);
  }

  // TODO: Review if its necessary
  //const hasMore = offset + rows.length < total;

  return { 
    results: rows, 
    page: pageParsed,
    pageSize: pageSizeParsed,
    totalPages: pages, 
    totalResults: total
  };
};


