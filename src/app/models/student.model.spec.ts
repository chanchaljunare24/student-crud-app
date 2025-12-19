
import { Student } from './student.model';
import { PagedResult } from './student.model';

/**
 * Type guard: verifies an object conforms to PagedResult<T> shape.
 * (Useful when consuming API responses.)
 */
function isPagedResult<T>(obj: any): obj is PagedResult<T> {
  return !!obj &&
    Array.isArray(obj.items) &&
    typeof obj.totalCount === 'number' &&
    typeof obj.page === 'number' &&
    typeof obj.pageSize === 'number';
}

/**
 * Basic pagination invariants for sanity checks.
 */
function isValidPageMeta<T>(pr: PagedResult<T>): boolean {
  const { page, pageSize, items, totalCount } = pr;
  if (page < 1 || pageSize < 1) return false;
  if (items.length > pageSize) return false;
  if (totalCount < 0) return false;
  return true;
}

describe('Student model', () => {
  it('should create an instance', () => {
    expect(new Student()).toBeTruthy();
  });

  it('should allow property assignment', () => {
    const s = new Student();
    s.id = 1;
    s.name = 'Alice';
    s.email = 'alice@example.com';
    s.gender = 'Female';

    expect(s.id).toBe(1);
    expect(s.name).toBe('Alice');
    expect(s.email).toBe('alice@example.com');
    expect(s.gender).toBe('Female');
  });

  it('should serialize to JSON correctly', () => {
    const s = new Student();
    s.name = 'Bob';
    const json = JSON.parse(JSON.stringify(s));
    expect(json.name).toBe('Bob');
    // Optional properties not set may be omitted or `undefined` depending on TS emit
    // We just ensure no crash on serialization.
    expect(json).toBeDefined();
  });

  it('should support undefined optional fields', () => {
    const s = new Student();
    s.id = undefined;
    s.name = undefined;
    s.email = undefined;
    s.gender = undefined;

    expect(s.id).toBeUndefined();
    expect(s.name).toBeUndefined();
    expect(s.email).toBeUndefined();
    expect(s.gender).toBeUndefined();
  });
});

describe('PagedResult<T> type checks', () => {
  it('isPagedResult should return true for valid shape (positive)', () => {
    const page: PagedResult<Student> = {
      items: [{ id: 1, name: 'Alice', email: 'alice@example.com', gender: 'Female' }],
      totalCount: 10,
      page: 1,
      pageSize: 5,
    };
    expect(isPagedResult<Student>(page)).toBeTrue();
  });

  it('isPagedResult should return false for missing keys (negative)', () => {
    const invalid1 = { items: [], totalCount: 10, pageSize: 5 }; // missing page
    const invalid2 = { items: [], totalCount: '10', page: 1, pageSize: 5 }; // wrong type
    const invalid3 = null;

    expect(isPagedResult<Student>(invalid1)).toBeFalse();
    expect(isPagedResult<Student>(invalid2)).toBeFalse();
    expect(isPagedResult<Student>(invalid3)).toBeFalse();
  });

  it('isValidPageMeta should enforce pagination invariants', () => {
    const valid: PagedResult<Student> = {
      items: [{ name: 'Ok' }],
      totalCount: 1,
      page: 1,
      pageSize: 5,
    };
    const tooManyItems: PagedResult<Student> = {
      items: new Array(6).fill({ name: 'X' }),
      totalCount: 6,
      page: 1,
      pageSize: 5,
    };
    const zeroPage: PagedResult<Student> = {
      items: [],
      totalCount: 0,
      page: 0,
      pageSize: 5,
    };
    const zeroSize: PagedResult<Student> = {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 0,
    };
    const negativeTotal: PagedResult<Student> = {
      items: [],
      totalCount: -1,
      page: 1,
      pageSize: 5,
    };

    expect(isValidPageMeta(valid)).toBeTrue();
    expect(isValidPageMeta(tooManyItems)).toBeFalse();
    expect(isValidPageMeta(zeroPage)).toBeFalse();
    expect(isValidPageMeta(zeroSize)).toBeFalse();
    expect(isValidPageMeta(negativeTotal)).toBeFalse();
  });
});