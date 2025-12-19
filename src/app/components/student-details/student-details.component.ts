import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { StudentService } from '../../services/student.service';
import { Student } from '../../models/student.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-student-details',
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './student-details.component.html',
  styleUrls: ['./student-details.component.scss'],
})
export class StudentDetailsComponent implements OnInit {
  @Input() viewMode = false;

  @Input() currentStudent: Student = {
    id: undefined,
    name: '',
    email: '',
    gender: ''
  };

  message = '';

  constructor(
    private studentService: StudentService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.viewMode) {
      this.message = '';
      const id = this.route.snapshot.params['id'];
      if (id) {
        this.getStudent(id);
      }
    }
  }

  getStudent(id: string | number): void {
    this.studentService.get(id).subscribe({
      next: (data) => {
        this.currentStudent = data;
        console.log('Fetched student:', data);
      },
      error: (e) => console.error('Fetch failed:', e),
    });
  }

  updateStudent(form?: NgForm): void {
    this.message = '';

    // Prevent submit if invalid and show all errors
    if (form && form.invalid) {
      form.form.markAllAsTouched();
      this.message = 'Please fix validation errors before updating.';
      return;
    }

    if (!this.currentStudent.id) {
      console.error('Missing student id for update.');
      return;
    }

    const payload: Student = {
      name: (this.currentStudent.name ?? '').trim(),
      email: (this.currentStudent.email ?? '').trim(),
      gender: this.currentStudent.gender ?? ''
    };

    this.studentService.update(this.currentStudent.id, payload).subscribe({
      next: (res: any) => {
        console.log('Update response:', res);
        this.message = res?.message ?? 'The student was updated successfully!';
      },
      error: (e) => console.error('Update failed:', e),
    });
  }

  deleteStudent(): void {
    if (!this.currentStudent.id) {
      console.error('Missing student id for delete.');
      return;
    }

    this.studentService.delete(this.currentStudent.id).subscribe({
      next: (res) => {
        console.log('Delete response:', res);
        this.router.navigate(['/students']);
      },
      error: (e) => console.error('Delete failed:', e),
    });
  }
}
