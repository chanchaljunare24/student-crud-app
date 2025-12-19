
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { StudentService } from './student.service';
import { Student, PagedResult } from '../models/student.model';

const baseUrl = 'http://localhost:8080/api/students';

describe('StudentService', () => {
  let service: StudentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StudentService],
    });

    service = TestBed.inject(StudentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Ensures no stray requests remain (good hygiene)
    httpMock.verify();
  });

  it('getAllPaged() should GET paged result (positive)', () => {
    const paged: PagedResult<Student> = {
      items: [{ id: 1, name: 'Alice', email: 'alice@example.com', gender: 'Female' }],
      totalCount: 10,
      page: 1,
      pageSize: 5,
    };

    let result: PagedResult<Student> | undefined;
    service.getAllPaged().subscribe(r => (result = r));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');

    req.flush(paged);
    expect(result).toEqual(paged);
  });

  it('getAllPaged() should surface HTTP error (negative)', () => {
    let status: number | undefined;
    service.getAllPaged().subscribe({
      next: () => fail('expected error'),
      error: err => (status = err.status),
    });

    const req = httpMock.expectOne(baseUrl);
    req.flush({ message: 'server error' }, { status: 500, statusText: 'Server Error' });

    expect(status).toBe(500);
  });

  it('findByNamePaged(name) should send query param and return paged result (positive)', () => {
    const name = 'Bob';
    const paged: PagedResult<Student> = {
      items: [{ id: 2, name: 'Bob', email: 'bob@example.com', gender: 'Male' }],
      totalCount: 1,
      page: 1,
      pageSize: 10,
    };

    let result: PagedResult<Student> | undefined;
    service.findByNamePaged(name).subscribe(r => (result = r));

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.params.get('name') === name
    );
    expect(req.request.method).toBe('GET');

    req.flush(paged);
    expect(result).toEqual(paged);
  });

  it('getAll() should map paged.items to Student[] (positive)', () => {
    const paged: PagedResult<Student> = {
      items: [{ id: 3, name: 'Cara', email: 'cara@example.com', gender: 'Female' }],
      totalCount: 1,
      page: 1,
      pageSize: 10,
    };

    let result: Student[] | undefined;
    service.getAll().subscribe(r => (result = r));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');

    req.flush(paged);
    expect(result).toEqual(paged.items);
  });

  it('getAll() should return [] when items is undefined (negative-ish)', () => {
    const paged: PagedResult<Student> = {
      items: undefined as unknown as Student[],
      totalCount: 0,
      page: 1,
      pageSize: 10,
    };

    let result: Student[] | undefined;
    service.getAll().subscribe(r => (result = r));

    const req = httpMock.expectOne(baseUrl);
    req.flush(paged);

    expect(result).toEqual([]);
  });

  it('findByName(name) should send query param and map items (positive)', () => {
    const name = 'Dave';
    const paged: PagedResult<Student> = {
      items: [{ id: 4, name: 'Dave', email: 'dave@example.com', gender: 'Male' }],
      totalCount: 1,
      page: 1,
      pageSize: 10,
    };

    let result: Student[] | undefined;
    service.findByName(name).subscribe(r => (result = r));

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.params.get('name') === name
    );
    expect(req.request.method).toBe('GET');

    req.flush(paged);
    expect(result).toEqual(paged.items);
  });

  it('findByName(name) should return [] when items missing (negative-ish)', () => {
    const name = 'Eve';
    const paged: PagedResult<Student> = {
      items: undefined as unknown as Student[],
      totalCount: 0,
      page: 1,
      pageSize: 10,
    };

    let result: Student[] | undefined;
    service.findByName(name).subscribe(r => (result = r));

    const req = httpMock.expectOne(
      r => r.url === baseUrl && r.params.get('name') === name
    );
    req.flush(paged);

    expect(result).toEqual([]);
  });

  // CRUD
  it('get(id) should GET /:id (positive)', () => {
    const id = 10;
    const student: Student = { id, name: 'Foo', email: 'foo@example.com', gender: 'Male' };

    let result: Student | undefined;
    service.get(id).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('GET');

    req.flush(student);
    expect(result).toEqual(student);
  });

  it('create(data) should POST to baseUrl (positive)', () => {
    const payload: Student = { name: 'New', email: 'new@example.com', gender: 'Female' };
    const created: Student = { id: 99, ...payload };

    let result: Student | undefined;
    service.create(payload).subscribe(r => (result = r));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush(created);
    expect(result).toEqual(created);
  });

  it('update(id, data) should PUT to /:id (positive)', () => {
    const id = 20;
    const payload: Student = { id, name: 'Upd', email: 'upd@example.com', gender: 'Male' };

    let result: any;
    service.update(id, payload).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);

    req.flush({ ok: true });
    expect(result).toEqual({ ok: true });
  });

  it('delete(id) should DELETE /:id (positive)', () => {
    const id = 30;

    let result: any;
    service.delete(id).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${baseUrl}/${id}`);
    expect(req.request.method).toBe('DELETE');

    req.flush({ success: true });
    expect(result).toEqual({ success: true });
  });

  it('deleteAll() should DELETE baseUrl (positive)', () => {
    let result: any;
    service.deleteAll().subscribe(r => (result = r));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('DELETE');

    req.flush({ success: true });
    expect(result).toEqual({ success: true });
  });

  it('CRUD methods should surface 404 errors (negative)', () => {
    let status: number | undefined;
    service.get(999).subscribe({
      next: () => fail('expected 404'),
      error: err => (status = err.status),
    });

    const req = httpMock.expectOne(`${baseUrl}/999`);
    req.flush({ message: 'not found' }, { status: 404, statusText: 'Not Found' });

    expect(status).toBe(404);
  });
});
