import { Routes } from '@angular/router';
import { StudentsListComponent } from './components/students-list/students-list.component';
import { StudentDetailsComponent } from './components/student-details/student-details.component';
import { AddStudentComponent } from './components/add-student/add-student.component';

export const routes: Routes = [
  { path: '', redirectTo: 'students', pathMatch: 'full' },
  { path: '**', redirectTo: 'students' },
  { path: 'students', component: StudentsListComponent },
  { path: 'students/:id', component: StudentDetailsComponent },
  { path: 'students/add', component: AddStudentComponent },
];
