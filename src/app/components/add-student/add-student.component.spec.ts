import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AddStudentComponent } from './add-student.component';
import { StudentService } from '../../services/student.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Student } from '../../models/student.model';
import { NgForm } from '@angular/forms';

describe('AddStudentComponent (standalone)', () => {
  let fixture: any;
  let component: AddStudentComponent;

  // Mocks
  let studentServiceMock: jasmine.SpyObj<StudentService>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<AddStudentComponent>>;

  // Helpers
  const makeInvalidForm = (): NgForm =>
    ({
      invalid: true,
      form: { markAllAsTouched: jasmine.createSpy('markAllAsTouched') },
    } as unknown as NgForm);

  beforeEach(async () => {
    studentServiceMock = jasmine.createSpyObj<StudentService>(
      'StudentService',
      ['create', 'update']
    );

    dialogRefMock = jasmine.createSpyObj<MatDialogRef<AddStudentComponent>>(
      'MatDialogRef',
      ['close']
    );

    await TestBed.configureTestingModule({
      imports: [AddStudentComponent],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        // Default: add mode (no student in data)
        { provide: MAT_DIALOG_DATA, useValue: { title: 'Add Student' } },
      ],
      // We are testing class logic; ignore unknown template bindings
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddStudentComponent);
    component = fixture.componentInstance;
  });

  // -------------------------
  // ngOnInit (mode detection)
  // -------------------------
  it('ngOnInit should set mode=add when no student in data (positive)', () => {
    fixture.detectChanges();

    expect(component.mode).toBe('add');
    expect(component.student).toEqual({
      id: undefined,
      name: '',
      email: '',
      gender: '',
    });
  });

  it('ngOnInit should set mode=edit and hydrate student when student in data (positive)', async () => {
    const editData = {
      title: 'Edit Student',
      student: {
        id: 10,
        name: 'Alice',
        email: 'alice@example.com',
        gender: 'Female',
      } as Student,
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AddStudentComponent],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: editData },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddStudentComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.mode).toBe('edit');
    expect(component.student).toEqual(editData.student);
  });

  // -------------------------
  // close()
  // -------------------------
  it('close should call dialogRef.close with provided result', () => {
    const result = { ok: true };
    component.close(result);
    expect(dialogRefMock.close).toHaveBeenCalledWith(result);
  });

  it('close with no param should pass null', () => {
    component.close();
    expect(dialogRefMock.close).toHaveBeenCalledWith(null);
  });

  // -------------------------
  // newStudent()
  // -------------------------
  it('newStudent should reset fields, message, submitted and mode=add', () => {
    component.submitted = true;
    component.message = 'old';
    component.mode = 'edit';
    component.student = {
      id: 5,
      name: 'Bob',
      email: 'bob@example.com',
      gender: 'Male',
    };

    component.newStudent();

    expect(component.submitted).toBeFalse();
    expect(component.message).toBe('');
    expect(component.mode).toBe('add');
    expect(component.student).toEqual({
      id: undefined,
      name: '',
      email: '',
      gender: '',
    });
  });

  // -------------------------
  // saveStudent() — validation guards
  // -------------------------
  it('saveStudent should block when form is invalid (negative)', () => {
    const form = makeInvalidForm();
    component.message = 'old';

    component.saveStudent(form);

    expect(form.form.markAllAsTouched).toHaveBeenCalled();
    expect(component.message).toBe(
      'Please fix validation errors before submitting.'
    );
    expect(studentServiceMock.create).not.toHaveBeenCalled();
    expect(studentServiceMock.update).not.toHaveBeenCalled();
  });

  it('saveStudent should show "Name must be at least 2 characters." when name too short (negative)', () => {
    component.student = { name: 'A', email: 'a@b.com', gender: 'Female' };

    component.saveStudent();

    expect(component.message).toBe('Name must be at least 2 characters.');
    expect(studentServiceMock.create).not.toHaveBeenCalled();
    expect(studentServiceMock.update).not.toHaveBeenCalled();
  });

  it('saveStudent should show "Enter a valid email address." when email invalid (negative)', () => {
    component.student = {
      name: 'Alice',
      email: 'not-an-email',
      gender: 'Female',
    };

    component.saveStudent();

    expect(component.message).toBe('Enter a valid email address.');
    expect(studentServiceMock.create).not.toHaveBeenCalled();
    expect(studentServiceMock.update).not.toHaveBeenCalled();
  });

  it('saveStudent should show "Gender is required." when gender missing (negative)', () => {
    component.student = {
      name: 'Alice',
      email: 'alice@example.com',
      gender: '',
    };

    component.saveStudent();

    expect(component.message).toBe('Gender is required.');
    expect(studentServiceMock.create).not.toHaveBeenCalled();
    expect(studentServiceMock.update).not.toHaveBeenCalled();
  });

  // -------------------------
  // saveStudent() — CREATE
  // -------------------------
  it('saveStudent should call create with trimmed payload and close on success (positive)', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'error'); // should not be called
    studentServiceMock.create.and.returnValue(of({ id: 99 }));

    component.mode = 'add';
    component.student = {
      id: undefined,
      name: '  Alice  ',
      email: '  alice@example.com  ',
      gender: 'Female',
    };

    component.saveStudent();
    flushMicrotasks();

    // verify payload trimmed
    const payload = studentServiceMock.create.calls.mostRecent().args[0];
    expect(payload).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
      gender: 'Female',
    });

    // state updates
    expect(component.submitted).toBeTrue();
    expect(component.student.id).toBe(99);
    expect(component.message).toBe('Student created successfully!');
    expect(dialogRefMock.close).toHaveBeenCalledWith({ id: 99 });

    expect(consoleSpy).not.toHaveBeenCalled();
  }));

  it('saveStudent should set error message from server on create error (negative)', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'error');
    studentServiceMock.create.and.returnValue(
      throwError(() => ({ error: { message: 'Create failed server msg' } }))
    );

    component.mode = 'add';
    component.student = {
      name: 'Alice',
      email: 'alice@example.com',
      gender: 'Female',
    };

    component.saveStudent();
    flushMicrotasks();

    expect(component.message).toBe('Create failed server msg');
    expect(component.submitted).toBeFalse();
    expect(dialogRefMock.close).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Create failed:',
      jasmine.anything()
    );
  }));

  it('saveStudent should use default create error message when server message missing (negative)', fakeAsync(() => {
    studentServiceMock.create.and.returnValue(throwError(() => ({} as any)));

    component.mode = 'add';
    component.student = {
      name: 'Alice',
      email: 'alice@example.com',
      gender: 'Female',
    };

    component.saveStudent();
    flushMicrotasks();

    expect(component.message).toBe('Create failed. Please try again.');
  }));

  // -------------------------
  // saveStudent() — UPDATE
  // -------------------------
  it('saveStudent should call update with trimmed payload and close on success (positive)', fakeAsync(() => {
    studentServiceMock.update.and.returnValue(of({ message: 'Updated OK' }));

    component.mode = 'edit';
    component.student = {
      id: 10,
      name: 'Alice',
      email: 'alice@example.com',
      gender: 'Female',
    };

    component.saveStudent();
    flushMicrotasks();

    const [idArg, payloadArg] =
      studentServiceMock.update.calls.mostRecent().args;
    expect(idArg).toBe(10);
    expect(payloadArg).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
      gender: 'Female',
    });

    expect(component.submitted).toBeTrue();
    expect(component.message).toBe('Updated OK');
    // returns the current student (copy) to caller
    expect(dialogRefMock.close).toHaveBeenCalledWith({
      id: 10,
      name: 'Alice',
      email: 'alice@example.com',
      gender: 'Female',
    });
  }));

  it('saveStudent should use default update success message when response has no message (positive)', fakeAsync(() => {
    studentServiceMock.update.and.returnValue(of({}));

    component.mode = 'edit';
    component.student = {
      id: 11,
      name: 'Bob',
      email: 'bob@example.com',
      gender: 'Male',
    };

    component.saveStudent();
    flushMicrotasks();

    expect(component.message).toBe('Student updated successfully!');
  }));

  it('saveStudent should set error from server on update error (negative)', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'error');
    studentServiceMock.update.and.returnValue(
      throwError(() => ({ error: { message: 'Update failed server msg' } }))
    );

    component.mode = 'edit';
    component.student = {
      id: 12,
      name: 'Err',
      email: 'err@example.com',
      gender: 'Other',
    };

    component.saveStudent();
    flushMicrotasks();

    expect(component.message).toBe('Update failed server msg');
    expect(component.submitted).toBeFalse();
    expect(dialogRefMock.close).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Update failed:',
      jasmine.anything()
    );
  }));

  it('saveStudent should use default update error message when server message missing (negative)', fakeAsync(() => {
    component.mode = 'edit';
    component.student = {
      id: 13,
      name: 'Alice', // >= 2 chars
      email: 'alice@example.com', // valid email
      gender: 'Female', // non-empty
    };

    // Make update throw without error.message to trigger default text.
    studentServiceMock.update.and.returnValue(
      throwError(() => ({} as any)) // no error?.message
    );

    // Act
    component.saveStudent(); // do NOT pass an invalid form
    flushMicrotasks(); // flush async subscription

    // Assert
    expect(studentServiceMock.update).toHaveBeenCalledWith(13, {
      name: 'Alice',
      email: 'alice@example.com',
      gender: 'Female',
    });
    expect(component.message).toBe('Update failed. Please try again.');
    expect(component.submitted).toBeFalse();
  }));
});
