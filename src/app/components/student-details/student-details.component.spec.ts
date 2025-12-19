import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { StudentDetailsComponent } from './student-details.component';
import { StudentService } from '../../services/student.service';
import { Student } from '../../models/student.model';
import { ActivatedRoute, Router } from '@angular/router';

function makeFormInvalid(): NgForm {
  // Minimal NgForm stub to simulate invalid form
  return {
    invalid: true,
    form: {
      markAllAsTouched: jasmine.createSpy('markAllAsTouched'),
    },
  } as unknown as NgForm;
}

describe('StudentDetailsComponent (standalone)', () => {
  let fixture: any;
  let component: StudentDetailsComponent;

  // Mocks
  let studentServiceMock: jasmine.SpyObj<StudentService>;
  let routerMock: jasmine.SpyObj<Router>;
  let activatedRouteMock: Partial<ActivatedRoute>;

  const studentAlice: Student = {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    gender: 'Female',
  };

  beforeEach(async () => {
    studentServiceMock = jasmine.createSpyObj<StudentService>(
      'StudentService',
      ['get', 'update', 'delete']
    );

    studentServiceMock.get.and.returnValue(of(studentAlice));
    studentServiceMock.update.and.returnValue(of({ message: 'Updated OK' }));
    studentServiceMock.delete.and.returnValue(of({ success: true }));

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    // Default route has id param = '1'
    activatedRouteMock = {
      snapshot: {
        params: { id: '1' },
      } as any,
    };

    await TestBed.configureTestingModule({
      imports: [StudentDetailsComponent, FormsModule],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
      // Ignore unknown template bits (you can remove this if you import all template dependencies)
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentDetailsComponent);
    component = fixture.componentInstance;
  });

  it('ngOnInit should call getStudent when viewMode=false and route has id (positive)', fakeAsync(() => {
    // Default viewMode=false
    fixture.detectChanges(); // triggers ngOnInit
    flushMicrotasks();

    expect(studentServiceMock.get).toHaveBeenCalledWith('1');
    expect(component.currentStudent).toEqual(studentAlice);
    expect(component.message).toBe(''); // cleared in ngOnInit
  }));

  it('ngOnInit should NOT call getStudent when viewMode=true (negative-ish)', () => {
    component.viewMode = true;

    fixture.detectChanges(); // triggers ngOnInit

    expect(studentServiceMock.get).not.toHaveBeenCalled();
  });

  it('ngOnInit should not call getStudent if id param is missing (negative-ish)', () => {
    // Override ActivatedRoute without id
    TestBed.resetTestingModule();
    activatedRouteMock = { snapshot: { params: {} } as any };

    TestBed.configureTestingModule({
      imports: [StudentDetailsComponent, FormsModule],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentDetailsComponent);
    component = fixture.componentInstance;

    fixture.detectChanges(); // ngOnInit

    expect(studentServiceMock.get).not.toHaveBeenCalled();
  });

  it('getStudent should set currentStudent on success (positive)', fakeAsync(() => {
    component.getStudent(1);
    flushMicrotasks();

    expect(studentServiceMock.get).toHaveBeenCalledWith(1);
    expect(component.currentStudent).toEqual(studentAlice);
  }));

  it('getStudent should log on error (negative)', fakeAsync(() => {
    studentServiceMock.get.and.returnValue(throwError(() => new Error('boom')));

    const consoleSpy = spyOn(console, 'error');
    component.getStudent(999);
    flushMicrotasks();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Fetch failed:',
      jasmine.any(Error)
    );
  }));

  it('updateStudent should block and set message when form is invalid (negative)', () => {
    const form = makeFormInvalid();

    component.message = 'old';
    component.currentStudent.id = 1; // present id to ensure invalid form is the reason
    component.updateStudent(form);

    expect(form.form.markAllAsTouched).toHaveBeenCalled();
    expect(component.message).toBe(
      'Please fix validation errors before updating.'
    );
    expect(studentServiceMock.update).not.toHaveBeenCalled();
  });

  it('updateStudent should log and not call service when id missing (negative)', () => {
    const consoleSpy = spyOn(console, 'error');
    component.currentStudent = {
      id: undefined,
      name: 'X',
      email: 'x@x',
      gender: 'Male',
    };

    component.updateStudent();

    expect(consoleSpy).toHaveBeenCalledWith('Missing student id for update.');
    expect(studentServiceMock.update).not.toHaveBeenCalled();
  });

  it('updateStudent should trim payload and set message from response (positive)', fakeAsync(() => {
    component.currentStudent = {
      id: 10,
      name: '  Alice  ',
      email: '  alice@example.com  ',
      gender: 'Female',
    };

    studentServiceMock.update.and.returnValue(of({ message: 'Updated OK' }));

    component.updateStudent();
    flushMicrotasks();

    // Ensure call with trimmed payload
    const [calledId, calledPayload] =
      studentServiceMock.update.calls.mostRecent().args;
    expect(calledId).toBe(10);
    expect(calledPayload).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
      gender: 'Female',
    });

    expect(component.message).toBe('Updated OK');
  }));

  it('updateStudent should use default success message when response has no message (positive)', fakeAsync(() => {
    component.currentStudent = {
      id: 11,
      name: 'Bob',
      email: 'bob@example.com',
      gender: 'Male',
    };
    studentServiceMock.update.and.returnValue(of({}));

    component.updateStudent();
    flushMicrotasks();

    expect(component.message).toBe('The student was updated successfully!');
  }));

  it('updateStudent should log on error (negative)', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'error');

    component.currentStudent = {
      id: 12,
      name: 'Err',
      email: 'err@example.com',
      gender: 'Other',
    };
    studentServiceMock.update.and.returnValue(
      throwError(() => new Error('update failed'))
    );

    component.updateStudent();
    flushMicrotasks();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Update failed:',
      jasmine.any(Error)
    );
  }));

  it('deleteStudent should log and not call service when id missing (negative)', () => {
    const consoleSpy = spyOn(console, 'error');
    component.currentStudent = { id: undefined, name: 'NoID' };

    component.deleteStudent();

    expect(consoleSpy).toHaveBeenCalledWith('Missing student id for delete.');
    expect(studentServiceMock.delete).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('deleteStudent should call service and navigate to /students (positive)', fakeAsync(() => {
    component.currentStudent = { id: 1, name: 'Alice' };

    component.deleteStudent();
    flushMicrotasks();

    expect(studentServiceMock.delete).toHaveBeenCalledWith(1);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/students']);
  }));

  it('deleteStudent should log on error (negative)', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'error');
    component.currentStudent = { id: 99, name: 'Err' };
    studentServiceMock.delete.and.returnValue(
      throwError(() => new Error('delete failed'))
    );

    component.deleteStudent();
    flushMicrotasks();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Delete failed:',
      jasmine.any(Error)
    );
    expect(routerMock.navigate).not.toHaveBeenCalled();
  }));
});
