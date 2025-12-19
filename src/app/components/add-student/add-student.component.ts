import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { StudentService } from '../../services/student.service';
import { Student } from '../../models/student.model';

import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-add-student',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './add-student.component.html',
  styleUrls: ['./add-student.component.scss'],
})
export class AddStudentComponent implements OnInit {
  student: Student = {
    id: undefined,
    name: '',
    email: '',
    gender: '',
  };

  submitted = false;
  message = '';
  mode: 'add' | 'edit' = 'add';

  constructor(
    private studentService: StudentService,
    private dialogRef: MatDialogRef<AddStudentComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { title?: string; student?: Student } | null
  ) {}

  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  ngOnInit(): void {
    if (this.data?.student) {
      const s = this.data.student;
      this.student = {
        id: s.id,
        name: s.name ?? '',
        email: s.email ?? '',
        gender: s.gender ?? '',
      };
      this.mode = 'edit';
    } else {
      this.mode = 'add';
    }
  }

  close(result: any = null): void {
    this.dialogRef.close(result);
  }

  newStudent(): void {
    this.submitted = false;
    this.message = '';
    this.mode = 'add';
    this.student = {
      id: undefined,
      name: '',
      email: '',
      gender: '',
    };
  }

  saveStudent(form?: NgForm): void {
    this.message = '';

    // Template-driven validation guard
    if (form && form.invalid) {
      form.form.markAllAsTouched();
      this.message = 'Please fix validation errors before submitting.';
      return;
    }

    const name = (this.student.name || '').trim();
    const email = (this.student.email || '').trim();
    const gender = this.student.gender || '';

    if (name.length < 2) {
      this.message = 'Name must be at least 2 characters.';
      return;
    }
    if (!this.emailRegex.test(email)) {
      this.message = 'Enter a valid email address.';
      return;
    }
    if (!gender) {
      this.message = 'Gender is required.';
      return;
    }

    const payload: Student = {
      id: this.student.id, // keep id for update
      name,
      email,
      gender,
    };

    // Decide create vs update based on presence of id or mode
    if (
      this.mode === 'edit' &&
      payload.id !== undefined &&
      payload.id !== null
    ) {
      this.studentService
        .update(payload.id as any, {
          name: payload.name!,
          email: payload.email!,
          gender: payload.gender!,
        })
        .subscribe({
          next: (res: any) => {
            this.submitted = true;
            this.message = res?.message ?? 'Student updated successfully!';
            // return the updated student to the caller
            this.close({ ...this.student });
          },
          error: (e) => {
            console.error('Update failed:', e);
            this.message =
              e?.error?.message ?? 'Update failed. Please try again.';
          },
        });
    } else {
      // CREATE
      this.studentService
        .create({
          name: payload.name!,
          email: payload.email!,
          gender: payload.gender!,
        })
        .subscribe({
          next: (res) => {
            this.submitted = true;
            this.student.id = (res as any)?.id ?? this.student.id;
            this.message = 'Student created successfully!';
            // return the created student to the caller
            this.close(res);
          },
          error: (e) => {
            console.error('Create failed:', e);
            this.message =
              e?.error?.message ?? 'Create failed. Please try again.';
          },
        });
    }
  }
}
