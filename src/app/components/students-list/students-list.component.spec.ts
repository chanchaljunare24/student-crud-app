import {
  TestBed,
  fakeAsync,
  tick,
  flushMicrotasks,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import {
  MatDialog,
  MatDialogRef,
  MatDialogConfig,
} from '@angular/material/dialog';

import { StudentService } from '../../services/student.service';
import { Student, PagedResult } from '../../models/student.model';
import { AddStudentComponent } from '../add-student/add-student.component';
import { StudentsListComponent } from '../students-list/students-list.component';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('StudentsListComponent (standalone)', () => {
  let component: StudentsListComponent;
  let fixture: any;

  // --- spies / mocks ---
  let studentServiceMock: jasmine.SpyObj<StudentService>;
  let matDialogMock: jasmine.SpyObj<MatDialog>;

  const pagedOk: PagedResult<Student> = {
    items: [
      { id: 1, name: 'Alice', email: 'alice@example.com', gender: 'Female' },
      { id: 2, name: 'Bob', email: 'bob@example.com', gender: 'Male' },
    ],
    totalCount: 2,
    page: 1,
    pageSize: 10,
  };

  beforeEach(async () => {
    studentServiceMock = jasmine.createSpyObj<StudentService>(
      'StudentService',
      [
        'getAllPaged',
        'findByNamePaged',
        'delete',
        // (add other methods if you call them directly)
      ]
    );

    // Default happy-path return values
    studentServiceMock.getAllPaged.and.returnValue(of(pagedOk));
    studentServiceMock.findByNamePaged.and.returnValue(
      of({
        items: [
          { id: 3, name: 'Cara', email: 'cara@example.com', gender: 'Female' },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 10,
      })
    );
    studentServiceMock.delete.and.returnValue(of({ success: true }));

    matDialogMock = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    // Default dialog returns "truthy" so refresh happens in edit/add tests unless overridden
    matDialogMock.open.and.returnValue({
      afterClosed: () => of(true),
    } as MatDialogRef<any>);

    await TestBed.configureTestingModule({
      imports: [
        // Standalone component goes into imports

        StudentsListComponent,
        // Material modules used in its template
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,

        // Avoid animation timing issues
        NoopAnimationsModule,
      ],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        { provide: MatDialog, useValue: matDialogMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentsListComponent);
    component = fixture.componentInstance;

    // Provide stub paginator/sort so methods can use them without template dependency
    component['paginator'] = {
      firstPage: jasmine.createSpy('firstPage'),
    } as any;
    component['sort'] = {} as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should call retrieveStudents and populate state (positive)', () => {
    fixture.detectChanges(); // triggers ngOnInit

    expect(studentServiceMock.getAllPaged).toHaveBeenCalled();
    expect(component.students.length).toBe(2);
    expect(component.totalCount).toBe(2);
    expect(component.page).toBe(1);
    expect(component.pageSize).toBe(10);
    expect(component.message).toBe('');
    expect(component.loading).toBeFalse();
    // table sync
    expect(component.dataSource.data.length).toBe(2);
  });

  it('retrieveStudents should handle error (negative)', fakeAsync(() => {
    // Arrange: make the service error
    studentServiceMock.getAllPaged.and.returnValue(
      throwError(() => new Error('server down'))
    );

    // Act
    component.retrieveStudents();

    // Flush the subscription microtask queue
    flushMicrotasks(); // or `tick()`

    // Assert
    expect(component.message).toBe(
      'Failed to load students. Please try again.'
    );
    expect(component.loading).toBeFalse(); // <-- will pass after fix
    expect(component.students.length).toBe(0);
    expect(component.dataSource.data.length).toBe(0);
  }));

  it('refreshList should reset selection, messages, name and clear client filter', () => {
    const applySpy = spyOn(component, 'applyLocalFilter').and.callThrough();

    component.currentStudent = { id: 123 };
    component.currentIndex = 5;
    component.message = 'Something';
    component.name = 'SearchTerm';

    component.refreshList();

    expect(studentServiceMock.getAllPaged).toHaveBeenCalled(); // via retrieveStudents
    expect(component.currentStudent).toEqual({});
    expect(component.currentIndex).toBe(-1);
    expect(component.message).toBe('');
    expect(component.name).toBe('');
    expect(applySpy).toHaveBeenCalledWith('');
  });

  it('setActiveStudent should set selected student and clear message', () => {
    const s: Student = {
      id: 7,
      name: 'Sel',
      email: 'sel@example.com',
      gender: 'Other',
    };
    component.message = 'Old';

    component.setActiveStudent(s, 3);

    expect(component.currentStudent).toEqual(s);
    expect(component.currentIndex).toBe(3);
    expect(component.message).toBe('');
  });

  it('searchName with empty input should fallback to retrieveStudents', () => {
    component.name = '   '; // only spaces
    const retrieveSpy = spyOn(component, 'retrieveStudents').and.callThrough();

    component.searchName();

    expect(retrieveSpy).toHaveBeenCalled();
  });

  it('searchName with value should call service and update state (positive)', () => {
    component.name = 'Bob';
    component.searchName();

    expect(studentServiceMock.findByNamePaged).toHaveBeenCalledWith('Bob');
    expect(component.students.length).toBe(1);
    expect(component.message).toBe(''); // not empty because items found
    expect(component.loading).toBeFalse();
  });

  it('searchName should set message when no results (negative-ish)', () => {
    studentServiceMock.findByNamePaged.and.returnValue(
      of({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
      })
    );

    component.name = 'Nobody';
    component.searchName();

    expect(component.students.length).toBe(0);
    expect(component.message).toBe('No students found for "Nobody".');
  });

  it('searchName should handle error (negative)', fakeAsync(() => {
    studentServiceMock.findByNamePaged.and.returnValue(
      throwError(() => new Error('boom'))
    );

    component.name = 'ErrorCase';
    component.searchName();

    // Let the observable microtask queue flush
    flushMicrotasks();

    expect(component.message).toBe('Search failed. Please try again.');
    expect(component.loading).toBeFalse(); // now passes because of finalize
  }));

  it('applyLocalFilter should normalize value and reset paginator to first page', () => {
    component.applyLocalFilter('  BoB  ');
    expect(component.dataSource.filter).toBe('bob'); // lowercased, trimmed
    expect((component['paginator'] as any).firstPage).toHaveBeenCalled();
  });

  // Pagination (client-side)
  it('onPage should update page and pageSize', () => {
    component.onPage({ pageIndex: 2, pageSize: 25, length: 100 } as any);
    expect(component.page).toBe(3); // converted to 1-based
    expect(component.pageSize).toBe(25);
  });

  // Edit dialog
  it('editStudent should open dialog with expected config and refresh on truthy result (positive)', () => {
    const retrieveSpy = spyOn(component, 'retrieveStudents').and.callThrough();
    const student: Student = { id: 5, name: 'ToEdit' };

    component.editStudent(student);

    expect(matDialogMock.open).toHaveBeenCalledWith(
      AddStudentComponent,
      jasmine.objectContaining<Partial<MatDialogConfig>>({
        width: '600px',
        maxWidth: '90vw',
        data: jasmine.objectContaining({
          title: 'Edit Student',
          student,
        }),
      })
    );

    expect(retrieveSpy).toHaveBeenCalled();
  });

  it('editStudent should NOT refresh when dialog returns falsy (negative-ish)', () => {
    matDialogMock.open.and.returnValue({
      afterClosed: () => of(undefined),
    } as MatDialogRef<any>);
    const retrieveSpy = spyOn(component, 'retrieveStudents');

    component.editStudent({ id: 8, name: 'X' });

    expect(retrieveSpy).not.toHaveBeenCalled();
  });

  // Delete
  it('deleteStudent should early-return if no id (negative)', () => {
    component.deleteStudent({ name: 'NoId' });
    expect(studentServiceMock.delete).not.toHaveBeenCalled();
  });

  it('deleteStudent should call service and refresh (positive)', () => {
    const retrieveSpy = spyOn(component, 'retrieveStudents').and.callThrough();

    component.deleteStudent({ id: 123, name: 'HasId' });

    expect(studentServiceMock.delete).toHaveBeenCalledWith(123);
    expect(retrieveSpy).toHaveBeenCalled();
  });

  // Add dialog
  it('openAddDialog should open dialog with expected config and refresh on truthy result (positive)', () => {
    const retrieveSpy = spyOn(component, 'retrieveStudents').and.callThrough();

    component.openAddDialog();

    expect(matDialogMock.open).toHaveBeenCalledWith(
      AddStudentComponent,
      jasmine.objectContaining<Partial<MatDialogConfig>>({
        width: '600px',
        maxWidth: '90vw',
        data: { title: 'Add Student' },
      })
    );
    expect(retrieveSpy).toHaveBeenCalled();
  });

  it('openAddDialog should NOT refresh when dialog returns falsy (negative-ish)', () => {
    matDialogMock.open.and.returnValue({
      afterClosed: () => of(null),
    } as MatDialogRef<any>);
    const retrieveSpy = spyOn(component, 'retrieveStudents');

    component.openAddDialog();

    expect(retrieveSpy).not.toHaveBeenCalled();
  });
});
