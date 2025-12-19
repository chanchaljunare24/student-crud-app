import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterOutlet } from '@angular/router';
import { AddStudentComponent } from './components/add-student/add-student.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatButtonModule, MatDialogModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Student CRUD Application';
  constructor(public dialog: MatDialog) {}

  openDialog(): void {
    const dialogRef = this.dialog.open(AddStudentComponent, {
      // Sizing
      width: '600px', // fixed width
      maxWidth: '50vw', // responsive cap
      height: 'auto', // let content define height
      maxHeight: '80vh', // scroll if content exceeds

      // Optional UX
      disableClose: false, // allow closing via ESC/backdrop; set true to force action
      autoFocus: true, // autofocus first focusable element
      restoreFocus: true, // return focus to trigger element when closed

      // Optional custom class for styling
      panelClass: 'student-dialog-panel',

      // Optional data passed into the dialog
      data: { title: 'Add Student' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log('Dialog closed with result:', result);
      // e.g., this.retrieveStudents();
    });
  }
}
