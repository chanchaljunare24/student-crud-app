import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { finalize } from 'rxjs/operators';

import { Student, PagedResult } from '../../models/student.model';
import { StudentService } from '../../services/student.service';

import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { AddStudentComponent } from '../add-student/add-student.component';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './students-list.component.html',
  styleUrls: ['./students-list.component.scss'],
})
export class StudentsListComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Student>([]);
  displayedColumns: string[] = ['name', 'email', 'gender', 'actions'];

  students: Student[] = [];

  currentStudent: Student = {};
  currentIndex = -1;

  /** Search */
  name = '';

  /** UI state */
  loading = false;
  message = '';

  /** Paged metadata (from backend) */
  totalCount = 0;
  page = 1; // 1-based if your API returns 1-based page
  pageSize = 10;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private studentService: StudentService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.retrieveStudents();
  }

  ngAfterViewInit(): void {
    // Attach paginator & sort once view is ready
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Optional: multi-field predicate for client-side filtering
    this.dataSource.filterPredicate = (data: Student, filter: string) => {
      const f = (filter || '').trim().toLowerCase();
      return (
        (data.name ?? '').toLowerCase().includes(f) ||
        (data.email ?? '').toLowerCase().includes(f) ||
        (data.gender ?? '').toLowerCase().includes(f)
      );
    };
  }

  private pushToTable(items: Student[]): void {
    this.students = items ?? [];
    this.dataSource.data = this.students;

    // Ensure paginator reflects new data; some versions need explicit re-attach
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.firstPage(); // reset to page 1 so range labels are correct
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  retrieveStudents(): void {
    this.loading = true;
    this.studentService
      .getAllPaged()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: PagedResult<Student>) => {
          const items = res?.items ?? [];
          this.totalCount = res?.totalCount ?? items.length;
          this.page = res?.page ?? 1;
          this.pageSize = res?.pageSize ?? 10;

          this.pushToTable(items);

          // Reset selection and messages
          this.currentStudent = {};
          this.currentIndex = -1;
          this.message = '';
        },
        error: (e) => {
          console.error('Retrieve failed:', e);
          this.message = 'Failed to load students. Please try again.';
          // no need to set loading=false here if using finalize
        },
      });
  }

  /** Reset selection and reload the list */
  refreshList(): void {
    this.retrieveStudents();
    this.currentStudent = {};
    this.currentIndex = -1;
    this.message = '';
    this.name = '';
    this.applyLocalFilter(''); // clear client filter (if used)
  }

  /** Select a student (for details panel) */
  setActiveStudent(student: Student, index: number): void {
    this.currentStudent = student;
    this.currentIndex = index;
    this.message = '';
  }

  searchName(): void {
    const q = (this.name || '').trim();

    this.currentStudent = {};
    this.currentIndex = -1;
    this.message = '';

    if (!q) {
      this.retrieveStudents();
      return;
    }

    this.loading = true;
    this.studentService
      .findByNamePaged(q)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          const items = res?.items ?? [];
          this.totalCount = res?.totalCount ?? items.length;
          this.page = res?.page ?? 1;
          this.pageSize = res?.pageSize ?? 10;

          this.pushToTable(items);

          if (items.length === 0) {
            this.message = `No students found for "${q}".`;
          }
        },
        error: (e) => {
          console.error('Search failed:', e);
          this.message = 'Search failed. Please try again.';
          // no need to set loading=false here because finalize does it
        },
      });
  }

  /** Optional: client-side instant filter (against local data) */
  applyLocalFilter(value: string): void {
    this.dataSource.filter = value.trim().toLowerCase();
    this.paginator?.firstPage();
  }

  /** Server-side pagination (optional) */
  onPage(e: PageEvent): void {
    // If you want your backend to page results:
    // pageIndex is zero-based; convert to 1-based if needed
    this.page = e.pageIndex + 1;
    this.pageSize = e.pageSize;

    // Example (requires a service method getPaged({page, pageSize, name})):
    // this.loading = true;
    // this.studentService.getPaged({ page: this.page, pageSize: this.pageSize, name: this.name })
    //   .subscribe({
    //     next: (res) => {
    //       this.totalCount = res.totalCount;
    //       this.pushToTable(res.items);
    //     },
    //     error: (err) => console.error(err),
    //     complete: () => (this.loading = false),
    //   });
  }

  /** Actions: Edit/Delete */
  editStudent(student: Student): void {
    const ref = this.dialog.open(AddStudentComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { title: 'Edit Student', student }, // you'll need to patch AddStudentComponent to accept & prefill
    });

    ref.afterClosed().subscribe((result) => {
      if (result) this.retrieveStudents();
    });
  }

  deleteStudent(student: Student): void {
    if (!student.id) return;
    this.studentService.delete(student.id).subscribe({
      next: () => this.retrieveStudents(),
      error: (e) => console.error('Delete failed:', e),
    });
  }

  /** Open add modal */
  openAddDialog(): void {
    const ref = this.dialog.open(AddStudentComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { title: 'Add Student' },
    });

    ref.afterClosed().subscribe((result) => {
      if (result) this.retrieveStudents();
    });
  }

  /** trackBy for performance */
  trackById = (_: number, s: Student) => s.id ?? _;
}
